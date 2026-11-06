// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  nums: number[];
  target: number;
}

interface Step extends VizStep {
  map: number[][];
  i?: number;
  need?: number;
  stored?: number;
  hit?: number;
  found?: number[];
  result?: number[];
}

// ---------- Two Sum with a hash map ----------
export default defineViz<Input, Step>('hash-twosum', {
  title: 'Two Sum: check for the complement, then store',
  inputs: [
    { key: 'nums', label: 'nums', type: 'numbers', def: [3, 2, 4], wide: true },
    { key: 'target', label: 'target', type: 'number', def: 6 },
  ],
  presets: [
    { label: 'Handbook dry run', input: { nums: [3, 2, 4], target: 6 } },
    { label: 'LeetCode example', input: { nums: [2, 7, 11, 15], target: 9 } },
    { label: 'Same value twice', input: { nums: [3, 3], target: 6 } },
    { label: 'Negatives', input: { nums: [-1, -2, -3, -4, -5], target: -8 } },
  ],
  legend: [
    ['current', 'index i'],
    ['done', 'answer pair'],
    ['compare', 'already stored'],
  ],
  code: `
function twoSum(nums, target) {
  const indexOf = new Map();       // value -> index    //@init
  for (let i = 0; i < nums.length; i++) {             //@loop
    const need = target - nums[i];                    //@need
    if (indexOf.has(need)) return [indexOf.get(need), i];  //@check
    indexOf.set(nums[i], i);      // store AFTER check //@store
  }
  return [];                                          //@none
}`,
  validate: ({ nums }) => sizeCheck(nums, 1, 14),
  run({ nums: a, target }) {
    const steps: Step[] = [],
      map: Map<number, number> = new Map();
    steps.push({ line: 'init', map: [], note: 'Empty map: no values seen yet.' });
    for (let i = 0; i < a.length; i++) {
      const need = target - a[i];
      if (map.has(need)) {
        steps.push({
          line: ['need', 'check'],
          i,
          need,
          map: [...map],
          hit: need,
          found: [map.get(need)!, i],
          result: [map.get(need)!, i],
          note: `i = ${i}: need ${target} − ${a[i]} = ${need}. It is in the map at index ${map.get(need)}: return [${map.get(need)}, ${i}].`,
          why: 'Every earlier element was stored, so each pair (j, i) with j < i is checked exactly when i is visited: one pass, O(n) average.',
        });
        return steps;
      }
      steps.push({
        line: ['need', 'check'],
        i,
        need,
        map: [...map],
        note: `i = ${i}: need ${target} − ${a[i]} = ${need}. Not in the map.`,
        why:
          i === 0
            ? 'This lookup is O(1) on average. It replaces the brute force inner loop over all earlier elements.'
            : null,
      });
      map.set(a[i], i);
      steps.push({
        line: 'store',
        i,
        map: [...map],
        stored: a[i],
        note: `Store ${a[i]} → ${i}.`,
        why:
          i === 0
            ? 'Storing after the check means an element can never pair with itself (try nums = [3], target = 6).'
            : null,
      });
    }
    steps.push({ line: 'none', map: [...map], result: [], note: 'No pair found: return [].' });
    return steps;
  },
  view(st, stage, { nums: a, target }) {
    const states: Record<string, string> = {};
    if (st.i != null) states[st.i] = 'current';
    if (st.found) {
      states[st.found[0]] = 'done';
      states[st.found[1]] = 'done';
    }
    stage.append(R.cells(a, { states, ptrs: st.i != null ? { [st.i]: 'i' } : {}, label: 'nums' }));
    const ms: Record<string, string> = {};
    if (st.hit != null) ms[st.hit] = 'done';
    if (st.stored != null) ms[st.stored] = 'current';
    stage.append(R.kv(st.map, { label: 'indexOf (value → index)', states: ms }));
    stage.append(R.vars({ target, need: st.need ?? '·' }));
  },
  random: (g) => ({ nums: rarr(g, rint(g, 1, 14), -6, 9), target: rint(g, -8, 14) }),
});
