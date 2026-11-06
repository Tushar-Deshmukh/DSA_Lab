// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  nums: number[];
  k: number;
}

interface Step extends VizStep {
  count: number[][];
  B: number[][];
  out: number[];
  hot?: number;
  done?: boolean;
  result?: number[];
}

export default defineViz<Input, Step>('bucket-freq', {
  title: 'Top K Frequent: buckets indexed by count',
  inputs: [
    { key: 'nums', label: 'nums', type: 'numbers', def: [1, 1, 1, 2, 2, 3], wide: true },
    { key: 'k', label: 'k', type: 'int', def: 2 },
  ],
  presets: [
    { label: 'Lesson 4 trace', input: { nums: [1, 1, 1, 2, 2, 3], k: 2 } },
    { label: 'k = 1', input: { nums: [4, 4, 5, 6, 6, 6], k: 1 } },
    { label: 'All distinct', input: { nums: [9, 8, 7], k: 3 } },
  ],
  legend: [
    ['current', 'being placed or read'],
    ['done', 'in the answer'],
  ],
  code: `
function topKFrequent(nums, k) {
  const count = new Map();                                        //@init
  for (const x of nums) count.set(x, (count.get(x) ?? 0) + 1);     //@count
  const buckets = Array.from({ length: nums.length + 1 }, () => []); //@buckets
  for (const [x, c] of count) buckets[c].push(x);                  //@place
  const out = [];                                                 //@out
  for (let c = nums.length; c >= 1 && out.length < k; c--)        //@scan
    for (const x of buckets[c]) if (out.length < k) out.push(x);  //@take
  return out;                                                     //@ret
}`,
  validate: ({ nums, k }) =>
    sizeCheck(nums, 1, 14) ||
    (k < 1 || k > new Set(nums).size ? 'k must be between 1 and the number of distinct values.' : null),
  run({ nums, k }) {
    const steps: Step[] = [],
      count: Map<number, number> = new Map();
    for (const x of nums) count.set(x, (count.get(x) ?? 0) + 1);
    const n = nums.length,
      B: number[][] = Array.from({ length: n + 1 }, () => []);
    steps.push({
      line: ['init', 'count'],
      count: [...count],
      B: B.map((b) => [...b]),
      out: [],
      note: 'Count every value: ' + [...count].map(([x, c]) => x + '×' + c).join(', ') + '.',
    });
    for (const [x, c] of count) {
      B[c].push(x);
      steps.push({
        line: ['buckets', 'place'],
        count: [...count],
        B: B.map((b) => [...b]),
        out: [],
        hot: c,
        note: `${x} appears ${c}× → bucket ${c}.`,
        why: 'A count can be at most n, so n + 1 buckets cover every possible count. No sorting by frequency is needed.',
      });
    }
    const out: number[] = [];
    for (let c = n; c >= 1 && out.length < k; c--) {
      if (!B[c].length) continue;
      for (const x of B[c]) if (out.length < k) out.push(x);
      steps.push({
        line: ['scan', 'take'],
        count: [...count],
        B: B.map((b) => [...b]),
        out: [...out],
        hot: c,
        note: `Bucket ${c}: take ${B[c].join(', ')}${out.length >= k ? ' → have k = ' + k : ''}.`,
      });
    }
    steps.push({
      line: 'ret',
      count: [...count],
      B: B.map((b) => [...b]),
      out,
      done: true,
      result: out,
      note: `Answer [${out.join(', ')}].`,
      why: 'Counting O(n), placing O(distinct), scanning O(n): O(n) total, against O(n log n) for sorting by count. Module 7 redoes this with a heap in O(n log k).',
    });
    return steps;
  },
  view(st, stage) {
    stage.append(R.kv(st.count, { label: 'count (value → times)' }));
    const vals = st.B.map((b) => (b.length ? b.join(',') : ''));
    const states: Record<string, string> = {};
    if (st.hot != null) states[st.hot] = 'current';
    stage.append(
      R.cells(vals, { states, label: 'buckets: index = count, contents = values with that count' }),
    );
    stage.append(
      R.cells(st.out, {
        states: Object.fromEntries(st.out.map((_, i) => [i, 'done'])),
        label: 'answer so far',
      }),
    );
  },
  random: (g) => {
    const a = rarr(g, rint(g, 1, 14), 1, 5);
    return { nums: a, k: rint(g, 1, new Set(a).size) };
  },
});
