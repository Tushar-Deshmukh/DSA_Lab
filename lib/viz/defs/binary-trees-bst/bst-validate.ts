// Ported from legacy/src/viz/w06.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { randBST, randTree, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { parseTree, treeCheck, T } from './_helpers';

interface Input {
  tree: (number | null)[];
}

interface Step extends VizStep {
  bounds: Record<string, number[]>;
  good: Set<number>;
  cur: number | null;
  bad?: number | null;
  done?: boolean;
  result?: boolean;
}

export default defineViz<Input, Step>('bst-validate', {
  title: 'Validate a BST: carry (low, high) bounds down',
  inputs: [
    { key: 'tree', label: 'tree (level order)', type: 'json', def: [5, 4, 6, null, null, 3, 7], wide: true },
  ],
  presets: [
    { label: 'Lesson 5 trap [5,4,6,null,null,3,7]', input: { tree: [5, 4, 6, null, null, 3, 7] } },
    { label: 'Valid [2,1,3]', input: { tree: [2, 1, 3] } },
    { label: 'Equal values [2,2,2]', input: { tree: [2, 2, 2] } },
  ],
  legend: [
    ['current', 'checking'],
    ['done', 'within bounds'],
    ['error', 'violates its bounds'],
  ],
  code: `
function isValidBST(root) {
  function ok(node, low, high) {        // node.val must be in (low, high)
    if (!node) return true;                                            //@null
    if (node.val <= low || node.val >= high) return false;             //@check
    return ok(node.left, low, node.val) && ok(node.right, node.val, high);  //@rec
  }
  return ok(root, -Infinity, Infinity);
}`,
  validate: ({ tree }) => treeCheck(tree),
  run({ tree: arr }) {
    const { root, nodes } = parseTree(arr);
    const steps: Step[] = [],
      bounds: Record<string, number[]> = {},
      good: Set<number> = new Set();
    let bad: number | null = null;
    const f = (x: number) => (x === -Infinity ? '−∞' : x === Infinity ? '∞' : x);
    function ok(i: number | null, lo: number, hi: number): boolean {
      if (i == null) return true;
      bounds[i] = [lo, hi];
      if (nodes[i].val <= lo || nodes[i].val >= hi) {
        bad = i;
        steps.push({
          bounds: { ...bounds },
          good: new Set(good),
          bad,
          cur: i,
          line: 'check',
          note: `${nodes[i].val} must lie in (${f(lo)}, ${f(hi)}): it does not. Not a BST.`,
          why: 'Each bound came from an ancestor. Comparing a node only with its parent would accept this, because the violated bound comes from higher up.',
        });
        return false;
      }
      good.add(i);
      steps.push({
        bounds: { ...bounds },
        good: new Set(good),
        cur: i,
        line: ['check', 'rec'],
        note: `${nodes[i].val} is in (${f(lo)}, ${f(hi)}). Left children must be in (${f(lo)}, ${nodes[i].val}); right in (${nodes[i].val}, ${f(hi)}).`,
      });
      return ok(nodes[i].left, lo, nodes[i].val) && ok(nodes[i].right, nodes[i].val, hi);
    }
    const res = ok(root, -Infinity, Infinity);
    steps.push({
      bounds,
      good,
      bad,
      cur: null,
      done: true,
      line: null,
      result: res,
      note: res ? 'Every node respects its bounds: valid BST.' : 'Invalid BST.',
      why: "O(n) time, O(h) stack. Strict inequalities because LeetCode's BSTs have no duplicates.",
    });
    return steps;
  },
  view(st, stage, { tree: arr }) {
    const f = (x: number) => (x === -Infinity ? '−∞' : x === Infinity ? '∞' : x);
    const states: Record<string, string> = {},
      subs: Record<string, string> = {};
    st.good.forEach((i) => (states[i] = 'done'));
    Object.entries(st.bounds).forEach(([i, [lo, hi]]) => (subs[i] = '(' + f(lo) + ',' + f(hi) + ')'));
    if (st.cur != null) states[st.cur] = 'current';
    if (st.bad != null) states[st.bad] = 'error';
    stage.append(T(arr, { states, subs, dx: 64, dy: 62 }));
  },
  random: (g) => ({ tree: g() < 0.5 ? randBST(g, rint(g, 1, 9)) : randTree(g, rint(g, 1, 9)) }),
});
