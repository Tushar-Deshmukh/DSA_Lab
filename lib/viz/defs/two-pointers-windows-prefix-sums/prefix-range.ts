// Ported from legacy/src/viz/w02.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  nums: number[];
  l: number;
  r: number;
}

interface Step extends VizStep {
  pre: number[];
  cur?: number;
  from?: number;
  result?: number;
  q?: boolean;
}

// ---------- prefix sums ----------
export default defineViz<Input, Step>('prefix-range', {
  title: 'Prefix sums: any range sum in O(1)',
  inputs: [
    { key: 'nums', label: 'nums', type: 'numbers', def: [-2, 0, 3, -5, 2, -1], wide: true },
    { key: 'l', label: 'query l', type: 'int', def: 2 },
    { key: 'r', label: 'query r', type: 'int', def: 5 },
  ],
  presets: [
    { label: 'LeetCode 303 example', input: { nums: [-2, 0, 3, -5, 2, -1], l: 2, r: 5 } },
    { label: 'Range starting at 0', input: { nums: [-2, 0, 3, -5, 2, -1], l: 0, r: 2 } },
    { label: 'Single element', input: { nums: [4, 7, 1], l: 1, r: 1 } },
  ],
  legend: [
    ['current', 'being built / used'],
    ['window', 'queried range'],
    ['compare', 'pre[l] (subtracted)'],
  ],
  code: `
class NumArray {
  constructor(nums) {
    this.pre = [0];        // sum of the first 0 elements //@init
    for (const x of nums)                                                    //@loop
      this.pre.push(this.pre[this.pre.length - 1] + x);                      //@push
  }
  sumRange(l, r) {
    return this.pre[r + 1] - this.pre[l];                                    //@query
  }
}`,
  validate: ({ nums, l, r }) =>
    sizeCheck(nums, 1, 14) || (l < 0 || r >= nums.length || l > r ? 'Need 0 ≤ l ≤ r < n.' : null),
  run({ nums: a, l, r }) {
    const steps: Step[] = [],
      pre = [0];
    steps.push({
      line: 'init',
      pre: [...pre],
      cur: 0,
      note: 'pre[0] = 0: the sum of no elements.',
      why: 'Without pre[0] = 0, ranges that start at index 0 would have nothing to subtract.',
    });
    a.forEach((x, i) => {
      pre.push(pre[i] + x);
      steps.push({
        line: ['loop', 'push'],
        pre: [...pre],
        cur: i + 1,
        from: i,
        note: `pre[${i + 1}] = pre[${i}] + nums[${i}] = ${pre[i]} + ${x} = ${pre[i + 1]}.`,
        why:
          i === 0
            ? 'pre[i] is the sum of the first i elements, nums[0..i−1]. Building it is O(n), once.'
            : null,
      });
    });
    steps.push({
      result: pre[r + 1] - pre[l],
      line: 'query',
      pre,
      q: true,
      note: `sumRange(${l}, ${r}) = pre[${r + 1}] − pre[${l}] = ${pre[r + 1]} − ${pre[l]} = ${pre[r + 1] - pre[l]}.`,
      why: `pre[${r + 1}] covers nums[0..${r}]; pre[${l}] covers nums[0..${l - 1}]. Subtracting leaves exactly nums[${l}..${r}]. One subtraction per query: O(1).`,
    });
    return steps;
  },
  view(st, stage, { nums: a, l, r }) {
    stage.append(
      R.cells(a, {
        window: st.q ? [l, r] : null,
        states: st.from != null ? { [st.from]: 'current' } : {},
        label: 'nums',
      }),
    );
    const states: Record<string, string> = {};
    if (st.cur != null) states[st.cur] = 'current';
    if (st.q) {
      states[r + 1] = 'current';
      states[l] = 'compare';
    }
    stage.append(
      R.cells(
        (a as (number | null)[]).concat([null]).map((_, i) => (i < st.pre.length ? st.pre[i] : '')),
        { states, label: 'pre (one longer than nums)' },
      ),
    );
  },
  random: (g) => {
    const a = rarr(g, rint(g, 1, 14), -9, 9);
    const l = rint(g, 0, a.length - 1);
    return { nums: a, l, r: rint(g, l, a.length - 1) };
  },
});
