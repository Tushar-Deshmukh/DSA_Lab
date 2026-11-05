// Ported from legacy/src/viz/w10.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  mode: string;
  grid: number[][];
}

interface Step extends VizStep {
  dp: (number | null)[][];
  cur?: number[];
  dep?: number[][];
  best?: number[];
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('grid-dp', {
  title: 'Grid DP: each cell from the cell above and the cell to the left',
  inputs: [
    {
      key: 'mode',
      label: 'problem',
      type: 'select',
      def: 'paths',
      options: [
        { value: 'paths', label: '62/63: count paths (1 = obstacle)' },
        { value: 'sum', label: '64: minimum path sum' },
      ],
    },
    {
      key: 'grid',
      label: 'grid',
      type: 'json',
      def: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: '62: 3 × 3',
      input: {
        mode: 'paths',
        grid: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
      },
    },
    {
      label: '63: obstacle in the middle',
      input: {
        mode: 'paths',
        grid: [
          [0, 0, 0],
          [0, 1, 0],
          [0, 0, 0],
        ],
      },
    },
    {
      label: '63: obstacle on the first row',
      input: {
        mode: 'paths',
        grid: [
          [0, 1, 0],
          [0, 0, 0],
        ],
      },
    },
    {
      label: '64: LeetCode example',
      input: {
        mode: 'sum',
        grid: [
          [1, 3, 1],
          [1, 5, 1],
          [4, 2, 1],
        ],
      },
    },
  ],
  legend: [
    ['current', 'dp[r][c]'],
    ['compare', 'top and left'],
    ['done', 'answer'],
  ],
  code: `
// one row is enough: row[c] holds the row above until it is overwritten
for (let r = 0; r < m; r++)
  for (let c = 0; c < n; c++) {
    if (r === 0 && c === 0) row[0] = start;                     // base  //@base
    else row[c] = combine(r > 0 ? row[c] : none,                // top   //@trans
                          c > 0 ? row[c - 1] : none) + cell;    // left
  }
return row[n - 1];                                              //@ret
// paths: combine = +, none = 0, obstacle → 0.   sum: combine = min, none = ∞`,
  validate: ({ mode, grid }) =>
    !Array.isArray(grid) ||
    !grid.length ||
    grid.length > 6 ||
    grid.some((r) => !Array.isArray(r) || r.length !== grid[0].length || r.length > 6)
      ? 'Use a rectangular grid up to 6 × 6.'
      : mode === 'paths' && grid.flat().some((v) => v !== 0 && v !== 1)
        ? 'For paths, use 0 (open) and 1 (obstacle).'
        : mode === 'sum' && grid.flat().some((v) => v < 0)
          ? 'Use non-negative cell costs.'
          : null,
  run({ mode, grid }) {
    const m = grid.length,
      n = grid[0].length,
      dp: (number | null)[][] = grid.map((r) => r.map(() => null)),
      steps: Step[] = [];
    for (let r = 0; r < m; r++)
      for (let c = 0; c < n; c++) {
        const top = r > 0 ? dp[r - 1][c] : null,
          left = c > 0 ? dp[r][c - 1] : null;
        let note: string;
        if (mode === 'paths') {
          if (grid[r][c] === 1) {
            dp[r][c] = 0;
            note = `(${r},${c}) is an obstacle: 0 paths.`;
          } else if (!r && !c) {
            dp[r][c] = 1;
            note = 'Start: 1 path.';
          } else {
            dp[r][c] = (top || 0) + (left || 0);
            note = `(${r},${c}) = top ${top ?? '—'} + left ${left ?? '—'} = ${dp[r][c]}.`;
          }
        } else {
          if (!r && !c) {
            dp[r][c] = grid[0][0];
            note = `Start: cost ${grid[0][0]}.`;
          } else {
            const best = Math.min(top ?? Infinity, left ?? Infinity);
            dp[r][c] = best + grid[r][c];
            note = `(${r},${c}) = min(top ${top ?? '—'}, left ${left ?? '—'}) + ${grid[r][c]} = ${dp[r][c]}.`;
          }
        }
        steps.push({
          dp: dp.map((x) => [...x]),
          cur: [r, c],
          dep: [r > 0 && [r - 1, c], c > 0 && [r, c - 1]].filter(Boolean) as number[][],
          line: !r && !c ? 'base' : 'trans',
          note,
          why:
            r === 1 && c === 1
              ? 'Every path into (r, c) arrives from above or from the left, so those two cells are all it needs. When filling row r, the row above is only read at column c, so one array updated left to right holds both.'
              : r === 0 && c === 1 && mode === 'paths' && grid[0].includes(1)
                ? 'On the first row an obstacle blocks everything after it: those cells have only a left neighbour.'
                : null,
        });
      }
    steps.push({
      dp,
      best: [m - 1, n - 1],
      line: 'ret',
      done: true,
      result: dp[m - 1][n - 1]!,
      note: `Answer: ${dp[m - 1][n - 1]}.`,
      why: 'O(m·n) time; O(n) extra space with one row.',
    });
    return steps;
  },
  view(st, stage, { mode, grid }) {
    const states: Record<string, string> = {};
    (st.dep || []).forEach(([r, c]) => (states[r + ',' + c] = 'dep'));
    if (st.cur) states[st.cur.join(',')] = 'current';
    if (st.best) states[st.best.join(',')] = 'best';
    if (mode === 'sum') stage.append(R.grid(grid, { label: 'cell costs' }));
    else
      stage.append(
        R.grid(grid, {
          label: 'grid (1 = obstacle)',
          states: Object.fromEntries(
            grid
              .flatMap((row, r) => row.map((v, c) => [r + ',' + c, v ? 'wall' : null]))
              .filter(([, v]) => v),
          ),
        }),
      );
    stage.append(
      R.table(st.dp, {
        states,
        label: mode === 'paths' ? 'dp[r][c] = paths to (r, c)' : 'dp[r][c] = cheapest path sum to (r, c)',
        colHead: st.dp[0].map((_, c) => c),
        rowHead: st.dp.map((_, r) => r),
      }),
    );
  },
  random: (g) => {
    const m = rint(g, 1, 5),
      n = rint(g, 1, 5),
      mode = g() < 0.5 ? 'paths' : 'sum';
    return {
      mode,
      grid: Array.from({ length: m }, () =>
        Array.from({ length: n }, () => (mode === 'paths' ? (g() < 0.2 ? 1 : 0) : rint(g, 0, 9))),
      ),
    };
  },
});
