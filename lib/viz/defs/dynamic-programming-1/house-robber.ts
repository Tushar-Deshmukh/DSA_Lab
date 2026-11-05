// Ported from legacy/src/viz/w10.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { blankRow } from './_helpers';

interface Input {
  nums: number[];
  circle: string;
}

interface Step extends VizStep {
  dp: (number | null)[];
  cur?: number;
  dep?: number[];
  range?: number[];
  tag?: string;
  best?: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('house-robber', {
  title: 'House Robber: skip house i, or rob it on top of dp[i − 2]',
  inputs: [
    { key: 'nums', label: 'nums (money per house)', type: 'numbers', def: [2, 7, 9, 3, 1], wide: true },
    {
      key: 'circle',
      label: 'houses in a circle? (213)',
      type: 'select',
      def: 'no',
      options: [
        { value: 'no', label: 'no (198)' },
        { value: 'yes', label: 'yes (213): two runs' },
      ],
    },
  ],
  presets: [
    { label: 'Handbook dry run', input: { nums: [2, 7, 9, 3, 1], circle: 'no' } },
    { label: 'Greedy "every other" fails', input: { nums: [2, 1, 1, 2], circle: 'no' } },
    { label: '213 on [2, 3, 2]', input: { nums: [2, 3, 2], circle: 'yes' } },
  ],
  legend: [
    ['current', 'dp[i]'],
    ['compare', 'dp[i − 1] (skip) and dp[i − 2] (rob)'],
    ['done', 'answer'],
  ],
  code: `
function rob(nums) {                      // dp[i] = most money from houses 0..i
  let prev2 = 0, prev1 = 0;               // dp[i-2], dp[i-1]
  for (const x of nums) {
    const cur = Math.max(prev1, prev2 + x);     // skip i, or rob i   //@trans
    prev2 = prev1; prev1 = cur;                                     //@shift
  }
  return prev1;                                                     //@ret
}
// 213: Math.max(rob(nums.slice(0, -1)), rob(nums.slice(1)))         //@circle`,
  validate: ({ nums }) =>
    nums.length < 1 || nums.length > 12 || nums.some((x) => x < 0) ? 'Use 1–12 non-negative amounts.' : null,
  run({ nums, circle }) {
    const steps: Step[] = [];
    const runOn = (lo: number, hi: number, tag: string) => {
      const dp = blankRow(nums.length);
      for (let i = lo; i <= hi; i++) {
        const skip = i - 1 >= lo ? dp[i - 1] : 0,
          take = (i - 2 >= lo ? dp[i - 2] : 0) + nums[i];
        dp[i] = Math.max(skip, take);
        steps.push({
          dp: [...dp],
          cur: i,
          dep: [i - 1, i - 2].filter((k) => k >= lo),
          range: [lo, hi],
          tag,
          line: ['trans', 'shift'],
          note: `${tag}i = ${i}: skip → ${skip}, rob → ${i - 2 >= lo ? 'dp[' + (i - 2) + ']' : '0'} + ${nums[i]} = ${take}. dp[${i}] = ${dp[i]}.`,
          why:
            i === lo + 2 && !tag
              ? 'The state sentence "most money from houses 0..i" is enough: whether house i − 1 was robbed is already accounted for inside dp[i − 1].'
              : null,
        });
      }
      return hi >= lo ? dp[hi] : 0;
    };
    let ans: number;
    if (circle === 'yes' && nums.length > 1) {
      const a = runOn(0, nums.length - 2, 'Run 1 (without the last house): '),
        b = runOn(1, nums.length - 1, 'Run 2 (without the first house): ');
      ans = Math.max(a, b);
      steps.push({
        dp: steps[steps.length - 1].dp,
        line: 'circle',
        done: true,
        result: ans,
        note: `First and last houses are neighbours, so at most one of them is robbed: answer = max(${a}, ${b}) = ${ans}.`,
        why: 'Reducing to a solved problem: two linear runs, each excluding one end.',
      });
    } else {
      ans = runOn(0, nums.length - 1, '');
      steps.push({
        dp: steps[steps.length - 1].dp,
        best: nums.length - 1,
        line: 'ret',
        done: true,
        result: ans,
        note: `Answer: ${ans}.`,
        why: 'O(n) time, O(1) space with two variables.',
      });
    }
    return steps;
  },
  view(st, stage, { nums }) {
    const states: Record<string, string> = {};
    (st.dep || []).forEach((k) => (states[k] = 'dep'));
    if (st.cur != null) states[st.cur] = 'current';
    if (st.best != null) states[st.best] = 'best';
    stage.append(R.cells(nums, { window: st.range, label: 'nums (window = houses in this run)' }));
    stage.append(R.row1d(st.dp, { states, label: 'dp[i] = most money from the houses up to i' }));
  },
  random: (g) => ({ nums: rarr(g, rint(g, 1, 12), 0, 20), circle: g() < 0.5 ? 'yes' : 'no' }),
});
