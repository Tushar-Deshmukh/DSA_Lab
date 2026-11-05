// Ported from legacy/src/viz/w06.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { randTree, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { parseTree, treeCheck, T } from './_helpers';

interface Input {
  tree: (number | null)[];
}

interface Step extends VizStep {
  hs: Record<string, number>;
  stack: number[];
  cur: number | null;
  best: number;
  bestAt: number | null;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('tree-diameter', {
  title: 'Diameter: return the height, update a global best',
  inputs: [{ key: 'tree', label: 'tree (level order)', type: 'json', def: [1, 2, 3, 4, 5], wide: true }],
  presets: [
    { label: 'Handbook dry run [1,2,3,4,5]', input: { tree: [1, 2, 3, 4, 5] } },
    { label: 'Longest path avoids the root', input: { tree: [1, 2, null, 3, 4, 5, null, null, 6] } },
    { label: 'Single node', input: { tree: [1] } },
  ],
  legend: [
    ['current', 'computing now'],
    ['frontier', 'waiting for children'],
    ['done', 'height returned (shown below the node)'],
  ],
  code: `
function diameterOfBinaryTree(root) {
  let best = 0;
  function height(node) {                      // nodes on the longest downward path
    if (!node) return 0;                                              //@null
    const L = height(node.left), R = height(node.right);              //@kids
    best = Math.max(best, L + R);        // path through node, edges //@best
    return 1 + Math.max(L, R);           // what the parent needs    //@ret
  }
  height(root);
  return best;
}`,
  validate: ({ tree }) => treeCheck(tree),
  run({ tree: arr }) {
    const { root, nodes } = parseTree(arr);
    const steps: Step[] = [],
      hs: Record<string, number> = {},
      stack: number[] = [];
    let best = 0,
      bestAt: number | null = null;
    function h(i: number | null) {
      if (i == null) return 0;
      stack.push(i);
      steps.push({
        hs: { ...hs },
        stack: [...stack],
        cur: i,
        best,
        bestAt,
        line: 'kids',
        note: `height(${nodes[i].val}): first get both children's heights.`,
      });
      const L = h(nodes[i].left),
        Rr = h(nodes[i].right);
      const nb = L + Rr > best;
      if (nb) {
        best = L + Rr;
        bestAt = i;
      }
      hs[i] = 1 + Math.max(L, Rr);
      stack.pop();
      steps.push({
        hs: { ...hs },
        stack: [...stack],
        cur: i,
        best,
        bestAt,
        line: ['best', 'ret'],
        note: `At ${nodes[i].val}: L = ${L}, R = ${Rr}. Path through it has ${L + Rr} edges${nb ? ' → new best' : ''}. Return height ${hs[i]}.`,
        why:
          steps.length < 4
            ? 'The function returns one thing (height, for the parent) and updates another (best, the answer). That is how one O(n) pass replaces calling height() from every node.'
            : null,
      });
      return hs[i];
    }
    h(root);
    steps.push({
      hs,
      stack: [],
      cur: null,
      best,
      bestAt,
      done: true,
      line: null,
      result: best,
      note: `Diameter = ${best} edges${bestAt != null && best ? ', through node ' + nodes[bestAt].val : ''}.`,
    });
    return steps;
  },
  view(st, stage, { tree: arr }) {
    const states: Record<string, string> = {},
      subs: Record<string, string> = {};
    Object.entries(st.hs).forEach(([i, v]) => {
      states[i] = 'done';
      subs[i] = 'h=' + v;
    });
    st.stack.forEach((i) => (states[i] = 'frontier'));
    if (st.cur != null) states[st.cur] = 'current';
    if (st.done && st.bestAt != null) states[st.bestAt] = 'current';
    stage.append(T(arr, { states, subs, dy: 62 }));
    stage.append(R.vars({ best: st.best }));
  },
  random: (g) => ({ tree: randTree(g, rint(g, 0, 10)) }),
});
