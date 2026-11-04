// The importer's parsers are ports. These tests prove that, on the untouched legacy files, they return what the legacy
// code returns: the roadmap parser against legacy/tools/curriculum.mjs, and the block parser against the legacy build.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseExtraFile, parseWeekFile, walkBlocks, type Block, type ParsedPage } from '@/scripts/import/blocks';
import { buildLegacyDist, type LegacyBlock, type LegacyDist, type LegacyPage } from '@/scripts/import/legacy-build';
import { CONTENT_FILES, readLegacyLines, ROADMAP_FILE } from '@/scripts/import/legacy-source';
import { LEGACY_DIR } from '@/scripts/import/paths';
import {
  parseAssessments,
  parseBank,
  parseSchedule,
  parseSectionsMd,
  parseTheory,
} from '@/scripts/import/roadmap-parser';
import { htmlCodeBlocks, htmlToText, legacyHtml } from './support';

interface LegacyRoadmap {
  theory: Record<string, { week: number; dates: string; title: string; frags: Record<string, string>; order: string[]; intro: string }>;
  schedule: unknown;
  bank: unknown;
  assessments: unknown;
  mocks: unknown;
  sections: Record<string, { n: number; title: string; lead: string; subs: { title: string; md: string }[] }>;
}

const lines = readLegacyLines(ROADMAP_FILE);

describe('roadmap parser port', () => {
  let legacy: LegacyRoadmap;

  beforeAll(async () => {
    const url = pathToFileURL(path.join(LEGACY_DIR, 'tools/curriculum.mjs')).href;
    const mod = (await import(/* @vite-ignore */ url)) as { parseRoadmap: (p: string) => LegacyRoadmap };
    legacy = mod.parseRoadmap(path.join(LEGACY_DIR, ROADMAP_FILE));
  });

  it('parses theory fragments identically', () => {
    const port = parseTheory(lines);
    const shape = Object.fromEntries(
      Object.entries(port).map(([w, t]) => [
        w,
        { week: t.week, dates: t.dates, title: t.title, frags: t.frags, order: t.order, intro: t.intro },
      ]),
    );
    expect(shape).toEqual(legacy.theory);
    expect(Object.values(port).reduce((n, t) => n + t.order.length, 0)).toBe(209);
  });

  it('gives each fragment a line range that starts at its text', () => {
    const port = parseTheory(lines);
    for (const week of Object.values(port)) {
      for (const key of week.order) {
        const [start, end] = week.ranges[key] as [number, number];
        const body = week.frags[key] as string;
        expect(end).toBeGreaterThanOrEqual(start);
        const slice = lines.slice(start - 1, end).join('\n');
        expect(slice).toContain(body.split('\n')[0]);
      }
    }
  });

  it('parses the schedule identically', () => {
    expect(parseSchedule(lines)).toEqual(legacy.schedule);
  });

  it('parses the bank identically', () => {
    expect(parseBank(lines)).toEqual(legacy.bank);
  });

  it('parses assessments and mocks identically', () => {
    const port = parseAssessments(lines);
    expect(port.assessments).toEqual(legacy.assessments);
    expect(port.mocks).toEqual(legacy.mocks);
  });

  it('parses sections identically', () => {
    const port = parseSectionsMd(lines);
    const shape = Object.fromEntries(
      Object.entries(port).map(([n, s]) => [
        n,
        { n: s.n, title: s.title, lead: s.lead, subs: s.subs.map((x) => ({ title: x.title, md: x.md })) },
      ]),
    );
    expect(shape).toEqual(legacy.sections);
  });
});

describe('block parser port against the legacy build', () => {
  let dist: LegacyDist;
  const pages: Record<string, ParsedPage> = {};
  const warnings: string[] = [];
  const theory = parseTheory(lines);
  const sections = parseSectionsMd(lines);

  beforeAll(() => {
    dist = buildLegacyDist();
    const exIds = new Set<string>();
    for (const file of CONTENT_FILES) {
      const numbered = readLegacyLines(`content/${file}`).map((text, i) => ({ text, n: i + 1 }));
      if (file === 'extra.md') Object.assign(pages, parseExtraFile(numbered, warnings, exIds));
      else {
        const week = Number(file.slice(1, 3));
        const parsed = parseWeekFile(week, numbered, warnings, exIds);
        if (parsed.week) pages[parsed.week.id] = parsed.week;
        if (parsed.saturday) pages[parsed.saturday.id] = parsed.saturday;
        for (const lesson of Object.values(parsed.lessons)) pages[lesson.id] = lesson;
      }
    }
  }, 120_000);

  it('finds no parse warnings', () => {
    expect(warnings).toEqual([]);
  });

  it('produces every exercise exactly as dist/exercises.json holds it', () => {
    const port: Record<string, unknown>[] = [];
    for (const page of Object.values(pages)) {
      walkBlocks(page.blocks, (b) => {
        if (b.t === 'ex') port.push(b.ex);
      });
    }
    expect(dist.exercises).toHaveLength(421);
    const byId = (list: Record<string, unknown>[]) =>
      Object.fromEntries(list.map((e) => [e.id as string, e]));
    expect(byId(port)).toEqual(byId(dist.exercises));
  });

  /** Text of one page as the legacy build rendered it, and as the port and the legacy renderer render it. */
  const legacyText = (page: LegacyPage): { text: string; code: string[] } => {
    const parts: string[] = [];
    const code: string[] = [];
    const walk = (blocks: LegacyBlock[]) => {
      for (const b of blocks) {
        if (b.t === 'h') parts.push(`[h:${b.text}|${b.tag}]`);
        else if (b.t === 'html') {
          parts.push(htmlToText(b.html ?? ''));
          code.push(...htmlCodeBlocks(b.html ?? ''));
        } else if (b.t === 'viz') parts.push(`[viz:${b.id}]`);
        else if (b.t === 'note') {
          parts.push(`[note:${b.kind}|${b.title}]`, htmlToText(b.html ?? ''));
          code.push(...htmlCodeBlocks(b.html ?? ''));
        } else if (b.t === 'stages') {
          parts.push(`[stages:${b.title}]`);
          for (const s of b.stages ?? []) {
            parts.push(`[stage:${s.name}|${s.label}]`);
            walk(s.blocks);
          }
        } else if (b.t === 'ex') parts.push(`[ex:${b.ex?.id as string}]`);
        else if (b.t === 'anno') parts.push(`[anno:${b.title}]`);
      }
    };
    walk(page.blocks);
    return { text: parts.join(' ').replace(/\s+/g, ' ').trim(), code };
  };

  const portText = (page: ParsedPage, week: number): { text: string; code: string[] } => {
    const parts: string[] = [];
    const code: string[] = [];
    const html = (md: string) => {
      const out = legacyHtml(md);
      parts.push(htmlToText(out));
      code.push(...htmlCodeBlocks(out));
    };
    const walk = (blocks: Block[]) => {
      for (const b of blocks) {
        if (b.t === 'h') parts.push(`[h:${b.text}|${b.tag}]`);
        else if (b.t === 'md') html(b.md);
        else if (b.t === 'pull') html(theory[b.week ?? week]?.frags[b.key] ?? `MISSING ${b.key}`);
        else if (b.t === 'pullSection') {
          const sub = sections[b.section]?.subs.find((s) => s.title.startsWith(b.key));
          parts.push(htmlToText(legacyHtml(sub?.title ?? `MISSING ${b.key}`)));
          html(sub?.md ?? '');
        } else if (b.t === 'viz') parts.push(`[viz:${b.id}]`);
        else if (b.t === 'note') {
          parts.push(`[note:${b.kind}|${b.title}]`);
          html(b.md);
        } else if (b.t === 'stages') {
          parts.push(`[stages:${b.title}]`);
          for (const s of b.stages) {
            parts.push(`[stage:${s.name}|${s.label}]`);
            walk(s.blocks);
          }
        } else if (b.t === 'ex') parts.push(`[ex:${b.ex.id as string}]`);
        else parts.push(`[anno:${b.anno.title}]`);
      }
    };
    walk(page.blocks);
    return { text: parts.join(' ').replace(/\s+/g, ' ').trim(), code };
  };

  it('renders every lesson and Saturday page to the text the legacy build shows', () => {
    const ids = Object.keys(dist.course.lessons).filter((id) => !id.endsWith('final'));
    expect(ids).toHaveLength(72);
    for (const id of ids) {
      const page = pages[id];
      const legacyPage = dist.course.lessons[id];
      if (!page || !legacyPage) throw new Error(`page ${id} is missing`);
      const week = Number(id.match(/^w(\d+)/)?.[1]);
      const a = portText(page, week);
      const b = legacyText(legacyPage);
      expect(a.text, id).toBe(b.text);
      expect(a.code, id).toEqual(b.code);
    }
  });

  it('renders the week overviews and extra pages to the text the legacy build shows', () => {
    for (const week of dist.course.weeks) {
      const id = `w${week.n}`;
      expect(portText(pages[id] as ParsedPage, week.n).text, id).toBe(legacyText(week.overview as LegacyPage).text);
    }
    for (const [id, legacyPage] of Object.entries(dist.course.extra)) {
      expect(portText(pages[id] as ParsedPage, 0).text, id).toBe(legacyText(legacyPage).text);
    }
  });
});
