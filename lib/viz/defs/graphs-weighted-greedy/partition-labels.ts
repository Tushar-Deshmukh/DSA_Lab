// Ported from legacy/src/viz/w09.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  s: string;
}

interface Step extends VizStep {
  i: number | null;
  start: number;
  end: number;
  res: number[];
  cuts?: number[][];
  done?: boolean;
  result?: number[];
}

export default defineViz<Input, Step>('partition-labels', {
  title: 'Partition Labels: extend each part to the last occurrence of its letters',
  inputs: [{ key: 's', label: 's', type: 'string', def: 'ababcbacadefegdehijhklij', wide: true }],
  presets: [
    { label: 'LeetCode example 1', input: { s: 'ababcbacadefegdehijhklij' } },
    { label: 'LeetCode example 2', input: { s: 'eccbbbbdec' } },
    { label: 'All distinct', input: { s: 'abc' } },
  ],
  legend: [
    ['window', 'current part'],
    ['current', 'i'],
    ['done', 'finished parts'],
  ],
  code: `
function partitionLabels(s) {
  const last = {};
  for (let i = 0; i < s.length; i++) last[s[i]] = i;              //@last
  const res = []; let start = 0, end = 0;
  for (let i = 0; i < s.length; i++) {
    end = Math.max(end, last[s[i]]);       // part must cover this letter  //@extend
    if (i === end) { res.push(end - start + 1); start = i + 1; }    //@cut
  }
  return res;
}`,
  validate: ({ s }) => (!/^[a-z]+$/.test(s) || s.length > 24 ? 'Use 1–24 lower-case letters.' : null),
  run({ s }) {
    const last: Record<string, number> = {};
    for (let i = 0; i < s.length; i++) last[s[i]] = i;
    const steps: Step[] = [
      {
        i: null,
        start: 0,
        end: 0,
        res: [],
        line: 'last',
        note: 'First pass: the last index of every letter.',
      },
    ];
    const res: number[] = [];
    let start = 0,
      end = 0;
    const cuts: number[][] = [];
    for (let i = 0; i < s.length; i++) {
      end = Math.max(end, last[s[i]]);
      if (i === end) {
        res.push(end - start + 1);
        cuts.push([start, end]);
        steps.push({
          i,
          start,
          end,
          res: [...res],
          cuts: cuts.map((c) => [...c]),
          line: ['extend', 'cut'],
          note: `i = ${i} reaches the part's end: every letter in [${start}, ${end}] has no copies later. Cut: size ${end - start + 1}.`,
          why:
            res.length === 1
              ? 'Cutting as soon as possible is safe: any later cut would just merge this part with the next one, giving fewer parts.'
              : null,
        });
        start = i + 1;
      } else
        steps.push({
          i,
          start,
          end,
          res: [...res],
          cuts: cuts.map((c) => [...c]),
          line: 'extend',
          note: `"${s[i]}" last appears at ${last[s[i]]}: the part must reach at least ${end}.`,
        });
    }
    steps.push({
      i: null,
      start,
      end,
      res,
      cuts,
      done: true,
      line: null,
      result: res,
      note: `Part sizes: [${res.join(', ')}].`,
    });
    return steps;
  },
  view(st, stage, { s }) {
    const states: Record<string, string> = {};
    (st.cuts || []).forEach(([a, b]) => {
      for (let k = a; k <= b; k++) states[k] = 'done';
    });
    if (st.i != null) {
      for (let k = st.start; k <= st.i; k++) if (!states[k]) states[k] = 'window';
      states[st.i] = 'current';
    }
    stage.append(R.cells([...s], { states, ptrs: st.i != null ? { [st.end]: 'end' } : {}, label: 's' }));
    stage.append(R.vars({ parts: '[' + st.res.join(', ') + ']' }));
  },
  random: (g) => ({ s: rstr(g, rint(g, 1, 18), 'abcdef') }),
});
