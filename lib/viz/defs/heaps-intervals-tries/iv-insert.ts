// Ported from legacy/src/viz/w07.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { ivCheck } from './_helpers';

interface Input {
  iv: number[][];
  nw: number[];
}

interface Step extends VizStep {
  st: Record<string, string>;
  res: number[][];
  ne: number[];
  done?: boolean;
  result?: number[][];
}

export default defineViz<Input, Step>('iv-insert', {
  title: 'Insert an interval: before, overlapping, after (no sort)',
  inputs: [
    {
      key: 'iv',
      label: 'sorted, non-overlapping intervals',
      type: 'json',
      def: [
        [1, 2],
        [3, 5],
        [6, 7],
        [8, 10],
        [12, 16],
      ],
      wide: true,
    },
    { key: 'nw', label: 'new interval', type: 'json', def: [4, 8] },
  ],
  presets: [
    {
      label: 'LeetCode example 2',
      input: {
        iv: [
          [1, 2],
          [3, 5],
          [6, 7],
          [8, 10],
          [12, 16],
        ],
        nw: [4, 8],
      },
    },
    {
      label: 'LeetCode example 1',
      input: {
        iv: [
          [1, 3],
          [6, 9],
        ],
        nw: [2, 5],
      },
    },
    { label: 'Goes at the end', input: { iv: [[1, 2]], nw: [5, 6] } },
  ],
  legend: [
    ['dim', 'ends before the new interval'],
    ['current', 'overlaps: absorbed'],
    ['frontier', 'starts after'],
  ],
  code: `
function insert(intervals, nw) {
  const res = []; let i = 0, [s, e] = nw;
  while (i < intervals.length && intervals[i][1] < s) res.push(intervals[i++]);  // before  //@before
  while (i < intervals.length && intervals[i][0] <= e) {                          // overlap //@overlap
    s = Math.min(s, intervals[i][0]); e = Math.max(e, intervals[i][1]); i++;
  }
  res.push([s, e]);                                                                         //@place
  while (i < intervals.length) res.push(intervals[i++]);                          // after   //@after
  return res;
}`,
  validate: ({ iv, nw }) =>
    ivCheck(iv) ||
    (!Array.isArray(nw) || nw.length !== 2 || nw[0] > nw[1]
      ? 'The new interval looks like [4, 8].'
      : iv.some((x, k) => k && iv[k - 1][1] >= x[0])
        ? 'The input intervals must be sorted and non-overlapping.'
        : null),
  run({ iv, nw }) {
    const steps: Step[] = [],
      res: number[][] = [],
      st: Record<string, string> = {};
    let i = 0,
      [s, e] = nw;
    while (i < iv.length && iv[i][1] < s) {
      st[i] = 'dim';
      res.push(iv[i]);
      steps.push({
        st: { ...st },
        res: res.map((x) => [...x]),
        ne: [s, e],
        line: 'before',
        note: `[${iv[i]}] ends at ${iv[i][1]} < ${s}: entirely before. Copy it.`,
      });
      i++;
    }
    while (i < iv.length && iv[i][0] <= e) {
      st[i] = 'current';
      s = Math.min(s, iv[i][0]);
      e = Math.max(e, iv[i][1]);
      steps.push({
        st: { ...st },
        res: res.map((x) => [...x]),
        ne: [s, e],
        line: 'overlap',
        note: `[${iv[i]}] starts at ${iv[i][0]} ≤ ${e}: overlap. The new interval grows to [${s},${e}].`,
      });
      i++;
    }
    res.push([s, e]);
    steps.push({
      st: { ...st },
      res: res.map((x) => [...x]),
      ne: [s, e],
      line: 'place',
      note: `Place [${s},${e}].`,
    });
    while (i < iv.length) {
      st[i] = 'frontier';
      res.push(iv[i]);
      i++;
    }
    steps.push({
      st,
      res,
      ne: [s, e],
      done: true,
      line: 'after',
      result: res,
      note: `Copy the rest. Result: ${res.map((x) => '[' + x + ']').join(' ')}.`,
      why: 'The input is already sorted, so one O(n) pass suffices: no sort.',
    });
    return steps;
  },
  view(st, stage, { iv }) {
    stage.append(R.intervals(iv, { states: st.st, extra: [st.ne], merged: st.res, mergedLabel: 'result' }));
    stage.append(R.vars({ 'new interval now': '[' + st.ne + ']' }));
  },
  random: (g) => {
    const iv: number[][] = [];
    let t = rint(g, 0, 3);
    for (let k = rint(g, 1, 6); k > 0; k--) {
      const s = t,
        e = s + rint(g, 0, 3);
      iv.push([s, e]);
      t = e + rint(g, 1, 3);
    }
    const s = rint(g, 0, t),
      e = s + rint(g, 0, 6);
    return { iv, nw: [s, e] };
  },
});
