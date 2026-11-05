// Ported from legacy/src/viz/w02.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { show } from './_helpers';

interface Input {
  s: string;
}

interface Step extends VizStep {
  l: number;
  r: number;
  skipped: Set<number>;
  matched: Set<number>;
  cmp?: number[];
  result?: boolean;
  bad?: boolean;
}

const isAlnum = (c: string) => {
  const x = c.charCodeAt(0);
  return (x >= 48 && x <= 57) || (x >= 65 && x <= 90) || (x >= 97 && x <= 122);
};

export default defineViz<Input, Step>('palindrome', {
  title: 'Valid palindrome: two pointers that skip characters',
  inputs: [{ key: 's', label: 's', type: 'string', def: "No 'x' in Nixon", wide: true }],
  presets: [
    { label: 'Classic sentence', input: { s: 'A man, a plan, a canal: Panama' } },
    { label: 'Not a palindrome', input: { s: 'race a car' } },
    { label: 'Only punctuation', input: { s: ' .,' } },
    { label: 'Digit vs letter trap', input: { s: '0P' } },
  ],
  legend: [
    ['compare', 'pair being compared'],
    ['done', 'matched'],
    ['dim', 'skipped (not alphanumeric)'],
    ['error', 'mismatch'],
  ],
  code: `
function isPalindrome(s) {
  let l = 0, r = s.length - 1;                     //@init
  while (l < r) {                                  //@loop
    if (!isAlnum(s[l])) { l++; continue; }         //@skipl
    if (!isAlnum(s[r])) { r--; continue; }         //@skipr
    if (s[l].toLowerCase() !== s[r].toLowerCase()) //@cmp
      return false;                                //@no
    l++; r--;                                      //@move
  }
  return true;                                     //@yes
}
function isAlnum(c) {
  const x = c.charCodeAt(0);
  return (x >= 48 && x <= 57) || (x >= 65 && x <= 90) || (x >= 97 && x <= 122);
}`,
  validate: ({ s }) =>
    s.length > 34
      ? 'Keep the string to 34 characters so it fits on screen.'
      : s.length
        ? null
        : 'Type at least one character.',
  run({ s }) {
    const steps: Step[] = [],
      skipped: Set<number> = new Set(),
      matched: Set<number> = new Set();
    let l = 0,
      r = s.length - 1;
    const snap = <O extends object>(o: O) =>
      Object.assign({ l, r, skipped: new Set(skipped), matched: new Set(matched) }, o);
    steps.push(snap({ line: 'init', note: `l = 0, r = ${r}. Compare from both ends inward.` }));
    while (l < r) {
      if (!isAlnum(s[l])) {
        skipped.add(l);
        steps.push(
          snap({
            line: 'skipl',
            note: `s[${l}] = "${show(s[l])}" is not a letter or digit: skip it, l → ${l + 1}.`,
            why: 'Skipping one side and re-checking the loop condition keeps l < r valid at every comparison.',
          }),
        );
        l++;
        continue;
      }
      if (!isAlnum(s[r])) {
        skipped.add(r);
        steps.push(
          snap({
            line: 'skipr',
            note: `s[${r}] = "${show(s[r])}" is not a letter or digit: skip it, r → ${r - 1}.`,
          }),
        );
        r--;
        continue;
      }
      const a = s[l].toLowerCase(),
        b = s[r].toLowerCase();
      if (a !== b) {
        steps.push(
          snap({
            result: false,
            line: ['cmp', 'no'],
            cmp: [l, r],
            bad: true,
            note: `"${s[l]}" vs "${s[r]}": lower-cased "${a}" ≠ "${b}". Return false.`,
            why: 'One mismatch is enough; the remaining characters cannot fix it.',
          }),
        );
        return steps;
      }
      steps.push(
        snap({
          line: 'cmp',
          cmp: [l, r],
          note: `"${s[l]}" vs "${s[r]}": both "${a}" in lower case. They match.`,
        }),
      );
      matched.add(l);
      matched.add(r);
      l++;
      r--;
      steps.push(snap({ line: 'move', note: `Move both inward: l = ${l}, r = ${r}.` }));
    }
    steps.push(
      snap({
        result: true,
        line: 'yes',
        note:
          l === r
            ? `l = r = ${l}: the middle character needs no partner. Return true.`
            : 'l passed r: every pair matched. Return true.',
        why: `Each index was visited once by one pointer: O(n) time, O(1) extra space (no cleaned copy of the string).`,
      }),
    );
    return steps;
  },
  view(st, stage, { s }) {
    const states: Record<string, string> = {},
      ptrs: Record<string, string | string[]> = {};
    st.skipped.forEach((i) => (states[i] = 'dim'));
    st.matched.forEach((i) => (states[i] = 'done'));
    if (st.cmp) {
      states[st.cmp[0]] = st.bad ? 'error' : 'compare';
      states[st.cmp[1]] = st.bad ? 'error' : 'compare';
    }
    if (st.l === st.r) ptrs[st.l] = ['l', 'r'];
    else {
      if (st.l < s.length) ptrs[st.l] = 'l';
      if (st.r >= 0) ptrs[st.r] = 'r';
    }
    stage.append(R.cells([...s].map(show), { states, ptrs, label: 's' }));
    stage.append(R.vars({ l: st.l, r: st.r }));
  },
  random: (g) => {
    const base = rstr(g, rint(g, 0, 8), 'aAb1 ,.');
    const s = g() < 0.5 ? base + [...base].reverse().join('') : base;
    return { s: s || ' ' };
  },
});
