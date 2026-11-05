// Ported from legacy/src/viz/w02.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  height: number[];
}

interface Step extends VizStep {
  l: number;
  r: number;
  lm: number;
  rm: number;
  water: number;
  settled: Record<string, number>;
  cur?: number;
  result?: number;
}

export default defineViz<Input, Step>('trap', {
  title: 'Trapping Rain Water: two pointers with running maxima',
  inputs: [
    {
      key: 'height',
      label: 'height',
      type: 'numbers',
      def: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1],
      wide: true,
    },
  ],
  presets: [
    { label: 'LeetCode example 1', input: { height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] } },
    { label: 'LeetCode example 2', input: { height: [4, 2, 0, 3, 2, 5] } },
  ],
  legend: [
    ['current', 'index being settled'],
    ['done', 'water settled'],
  ],
  code: `
function trap(height) {
  let l = 0, r = height.length - 1;                 //@init
  let leftMax = 0, rightMax = 0, water = 0;          //@init2
  while (l < r) {                                    //@loop
    if (height[l] < height[r]) {                     //@cmp
      leftMax = Math.max(leftMax, height[l]);        //@lmax
      water += leftMax - height[l];                  //@ladd
      l++;                                           //@lmove
    } else {
      rightMax = Math.max(rightMax, height[r]);      //@rmax
      water += rightMax - height[r];                 //@radd
      r--;                                           //@rmove
    }
  }
  return water;                                      //@ret
}`,
  validate: ({ height }) =>
    sizeCheck(height, 1, 16) || (height.some((x) => x < 0) ? 'Heights must be 0 or more.' : null),
  run({ height: a }) {
    const steps: Step[] = [];
    let l = 0,
      r = a.length - 1,
      lm = 0,
      rm = 0,
      water = 0;
    const settled: Record<string, number> = {};
    const snap = <O extends object>(o: O) =>
      Object.assign({ l, r, lm, rm, water, settled: { ...settled } }, o);
    steps.push(
      snap({
        line: ['init', 'init2'],
        note: 'Water above index i = min(highest wall to its left, highest wall to its right) − height[i].',
      }),
    );
    while (l < r) {
      if (a[l] < a[r]) {
        lm = Math.max(lm, a[l]);
        const w = lm - a[l];
        water += w;
        settled[l] = w;
        steps.push(
          snap({
            line: ['cmp', 'lmax', 'ladd'],
            cur: l,
            note: `height[l] = ${a[l]} < height[r] = ${a[r]}: settle index ${l}. leftMax = ${lm}, so it holds ${w}.`,
            why: `The right side already has a wall of ${a[r]} ≥ leftMax, so the true right maximum is at least leftMax: the left maximum is the limit.`,
          }),
        );
        l++;
      } else {
        rm = Math.max(rm, a[r]);
        const w = rm - a[r];
        water += w;
        settled[r] = w;
        steps.push(
          snap({
            line: ['cmp', 'rmax', 'radd'],
            cur: r,
            note: `height[r] = ${a[r]} ≤ height[l] = ${a[l]}: settle index ${r}. rightMax = ${rm}, so it holds ${w}.`,
            why: `The left side has a wall of ${a[l]} ≥ rightMax, so the right maximum is the limit.`,
          }),
        );
        r--;
      }
    }
    steps.push(
      snap({
        result: water,
        line: 'ret',
        note: `Total water: ${water}.`,
        why: 'Each index is settled exactly once: O(n) time, O(1) space. The prefix-max version uses two O(n) arrays instead.',
      }),
    );
    return steps;
  },
  view(st, stage, { height: a }) {
    const states: Record<string, string> = {},
      ptrs: Record<string, string> = {};
    Object.keys(st.settled).forEach((i) => (states[i] = 'done'));
    if (st.cur != null) states[st.cur] = 'current';
    if (st.l === st.r) ptrs[st.l] = 'l,r';
    else {
      ptrs[st.l] = 'l';
      ptrs[st.r] = 'r';
    }
    stage.append(
      R.bars(a, { states, ptrs, water: st.settled, label: 'height (shaded: water settled so far)' }),
    );
    stage.append(R.vars({ leftMax: st.lm, rightMax: st.rm, water: st.water }));
  },
  random: (g) => ({ height: rarr(g, rint(g, 1, 16), 0, 6) }),
});
