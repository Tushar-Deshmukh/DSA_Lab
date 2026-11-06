// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
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
  write: number;
  read?: number;
  sw?: number[];
  done?: boolean;
  result?: number[];
}

export default defineViz<Input, Step>('move-zeroes', {
  title: 'Read/write pointers with swaps: Move Zeroes',
  inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [0, 1, 0, 3, 12], wide: true }],
  presets: [
    { label: 'LeetCode example', input: { nums: [0, 1, 0, 3, 12] } },
    { label: 'No zeros', input: { nums: [1, 2, 3] } },
    { label: 'All zeros', input: { nums: [0, 0, 0] } },
  ],
  legend: [
    ['done', 'non-zeros, in order: [0, write)'],
    ['current', 'read'],
    ['compare', 'swapped'],
  ],
  code: `
function moveZeroes(nums) {
  let write = 0;                                       //@init
  for (let read = 0; read < nums.length; read++) {     //@loop
    if (nums[read] !== 0) {                            //@cmp
      [nums[write], nums[read]] = [nums[read], nums[write]];  //@swap
      write++;                                         //@inc
    }
  }
}`,
  validate: ({ nums }) => sizeCheck(nums, 1, 14),
  run({ nums }) {
    const a = [...nums],
      steps: Step[] = [];
    let write = 0;
    steps.push({
      line: 'init',
      a: [...a],
      write,
      note: 'write = 0: no non-zero values placed yet.',
      why: 'Invariant: [0, write) holds the non-zeros seen so far in their original order; [write, read) holds only zeros.',
    });
    for (let read = 0; read < a.length; read++) {
      if (a[read] !== 0) {
        const same = write === read;
        [a[write], a[read]] = [a[read], a[write]];
        write++;
        steps.push({
          line: ['cmp', 'swap', 'inc'],
          a: [...a],
          write,
          read,
          sw: [write - 1, read],
          note: same
            ? `nums[${read}] = ${a[write - 1]} is non-zero and already in place (write = read); write = ${write}.`
            : `nums[${read}] = ${a[write - 1]} is non-zero: swap it with the zero at index ${write - 1}; write = ${write}.`,
        });
      } else
        steps.push({
          line: 'cmp',
          a: [...a],
          write,
          read,
          note: `nums[${read}] = 0: leave it; it will be pushed right by later swaps.`,
        });
    }
    steps.push({
      line: null,
      a: [...a],
      write,
      done: true,
      result: [...a],
      note: `Done: [${a.join(', ')}].`,
      why: 'One pass, O(n) time, O(1) space, and the non-zeros keep their relative order (the problem requires it).',
    });
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {};
    for (let i = 0; i < st.write; i++) states[i] = 'done';
    if (st.sw && st.sw[0] !== st.sw[1]) {
      states[st.sw[0]] = 'compare';
      states[st.sw[1]] = 'compare';
    } else if (st.read != null && !st.done) states[st.read] = 'current';
    const ptrs: Record<string, string | string[]> = {};
    if (!st.done) {
      if (st.read != null) ptrs[st.read] = 'read';
      if (st.write < st.a.length)
        ptrs[st.write] = ptrs[st.write] ? [ptrs[st.write] as string, 'write'] : 'write';
    }
    stage.append(R.cells(st.a, { states, ptrs, label: 'nums' }));
    stage.append(R.vars({ write: st.write, read: st.read ?? '·' }));
  },
  random: (g) => ({ nums: rarr(g, rint(g, 1, 14), 0, 3) }),
});
