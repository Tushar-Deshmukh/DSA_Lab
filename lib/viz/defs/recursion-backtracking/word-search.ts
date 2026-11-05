// Ported from legacy/src/viz/w05.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  board: string[][];
  word: string;
}

interface Step extends VizStep {
  b: string[][];
  path: number[][];
  start?: number[];
  cur?: number[];
  k?: number;
  bad?: number[];
  oob?: number[];
  win?: boolean;
  done?: boolean;
  result?: boolean;
  restored?: number[];
}

// ---------- grid backtracking ----------
export default defineViz<Input, Step>('word-search', {
  title: 'Word Search: mark a cell, try four directions, restore it',
  inputs: [
    {
      key: 'board',
      label: 'board',
      type: 'json',
      def: [
        ['A', 'B', 'C'],
        ['D', 'B', 'E'],
        ['A', 'C', 'B'],
      ],
      wide: true,
    },
    { key: 'word', label: 'word', type: 'string', def: 'ABC' },
  ],
  presets: [
    {
      label: 'Lesson 5 run: "ABC"',
      input: {
        board: [
          ['A', 'B', 'C'],
          ['D', 'B', 'E'],
          ['A', 'C', 'B'],
        ],
        word: 'ABC',
      },
    },
    {
      label: 'LeetCode "ABCCED"',
      input: {
        board: [
          ['A', 'B', 'C', 'E'],
          ['S', 'F', 'C', 'S'],
          ['A', 'D', 'E', 'E'],
        ],
        word: 'ABCCED',
      },
    },
    {
      label: 'Reuse not allowed: "ABCB"',
      input: {
        board: [
          ['A', 'B', 'C', 'E'],
          ['S', 'F', 'C', 'S'],
          ['A', 'D', 'E', 'E'],
        ],
        word: 'ABCB',
      },
    },
  ],
  legend: [
    ['current', 'cell being matched'],
    ['frontier', 'marked # on the current path'],
    ['error', 'mismatch / out of bounds'],
    ['done', 'word found'],
  ],
  code: `
function exist(board, word) {
  const m = board.length, n = board[0].length;
  function dfs(r, c, k) {
    if (k === word.length) return true;                                  //@found
    if (r < 0 || r >= m || c < 0 || c >= n || board[r][c] !== word[k])
      return false;                                                      //@fail
    const tmp = board[r][c]; board[r][c] = '#';            // mark       //@mark
    const ok = dfs(r + 1, c, k + 1) || dfs(r - 1, c, k + 1) ||
               dfs(r, c + 1, k + 1) || dfs(r, c - 1, k + 1);             //@dirs
    board[r][c] = tmp;                                     // restore    //@restore
    return ok;
  }
  for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) if (dfs(r, c, 0)) return true;  //@starts
  return false;
}`,
  validate: ({ board, word }) =>
    !Array.isArray(board) ||
    !board.length ||
    !board.every((r) => Array.isArray(r) && r.length === board[0].length)
      ? 'Enter a rectangular grid of letters.'
      : board.length * board[0].length > 16
        ? 'Keep the board to 16 cells.'
        : word.length < 1 || word.length > 6
          ? 'Use a word of 1–6 letters.'
          : null,
  run({ board: b0, word }) {
    const b = b0.map((r) => [...r]),
      m = b.length,
      n = b[0].length,
      steps: Step[] = [];
    const path: number[][] = [];
    const snap = <O extends object>(o: O) =>
      Object.assign({ b: b.map((r) => [...r]), path: path.map((p) => [...p]) }, o);
    let found = false;
    function dfs(r: number, c: number, k: number): boolean {
      if (k === word.length) return true;
      if (r < 0 || r >= m || c < 0 || c >= n) {
        steps.push(snap({ line: 'fail', oob: [r, c], k, note: `(${r}, ${c}) is off the board.` }));
        return false;
      }
      if (b[r][c] !== word[k]) {
        steps.push(
          snap({
            line: 'fail',
            bad: [r, c],
            k,
            note: `(${r}, ${c}) holds "${b[r][c]}", need "${word[k]}": fail.`,
            why:
              b[r][c] === '#' ? 'The cell is already on this path (marked #), so it cannot be reused.' : null,
          }),
        );
        return false;
      }
      const tmp = b[r][c];
      b[r][c] = '#';
      path.push([r, c]);
      steps.push(
        snap({
          line: 'mark',
          cur: [r, c],
          k,
          note: `(${r}, ${c}) = "${tmp}" matches word[${k}]. Mark it # and try its neighbours.`,
        }),
      );
      if (k + 1 === word.length) {
        steps.push(
          snap({ line: 'found', cur: [r, c], k, win: true, note: `All ${word.length} letters matched.` }),
        );
        b[r][c] = tmp;
        return true;
      }
      const ok: boolean =
        dfs(r + 1, c, k + 1) || dfs(r - 1, c, k + 1) || dfs(r, c + 1, k + 1) || dfs(r, c - 1, k + 1);
      b[r][c] = tmp;
      path.pop();
      if (!ok)
        steps.push(
          snap({
            line: 'restore',
            restored: [r, c],
            k,
            note: `No neighbour continues the word: restore (${r}, ${c}) to "${tmp}" and backtrack.`,
            why: 'Restoring lets this cell be used by a different path later. Forgetting it is the classic bug in 79.',
          }),
        );
      return ok;
    }
    outer: for (let r = 0; r < m; r++)
      for (let c = 0; c < n; c++) {
        if (b[r][c] !== word[0]) continue;
        steps.push(snap({ line: 'starts', start: [r, c], note: `Start a search at (${r}, ${c}).` }));
        if (dfs(r, c, 0)) {
          found = true;
          break outer;
        }
      }
    steps.push(
      snap({
        line: null,
        done: true,
        win: found,
        result: found,
        note: found ? `"${word}" exists.` : `"${word}" cannot be formed.`,
        why: 'O(m · n · 3^L): every cell can start, and after the first letter each step has at most 3 new directions.',
      }),
    );
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {};
    st.path.forEach(([r, c]) => (states[r + ',' + c] = st.win ? 'done' : 'frontier'));
    if (st.cur) states[st.cur.join(',')] = st.win ? 'done' : 'current';
    if (st.bad) states[st.bad.join(',')] = 'error';
    if (st.restored) states[st.restored.join(',')] = 'compare';
    if (st.start) states[st.start.join(',')] = 'current';
    stage.append(R.grid(st.b, { states, label: 'board (# = marked on the current path)' }));
    if (st.oob)
      stage.append(R.caption('tried (' + st.oob.join(', ') + '): out of bounds', { tone: 'error' }));
    stage.append(R.vars({ 'letters matched': st.path.length }));
  },
  random: (g) => {
    const r = rint(g, 1, 4),
      c = rint(g, 1, 4);
    const board = Array.from({ length: r }, () => Array.from({ length: c }, () => 'ABC'[rint(g, 0, 2)]));
    return { board, word: rstr(g, rint(g, 1, 5), 'ABC') };
  },
});
