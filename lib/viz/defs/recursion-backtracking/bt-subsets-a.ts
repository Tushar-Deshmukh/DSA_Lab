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

// ---------- subsets ----------
export default defineViz<Input, Step>('bt-subsets-a', {
  title: 'Subsets, way A: take or skip each element',
  inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [1, 2, 3] }],
  presets: [
    { label: '[1, 2]', input: { nums: [1, 2] } },
    { label: '[1, 2, 3]', input: { nums: [1, 2, 3] } },
  ],
  legend: [
    ['current', 'running'],
    ['frontier', 'on the stack'],
    ['done', 'leaf: subset recorded'],
  ],
  code: `
function subsetsA(nums) {
  const res = [], path = [];
  function dfs(i) {
    if (i === nums.length) { res.push([...path]); return; }  //@leaf
    path.push(nums[i]); dfs(i + 1); path.pop();   // take     //@take
    dfs(i + 1);                                   // skip     //@skip
  }
  dfs(0);
  return res;
}`,
  validate: ({ nums }) => (nums.length > 4 ? 'Use at most 4 numbers (already 31 calls).' : null),
  run({ nums }) {
    const T = tracer(),
      steps: Step[] = [],
      res: number[][] = [],
      path: number[] = [];
    function dfs(i: number, parent: number | null, how: string | null) {
      const id = T.add(fmtArr(path), parent, how);
      T.enter(id);
      if (i === nums.length) {
        res.push([...path]);
        T.mark(id, 'current', '✓');
        steps.push(
          T.snap({
            line: 'leaf',
            path: [...path],
            res: [...res],
            note: `All ${nums.length} decisions made: record ${fmtArr(path)}.`,
          }),
        );
        T.leave(id);
        return;
      }
      path.push(nums[i]);
      steps.push(
        T.snap({ line: 'take', path: [...path], res: [...res], note: `Level ${i}: take ${nums[i]}.` }),
      );
      dfs(i + 1, id, '+' + nums[i]);
      path.pop();
      steps.push(
        T.snap({
          line: 'skip',
          path: [...path],
          res: [...res],
          note: `Undo (pop ${nums[i]}); now skip ${nums[i]}.`,
          why: 'The pop restores path exactly as it was before the take branch, so one shared array serves the whole search.',
        }),
      );
      dfs(i + 1, id, '−');
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
        note: `${res.length} = 2^${nums.length} subsets, one per leaf.`,
        why: 'There are 2ⁿ leaves and copying each subset costs up to n: O(n · 2ⁿ) time, O(n) recursion depth.',
      }),
    );
    return steps;
  },
  view: (st, stage) => renderBT(st, stage),
  random: (g) => ({ nums: [...new Set(rarr(g, rint(g, 0, 4), 0, 9))] }),
});
