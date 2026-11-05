// Ported from legacy/src/viz/w07.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { fmt } from './_helpers';

interface Input {
  nums: number[];
  k: number;
}

interface Step extends VizStep {
  d: number[];
  i?: number;
  popped?: number | null;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('heap-topk', {
  title: 'K-th largest: keep a min-heap of the k largest so far',
  inputs: [
    { key: 'nums', label: 'nums', type: 'numbers', def: [3, 2, 1, 5, 6, 4], wide: true },
    { key: 'k', label: 'k', type: 'int', def: 2 },
  ],
  presets: [
    { label: 'Handbook dry run', input: { nums: [3, 2, 1, 5, 6, 4], k: 2 } },
    { label: 'Duplicates', input: { nums: [3, 2, 3, 1, 2, 4, 5, 5, 6], k: 4 } },
    { label: 'k = 1', input: { nums: [7, 1, 9], k: 1 } },
  ],
  legend: [
    ['current', 'just pushed'],
    ['done', 'heap root = k-th largest so far'],
  ],
  code: `
function findKthLargest(nums, k) {
  const heap = new MinHeap((a, b) => a - b);
  for (const x of nums) {
    heap.push(x);                                       //@push
    if (heap.size() > k) heap.pop();   // drop the smallest  //@pop
  }
  return heap.peek();                                   //@ret
}`,
  validate: ({ nums, k }) =>
    nums.length < 1 || nums.length > 14
      ? 'Use 1–14 numbers.'
      : k < 1 || k > nums.length
        ? 'k must be between 1 and n.'
        : null,
  run({ nums, k }) {
    const steps: Step[] = [];
    const d: number[] = [];
    const push = (x: number) => {
      d.push(x);
      d.sort((a, b) => a - b);
    };
    nums.forEach((x, i) => {
      push(x);
      let popped: number | null = null;
      if (d.length > k) popped = d.shift()!;
      steps.push({
        d: [...d],
        i,
        popped,
        line: popped != null ? ['push', 'pop'] : 'push',
        note: `Push ${x}${popped != null ? `; size ${k + 1} > k, pop the smallest (${popped})` : ''}. Heap: ${fmt(d)}.`,
        why:
          i === 0
            ? 'The root is the weakest of the current k candidates; anything smaller than it can never be among the k largest.'
            : null,
      });
    });
    steps.push({
      d,
      done: true,
      line: 'ret',
      result: d[0],
      note: `The root is the k-th largest: ${d[0]}.`,
      why: `n pushes and pops on a heap of size ≤ k + 1: O(n log k) time, O(k) space.`,
    });
    return steps;
  },
  view(st, stage, { nums }) {
    stage.append(
      R.cells(nums, { states: st.i != null && !st.done ? { [st.i]: 'current' } : {}, label: 'nums' }),
    );
    stage.append(
      R.cells(st.d, {
        states: st.d.length ? { 0: 'done' } : {},
        label: 'heap contents (shown sorted; the root is the smallest)',
      }),
    );
    if (st.popped != null) stage.append(R.caption('popped ' + st.popped, { tone: 'muted' }));
  },
  random: (g) => {
    const a = rarr(g, rint(g, 1, 14), -5, 9);
    return { nums: a, k: rint(g, 1, a.length) };
  },
});
