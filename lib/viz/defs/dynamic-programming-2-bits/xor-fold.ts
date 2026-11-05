// Ported from legacy/src/viz/w11.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rarr, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  nums: number[];
  mode: string;
}

interface Step extends VizStep {
  acc: number;
  i: number | null;
  v: number | null;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('xor-fold', {
  title: 'XOR folding: every pair cancels',
  inputs: [
    { key: 'nums', label: 'nums', type: 'numbers', def: [4, 1, 2, 1, 2] },
    {
      key: 'mode',
      label: 'problem',
      type: 'select',
      def: 'single',
      options: [
        { value: 'single', label: '136: single number' },
        { value: 'missing', label: '268: missing number (XOR indices too)' },
      ],
    },
  ],
  presets: [
    { label: '136: [4,1,2,1,2]', input: { nums: [4, 1, 2, 1, 2], mode: 'single' } },
    { label: '268: [3,0,1]', input: { nums: [3, 0, 1], mode: 'missing' } },
    { label: '268: [9,6,4,2,3,5,7,0,1]', input: { nums: [9, 6, 4, 2, 3, 5, 7, 0, 1], mode: 'missing' } },
  ],
  legend: [['current', 'folded now']],
  code: `
// 136: let acc = 0; for (const x of nums) acc ^= x;
// 268: let acc = nums.length; nums.forEach((x, i) => { acc ^= i ^ x; });
acc ^= value;            // x ^ x = 0, x ^ 0 = x, order does not matter   //@fold
return acc;                                                             //@ret`,
  validate: ({ nums, mode }) => {
    if (nums.length < 1 || nums.length > 12 || nums.some((x) => x < 0 || x > 255))
      return 'Use 1–12 numbers between 0 and 255.';
    if (mode === 'single') {
      const c: Record<string, number> = {};
      nums.forEach((x) => (c[x] = (c[x] || 0) + 1));
      const odd = Object.values(c).filter((v) => v % 2).length;
      return odd === 1 && Object.values(c).every((v) => v <= 2)
        ? null
        : 'For 136, every value appears twice except one.';
    }
    const s = new Set(nums);
    return s.size === nums.length && nums.every((x) => x <= nums.length)
      ? null
      : 'For 268, use distinct values from 0..n with one missing.';
  },
  run({ nums, mode }) {
    const steps: Step[] = [];
    let acc = mode === 'missing' ? nums.length : 0;
    steps.push({
      acc,
      i: null,
      v: null,
      line: null,
      note:
        mode === 'missing'
          ? `Start with acc = n = ${nums.length}: the one index the loop below never visits.`
          : 'acc = 0.',
    });
    nums.forEach((x, i) => {
      const v = mode === 'missing' ? i ^ x : x;
      acc ^= v;
      steps.push({
        acc,
        i,
        v,
        line: 'fold',
        note: mode === 'missing' ? `acc ^= ${i} ^ ${x} → ${acc}.` : `acc ^= ${x} → ${acc}.`,
        why:
          i === nums.length - 1
            ? mode === 'missing'
              ? 'Every number 0..n that is present appears twice (once as an index, once as a value) and cancels; the missing one appears once.'
              : 'Values that appear twice cancel; the single one survives.'
            : null,
      });
    });
    steps.push({
      acc,
      i: null,
      v: null,
      done: true,
      line: 'ret',
      result: acc,
      note: `Answer: ${acc}.`,
      why: 'O(n) time, O(1) space, against O(n) space for a hash set.',
    });
    return steps;
  },
  view(st, stage, { nums }) {
    stage.append(R.cells(nums, { states: st.i != null ? { [st.i]: 'current' } : {}, label: 'nums' }));
    stage.append(R.bits(st.acc, { width: 8, label: 'acc (low 8 bits)', signed: false }));
  },
  random: (g) => {
    if (g() < 0.5) {
      const k = rint(g, 0, 5);
      const vals = [...new Set(rarr(g, k + 1, 0, 50))];
      const single = vals.pop()!;
      const arr = [...vals, ...vals, single];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = rint(g, 0, i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return { nums: arr, mode: 'single' };
    }
    const n = rint(g, 1, 11),
      miss = rint(g, 0, n);
    const arr = Array.from({ length: n + 1 }, (_, i) => i).filter((x) => x !== miss);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rint(g, 0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return { nums: arr, mode: 'missing' };
  },
});
