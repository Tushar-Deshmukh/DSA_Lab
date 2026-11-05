// Ported from legacy/src/viz/w03.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint, sorted } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { isSorted, ptrsOf } from './_helpers';

interface Input {
  nums1: number[];
  m: number;
  nums2: number[];
}

interface Step extends VizStep {
  a: number[];
  i: number;
  j: number;
  k: number;
  w?: number;
  cmp?: number[];
  done?: boolean;
  result?: number[];
}

export default defineViz<Input, Step>('merge-back', {
  title: 'Merge Sorted Array: fill nums1 from the back',
  inputs: [
    {
      key: 'nums1',
      label: 'nums1 (first m sorted, then n zeros)',
      type: 'numbers',
      def: [1, 2, 3, 0, 0, 0],
      wide: true,
    },
    { key: 'm', label: 'm', type: 'int', def: 3 },
    { key: 'nums2', label: 'nums2 (sorted)', type: 'numbers', def: [2, 5, 6] },
  ],
  presets: [
    { label: 'LeetCode example 1', input: { nums1: [1, 2, 3, 0, 0, 0], m: 3, nums2: [2, 5, 6] } },
    { label: 'nums1 empty', input: { nums1: [0], m: 0, nums2: [1] } },
    { label: 'nums2 all smaller', input: { nums1: [4, 5, 6, 0, 0, 0], m: 3, nums2: [1, 2, 3] } },
  ],
  legend: [
    ['done', 'final values'],
    ['current', 'written now'],
    ['compare', 'compared'],
  ],
  code: `
function merge(nums1, m, nums2, n) {
  let i = m - 1, j = n - 1, k = m + n - 1;                       //@init
  while (j >= 0) {                                               //@loop
    if (i >= 0 && nums1[i] > nums2[j]) nums1[k--] = nums1[i--];  //@take1
    else nums1[k--] = nums2[j--];                                //@take2
  }
}`,
  validate: ({ nums1, m, nums2 }) =>
    m < 0 || m + nums2.length !== nums1.length
      ? 'nums1 must have length m + n.'
      : !isSorted(nums1.slice(0, m)) || !isSorted(nums2)
        ? 'Both parts must be sorted.'
        : nums1.length > 12
          ? 'Keep it to 12 elements.'
          : null,
  run({ nums1, m, nums2 }) {
    const a = [...nums1],
      n = nums2.length,
      steps: Step[] = [];
    let i = m - 1,
      j = n - 1,
      k = m + n - 1;
    steps.push({
      a: [...a],
      i,
      j,
      k,
      line: 'init',
      note: 'Start at the ends: the largest remaining element goes into the last free slot.',
      why: 'Filling from the front would overwrite elements of nums1 that have not been merged yet. The back of nums1 is empty space, so nothing is lost.',
    });
    while (j >= 0) {
      if (i >= 0 && a[i] > nums2[j]) {
        a[k] = a[i];
        steps.push({
          a: [...a],
          i: i - 1,
          j,
          k: k - 1,
          w: k,
          cmp: [i, j],
          line: 'take1',
          note: `nums1[${i}] = ${a[k]} > nums2[${j}] = ${nums2[j]}: write ${a[k]} at ${k}.`,
        });
        i--;
        k--;
      } else {
        a[k] = nums2[j];
        steps.push({
          a: [...a],
          i,
          j: j - 1,
          k: k - 1,
          w: k,
          cmp: [i, j],
          line: 'take2',
          note:
            i >= 0
              ? `nums2[${j}] = ${nums2[j]} ≥ nums1[${i}] = ${a[i]}: write ${nums2[j]} at ${k}.`
              : `nums1 is exhausted: copy nums2[${j}] = ${nums2[j]} to ${k}.`,
        });
        j--;
        k--;
      }
    }
    steps.push({
      a: [...a],
      i,
      j,
      k,
      done: true,
      line: null,
      result: [...a],
      note: 'nums2 is used up; the remaining nums1 elements are already in place.',
      why: 'O(m + n) time, O(1) extra space. This is the merge step of merge sort, run backwards.',
    });
    return steps;
  },
  view(st, stage, { nums2 }) {
    const states: Record<string, string> = {};
    st.a.forEach((_, x) => {
      if (x > st.k) states[x] = 'done';
    });
    if (st.w != null) states[st.w] = 'current';
    stage.append(
      R.cells(st.a, {
        states,
        ptrs: st.done
          ? {}
          : ptrsOf([
              [st.i >= 0 ? st.i : null, 'i'],
              [st.k >= 0 ? st.k : null, 'k'],
            ]),
        label: 'nums1',
      }),
    );
    const s2: Record<string, string> = {};
    nums2.forEach((_, x) => {
      if (x > st.j) s2[x] = 'dim';
    });
    stage.append(
      R.cells(nums2, { states: s2, ptrs: st.j >= 0 && !st.done ? { [st.j]: 'j' } : {}, label: 'nums2' }),
    );
  },
  random: (g) => {
    const A = sorted(rarr(g, rint(g, 0, 6), 0, 9)),
      B = sorted(rarr(g, rint(g, 1, 6), 0, 9));
    return { nums1: [...A, ...B.map(() => 0)], m: A.length, nums2: B };
  },
});
