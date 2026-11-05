// Ported from legacy/src/viz/w10.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  coins: number[];
  amount: number;
  order: string;
}

interface Step extends VizStep {
  dp: number[];
  cur?: number;
  dep?: number[];
  head?: string;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('coin-ways', {
  title: 'Coin Change II: the loop order decides combinations or sequences',
  inputs: [
    { key: 'coins', label: 'coins', type: 'numbers', def: [1, 2] },
    { key: 'amount', label: 'amount', type: 'int', def: 3 },
    {
      key: 'order',
      label: 'outer loop',
      type: 'select',
      def: 'coins',
      options: [
        { value: 'coins', label: 'coins outer (518: combinations)' },
        { value: 'amounts', label: 'amounts outer (377: ordered sequences)' },
      ],
    },
  ],
  presets: [
    { label: '518 dry run: [1,2], 3', input: { coins: [1, 2], amount: 3, order: 'coins' } },
    { label: 'Same, loops swapped', input: { coins: [1, 2], amount: 3, order: 'amounts' } },
    { label: 'LeetCode: [1,2,5], 5', input: { coins: [1, 2, 5], amount: 5, order: 'coins' } },
  ],
  legend: [
    ['current', 'updated now'],
    ['compare', 'dp[a − c] added in'],
  ],
  code: `
const dp = new Array(amount + 1).fill(0); dp[0] = 1;   // one way to make 0  //@base
// 518 (combinations): each combination is built in coin order
for (const c of coins) for (let a = c; a <= amount; a++) dp[a] += dp[a - c];  //@coins
// 377 (sequences): every coin may be the last one at every amount
for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) dp[a] += dp[a - c];  //@amounts
return dp[amount];                                                              //@ret`,
  validate: ({ coins, amount }) =>
    coins.length < 1 || coins.length > 4 || coins.some((c) => c < 1) || new Set(coins).size !== coins.length
      ? 'Use 1–4 distinct positive coins.'
      : amount < 0 || amount > 12
        ? 'Use 0 ≤ amount ≤ 12.'
        : null,
  run({ coins, amount, order }) {
    const dp = new Array(amount + 1).fill(0);
    dp[0] = 1;
    const steps: Step[] = [
      { dp: [...dp], cur: 0, line: 'base', note: 'dp[0] = 1: the empty combination makes 0.' },
    ];
    if (order === 'coins') {
      for (const c of coins)
        for (let a = c; a <= amount; a++) {
          const add = dp[a - c];
          dp[a] += add;
          steps.push({
            dp: [...dp],
            cur: a,
            dep: [a - c],
            line: 'coins',
            head: `coin ${c}`,
            note: `Coin ${c}, a = ${a}: dp[${a}] += dp[${a - c}] (${add}) → ${dp[a]}.`,
            why:
              a === c && c === coins[coins.length - 1] && coins.length > 1
                ? 'With coins outer, coin c is only ever added after all smaller-index coins, so {1, 2} is counted once and never again as {2, 1}.'
                : null,
          });
        }
    } else {
      for (let a = 1; a <= amount; a++)
        for (const c of coins)
          if (c <= a) {
            const add = dp[a - c];
            dp[a] += add;
            steps.push({
              dp: [...dp],
              cur: a,
              dep: [a - c],
              line: 'amounts',
              head: `a = ${a}`,
              note: `a = ${a}, last coin ${c}: dp[${a}] += dp[${a - c}] (${add}) → ${dp[a]}.`,
              why:
                a === amount && c === coins[0]
                  ? 'Any coin can be the last one at any amount, so 1 + 2 and 2 + 1 both count: these are ordered sequences (problem 377), not combinations.'
                  : null,
            });
          }
    }
    steps.push({
      dp,
      line: 'ret',
      done: true,
      result: dp[amount],
      note: `${order === 'coins' ? 'Combinations' : 'Ordered sequences'} that make ${amount}: ${dp[amount]}.`,
      why: 'Same table, same O(amount × coins) work: only the loop order changes the meaning.',
    });
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {};
    (st.dep || []).forEach((k) => (states[k] = 'dep'));
    if (st.cur != null) states[st.cur] = 'current';
    stage.append(
      R.row1d(st.dp, {
        states,
        label: 'dp[a] = number of ways to make a' + (st.head ? ' (' + st.head + ')' : ''),
      }),
    );
  },
  random: (g) => ({
    coins: [...new Set(rarr(g, rint(g, 1, 4), 1, 6))],
    amount: rint(g, 0, 12),
    order: g() < 0.5 ? 'coins' : 'amounts',
  }),
});
