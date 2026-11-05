// Ported from legacy/src/viz/w06.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { randTree, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { parseTree, treeCheck, T } from './_helpers';

interface Input {
  tree: (number | null)[];
  p: number;
  q: number;
}

interface Step extends VizStep {
  ret: Record<string, number | null>;
  stack: number[];
  cur: number | null;
  lca?: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('tree-lca', {
  title: 'Lowest common ancestor: what each call returns',
  inputs: [
    {
      key: 'tree',
      label: 'tree (level order)',
      type: 'json',
      def: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4],
      wide: true,
    },
    { key: 'p', label: 'p', type: 'number', def: 6 },
    { key: 'q', label: 'q', type: 'number', def: 2 },
  ],
  presets: [
    {
      label: 'Lesson 4 trace (p = 6, q = 2)',
      input: { tree: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 6, q: 2 },
    },
    {
      label: 'LeetCode example 1 (5, 1)',
      input: { tree: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 1 },
    },
    {
      label: 'Ancestor of itself (5, 4)',
      input: { tree: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 4 },
    },
  ],
  legend: [
    ['current', 'call running'],
    ['frontier', 'waiting'],
    ['done', 'returned something'],
    ['dim', 'returned null'],
    ['error', 'the LCA'],
  ],
  code: `
function lowestCommonAncestor(root, p, q) {
  if (!root || root === p || root === q) return root;     // case 1  //@base
  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);              //@kids
  if (left && right) return root;          // case 2: split here     //@split
  return left ?? right;                    // case 3: pass one up    //@pass
}`,
  validate: ({ tree, p, q }) => {
    const e = treeCheck(tree);
    if (e) return e;
    const vals = tree.filter((x) => x != null);
    return new Set(vals).size !== vals.length
      ? 'Values must be distinct.'
      : !vals.includes(p) || !vals.includes(q)
        ? 'p and q must both be in the tree.'
        : null;
  },
  run({ tree: arr, p, q }) {
    const { root, nodes } = parseTree(arr);
    const steps: Step[] = [],
      ret: Record<string, number | null> = {},
      stack: number[] = [];
    let lca: number | null = null;
    const name = (i: number | null) => (i == null ? 'null' : String(nodes[i].val));
    function f(i: number | null): number | null {
      if (i == null) return null;
      if (nodes[i].val === p || nodes[i].val === q) {
        ret[i] = i;
        steps.push({
          ret: { ...ret },
          stack: [...stack],
          cur: i,
          line: 'base',
          note: `Node ${nodes[i].val} is ${nodes[i].val === p ? 'p' : 'q'}: return it immediately (case 1).`,
          why: 'There is no need to look below: if the other target is underneath, this node is the LCA anyway; if not, some ancestor will be.',
        });
        return i;
      }
      stack.push(i);
      steps.push({
        ret: { ...ret },
        stack: [...stack],
        cur: i,
        line: 'kids',
        note: `Node ${nodes[i].val}: search both subtrees.`,
      });
      const L: number | null = f(nodes[i].left),
        Rr: number | null = f(nodes[i].right);
      stack.pop();
      let r: number | null;
      if (L != null && Rr != null) {
        r = i;
        lca = i;
        steps.push({
          ret: { ...ret, [i]: i },
          stack: [...stack],
          cur: i,
          line: 'split',
          note: `Left returned ${name(L)} and right returned ${name(Rr)}: p and q are on different sides, so ${nodes[i].val} is the LCA (case 2).`,
        });
      } else {
        r = L ?? Rr;
        steps.push({
          ret: { ...ret, [i]: r },
          stack: [...stack],
          cur: i,
          line: 'pass',
          note: `Left ${name(L)}, right ${name(Rr)}: return ${name(r)} upward (case 3).`,
        });
      }
      ret[i] = r;
      return r;
    }
    const ans = f(root);
    if (lca == null) lca = ans;
    steps.push({
      ret,
      stack: [],
      cur: null,
      lca: lca!,
      done: true,
      line: null,
      result: nodes[ans!].val,
      note: `LCA(${p}, ${q}) = ${nodes[ans!].val}.`,
      why: 'Contract: the call returns p or q if one of them is in this subtree, the LCA if both are, and null if neither. One postorder pass: O(n).',
    });
    return steps;
  },
  view(st, stage, { tree: arr }) {
    const { nodes } = parseTree(arr);
    const states: Record<string, string> = {},
      subs: Record<string, string> = {};
    Object.entries(st.ret).forEach(([i, v]) => {
      states[i] = v == null ? 'dim' : 'done';
      subs[i] = '→ ' + (v == null ? 'null' : nodes[v].val);
    });
    st.stack.forEach((i) => (states[i] = 'frontier'));
    if (st.cur != null) states[st.cur] = 'current';
    if (st.lca != null) states[st.lca] = 'error';
    stage.append(T(arr, { states, subs, dy: 62 }));
  },
  random: (g) => {
    const t = randTree(g, rint(g, 2, 10), true);
    const v = t.filter((x) => x != null);
    return { tree: t, p: v[rint(g, 0, v.length - 1)], q: v[rint(g, 0, v.length - 1)] };
  },
});
