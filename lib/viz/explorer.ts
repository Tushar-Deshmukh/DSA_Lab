// The complexity explorer (plan 7.4): a visualizer runs on inputs of growing size n, and its step counts are set
// against the common growth classes. Sizes grow only while validate() accepts the input and the run stays within the
// 600-step limit, so the explorer measures exactly what the visualizer itself allows. It counts steps, and says so.
import { edgeCaseField } from './edge-cases';
import { runViz } from './engine';
import type { AnyViz, Rng } from './types';

export type GrowthClass = 'log n' | 'n' | 'n log n' | 'n²' | '2ⁿ';

/**
 * Where the explorer is meaningful: visualizers whose steps follow the algorithm's cost on random inputs, with the
 * growth the course teaches for each. Elsewhere a step narrates more than one operation (the O(n²) LIS table shows
 * one step per element), or a search ends early on most random inputs, and a measured curve would mislead.
 * tests/viz/explorer.test.ts checks that the measured counts come out closest to these.
 */
export const EXPLORERS: Record<string, GrowthClass> = {
  'loop-halving': 'log n',
  'loop-nlogn': 'n log n',
  'loop-triangle': 'n²',
  'tree-double': '2ⁿ',
  'amortized-push': 'n',
  'boyer-moore': 'n',
  kadane: 'n',
  trap: 'n',
  'win-longest': 'n',
  'bs-lower': 'log n',
  'bs-upper': 'log n',
  'mono-stack': 'n',
  'rec-pow': 'log n',
  'bt-subsets-b': '2ⁿ',
  'partition-labels': 'n',
  'count-bits-dp': 'n',
};

export const GROWTH: Record<GrowthClass, (n: number) => number> = {
  'log n': (n) => Math.log2(Math.max(1, n)),
  n: (n) => n,
  'n log n': (n) => n * Math.log2(Math.max(1, n)),
  'n²': (n) => n * n,
  '2ⁿ': (n) => 2 ** n,
};

export interface ExplorerPoint {
  n: number;
  steps: number;
}

export interface Fit {
  growth: GrowthClass;
  /** steps ≈ a + c·f(n) */
  a: number;
  c: number;
  /** Sum of squared errors, relative to the spread of the step counts. */
  error: number;
}

export interface Exploration {
  field: string;
  points: ExplorerPoint[];
  fits: Fit[];
  best: GrowthClass;
}

const SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64];

/** The field whose size grows: the first list or text field, or else a whole-number field called n. */
export function explorerField(
  viz: AnyViz,
  base: Record<string, unknown>,
): { key: string; kind: 'list' | 'text' | 'n' } | null {
  const key = edgeCaseField(viz, base);
  if (key) return { key, kind: typeof base[key] === 'string' ? 'text' : 'list' };
  const n = (viz.inputs ?? []).find((f) => f.key === 'n' && f.type === 'int');
  return n ? { key: 'n', kind: 'n' } : null;
}

const pick = <T>(xs: readonly T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)] as T;

/**
 * An input of size n shaped like the default: values drawn from the default's own, strictly increasing if the default
 * was, sorted if it was sorted.
 */
export function inputOfSize(
  base: Record<string, unknown>,
  field: { key: string; kind: 'list' | 'text' | 'n' },
  n: number,
  rng: Rng,
): Record<string, unknown> {
  const value = base[field.key];
  if (field.kind === 'n') return { ...base, n };
  if (field.kind === 'text') {
    const letters = [...new Set(String(value))];
    return { ...base, [field.key]: Array.from({ length: n }, () => pick(letters, rng)).join('') };
  }
  const xs = value as (number | string)[];
  if (!xs.every((x) => typeof x === 'number'))
    return { ...base, [field.key]: Array.from({ length: n }, () => pick(xs, rng)) };
  const nums = xs as number[];
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const increasing = nums.every((x, i) => i === 0 || x > (nums[i - 1] as number));
  const sorted = nums.every((x, i) => i === 0 || x >= (nums[i - 1] as number));
  if (increasing && nums.length > 1) {
    const out: number[] = [];
    let at = lo;
    for (let i = 0; i < n; i++) out.push((at += i ? 1 + Math.floor(rng() * 3) : 0));
    return { ...base, [field.key]: out };
  }
  const out = Array.from({ length: n }, () => lo + Math.floor(rng() * (hi - lo + 1)));
  return { ...base, [field.key]: sorted ? out.sort((a, b) => a - b) : out };
}

/** Least squares for steps ≈ a + c·f(n). */
function fit(points: readonly ExplorerPoint[], growth: GrowthClass): Fit {
  const f = GROWTH[growth];
  const xs = points.map((p) => f(p.n));
  const ys = points.map((p) => p.steps);
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const my = ys.reduce((s, y) => s + y, 0) / ys.length;
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const sxy = xs.reduce((s, x, i) => s + (x - mx) * ((ys[i] as number) - my), 0);
  const c = sxx > 0 ? sxy / sxx : 0;
  const a = my - c * mx;
  const syy = ys.reduce((s, y) => s + (y - my) ** 2, 0) || 1;
  const error = xs.reduce((s, x, i) => s + ((ys[i] as number) - (a + c * x)) ** 2, 0) / syy;
  return { growth, a, c, error };
}

/** Runs the visualizer on growing inputs. Null when it has no size to grow or too few sizes run. */
export function explore(viz: AnyViz, base: Record<string, unknown>, rng: Rng): Exploration | null {
  const field = explorerField(viz, base);
  if (!field) return null;
  const points: ExplorerPoint[] = [];
  for (const n of SIZES) {
    let steps: number | null = null;
    // A random input can be refused for its content (a target that is missing, say); try a few.
    for (let attempt = 0; attempt < 4 && steps === null; attempt++) {
      const input = inputOfSize(base, field, n, rng);
      if (viz.validate?.(structuredClone(input))) continue;
      try {
        steps = runViz(viz, structuredClone(input)).length;
      } catch {
        break;
      }
    }
    if (steps === null) {
      if (points.length) break;
      continue;
    }
    points.push({ n, steps });
  }
  if (points.length < 4) return null;
  const fits = (Object.keys(GROWTH) as GrowthClass[]).map((g) => fit(points, g)).filter((f) => f.c > 0);
  if (!fits.length) return null;
  const best = fits.reduce((a, b) => (b.error < a.error ? b : a)).growth;
  return { field: field.key, points, fits, best };
}
