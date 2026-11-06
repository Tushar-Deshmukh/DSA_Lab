// Ported from legacy/src/viz/w10.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  coins: number[];
  amount: number;
}

interface Step extends VizStep {
  dp: number[];
  cur?: number;
  dep?: number[];
  best?: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('coin-change', {
  title: 'Coin Change: dp[a] = 1 + the best dp[a − c]',
  inputs: [
    { key: 'coins', label: 'coins', type: 'numbers', def: [1, 3, 4] },
    { key: 'amount', label: 'amount', type: 'int', def: 6 },
  ],
  presets: [
    { label: 'Handbook: [1,3,4], 6', input: { coins: [1, 3, 4], amount: 6 } },
    { label: 'LeetCode: [1,2,5], 11', input: { coins: [1, 2, 5], amount: 11 } },
    { label: 'Impossible: [2], 3', input: { coins: [2], amount: 3 } },
  ],
  legend: [
    ['current', 'dp[a]'],
    ['compare', 'dp[a − c] for each coin'],
    ['done', 'answer'],
  ],
  code: `
const dp = new Array(amount + 1).fill(Infinity);   // ∞ = cannot be made
dp[0] = 0;                                                         //@base
for (let a = 1; a <= amount; a++)
  for (const c of coins)
    if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;   // last coin is c  //@trans
return dp[amount] === Infinity ? -1 : dp[amount];                  //@ret`,
  validate: ({ coins, amount }) =>
    coins.length < 1 || coins.length > 5 || coins.some((c) => c < 1)
      ? 'Use 1–5 positive coins.'
      : amount < 0 || amount > 20
        ? 'Use 0 ≤ amount ≤ 20.'
        : null,
  run({ coins, amount }) {
    const dp = new Array(amount + 1).fill(Infinity);
    dp[0] = 0;
    const steps: Step[] = [
      {
        dp: [...dp],
        cur: 0,
        line: 'base',
        note: 'dp[0] = 0 coins. Everything else starts at ∞ ("not reachable yet"): 0 would wrongly look like the best possible value.',
      },
    ];
    for (let a = 1; a <= amount; a++) {
      const parts: string[] = [];
      for (const c of coins)
        if (c <= a) {
          parts.push(`${c} → dp[${a - c}] + 1 = ${dp[a - c] === Infinity ? '∞' : dp[a - c] + 1}`);
          if (dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
        }
      steps.push({
        dp: [...dp],
        cur: a,
        dep: coins.filter((c) => c <= a).map((c) => a - c),
        line: 'trans',
        note: `a = ${a}: ${parts.length ? parts.join('; ') : 'no coin fits'}. dp[${a}] = ${dp[a] === Infinity ? '∞' : dp[a]}.`,
        why:
          a === amount && coins.length > 1
            ? 'Optimal substructure: the best way to make a ends with some coin c, and what remains (a − c) must itself be made optimally.'
            : null,
      });
    }
    const ans = dp[amount] === Infinity ? -1 : dp[amount];
    steps.push({
      dp,
      best: amount,
      line: 'ret',
      done: true,
      result: ans,
      note: ans < 0 ? `dp[${amount}] is still ∞: return −1.` : `Fewest coins for ${amount}: ${ans}.`,
      why: 'O(amount × coins) time, O(amount) space.',
    });
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {};
    (st.dep || []).forEach((k) => (states[k] = 'dep'));
    if (st.cur != null) states[st.cur] = 'current';
    if (st.best != null) states[st.best] = 'best';
    stage.append(R.row1d(st.dp, { states, label: 'dp[a] = fewest coins that make a', rowLabel: 'dp' }));
  },
  random: (g) => ({ coins: [...new Set(rarr(g, rint(g, 1, 4), 1, 9))], amount: rint(g, 0, 20) }),
});
