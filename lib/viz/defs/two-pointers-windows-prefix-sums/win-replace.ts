// Ported from legacy/src/viz/w02.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  s: string;
  k: number;
}

interface Step extends VizStep {
  l: number;
  mc: number;
  best: number;
  counts: [string, number][];
  r: number | null;
  leave?: number;
  result?: number;
}

export default defineViz<Input, Step>('win-replace', {
  title: 'Window valid while length − maxCount ≤ k',
  inputs: [
    { key: 's', label: 's (A–Z)', type: 'string', def: 'AABABBA', wide: true },
    { key: 'k', label: 'k', type: 'int', def: 1 },
  ],
  presets: [
    { label: 'LeetCode example 2', input: { s: 'AABABBA', k: 1 } },
    { label: 'LeetCode example 1', input: { s: 'ABAB', k: 2 } },
    { label: 'k = 0', input: { s: 'AABBBA', k: 0 } },
  ],
  legend: [
    ['window', 'window [l, r]'],
    ['current', 'r (entering)'],
    ['error', 'leaving'],
  ],
  code: `
function characterReplacement(s, k) {
  const count = new Array(26).fill(0);                 //@init
  let l = 0, maxCount = 0, best = 0;                   //@init2
  for (let r = 0; r < s.length; r++) {                 //@loop
    const i = s.charCodeAt(r) - 65;                    //@idx
    maxCount = Math.max(maxCount, ++count[i]);         //@add
    while (r - l + 1 - maxCount > k) {                 //@while
      count[s.charCodeAt(l) - 65]--;                   //@rem
      l++;                                             //@shrink
    }
    best = Math.max(best, r - l + 1);                  //@best
  }
  return best;                                         //@ret
}`,
  validate: ({ s, k }) =>
    !/^[A-Z]+$/.test(s)
      ? 'Use upper-case letters A–Z only.'
      : s.length > 20
        ? 'Keep it to 20 letters.'
        : k < 0
          ? 'k must be 0 or more.'
          : null,
  run({ s, k }) {
    const steps: Step[] = [],
      count = new Array(26).fill(0);
    let l = 0,
      mc = 0,
      best = 0;
    const counts = () =>
      count.map((c, i) => [String.fromCharCode(65 + i), c] as [string, number]).filter(([, c]) => c > 0);
    const snap = <O extends object>(o: O) => Object.assign({ l, mc, best, counts: counts() }, o);
    for (let r = 0; r < s.length; r++) {
      mc = Math.max(mc, ++count[s.charCodeAt(r) - 65]);
      const len = r - l + 1;
      steps.push(
        snap({
          line: ['idx', 'add'],
          r,
          note: `Add "${s[r]}". Window length ${len}, most frequent letter appears ${mc}× → ${len - mc} letter${len - mc === 1 ? '' : 's'} to replace (k = ${k}).`,
        }),
      );
      while (r - l + 1 - mc > k) {
        count[s.charCodeAt(l) - 65]--;
        const gone = l;
        l++;
        steps.push(
          snap({
            line: ['while', 'rem', 'shrink'],
            r,
            leave: gone,
            note: `${r - gone + 1 - mc} > k: too many replacements. Remove "${s[gone]}", l → ${l}.`,
            why: 'maxCount is not decreased here. A stale (too large) maxCount can only keep a window of the best length so far, never report a longer invalid one, so the answer stays correct.',
          }),
        );
      }
      const nb = r - l + 1 > best;
      best = Math.max(best, r - l + 1);
      steps.push(
        snap({
          line: 'best',
          r,
          note: `Valid window [${l}..${r}] = "${s.slice(l, r + 1)}", length ${r - l + 1}.${nb ? ' New best.' : ''}`,
        }),
      );
    }
    steps.push(
      snap({
        result: best,
        line: 'ret',
        r: null,
        note: `Answer ${best}.`,
        why: 'Each index enters once and leaves at most once: O(n) time, O(26) space.',
      }),
    );
    return steps;
  },
  view(st, stage, { s, k }) {
    const states: Record<string, string> = {};
    if (st.r != null) states[st.r] = 'current';
    if (st.leave != null) states[st.leave] = 'error';
    stage.append(
      R.cells([...s], {
        window: st.r != null ? [st.l, st.r] : null,
        states,
        ptrs: st.r != null ? (st.l === st.r ? { [st.l]: ['l', 'r'] } : { [st.l]: 'l', [st.r]: 'r' }) : {},
        label: 's',
      }),
    );
    stage.append(R.kv(st.counts, { label: 'count in window' }));
    stage.append(
      R.vars({
        k,
        maxCount: st.mc,
        'length − maxCount': st.r != null ? st.r - st.l + 1 - st.mc : '·',
        best: st.best,
      }),
    );
  },
  random: (g) => ({ s: rstr(g, rint(g, 1, 20), 'ABC'), k: rint(g, 0, 3) }),
});
