// Ported from legacy/src/viz/w03.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint, sorted } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { isSorted, ptrsOf } from './_helpers';

interface Input {
  matrix: number[][];
  target: number;
}

interface Step extends VizStep {
  lo: number;
  hi: number;
  mid?: number;
  found?: boolean;
  result?: boolean;
  done?: boolean;
}

export default defineViz<Input, Step>('bs-matrix', {
  title: 'A sorted matrix searched as one flattened array',
  inputs: [
    {
      key: 'matrix',
      label: "matrix (rows sorted, each row starts above the previous row's end)",
      type: 'json',
      def: [
        [1, 3, 5, 7],
        [10, 11, 16, 20],
        [23, 30, 34, 60],
      ],
      wide: true,
    },
    { key: 'target', label: 'target', type: 'number', def: 3 },
  ],
  presets: [
    {
      label: 'LeetCode example 1',
      input: {
        matrix: [
          [1, 3, 5, 7],
          [10, 11, 16, 20],
          [23, 30, 34, 60],
        ],
        target: 3,
      },
    },
    {
      label: 'LeetCode example 2 (absent)',
      input: {
        matrix: [
          [1, 3, 5, 7],
          [10, 11, 16, 20],
          [23, 30, 34, 60],
        ],
        target: 13,
      },
    },
    { label: 'Single column', input: { matrix: [[1], [3], [5]], target: 5 } },
  ],
  legend: [
    ['window', 'range [lo, hi]'],
    ['current', 'mid'],
    ['done', 'found'],
  ],
  code: `
function searchMatrix(matrix, target) {
  const m = matrix.length, n = matrix[0].length;
  let lo = 0, hi = m * n - 1;                          //@init
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);                 //@mid
    const v = matrix[Math.floor(mid / n)][mid % n];    //@map
    if (v === target) return true;                     //@hit
    if (v < target) lo = mid + 1;                      //@right
    else hi = mid - 1;                                 //@left
  }
  return false;                                        //@none
}`,
  validate: ({ matrix: m }) => {
    if (
      !Array.isArray(m) ||
      !m.length ||
      !m.every((r) => Array.isArray(r) && r.length === m[0].length && r.length)
    )
      return 'Enter a rectangular grid.';
    if (m.length > 6 || m[0].length > 6) return 'Keep it to 6 × 6.';
    const f = m.flat();
    return isSorted(f) ? null : 'Read row by row, the values must be sorted.';
  },
  run({ matrix: m, target }) {
    const n = m[0].length,
      steps: Step[] = [];
    let lo = 0,
      hi = m.length * n - 1;
    steps.push({
      lo,
      hi,
      line: 'init',
      note: `Treat the ${m.length} × ${n} matrix as one sorted array of ${m.length * n} elements, indices 0..${m.length * n - 1}.`,
    });
    while (lo <= hi) {
      const mid = lo + ((hi - lo) >> 1),
        r = Math.floor(mid / n),
        c = mid % n,
        v = m[r][c];
      if (v === target) {
        steps.push({
          lo,
          hi,
          mid,
          found: true,
          line: ['mid', 'map', 'hit'],
          result: true,
          note: `mid = ${mid} → row ⌊${mid}/${n}⌋ = ${r}, col ${mid} % ${n} = ${c}: value ${v} = target. Return true.`,
        });
        return steps;
      }
      steps.push({
        lo,
        hi,
        mid,
        line: ['mid', 'map', v < target ? 'right' : 'left'],
        note: `mid = ${mid} → (${r}, ${c}) = ${v} ${v < target ? '<' : '>'} ${target} → ${v < target ? 'lo = ' + (mid + 1) : 'hi = ' + (mid - 1)}.`,
        why:
          mid === lo + ((hi - lo) >> 1) && steps.length === 1
            ? 'Row = index divided by the number of columns; column = the remainder. No 2-D search logic is needed.'
            : null,
      });
      if (v < target) lo = mid + 1;
      else hi = mid - 1;
    }
    steps.push({
      lo,
      hi,
      line: 'none',
      done: true,
      result: false,
      note: 'Range empty: not found.',
      why: 'O(log(m·n)) time, O(1) space.',
    });
    return steps;
  },
  view(st, stage, { matrix: m }) {
    const n = m[0].length,
      states: Record<string, string> = {};
    m.forEach((row, r) =>
      row.forEach((_, c) => {
        const i = r * n + c;
        if (i >= st.lo && i <= st.hi) states[r + ',' + c] = 'window';
        else states[r + ',' + c] = 'dim';
      }),
    );
    if (st.mid != null) states[Math.floor(st.mid / n) + ',' + (st.mid % n)] = st.found ? 'done' : 'current';
    stage.append(R.grid(m, { states, label: 'matrix' }));
    const f = m.flat();
    const fs: Record<string, string> = {};
    f.forEach((_, i) => {
      if (i < st.lo || i > st.hi) fs[i] = 'dim';
    });
    if (st.mid != null) fs[st.mid] = st.found ? 'done' : 'current';
    stage.append(
      R.cells(f, {
        states: fs,
        ptrs: ptrsOf([
          [st.lo < f.length ? st.lo : null, 'lo'],
          [st.hi >= 0 ? st.hi : null, 'hi'],
          [st.mid, 'mid'],
        ]),
        label: 'the same values as one array',
      }),
    );
  },
  random: (g) => {
    const r = rint(g, 1, 6),
      c = rint(g, 1, 6);
    const f = sorted(rarr(g, r * c, 0, 60));
    return {
      matrix: Array.from({ length: r }, (_, i) => f.slice(i * c, i * c + c)),
      target: rint(g, -1, 61),
    };
  },
});
