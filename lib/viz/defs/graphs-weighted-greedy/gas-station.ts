// Ported from legacy/src/viz/w09.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  gas: number[];
  cost: number[];
}

interface Step extends VizStep {
  i: number;
  start: number;
  tank: number;
  total: number;
  bad?: number;
  done?: boolean;
  ans?: number;
  result?: number;
}

export default defineViz<Input, Step>('gas-station', {
  title: 'Gas Station: reset the start whenever the tank goes negative',
  inputs: [
    { key: 'gas', label: 'gas', type: 'numbers', def: [1, 2, 3, 4, 5] },
    { key: 'cost', label: 'cost', type: 'numbers', def: [3, 4, 5, 1, 2] },
  ],
  presets: [
    { label: 'Lesson 5 trace', input: { gas: [1, 2, 3, 4, 5], cost: [3, 4, 5, 1, 2] } },
    { label: 'Impossible', input: { gas: [2, 3, 4], cost: [3, 4, 3] } },
    { label: 'Start at 0', input: { gas: [5, 1, 2, 3, 4], cost: [4, 4, 1, 5, 1] } },
  ],
  legend: [
    ['window', 'current candidate stretch'],
    ['error', 'tank went negative here'],
    ['done', 'answer'],
  ],
  code: `
function canCompleteCircuit(gas, cost) {
  let total = 0, tank = 0, start = 0;
  for (let i = 0; i < gas.length; i++) {
    const diff = gas[i] - cost[i];
    total += diff; tank += diff;                                   //@add
    if (tank < 0) { start = i + 1; tank = 0; }   // no start in [start, i] works  //@reset
  }
  return total >= 0 ? start : -1;                                  //@ret
}`,
  validate: ({ gas, cost }) =>
    gas.length !== cost.length || gas.length < 1 || gas.length > 12
      ? 'gas and cost need the same length (1–12).'
      : null,
  run({ gas, cost }) {
    let total = 0,
      tank = 0,
      start = 0;
    const steps: Step[] = [];
    for (let i = 0; i < gas.length; i++) {
      const d = gas[i] - cost[i];
      total += d;
      tank += d;
      if (tank < 0) {
        steps.push({
          i,
          start,
          tank,
          total,
          bad: i,
          line: ['add', 'reset'],
          note: `Station ${i}: net ${d >= 0 ? '+' : ''}${d}, tank ${tank} < 0. No start in [${start}, ${i}] can pass station ${i}: try ${i + 1} next.`,
          why: 'Starting later inside [start, i] only removes stations that contributed a non-negative running tank, so it can only be worse. That is why the start jumps to i + 1.',
        });
        start = i + 1;
        tank = 0;
      } else
        steps.push({
          i,
          start,
          tank,
          total,
          line: 'add',
          note: `Station ${i}: net ${d >= 0 ? '+' : ''}${d}, tank ${tank}.`,
        });
    }
    const ans = total >= 0 ? start : -1;
    steps.push({
      i: gas.length - 1,
      start,
      tank,
      total,
      done: true,
      ans,
      line: 'ret',
      result: ans,
      note:
        total >= 0
          ? `total = ${total} ≥ 0, so a start exists, and it is ${start}.`
          : `total = ${total} < 0: not enough gas overall. Return −1.`,
      why: 'If the total is non-negative, the last reset point works for the rest of the circuit and the deficit before it is covered by the surplus after it. O(n), O(1).',
    });
    return steps;
  },
  view(st, stage, { gas, cost }) {
    const net = gas.map((g2, i) => g2 - cost[i]);
    const states: Record<string, string> = {};
    if (st.done) {
      if (st.ans! >= 0) states[st.ans!] = 'done';
    } else {
      for (let k = st.start; k <= st.i; k++) states[k] = 'window';
      if (st.bad != null) states[st.bad] = 'error';
    }
    stage.append(R.cells(net, { states, label: 'gas[i] − cost[i]' }));
    stage.append(R.vars({ start: st.start, tank: st.tank, total: st.total }));
  },
  random: (g) => {
    const n = rint(g, 1, 8);
    return { gas: rarr(g, n, 0, 6), cost: rarr(g, n, 0, 6) };
  },
});
