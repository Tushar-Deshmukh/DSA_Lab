// Helpers shared by this module's visualizers, from legacy/src/viz/w01.js.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import type { VizStep } from '@/lib/viz/types';

interface LoopDefInput {
  n: number;
}

interface LoopDefStep extends VizStep {
  vars: Record<string, number>;
  count: number;
  done?: boolean;
  result?: number;
}

export const sizeCheck = (a: (number | string)[], lo: number, hi: number, what = 'array') =>
  a.length < lo
    ? 'Use at least ' + lo + ' element' + (lo > 1 ? 's.' : '.')
    : a.length > hi
      ? 'Keep the ' + what + ' to ' + hi + ' elements or fewer so it fits on screen.'
      : null;

export // ---------- counting loop iterations ----------
function loopDef(
  id: string,
  title: string,
  code: string,
  body: (n: number, hit: (vars: Record<string, number>, line: string) => void) => void,
  formula: (n: number) => string,
  why: string,
) {
  return defineViz<LoopDefInput, LoopDefStep>(id, {
    title,
    code,
    inputs: [{ key: 'n', label: 'n', type: 'int', def: 16 }],
    presets: [
      { label: 'n = 8', input: { n: 8 } },
      { label: 'n = 16', input: { n: 16 } },
      { label: 'n = 32', input: { n: 32 } },
    ],
    legend: [['current', 'this iteration']],
    validate: ({ n }) => (n < 1 || n > 32 ? 'Use 1 ≤ n ≤ 32 so the steps fit.' : null),
    run({ n }) {
      const steps: LoopDefStep[] = [];
      let count = 0;
      body(n, (vars, line) => {
        count++;
        steps.push({
          line,
          vars: { ...vars },
          count,
          note: `work() call #${count}: ${Object.entries(vars)
            .map(([k, v]) => k + ' = ' + v)
            .join(', ')}.`,
        });
      });
      steps.push({
        line: null,
        vars: {},
        count,
        done: true,
        result: count,
        note: `Total: ${count} calls for n = ${n}. ${formula(n)}`,
        why,
      });
      return steps;
    },
    view(st, stage, { n }) {
      stage.append(R.vars(Object.assign({ n }, st.vars, { 'work() calls so far': st.count })));
      stage.append(
        R.panel('one mark per work() call', R.marks(st.count, st.done ? undefined : st.count - 1)),
      );
    },
  });
}

export // ---------- matrices ----------
const gridCheck = (m: number[][]) =>
  !Array.isArray(m) ||
  !m.length ||
  !m.every((r) => Array.isArray(r) && r.length === m[0].length && r.length > 0)
    ? 'Enter a rectangular grid such as [[1,2],[3,4]].'
    : m.length > 7 || m[0].length > 7
      ? 'Keep it to 7 × 7.'
      : null;
