// Ported from legacy/src/viz/w11.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  s: string;
  goal: string;
}

interface Step extends VizStep {
  c: number | null;
  l: number | null;
  r: number | null;
  count: number;
  bl: number;
  blen: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('pal-expand', {
  title: 'Palindromes: expand around all 2n − 1 centres',
  inputs: [
    { key: 's', label: 's', type: 'string', def: 'babad' },
    {
      key: 'goal',
      label: 'goal',
      type: 'select',
      def: 'longest',
      options: [
        { value: 'longest', label: '5: longest palindromic substring' },
        { value: 'count', label: '647: count palindromic substrings' },
      ],
    },
  ],
  presets: [
    { label: '"babad" (longest)', input: { s: 'babad', goal: 'longest' } },
    { label: '"cbbd" (even centre)', input: { s: 'cbbd', goal: 'longest' } },
    { label: '"aaa" (count)', input: { s: 'aaa', goal: 'count' } },
  ],
  legend: [
    ['window', 'current palindrome'],
    ['current', 'the centre'],
    ['done', 'best so far'],
  ],
  code: `
for (let c = 0; c < 2 * n - 1; c++) {          // even c: a letter; odd c: a gap
  let l = c >> 1, r = l + (c & 1);
  while (l >= 0 && r < n && s[l] === s[r]) {   // still a palindrome          //@expand
    count++; if (r - l + 1 > bestLen) [bestL, bestLen] = [l, r - l + 1];       //@record
    l--; r++;
  }
}`,
  validate: ({ s }) => (s.length < 1 || s.length > 12 ? 'Use 1–12 characters.' : null),
  run({ s, goal }) {
    const n = s.length,
      steps: Step[] = [];
    let count = 0,
      bl = 0,
      blen = 0,
      evenShown = false;
    for (let c = 0; c < 2 * n - 1; c++) {
      let l = c >> 1,
        r = l + (c & 1);
      let any = false;
      while (l >= 0 && r < n && s[l] === s[r]) {
        any = true;
        count++;
        if (r - l + 1 > blen) {
          bl = l;
          blen = r - l + 1;
        }
        steps.push({
          c,
          l,
          r,
          count,
          bl,
          blen,
          line: ['expand', 'record'],
          note: `Centre ${c & 1 ? 'between ' + (c >> 1) + ' and ' + ((c >> 1) + 1) : 'at ' + (c >> 1)}: "${s.slice(l, r + 1)}" is a palindrome. Count ${count}${r - l + 1 === blen && bl === l ? ', new longest' : ''}.`,
          why:
            c & 1 && !evenShown && (evenShown = true)
              ? 'Even-length palindromes have a gap as their centre, which is why there are 2n − 1 centres, not n.'
              : null,
        });
        l--;
        r++;
      }
      if (!any)
        steps.push({
          c,
          l: null,
          r: null,
          count,
          bl,
          blen,
          line: 'expand',
          note: `Centre between ${c >> 1} and ${(c >> 1) + 1}: "${s[c >> 1]}" ≠ "${s[(c >> 1) + 1]}", no even palindrome here.`,
        });
    }
    const res = goal === 'longest' ? s.slice(bl, bl + blen) : count;
    steps.push({
      c: null,
      l: null,
      r: null,
      count,
      bl,
      blen,
      done: true,
      line: null,
      result: goal === 'longest' ? blen : count,
      note: goal === 'longest' ? `Longest: "${res}" (length ${blen}).` : `${count} palindromic substrings.`,
      why: 'O(n²) time in the worst case ("aaaa…"), O(1) space. Interval DP gives the same time with an O(n²) table, useful only when later steps need the table.',
    });
    return steps;
  },
  view(st, stage, { s }) {
    const states: Record<string, string> = {};
    if (st.bl != null && st.blen) for (let k = st.bl; k < st.bl + st.blen; k++) states[k] = 'done';
    if (st.l != null) for (let k = st.l; k <= st.r!; k++) states[k] = 'window';
    if (st.c != null && !(st.c & 1)) states[st.c >> 1] = 'current';
    stage.append(
      R.cells([...s], {
        states,
        ptrs: st.l != null ? (st.l === st.r ? { [st.l]: 'l=r' } : { [st.l]: 'l', [st.r!]: 'r' }) : {},
        label: 's',
      }),
    );
    stage.append(
      R.vars({
        count: st.count,
        'longest so far': st.blen ? '"' + s.slice(st.bl, st.bl + st.blen) + '"' : '""',
      }),
    );
  },
  random: (g) => ({ s: rstr(g, rint(g, 1, 12), 'ab'), goal: g() < 0.5 ? 'longest' : 'count' }),
});
