// Port of the block parser in legacy/tools/build.mjs (parseBlocks, parseMeta, parseWeekFile and the extra-page split).
// The legacy version renders Markdown as it goes and runs a build on import, so it cannot be reused. This one keeps
// the raw Markdown; the fidelity tests render it with the legacy renderer and compare the result with the new MDX.
import yaml from 'js-yaml-legacy';

export type RawExercise = Record<string, unknown>;
export interface RawAnno {
  code: string;
  notes: Record<string, string>;
  title: string;
}

export type Block =
  | { t: 'md'; md: string; line: number }
  | { t: 'h'; text: string; tag: string; line: number }
  | { t: 'pullSection'; section: number; key: string; line: number }
  | { t: 'pull'; week: number | null; key: string; line: number }
  | { t: 'viz'; id: string; props: Record<string, unknown>; line: number }
  | { t: 'note'; kind: string; title: string; md: string; line: number }
  | { t: 'stages'; title: string; stages: { name: string; label: string; blocks: Block[] }[]; line: number }
  | { t: 'ex'; ex: RawExercise; line: number }
  | { t: 'anno'; anno: RawAnno; line: number };

export interface ParseContext {
  id: string;
  exN: number;
  exIds: Set<string>;
  warnings: string[];
}

export interface NumberedLine {
  text: string;
  /** 1-based line number in the legacy file. */
  n: number;
}

export function parseBlocks(lines: NumberedLine[], ctx: ParseContext): Block[] {
  const blocks: Block[] = [];
  let buf: NumberedLine[] = [];
  const flush = () => {
    const t = buf
      .map((l) => l.text)
      .join('\n')
      .trim();
    if (t) blocks.push({ t: 'md', md: t, line: buf.find((l) => l.text.trim())?.n ?? 0 });
    buf = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const { text: line, n } = lines[i] as NumberedLine;
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^## (.+?)(?:\s+\{(\w[\w-]*)\})?\s*$/))) {
      flush();
      blocks.push({ t: 'h', text: m[1] as string, tag: m[2] ?? '', line: n });
      continue;
    }
    if ((m = line.match(/^@pull\s+s(\d+):(.+)$/))) {
      flush();
      blocks.push({ t: 'pullSection', section: Number(m[1]), key: (m[2] as string).trim(), line: n });
      continue;
    }
    if ((m = line.match(/^@pull\s+(?:w(\d+):)?(.+)$/))) {
      flush();
      blocks.push({ t: 'pull', week: m[1] ? Number(m[1]) : null, key: (m[2] as string).trim(), line: n });
      continue;
    }
    if ((m = line.match(/^@viz\s+([\w-]+)\s*(\{.*\})?\s*$/))) {
      flush();
      let props: Record<string, unknown> = {};
      if (m[2]) {
        try {
          props = JSON.parse(m[2]) as Record<string, unknown>;
        } catch {
          ctx.warnings.push(`${ctx.id}: bad @viz JSON: ${m[2]}`);
        }
      }
      blocks.push({ t: 'viz', id: m[1] as string, props, line: n });
      continue;
    }
    if ((m = line.match(/^:::(tip|warn|key|mistake|interview)\s*(.*)$/))) {
      flush();
      const body: string[] = [];
      i++;
      while (i < lines.length && (lines[i] as NumberedLine).text.trim() !== ':::')
        body.push((lines[i++] as NumberedLine).text);
      blocks.push({ t: 'note', kind: m[1] as string, title: m[2] ?? '', md: body.join('\n'), line: n });
      continue;
    }
    if ((m = line.match(/^:::stages\s*(.*)$/))) {
      flush();
      const body: NumberedLine[] = [];
      i++;
      let depth = 0;
      while (i < lines.length && !((lines[i] as NumberedLine).text.trim() === ':::' && depth === 0)) {
        const l = (lines[i] as NumberedLine).text;
        if (/^:::(tip|warn|key|mistake|interview)/.test(l)) depth++;
        else if (l.trim() === ':::') depth--;
        body.push(lines[i++] as NumberedLine);
      }
      const stages: { name: string; label: string; lines: NumberedLine[] }[] = [];
      let cur: { name: string; label: string; lines: NumberedLine[] } | null = null;
      for (const l of body) {
        const sm = l.text.match(/^@stage\s+(\w+)\s*(.*)$/);
        if (sm) {
          cur = { name: sm[1] as string, label: sm[2] ?? '', lines: [] };
          stages.push(cur);
        } else if (cur) cur.lines.push(l);
      }
      blocks.push({
        t: 'stages',
        title: m[1] ?? '',
        stages: stages.map((s) => ({ name: s.name, label: s.label, blocks: parseBlocks(s.lines, ctx) })),
        line: n,
      });
      continue;
    }
    if ((m = line.match(/^```(ex|anno)\s*$/))) {
      flush();
      const body: string[] = [];
      i++;
      while (i < lines.length && (lines[i] as NumberedLine).text !== '```')
        body.push((lines[i++] as NumberedLine).text);
      let o: Record<string, unknown>;
      try {
        o = yaml.load(body.join('\n')) as Record<string, unknown>;
      } catch (e) {
        ctx.warnings.push(`${ctx.id}: YAML error at line ${n}: ${(e as Error).message.split('\n')[0]}`);
        continue;
      }
      if (m[1] === 'ex') {
        o.id = o.id ? o.id : ctx.id + '-' + ++ctx.exN;
        if (ctx.exIds.has(o.id as string)) ctx.warnings.push('duplicate exercise id ' + String(o.id));
        ctx.exIds.add(o.id as string);
        o.lesson = ctx.id;
        blocks.push({ t: 'ex', ex: o, line: n });
      } else {
        blocks.push({
          t: 'anno',
          anno: {
            code: String(o.code).replace(/\n$/, ''),
            notes: (o.notes ?? {}) as Record<string, string>,
            title: (o.title as string) || '',
          },
          line: n,
        });
      }
      continue;
    }
    buf.push(lines[i] as NumberedLine);
  }
  flush();
  return blocks;
}

export type Meta = Record<string, string | string[]>;

export function parseMeta(lines: NumberedLine[]): { meta: Meta; rest: NumberedLine[] } {
  const meta: Meta = {};
  let i = 0;
  let key: string | null = null;
  for (; i < lines.length; i++) {
    const l = (lines[i] as NumberedLine).text;
    const m = l.match(
      /^@(goal|why|prereqs|outcomes|ready|summary|revision|title|challenge|reflect|milestone|map):\s*(.*)$/,
    );
    if (m) {
      key = m[1] as string;
      meta[key] = m[2] ? m[2] : [];
      continue;
    }
    if (key && Array.isArray(meta[key]) && /^\s*- /.test(l)) {
      (meta[key] as string[]).push(l.replace(/^\s*- /, ''));
      continue;
    }
    if (!l.trim()) {
      key = null;
      continue;
    }
    break;
  }
  return { meta, rest: lines.slice(i) };
}

export interface ParsedPage {
  id: string;
  title: string;
  meta: Meta;
  blocks: Block[];
}

export interface ParsedWeekFile {
  lessons: Record<number, ParsedPage>;
  week: ParsedPage | null;
  saturday: ParsedPage | null;
}

export function parseWeekFile(
  week: number,
  lines: NumberedLine[],
  warnings: string[],
  exIds: Set<string>,
): ParsedWeekFile {
  const parts: { kind: string; n: number | null; title: string; lines: NumberedLine[] }[] = [];
  let cur: (typeof parts)[number] | null = null;
  for (const l of lines) {
    const m = l.text.match(/^# (Lesson (\d+)|Week|Saturday)(?::\s*(.*))?$/);
    if (m) {
      cur = {
        kind: m[2] ? 'lesson' : (m[1] as string).toLowerCase(),
        n: m[2] ? Number(m[2]) : null,
        title: m[3] ?? '',
        lines: [],
      };
      parts.push(cur);
      continue;
    }
    if (cur) cur.lines.push(l);
  }
  const out: ParsedWeekFile = { lessons: {}, week: null, saturday: null };
  for (const p of parts) {
    const id = p.kind === 'lesson' ? `w${week}d${p.n}` : p.kind === 'week' ? `w${week}` : `w${week}sat`;
    const ctx: ParseContext = { id, exN: 0, exIds, warnings };
    const { meta, rest } = parseMeta(p.lines);
    const blocks = parseBlocks(rest, ctx);
    const page: ParsedPage = { id, title: p.title, meta, blocks };
    if (p.kind === 'lesson') out.lessons[p.n as number] = page;
    else if (p.kind === 'week') out.week = page;
    else out.saturday = page;
  }
  return out;
}

export function parseExtraFile(
  lines: NumberedLine[],
  warnings: string[],
  exIds: Set<string>,
): Record<string, ParsedPage> {
  const parts: { id: string; title: string; lines: NumberedLine[] }[] = [];
  let cur: (typeof parts)[number] | null = null;
  for (const l of lines) {
    const m = l.text.match(/^# Page ([\w-]+):\s*(.*)$/);
    if (m) {
      cur = { id: m[1] as string, title: m[2] ?? '', lines: [] };
      parts.push(cur);
      continue;
    }
    if (cur) cur.lines.push(l);
  }
  const out: Record<string, ParsedPage> = {};
  for (const p of parts) {
    const ctx: ParseContext = { id: p.id, exN: 0, exIds, warnings };
    const { meta, rest } = parseMeta(p.lines);
    out[p.id] = { id: p.id, title: p.title, meta, blocks: parseBlocks(rest, ctx) };
  }
  return out;
}

/** Flattens stage contents, so a walk over exercises, callouts or visualizers does not need to recurse. */
export function walkBlocks(blocks: Block[], visit: (b: Block) => void): void {
  for (const b of blocks) {
    visit(b);
    if (b.t === 'stages') for (const s of b.stages) walkBlocks(s.blocks, visit);
  }
}
