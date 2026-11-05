// Ported from legacy/src/viz/w03.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck, ptrsOf } from './_helpers';

interface Input {
  nums: number[];
  pivotRule: string;
}

interface Step extends VizStep {
  a: number[];
  lo?: number;
  hi?: number;
  lt?: number;
  i?: number;
  gt?: number;
  pivot?: number;
  part?: boolean;
  done?: boolean;
  result?: number[];
}

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default defineViz<Input, Step>('quicksort3', {
  title: 'Quicksort with three-way partitioning (reference 6.8)',
  inputs: [
    { key: 'nums', label: 'nums', type: 'numbers', def: [3, 1, 3, 2, 3], wide: true },
    {
      key: 'pivotRule',
      label: 'pivot',
      type: 'select',
      def: 'first',
      options: [
        { value: 'first', label: 'a[lo] (for the dry run)' },
        { value: 'random', label: 'random (seeded, as in 6.8)' },
      ],
    },
  ],
  presets: [
    { label: 'Lesson 5 dry run', input: { nums: [3, 1, 3, 2, 3], pivotRule: 'first' } },
    { label: 'Many duplicates', input: { nums: [2, 2, 1, 2, 3, 2, 2], pivotRule: 'random' } },
    { label: 'Reversed', input: { nums: [6, 5, 4, 3, 2, 1], pivotRule: 'random' } },
  ],
  legend: [
    ['done', '< pivot: [lo, lt)'],
    ['window', '= pivot: [lt, i)'],
    ['frontier', '> pivot: (gt, hi]'],
    ['current', 'i'],
    ['dim', 'outside this call'],
  ],
  code: `
function quickSort(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return a;                                         //@base
  const pivot = a[lo + Math.floor(Math.random() * (hi - lo + 1))]; //@pivot
  let lt = lo, i = lo, gt = hi;
  while (i <= gt) {                                               //@loop
    if (a[i] < pivot) swap(a, lt++, i++);                         //@less
    else if (a[i] > pivot) swap(a, i, gt--);  // i stays           //@more
    else i++;                                                     //@eq
  }
  quickSort(a, lo, lt - 1);                                       //@recl
  quickSort(a, gt + 1, hi);                                       //@recr
  return a;
}`,
  validate: ({ nums }) => sizeCheck(nums, 1, 12),
  run({ nums, pivotRule }) {
    const a = [...nums],
      steps: Step[] = [],
      rng = mulberry(42);
    let swaps = 0;
    const swap = (i: number, j: number) => {
      [a[i], a[j]] = [a[j], a[i]];
      swaps++;
    };
    function qs(lo: number, hi: number, depth: number) {
      if (lo >= hi) {
        if (lo === hi)
          steps.push({
            a: [...a],
            lo,
            hi,
            line: 'base',
            note: `Range [${lo}..${hi}] has at most one element: nothing to do.`,
          });
        return;
      }
      const p = pivotRule === 'first' ? lo : lo + Math.floor(rng() * (hi - lo + 1));
      const pivot = a[p];
      let lt = lo,
        i = lo,
        gt = hi;
      steps.push({
        a: [...a],
        lo,
        hi,
        lt,
        i,
        gt,
        pivot,
        line: 'pivot',
        note: `Sort [${lo}..${hi}] with pivot ${pivot} (from index ${p}).`,
        why:
          depth === 0
            ? 'A random pivot makes the O(n²) worst case (always picking the smallest element) very unlikely.'
            : null,
      });
      while (i <= gt) {
        if (a[i] < pivot) {
          swap(lt, i);
          steps.push({
            a: [...a],
            lo,
            hi,
            lt: lt + 1,
            i: i + 1,
            gt,
            pivot,
            line: 'less',
            note: `${a[lt]} < ${pivot}: swap into the "less" region; lt and i advance.`,
          });
          lt++;
          i++;
        } else if (a[i] > pivot) {
          const v = a[i];
          swap(i, gt);
          steps.push({
            a: [...a],
            lo,
            hi,
            lt,
            i,
            gt: gt - 1,
            pivot,
            line: 'more',
            note: `${v} > ${pivot}: swap to position ${gt}; gt shrinks; i stays because the value that arrived (${a[i]}) is unchecked.`,
          });
          gt--;
        } else {
          steps.push({
            a: [...a],
            lo,
            hi,
            lt,
            i: i + 1,
            gt,
            pivot,
            line: 'eq',
            note: `${a[i]} = pivot: leave it in the middle region; i advances.`,
          });
          i++;
        }
      }
      steps.push({
        a: [...a],
        lo,
        hi,
        lt,
        i,
        gt,
        pivot,
        line: ['recl', 'recr'],
        part: true,
        note: `Partition done: [${lo}..${lt - 1}] < ${pivot}, [${lt}..${gt}] = ${pivot}, [${gt + 1}..${hi}] > ${pivot}. Recurse on the two outer parts only.`,
        why: 'Every copy of the pivot is already in its final place. With many duplicates this is what keeps three-way quicksort fast.',
      });
      qs(lo, lt - 1, depth + 1);
      qs(gt + 1, hi, depth + 1);
    }
    qs(0, a.length - 1, 0);
    steps.push({
      a: [...a],
      done: true,
      line: null,
      result: [...a],
      note: `Sorted with ${swaps} swaps.`,
      why: 'Average O(n log n) time, O(log n) stack on average. Not stable: swaps can reorder equal keys.',
    });
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {};
    st.a.forEach((_, k) => {
      if (st.done) return;
      if (k < st.lo! || k > st.hi!) states[k] = 'dim';
      else if (st.lt != null) {
        if (k < st.lt) states[k] = 'done';
        else if (k < st.i!) states[k] = 'window';
        else if (k > st.gt!) states[k] = 'frontier';
      }
    });
    if (!st.done && st.i != null && st.i <= st.gt!) states[st.i] = 'current';
    stage.append(
      R.cells(st.a, {
        states,
        ptrs:
          st.done || st.lt == null
            ? {}
            : ptrsOf([
                [st.lt, 'lt'],
                [st.i! <= st.hi! ? st.i : null, 'i'],
                [st.gt! >= st.lo! ? st.gt : null, 'gt'],
              ]),
        label: 'a',
      }),
    );
    stage.append(R.vars({ lo: st.lo ?? '·', hi: st.hi ?? '·', pivot: st.pivot ?? '·' }));
  },
  random: (g) => ({ nums: rarr(g, rint(g, 1, 12), 0, 5), pivotRule: g() < 0.5 ? 'first' : 'random' }),
});
