// Ported from legacy/src/viz/w02.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint, sorted } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck, pairGrid, totalPairs } from './_helpers';

interface Input {
  numbers: number[];
  target: number;
}

interface Step extends VizStep {
  result?: number[];
  i?: number;
  j?: number;
  cur?: number[];
  checked: Set<string>;
  found?: number[] | null;
  count: number;
  sum?: number;
}

export default defineViz<Input, Step>('pair-brute', {
  title: 'Brute force: check every pair',
  inputs: [
    { key: 'numbers', label: 'numbers (sorted)', type: 'numbers', def: [1, 3, 4, 6, 8, 11], wide: true },
    { key: 'target', label: 'target', type: 'number', def: 17 },
  ],
  presets: [
    { label: 'Pair near the end', input: { numbers: [1, 3, 4, 6, 8, 11], target: 17 } },
    { label: 'No pair exists', input: { numbers: [1, 2, 5, 9], target: 4 } },
  ],
  legend: [
    ['current', 'pair being checked'],
    ['compare', 'already checked'],
    ['done', 'answer'],
  ],
  code: `
function twoSumBrute(numbers, target) {
  for (let i = 0; i < numbers.length; i++) {        //@i
    for (let j = i + 1; j < numbers.length; j++) {  //@j
      if (numbers[i] + numbers[j] === target)       //@test
        return [i + 1, j + 1];                      //@found
    }
  }
  return [];                                        //@none
}`,
  validate: ({ numbers }) => sizeCheck(numbers, 2, 10),
  run({ numbers: a, target }) {
    const steps: Step[] = [],
      checked: Set<string> = new Set();
    let count = 0;
    for (let i = 0; i < a.length; i++)
      for (let j = i + 1; j < a.length; j++) {
        count++;
        const sum = a[i] + a[j];
        const ok = sum === target;
        steps.push({
          result: ok ? [i + 1, j + 1] : undefined,
          line: ok ? ['test', 'found'] : 'test',
          i,
          j,
          cur: [i, j],
          checked: new Set(checked),
          found: ok ? [i, j] : null,
          count,
          sum,
          note: `Pair (${i}, ${j}): ${a[i]} + ${a[j]} = ${sum}${ok ? ' = target. Return [' + (i + 1) + ', ' + (j + 1) + '].' : ' ≠ ' + target + '.'}`,
          why: ok
            ? `It took ${count} of the ${totalPairs(a.length)} possible pairs. In the worst case brute force checks all of them: n(n−1)/2, which is O(n²).`
            : count === 1
              ? 'Brute force ignores that the array is sorted: it learns nothing from a failed pair.'
              : null,
        });
        checked.add(i + ',' + j);
        if (ok) return steps;
      }
    steps.push({
      result: [],
      line: 'none',
      checked,
      count,
      note: `All ${count} pairs checked; none sums to ${target}. Return [].`,
      why: 'This is the worst case: every one of the n(n−1)/2 pairs was examined.',
    });
    return steps;
  },
  view(st, stage, { numbers: a, target }) {
    stage.append(
      R.cells(a, {
        ptrs: st.cur ? { [st.cur[0]]: 'i', [st.cur[1]]: 'j' } : {},
        states: st.cur ? { [st.cur[0]]: 'current', [st.cur[1]]: 'current' } : {},
        label: 'numbers',
      }),
    );
    stage.append(
      R.vars({ target, sum: st.sum ?? '·', 'pairs checked': st.count + ' / ' + totalPairs(a.length) }),
    );
    stage.append(pairGrid(a, st));
  },
  random: (g) => {
    const a = sorted(rarr(g, rint(g, 2, 9), -9, 15));
    return { numbers: a, target: rint(g, -10, 25) };
  },
});
