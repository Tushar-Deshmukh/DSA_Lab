// Ported from legacy/src/viz/w05.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  n: number;
}

interface Step extends VizStep {
  q: number[];
  sols: number;
  cur?: number[];
  bad?: number[];
  win?: boolean;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('n-queens', {
  title: 'N-Queens: one row per level, columns and diagonals in sets',
  inputs: [{ key: 'n', label: 'n', type: 'int', def: 4 }],
  presets: [
    { label: 'n = 4', input: { n: 4 } },
    { label: 'n = 5', input: { n: 5 } },
  ],
  legend: [
    ['current', 'queen being tried'],
    ['done', 'queens placed'],
    ['error', 'attacked: pruned'],
  ],
  code: `
function solveNQueens(n) {
  const res = [], cols = new Set(), d1 = new Set(), d2 = new Set(), q = [];
  function dfs(r) {
    if (r === n) { res.push(q.map((c) => '.'.repeat(c) + 'Q' + '.'.repeat(n - c - 1))); return; }  //@leaf
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) continue;   // attacked  //@prune
      cols.add(c); d1.add(r - c); d2.add(r + c); q.push(c);          // place     //@place
      dfs(r + 1);
      cols.delete(c); d1.delete(r - c); d2.delete(r + c); q.pop();   // remove    //@remove
    }
  }
  dfs(0);
  return res;
}`,
  validate: ({ n }) => (n < 1 || n > 5 ? 'Use 1 ≤ n ≤ 5.' : null),
  run({ n }) {
    const steps: Step[] = [],
      cols: Set<number> = new Set(),
      d1: Set<number> = new Set(),
      d2: Set<number> = new Set(),
      q: number[] = [],
      res: string[][] = [];
    const snap = <O extends object>(o: O) => Object.assign({ q: [...q], sols: res.length }, o);
    function dfs(r: number) {
      if (r === n) {
        res.push(q.map((c) => '.'.repeat(c) + 'Q' + '.'.repeat(n - c - 1)));
        steps.push(snap({ line: 'leaf', win: true, note: `All ${n} rows filled: solution ${res.length}.` }));
        return;
      }
      for (let c = 0; c < n; c++) {
        if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) {
          steps.push(
            snap({
              line: 'prune',
              bad: [r, c],
              note: `(${r}, ${c}) is attacked (${cols.has(c) ? 'column ' + c : d1.has(r - c) ? 'diagonal r − c = ' + (r - c) : 'anti-diagonal r + c = ' + (r + c)}).`,
              why: 'Cells on one diagonal share r − c; cells on one anti-diagonal share r + c. Three Set lookups replace scanning the board.',
            }),
          );
          continue;
        }
        cols.add(c);
        d1.add(r - c);
        d2.add(r + c);
        q.push(c);
        steps.push(snap({ line: 'place', cur: [r, c], note: `Place a queen at row ${r}, column ${c}.` }));
        dfs(r + 1);
        cols.delete(c);
        d1.delete(r - c);
        d2.delete(r + c);
        q.pop();
        steps.push(
          snap({ line: 'remove', note: `Remove the queen from (${r}, ${c}) and try the next column.` }),
        );
      }
    }
    dfs(0);
    steps.push(
      snap({
        line: null,
        done: true,
        result: res.length,
        note: `${res.length} solution${res.length === 1 ? '' : 's'} for n = ${n}.`,
      }),
    );
    return steps;
  },
  view(st, stage, { n }) {
    const m = Array.from({ length: n }, () => new Array(n).fill(''));
    const states: Record<string, string> = {};
    st.q.forEach((c, r) => {
      m[r][c] = '♛';
      states[r + ',' + c] = st.win ? 'done' : 'done';
    });
    if (st.cur) states[st.cur.join(',')] = 'current';
    if (st.bad) {
      m[st.bad[0]][st.bad[1]] = '✗';
      states[st.bad.join(',')] = 'error';
    }
    stage.append(R.grid(m, { states, label: 'board' }));
    stage.append(R.vars({ 'solutions found': st.sols }));
  },
  random: (g) => ({ n: rint(g, 1, 5) }),
});
