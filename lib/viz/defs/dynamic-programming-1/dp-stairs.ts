// Ported from legacy/src/viz/w10.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { blankRow } from './_helpers';

interface Input {
  problem: string;
  n: number;
  cost: number[];
}

interface Step extends VizStep {
  dp: (number | null)[];
  cur?: number[];
  dep?: number[];
  best?: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('dp-stairs', {
  title: 'A 1-D table, then two variables: Climbing Stairs and Min Cost Climbing Stairs',
  inputs: [
    {
      key: 'problem',
      label: 'problem',
      type: 'select',
      def: 'ways',
      options: [
        { value: 'ways', label: '70: number of ways' },
        { value: 'cost', label: '746: minimum cost' },
      ],
    },
    { key: 'n', label: 'n (for 70)', type: 'int', def: 5 },
    { key: 'cost', label: 'cost (for 746)', type: 'numbers', def: [10, 15, 20], wide: true },
  ],
  presets: [
    { label: '70 with n = 5', input: { problem: 'ways', n: 5 } },
    { label: '746 on [10, 15, 20]', input: { problem: 'cost', cost: [10, 15, 20] } },
    {
      label: '746 on LeetCode example 2',
      input: { problem: 'cost', cost: [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] },
    },
  ],
  legend: [
    ['current', 'computing'],
    ['compare', 'read by the transition'],
    ['done', 'answer'],
  ],
  code: `
// 70: dp[i] = ways to stand on step i       746: dp[i] = min cost to stand on step i
dp[0] = base0; dp[1] = base1;                                         //@base
for (let i = 2; i <= n; i++)
  dp[i] = ways ? dp[i - 1] + dp[i - 2]                                //@trans
               : Math.min(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2]);
return dp[n];        // only dp[i-1] and dp[i-2] are ever read → two variables   //@ret`,
  validate: ({ problem, n, cost }) =>
    problem === 'ways'
      ? n < 1 || n > 15
        ? 'Use 1 ≤ n ≤ 15.'
        : null
      : cost.length < 2 || cost.length > 15 || cost.some((c) => c < 0)
        ? 'Use 2–15 non-negative costs.'
        : null,
  run({ problem, n, cost }) {
    const ways = problem === 'ways';
    const N = ways ? n : cost.length;
    const dp = blankRow(N + 1);
    const steps: Step[] = [];
    dp[0] = ways ? 1 : 0;
    dp[1] = ways ? 1 : 0;
    steps.push({
      dp: [...dp],
      cur: [0, 1],
      line: 'base',
      note: ways
        ? 'dp[0] = 1 (one way to stand at the bottom: do nothing), dp[1] = 1.'
        : 'You may start on step 0 or step 1 for free: dp[0] = dp[1] = 0. The top is index n = ' +
          N +
          ', one past the last step.',
      why: 'Base cases are the states that need no choices.',
    });
    for (let i = 2; i <= N; i++) {
      let note: string;
      if (ways) {
        dp[i] = dp[i - 1] + dp[i - 2];
        note = `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]} = ${dp[i]}: the last move was 1 step or 2 steps.`;
      } else {
        const a = dp[i - 1] + cost[i - 1],
          b = dp[i - 2] + cost[i - 2];
        dp[i] = Math.min(a, b);
        note = `dp[${i}] = min(dp[${i - 1}] + cost[${i - 1}], dp[${i - 2}] + cost[${i - 2}]) = min(${a}, ${b}) = ${dp[i]}.`;
      }
      steps.push({
        dp: [...dp],
        cur: [i],
        dep: [i - 1, i - 2],
        line: 'trans',
        note,
        why:
          i === 2
            ? 'Each cell reads only the two cells before it, so left to right is a valid order, and only two numbers ever need to be kept.'
            : null,
      });
    }
    steps.push({
      dp,
      best: N,
      line: 'ret',
      done: true,
      result: dp[N],
      note: `Answer: dp[${N}] = ${dp[N]}.`,
      why: 'O(n) time. The table is O(n) space; keeping prev2 and prev1 instead makes it O(1).',
    });
    return steps;
  },
  view(st, stage, { problem, cost }) {
    const states: Record<string, string> = {};
    (st.dep || []).forEach((k) => (states[k] = 'dep'));
    (st.cur || []).forEach((k) => (states[k] = 'current'));
    if (st.best != null) states[st.best] = 'best';
    if (problem === 'cost') stage.append(R.cells(cost, { label: 'cost[i]' }));
    stage.append(
      R.row1d(st.dp, {
        states,
        label:
          problem === 'ways'
            ? 'dp[i] = ways to reach step i'
            : 'dp[i] = min cost to stand on step i (index n is the top)',
      }),
    );
    const i = (st.cur || [st.dp.length - 1]).slice(-1)[0];
    if (i >= 1) stage.append(R.vars({ prev2: st.dp[i - 1 >= 1 ? i - 1 : 0], prev1: st.dp[i] }));
  },
  random: (g) =>
    g() < 0.5
      ? { problem: 'ways', n: rint(g, 1, 15), cost: [1, 1] }
      : { problem: 'cost', n: 2, cost: rarr(g, rint(g, 2, 12), 0, 20) },
});
