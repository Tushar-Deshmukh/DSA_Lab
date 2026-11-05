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
  prev: number | null;
  cur: number | null;
  nx?: number | null;
  flipped?: number;
  done?: boolean;
  result?: number[];
}

// ---------- reversal ----------
export default defineViz<Input, Step>('ll-reverse', {
  title: 'Reverse a linked list: save, point back, advance',
  inputs: [{ key: 'vals', label: 'list values', type: 'numbers', def: [1, 2, 3, 4], wide: true }],
  presets: [
    { label: '1→2→3→4', input: { vals: [1, 2, 3, 4] } },
    { label: 'Handbook dry run', input: { vals: [1, 2, 3] } },
    { label: 'One node', input: { vals: [7] } },
  ],
  legend: [
    ['current', 'cur'],
    ['done', 'already reversed (prev side)'],
  ],
  code: `
function reverseList(head) {
  let prev = null, cur = head;          //@init
  while (cur) {                         //@loop
    const next = cur.next;  // 1. save  //@save
    cur.next = prev;        // 2. back  //@back
    prev = cur;             // 3.       //@prev
    cur = next;             // 4.       //@cur
  }
  return prev;              // new head //@ret
}`,
  validate: ({ vals }) => sizeCheck(vals, 1, 8),
  run({ vals }) {
    const n = vals.length,
      next = chain(n),
      steps: Step[] = [];
    let prev: number | null = null,
      cur = 0;
    const snap = <O extends object>(o: O) => Object.assign({ next: { ...next }, prev, cur }, o);
    steps.push(snap({ line: 'init', note: 'prev = null (the reversed part is empty), cur = head.' }));
    while (cur != null) {
      const nx = next[cur];
      steps.push(
        snap({
          line: 'save',
          nx,
          note: `Save next = ${nx == null ? 'null' : 'node ' + vals[nx]} before touching cur.next.`,
          why:
            cur === 0
              ? 'Once cur.next is overwritten, this is the only reference to the rest of the list.'
              : null,
        }),
      );
      next[cur] = prev;
      steps.push(
        snap({
          line: 'back',
          nx,
          flipped: cur,
          note: `Point node ${vals[cur]} back to ${prev == null ? 'null' : 'node ' + vals[prev]}.`,
          why:
            cur === 0
              ? 'The old head becomes the tail, so its next must be null; otherwise the list would contain a cycle.'
              : null,
        }),
      );
      prev = cur;
      cur = nx!;
      steps.push(
        snap({
          line: ['prev', 'cur'],
          note: `Advance: prev = node ${vals[prev]}, cur = ${cur == null ? 'null' : 'node ' + vals[cur]}.`,
        }),
      );
    }
    const res = readList(next, prev, vals);
    steps.push(
      snap({
        line: 'ret',
        done: true,
        result: res,
        note: `cur is null: return prev, node ${vals[prev!]}. List: ${res.join(' → ')}.`,
        why: 'Each node is rewired exactly once: O(n) time, O(1) extra space.',
      }),
    );
    return steps;
  },
  view(st, stage, { vals }) {
    const ptrs: Record<string, string> = {},
      states: Record<string, string> = {};
    addPtr(ptrs, st.prev, 'prev');
    addPtr(ptrs, st.cur, 'cur');
    if (!st.done) addPtr(ptrs, st.nx, 'next');
    vals.forEach((_, i) => {
      if (st.prev != null && i <= st.prev) states[i] = 'done';
    });
    if (st.cur != null) states[st.cur] = 'current';
    const es: Record<string, string> = {};
    if (st.flipped != null) es[st.flipped] = 'current';
    stage.append(
      R.list(nodesOf(vals), {
        next: st.next,
        ptrs,
        states,
        edgeStates: es,
        nullPtrs: st.cur == null && !st.done ? ['cur'] : st.done ? ['cur'] : [],
        label: 'nodes stay in place; only the arrows change',
      }),
    );
    stage.append(
      R.vars({ prev: st.prev == null ? 'null' : vals[st.prev], cur: st.cur == null ? 'null' : vals[st.cur] }),
    );
  },
  random: (g) => ({ vals: rarr(g, rint(g, 1, 8), 0, 9) }),
});
