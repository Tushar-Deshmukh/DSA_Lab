// D-013: the port behaves exactly like the legacy code. On the default, every preset and 300 random inputs per
// visualizer (38,333 runs), every step and every view equal the legacy ones, and so does every rejection message.
import { beforeAll, describe, expect, it } from 'vitest';
import { runViz, viewOf } from '@/lib/viz/engine';
import { VIZ_CATALOG, VIZ_LOADERS } from '@/lib/viz/registry';
import type { AnyViz } from '@/lib/viz/types';
import { mulberry, testInputs } from '@/lib/viz/test-inputs';
import { readVizChanges } from '@/scripts/import/viz-text';
import { canon, clone, legacyView, loadLegacy, loadLegacyRefs, type Legacy, type LegacyRef } from './legacy';

let legacy: Legacy;
let refs: Record<string, LegacyRef>;
const port = new Map<string, AnyViz>();

beforeAll(async () => {
  legacy = loadLegacy();
  refs = await loadLegacyRefs();
  for (const { id } of VIZ_CATALOG) port.set(id, await (VIZ_LOADERS[id] as () => Promise<AnyViz>)());
}, 120_000);

describe('the visualizer catalog', () => {
  it('holds every legacy visualizer once, 129 in all', () => {
    expect(VIZ_CATALOG).toHaveLength(129);
    expect(new Set(VIZ_CATALOG.map((e) => e.id)).size).toBe(129);
    expect(Object.keys(legacy.defs).sort()).toEqual(VIZ_CATALOG.map((e) => e.id).sort());
  });

  it('logs every text change with the visualizer it belongs to', () => {
    const changes = readVizChanges();
    expect(changes.length).toBeGreaterThan(0);
    for (const c of changes) expect(c.after).not.toBe(c.before);
  });
});

describe.each(VIZ_CATALOG.map((e) => [e.id]))('%s', (id) => {
  it('has the legacy definition: title, code, line tags, inputs, presets and legend', () => {
    const def = legacy.defs[id];
    const viz = port.get(id);
    if (!def || !viz) throw new Error(`missing ${id}`);
    expect(viz.title).toBe(def.title);
    expect(viz.code).toBe(def.code);
    expect(viz.lines).toEqual(def.L);
    expect(canon(viz.inputs ?? [])).toBe(canon(def.inputs ?? []));
    expect(canon(viz.presets ?? [])).toBe(canon(def.presets ?? []));
    expect(canon(viz.legend ?? [])).toBe(canon(def.legend ?? []));
  });

  it('draws random inputs exactly as the legacy test did', () => {
    const viz = port.get(id) as AnyViz;
    const gen = refs[id]?.gen;
    expect(Boolean(viz.random)).toBe(Boolean(gen));
    if (!viz.random || !gen) return;
    const a = mulberry(id.length * 7919 + 17);
    const b = mulberry(id.length * 7919 + 17);
    for (let k = 0; k < 300; k++) expect(canon(viz.random(a))).toBe(canon(gen(b)));
  });

  it('runs and draws every step like the legacy code, on every test input', () => {
    const def = legacy.defs[id];
    const viz = port.get(id);
    if (!def || !viz) throw new Error(`missing ${id}`);
    let runs = 0;
    for (const { label, input } of testInputs(viz)) {
      const legacyInput = clone(input);
      const portInput = clone(input);
      let want: ReturnType<Legacy['runDef']> | undefined;
      let got: ReturnType<typeof runViz> | undefined;
      let wantError = '';
      let gotError = '';
      try {
        want = legacy.runDef(def, legacyInput);
      } catch (e) {
        wantError = (e as Error).message;
      }
      try {
        got = runViz(viz, portInput);
      } catch (e) {
        gotError = (e as Error).message;
      }
      expect(gotError, `${label}: error`).toBe(wantError);
      if (!want || !got) continue;
      runs++;
      expect(canon(got), `${label}: steps`).toBe(canon(want));
      for (let s = 0; s < want.length; s++) {
        const a = canon(viewOf(viz, got[s] as never, portInput));
        const b = canon(legacyView(def, want[s] as never, legacyInput));
        if (a !== b) expect(a, `${label}: view of step ${s + 1}`).toBe(b);
      }
    }
    expect(runs).toBeGreaterThan(0);
  }, 120_000);
});
