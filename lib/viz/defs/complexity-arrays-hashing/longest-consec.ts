// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  nums: number[];
}

interface Step extends VizStep {
  vals: number[];
  skipped: Set<number>;
  counted: Set<number>;
  best: number;
  cur?: number;
  run?: number[];
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('longest-consec', {
  title: 'Longest Consecutive Sequence: count only from sequence starts',
  inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [100, 4, 200, 1, 3, 2], wide: true }],
  presets: [
    { label: 'LeetCode example 1', input: { nums: [100, 4, 200, 1, 3, 2] } },
    { label: 'LeetCode example 2', input: { nums: [0, 3, 7, 2, 5, 8, 4, 6, 0, 1] } },
    { label: 'Duplicates', input: { nums: [1, 2, 0, 1] } },
  ],
  legend: [
    ['current', 'start being expanded'],
    ['dim', 'skipped: x − 1 exists'],
    ['done', 'counted in a run'],
  ],
  code: `
function longestConsecutive(nums) {
  const set = new Set(nums);                    //@set
  let best = 0;
  for (const x of set) {                        //@loop
    if (set.has(x - 1)) continue;   // not a start  //@skip
    let len = 1;                                //@start
    while (set.has(x + len)) len++;             //@grow
    best = Math.max(best, len);                 //@best
  }
  return best;                                  //@ret
}`,
  validate: ({ nums }) => sizeCheck(nums, 0, 14),
  run({ nums }) {
    const set = new Set(nums),
      steps: Step[] = [];
    let best = 0;
    const skipped: Set<number> = new Set(),
      counted: Set<number> = new Set();
    steps.push({
      line: 'set',
      vals: [...set],
      skipped: new Set(),
      counted: new Set(),
      best,
      note: `Put all ${nums.length} numbers in a Set (${set.size} distinct).`,
    });
    for (const x of set) {
      if (set.has(x - 1)) {
        skipped.add(x);
        steps.push({
          line: 'skip',
          vals: [...set],
          cur: x,
          skipped: new Set(skipped),
          counted: new Set(counted),
          best,
          note: `${x}: ${x - 1} is in the set, so ${x} is not the start of a run. Skip it.`,
          why: 'This check is what makes it O(n): each run is walked only once, from its smallest element.',
        });
        continue;
      }
      let len = 1;
      counted.add(x);
      while (set.has(x + len)) {
        counted.add(x + len);
        len++;
      }
      best = Math.max(best, len);
      steps.push({
        line: ['start', 'grow', 'best'],
        vals: [...set],
        cur: x,
        run: [x, x + len - 1],
        skipped: new Set(skipped),
        counted: new Set(counted),
        best,
        note: `${x} starts a run (${x - 1} absent). Walk ${x}, ${x + 1}, …: length ${len}.`,
      });
    }
    steps.push({
      line: 'ret',
      vals: [...set],
      skipped,
      counted,
      best,
      done: true,
      result: best,
      note: `Answer ${best}.`,
      why: 'Every number is checked once as a possible start and visited once inside a run: O(n) average time, O(n) space. Sorting would give O(n log n).',
    });
    return steps;
  },
  view(st, stage) {
    const vals = [...st.vals].sort((a, b) => a - b);
    const states: Record<string, string> = {};
    vals.forEach((v, i) => {
      if (st.counted.has(v)) states[i] = 'done';
      if (st.skipped.has(v)) states[i] = 'dim';
      if (st.run && v >= st.run[0] && v <= st.run[1]) states[i] = 'current';
      if (v === st.cur && !st.run) states[i] = 'dim';
    });
    stage.append(R.cells(vals, { states, label: 'set contents, shown sorted (the algorithm never sorts)' }));
    stage.append(R.vars({ best: st.best }));
  },
  random: (g) => ({ nums: rarr(g, rint(g, 0, 14), -3, 12) }),
});
