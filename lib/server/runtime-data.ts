import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { Root } from 'mdast';
import { VIZ_CATALOG } from '@/lib/viz/registry';
import {
  type BankProblem,
  type CheckpointFrontmatter,
  type ExtensionProblem,
  type ModuleFrontmatter,
  type PatternFrontmatter,
  type Exercise,
} from '@/lib/content/schema';
import type { ContentBundle, LoadedModule } from '@/lib/content/load';
import { splitExercise } from '@/lib/content/split';
import { parseMdx } from '@/lib/content/mdx';
import type { PatternMap, PatternMapEntry } from '@/lib/domain/mastery';

// The generated runtime data (plan §3). What pages read while prerendering they read from content/ directly
// (lib/content/public.ts); these files exist for what pages must NOT carry:
//
//   .generated/exercise-keys.json   answer keys, server-only (D-011)
//   .generated/reserved.json        reserved problems, mock pools, gated content, server-only (D-012, D-027)
//   public/data/gate-rules.json     the public rule for when each gate opens, no content (D-027)
//   public/data/pattern-map.json    pattern → lesson, exercises, problems, for mastery in the browser
//   public/data/search-index.json   titles and public metadata for the command palette (D-017)
//
// `predev` and `prebuild` run the builder (scripts/build-runtime-data.ts, so `npm run dev` and
// `npm run build` always ship fresh files); route handlers use the readers at the end of this file.

// ---- shapes

export interface ServedKey {
  type: Exercise['type'];
  /** The key part (D-011): correct options, explanations, accepted answers, hidden tests, solutions. */
  key: Record<string, unknown>;
}

export interface GateContent {
  /** Gated text by its `<Gated id>` id (D-027). */
  texts: Record<string, string>;
  /** The public part of every exercise held back until this gate opens, by slug. */
  exercises: Record<string, { type: Exercise['type']; public: Record<string, unknown> }>;
}

export interface ReservedData {
  /** Assessment problem lists, keyed by the checkpoint frontmatter's assessment slug. */
  assessments: Record<
    string,
    {
      id: string;
      slug: string;
      problems: Array<{ num: number; title: string; url: string; difficulty: string; minutes: number }>;
    }
  >;
  /** Mock pools, keyed by the mock slug. A mock's topics are public and live on the page; the pool does not. */
  mocks: Record<
    string,
    { id: number; slug: string; pool: Array<{ num: number; title: string; url: string }> }
  >;
  /** Module 12 problems whose pattern, prerequisite, reason and hint stay hidden until an attempt (D-012). */
  problems: Record<string, { pattern: string; prereq: string; why: string; hint: string }>;
  /** What a gate hands over once it opens, keyed by the gate event id. */
  gates: Record<string, GateContent>;
}

/** How the client can tell from its own documents that a gate has opened. Public: the rule is not a secret. */
export type GateRule =
  | { kind: 'checkpoint'; checkpoint: string }
  | { kind: 'mock'; mock: string }
  | { kind: 'placement' }
  | { kind: 'exercises'; copies: string[][] };

export type GateRules = Record<string, GateRule>;

export interface SearchEntry {
  type: 'module' | 'lesson' | 'checkpoint' | 'pattern' | 'handbook' | 'viz' | 'problem';
  /** What the palette links to: a content slug, a problem number as a string, or a visualizer id. */
  id: string;
  title: string;
  module?: string;
  /** Extra searchable words: a lesson's topic, the handbook section, the problem's role and difficulty. */
  text?: string;
}

export interface RuntimeData {
  keys: Record<string, ServedKey>;
  reserved: ReservedData;
  gateRules: GateRules;
  patternMap: PatternMap;
  searchIndex: SearchEntry[];
}

export interface RuntimeCounts {
  keys: number;
  assessments: number;
  mocks: number;
  problemDetails: number;
  gates: number;
  gateExercises: number;
  patterns: number;
  searchEntries: number;
}

export const GENERATED_DIR = path.join(process.cwd(), '.generated');
export const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'data');

// ---- the builder

type LessonPage = LoadedModule['lessons'][number];

/** A bank problem of the 173, not an extension entry: the ones the journal tracks. */
function isCoreProblem(p: BankProblem | ExtensionProblem): p is BankProblem {
  return 'tier' in p;
}

interface UnitHit {
  unit: string;
  unitKind?: string;
  include?: string;
  exercise?: string;
}

/** Walks an MDX body, recording the enclosing `<Unit>` for every `<Include>` and `<Exercise>`. */
function walkUnits(body: string): UnitHit[] {
  const out: UnitHit[] = [];
  const visit = (node: unknown, unit: string, kind?: string) => {
    const n = node as {
      type: string;
      name?: string;
      attributes?: { name?: string; value?: unknown }[];
      children?: unknown[];
    };
    if (n.type === 'mdxJsxFlowElement' || n.type === 'mdxJsxTextElement') {
      const attr = (name: string) => {
        const v = n.attributes?.find((a) => a.name === name)?.value;
        return typeof v === 'string' ? v : undefined;
      };
      if (n.name === 'Unit') {
        const id = attr('id') ?? '';
        const k = attr('kind');
        for (const child of n.children ?? []) visit(child, id, k);
        return;
      }
      if (n.name === 'Include') out.push({ unit, unitKind: kind, include: attr('id') });
      if (n.name === 'Exercise') out.push({ unit, unitKind: kind, exercise: attr('id') });
      return;
    }
    for (const child of (n as { children?: unknown[] }).children ?? []) visit(child, unit, kind);
  };
  visit(parseMdx(body) as Root, '');
  return out;
}

/**
 * Builds every generated artifact from `content/`. Nothing is read from disk here apart from the `bundle` handed
 * in, so tests can call it directly; `writeRuntimeData` is the only filesystem writer. Throws when the pattern
 * map cannot be derived (a pattern on no lesson page, or included by more than one lesson). Gate consistency —
 * every `gatedBy` and `<Gated by>` naming a gate that exists — is content:check's job (validate.ts), not ours.
 */
export function buildRuntimeData(bundle: ContentBundle): RuntimeData {
  const keys: Record<string, ServedKey> = {};
  const gates: Record<string, GateContent> = {};
  const patternMap: PatternMap = {};
  const searchIndex: SearchEntry[] = [];
  const hiddenProblems: ReservedData['problems'] = {};

  // Exercises: the public part stays in page data; the key goes to the server bundle (D-011). A gated exercise's
  // public part only ships through its gate (D-027), so page data must skip it — the page-data builder checks
  // `gatedBy` again, independently.
  for (const { module: moduleDoc, lessons, checkpoint } of bundle.modules) {
    const moduleSlug = moduleDoc.frontmatter.slug;
    for (const page of [...lessons, ...(checkpoint ? [checkpoint] : [])]) {
      const scope = `${moduleSlug}/${page.frontmatter.slug}`;
      for (const exercise of page.exercises) {
        const slug = `${scope}/${exercise.id}`;
        const split = splitExercise(exercise);
        keys[slug] = { type: exercise.type, key: split.key };
        if (exercise.gatedBy) {
          const gate = (gates[exercise.gatedBy] ??= { texts: {}, exercises: {} });
          gate.exercises[slug] = { type: exercise.type, public: split.public };
        }
      }
    }
  }

  // Gated <Gated> texts (D-027), grouped by the event that opens them.
  for (const g of bundle.reserved.gated.gated) {
    const gate = (gates[g.by] ??= { texts: {}, exercises: {} });
    gate.texts[g.id] = g.md;
  }

  // The pattern map: exactly one lesson teaches each pattern (the one whose body includes its write-up).
  const teaching = new Map<string, { lesson: LessonPage; moduleSlug: string }>();
  for (const { module: moduleDoc, lessons } of bundle.modules) {
    for (const lesson of lessons) {
      for (const hit of walkUnits(lesson.body)) {
        if (typeof hit.include === 'string' && hit.include.startsWith('patterns/')) {
          const slug = hit.include.slice('patterns/'.length);
          if (teaching.has(slug)) throw new Error(`pattern ${slug} is included by more than one lesson`);
          teaching.set(slug, { lesson, moduleSlug: moduleDoc.frontmatter.slug });
        }
      }
    }
  }

  for (const doc of bundle.patterns.values()) {
    const fm = doc.frontmatter as PatternFrontmatter;
    const source = teaching.get(fm.slug);
    if (!source) throw new Error(`pattern ${fm.slug} is on no lesson page`);
    const lesson = source.lesson;
    const lessonSlug = lesson.frontmatter.slug;
    const hits = walkUnits(lesson.body);
    const unit = hits.find((h) => h.include === `patterns/${fm.slug}`);
    const entries: PatternMapEntry['exercises'] = [];
    const coreExercises: string[] = [];
    for (const exercise of lesson.exercises) {
      if (exercise.gatedBy) continue;
      const inStretch = hits.find((h) => h.exercise === exercise.id)?.unitKind === 'stretch';
      const slug = `${source.moduleSlug}/${lessonSlug}/${exercise.id}`;
      entries.push({ slug, type: exercise.type, core: !inStretch });
      if (!inStretch) coreExercises.push(slug);
    }
    const problems = bundle.bank
      .filter(isCoreProblem)
      .filter(
        (p) => p.module === source.moduleSlug && p.lesson === lessonSlug && p.hiddenUntilAttempted !== true,
      )
      .map((p) => String(p.num));
    patternMap[fm.slug] = {
      pattern: fm.slug,
      module: source.moduleSlug,
      lesson: lessonSlug,
      ...(unit?.unit ? { writeUpUnit: unit.unit } : {}),
      coreExercises,
      exercises: entries,
      problems,
    };
    searchIndex.push({
      type: 'pattern',
      id: fm.slug,
      title: `${fm.number} ${fm.title}`,
      module: source.moduleSlug,
    });
  }

  // Gate rules (public; the client checks them against its own documents).
  const gateRules = gateRulesFor(bundle);

  // The search index (D-017): titles, headings and public metadata only.
  for (const { module: moduleDoc, lessons, checkpoint } of bundle.modules) {
    const fm = moduleDoc.frontmatter as ModuleFrontmatter;
    searchIndex.push({
      type: 'module',
      id: fm.slug,
      title: fm.number === 0 ? 'Foundations' : `Module ${fm.number}: ${fm.title}`,
      module: fm.slug,
      text: fm.objectives,
    });
    for (const lesson of lessons) {
      const lf = lesson.frontmatter as unknown as {
        slug: string;
        title: string;
        topic?: string;
        goal?: string;
      };
      searchIndex.push({
        type: 'lesson',
        id: `${fm.slug}/${lf.slug}`,
        title: lf.title,
        module: fm.slug,
        text: [lf.topic, lf.goal].filter(Boolean).join(' ').slice(0, 400),
      });
    }
    if (checkpoint) {
      const cf = checkpoint.frontmatter as CheckpointFrontmatter;
      searchIndex.push({
        type: 'checkpoint',
        id: `${fm.slug}/checkpoint`,
        title: cf.title,
        module: fm.slug,
        text: cf.assessment?.topics ?? cf.mock?.topics ?? cf.topic,
      });
    }
  }
  for (const [id, doc] of bundle.handbook) {
    searchIndex.push({ type: 'handbook', id, title: doc.frontmatter.title });
  }
  for (const viz of VIZ_CATALOG) {
    searchIndex.push({ type: 'viz', id: viz.id, title: viz.title, module: viz.module });
  }
  for (const problem of bundle.bank) {
    if (!isCoreProblem(problem)) continue;
    const hidden = problem.hiddenUntilAttempted === true;
    searchIndex.push({
      type: 'problem',
      id: String(problem.num),
      title: hidden ? `Problem ${problem.num}` : problem.title,
      module: problem.module,
      text: hidden
        ? undefined
        : `LeetCode ${problem.difficulty} · ${problem.tier === 'C' ? 'core' : problem.tier === 'S' ? 'stretch' : 'optional'} · ${problem.pattern}`,
    });
  }

  // Module 12 problems whose pattern note stays back until an attempt (D-012).
  for (const problem of bundle.bank) {
    if (isCoreProblem(problem) && problem.hiddenUntilAttempted === true) {
      hiddenProblems[String(problem.num)] = {
        pattern: problem.pattern,
        prereq: problem.prereq,
        why: problem.why,
        hint: problem.hint,
      };
    }
  }

  const reserved: ReservedData = {
    assessments: Object.fromEntries(
      bundle.reserved.assessments.assessments.map((a) => [
        a.slug,
        { id: a.id, slug: a.slug, problems: a.problems },
      ]),
    ),
    mocks: Object.fromEntries(
      bundle.reserved.mocks.mocks.map((m) => [m.slug, { id: m.id, slug: m.slug, pool: m.pool }]),
    ),
    problems: hiddenProblems,
    gates,
  };

  return { keys, reserved, gateRules, patternMap, searchIndex };
}

function gateRulesFor(bundle: ContentBundle): GateRules {
  const rules: GateRules = {};
  // Assessment and mock gates open when the device holds a finished result for that checkpoint or mock (D-020).
  for (const { module: moduleDoc, checkpoint } of bundle.modules) {
    if (!checkpoint) continue;
    const cf = checkpoint.frontmatter as CheckpointFrontmatter;
    if (!cf.gateId) continue;
    if (cf.kind === 'mock' && cf.mock) rules[cf.gateId] = { kind: 'mock', mock: cf.mock.slug };
    else rules[cf.gateId] = { kind: 'checkpoint', checkpoint: `${moduleDoc.frontmatter.slug}/checkpoint` };
  }
  rules['placement'] = { kind: 'placement' };
  // The classification drill's answers open when one of its two copies is fully solved (D-020).
  rules['classification-drill'] = { kind: 'exercises', copies: classificationDrillCopies(bundle) };
  return rules;
}

/** The classification drill's exercise copies, from the pages that hold a unit titled "Classification drill". */
function classificationDrillCopies(bundle: ContentBundle): string[][] {
  const copies: string[][] = [];
  for (const { module: moduleDoc, lessons, checkpoint } of bundle.modules) {
    for (const page of [...lessons, ...(checkpoint ? [checkpoint] : [])]) {
      const items = walkUnits(page.body)
        .filter((h) => h.exercise && h.unit.toLowerCase().includes('classification-drill'))
        .map((h) => `${moduleDoc.frontmatter.slug}/${page.frontmatter.slug}/${h.exercise}`);
      if (items.length >= 10) copies.push(items);
    }
  }
  return copies;
}

// ---- writing and reading

function countsOf(data: RuntimeData): RuntimeCounts {
  return {
    keys: Object.keys(data.keys).length,
    assessments: Object.keys(data.reserved.assessments).length,
    mocks: Object.keys(data.reserved.mocks).length,
    problemDetails: Object.keys(data.reserved.problems).length,
    gates: Object.keys(data.reserved.gates).length,
    gateExercises: Object.values(data.reserved.gates).reduce(
      (n, g) => n + Object.keys(g.exercises).length,
      0,
    ),
    patterns: Object.keys(data.patternMap).length,
    searchEntries: data.searchIndex.length,
  };
}

/** Writes the two server-only files and the three public files; returns the counts. */
export function writeRuntimeData(data: RuntimeData, root = process.cwd()): RuntimeCounts {
  const generated = path.join(root, '.generated');
  const publicData = path.join(root, 'public', 'data');
  fs.mkdirSync(generated, { recursive: true });
  fs.mkdirSync(publicData, { recursive: true });
  fs.writeFileSync(path.join(generated, 'exercise-keys.json'), JSON.stringify(data.keys), 'utf8');
  fs.writeFileSync(path.join(generated, 'reserved.json'), JSON.stringify(data.reserved), 'utf8');
  fs.writeFileSync(path.join(publicData, 'gate-rules.json'), JSON.stringify(data.gateRules), 'utf8');
  fs.writeFileSync(path.join(publicData, 'pattern-map.json'), JSON.stringify(data.patternMap), 'utf8');
  fs.writeFileSync(
    path.join(publicData, 'search-index.json'),
    JSON.stringify({ version: 1, entries: data.searchIndex }),
    'utf8',
  );
  return countsOf(data);
}

const records = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

function readJson(file: string): unknown {
  const raw = fs.readFileSync(/* turbopackIgnore: true */ file, 'utf8');
  return JSON.parse(raw) as unknown;
}

let keysCache: Record<string, ServedKey> | null = null;

/** The answer keys behind `GET /api/exercises/{slug}/key` (D-011). */
export function readExerciseKeys(): Record<string, ServedKey> {
  keysCache ??= readJson(path.join(GENERATED_DIR, 'exercise-keys.json')) as Record<string, ServedKey>;
  return keysCache;
}

let reservedCache: ReservedData | null = null;

/** Reserved problems, mock pools, gated content behind the start, pool and gate endpoints (D-012, D-027). */
export function readReserved(): ReservedData {
  if (!reservedCache) {
    const raw = records(readJson(path.join(GENERATED_DIR, 'reserved.json')));
    reservedCache = {
      assessments: records(raw.assessments) as ReservedData['assessments'],
      mocks: records(raw.mocks) as ReservedData['mocks'],
      problems: records(raw.problems) as ReservedData['problems'],
      gates: records(raw.gates) as ReservedData['gates'],
    };
  }
  return reservedCache;
}
