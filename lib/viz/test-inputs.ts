// The inputs the checks run every visualizer on (plan 7.6): the default, each preset, and 300 random inputs drawn from
// the seed the legacy suite used (legacy/tests/content.mjs), so a failure names an input anyone can reproduce.
import type { Rng, Viz, VizStep } from './types';

/** The legacy suite's seeded generator. */
export function mulberry(seed: number): Rng {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TestInput {
  label: string;
  input: Record<string, unknown>;
}

export function testInputs(viz: Viz<unknown, VizStep>): TestInput[] {
  const defaults = Object.fromEntries((viz.inputs ?? []).map((f) => [f.key, f.def]));
  const out = [
    { label: 'default', input: defaults },
    ...(viz.presets ?? []).map((p) => ({ label: `preset "${p.label}"`, input: { ...defaults, ...p.input } })),
  ];
  if (viz.random) {
    const g = mulberry(viz.id.length * 7919 + 17);
    for (let k = 0; k < 300; k++)
      out.push({ label: `random #${k}`, input: viz.random(g) as Record<string, unknown> });
  }
  return out;
}
