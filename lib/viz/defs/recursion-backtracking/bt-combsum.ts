// Ported from legacy/src/viz/w05.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { fmtArr, tracer, renderBT } from './_helpers';

interface Input {
  cands: number[];
  target: number;
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

export default defineViz<Input, Step>('bt-combsum', {
  title: 'Combination Sum: reuse allowed (recurse with i), sorted + break',
  inputs: [
    { key: 'cands', label: 'candidates (distinct)', type: 'numbers', def: [2, 3, 6, 7] },
    { key: 'target', label: 'target', type: 'int', def: 7 },
  ],
  presets: [
    { label: 'Lesson 4 state table', input: { cands: [2, 3, 6, 7], target: 7 } },
    { label: 'LeetCode example 2', input: { cands: [2, 3, 5], target: 8 } },
    { label: 'Impossible', input: { cands: [2], target: 1 } },
  ],
  legend: [
    ['current', 'running'],
    ['done', 'sum reached: recorded'],
    ['dim', 'pruned: candidate > remaining'],
  ],
  code: `
function combinationSum(candidates, target) {
  candidates.sort((a, b) => a - b);
  const res = [], path = [];
  function dfs(start, remaining) {
    if (remaining === 0) { res.push([...path]); return; }             //@leaf
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break;     // sorted: rest too big  //@prune
      path.push(candidates[i]);
      dfs(i, remaining - candidates[i]);        // i: reuse allowed      //@rec
      path.pop();
    }
  }
  dfs(0, target);
  return res;
}`,
  validate: ({ cands, target }) =>
    cands.length > 5 || target > 12 || target < 1
      ? 'Use at most 5 candidates and a target of 1–12.'
      : cands.some((c) => c < 1)
        ? 'Candidates are positive.'
        : new Set(cands).size !== cands.length
          ? 'Candidates are distinct in problem 39.'
          : null,
  run({ cands: input, target }) {
    const c = [...input].sort((a, b) => a - b);
    const T = tracer(),
      steps: Step[] = [],
      res: number[][] = [],
      path: number[] = [];
    function dfs(start: number, rem: number, parent: number | null, how: string | null) {
      const id = T.add(String(rem), parent, how);
      T.enter(id);
      if (rem === 0) {
        res.push([...path]);
        T.mark(id, 'current', '✓');
        steps.push(
          T.snap({
            line: 'leaf',
            path: [...path],
            res: [...res],
            note: `Remaining 0: record ${fmtArr(path)}.`,
          }),
        );
        T.leave(id);
        return;
      }
      for (let i = start; i < c.length; i++) {
        if (c[i] > rem) {
          const pr = T.add('✗', id, '+' + c[i]);
          T.mark(pr, 'dim');
          steps.push(
            T.snap({
              line: 'prune',
              path: [...path],
              res: [...res],
              note: `${c[i]} > remaining ${rem}: break (every later candidate is larger too).`,
            }),
          );
          break;
        }
        path.push(c[i]);
        steps.push(
          T.snap({
            line: 'rec',
            path: [...path],
            res: [...res],
            note: `Choose ${c[i]} → remaining ${rem - c[i]}. Recurse with start = ${i}, so ${c[i]} may be used again.`,
            why:
              steps.length === 0
                ? 'Recursing with i (not i + 1) allows reuse; never going back below i keeps each combination in non-decreasing order, so [2,2,3] appears once and [3,2,2] never.'
                : null,
          }),
        );
        dfs(i, rem - c[i], id, '+' + c[i]);
        path.pop();
      }
      T.leave(id);
    }
    dfs(0, target, null, null);
    steps.push(
      T.snap({
        path: [],
        res,
        done: true,
        result: res,
        line: null,
        note: res.length
          ? `${res.length} combination${res.length > 1 ? 's' : ''}: ${res.map(fmtArr).join(' ')}.`
          : 'No combination reaches the target.',
      }),
    );
    return steps;
  },
  view: (st, stage) =>
    renderBT(st, stage, R.caption('Node labels show the remaining target.', { tone: 'muted' })),
  random: (g) => ({ cands: [...new Set(rarr(g, rint(g, 1, 4), 2, 7))], target: rint(g, 1, 12) }),
});
