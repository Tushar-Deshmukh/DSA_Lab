// Ported from legacy/src/viz/w07.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint, sorted } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { fmt } from './_helpers';

interface Input {
  lists: number[][];
}

interface Step extends VizStep {
  heap: number[][];
  out: number[];
  pos: number[];
  cur?: number[];
  done?: boolean;
  result?: number[];
}

export default defineViz<Input, Step>('kway-merge', {
  title: 'K-way merge with a heap of [value, list, position]',
  inputs: [
    {
      key: 'lists',
      label: 'sorted lists',
      type: 'json',
      def: [
        [1, 4, 5],
        [1, 3, 4],
        [2, 6],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'LeetCode 23 example',
      input: {
        lists: [
          [1, 4, 5],
          [1, 3, 4],
          [2, 6],
        ],
      },
    },
    { label: 'Lesson 2: three short arrays', input: { lists: [[2, 9], [1, 7, 8], [3]] } },
    { label: 'An empty list', input: { lists: [[], [1], [0, 5]] } },
  ],
  legend: [
    ['current', 'popped now'],
    ['done', 'merged'],
    ['frontier', 'in the heap'],
  ],
  code: `
function mergeK(lists) {
  const heap = new MinHeap((a, b) => a[0] - b[0]);       // [value, list, pos]
  lists.forEach((l, i) => { if (l.length) heap.push([l[0], i, 0]); });  //@init
  const out = [];
  while (heap.size()) {
    const [v, i, p] = heap.pop();                                       //@pop
    out.push(v);
    if (p + 1 < lists[i].length) heap.push([lists[i][p + 1], i, p + 1]); //@next
  }
  return out;
}`,
  validate: ({ lists }) =>
    !Array.isArray(lists) || !lists.every(Array.isArray) || lists.length > 5
      ? 'Enter up to 5 lists like [[1,4],[2,3]].'
      : lists.flat().length > 14
        ? 'Keep it to 14 elements in total.'
        : lists.some((l) => !l.every((x, i) => !i || l[i - 1] <= x))
          ? 'Each list must be sorted.'
          : null,
  run({ lists }) {
    const steps: Step[] = [];
    const heap: number[][] = [];
    const out: number[] = [];
    const pos = lists.map(() => 0);
    const sortH = () => heap.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    lists.forEach((l, i) => {
      if (l.length) heap.push([l[0], i, 0]);
    });
    sortH();
    steps.push({
      heap: heap.map((x) => [...x]),
      out: [],
      pos: [...pos],
      line: 'init',
      note: `Push the head of every non-empty list: ${heap.map((h) => h[0] + ' (list ' + h[1] + ')').join(', ')}.`,
      why: 'The next element of the merged output must be one of the k heads, so the heap never needs more than k entries.',
    });
    while (heap.length) {
      const [v, i, p] = heap.shift()!;
      out.push(v);
      pos[i] = p + 1;
      let nx: number | null = null;
      if (p + 1 < lists[i].length) {
        heap.push([lists[i][p + 1], i, p + 1]);
        sortH();
        nx = lists[i][p + 1];
      }
      steps.push({
        heap: heap.map((x) => [...x]),
        out: [...out],
        pos: [...pos],
        cur: [i, p],
        line: ['pop', 'next'],
        note: `Pop ${v} from list ${i}.${nx != null ? ' Push its successor ' + nx + '.' : ' That list is exhausted.'}`,
      });
    }
    steps.push({
      heap: [],
      out,
      pos,
      done: true,
      line: null,
      result: out,
      note: `Merged: ${fmt(out)}.`,
      why: `N = ${out.length} pops and pushes on a heap of size ≤ k = ${lists.length}: O(N log k).`,
    });
    return steps;
  },
  view(st, stage, { lists }) {
    const inHeap = new Set(st.heap.map((h) => h[1] + ',' + h[2]));
    lists.forEach((l, i) => {
      const states: Record<string, string> = {};
      l.forEach((_, p) => {
        if (p < st.pos[i]) states[p] = 'done';
        if (inHeap.has(i + ',' + p)) states[p] = 'frontier';
        if (st.cur && st.cur[0] === i && st.cur[1] === p) states[p] = 'current';
      });
      stage.append(R.cells(l, { states, label: 'list ' + i }));
    });
    stage.append(
      R.queue(
        st.heap.map((h) => h[0] + ' (L' + h[1] + ')'),
        { label: 'heap contents (smallest first)' },
      ),
    );
    stage.append(R.cells(st.out, { label: 'output', noIndex: true }));
  },
  random: (g) => ({
    lists: Array.from({ length: rint(g, 1, 5) }, () => sorted(rarr(g, rint(g, 0, 3), 0, 9))),
  }),
});
