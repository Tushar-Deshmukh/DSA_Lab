// Ported from legacy/src/viz/w02.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  nums: number[];
}

interface Step extends VizStep {
  a: number[];
  low: number;
  mid: number;
  high: number;
  result?: number[];
}

export default defineViz<Input, Step>('dutch-flag', {
  title: 'Dutch national flag: three-way partition in one pass',
  inputs: [{ key: 'nums', label: 'nums (0, 1 or 2)', type: 'numbers', def: [2, 0, 2, 1, 1, 0], wide: true }],
  presets: [
    { label: 'Handbook trace', input: { nums: [2, 0, 2, 1, 1, 0] } },
    { label: 'Already sorted', input: { nums: [0, 0, 1, 2, 2] } },
    { label: 'Reversed', input: { nums: [2, 2, 1, 0, 0] } },
    { label: 'One value', input: { nums: [1] } },
  ],
  legend: [
    ['done', '0s: [0, low)'],
    ['window', '1s: [low, mid)'],
    ['frontier', '2s: (high, n−1]'],
    ['current', 'mid (being classified)'],
  ],
  code: `
function sortColors(nums) {
  let low = 0, mid = 0, high = nums.length - 1;          //@init
  while (mid <= high) {                                  //@loop
    if (nums[mid] === 0) {                               //@is0
      [nums[low], nums[mid]] = [nums[mid], nums[low]];   //@swap0
      low++; mid++;                                      //@adv0
    } else if (nums[mid] === 1) {                        //@is1
      mid++;                                             //@adv1
    } else {                                             //@is2
      [nums[mid], nums[high]] = [nums[high], nums[mid]]; //@swap2
      high--;                                            //@dec2
    }
  }
}`,
  validate: ({ nums }) =>
    sizeCheck(nums, 1, 14) ||
    (nums.every((x) => x === 0 || x === 1 || x === 2) ? null : 'Use only 0, 1 and 2.'),
  run({ nums }) {
    const a = [...nums];
    const steps: Step[] = [];
    let low = 0,
      mid = 0,
      high = a.length - 1;
    const snap = <O extends object>(o: O) => Object.assign({ a: [...a], low, mid, high }, o);
    steps.push(
      snap({
        line: 'init',
        note: 'Everything is "unknown" ([mid, high]). Regions grow until the unknown region is empty.',
        why: 'Invariant: [0, low) = 0s, [low, mid) = 1s, (high, n−1] = 2s.',
      }),
    );
    while (mid <= high) {
      const v = a[mid];
      if (v === 0) {
        [a[low], a[mid]] = [a[mid], a[low]];
        const note =
          low === mid
            ? `nums[mid] = 0 and low = mid: the swap does nothing; advance both.`
            : `nums[mid] = 0: swap it with nums[low] (a 1), then advance low and mid.`;
        low++;
        mid++;
        steps.push(
          snap({
            line: ['is0', 'swap0', 'adv0'],
            note,
            why: 'The value coming back from low is already classified (a 1, or the same 0), so mid may move on.',
          }),
        );
      } else if (v === 1) {
        mid++;
        steps.push(
          snap({ line: ['is1', 'adv1'], note: 'nums[mid] = 1: it is already in the 1s region; mid++.' }),
        );
      } else {
        [a[mid], a[high]] = [a[high], a[mid]];
        high--;
        steps.push(
          snap({
            line: ['is2', 'swap2', 'dec2'],
            note: `nums[mid] = 2: swap it to position ${high + 1} and shrink high. mid stays: the value that came back (${a[mid]}) is unchecked.`,
            why: 'Advancing mid here is the classic bug: an unexamined 0 or 2 would be left in the 1s region.',
          }),
        );
      }
    }
    steps.push(
      snap({
        result: [...a],
        line: 'loop',
        note: `mid > high: unknown region is empty. Result: [${a.join(', ')}].`,
        why: 'Each step either grows a classified region or shrinks the unknown one: at most n steps, O(n) time, O(1) space.',
      }),
    );
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {},
      ptrs: Record<string, string | string[]> = {};
    st.a.forEach((_, i) => {
      if (i < st.low) states[i] = 'done';
      else if (i < st.mid) states[i] = 'window';
      else if (i > st.high) states[i] = 'frontier';
    });
    if (st.mid <= st.high) states[st.mid] = 'current';
    const add = (i: number, lab: string) => {
      if (i < 0 || i >= st.a.length) return;
      ptrs[i] = ptrs[i] ? ([] as string[]).concat(ptrs[i], lab) : lab;
    };
    add(st.low, 'low');
    add(st.mid, 'mid');
    add(st.high, 'high');
    stage.append(R.cells(st.a, { states, ptrs, label: 'nums' }));
    stage.append(
      R.vars({ low: st.low, mid: st.mid, high: st.high, unknown: Math.max(0, st.high - st.mid + 1) }),
    );
  },
  random: (g) => ({ nums: rarr(g, rint(g, 1, 14), 0, 2) }),
});
