// Helpers shared by this module's visualizers, from legacy/src/viz/w02.js.
import { R } from '@/lib/viz/nodes';
import type { VizStep } from '@/lib/viz/types';

export const sizeCheck = (a: number[], lo: number, hi: number, what = 'array') =>
  a.length < lo
    ? 'Use at least ' + lo + ' elements.'
    : a.length > hi
      ? 'Keep the ' + what + ' to ' + hi + ' elements or fewer so it fits on screen.'
      : null;

export const show = (s: string) => (s === ' ' ? '␣' : s);

export // ---------- pair grid shared by brute force and two pointers ----------
function pairGrid(
  a: number[],
  st: {
    result?: number[];
    line?: VizStep['line'];
    i?: number;
    j?: number;
    cur?: number[];
    checked?: Set<string>;
    found?: number[] | null;
    count?: number;
    sum?: number;
    note?: string;
    why?: string | null;
    l?: number;
    r?: number;
    elim?: Set<string>;
    checks?: number;
  },
) {
  const n = a.length;
  const m = a.map((x: number, i: number) => a.map((y: number, j: number) => (j > i ? x + y : '')));
  const states: Record<string, string> = {};
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      if (j <= i) states[i + ',' + j] = 'out';
      else if (st.found && st.found[0] === i && st.found[1] === j) states[i + ',' + j] = 'done';
      else if (st.cur && st.cur[0] === i && st.cur[1] === j) states[i + ',' + j] = 'current';
      else if (st.elim && st.elim.has(i + ',' + j)) states[i + ',' + j] = 'dim';
      else if (st.checked && st.checked.has(i + ',' + j)) states[i + ',' + j] = 'compare';
    }
  return R.grid(m, {
    states,
    small: true,
    label: 'Every pair (i, j) with i < j · cell = numbers[i] + numbers[j]',
  });
}

export const totalPairs = (n: number) => (n * (n - 1)) / 2;
