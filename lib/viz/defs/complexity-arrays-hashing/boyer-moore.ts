// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  nums: number[];
}

interface Step extends VizStep {
  i?: number;
  cand: number;
  votes: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('boyer-moore', {
  title: 'Boyer–Moore majority vote: O(1) space',
  inputs: [
    {
      key: 'nums',
      label: 'nums (a majority must exist)',
      type: 'numbers',
      def: [2, 2, 1, 1, 1, 2, 2],
      wide: true,
    },
  ],
  presets: [
    { label: 'LeetCode example 2', input: { nums: [2, 2, 1, 1, 1, 2, 2] } },
    { label: 'LeetCode example 1', input: { nums: [3, 2, 3] } },
    { label: 'Majority at the end', input: { nums: [1, 2, 3, 3, 3] } },
  ],
  legend: [
    ['current', 'x'],
    ['done', 'candidate'],
  ],
  code: `
function majorityElement(nums) {
  let candidate = null, votes = 0;            //@init
  for (const x of nums) {                     //@loop
    if (votes === 0) candidate = x;           //@pick
    votes += x === candidate ? 1 : -1;        //@vote
  }
  return candidate;                           //@ret
}`,
  validate: ({ nums }) => {
    const e = sizeCheck(nums, 1, 15);
    if (e) return e;
    const c: Record<string, number> = {};
    nums.forEach((x) => (c[x] = (c[x] || 0) + 1));
    return Object.values(c).some((v) => v > nums.length / 2)
      ? null
      : 'Some value must appear more than n/2 times (the problem guarantees it).';
  },
  run({ nums }) {
    const steps: Step[] = [];
    let cand: number | null = null,
      votes = 0;
    nums.forEach((x, i) => {
      const picked = votes === 0;
      if (picked) cand = x;
      votes += x === cand ? 1 : -1;
      steps.push({
        line: picked ? ['pick', 'vote'] : 'vote',
        i,
        cand: cand!,
        votes,
        note: `${picked ? 'Votes were 0, so ' + x + ' becomes the candidate. ' : ''}${x} ${x === cand ? 'matches the candidate: votes + 1' : 'differs: votes − 1'} → ${votes}.`,
        why:
          i === 0
            ? 'Pair each majority element with a different element and cancel them; the majority has more than n/2 copies, so it cannot be fully cancelled.'
            : null,
      });
    });
    steps.push({
      line: 'ret',
      cand: cand!,
      votes,
      done: true,
      result: cand!,
      note: `Return ${cand}.`,
      why: 'O(n) time, O(1) space. It only works because a majority is guaranteed; otherwise a second pass must count the candidate.',
    });
    return steps;
  },
  view(st, stage, { nums }) {
    const states: Record<string, string> = {};
    if (st.i != null && !st.done) states[st.i] = 'current';
    stage.append(
      R.cells(nums, { states, ptrs: st.i != null && !st.done ? { [st.i]: 'x' } : {}, label: 'nums' }),
    );
    stage.append(R.vars({ candidate: st.cand, votes: st.votes }));
  },
  random: (g) => {
    const n = rint(g, 1, 15),
      maj = rint(g, 0, 3),
      a = rarr(g, n, 0, 3);
    const need = Math.floor(n / 2) + 1;
    let cnt = a.filter((x) => x === maj).length;
    for (let i = 0; i < n && cnt < need; i++)
      if (a[i] !== maj) {
        a[i] = maj;
        cnt++;
      }
    return { nums: a };
  },
});
