// Helpers shared by this module's visualizers, from legacy/src/viz/w03.js.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import type { VizStep } from '@/lib/viz/types';

interface BoundDefInput {
  nums: number[];
  target: number;
}

interface BoundDefStep extends VizStep {
  lo: number;
  hi: number;
  tested: Record<string, boolean>;
  mid?: number;
  done?: boolean;
  result?: number;
}

export const sizeCheck = (a: number[], lo: number, hi: number) =>
  a.length < lo
    ? 'Use at least ' + lo + ' element' + (lo > 1 ? 's.' : '.')
    : a.length > hi
      ? 'Keep it to ' + hi + ' elements so it fits on screen.'
      : null;

export const isSorted = (a: number[]) => a.every((x: number, i: number) => i === 0 || a[i - 1] <= x);

export const ptrsOf = (pairs: [number | null | undefined, string][]) => {
  const p: Record<string, string | string[]> = {};
  for (const [i, lab] of pairs) {
    if (i == null) continue;
    p[i] = p[i] ? ([] as string[]).concat(p[i], lab) : lab;
  }
  return p;
};

export // ---------- boundary search: lower / upper bound (half-open) ----------
function boundDef(
  id: string,
  title: string,
  op: string,
  predText: string,
  opFn: (x: number, t: number) => boolean,
) {
  return defineViz<BoundDefInput, BoundDefStep>(id, {
    title,
    inputs: [
      { key: 'nums', label: 'nums (sorted)', type: 'numbers', def: [1, 2, 2, 2, 5], wide: true },
      { key: 'target', label: 'target', type: 'number', def: 2 },
    ],
    presets: [
      { label: 'Handbook dry run', input: { nums: [1, 2, 2, 2, 5], target: 2 } },
      { label: 'Target absent', input: { nums: [1, 3, 5, 7], target: 4 } },
      { label: 'Past the end', input: { nums: [1, 3, 5], target: 9 } },
      { label: 'Empty array', input: { nums: [], target: 3 } },
      { label: 'All equal', input: { nums: [4, 4, 4, 4], target: 4 } },
    ],
    legend: [
      ['window', 'search range [lo, hi)'],
      ['current', 'mid'],
      ['done', 'predicate true'],
      ['dim', 'discarded'],
    ],
    code: `
function ${id === 'bs-lower' ? 'lowerBound' : 'upperBound'}(nums, target) {
  let lo = 0, hi = nums.length;              // answer in [lo, hi]  //@init
  while (lo < hi) {                                                 //@loop
    const mid = lo + ((hi - lo) >> 1);                              //@mid
    if (nums[mid] ${op} target) hi = mid;      // mid may be it     //@true
    else lo = mid + 1;                       // answer is right     //@false
  }
  return lo;                                 // first true index    //@ret
}`,
    validate: ({ nums }) =>
      sizeCheck(nums, 0, 14) || (isSorted(nums) ? null : 'Binary search needs sorted input.'),
    run({ nums: a, target }) {
      const steps: BoundDefStep[] = [];
      let lo = 0,
        hi = a.length;
      const tested: Record<string, boolean> = {};
      const snap = <O extends object>(o: O) => Object.assign({ lo, hi, tested: { ...tested } }, o);
      steps.push(
        snap({
          line: 'init',
          note: `Predicate: nums[i] ${op} ${target}. Over the array it reads ${a.map((x) => (opFn(x, target) ? 'T' : 'F')).join(' ') || '(nothing)'}${a.length ? '' : ''}. We want the first T, or ${a.length} if there is none.`,
          why: 'hi starts at nums.length, not length − 1, because "no element qualifies" is a valid answer: the insertion point at the end.',
        }),
      );
      while (lo < hi) {
        const mid = lo + ((hi - lo) >> 1);
        const t = opFn(a[mid], target);
        tested[mid] = t;
        if (t) {
          steps.push(
            snap({
              line: ['mid', 'true'],
              mid,
              note: `mid = ${mid}: nums[${mid}] = ${a[mid]} ${op} ${target} is true → hi = ${mid}.`,
              why: 'mid itself might be the first true index, so keep it in the range: hi = mid, not mid − 1.',
            }),
          );
          hi = mid;
        } else {
          steps.push(
            snap({
              line: ['mid', 'false'],
              mid,
              note: `mid = ${mid}: nums[${mid}] = ${a[mid]} ${op} ${target} is false → lo = ${mid + 1}.`,
              why: 'Everything up to mid is false (the predicate is monotone), so the first true index is strictly to the right.',
            }),
          );
          lo = mid + 1;
        }
      }
      steps.push(
        snap({
          line: 'ret',
          done: true,
          result: lo,
          note: `lo = hi = ${lo}: return ${lo}${lo === a.length ? ' (no element qualifies)' : ' (nums[' + lo + '] = ' + a[lo] + ')'}.`,
          why: `Each iteration at least halves hi − lo, so about log₂(${a.length + 1}) ≈ ${Math.ceil(Math.log2(a.length + 1))} iterations: O(log n). The range always shrinks, so there is no infinite loop.`,
        }),
      );
      return steps;
    },
    view(st, stage, { nums: a, target }) {
      const vals = [...a, '∅'];
      const states: Record<string, string> = {};
      vals.forEach((_, i) => {
        if (i < st.lo || i >= st.hi) states[i] = 'dim';
      });
      if (st.mid != null) states[st.mid] = 'current';
      if (st.done) states[st.lo] = 'done';
      const ptrs = ptrsOf([
        [st.lo, 'lo'],
        [st.hi, 'hi'],
        [st.done ? null : st.mid, 'mid'],
      ]);
      stage.append(
        R.cells(vals, {
          states,
          ptrs,
          window: st.done ? null : [st.lo, st.hi - 1],
          label: 'nums (∅ at index n stands for "none")',
        }),
      );
      const pred = a.map((x, i) => (i in st.tested ? (st.tested[i] ? 'T' : 'F') : '?'));
      const ps: Record<string, string> = {};
      pred.forEach((p, i) => {
        if (p === 'T') ps[i] = 'done';
        else if (p === 'F') ps[i] = 'dim';
      });
      stage.append(
        R.cells(pred, { states: ps, label: `predicate nums[i] ${op} ${target} (? = never evaluated)` }),
      );
      stage.append(R.vars({ lo: st.lo, hi: st.hi, mid: st.mid ?? '·' }));
    },
  });
}

export // ---------- rotated arrays ----------
const rotatedCheck = (a: number[]) => {
  let drops = 0;
  for (let i = 1; i < a.length; i++) if (a[i] < a[i - 1]) drops++;
  if (new Set(a).size !== a.length) return 'Use distinct values (LeetCode 153 and 33 guarantee it).';
  return drops <= 1 && (drops === 0 || a[a.length - 1] < a[0]) ? null : 'This is not a rotated sorted array.';
};
