// Ported from legacy/src/viz/w05.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { tracer, renderBT } from './_helpers';

interface Input {
  n: number;
}

interface Step extends VizStep {
  tree: {
    id: number;
    label: string;
    parent: number | null;
    state: string;
    sub?: string;
    edgeLabel?: string;
  }[];
  res: string[];
  done?: boolean;
  result?: string[];
}

export default defineViz<Input, Step>('bt-parens', {
  title: 'Generate Parentheses: the state is (open, close), not the string',
  inputs: [{ key: 'n', label: 'n (pairs)', type: 'int', def: 3 }],
  presets: [
    { label: 'n = 2', input: { n: 2 } },
    { label: 'n = 3', input: { n: 3 } },
  ],
  legend: [
    ['current', 'running'],
    ['frontier', 'on the stack'],
    ['done', 'complete'],
  ],
  code: `
function generateParenthesis(n) {
  const res = [];
  function dfs(s, open, close) {
    if (s.length === 2 * n) { res.push(s); return; }      //@leaf
    if (open < n) dfs(s + '(', open + 1, close);          //@open
    if (close < open) dfs(s + ')', open, close + 1);      //@close
  }
  dfs('', 0, 0);
  return res;
}`,
  validate: ({ n }) => (n < 1 || n > 3 ? 'Use 1 ≤ n ≤ 3.' : null),
  run({ n }) {
    const T = tracer(),
      steps: Step[] = [],
      res: string[] = [];
    function dfs(s: string, o: number, c: number, parent: number | null, how: string | null) {
      const id = T.add(s || '""', parent, how);
      T.enter(id);
      if (s.length === 2 * n) {
        res.push(s);
        T.mark(id, 'current', '✓');
        steps.push(T.snap({ line: 'leaf', res: [...res], note: `Length ${2 * n}: record "${s}".` }));
        T.leave(id);
        return;
      }
      steps.push(
        T.snap({
          line: o < n ? 'open' : 'close',
          res: [...res],
          note: `"${s || ''}" with open = ${o}, close = ${c}: ${o < n ? 'may add "("' : 'no "(" left'}${c < o ? ' and may add ")"' : '; ")" not allowed (close = open)'}.`,
          why:
            steps.length === 0
              ? 'A ")" is only legal while some "(" is unmatched (close < open). Tracking two counts replaces checking the whole string.'
              : null,
        }),
      );
      if (o < n) dfs(s + '(', o + 1, c, id, '(');
      if (c < o) dfs(s + ')', o, c + 1, id, ')');
      T.leave(id);
    }
    dfs('', 0, 0, null, null);
    steps.push(
      T.snap({
        res,
        done: true,
        result: res,
        line: null,
        note: `${res.length} valid strings (the ${n}${n === 1 ? 'st' : n === 2 ? 'nd' : 'rd'} Catalan number).`,
        why: 'Every leaf is valid: the two rules never allow a dead end, so there is nothing to filter afterwards.',
      }),
    );
    return steps;
  },
  view: (st, stage) => renderBT(st, stage),
  random: (g) => ({ n: rint(g, 1, 3) }),
});
