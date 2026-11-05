// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  n: number;
}

interface Step extends VizStep {
  nodes: { id: number; label: string; parent: number | null; state: string }[];
  stack: string[];
  calls: number;
  maxDepth: number;
  done?: boolean;
  result?: number;
}

// ---------- recursion tree ----------
export default defineViz<Input, Step>('tree-double', {
  title: 'Recursion tree: two calls on n − 1 is O(2ⁿ)',
  inputs: [{ key: 'n', label: 'n', type: 'int', def: 4 }],
  presets: [
    { label: 'n = 3', input: { n: 3 } },
    { label: 'n = 4', input: { n: 4 } },
    { label: 'n = 5', input: { n: 5 } },
  ],
  legend: [
    ['current', 'running now'],
    ['frontier', 'waiting on the stack'],
    ['done', 'returned'],
  ],
  code: `
function f(n) {
  if (n <= 1) return;   // base case     //@base
  f(n - 1);             // first call    //@c1
  f(n - 1);             // second call   //@c2
}                                        //@ret`,
  validate: ({ n }) => (n < 1 || n > 5 ? 'Use 1 ≤ n ≤ 5 (n = 5 already makes 31 calls).' : null),
  run({ n }) {
    const steps: Step[] = [],
      nodes: { id: number; label: string; parent: number | null }[] = [],
      stack: { n: number; id: number }[] = [];
    let id = 0,
      maxDepth = 0;
    const state: Record<string, string> = {};
    const snap = <O extends object>(o: O) => ({
      nodes: nodes.map((x) => ({ ...x, state: state[x.id] })),
      stack: stack.map((x) => 'f(' + x.n + ')'),
      calls: nodes.length,
      maxDepth,
      ...o,
    });
    function call(k: number, parent: number | null) {
      const me = id++;
      nodes.push({ id: me, label: 'f(' + k + ')', parent });
      stack.push({ n: k, id: me });
      maxDepth = Math.max(maxDepth, stack.length);
      stack.forEach((x) => (state[x.id] = 'frontier'));
      state[me] = 'current';
      if (k <= 1) {
        steps.push(snap({ line: 'base', note: `f(${k}): base case, return immediately.` }));
      } else {
        steps.push(
          snap({
            line: 'c1',
            note: `f(${k}) calls f(${k - 1}) for the first time.`,
            why:
              me === 0
                ? 'The caller waits on the stack until the call returns: this is the call stack.'
                : null,
          }),
        );
        call(k - 1, me);
        state[me] = 'current';
        steps.push(
          snap({
            line: 'c2',
            note: `Back in f(${k}); it calls f(${k - 1}) again.`,
            why: 'The second call repeats all the work of the first: nothing is remembered between them.',
          }),
        );
        call(k - 1, me);
        state[me] = 'current';
      }
      stack.pop();
      state[me] = 'done';
      steps.push(snap({ line: 'ret', note: `f(${k}) returns.` }));
    }
    call(n, null);
    steps.push(
      snap({
        line: null,
        done: true,
        result: nodes.length,
        note: `${nodes.length} calls in total = 2^${n} − 1. Deepest stack: ${maxDepth} frames.`,
        why: 'Time = number of calls × work per call = O(2ⁿ) × O(1). Space = deepest stack = O(n): only one root-to-leaf path is on the stack at a time.',
      }),
    );
    return steps;
  },
  view(st, stage) {
    stage.append(R.tree(st.nodes, { dx: 46, dy: 54, r: 17, label: 'recursion tree (one node per call)' }));
    stage.append(R.vars({ 'calls so far': st.calls, 'max stack depth': st.maxDepth }));
    stage.append(R.frames(st.stack.map((t) => ({ text: t }))));
  },
  random: (g) => ({ n: rint(g, 1, 5) }),
});
