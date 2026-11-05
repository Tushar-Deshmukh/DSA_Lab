// The variables panel: single values of a step, and changes found by comparing consecutive steps.
import { describe, expect, it } from 'vitest';
import { R } from '@/lib/viz/nodes';
import type { VarsNode, VizNode } from '@/lib/viz/types';
import { markVarChanges, stepVariables } from '@/lib/viz/variables';

describe('stepVariables', () => {
  it('lists single values, leaves out the narration, and marks what changed', () => {
    const prev = { line: 3, note: 'a', lo: 0, hi: 7, mid: 3, seen: new Set([1]) };
    const step = { line: 4, note: 'b', why: 'c', lo: 4, hi: 7, mid: undefined, best: -Infinity, done: true };
    expect(stepVariables(step, prev)).toEqual([
      { name: 'lo', value: '4', changed: true },
      { name: 'hi', value: '7', changed: false },
      { name: 'mid', value: '·', changed: true },
      { name: 'best', value: '−∞', changed: true },
    ]);
    expect(stepVariables(step).every((v) => !v.changed)).toBe(true);
  });
});

describe('markVarChanges', () => {
  const view = (lo: number, hi: number, changed: string[] = []): VizNode[] => [
    R.cells([1, 2, 3]),
    R.panel('state', R.vars({ lo, hi }, changed)),
  ];
  const varsOf = (nodes: VizNode[]) => (nodes[1] as { children: VarsNode[] }).children[0] as VarsNode;

  it('marks values that differ from the previous view, inside panels too', () => {
    expect(varsOf(markVarChanges(view(1, 5), view(0, 5))).changed).toEqual(['lo']);
  });

  it('keeps marks the view chose itself, and marks nothing on the first step', () => {
    expect(varsOf(markVarChanges(view(1, 5, ['hi']), view(0, 5))).changed).toEqual(['hi']);
    expect(varsOf(markVarChanges(view(1, 5), undefined)).changed).toEqual([]);
  });

  it('does not change the nodes it is given', () => {
    const now = view(1, 5);
    markVarChanges(now, view(0, 5));
    expect(varsOf(now).changed).toEqual([]);
  });
});
