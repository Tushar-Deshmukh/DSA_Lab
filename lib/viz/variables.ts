// The variables panel (plan 7.3): changed values are found by comparing a step with the one before it.
import { fmt } from './nodes';
import type { VarsNode, VizNode } from './types';

export interface Variable {
  name: string;
  value: string;
  changed: boolean;
}

/** Fields every step has, shown elsewhere: the code line, the narration and the final answer. */
const NOT_VARIABLES = new Set(['line', 'note', 'why', 'result', 'done']);

const isScalar = (v: unknown) =>
  v === null || v === undefined || ['number', 'string', 'boolean'].includes(typeof v);

/** The step's single-value fields, for visualizers whose view draws no variables of its own. */
export function stepVariables(step: object, previous?: object): Variable[] {
  const before = previous as Record<string, unknown> | undefined;
  return Object.entries(step)
    .filter(([name, v]) => !NOT_VARIABLES.has(name) && isScalar(v))
    .map(([name, v]) => ({
      name,
      value: fmt(v),
      changed: before !== undefined && fmt(before[name]) !== fmt(v),
    }));
}

/**
 * Marks the variables that changed since the previous step, in every `vars` node whose view did not mark them itself.
 * The nth `vars` node is compared with the nth one of the previous view. Returns new nodes; the input is unchanged.
 */
export function markVarChanges(
  nodes: readonly VizNode[],
  previous: readonly VizNode[] | undefined,
): VizNode[] {
  if (!previous) return [...nodes];
  const old: VarsNode[] = [];
  const collect = (n: VizNode) => {
    if (n.kind === 'vars') old.push(n);
    if (n.kind === 'panel' || n.kind === 'row') n.children.forEach(collect);
  };
  previous.forEach(collect);
  let k = 0;
  const mark = (n: VizNode): VizNode => {
    if (n.kind === 'panel' || n.kind === 'row') return { ...n, children: n.children.map(mark) };
    if (n.kind !== 'vars') return n;
    const before = old[k++];
    if (n.changed?.length || !before) return n;
    const changed = Object.keys(n.values).filter((key) => fmt(before.values[key]) !== fmt(n.values[key]));
    return { ...n, changed };
  };
  return nodes.map(mark);
}
