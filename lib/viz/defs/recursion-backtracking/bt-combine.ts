// Ported from legacy/src/viz/w05.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { fmtArr, tracer, renderBT } from './_helpers';

interface Input {
  n: number;
  k: number;
  prune: string;
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
  calls: number;
  done?: boolean;
  result?: number[][];
}

// ---------- combinations ----------
export default defineViz<Input, Step>('bt-combine', {
  title: 'Combinations of size k, with the pruning bound',
  inputs: [
    { key: 'n', label: 'n', type: 'int', def: 4 },
    { key: 'k', label: 'k', type: 'int', def: 2 },
    {
      key: 'prune',
      label: 'prune?',
      type: 'select',
      def: 'yes',
      options: [
        { value: 'yes', label: 'yes: stop when too few remain' },
        { value: 'no', label: 'no pruning' },
      ],
    },
  ],
  presets: [
    { label: 'n = 4, k = 2', input: { n: 4, k: 2, prune: 'yes' } },
    { label: 'n = 4, k = 3, pruned', input: { n: 4, k: 3, prune: 'yes' } },
    { label: 'n = 4, k = 3, not pruned', input: { n: 4, k: 3, prune: 'no' } },
  ],
  legend: [
    ['current', 'running'],
    ['done', 'combination recorded'],
    ['dim', 'pruned'],
  ],
  code: `
function combine(n, k) {
  const res = [], path = [];
  function dfs(start) {
    if (path.length === k) { res.push([...path]); return; }              //@leaf
    for (let i = start; i <= n; i++) {
      if (n - i + 1 < k - path.length) break;   // too few numbers left    //@prune
      path.push(i); dfs(i + 1); path.pop();                              //@choose
    }
  }
  dfs(1);
  return res;
}`,
  validate: ({ n, k }) => (n < 1 || n > 5 ? 'Use 1 ≤ n ≤ 5.' : k < 1 || k > n ? 'Use 1 ≤ k ≤ n.' : null),
  run({ n, k, prune }) {
    const T = tracer(),
      steps: Step[] = [],
      res: number[][] = [],
      path: number[] = [];
    let calls = 0;
    function dfs(start: number, parent: number | null, how: string | null) {
      const id = T.add(fmtArr(path), parent, how);
      T.enter(id);
      calls++;
      if (path.length === k) {
        res.push([...path]);
        T.mark(id, 'current', '✓');
        steps.push(
          T.snap({
            line: 'leaf',
            path: [...path],
            res: [...res],
            calls,
            note: `Size ${k}: record ${fmtArr(path)}.`,
          }),
        );
        T.leave(id);
        return;
      }
      for (let i = start; i <= n; i++) {
        if (prune === 'yes' && n - i + 1 < k - path.length) {
          const pr = T.add('✗', id, '+' + i);
          T.mark(pr, 'dim');
          steps.push(
            T.snap({
              line: 'prune',
              path: [...path],
              res: [...res],
              calls,
              note: `From ${i} only ${n - i + 1} number${n - i + 1 === 1 ? '' : 's'} remain, but ${k - path.length} are needed: break.`,
              why: 'Breaking (not continuing) is right because larger i leave even fewer numbers.',
            }),
          );
          break;
        }
        path.push(i);
        steps.push(T.snap({ line: 'choose', path: [...path], res: [...res], calls, note: `Choose ${i}.` }));
        dfs(i + 1, id, '+' + i);
        path.pop();
      }
      if (path.length + (n - start + 1) < k && prune === 'no' && path.length < k) T.mark(id, 'error', 'dead');
      T.leave(id, path.length + (n - start + 1) < k && prune === 'no' ? 'error' : 'done');
    }
    dfs(1, null, null);
    steps.push(
      T.snap({
        path: [],
        res,
        calls,
        done: true,
        result: res,
        line: null,
        note: `${res.length} combinations using ${calls} calls${prune === 'yes' ? ' (with pruning)' : ' (without pruning: red nodes are dead ends)'}.`,
        why: 'C(n, k) results, each O(k) to copy. Pruning removes dead branches; compare the call count with the other setting.',
      }),
    );
    return steps;
  },
  view: (st, stage) => renderBT(st, stage, R.vars({ calls: st.calls })),
  random: (g) => {
    const n = rint(g, 1, 5);
    return { n, k: rint(g, 1, n), prune: g() < 0.5 ? 'yes' : 'no' };
  },
});
