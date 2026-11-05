// Ported from legacy/src/viz/w05.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { fmtArr, tracer, renderBT } from './_helpers';

interface Input {
  nums: number[];
}

interface Step extends VizStep {
  tree: {
    id: number;
    label: string;
    parent: number | null;
    state: string;
    sub: string;
    edgeLabel?: string;
  }[];
  path: number[];
  res: number[][];
  done?: boolean;
  result?: number[][];
}

export default defineViz<Input, Step>('bt-subsets-b', {
  title: 'Subsets, way B: every node is a subset; choose the next element from start',
  inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [1, 2, 3] }],
  presets: [
    { label: '[1, 2, 3]', input: { nums: [1, 2, 3] } },
    { label: '[1, 2, 3, 4]', input: { nums: [1, 2, 3, 4] } },
  ],
  legend: [
    ['current', 'running'],
    ['frontier', 'on the stack'],
    ['done', 'returned'],
  ],
  code: `
function subsetsB(nums) {
  const res = [], path = [];
  function dfs(start) {
    res.push([...path]);                   // every node      //@rec
    for (let i = start; i < nums.length; i++) {               //@loop
      path.push(nums[i]); dfs(i + 1); path.pop();             //@choose
    }
  }
  dfs(0);
  return res;
}`,
  validate: ({ nums }) => (nums.length > 4 ? 'Use at most 4 numbers.' : null),
  run({ nums }) {
    const T = tracer(),
      steps: Step[] = [],
      res: number[][] = [],
      path: number[] = [];
    function dfs(start: number, parent: number | null, how: string | null) {
      const id = T.add(fmtArr(path), parent, how);
      T.enter(id);
      res.push([...path]);
      T.mark(id, 'current', '✓');
      steps.push(
        T.snap({
          line: 'rec',
          path: [...path],
          res: [...res],
          note: `Record ${fmtArr(path)}. Next elements may come from index ${start} on.`,
          why:
            start === 0
              ? 'Choosing only from `start` onward lists each set once, in increasing index order: [1,2] is generated, [2,1] never is.'
              : null,
        }),
      );
      for (let i = start; i < nums.length; i++) {
        path.push(nums[i]);
        steps.push(
          T.snap({
            line: ['loop', 'choose'],
            path: [...path],
            res: [...res],
            note: `Choose ${nums[i]} (index ${i}).`,
          }),
        );
        dfs(i + 1, id, '+' + nums[i]);
        path.pop();
      }
      T.leave(id);
    }
    dfs(0, null, null);
    steps.push(
      T.snap({
        path: [],
        res,
        done: true,
        result: res,
        line: null,
        note: `${res.length} subsets, one per node.`,
        why: 'This form extends directly to combinations (stop at size k) and to duplicate skipping (Subsets II).',
      }),
    );
    return steps;
  },
  view: (st, stage) => renderBT(st, stage),
  random: (g) => ({ nums: [...new Set(rarr(g, rint(g, 0, 4), 0, 9))] }),
});
