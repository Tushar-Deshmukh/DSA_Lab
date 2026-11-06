// Ported from legacy/src/viz/w08.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { gridCheck } from './_helpers';

interface Input {
  grid: number[][];
}

interface Step extends VizStep {
  dist: (number | null)[][];
  level?: number[][];
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('grid-bfs', {
  title: 'Shortest Path in Binary Matrix: BFS with 8 directions',
  inputs: [
    {
      key: 'grid',
      label: 'grid (0 open, 1 blocked)',
      type: 'json',
      def: [
        [0, 0, 0],
        [1, 1, 0],
        [1, 1, 0],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'LeetCode example 2',
      input: {
        grid: [
          [0, 0, 0],
          [1, 1, 0],
          [1, 1, 0],
        ],
      },
    },
    {
      label: 'Diagonal shortcut',
      input: {
        grid: [
          [0, 1],
          [1, 0],
        ],
      },
    },
    {
      label: 'Blocked start',
      input: {
        grid: [
          [1, 0],
          [0, 0],
        ],
      },
    },
    {
      label: 'Maze',
      input: {
        grid: [
          [0, 0, 0, 0],
          [1, 1, 1, 0],
          [0, 0, 0, 0],
          [0, 1, 1, 1],
          [0, 0, 0, 0],
        ],
      },
    },
  ],
  legend: [
    ['current', 'this BFS level'],
    ['done', 'distance known'],
    ['wall', 'blocked'],
  ],
  code: `
if (grid[0][0] || grid[n-1][n-1]) return -1;          // blocked ends  //@blocked
const dist = …; dist[0][0] = 1; const q = [[0, 0]];  // counts CELLS  //@init
for (let h = 0; h < q.length; h++) {
  const [r, c] = q[h];
  if (r === m - 1 && c === n - 1) return dist[r][c];                 //@goal
  for (const [dr, dc] of DIRS8) { /* open, unvisited: dist+1, push */ }  //@expand
}
return -1;`,
  validate: ({ grid }) => gridCheck(grid, ['0', '1']),
  run({ grid }) {
    const m = grid.length,
      n = grid[0].length,
      steps: Step[] = [];
    const D8 = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    const dist: (number | null)[][] = grid.map((r) => r.map(() => null));
    if (grid[0][0] || grid[m - 1][n - 1])
      return [
        { dist, line: 'blocked', result: -1, done: true, note: 'The start or the end is blocked: −1.' },
      ];
    dist[0][0] = 1;
    let level = [[0, 0]];
    steps.push({
      dist: dist.map((r) => [...r]),
      level,
      line: 'init',
      note: 'Start at (0, 0) with path length 1: the problem counts cells, not moves.',
    });
    while (level.length) {
      if (level.some(([r, c]) => r === m - 1 && c === n - 1)) {
        steps.push({
          dist: dist.map((r) => [...r]),
          level,
          done: true,
          line: 'goal',
          result: dist[m - 1][n - 1]!,
          note: `Reached the bottom-right corner: path length ${dist[m - 1][n - 1]}.`,
          why: 'BFS reaches every cell first along a shortest path, so the first arrival is the answer.',
        });
        return steps;
      }
      const next: number[][] = [];
      for (const [r, c] of level)
        for (const [dr, dc] of D8) {
          const nr = r + dr,
            nc = c + dc;
          if (nr < 0 || nr >= m || nc < 0 || nc >= n || grid[nr][nc] || dist[nr][nc] != null) continue;
          dist[nr][nc] = dist[r][c]! + 1;
          next.push([nr, nc]);
        }
      if (!next.length) break;
      steps.push({
        dist: dist.map((r) => [...r]),
        level: next,
        line: 'expand',
        note: `Distance ${dist[next[0][0]][next[0][1]]}: ${next.length} new cell${next.length === 1 ? '' : 's'}.`,
      });
      level = next;
    }
    steps.push({
      dist,
      level: [],
      done: true,
      line: null,
      result: -1,
      note: 'The queue emptied without reaching the corner: −1.',
    });
    return steps;
  },
  view(st, stage, { grid }) {
    const states: Record<string, string> = {};
    grid.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v) states[r + ',' + c] = 'wall';
        else if (st.dist[r][c] != null) states[r + ',' + c] = 'done';
      }),
    );
    (st.level || []).forEach(([r, c]) => (states[r + ',' + c] = 'current'));
    stage.append(
      R.grid(
        st.dist.map((row, r) => row.map((d, c) => (grid[r][c] ? '' : d == null ? '' : d))),
        { states, label: 'path length to each cell' },
      ),
    );
  },
  random: (g) => {
    const r = rint(g, 1, 6),
      c = rint(g, 1, 6);
    return { grid: Array.from({ length: r }, () => Array.from({ length: c }, () => (g() < 0.3 ? 1 : 0))) };
  },
});
