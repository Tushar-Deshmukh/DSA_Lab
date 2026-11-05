// The import gate (plan 6.9, D-008): the content equals the legacy course with exactly the logged changes applied.
//
// These tests do not run the importer. They replay docs/import/changes.json over the untouched legacy files, parse the
// result with the ported legacy parsers (proven equal to the originals in parser-port.test.ts), render it with the
// legacy renderer, and compare it with what is in content/. A change that is not logged makes them fail.
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseTimeCell, totalMinutes } from '@/lib/content/estimates';
import { setFieldByPath } from '@/lib/content/exercise-text';
import { loadContent, type ContentBundle } from '@/lib/content/load';
import type { CheckpointFrontmatter, LessonFrontmatter } from '@/lib/content/schema';
import { parseExtraFile, parseWeekFile, walkBlocks, type Block, type NumberedLine, type ParsedPage } from '@/scripts/import/blocks';
import { buildLegacyDist, type LegacyDist } from '@/scripts/import/legacy-build';
import { CONTENT_FILES, readLegacyLines, ROADMAP_FILE } from '@/scripts/import/legacy-source';
import { CHANGE_LOG, CONTENT_DIR } from '@/scripts/import/paths';
import { RULES, type FieldChange, type LineChange } from '@/scripts/import/rewrite-engine';
import {
  parseAssessments,
  parseBank,
  parseProblems,
  parseSchedule,
  parseSectionsMd,
  parseTheory,
  type ScheduleDay,
} from '@/scripts/import/roadmap-parser';
import { HANDBOOK_SECTIONS, MODULES, moduleDir } from '@/scripts/import/slugs';
import { readVizChanges } from '@/scripts/import/viz-text';
import { htmlCodeBlocks, htmlToText, legacyHtml, renderLegacyBlocks, renderMdx } from './support';

const log = JSON.parse(fs.readFileSync(CHANGE_LOG, 'utf8')) as { lines: LineChange[]; fields: FieldChange[] };

/** Applies the logged line changes to a legacy file. Every logged "before" must match the file exactly. */
function replayLines(file: string): NumberedLine[] {
  const original = readLegacyLines(file);
  const changes = new Map(log.lines.filter((c) => c.file === file).map((c) => [c.line, c]));
  const out: NumberedLine[] = [];
  original.forEach((text, i) => {
    const change = changes.get(i + 1);
    if (!change) {
      out.push({ text, n: i + 1 });
      return;
    }
    if (change.before !== text) throw new Error(`${file}:${i + 1}: the log does not match the legacy file`);
    if (change.after !== null) out.push({ text: change.after, n: i + 1 });
  });
  return out;
}

let bundle: ContentBundle;
let dist: LegacyDist;
const lines = replayLines(ROADMAP_FILE).map((l) => l.text);
const originalLines = readLegacyLines(ROADMAP_FILE);
const theory = parseTheory(lines);
const originalTheory = parseTheory(originalLines);
const schedule = parseSchedule(lines);
const sections = parseSectionsMd(lines);
const originalSections = parseSectionsMd(originalLines);

const pages: Record<string, ParsedPage> = {};
{
  const warnings: string[] = [];
  const exIds = new Set<string>();
  for (const file of CONTENT_FILES) {
    const numbered = replayLines(`content/${file}`);
    if (file === 'extra.md') Object.assign(pages, parseExtraFile(numbered, warnings, exIds));
    else {
      const parsed = parseWeekFile(Number(file.slice(1, 3)), numbered, warnings, exIds);
      if (parsed.week) pages[parsed.week.id] = parsed.week;
      if (parsed.saturday) pages[parsed.saturday.id] = parsed.saturday;
      for (const lesson of Object.values(parsed.lessons)) pages[lesson.id] = lesson;
    }
  }
  if (warnings.length) throw new Error(warnings.join('\n'));
}

function compareMdxWithLegacy(mdxHtml: string, legacy: string, where: string): void {
  expect(htmlToText(mdxHtml), where).toBe(htmlToText(legacy));
  expect(htmlCodeBlocks(mdxHtml), `code blocks of ${where}`).toEqual(htmlCodeBlocks(legacy));
}

beforeAll(() => {
  bundle = loadContent(CONTENT_DIR);
  dist = buildLegacyDist();
}, 120_000);

describe('the change log', () => {
  it('names a known rule for every change', () => {
    for (const c of [...log.lines, ...log.fields]) {
      expect(c.rules.length, JSON.stringify(c).slice(0, 120)).toBeGreaterThan(0);
      for (const rule of c.rules) expect(Object.keys(RULES)).toContain(rule);
    }
  });

  it('records real changes only', () => {
    for (const c of [...log.lines, ...log.fields]) expect(c.after).not.toBe(c.before);
  });

  it('applies to the legacy files exactly', () => {
    // replayLines throws on any mismatch, and it already ran for the roadmap and all content files at load time.
    expect(log.lines.length).toBeGreaterThan(500);
    expect(new Set(log.lines.map((c) => c.file))).toContain(ROADMAP_FILE);
  });

  it('is what docs/date-rewrites.md and docs/content-changes.md list', () => {
    const docs = ['date-rewrites.md', 'content-changes.md'].map((f) =>
      fs.readFileSync(path.join(CONTENT_DIR, '..', 'docs', f), 'utf8'),
    );
    const rows = docs.join('\n').split('\n');
    const listed = rows.filter((l) => l.startsWith('| source/') || l.startsWith('| content/')).length;
    expect(listed).toBe(log.lines.length + log.fields.length);
    // Visualizer text changes: their replay is proven by tests/viz/parity.test.ts.
    expect(rows.filter((l) => l.startsWith('| src/viz/')).length).toBe(readVizChanges().length);
  });
});

describe('exercises', () => {
  it('deep-equal the legacy exercises plus the logged field changes', () => {
    const expected = new Map<string, Record<string, unknown>>();
    for (const raw of dist.exercises) {
      const copy = structuredClone(raw);
      delete copy.lesson;
      expected.set(raw.id as string, copy);
    }
    for (const c of log.fields) {
      if (c.item.includes('#')) continue;
      const target = expected.get(c.item);
      if (!target) throw new Error(`logged change for unknown exercise ${c.item}`);
      setFieldByPath(target, c.path, c.after);
    }
    let seen = 0;
    for (const { lessons, checkpoint } of bundle.modules) {
      for (const page of [...lessons, ...(checkpoint ? [checkpoint] : [])]) {
        for (const exercise of page.exercises) {
          const legacyId = exercise.legacyId;
          const imported: Record<string, unknown> = { ...exercise };
          delete imported.legacyId;
          delete imported.gatedBy;
          delete imported.id;
          const legacy = { ...(expected.get(legacyId) as Record<string, unknown>) };
          delete legacy.id;
          expect(imported, legacyId).toEqual(legacy);
          seen++;
        }
      }
    }
    expect(seen).toBe(421);
    expect(expected.size).toBe(421);
  });

  it('keep their number in their id', () => {
    for (const { lessons, checkpoint } of bundle.modules) {
      for (const page of [...lessons, ...(checkpoint ? [checkpoint] : [])]) {
        for (const e of page.exercises) {
          const n = Number(e.legacyId.slice(e.legacyId.lastIndexOf('-') + 1));
          expect(Number(e.id.slice(3)), e.legacyId).toBe(n);
        }
      }
    }
  });

  it('are mapped in legacy-id-map.json, using the example the brief gives', () => {
    expect(Object.keys(bundle.legacyIdMap.exercises)).toHaveLength(421);
    expect(bundle.legacyIdMap.exercises['w2d1-3']).toBe('two-pointers-windows-prefix-sums/opposite-end-two-pointers/ex-03');
    expect(bundle.legacyIdMap.lessons.w2d1).toBe('two-pointers-windows-prefix-sums/opposite-end-two-pointers');
    expect(bundle.legacyIdMap.lessons.w2sat).toBe('two-pointers-windows-prefix-sums/checkpoint');
    expect(bundle.legacyIdMap.patterns['2.1']).toBe('opposite-end-two-pointers');
    expect(bundle.legacyIdMap.assessments.A1).toBe('assessment-1');
    expect(bundle.legacyIdMap.mocks.m1).toBe('mock-1');
    expect(bundle.legacyIdMap.reflections.w1).toBe('complexity-arrays-hashing');
    expect(Object.keys(bundle.legacyIdMap.fragments)).toHaveLength(209);
    expect(Object.keys(bundle.legacyIdMap.visualizers)).toHaveLength(129);
  });

  it('that restate a reserved problem are gated', () => {
    const gatedByLegacyId = new Map<string, string | undefined>();
    for (const { lessons, checkpoint } of bundle.modules) {
      for (const page of [...lessons, ...(checkpoint ? [checkpoint] : [])]) {
        for (const e of page.exercises) gatedByLegacyId.set(e.legacyId, e.gatedBy);
      }
    }
    // inventory 13: 974 after A1, 901 after A2, 1026 after A3, and drill item 6 in both copies of the drill.
    const statement = (needle: string) =>
      dist.exercises.filter((e) => String(e.q).includes(needle)).map((e) => e.id as string);
    const after1 = statement('divisible by k');
    const after2 = statement('consecutive previous days');
    expect(after2).toHaveLength(1);
    for (const id of [...after1, ...after2]) expect(gatedByLegacyId.get(id), id).toBeTruthy();
    expect(gatedByLegacyId.get('w3sat-6')).toBe('assessment-1');
    expect(gatedByLegacyId.get('method-6')).toBe('assessment-1');
  });
});

describe('annotated code', () => {
  it('equals the legacy blocks plus the logged field changes', () => {
    let seen = 0;
    const check = (page: ParsedPage, annotated: { id: string; code: string; notes: Record<string, string>; title: string }[]) => {
      let n = 0;
      walkBlocks(page.blocks, (b) => {
        if (b.t !== 'anno') return;
        n++;
        const id = `anno-${String(n).padStart(2, '0')}`;
        const target = annotated.find((a) => a.id === id);
        expect(target, `${page.id} ${id}`).toBeDefined();
        const legacy = structuredClone(b.anno) as unknown as Record<string, unknown>;
        for (const c of log.fields.filter((f) => f.item === `${page.id}#${id}`)) setFieldByPath(legacy, c.path, c.after);
        expect({ code: target?.code, notes: target?.notes, title: target?.title }, `${page.id} ${id}`).toEqual(legacy);
        seen++;
      });
    };
    for (const m of MODULES.filter((x) => x.number > 0)) {
      const loaded = bundle.modules.find((x) => x.module.frontmatter.slug === m.slug);
      loaded?.lessons.forEach((lesson, i) => check(pages[`w${m.number}d${i + 1}`] as ParsedPage, lesson.annotated));
    }
    expect(seen).toBe(3);
  });
});

describe('text', () => {
  const includeIds = (): Record<string, string> => bundle.legacyIdMap.fragments;

  const renderOptions = (page: ParsedPage, week: number) => {
    let exN = 0;
    return {
      includeId: (b: Extract<Block, { t: 'pull' | 'pullSection' }>) => {
        if (b.t === 'pull') return includeIds()[`W${b.week ?? week} · ${b.key}`] ?? `MISSING ${b.key}`;
        const sub = originalSections[b.section]?.subs.findIndex((s) => s.title.startsWith(b.key)) ?? -1;
        const section = HANDBOOK_SECTIONS[b.section]?.slug;
        const title = sub >= 0 ? sections[b.section]?.subs[sub]?.title : undefined;
        const hit = [...bundle.handbook.entries()].find(
          ([id, doc]) => id.startsWith(`handbook/${section}/`) && doc.frontmatter.title === title,
        );
        return hit?.[0] ?? `MISSING ${b.key}`;
      },
      exerciseId: (legacyId: string) => {
        exN++;
        expect(legacyId.endsWith(`-${exN}`), `${page.id}: exercise order`).toBe(true);
        return `ex-${String(exN).padStart(2, '0')}`;
      },
      annoId: (n: number) => `anno-${String(n).padStart(2, '0')}`,
    };
  };

  it('of every study lesson equals the legacy render plus logged changes', async () => {
    let seen = 0;
    for (const m of MODULES.filter((x) => x.number > 0)) {
      const loaded = bundle.modules.find((x) => x.module.frontmatter.slug === m.slug);
      if (!loaded) throw new Error(`module ${m.slug} is missing`);
      expect(loaded.lessons).toHaveLength(5);
      for (const [i, lesson] of loaded.lessons.entries()) {
        const page = pages[`w${m.number}d${i + 1}`] as ParsedPage;
        const legacy = renderLegacyBlocks(page.blocks, renderOptions(page, m.number));
        compareMdxWithLegacy(await renderMdx(lesson.body), legacy, page.id);
        seen++;
      }
    }
    expect(seen).toBe(60);
  });

  it('of every checkpoint and module overview equals the legacy render plus logged changes', async () => {
    let seen = 0;
    for (const m of MODULES.filter((x) => x.number > 0)) {
      const loaded = bundle.modules.find((x) => x.module.frontmatter.slug === m.slug);
      if (!loaded?.checkpoint) throw new Error(`module ${m.slug} has no checkpoint`);
      const sat = pages[`w${m.number}sat`] as ParsedPage;
      compareMdxWithLegacy(await renderMdx(loaded.checkpoint.body), renderLegacyBlocks(sat.blocks, renderOptions(sat, m.number)), sat.id);
      const overview = pages[`w${m.number}`] as ParsedPage;
      compareMdxWithLegacy(
        await renderMdx(loaded.module.body),
        renderLegacyBlocks(overview.blocks, renderOptions(overview, m.number)),
        overview.id,
      );
      seen += 2;
    }
    expect(seen).toBe(24);
  });

  it('of the extra pages is inside the Foundations lessons', async () => {
    const foundations = bundle.modules.find((m) => m.module.frontmatter.number === 0);
    const byLegacy = (id: string) => foundations?.lessons.find((l) => l.frontmatter.legacyId === id);
    for (const id of ['diagnostic', 'reference', 'method']) {
      const page = pages[id] as ParsedPage;
      const lesson = byLegacy(id);
      if (!lesson) throw new Error(`no lesson for ${id}`);
      const legacy = htmlToText(renderLegacyBlocks(page.blocks, renderOptions(page, 0)));
      expect(htmlToText(await renderMdx(lesson.body)), id).toContain(legacy);
    }
    expect(bundle.legacyIdMap.lessons.depmap).toBe('learn');
    expect(bundle.track.map).toBe('depmap');
  });

  it('of every theory fragment and pattern equals the legacy render plus logged changes', async () => {
    let seen = 0;
    for (const w of Object.keys(originalTheory).map(Number)) {
      const orig = originalTheory[w];
      const next = theory[w];
      if (!orig || !next) throw new Error(`week ${w}`);
      expect(next.order).toHaveLength(orig.order.length);
      for (const [i, key] of orig.order.entries()) {
        if (key === 'A. Learning objectives') continue;
        const id = includeIds()[`W${w} · ${key}`] as string;
        const doc = bundle.theory.get(id) ?? bundle.patterns.get(id);
        if (!doc) throw new Error(`no document for ${id}`);
        const body = next.frags[next.order[i] as string] as string;
        compareMdxWithLegacy(await renderMdx(doc.body), legacyHtml(body), id);
        expect(doc.frontmatter.source.key, id).toBe(key);
        expect(doc.frontmatter.source.lines, id).toEqual(orig.ranges[key]);
        seen++;
      }
    }
    expect(seen).toBe(197);
    expect(bundle.theory.size).toBe(150);
    expect(bundle.patterns.size).toBe(47);
  });

  it('of the learning objectives is in the module frontmatter', () => {
    for (const m of MODULES.filter((x) => x.number > 0)) {
      const loaded = bundle.modules.find((x) => x.module.frontmatter.slug === m.slug);
      const week = theory[m.number];
      expect(loaded?.module.frontmatter.objectives).toBe(week?.frags[week.order[0] as string]);
      expect(week?.order[0]).toBe('A. Learning objectives');
    }
  });

  it('of every handbook page equals the legacy render plus logged changes', async () => {
    let seen = 0;
    for (const [nText, meta] of Object.entries(HANDBOOK_SECTIONS)) {
      const n = Number(nText);
      const section = sections[n];
      if (!section) throw new Error(`section ${n}`);
      if (n !== 5) {
        const lead = bundle.handbook.get(`handbook/${meta.slug}`);
        if (!lead) throw new Error(`no lead for ${n}`);
        compareMdxWithLegacy(await renderMdx(lead.body), legacyHtml(section.lead), `lead of ${n}`);
        seen++;
      }
      if (n === 3 || n === 4 || n === 5) continue;
      for (const sub of section.subs) {
        if (sub.title.startsWith('9.5')) continue;
        const hit = [...bundle.handbook.entries()].find(
          ([id, doc]) => id.startsWith(`handbook/${meta.slug}/`) && doc.frontmatter.title === sub.title,
        );
        if (!hit) throw new Error(`no handbook page for "${sub.title}"`);
        if (sub.title.startsWith('Answer key')) {
          const gated = bundle.reserved.gated.gated.find((g) => g.id === 'placement-answer-key');
          expect(gated?.md).toBe(sub.md);
          expect(hit[1].body.trim()).toBe('<Gated id="placement-answer-key" />');
          seen++;
          continue;
        }
        const legacy = legacyHtml(sub.md.replace(/GATED\(([a-z0-9-]+)\)/g, (_, id: string) => `[[gated|${id}]]`));
        compareMdxWithLegacy(await renderMdx(hit[1].body), legacy, hit[0]);
        seen++;
      }
    }
    expect(seen).toBe(bundle.handbook.size - 1); // every page except the problem-bank lead, which holds prose from several places
  });

  it('of the problem-bank lead holds the prose around the bank tables', async () => {
    const doc = bundle.handbook.get('handbook/problem-bank');
    const section = sections[5];
    if (!doc || !section) throw new Error('no problem-bank page');
    const prose = section.subs.flatMap((s) => s.md.split('\n').filter((l) => l.trim() && !l.startsWith('|')));
    const expected = [section.lead, ...prose].join('\n\n');
    expect(htmlToText(await renderMdx(doc.body))).toBe(htmlToText(legacyHtml(expected)));
  });
});

describe('frontmatter', () => {
  const lessonRow = (week: number, n: number): ScheduleDay => {
    const day = schedule.weeks[week]?.days.filter((d) => d.kind === 'study')[n];
    if (!day) throw new Error(`no row for W${week} lesson ${n + 1}`);
    return day;
  };

  it('of every lesson equals the legacy metadata and schedule row plus logged changes', () => {
    let seen = 0;
    for (const m of MODULES.filter((x) => x.number > 0)) {
      const loaded = bundle.modules.find((x) => x.module.frontmatter.slug === m.slug);
      for (const [i, lesson] of (loaded?.lessons ?? []).entries()) {
        const fm = lesson.frontmatter as LessonFrontmatter;
        const page = pages[`w${m.number}d${i + 1}`] as ParsedPage;
        const row = lessonRow(m.number, i);
        expect(fm.legacyId).toBe(page.id);
        expect(fm.slug).toBe(m.lessons[i]);
        expect(fm.title).toBe(page.title);
        for (const key of ['goal', 'why', 'revision'] as const) expect(fm[key], `${page.id} ${key}`).toBe(page.meta[key]);
        for (const key of ['prereqs', 'outcomes', 'ready', 'summary'] as const) {
          expect(fm[key], `${page.id} ${key}`).toEqual(page.meta[key]);
        }
        expect(fm.topic).toBe(row.topic);
        expect(fm.implement).toBe(row.implement);
        expect(fm.problemsText).toBe(row.problemsCell);
        expect(fm.problems).toEqual(parseProblems(row.problemsCell));
        expect(fm.doneWhen).toBe(row.doneWhen);
        expect(fm.estimate).toEqual(parseTimeCell(row.time));
        expect(totalMinutes(fm.estimate), page.id).toBe(120);
        seen++;
      }
    }
    expect(seen).toBe(60);
  });

  it('keeps the warm-up of every lesson that has one', () => {
    let withWarmup = 0;
    for (const m of MODULES.filter((x) => x.number > 0)) {
      const loaded = bundle.modules.find((x) => x.module.frontmatter.slug === m.slug);
      for (const [i, lesson] of (loaded?.lessons ?? []).entries()) {
        const fm = lesson.frontmatter as LessonFrontmatter;
        const cell = lessonRow(m.number, i).warmup.trim();
        if (cell === '—' || !cell) {
          expect(fm.warmup).toBeUndefined();
          continue;
        }
        withWarmup++;
        expect(fm.warmup, `${fm.legacyId}: ${cell}`).toBeDefined();
        expect(cell).toContain(String(fm.warmup?.problem));
        if (fm.warmup?.note) expect(cell).toContain(fm.warmup.note);
        else expect(cell).toBe(String(fm.warmup?.problem));
      }
    }
    expect(withWarmup).toBe(56);
  });

  it('of every checkpoint equals the legacy Saturday row plus logged changes', () => {
    for (const m of MODULES.filter((x) => x.number > 0)) {
      const loaded = bundle.modules.find((x) => x.module.frontmatter.slug === m.slug);
      const fm = loaded?.checkpoint?.frontmatter as CheckpointFrontmatter;
      const row = schedule.weeks[m.number]?.days.find((d) => d.kind === 'saturday');
      if (!row) throw new Error(`no Saturday for ${m.number}`);
      expect(fm.legacyId).toBe(`w${m.number}sat`);
      expect(fm.topic).toBe(row.topic);
      expect(fm.implement).toBe(row.implement);
      expect(fm.problemsText).toBe(row.problemsCell);
      expect(fm.doneWhen).toBe(row.doneWhen);
      expect(fm.estimate).toEqual(parseTimeCell(row.time));
    }
  });

  it('keeps all 22 Saturday re-solves and the 2 in Module 11 lesson 4', () => {
    const counts: Record<number, number> = {};
    for (const m of MODULES.filter((x) => x.number > 0)) {
      const loaded = bundle.modules.find((x) => x.module.frontmatter.slug === m.slug);
      const n = loaded?.checkpoint?.frontmatter.resolves?.length ?? 0;
      if (n) counts[m.number] = n;
    }
    expect(counts).toEqual({ 1: 4, 3: 5, 5: 3, 7: 3, 9: 3, 11: 4 });
    const m11 = bundle.modules.find((x) => x.module.frontmatter.number === 11);
    const lesson4 = m11?.lessons[3]?.frontmatter as LessonFrontmatter;
    expect(lesson4.resolves).toEqual([{ problems: [322] }, { problems: [62] }]);
    const m1 = bundle.modules.find((x) => x.module.frontmatter.number === 1);
    expect(m1?.checkpoint?.frontmatter.resolves).toEqual([
      { problems: [54] },
      { problems: [242] },
      { problems: [1] },
      { problems: [128, 217] },
    ]);
  });

  it('of every module holds the short-on-time note and the remaining notes', () => {
    for (const m of MODULES.filter((x) => x.number > 0)) {
      const loaded = bundle.modules.find((x) => x.module.frontmatter.slug === m.slug);
      const week = schedule.weeks[m.number];
      expect(loaded?.module.frontmatter.shortOnTime).toBe(week?.fallBehind);
      expect(loaded?.module.frontmatter.notes ?? []).toEqual(week?.notes);
    }
    const notes = bundle.modules.filter((m) => m.module.frontmatter.notes);
    expect(notes.map((m) => m.module.frontmatter.number)).toEqual([12]);
  });
});

describe('problems', () => {
  it('equal the legacy bank plus logged changes', () => {
    const bank = parseBank(lines);
    const core = bundle.bank.flatMap((p) => ('tier' in p ? [p] : []));
    expect(core).toHaveLength(173);
    for (const [i, row] of bank.entries()) {
      const p = core[i];
      if (!p) throw new Error(`no problem at ${i}`);
      expect(p.num).toBe(row.num);
      expect(p.title).toBe(row.title);
      expect(p.url).toBe(row.url);
      expect(p.difficulty).toBe(row.diff);
      expect(p.tier).toBe(row.tier);
      expect(p.role).toBe(row.role);
      expect(p.module).toBe(MODULES[row.week]?.slug);
      expect(p.lesson).toBe(MODULES[row.week]?.lessons[row.day - 1]);
      expect(p.pattern).toBe(row.pattern);
      expect(p.prereq).toBe(row.prereq);
      expect(p.why).toBe(row.why);
      expect(p.hint).toBe(row.hint);
      expect(Boolean(p.hiddenUntilAttempted)).toBe(row.week === 12);
    }
  });

  it('flag exactly the six extension problems', () => {
    const extensions = bundle.bank.filter((p) => 'extension' in p).map((p) => p.num);
    expect(extensions.sort((a, b) => a - b)).toEqual([2, 14, 239, 297, 349, 1480]);
    const text = originalLines.join('\n');
    for (const p of bundle.bank.filter((x) => 'extension' in x)) {
      expect(text, String(p.num)).toContain(p.url);
      expect(text, String(p.num)).toContain(p.title);
    }
  });
});

describe('reserved problems', () => {
  it('equal the legacy §9 tables', () => {
    const { assessments, mocks } = parseAssessments(originalLines);
    expect(bundle.reserved.assessments.assessments.map((a) => a.problems)).toEqual(
      assessments.map((a) =>
        a.problems.map((p) => ({ num: p.num, title: p.title, url: p.url, difficulty: p.diff, minutes: p.minutes })),
      ),
    );
    expect(bundle.reserved.mocks.mocks.map((m) => m.pool)).toEqual(mocks.map((m) => m.pool));
    expect(bundle.reserved.mocks.mocks.map((m) => m.topics)).toEqual(mocks.map((m) => m.topics));
  });

  it('hold the gated texts unchanged', () => {
    const gated = new Map(bundle.reserved.gated.gated.map((g) => [g.id, g]));
    expect(gated.get('classification-drill-6')?.md).toBe(
      'Count the number of contiguous subarrays whose sum is divisible by k (values may be negative).',
    );
    expect(gated.get('classification-drill-6')?.by).toBe('assessment-1');
    expect(gated.get('classification-drill-answers')?.md).toBe(originalLines[3282]);
    expect(gated.get('placement-answer-key')?.by).toBe('placement');
  });

  it('are not in the bank', () => {
    const bankNums = new Set(bundle.bank.map((p) => p.num));
    const { assessments, mocks } = parseAssessments(originalLines);
    for (const num of [...assessments.flatMap((a) => a.problems), ...mocks.flatMap((m) => m.pool)].map((p) => p.num)) {
      expect(bankNums.has(num), String(num)).toBe(false);
    }
  });
});

describe('modules on disk', () => {
  it('follow the plan: slugs, folders, order and prerequisites', () => {
    expect(bundle.modules.map((m) => m.module.frontmatter.slug)).toEqual(MODULES.map((m) => m.slug));
    for (const m of MODULES) {
      expect(fs.existsSync(path.join(CONTENT_DIR, 'modules', moduleDir(m), 'module.mdx')), m.slug).toBe(true);
    }
    expect(bundle.track.modules.map((m) => m.number)).toEqual(MODULES.map((m) => m.number));
    const seen = new Set<string>();
    for (const m of bundle.track.modules) {
      for (const p of m.prerequisites) expect(seen.has(p), `${m.slug} needs ${p} first`).toBe(true);
      seen.add(m.slug);
    }
  });
});
