// Ported from legacy/src/viz/w05.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { tracer } from './_helpers';

interface Input {
  x: number;
  n: number;
}

interface Step extends VizStep {
  tree: { id: number; label: string; parent: number | null; state: string; sub?: string }[];
  calls: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('rec-pow', {
  title: 'Fast power: one branch per level, log n levels',
  inputs: [
    { key: 'x', label: 'x', type: 'number', def: 2 },
    { key: 'n', label: 'n', type: 'int', def: 13 },
  ],
  presets: [
    { label: '2^13', input: { x: 2, n: 13 } },
    { label: '2^-2', input: { x: 2, n: -2 } },
    { label: '3^0', input: { x: 3, n: 0 } },
    { label: '1.5^10', input: { x: 1.5, n: 10 } },
  ],
  legend: [
    ['current', 'running'],
    ['frontier', 'waiting'],
    ['done', 'returned'],
  ],
  code: `
function myPow(x, n) {
  if (n < 0) return 1 / myPow(x, -n);       // once, at the top  //@neg
  if (n === 0) return 1;                                        //@base
  const half = myPow(x, Math.floor(n / 2)); // computed ONCE    //@half
  return n % 2 === 0 ? half * half : half * half * x;           //@ret
}`,
  validate: ({ x, n }) =>
    Math.abs(n) > 1e6 ? 'Keep |n| ≤ 10⁶.' : x === 0 && n < 0 ? '0 to a negative power is undefined.' : null,
  run({ x, n }) {
    const T = tracer(),
      steps: Step[] = [];
    let calls = 0;
    const fmt = (v: number) => (Number.isInteger(v) ? String(v) : +v.toPrecision(6) + '');
    function p(k: number, parent: number | null): number {
      const id = T.add('pow(' + k + ')', parent);
      T.enter(id);
      calls++;
      if (k < 0) {
        steps.push(T.snap({ line: 'neg', calls, note: `n = ${k} < 0: compute 1 / x^${-k}.` }));
        const v: number = 1 / p(-k, id);
        T.mark(id, 'current', '=' + fmt(v));
        steps.push(T.snap({ line: 'neg', calls, note: `1 / ${fmt(1 / v)} = ${fmt(v)}.` }));
        T.leave(id);
        return v;
      }
      if (k === 0) {
        T.mark(id, 'current', '=1');
        steps.push(T.snap({ line: 'base', calls, note: 'x⁰ = 1.' }));
        T.leave(id);
        return 1;
      }
      steps.push(
        T.snap({
          line: 'half',
          calls,
          note: `x^${k}: compute half = x^${Math.floor(k / 2)} once.`,
          why:
            calls === 1
              ? 'Calling myPow(x, n/2) twice instead of storing it would turn this chain into a binary tree with ~n nodes: O(n) instead of O(log n).'
              : null,
        }),
      );
      const h: number = p(Math.floor(k / 2), id);
      const v: number = k % 2 === 0 ? h * h : h * h * x;
      T.mark(id, 'current', '=' + fmt(v));
      steps.push(
        T.snap({
          line: 'ret',
          calls,
          note: `${k} is ${k % 2 === 0 ? 'even: half × half' : 'odd: half × half × x'} = ${fmt(v)}.`,
        }),
      );
      T.leave(id);
      return v;
    }
    const v = p(n, null);
    steps.push(
      T.snap({
        line: null,
        calls,
        done: true,
        result: v,
        note: `x^n = ${fmt(v)} in ${calls} calls.`,
        why: 'n halves at every level: about log₂|n| + 2 calls, O(log n) time and O(log n) stack.',
      }),
    );
    return steps;
  },
  view(st, stage) {
    stage.append(R.tree(st.tree, { dx: 120, dy: 46, r: 16, label: 'recursion tree (a chain)' }));
    stage.append(R.vars({ calls: st.calls }));
  },
  random: (g) => ({ x: [2, 3, 0.5, -2, 1.5][rint(g, 0, 4)], n: rint(g, -12, 20) }),
});
