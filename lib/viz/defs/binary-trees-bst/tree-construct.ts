// Ported from legacy/src/viz/w06.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { randTree, rint, toT } from '@/lib/viz/random';
import type { TreeValue } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { T } from './_helpers';

interface Input {
  pre: number[];
  ino: number[];
}

interface Step extends VizStep {
  built: { id: number; label: string; parent: number | null; side: string | null }[];
  cur: number | null;
  range: number[] | null;
  mid?: number;
  p: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('tree-construct', {
  title: 'Build a tree from preorder and inorder',
  inputs: [
    { key: 'pre', label: 'preorder', type: 'numbers', def: [3, 9, 20, 15, 7] },
    { key: 'ino', label: 'inorder', type: 'numbers', def: [9, 3, 15, 20, 7] },
  ],
  presets: [
    { label: 'Lesson 5 by-hand example', input: { pre: [3, 9, 20, 15, 7], ino: [9, 3, 15, 20, 7] } },
    { label: 'Left-skewed', input: { pre: [3, 2, 1], ino: [1, 2, 3] } },
    { label: 'Seven nodes', input: { pre: [1, 2, 4, 5, 3, 6, 7], ino: [4, 2, 5, 1, 6, 3, 7] } },
  ],
  legend: [
    ['current', 'root of the current call'],
    ['window', 'inorder range of the call'],
    ['done', 'built'],
  ],
  code: `
function buildTree(preorder, inorder) {
  const pos = new Map(inorder.map((v, i) => [v, i]));   // value -> inorder index
  let p = 0;                                             // next preorder element
  function build(lo, hi) {                               // inorder range [lo, hi]
    if (lo > hi) return null;                                          //@empty
    const val = preorder[p++], mid = pos.get(val);                     //@root
    const node = new TreeNode(val);
    node.left = build(lo, mid - 1);     // left part of inorder        //@left
    node.right = build(mid + 1, hi);    // right part                  //@right
    return node;
  }
  return build(0, inorder.length - 1);
}`,
  validate: ({ pre, ino }) =>
    pre.length !== ino.length
      ? 'Both traversals must have the same length.'
      : pre.length > 9
        ? 'Use at most 9 nodes.'
        : new Set(pre).size !== pre.length
          ? 'Values must be distinct.'
          : [...pre].sort().join() !== [...ino].sort().join()
            ? 'Both traversals must contain the same values.'
            : null,
  run({ pre, ino }) {
    const pos = new Map(ino.map((v, i) => [v, i]));
    let p = 0;
    const steps: Step[] = [],
      built: { id: number; label: string; parent: number | null; side: string | null }[] = [];
    function build(lo: number, hi: number, parent: number | null, side: string | null) {
      if (lo > hi) return;
      const val = pre[p++],
        mid = pos.get(val);
      built.push({ id: val, label: String(val), parent, side });
      steps.push({
        built: built.map((x) => ({ ...x })),
        cur: val,
        range: [lo, hi],
        mid,
        p,
        line: ['root', 'left'],
        note: `preorder[${p - 1}] = ${val} is the root of inorder[${lo}..${hi}]. It sits at inorder index ${mid}: ${mid! - lo} node${mid! - lo === 1 ? '' : 's'} on its left, ${hi - mid!} on its right.`,
        why:
          steps.length === 0
            ? 'Preorder lists a root before its subtrees; inorder puts the left subtree before the root and the right subtree after it. Together they pin down the tree.'
            : null,
      });
      build(lo, mid! - 1, val, 'L');
      build(mid! + 1, hi, val, 'R');
    }
    build(0, ino.length - 1, null, null);
    steps.push({
      built,
      cur: null,
      range: null,
      p,
      done: true,
      line: null,
      result: built.length,
      note: 'Every value placed.',
      why: "The Map gives each root's inorder position in O(1), and index bounds avoid slicing: O(n) total instead of O(n²).",
    });
    return steps;
  },
  view(st, stage, { pre, ino }) {
    // ghost placeholders keep left/right positions when only one child exists
    const nodes: {
      id: number | string;
      label: string;
      parent: number | null;
      state?: string;
      ghost?: boolean;
    }[] = [];
    const kids: Record<string, Record<string, number>> = {};
    st.built.forEach((b) => {
      kids[b.id] = kids[b.id] || {};
      if (b.parent != null) (kids[b.parent] = kids[b.parent] || {})[b.side!] = b.id;
    });
    let gh = -1;
    const add = (id: number, parent: number | null) => {
      const b = st.built.find((x) => x.id === id);
      nodes.push({ id, label: b!.label, parent, state: id === st.cur ? 'current' : 'done' });
      const k = kids[id] || {};
      if (k.L == null && k.R == null) return;
      if (k.L != null) add(k.L, id);
      else nodes.push({ id: 'g' + gh--, label: '', parent: id, ghost: true });
      if (k.R != null) add(k.R, id);
      else nodes.push({ id: 'g' + gh--, label: '', parent: id, ghost: true });
    };
    if (st.built.length) add(st.built[0].id, null);
    stage.append(R.tree(nodes, { dx: 50, dy: 54, r: 17, label: 'tree built so far' }));
    stage.append(
      R.cells(pre, {
        states: Object.fromEntries(pre.map((_, i) => [i, i < st.p ? 'done' : null]).filter(([, v]) => v)),
        ptrs: st.p < pre.length && !st.done ? { [st.p]: 'p' } : {},
        label: 'preorder',
      }),
    );
    const is: Record<string, string> = {};
    if (st.mid != null) is[st.mid] = 'current';
    stage.append(R.cells(ino, { states: is, window: st.range, label: 'inorder' }));
  },
  random: (g) => {
    const t = randTree(g, rint(g, 1, 9), true);
    const pre: number[] = [],
      ino: number[] = [];
    const a = (n: TreeValue | null) => {
      if (!n) return;
      pre.push(n.val);
      a(n.left);
      a(n.right);
    };
    const b = (n: TreeValue | null) => {
      if (!n) return;
      b(n.left);
      ino.push(n.val);
      b(n.right);
    };
    const T = toT(t);
    a(T);
    b(T);
    return { pre, ino };
  },
});
