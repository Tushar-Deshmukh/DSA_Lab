// Helpers shared by this module's visualizers, from legacy/src/viz/w05.js.
import { R } from '@/lib/viz/nodes';
import type { Stage, VizNode, VizStep } from '@/lib/viz/types';

export const fmtArr = (a: number[]) => '[' + a.join(',') + ']';

export // A tracer records a decision tree while the real algorithm runs.
function tracer() {
  const nodes: { id: number; label: string; parent: number | null }[] = [],
    state: Record<string, string> = {},
    sub: Record<string, string> = {},
    edge: Record<string, string> = {};
  const stack: number[] = [];
  return {
    nodes,
    stack,
    add(label: string, parent: number | null, edgeLabel?: string | null) {
      const id = nodes.length;
      nodes.push({ id, label, parent });
      if (edgeLabel != null) edge[id] = edgeLabel;
      return id;
    },
    enter(id: number) {
      stack.forEach((s) => (state[s] = 'frontier'));
      stack.push(id);
      state[id] = 'current';
    },
    leave(id: number, st = 'done') {
      stack.pop();
      state[id] = st;
      if (stack.length) state[stack.at(-1)!] = 'current';
    },
    mark(id: number, st: string, s?: string) {
      state[id] = st;
      if (s != null) sub[id] = s;
    },
    snap<O extends object>(o: O) {
      return Object.assign(
        { tree: nodes.map((n) => ({ ...n, state: state[n.id], sub: sub[n.id], edgeLabel: edge[n.id] })) },
        o,
      );
    },
  };
}

export const treeOpts = (n: number) => ({
  dx: n > 24 ? 40 : 50,
  dy: 52,
  r: 16,
  label: 'decision tree (one node per call)',
});

export function renderBT(
  st: {
    tree: {
      id: number;
      label: string;
      parent: number | null;
      state: string;
      sub?: string;
      edgeLabel?: string;
    }[];
    line?: VizStep['line'];
    path?: (number | string)[];
    res: (string | number[])[];
    note?: string;
    why?: string | null;
    done?: boolean;
    result?: (string | number[])[];
    used?: boolean[];
    calls?: number;
  },
  stage: Stage,
  extra?: VizNode | null,
) {
  stage.append(R.tree(st.tree, treeOpts(st.tree.length)));
  if (st.path) stage.append(R.cells(st.path, { label: 'path (shared, mutated in place)', noIndex: true }));
  if (st.res)
    stage.append(
      R.panel(
        'results so far (' + st.res.length + ')',
        R.caption(
          st.res
            .map((r: string | number[]) => (Array.isArray(r) ? fmtArr(r) : JSON.stringify(r)))
            .join('  ') || '(none yet)',
          { mono: true },
        ),
      ),
    );
  if (extra) stage.append(extra);
}
