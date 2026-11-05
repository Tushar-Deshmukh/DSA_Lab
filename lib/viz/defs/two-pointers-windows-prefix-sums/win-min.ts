// Ported from legacy/src/viz/w02.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  nums: number[];
  target: number;
}

interface Step extends VizStep {
  l: number;
  sum: number;
  best: number;
  bw: number[] | null;
  r: number | null;
  enter?: number;
  leave?: number;
  result?: number;
  done?: boolean;
}

export default defineViz<Input, Step>('win-min', {
  title: 'Minimum-length window: record the answer while shrinking',
  inputs: [
    { key: 'nums', label: 'nums (positive)', type: 'numbers', def: [2, 3, 1, 2, 4, 3], wide: true },
    { key: 'target', label: 'target', type: 'number', def: 7 },
  ],
  presets: [
    { label: 'LeetCode example', input: { nums: [2, 3, 1, 2, 4, 3], target: 7 } },
    { label: 'One element enough', input: { nums: [1, 4, 4], target: 4 } },
    { label: 'Impossible', input: { nums: [1, 1, 1, 1], target: 11 } },
  ],
  legend: [
    ['window', 'window [l, r]'],
    ['current', 'entering'],
    ['error', 'leaving'],
    ['done', 'best window'],
  ],
  code: `
function minSubArrayLen(target, nums) {
  let l = 0, sum = 0, best = Infinity;          //@init
  for (let r = 0; r < nums.length; r++) {       //@loop
    sum += nums[r];                             //@add
    while (sum >= target) {                     //@while
      best = Math.min(best, r - l + 1);         //@best
      sum -= nums[l++];                         //@shrink
    }
  }
  return best === Infinity ? 0 : best;          //@ret
}`,
  validate: ({ nums }) =>
    sizeCheck(nums, 1, 16) ||
    (nums.some((x) => x <= 0)
      ? 'This window needs positive numbers. With zero or negatives, use prefix sums.'
      : null),
  run({ nums: a, target }) {
    const steps: Step[] = [];
    let l = 0,
      sum = 0,
      best = Infinity,
      bw: number[] | null = null;
    const snap = <O extends object>(o: O) => Object.assign({ l, sum, best, bw }, o);
    for (let r = 0; r < a.length; r++) {
      sum += a[r];
      steps.push(
        snap({
          line: 'add',
          r,
          enter: r,
          note: `Add nums[${r}] = ${a[r]} → sum ${sum}${sum >= target ? ' ≥ ' + target + ': valid.' : ' < ' + target + ': keep growing.'}`,
        }),
      );
      while (sum >= target) {
        const len = r - l + 1;
        const nb = len < best;
        if (nb) {
          best = len;
          bw = [l, r];
        }
        steps.push(
          snap({
            line: ['while', 'best'],
            r,
            note: `Window [${l}..${r}] is valid with length ${len}.${nb ? ' New best.' : ''} Record it now, before shrinking.`,
            why: 'For a minimum, the answer is recorded inside the loop, while the window is still valid. Recording after the loop would measure an invalid window.',
          }),
        );
        sum -= a[l];
        l++;
        steps.push(
          snap({
            line: 'shrink',
            r,
            leave: l - 1,
            note: `Remove nums[${l - 1}] = ${a[l - 1]} → sum ${sum}. Try a shorter window.`,
            why: 'Positive numbers make the window monotone: removing from the left can only lower the sum, so once it drops below target, l never needs to move back.',
          }),
        );
      }
    }
    steps.push(
      snap({
        result: best === Infinity ? 0 : best,
        line: 'ret',
        r: null,
        done: true,
        note: best === Infinity ? 'No window reaches the target: return 0.' : `Answer ${best}.`,
        why: 'l and r each move at most n times: O(n) time, O(1) space.',
      }),
    );
    return steps;
  },
  view(st, stage, { nums: a, target }) {
    const states: Record<string, string> = {};
    if (st.enter != null) states[st.enter] = 'current';
    if (st.leave != null) states[st.leave] = 'error';
    if (st.done && st.bw) for (let i = st.bw[0]; i <= st.bw[1]; i++) states[i] = 'done';
    const win = !st.done && st.r != null && st.l <= st.r ? [st.l, st.r] : null;
    const ptrs: Record<string, string | string[]> = {};
    if (!st.done && st.r != null) {
      if (st.l <= st.r) {
        if (st.l === st.r) ptrs[st.l] = ['l', 'r'];
        else {
          ptrs[st.l] = 'l';
          ptrs[st.r] = 'r';
        }
      } else ptrs[st.r] = 'r';
    }
    stage.append(R.cells(a, { window: win, states, ptrs, label: 'nums' }));
    stage.append(
      R.vars({
        target,
        sum: st.sum,
        best: st.best,
        'best window': st.bw ? '[' + st.bw.join('..') + ']' : '·',
      }),
    );
  },
  random: (g) => ({ nums: rarr(g, rint(g, 1, 16), 1, 9), target: rint(g, 1, 40) }),
});
