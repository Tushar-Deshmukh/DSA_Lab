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
  st: Record<string, string>;
  kept: number;
  cur?: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('iv-select', {
  title: 'Keep the most non-overlapping intervals: sort by end, greedy',
  inputs: [
    {
      key: 'iv',
      label: 'intervals',
      type: 'json',
      def: [
        [1, 2],
        [2, 3],
        [3, 4],
        [1, 3],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'LeetCode 435 example 1',
      input: {
        iv: [
          [1, 2],
          [2, 3],
          [3, 4],
          [1, 3],
        ],
      },
    },
    {
      label: 'One long interval',
      input: {
        iv: [
          [1, 100],
          [11, 22],
          [1, 11],
          [2, 12],
        ],
      },
    },
    {
      label: 'All the same',
      input: {
        iv: [
          [1, 2],
          [1, 2],
          [1, 2],
        ],
      },
    },
  ],
  legend: [
    ['done', 'kept'],
    ['error', 'removed (overlaps the last kept)'],
    ['current', 'deciding'],
  ],
  code: `
function eraseOverlapIntervals(intervals) {
  intervals.sort((a, b) => a[1] - b[1]);              // by END   //@sort
  let kept = 0, lastEnd = -Infinity;
  for (const [s, e] of intervals) {
    if (s >= lastEnd) { kept++; lastEnd = e; }        // compatible: keep  //@keep
  }                                                   // else: remove      //@drop
  return intervals.length - kept;
}`,
  validate: ({ iv }) => ivCheck(iv),
  run({ iv }) {
    const a = iv.map((x) => [...x]).sort((x, y) => x[1] - y[1]);
    const steps: Step[] = [],
      st: Record<string, string> = {};
    let kept = 0,
      last = -Infinity;
    steps.push({
      a,
      st: {},
      kept,
      line: 'sort',
      note: `Sorted by end: ${a.map((x) => '[' + x + ']').join(' ')}.`,
      why: 'Exchange argument (Module 9): the interval that ends first leaves the most room for the rest, so some optimal answer always includes it.',
    });
    a.forEach(([s, e], i) => {
      if (s >= last) {
        kept++;
        last = e;
        st[i] = 'done';
        steps.push({
          a,
          st: { ...st },
          cur: i,
          kept,
          line: 'keep',
          note: `[${s},${e}] starts at ${s} ≥ ${last === e ? 'previous end' : last}: compatible. Keep it; lastEnd = ${e}.`,
        });
      } else {
        st[i] = 'error';
        steps.push({
          a,
          st: { ...st },
          cur: i,
          kept,
          line: 'drop',
          note: `[${s},${e}] starts before lastEnd = ${last}: overlap. Remove it.`,
          why: 'Removing the interval that ends later is never worse: the kept one ends earlier.',
        });
      }
    });
    steps.push({
      a,
      st,
      kept,
      done: true,
      line: null,
      result: a.length - kept,
      note: `Kept ${kept}; removed ${a.length - kept}.`,
    });
    return steps;
  },
  view(st, stage) {
    const s = { ...st.st };
    if (st.cur != null && !st.done && !s[st.cur]) s[st.cur] = 'current';
    stage.append(R.intervals(st.a, { states: s }));
    stage.append(R.vars({ kept: st.kept }));
  },
  random: (g) => ({
    iv: Array.from({ length: rint(g, 1, 8) }, () => {
      const s = rint(g, 0, 12);
      return [s, s + rint(g, 1, 5)];
    }),
  }),
});
