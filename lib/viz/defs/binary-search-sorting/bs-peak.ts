// Ported from legacy/src/viz/w03.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck, ptrsOf } from './_helpers';

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

export default defineViz<Input, Step>('bs-peak', {
  title: 'Find a peak: walk uphill by halves',
  inputs: [
    {
      key: 'nums',
      label: 'nums (neighbours distinct)',
      type: 'numbers',
      def: [1, 2, 1, 3, 5, 6, 4],
      wide: true,
    },
  ],
  presets: [
    { label: 'LeetCode example 2', input: { nums: [1, 2, 1, 3, 5, 6, 4] } },
    { label: 'LeetCode example 1', input: { nums: [1, 2, 3, 1] } },
    { label: 'Increasing', input: { nums: [1, 2, 3, 4, 5] } },
    { label: 'Decreasing', input: { nums: [5, 4, 3, 2, 1] } },
  ],
  legend: [
    ['window', 'range [lo, hi]'],
    ['current', 'mid'],
    ['compare', 'mid + 1'],
    ['done', 'peak'],
  ],
  code: `
function findPeakElement(nums) {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {                                           //@loop
    const mid = lo + ((hi - lo) >> 1);                        //@mid
    if (nums[mid] < nums[mid + 1]) lo = mid + 1;  // uphill → //@up
    else hi = mid;                    // mid is a peak or ←   //@down
  }
  return lo;                                                  //@ret
}`,
  validate: ({ nums }) =>
    sizeCheck(nums, 1, 14) ||
    (nums.some((x, i) => i && x === nums[i - 1])
      ? 'Neighbouring values must differ (the problem guarantees it).'
      : null),
  run({ nums: a }) {
    const steps: Step[] = [];
    let lo = 0,
      hi = a.length - 1;
    while (lo < hi) {
      const mid = lo + ((hi - lo) >> 1);
      if (a[mid] < a[mid + 1]) {
        steps.push({
          lo,
          hi,
          mid,
          line: ['mid', 'up'],
          note: `nums[${mid}] = ${a[mid]} < nums[${mid + 1}] = ${a[mid + 1]}: uphill to the right → lo = ${mid + 1}.`,
          why: 'Keep walking up to the right: either it keeps rising until the end (the last element is a peak, since nums[n] = −∞) or it falls somewhere, and the top before the fall is a peak. So a peak exists in [mid + 1, hi].',
        });
        lo = mid + 1;
      } else {
        steps.push({
          lo,
          hi,
          mid,
          line: ['mid', 'down'],
          note: `nums[${mid}] = ${a[mid]} > nums[${mid + 1}] = ${a[mid + 1]}: downhill to the right → hi = ${mid}.`,
          why: 'By the mirror argument a peak exists in [lo, mid]; mid itself may be it, so keep it.',
        });
        hi = mid;
      }
    }
    steps.push({
      lo,
      hi,
      done: true,
      line: 'ret',
      result: lo,
      note: `lo = hi = ${lo}: nums[${lo}] = ${a[lo]} is a peak.`,
      why: 'The array is not sorted, yet binary search works: what matters is a rule that keeps a guaranteed answer inside the range.',
    });
    return steps;
  },
  view(st, stage, { nums: a }) {
    const off = Math.min(0, ...a);
    const states: Record<string, string> = {};
    a.forEach((_, i) => {
      if (i < st.lo || i > st.hi) states[i] = 'dim';
    });
    if (st.mid != null) {
      states[st.mid] = 'current';
      states[st.mid + 1] = 'compare';
    }
    if (st.done) states[st.lo] = 'done';
    stage.append(
      R.bars(
        a.map((x) => x - off),
        {
          states,
          ptrs: ptrsOf([
            [st.lo, 'lo'],
            [st.hi, 'hi'],
            [st.done ? null : st.mid, 'mid'],
          ]),
          label: 'nums as heights',
        },
      ),
    );
  },
  random: (g) => {
    const a = [rint(g, 0, 9)];
    const n = rint(g, 1, 14);
    while (a.length < n) {
      const x = rint(g, 0, 9);
      if (x !== a.at(-1)) a.push(x);
    }
    return { nums: a };
  },
});
