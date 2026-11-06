// Ported from legacy/src/viz/w02.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  n: number;
  updates: number[][];
}

interface Step extends VizStep {
  diff: number[];
  out: number[];
  ch?: number[];
  upd?: number[];
  i?: number;
  run?: number;
  result?: number[];
  done?: boolean;
}

export default defineViz<Input, Step>('diff-array', {
  title: 'Difference array: many range updates, one prefix pass',
  inputs: [
    { key: 'n', label: 'n', type: 'int', def: 6 },
    {
      key: 'updates',
      label: 'updates [l, r, v] (0-based)',
      type: 'json',
      def: [
        [0, 2, 10],
        [1, 4, 5],
        [3, 5, -2],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'Lesson 5 trace',
      input: {
        n: 6,
        updates: [
          [0, 2, 10],
          [1, 4, 5],
          [3, 5, -2],
        ],
      },
    },
    {
      label: 'LeetCode 1109 (as 0-based)',
      input: {
        n: 5,
        updates: [
          [0, 1, 10],
          [1, 2, 20],
          [1, 4, 25],
        ],
      },
    },
  ],
  legend: [
    ['current', 'changed now'],
    ['done', 'final value'],
  ],
  code: `
function rangeAdd(n, updates) {
  const diff = new Array(n + 1).fill(0);      //@init
  for (const [l, r, v] of updates) {          //@loop
    diff[l] += v;          // start adding v  //@start
    diff[r + 1] -= v;      // stop after r    //@stop
  }
  const out = new Array(n);                   //@out
  let run = 0;                                //@run
  for (let i = 0; i < n; i++) {               //@loop2
    run += diff[i];                           //@acc
    out[i] = run;                             //@set
  }
  return out;                                 //@ret
}`,
  validate: ({ n, updates }) =>
    n < 1 || n > 14
      ? 'n must be 1–14.'
      : !Array.isArray(updates) ||
          updates.some((u) => !Array.isArray(u) || u.length !== 3 || u[0] < 0 || u[1] >= n || u[0] > u[1])
        ? 'Each update is [l, r, v] with 0 ≤ l ≤ r < n.'
        : updates.length > 8
          ? 'Use at most 8 updates.'
          : null,
  run({ n, updates }) {
    const steps: Step[] = [],
      diff = new Array(n + 1).fill(0);
    steps.push({
      line: 'init',
      diff: [...diff],
      out: [],
      note: `diff has n + 1 = ${n + 1} slots, so diff[r + 1] exists even when r = n − 1.`,
    });
    updates.forEach(([l, r, v]) => {
      diff[l] += v;
      diff[r + 1] -= v;
      steps.push({
        line: ['loop', 'start', 'stop'],
        diff: [...diff],
        out: [],
        ch: [l, r + 1],
        upd: [l, r, v],
        note: `Update [${l}, ${r}] += ${v}: diff[${l}] += ${v}, diff[${r + 1}] −= ${v}.`,
        why:
          'Two writes instead of ' +
          (r - l + 1) +
          '. A running sum will "switch on" v at l and "switch it off" after r.',
      });
    });
    const out: number[] = [];
    let run = 0;
    for (let i = 0; i < n; i++) {
      run += diff[i];
      out.push(run);
      steps.push({
        line: ['acc', 'set'],
        diff: [...diff],
        out: [...out],
        i,
        run,
        note: `run += diff[${i}] (${diff[i]}) → ${run}; out[${i}] = ${run}.`,
      });
    }
    steps.push({
      result: out,
      line: 'ret',
      diff,
      out,
      done: true,
      note: `Result [${out.join(', ')}].`,
      why: `${updates.length} updates cost O(1) each, plus one O(n) pass: O(k + n) instead of O(k·n).`,
    });
    return steps;
  },
  view(st, stage, { n }) {
    const ds: Record<string, string> = {};
    if (st.ch) st.ch.forEach((i) => (ds[i] = 'current'));
    if (st.i != null) ds[st.i] = 'current';
    stage.append(R.cells(st.diff, { states: ds, label: 'diff (n + 1 slots)' }));
    const os: Record<string, string | null> = {};
    st.out.forEach((_, i) => (os[i] = st.done ? 'done' : i === st.i ? 'current' : null));
    stage.append(
      R.cells(
        Array.from({ length: n }, (_, i) => (i < st.out.length ? st.out[i] : '')),
        { states: os, label: 'out (prefix sum of diff)' },
      ),
    );
    if (st.run != null) stage.append(R.vars({ run: st.run }));
  },
  random: (g) => {
    const n = rint(g, 1, 14);
    return {
      n,
      updates: Array.from({ length: rint(g, 0, 8) }, () => {
        const l = rint(g, 0, n - 1);
        return [l, rint(g, l, n - 1), rint(g, -5, 10)];
      }),
    };
  },
});
