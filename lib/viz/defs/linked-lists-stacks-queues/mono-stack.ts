// Ported from legacy/src/viz/w04.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  nums: number[];
}

interface Step extends VizStep {
  ans: number[];
  st: number[];
  i?: number;
  popped?: number;
  done?: boolean;
  result?: number[];
}

// ---------- monotonic stack ----------
export default defineViz<Input, Step>('mono-stack', {
  title: 'Next greater element with a monotonic stack of indices',
  inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [2, 1, 5, 3, 6], wide: true }],
  presets: [
    { label: 'Handbook dry run', input: { nums: [2, 1, 5, 3, 6] } },
    { label: 'Decreasing', input: { nums: [5, 4, 3, 2, 1] } },
    { label: 'Equal values', input: { nums: [2, 2, 3] } },
  ],
  legend: [
    ['current', 'i'],
    ['frontier', 'waiting on the stack'],
    ['done', 'answer found'],
  ],
  code: `
function nextGreater(nums) {
  const ans = new Array(nums.length).fill(-1);
  const stack = [];        // indices, values decreasing       //@init
  for (let i = 0; i < nums.length; i++) {                      //@loop
    while (stack.length && nums[stack.at(-1)] < nums[i])       //@while
      ans[stack.pop()] = nums[i];   // i resolves them         //@pop
    stack.push(i);                                             //@push
  }
  return ans;                                                  //@ret
}`,
  validate: ({ nums }) => sizeCheck(nums, 1, 14),
  run({ nums: a }) {
    const ans = new Array(a.length).fill(-1),
      st: number[] = [],
      steps: Step[] = [];
    let ops = 0;
    steps.push({
      ans: [...ans],
      st: [],
      line: 'init',
      note: 'ans starts as −1 everywhere: "no greater element to the right".',
    });
    for (let i = 0; i < a.length; i++) {
      while (st.length && a[st.at(-1)!] < a[i]) {
        const j = st.pop();
        ans[j!] = a[i];
        ops++;
        steps.push({
          i,
          ans: [...ans],
          st: [...st],
          popped: j,
          line: ['while', 'pop'],
          note: `nums[${i}] = ${a[i]} > nums[${j}] = ${a[j!]}: ${a[i]} is the next greater of index ${j}. Pop it.`,
          why: 'Anything smaller than a newer, larger value can never be the next greater for a later index, so it leaves the stack forever.',
        });
      }
      st.push(i);
      ops++;
      steps.push({
        i,
        ans: [...ans],
        st: [...st],
        line: 'push',
        note: `Push index ${i} (value ${a[i]}): it waits for something greater.`,
        why:
          st.length > 1
            ? 'The values of the waiting indices decrease from bottom to top, hence "monotonic".'
            : null,
      });
    }
    steps.push({
      ans,
      st,
      done: true,
      line: 'ret',
      result: ans,
      note: `Indices still on the stack (${st.join(', ') || 'none'}) have no greater element: −1. Result [${ans.join(', ')}].`,
      why: `${ops} pushes and pops for ${a.length} elements: each index is pushed once and popped at most once, so O(n).`,
    });
    return steps;
  },
  view(st, stage, { nums: a }) {
    const states: Record<string, string> = {};
    st.st.forEach((j) => (states[j] = 'frontier'));
    a.forEach((_, j) => {
      if (st.ans[j] !== -1) states[j] = 'done';
    });
    if (st.i != null && !st.done) states[st.i] = 'current';
    stage.append(
      R.cells(a, { states, ptrs: st.i != null && !st.done ? { [st.i]: 'i' } : {}, label: 'nums' }),
    );
    stage.append(
      R.stack(
        st.st.map((j) => 'index ' + j + ' (' + a[j] + ')'),
        { label: 'stack (top at the top)' },
      ),
    );
    stage.append(
      R.cells(st.ans, { states: st.popped != null ? { [st.popped]: 'current' } : {}, label: 'ans' }),
    );
  },
  random: (g) => ({ nums: rarr(g, rint(g, 1, 14), 0, 9) }),
});
