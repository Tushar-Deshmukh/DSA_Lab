// Ported from legacy/src/viz/w11.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  mode: string;
  a: string;
  b: string;
}

interface Step extends VizStep {
  dp: (number | null)[][];
  cur?: number[];
  dep?: number[][];
  best?: number[];
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('two-seq', {
  title: 'Two-sequence DP: LCS and edit distance on the same table',
  inputs: [
    {
      key: 'mode',
      label: 'problem',
      type: 'select',
      def: 'lcs',
      options: [
        { value: 'lcs', label: '1143: longest common subsequence' },
        { value: 'edit', label: '72: edit distance' },
      ],
    },
    { key: 'a', label: 'a (rows)', type: 'string', def: 'abcde' },
    { key: 'b', label: 'b (columns)', type: 'string', def: 'ace' },
  ],
  presets: [
    { label: 'LCS "abcde" / "ace"', input: { mode: 'lcs', a: 'abcde', b: 'ace' } },
    { label: 'Edit "horse" → "ros"', input: { mode: 'edit', a: 'horse', b: 'ros' } },
    { label: 'Edit "intention" → "execution"', input: { mode: 'edit', a: 'intention', b: 'execution' } },
    { label: 'LCS with nothing in common', input: { mode: 'lcs', a: 'abc', b: 'def' } },
  ],
  legend: [
    ['current', 'dp[i][j]'],
    ['compare', 'cells it reads'],
    ['done', 'answer'],
  ],
  code: `
// dp[i][j] = answer for the prefixes a[0..i) and b[0..j); row 0 / column 0 = empty prefix
for (let i = 1; i <= m; i++)
  for (let j = 1; j <= n; j++)
    if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + (lcs ? 1 : 0);   // match //@match
    else dp[i][j] = lcs ? Math.max(dp[i - 1][j], dp[i][j - 1])               //@lcs
                        : 1 + Math.min(dp[i - 1][j],      // delete a[i-1]   //@edit
                                       dp[i][j - 1],      // insert b[j-1]
                                       dp[i - 1][j - 1]); // replace
return dp[m][n];                                                            //@ret`,
  validate: ({ a, b }) => (a.length > 9 || b.length > 9 ? 'Use strings of at most 9 characters.' : null),
  run({ mode, a, b }) {
    const m = a.length,
      n = b.length,
      lcs = mode === 'lcs';
    const dp = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => (i === 0 || j === 0 ? (lcs ? 0 : i + j) : null)),
    );
    const steps: Step[] = [];
    steps.push({
      dp: dp.map((r) => [...r]),
      line: null,
      note: lcs
        ? 'Row 0 and column 0 are 0: nothing is common with an empty prefix.'
        : 'dp[i][0] = i (delete all i characters) and dp[0][j] = j (insert all j characters).',
    });
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++) {
        let note: string, dep: number[][], line: string;
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]! + (lcs ? 1 : 0);
          dep = [[i - 1, j - 1]];
          line = 'match';
          note = `"${a[i - 1]}" = "${b[j - 1]}": diagonal ${dp[i - 1][j - 1]}${lcs ? ' + 1' : ' (no operation needed)'} = ${dp[i][j]}.`;
        } else if (lcs) {
          dp[i][j] = Math.max(dp[i - 1][j]!, dp[i][j - 1]!);
          dep = [
            [i - 1, j],
            [i, j - 1],
          ];
          line = 'lcs';
          note = `"${a[i - 1]}" ≠ "${b[j - 1]}": max(top ${dp[i - 1][j]}, left ${dp[i][j - 1]}) = ${dp[i][j]}.`;
        } else {
          const del = dp[i - 1][j],
            ins = dp[i][j - 1],
            rep = dp[i - 1][j - 1];
          dp[i][j] = 1 + Math.min(del!, ins!, rep!);
          dep = [
            [i - 1, j],
            [i, j - 1],
            [i - 1, j - 1],
          ];
          line = 'edit';
          const op = rep! <= del! && rep! <= ins! ? 'replace' : del! <= ins! ? 'delete' : 'insert';
          note = `"${a[i - 1]}" ≠ "${b[j - 1]}": 1 + min(delete ${del}, insert ${ins}, replace ${rep}) = ${dp[i][j]} (${op}).`;
        }
        steps.push({
          dp: dp.map((r) => [...r]),
          cur: [i, j],
          dep,
          line,
          note,
          why:
            i === 1 && j === 1
              ? lcs
                ? 'Any common subsequence of the two prefixes either uses both last characters (only if they match) or drops one of them.'
                : 'Any way to turn a[0..i) into b[0..j) ends with one of: a match, deleting a[i−1], inserting b[j−1], or replacing a[i−1] by b[j−1].'
              : null,
        });
      }
    steps.push({
      dp,
      best: [m, n],
      line: 'ret',
      done: true,
      result: dp[m][n]!,
      note: `Answer: dp[${m}][${n}] = ${dp[m][n]}.`,
      why: 'O(m·n) time. Each row reads only the row above, so two rows (O(min(m, n)) space) are enough.',
    });
    return steps;
  },
  view(st, stage, { a, b }) {
    const states: Record<string, string> = {};
    (st.dep || []).forEach(([i, j]) => (states[i + ',' + j] = 'dep'));
    if (st.cur) states[st.cur.join(',')] = 'current';
    if (st.best) states[st.best.join(',')] = 'best';
    stage.append(
      R.table(st.dp, {
        states,
        colHead: ['""', ...b],
        rowHead: ['""', ...a],
        label: 'dp[i][j] for prefixes a[0..i) (rows) and b[0..j) (columns)',
      }),
    );
  },
  random: (g) => ({
    mode: g() < 0.5 ? 'lcs' : 'edit',
    a: rstr(g, rint(g, 0, 7), 'abc'),
    b: rstr(g, rint(g, 0, 7), 'abc'),
  }),
});
