// Ported from legacy/src/viz/w04.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  ops: [string, ...number[]][];
}

interface Step extends VizStep {
  s: number[][];
  out: (number | null)[];
  done?: boolean;
  result?: (number | null)[];
}

export default defineViz<Input, Step>('min-stack', {
  title: 'Min Stack: store the minimum alongside each value',
  inputs: [
    {
      key: 'ops',
      label: 'operations',
      type: 'json',
      def: [['push', -2], ['push', 0], ['push', -3], ['getMin'], ['pop'], ['top'], ['getMin']],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'LeetCode example',
      input: { ops: [['push', -2], ['push', 0], ['push', -3], ['getMin'], ['pop'], ['top'], ['getMin']] },
    },
    { label: 'Equal minimums', input: { ops: [['push', 1], ['push', 1], ['pop'], ['getMin']] } },
  ],
  legend: [
    ['current', 'top'],
    ['done', 'pair holding the current minimum'],
  ],
  code: `
class MinStack {
  constructor() { this.s = []; }                           // [val, minSoFar]
  push(val) {
    const min = this.s.length ? Math.min(val, this.s.at(-1)[1]) : val;
    this.s.push([val, min]);                               //@push
  }
  pop() { this.s.pop(); }                                  //@pop
  top() { return this.s.at(-1)[0]; }                       //@top
  getMin() { return this.s.at(-1)[1]; }                    //@min
}`,
  validate: ({ ops }) => (!Array.isArray(ops) || ops.length > 14 ? 'At most 14 operations.' : null),
  run({ ops }) {
    const s: number[][] = [],
      steps: Step[] = [],
      out: (number | null)[] = [];
    for (const op of ops) {
      if (op[0] === 'push') {
        const m = s.length ? Math.min(op[1], s.at(-1)![1]) : op[1];
        s.push([op[1], m]);
        out.push(null);
        steps.push({
          s: s.map((x) => [...x]),
          line: 'push',
          out: [...out],
          note: `push(${op[1]}): the minimum of everything up to here is ${m}; store [${op[1]}, ${m}].`,
          why:
            s.length === 1
              ? 'Each pair remembers the minimum of the stack *as it was when the pair was on top*, so popping restores the previous minimum automatically.'
              : null,
        });
      } else if (op[0] === 'pop') {
        if (!s.length) {
          steps.push({
            s: [],
            line: 'pop',
            out: [...out],
            note: 'pop on an empty stack: LeetCode never does this.',
          });
          continue;
        }
        const x = s.pop();
        out.push(null);
        steps.push({
          s: s.map((y) => [...y]),
          line: 'pop',
          out: [...out],
          note: `pop(): remove [${x!.join(', ')}]. The minimum is now ${s.length ? s.at(-1)![1] : '(empty)'}.`,
        });
      } else if (op[0] === 'top') {
        out.push(s.at(-1)![0]);
        steps.push({ s: s.map((y) => [...y]), line: 'top', out: [...out], note: `top() = ${s.at(-1)![0]}.` });
      } else {
        out.push(s.at(-1)![1]);
        steps.push({
          s: s.map((y) => [...y]),
          line: 'min',
          out: [...out],
          note: `getMin() = ${s.at(-1)![1]}, read from the top pair in O(1).`,
        });
      }
    }
    steps.push({
      s: s.map((y) => [...y]),
      out,
      done: true,
      line: null,
      result: out,
      note: `Outputs: [${out.map((x) => (x === null ? 'null' : x)).join(', ')}].`,
      why: 'Every operation is O(1); the extra space is one number per element.',
    });
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {};
    if (st.s.length) states[st.s.length - 1] = 'current';
    stage.append(
      R.stack(
        st.s.map((p) => p[0] + '  (min ' + p[1] + ')'),
        { states, label: 'stack of [val, minSoFar], top at the top' },
      ),
    );
    stage.append(R.vars({ outputs: '[' + st.out.map((x) => (x === null ? 'null' : x)).join(', ') + ']' }));
  },
  random: (g) => {
    const ops: [string, ...number[]][] = [];
    let size = 0;
    for (let k = rint(g, 1, 14); k > 0; k--) {
      if (!size || g() < 0.5) {
        ops.push(['push', rint(g, -5, 5)]);
        size++;
      } else {
        const r = g();
        if (r < 0.34) {
          ops.push(['pop']);
          size--;
        } else ops.push([r < 0.67 ? 'top' : 'getMin']);
      }
    }
    return { ops };
  },
});
