// Ported from legacy/src/viz/w07.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { fmt } from './_helpers';

interface Input {
  stream: number[];
}

interface Step extends VizStep {
  lo: number[];
  hi: number[];
  meds: number[];
  done?: boolean;
  result?: number[];
}

export default defineViz<Input, Step>('two-heaps', {
  title: 'Running median with two heaps',
  inputs: [{ key: 'stream', label: 'stream', type: 'numbers', def: [5, 15, 1, 3], wide: true }],
  presets: [
    { label: 'Lesson 3 trace', input: { stream: [5, 15, 1, 3] } },
    { label: 'LeetCode 295 example', input: { stream: [1, 2, 3] } },
    { label: 'Increasing', input: { stream: [1, 2, 3, 4, 5, 6] } },
  ],
  legend: [
    ['frontier', 'lower half (max-heap)'],
    ['window', 'upper half (min-heap)'],
  ],
  code: `
addNum(x) {
  this.lo.push(x);                        // max-heap: smaller half   //@push
  this.hi.push(this.lo.pop());            // move its largest up      //@move
  if (this.hi.size() > this.lo.size())    // keep lo the same or +1   //@rebal
    this.lo.push(this.hi.pop());
}
findMedian() {
  return this.lo.size() > this.hi.size() ? this.lo.peek()
    : (this.lo.peek() + this.hi.peek()) / 2;                          //@median
}`,
  validate: ({ stream }) => (stream.length < 1 || stream.length > 12 ? 'Use 1–12 numbers.' : null),
  run({ stream }) {
    const lo: number[] = [],
      hi: number[] = [],
      steps: Step[] = [],
      meds: number[] = [];
    const desc = (a: number[]) => a.sort((x: number, y: number) => y - x),
      asc = (a: number[]) => a.sort((x: number, y: number) => x - y);
    for (const x of stream) {
      lo.push(x);
      desc(lo);
      const moved = lo.shift();
      hi.push(moved!);
      asc(hi);
      let back: number | null = null;
      if (hi.length > lo.length) {
        back = hi.shift()!;
        lo.push(back!);
        desc(lo);
      }
      const med = lo.length > hi.length ? lo[0] : (lo[0] + hi[0]) / 2;
      meds.push(med);
      steps.push({
        lo: [...lo],
        hi: [...hi],
        meds: [...meds],
        line: ['push', 'move', 'rebal', 'median'],
        note: `Add ${x}: push to lo, move lo's max (${moved}) to hi${back != null ? ', hi is larger so move its min (' + back + ') back' : ''}. Median ${med}.`,
        why:
          steps.length === 0
            ? 'Every element of lo is ≤ every element of hi, and lo has the same size or one more: so the median is at the tops.'
            : null,
      });
    }
    steps.push({
      lo,
      hi,
      meds,
      done: true,
      line: null,
      result: meds,
      note: `Medians after each insertion: ${fmt(meds)}.`,
      why: 'Each addNum is O(log n) (a constant number of heap operations); findMedian is O(1).',
    });
    return steps;
  },
  view(st, stage) {
    stage.append(
      R.row(
        { align: 'start', gap: 'wide' },
        R.cells(st.lo, {
          states: Object.fromEntries(st.lo.map((_, i) => [i, 'frontier'])),
          label: 'lo: max-heap (largest first)',
          noIndex: true,
        }),
        R.cells(st.hi, {
          states: Object.fromEntries(st.hi.map((_, i) => [i, 'window'])),
          label: 'hi: min-heap (smallest first)',
          noIndex: true,
        }),
      ),
    );
    stage.append(R.vars({ medians: fmt(st.meds) }));
  },
  random: (g) => ({ stream: rarr(g, rint(g, 1, 12), -9, 20) }),
});
