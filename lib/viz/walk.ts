import type { VizNode } from './types';

/** Every node of a view in drawing order, the children of panels and rows included. */
export function flatNodes(nodes: readonly VizNode[]): VizNode[] {
  const out: VizNode[] = [];
  const visit = (n: VizNode) => {
    out.push(n);
    if (n.kind === 'panel' || n.kind === 'row') n.children.forEach(visit);
  };
  nodes.forEach(visit);
  return out;
}
