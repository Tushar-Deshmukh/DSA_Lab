// Ported from legacy/src/viz/w11.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  prices: number[];
}

interface Step extends VizStep {
  day: number | null;
  hold: number;
  sold: number;
  rest: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('stock-cooldown', {
  title: 'State machine: hold, sold, rest (stock with cooldown, 309)',
  inputs: [{ key: 'prices', label: 'prices', type: 'numbers', def: [1, 2, 3, 0, 2], wide: true }],
  presets: [
    { label: 'LeetCode example', input: { prices: [1, 2, 3, 0, 2] } },
    { label: 'Falling prices', input: { prices: [5, 4, 3, 2] } },
    { label: 'Cooldown matters', input: { prices: [1, 4, 2, 7] } },
  ],
  legend: [['current', 'today']],
  code: `
let hold = -Infinity, sold = 0, rest = 0;      // best profit in each mode
for (const p of prices) {
  const prevSold = sold;                       // keep yesterday's values  //@save
  sold = hold + p;                             // sell today               //@sell
  hold = Math.max(hold, rest - p);             // keep holding, or buy (only from rest) //@buy
  rest = Math.max(rest, prevSold);             // cooldown ends → rest     //@rest
}
return Math.max(sold, rest);                                               //@ret`,
  validate: ({ prices }) =>
    prices.length < 1 || prices.length > 12 || prices.some((p) => p < 0)
      ? 'Use 1–12 non-negative prices.'
      : null,
  run({ prices }) {
    let hold = -Infinity,
      sold = 0,
      rest = 0;
    const steps: Step[] = [
      {
        day: null,
        hold,
        sold,
        rest,
        line: 'save',
        note: 'Before day 0: cannot be holding (−∞), 0 profit otherwise.',
      },
    ];
    prices.forEach((p, d) => {
      const ps = sold,
        ph = hold,
        pr = rest;
      sold = ph + p;
      hold = Math.max(ph, pr - p);
      rest = Math.max(pr, ps);
      steps.push({
        day: d,
        hold,
        sold,
        rest,
        line: ['save', 'sell', 'buy', 'rest'],
        note: `Day ${d}, price ${p}: sold = hold + ${p} = ${sold === -Infinity ? '−∞' : sold}; hold = max(${ph === -Infinity ? '−∞' : ph}, rest ${pr} − ${p}) = ${hold}; rest = max(${pr}, yesterday's sold ${ps}) = ${rest}.`,
        why:
          d === 0
            ? 'Buying is only allowed from rest, never straight after selling: that is the cooldown, encoded as the missing arrow sold → hold.'
            : null,
      });
    });
    const ans = Math.max(sold, rest);
    steps.push({
      day: null,
      hold,
      sold,
      rest,
      done: true,
      line: 'ret',
      result: ans,
      note: `Best profit: max(sold, rest) = ${ans}.`,
      why: "O(n) time, O(1) space. Compute all three from yesterday's values: overwriting one before the others are computed is the classic bug.",
    });
    return steps;
  },
  view(st, stage, { prices }) {
    stage.append(
      R.cells(prices, {
        states: st.day != null ? { [st.day]: 'current' } : {},
        ptrs: st.day != null ? { [st.day]: 'today' } : {},
        label: 'prices',
      }),
    );
    stage.append(R.vars({ hold: st.hold, sold: st.sold, rest: st.rest }));
    stage.append(
      R.graph(
        {
          nodes: [
            { id: 'rest', x: 0.1, y: 0.75 },
            { id: 'hold', x: 0.5, y: 0.2 },
            { id: 'sold', x: 0.9, y: 0.75 },
          ],
          edges: [
            { u: 'rest', v: 'hold', w: 'buy' },
            { u: 'hold', v: 'sold', w: 'sell' },
            { u: 'sold', v: 'rest', w: 'cooldown' },
          ],
          directed: true,
        },
        {
          w: 300,
          h: 170,
          r: 22,
          pad: 34,
          label: 'modes (hold and rest may also stay as they are)',
          subs: { rest: st.rest, hold: st.hold, sold: st.sold },
        },
      ),
    );
  },
  random: (g) => ({ prices: rarr(g, rint(g, 1, 10), 0, 9) }),
});
