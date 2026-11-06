// Ported from legacy/src/viz/w06.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { randBST, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { parseTree, treeCheck, T } from './_helpers';

interface Input {
  tree: (number | null)[];
  p: number;
  q: number;
}

interface Step extends VizStep {
  path: number[];
  cur: number;
  skip?: number | null;
  lca?: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('bst-lca', {
  title: 'LCA in a BST: walk down until p and q split',
  inputs: [
    {
      key: 'tree',
      label: 'BST (level order)',
      type: 'json',
      def: [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5],
      wide: true,
    },
    { key: 'p', label: 'p', type: 'number', def: 3 },
    { key: 'q', label: 'q', type: 'number', def: 5 },
  ],
  presets: [
    {
      label: 'LeetCode tree, p = 2, q = 8',
      input: { tree: [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], p: 2, q: 8 },
    },
    { label: 'p = 3, q = 5', input: { tree: [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], p: 3, q: 5 } },
    { label: 'p = 2, q = 4', input: { tree: [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], p: 2, q: 4 } },
  ],
  legend: [
    ['current', 'current node'],
    ['dim', 'whole subtree skipped'],
    ['error', 'LCA'],
  ],
  code: `
function lowestCommonAncestor(root, p, q) {
  let node = root;
  while (node) {
    if (p.val < node.val && q.val < node.val) node = node.left;        //@left
    else if (p.val > node.val && q.val > node.val) node = node.right;  //@right
    else return node;              // they split here (or one is here) //@split
  }
}`,
  validate: ({ tree, p, q }) =>
    treeCheck(tree) || (!tree.includes(p) || !tree.includes(q) ? 'p and q must both be in the tree.' : null),
  run({ tree: arr, p, q }) {
    const { root, nodes } = parseTree(arr);
    const steps: Step[] = [],
      path: number[] = [];
    let i = root;
    while (i != null) {
      const v = nodes[i].val;
      path.push(i);
      if (p < v && q < v) {
        steps.push({
          path: [...path],
          cur: i,
          skip: nodes[i].right,
          line: 'left',
          note: `${p} and ${q} are both < ${v}: go left. The right subtree is skipped entirely.`,
        });
        i = nodes[i].left;
      } else if (p > v && q > v) {
        steps.push({
          path: [...path],
          cur: i,
          skip: nodes[i].left,
          line: 'right',
          note: `${p} and ${q} are both > ${v}: go right.`,
        });
        i = nodes[i].right;
      } else {
        steps.push({
          path: [...path],
          cur: i,
          lca: i,
          done: true,
          line: 'split',
          result: v,
          note: `${p} and ${q} are not on the same side of ${v} (or one equals it): ${v} is the LCA.`,
          why: 'Each comparison discards a whole subtree: O(h) time, O(1) space, no recursion needed.',
        });
        return steps;
      }
    }
    return steps;
  },
  view(st, stage, { tree: arr }) {
    const { nodes } = parseTree(arr);
    const states: Record<string, string> = {};
    const dimAll = (i: number | null) => {
      if (i == null) return;
      states[i] = 'dim';
      dimAll(nodes[i].left);
      dimAll(nodes[i].right);
    };
    st.path.forEach((i) => (states[i] = 'frontier'));
    if (st.skip != null) dimAll(st.skip);
    states[st.cur] = st.lca != null ? 'error' : 'current';
    stage.append(T(arr, { states }));
  },
  random: (g) => {
    const t = randBST(g, rint(g, 2, 10));
    const v = t.filter((x) => x != null);
    return { tree: t, p: v[rint(g, 0, v.length - 1)], q: v[rint(g, 0, v.length - 1)] };
  },
});
