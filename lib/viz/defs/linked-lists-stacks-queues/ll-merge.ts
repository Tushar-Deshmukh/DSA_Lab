// Ported from legacy/src/viz/w04.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint, sorted } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  a: number[];
  b: number[];
}

interface Step extends VizStep {
  i: number;
  j: number;
  out: [string, number, number][];
  cmp?: number[];
  done?: boolean;
  result?: number[];
}

// ---------- merge with a dummy node ----------
export default defineViz<Input, Step>('ll-merge', {
  title: 'Merge two sorted lists behind a dummy node',
  inputs: [
    { key: 'a', label: 'list1 (sorted)', type: 'numbers', def: [1, 2, 4] },
    { key: 'b', label: 'list2 (sorted)', type: 'numbers', def: [1, 3, 4] },
  ],
  presets: [
    { label: 'LeetCode example 1', input: { a: [1, 2, 4], b: [1, 3, 4] } },
    { label: 'One empty', input: { a: [], b: [0] } },
    { label: 'Interleaved', input: { a: [1, 5, 9], b: [2, 3, 10, 11] } },
  ],
  legend: [
    ['current', 'compared heads'],
    ['done', 'linked into the result'],
  ],
  code: `
function mergeTwoLists(l1, l2) {
  const dummy = new ListNode(0);
  let tail = dummy;                                   //@init
  while (l1 && l2) {                                  //@loop
    if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }  //@take1
    else { tail.next = l2; l2 = l2.next; }            //@take2
    tail = tail.next;                                 //@tail
  }
  tail.next = l1 ?? l2;     // append the leftover    //@rest
  return dummy.next;                                  //@ret
}`,
  validate: ({ a, b }) =>
    a.length + b.length > 10
      ? 'Keep the two lists to 10 nodes in total.'
      : !a.every((x, i) => !i || a[i - 1] <= x) || !b.every((x, i) => !i || b[i - 1] <= x)
        ? 'Both lists must be sorted.'
        : null,
  run({ a, b }) {
    const steps: Step[] = [],
      out: [string, number, number][] = [];
    let i = 0,
      j = 0;
    steps.push({
      i,
      j,
      out: [],
      line: 'init',
      note: 'A dummy node stands in front of the result, so the first attach is not a special case.',
      why: 'Without it you would need an if to decide which list provides the head.',
    });
    while (i < a.length && j < b.length) {
      const t1 = a[i] <= b[j];
      out.push(t1 ? ['a', i, a[i]] : ['b', j, b[j]]);
      steps.push({
        i: t1 ? i + 1 : i,
        j: t1 ? j : j + 1,
        out: [...out],
        cmp: [i, j],
        line: [t1 ? 'take1' : 'take2', 'tail'],
        note: `${a[i]} ${t1 ? '≤' : '>'} ${b[j]}: link ${t1 ? a[i] + ' from list1' : b[j] + ' from list2'} after tail.`,
        why:
          t1 && a[i] === b[j] ? 'On ties take from list1 first; either is correct for this problem.' : null,
      });
      if (t1) i++;
      else j++;
    }
    const rest =
      i < a.length
        ? a.slice(i).map((v, k): [string, number, number] => ['a', i + k, v])
        : b.slice(j).map((v, k): [string, number, number] => ['b', j + k, v]);
    out.push(...rest);
    steps.push({
      i: a.length,
      j: b.length,
      out: [...out],
      line: ['rest', 'ret'],
      done: true,
      result: out.map((x) => x[2]),
      note: rest.length
        ? `One list is empty: link the rest (${rest.map((x) => x[2]).join(', ')}) in one step and return dummy.next.`
        : 'Both lists are used up: return dummy.next.',
      why: 'No new nodes are created; only next pointers change. O(m + n) time, O(1) extra space.',
    });
    return steps;
  },
  view(st, stage, { a, b }) {
    const sa: Record<string, string> = {},
      sb: Record<string, string> = {};
    a.forEach((_, k) => {
      if (k < st.i) sa[k] = 'done';
    });
    b.forEach((_, k) => {
      if (k < st.j) sb[k] = 'done';
    });
    if (st.cmp) {
      sa[st.cmp[0]] = 'current';
      sb[st.cmp[1]] = 'current';
    }
    stage.append(R.cells(a, { states: sa, ptrs: st.i < a.length ? { [st.i]: 'l1' } : {}, label: 'list1' }));
    stage.append(R.cells(b, { states: sb, ptrs: st.j < b.length ? { [st.j]: 'l2' } : {}, label: 'list2' }));
    const vals = ['D', ...st.out.map((x) => x[2])];
    stage.append(
      R.list(
        vals.map((v, k) => ({ id: k, val: v })),
        {
          next: Object.fromEntries(vals.map((_, k) => [k, k + 1 < vals.length ? k + 1 : null])),
          ptrs: { 0: 'dummy', [vals.length - 1]: vals.length > 1 ? 'tail' : ['dummy', 'tail'] },
          states: { 0: 'dim' },
          label: 'result (D = dummy)',
        },
      ),
    );
  },
  random: (g) => {
    const a = sorted(rarr(g, rint(g, 0, 5), 0, 9)),
      b = sorted(rarr(g, rint(g, 0, 5), 0, 9));
    return { a, b };
  },
});
