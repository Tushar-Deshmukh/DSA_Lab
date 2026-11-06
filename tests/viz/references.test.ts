// Plan 7.6: every visualizer's final result matches an independent reference (legacy/tests/refs.mjs) on its default,
// its presets and 300 random inputs. A random input may be skipped only when validate() rejects it, and at least 250
// of 300 must be accepted. Every step has a note and a real code line, and every view is made of valid primitives.
import { beforeAll, describe, expect, it } from 'vitest';
import { runViz, viewOf } from '@/lib/viz/engine';
import { VIZ_CATALOG, VIZ_LOADERS } from '@/lib/viz/registry';
import type { AnyViz, GraphNode, VizStep } from '@/lib/viz/types';
import { testInputs } from '@/lib/viz/test-inputs';
import { canon, clone, finalResult, loadLegacyRefs, type LegacyRef } from './legacy';
import { VizNodeSchema } from './node-schema';

let refs: Record<string, LegacyRef>;
const port = new Map<string, AnyViz>();

beforeAll(async () => {
  refs = await loadLegacyRefs();
  for (const { id } of VIZ_CATALOG) port.set(id, await (VIZ_LOADERS[id] as () => Promise<AnyViz>)());
}, 120_000);

type Steps = (VizStep & Record<string, unknown>)[];
type Input = Record<string, unknown>;

/** The legacy number format of the growth visualizer, applied to counts computed here. */
const big = (x: number) =>
  !isFinite(x) || x > 1e15
    ? x > 1e300 || !isFinite(x)
      ? '> 10³⁰⁰'
      : '≈ 10^' + Math.floor(Math.log10(x))
    : Math.round(x).toLocaleString('en-US');

const trimNulls = (a: unknown[]) => {
  const out = [...a];
  while (out.length && out[out.length - 1] == null) out.pop();
  return out;
};

/**
 * Seven legacy references checked little: a constant, an echo of the input, or a count (inventory 8). These check
 * what the visualizer computed.
 */
const STRONGER: Record<string, (input: Input, steps: Steps, viz: AnyViz) => void> = {
  'amortized-push': ({ n }, steps) => {
    let cap = 1;
    let copies = 0;
    for (let size = 0; size < (n as number); size++) {
      if (size === cap) {
        copies += size;
        cap *= 2;
      }
    }
    const last = steps.at(-1) as Steps[number];
    expect(last.size).toBe(n);
    expect(last.cap).toBe(cap);
    expect(last.copies).toBe(copies);
    expect(last.copies as number).toBeLessThan(2 * (n as number));
    expect(finalResult(steps)).toBe(((n as number) + copies) / (n as number) <= 3);
  },
  growth: ({ n }, steps) => {
    const m = n as number;
    const lg = Math.max(1, Math.log2(m));
    const counts = [1, lg, m, m * lg, m * m, 2 ** m];
    expect(steps).toHaveLength(6);
    steps.forEach((s, k) => {
      expect(s.k).toBe(k);
      expect(s.note).toContain(`about ${big(counts[k] as number)} operations`);
    });
  },
  'tree-build': ({ tree }, steps) => {
    const last = steps.at(-1) as Steps[number];
    expect(trimNulls(last.shown as unknown[])).toEqual(trimNulls(tree as unknown[]));
    expect(finalResult(steps)).toBe((tree as unknown[]).filter((x) => x != null).length);
  },
  'tree-construct': ({ pre, ino }, steps) => {
    const built = (steps.at(-1) as Steps[number]).built as {
      id: number;
      label: string;
      parent: number | null;
      side: string | null;
    }[];
    const kids = new Map<number, { L?: number; R?: number }>();
    for (const b of built) {
      if (b.parent == null) continue;
      const k = kids.get(b.parent) ?? {};
      k[b.side === 'L' ? 'L' : 'R'] = b.id;
      kids.set(b.parent, k);
    }
    const label = new Map(built.map((b) => [b.id, b.label]));
    const preorder: string[] = [];
    const inorder: string[] = [];
    const walk = (id: number | undefined) => {
      if (id === undefined) return;
      preorder.push(String(label.get(id)));
      walk(kids.get(id)?.L);
      inorder.push(String(label.get(id)));
      walk(kids.get(id)?.R);
    };
    walk(built.find((b) => b.parent == null)?.id);
    expect(preorder).toEqual((pre as unknown[]).map(String));
    // walk() records inorder after the left subtree only; rebuild it properly.
    const inord: string[] = [];
    const walkIn = (id: number | undefined) => {
      if (id === undefined) return;
      walkIn(kids.get(id)?.L);
      inord.push(String(label.get(id)));
      walkIn(kids.get(id)?.R);
    };
    walkIn(built.find((b) => b.parent == null)?.id);
    expect(inord).toEqual((ino as unknown[]).map(String));
  },
  depmap: (input, steps, viz) => {
    const graph = viewOf(viz, steps.at(-1) as never, input).find((n): n is GraphNode => n.kind === 'graph');
    if (!graph) throw new Error('depmap draws no graph');
    const shown = new Set(steps.flatMap((s) => s.edges as number[]));
    expect([...shown].sort((a, b) => a - b)).toEqual(graph.graph.edges.map((_, i) => i));
  },
  'interview-clock': ({ scenario }, steps) => {
    const phases = steps.map((s) => s.ph as number);
    phases.slice(1).forEach((p, i) => expect(p).toBeGreaterThanOrEqual(phases[i] as number));
    expect(finalResult(steps)).toBe(scenario);
  },
  recognise: (input, steps) => {
    // Candidates may come back as clues are weighed, so the check is not that the list only shrinks: every candidate
    // is one of the patterns the first step lists, and the last step leaves exactly the expected one.
    const keeps = steps.map((s) => s.keep as string[]);
    const all = keeps[0] as string[];
    for (const k of keeps) for (const p of k) expect(all).toContain(p);
    const want = refs.recognise?.ref?.(input);
    expect(keeps.at(-1)).toEqual([want]);
  },
};

describe('the stronger references', () => {
  it('cover the seven weak legacy ones', () => {
    expect(Object.keys(STRONGER).sort()).toEqual(
      [
        'amortized-push',
        'depmap',
        'growth',
        'interview-clock',
        'recognise',
        'tree-build',
        'tree-construct',
      ].sort(),
    );
  });
});

describe.each(VIZ_CATALOG.map((e) => [e.id]))('%s', (id) => {
  it('matches its reference on every accepted input', () => {
    const viz = port.get(id) as AnyViz;
    const ref = refs[id];
    expect(ref, 'a reference exists').toBeDefined();
    let randomAccepted = 0;
    const codeLines = viz.code.split('\n').length;
    for (const { label, input } of testInputs(viz)) {
      const message = viz.validate?.(clone(input));
      if (message) {
        expect(label.startsWith('random'), `${label} is rejected: ${message}`).toBe(true);
        continue;
      }
      if (label.startsWith('random')) randomAccepted++;
      const steps = runViz(viz, clone(input)) as Steps;
      for (const s of steps) {
        expect(typeof s.note === 'string' && s.note.length > 0, `${label}: a step has no note`).toBe(true);
        for (const n of [s.line ?? []].flat()) {
          expect(
            Number.isInteger(n) && (n as number) >= 1 && (n as number) <= codeLines,
            `${label}: line ${String(n)}`,
          ).toBe(true);
        }
      }
      const got = finalResult(steps);
      if (ref?.check) expect(ref.check(clone(input), got), `${label}: check`).toBe(true);
      else if (ref?.ref) {
        const want = ref.ref(clone(input));
        if (ref.cmp) expect(ref.cmp(got, want), `${label}: ${canon(got)} vs ${canon(want)}`).toBe(true);
        else expect(canon(got), label).toBe(canon(want));
      }
      STRONGER[id]?.(clone(input), steps, viz);
    }
    if (viz.random) expect(randomAccepted).toBeGreaterThanOrEqual(250);
  }, 120_000);

  it('draws every step with valid primitives', () => {
    const viz = port.get(id) as AnyViz;
    for (const { input } of testInputs(viz)) {
      if (viz.validate?.(clone(input))) continue;
      const copy = clone(input);
      for (const step of runViz(viz, copy)) {
        for (const node of viewOf(viz, step as never, copy)) {
          const parsed = VizNodeSchema.safeParse(node);
          if (!parsed.success)
            throw new Error(
              `${node.kind}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
            );
        }
      }
    }
  }, 120_000);
});
