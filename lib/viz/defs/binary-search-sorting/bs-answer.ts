// Ported from legacy/src/viz/w03.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck, ptrsOf } from './_helpers';

interface Input {
  piles: number[];
  h: number;
}

interface Step extends VizStep {
  lo: number;
  hi: number;
  tested: Record<string, boolean>;
  mid?: number;
  hrs?: number;
  done?: boolean;
  result?: number;
}

// ---------- binary search on the answer ----------
export default defineViz<Input, Step>('bs-answer', {
  title: 'Binary search on the answer: Koko Eating Bananas',
  inputs: [
    { key: 'piles', label: 'piles', type: 'numbers', def: [3, 6, 7, 11], wide: true },
    { key: 'h', label: 'h (hours)', type: 'int', def: 8 },
  ],
  presets: [
    { label: 'Lesson 3 trace', input: { piles: [3, 6, 7, 11], h: 8 } },
    { label: 'LeetCode example 2', input: { piles: [30, 11, 23, 4, 20], h: 5 } },
    { label: 'Plenty of time', input: { piles: [5, 9], h: 20 } },
  ],
  legend: [
    ['window', 'speeds still possible'],
    ['current', 'mid (being tested)'],
    ['done', 'feasible'],
    ['dim', 'too slow'],
  ],
  code: `
function minEatingSpeed(piles, h) {
  const hoursAt = (k) =>
    piles.reduce((sum, p) => sum + Math.ceil(p / k), 0);   //@hours
  let lo = 1, hi = Math.max(...piles);                      //@init
  while (lo < hi) {                                         //@loop
    const mid = Math.floor((lo + hi) / 2);                  //@mid
    if (hoursAt(mid) <= h) hi = mid;    // feasible: slower? //@true
    else lo = mid + 1;                  // too slow          //@false
  }
  return lo;                                                //@ret
}`,
  validate: ({ piles, h }) =>
    sizeCheck(piles, 1, 8) ||
    (piles.some((p) => p < 1 || !Number.isInteger(p))
      ? 'Piles are positive integers.'
      : Math.max(...piles) > 40
        ? 'Keep piles ≤ 40 so every speed fits on screen.'
        : h < piles.length
          ? 'h must be at least the number of piles (one hour per pile minimum).'
          : null),
  run({ piles, h }) {
    const hoursAt = (k: number) => piles.reduce((s, p) => s + Math.ceil(p / k), 0);
    const steps: Step[] = [];
    let lo = 1,
      hi = Math.max(...piles);
    const tested: Record<string, boolean> = {};
    steps.push({
      lo,
      hi,
      tested: {},
      line: 'init',
      note: `Speeds from 1 to max(piles) = ${hi}. At speed ${hi} every pile takes one hour, so ${hi} is surely feasible (h ≥ number of piles).`,
      why: 'The predicate "hoursAt(k) ≤ h" is monotone: eating faster never takes more hours. So the speeds read F F … F T T … T and we want the first T.',
    });
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const hrs = hoursAt(mid);
      const ok = hrs <= h;
      tested[mid] = ok;
      steps.push({
        lo,
        hi,
        mid,
        tested: { ...tested },
        hrs,
        line: ['mid', 'hours', ok ? 'true' : 'false'],
        note: `Speed ${mid}: ${piles.map((p) => '⌈' + p + '/' + mid + '⌉').join(' + ')} = ${hrs} hours ${ok ? '≤' : '>'} ${h}. ${ok ? 'Feasible → hi = ' + mid + ' (try slower).' : 'Too slow → lo = ' + (mid + 1) + '.'}`,
      });
      if (ok) hi = mid;
      else lo = mid + 1;
    }
    steps.push({
      lo,
      hi,
      tested: { ...tested },
      done: true,
      line: 'ret',
      result: lo,
      note: `Smallest feasible speed: ${lo} (${hoursAt(lo)} hours).`,
      why: `Only ${Object.keys(tested).length} of the ${Math.max(...piles)} speeds were tried, each check O(n): O(n log max) instead of O(n · max).`,
    });
    return steps;
  },
  view(st, stage, { piles }) {
    const max = Math.max(...piles);
    const speeds = Array.from({ length: max }, (_, i) => i + 1);
    const states: Record<string, string> = {};
    speeds.forEach((k, i) => {
      if (k in st.tested) states[i] = st.tested[k] ? 'done' : 'dim';
      else if (k < st.lo || k > st.hi) states[i] = 'dim';
    });
    if (st.mid != null) states[st.mid - 1] = 'current';
    if (st.done) states[st.lo - 1] = 'done';
    stage.append(
      R.cells(speeds, {
        states,
        window: st.done ? null : [st.lo - 1, st.hi - 1],
        ptrs: ptrsOf([
          [st.lo - 1, 'lo'],
          [st.hi - 1, 'hi'],
          [st.done || st.mid == null ? null : st.mid - 1, 'mid'],
        ]),
        label: 'candidate speeds k (the answer space, not an input array)',
        noIndex: true,
      }),
    );
    stage.append(
      R.cells(
        speeds.map((k) => (k in st.tested ? (st.tested[k] ? 'T' : 'F') : '?')),
        {
          states: Object.fromEntries(
            speeds
              .map((k, i) => [i, k in st.tested ? (st.tested[k] ? 'done' : 'dim') : null])
              .filter(([, v]) => v),
          ),
          label: 'hoursAt(k) ≤ h ? (? = never computed)',
          noIndex: true,
        },
      ),
    );
    stage.append(R.vars({ lo: st.lo, hi: st.hi, mid: st.mid ?? '·', 'hoursAt(mid)': st.hrs ?? '·' }));
  },
  random: (g) => {
    const piles = rarr(g, rint(g, 1, 8), 1, 40);
    return { piles, h: rint(g, piles.length, piles.length * 6) };
  },
});
