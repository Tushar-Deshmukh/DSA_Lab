// TypeScript port of legacy/tools/curriculum.mjs. tests/content/parser-port.test.ts proves that on the untouched
// roadmap every function here returns what the legacy parser returns. The port exists because the importer also has
// to parse the rewritten roadmap, whose §9 tables no longer have the Date column the legacy entry point looks for.

export const splitCells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'));

function sectionLines(lines: string[], startRe: RegExp, endRe: RegExp): { lines: string[]; offset: number } {
  const s = lines.findIndex((l) => startRe.test(l));
  if (s < 0) throw new Error('section not found: ' + startRe);
  let e = lines.findIndex((l, i) => i > s && endRe.test(l));
  if (e < 0) e = lines.length;
  return { lines: lines.slice(s, e), offset: s };
}

function tableAfter(lines: string[], idx: number) {
  let i = idx;
  while (i < lines.length && !(lines[i] ?? '').startsWith('|')) i++;
  const header = splitCells(lines[i] ?? '');
  const rows: Record<string, string>[] = [];
  i += 2;
  while (i < lines.length && (lines[i] ?? '').startsWith('|')) {
    const cells = splitCells(lines[i] ?? '');
    const row: Record<string, string> = {};
    header.forEach((h, k) => (row[h] = cells[k] ?? ''));
    rows.push(row);
    i++;
  }
  return { header, rows, end: i };
}

const keyOf = (label: string): string => {
  const k = label.replace(/`/g, '').trim();
  const ex = k.match(/^(Example \d+|Pattern \d+\.\d+)/);
  if (ex?.[1]) return ex[1];
  return k
    .replace(/[.:]\s*$/, '')
    .replace(/\.$/, '')
    .trim();
};

export interface TheoryWeek {
  week: number;
  dates: string;
  title: string;
  frags: Record<string, string>;
  order: string[];
  intro: string;
  /** 1-based inclusive line range of each fragment, for `source` references. Not in the legacy parser. */
  ranges: Record<string, [number, number]>;
  /** The label after which the fragment was keyed: the `####` heading, or null for a bold run-in. */
  headings: Record<string, string | null>;
}

export function parseTheory(lines: string[]): Record<number, TheoryWeek> {
  const { lines: sec, offset } = sectionLines(lines, /^## 3\. /, /^## 4\. /);
  const weeks: Record<number, TheoryWeek> = {};
  let w: number | null = null;
  let cur: { key: string; lines: string[]; start: number; heading: string | null } | null = null;
  const push = (endExclusive: number) => {
    if (cur && w) {
      const body = cur.lines.join('\n').trim();
      if (body) {
        const week = weeks[w] as TheoryWeek;
        if (week.frags[cur.key]) cur.key += ' (2)';
        week.frags[cur.key] = body;
        week.order.push(cur.key);
        // Trailing blank lines belong to the gap between fragments, not to the fragment.
        let end = endExclusive;
        while (end > cur.start && !(lines[end - 1] ?? '').trim()) end--;
        week.ranges[cur.key] = [cur.start + 1, end];
        week.headings[cur.key] = cur.heading;
      }
    }
    cur = null;
  };
  sec.forEach((line, idx) => {
    const n = offset + idx;
    const wm = line.match(/^### Week (\d+) \((.+?)\): (.+)$/);
    if (wm) {
      push(n);
      w = Number(wm[1]);
      weeks[w] = {
        week: w,
        dates: wm[2] as string,
        title: wm[3] as string,
        frags: {},
        order: [],
        intro: '',
        ranges: {},
        headings: {},
      };
      return;
    }
    if (!w) return;
    const hm = line.match(/^#### (.+)$/);
    if (hm) {
      push(n);
      cur = { key: (hm[1] as string).trim(), lines: [], start: n, heading: (hm[1] as string).trim() };
      return;
    }
    const bm = line.match(/^\*\*(.+?)\*\*/);
    if (bm) {
      push(n);
      cur = { key: keyOf(bm[1] as string), lines: [line], start: n, heading: null };
      return;
    }
    if (!cur) {
      if (line.trim()) (weeks[w] as TheoryWeek).intro += line + '\n';
      return;
    }
    (cur as { lines: string[] }).lines.push(line);
  });
  push(offset + sec.length);
  return weeks;
}

export interface ScheduledProblem {
  num: number;
  tier: string;
}

export function parseProblems(cell: string): ScheduledProblem[] {
  const out: ScheduledProblem[] = [];
  for (const m of cell.matchAll(/\b([CSO]): ([^·]+)/g)) {
    const tier = m[1] as string;
    const nums = (m[2] as string).split('+')[0]?.match(/\b\d+\b/g) ?? [];
    for (const n of nums) out.push({ num: Number(n), tier });
  }
  return out;
}

export type DayKind = 'study' | 'saturday' | 'final' | 'rest';

export interface ScheduleDay {
  date: string;
  kind: DayKind;
  studyDay: number | null;
  topic: string;
  implement: string;
  problemsCell: string;
  problems: ScheduledProblem[];
  time: string;
  warmup: string;
  doneWhen: string;
}

export interface ScheduleWeek {
  week: number;
  dates: string;
  title: string;
  notes: string[];
  days: ScheduleDay[];
  fallBehind: string;
}

export function parseSchedule(lines: string[]): { intro: string; weeks: Record<number, ScheduleWeek> } {
  const { lines: sec } = sectionLines(lines, /^## 4\. /, /^## 5\. /);
  const intro: string[] = [];
  const weeks: Record<number, ScheduleWeek> = {};
  let w: number | null = null;
  for (let i = 0; i < sec.length; i++) {
    const line = sec[i] as string;
    const wm = line.match(/^### Week (\d+) \((.+?)\): (.+)$/);
    if (wm) {
      w = Number(wm[1]);
      weeks[w] = {
        week: w,
        dates: wm[2] as string,
        title: wm[3] as string,
        notes: [],
        days: [],
        fallBehind: '',
      };
      continue;
    }
    if (!w) {
      if (!line.startsWith('## ')) intro.push(line);
      continue;
    }
    const week = weeks[w] as ScheduleWeek;
    if (line.startsWith('| Day')) {
      const { rows, end } = tableAfter(sec, i);
      let studyIdx = 0;
      for (const r of rows) {
        const date = r['Day'] as string;
        const topic = r['Topic and theory'] as string;
        const isRest = /^Rest or/.test(topic) || /^Holiday/.test(topic);
        const isSat = /^Sat /.test(date);
        const isFinal = /^Final self/.test(topic);
        const kind: DayKind = isRest ? 'rest' : isSat ? 'saturday' : isFinal ? 'final' : 'study';
        if (kind === 'study') studyIdx++;
        week.days.push({
          date,
          kind,
          studyDay: kind === 'study' ? studyIdx : null,
          topic,
          implement: r['Implement / dry run'] as string,
          problemsCell: r['Problems'] as string,
          problems: kind === 'study' ? parseProblems(r['Problems'] as string) : [],
          time: r['Time'] as string,
          warmup: r['Warm-up'] as string,
          doneWhen: r['Done when'] as string,
        });
      }
      i = end - 1;
      continue;
    }
    const fb = line.match(/^\*\*If you fall behind in Week \d+:\*\* (.+)$/);
    if (fb) {
      week.fallBehind = fb[1] as string;
      continue;
    }
    if (line.trim()) week.notes.push(line);
  }
  return { intro: intro.join('\n').trim(), weeks };
}

export interface BankRow {
  num: number;
  title: string;
  url: string;
  diff: string;
  when: string;
  week: number;
  day: number;
  tier: string;
  role: string;
  pattern: string;
  prereq: string;
  why: string;
  hint: string;
}

export function parseBank(lines: string[]): BankRow[] {
  const { lines: sec } = sectionLines(lines, /^## 5\. /, /^## 6\. /);
  const bank: BankRow[] = [];
  for (let i = 0; i < sec.length; i++) {
    if ((sec[i] as string).startsWith('| # |')) {
      const { rows, end } = tableAfter(sec, i);
      for (const r of rows) {
        const m = (r['Problem'] as string).match(
          /^\[(.+)\]\((https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/)\)$/,
        );
        if (!m) throw new Error(`unparsed bank row: ${r['Problem']}`);
        const [tier, role] = (r['Tier · Role'] as string).split('·').map((s) => s.trim());
        const when = r['When'] as string;
        bank.push({
          num: Number(r['#']),
          title: m[1] as string,
          url: m[2] as string,
          diff: r['Diff'] as string,
          when,
          week: Number(when.match(/W(\d+)/)?.[1]),
          day: Number(when.match(/D(\d+)/)?.[1]),
          tier: tier as string,
          role: role as string,
          pattern: r['Pattern'] as string,
          prereq: r['Prerequisite'] as string,
          why: r['Why it is worth solving'] as string,
          hint: r['Hint (key observation)'] as string,
        });
      }
      i = end - 1;
    }
  }
  return bank;
}

export interface ReservedProblem {
  num: number;
  title: string;
  url: string;
  diff: string;
  minutes: number;
}

export interface Assessment {
  id: string;
  date: string;
  topics: string;
  coldCell: string;
  coldNums: number[];
  coldMinutes: number;
  problems: ReservedProblem[];
  total: string;
  pass: string;
}

export interface MockRow {
  id: number;
  date: string;
  topics: string;
  pool: { num: number; title: string; url: string }[];
}

export function parseAssessments(lines: string[]): { assessments: Assessment[]; mocks: MockRow[] } {
  const { lines: sec } = sectionLines(lines, /^## 9\. /, /^## 10\. /);
  const ai = sec.findIndex((l) => l.startsWith('| # | Date'));
  const assessments = tableAfter(sec, ai).rows.map((r): Assessment => {
    const unseen = r['Unseen problems and time limits'] as string;
    const problems = [
      ...unseen.matchAll(/\[(\d+)\. ([^\]]+)\]\((https:[^)]+)\) \((Easy|Medium|Hard), (\d+) min\)/g),
    ].map((m) => ({
      num: Number(m[1]),
      title: m[2] as string,
      url: m[3] as string,
      diff: m[4] as string,
      minutes: Number(m[5]),
    }));
    const cold = r['Cold re-solve (pick 1 at random)'] as string;
    return {
      id: r['#'] as string,
      date: r['Date'] as string,
      topics: r['Topics tested'] as string,
      coldCell: cold,
      coldNums: (cold.split('(')[0]?.match(/\b\d+\b/g) ?? []).map(Number),
      coldMinutes: Number(cold.match(/\((\d+) min\)/)?.[1]),
      problems,
      total: r['Total time'] as string,
      pass: r['Pass mark'] as string,
    };
  });
  const mi = sec.findIndex((l) => l.startsWith('| Mock | Date'));
  const mocks = tableAfter(sec, mi).rows.map((r): MockRow => ({
    id: Number(r['Mock']),
    date: r['Date'] as string,
    topics: r['Topics in scope'] as string,
    pool: [...(r['Pool'] as string).matchAll(/\[(\d+)\. ([^\]]+)\]\((https:[^)]+)\)/g)].map((x) => ({
      num: Number(x[1]),
      title: x[2] as string,
      url: x[3] as string,
    })),
  }));
  return { assessments, mocks };
}

export interface SectionSub {
  title: string;
  md: string;
  /** 1-based inclusive line range of the subsection body. Not in the legacy parser. */
  range: [number, number];
}

export interface Section {
  n: number;
  title: string;
  lead: string;
  subs: SectionSub[];
  /** 1-based inclusive line range of the lead text. Not in the legacy parser. */
  leadRange: [number, number];
}

export function parseSectionsMd(lines: string[]): Record<number, Section> {
  const out: Record<number, Section> = {};
  let cur: Section | null = null;
  let sub: SectionSub | null = null;
  lines.forEach((line, i) => {
    const h2 = line.match(/^## (\d+)\. (.+)$/);
    if (h2) {
      cur = { n: Number(h2[1]), title: h2[2] as string, lead: '', subs: [], leadRange: [i + 2, i + 1] };
      out[cur.n] = cur;
      sub = null;
      return;
    }
    if (!cur) return;
    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      sub = { title: h3[1] as string, md: '', range: [i + 2, i + 1] };
      (cur as Section).subs.push(sub);
      return;
    }
    if (sub) {
      (sub as SectionSub).md += line + '\n';
      if (line.trim()) (sub as SectionSub).range[1] = i + 1;
    } else {
      (cur as Section).lead += line + '\n';
      if (line.trim()) (cur as Section).leadRange[1] = i + 1;
    }
  });
  for (const s of Object.values(out)) {
    s.lead = s.lead.trim();
    s.subs.forEach((x) => (x.md = x.md.trim()));
  }
  return out;
}
