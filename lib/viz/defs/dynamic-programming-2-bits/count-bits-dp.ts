// Ported from legacy/src/viz/w11.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  n: number;
}

interface Step extends VizStep {
  b: (number | null)[];
  i: number | null;
  dep?: number;
  done?: boolean;
  result?: number[];
}

export default defineViz<Input, Step>('count-bits-dp', {
  title: 'Counting Bits: bits[i] = bits[i >> 1] + (i & 1)',
  inputs: [{ key: 'n', label: 'n', type: 'int', def: 8 }],
  presets: [
    { label: 'n = 8', input: { n: 8 } },
    { label: 'n = 5', input: { n: 5 } },
    { label: 'n = 0', input: { n: 0 } },
  ],
  legend: [
    ['current', 'bits[i]'],
    ['compare', 'bits[i >> 1]'],
  ],
  code: `
const bits = new Array(n + 1).fill(0);
for (let i = 1; i <= n; i++)
  bits[i] = bits[i >> 1] + (i & 1);    // drop the last bit, then add it back  //@step
return bits;`,
  validate: ({ n }) => (n < 0 || n > 20 ? 'Use 0 ≤ n ≤ 20.' : null),
  run({ n }) {
    const b = new Array(n + 1).fill(null);
    b[0] = 0;
    const steps: Step[] = [{ b: [...b], i: 0, line: null, note: 'bits[0] = 0.' }];
    for (let i = 1; i <= n; i++) {
      b[i] = b[i >> 1] + (i & 1);
      steps.push({
        b: [...b],
        i,
        dep: i >> 1,
        line: 'step',
        note: `${i} = ${i.toString(2)}₂: drop the last bit → ${i >> 1} (${(i >> 1).toString(2) || '0'}₂, ${b[i >> 1]} ones), add ${i & 1}. bits[${i}] = ${b[i]}.`,
        why:
          i === 3
            ? 'i >> 1 is smaller than i, so its answer is already in the table: DP over the binary structure.'
            : null,
      });
    }
    steps.push({
      b,
      i: null,
      done: true,
      line: null,
      result: b,
      note: `[${b.join(', ')}]`,
      why: 'O(n) total, instead of O(n log n) for counting each number separately.',
    });
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {};
    if (st.dep != null) states[st.dep] = 'dep';
    if (st.i != null) states[st.i] = 'current';
    stage.append(R.row1d(st.b, { states, label: 'bits[i] = number of 1s in i' }));
    if (st.i) stage.append(R.bits(st.i, { width: 5, label: 'i in binary', signed: false }));
  },
  random: (g) => ({ n: rint(g, 0, 20) }),
});
