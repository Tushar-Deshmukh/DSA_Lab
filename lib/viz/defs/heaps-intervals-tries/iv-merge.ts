// Ported from legacy/src/viz/w07.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { ivCheck } from './_helpers';

interface Input {
  iv: number[][];
}

interface Step extends VizStep {
  a: number[][];
  res: number[][];
  cur?: number;
  done?: boolean;
  result?: number[][];
}

export default defineViz<Input, Step>('iv-merge', {
  title: 'Merge intervals: sort by start, extend or start a new block',
  inputs: [
    {
      key: 'iv',
      label: 'intervals',
      type: 'json',
      def: [
        [1, 3],
        [8, 10],
        [2, 6],
        [15, 18],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'Handbook dry run',
      input: {
        iv: [
          [1, 3],
          [8, 10],
          [2, 6],
          [15, 18],
        ],
      },
    },
    {
      label: 'Touching endpoints',
      input: {
        iv: [
          [1, 4],
          [4, 5],
        ],
      },
    },
    {
      label: 'Containment (needs max)',
      input: {
        iv: [
          [1, 10],
          [2, 3],
          [4, 12],
        ],
      },
    },
  ],
  legend: [
    ['current', 'interval being placed'],
    ['done', 'merged result'],
  ],
  code: `
function merge(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);                           //@sort
  const res = [intervals[0].slice()];
  for (let i = 1; i < intervals.length; i++) {
    const last = res[res.length - 1], [s, e] = intervals[i];
    if (s <= last[1]) last[1] = Math.max(last[1], e);   // overlap //@extend
    else res.push([s, e]);                              // gap     //@new
  }
  return res;
}`,
  validate: ({ iv }) => ivCheck(iv),
  run({ iv }) {
    const a = iv.map((x) => [...x]).sort((x, y) => x[0] - y[0]);
    const steps: Step[] = [],
      res = [a[0].slice()];
    steps.push({
      a,
      res: res.map((x) => [...x]),
      cur: 0,
      line: 'sort',
      note: `Sorted by start: ${a.map((x) => '[' + x + ']').join(' ')}. Start the first block with [${a[0]}].`,
      why: 'In start order, an interval can only overlap the block currently being built, never an earlier one.',
    });
    for (let i = 1; i < a.length; i++) {
      const last = res.at(-1),
        [s, e] = a[i];
      if (s <= last![1]) {
        const old = last![1];
        last![1] = Math.max(last![1], e);
        steps.push({
          a,
          res: res.map((x) => [...x]),
          cur: i,
          line: 'extend',
          note: `[${s},${e}] starts at ${s} ≤ ${old} (the block's end): overlap. End = max(${old}, ${e}) = ${last![1]}.`,
          why:
            e < old
              ? 'Contained interval: without Math.max the block would wrongly shrink.'
              : s === old
                ? 'Touching endpoints count as overlapping here (problem 56 uses ≤).'
                : null,
        });
      } else {
        res.push([s, e]);
        steps.push({
          a,
          res: res.map((x) => [...x]),
          cur: i,
          line: 'new',
          note: `[${s},${e}] starts after ${last![1]}: a gap, so start a new block.`,
        });
      }
    }
    steps.push({
      a,
      res,
      done: true,
      line: null,
      result: res,
      note: `Merged: ${res.map((x) => '[' + x + ']').join(' ')}.`,
      why: 'O(n log n) for the sort plus one O(n) pass.',
    });
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {};
    st.a.forEach((_, i) => {
      if (i < st.cur!) states[i] = 'dim';
    });
    if (st.cur != null && !st.done) states[st.cur] = 'current';
    stage.append(R.intervals(st.a, { states, merged: st.res, mergedLabel: 'merged blocks' }));
  },
  random: (g) => ({
    iv: Array.from({ length: rint(g, 1, 10) }, () => {
      const s = rint(g, 0, 20);
      return [s, s + rint(g, 0, 6)];
    }),
  }),
});
