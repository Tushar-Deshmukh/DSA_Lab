// Predict mode, generic questions (plan 7.4). Before a step, the player can ask what it will change, when the change has
// a shape the learner can name from the picture: which pointer moves, what happens to a stack or a queue, or which
// single cell changes state. The answer is read from the next step's view, so it is right by construction;
// tests/viz/predict.test.ts checks each option against the views independently.
import { fmt } from './nodes';
import type { CellsNode, QueueNode, StackNode, VizNode } from './types';
import { flatNodes } from './walk';

export type PredictKind = 'pointer' | 'stack' | 'queue' | 'cell';

export interface PredictQuestion {
  kind: PredictKind;
  prompt: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
}

/** Pairs the nodes of two views: the nth node of a kind and label in one with the nth of the same in the other. */
function pairs<K extends VizNode['kind']>(
  kind: K,
  current: readonly VizNode[],
  next: readonly VizNode[],
): [Extract<VizNode, { kind: K }>, Extract<VizNode, { kind: K }>][] {
  const keyed = (nodes: readonly VizNode[]) => {
    const seen = new Map<string, number>();
    const out = new Map<string, Extract<VizNode, { kind: K }>>();
    for (const n of flatNodes(nodes)) {
      if (n.kind !== kind) continue;
      const label = 'label' in n ? String(n.label ?? '') : '';
      const k = seen.get(label) ?? 0;
      seen.set(label, k + 1);
      out.set(`${label}#${k}`, n as Extract<VizNode, { kind: K }>);
    }
    return out;
  };
  const a = keyed(current);
  const b = keyed(next);
  return [...a].flatMap(([key, n]) => {
    const m = b.get(key);
    return m ? [[n, m] as [Extract<VizNode, { kind: K }>, Extract<VizNode, { kind: K }>]] : [];
  });
}

/** Where each pointer label points. */
export function pointerPositions(node: CellsNode): Map<string, number> {
  const out = new Map<string, number>();
  for (const [index, p] of Object.entries(node.ptrs ?? {})) {
    for (const label of [p ?? []].flat()) if (!out.has(label)) out.set(label, Number(index));
  }
  return out;
}

/** A window bound as the legacy comparison read it: JavaScript compares null as 0, and undefined as never true. */
const bound = (b: number | null | undefined): number => (b === null ? 0 : b === undefined ? NaN : b);

/** Whether a cell is inside the window, which the cells primitive marks with a bracket. */
export const inWindow = (node: CellsNode, i: number): boolean =>
  Boolean(node.window) && i >= bound(node.window?.[0]) && i <= bound(node.window?.[1]);

/** The state a cell is drawn with: its own, else the window's, else dim outside `dimOutside` (legacy `cells`). */
export function cellState(node: CellsNode, i: number): string {
  const own = node.states?.[i];
  if (own) return own;
  if (inWindow(node, i)) return 'window';
  const d = node.dimOutside;
  if (d && (i < bound(d[0]) || i > bound(d[1]))) return 'dim';
  return '';
}

function pointerQuestion(current: readonly VizNode[], next: readonly VizNode[]): PredictQuestion | null {
  for (const [a, b] of pairs('cells', current, next)) {
    const before = pointerPositions(a);
    const after = pointerPositions(b);
    const shared = [...before.keys()].filter((l) => after.has(l));
    if (shared.length !== 2) continue;
    const [p, q] = shared as [string, string];
    const pMoves = before.get(p) !== after.get(p);
    const qMoves = before.get(q) !== after.get(q);
    if (!pMoves && !qMoves) continue;
    return {
      kind: 'pointer',
      prompt: `Which pointer moves in the next step: ${p} or ${q}?`,
      options: [`${p} moves`, `${q} moves`, 'Both move', 'Neither moves'],
      answer: pMoves && qMoves ? 2 : pMoves ? 0 : 1,
    };
  }
  return null;
}

const same = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((x, i) => fmt(x) === fmt(b[i]));

function sequenceQuestion(
  kind: 'stack' | 'queue',
  current: readonly VizNode[],
  next: readonly VizNode[],
): PredictQuestion | null {
  for (const [a, b] of pairs(kind, current, next) as [StackNode | QueueNode, StackNode | QueueNode][]) {
    const x = a.items;
    const y = b.items;
    const added = y.length === x.length + 1 && same(x, y.slice(0, -1));
    const removed =
      y.length === x.length - 1 && (kind === 'stack' ? same(x.slice(0, -1), y) : same(x.slice(1), y));
    if (!added && !removed) continue;
    return kind === 'stack'
      ? {
          kind,
          prompt: 'What happens to the stack in the next step?',
          options: ['A push', 'A pop', 'Nothing'],
          answer: added ? 0 : 1,
        }
      : {
          kind,
          prompt: 'What happens to the queue in the next step?',
          options: ['An item joins the back', 'The front item leaves', 'Nothing'],
          answer: added ? 0 : 1,
        };
  }
  return null;
}

function cellQuestion(current: readonly VizNode[], next: readonly VizNode[]): PredictQuestion | null {
  for (const [a, b] of pairs('cells', current, next)) {
    const n = a.values.length;
    if (n < 2 || n > 10 || b.values.length !== n) continue;
    const changed = a.values.map((_, i) => i).filter((i) => cellState(a, i) !== cellState(b, i));
    if (changed.length !== 1) continue;
    const base = a.indexBase ?? 0;
    return {
      kind: 'cell',
      prompt: `Which cell${a.label ? ` of ${a.label}` : ''} changes in the next step?`,
      options: a.values.map((v, i) => `Index ${i + base} (${fmt(v)})`),
      answer: changed[0] as number,
    };
  }
  return null;
}

/** The question to ask before moving from one view to the next, or null if the change has no askable shape. */
export function genericQuestion(
  current: readonly VizNode[],
  next: readonly VizNode[],
): PredictQuestion | null {
  return (
    pointerQuestion(current, next) ??
    sequenceQuestion('stack', current, next) ??
    sequenceQuestion('queue', current, next) ??
    cellQuestion(current, next)
  );
}
