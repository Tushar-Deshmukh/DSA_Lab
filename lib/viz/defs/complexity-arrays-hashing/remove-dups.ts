// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint, sorted } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  nums: number[];
}

interface Step extends VizStep {
  a: number[];
  write: number;
  read?: number;
  wrote?: number;
  done?: boolean;
  result?: number;
}

// ---------- read/write pointers ----------
export default defineViz<Input, Step>('remove-dups', {
  title: 'Read/write pointers: Remove Duplicates from Sorted Array',
  inputs: [
    { key: 'nums', label: 'nums (sorted)', type: 'numbers', def: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4], wide: true },
  ],
  presets: [
    { label: 'Lesson 2 trace', input: { nums: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4] } },
    { label: 'Handbook example', input: { nums: [1, 1, 2, 3, 3] } },
    { label: 'All equal', input: { nums: [5, 5, 5] } },
    { label: 'No duplicates', input: { nums: [1, 2, 3] } },
  ],
  legend: [
    ['done', 'kept prefix nums[0..write−1]'],
    ['current', 'read'],
    ['compare', 'last kept value'],
  ],
  code: `
function removeDuplicates(nums) {
  if (nums.length === 0) return 0;                  //@empty
  let write = 1;                                    //@init
  for (let read = 1; read < nums.length; read++) {  //@loop
    if (nums[read] !== nums[write - 1]) {           //@cmp
      nums[write] = nums[read];                     //@copy
      write++;                                      //@inc
    }
  }
  return write;                                     //@ret
}`,
  validate: ({ nums }) =>
    sizeCheck(nums, 0, 14) ||
    (nums.every((x, i) => i === 0 || nums[i - 1] <= x) ? null : 'The input must be sorted (non-decreasing).'),
  run({ nums }) {
    const a = [...nums],
      steps: Step[] = [];
    if (!a.length) return [{ line: 'empty', a, write: 0, result: 0, note: 'Empty array: return 0.' }];
    let write = 1;
    steps.push({
      line: 'init',
      a: [...a],
      write,
      note: 'nums[0] is always kept, so the kept prefix starts as nums[0..0] and write = 1.',
      why: 'Invariant: nums[0..write−1] holds the distinct values seen so far, in order.',
    });
    for (let read = 1; read < a.length; read++) {
      if (a[read] !== a[write - 1]) {
        a[write] = a[read];
        write++;
        steps.push({
          line: ['cmp', 'copy', 'inc'],
          a: [...a],
          write,
          read,
          wrote: write - 1,
          note: `nums[${read}] = ${a[read]} differs from the last kept value ${a[write - 2]}: copy it to index ${write - 1}; write = ${write}.`,
          why: 'write ≤ read always, so we only overwrite positions that have already been read.',
        });
      } else
        steps.push({
          line: 'cmp',
          a: [...a],
          write,
          read,
          note: `nums[${read}] = ${a[read]} equals the last kept value nums[${write - 1}]: skip it.`,
          why:
            read === 1
              ? 'Compare with the last *kept* value (nums[write − 1]), not with nums[read − 1]. Here they happen to be equal; on [1,1,2,2] after the first copy they would differ.'
              : null,
        });
    }
    steps.push({
      line: 'ret',
      a: [...a],
      write,
      done: true,
      result: write,
      note: `Return ${write}. The first ${write} slots hold [${a.slice(0, write).join(', ')}]; what follows does not matter.`,
    });
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {};
    for (let i = 0; i < st.write; i++) states[i] = 'done';
    if (!st.done && st.write > 0) states[st.write - 1] = st.wrote === st.write - 1 ? 'current' : 'compare';
    if (st.read != null && !st.done) states[st.read] = 'current';
    const ptrs: Record<string, string | string[]> = {};
    if (!st.done) {
      if (st.read != null) ptrs[st.read] = 'read';
      if (st.write < st.a.length)
        ptrs[st.write] = ptrs[st.write] ? [ptrs[st.write] as string, 'write'] : 'write';
    }
    stage.append(R.cells(st.a, { states, ptrs, label: 'nums' }));
    stage.append(R.vars({ write: st.write, read: st.read ?? '·' }));
  },
  random: (g) => ({ nums: sorted(rarr(g, rint(g, 0, 14), 0, 5)) }),
});
