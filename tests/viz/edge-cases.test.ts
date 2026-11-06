// Edge-case buttons (plan 7.4): every case offered on a visualizer's default input runs, and its result matches the
// legacy reference, like any other input.
import { beforeAll, describe, expect, it } from 'vitest';
import { edgeCaseField, edgeCases } from '@/lib/viz/edge-cases';
import { defaultInput, runViz } from '@/lib/viz/engine';
import { VIZ_CATALOG, VIZ_LOADERS } from '@/lib/viz/registry';
import type { AnyViz } from '@/lib/viz/types';
import { clone, finalResult, loadLegacyRefs, referenceMismatch, type LegacyRef } from './legacy';

let refs: Record<string, LegacyRef>;
const port = new Map<string, AnyViz>();

beforeAll(async () => {
  refs = await loadLegacyRefs();
  for (const { id } of VIZ_CATALOG) port.set(id, await (VIZ_LOADERS[id] as () => Promise<AnyViz>)());
}, 120_000);

const inputOf = (viz: AnyViz) => defaultInput(viz) as Record<string, unknown>;

describe('edge cases', () => {
  it('build the six generic cases from a list', () => {
    const viz = port.get('kadane') as AnyViz;
    const input = inputOf(viz);
    expect(edgeCaseField(viz, input)).toBe('nums');
    const cases = edgeCases(viz, input);
    const nums = input.nums as number[];
    const byLabel = Object.fromEntries(cases.map((c) => [c.label, c.input.nums]));
    expect(byLabel['One element']).toEqual([nums[0]]);
    expect(byLabel['All equal']).toEqual(nums.map(() => nums[0]));
    expect(byLabel.Sorted).toEqual([...nums].sort((a, b) => a - b));
    expect(byLabel.Reversed).toEqual([...nums].sort((a, b) => b - a));
    expect(byLabel.Duplicates).toEqual(nums.map((_, i) => nums[i - (i % 2)]));
  });

  it('are offered only when validate() accepts them and the run succeeds', () => {
    for (const viz of port.values()) {
      for (const c of edgeCases(viz, inputOf(viz))) {
        expect(viz.validate?.(clone(c.input)), `${viz.id} ${c.label}`).toBeFalsy();
        expect(() => runViz(viz, clone(c.input)), `${viz.id} ${c.label}`).not.toThrow();
      }
    }
  });

  it('give the reference result on every visualizer that offers them', () => {
    let offered = 0;
    let withCases = 0;
    for (const viz of port.values()) {
      const cases = edgeCases(viz, inputOf(viz));
      if (cases.length) withCases++;
      const ref = refs[viz.id] as LegacyRef;
      for (const c of cases) {
        offered++;
        const steps = runViz(viz, clone(c.input));
        expect(referenceMismatch(ref, c.input, finalResult(steps)), `${viz.id} ${c.label}`).toBeNull();
      }
    }
    console.log(`edge cases: ${offered} buttons on ${withCases} of ${port.size} visualizers`);
    expect(withCases).toBeGreaterThan(40);
  });
});
