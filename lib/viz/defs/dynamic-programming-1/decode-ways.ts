// Ported from legacy/src/viz/w10.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  s: string;
}

interface Step extends VizStep {
  dp: number[];
  cur?: number;
  dep?: number[];
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('decode-ways', {
  title: 'Decode Ways: a one-digit piece and a two-digit piece',
  inputs: [{ key: 's', label: 'digits', type: 'string', def: '226' }],
  presets: [
    { label: '"226"', input: { s: '226' } },
    { label: '"06" (invalid start)', input: { s: '06' } },
    { label: '"2101"', input: { s: '2101' } },
    { label: '"11106"', input: { s: '11106' } },
  ],
  legend: [
    ['current', 'dp[i]'],
    ['compare', 'contributions from dp[i − 1] and dp[i − 2]'],
  ],
  code: `
const dp = new Array(n + 1).fill(0); dp[0] = 1;       // empty prefix  //@base
for (let i = 1; i <= n; i++) {
  if (s[i - 1] !== '0') dp[i] += dp[i - 1];          // one digit 1–9 //@one
  const two = Number(s.slice(i - 2, i));
  if (i >= 2 && two >= 10 && two <= 26) dp[i] += dp[i - 2];  // 10–26  //@two
}
return dp[n];                                                       //@ret`,
  validate: ({ s }) => (!/^\d{1,14}$/.test(s) ? 'Use 1–14 digits.' : null),
  run({ s }) {
    const n = s.length,
      dp = new Array(n + 1).fill(0);
    dp[0] = 1;
    const steps: Step[] = [
      { dp: [...dp], cur: 0, line: 'base', note: 'dp[0] = 1: one way to decode the empty prefix.' },
    ];
    for (let i = 1; i <= n; i++) {
      const parts: string[] = [],
        dep: number[] = [],
        lines: string[] = [];
      if (s[i - 1] !== '0') {
        dp[i] += dp[i - 1];
        parts.push(`"${s[i - 1]}" alone → +dp[${i - 1}] (${dp[i - 1]})`);
        dep.push(i - 1);
        lines.push('one');
      } else parts.push('"0" cannot stand alone');
      if (i >= 2) {
        const two = Number(s.slice(i - 2, i));
        if (s[i - 2] !== '0' && two >= 10 && two <= 26) {
          dp[i] += dp[i - 2];
          parts.push(`"${s.slice(i - 2, i)}" → +dp[${i - 2}] (${dp[i - 2]})`);
          dep.push(i - 2);
          lines.push('two');
        } else parts.push(`"${s.slice(i - 2, i)}" is not 10–26`);
      }
      steps.push({
        dp: [...dp],
        cur: i,
        dep,
        line: lines.length ? lines : 'one',
        note: `dp[${i}]: ${parts.join('; ')}. dp[${i}] = ${dp[i]}.`,
        why:
          s[i - 1] === '0'
            ? 'A 0 must be the second digit of 10 or 20; otherwise the count drops to 0 and stays there.'
            : null,
      });
    }
    steps.push({
      dp,
      line: 'ret',
      done: true,
      result: dp[n],
      note: `${dp[n]} decoding${dp[n] === 1 ? '' : 's'}.`,
      why: 'O(n) time; O(1) space with two variables, as in Climbing Stairs, but each step is conditional.',
    });
    return steps;
  },
  view(st, stage, { s }) {
    const states: Record<string, string> = {};
    (st.dep || []).forEach((k) => (states[k] = 'dep'));
    if (st.cur != null) states[st.cur] = 'current';
    stage.append(R.cells([...s], { states: st.cur ? { [st.cur - 1]: 'current' } : {}, label: 's' }));
    stage.append(
      R.row1d(
        st.dp.map((v, k) => (st.done || k <= st.cur! ? v : null)),
        { states, label: 'dp[i] = ways to decode the first i digits' },
      ),
    );
  },
  random: (g) => ({ s: rstr(g, rint(g, 1, 10), '0121262789') }),
});
