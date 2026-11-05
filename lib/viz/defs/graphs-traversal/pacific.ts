// Ported from legacy/src/viz/w08.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { gridCheck, DIR4 } from './_helpers';

interface Input {
  h: number[][];
}

interface Step extends VizStep {
  pac: boolean[][];
  atl: boolean[][] | null;
  both?: number[][];
  done?: boolean;
  result?: number[][];
}

export default defineViz<Input, Step>('pacific', {
  title: 'Pacific Atlantic: search uphill from each ocean, then intersect',
  inputs: [
    {
      key: 'h',
      label: 'heights',
      type: 'json',
      def: [
        [1, 2, 2, 3, 5],
        [3, 2, 3, 4, 4],
        [2, 4, 5, 3, 1],
        [6, 7, 1, 4, 5],
        [5, 1, 1, 2, 4],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'LeetCode example 1',
      input: {
        h: [
          [1, 2, 2, 3, 5],
          [3, 2, 3, 4, 4],
          [2, 4, 5, 3, 1],
          [6, 7, 1, 4, 5],
          [5, 1, 1, 2, 4],
        ],
      },
    },
    { label: 'Single cell', input: { h: [[1]] } },
    {
      label: 'Flat 3 × 3',
      input: {
        h: [
          [1, 1, 1],
          [1, 1, 1],
          [1, 1, 1],
        ],
      },
    },
  ],
  legend: [
    ['frontier', 'reaches the Pacific'],
    ['window', 'reaches the Atlantic'],
    ['done', 'reaches both'],
  ],
  code: `
// water flows to a neighbour with height <= current; search the REVERSE way:
function climb(starts) {                       // from the ocean's border cells
  const seen = …; const stack = [...starts];                          //@seed
  while (stack.length) {
    const [r, c] = stack.pop();
    for (each neighbour [nr, nc] with heights[nr][nc] >= heights[r][c] and not seen)
      seen[nr][nc] = true, stack.push([nr, nc]);                       //@climb
  }
  return seen;
}
answer = cells seen by climb(pacificBorder) AND climb(atlanticBorder) //@both`,
  validate: ({ h }) =>
    gridCheck(h) || (h.flat().some((x) => typeof x !== 'number') ? 'Heights are numbers.' : null),
  run({ h }) {
    const m = h.length,
      n = h[0].length,
      steps: Step[] = [];
    function climb(starts: number[][], name: string) {
      const seen = h.map((r) => r.map(() => false));
      const st: number[][] = [];
      for (const [r, c] of starts)
        if (!seen[r][c]) {
          seen[r][c] = true;
          st.push([r, c]);
        }
      while (st.length) {
        const [r, c] = st.pop()!;
        for (const [dr, dc] of DIR4) {
          const nr = r + dr,
            nc = c + dc;
          if (nr < 0 || nr >= m || nc < 0 || nc >= n || seen[nr][nc] || h[nr][nc] < h[r][c]) continue;
          seen[nr][nc] = true;
          st.push([nr, nc]);
        }
      }
      return seen;
    }
    const pacStarts: number[][] = [],
      atlStarts: number[][] = [];
    for (let r = 0; r < m; r++) {
      pacStarts.push([r, 0]);
      atlStarts.push([r, n - 1]);
    }
    for (let c = 0; c < n; c++) {
      pacStarts.push([0, c]);
      atlStarts.push([m - 1, c]);
    }
    const pac = climb(pacStarts, 'P');
    steps.push({
      pac,
      atl: null,
      line: ['seed', 'climb'],
      note: 'Climb from the Pacific border (top row and left column): a cell is reached if water could flow from it down to the Pacific.',
      why: 'One search from all ocean cells replaces a separate search from every cell: O(m·n) instead of O((m·n)²).',
    });
    const atl = climb(atlStarts, 'A');
    steps.push({
      pac,
      atl,
      line: ['seed', 'climb'],
      note: 'Climb from the Atlantic border (bottom row and right column).',
    });
    const both: number[][] = [];
    for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) if (pac[r][c] && atl[r][c]) both.push([r, c]);
    steps.push({
      pac,
      atl,
      both,
      done: true,
      line: 'both',
      result: both,
      note: `${both.length} cell${both.length === 1 ? '' : 's'} reach both oceans.`,
    });
    return steps;
  },
  view(st, stage, { h }) {
    const states: Record<string, string> = {};
    h.forEach((row, r) =>
      row.forEach((_, c) => {
        const p = st.pac && st.pac[r][c],
          a = st.atl && st.atl[r][c];
        if (p && a) states[r + ',' + c] = 'done';
        else if (p) states[r + ',' + c] = 'frontier';
        else if (a) states[r + ',' + c] = 'window';
      }),
    );
    stage.append(
      R.grid(h, { states, label: 'heights (Pacific: top/left edges, Atlantic: bottom/right edges)' }),
    );
  },
  random: (g) => {
    const r = rint(g, 1, 5),
      c = rint(g, 1, 5);
    return { h: Array.from({ length: r }, () => rarr(g, c, 0, 6)) };
  },
});
