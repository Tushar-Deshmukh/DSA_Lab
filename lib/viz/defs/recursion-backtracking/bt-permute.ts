// Ported from legacy/src/viz/w05.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
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
  used: boolean[];
  done?: boolean;
  result?: number[][];
}

// ---------- permutations ----------
export default defineViz<Input, Step>('bt-permute', {
  title: 'Permutations with a used array',
  inputs: [{ key: 'nums', label: 'nums (distinct)', type: 'numbers', def: [1, 2, 3] }],
  presets: [
    { label: '[1, 2, 3]', input: { nums: [1, 2, 3] } },
    { label: '[0, 1]', input: { nums: [0, 1] } },
  ],
  legend: [
    ['current', 'running'],
    ['frontier', 'on the stack'],
    ['done', 'returned'],
  ],
  code: `
function permute(nums) {
  const res = [], path = [], used = new Array(nums.length).fill(false);
  function dfs() {
    if (path.length === nums.length) { res.push([...path]); return; }  //@leaf
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;                                          //@used
      used[i] = true; path.push(nums[i]);        // choose            //@choose
      dfs();                                     // explore
      path.pop(); used[i] = false;               // unchoose          //@undo
    }
  }
  dfs();
  return res;
}`,
  validate: ({ nums }) =>
    nums.length > 4
      ? 'Use at most 4 numbers (4! = 24 leaves).'
      : new Set(nums).size !== nums.length
        ? 'Use distinct numbers (duplicates are problem 47).'
        : null,
  run({ nums }) {
    const T = tracer(),
      steps: Step[] = [],
      res: number[][] = [],
      path: number[] = [],
      used = new Array(nums.length).fill(false);
    const flags = () => used.map((u) => (u ? 'T' : 'F')).join('');
    function dfs(parent: number | null, how: string | null) {
      const id = T.add(fmtArr(path), parent, how);
      T.enter(id);
      if (path.length === nums.length) {
        res.push([...path]);
        T.mark(id, 'current', '✓');
        steps.push(
          T.snap({
            line: 'leaf',
            path: [...path],
            res: [...res],
            used: [...used],
            note: `Every position filled: record ${fmtArr(path)}.`,
          }),
        );
        T.leave(id);
        return;
      }
      for (let i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        path.push(nums[i]);
        steps.push(
          T.snap({
            line: 'choose',
            path: [...path],
            res: [...res],
            used: [...used],
            note: `Position ${path.length - 1} ← ${nums[i]}. used = ${flags()}.`,
            why:
              steps.length === 0
                ? 'Each level fills one position with one element that is not used yet, so each permutation is one root-to-leaf path.'
                : null,
          }),
        );
        dfs(id, String(nums[i]));
        path.pop();
        used[i] = false;
        steps.push(
          T.snap({
            line: 'undo',
            path: [...path],
            res: [...res],
            used: [...used],
            note: `Undo: remove ${nums[i]}, mark it unused.`,
          }),
        );
      }
      T.leave(id);
    }
    dfs(null, null);
    steps.push(
      T.snap({
        path: [],
        res,
        used,
        done: true,
        result: res,
        line: null,
        note: `${res.length} = ${nums.length}! permutations.`,
        why: 'n! leaves, each copied in O(n): O(n · n!) time; O(n) depth plus the used array.',
      }),
    );
    return steps;
  },
  view: (st, stage) =>
    renderBT(
      st,
      stage,
      st.used
        ? R.cells(
            st.used.map((u) => (u ? 'T' : 'F')),
            {
              label: 'used[i]',
              states: Object.fromEntries(
                st.used.map((u, i) => [i, u ? 'current' : null]).filter(([, v]) => v),
              ),
            },
          )
        : null,
    ),
  random: (g) => ({ nums: [...new Set(rarr(g, rint(g, 1, 4), 0, 9))] }),
});
