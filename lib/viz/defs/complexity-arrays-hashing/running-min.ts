// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  prices: number[];
}

interface Step extends VizStep {
  i?: number;
  mn: number;
  mi: number;
  best: number;
  bp: number[] | null;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('running-min', {
  title: 'One pass with a running minimum (Best Time to Buy and Sell Stock)',
  inputs: [{ key: 'prices', label: 'prices', type: 'numbers', def: [7, 1, 5, 3, 6, 4], wide: true }],
  presets: [
    { label: 'LeetCode example 1', input: { prices: [7, 1, 5, 3, 6, 4] } },
    { label: 'Falling prices', input: { prices: [7, 6, 4, 3, 1] } },
    { label: 'New minimum late', input: { prices: [3, 8, 1, 4] } },
  ],
  legend: [
    ['current', 'today (sell day)'],
    ['done', 'cheapest day so far (buy day)'],
  ],
  code: `
function maxProfit(prices) {
  let minPrice = Infinity, best = 0;         //@init
  for (const p of prices) {                  //@loop
    minPrice = Math.min(minPrice, p);        //@min
    best = Math.max(best, p - minPrice);     //@best
  }
  return best;                               //@ret
}`,
  validate: ({ prices }) =>
    sizeCheck(prices, 1, 16) || (prices.some((x) => x < 0) ? 'Prices are 0 or more.' : null),
  run({ prices: a }) {
    const steps: Step[] = [];
    let mn = Infinity,
      mi = -1,
      best = 0,
      bp: number[] | null = null;
    a.forEach((p, i) => {
      if (p < mn) {
        mn = p;
        mi = i;
      }
      const nb = p - mn > best;
      if (nb) {
        best = p - mn;
        bp = [mi, i];
      }
      steps.push({
        line: ['min', 'best'],
        i,
        mn,
        mi,
        best,
        bp,
        note: `Day ${i}, price ${p}: cheapest so far ${mn} (day ${mi}). Selling today earns ${p - mn}.${nb ? ' New best.' : ''}`,
        why:
          i === 0
            ? 'For each sell day, the best buy day is simply the cheapest earlier day. Remembering it replaces the inner loop over all earlier days.'
            : null,
      });
    });
    steps.push({
      line: 'ret',
      best,
      bp,
      mi,
      mn,
      done: true,
      result: best,
      note: best
        ? `Best profit ${best}: buy on day ${bp![0]}, sell on day ${bp![1]}.`
        : 'Prices never rise: profit 0 (do not trade).',
    });
    return steps;
  },
  view(st, stage, { prices: a }) {
    const states: Record<string, string> = {};
    if (st.done) {
      if (st.bp) {
        states[st.bp[0]] = 'done';
        states[st.bp[1]] = 'current';
      }
    } else {
      states[st.mi] = 'done';
      states[st.i!] = 'current';
    }
    stage.append(R.bars(a, { states, label: 'prices by day' }));
    stage.append(R.vars({ minPrice: st.mn, best: st.best }));
  },
  random: (g) => ({ prices: rarr(g, rint(g, 1, 16), 0, 20) }),
});
