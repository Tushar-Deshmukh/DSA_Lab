// Ported from legacy/src/viz/w08.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { gridCheck, DIR4 } from './_helpers';

interface Input {
  grid: number[][];
}

interface Step extends VizStep {
  g: number[][];
  minutes: number;
  fresh: number;
  now?: number[][];
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('rotting', {
  title: 'Rotting Oranges: multi-source BFS, one minute per level',
  inputs: [
    {
      key: 'grid',
      label: 'grid (0 empty, 1 fresh, 2 rotten)',
      type: 'json',
      def: [
        [2, 1, 1],
        [1, 1, 0],
        [0, 1, 1],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'Handbook example',
      input: {
        grid: [
          [2, 1, 1],
          [1, 1, 0],
          [0, 1, 1],
        ],
      },
    },
    {
      label: 'Unreachable orange (−1)',
      input: {
        grid: [
          [2, 1, 1],
          [0, 1, 1],
          [1, 0, 1],
        ],
      },
    },
    { label: 'Two sources', input: { grid: [[2, 1, 1, 1, 2]] } },
    { label: 'Nothing fresh', input: { grid: [[0, 2]] } },
  ],
  legend: [
    ['error', 'rotten'],
    ['current', 'rotted this minute'],
    ['window', 'fresh'],
  ],
  code: `
const q = []; let fresh = 0;
for (r…) for (c…) { if (grid[r][c] === 2) q.push([r, c]); else if (grid[r][c] === 1) fresh++; }  //@init
let minutes = 0, head = 0;
while (head < q.length && fresh > 0) {
  const size = q.length - head;                    // one minute = one level  //@level
  for (let i = 0; i < size; i++) {
    const [r, c] = q[head++];
    for (const [dr, dc] of dirs) { /* fresh neighbour: rot it, fresh--, push */ }  //@rot
  }
  minutes++;
}
return fresh === 0 ? minutes : -1;                                             //@ret`,
  validate: ({ grid }) => gridCheck(grid, ['0', '1', '2']),
  run({ grid }) {
    const g2 = grid.map((r) => [...r]),
      m = g2.length,
      n = g2[0].length,
      steps: Step[] = [],
      q: number[][] = [];
    let fresh = 0;
    for (let r = 0; r < m; r++)
      for (let c = 0; c < n; c++) {
        if (g2[r][c] === 2) q.push([r, c]);
        else if (g2[r][c] === 1) fresh++;
      }
    steps.push({
      g: g2.map((x) => [...x]),
      minutes: 0,
      fresh,
      line: 'init',
      note: `${q.length} rotten orange${q.length === 1 ? '' : 's'} enqueued at minute 0; ${fresh} fresh.`,
      why: 'All sources start in the queue together, so one BFS measures the distance to the *nearest* rotten orange for every cell.',
    });
    let minutes = 0,
      head = 0;
    while (head < q.length && fresh > 0) {
      const size = q.length - head,
        now: number[][] = [];
      for (let i = 0; i < size; i++) {
        const [r, c] = q[head++];
        for (const [dr, dc] of DIR4) {
          const nr = r + dr,
            nc = c + dc;
          if (nr < 0 || nr >= m || nc < 0 || nc >= n || g2[nr][nc] !== 1) continue;
          g2[nr][nc] = 2;
          fresh--;
          q.push([nr, nc]);
          now.push([nr, nc]);
        }
      }
      minutes++;
      steps.push({
        g: g2.map((x) => [...x]),
        now,
        minutes,
        fresh,
        line: ['level', 'rot'],
        note: `Minute ${minutes}: ${now.length ? now.map(([r, c]) => '(' + r + ',' + c + ')').join(', ') + ' rot' : 'nothing new rots'}. Fresh left: ${fresh}.`,
      });
    }
    const ans = fresh === 0 ? minutes : -1;
    steps.push({
      g: g2,
      minutes,
      fresh,
      done: true,
      line: 'ret',
      result: ans,
      note:
        fresh === 0
          ? `All oranges rotten after ${minutes} minute${minutes === 1 ? '' : 's'}.`
          : `${fresh} fresh orange${fresh === 1 ? ' is' : 's are'} unreachable: return −1.`,
      why: 'O(m·n): every cell enters the queue at most once.',
    });
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {};
    st.g.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v === 2) states[r + ',' + c] = 'error';
        else if (v === 1) states[r + ',' + c] = 'window';
      }),
    );
    (st.now || []).forEach(([r, c]) => (states[r + ',' + c] = 'current'));
    stage.append(R.grid(st.g, { states, label: 'grid' }));
    stage.append(R.vars({ minute: st.minutes, fresh: st.fresh }));
  },
  random: (g) => {
    const r = rint(g, 1, 6),
      c = rint(g, 1, 6);
    return {
      grid: Array.from({ length: r }, () => Array.from({ length: c }, () => [0, 1, 1, 2][rint(g, 0, 3)])),
    };
  },
});
