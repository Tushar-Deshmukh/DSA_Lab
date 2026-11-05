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
  cur?: number[];
  seen: Set<string>;
  out: number[];
  b: { top: number; bottom: number; left: number; right: number };
  done?: boolean;
  result?: number[];
}

export default defineViz<Input, Step>('spiral', {
  title: 'Spiral order with four shrinking boundaries',
  inputs: [
    {
      key: 'matrix',
      label: 'matrix',
      type: 'json',
      def: [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: '3 × 4',
      input: {
        matrix: [
          [1, 2, 3, 4],
          [5, 6, 7, 8],
          [9, 10, 11, 12],
        ],
      },
    },
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
    { label: '1 × n', input: { matrix: [[1, 2, 3, 4]] } },
    { label: 'n × 1', input: { matrix: [[1], [2], [3]] } },
    {
      label: '4 × 2',
      input: {
        matrix: [
          [1, 2],
          [3, 4],
          [5, 6],
          [7, 8],
        ],
      },
    },
  ],
  legend: [
    ['current', 'just added'],
    ['done', 'already output'],
    ['window', 'remaining ring'],
  ],
  code: `
function spiralOrder(m) {
  const out = [];
  let top = 0, bottom = m.length - 1, left = 0, right = m[0].length - 1;
  while (top <= bottom && left <= right) {                         //@while
    for (let c = left; c <= right; c++) out.push(m[top][c]);       //@top
    top++;
    for (let r = top; r <= bottom; r++) out.push(m[r][right]);     //@right
    right--;
    if (top <= bottom) {                                           //@chkb
      for (let c = right; c >= left; c--) out.push(m[bottom][c]);  //@bottom
      bottom--;
    }
    if (left <= right) {                                           //@chkl
      for (let r = bottom; r >= top; r--) out.push(m[r][left]);    //@left
      left++;
    }
  }
  return out;
}`,
  validate: ({ matrix }) => gridCheck(matrix),
  run({ matrix: m }) {
    const steps: Step[] = [],
      out: number[] = [],
      seen: Set<string> = new Set();
    let top = 0,
      bottom = m.length - 1,
      left = 0,
      right = m[0].length - 1;
    const push = (r: number, c: number, line: string, why: string | null) => {
      out.push(m[r][c]);
      seen.add(r + ',' + c);
      steps.push({
        line,
        cur: [r, c],
        seen: new Set(seen),
        out: [...out],
        b: { top, bottom, left, right },
        note: `Add m[${r}][${c}] = ${m[r][c]}.`,
        why,
      });
    };
    while (top <= bottom && left <= right) {
      for (let c = left; c <= right; c++)
        push(top, c, 'top', c === left ? 'Left to right along row top = ' + top + '.' : null);
      top++;
      for (let r = top; r <= bottom; r++)
        push(r, right, 'right', r === top ? 'Down column right = ' + right + '.' : null);
      right--;
      if (top <= bottom) {
        for (let c = right; c >= left; c--)
          push(
            bottom,
            c,
            'bottom',
            c === right
              ? 'Right to left along row bottom = ' + bottom + ' (only because top ≤ bottom still).'
              : null,
          );
        bottom--;
      } else
        steps.push({
          line: 'chkb',
          seen: new Set(seen),
          out: [...out],
          b: { top, bottom, left, right },
          note: `top (${top}) > bottom (${bottom}): no bottom row is left, so skip the leftward pass.`,
          why: 'Without this check, a single remaining row would be output twice. Try the 1 × n preset.',
        });
      if (left <= right) {
        for (let r = bottom; r >= top; r--)
          push(r, left, 'left', r === bottom ? 'Up column left = ' + left + '.' : null);
        left++;
      } else
        steps.push({
          line: 'chkl',
          seen: new Set(seen),
          out: [...out],
          b: { top, bottom, left, right },
          note: `left (${left}) > right (${right}): no left column is left, so skip the upward pass.`,
          why: 'Without this check, a single remaining column would be output twice. Try the n × 1 preset.',
        });
    }
    steps.push({
      line: null,
      seen,
      out,
      b: { top, bottom, left, right },
      done: true,
      result: out,
      note: `Done: ${out.length} = m × n elements, each output once.`,
      why: 'O(m·n) time; O(1) extra space besides the output (four integers instead of a visited matrix).',
    });
    return steps;
  },
  view(st, stage, { matrix: m }) {
    const states: Record<string, string> = {};
    m.forEach((row, r) =>
      row.forEach((_, c) => {
        const k = r + ',' + c;
        if (st.seen.has(k)) states[k] = 'done';
        else if (r >= st.b.top && r <= st.b.bottom && c >= st.b.left && c <= st.b.right) states[k] = 'window';
      }),
    );
    if (st.cur) states[st.cur.join(',')] = 'current';
    stage.append(R.grid(m, { states, label: 'matrix' }));
    stage.append(R.vars(st.b));
    stage.append(R.cells(st.out, { label: 'out' }));
  },
  random: (g) => {
    const r = rint(g, 1, 6),
      c = rint(g, 1, 6);
    let v = 1;
    return { matrix: Array.from({ length: r }, () => Array.from({ length: c }, () => v++)) };
  },
});
