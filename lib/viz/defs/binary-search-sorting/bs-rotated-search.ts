// Ported from legacy/src/viz/w03.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint, sorted } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck, ptrsOf, rotatedCheck } from './_helpers';

interface Input {
  nums: number[];
  target: number;
}

interface Step extends VizStep {
  lo: number;
  hi: number;
  mid?: number;
  sorted?: number[];
  found?: number;
  result?: number;
  done?: boolean;
}

export default defineViz<Input, Step>('bs-rotated-search', {
  title: 'Search a rotated sorted array: find the sorted half, then check the target range',
  inputs: [
    {
      key: 'nums',
      label: 'nums (rotated, distinct)',
      type: 'numbers',
      def: [4, 5, 6, 7, 0, 1, 2],
      wide: true,
    },
    { key: 'target', label: 'target', type: 'number', def: 0 },
  ],
  presets: [
    { label: 'LeetCode example 1', input: { nums: [4, 5, 6, 7, 0, 1, 2], target: 0 } },
    { label: 'LeetCode example 2 (absent)', input: { nums: [4, 5, 6, 7, 0, 1, 2], target: 3 } },
    { label: 'Target in the left half', input: { nums: [5, 6, 7, 1, 2, 3, 4], target: 6 } },
    { label: 'One element', input: { nums: [1], target: 0 } },
  ],
  legend: [
    ['window', 'range [lo, hi]'],
    ['current', 'mid'],
    ['done', 'the sorted half'],
    ['error', 'found'],
  ],
  code: `
function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {                                              //@loop
    const mid = lo + ((hi - lo) >> 1);                            //@mid
    if (nums[mid] === target) return mid;                         //@hit
    if (nums[lo] <= nums[mid]) {             // left half sorted  //@lsorted
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; //@inl
      else lo = mid + 1;                                          //@outl
    } else {                                 // right half sorted //@rsorted
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; //@inr
      else hi = mid - 1;                                          //@outr
    }
  }
  return -1;                                                      //@none
}`,
  validate: ({ nums }) => sizeCheck(nums, 1, 14) || rotatedCheck(nums),
  run({ nums: a, target: t }) {
    const steps: Step[] = [];
    let lo = 0,
      hi = a.length - 1;
    while (lo <= hi) {
      const mid = lo + ((hi - lo) >> 1);
      if (a[mid] === t) {
        steps.push({
          lo,
          hi,
          mid,
          found: mid,
          line: ['mid', 'hit'],
          result: mid,
          note: `nums[${mid}] = ${t}: found.`,
        });
        return steps;
      }
      if (a[lo] <= a[mid]) {
        const inside = a[lo] <= t && t < a[mid];
        steps.push({
          lo,
          hi,
          mid,
          sorted: [lo, mid],
          line: ['mid', 'lsorted', inside ? 'inl' : 'outl'],
          note: `nums[lo] = ${a[lo]} ≤ nums[mid] = ${a[mid]}: the left half [${lo}..${mid}] is sorted. Is ${t} in [${a[lo]}, ${a[mid]})? ${inside ? 'Yes → search left: hi = ' + (mid - 1) : 'No → search right: lo = ' + (mid + 1)}.`,
          why: 'Only a sorted half has a known range of values, so only it can be ruled in or out with two comparisons.',
        });
        if (inside) hi = mid - 1;
        else lo = mid + 1;
      } else {
        const inside = a[mid] < t && t <= a[hi];
        steps.push({
          lo,
          hi,
          mid,
          sorted: [mid, hi],
          line: ['mid', 'rsorted', inside ? 'inr' : 'outr'],
          note: `nums[lo] = ${a[lo]} > nums[mid] = ${a[mid]}: the drop is in the left half, so the right half [${mid}..${hi}] is sorted. Is ${t} in (${a[mid]}, ${a[hi]}]? ${inside ? 'Yes → lo = ' + (mid + 1) : 'No → hi = ' + (mid - 1)}.`,
        });
        if (inside) lo = mid + 1;
        else hi = mid - 1;
      }
    }
    steps.push({
      lo,
      hi,
      line: 'none',
      result: -1,
      done: true,
      note: 'Range empty: return −1.',
      why: 'Each step discards half: O(log n), the same as ordinary binary search.',
    });
    return steps;
  },
  view(st, stage, { nums: a }) {
    const states: Record<string, string> = {};
    a.forEach((_, i) => {
      if (i < st.lo || i > st.hi) states[i] = 'dim';
    });
    if (st.sorted) for (let i = st.sorted[0]; i <= st.sorted[1]; i++) states[i] = 'done';
    if (st.mid != null) states[st.mid] = st.found != null ? 'error' : 'current';
    stage.append(
      R.cells(a, {
        states,
        ptrs: ptrsOf([
          [st.lo < a.length ? st.lo : null, 'lo'],
          [st.hi >= 0 ? st.hi : null, 'hi'],
          [st.mid, 'mid'],
        ]),
        label: 'nums',
      }),
    );
    stage.append(R.vars({ lo: st.lo, hi: st.hi, mid: st.mid ?? '·' }));
  },
  random: (g) => {
    const a = [...new Set(sorted(rarr(g, rint(g, 1, 14), -9, 30)))];
    const k = rint(g, 0, a.length - 1);
    return { nums: [...a.slice(k), ...a.slice(0, k)], target: rint(g, -10, 31) };
  },
});
