// Ported from legacy/src/viz/w04.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  ops: [string, ...number[]][];
}

interface Step extends VizStep {
  inn: number[];
  out: number[];
  res: (number | null | undefined)[];
  moves: number;
  moved?: number;
  done?: boolean;
  result?: (number | null | undefined)[];
}

export default defineViz<Input, Step>('queue-2stacks', {
  title: 'Queue from two stacks: amortised O(1)',
  inputs: [
    {
      key: 'ops',
      label: 'operations',
      type: 'json',
      def: [['push', 1], ['push', 2], ['peek'], ['pop'], ['push', 3], ['pop'], ['pop']],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'Mixed',
      input: { ops: [['push', 1], ['push', 2], ['peek'], ['pop'], ['push', 3], ['pop'], ['pop']] },
    },
    {
      label: 'Many pushes, then pops',
      input: {
        ops: [['push', 1], ['push', 2], ['push', 3], ['push', 4], ['pop'], ['pop'], ['pop'], ['pop']],
      },
    },
  ],
  legend: [['current', 'moved now']],
  code: `
class MyQueue {
  constructor() { this.in = []; this.out = []; }
  push(x) { this.in.push(x); }                          //@push
  #fill() {
    if (!this.out.length)                               //@check
      while (this.in.length) this.out.push(this.in.pop()); //@move
  }
  pop() { this.#fill(); return this.out.pop(); }        //@pop
  peek() { this.#fill(); return this.out.at(-1); }      //@peek
}`,
  validate: ({ ops }) => (!Array.isArray(ops) || ops.length > 14 ? 'At most 14 operations.' : null),
  run({ ops }) {
    const inn: number[] = [],
      out: number[] = [],
      steps: Step[] = [],
      res: (number | null | undefined)[] = [];
    let moves = 0;
    for (const op of ops) {
      if (op[0] === 'push') {
        inn.push(op[1]);
        res.push(null);
        steps.push({
          inn: [...inn],
          out: [...out],
          line: 'push',
          res: [...res],
          moves,
          note: `push(${op[1]}) onto the in-stack: O(1).`,
        });
        continue;
      }
      if (!out.length && inn.length) {
        const k = inn.length;
        while (inn.length) {
          out.push(inn.pop()!);
          moves++;
        }
        steps.push({
          inn: [...inn],
          out: [...out],
          line: ['check', 'move'],
          res: [...res],
          moves,
          moved: k,
          note: `out is empty: move all ${k} element${k > 1 ? 's' : ''} from in to out, reversing their order so the oldest is on top.`,
          why: 'Each element is moved from in to out at most once in its life, so over any sequence of n operations the total work is O(n): amortised O(1) each.',
        });
      }
      if (!out.length) {
        res.push(undefined);
        steps.push({
          inn: [...inn],
          out: [...out],
          line: op[0] === 'pop' ? 'pop' : 'peek',
          res: [...res],
          moves,
          note: `${op[0]}() on an empty queue: LeetCode never does this.`,
        });
        continue;
      }
      if (op[0] === 'pop') {
        const x = out.pop();
        res.push(x);
        steps.push({
          inn: [...inn],
          out: [...out],
          line: 'pop',
          res: [...res],
          moves,
          note: `pop() = ${x}, the oldest element.`,
        });
      } else {
        res.push(out.at(-1));
        steps.push({
          inn: [...inn],
          out: [...out],
          line: 'peek',
          res: [...res],
          moves,
          note: `peek() = ${out.at(-1)}.`,
        });
      }
    }
    steps.push({
      inn,
      out,
      done: true,
      line: null,
      res,
      moves,
      result: res,
      note: `Outputs: [${res.map((x) => (x === null ? 'null' : x)).join(', ')}]; ${moves} element moves in total.`,
    });
    return steps;
  },
  view(st, stage) {
    const os: Record<string, string> = {};
    if (st.moved) for (let k = st.out.length - st.moved; k < st.out.length; k++) os[k] = 'current';
    stage.append(
      R.row(
        { align: 'end', gap: 'wide' },
        R.stack(st.inn, { label: 'in (push here)' }),
        R.stack(st.out, { label: 'out (pop here)', states: os }),
      ),
    );
    stage.append(
      R.vars({
        'total moves': st.moves,
        outputs: '[' + st.res.map((x) => (x === null ? 'null' : x)).join(', ') + ']',
      }),
    );
  },
  random: (g) => {
    const ops: [string, ...number[]][] = [];
    let size = 0;
    for (let k = rint(g, 1, 14); k > 0; k--) {
      if (!size || g() < 0.5) {
        ops.push(['push', rint(g, 0, 9)]);
        size++;
      } else if (g() < 0.5) {
        ops.push(['pop']);
        size--;
      } else ops.push(['peek']);
    }
    return { ops };
  },
});
