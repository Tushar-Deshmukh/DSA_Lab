// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  s: string;
  t: string;
}

interface Step extends VizStep {
  counts: [string, number][];
  ch?: string[];
  i?: number;
  done?: boolean;
  result?: boolean;
}

// ---------- counting and grouping ----------
export default defineViz<Input, Step>('anagram-count', {
  title: 'Valid Anagram with a 26-slot count array',
  inputs: [
    { key: 's', label: 's', type: 'string', def: 'anagram' },
    { key: 't', label: 't', type: 'string', def: 'nagaram' },
  ],
  presets: [
    { label: 'LeetCode example 1', input: { s: 'anagram', t: 'nagaram' } },
    { label: 'LeetCode example 2', input: { s: 'rat', t: 'car' } },
    { label: 'Different lengths', input: { s: 'ab', t: 'a' } },
  ],
  legend: [
    ['current', 'changed now'],
    ['error', 'non-zero at the end'],
  ],
  code: `
function isAnagram(s, t) {
  if (s.length !== t.length) return false;      //@len
  const count = new Array(26).fill(0);           //@init
  for (let i = 0; i < s.length; i++) {           //@loop
    count[s.charCodeAt(i) - 97]++;               //@inc
    count[t.charCodeAt(i) - 97]--;               //@dec
  }
  return count.every((c) => c === 0);            //@ret
}`,
  validate: ({ s, t }) =>
    !/^[a-z]*$/.test(s + t)
      ? 'Use lower-case letters a–z.'
      : s.length > 14 || t.length > 14
        ? 'Keep each string to 14 letters.'
        : null,
  run({ s, t }) {
    const steps: Step[] = [];
    const cnt = new Array(26).fill(0);
    const view = () =>
      cnt.map((c, i) => [String.fromCharCode(97 + i), c] as [string, number]).filter(([, c]) => c !== 0);
    if (s.length !== t.length)
      return [
        {
          line: 'len',
          counts: [],
          result: false,
          note: `Lengths ${s.length} and ${t.length} differ: not an anagram. Return false without counting.`,
        },
      ];
    steps.push({
      line: 'init',
      counts: [],
      note: '26 zeros, one per letter: index = charCode − 97.',
      why: 'A fixed array beats a Map here: the key space is small and dense (Hash tables, "when not to use one").',
    });
    for (let i = 0; i < s.length; i++) {
      cnt[s.charCodeAt(i) - 97]++;
      cnt[t.charCodeAt(i) - 97]--;
      steps.push({
        line: ['inc', 'dec'],
        counts: view(),
        ch: [s[i], t[i]],
        i,
        note: `i = ${i}: +1 for "${s[i]}" (from s), −1 for "${t[i]}" (from t).${s[i] === t[i] ? ' They cancel.' : ''}`,
      });
    }
    const ok = cnt.every((c) => c === 0);
    steps.push({
      line: 'ret',
      counts: view(),
      done: true,
      result: ok,
      note: ok
        ? 'Every count is back to 0: same letters, same multiplicities. Return true.'
        : 'Some counts are not 0: ' +
          view()
            .map(([c, v]) => c + ' ' + (v > 0 ? '+' : '') + v)
            .join(', ') +
          '. Return false.',
      why: 'O(n) time and O(26) = O(1) space, against O(n log n) for sorting both strings.',
    });
    return steps;
  },
  view(st, stage, { s, t }) {
    stage.append(R.cells([...s], { states: st.i != null ? { [st.i]: 'current' } : {}, label: 's' }));
    stage.append(R.cells([...t], { states: st.i != null ? { [st.i]: 'current' } : {}, label: 't' }));
    const states: Record<string, string> = {};
    if (st.ch) st.ch.forEach((c) => (states[c] = 'current'));
    if (st.done) st.counts.forEach(([c]) => (states[c] = 'error'));
    stage.append(
      R.kv(st.counts, { label: 'non-zero counts (letter → count)', empty: 'all 26 counts are 0', states }),
    );
  },
  random: (g) => {
    const s = rstr(g, rint(g, 0, 10), 'abc');
    return { s, t: g() < 0.5 ? [...s].sort(() => g() - 0.5).join('') : rstr(g, rint(g, 0, 10), 'abc') };
  },
});
