// Ported from legacy/src/viz/w07.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { fmt } from './_helpers';

interface Input {
  ops: [string, ...number[]][];
}

interface Step extends VizStep {
  d: number[];
  out: number[];
  hot?: Record<string, string>;
  done?: boolean;
  result?: number[];
}

// ---------- heap operations (min-heap, real sift steps) ----------
function heapSteps(ops: [string, ...number[]][], cmp: (a: number, b: number) => number = (a, b) => a - b) {
  const d: number[] = [],
    steps: {
      d: number[];
      out: number[];
      line?: VizStep['line'];
      hot?: Record<string, string>;
      note?: string;
      why?: string | null;
      done?: boolean;
      result?: number[];
    }[] = [],
    out: number[] = [];
  const snap = <O extends object>(o: O) => Object.assign({ d: [...d], out: [...out] }, o);
  for (const op of ops) {
    if (op[0] === 'push') {
      d.push(op[1]);
      let i = d.length - 1;
      steps.push(
        snap({
          line: 'append',
          hot: { [i]: 'current' },
          note: `push(${op[1]}): append at index ${i}.`,
          why:
            d.length === 1
              ? 'Appending keeps the tree complete; only the order may now be wrong along one path.'
              : null,
        }),
      );
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (cmp(d[i], d[p]) >= 0) {
          steps.push(
            snap({
              line: 'up',
              hot: { [i]: 'current', [p]: 'compare' },
              note: `${d[i]} ≥ parent ${d[p]} (index ${p}): stop.`,
            }),
          );
          break;
        }
        [d[i], d[p]] = [d[p], d[i]];
        steps.push(
          snap({
            line: 'up',
            hot: { [p]: 'current', [i]: 'compare' },
            note: `${d[p]} < parent ${d[i]}: swap with index ${p} = (${i} − 1) >> 1.`,
          }),
        );
        i = p;
      }
    } else if (op[0] === 'pop') {
      if (!d.length) {
        steps.push(snap({ line: 'pop', note: 'pop on an empty heap returns undefined.' }));
        continue;
      }
      const top = d[0],
        last = d.pop();
      out.push(top);
      if (!d.length) {
        steps.push(snap({ line: 'pop', note: `pop() → ${top}; the heap is now empty.` }));
        continue;
      }
      d[0] = last!;
      steps.push(
        snap({
          line: 'pop',
          hot: { 0: 'current' },
          note: `pop() → ${top}. Move the last element (${last}) to the root.`,
          why: 'Removing the last slot keeps the tree complete; now sift the new root down.',
        }),
      );
      let i = 0;
      while (true) {
        const l = 2 * i + 1,
          r = l + 1;
        let s = i;
        if (l < d.length && cmp(d[l], d[s]) < 0) s = l;
        if (r < d.length && cmp(d[r], d[s]) < 0) s = r;
        if (s === i) {
          steps.push(
            snap({
              line: 'down',
              hot: { [i]: 'current' },
              note: `${d[i]} is ≤ its children${l < d.length ? '' : ' (it has none)'}: stop.`,
            }),
          );
          break;
        }
        [d[i], d[s]] = [d[s], d[i]];
        steps.push(
          snap({
            line: 'down',
            hot: { [s]: 'current', [i]: 'compare' },
            note: `Swap with the smaller child ${d[i]} (index ${s}).`,
            why: 'Swapping with the smaller child keeps the heap property between the two children as well.',
          }),
        );
        i = s;
      }
    }
  }
  return { steps, d, out };
}

const heapCode = `
push(x) {
  d.push(x); let i = d.length - 1;                 // append      //@append
  while (i > 0) {                                  // sift up
    const p = (i - 1) >> 1;
    if (this.compare(d[i], d[p]) >= 0) break;
    [d[i], d[p]] = [d[p], d[i]]; i = p;                           //@up
  }
}
pop() {
  const top = d[0], last = d.pop();
  if (d.length) { d[0] = last; /* sift down from 0 */ }          //@pop
  // while a child is smaller: swap with the SMALLER child      //@down
  return top;
}`;

export default defineViz<Input, Step>('heap-ops', {
  title: 'Min-heap: push sifts up, pop sifts down',
  inputs: [
    {
      key: 'ops',
      label: 'operations',
      type: 'json',
      def: [['push', 5], ['push', 3], ['push', 8], ['push', 1], ['pop'], ['pop']],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'Handbook dry run',
      input: { ops: [['push', 5], ['push', 3], ['push', 8], ['push', 1], ['pop'], ['pop']] },
    },
    {
      label: 'Push descending',
      input: {
        ops: [
          ['push', 9],
          ['push', 7],
          ['push', 5],
          ['push', 3],
          ['push', 1],
        ],
      },
    },
    {
      label: 'Heap sort by popping',
      input: {
        ops: [['push', 4], ['push', 1], ['push', 3], ['push', 2], ['pop'], ['pop'], ['pop'], ['pop']],
      },
    },
  ],
  legend: [
    ['current', 'element moving'],
    ['compare', 'compared / swapped with'],
  ],
  code: heapCode,
  validate: ({ ops }) =>
    !Array.isArray(ops) ||
    ops.length > 14 ||
    ops.some((o) => !((o[0] === 'push' && typeof o[1] === 'number') || o[0] === 'pop'))
      ? 'Operations look like ["push", 5] or ["pop"], at most 14.'
      : null,
  run({ ops }) {
    const { steps, out } = heapSteps(ops);
    steps.push(
      Object.assign({}, steps.at(-1) || { d: [] as number[], out: [] as number[] }, {
        line: null,
        hot: {},
        done: true,
        result: out,
        note: `Popped in order: ${fmt(out)}.`,
        why: 'Both operations walk one root-to-leaf path of a complete tree: O(log n). peek is O(1).',
      }),
    );
    return steps;
  },
  view(st, stage) {
    stage.append(R.heap(st.d, { states: st.hot }));
    stage.append(R.vars({ popped: fmt(st.out) }));
  },
  random: (g) => {
    const ops: [string, ...number[]][] = [];
    let n = 0;
    for (let k = rint(g, 1, 14); k > 0; k--) {
      if (!n || g() < 0.6) {
        ops.push(['push', rint(g, 0, 20)]);
        n++;
      } else {
        ops.push(['pop']);
        n--;
      }
    }
    return { ops };
  },
});
