// Ported from legacy/src/viz/w07.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  nums: number[];
}

interface Step extends VizStep {
  d: number[];
  hot: Record<string, string>;
  swaps: number;
  done?: boolean;
  result?: number[];
}

export default defineViz<Input, Step>('heapify', {
  title: 'Heapify in O(n): sift down every non-leaf, last to first',
  inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [9, 4, 7, 1, 8, 2, 3], wide: true }],
  presets: [
    { label: '7 elements', input: { nums: [9, 4, 7, 1, 8, 2, 3] } },
    { label: 'Reversed', input: { nums: [6, 5, 4, 3, 2, 1] } },
  ],
  legend: [
    ['current', 'sifting down'],
    ['compare', 'swapped with'],
    ['dim', 'leaf: no work'],
  ],
  code: `
function heapify(d) {
  for (let i = (d.length >> 1) - 1; i >= 0; i--) {   // last non-leaf first  //@loop
    let j = i;
    while (true) {                                    // sift down
      const l = 2 * j + 1, r = l + 1; let s = j;
      if (l < d.length && d[l] < d[s]) s = l;
      if (r < d.length && d[r] < d[s]) s = r;
      if (s === j) break;                                                    //@stop
      [d[j], d[s]] = [d[s], d[j]]; j = s;                                    //@swap
    }
  }
}`,
  validate: ({ nums }) => (nums.length < 1 || nums.length > 15 ? 'Use 1–15 numbers.' : null),
  run({ nums }) {
    const d = [...nums],
      n = d.length,
      steps: Step[] = [];
    let swaps = 0;
    const leaves = Object.fromEntries(
      Array.from({ length: n }, (_, k) => [k, k >= n >> 1 ? 'dim' : null]).filter(([, v]) => v),
    );
    steps.push({
      d: [...d],
      hot: leaves,
      line: 'loop',
      swaps,
      note: `Indices ${n >> 1}..${n - 1} are leaves (${n - (n >> 1)} of ${n}): they are already heaps of size 1.`,
    });
    for (let i = (n >> 1) - 1; i >= 0; i--) {
      let j = i;
      steps.push({
        d: [...d],
        hot: { ...leaves, [i]: 'current' },
        line: 'loop',
        swaps,
        note: `Sift down index ${i} (${d[i]}).`,
      });
      while (true) {
        const l = 2 * j + 1,
          r = l + 1;
        let s = j;
        if (l < n && d[l] < d[s]) s = l;
        if (r < n && d[r] < d[s]) s = r;
        if (s === j) break;
        [d[j], d[s]] = [d[s], d[j]];
        swaps++;
        steps.push({
          d: [...d],
          hot: { ...leaves, [s]: 'current', [j]: 'compare' },
          line: 'swap',
          swaps,
          note: `Swap ${d[s]} down with ${d[j]}.`,
        });
        j = s;
      }
    }
    steps.push({
      d,
      hot: {},
      done: true,
      line: null,
      swaps,
      result: d,
      note: `Heap built with ${swaps} swaps.`,
      why: 'Half the nodes do nothing, a quarter sift at most 1 level, an eighth at most 2, …: the total is bounded by n, so O(n), not O(n log n).',
    });
    return steps;
  },
  view(st, stage) {
    stage.append(R.heap(st.d, { states: st.hot }));
    stage.append(R.vars({ swaps: st.swaps }));
  },
  random: (g) => ({ nums: rarr(g, rint(g, 1, 15), 0, 30) }),
});
