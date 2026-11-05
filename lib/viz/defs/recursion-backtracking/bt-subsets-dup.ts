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
    sub?: string;
    edgeLabel?: string;
  }[];
  path: number[];
  res: number[][];
  done?: boolean;
  result?: number[][];
}

export default defineViz<Input, Step>('bt-subsets-dup', {
  title: 'Subsets II: sort, then skip equal values at the same level',
  inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [1, 2, 2] }],
  presets: [
    { label: 'Handbook dry run [1,2,2]', input: { nums: [1, 2, 2] } },
    { label: '[2,2,2]', input: { nums: [2, 2, 2] } },
    { label: '[1,2,2,3]', input: { nums: [1, 2, 2, 3] } },
  ],
  legend: [
    ['current', 'running'],
    ['frontier', 'on the stack'],
    ['done', 'returned'],
    ['dim', 'skipped duplicate branch'],
  ],
  code: `
function subsetsWithDup(nums) {
  nums.sort((a, b) => a - b);
  const res = [], path = [];
  function dfs(start) {
    res.push([...path]);                                         //@rec
    for (let i = start; i < nums.length; i++) {
      if (i > start && nums[i] === nums[i - 1]) continue;        //@skip
      path.push(nums[i]); dfs(i + 1); path.pop();                //@choose
    }
  }
  dfs(0);
  return res;
}`,
  validate: ({ nums }) => (nums.length > 4 ? 'Use at most 4 numbers.' : null),
  run({ nums: input }) {
    const nums = [...input].sort((a, b) => a - b);
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
          note: `Record ${fmtArr(path)} (start = ${start}).`,
        }),
      );
      for (let i = start; i < nums.length; i++) {
        if (i > start && nums[i] === nums[i - 1]) {
          const sk = T.add('skip', id, '+' + nums[i]);
          T.mark(sk, 'dim');
          steps.push(
            T.snap({
              line: 'skip',
              path: [...path],
              res: [...res],
              note: `i = ${i} > start = ${start} and nums[${i}] = nums[${i - 1}] = ${nums[i]}: skip.`,
              why: 'Choosing this 2 here would produce exactly the same branch as choosing the previous 2 at this level. Deeper in the branch (i = start) the duplicate is still allowed, which is how [1,2,2] is generated.',
            }),
          );
          continue;
        }
        path.push(nums[i]);
        steps.push(
          T.snap({ line: 'choose', path: [...path], res: [...res], note: `Choose ${nums[i]} (index ${i}).` }),
        );
        dfs(i + 1, id, '+' + nums[i]);
        path.pop();
      }
      T.leave(id);
    }
    dfs(0, null, null);
    steps.push(
      T.snap({ path: [], res, done: true, result: res, line: null, note: `${res.length} distinct subsets.` }),
    );
    return steps;
  },
  view: (st, stage) => renderBT(st, stage),
  random: (g) => ({ nums: rarr(g, rint(g, 0, 4), 1, 3) }),
});
