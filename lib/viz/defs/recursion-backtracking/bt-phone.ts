// Ported from legacy/src/viz/w05.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { tracer, renderBT } from './_helpers';

interface Input {
  digits: string;
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
  path?: string[];
  res: string[];
  done?: boolean;
  result?: string[];
}

export default defineViz<Input, Step>('bt-phone', {
  title: 'Letter combinations: one level per digit',
  inputs: [{ key: 'digits', label: 'digits (2–9)', type: 'string', def: '23' }],
  presets: [
    { label: '"23"', input: { digits: '23' } },
    { label: '"7"', input: { digits: '7' } },
    { label: '""', input: { digits: '' } },
  ],
  legend: [
    ['current', 'running'],
    ['done', 'complete string'],
  ],
  code: `
function letterCombinations(digits) {
  if (!digits) return [];                                         //@empty
  const map = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];
  const res = [], path = [];
  function dfs(i) {
    if (i === digits.length) { res.push(path.join('')); return; } //@leaf
    for (const ch of map[digits[i]]) {                            //@loop
      path.push(ch); dfs(i + 1); path.pop();                      //@choose
    }
  }
  dfs(0);
  return res;
}`,
  validate: ({ digits }) =>
    !/^[2-9]*$/.test(digits) ? 'Use digits 2–9 only.' : digits.length > 3 ? 'Use at most 3 digits.' : null,
  run({ digits }) {
    const map = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];
    if (!digits)
      return [{ tree: [], line: 'empty', res: [], result: [], note: 'No digits: return [] (not [""]).' }];
    const T = tracer(),
      steps: Step[] = [],
      res: string[] = [],
      path: string[] = [];
    function dfs(i: number, parent: number | null, how: string | null) {
      const id = T.add(path.join('') || '""', parent, how);
      T.enter(id);
      if (i === digits.length) {
        res.push(path.join(''));
        T.mark(id, 'current', '✓');
        steps.push(
          T.snap({ line: 'leaf', path: [...path], res: [...res], note: `Record "${path.join('')}".` }),
        );
        T.leave(id);
        return;
      }
      steps.push(
        T.snap({
          line: 'loop',
          path: [...path],
          res: [...res],
          note: `Digit ${digits[i]} → letters "${map[digits[i] as unknown as number]}": ${map[digits[i] as unknown as number].length} branches.`,
          why:
            i === 0
              ? 'The branching factor depends on the digit (3 or 4), so the worst case is O(4ⁿ · n).'
              : null,
        }),
      );
      for (const ch of map[digits[i] as unknown as number]) {
        path.push(ch);
        dfs(i + 1, id, ch);
        path.pop();
      }
      T.leave(id);
    }
    dfs(0, null, null);
    steps.push(
      T.snap({ path: [], res, done: true, result: res, line: null, note: `${res.length} strings.` }),
    );
    return steps;
  },
  view: (st, stage) => renderBT(st, stage),
  random: (g) => ({ digits: rstr(g, rint(g, 0, 3), '23456789') }),
});
