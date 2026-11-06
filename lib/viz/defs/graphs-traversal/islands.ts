// Ported from legacy/src/viz/w08.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { gridCheck, DIR4 } from './_helpers';

interface Input {
  grid: string[][];
}

interface Step extends VizStep {
  g: string[][];
  sunk: Set<string>;
  st: number[][];
  count: number;
  cur?: number[];
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('islands', {
  title: 'Number of Islands: sink each island with a stack',
  inputs: [
    {
      key: 'grid',
      label: 'grid ("1" land, "0" water)',
      type: 'json',
      def: [
        ['1', '1', '0', '0', '0'],
        ['1', '1', '0', '0', '0'],
        ['0', '0', '1', '0', '0'],
        ['0', '0', '0', '1', '1'],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'LeetCode example 2',
      input: {
        grid: [
          ['1', '1', '0', '0', '0'],
          ['1', '1', '0', '0', '0'],
          ['0', '0', '1', '0', '0'],
          ['0', '0', '0', '1', '1'],
        ],
      },
    },
    {
      label: 'One snake island',
      input: {
        grid: [
          ['1', '1', '1'],
          ['0', '0', '1'],
          ['1', '1', '1'],
        ],
      },
    },
    {
      label: 'Diagonals do not connect',
      input: {
        grid: [
          ['1', '0'],
          ['0', '1'],
        ],
      },
    },
  ],
  legend: [
    ['current', 'popped'],
    ['frontier', 'in the stack'],
    ['done', 'sunk (visited)'],
    ['window', 'land not yet visited'],
  ],
  code: `
for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
  if (grid[r][c] !== '1') continue;
  count++; grid[r][c] = '0'; const stack = [[r, c]];        // new island  //@new
  while (stack.length) {
    const [cr, cc] = stack.pop();                                         //@pop
    for (const [dr, dc] of dirs) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;   // bounds    //@bounds
      if (grid[nr][nc] !== '1') continue;
      grid[nr][nc] = '0'; stack.push([nr, nc]);               // sink+push //@push
    }
  }
}`,
  validate: ({ grid }) => gridCheck(grid, ['0', '1']),
  run({ grid }) {
    const g2 = grid.map((r) => r.map(String)),
      m = g2.length,
      n = g2[0].length,
      steps: Step[] = [];
    let count = 0;
    const sunk: Set<string> = new Set();
    for (let r = 0; r < m; r++)
      for (let c = 0; c < n; c++) {
        if (g2[r][c] !== '1') continue;
        count++;
        g2[r][c] = '0';
        sunk.add(r + ',' + c);
        const st = [[r, c]];
        steps.push({
          g: g2.map((x) => [...x]),
          sunk: new Set(sunk),
          st: st.map((x) => [...x]),
          count,
          line: 'new',
          note: `(${r}, ${c}) is unvisited land: island #${count}. Sink it and push it.`,
        });
        while (st.length) {
          const [cr, cc] = st.pop()!;
          const added: string[] = [];
          for (const [dr, dc] of DIR4) {
            const nr = cr + dr,
              nc = cc + dc;
            if (nr < 0 || nr >= m || nc < 0 || nc >= n || g2[nr][nc] !== '1') continue;
            g2[nr][nc] = '0';
            sunk.add(nr + ',' + nc);
            st.push([nr, nc]);
            added.push('(' + nr + ',' + nc + ')');
          }
          steps.push({
            g: g2.map((x) => [...x]),
            sunk: new Set(sunk),
            st: st.map((x) => [...x]),
            cur: [cr, cc],
            count,
            line: ['pop', 'push'],
            note: `Pop (${cr}, ${cc}); ${added.length ? 'sink and push ' + added.join(', ') : 'no land neighbours left'}.`,
          });
        }
      }
    steps.push({
      g: g2,
      sunk,
      st: [],
      count,
      done: true,
      line: null,
      result: count,
      note: `${count} island${count === 1 ? '' : 's'}.`,
      why: 'Each land cell is sunk and pushed once: O(m·n) time and up to O(m·n) stack. This version mutates the input; say so, or use a visited array.',
    });
    return steps;
  },
  view(st, stage, { grid }) {
    const states: Record<string, string> = {};
    grid.forEach((row, r) =>
      row.forEach((v, c) => {
        const k = r + ',' + c;
        if (st.sunk.has(k)) states[k] = 'done';
        else if (String(v) === '1') states[k] = 'window';
      }),
    );
    st.st.forEach(([r, c]) => (states[r + ',' + c] = 'frontier'));
    if (st.cur) states[st.cur.join(',')] = 'current';
    stage.append(
      R.grid(
        grid.map((row) => row.map(String)),
        { states, label: 'grid (original values shown)' },
      ),
    );
    stage.append(R.vars({ islands: st.count, 'stack size': st.st.length }));
  },
  random: (g) => {
    const r = rint(g, 1, 6),
      c = rint(g, 1, 6);
    return {
      grid: Array.from({ length: r }, () => Array.from({ length: c }, () => (g() < 0.45 ? '1' : '0'))),
    };
  },
});
