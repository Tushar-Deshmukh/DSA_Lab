// Ported from legacy/src/viz/w02.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  nums: number[];
}

interface Step extends VizStep {
  i: number;
  cur: number;
  best: number;
  start: number;
  bs: number;
  be: number;
  curAt: number[];
  result?: number;
  done?: boolean;
}

export default defineViz<Input, Step>('kadane', {
  title: 'Kadane: best subarray ending here',
  inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [-2, 1, -3, 4, -1, 2, 1, -5, 4], wide: true }],
  presets: [
    { label: 'Handbook trace', input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] } },
    { label: 'All negative', input: { nums: [-3, -1, -2] } },
    { label: 'All positive', input: { nums: [2, 3, 1] } },
    { label: 'Restart twice', input: { nums: [5, -9, 3, -1, -7, 4, 4] } },
  ],
  legend: [
    ['window', 'subarray behind cur'],
    ['current', 'index i'],
    ['best', 'best value in the table'],
  ],
  code: `
function maxSubArray(nums) {
  let cur = nums[0], best = nums[0];          //@init
  for (let i = 1; i < nums.length; i++) {     //@loop
    cur = Math.max(nums[i], cur + nums[i]);   //@cur
    best = Math.max(best, cur);               //@best
  }
  return best;                                //@ret
}`,
  validate: ({ nums }) => sizeCheck(nums, 1, 14),
  run({ nums: a }) {
    const steps: Step[] = [];
    let cur = a[0],
      best = a[0],
      start = 0,
      bs = 0,
      be = 0;
    const curAt = [a[0]];
    steps.push({
      line: 'init',
      i: 0,
      cur,
      best,
      start,
      bs,
      be,
      curAt: [...curAt],
      note: `cur = best = nums[0] = ${a[0]}.`,
      why: 'Not 0: with all-negative input the answer is the largest element, and a 0 start would wrongly return 0.',
    });
    for (let i = 1; i < a.length; i++) {
      const ext = cur + a[i];
      const restart = a[i] > ext;
      const prev = cur;
      cur = restart ? a[i] : ext;
      if (restart) start = i;
      curAt.push(cur);
      const nb = cur > best;
      if (nb) {
        best = cur;
        bs = start;
        be = i;
      }
      steps.push({
        line: ['cur', 'best'],
        i,
        cur,
        best,
        start,
        bs,
        be,
        curAt: [...curAt],
        note: `i = ${i}: extend gives ${prev} + ${a[i]} = ${ext}; restart gives ${a[i]}. ${restart ? 'Restart' : 'Extend'}: cur = ${cur}.${nb ? ' New best ' + best + '.' : ''}`,
        why: restart
          ? `The best subarray ending at ${i - 1} had sum ${prev} < 0; carrying a negative sum can only make the subarray ending here worse, so drop it.`
          : prev >= 0
            ? `A non-negative running sum (${prev}) always helps, so extending is at least as good as restarting.`
            : null,
      });
    }
    steps.push({
      result: best,
      line: 'ret',
      i: a.length - 1,
      cur,
      best,
      start,
      bs,
      be,
      curAt,
      done: true,
      note: `Answer ${best}: subarray [${bs}..${be}] = [${a.slice(bs, be + 1).join(', ')}].`,
      why: 'One pass with two variables: O(n) time, O(1) space. The table row is the DP "best sum ending at i"; Kadane keeps only its last value.',
    });
    return steps;
  },
  view(st, stage, { nums: a }) {
    const states: Record<string, string> = {};
    if (!st.done) states[st.i] = 'current';
    stage.append(
      R.cells(a, {
        states,
        window: st.done ? [st.bs, st.be] : [st.start, st.i],
        ptrs: st.done ? {} : { [st.i]: 'i' },
        label: st.done ? 'nums (best subarray shaded)' : 'nums (shaded: the subarray whose sum is cur)',
      }),
    );
    const vals = a.map((_, i) => (i < st.curAt.length ? st.curAt[i] : null));
    const bi = st.curAt.indexOf(st.best);
    stage.append(
      R.row1d(vals, {
        rowLabel: 'best ending at i',
        states: Object.assign(bi >= 0 ? { [bi]: 'best' } : {}, st.done ? {} : { [st.i]: 'current' }),
      }),
    );
    stage.append(R.vars({ cur: st.cur, best: st.best, 'best range': '[' + st.bs + '..' + st.be + ']' }));
  },
  random: (g) => ({ nums: rarr(g, rint(g, 1, 14), -9, 9) }),
});
