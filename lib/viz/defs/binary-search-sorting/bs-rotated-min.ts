// Ported from legacy/src/viz/w03.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint, sorted } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck, ptrsOf, rotatedCheck } from './_helpers';

interface Input {
  nums: number[];
}

interface Step extends VizStep {
  lo: number;
  hi: number;
  mid?: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('bs-rotated-min', {
  title: 'Minimum of a rotated sorted array: compare mid with hi',
  inputs: [
    {
      key: 'nums',
      label: 'nums (rotated, distinct)',
      type: 'numbers',
      def: [4, 5, 6, 7, 0, 1, 2],
      wide: true,
    },
  ],
  presets: [
    { label: 'Lesson 2 trace 1', input: { nums: [4, 5, 6, 7, 0, 1, 2] } },
    { label: 'Not rotated', input: { nums: [1, 2, 3] } },
    { label: 'Two elements', input: { nums: [2, 1] } },
    { label: 'Drop near the start', input: { nums: [9, 1, 2, 3, 4, 5] } },
  ],
  legend: [
    ['window', 'range [lo, hi]'],
    ['current', 'mid'],
    ['compare', 'nums[hi]'],
    ['done', 'minimum'],
  ],
  code: `
function findMin(nums) {
  let lo = 0, hi = nums.length - 1;      // min is in [lo, hi]   //@init
  while (lo < hi) {                                              //@loop
    const mid = lo + ((hi - lo) >> 1);                           //@mid
    if (nums[mid] > nums[hi]) lo = mid + 1;  // drop is right    //@right
    else hi = mid;                       // mid..hi sorted       //@left
  }
  return nums[lo];                                               //@ret
}`,
  validate: ({ nums }) => sizeCheck(nums, 1, 14) || rotatedCheck(nums),
  run({ nums: a }) {
    const steps: Step[] = [];
    let lo = 0,
      hi = a.length - 1;
    steps.push({
      lo,
      hi,
      line: 'init',
      note: 'The minimum is the element just after the "drop" (or index 0 if there is no drop).',
    });
    while (lo < hi) {
      const mid = lo + ((hi - lo) >> 1);
      if (a[mid] > a[hi]) {
        steps.push({
          lo,
          hi,
          mid,
          line: ['mid', 'right'],
          note: `nums[mid] = ${a[mid]} > nums[hi] = ${a[hi]}: the values fall somewhere between mid and hi, so the drop (and the minimum) is right of mid → lo = ${mid + 1}.`,
          why: 'mid is larger than something to its right, so mid cannot be the minimum: excluding it is safe.',
        });
        lo = mid + 1;
      } else {
        steps.push({
          lo,
          hi,
          mid,
          line: ['mid', 'left'],
          note: `nums[mid] = ${a[mid]} ≤ nums[hi] = ${a[hi]}: mid..hi is sorted, so the minimum is mid or left of it → hi = ${mid}.`,
          why: 'Comparing with nums[hi] (not nums[lo]) means an unrotated array needs no special case: everything is ≤ nums[hi], so hi walks left to index 0.',
        });
        hi = mid;
      }
    }
    steps.push({
      lo,
      hi,
      done: true,
      line: 'ret',
      result: a[lo],
      note: `lo = hi = ${lo}: the minimum is ${a[lo]}.`,
    });
    return steps;
  },
  view(st, stage, { nums: a }) {
    const states: Record<string, string> = {};
    a.forEach((_, i) => {
      if (i < st.lo || i > st.hi) states[i] = 'dim';
    });
    if (st.mid != null) {
      states[st.hi] = 'compare';
      states[st.mid] = 'current';
    }
    if (st.done) states[st.lo] = 'done';
    stage.append(
      R.bars(
        a.map((x) => x - Math.min(0, ...a)),
        {
          states,
          ptrs: ptrsOf([
            [st.lo, 'lo'],
            [st.hi, 'hi'],
            [st.done ? null : st.mid, 'mid'],
          ]),
          label: 'nums drawn as heights' + (Math.min(...a) < 0 ? ' (shifted up so all are ≥ 0)' : ''),
        },
      ),
    );
    stage.append(R.cells(a, { states, window: st.done ? null : [st.lo, st.hi] }));
  },
  random: (g) => {
    const a = [...new Set(sorted(rarr(g, rint(g, 1, 14), -9, 30)))];
    const k = rint(g, 0, a.length - 1);
    return { nums: [...a.slice(k), ...a.slice(0, k)] };
  },
});
