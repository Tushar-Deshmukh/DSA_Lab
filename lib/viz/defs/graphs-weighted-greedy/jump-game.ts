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
  bad?: number;
  done?: boolean;
  result?: boolean;
}

// ---------- greedy ----------
export default defineViz<Input, Step>('jump-game', {
  title: 'Jump Game: track the farthest reachable index',
  inputs: [
    {
      key: 'nums',
      label: 'nums (max jump at each index)',
      type: 'numbers',
      def: [3, 2, 1, 0, 4],
      wide: true,
    },
  ],
  presets: [
    { label: 'Handbook dry run (false)', input: { nums: [3, 2, 1, 0, 4] } },
    { label: 'LeetCode example 1 (true)', input: { nums: [2, 3, 1, 1, 4] } },
    { label: 'Single element', input: { nums: [0] } },
  ],
  legend: [
    ['window', 'reachable so far'],
    ['current', 'i'],
    ['error', 'unreachable'],
  ],
  code: `
function canJump(nums) {
  let farthest = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > farthest) return false;           // i cannot be reached     //@fail
    farthest = Math.max(farthest, i + nums[i]);                          //@reach
  }
  return true;                                                           //@ok
}`,
  validate: ({ nums }) =>
    nums.length < 1 || nums.length > 14 || nums.some((x) => x < 0) ? 'Use 1–14 non-negative numbers.' : null,
  run({ nums }) {
    let far = 0;
    const steps: Step[] = [];
    for (let i = 0; i < nums.length; i++) {
      if (i > far) {
        steps.push({
          i,
          far,
          bad: i,
          line: 'fail',
          done: true,
          result: false,
          note: `i = ${i} > farthest = ${far}: index ${i} cannot be reached, so neither can the end. Return false.`,
        });
        return steps;
      }
      const nf = Math.max(far, i + nums[i]);
      steps.push({
        i,
        far: nf,
        line: 'reach',
        note: `i = ${i}: from here you can reach ${i + nums[i]}. farthest = ${nf}.`,
        why:
          i === 0
            ? 'If you can reach i, you can reach every index up to i + nums[i]: one number summarises everything a DP table would store.'
            : null,
      });
      far = nf;
    }
    steps.push({
      i: nums.length - 1,
      far,
      line: 'ok',
      done: true,
      result: true,
      note: 'Every index was reachable: return true.',
      why: 'One pass, O(n) time and O(1) space, against O(n²) for a canReach DP.',
    });
    return steps;
  },
  view(st, stage, { nums }) {
    const states: Record<string, string> = {};
    nums.forEach((_, k) => {
      if (k <= st.far) states[k] = 'window';
    });
    if (st.bad != null) for (let k = st.bad; k < nums.length; k++) states[k] = 'error';
    else states[st.i] = 'current';
    stage.append(R.cells(nums, { states, ptrs: { [st.i]: 'i' }, label: 'nums' }));
    stage.append(R.vars({ farthest: st.far }));
  },
  random: (g) => ({ nums: rarr(g, rint(g, 1, 12), 0, 3) }),
});
