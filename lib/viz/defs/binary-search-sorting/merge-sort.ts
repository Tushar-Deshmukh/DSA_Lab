// Ported from legacy/src/viz/w03.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  nums: number[];
}

interface Step extends VizStep {
  nodes: { id: number; parent: number | null; label: string; state: string }[];
  cmp: number;
  merge?: { L: number[]; R: number[]; i: number; j: number; out: number[]; took?: string };
  done?: boolean;
  result?: number[];
}

// ---------- sorting ----------
export default defineViz<Input, Step>('merge-sort', {
  title: 'Merge sort: split to single elements, then merge back up',
  inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [5, 2, 4, 7, 1, 3, 2, 6], wide: true }],
  presets: [
    { label: '8 elements', input: { nums: [5, 2, 4, 7, 1, 3, 2, 6] } },
    { label: 'Odd length', input: { nums: [3, 1, 2, 5, 4] } },
    { label: 'Already sorted', input: { nums: [1, 2, 3, 4] } },
  ],
  legend: [
    ['current', 'call running now'],
    ['frontier', 'waiting for its halves'],
    ['done', 'sorted and returned'],
  ],
  code: `
function mergeSort(a) {
  if (a.length <= 1) return a;                                   //@base
  const mid = a.length >> 1;                                     //@mid
  const left = mergeSort(a.slice(0, mid)), right = mergeSort(a.slice(mid));  //@rec
  const out = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length)
    out.push(left[i] <= right[j] ? left[i++] : right[j++]);      //@merge
  while (i < left.length) out.push(left[i++]);                   //@restl
  while (j < right.length) out.push(right[j++]);                 //@restr
  return out;                                                    //@ret
}`,
  validate: ({ nums }) => sizeCheck(nums, 1, 9),
  run({ nums }) {
    const steps: Step[] = [],
      nodes: { id: number; parent: number | null }[] = [],
      state: Record<string, string> = {},
      label: Record<string, string> = {};
    let id = 0,
      cmp = 0;
    const snap = <O extends object>(o: O) => ({
      nodes: nodes.map((n) => ({ ...n, label: label[n.id], state: state[n.id] })),
      cmp,
      ...o,
    });
    function sort(a: number[], parent: number | null, depth: number) {
      const me = id++;
      nodes.push({ id: me, parent });
      label[me] = '[' + a.join(',') + ']';
      state[me] = 'current';
      if (a.length <= 1) {
        state[me] = 'done';
        steps.push(snap({ line: 'base', note: `${label[me]}: one element (or none) is already sorted.` }));
        return a;
      }
      const mid = a.length >> 1;
      steps.push(
        snap({
          line: ['mid', 'rec'],
          note: `Split ${label[me]} into [${a.slice(0, mid).join(',')}] and [${a.slice(mid).join(',')}].`,
          why: me === 0 ? 'Splitting halves the length, so there are about log₂ n levels of calls.' : null,
        }),
      );
      state[me] = 'frontier';
      const L = sort(a.slice(0, mid), me, depth + 1);
      state[me] = 'frontier';
      const Rt = sort(a.slice(mid), me, depth + 1);
      state[me] = 'current';
      const out: number[] = [];
      let i = 0,
        j = 0;
      while (i < L.length && j < Rt.length) {
        cmp++;
        const takeL = L[i] <= Rt[j];
        out.push(takeL ? L[i++] : Rt[j++]);
        steps.push(
          snap({
            line: 'merge',
            merge: { L, R: Rt, i, j, out: [...out], took: takeL ? 'L' : 'R' },
            note: `Merge: ${takeL ? L[i - 1] + ' ≤ ' + Rt[j] : L[i] + ' > ' + Rt[j - 1]} → take ${out.at(-1)} from the ${takeL ? 'left' : 'right'}.`,
            why:
              takeL && L[i - 1] === Rt[j]
                ? 'On a tie, take from the left: that keeps equal elements in their original order (stability).'
                : null,
          }),
        );
      }
      while (i < L.length) out.push(L[i++]);
      while (j < Rt.length) out.push(Rt[j++]);
      label[me] = '[' + out.join(',') + ']';
      state[me] = 'done';
      steps.push(
        snap({
          line: ['restl', 'restr', 'ret'],
          merge: { L, R: Rt, i, j, out: [...out] },
          note: `Copy what is left; return ${label[me]}.`,
          why:
            depth === 0
              ? `Each level of the tree merges n elements in total, and there are ⌈log₂ n⌉ levels: O(n log n) time. Merging needs O(n) extra space.`
              : null,
        }),
      );
      return out;
    }
    const res = sort(nums, null, 0);
    steps.push(
      snap({
        line: null,
        done: true,
        result: res,
        note: `Sorted: [${res.join(', ')}] with ${cmp} comparisons.`,
      }),
    );
    return steps;
  },
  view(st, stage) {
    stage.append(
      R.tree(
        st.nodes.map((n) => ({ ...n })),
        {
          dx: 74,
          dy: 52,
          label: "recursion tree (labels show each call's array; merged calls show the sorted result)",
        },
      ),
    );
    if (st.merge) {
      const m = st.merge;
      stage.append(
        R.row(
          { align: 'start' },
          R.cells(m.L, {
            ptrs: m.i < m.L.length ? { [m.i]: 'i' } : {},
            states: Object.fromEntries(m.L.map((_, k) => [k, k < m.i ? 'dim' : null]).filter(([, v]) => v)),
            label: 'left',
          }),
          R.cells(m.R, {
            ptrs: m.j < m.R.length ? { [m.j]: 'j' } : {},
            states: Object.fromEntries(m.R.map((_, k) => [k, k < m.j ? 'dim' : null]).filter(([, v]) => v)),
            label: 'right',
          }),
          R.cells(m.out, { states: m.out.length ? { [m.out.length - 1]: 'current' } : {}, label: 'out' }),
        ),
      );
    }
    stage.append(R.vars({ comparisons: st.cmp }));
  },
  random: (g) => ({ nums: rarr(g, rint(g, 1, 9), -5, 9) }),
});
