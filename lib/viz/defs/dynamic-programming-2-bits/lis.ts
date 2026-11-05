// Ported from legacy/src/viz/w11.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  nums: number[];
  method: string;
}

interface Step extends VizStep {
  dp?: (number | null)[];
  i: number | null;
  dep?: number[];
  best?: number;
  done?: boolean;
  result?: number;
  tails?: number[];
  slot?: number;
}

export default defineViz<Input, Step>('lis', {
  title: 'Longest increasing subsequence: O(n²) table, then the tails method',
  inputs: [
    { key: 'nums', label: 'nums', type: 'numbers', def: [10, 9, 2, 5, 3, 7, 101, 18], wide: true },
    {
      key: 'method',
      label: 'method',
      type: 'select',
      def: 'dp',
      options: [
        { value: 'dp', label: 'O(n²): dp[i] ending at i' },
        { value: 'tails', label: 'O(n log n): tails + binary search' },
      ],
    },
  ],
  presets: [
    { label: 'Handbook example, O(n²)', input: { nums: [10, 9, 2, 5, 3, 7, 101, 18], method: 'dp' } },
    { label: 'Handbook example, tails', input: { nums: [10, 9, 2, 5, 3, 7, 101, 18], method: 'tails' } },
    { label: 'Duplicates (strictly increasing)', input: { nums: [7, 7, 7, 7], method: 'tails' } },
    { label: '[0,1,0,3,2,3]', input: { nums: [0, 1, 0, 3, 2, 3], method: 'dp' } },
  ],
  legend: [
    ['current', 'i'],
    ['compare', 'j with nums[j] < nums[i] (dp) / replaced slot (tails)'],
    ['done', 'best'],
  ],
  code: `
// O(n²): dp[i] = length of the longest increasing subsequence ENDING at i
for (let i = 0; i < n; i++) { dp[i] = 1;
  for (let j = 0; j < i; j++) if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1); }  //@dp
// O(n log n): tails[k] = smallest tail of an increasing subsequence of length k + 1
for (const x of nums) {
  const k = lowerBound(tails, x);           // first tail >= x (Module 3)    //@lb
  tails[k] = x;                             // append (k = length) or replace  //@put
}
return tails.length;`,
  validate: ({ nums }) => (nums.length < 1 || nums.length > 12 ? 'Use 1–12 numbers.' : null),
  run({ nums, method }) {
    const steps: Step[] = [];
    if (method === 'dp') {
      const dp = new Array(nums.length).fill(null);
      let best = 0;
      for (let i = 0; i < nums.length; i++) {
        dp[i] = 1;
        const from: number[] = [];
        for (let j = 0; j < i; j++)
          if (nums[j] < nums[i]) {
            from.push(j);
            dp[i] = Math.max(dp[i], dp[j] + 1);
          }
        best = Math.max(best, dp[i]);
        steps.push({
          dp: [...dp],
          i,
          dep: from,
          best,
          line: 'dp',
          note: from.length
            ? `nums[${i}] = ${nums[i]} can extend ${from.map((j) => nums[j]).join(', ')}: dp[${i}] = 1 + max(${from.map((j) => dp[j]).join(', ')}) = ${dp[i]}.`
            : `nums[${i}] = ${nums[i]}: nothing smaller before it, dp[${i}] = 1.`,
          why:
            i === 3
              ? '"Ending at i" is the restriction that makes the transition possible: to extend a subsequence you need to know its last element.'
              : null,
        });
      }
      steps.push({
        dp,
        i: null,
        best,
        done: true,
        line: null,
        result: best,
        note: `LIS length = max(dp) = ${best}. The answer is not dp[n − 1]: the best subsequence may end anywhere.`,
      });
    } else {
      const tails: number[] = [];
      for (let i = 0; i < nums.length; i++) {
        const x = nums[i];
        let lo = 0,
          hi = tails.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (tails[mid] < x) lo = mid + 1;
          else hi = mid;
        }
        const app = lo === tails.length;
        const old = tails[lo];
        tails[lo] = x;
        steps.push({
          tails: [...tails],
          i,
          slot: lo,
          line: ['lb', 'put'],
          note: app
            ? `${x} is larger than every tail: append. Length ${tails.length}.`
            : `${x}: first tail ≥ ${x} is ${old} at index ${lo}; replace it with ${x}.`,
          why:
            !app && lo === 0 && i < 3
              ? 'A smaller tail for the same length can only help later numbers extend it. tails stays sorted because each replacement keeps tails[k − 1] < x ≤ old tails[k].'
              : null,
        });
      }
      steps.push({
        tails,
        i: null,
        done: true,
        line: null,
        result: tails.length,
        note: `Length ${tails.length}. tails = [${tails.join(', ')}] is not necessarily a real subsequence; only its length is meaningful.`,
      });
    }
    return steps;
  },
  view(st, stage, { nums, method }) {
    const s0: Record<string, string> = {};
    if (st.i != null) s0[st.i] = 'current';
    (st.dep || []).forEach((j) => (s0[j] = 'compare'));
    stage.append(R.cells(nums, { states: s0, ptrs: st.i != null ? { [st.i]: 'i' } : {}, label: 'nums' }));
    if (method === 'dp') {
      const s: Record<string, string> = {};
      if (st.i != null) s[st.i] = 'current';
      (st.dep || []).forEach((j) => (s[j] = 'dep'));
      stage.append(R.row1d(st.dp!, { states: s, label: 'dp[i] = LIS ending at i' }));
      stage.append(R.vars({ best: st.best }));
    } else
      stage.append(
        R.cells(st.tails!.length ? st.tails! : ['·'], {
          states: st.slot != null ? { [st.slot]: 'compare' } : {},
          label: 'tails (sorted)',
        }),
      );
  },
  random: (g) => ({ nums: rarr(g, rint(g, 1, 12), 0, 9), method: g() < 0.5 ? 'dp' : 'tails' }),
});
