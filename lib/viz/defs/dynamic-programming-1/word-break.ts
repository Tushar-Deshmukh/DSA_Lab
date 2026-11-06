// Ported from legacy/src/viz/w10.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  s: string;
  words: string[];
}

interface Step extends VizStep {
  dp: boolean[];
  cur?: number;
  dep?: number[];
  piece?: number[] | null;
  done?: boolean;
  result?: boolean;
}

export default defineViz<Input, Step>('word-break', {
  title: 'Word Break: dp[i] = the first i characters can be segmented',
  inputs: [
    { key: 's', label: 's', type: 'string', def: 'leetcode' },
    { key: 'words', label: 'wordDict', type: 'json', def: ['leet', 'code'], wide: true },
  ],
  presets: [
    { label: 'Lesson 5: "leetcode"', input: { s: 'leetcode', words: ['leet', 'code'] } },
    { label: '"applepenapple"', input: { s: 'applepenapple', words: ['apple', 'pen'] } },
    { label: 'False: "catsandog"', input: { s: 'catsandog', words: ['cats', 'dog', 'sand', 'and', 'cat'] } },
  ],
  legend: [
    ['current', 'dp[i]'],
    ['compare', 'dp[j] that made it true'],
  ],
  code: `
const dict = new Set(wordDict), dp = new Array(n + 1).fill(false);
dp[0] = true;                                // the empty prefix   //@base
for (let i = 1; i <= n; i++)
  for (let j = 0; j < i; j++)
    if (dp[j] && dict.has(s.slice(j, i))) { dp[i] = true; break; }   //@trans
return dp[n];                                                    //@ret`,
  validate: ({ s, words }) =>
    s.length < 1 || s.length > 16
      ? 'Use a string of 1–16 characters.'
      : !Array.isArray(words) || words.length > 8 || words.some((w) => typeof w !== 'string' || !w)
        ? 'wordDict is a list of up to 8 non-empty strings.'
        : null,
  run({ s, words }) {
    const dict = new Set(words),
      n = s.length,
      dp = new Array(n + 1).fill(false);
    dp[0] = true;
    const steps: Step[] = [
      { dp: [...dp], cur: 0, line: 'base', note: 'dp[0] = true: the empty prefix needs no words.' },
    ];
    for (let i = 1; i <= n; i++) {
      let hit = -1;
      for (let j = 0; j < i; j++)
        if (dp[j] && dict.has(s.slice(j, i))) {
          hit = j;
          dp[i] = true;
          break;
        }
      steps.push({
        dp: [...dp],
        cur: i,
        dep: hit >= 0 ? [hit] : [],
        piece: hit >= 0 ? [hit, i - 1] : null,
        line: 'trans',
        note:
          hit >= 0
            ? `dp[${i}] = true: dp[${hit}] is true and "${s.slice(hit, i)}" is a word.`
            : `dp[${i}] = false: no true dp[j] is followed by a dictionary word ending at ${i}.`,
        why:
          i === n && hit >= 0
            ? 'The prefix s[0..i) splits iff some valid prefix s[0..j) is followed by one word s[j..i).'
            : null,
      });
    }
    steps.push({
      dp,
      line: 'ret',
      done: true,
      result: dp[n],
      note: `dp[${n}] = ${dp[n]}.`,
      why: 'O(n²) pairs (j, i), each with an O(n) slice: O(n³) worst case; bounding j by the longest word makes it O(n · L²).',
    });
    return steps;
  },
  view(st, stage, { s }) {
    const states: Record<string, string> = {};
    (st.dep || []).forEach((k) => (states[k] = 'dep'));
    if (st.cur != null) states[st.cur] = 'current';
    const cs: Record<string, string> = {};
    if (st.piece) for (let k = st.piece[0]; k <= st.piece[1]; k++) cs[k] = 'window';
    stage.append(R.cells([...s], { states: cs, label: 's (window = the last word)' }));
    stage.append(
      R.row1d(
        st.dp.map((b, k) => (st.done || k <= st.cur! ? (b ? 'T' : 'F') : null)),
        { states, label: 'dp[i]: can s[0..i) be split into words?' },
      ),
    );
  },
  random: (g) => ({
    s: rstr(g, rint(g, 1, 12), 'ab'),
    words: Array.from({ length: rint(g, 0, 4) }, () => rstr(g, rint(g, 1, 3), 'ab')),
  }),
});
