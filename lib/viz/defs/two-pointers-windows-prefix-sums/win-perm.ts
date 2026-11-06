// Ported from legacy/src/viz/w02.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  s1: string;
  s2: string;
}

interface Step extends VizStep {
  need: Record<string, number>;
  win: Record<string, number>;
  result?: boolean;
  r?: number;
  l?: number;
  leave?: number | null;
  enter?: number;
  eq?: boolean;
  done?: boolean;
}

export default defineViz<Input, Step>('win-perm', {
  title: 'Fixed window of letter counts (Permutation in String)',
  inputs: [
    { key: 's1', label: 's1 (a–z)', type: 'string', def: 'ab' },
    { key: 's2', label: 's2 (a–z)', type: 'string', def: 'eidbaooo', wide: true },
  ],
  presets: [
    { label: 'LeetCode example 1', input: { s1: 'ab', s2: 'eidbaooo' } },
    { label: 'LeetCode example 2', input: { s1: 'ab', s2: 'eidboaoo' } },
    { label: 'Repeated letters', input: { s1: 'aab', s2: 'cbaab' } },
  ],
  legend: [
    ['window', 'window of length |s1|'],
    ['current', 'entering'],
    ['error', 'leaving'],
    ['done', 'match'],
  ],
  code: `
function checkInclusion(s1, s2) {
  if (s1.length > s2.length) return false;                 //@guard
  const need = new Array(26).fill(0);                      //@need
  const win = new Array(26).fill(0);                       //@win
  for (const c of s1) need[c.charCodeAt(0) - 97]++;        //@count
  const k = s1.length;                                     //@k
  for (let r = 0; r < s2.length; r++) {                    //@loop
    win[s2.charCodeAt(r) - 97]++;                          //@add
    if (r >= k) win[s2.charCodeAt(r - k) - 97]--;          //@rem
    if (r >= k - 1 && same(need, win)) return true;        //@cmp
  }
  return false;                                            //@no
}
const same = (a, b) => a.every((x, i) => x === b[i]);`,
  validate: ({ s1, s2 }) =>
    !/^[a-z]+$/.test(s1) || !/^[a-z]+$/.test(s2)
      ? 'Use lower-case letters a–z only.'
      : s2.length > 20
        ? 'Keep s2 to 20 letters.'
        : null,
  run({ s1, s2 }) {
    const steps: Step[] = [];
    const need: Record<string, number> = {},
      win: Record<string, number> = {};
    for (const c of s1) need[c] = (need[c] || 0) + 1;
    const k = s1.length;
    const snap = <O extends object>(o: O) => Object.assign({ need: { ...need }, win: { ...win } }, o);
    if (k > s2.length) {
      steps.push(
        snap({
          result: false,
          line: 'guard',
          note: 's1 is longer than s2: no window can hold it. Return false.',
        }),
      );
      return steps;
    }
    steps.push(
      snap({
        line: ['need', 'win', 'count', 'k'],
        note: `Count s1: ${Object.entries(need)
          .map(([c, n]) => c + '×' + n)
          .join(', ')}. Any window of length ${k} with the same counts is a permutation.`,
      }),
    );
    for (let r = 0; r < s2.length; r++) {
      win[s2[r]] = (win[s2[r]] || 0) + 1;
      let leave: number | null = null;
      if (r >= k) {
        leave = r - k;
        win[s2[r - k]]--;
        if (!win[s2[r - k]]) delete win[s2[r - k]];
      }
      const ready = r >= k - 1;
      const eq =
        ready &&
        Object.keys(need).length === Object.keys(win).length &&
        Object.entries(need).every(([c, n]) => win[c] === n);
      steps.push(
        snap({
          result: eq ? true : undefined,
          line: eq ? ['add', 'rem', 'cmp'] : ['add', 'rem'],
          r,
          l: Math.max(0, r - k + 1),
          leave,
          enter: r,
          eq,
          note:
            `Add "${s2[r]}"${leave != null ? ', remove "' + s2[leave] + '"' : ''}.` +
            (ready
              ? eq
                ? ` Window "${s2.slice(r - k + 1, r + 1)}" has the same counts: return true.`
                : ` Window "${s2.slice(r - k + 1, r + 1)}" counts differ.`
              : ' Window not full yet.'),
          why:
            r === k
              ? 'Updating two counts per move is O(1); comparing 26 counts is O(26) = O(1). Total O(26·n), which is O(n).'
              : null,
        }),
      );
      if (eq) return steps;
    }
    steps.push(snap({ result: false, line: 'no', done: true, note: 'No window matched: return false.' }));
    return steps;
  },
  view(st, stage, { s1, s2 }) {
    const states: Record<string, string> = {};
    if (st.enter != null) states[st.enter] = st.eq ? 'done' : 'current';
    if (st.leave != null) states[st.leave] = 'error';
    if (st.eq) for (let i = st.l; i! <= st.r!; i!++) states[i!] = 'done';
    stage.append(R.cells([...s2], { window: st.r != null ? [st.l, st.r] : null, states, label: 's2' }));
    const letters = [...new Set([...Object.keys(st.need), ...Object.keys(st.win)])].sort();
    stage.append(
      R.kv(
        letters.map((c) => [c, (st.win[c] || 0) + ' / ' + (st.need[c] || 0)]),
        {
          label: 'letter → count in window / count needed',
          states: Object.fromEntries(
            letters.map((c) => [c, (st.win[c] || 0) === (st.need[c] || 0) ? 'done' : 'compare']),
          ),
        },
      ),
    );
  },
  random: (g) => ({ s1: rstr(g, rint(g, 1, 4), 'abc'), s2: rstr(g, rint(g, 1, 20), 'abcd') }),
});
