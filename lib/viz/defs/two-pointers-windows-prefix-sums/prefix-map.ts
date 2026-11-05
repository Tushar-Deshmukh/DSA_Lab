// Ported from legacy/src/viz/w02.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  nums: number[];
  k: number;
}

interface Step extends VizStep {
  map: number[][];
  prefixes: number[];
  cur: number;
  count: number;
  found: number[][];
  i?: number;
  need?: number;
  hits?: number[];
  recorded?: number;
  result?: number;
  done?: boolean;
}

export default defineViz<Input, Step>('prefix-map', {
  title: 'Prefix sums + hash map: count subarrays with sum k',
  inputs: [
    { key: 'nums', label: 'nums', type: 'numbers', def: [1, -1, 1], wide: true },
    { key: 'k', label: 'k', type: 'number', def: 1 },
  ],
  presets: [
    { label: 'Handbook trace', input: { nums: [1, -1, 1], k: 1 } },
    { label: 'LeetCode example', input: { nums: [1, 2, 3], k: 3 } },
    { label: 'Zeros', input: { nums: [0, 0, 0], k: 0 } },
    { label: 'Negatives', input: { nums: [3, 4, 7, 2, -3, 1, 4, 2], k: 7 } },
  ],
  legend: [
    ['current', 'element / prefix just added'],
    ['done', 'subarrays ending here'],
    ['compare', 'matching earlier prefix'],
  ],
  code: `
function subarraySum(nums, k) {
  const countOfPrefix = new Map([[0, 1]]); // empty prefix //@init
  let cur = 0, count = 0;                                          //@init2
  for (const x of nums) {                                          //@loop
    cur += x;                        // sum of nums[0..i]  //@add
    count += countOfPrefix.get(cur - k) ?? 0;                      //@count
    countOfPrefix.set(cur, (countOfPrefix.get(cur) ?? 0) + 1);     //@record
  }
  return count;                                                    //@ret
}`,
  validate: ({ nums }) => sizeCheck(nums, 1, 12),
  run({ nums: a, k }) {
    const steps: Step[] = [],
      map = new Map([[0, 1]]),
      prefixes = [0];
    let cur = 0,
      count = 0;
    const found: number[][] = [];
    steps.push({
      line: ['init', 'init2'],
      map: [...map],
      prefixes: [...prefixes],
      cur,
      count,
      found: [],
      note: 'Seed the map with prefix 0 seen once (the empty prefix).',
      why: 'It stands for "start the subarray at index 0". Without it, a subarray beginning at 0 would never be counted.',
    });
    a.forEach((x, i) => {
      cur += x;
      const need = cur - k;
      const hits: number[] = [];
      prefixes.forEach((p, j) => {
        if (p === need) hits.push(j);
      });
      const add = map.get(need) ?? 0;
      count += add;
      hits.forEach((j) => found.push([j, i]));
      steps.push({
        line: ['add', 'count'],
        i,
        map: [...map],
        prefixes: [...prefixes],
        cur,
        need,
        hits,
        count,
        found: [...found],
        note: `i = ${i}: cur = ${cur}. Need an earlier prefix equal to cur − k = ${need}: seen ${add}×, so count += ${add} → ${count}.`,
        why: add
          ? 'Each earlier prefix p with cur − p = k marks a start: ' +
            hits.map((j) => '[' + j + '..' + i + ']').join(', ') +
            '.'
          : 'No earlier prefix fits, so no subarray ending here sums to k.',
      });
      map.set(cur, (map.get(cur) ?? 0) + 1);
      prefixes.push(cur);
      steps.push({
        line: 'record',
        i,
        map: [...map],
        prefixes: [...prefixes],
        cur,
        count,
        found: [...found],
        recorded: cur,
        note: `Record prefix ${cur} (now seen ${map.get(cur)}×).`,
        why: 'Count first, then record: recording first would let a prefix match itself, counting an empty subarray when k = 0.',
      });
    });
    steps.push({
      result: count,
      line: 'ret',
      map: [...map],
      prefixes,
      cur,
      count,
      found,
      done: true,
      note: `Answer: ${count} subarray${count === 1 ? '' : 's'}${found.length ? ': ' + found.map(([s, e]) => '[' + a.slice(s, e + 1).join(',') + ']').join(', ') : ''}.`,
      why: 'One pass with O(1) map operations: O(n) time, O(n) space. A sliding window cannot do this: with negative numbers, growing the window can shrink the sum.',
    });
    return steps;
  },
  view(st, stage, { nums: a, k }) {
    const states: Record<string, string> = {};
    if (st.i != null && !st.done) states[st.i] = 'current';
    const ending = st.hits && st.hits.length ? st.hits : [];
    stage.append(
      R.cells(a, { states, label: 'nums', ptrs: st.i != null && !st.done ? { [st.i]: 'i' } : {} }),
    );
    const pst: Record<string, string> = {};
    ending.forEach((j) => (pst[j] = 'compare'));
    if (st.recorded != null) pst[st.prefixes.length - 1] = 'current';
    stage.append(
      R.cells(st.prefixes, { states: pst, label: 'prefix sums seen (pre[0] = 0, then after each element)' }),
    );
    const mst: Record<string, string> = {};
    if (st.need != null && st.map.some(([kk]) => kk === st.need)) mst[st.need] = 'compare';
    if (st.recorded != null) mst[st.recorded] = 'current';
    stage.append(R.kv(st.map, { label: 'countOfPrefix (prefix → times seen)', states: mst }));
    stage.append(R.vars({ k, cur: st.cur, 'cur − k': st.need ?? '·', count: st.count }));
    if (st.found.length)
      stage.append(
        R.caption('Subarrays found: ' + st.found.map(([s, e]) => '[' + s + '..' + e + ']').join(' ')),
      );
  },
  random: (g) => ({ nums: rarr(g, rint(g, 1, 12), -3, 3), k: rint(g, -3, 4) }),
});
