// Ported from legacy/src/viz/w04.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck, addPtr, nodesOf, chain, readList } from './_helpers';

interface Input {
  vals: number[];
}

interface Step extends VizStep {
  next: Record<string, number | null>;
  frames: string[];
  h?: number;
  flipped?: number;
  done?: boolean;
  result?: number[];
  head?: number;
}

export default defineViz<Input, Step>('ll-reverse-rec', {
  title: 'Reverse recursively: trust the call, then fix two pointers',
  inputs: [{ key: 'vals', label: 'list values', type: 'numbers', def: [1, 2, 3, 4], wide: true }],
  presets: [
    { label: '1→2→3→4', input: { vals: [1, 2, 3, 4] } },
    { label: 'Two nodes', input: { vals: [1, 2] } },
  ],
  legend: [
    ['current', 'head of this call'],
    ['done', 'reversed part'],
  ],
  code: `
function reverseListRec(head) {
  if (!head || !head.next) return head;          //@base
  const newHead = reverseListRec(head.next);     //@rec
  head.next.next = head;   // attach head after its old successor  //@attach
  head.next = null;        // head is the new tail                  //@null
  return newHead;                                                   //@ret
}`,
  validate: ({ vals }) => sizeCheck(vals, 1, 7),
  run({ vals }) {
    const n = vals.length,
      next = chain(n),
      steps: Step[] = [],
      frames: string[] = [];
    let newHead: number | null = null;
    const snap = <O extends object>(o: O) => Object.assign({ next: { ...next }, frames: [...frames] }, o);
    function rec(h: number): number {
      frames.push('reverse(' + vals[h] + ')');
      if (next[h] == null) {
        steps.push(
          snap({
            line: 'base',
            h,
            note: `Node ${vals[h]} has no next: it is the last node, so it is the new head. Return it.`,
          }),
        );
        frames.pop();
        return h;
      }
      steps.push(
        snap({
          line: 'rec',
          h,
          note: `reverse(${vals[h]}) first reverses the rest, starting at ${vals[next[h]]}.`,
          why:
            frames.length === 1
              ? 'The contract: the call returns the head of the reversed rest. Node ' +
                vals[h] +
                "'s next still points at the rest's old first node, which will be its tail."
              : null,
        }),
      );
      const nh: number = rec(next[h]);
      newHead = nh;
      const succ = next[h];
      next[succ] = h;
      steps.push(
        snap({
          line: 'attach',
          h,
          flipped: succ,
          note: `Back in reverse(${vals[h]}): node ${vals[succ]} (the rest's new tail) now points to ${vals[h]}.`,
        }),
      );
      next[h] = null;
      steps.push(
        snap({
          line: ['null', 'ret'],
          h,
          note: `Node ${vals[h]}.next = null: it is the tail for now. Return the new head ${vals[nh]}.`,
        }),
      );
      frames.pop();
      return nh;
    }
    const h = rec(0);
    steps.push(
      snap({
        line: null,
        done: true,
        result: readList(next, h, vals),
        head: h,
        note: `Reversed: ${readList(next, h, vals).join(' → ')}.`,
        why: `n frames are on the stack at the deepest point: O(n) space, versus O(1) for the iterative version.`,
      }),
    );
    return steps;
  },
  view(st, stage, { vals }) {
    const ptrs: Record<string, string> = {},
      states: Record<string, string> = {};
    if (st.h != null) {
      addPtr(ptrs, st.h, 'head');
      states[st.h] = 'current';
    }
    if (st.head != null) addPtr(ptrs, st.head, 'newHead');
    const es: Record<string, string> = {};
    if (st.flipped != null) es[st.flipped] = 'current';
    stage.append(R.list(nodesOf(vals), { next: st.next, ptrs, states, edgeStates: es }));
    stage.append(R.frames(st.frames.map((t) => ({ text: t }))));
  },
  random: (g) => ({ vals: rarr(g, rint(g, 1, 7), 0, 9) }),
});
