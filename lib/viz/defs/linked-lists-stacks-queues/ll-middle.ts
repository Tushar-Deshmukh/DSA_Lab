// Ported from legacy/src/viz/w04.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck, addPtr, nodesOf, chain } from './_helpers';

interface Input {
  vals: number[];
}

interface Step extends VizStep {
  slow: number;
  fast: number | null;
  done?: boolean;
  result?: number;
}

// ---------- fast and slow pointers ----------
export default defineViz<Input, Step>('ll-middle', {
  title: 'Middle of a list: fast moves two, slow moves one',
  inputs: [{ key: 'vals', label: 'list values', type: 'numbers', def: [1, 2, 3, 4, 5], wide: true }],
  presets: [
    { label: 'Odd length', input: { vals: [1, 2, 3, 4, 5] } },
    { label: 'Even length (second middle)', input: { vals: [1, 2, 3, 4, 5, 6] } },
    { label: 'One node', input: { vals: [1] } },
  ],
  legend: [
    ['current', 'slow'],
    ['frontier', 'fast'],
  ],
  code: `
function middleNode(head) {
  let slow = head, fast = head;          //@init
  while (fast && fast.next) {            //@loop
    slow = slow.next;                    //@slow
    fast = fast.next.next;               //@fast
  }
  return slow;                           //@ret
}`,
  validate: ({ vals }) => sizeCheck(vals, 1, 9),
  run({ vals }) {
    const n = vals.length,
      steps: Step[] = [];
    let slow = 0,
      fast: number | null = 0;
    steps.push({ slow, fast, line: 'init', note: 'Both start at the head.' });
    while (fast != null && fast + 1 < n) {
      slow++;
      fast = fast + 2 < n ? fast + 2 : null;
      steps.push({
        slow,
        fast,
        line: ['loop', 'slow', 'fast'],
        note: `slow → node ${vals[slow]}, fast → ${fast == null ? 'null' : 'node ' + vals[fast]}.`,
        why:
          steps.length === 1
            ? 'fast has always travelled twice as far as slow, so when fast reaches the end, slow is halfway.'
            : null,
      });
    }
    steps.push({
      slow,
      fast,
      line: 'ret',
      done: true,
      result: vals[slow],
      note: `${fast == null ? 'fast is null' : 'fast.next is null'}: stop. slow is at node ${vals[slow]} (index ${slow}).`,
      why:
        n % 2 === 0
          ? 'For even length this gives the second of the two middles; `while (fast.next && fast.next.next)` would give the first.'
          : 'One pass, O(1) space: no need to count the length first.',
    });
    return steps;
  },
  view(st, stage, { vals }) {
    const ptrs: Record<string, string | string[]> = {},
      states: Record<string, string> = {};
    addPtr(ptrs, st.slow, 'slow');
    addPtr(ptrs, st.fast, 'fast');
    states[st.slow] = 'current';
    if (st.fast != null && st.fast !== st.slow) states[st.fast] = 'frontier';
    stage.append(
      R.list(nodesOf(vals), {
        next: chain(vals.length),
        ptrs,
        states,
        nullPtrs: st.fast == null ? ['fast'] : [],
      }),
    );
  },
  random: (g) => ({ vals: rarr(g, rint(g, 1, 9), 0, 9) }),
});
