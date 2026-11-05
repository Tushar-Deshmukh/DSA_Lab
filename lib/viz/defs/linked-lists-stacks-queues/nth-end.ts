// Ported from legacy/src/viz/w04.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck, addPtr, chain, readList } from './_helpers';

interface Input {
  vals: number[];
  n: number;
}

interface Step extends VizStep {
  next: Record<string, number | null | undefined>;
  slow: number;
  fast: number | null;
  removed?: number;
  done?: boolean;
  result?: number[];
}

export default defineViz<Input, Step>('nth-end', {
  title: 'Remove the n-th node from the end: a gap of n + 1 behind a dummy',
  inputs: [
    { key: 'vals', label: 'list values', type: 'numbers', def: [1, 2, 3, 4, 5], wide: true },
    { key: 'n', label: 'n', type: 'int', def: 2 },
  ],
  presets: [
    { label: 'LeetCode example 1', input: { vals: [1, 2, 3, 4, 5], n: 2 } },
    { label: 'Remove the head', input: { vals: [1, 2], n: 2 } },
    { label: 'Single node', input: { vals: [1], n: 1 } },
  ],
  legend: [
    ['current', 'slow'],
    ['frontier', 'fast'],
    ['error', 'removed'],
  ],
  code: `
function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head);
  let slow = dummy, fast = dummy;                         //@init
  for (let i = 0; i <= n; i++) fast = fast.next;          //@gap
  while (fast) { slow = slow.next; fast = fast.next; }    //@walk
  slow.next = slow.next.next;      // unlink the target   //@unlink
  return dummy.next;                                      //@ret
}`,
  validate: ({ vals, n }) =>
    sizeCheck(vals, 1, 8) || (n < 1 || n > vals.length ? 'n must be between 1 and the list length.' : null),
  run({ vals, n }) {
    const all = ['D', ...vals],
      L = all.length,
      steps: Step[] = [];
    let slow = 0,
      fast: number | null = 0;
    const next: Record<string, number | null | undefined> = chain(L);
    steps.push({
      next: { ...next },
      slow,
      fast,
      line: 'init',
      note: 'Both start at the dummy (D), which sits before the head.',
      why: 'If the head itself is removed, slow must stop at the node before it: the dummy.',
    });
    for (let i = 0; i <= n; i++) {
      fast = fast! + 1 < L ? fast! + 1 : null;
      steps.push({
        next: { ...next },
        slow,
        fast,
        line: 'gap',
        note: `Move fast ${i + 1} of ${n + 1} steps → ${fast == null ? 'null' : all[fast]}.`,
      });
    }
    while (fast != null) {
      slow++;
      fast = fast + 1 < L ? fast + 1 : null;
      steps.push({
        next: { ...next },
        slow,
        fast,
        line: 'walk',
        note: `slow → ${all[slow]}, fast → ${fast == null ? 'null' : all[fast]}.`,
        why:
          fast == null
            ? `fast is null, n + 1 = ${n + 1} nodes ahead of slow, so slow.next is the n-th node from the end.`
            : null,
      });
    }
    const target = slow + 1;
    next[slow] = next[target];
    next[target] = undefined;
    const res = readList(next, next[0]!, all);
    steps.push({
      next: { ...next },
      slow,
      fast,
      removed: target,
      line: ['unlink', 'ret'],
      done: true,
      result: res,
      note: `Unlink node ${all[target]}: slow.next = slow.next.next. Return dummy.next → ${res.length ? res.join(' → ') : 'empty list'}.`,
      why: 'One pass, O(1) space. The gap of n + 1 (not n) is what leaves slow before the target.',
    });
    return steps;
  },
  view(
    st: {
      next: Record<string, number | null | undefined>;
      slow: number;
      fast: number | null;
      line?: VizStep['line'];
      note?: string;
      why?: string | null;
      removed?: number;
      done?: boolean;
      result?: number[];
    },
    stage,
    { vals },
  ) {
    const all = ['D', ...vals];
    const ptrs: Record<string, string | string[]> = {},
      states: Record<string, string> = { 0: 'dim' };
    addPtr(ptrs, st.slow, 'slow');
    addPtr(ptrs, st.fast, 'fast');
    states[st.slow] = 'current';
    if (st.fast != null) states[st.fast] = 'frontier';
    if (st.removed != null) states[st.removed] = 'error';
    stage.append(
      R.list(
        all.map((v, i) => ({ id: i, val: v })),
        { next: st.next, ptrs, states, nullPtrs: st.fast == null ? ['fast'] : [], label: 'D = dummy node' },
      ),
    );
  },
  random: (g) => {
    const v = rarr(g, rint(g, 1, 8), 0, 9);
    return { vals: v, n: rint(g, 1, v.length) };
  },
});
