// Ported from legacy/src/viz/w03.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint, sorted } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck, isSorted, ptrsOf } from './_helpers';

interface Input {
  nums: number[];
  target: number;
}

interface Step extends VizStep {
  lo: number;
  hi: number;
  mid?: number;
  found?: number;
  result?: number;
  done?: boolean;
}

export default defineViz<Input, Step>('bs-closed', {
  title: 'Exact search with a closed interval [lo, hi] (problem 704)',
  inputs: [
    { key: 'nums', label: 'nums (sorted)', type: 'numbers', def: [-1, 0, 3, 5, 9, 12], wide: true },
    { key: 'target', label: 'target', type: 'number', def: 9 },
  ],
  presets: [
    { label: 'LeetCode example 1', input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 } },
    { label: 'LeetCode example 2 (absent)', input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 } },
    { label: 'One element', input: { nums: [5], target: 5 } },
  ],
  legend: [
    ['window', 'range [lo, hi]'],
    ['current', 'mid'],
    ['done', 'found'],
  ],
  code: `
function search(nums, target) {
  let lo = 0, hi = nums.length - 1;           //@init
  while (lo <= hi) {                          //@loop
    const mid = lo + ((hi - lo) >> 1);        //@mid
    if (nums[mid] === target) return mid;     //@hit
    if (nums[mid] < target) lo = mid + 1;     //@right
    else hi = mid - 1;                        //@left
  }
  return -1;                                  //@none
}`,
  validate: ({ nums }) =>
    sizeCheck(nums, 1, 14) || (isSorted(nums) ? null : 'Binary search needs sorted input.'),
  run({ nums: a, target }) {
    const steps: Step[] = [];
    let lo = 0,
      hi = a.length - 1;
    steps.push({
      lo,
      hi,
      line: 'init',
      note: 'Closed range [0, n − 1]: every index in it is still a candidate.',
    });
    while (lo <= hi) {
      const mid = lo + ((hi - lo) >> 1);
      if (a[mid] === target) {
        steps.push({
          lo,
          hi,
          mid,
          found: mid,
          line: ['mid', 'hit'],
          result: mid,
          note: `nums[${mid}] = ${a[mid]} = target: return ${mid}.`,
        });
        return steps;
      }
      if (a[mid] < target) {
        steps.push({
          lo,
          hi,
          mid,
          line: ['mid', 'right'],
          note: `nums[${mid}] = ${a[mid]} < ${target}: the target can only be right of mid → lo = ${mid + 1}.`,
          why: 'mid has been checked and is not the target, so it is excluded: mid + 1.',
        });
        lo = mid + 1;
      } else {
        steps.push({
          lo,
          hi,
          mid,
          line: ['mid', 'left'],
          note: `nums[${mid}] = ${a[mid]} > ${target}: hi = ${mid - 1}.`,
          why: 'Closed intervals exclude mid on both sides; that is why this convention uses mid − 1 and lo <= hi.',
        });
        hi = mid - 1;
      }
    }
    steps.push({
      lo,
      hi,
      line: 'none',
      result: -1,
      done: true,
      note: `lo (${lo}) > hi (${hi}): the range is empty. Return −1.`,
    });
    return steps;
  },
  view(st, stage, { nums: a }) {
    const states: Record<string, string> = {};
    a.forEach((_, i) => {
      if (i < st.lo || i > st.hi) states[i] = 'dim';
    });
    if (st.mid != null) states[st.mid] = st.found != null ? 'done' : 'current';
    stage.append(
      R.cells(a, {
        states,
        window: st.lo <= st.hi ? [st.lo, st.hi] : null,
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
  random: (g) => ({ nums: [...new Set(sorted(rarr(g, rint(g, 1, 14), -9, 20)))], target: rint(g, -10, 21) }),
});
