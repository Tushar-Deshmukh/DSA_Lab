// Ported from legacy/src/viz/w07.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  tasks: string;
  n: number;
}

interface Step extends VizStep {
  slots: string[];
  ready: [number, string][];
  cool: [number, string, number][];
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('task-scheduler', {
  title: 'Task Scheduler: simulate with a heap, check against the formula',
  inputs: [
    { key: 'tasks', label: 'tasks', type: 'string', def: 'AAABBB', wide: true },
    { key: 'n', label: 'cooldown n', type: 'int', def: 2 },
  ],
  presets: [
    { label: 'LeetCode example 1', input: { tasks: 'AAABBB', n: 2 } },
    { label: 'No idle needed', input: { tasks: 'ABCDAB', n: 1 } },
    { label: 'n = 0', input: { tasks: 'AAB', n: 0 } },
    { label: 'One frequent task', input: { tasks: 'AAAABC', n: 2 } },
  ],
  legend: [
    ['current', 'this time slot'],
    ['dim', 'idle'],
  ],
  code: `
// simulation: each slot, run the available task with the most remaining copies
time = 0; ready = max-heap of counts; cooling = queue of [count, readyAt]
while (ready.size() || cooling.length) {
  time++;
  if (ready.size()) { c = ready.pop() - 1; if (c) cooling.push([c, time + n]); }  //@run
  // else: idle                                                                 //@idle
  if (cooling.length && cooling[0][1] === time) ready.push(cooling.shift()[0]); //@back
}
// formula: max(tasks.length, (maxFreq − 1) * (n + 1) + countOfMax)             //@formula`,
  validate: ({ tasks, n }) =>
    !/^[A-Z]+$/.test(tasks)
      ? 'Use upper-case letters A–Z.'
      : tasks.length > 12
        ? 'Use at most 12 tasks.'
        : n < 0 || n > 4
          ? 'Use a cooldown of 0–4.'
          : null,
  run({ tasks, n }) {
    const cnt: Record<string, number> = {};
    for (const c of tasks) cnt[c] = (cnt[c] || 0) + 1;
    const ready: [number, string][] = Object.entries(cnt).map(([t, c]) => [c, t]);
    const cool: [number, string, number][] = [];
    const slots: string[] = [];
    const steps: Step[] = [];
    let time = 0;
    const sortR = () => ready.sort((a: [number, string], b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1));
    sortR();
    while (ready.length || cool.length) {
      time++;
      let ran: string | null = null;
      if (ready.length) {
        const [c, t] = ready.shift()!;
        ran = t;
        if (c - 1) cool.push([c - 1, t, time + n]);
      }
      slots.push(ran || 'idle');
      while (cool.length && cool[0][2] === time) {
        const [c, t] = cool.shift()!;
        ready.push([c, t]);
      }
      sortR();
      steps.push({
        slots: [...slots],
        ready: ready.map((x) => [...x]),
        cool: cool.map((x) => [...x]),
        line: ran ? ['run', 'back'] : ['idle', 'back'],
        note: ran
          ? `Time ${time}: run ${ran} (the task with the most copies left that is not cooling).`
          : `Time ${time}: every remaining task is cooling: idle.`,
      });
    }
    const maxF = Math.max(...Object.values(cnt)),
      cmax = Object.values(cnt).filter((v) => v === maxF).length;
    const formula = Math.max(tasks.length, (maxF - 1) * (n + 1) + cmax);
    steps.push({
      slots,
      ready: [],
      cool: [],
      done: true,
      line: 'formula',
      result: time,
      note: `Total time ${time}. Formula: max(${tasks.length}, (${maxF} − 1) × (${n} + 1) + ${cmax}) = ${formula}.`,
      why: 'The most frequent task needs maxFreq − 1 gaps of n slots after it; tasks tied for that frequency fill the last row; and the answer can never be below the number of tasks.',
    });
    return steps;
  },
  view(st, stage) {
    stage.append(
      R.cells(
        st.slots.map((s) => (s === 'idle' ? '·' : s)),
        {
          states: Object.fromEntries(
            st.slots
              .map((s, i) => [
                i,
                s === 'idle' ? 'dim' : i === st.slots.length - 1 && !st.done ? 'current' : null,
              ])
              .filter(([, v]) => v),
          ),
          label: 'schedule (· = idle), time slot 1 at index 0',
        },
      ),
    );
    stage.append(
      R.kv(
        st.ready.map(([c, t]) => [t, c]),
        { label: 'ready (task → copies left)', empty: '(none)' },
      ),
    );
    stage.append(
      R.kv(
        st.cool.map(([c, t, at]) => [t, c + ' left, ready at ' + at]),
        { label: 'cooling', empty: '(none)' },
      ),
    );
  },
  random: (g) => ({ tasks: rstr(g, rint(g, 1, 12), 'ABCD'), n: rint(g, 0, 4) }),
});
