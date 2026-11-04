// Turns the rewritten legacy course into the files of content/ (plan 6.1). Nothing here changes wording: every text
// change has already happened in legacy-source.ts and is in the change log, or is a structural drop the report lists.
import { dump } from 'js-yaml';
import { parseTimeCell } from '../../lib/content/estimates';
import { ALLOWLIST_DATES, ALLOWLIST_RESERVED } from './allowlists';
import {
  parseExtraFile,
  parseWeekFile,
  type Block,
  type NumberedLine,
  type ParsedPage,
  type RawAnno,
  type RawExercise,
} from './blocks';
import {
  CONTENT_FILES,
  createFieldRewriter,
  readLegacyLines,
  rewriteContentFile,
  rewriteRoadmap,
  ROADMAP_FILE,
} from './legacy-source';
import { escapeForMdx, jsxAttribute } from './mdx-escape';
import type { FieldChange, LineChange } from './rewrite-engine';
import {
  parseAssessments,
  parseBank,
  parseProblems,
  parseSchedule,
  parseSectionsMd,
  parseTheory,
  splitCells,
  type ScheduleDay,
  type Section,
} from './roadmap-parser';
import {
  checkpointSlug,
  fragmentSlug,
  HANDBOOK_SECTIONS,
  lessonFile,
  moduleDir,
  MODULES,
  patternSlug,
  slugify,
  subsectionSlug,
  uniqueSlug,
} from './slugs';

export interface BuildResult {
  files: Map<string, string>;
  changes: { lines: LineChange[]; fields: FieldChange[] };
  counts: Record<string, unknown>;
  drops: { what: string; where: string; reason: string }[];
  warnings: string[];
  /** For docs/slug-review.md. */
  slugs: {
    modules: { number: number; slug: string; title: string; rows: SlugRow[] }[];
    ids: string[];
  };
}

export interface SlugRow {
  legacyId: string;
  slug: string;
  title: string;
}

const DUMP = { lineWidth: -1, noRefs: true, sortKeys: false } as const;
const toYaml = (data: unknown): string => dump(data, DUMP);
const mdxFile = (frontmatter: unknown, body: string): string =>
  `---\n${toYaml(frontmatter)}---\n\n${body.trim()}\n`;

/** Reserved text that a page references through <Gated id>, kept out of every page payload (D-012, rule 4). */
interface GatedItem {
  id: string;
  by: string;
  md: string;
  source: { file: string; lines: [number, number] };
}

const GATED_MARKER = /GATED\(([a-z0-9-]+)\)/g;

/** What each module's Saturday page becomes (plan 5.1). */
const CHECKPOINTS: Record<
  number,
  { kind: 'drill' | 'assessment' | 'mock'; id?: number | string; n?: number }
> = {
  1: { kind: 'drill' },
  2: { kind: 'assessment', id: 'A1', n: 1 },
  3: { kind: 'drill' },
  4: { kind: 'assessment', id: 'A2', n: 2 },
  5: { kind: 'mock', id: 1, n: 1 },
  6: { kind: 'assessment', id: 'A3', n: 3 },
  7: { kind: 'mock', id: 2, n: 2 },
  8: { kind: 'assessment', id: 'A4', n: 4 },
  9: { kind: 'mock', id: 3, n: 3 },
  10: { kind: 'assessment', id: 'A5', n: 5 },
  11: { kind: 'mock', id: 4, n: 4 },
  12: { kind: 'assessment', id: 'A6', n: 6 },
};

/** The two mocks that are lessons rather than checkpoints. */
const LESSON_MOCKS: Record<string, number> = { w12d3: 5, w12d5: 6 };

/** The classification-drill statement that restates a problem of Assessment 1 (inventory 13). */
const GATED_EXERCISES: Record<string, string> = { 'w3sat-6': 'assessment-1', 'method-6': 'assessment-1' };

/** Legacy `##` tags are unit kinds; untagged headings exist only on overview and Saturday pages. */
function unitKind(tag: string, title: string): { kind: string; phase?: 'before' | 'attempt' | 'after' } {
  if (tag) return { kind: tag };
  if (/^How this module fits together$/.test(title)) return { kind: 'overview' };
  if (/^Before you start$/.test(title)) return { kind: 'before', phase: 'before' };
  if (/^(Complexity drill|Classification drill)/.test(title)) return { kind: 'drill', phase: 'attempt' };
  if (/^Mock \d$/.test(title)) return { kind: 'mock', phase: 'attempt' };
  if (/^(After the assessment|Quick review)/.test(title)) return { kind: 'after', phase: 'after' };
  throw new Error(`no unit kind for untagged heading "${title}"`);
}

const parseWarmup = (cell: string): { problem: number; note?: string } | null => {
  const text = cell.trim();
  if (!text || text === '—') return null;
  const plain = text.match(/^(\d+)$/);
  if (plain) return { problem: Number(plain[1]) };
  const paren = text.match(/^(\d+) \((.+)\)$/);
  if (paren) return { problem: Number(paren[1]), note: paren[2] as string };
  const diag = text.match(/^(.+) \((\d+)\)$/);
  if (diag) return { problem: Number(diag[2]), note: diag[1] as string };
  const words = text.match(/^(\d+) (.+)$/);
  if (words) return { problem: Number(words[1]), note: words[2] as string };
  throw new Error(`unparsed warm-up: ${cell}`);
};

/** "Re-solve: 54, 242, 1, 128 or 217" and "Mock 1 (…); re-solve 90, 146, 34" become lists of choices. */
export function parseResolves(cell: string): { problems: number[] }[] {
  const m = cell.match(/re-solves? ?:? ?([\d,\s]+(?:or \d+)?(?:,\s*[\d\s]+(?:or \d+)?)*)$/i);
  if (!m) return [];
  return (m[1] as string)
    .split(',')
    .map((part) => ({ problems: (part.match(/\d+/g) ?? []).map(Number) }))
    .filter((r) => r.problems.length > 0);
}

export function buildContent(): BuildResult {
  const warnings: string[] = [];
  const files = new Map<string, string>();
  const drops: BuildResult['drops'] = [];
  const write = (rel: string, text: string) => {
    if (files.has(rel)) warnings.push(`two items write ${rel}`);
    files.set(rel, text);
  };

  // ---- roadmap: the original gives structure and line ranges, the rewritten text gives every word
  const originalLines = readLegacyLines(ROADMAP_FILE);
  const originalTheory = parseTheory(originalLines);
  const original = parseAssessments(originalLines);
  const originalSections = parseSectionsMd(originalLines);
  const originalBank = parseBank(originalLines);

  const road = rewriteRoadmap();
  const lineChanges: LineChange[] = [...road.changes];
  const roadLines = road.lines.map((l) => l.text);
  const theory = parseTheory(roadLines);
  const schedule = parseSchedule(roadLines);
  const bank = parseBank(roadLines);
  const sections = parseSectionsMd(roadLines);

  if (bank.length !== originalBank.length) warnings.push('the rewritten bank has a different number of rows');

  // ---- theory fragments and patterns
  const includeIdOf: Record<string, string> = {}; // `${week}|${originalKey}` -> include id
  const patternIndex: { number: string; slug: string; title: string; module: string }[] = [];
  const objectives: Record<number, string> = {};
  const fragmentMap: Record<string, string> = {};

  for (const m of MODULES.filter((x) => x.number > 0)) {
    const w = m.number;
    const orig = originalTheory[w];
    const next = theory[w];
    if (!orig || !next) throw new Error(`no theory for week ${w}`);
    if (orig.order.length !== next.order.length)
      warnings.push(`W${w}: rewriting changed the number of fragments`);
    const taken = new Set<string>();
    orig.order.forEach((key, i) => {
      const newKey = next.order[i] as string;
      const body = next.frags[newKey] as string;
      const lines = orig.ranges[key] as [number, number];
      if (key === 'A. Learning objectives') {
        objectives[w] = body;
        fragmentMap[`W${w} · ${key}`] = `modules/${m.slug}#objectives`;
        return;
      }
      if (/^Pattern \d+\.\d+$/.test(key)) {
        const titleLine = body.split('\n')[0] as string;
        const title = (titleLine.match(/^\*\*Pattern \d+\.\d+: (.+)\*\*$/)?.[1] ?? '').trim();
        if (!title) warnings.push(`W${w}: no title in "${titleLine}"`);
        const slug = patternSlug(title);
        const number = key.replace('Pattern ', '');
        patternIndex.push({ number, slug, title, module: m.slug });
        const id = `patterns/${slug}`;
        includeIdOf[`${w}|${key}`] = id;
        fragmentMap[`W${w} · ${key}`] = id;
        write(
          `patterns/${slug}.mdx`,
          mdxFile(
            {
              slug,
              number,
              title,
              module: m.slug,
              source: { file: ROADMAP_FILE, section: 3, week: w, key, lines },
            },
            escapeForMdx(body),
          ),
        );
        return;
      }
      const slug = uniqueSlug(fragmentSlug(key), taken);
      const id = `theory/${m.slug}/${slug}`;
      includeIdOf[`${w}|${key}`] = id;
      fragmentMap[`W${w} · ${key}`] = id;
      write(
        `theory/${m.slug}/${slug}.mdx`,
        mdxFile(
          {
            slug,
            title: newKey,
            module: m.slug,
            source: { file: ROADMAP_FILE, section: 3, week: w, key, lines },
          },
          escapeForMdx(body),
        ),
      );
    });
  }

  // ---- handbook
  const gated: GatedItem[] = [];
  const gatedText = (id: string, by: string, md: string, lines: [number, number]) =>
    gated.push({ id, by, md, source: { file: ROADMAP_FILE, lines } });
  const subsectionId: Record<string, string> = {}; // `${section}|${originalTitle}` -> include id
  const handbookIndex: { section: string; title: string; pages: { slug: string; title: string }[] }[] = [];
  const gatedLine = (id: string, by: string, line: number, strip?: RegExp) =>
    gatedText(id, by, (originalLines[line - 1] as string).replace(strip ?? /^$/, ''), [line, line]);
  gatedLine('classification-drill-6', 'assessment-1', 3272, /^6\. /);
  gatedLine('classification-drill-answers', 'classification-drill', 3283);

  const mdxWithGates = (md: string): string =>
    escapeForMdx(md).replace(GATED_MARKER, (_, id: string) => `<Gated id="${id}" />`);

  for (const [nText, meta] of Object.entries(HANDBOOK_SECTIONS)) {
    const n = Number(nText);
    const section = sections[n] as Section;
    const origSection = originalSections[n] as Section;
    if (section.subs.length !== origSection.subs.length)
      warnings.push(`§${n}: rewriting changed the subsections`);
    const pages: { slug: string; title: string }[] = [];
    const taken = new Set<string>(['index']);

    let lead = section.lead;
    if (n === 5) {
      // The problem tables become bank.yaml. The sentences around them stay in the handbook.
      const prose = section.subs
        .map((s) =>
          s.md
            .split('\n')
            .filter((l) => !l.startsWith('|'))
            .join('\n')
            .trim(),
        )
        .filter(Boolean);
      lead = [lead, ...prose].join('\n\n');
    }
    write(
      `handbook/${meta.slug}/index.mdx`,
      mdxFile(
        {
          slug: 'index',
          section: n,
          title: meta.title,
          source: { file: ROADMAP_FILE, section: n, lines: origSection.leadRange },
        },
        mdxWithGates(lead),
      ),
    );

    if (n !== 3 && n !== 5) {
      section.subs.forEach((sub, i) => {
        const orig = origSection.subs[i] as Section['subs'][number];
        if (n === 4) return; // schedule tables: every row became lesson frontmatter
        if (n === 9 && orig.title.startsWith('9.5')) return; // the interviewer copy: content/reserved/mocks.yaml
        const slug = uniqueSlug(subsectionSlug(sub.title), taken);
        const id = `handbook/${meta.slug}/${slug}`;
        subsectionId[`${n}|${orig.title}`] = id;
        pages.push({ slug, title: sub.title });
        let body = mdxWithGates(sub.md);
        if (n === 1 && orig.title.startsWith('Answer key')) {
          gatedText('placement-answer-key', 'placement', sub.md, orig.range);
          body = '<Gated id="placement-answer-key" />';
        }
        write(
          `handbook/${meta.slug}/${slug}.mdx`,
          mdxFile(
            {
              slug,
              section: n,
              title: sub.title,
              source: { file: ROADMAP_FILE, section: n, key: orig.title, lines: orig.range },
            },
            body,
          ),
        );
      });
    }
    handbookIndex.push({ section: meta.slug, title: meta.title, pages });
  }

  // ---- content files
  const fieldRewriter = createFieldRewriter();
  const exIds = new Set<string>();
  const parsedFiles: Record<string, { lines: NumberedLine[] }> = {};
  for (const file of CONTENT_FILES) {
    const rewritten = rewriteContentFile(file);
    lineChanges.push(...rewritten.changes);
    parsedFiles[file] = { lines: rewritten.lines };
  }

  const legacyIds = {
    modules: {} as Record<string, string>,
    lessons: {} as Record<string, string>,
    exercises: {} as Record<string, string>,
    patterns: Object.fromEntries(patternIndex.map((p) => [p.number, p.slug])),
    reflections: {} as Record<string, string>,
    assessments: {} as Record<string, string>,
    mocks: {} as Record<string, string>,
    fragments: fragmentMap,
    visualizers: {} as Record<string, string>,
  };
  const lockIds = new Set<string>();
  const slugRows = new Map<string, SlugRow[]>();
  const addSlugRow = (moduleSlug: string, row: SlugRow) =>
    slugRows.set(moduleSlug, [...(slugRows.get(moduleSlug) ?? []), row]);
  const vizEmbeds: string[] = [];
  const exerciseCounts: Record<string, number> = {};
  const exerciseByModule: Record<string, number> = {};
  const unitKinds: Record<string, number> = {};
  const pullCounts = { fragment: 0, subsection: 0 };
  const gatedExercises: string[] = [];

  /** Writes one page's blocks as MDX and returns its exercises and annotated code as YAML data. */
  const renderPage = (
    page: ParsedPage,
    opts: { file: string; week: number; scope: string; afterGate?: string },
  ): { body: string; yamlData: { exercises: unknown[]; annotated: unknown[] }; unitIds: string[] } => {
    const exercises: unknown[] = [];
    const annotated: unknown[] = [];
    const unitIds: string[] = [];
    const takenUnits = new Set<string>();
    let open = false;
    let phase: string | undefined;
    let annoN = 0;

    const renderBlock = (b: Block, out: string[]): void => {
      switch (b.t) {
        case 'h': {
          if (open) out.push('</Unit>');
          const info = unitKind(b.tag, b.text);
          const id = uniqueSlug(slugify(b.text), takenUnits);
          unitIds.push(id);
          phase = info.phase;
          unitKinds[info.kind] = (unitKinds[info.kind] ?? 0) + 1;
          lockIds.add(`unit:${opts.scope}/${id}`);
          const phaseAttr = info.phase ? ` phase="${info.phase}"` : '';
          out.push(`<Unit id="${id}" kind="${info.kind}" title="${jsxAttribute(b.text)}"${phaseAttr}>`);
          open = true;
          return;
        }
        case 'md':
          out.push(mdxWithGates(b.md));
          return;
        case 'pull': {
          const week = b.week ?? opts.week;
          const id = includeIdOf[`${week}|${b.key}`];
          if (!id) warnings.push(`${page.id}: no fragment "${b.key}" in week ${week}`);
          pullCounts.fragment++;
          out.push(`<Include id="${id}" />`);
          return;
        }
        case 'pullSection': {
          const orig = originalSections[b.section] as Section;
          const sub = orig.subs.find((s) => s.title.startsWith(b.key));
          const id = sub && subsectionId[`${b.section}|${sub.title}`];
          if (!id) warnings.push(`${page.id}: no subsection "${b.key}" in section ${b.section}`);
          pullCounts.subsection++;
          out.push(`<Include id="${id}" />`);
          return;
        }
        case 'viz': {
          vizEmbeds.push(b.id);
          legacyIds.visualizers[b.id] = b.id;
          const attrs = Object.entries(b.props)
            .sort(([a], [z]) => (a === 'title' ? -1 : z === 'title' ? 1 : 0))
            .map(([k, v]) =>
              typeof v === 'string' ? ` ${k}="${jsxAttribute(v)}"` : ` ${k}={${JSON.stringify(v)}}`,
            )
            .join('');
          out.push(`<Viz id="${b.id}"${attrs} />`);
          return;
        }
        case 'note': {
          const title = b.title ? ` title="${jsxAttribute(b.title)}"` : '';
          out.push(`<Callout kind="${b.kind}"${title}>`, mdxWithGates(b.md), '</Callout>');
          return;
        }
        case 'stages': {
          out.push(`<Stages title="${jsxAttribute(b.title)}">`);
          for (const s of b.stages) {
            out.push(`<Stage name="${s.name}" label="${jsxAttribute(s.label)}">`);
            for (const inner of s.blocks) renderBlock(inner, out);
            out.push('</Stage>');
          }
          out.push('</Stages>');
          return;
        }
        case 'ex': {
          const legacyId = b.ex.id as string;
          const local = `ex-${legacyId.slice(legacyId.lastIndexOf('-') + 1).padStart(2, '0')}`;
          const copy: RawExercise = { ...b.ex };
          delete copy.id;
          delete copy.lesson;
          fieldRewriter.rewrite(opts.file, legacyId, copy);
          const gatedBy = GATED_EXERCISES[legacyId] ?? (phase === 'after' ? opts.afterGate : undefined);
          if (gatedBy) gatedExercises.push(legacyId);
          exercises.push({ id: local, legacyId, ...(gatedBy ? { gatedBy } : {}), ...copy });
          legacyIds.exercises[legacyId] = `${opts.scope}/${local}`;
          lockIds.add(`exercise:${opts.scope}/${local}`);
          const type = copy.type as string;
          exerciseCounts[type] = (exerciseCounts[type] ?? 0) + 1;
          const group = opts.scope.split('/')[0] as string;
          exerciseByModule[group] = (exerciseByModule[group] ?? 0) + 1;
          out.push(`<Exercise id="${local}" />`);
          return;
        }
        case 'anno': {
          annoN++;
          const local = `anno-${String(annoN).padStart(2, '0')}`;
          const copy: RawAnno = { ...b.anno, notes: { ...b.anno.notes } };
          fieldRewriter.rewrite(opts.file, `${page.id}#${local}`, copy as unknown as Record<string, unknown>);
          annotated.push({ id: local, ...copy });
          out.push(`<AnnotatedCode id="${local}" />`);
          return;
        }
      }
    };

    const out: string[] = [];
    for (const b of page.blocks) renderBlock(b, out);
    if (open) out.push('</Unit>');
    return { body: out.join('\n\n'), yamlData: { exercises, annotated }, unitIds };
  };

  const metaList = (v: string | string[] | undefined): string[] => (Array.isArray(v) ? v : v ? [v] : []);
  const metaText = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v.join('\n') : v;

  const rowFields = (d: ScheduleDay) => ({
    topic: d.topic,
    implement: d.implement,
    problemsText: d.problemsCell,
    problems: parseProblems(d.problemsCell),
    doneWhen: d.doneWhen,
    estimate: parseTimeCell(d.time),
  });

  /** Public facts about an assessment or mock. Reserved problems stay in content/reserved/. */
  const assessmentRows = (() => {
    const start = roadLines.findIndex((l) => l.startsWith('| # | Topics tested'));
    const out: Record<string, string[]> = {};
    for (let i = start + 2; (roadLines[i] as string).startsWith('|'); i++) {
      const cells = splitCells(roadLines[i] as string);
      out[cells[0] as string] = cells;
    }
    return out;
  })();
  const publicAssessment = (id: string) => {
    const a = original.assessments.find((x) => x.id === id);
    const cells = assessmentRows[id];
    if (!a || !cells) throw new Error(`no assessment ${id}`);
    return {
      id,
      slug: checkpointSlug('assessment', id.slice(1)),
      topics: cells[1],
      cold: { text: cells[2], problems: a.coldNums, minutes: a.coldMinutes },
      unseen: cells[3],
      total: cells[4],
      pass: cells[5],
    };
  };
  const publicMock = (id: number) => {
    const row = original.mocks.find((x) => x.id === id);
    if (!row) throw new Error(`no mock ${id}`);
    return { id, slug: checkpointSlug('mock', id), topics: row.topics };
  };

  // ---- modules 1–12
  const counts = { lessons: 0, checkpoints: 0, overviews: 0 };
  for (const m of MODULES.filter((x) => x.number > 0)) {
    const w = m.number;
    const file = `w${String(w).padStart(2, '0')}.md`;
    const parsed = parseWeekFile(w, (parsedFiles[file] as { lines: NumberedLine[] }).lines, warnings, exIds);
    const week = schedule.weeks[w];
    if (!week) throw new Error(`no schedule for week ${w}`);
    const dir = `modules/${moduleDir(m)}`;
    legacyIds.modules[`w${w}`] = m.slug;
    legacyIds.reflections[`w${w}`] = m.slug;
    lockIds.add(`module:${m.slug}`);

    // Overview
    if (!parsed.week) throw new Error(`no overview for week ${w}`);
    const overview = renderPage(parsed.week, { file, week: w, scope: `${m.slug}/overview` });
    counts.overviews++;
    const finalRow = week.days.find((d) => d.kind === 'final');
    write(
      `${dir}/module.mdx`,
      mdxFile(
        {
          number: w,
          slug: m.slug,
          title: m.title,
          legacyId: `w${w}`,
          objectives: objectives[w],
          shortOnTime: week.fallBehind,
          ...(week.notes.length ? { notes: week.notes } : {}),
          ...(finalRow
            ? { final: { legacyId: `w${w}final`, topic: finalRow.topic, doneWhen: finalRow.doneWhen } }
            : {}),
        },
        overview.body,
      ),
    );
    if (overview.yamlData.exercises.length || overview.yamlData.annotated.length) {
      warnings.push(`w${w}: the overview has exercises, which module.mdx has no YAML file for`);
    }
    if (finalRow) legacyIds.lessons[`w${w}final`] = `${m.slug}/final`;

    // Lessons
    const studyDays = week.days.filter((d) => d.kind === 'study');
    if (studyDays.length !== m.lessons.length) warnings.push(`w${w}: ${studyDays.length} study rows`);
    m.lessons.forEach((slug, i) => {
      const legacyId = `w${w}d${i + 1}`;
      const page = parsed.lessons[i + 1];
      const row = studyDays[i];
      if (!page || !row) throw new Error(`no lesson ${legacyId}`);
      const scope = `${m.slug}/${slug}`;
      const rendered = renderPage(page, { file, week: w, scope });
      const fm = {
        slug,
        legacyId,
        title: page.title,
        goal: metaText(page.meta.goal),
        why: metaText(page.meta.why),
        prereqs: metaList(page.meta.prereqs),
        outcomes: metaList(page.meta.outcomes),
        ready: metaList(page.meta.ready),
        summary: metaList(page.meta.summary),
        revision: metaText(page.meta.revision),
        ...(() => {
          const warmup = parseWarmup(row.warmup);
          return warmup ? { warmup } : {};
        })(),
        ...rowFields(row),
        ...(() => {
          const resolves = parseResolves(row.problemsCell);
          return resolves.length ? { resolves } : {};
        })(),
        ...(LESSON_MOCKS[legacyId] ? { mock: publicMock(LESSON_MOCKS[legacyId] as number) } : {}),
      };
      const base = `${dir}/lessons/${lessonFile(i, slug)}`;
      write(`${base}.mdx`, mdxFile(fm, rendered.body));
      write(`${base}.yaml`, toYaml(rendered.yamlData));
      legacyIds.lessons[legacyId] = scope;
      lockIds.add(`lesson:${scope}`);
      addSlugRow(m.slug, { legacyId, slug, title: page.title });
      counts.lessons++;
    });

    // Checkpoint
    const satRow = week.days.find((d) => d.kind === 'saturday');
    if (!parsed.saturday || !satRow) throw new Error(`no Saturday page for week ${w}`);
    const cp = CHECKPOINTS[w];
    if (!cp) throw new Error(`no checkpoint for week ${w}`);
    const gateId = cp.kind === 'drill' ? undefined : checkpointSlug(cp.kind, cp.n as number);
    const scope = `${m.slug}/checkpoint`;
    const rendered = renderPage(parsed.saturday, { file, week: w, scope, afterGate: gateId });
    const fm = {
      slug: 'checkpoint',
      legacyId: `w${w}sat`,
      title: satRow.topic.replace(/\*\*/g, '').split(/[;:(]/)[0]?.trim(),
      kind: cp.kind,
      ...(gateId ? { gateId } : {}),
      goal: metaText(parsed.saturday.meta.goal),
      ...rowFields(satRow),
      ...(() => {
        const resolves = parseResolves(satRow.problemsCell);
        return resolves.length ? { resolves } : {};
      })(),
      ...(cp.kind === 'assessment' ? { assessment: publicAssessment(cp.id as string) } : {}),
      ...(cp.kind === 'mock' ? { mock: publicMock(cp.id as number) } : {}),
    };
    write(`${dir}/checkpoint.mdx`, mdxFile(fm, rendered.body));
    write(`${dir}/checkpoint.yaml`, toYaml(rendered.yamlData));
    legacyIds.lessons[`w${w}sat`] = scope;
    lockIds.add(`lesson:${scope}`);
    addSlugRow(m.slug, { legacyId: `w${w}sat`, slug: 'checkpoint', title: fm.title as string });
    counts.checkpoints++;
    if (cp.kind === 'assessment') legacyIds.assessments[cp.id as string] = gateId as string;
    if (cp.kind === 'mock') legacyIds.mocks[`m${cp.id}`] = gateId as string;
  }
  legacyIds.mocks.m5 = 'mock-5';
  legacyIds.mocks.m6 = 'mock-6';

  // ---- Foundations: built only from existing content (plan 5.5)
  {
    const m = MODULES[0];
    if (!m) throw new Error('no module 0');
    const extra = parseExtraFile(
      (parsedFiles['extra.md'] as { lines: NumberedLine[] }).lines,
      warnings,
      exIds,
    );
    const dir = `modules/${moduleDir(m)}`;
    legacyIds.modules.w0 = m.slug;
    lockIds.add(`module:${m.slug}`);
    write(`${dir}/module.mdx`, mdxFile({ number: 0, slug: m.slug, title: m.title, legacyId: null }, ''));

    const includes = (section: number, prefixes: string[]): { title: string; id: string }[] =>
      prefixes.map((prefix) => {
        const orig = (originalSections[section] as Section).subs.find((s) => s.title.startsWith(prefix));
        const id = orig && subsectionId[`${section}|${orig.title}`];
        if (!orig || !id) throw new Error(`no subsection ${prefix} in §${section}`);
        const next = (sections[section] as Section).subs[
          (originalSections[section] as Section).subs.indexOf(orig)
        ];
        return { title: next?.title ?? orig.title, id };
      });

    const foundation = (
      index: number,
      legacyId: string,
      title: string,
      before: { title: string; id: string }[],
      exercisesTitle: string,
    ) => {
      const slug = m.lessons[index] as string;
      const scope = `${m.slug}/${slug}`;
      const page = extra[legacyId];
      if (!page) throw new Error(`no extra page ${legacyId}`);
      const rendered = renderPage(page, { file: 'extra.md', week: 0, scope });
      const unit = (id: string, kind: string, unitTitle: string, inner: string) =>
        `<Unit id="${id}" kind="${kind}" title="${jsxAttribute(unitTitle)}">\n\n${inner}\n\n</Unit>`;
      const parts = before.map((inc) => {
        const id = subsectionSlug(inc.title);
        lockIds.add(`unit:${scope}/${id}`);
        return unit(id, 'reference', inc.title, `<Include id="${inc.id}" />`);
      });
      const exUnit = slugify(exercisesTitle);
      lockIds.add(`unit:${scope}/${exUnit}`);
      parts.push(unit(exUnit, 'practice', exercisesTitle, rendered.body));
      const base = `${dir}/lessons/${lessonFile(index, slug)}`;
      write(`${base}.mdx`, mdxFile({ slug, legacyId, title, legacyTitle: page.title }, parts.join('\n\n')));
      addSlugRow(m.slug, { legacyId, slug, title });
      write(`${base}.yaml`, toYaml(rendered.yamlData));
      legacyIds.lessons[legacyId] = scope;
      lockIds.add(`lesson:${scope}`);
      counts.lessons++;
    };

    foundation(
      0,
      'diagnostic',
      'Placement check',
      includes(1, ['Session B', 'Scoring and routing']),
      extra.diagnostic?.title ?? '',
    );
    foundation(
      1,
      'reference',
      'JavaScript for DSA',
      includes(6, ['6.1', '6.2', '6.3', '6.4']),
      extra.reference?.title ?? '',
    );
    foundation(
      2,
      'method',
      'The problem-solving method',
      includes(7, ['7.1', '7.4', '7.5']),
      extra.method?.title ?? '',
    );
    legacyIds.lessons.depmap = 'learn';
    vizEmbeds.push('depmap');
    legacyIds.visualizers.depmap = 'depmap';
  }

  // ---- track
  write(
    'track.yaml',
    '# Recommended order and prerequisites, from roadmap section 2 "Dependency chain" and the depmap visualizer.\n' +
      '# The order is advice: every lesson can be opened at any time.\n' +
      toYaml({
        map: 'depmap',
        modules: MODULES.map((m) => ({
          number: m.number,
          slug: m.slug,
          title: m.title,
          prerequisites: m.prerequisites.map((n) => MODULES[n]?.slug),
          lessons: m.lessons,
        })),
      }),
  );

  // ---- problems
  const lessonSlug = (week: number, day: number): { module: string; lesson: string } => {
    const m = MODULES[week];
    const lesson = m?.lessons[day - 1];
    if (!m || !lesson) throw new Error(`no lesson W${week}D${day}`);
    return { module: m.slug, lesson };
  };
  const problems: unknown[] = bank.map((b) => ({
    num: b.num,
    title: b.title,
    url: b.url,
    difficulty: b.diff,
    tier: b.tier,
    role: b.role,
    ...lessonSlug(b.week, b.day),
    ...(b.week === 12 ? { hiddenUntilAttempted: true } : {}),
    pattern: b.pattern,
    prereq: b.prereq,
    why: b.why,
    hint: b.hint,
  }));
  const extension = (num: number, title: string, url: string, difficulty: string, usedIn: string) =>
    problems.push({ num, title, url, difficulty, extension: true, usedIn });
  const leetcode = (slug: string) => `https://leetcode.com/problems/${slug}/`;
  extension(
    239,
    'Sliding Window Maximum',
    leetcode('sliding-window-maximum'),
    'Hard',
    'Module 12 lesson 4 Hard option',
  );
  extension(
    297,
    'Serialize and Deserialize Binary Tree',
    leetcode('serialize-and-deserialize-binary-tree'),
    'Hard',
    'Module 12 lesson 4 Hard option',
  );
  extension(
    1480,
    'Running Sum of 1d Array',
    leetcode('running-sum-of-1d-array'),
    'Easy',
    'Placement check B1',
  );
  extension(
    349,
    'Intersection of Two Arrays',
    leetcode('intersection-of-two-arrays'),
    'Easy',
    'Placement check B2',
  );
  extension(14, 'Longest Common Prefix', leetcode('longest-common-prefix'), 'Easy', 'Placement check B3');
  extension(2, 'Add Two Numbers', leetcode('add-two-numbers'), 'Medium', 'Placement check B4');
  write('problems/bank.yaml', toYaml({ problems }));

  // ---- reserved: server-only (D-012)
  const reservedNote =
    '# Server-only. Never imported by anything that reaches a page, the client or search (D-012).\n';
  write(
    'reserved/assessments.yaml',
    reservedNote +
      toYaml({
        assessments: original.assessments.map((a) => ({
          id: a.id,
          slug: checkpointSlug('assessment', a.id.slice(1)),
          problems: a.problems.map((p) => ({
            num: p.num,
            title: p.title,
            url: p.url,
            difficulty: p.diff,
            minutes: p.minutes,
          })),
        })),
      }),
  );
  const mocksSub = (sections[9] as Section).subs.find((s) => s.title.startsWith('9.5'));
  const mockNotes = (mocksSub?.md ?? '').split('\n').filter((l) => l.trim() && !l.startsWith('|'));
  write(
    'reserved/mocks.yaml',
    reservedNote +
      toYaml({
        notes: mockNotes,
        mocks: original.mocks.map((x) => ({
          id: x.id,
          slug: checkpointSlug('mock', x.id),
          topics: x.topics,
          pool: x.pool,
        })),
      }),
  );
  write('reserved/gated.yaml', reservedNote + toYaml({ gated }));

  // ---- allowlists
  write(
    'allowlists/dates.yaml',
    '# Exceptions to the date check in content:check. Each entry says why it is not a date or a timetable.\n' +
      toYaml({ entries: ALLOWLIST_DATES }),
  );
  write(
    'allowlists/reserved.yaml',
    '# Exceptions to the reserved-problem check in content:check. Each entry says why the text stays.\n' +
      toYaml({ entries: ALLOWLIST_RESERVED }),
  );

  // ---- ids
  for (const p of patternIndex) lockIds.add(`pattern:${p.slug}`);
  for (const id of Object.keys(legacyIds.visualizers)) lockIds.add(`visualizer:${id}`);
  for (const [rel] of files) {
    const theoryMatch = rel.match(/^theory\/(.+)\.mdx$/);
    if (theoryMatch) lockIds.add(`theory:${theoryMatch[1]}`);
    const handbookMatch = rel.match(/^handbook\/(.+)\.mdx$/);
    if (handbookMatch) lockIds.add(`handbook:${(handbookMatch[1] as string).replace(/\/index$/, '')}`);
  }
  for (const b of bank) lockIds.add(`problem:${b.num}`);
  write('ids.lock.json', JSON.stringify({ aliases: {}, ids: [...lockIds].sort() }, null, 1) + '\n');
  write('legacy-id-map.json', JSON.stringify(legacyIds, null, 1) + '\n');

  // ---- checks the importer itself can make
  warnings.push(...fieldRewriter.unmatched());

  drops.push(
    {
      what: 'Title, byline and edition note',
      where: 'roadmap.md lines 1, 3, 5',
      reason:
        'No section contains them, so the legacy app never showed them. The date and @handle go with them (plan question 6).',
    },
    {
      what: 'Week date ranges in headings',
      where: 'roadmap.md "### Week N (dates): title"',
      reason: 'The heading is kept for parsing; the dates are not emitted.',
    },
    { what: 'Date column of 84 schedule rows', where: 'roadmap.md §4', reason: 'Dates are not emitted.' },
    {
      what: '11 rest rows ("Rest or Stretch catch-up", 2 holiday rows)',
      where: 'roadmap.md §4',
      reason: 'They hold nothing but timetable (plan 5.6).',
    },
    {
      what: 'When column (W1D1) of 173 bank rows',
      where: 'roadmap.md §5',
      reason: 'Replaced by module and lesson slugs.',
    },
    { what: 'Date columns of §9.2 and §9.5', where: 'roadmap.md §9', reason: 'Dates are not emitted.' },
    {
      what: '§9.5 table',
      where: 'roadmap.md §9',
      reason: 'Moved whole to content/reserved/mocks.yaml; its topics also appear on the mock pages.',
    },
    {
      what: 'Exercise `lesson` field',
      where: 'dist/exercises.json',
      reason: 'Derived by the legacy build; the file an exercise lives in says the same.',
    },
  );

  const unitTotal = Object.values(unitKinds).reduce((a, b) => a + b, 0);
  const resultCounts = {
    modules: MODULES.length,
    lessons: counts.lessons,
    checkpoints: counts.checkpoints,
    overviews: counts.overviews,
    theoryFragments: Object.keys(includeIdOf).length - patternIndex.length,
    patterns: patternIndex.length,
    objectives: Object.keys(objectives).length,
    exercises: Object.values(exerciseCounts).reduce((a, b) => a + b, 0),
    exercisesByType: exerciseCounts,
    exercisesByModule: exerciseByModule,
    gatedExercises: gatedExercises.length,
    units: unitTotal,
    unitsByKind: unitKinds,
    fragmentIncludes: pullCounts.fragment,
    subsectionIncludes: pullCounts.subsection,
    vizEmbeds: vizEmbeds.length,
    vizUnique: new Set(vizEmbeds).size,
    bank: bank.length,
    extensionProblems: 6,
    reservedProblems:
      original.assessments.reduce((n, a) => n + a.problems.length, 0) +
      original.mocks.reduce((n, x) => n + x.pool.length, 0),
    gatedTexts: gated.length,
    lineChanges: lineChanges.length,
    fieldChanges: fieldRewriter.changes.length,
    handbookPages: handbookIndex.reduce((n, s) => n + s.pages.length + 1, 0),
  };

  return {
    files,
    changes: { lines: lineChanges, fields: fieldRewriter.changes },
    counts: resultCounts,
    drops,
    warnings,
    slugs: {
      modules: MODULES.map((m) => ({
        number: m.number,
        slug: m.slug,
        title: m.title,
        rows: slugRows.get(m.slug) ?? [],
      })),
      ids: [...lockIds],
    },
  };
}
