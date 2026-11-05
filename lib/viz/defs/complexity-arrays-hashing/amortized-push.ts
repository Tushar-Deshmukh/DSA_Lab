// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  n: number;
}

interface Step extends VizStep {
  buf: (number | null)[];
  size: number;
  cap: number;
  copies: number;
  ops: number;
  wrote?: number;
  result?: boolean;
  copied?: number;
}

// ---------- amortised push ----------
export default defineViz<Input, Step>('amortized-push', {
  title: 'Dynamic array push: occasional O(n) copy, O(1) amortised',
  inputs: [{ key: 'n', label: 'number of pushes', type: 'int', def: 17 }],
  presets: [
    { label: '9 pushes', input: { n: 9 } },
    { label: '17 pushes', input: { n: 17 } },
    { label: '33 pushes', input: { n: 33 } },
  ],
  legend: [
    ['current', 'written now'],
    ['compare', 'copied during a resize'],
    ['dim', 'allocated but empty'],
  ],
  code: `
function push(arr, x) {
  if (arr.size === arr.capacity) {          //@full
    const bigger = new Buffer(2 * arr.capacity);
    copy(arr.buffer, bigger);   // O(size)   //@copy
    arr.buffer = bigger; arr.capacity *= 2; //@grow
  }
  arr.buffer[arr.size++] = x;   // O(1)      //@write
}`,
  validate: ({ n }) => (n < 1 || n > 40 ? 'Use 1–40 pushes.' : null),
  run({ n }) {
    const steps: Step[] = [];
    let cap = 1,
      size = 0,
      copies = 0;
    let buf: (number | null)[] = [null];
    for (let x = 1; x <= n; x++) {
      if (size === cap) {
        copies += size;
        cap *= 2;
        const nb = new Array(cap).fill(null);
        for (let i = 0; i < size; i++) nb[i] = buf[i];
        buf = nb;
        steps.push({
          line: ['full', 'copy', 'grow'],
          buf: [...buf],
          size,
          cap,
          copies,
          ops: copies + size,
          copied: size,
          note: `Full (size ${size} = capacity). Allocate ${cap} slots and copy ${size} element${size === 1 ? '' : 's'}.`,
          why:
            'This push costs O(size). But the capacity doubled, so the next ' +
            (cap / 2 - 1) +
            ' pushes will be cheap.',
        });
      }
      buf[size++] = x;
      steps.push({
        line: 'write',
        buf: [...buf],
        size,
        cap,
        copies,
        ops: copies + size,
        wrote: size - 1,
        note: `Write ${x} at index ${size - 1}.`,
        why:
          x === n
            ? `After ${n} pushes: ${n} writes + ${copies} copied elements = ${n + copies} units of work, ${((n + copies) / n).toFixed(2)} per push. It never exceeds 3 per push.`
            : null,
        result: x === n ? (n + copies) / n <= 3 : undefined,
      });
    }
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {};
    st.buf.forEach((v, i) => {
      if (v === null) states[i] = 'dim';
    });
    if (st.copied) for (let i = 0; i < st.copied; i++) states[i] = 'compare';
    if (st.wrote != null) states[st.wrote] = 'current';
    stage.append(
      R.cells(
        st.buf.map((v) => (v === null ? '' : v)),
        { states, label: 'buffer (capacity ' + st.cap + ')' },
      ),
    );
    stage.append(
      R.vars({
        size: st.size,
        capacity: st.cap,
        'elements copied (total)': st.copies,
        'work per push so far': (st.ops / st.size).toFixed(2),
      }),
    );
  },
  random: (g) => ({ n: rint(g, 1, 40) }),
});
