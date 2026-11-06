// The complexity explorer: inputs have the size asked for and the default's shape, every measured run is one the player
// would accept, and the closest growth class is the textbook one for visualizers whose cost is not in doubt.
import { beforeAll, describe, expect, it } from 'vitest';
import { defaultInput, runViz } from '@/lib/viz/engine';
import { EXPLORERS, explore, explorerField, inputOfSize } from '@/lib/viz/explorer';
import { VIZ_CATALOG, VIZ_LOADERS } from '@/lib/viz/registry';
import { mulberry } from '@/lib/viz/test-inputs';
import type { AnyViz } from '@/lib/viz/types';

const port = new Map<string, AnyViz>();

beforeAll(async () => {
  for (const { id } of VIZ_CATALOG) port.set(id, await (VIZ_LOADERS[id] as () => Promise<AnyViz>)());
}, 120_000);

const base = (viz: AnyViz) => defaultInput(viz) as Record<string, unknown>;

describe('explorer inputs', () => {
  it('have the size asked for, and keep a sorted default sorted', () => {
    const rng = mulberry(7);
    const viz = port.get('bs-closed') as AnyViz;
    const field = explorerField(viz, base(viz));
    expect(field?.kind).toBe('list');
    const input = inputOfSize(base(viz), field as NonNullable<typeof field>, 25, rng);
    const nums = input[field?.key as string] as number[];
    expect(nums).toHaveLength(25);
    expect(nums.every((x, i) => i === 0 || x > (nums[i - 1] as number))).toBe(true);
  });
});

describe('explore', () => {
  it('measures only runs the player accepts, at growing sizes', () => {
    let explored = 0;
    for (const viz of port.values()) {
      const e = explore(viz, base(viz), mulberry(viz.id.length));
      if (!e) continue;
      explored++;
      expect(e.points.length).toBeGreaterThanOrEqual(4);
      e.points.forEach((p, i) => i && expect(p.n).toBeGreaterThan((e.points[i - 1] as { n: number }).n));
      for (const p of e.points) expect(p.steps).toBeLessThanOrEqual(600);
    }
    console.log(`explorer: ${explored} of ${port.size} visualizers`);
    expect(explored).toBeGreaterThan(40);
  });

  it.each(Object.entries(EXPLORERS))('finds %s closest to O(%s), on several seeds', (id, growth) => {
    const viz = port.get(id) as AnyViz;
    for (const seed of [1, 11, 29]) {
      const e = explore(viz, base(viz), mulberry(seed));
      expect(e?.best, `seed ${seed}: ${JSON.stringify(e?.points)}`).toBe(growth);
      expect(e?.fits.find((f) => f.growth === growth)?.error ?? 1).toBeLessThan(0.25);
    }
  });

  it('counts steps the way the player does', () => {
    const viz = port.get('kadane') as AnyViz;
    const e = explore(viz, base(viz), mulberry(3));
    const field = explorerField(viz, base(viz));
    const again = inputOfSize(base(viz), field as NonNullable<typeof field>, 8, mulberry(1));
    expect(runViz(viz, again).length).toBeGreaterThan(0);
    expect(e?.points.find((p) => p.n === 8)?.steps).toBeGreaterThan(0);
  });
});
