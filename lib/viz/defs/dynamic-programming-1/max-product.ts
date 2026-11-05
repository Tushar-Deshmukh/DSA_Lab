// Ported from legacy/src/viz/w10.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  nums: number[];
}

interface Step extends VizStep {
  i: number | null;
  mx: number;
  mn: number;
  best: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('max-product', {
  title: 'Maximum Product Subarray: keep the largest and the smallest product',
  inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [2, 3, -2, 4], wide: true }],
  presets: [
    { label: 'LeetCode example 1', input: { nums: [2, 3, -2, 4] } },
    { label: 'Two negatives', input: { nums: [-2, 3, -4] } },
    { label: 'Zeros reset', input: { nums: [-2, 0, -1] } },
  ],
  legend: [
    ['current', 'i'],
    ['done', 'best so far'],
  ],
  code: `
let curMax = nums[0], curMin = nums[0], best = nums[0];
for (let i = 1; i < nums.length; i++) {
  const x = nums[i];
  if (x < 0) [curMax, curMin] = [curMin, curMax];   // a negative swaps them  //@swap
  curMax = Math.max(x, curMax * x);                                          //@upd
  curMin = Math.min(x, curMin * x);
  best = Math.max(best, curMax);                                             //@best
}
return best;`,
  validate: ({ nums }) =>
    nums.length < 1 || nums.length > 12 || nums.some((x) => Math.abs(x) > 9)
      ? 'Use 1–12 numbers between −9 and 9.'
      : null,
  run({ nums }) {
    let mx = nums[0],
      mn = nums[0],
      best = nums[0];
    const steps: Step[] = [
      { i: 0, mx, mn, best, line: 'best', note: `Start: curMax = curMin = best = ${nums[0]}.` },
    ];
    for (let i = 1; i < nums.length; i++) {
      const x = nums[i];
      const sw = x < 0;
      if (sw) [mx, mn] = [mn, mx];
      mx = Math.max(x, mx * x);
      mn = Math.min(x, mn * x);
      best = Math.max(best, mx);
      steps.push({
        i,
        mx,
        mn,
        best,
        line: sw ? ['swap', 'upd', 'best'] : ['upd', 'best'],
        note: `x = ${x}${sw ? ' (negative: swap first)' : ''}: curMax = ${mx}, curMin = ${mn}, best = ${best}.`,
        why:
          sw && i < 4
            ? 'Multiplying by a negative turns the smallest product into the largest, so the minimum must be tracked too. Kadane with one variable would lose it.'
            : x === 0
              ? 'A zero resets both: any subarray through it has product 0.'
              : null,
      });
    }
    steps.push({
      i: null,
      mx,
      mn,
      best,
      done: true,
      line: null,
      result: best,
      note: `Maximum product: ${best}.`,
      why: 'O(n) time, O(1) space.',
    });
    return steps;
  },
  view(st, stage, { nums }) {
    stage.append(
      R.cells(nums, {
        states: st.i != null ? { [st.i]: 'current' } : {},
        ptrs: st.i != null ? { [st.i]: 'i' } : {},
        label: 'nums',
      }),
    );
    stage.append(R.vars({ curMax: st.mx, curMin: st.mn, best: st.best }));
  },
  random: (g) => ({ nums: rarr(g, rint(g, 1, 10), -4, 4) }),
});
