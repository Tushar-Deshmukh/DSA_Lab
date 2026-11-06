// Ported from legacy/src/viz/w11.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  nums: number[];
  target: string;
  dir: string;
}

interface Step extends VizStep {
  dp: boolean[];
  cur?: number[];
  dep?: number[];
  item?: number;
  best?: number[];
  done?: boolean;
  result?: boolean;
}

export default defineViz<Input, Step>('knap01', {
  title: '0/1 knapsack: why j must go downwards',
  inputs: [
    { key: 'nums', label: 'items (weights)', type: 'numbers', def: [1, 5, 11, 5] },
    { key: 'target', label: 'target (blank = total / 2)', type: 'string', def: '' },
    {
      key: 'dir',
      label: 'direction of j',
      type: 'select',
      def: 'down',
      options: [
        { value: 'down', label: 'downwards (correct, 0/1)' },
        { value: 'up', label: 'upwards (reuses items)' },
      ],
    },
  ],
  presets: [
    { label: '416: [1,5,11,5]', input: { nums: [1, 5, 11, 5], target: '', dir: 'down' } },
    { label: 'Reuse bug: one item of 2, target 4', input: { nums: [2], target: '4', dir: 'up' } },
    { label: 'Same, downwards', input: { nums: [2], target: '4', dir: 'down' } },
    { label: '416: [1,2,3,5] (false)', input: { nums: [1, 2, 3, 5], target: '', dir: 'down' } },
  ],
  legend: [
    ['current', 'set now'],
    ['compare', 'read dp[j − x]'],
    ['done', 'answer'],
  ],
  code: `
const dp = new Array(target + 1).fill(false); dp[0] = true;   // empty subset   //@base
for (const x of nums)
  for (let j = target; j >= x; j--)          // downwards: dp[j-x] is from before x  //@down
    if (dp[j - x]) dp[j] = true;                                                  //@set
// upwards (for (let j = x; j <= target; j++)) reads values already updated with x //@up
return dp[target];                                                                //@ret`,
  validate: ({ nums, target }) => {
    if (nums.length < 1 || nums.length > 6 || nums.some((x) => x < 1)) return 'Use 1–6 positive weights.';
    const t = target === '' ? nums.reduce((a, b) => a + b, 0) / 2 : Number(target);
    return !Number.isInteger(t) && target === ''
      ? null
      : !Number.isInteger(t) || t < 0 || t > 24
        ? 'Use a whole target between 0 and 24.'
        : null;
  },
  run({ nums, target, dir }) {
    const total = nums.reduce((a, b) => a + b, 0);
    const steps: Step[] = [];
    if (target === '' && total % 2) {
      steps.push({
        dp: [],
        line: 'ret',
        done: true,
        result: false,
        note: `The total ${total} is odd, so no equal split exists: false before any table.`,
        why: 'Always check the cheap impossibility conditions first.',
      });
      return steps;
    }
    const T = target === '' ? total / 2 : Number(target);
    const dp = new Array(T + 1).fill(false);
    dp[0] = true;
    steps.push({
      dp: [...dp],
      cur: [0],
      line: 'base',
      note: `target = ${T}. dp[0] = true: the empty subset makes 0.`,
    });
    nums.forEach((x, k) => {
      const js: number[] = [];
      if (dir === 'down') for (let j = T; j >= x; j--) js.push(j);
      else for (let j = x; j <= T; j++) js.push(j);
      for (const j of js)
        if (dp[j - x] && !dp[j]) {
          dp[j] = true;
          const reused =
            dir === 'up' && j - 2 * x >= 0 && steps.some((s) => s.item === k && s.cur && s.cur[0] === j - x);
          steps.push({
            dp: [...dp],
            cur: [j],
            dep: [j - x],
            item: k,
            line: dir === 'down' ? ['down', 'set'] : ['up', 'set'],
            note: `Item ${x}: dp[${j - x}] is true, so dp[${j}] = true.${reused ? ` But dp[${j - x}] was itself set by item ${x} a moment ago: item ${x} is being used twice.` : ''}`,
            why: reused
              ? 'This is the reuse bug: upward iteration turns 0/1 knapsack into the unbounded knapsack from Module 10.'
              : dir === 'down' && k === 0
                ? 'Going downwards, dp[j − x] has not been touched by this item yet, so it reflects only the earlier items.'
                : null,
          });
        }
      steps.push({
        dp: [...dp],
        item: k,
        line: dir === 'down' ? 'down' : 'up',
        note: `After item ${k} (${x}): reachable sums ${dp
          .map((b, j) => (b ? j : -1))
          .filter((j) => j >= 0)
          .join(', ')}.`,
      });
    });
    steps.push({
      dp,
      best: dp[T] ? [T] : [],
      line: 'ret',
      done: true,
      result: dp[T],
      note: `dp[${T}] = ${dp[T]}.`,
      why: 'O(n × target) time, O(target) space: pseudo-polynomial, fine for targets up to about 10⁴–10⁵.',
    });
    return steps;
  },
  view(st, stage, { nums }) {
    const states: Record<string, string> = {};
    (st.dep || []).forEach((k) => (states[k] = 'dep'));
    (st.cur || []).forEach((k) => (states[k] = 'current'));
    (st.best || []).forEach((k) => (states[k] = 'best'));
    stage.append(R.cells(nums, { states: st.item != null ? { [st.item]: 'current' } : {}, label: 'items' }));
    if (st.dp.length)
      stage.append(
        R.row1d(
          st.dp.map((b) => (b ? 'T' : 'F')),
          { states, label: 'dp[j]: can the items so far make sum j?' },
        ),
      );
  },
  random: (g) => ({
    nums: rarr(g, rint(g, 1, 6), 1, 8),
    target: g() < 0.5 ? '' : String(rint(g, 0, 20)),
    dir: g() < 0.7 ? 'down' : 'up',
  }),
});
