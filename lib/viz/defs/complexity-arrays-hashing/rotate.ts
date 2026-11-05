// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { gridCheck } from './_helpers';

interface Input {
  matrix: number[][];
}

interface Step extends VizStep {
  m: number[][];
  sw?: number[][];
  phase?: string;
  row?: number;
  done?: boolean;
  result?: number[][];
}

export default defineViz<Input, Step>('rotate', {
  title: 'Rotate 90° clockwise in place: transpose, then reverse each row',
  inputs: [
    {
      key: 'matrix',
      label: 'matrix (n × n)',
      type: 'json',
      def: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: '3 × 3',
      input: {
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ],
      },
    },
    {
      label: '4 × 4',
      input: {
        matrix: [
          [5, 1, 9, 11],
          [2, 4, 8, 10],
          [13, 3, 6, 7],
          [15, 14, 12, 16],
        ],
      },
    },
    { label: '1 × 1', input: { matrix: [[1]] } },
  ],
  legend: [
    ['current', 'swapped now'],
    ['done', 'final position'],
  ],
  code: `
function rotate(m) {
  const n = m.length;
  for (let i = 0; i < n; i++)                                    //@ti
    for (let j = i + 1; j < n; j++)                              //@tj
      [m[i][j], m[j][i]] = [m[j][i], m[i][j]];   // transpose    //@tswap
  for (const row of m) row.reverse();            // mirror       //@rev
}`,
  validate: ({ matrix }) =>
    gridCheck(matrix) ||
    (matrix.length !== matrix[0].length ? 'In-place rotation needs a square matrix.' : null),
  run({ matrix }) {
    const m = matrix.map((r) => [...r]),
      n = m.length,
      steps: Step[] = [];
    steps.push({
      line: null,
      m: m.map((r) => [...r]),
      note: 'Goal: element at (r, c) moves to (c, n − 1 − r).',
      why: 'Transpose sends (r, c) → (c, r); reversing each row then sends (c, r) → (c, n − 1 − r). Together they are the rotation.',
    });
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        [m[i][j], m[j][i]] = [m[j][i], m[i][j]];
        steps.push({
          line: 'tswap',
          m: m.map((r) => [...r]),
          sw: [
            [i, j],
            [j, i],
          ],
          note: `Transpose: swap m[${i}][${j}] and m[${j}][${i}].`,
          why: i === 0 && j === 1 ? 'Only j > i: swapping every pair twice would undo the transpose.' : null,
        });
      }
    steps.push({
      line: 'tswap',
      m: m.map((r) => [...r]),
      phase: 'T',
      note: 'Transpose finished: rows have become columns.',
    });
    m.forEach((row, r) => {
      row.reverse();
      steps.push({ line: 'rev', m: m.map((x) => [...x]), row: r, note: `Reverse row ${r}.` });
    });
    steps.push({
      line: null,
      m,
      done: true,
      result: m,
      note: 'Rotated.',
      why: 'n²/2 swaps plus n reversals: O(n²) time, O(1) extra space.',
    });
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {};
    if (st.sw) st.sw.forEach(([r, c]) => (states[r + ',' + c] = 'current'));
    if (st.row != null) st.m[0].forEach((_, c) => (states[st.row + ',' + c] = 'current'));
    if (st.done) st.m.forEach((row, r) => row.forEach((_, c) => (states[r + ',' + c] = 'done')));
    stage.append(R.grid(st.m, { states, label: 'matrix' }));
  },
  random: (g) => {
    const n = rint(g, 1, 6);
    let v = 1;
    return { matrix: Array.from({ length: n }, () => Array.from({ length: n }, () => v++)) };
  },
});
