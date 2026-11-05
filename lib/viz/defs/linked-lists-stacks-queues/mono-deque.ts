// Ported from legacy/src/viz/w04.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  nums: number[];
  k: number;
}

interface Step extends VizStep {
  i: number | null;
  dq: number[];
  res: number[];
  done?: boolean;
  result?: number[];
}

export default defineViz<Input, Step>('mono-deque', {
  title: 'Sliding window maximum with a monotonic deque',
  inputs: [
    { key: 'nums', label: 'nums', type: 'numbers', def: [1, 3, -1, -3, 5, 3, 6, 7], wide: true },
    { key: 'k', label: 'k', type: 'int', def: 3 },
  ],
  presets: [
    { label: 'Handbook dry run', input: { nums: [1, 3, -1, -3, 5, 3, 6, 7], k: 3 } },
    { label: 'k = 1', input: { nums: [4, 2, 5], k: 1 } },
    { label: 'Decreasing', input: { nums: [9, 7, 5, 3, 1], k: 2 } },
  ],
  legend: [
    ['window', 'current window'],
    ['frontier', 'in the deque'],
    ['current', 'i'],
    ['done', 'window maximum'],
  ],
  code: `
function maxSlidingWindow(nums, k) {
  const dq = []; let head = 0; const res = [];
  for (let i = 0; i < nums.length; i++) {
    if (head < dq.length && dq[head] <= i - k) head++;   // left the window  //@expire
    while (dq.length > head && nums[dq.at(-1)] <= nums[i]) dq.pop();         //@popback
    dq.push(i);                                                              //@push
    if (i >= k - 1) res.push(nums[dq[head]]);            // front = max      //@max
  }
  return res;
}`,
  validate: ({ nums, k }) =>
    sizeCheck(nums, 1, 14) || (k < 1 || k > nums.length ? 'k must be between 1 and n.' : null),
  run({ nums: a, k }) {
    const dq: number[] = [],
      res: number[] = [],
      steps: Step[] = [];
    let head = 0;
    for (let i = 0; i < a.length; i++) {
      const notes: string[] = [];
      if (head < dq.length && dq[head] <= i - k) {
        notes.push(`index ${dq[head]} left the window`);
        head++;
      }
      const popped: number[] = [];
      while (dq.length > head && a[dq.at(-1)!] <= a[i]) popped.push(dq.pop()!);
      if (popped.length)
        notes.push(
          `popped ${popped.map((j) => a[j]).join(', ')} from the back (≤ ${a[i]}, can never be a maximum again)`,
        );
      dq.push(i);
      if (i >= k - 1) res.push(a[dq[head]]);
      steps.push({
        i,
        dq: dq.slice(head),
        res: [...res],
        line: ['expire', 'popback', 'push', ...(i >= k - 1 ? ['max'] : [])],
        note: `i = ${i} (${a[i]}): ${notes.length ? notes.join('; ') + '; ' : ''}push ${i}.${i >= k - 1 ? ' Window max = front = ' + a[dq[head]] + '.' : ' Window not full yet.'}`,
        why:
          i === 0
            ? 'Deque values decrease from front to back, so the front is always the largest value still inside the window.'
            : null,
      });
    }
    steps.push({
      i: null,
      dq: dq.slice(head),
      res,
      done: true,
      line: null,
      result: res,
      note: `Maxima: [${res.join(', ')}].`,
      why: 'Each index is pushed once and removed at most once: O(n), against O(n·k) for scanning every window.',
    });
    return steps;
  },
  view(st, stage, { nums: a, k }) {
    const states: Record<string, string> = {};
    st.dq.forEach((j) => (states[j] = 'frontier'));
    if (st.i != null) {
      states[st.i] = 'current';
      if (st.i >= k - 1) states[st.dq[0]] = 'done';
    }
    stage.append(
      R.cells(a, { states, window: st.i != null ? [Math.max(0, st.i - k + 1), st.i] : null, label: 'nums' }),
    );
    stage.append(
      R.queue(
        st.dq.map((j) => a[j] + ' (i=' + j + ')'),
        { label: 'deque (front on the left)' },
      ),
    );
    stage.append(R.cells(st.res, { label: 'window maxima' }));
  },
  random: (g) => {
    const a = rarr(g, rint(g, 1, 14), -9, 9);
    return { nums: a, k: rint(g, 1, a.length) };
  },
});
