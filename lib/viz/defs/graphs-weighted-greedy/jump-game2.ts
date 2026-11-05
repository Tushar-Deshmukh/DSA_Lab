// Ported from legacy/src/viz/w09.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  nums: number[];
}

interface Step extends VizStep {
  i: number;
  far: number;
  lvl: number[] | null;
  jumps: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('jump-game2', {
  title: 'Jump Game II: count levels of reach, like BFS',
  inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [2, 3, 1, 1, 4], wide: true }],
  presets: [
    { label: 'LeetCode example 1', input: { nums: [2, 3, 1, 1, 4] } },
    { label: 'LeetCode example 2', input: { nums: [2, 3, 0, 1, 4] } },
    { label: 'Ones', input: { nums: [1, 1, 1, 1] } },
  ],
  legend: [
    ['window', 'current level (reachable with `jumps` jumps)'],
    ['current', 'i'],
  ],
  code: `
function jump(nums) {
  let jumps = 0, end = 0, farthest = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    farthest = Math.max(farthest, i + nums[i]);                        //@reach
    if (i === end) { jumps++; end = farthest; }   // level finished    //@level
  }
  return jumps;
}`,
  validate: ({ nums }) => {
    if (nums.length < 1 || nums.length > 14 || nums.some((x) => x < 0))
      return 'Use 1–14 non-negative numbers.';
    let f = 0;
    for (let i = 0; i < nums.length; i++) {
      if (i > f) return 'The end must be reachable (problem 45 guarantees it).';
      f = Math.max(f, i + nums[i]);
    }
    return null;
  },
  run({ nums }) {
    let jumps = 0,
      end = 0,
      far = 0,
      start = 0;
    const steps: Step[] = [];
    for (let i = 0; i < nums.length - 1; i++) {
      far = Math.max(far, i + nums[i]);
      if (i === end) {
        jumps++;
        const ps = start;
        start = end + 1;
        end = far;
        steps.push({
          i,
          far,
          lvl: [ps, i],
          jumps,
          line: ['reach', 'level'],
          note: `i = ${i} is the end of level ${jumps - 1}: take jump #${jumps}. The next level reaches up to index ${end}.`,
          why:
            jumps === 1
              ? 'Indices reachable with j jumps form a contiguous range; the next range ends at the farthest point reachable from it. This is BFS without a queue.'
              : null,
        });
      } else
        steps.push({ i, far, lvl: [start, end], jumps, line: 'reach', note: `i = ${i}: farthest = ${far}.` });
    }
    steps.push({
      i: nums.length - 1,
      far,
      lvl: null,
      jumps,
      done: true,
      line: null,
      result: jumps,
      note: `Minimum jumps: ${jumps}.`,
      why: 'O(n) time, O(1) space.',
    });
    return steps;
  },
  view(st, stage, { nums }) {
    stage.append(
      R.cells(nums, { window: st.lvl, states: { [st.i]: 'current' }, ptrs: { [st.i]: 'i' }, label: 'nums' }),
    );
    stage.append(R.vars({ jumps: st.jumps, farthest: st.far }));
  },
  random: (g) => {
    let a: number[];
    do a = rarr(g, rint(g, 1, 12), 0, 3);
    while (
      (() => {
        let f = 0;
        for (let i = 0; i < a.length; i++) {
          if (i > f) return true;
          f = Math.max(f, i + a[i]);
        }
        return false;
      })()
    );
    return { nums: a };
  },
});
