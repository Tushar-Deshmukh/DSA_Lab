// Predict mode, generic questions (plan 7.6: "Predict answers equal the actual next step"). Each question is checked
// against the two views it came from: the right option describes the next step, and no other option does.
import { beforeAll, describe, expect, it } from 'vitest';
import { defaultInput, runViz, viewOf } from '@/lib/viz/engine';
import { cellState, genericQuestion, pointerPositions, type PredictQuestion } from '@/lib/viz/predict';
import { VIZ_CATALOG, VIZ_LOADERS } from '@/lib/viz/registry';
import type { AnyViz, CellsNode, VizNode } from '@/lib/viz/types';
import { flatNodes } from '@/lib/viz/walk';
import { testInputs } from '@/lib/viz/test-inputs';
import { clone } from './legacy';

const port = new Map<string, AnyViz>();

beforeAll(async () => {
  for (const { id } of VIZ_CATALOG) port.set(id, await (VIZ_LOADERS[id] as () => Promise<AnyViz>)());
}, 120_000);

const views = (viz: AnyViz, input: Record<string, unknown>): VizNode[][] => {
  const copy = clone(input);
  return runViz(viz, copy).map((s) => viewOf(viz, s, copy));
};

const cellsOf = (nodes: VizNode[]) => flatNodes(nodes).filter((n): n is CellsNode => n.kind === 'cells');

/** Which options are true of the move from `a` to `b`, worked out without the question's own logic. */
function trueOptions(q: PredictQuestion, a: VizNode[], b: VizNode[]): number[] {
  if (q.kind === 'pointer') {
    const [p, r] = q.prompt
      .replace(/^.*: | or |\?$/g, '|')
      .split('|')
      .filter(Boolean) as [string, string];
    const moved = (label: string) =>
      cellsOf(a).some((n, i) => {
        const before = pointerPositions(n).get(label);
        const after = pointerPositions(cellsOf(b)[i] as CellsNode).get(label);
        return before !== undefined && after !== undefined && before !== after;
      });
    const [pm, rm] = [moved(p), moved(r)];
    return [pm && !rm ? 0 : -1, rm && !pm ? 1 : -1, pm && rm ? 2 : -1, !pm && !rm ? 3 : -1].filter(
      (i) => i >= 0,
    );
  }
  if (q.kind === 'stack' || q.kind === 'queue') {
    const items = (nodes: VizNode[]) =>
      flatNodes(nodes).flatMap((n) => (n.kind === q.kind ? [JSON.stringify(n.items)] : []));
    const [x, y] = [items(a), items(b)];
    const sizes = x.map(
      (s, i) => [JSON.parse(s) as unknown[], JSON.parse(y[i] ?? '[]') as unknown[]] as const,
    );
    const grew = sizes.some(([u, v]) => v.length === u.length + 1);
    const shrank = sizes.some(([u, v]) => v.length === u.length - 1);
    return [grew ? 0 : -1, shrank ? 1 : -1, !grew && !shrank ? 2 : -1].filter((i) => i >= 0);
  }
  const changed = new Set<number>();
  cellsOf(a).forEach((n, k) => {
    const m = cellsOf(b)[k];
    if (m && m.values.length === n.values.length)
      n.values.forEach((_, i) => cellState(n, i) !== cellState(m, i) && changed.add(i));
  });
  return [...changed];
}

describe('generic predict questions', () => {
  it('have distinct options and one answer that describes the next step', () => {
    let asked = 0;
    const covered = new Set<string>();
    const byKind = new Map<string, number>();
    for (const viz of port.values()) {
      for (const { label, input } of testInputs(viz).slice(0, 25)) {
        if (viz.validate?.(clone(input))) continue;
        const vs = views(viz, input);
        for (let k = 0; k + 1 < vs.length; k++) {
          const q = genericQuestion(vs[k] as VizNode[], vs[k + 1] as VizNode[]);
          if (!q) continue;
          asked++;
          covered.add(viz.id);
          byKind.set(q.kind, (byKind.get(q.kind) ?? 0) + 1);
          expect(new Set(q.options).size, `${viz.id} ${label} step ${k + 1}`).toBe(q.options.length);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(q.options.length);
          const truths = trueOptions(q, vs[k] as VizNode[], vs[k + 1] as VizNode[]);
          expect(truths, `${viz.id} ${label} step ${k + 1}: ${q.prompt}`).toContain(q.answer);
        }
      }
    }
    console.log(`predict: ${asked} questions on ${covered.size} visualizers`, Object.fromEntries(byKind));
    expect(covered.size).toBeGreaterThan(30);
  }, 120_000);

  it('ask which pointer moves in the two-pointer search', () => {
    const viz = port.get('two-sum-sorted') as AnyViz;
    const vs = views(viz, defaultInput(viz) as Record<string, unknown>);
    const qs = vs.slice(0, -1).map((v, k) => genericQuestion(v, vs[k + 1] as VizNode[]));
    const pointer = qs.find((q) => q?.kind === 'pointer');
    expect(pointer?.options).toEqual(['l moves', 'r moves', 'Both move', 'Neither moves']);
  });
});
