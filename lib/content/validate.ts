// The checks behind `npm run content:check` (plan 6.7). Each returns a list of problems; any problem fails the build.
import { codeComments, VISIBLE_CODE_FIELDS, walkTextFields } from './exercise-text';
import { EXPECTED_COUNTS } from './expected';
import type { ContentBundle, MdxDoc, PageContent } from './load';
import { inspectMdx, type MdxFacts } from './mdx';
import type { Allowlist, Exercise } from './schema';

export interface LearnerText {
  /** Where the text lives, for messages and for scoping allowlist entries. */
  location: string;
  text: string;
  /** Text never ships before its gate opens, so the reserved-problem check skips it. */
  gated?: boolean;
  /** A link target: read by the reserved-problem check, and not wording for the date check. */
  url?: boolean;
  /**
   * A visualizer note from a random input, with its numbers blanked (lib/viz/text.ts). The date check reads it; the
   * reserved-problem check, which looks for problem numbers, reads the same wording on the default and preset inputs.
   */
  numbersBlanked?: boolean;
}

interface InspectedDoc {
  location: string;
  doc: MdxDoc<unknown>;
  facts: MdxFacts;
  page?: PageContent<unknown>;
  scope?: string;
}

const cache = new WeakMap<ContentBundle, InspectedDoc[]>();

/** Every MDX document, inspected once. */
export function inspectAll(bundle: ContentBundle): InspectedDoc[] {
  const cached = cache.get(bundle);
  if (cached) return cached;
  const out: InspectedDoc[] = [];
  const add = (location: string, doc: MdxDoc<unknown>, page?: PageContent<unknown>, scope?: string) =>
    out.push({ location, doc, facts: inspectMdx(doc.body), page, scope });
  for (const { module, lessons, checkpoint } of bundle.modules) {
    const m = module.frontmatter.slug;
    add(`module:${m}`, module, undefined, `${m}/overview`);
    for (const lesson of lessons) {
      const scope = `${m}/${lesson.frontmatter.slug}`;
      add(`lesson:${scope}`, lesson, lesson, scope);
    }
    if (checkpoint) add(`lesson:${m}/checkpoint`, checkpoint, checkpoint, `${m}/checkpoint`);
  }
  for (const [id, doc] of bundle.theory) add(`theory:${id.slice('theory/'.length)}`, doc);
  for (const [id, doc] of bundle.patterns) add(`pattern:${id.slice('patterns/'.length)}`, doc);
  for (const [id, doc] of bundle.handbook) add(`handbook:${id.slice('handbook/'.length)}`, doc);
  cache.set(bundle, out);
  return out;
}

const allExercises = (bundle: ContentBundle): { scope: string; exercise: Exercise }[] =>
  bundle.modules.flatMap(({ module, lessons, checkpoint }) => {
    const m = module.frontmatter.slug;
    const pages = [
      ...lessons.map((l) => ({ scope: `${m}/${l.frontmatter.slug}`, page: l })),
      ...(checkpoint ? [{ scope: `${m}/checkpoint`, page: checkpoint }] : []),
    ];
    return pages.flatMap(({ scope, page }) => page.exercises.map((exercise) => ({ scope, exercise })));
  });

/** Every piece of text a learner can read, wherever it is stored. */
export function learnerTexts(bundle: ContentBundle): LearnerText[] {
  const out: LearnerText[] = [];
  const push = (location: string, text: string | undefined, gated = false) => {
    if (text) out.push({ location, text, gated });
  };
  const pushAll = (location: string, value: unknown) => {
    if (typeof value === 'string') push(location, value);
    else if (Array.isArray(value)) value.forEach((v) => pushAll(location, v));
  };

  for (const { location, doc, facts } of inspectAll(bundle)) {
    for (const t of facts.text) push(location, t);
    for (const url of facts.urls) out.push({ location, text: url, url: true });
    if (!location.startsWith('lesson:') && !location.startsWith('module:')) {
      push(`${location}#title`, (doc.frontmatter as { title: string }).title);
    }
  }

  for (const { module, lessons, checkpoint } of bundle.modules) {
    const fm = module.frontmatter;
    const m = fm.slug;
    push(`module:${m}#title`, fm.title);
    push(`module:${m}#objectives`, fm.objectives);
    push(`module:${m}#shortOnTime`, fm.shortOnTime);
    pushAll(`module:${m}#notes`, fm.notes);
    push(`module:${m}#final`, fm.final?.topic);
    push(`module:${m}#final`, fm.final?.doneWhen);

    const pages: PageContent<Record<string, unknown>>[] = [
      ...(lessons as unknown as PageContent<Record<string, unknown>>[]),
      ...(checkpoint ? [checkpoint as unknown as PageContent<Record<string, unknown>>] : []),
    ];
    for (const page of pages) {
      const scope = `${m}/${page.frontmatter.slug as string}`;
      for (const key of ['title', 'goal', 'why', 'prereqs', 'outcomes', 'ready', 'summary', 'revision', 'topic', 'implement', 'problemsText', 'doneWhen']) {
        pushAll(`lesson:${scope}#${key}`, page.frontmatter[key]);
      }
      const warmup = page.frontmatter.warmup as { note?: string } | undefined;
      push(`lesson:${scope}#warmup`, warmup?.note);
      const a = page.frontmatter.assessment as Record<string, unknown> | undefined;
      if (a) {
        push(`lesson:${scope}#assessment`, a.topics as string);
        push(`lesson:${scope}#assessment`, (a.cold as { text: string }).text);
        push(`lesson:${scope}#assessment`, a.unseen as string);
      }
      const mock = page.frontmatter.mock as { topics: string } | undefined;
      push(`lesson:${scope}#mock`, mock?.topics);
      for (const anno of page.annotated) {
        const location = `annotated:${scope}/${anno.id}`;
        push(location, anno.title);
        for (const note of Object.values(anno.notes)) push(location, note);
        for (const comment of codeComments(anno.code)) push(location, comment);
      }
    }
  }

  for (const { scope, exercise } of allExercises(bundle)) {
    const location = `exercise:${scope}/${exercise.id}`;
    const gated = Boolean(exercise.gatedBy);
    const copy = exercise as unknown as Record<string, unknown>;
    walkTextFields(copy, (text, p) => push(`${location}#${p}`, text, gated));
    for (const field of VISIBLE_CODE_FIELDS) {
      const code = copy[field];
      if (typeof code === 'string') for (const c of codeComments(code)) push(`${location}#${field}`, c, gated);
    }
  }

  for (const p of bundle.bank) {
    const location = `bank:${p.num}`;
    push(`${location}#title`, p.title);
    out.push({ location: `${location}#url`, text: p.url, url: true });
    if ('pattern' in p) {
      const hidden = Boolean(p.hiddenUntilAttempted);
      push(`${location}#pattern`, p.pattern, hidden);
      push(`${location}#prereq`, p.prereq, hidden);
      push(`${location}#why`, p.why, hidden);
      push(`${location}#hint`, p.hint, hidden);
    } else push(`${location}#usedIn`, p.usedIn);
  }

  for (const g of bundle.reserved.gated.gated) push(`gated:${g.id}`, g.md, true);
  for (const note of bundle.reserved.mocks.notes) push('reserved:mocks#notes', note, true);
  return out;
}

const PROBLEM = (location: string, message: string) => `${location}: ${message}`;

// ---- MDX rules

export function checkMdxRules(bundle: ContentBundle): string[] {
  return inspectAll(bundle).flatMap(({ doc, facts }) => facts.problems.map((p) => PROBLEM(doc.path, p)));
}

// ---- references

export function checkReferences(bundle: ContentBundle, knownVisualizers: Set<string>): string[] {
  const problems: string[] = [];
  const includes = new Set([...bundle.theory.keys(), ...bundle.patterns.keys(), ...bundle.handbook.keys()]);
  const bankNums = new Set(bundle.bank.map((p) => p.num));
  const coreBankNums = new Set(bundle.bank.filter((p) => 'tier' in p).map((p) => p.num));
  const gated = new Set(bundle.reserved.gated.gated.map((g) => g.id));
  const patterns = new Set([...bundle.patterns.values()].map((p) => p.frontmatter.slug));
  const lessons = new Set<string>();
  const modules = new Set(bundle.modules.map((m) => m.module.frontmatter.slug));
  const gates = new Set([
    ...bundle.reserved.assessments.assessments.map((a) => a.slug),
    ...bundle.reserved.mocks.mocks.map((m) => m.slug),
    'placement',
    'classification-drill',
  ]);
  for (const m of bundle.modules) {
    for (const l of m.lessons) lessons.add(`${m.module.frontmatter.slug}/${l.frontmatter.slug}`);
    if (m.checkpoint) lessons.add(`${m.module.frontmatter.slug}/checkpoint`);
  }

  for (const { doc, facts, page } of inspectAll(bundle)) {
    const exercises = new Set(page?.exercises.map((e) => e.id));
    const annotated = new Set(page?.annotated.map((a) => a.id));
    const usedExercises = new Set<string>();
    const usedAnnotated = new Set<string>();
    for (const { name, props } of facts.components) {
      const id = String(props.id ?? '');
      if (name === 'Include' && !includes.has(id)) problems.push(PROBLEM(doc.path, `no include target ${id}`));
      if (name === 'Viz' && !knownVisualizers.has(id)) problems.push(PROBLEM(doc.path, `no visualizer ${id}`));
      if (name === 'Exercise') {
        usedExercises.add(id);
        if (!exercises.has(id)) problems.push(PROBLEM(doc.path, `no exercise ${id} in its YAML file`));
      }
      if (name === 'AnnotatedCode') {
        usedAnnotated.add(id);
        if (!annotated.has(id)) problems.push(PROBLEM(doc.path, `no annotated code ${id} in its YAML file`));
      }
      if (name === 'Gated' && !gated.has(id)) problems.push(PROBLEM(doc.path, `no gated text ${id}`));
      if (name === 'Problem' && !bankNums.has(Number(props.num))) problems.push(PROBLEM(doc.path, `no problem ${String(props.num)}`));
      if (name === 'PatternLink' && !patterns.has(String(props.slug))) problems.push(PROBLEM(doc.path, `no pattern ${String(props.slug)}`));
      if (name === 'LessonLink' && !lessons.has(String(props.slug))) problems.push(PROBLEM(doc.path, `no lesson ${String(props.slug)}`));
      if (name === 'Term') problems.push(PROBLEM(doc.path, `no glossary yet, so <Term id="${id}"> cannot resolve`));
    }
    for (const id of exercises) if (!usedExercises.has(id)) problems.push(PROBLEM(doc.path, `exercise ${id} is on no page`));
    for (const id of annotated) if (!usedAnnotated.has(id)) problems.push(PROBLEM(doc.path, `annotated code ${id} is on no page`));
  }

  for (const entry of bundle.track.modules) {
    if (!modules.has(entry.slug)) problems.push(PROBLEM('track.yaml', `no module ${entry.slug}`));
    for (const p of entry.prerequisites) if (!modules.has(p)) problems.push(PROBLEM('track.yaml', `no prerequisite ${p}`));
    for (const l of entry.lessons) {
      if (!lessons.has(`${entry.slug}/${l}`)) problems.push(PROBLEM('track.yaml', `no lesson ${entry.slug}/${l}`));
    }
  }
  if (!knownVisualizers.has(bundle.track.map)) problems.push(PROBLEM('track.yaml', `no visualizer ${bundle.track.map}`));

  for (const p of bundle.bank) {
    if ('tier' in p && !lessons.has(`${p.module}/${p.lesson}`)) {
      problems.push(PROBLEM('problems/bank.yaml', `${p.num}: no lesson ${p.module}/${p.lesson}`));
    }
  }

  for (const { module, lessons: pages, checkpoint } of bundle.modules) {
    const all: PageContent<Record<string, unknown>>[] = [
      ...(pages as unknown as PageContent<Record<string, unknown>>[]),
      ...(checkpoint ? [checkpoint as unknown as PageContent<Record<string, unknown>>] : []),
    ];
    for (const page of all) {
      const fm = page.frontmatter;
      const warmup = fm.warmup as { problem: number } | undefined;
      if (warmup && !bankNums.has(warmup.problem)) problems.push(PROBLEM(page.path, `no warm-up problem ${warmup.problem}`));
      for (const p of (fm.problems ?? []) as { num: number }[]) {
        if (!coreBankNums.has(p.num)) problems.push(PROBLEM(page.path, `no problem ${p.num} in the bank`));
      }
      for (const r of (fm.resolves ?? []) as { problems: number[] }[]) {
        for (const n of r.problems) if (!coreBankNums.has(n)) problems.push(PROBLEM(page.path, `no re-solve ${n} in the bank`));
      }
      const cold = (fm.assessment as { cold: { problems: number[] } } | undefined)?.cold;
      for (const n of cold?.problems ?? []) if (!coreBankNums.has(n)) problems.push(PROBLEM(page.path, `no cold re-solve ${n} in the bank`));
      for (const e of page.exercises) {
        if (e.gatedBy && !gates.has(e.gatedBy) && e.gatedBy !== (fm.gateId as string | undefined)) {
          problems.push(PROBLEM(page.path, `${e.id}: no gate ${e.gatedBy}`));
        }
      }
    }
    void module;
  }
  for (const g of bundle.reserved.gated.gated) {
    if (!gates.has(g.by)) problems.push(PROBLEM('reserved/gated.yaml', `${g.id}: no gate ${g.by}`));
  }
  return problems;
}

// ---- slugs and the lock

/** Every stable id in the content, in the form used by content/ids.lock.json. */
export function currentIds(bundle: ContentBundle): Set<string> {
  const ids = new Set<string>();
  for (const { module, lessons, checkpoint } of bundle.modules) {
    const m = module.frontmatter.slug;
    ids.add(`module:${m}`);
    const pages: { slug: string; page: PageContent<unknown> }[] = [
      ...lessons.map((l) => ({ slug: l.frontmatter.slug, page: l as PageContent<unknown> })),
      ...(checkpoint ? [{ slug: 'checkpoint', page: checkpoint as PageContent<unknown> }] : []),
    ];
    for (const { slug, page } of pages) {
      ids.add(`lesson:${m}/${slug}`);
      for (const e of page.exercises) ids.add(`exercise:${m}/${slug}/${e.id}`);
    }
  }
  for (const { facts, scope } of inspectAll(bundle)) {
    if (!scope) continue;
    for (const { name, props } of facts.components) {
      if (name === 'Unit') ids.add(`unit:${scope}/${String(props.id)}`);
      if (name === 'Viz') ids.add(`visualizer:${String(props.id)}`);
    }
  }
  ids.add(`visualizer:${bundle.track.map}`);
  for (const id of bundle.theory.keys()) ids.add(`theory:${id.slice('theory/'.length)}`);
  for (const doc of bundle.patterns.values()) ids.add(`pattern:${doc.frontmatter.slug}`);
  for (const id of bundle.handbook.keys()) ids.add(`handbook:${id.slice('handbook/'.length)}`);
  for (const p of bundle.bank) if ('tier' in p) ids.add(`problem:${p.num}`);
  return ids;
}

export function checkSlugs(bundle: ContentBundle): string[] {
  const problems: string[] = [];
  const current = currentIds(bundle);
  const locked = new Set(bundle.idsLock.ids);
  for (const id of locked) {
    if (current.has(id)) continue;
    const alias = bundle.idsLock.aliases[id];
    if (!alias) problems.push(PROBLEM('ids.lock.json', `${id} was released and is gone, with no alias`));
    else if (!current.has(alias)) problems.push(PROBLEM('ids.lock.json', `alias of ${id} points at ${alias}, which does not exist`));
  }
  for (const id of current) {
    if (!locked.has(id)) problems.push(PROBLEM('ids.lock.json', `${id} is new: add it to the lock`));
  }

  const seen = new Map<string, string>();
  const unique = (key: string, where: string) => {
    const other = seen.get(key);
    if (other) problems.push(PROBLEM(where, `duplicate slug ${key} (also in ${other})`));
    seen.set(key, where);
  };
  for (const { module, lessons, checkpoint } of bundle.modules) {
    const m = module.frontmatter.slug;
    unique(`module:${m}`, module.path);
    for (const page of [...lessons, ...(checkpoint ? [checkpoint] : [])]) {
      unique(`lesson:${m}/${page.frontmatter.slug}`, page.path);
      const exercises = new Set<string>();
      for (const e of page.exercises) {
        if (exercises.has(e.id)) problems.push(PROBLEM(page.path, `duplicate exercise id ${e.id}`));
        exercises.add(e.id);
      }
    }
  }
  for (const { facts, doc, scope } of inspectAll(bundle)) {
    const units = new Set<string>();
    for (const { name, props } of facts.components) {
      if (name !== 'Unit') continue;
      const id = String(props.id);
      if (units.has(id)) problems.push(PROBLEM(doc.path, `duplicate unit id ${id} in ${scope ?? 'this page'}`));
      units.add(id);
    }
  }
  const nums = new Set<number>();
  for (const p of bundle.bank) {
    if (nums.has(p.num)) problems.push(PROBLEM('problems/bank.yaml', `duplicate problem ${p.num}`));
    nums.add(p.num);
  }
  return problems;
}

// ---- coverage

export function checkCoverage(bundle: ContentBundle): string[] {
  const problems: string[] = [];
  const included = new Map<string, string[]>();
  for (const { facts, location } of inspectAll(bundle)) {
    if (!location.startsWith('lesson:') && !location.startsWith('module:')) continue;
    for (const { name, props } of facts.components) {
      if (name !== 'Include') continue;
      const id = String(props.id);
      included.set(id, [...(included.get(id) ?? []), location]);
    }
  }
  for (const id of [...bundle.theory.keys(), ...bundle.patterns.keys()]) {
    if (!included.has(id)) problems.push(PROBLEM(id, 'this fragment is included by no lesson'));
  }
  for (const m of bundle.modules) {
    const fm = m.module.frontmatter;
    if (fm.number > 0 && !fm.objectives) problems.push(PROBLEM(m.module.path, 'no learning objectives'));
  }
  return problems;
}

// ---- dates and timetable wording

export const DATE_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'weekday', re: /\b(?:Mon|Tues?|Wed|Thu|Thur|Thurs|Fri|Sat|Sun)\b/g },
  { name: 'weekday', re: /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\b/g },
  {
    name: 'calendar date',
    re: /\b\d{1,2}(?:st|nd|rd|th)? (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\b|\b(?:Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]* \d{1,2}\b/g,
  },
  { name: 'month name', re: /\b(?:January|February|March|April|June|July|August|September|October|November|December)\b/g },
  { name: 'calendar date', re: /\b\d{4}-\d{2}-\d{2}\b/g },
  { name: 'year', re: /\b202\d\b/g },
  { name: 'schedule code', re: /\bW\d+(?:D\d+)?\b/g },
  { name: 'week', re: /\b[Ww]eeks?\b|\b[Ww]eekly\b|\b[Ww]eekdays?\b|\b[Ww]eekends?\b/g },
  { name: 'day', re: /\b[Dd]ays?\b|\b[Dd]aily\b/g },
  { name: 'relative day', re: /\b[Tt]oday(?:'s)?\b|\b[Tt]omorrow(?:'s)?\b|\b[Yy]esterday(?:'s)?\b|\b[Tt]onight\b/g },
  { name: 'month', re: /\b[Mm]onths?\b/g },
  { name: 'holiday', re: /\b[Hh]olidays?\b|\bChristmas\b|\bNew Year\b/g },
  { name: 'calendar', re: /\b[Cc]alendar\b/g },
  { name: 'pressure word', re: /\b[Oo]verdue\b|\b[Dd]eadlines?\b|\b[Ss]treaks?\b/g },
  { name: 'falling behind', re: /\b[Ff]all(?:ing)? behind\b|\b[Ff]ell behind\b|\b[Cc]atch[- ]up\b/g },
  { name: 'old name', re: /\b[Rr]oadmap\b|\bClaude\b|\bTrack [ABC]\b|\bMERN\b/g },
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Blanks the allowlisted phrases out of a text, and notes which entries were used. */
function maskAllowed(text: string, location: string, list: Allowlist, used: Set<number>): string {
  let out = text;
  list.entries.forEach((entry, i) => {
    if (entry.in && !location.startsWith(entry.in)) return;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(entry.match)}(?![\\p{L}\\p{N}])`, 'gu');
    const next = out.replace(re, (m) => ' '.repeat(m.length));
    if (next !== out) used.add(i);
    out = next;
  });
  return out;
}

const unusedEntries = (list: Allowlist, used: Set<number>, file: string): string[] =>
  list.entries.flatMap((entry, i) => (used.has(i) ? [] : [PROBLEM(file, `entry "${entry.match}" matches nothing: remove it`)]));

export function checkDates(bundle: ContentBundle, texts = learnerTexts(bundle)): string[] {
  const problems: string[] = [];
  const used = new Set<number>();
  for (const { location, text, url } of texts) {
    if (url) continue;
    const masked = maskAllowed(text, location, bundle.allowlists.dates, used);
    for (const { name, re } of DATE_PATTERNS) {
      for (const m of masked.matchAll(re)) {
        const at = m.index;
        const context = masked.slice(Math.max(0, at - 50), at + m[0].length + 50).replace(/\s+/g, ' ');
        problems.push(PROBLEM(location, `${name} "${m[0]}" in: …${context}…`));
      }
    }
  }
  return [...problems, ...unusedEntries(bundle.allowlists.dates, used, 'allowlists/dates.yaml')];
}

// ---- reserved problems

/** The sentences that give a reserved problem away without naming it (inventory 13). */
export const RESERVED_PARAPHRASES = [
  'divisible by k',
  'stock span',
  'consecutive previous days',
  'difference between node and ancestor',
];

/** Names of Module 12 problems that the theory used next to their pattern (plan question 5c). */
export const MODULE_12_NAMES = ['Time Map', 'GetRandom O(1)'];

const M12_NUMBERS = [438, 287, 853, 981, 380, 678];

export function checkReserved(bundle: ContentBundle, texts = learnerTexts(bundle)): string[] {
  const problems: string[] = [];
  const used = new Set<number>();
  const reserved = [
    ...bundle.reserved.assessments.assessments.flatMap((a) => a.problems),
    ...bundle.reserved.mocks.mocks.flatMap((m) => m.pool),
  ];
  const needles: { label: string; re: RegExp }[] = [];
  for (const p of reserved) {
    const slug = p.url.match(/\/problems\/([a-z0-9-]+)/)?.[1];
    needles.push({ label: `title of ${p.num}`, re: new RegExp(escapeRe(p.title), 'gi') });
    if (slug) needles.push({ label: `URL slug of ${p.num}`, re: new RegExp(`\\b${escapeRe(slug)}\\b`, 'g') });
    needles.push({
      label: `number ${p.num} in context`,
      re: new RegExp(`(?:LeetCode|[Pp]roblems?|#)\\s*${p.num}\\b|\\(${p.num}\\)|\\b${p.num}\\.\\s+[A-Z]`, 'g'),
    });
    needles.push({ label: `number ${p.num}`, re: new RegExp(`(?<![\\d.,^])\\b${p.num}\\b(?![\\d,.]*\\d)`, 'g') });
  }
  for (const phrase of RESERVED_PARAPHRASES) needles.push({ label: 'clue', re: new RegExp(escapeRe(phrase), 'gi') });
  for (const name of MODULE_12_NAMES) needles.push({ label: 'Module 12 name', re: new RegExp(escapeRe(name), 'g') });

  const m12Theory: { label: string; re: RegExp }[] = M12_NUMBERS.map((n) => ({
    label: `Module 12 problem ${n}`,
    re: new RegExp(`(?<![\\d.,^])\\b${n}\\b(?![\\d,.]*\\d)`, 'g'),
  }));

  for (const { location, text, gated, numbersBlanked } of texts) {
    if (gated || numbersBlanked) continue;
    const masked = maskAllowed(text, location, bundle.allowlists.reserved, used);
    let list = location.startsWith('theory:') || location.startsWith('pattern:') ? [...needles, ...m12Theory] : needles;
    // A Module 12 problem's own bank entry may carry its name; the rule is about naming it next to a pattern.
    if (location.startsWith('bank:')) list = list.filter((n) => n.label !== 'Module 12 name');
    for (const { label, re } of list) {
      for (const m of masked.matchAll(re)) {
        const at = m.index;
        const context = masked.slice(Math.max(0, at - 50), at + m[0].length + 50).replace(/\s+/g, ' ');
        problems.push(PROBLEM(location, `${label} "${m[0]}" in: …${context}…`));
      }
    }
  }
  return [...problems, ...unusedEntries(bundle.allowlists.reserved, used, 'allowlists/reserved.yaml')];
}

// ---- counts

export function contentCounts(bundle: ContentBundle): Record<string, unknown> {
  const count = <T>(items: T[], key: (t: T) => string): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const item of items) out[key(item)] = (out[key(item)] ?? 0) + 1;
    return out;
  };
  const exercises = allExercises(bundle);
  const docs = inspectAll(bundle);
  const uses = (name: string, filter: (location: string) => boolean = () => true) =>
    docs.filter((d) => filter(d.location)).flatMap((d) => d.facts.components.filter((c) => c.name === name));
  const inLessons = (location: string) => location.startsWith('lesson:') || location.startsWith('module:');
  const includes = uses('Include', inLessons).map((c) => String(c.props.id));
  const viz = [...uses('Viz').map((c) => String(c.props.id)), bundle.track.map];
  const bank = bundle.bank.flatMap((p) => ('tier' in p ? [p] : []));
  const runnable = exercises.flatMap(({ exercise: e }) => ('tests' in e ? e.tests : []));
  return {
    modules: bundle.modules.length,
    lessons: bundle.modules.reduce((n, m) => n + m.lessons.length, 0),
    checkpoints: bundle.modules.filter((m) => m.checkpoint).length,
    theoryFragments: bundle.theory.size,
    patterns: bundle.patterns.size,
    objectives: bundle.modules.filter((m) => m.module.frontmatter.objectives).length,
    exercises: exercises.length,
    exercisesByType: count(exercises, (e) => e.exercise.type),
    exercisesByModule: count(exercises, (e) => e.scope.split('/')[0] as string),
    units: uses('Unit', inLessons).length,
    fragmentIncludes: includes.filter((id) => !id.startsWith('handbook/')).length,
    subsectionIncludes: includes.filter((id) => id.startsWith('handbook/')).length,
    vizEmbeds: viz.length,
    vizUnique: new Set(viz).size,
    bank: bank.length,
    bankByTier: count(bank, (p) => p.tier),
    bankByModule: count(bank, (p) => p.module),
    extensionProblems: bundle.bank.length - bank.length,
    assessments: bundle.reserved.assessments.assessments.length,
    mocks: bundle.reserved.mocks.mocks.length,
    reservedProblems:
      bundle.reserved.assessments.assessments.reduce((n, a) => n + a.problems.length, 0) +
      bundle.reserved.mocks.mocks.reduce((n, m) => n + m.pool.length, 0),
    reservedAssessmentProblems: bundle.reserved.assessments.assessments.reduce((n, a) => n + a.problems.length, 0),
    reservedMockProblems: bundle.reserved.mocks.mocks.reduce((n, m) => n + m.pool.length, 0),
    handbookSections: [...bundle.handbook.values()].filter((d) => d.frontmatter.slug === 'index').length,
    handbookPages: bundle.handbook.size,
    gatedExercises: exercises.filter((e) => e.exercise.gatedBy).length,
    gatedTexts: bundle.reserved.gated.gated.length,
    runnableTests: runnable.length,
    hiddenTests: runnable.filter((t) => t.hidden).length,
    traceRows: exercises.flatMap(({ exercise: e }) => (e.type === 'trace' ? e.rows : [])).length,
    fillAlternatives: exercises.flatMap(({ exercise: e }) => (e.type === 'fill' ? e.blanks.flatMap((b) => b.accept) : [])).length,
  };
}

export function checkCounts(bundle: ContentBundle): string[] {
  const counts = contentCounts(bundle);
  const problems: string[] = [];
  const expected = EXPECTED_COUNTS as Record<string, unknown>;
  for (const key of new Set([...Object.keys(expected), ...Object.keys(counts)])) {
    const want = JSON.stringify(sortKeys(expected[key]));
    const got = JSON.stringify(sortKeys(counts[key]));
    if (want !== got) problems.push(PROBLEM('counts', `${key}: expected ${want}, found ${got}`));
  }
  return problems;
}

function sortKeys(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}

// ---- all together

/** `vizTexts`: what the visualizers show in words (lib/viz/text.ts), checked with the content's own text. */
export function validateContent(
  bundle: ContentBundle,
  knownVisualizers: Set<string>,
  vizTexts: LearnerText[] = [],
): string[] {
  const texts = [...learnerTexts(bundle), ...vizTexts];
  return [
    ...checkMdxRules(bundle),
    ...checkReferences(bundle, knownVisualizers),
    ...checkSlugs(bundle),
    ...checkCoverage(bundle),
    ...checkDates(bundle, texts),
    ...checkReserved(bundle, texts),
    ...checkCounts(bundle),
  ];
}
