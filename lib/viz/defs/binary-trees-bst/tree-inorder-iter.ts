// Ported from legacy/src/viz/w06.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { randTree, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { parseTree, treeCheck, T } from './_helpers';

interface Input {
  tree: (number | null)[];
  k: number;
}

interface Step extends VizStep {
  st: number[];
  cur: number | null;
  res: number[];
  vis: Set<number>;
  done?: boolean;
  result?: number | number[];
}

export default defineViz<Input, Step>('tree-inorder-iter', {
  title: 'Iterative inorder with an explicit stack (and k-th smallest)',
  inputs: [
    {
      key: 'tree',
      label: 'tree (level order)',
      type: 'json',
      def: [5, 3, 6, 2, 4, null, null, 1],
      wide: true,
    },
    { key: 'k', label: 'stop after k pops (0 = full traversal)', type: 'int', def: 0 },
  ],
  presets: [
    { label: 'Full traversal', input: { tree: [5, 3, 6, 2, 4, null, null, 1], k: 0 } },
    { label: 'k = 3 (problem 230)', input: { tree: [5, 3, 6, 2, 4, null, null, 1], k: 3 } },
    { label: 'Handbook tree', input: { tree: [3, 9, 20, null, null, 15, 7], k: 0 } },
  ],
  legend: [
    ['current', 'cur'],
    ['frontier', 'on the stack'],
    ['done', 'visited'],
  ],
  code: `
function inorderTraversal(root) {
  const res = [], stack = [];
  let cur = root;
  while (cur || stack.length) {                       //@loop
    while (cur) { stack.push(cur); cur = cur.left; }  //@left
    cur = stack.pop();                                //@pop
    res.push(cur.val);              // visit          //@visit
    cur = cur.right;                                  //@right
  }
  return res;
}`,
  validate: ({ tree, k }) => treeCheck(tree) || (k < 0 ? 'k must be 0 or more.' : null),
  run({ tree: arr, k }) {
    const { root, nodes } = parseTree(arr);
    const steps: Step[] = [],
      st: number[] = [],
      res: number[] = [],
      vis: Set<number> = new Set();
    let cur = root;
    while (cur != null || st.length) {
      const pushed: number[] = [];
      while (cur != null) {
        st.push(cur);
        pushed.push(nodes[cur].val);
        cur = nodes[cur].left;
      }
      if (pushed.length)
        steps.push({
          st: [...st],
          cur: null,
          res: [...res],
          vis: new Set(vis),
          line: 'left',
          note: `Go left as far as possible, pushing ${pushed.join(', ')}.`,
        });
      cur = st.pop()!;
      res.push(nodes[cur!].val);
      vis.add(cur!);
      steps.push({
        st: [...st],
        cur,
        res: [...res],
        vis: new Set(vis),
        line: ['pop', 'visit'],
        note: `Pop ${nodes[cur!].val}: its left subtree is finished, so visit it.`,
        why:
          res.length === 1
            ? 'The stack does the job of the call stack: each node waits there until its left subtree is done.'
            : null,
      });
      if (k && res.length === k) {
        steps.push({
          st: [...st],
          cur,
          res: [...res],
          vis: new Set(vis),
          done: true,
          line: 'visit',
          result: nodes[cur!].val,
          note: `That was pop number ${k}: the ${k}-th smallest value is ${nodes[cur!].val}. Stop early.`,
          why: 'Inorder of a BST is sorted, so the k-th pop is the k-th smallest: O(h + k) instead of O(n).',
        });
        return steps;
      }
      cur = nodes[cur!].right;
      steps.push({
        st: [...st],
        cur,
        res: [...res],
        vis: new Set(vis),
        line: 'right',
        note: cur == null ? 'No right child.' : `Move to the right child ${nodes[cur].val}.`,
      });
    }
    steps.push({
      st: [],
      cur: null,
      res,
      vis,
      done: true,
      line: null,
      result: k ? undefined : res,
      note: root == null ? 'Empty tree.' : `Inorder: [${res.join(', ')}].`,
    });
    return steps;
  },
  view(st, stage, { tree: arr }) {
    const states: Record<string, string> = {};
    st.vis.forEach((i) => (states[i] = 'done'));
    st.st.forEach((i) => (states[i] = 'frontier'));
    if (st.cur != null) states[st.cur] = 'current';
    stage.append(T(arr, { states }));
    const { nodes } = parseTree(arr);
    stage.append(
      R.row(
        { align: 'end', gap: 'wide' },
        R.stack(st.st.map((i) => nodes[i].val)),
        R.cells(st.res, { label: 'res', noIndex: true }),
      ),
    );
  },
  random: (g) => {
    const t = randTree(g, rint(g, 0, 10));
    const n = t.filter((x) => x != null).length;
    return { tree: t, k: g() < 0.5 || !n ? 0 : rint(g, 1, n) };
  },
});
