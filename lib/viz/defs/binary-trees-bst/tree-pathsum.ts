// Ported from legacy/src/viz/w06.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { randTree, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { parseTree, treeCheck, T } from './_helpers';

interface Input {
  tree: (number | null)[];
  target: number;
}

interface Step extends VizStep {
  path: number[];
  seen: Set<number>;
  rem: Record<string, number>;
  cur: number | null;
  win?: boolean;
  done?: boolean;
  result?: boolean;
}

export default defineViz<Input, Step>('tree-pathsum', {
  title: 'Path Sum: pass the remaining sum down, check at leaves',
  inputs: [
    {
      key: 'tree',
      label: 'tree (level order)',
      type: 'json',
      def: [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1],
      wide: true,
    },
    { key: 'target', label: 'targetSum', type: 'number', def: 22 },
  ],
  presets: [
    {
      label: 'LeetCode example 1',
      input: { tree: [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], target: 22 },
    },
    { label: 'No such path', input: { tree: [1, 2, 3], target: 5 } },
    { label: 'Not a leaf', input: { tree: [1, 2], target: 1 } },
  ],
  legend: [
    ['current', 'node being checked'],
    ['frontier', 'on the path'],
    ['done', 'leaf where remaining = 0'],
    ['dim', 'explored'],
  ],
  code: `
function hasPathSum(root, targetSum) {
  if (!root) return false;                                    //@null
  const rest = targetSum - root.val;                          //@rest
  if (!root.left && !root.right) return rest === 0;  // leaf  //@leaf
  return hasPathSum(root.left, rest) || hasPathSum(root.right, rest);  //@rec
}`,
  validate: ({ tree }) => treeCheck(tree),
  run({ tree: arr, target }) {
    const { root, nodes } = parseTree(arr);
    const steps: Step[] = [],
      path: number[] = [],
      seen: Set<number> = new Set(),
      rem: Record<string, number> = {};
    function f(i: number | null, t: number): boolean {
      if (i == null) return false;
      path.push(i);
      seen.add(i);
      const rest = t - nodes[i].val;
      rem[i] = rest;
      const leaf = nodes[i].left == null && nodes[i].right == null;
      if (leaf) {
        const ok = rest === 0;
        steps.push({
          path: [...path],
          seen: new Set(seen),
          rem: { ...rem },
          cur: i,
          win: ok,
          line: ['rest', 'leaf'],
          note: `Leaf ${nodes[i].val}: remaining ${t} − ${nodes[i].val} = ${rest}${ok ? ' = 0. Found.' : ' ≠ 0.'}`,
        });
        path.pop();
        return ok;
      }
      steps.push({
        path: [...path],
        seen: new Set(seen),
        rem: { ...rem },
        cur: i,
        line: ['rest', 'rec'],
        note: `${nodes[i].val}: pass remaining ${t} − ${nodes[i].val} = ${rest} to the children.`,
        why:
          steps.length === 0
            ? 'Information from ancestors flows down as a parameter: each call receives exactly what it needs (the sum still to be found).'
            : null,
      });
      const ok: boolean = f(nodes[i].left, rest) || f(nodes[i].right, rest);
      path.pop();
      return ok;
    }
    const ok = f(root, target);
    steps.push({
      path: [],
      seen,
      rem,
      cur: null,
      done: true,
      line: null,
      result: ok,
      note: ok
        ? 'A root-to-leaf path sums to the target: true.'
        : 'No root-to-leaf path sums to the target: false.',
      why: 'Only leaves are checked: a path must end at a leaf (try the "Not a leaf" preset).',
    });
    return steps;
  },
  view(st, stage, { tree: arr }) {
    const states: Record<string, string> = {},
      subs: Record<string, string> = {};
    st.seen.forEach((i) => (states[i] = 'dim'));
    st.path.forEach((i) => (states[i] = 'frontier'));
    Object.entries(st.rem).forEach(([i, v]) => (subs[i] = 'rem ' + v));
    if (st.cur != null) states[st.cur] = st.win ? 'done' : 'current';
    stage.append(T(arr, { states, subs, dy: 62 }));
  },
  random: (g) => ({ tree: randTree(g, rint(g, 0, 10)), target: rint(g, 0, 25) }),
});
