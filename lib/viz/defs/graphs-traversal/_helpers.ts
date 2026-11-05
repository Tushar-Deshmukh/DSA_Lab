// Helpers shared by this module's visualizers, from legacy/src/viz/w08.js.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import type { VizStep } from '@/lib/viz/types';

interface ComponentsDefInput {
  n: number;
  edges: number[][];
}

interface ComponentsDefStep extends VizStep {
  box: number[];
  seen: boolean[];
  comp: number[];
  count: number;
  cur?: number;
  done?: boolean;
  result?: number;
}

export // ---------- layouts ----------
function circle(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: n === 1 ? 0.5 : 0.5 + 0.45 * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / n),
    y: n === 1 ? 0.5 : 0.5 + 0.45 * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / n),
  }));
}

export function layered(n: number, edges: number[][]) {
  // longest-path layering for DAGs; falls back to circle on cycles
  const indeg = new Array(n).fill(0),
    adj: number[][] = Array.from({ length: n }, () => []);
  edges.forEach(([u, v]: number[]) => {
    adj[u].push(v);
    indeg[v]++;
  });
  const level = new Array(n).fill(0),
    q: number[] = [];
  indeg.forEach((d, i) => {
    if (!d) q.push(i);
  });
  let seen = 0;
  const deg = [...indeg];
  for (let h = 0; h < q.length; h++) {
    const u = q[h];
    seen++;
    for (const v of adj[u]) {
      level[v] = Math.max(level[v], level[u] + 1);
      if (--deg[v] === 0) q.push(v);
    }
  }
  if (seen < n) return circle(n);
  const maxL = Math.max(...level),
    byL: Record<string, number[]> = {};
  level.forEach((l, i) => (byL[l] = byL[l] || []).push(i));
  const pos = new Array(n);
  Object.entries(byL).forEach(([l, ids]) =>
    ids.forEach(
      (id, k) =>
        (pos[id] = {
          id,
          x: maxL ? Number(l) / maxL : 0.5,
          y: ids.length === 1 ? 0.5 : k / (ids.length - 1),
        }),
    ),
  );
  return pos;
}

export const edgeCheck = (n: number, edges: number[][]) =>
  !Number.isInteger(n) || n < 1 || n > 10
    ? 'Use 1–10 nodes.'
    : !Array.isArray(edges) ||
        edges.length > 16 ||
        edges.some((e) => !Array.isArray(e) || e.length < 2 || e[0] < 0 || e[1] < 0 || e[0] >= n || e[1] >= n)
      ? 'Edges look like [[0,1],[1,2]] with node numbers below n (at most 16 edges).'
      : null;

export const adjOf = (n: number, edges: number[][], directed: boolean) => {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    adj[u].push(v);
    if (!directed) adj[v].push(u);
  }
  return adj;
};

export function componentsDef(id: string, title: string, useStack: boolean) {
  return defineViz<ComponentsDefInput, ComponentsDefStep>(id, {
    title,
    inputs: [
      { key: 'n', label: 'n', type: 'int', def: 5 },
      {
        key: 'edges',
        label: 'undirected edges',
        type: 'json',
        def: [
          [0, 1],
          [1, 2],
          [3, 4],
        ],
        wide: true,
      },
    ],
    presets: [
      {
        label: 'Lesson 1–2 graph',
        input: {
          n: 5,
          edges: [
            [0, 1],
            [1, 2],
            [3, 4],
          ],
        },
      },
      {
        label: 'One component',
        input: {
          n: 6,
          edges: [
            [0, 1],
            [0, 2],
            [1, 3],
            [2, 4],
            [4, 5],
          ],
        },
      },
      { label: 'Isolated nodes', input: { n: 4, edges: [[1, 2]] } },
    ],
    legend: [
      ['current', 'popped / dequeued'],
      ['frontier', `in the ${useStack ? 'stack' : 'queue'}`],
      ['done', 'visited'],
    ],
    code: useStack
      ? `
let count = 0; const seen = new Array(n).fill(false);
for (let s = 0; s < n; s++) {
  if (seen[s]) continue;
  count++; seen[s] = true; const stack = [s];              // new component //@new
  while (stack.length) {
    const u = stack.pop();                                                  //@pop
    for (const v of adj[u]) if (!seen[v]) { seen[v] = true; stack.push(v); } //@push
  }
}`
      : `
let count = 0; const seen = new Array(n).fill(false);
for (let s = 0; s < n; s++) {
  if (seen[s]) continue;
  count++; seen[s] = true; const q = [s];                  // new component //@new
  for (let h = 0; h < q.length; h++) {
    const u = q[h];                                                         //@pop
    for (const v of adj[u]) if (!seen[v]) { seen[v] = true; q.push(v); }    //@push
  }
}`,
    validate: ({ n, edges }) => edgeCheck(n, edges),
    run({ n, edges }) {
      const adj = adjOf(n, edges, false),
        seen = new Array(n).fill(false),
        comp = new Array(n).fill(-1),
        steps: ComponentsDefStep[] = [];
      let count = 0;
      for (let s = 0; s < n; s++) {
        if (seen[s]) continue;
        count++;
        seen[s] = true;
        comp[s] = count - 1;
        const box = [s];
        steps.push({
          box: [...box],
          seen: [...seen],
          comp: [...comp],
          count,
          line: 'new',
          note: `Node ${s} is unvisited: component #${count} starts here.`,
        });
        let h = 0;
        while (useStack ? box.length : h < box.length) {
          const u = useStack ? box.pop() : box[h++];
          const added: number[] = [];
          for (const v of adj[u!])
            if (!seen[v]) {
              seen[v] = true;
              comp[v] = count - 1;
              box.push(v);
              added.push(v);
            }
          steps.push({
            box: useStack ? [...box] : box.slice(h),
            seen: [...seen],
            comp: [...comp],
            cur: u,
            count,
            line: ['pop', 'push'],
            note: `${useStack ? 'Pop' : 'Dequeue'} ${u}; ${added.length ? 'mark and ' + (useStack ? 'push' : 'enqueue') + ' ' + added.join(', ') : 'no unvisited neighbours'}.`,
            why:
              added.length && steps.length < 4
                ? 'Mark when pushing, not when popping: otherwise a node reachable from several neighbours is pushed several times.'
                : null,
          });
        }
      }
      steps.push({
        box: [],
        seen,
        comp,
        count,
        done: true,
        line: null,
        result: count,
        note: `${count} component${count === 1 ? '' : 's'}.`,
        why: 'Every node is marked once and every edge looked at twice: O(V + E).',
      });
      return steps;
    },
    view(st, stage, { n, edges }) {
      const states: Record<string, string> = {},
        subs: Record<string, string> = {};
      st.seen.forEach((s, i) => {
        if (s) {
          states[i] = 'done';
          subs[i] = 'c' + (st.comp[i] + 1);
        }
      });
      st.box.forEach((i) => (states[i] = 'frontier'));
      if (st.cur != null) states[st.cur] = 'current';
      stage.append(
        R.graph(
          { nodes: circle(n), edges: edges.map(([u, v]) => ({ u, v })) },
          { states, subs, w: 300, h: 230 },
        ),
      );
      stage.append(useStack ? R.stack(st.box) : R.queue(st.box));
      stage.append(R.vars({ components: st.count }));
    },
  });
}

export // ---------- grids ----------
const gridCheck = (gr: (number | string)[][], cells?: string[]) =>
  !Array.isArray(gr) || !gr.length || !gr.every((r) => Array.isArray(r) && r.length === gr[0].length)
    ? 'Enter a rectangular grid.'
    : gr.length * gr[0].length > 49
      ? 'Keep the grid to 49 cells (e.g. 7 × 7).'
      : cells && gr.flat().some((x) => !cells.includes(String(x)))
        ? 'Use only ' + cells.join(', ') + ' in the grid.'
        : null;

export const DIR4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
