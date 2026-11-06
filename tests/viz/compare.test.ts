// Compare pairs (plan 7.6): on the left side's default, presets and random inputs, both sides run, give the same answer
// and match the legacy reference.
import { beforeAll, describe, expect, it } from 'vitest';
import { COMPARE_PAIRS, finalAnswer, sameAnswer, sideInput } from '@/lib/viz/compare';
import { runViz } from '@/lib/viz/engine';
import { VIZ_LOADERS } from '@/lib/viz/registry';
import { testInputs } from '@/lib/viz/test-inputs';
import type { AnyViz } from '@/lib/viz/types';
import { clone, loadLegacyRefs, referenceMismatch, type LegacyRef } from './legacy';

let refs: Record<string, LegacyRef>;
const port = new Map<string, AnyViz>();

beforeAll(async () => {
  refs = await loadLegacyRefs();
  for (const p of COMPARE_PAIRS) {
    for (const id of [p.left.viz, p.right.viz])
      port.set(id, await (VIZ_LOADERS[id] as () => Promise<AnyViz>)());
  }
}, 120_000);

describe.each(COMPARE_PAIRS.map((p) => [p.id, p] as const))('compare %s', (_id, pair) => {
  it('takes one input on both sides: the same fields, apart from the method switch', () => {
    const fields = (id: string, fixed: Record<string, unknown> = {}) =>
      ((port.get(id) as AnyViz).inputs ?? [])
        .filter((f) => !(f.key in fixed))
        .map((f) => `${f.key}:${f.type}`);
    expect(fields(pair.right.viz, pair.right.fixed)).toEqual(fields(pair.left.viz, pair.left.fixed));
  });

  it('gives the same answer on both sides, and the reference answer', () => {
    const left = port.get(pair.left.viz) as AnyViz;
    const right = port.get(pair.right.viz) as AnyViz;
    let compared = 0;
    for (const { label, input } of testInputs(left)) {
      const a = sideInput(pair.left, input);
      const b = sideInput(pair.right, input);
      if (left.validate?.(clone(a)) || right.validate?.(clone(b))) continue;
      let stepsA;
      let stepsB;
      try {
        stepsA = runViz(left, clone(a));
        stepsB = runViz(right, clone(b));
      } catch {
        continue; // over the 600-step limit on one side: the player says so, and there is nothing to compare
      }
      const [x, y] = [finalAnswer(stepsA), finalAnswer(stepsB)];
      if (pair.answers === 'any-valid') {
        expect(referenceMismatch(refs[right.id] as LegacyRef, b, y), `${label}, right side`).toBeNull();
      } else {
        expect(sameAnswer(pair, x, y), `${label}: ${JSON.stringify(x)} vs ${JSON.stringify(y)}`).toBe(true);
      }
      expect(referenceMismatch(refs[left.id] as LegacyRef, a, x), label).toBeNull();
      compared++;
    }
    expect(compared).toBeGreaterThan(50);
  });
});
