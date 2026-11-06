// Ported from legacy/src/viz/w02.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
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
  l: number | null;
  r: number | null;
  sum: number;
  best: number | null;
  enter?: number;
  leave?: number;
  result?: number;
}

// ---------- sliding windows ----------
export default defineViz<Input, Step>('win-fixed', {
  title: 'Fixed-size window: add the new element, drop the old one',
  inputs: [
    { key: 'nums', label: 'nums', type: 'numbers', def: [1, 12, -5, -6, 50, 3], wide: true },
    { key: 'k', label: 'k', type: 'int', def: 4 },
  ],
  presets: [
    { label: 'LeetCode 643 example', input: { nums: [1, 12, -5, -6, 50, 3], k: 4 } },
    { label: 'k = 1', input: { nums: [5, -1, 7], k: 1 } },
    { label: 'k = n', input: { nums: [3, 1, 2], k: 3 } },
  ],
  legend: [
    ['window', 'window of size k'],
    ['current', 'entering'],
    ['error', 'leaving'],
  ],
  code: `
function findMaxAverage(nums, k) {
  let sum = 0;                                  //@init
  for (let i = 0; i < k; i++) sum += nums[i];   //@first
  let best = sum;                               //@best0
  for (let r = k; r < nums.length; r++) {       //@loop
    sum += nums[r] - nums[r - k];               //@slide
    best = Math.max(best, sum);                 //@best
  }
  return best / k;                              //@ret
}`,
  validate: ({ nums, k }) =>
    sizeCheck(nums, 1, 16) || (k < 1 || k > nums.length ? 'k must be between 1 and the array length.' : null),
  run({ nums: a, k }) {
    const steps: Step[] = [];
    let sum = 0;
    for (let i = 0; i < k; i++) {
      sum += a[i];
      steps.push({
        line: 'first',
        l: 0,
        r: i,
        sum,
        best: null,
        enter: i,
        note: `Build the first window: add nums[${i}] = ${a[i]} → sum ${sum}.`,
      });
    }
    let best = sum;
    steps.push({
      line: 'best0',
      l: 0,
      r: k - 1,
      sum,
      best,
      note: `First window [0..${k - 1}] has sum ${sum}; best = ${sum}.`,
    });
    for (let r = k; r < a.length; r++) {
      sum += a[r] - a[r - k];
      const nb = sum > best;
      best = Math.max(best, sum);
      steps.push({
        line: ['slide', 'best'],
        l: r - k + 1,
        r,
        sum,
        best,
        enter: r,
        leave: r - k,
        note: `Slide: + nums[${r}] (${a[r]}) − nums[${r - k}] (${a[r - k]}) → sum ${sum}.${nb ? ' New best.' : ''}`,
        why:
          r === k
            ? 'Two operations per move instead of re-adding k numbers: O(1) per window, O(n) total instead of O(n·k).'
            : null,
      });
    }
    steps.push({
      result: best / k,
      line: 'ret',
      l: null,
      r: null,
      sum,
      best,
      note: `Best sum ${best}, so the answer is ${best} / ${k} = ${+(best / k).toFixed(5)}.`,
    });
    return steps;
  },
  view(st, stage, { nums: a, k }) {
    const states: Record<string, string> = {};
    if (st.enter != null) states[st.enter] = 'current';
    if (st.leave != null) states[st.leave] = 'error';
    stage.append(
      R.cells(a, {
        window: st.l != null ? [st.l, st.r] : null,
        states,
        ptrs: st.l != null ? (st.l === st.r ? { [st.l]: ['l', 'r'] } : { [st.l]: 'l', [st.r!]: 'r' }) : {},
        label: 'nums',
      }),
    );
    stage.append(R.vars({ k, sum: st.sum, best: st.best ?? '·' }));
  },
  random: (g) => {
    const a = rarr(g, rint(g, 1, 16), -20, 50);
    return { nums: a, k: rint(g, 1, a.length) };
  },
});
