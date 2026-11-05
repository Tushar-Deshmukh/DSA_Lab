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
  ev: number[][];
  k: number;
  cur: number;
  best: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('sweep', {
  title: 'Sweep line: +1 at a start, −1 at an end, track the maximum',
  inputs: [
    {
      key: 'iv',
      label: 'meetings [start, end)',
      type: 'json',
      def: [
        [0, 30],
        [5, 10],
        [15, 20],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'Lesson 4: 2 rooms',
      input: {
        iv: [
          [0, 30],
          [5, 10],
          [15, 20],
        ],
      },
    },
    {
      label: 'Back to back',
      input: {
        iv: [
          [1, 5],
          [5, 8],
        ],
      },
    },
    {
      label: 'Three at once',
      input: {
        iv: [
          [1, 10],
          [2, 7],
          [3, 19],
          [8, 12],
          [10, 20],
          [11, 30],
        ],
      },
    },
  ],
  legend: [['current', 'event being processed']],
  code: `
function minRooms(meetings) {
  const events = [];
  for (const [s, e] of meetings) { events.push([s, +1]); events.push([e, -1]); }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);   // ends before starts at a tie  //@sort
  let cur = 0, best = 0;
  for (const [, d] of events) { cur += d; best = Math.max(best, cur); }               //@sweep
  return best;
}`,
  validate: ({ iv }) => ivCheck(iv),
  run({ iv }) {
    const ev: number[][] = [];
    iv.forEach(([s, e]) => {
      ev.push([s, 1]);
      ev.push([e, -1]);
    });
    ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const steps: Step[] = [];
    let cur = 0,
      best = 0;
    steps.push({
      ev,
      k: -1,
      cur,
      best,
      line: 'sort',
      note: `${ev.length} events sorted by time; at equal times, ends (−1) come first.`,
      why: 'A meeting ending at 10 frees its room for one starting at 10, so the −1 must be processed first.',
    });
    ev.forEach(([t, d], k) => {
      cur += d;
      const nb = cur > best;
      best = Math.max(best, cur);
      steps.push({
        ev,
        k,
        cur,
        best,
        line: 'sweep',
        note: `t = ${t}: ${d > 0 ? 'a meeting starts' : 'a meeting ends'} → ${cur} in progress.${nb ? ' New maximum.' : ''}`,
      });
    });
    steps.push({
      ev,
      k: ev.length,
      cur,
      best,
      done: true,
      line: null,
      result: best,
      note: `${best} room${best === 1 ? '' : 's'} needed.`,
      why: 'O(n log n) for the sort; the sweep is O(n). A min-heap of end times gives the same answer.',
    });
    return steps;
  },
  view(st, stage, { iv }) {
    stage.append(R.intervals(iv, {}));
    stage.append(
      R.cells(
        st.ev.map(([t, d]) => t + (d > 0 ? ' +1' : ' −1')),
        {
          states: st.k >= 0 && st.k < st.ev.length ? { [st.k]: 'current' } : {},
          label: 'events (time, change)',
        },
      ),
    );
    stage.append(R.vars({ 'in progress': st.cur, maximum: st.best }));
  },
  random: (g) => ({
    iv: Array.from({ length: rint(g, 1, 8) }, () => {
      const s = rint(g, 0, 20);
      return [s, s + rint(g, 1, 8)];
    }),
  }),
});
