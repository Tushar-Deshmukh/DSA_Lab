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
  best: number;
  bl: number;
  br: number;
  map: [string, number][];
  r: number | null;
  rep?: number;
  result?: number;
  done?: boolean;
  stale?: number;
}

export default defineViz<Input, Step>('win-longest', {
  title: 'Variable window: longest substring without repeats',
  inputs: [{ key: 's', label: 's', type: 'string', def: 'abcabcbb', wide: true }],
  presets: [
    { label: 'Handbook trace', input: { s: 'abcabcbb' } },
    { label: 'Lesson 3 trace', input: { s: 'pwwkew' } },
    { label: 'Stale entry trap', input: { s: 'abba' } },
    { label: 'All the same', input: { s: 'bbbbb' } },
    { label: 'Spaces count', input: { s: 'a b c' } },
  ],
  legend: [
    ['window', 'window [l, r]'],
    ['current', 'r (entering)'],
    ['error', 'repeat inside the window'],
    ['compare', 'stale: seen before l'],
  ],
  code: `
function lengthOfLongestSubstring(s) {
  const lastSeen = new Map(); // char -> last index        //@init
  let l = 0, best = 0;                                     //@init2
  for (let r = 0; r < s.length; r++) {                     //@loop
    const c = s[r];                                        //@c
    if (lastSeen.has(c) && lastSeen.get(c) >= l) {         //@check
      l = lastSeen.get(c) + 1; // past the old copy        //@jump
    }
    lastSeen.set(c, r);                                    //@set
    best = Math.max(best, r - l + 1);                      //@best
  }
  return best;                                             //@ret
}`,
  validate: ({ s }) => (s.length > 24 ? 'Keep it to 24 characters.' : null),
  run({ s }) {
    const steps: Step[] = [],
      last: Map<string, number> = new Map();
    let l = 0,
      best = 0,
      bl = 0,
      br = -1;
    const snap = <O extends object>(o: O) => Object.assign({ l, best, bl, br, map: [...last.entries()] }, o);
    steps.push(snap({ line: ['init', 'init2'], r: -1, note: 'Empty window, empty map.' }));
    for (let r = 0; r < s.length; r++) {
      const c = s[r];
      if (last.has(c) && last.get(c)! >= l) {
        const p = last.get(c);
        steps.push(
          snap({
            line: ['c', 'check'],
            r,
            rep: p,
            note: `"${show(c)}" was last seen at ${p}, inside the window [${l}..${r - 1}]: the window would repeat it.`,
          }),
        );
        l = p! + 1;
        steps.push(
          snap({
            line: 'jump',
            r,
            note: `Jump l to ${l}, just past the old copy.`,
            why:
              'Any window that still contains index ' +
              p +
              ' would contain "' +
              show(c) +
              '" twice, so all start positions ≤ ' +
              p +
              ' are ruled out at once.',
          }),
        );
      } else if (last.has(c)) {
        steps.push(
          snap({
            line: ['c', 'check'],
            r,
            stale: last.get(c),
            note: `"${show(c)}" was seen at ${last.get(c)}, but that is before l = ${l}: it is not in the window. l stays.`,
            why: 'This is what the ">= l" test is for. Without it, l would jump backwards and the window would wrongly re-include a repeat.',
          }),
        );
      }
      last.set(c, r);
      const len = r - l + 1;
      const nb = len > best;
      if (nb) {
        best = len;
        bl = l;
        br = r;
      }
      steps.push(
        snap({
          line: ['set', 'best'],
          r,
          note: `Record "${show(c)}" → ${r}. Window [${l}..${r}] = "${s.slice(l, r + 1)}", length ${len}.${nb ? ' New best.' : ''}`,
        }),
      );
    }
    steps.push(
      snap({
        result: best,
        line: 'ret',
        r: null,
        done: true,
        note: `Answer ${best}${best ? ': "' + s.slice(bl, br + 1) + '"' : ''}.`,
        why: 'r moves n times and l only moves forward, so O(n) time; the map holds at most one entry per distinct character.',
      }),
    );
    return steps;
  },
  view(st, stage, { s }) {
    const states: Record<string, string> = {};
    if (st.r != null && st.r >= 0) states[st.r] = 'current';
    if (st.rep != null) states[st.rep] = 'error';
    if (st.stale != null) states[st.stale] = 'compare';
    const win = st.done ? (st.best ? [st.bl, st.br] : null) : st.r! >= 0 ? [st.l, st.r] : null;
    const ptrs: Record<string, string | string[]> = {};
    if (!st.done && st.r! >= 0) {
      if (st.l === st.r) ptrs[st.l] = ['l', 'r'];
      else {
        ptrs[st.l] = 'l';
        ptrs[st.r!] = 'r';
      }
    }
    stage.append(
      R.cells([...s].map(show), {
        window: win,
        states,
        ptrs,
        label: st.done ? 's (best window shaded)' : 's',
      }),
    );
    stage.append(
      R.kv(
        st.map.map(([k, v]) => [show(k), v]),
        {
          label: 'lastSeen (char → index)',
          states: st.r != null && st.r >= 0 ? { [show(s[st.r])]: 'current' } : {},
        },
      ),
    );
    stage.append(R.vars({ l: st.l, r: st.r ?? '·', best: st.best }));
  },
  random: (g) => ({ s: rstr(g, rint(g, 0, 20), 'abcd ') }),
});
