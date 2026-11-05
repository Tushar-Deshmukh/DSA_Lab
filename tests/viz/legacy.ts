// The legacy visualizers as the reference: the real legacy player (legacy/src/viz/player.js) runs the original files,
// with the same VIEW_PATCHES and logged text changes the port has, in a sandbox. Both sides draw with the port's `R`,
// which returns plain data, so their views can be compared value by value.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { R } from '@/lib/viz/nodes';
import type { Rng, VizNode } from '@/lib/viz/types';
import { LEGACY_DIR } from '@/scripts/import/paths';
import {
  applyViewPatches,
  legacyVizText,
  readVizChanges,
  replayVizChanges,
  VIZ_FILES,
} from '@/scripts/import/viz-text';

export interface LegacyStep {
  line?: number | number[] | null;
  note?: string;
  why?: string | null;
  result?: unknown;
  [key: string]: unknown;
}

export interface LegacyDef {
  id: string;
  title: string;
  code: string;
  L: Record<string, number>;
  inputs?: { key: string; def: unknown }[];
  presets?: { label: string; input: Record<string, unknown> }[];
  legend?: [string, string][];
  render: (step: LegacyStep, stage: { append: (...nodes: unknown[]) => void }, input: unknown) => void;
}

export interface LegacyRef {
  gen?: (rng: Rng) => Record<string, unknown>;
  ref?: (input: Record<string, unknown>) => unknown;
  cmp?: (got: unknown, want: unknown) => boolean;
  check?: (input: Record<string, unknown>, got: unknown) => boolean;
}

export interface Legacy {
  defs: Record<string, LegacyDef>;
  runDef: (def: LegacyDef, input: unknown) => LegacyStep[];
}

export function loadLegacy(): Legacy {
  const ctx: Record<string, unknown> = { console, document: {}, Node: function () {} };
  ctx.window = ctx;
  vm.createContext(ctx);
  const rd = (p: string) => fs.readFileSync(path.join(LEGACY_DIR, p), 'utf8');
  for (const f of ['src/shared.js', 'src/core.js', 'src/viz/render.js', 'src/viz/player.js']) {
    vm.runInContext(rd(f), ctx, { filename: f });
  }
  ctx.R = R;
  const changes = readVizChanges();
  for (const file of VIZ_FILES) {
    const mine = changes.filter((c) => c.file === `src/viz/${file}`);
    vm.runInContext(replayVizChanges(applyViewPatches(file, legacyVizText(file)), mine), ctx, {
      filename: file,
    });
  }
  const viz = ctx.Viz as { DEFS: Record<string, LegacyDef>; runDef: Legacy['runDef'] };
  return { defs: viz.DEFS, runDef: viz.runDef };
}

export async function loadLegacyRefs(): Promise<Record<string, LegacyRef>> {
  const url = pathToFileURL(path.join(LEGACY_DIR, 'tests/refs.mjs')).href;
  return ((await import(/* @vite-ignore */ url)) as { REFS: Record<string, LegacyRef> }).REFS;
}

/** What a legacy view drew, as the port's view nodes. */
export function legacyView(def: LegacyDef, step: LegacyStep, input: unknown): VizNode[] {
  const nodes: VizNode[] = [];
  def.render(step, { append: (...xs) => xs.forEach((x) => x && nodes.push(x as VizNode)) }, input);
  return nodes;
}

const tagOf = (v: object) => Object.prototype.toString.call(v).slice(8, -1);

/**
 * A string that two values share exactly when they are equal, across the sandbox boundary: Sets, Maps, undefined,
 * NaN, ±Infinity and −0 are spelled out, which JSON alone would lose.
 */
export function canon(value: unknown): string {
  return JSON.stringify(value, function (this: unknown, _key, v: unknown) {
    if (v === undefined) return '$undefined';
    if (typeof v === 'number') {
      if (Object.is(v, -0)) return '$-0';
      if (!Number.isFinite(v)) return `$${String(v)}`;
      return v;
    }
    if (typeof v === 'function') return '$function';
    if (v && typeof v === 'object') {
      const tag = tagOf(v);
      if (tag === 'Set') return { $set: [...(v as Set<unknown>)] };
      if (tag === 'Map') return { $map: [...(v as Map<unknown, unknown>)] };
    }
    return v;
  });
}

export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function finalResult(steps: { result?: unknown }[]): unknown {
  for (let i = steps.length - 1; i >= 0; i--) if (steps[i]?.result !== undefined) return steps[i]?.result;
  return undefined;
}

/** Whether a run's final result is what the legacy reference says: null if it is, otherwise what differs. */
export function referenceMismatch(
  ref: LegacyRef,
  input: Record<string, unknown>,
  got: unknown,
): string | null {
  if (ref.check) return ref.check(clone(input), got) ? null : `check failed for ${canon(got)}`;
  if (!ref.ref) return null;
  const want = ref.ref(clone(input));
  const ok = ref.cmp ? ref.cmp(got, want) : canon(got) === canon(want);
  return ok ? null : `${canon(got)} vs ${canon(want)}`;
}
