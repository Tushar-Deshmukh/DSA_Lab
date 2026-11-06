// Ported from legacy/src/viz/w04.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  h: number[];
}

interface Step extends VizStep {
  st: number[];
  best: number;
  i?: number;
  bestR?: number[] | null;
  cur?: number[];
  top?: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('histogram', {
  title: 'Largest Rectangle in Histogram: widths from previous and next smaller bars',
  inputs: [{ key: 'h', label: 'heights', type: 'numbers', def: [2, 1, 5, 6, 2, 3], wide: true }],
  presets: [
    { label: 'LeetCode example 1', input: { h: [2, 1, 5, 6, 2, 3] } },
    { label: 'Increasing', input: { h: [1, 2, 3, 4] } },
    { label: 'All equal', input: { h: [3, 3, 3] } },
  ],
  legend: [
    ['frontier', 'on the stack (increasing heights)'],
    ['current', 'bar being resolved'],
    ['best', 'best rectangle'],
  ],
  code: `
function largestRectangleArea(heights) {
  const h = [...heights, 0];          // sentinel flushes the stack   //@sentinel
  const stack = []; let best = 0;
  for (let i = 0; i < h.length; i++) {
    while (stack.length && h[stack.at(-1)] >= h[i]) {                 //@while
      const top = stack.pop();
      const left = stack.length ? stack.at(-1) + 1 : 0;  // prev smaller + 1  //@left
      best = Math.max(best, h[top] * (i - left));        // i = next smaller  //@area
    }
    stack.push(i);                                                    //@push
  }
  return best;
}`,
  validate: ({ h }) => sizeCheck(h, 1, 12) || (h.some((x) => x < 0) ? 'Heights must be 0 or more.' : null),
  run({ h: hs }) {
    const h = [...hs, 0],
      st: number[] = [],
      steps: Step[] = [];
    let best = 0,
      bestR: number[] | null = null;
    steps.push({
      st: [],
      best,
      line: 'sentinel',
      note: 'Append a 0-height bar: it is smaller than everything, so it resolves every bar left on the stack at the end.',
    });
    for (let i = 0; i < h.length; i++) {
      while (st.length && h[st.at(-1)!] >= h[i]) {
        const top = st.pop();
        const left = st.length ? st.at(-1)! + 1 : 0;
        const area = h[top!] * (i - left);
        const nb = area > best;
        if (nb) {
          best = area;
          bestR = [left, i - 1, h[top!]];
        }
        steps.push({
          i,
          st: [...st],
          best,
          bestR,
          cur: [left, i - 1, h[top!]],
          top,
          line: ['while', 'left', 'area'],
          note: `Bar ${top} (height ${h[top!]}) is resolved by bar ${i}: it can extend from ${left} to ${i - 1} → width ${i - left}, area ${area}.${nb ? ' New best.' : ''}`,
          why: 'The bar below it on the stack is the previous smaller bar and i is the next smaller bar, so the widest rectangle of exactly this height spans between them.',
        });
      }
      st.push(i);
      if (i < hs.length)
        steps.push({ i, st: [...st], best, bestR, line: 'push', note: `Push bar ${i} (height ${h[i]}).` });
    }
    steps.push({
      st: [],
      best,
      bestR,
      done: true,
      line: null,
      result: best,
      note: `Largest area ${best}.`,
      why: 'Each bar is pushed and popped once: O(n), against O(n²) for expanding around every bar.',
    });
    return steps;
  },
  view(st, stage, { h }) {
    const states: Record<string, string> = {};
    st.st.forEach((j) => {
      if (j < h.length) states[j] = 'frontier';
    });
    if (st.top != null) states[st.top] = 'current';
    const r = st.cur || st.bestR;
    stage.append(
      R.bars(h, {
        states,
        rect: r ? { l: r[0], r: r[1], h: r[2], cls: st.cur ? '' : 'best' } : null,
        ptrs: st.i != null && st.i < h.length && !st.done ? { [st.i]: 'i' } : {},
        label: 'heights (shaded: rectangle being measured)',
      }),
    );
    stage.append(R.vars({ best: st.best }));
  },
  random: (g) => ({ h: rarr(g, rint(g, 1, 12), 0, 8) }),
});
