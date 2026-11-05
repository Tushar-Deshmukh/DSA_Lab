// Ported from legacy/src/viz/w11.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  x: number;
}

interface Step extends VizStep {
  n: number;
  prev: number | null;
  count: number;
  low?: number;
  done?: boolean;
  result?: number;
}

// ---------- bits ----------
export default defineViz<Input, Step>('bit-count', {
  title: "Kernighan's trick: x & (x − 1) removes the lowest set bit",
  inputs: [{ key: 'x', label: 'x (32-bit integer)', type: 'int', def: 44 }],
  presets: [
    { label: '44 = 101100', input: { x: 44 } },
    { label: '255', input: { x: 255 } },
    { label: '−1 (all 32 bits)', input: { x: -1 } },
    { label: '2³¹ − 1', input: { x: 2147483647 } },
  ],
  legend: [],
  code: `
function hammingWeight(n) {
  let count = 0;
  while (n !== 0) {
    n &= n - 1;            // clears exactly the lowest set bit   //@clear
    count++;                                                    //@count
  }
  return count;                                                 //@ret
}`,
  validate: ({ x }) => (x < -2147483648 || x > 4294967295 ? 'Use a value that fits in 32 bits.' : null),
  run({ x }) {
    let n = x | 0,
      count = 0;
    const steps: Step[] = [
      {
        n,
        prev: null,
        count,
        line: null,
        note: `n = ${x}${x < 0 ? " (two's complement: all leading bits are 1)" : ''}.`,
      },
    ];
    while (n !== 0) {
      const prev = n;
      n &= n - 1;
      count++;
      let low = 0;
      while (!((prev >>> low) & 1)) low++;
      steps.push({
        n,
        prev,
        low,
        count,
        line: ['clear', 'count'],
        note: `n & (n − 1): bit ${low} was the lowest 1; it is now 0. count = ${count}.`,
        why:
          count === 1
            ? 'n − 1 flips the lowest 1 to 0 and every 0 below it to 1; AND with n keeps everything above and clears the rest.'
            : null,
      });
    }
    steps.push({
      n,
      prev: null,
      count,
      done: true,
      line: 'ret',
      result: count,
      note: `${count} set bit${count === 1 ? '' : 's'}: the loop ran once per set bit, not once per bit position.`,
    });
    return steps;
  },
  view(st, stage, { x }) {
    const width = x >= 0 && x < 65536 ? 16 : 32;
    if (st.prev != null) {
      stage.append(R.bits(st.prev, { label: 'n before', width }));
      stage.append(R.bits(st.prev - 1, { label: 'n − 1', width }));
    }
    stage.append(
      R.bits(st.n, {
        label: st.prev != null ? 'n & (n − 1)' : 'n',
        changed: st.low != null ? [st.low] : [],
        width,
      }),
    );
    stage.append(R.vars({ count: st.count }));
  },
  random: (g) => ({ x: rint(g, -2147483648, 2147483647) }),
});
