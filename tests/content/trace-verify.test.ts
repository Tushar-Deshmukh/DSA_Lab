// The `verify:` field of a trace exercise (§8.4, ported from legacy/tests/content.mjs): a script whose
// console.log lines must be the rows' answers, one per line, so a trace's answer table stays mechanically
// checkable. The renderer never ships verify to the page; this is a build-time check.
import vm from 'node:vm';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadContent, type ContentBundle } from '@/lib/content/load';
import type { Exercise } from '@/lib/content/schema';
import { CONTENT_DIR } from '@/scripts/import/paths';

type TraceExercise = Extract<Exercise, { type: 'trace' }>;
type TraceWithWhere = TraceExercise & { verify: string; where: string };

let bundle: ContentBundle;
beforeAll(() => {
  bundle = loadContent(CONTENT_DIR);
});

/** Every trace whose YAML carries a `verify:` script, with the page it belongs to. */
const traces = (content: ContentBundle): TraceWithWhere[] =>
  content.modules.flatMap(({ module: m, lessons, checkpoint }) =>
    [...lessons, ...(checkpoint ? [checkpoint] : [])].flatMap((page) =>
      page.exercises
        .filter((ex): ex is TraceExercise & { verify: string } => ex.type === 'trace' && typeof ex.verify === 'string' && ex.verify.length > 0)
        .map((ex) => ({ ...ex, where: `${m.frontmatter.slug}/${page.frontmatter.slug}/${ex.id}` })),
    ),
  );

/** console.log formatting close to Node/Chrome for arrays and objects of primitives. */
function fmtVal(v: unknown): string {
  if (Array.isArray(v)) return '[ ' + v.map((x) => (typeof x === 'string' ? `'${x}'` : fmtVal(x))).join(', ') + ' ]';
  if (v instanceof Map) return 'Map(' + v.size + ') { ' + [...v].map(([k, x]) => `${fmtVal(k)} => ${fmtVal(x)}`).join(', ') + ' }';
  if (v instanceof Set) return 'Set(' + v.size + ') { ' + [...v].map((x) => fmtVal(x)).join(', ') + ' }';
  if (v && typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Every string the script printed, one entry per console.log call: strings raw, values via `fmtVal`. */
function runPrint(code: string): string[] {
  const out: string[] = [];
  const ctx = { console: { log: (...a: unknown[]) => out.push(a.map((x) => (typeof x === 'string' ? x : fmtVal(x))).join(' ')) } };
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { timeout: 2000 });
  return out;
}

/** The default branch of the legacy `normOut`: whitespace gone, quotes normalised, case folded. */
const normOut = (s: string): string =>
  String(s)
    .replace(/\r/g, '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/'/g, '"')
    .toLowerCase();

const phaseFixed = [
  'two-pointers-windows-prefix-sums/opposite-end-two-pointers/ex-04',
  'graphs-weighted-greedy/minimum-spanning-trees/ex-01',
  'interview-readiness/interview-end-to-end/ex-02',
];

describe('every trace with a verify script', () => {
  it('is every trace the content ships: 50 now, with the three Phase-4 fixes among them', () => {
    const list = traces(bundle);
    expect(list).toHaveLength(50);
    for (const where of phaseFixed) expect(list.map((t) => t.where)).toContain(where);
    // No trace is left without one: every answer table stays mechanically checkable.
    const total = bundle.modules.flatMap(({ lessons, checkpoint }) =>
      [...lessons, ...(checkpoint ? [checkpoint] : [])].flatMap((page) => page.exercises),
    );
    expect(total.filter((ex) => ex.type === 'trace')).toHaveLength(50);
  });

  it('prints each row\'s answer, in row order (§8.4)', () => {
    for (const t of traces(bundle)) {
      const out = runPrint(t.verify);
      t.rows.forEach((row, k) => {
        const answers = ([] as string[]).concat(row.answer).map(normOut);
        expect(
          answers.includes(normOut(out[k] ?? '')),
          `${t.where}: row ${k + 1} "${row.prompt}" answer ${JSON.stringify(row.answer)} but verify printed ${JSON.stringify(out[k])}`,
        ).toBe(true);
      });
    }
  });
});
