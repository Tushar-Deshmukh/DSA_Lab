// Ported from legacy/src/viz/w04.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  t: number[];
}

interface Step extends VizStep {
  i?: number;
  ans: number[];
  st: number[];
  popped?: number;
  done?: boolean;
  result?: number[];
}

export default defineViz<Input, Step>('daily-temps', {
  title: 'Daily Temperatures: distances from stored indices',
  inputs: [
    { key: 't', label: 'temperatures', type: 'numbers', def: [73, 74, 75, 71, 69, 72, 76, 73], wide: true },
  ],
  presets: [
    { label: 'LeetCode example 1', input: { t: [73, 74, 75, 71, 69, 72, 76, 73] } },
    { label: 'Increasing', input: { t: [30, 40, 50, 60] } },
  ],
  legend: [
    ['current', 'today'],
    ['frontier', 'waiting for a warmer day'],
    ['done', 'answered'],
  ],
  code: `
function dailyTemperatures(t) {
  const ans = new Array(t.length).fill(0);
  const stack = [];                                      // indices
  for (let i = 0; i < t.length; i++) {
    while (stack.length && t[stack.at(-1)] < t[i]) {     //@while
      const j = stack.pop();
      ans[j] = i - j;               // days waited       //@dist
    }
    stack.push(i);                                       //@push
  }
  return ans;
}`,
  validate: ({ t }) => sizeCheck(t, 1, 14),
  run({ t }) {
    const ans = new Array(t.length).fill(0),
      st: number[] = [],
      steps: Step[] = [];
    for (let i = 0; i < t.length; i++) {
      while (st.length && t[st.at(-1)!] < t[i]) {
        const j = st.pop();
        ans[j!] = i - j!;
        steps.push({
          i,
          ans: [...ans],
          st: [...st],
          popped: j,
          line: ['while', 'dist'],
          note: `Day ${i} (${t[i]}) is warmer than day ${j} (${t[j!]}): ans[${j}] = ${i} − ${j} = ${i - j!}.`,
          why: 'Storing indices, not temperatures, is what makes the distance computable.',
        });
      }
      st.push(i);
      steps.push({ i, ans: [...ans], st: [...st], line: 'push', note: `Day ${i} waits.` });
    }
    steps.push({
      ans,
      st,
      done: true,
      line: null,
      result: ans,
      note: `Days left on the stack never get warmer: 0. Result [${ans.join(', ')}].`,
    });
    return steps;
  },
  view(st, stage, { t }) {
    const states: Record<string, string> = {};
    st.st.forEach((j) => (states[j] = 'frontier'));
    t.forEach((_, j) => {
      if (st.ans[j]) states[j] = 'done';
    });
    if (st.i != null && !st.done) states[st.i] = 'current';
    stage.append(
      R.bars(
        t.map((x) => x - Math.min(...t) + 1),
        {
          states,
          ptrs: st.i != null && !st.done ? { [st.i]: 'i' } : {},
          label: 'temperatures (heights relative to the coldest day)',
        },
      ),
    );
    stage.append(R.stack(st.st.map((j) => 'day ' + j + ' (' + t[j] + ')')));
    stage.append(
      R.cells(st.ans, {
        states: st.popped != null ? { [st.popped]: 'current' } : {},
        label: 'ans (days to wait)',
      }),
    );
  },
  random: (g) => ({ t: rarr(g, rint(g, 1, 14), 30, 40) }),
});
