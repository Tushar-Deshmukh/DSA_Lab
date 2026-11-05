// Edge-case buttons (plan 7.4): generic cases built from the visualizer's first list or text field. A case is offered
// only if validate() accepts it and the run succeeds, so a button never leads to an error.
import { runViz } from './engine';
import type { AnyViz } from './types';

export interface EdgeCase {
  label: string;
  input: Record<string, unknown>;
}

type Item = number | string;

const isItems = (v: unknown): v is Item[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'number' || typeof x === 'string');

const ascending = (a: Item, b: Item) =>
  typeof a === 'number' && typeof b === 'number'
    ? a - b
    : String(a) < String(b)
      ? -1
      : String(a) > String(b)
        ? 1
        : 0;

/** The six generic cases for one sequence, in the order the buttons show them. */
function casesOf(xs: Item[]): [string, Item[]][] {
  if (!xs.length) return [];
  const sorted = [...xs].sort(ascending);
  return [
    ['Empty', []],
    ['One element', [xs[0] as Item]],
    // Pairs of equal neighbours keep the length, and keep a sorted input sorted.
    ['Duplicates', xs.map((_, i) => xs[i - (i % 2)] as Item)],
    ['All equal', xs.map(() => xs[0] as Item)],
    ['Sorted', sorted],
    ['Reversed', [...sorted].reverse()],
  ];
}

/** The field the cases vary: the first list of numbers or words, or the first text field. */
export function edgeCaseField(viz: AnyViz, input: Record<string, unknown>): string | null {
  for (const f of viz.inputs ?? []) {
    const v = input[f.key];
    if ((f.type === 'numbers' || f.type === 'array') && isItems(v)) return f.key;
    if (f.type === 'string' && typeof v === 'string') return f.key;
  }
  return null;
}

export function edgeCases(viz: AnyViz, input: Record<string, unknown>): EdgeCase[] {
  const key = edgeCaseField(viz, input);
  if (!key) return [];
  const value = input[key];
  const text = typeof value === 'string';
  const items: Item[] = text ? [...value] : (value as Item[]);
  const seen = new Set([JSON.stringify(value)]);
  const out: EdgeCase[] = [];
  for (const [label, xs] of casesOf(items)) {
    const next = text ? xs.join('') : xs;
    const id = JSON.stringify(next);
    if (seen.has(id)) continue;
    seen.add(id);
    const candidate = { ...structuredClone(input), [key]: next };
    try {
      runViz(viz, structuredClone(candidate));
    } catch {
      continue;
    }
    out.push({ label, input: candidate });
  }
  return out;
}
