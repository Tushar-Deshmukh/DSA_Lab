// Ported from legacy/src/viz/w05.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { tracer } from './_helpers';

interface Input {
  n: number;
  memo: string;
}

interface Step extends VizStep {
  tree: { id: number; label: string; parent: number | null; state: string; sub?: string }[];
  calls: number;
  done?: boolean;
  result?: number;
}

// ---------- recursion trees ----------
export default defineViz<Input, Step>('rec-fib', {
  title: 'Naive Fibonacci: the same subproblems again and again',
  inputs: [
    { key: 'n', label: 'n', type: 'int', def: 5 },
    {
      key: 'memo',
      label: 'memoise?',
      type: 'select',
      def: 'no',
      options: [
        { value: 'no', label: 'no (plain recursion)' },
        { value: 'yes', label: 'yes (cache results)' },
      ],
    },
  ],
  presets: [
    { label: 'fib(5), no memo', input: { n: 5, memo: 'no' } },
    { label: 'fib(5), with memo', input: { n: 5, memo: 'yes' } },
    { label: 'fib(6), no memo', input: { n: 6, memo: 'no' } },
  ],
  legend: [
    ['current', 'running'],
    ['frontier', 'waiting'],
    ['done', 'returned'],
    ['compare', 'answered from the cache'],
  ],
  code: `
function fib(n, memo = new Map()) {
  if (n <= 1) return n;                       // base cases   //@base
  if (memo.has(n)) return memo.get(n);        // memo only    //@hit
  const v = fib(n - 1, memo) + fib(n - 2, memo);             //@rec
  memo.set(n, v);                             // memo only    //@store
  return v;                                                   //@ret
}`,
  validate: ({ n }) => (n < 0 || n > 6 ? 'Use 0 ≤ n ≤ 6 (fib(6) already makes 25 calls).' : null),
  run({ n, memo }) {
    const T = tracer(),
      steps: Step[] = [],
      cache: Map<number, number> = new Map();
    let calls = 0;
    function f(k: number, parent: number | null): number {
      const id = T.add('f(' + k + ')', parent);
      T.enter(id);
      calls++;
      if (k <= 1) {
        T.mark(id, 'current', '=' + k);
        steps.push(T.snap({ line: 'base', calls, note: `fib(${k}) = ${k}: base case.` }));
        T.leave(id);
        return k;
      }
      if (memo === 'yes' && cache.has(k)) {
        T.mark(id, 'current', '=' + cache.get(k));
        steps.push(
          T.snap({
            line: 'hit',
            calls,
            note: `fib(${k}) is already in the cache: ${cache.get(k)}. No further calls.`,
            why: 'This is the whole effect of memoisation: each subproblem is computed once.',
          }),
        );
        T.leave(id, 'compare');
        return cache.get(k)!;
      }
      steps.push(
        T.snap({ line: 'rec', calls, note: `fib(${k}) calls fib(${k - 1}) and then fib(${k - 2}).` }),
      );
      const v: number = f(k - 1, id) + f(k - 2, id);
      if (memo === 'yes') cache.set(k, v);
      T.mark(id, 'current', '=' + v);
      steps.push(
        T.snap({ line: memo === 'yes' ? ['store', 'ret'] : 'ret', calls, note: `fib(${k}) = ${v}.` }),
      );
      T.leave(id);
      return v;
    }
    const v = f(n, null);
    steps.push(
      T.snap({
        line: null,
        calls,
        done: true,
        result: v,
        note: `fib(${n}) = ${v} using ${calls} calls.`,
        why:
          memo === 'yes'
            ? 'With a cache every n is computed once: O(n) calls, O(n) space. This is top-down dynamic programming (Module 10).'
            : 'Each call branches twice, so calls grow like ~1.6ⁿ: exponential. Count how often fib(2) appears in the tree.',
      }),
    );
    return steps;
  },
  view(st, stage) {
    stage.append(R.tree(st.tree, { dx: 44, dy: 50, r: 16, label: 'recursion tree' }));
    stage.append(R.vars({ 'calls so far': st.calls }));
  },
  random: (g) => ({ n: rint(g, 0, 6), memo: g() < 0.5 ? 'yes' : 'no' }),
});
