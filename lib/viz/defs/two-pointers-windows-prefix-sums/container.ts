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
  best: number;
  bestLR: number[] | null;
  area?: number;
  h?: number;
  result?: number;
}

export default defineViz<Input, Step>('container', {
  title: 'Container With Most Water: move the shorter wall',
  inputs: [{ key: 'height', label: 'height', type: 'numbers', def: [1, 8, 6, 2, 5, 4, 8, 3, 7], wide: true }],
  presets: [
    { label: 'LeetCode example', input: { height: [1, 8, 6, 2, 5, 4, 8, 3, 7] } },
    { label: 'Equal walls', input: { height: [4, 3, 2, 1, 4] } },
    { label: 'Two walls', input: { height: [1, 1] } },
  ],
  legend: [
    ['current', 'walls l and r'],
    ['dim', 'ruled out'],
    ['best', 'best container so far'],
  ],
  code: `
function maxArea(height) {
  let l = 0, r = height.length - 1, best = 0;   //@init
  while (l < r) {                               //@loop
    const h = Math.min(height[l], height[r]);   //@h
    best = Math.max(best, h * (r - l));         //@best
    if (height[l] < height[r]) l++;             //@movel
    else r--;                                   //@mover
  }
  return best;                                  //@ret
}`,
  validate: ({ height }) =>
    sizeCheck(height, 2, 14) || (height.some((x) => x < 0) ? 'Heights must be 0 or more.' : null),
  run({ height: a }) {
    const steps: Step[] = [];
    let l = 0,
      r = a.length - 1,
      best = 0,
      bestLR: number[] | null = null;
    const snap = <O extends object>(o: O) => Object.assign({ l, r, best, bestLR }, o);
    steps.push(snap({ line: 'init', note: 'Start with the widest container: walls at both ends.' }));
    while (l < r) {
      const h = Math.min(a[l], a[r]),
        area = h * (r - l);
      const improved = area > best;
      if (improved) {
        best = area;
        bestLR = [l, r];
      }
      steps.push(
        snap({
          line: ['h', 'best'],
          area,
          h,
          note: `Width ${r - l} × height min(${a[l]}, ${a[r]}) = ${h} → area ${area}.${improved ? ' New best.' : ' Best stays ' + best + '.'}`,
        }),
      );
      if (a[l] < a[r]) {
        steps.push(
          snap({
            line: 'movel',
            area,
            h,
            note: `Left wall ${a[l]} is shorter: l → ${l + 1}.`,
            why: `Every other container using wall ${l} is narrower and still capped at height ${a[l]}, so none can beat ${area}. Moving the taller wall instead could never help.`,
          }),
        );
        l++;
      } else {
        steps.push(
          snap({
            line: 'mover',
            area,
            h,
            note: `Right wall ${a[r]} is ${a[l] === a[r] ? 'equal' : 'shorter'}: r → ${r - 1}.`,
            why:
              a[l] === a[r]
                ? 'With equal walls, either move is safe: any better container would need both walls taller than this height, so neither of these walls can be in it.'
                : `Every other container using wall ${r} is narrower and capped at ${a[r]}.`,
          }),
        );
        r--;
      }
    }
    steps.push(
      snap({
        result: best,
        line: 'ret',
        note: `Pointers met. Answer: ${best}.`,
        why: 'n − 1 moves in total, so O(n) time and O(1) space, against O(n²) for trying every pair.',
      }),
    );
    return steps;
  },
  view(st, stage, { height: a }) {
    const states: Record<string, string> = {},
      ptrs: Record<string, string> = {};
    a.forEach((_, i) => {
      if (i < st.l || i > st.r) states[i] = 'dim';
    });
    if (st.l < st.r) {
      states[st.l] = 'current';
      states[st.r] = 'current';
      ptrs[st.l] = 'l';
      ptrs[st.r] = 'r';
    } else ptrs[st.l] = 'l,r';
    const rect =
      st.h != null
        ? { l: st.l, r: st.r, h: st.h }
        : st.bestLR
          ? { l: st.bestLR[0], r: st.bestLR[1], h: Math.min(a[st.bestLR[0]], a[st.bestLR[1]]), cls: 'best' }
          : null;
    stage.append(R.bars(a, { states, ptrs, rect, label: 'height (shaded: water the current walls hold)' }));
    stage.append(
      R.vars({ area: st.area ?? '·', best: st.best, 'best walls': st.bestLR ? st.bestLR.join(' & ') : '·' }),
    );
  },
  random: (g) => ({ height: rarr(g, rint(g, 2, 14), 0, 12) }),
});
