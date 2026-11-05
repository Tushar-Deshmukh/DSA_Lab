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
  l: number;
  r: number;
  elim: Set<string>;
  checks: number;
  cur?: number[];
  sum?: number;
  result?: number[];
  found?: number[];
}

const isSorted = (a: number[]) => a.every((x: number, i: number) => i === 0 || a[i - 1] <= x);

export default defineViz<Input, Step>('two-sum-sorted', {
  title: 'Two pointers on a sorted array (Two Sum II)',
  inputs: [
    { key: 'numbers', label: 'numbers (sorted)', type: 'numbers', def: [1, 3, 4, 6, 8, 11], wide: true },
    { key: 'target', label: 'target', type: 'number', def: 17 },
  ],
  presets: [
    { label: 'Pair near the end', input: { numbers: [1, 3, 4, 6, 8, 11], target: 17 } },
    { label: 'Handbook example', input: { numbers: [2, 7, 11, 15], target: 9 } },
    { label: 'Negative numbers', input: { numbers: [-5, -2, 0, 3, 7], target: 1 } },
    { label: 'Duplicates', input: { numbers: [1, 2, 2, 4, 4], target: 8 } },
    { label: 'No pair exists', input: { numbers: [1, 2, 5, 9], target: 4 } },
  ],
  legend: [
    ['current', 'pair (l, r) being checked'],
    ['dim', 'ruled out without checking'],
    ['done', 'answer'],
  ],
  code: `
function twoSumSorted(numbers, target) {
  let l = 0, r = numbers.length - 1;            //@init
  while (l < r) {                               //@loop
    const sum = numbers[l] + numbers[r];        //@sum
    if (sum === target) return [l + 1, r + 1];  //@found
    if (sum < target) l++;  // too small: drop left    //@left
    else r--;               // too large: drop right   //@right
  }
  return [];                                    //@none
}`,
  validate: ({ numbers }) =>
    sizeCheck(numbers, 2, 10) ||
    (isSorted(numbers) ? null : 'Two pointers needs sorted input: sort the numbers first (non-decreasing).'),
  run({ numbers: a, target }) {
    const steps: Step[] = [],
      elim: Set<string> = new Set();
    let l = 0,
      r = a.length - 1,
      checks = 0;
    const snap = <O extends object>(o: O) => Object.assign({ l, r, elim: new Set(elim), checks }, o);
    steps.push(
      snap({
        line: 'init',
        note: `Start at both ends: l = 0 (smallest value ${a[0]}), r = ${r} (largest value ${a[r]}).`,
        why: 'Every pair is still possible; the grid shows all of them.',
      }),
    );
    while (l < r) {
      const sum = a[l] + a[r];
      checks++;
      if (sum === target) {
        steps.push(
          snap({
            result: [l + 1, r + 1],
            line: ['sum', 'found'],
            cur: [l, r],
            found: [l, r],
            sum,
            note: `${a[l]} + ${a[r]} = ${sum} = target. Return [${l + 1}, ${r + 1}] (1-based).`,
            why: `${checks} pair${checks > 1 ? 's' : ''} checked out of ${totalPairs(a.length)}. Every other pair that was ruled out was ruled out by proof, not by checking.`,
          }),
        );
        return steps;
      }
      steps.push(
        snap({
          line: 'sum',
          cur: [l, r],
          sum,
          note: `sum = ${a[l]} + ${a[r]} = ${sum}, target ${target}: ${sum < target ? 'too small' : 'too large'}.`,
        }),
      );
      if (sum < target) {
        let k = 0;
        for (let j = l + 1; j <= r; j++) {
          if (!elim.has(l + ',' + j)) k++;
          elim.add(l + ',' + j);
        }
        steps.push(
          snap({
            line: 'left',
            cur: [l, r],
            sum,
            note: `Discard index ${l} (value ${a[l]}): l → ${l + 1}.`,
            why: `${a[l]} + ${a[r]} is the largest sum ${a[l]} can make with any remaining partner, and it is still below ${target}. So no pair using ${a[l]} works: that removes ${k} pair${k === 1 ? '' : 's'} (a whole row) in one step.`,
          }),
        );
        l++;
      } else {
        let k = 0;
        for (let i = l; i < r; i++) {
          if (!elim.has(i + ',' + r)) k++;
          elim.add(i + ',' + r);
        }
        steps.push(
          snap({
            line: 'right',
            cur: [l, r],
            sum,
            note: `Discard index ${r} (value ${a[r]}): r → ${r - 1}.`,
            why: `${a[l]} + ${a[r]} is the smallest sum ${a[r]} can make with any remaining partner, and it is still above ${target}. So no pair using ${a[r]} works: that removes ${k} pair${k === 1 ? '' : 's'} (a whole column).`,
          }),
        );
        r--;
      }
    }
    steps.push(
      snap({
        result: [],
        line: 'none',
        note: `l and r met: no pair sums to ${target}. Return [].`,
        why: `Only ${checks} sums were computed, at most n − 1. That is why this is O(n) time with O(1) extra space.`,
      }),
    );
    return steps;
  },
  view(st, stage, { numbers: a, target }) {
    const states: Record<string, string> = {},
      ptrs: Record<string, string | string[]> = {};
    a.forEach((_, i) => {
      if (i < st.l || i > st.r) states[i] = 'dim';
    });
    if (st.found) {
      states[st.found[0]] = 'done';
      states[st.found[1]] = 'done';
    } else if (st.cur) {
      states[st.l] = 'current';
      states[st.r] = 'current';
    }
    if (st.l === st.r) ptrs[st.l] = ['l', 'r'];
    else {
      if (st.l < a.length) ptrs[st.l] = 'l';
      if (st.r >= 0) ptrs[st.r] = 'r';
    }
    stage.append(R.cells(a, { states, ptrs, label: 'numbers' }));
    stage.append(
      R.vars({
        target,
        sum: st.sum ?? '·',
        'sums computed': st.checks,
        'pairs ruled out': st.elim.size + ' / ' + totalPairs(a.length),
      }),
    );
    stage.append(pairGrid(a, st));
  },
  random: (g) => {
    const a = sorted(rarr(g, rint(g, 2, 10), -9, 15));
    return { numbers: a, target: rint(g, -10, 25) };
  },
});
