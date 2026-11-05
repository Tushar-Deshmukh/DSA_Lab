// Ported from legacy/src/viz/w06.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { randTree, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { treeCheck, T } from './_helpers';

interface Input {
  tree: (number | null)[];
}

interface Step extends VizStep {
  shown: (number | null)[];
  cur: number | null;
  i?: number;
  done?: boolean;
  result?: number;
}

const TREE_PRESETS: { label: string; input: { tree: (number | null)[] } }[] = [
  { label: 'Handbook tree [3,9,20,null,null,15,7]', input: { tree: [3, 9, 20, null, null, 15, 7] } },
  { label: 'Complete [1,2,3,4,5,6,7]', input: { tree: [1, 2, 3, 4, 5, 6, 7] } },
  { label: 'Skewed [1,null,2,null,3]', input: { tree: [1, null, 2, null, 3] } },
  { label: 'Empty []', input: { tree: [] } },
];

export default defineViz<Input, Step>('tree-build', {
  title: "Reading LeetCode's tree array: level order with nulls",
  inputs: [
    {
      key: 'tree',
      label: 'tree (level order)',
      type: 'json',
      def: [3, 9, 20, null, null, 15, 7],
      wide: true,
    },
  ],
  presets: TREE_PRESETS.slice(0, 3),
  legend: [
    ['current', 'node receiving children'],
    ['done', 'placed'],
  ],
  code: `
// how LeetCode turns [3,9,20,null,null,15,7] into nodes
root = new TreeNode(arr[0]); queue = [root]; i = 1;     //@root
while (i < arr.length) {
  const parent = queue.shift();                          //@parent
  if (arr[i] != null) queue.push(parent.left = new TreeNode(arr[i]));   //@left
  i++;
  if (arr[i] != null) queue.push(parent.right = new TreeNode(arr[i]));  //@right
  i++;
}`,
  validate: ({ tree }) => treeCheck(tree) || (tree.length ? null : 'Use a non-empty tree here.'),
  run({ tree: arr }) {
    const steps: Step[] = [],
      shown = [arr[0]];
    const q = [0];
    let i = 1,
      h = 0;
    steps.push({ shown: [...shown], cur: null, i: 0, line: 'root', note: `arr[0] = ${arr[0]} is the root.` });
    while (i < arr.length && h < q.length) {
      const p = q[h++];
      const L = i < arr.length ? arr[i] : null;
      while (shown.length <= i) shown.push(null);
      shown[i] = L;
      if (L != null) q.push(i);
      i++;
      const Rv = i < arr.length ? arr[i] : null;
      while (shown.length <= i) shown.push(null);
      if (i < arr.length) shown[i] = Rv;
      if (Rv != null && i < arr.length) q.push(i);
      i++;
      steps.push({
        shown: [...shown],
        cur: p,
        i,
        line: ['parent', 'left', 'right'],
        note: `Parent ${arr[p]}: left = ${L == null ? 'null' : L}, right = ${Rv == null ? 'null' : Rv}.`,
        why:
          L == null || Rv == null
            ? 'A null takes a slot in the array but gets no children of its own: nothing is listed for it later.'
            : null,
      });
    }
    steps.push({
      shown: arr,
      cur: null,
      done: true,
      line: null,
      result: arr.filter((x) => x != null).length,
      note: `Done: ${arr.filter((x) => x != null).length} nodes.`,
      why: 'Always sketch the tree from the array before coding; most misread trees come from forgetting that nulls have no children.',
    });
    return steps;
  },
  view(st, stage, { tree: arr }) {
    const states: Record<string, string> = {};
    if (st.cur != null) states[st.cur] = 'current';
    stage.append(T(st.shown.slice(0, Math.max(1, st.i!)), { states }));
    stage.append(
      R.cells(
        arr.map((x) => (x == null ? 'null' : x)),
        {
          states: Object.fromEntries(arr.map((_, k) => [k, k < st.i! ? 'done' : null]).filter(([, v]) => v)),
          label: 'the array, consumed left to right',
        },
      ),
    );
  },
  random: (g) => ({ tree: randTree(g, rint(g, 1, 9)) }),
});
