// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  n: number;
}

interface Step extends VizStep {
  k: number;
  result?: number;
}

// ---------- growth of the common classes ----------
const CLASSES: [string, (n: number) => number, string][] = [
  ['O(1)', () => 1, 'c1'],
  ['O(log n)', (n) => Math.max(1, Math.log2(n)), 'clog'],
  ['O(n)', (n) => n, 'cn'],
  ['O(n log n)', (n) => n * Math.max(1, Math.log2(n)), 'cnlog'],
  ['O(n²)', (n) => n * n, 'cn2'],
  ['O(2ⁿ)', (n) => Math.pow(2, n), 'c2n'],
];

const human = (ops: number) => {
  if (!isFinite(ops) || ops > 1e30) return 'longer than the age of the universe';
  const s = ops / 1e8; // ~10^8 simple operations per second (roadmap's upper estimate)
  if (s < 1e-3) return 'instant';
  if (s < 1) return (s * 1000).toFixed(s < 0.01 ? 2 : 0) + ' ms';
  if (s < 120) return s.toFixed(1) + ' s';
  if (s < 7200) return (s / 60).toFixed(0) + ' min';
  if (s < 86400 * 3) return (s / 3600).toFixed(0) + ' h';
  if (s < 3.15e7 * 3) return (s / 86400).toFixed(0) + ' days';
  return (s / 3.15e7).toExponential(1) + ' years';
};

const big = (x: number) =>
  !isFinite(x) || x > 1e15
    ? x > 1e300 || !isFinite(x)
      ? '> 10³⁰⁰'
      : '≈ 10^' + Math.floor(Math.log10(x))
    : Math.round(x).toLocaleString('en-US');

export default defineViz<Input, Step>('growth', {
  title: 'How the common complexity classes grow',
  inputs: [{ key: 'n', label: 'n (input size)', type: 'int', def: 1000 }],
  presets: [
    { label: 'n = 20', input: { n: 20 } },
    { label: 'n = 1,000', input: { n: 1000 } },
    { label: 'n = 100,000', input: { n: 100000 } },
    { label: 'n = 1,000,000', input: { n: 1000000 } },
  ],
  legend: [
    ['current', 'class just added'],
    ['error', 'too slow for one second'],
  ],
  code: `
return a[0];                                               //@c1
for (let i = n; i > 1; i = Math.floor(i / 2)) work();      //@clog
for (let i = 0; i < n; i++) work();                        //@cn
for (let i = 0; i < n; i++)
  for (let j = 1; j < n; j *= 2) work();                   //@cnlog
for (let i = 0; i < n; i++)
  for (let j = 0; j < n; j++) work();                      //@cn2
function f(n) { if (n <= 1) return; f(n - 1); f(n - 1); }  //@c2n`,
  validate: ({ n }) => (n < 2 ? 'Use n ≥ 2.' : n > 1e9 ? 'Use n ≤ 10⁹.' : null),
  run({ n }) {
    return CLASSES.map(([name, f, tag], k) => {
      const ops = f(n);
      return {
        line: tag,
        k,
        note: `${name}: about ${big(ops)} operations for n = ${n.toLocaleString('en-US')} → ${human(ops)} at ~10⁸ simple operations per second.`,
        why:
          k === 5
            ? 'Exponential growth is why n ≤ 20–25 is the limit for subset-style brute force.'
            : k === 4
              ? 'Quadratic is fine up to n ≈ 5,000 and hopeless at 10⁵ and beyond.'
              : k === 3
                ? 'n log n is barely more than n: sorting first is usually affordable.'
                : null,
        result: k === 5 ? n : undefined,
      };
    });
  },
  view(st, stage, { n }) {
    const maxLog = 18;
    const rows = CLASSES.map(([name, f], k) => {
      if (k > st.k) return { name, fraction: null };
      const ops = f(n),
        lg = Math.min(maxLog, Math.log10(Math.max(1, ops)));
      const slow = ops / 1e8 > 1;
      return {
        name,
        fraction: lg / maxLog,
        text: big(ops) + ' · ' + human(ops),
        state: k === st.k ? 'current' : slow ? 'error' : 'done',
      };
    });
    stage.append(R.panel('operations (logarithmic scale)', R.logBars(rows, 'operation counts, log scale')));
  },
  random: (g) => ({ n: rint(g, 2, 60) }),
});
