// Ported from legacy/src/viz/w06.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { randTree, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { parseTree, treeCheck, T } from './_helpers';

interface Input {
  tree: (number | null)[];
  order: string;
}

interface Step extends VizStep {
  out: number[];
  visited: Set<number>;
  stack: number[];
  cur: number | null;
  done?: boolean;
  result?: number[];
}

export default defineViz<Input, Step>('tree-dfs', {
  title: 'Depth-first traversal: where the visit line sits decides the order',
  inputs: [
    {
      key: 'tree',
      label: 'tree (level order)',
      type: 'json',
      def: [3, 9, 20, null, null, 15, 7],
      wide: true,
    },
    {
      key: 'order',
      label: 'order',
      type: 'select',
      def: 'pre',
      options: [
        { value: 'pre', label: 'preorder (node, left, right)' },
        { value: 'in', label: 'inorder (left, node, right)' },
        { value: 'post', label: 'postorder (left, right, node)' },
      ],
    },
  ],
  presets: [
    { label: 'Preorder', input: { tree: [3, 9, 20, null, null, 15, 7], order: 'pre' } },
    { label: 'Inorder', input: { tree: [3, 9, 20, null, null, 15, 7], order: 'in' } },
    { label: 'Postorder', input: { tree: [3, 9, 20, null, null, 15, 7], order: 'post' } },
    { label: 'Inorder of a BST', input: { tree: [4, 2, 6, 1, 3, 5, 7], order: 'in' } },
  ],
  legend: [
    ['current', 'call running'],
    ['frontier', 'waiting on the stack'],
    ['done', 'visited (output)'],
  ],
  code: `
function dfs(node) {
  if (!node) return;                       //@null
  out.push(node.val);      // preorder     //@pre
  dfs(node.left);                          //@left
  out.push(node.val);      // inorder      //@in
  dfs(node.right);                         //@right
  out.push(node.val);      // postorder    //@post
}   // keep exactly ONE of the three push lines`,
  validate: ({ tree }) => treeCheck(tree),
  run({ tree: arr, order }) {
    const { root, nodes } = parseTree(arr);
    const steps: Step[] = [],
      out: number[] = [],
      visited: Set<number> = new Set(),
      stack: number[] = [];
    const snap = <O extends object>(o: O) =>
      Object.assign({ out: [...out], visited: new Set(visited), stack: [...stack] }, o);
    function dfs(i: number | null) {
      if (i == null) return;
      stack.push(i);
      steps.push(snap({ cur: i, line: 'left', note: `Enter ${nodes[i].val}.` }));
      if (order === 'pre') {
        out.push(nodes[i].val);
        visited.add(i);
        steps.push(
          snap({ cur: i, line: 'pre', note: `Preorder: visit ${nodes[i].val} before its children.` }),
        );
      }
      dfs(nodes[i].left);
      if (order === 'in') {
        out.push(nodes[i].val);
        visited.add(i);
        steps.push(snap({ cur: i, line: 'in', note: `Inorder: left subtree done, visit ${nodes[i].val}.` }));
      }
      dfs(nodes[i].right);
      if (order === 'post') {
        out.push(nodes[i].val);
        visited.add(i);
        steps.push(
          snap({
            cur: i,
            line: 'post',
            note: `Postorder: both subtrees done, visit ${nodes[i].val}.`,
            why:
              out.length === 1
                ? "Postorder is the order for combining children's answers: when a node is visited, both subtrees are finished."
                : null,
          }),
        );
      }
      stack.pop();
    }
    dfs(root);
    steps.push(
      snap({
        cur: null,
        done: true,
        line: null,
        result: out,
        note: root == null ? 'Empty tree: nothing to visit.' : `${order}order: [${out.join(', ')}].`,
        why: 'Every node is entered once: O(n) time. The stack holds one root-to-node path: O(h) space, which is O(n) for a skewed tree.',
      }),
    );
    return steps;
  },
  view(st, stage, { tree: arr }) {
    const states: Record<string, string> = {};
    st.stack.forEach((i) => (states[i] = 'frontier'));
    st.visited.forEach((i) => (states[i] = 'done'));
    if (st.cur != null) states[st.cur] = st.visited.has(st.cur) ? 'done' : 'current';
    stage.append(T(arr, { states }));
    stage.append(R.cells(st.out, { label: 'output', noIndex: true }));
  },
  random: (g) => ({ tree: randTree(g, rint(g, 0, 10)), order: ['pre', 'in', 'post'][rint(g, 0, 2)] }),
});
