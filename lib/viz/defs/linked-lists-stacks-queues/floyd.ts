// Ported from legacy/src/viz/w04.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck, addPtr, nodesOf } from './_helpers';

interface Input {
  vals: number[];
  pos: number;
}

interface Step extends VizStep {
  next: Record<string, number | null>;
  slow: number;
  fast?: number | null;
  meet?: number;
  p?: number;
  start?: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('floyd', {
  title: "Floyd's cycle detection, then the cycle start",
  inputs: [
    { key: 'vals', label: 'list values', type: 'numbers', def: [3, 2, 0, -4, 7, 9], wide: true },
    { key: 'pos', label: 'tail links to index (−1 = no cycle)', type: 'int', def: 2 },
  ],
  presets: [
    { label: '6 nodes, cycle of 4', input: { vals: [3, 2, 0, -4, 7, 9], pos: 2 } },
    { label: 'LeetCode example 1', input: { vals: [3, 2, 0, -4], pos: 1 } },
    { label: 'No cycle', input: { vals: [1, 2, 3], pos: -1 } },
    { label: 'Self-loop', input: { vals: [1], pos: 0 } },
  ],
  legend: [
    ['current', 'slow'],
    ['frontier', 'fast'],
    ['done', 'meeting point / cycle start'],
  ],
  code: `
function detectCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {                    //@loop
    slow = slow.next; fast = fast.next.next;     //@step
    if (slow === fast) {                         //@meet
      let p = head;                              //@phase2
      while (p !== slow) { p = p.next; slow = slow.next; }  //@walk
      return p;               // cycle start     //@start
    }
  }
  return null;                // no cycle        //@none
}`,
  validate: ({ vals, pos }) =>
    sizeCheck(vals, 1, 8) || (pos < -1 || pos >= vals.length ? 'pos must be −1 or a valid index.' : null),
  run({ vals, pos }) {
    const n = vals.length,
      nxt = (i: number) => (i + 1 < n ? i + 1 : pos >= 0 ? pos : null),
      steps: Step[] = [];
    let slow = 0,
      fast = 0,
      k = 0;
    const next = Object.fromEntries(vals.map((_, i) => [i, nxt(i)]));
    steps.push({
      next,
      slow,
      fast,
      line: 'loop',
      note:
        pos >= 0
          ? `The tail (node ${vals[n - 1]}) links back to index ${pos}: a cycle of length ${n - pos}.`
          : 'The tail links to null: no cycle.',
    });
    while (fast != null && nxt(fast) != null) {
      slow = nxt(slow)!;
      fast = nxt(nxt(fast)!)!;
      k++;
      if (fast != null && slow === fast) {
        steps.push({
          next,
          slow,
          fast,
          meet: slow,
          line: ['step', 'meet'],
          note: `Step ${k}: slow and fast meet at node ${vals[slow]} (index ${slow}).`,
          why: 'Inside the cycle fast gains exactly one node per step on slow, so the gap closes to 0 within one lap: it cannot jump over slow.',
        });
        let p = 0;
        steps.push({
          next,
          slow,
          p,
          meet: slow,
          line: 'phase2',
          note: 'Phase 2: put p at the head; move p and slow one step at a time.',
          why: 'If the head is a steps from the cycle start and they met b steps into a cycle of length c, then 2(a + b) = a + b + kc, so a = kc − b: walking a steps from the meeting point reaches the start.',
        });
        while (p !== slow) {
          p = nxt(p)!;
          slow = nxt(slow)!;
          steps.push({ next, slow, p, line: 'walk', note: `p → ${vals[p]}, slow → ${vals[slow]}.` });
        }
        steps.push({
          next,
          slow,
          p,
          start: p,
          line: 'start',
          done: true,
          result: p,
          note: `They meet at index ${p} (value ${vals[p]}): the cycle starts here.`,
        });
        return steps;
      }
      steps.push({
        next,
        slow,
        fast,
        line: 'step',
        note: `Step ${k}: slow → index ${slow}, fast → ${fast == null ? 'null' : 'index ' + fast}.`,
      });
    }
    steps.push({
      next,
      slow,
      fast,
      line: 'none',
      done: true,
      result: -1,
      note: 'fast reached the end: there is no cycle.',
      why: 'O(n) time, O(1) space, against O(n) space for a Set of visited nodes.',
    });
    return steps;
  },
  view(st, stage, { vals }) {
    const ptrs: Record<string, string | string[]> = {},
      states: Record<string, string> = {};
    if (st.p != null) addPtr(ptrs, st.p, 'p');
    addPtr(ptrs, st.slow, 'slow');
    if (st.fast != null && st.p == null) addPtr(ptrs, st.fast, 'fast');
    if (st.slow != null) states[st.slow] = 'current';
    if (st.fast != null && st.p == null) states[st.fast] = 'frontier';
    if (st.p != null) states[st.p] = 'frontier';
    if (st.meet != null) states[st.meet] = 'done';
    if (st.start != null) states[st.start] = 'done';
    stage.append(
      R.list(nodesOf(vals), {
        next: st.next,
        ptrs,
        states,
        nullPtrs: st.fast === null && st.p == null ? ['fast'] : [],
      }),
    );
  },
  random: (g) => {
    const n = rint(g, 1, 8);
    return { vals: rarr(g, n, -9, 9), pos: rint(g, -1, n - 1) };
  },
});
