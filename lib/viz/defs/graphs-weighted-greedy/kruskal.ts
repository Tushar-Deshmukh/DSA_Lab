// Ported from legacy/src/viz/w09.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { circle, wCheck } from './_helpers';

interface Input {
  n: number;
  edges: number[][];
}

interface Step extends VizStep {
  es: Record<string, string>;
  cost: number;
  used: number;
  cur?: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('kruskal', {
  title: "Kruskal's MST: cheapest edges first, skip any that close a cycle",
  inputs: [
    { key: 'n', label: 'n (nodes 0..n−1)', type: 'int', def: 5 },
    {
      key: 'edges',
      label: 'undirected edges [u, v, w]',
      type: 'json',
      def: [
        [0, 1, 4],
        [0, 2, 1],
        [1, 2, 2],
        [1, 3, 5],
        [2, 3, 8],
        [3, 4, 3],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'Lesson 3: 5 nodes',
      input: {
        n: 5,
        edges: [
          [0, 1, 4],
          [0, 2, 1],
          [1, 2, 2],
          [1, 3, 5],
          [2, 3, 8],
          [3, 4, 3],
        ],
      },
    },
    {
      label: 'Square with a diagonal',
      input: {
        n: 4,
        edges: [
          [0, 1, 1],
          [1, 2, 1],
          [2, 3, 1],
          [3, 0, 1],
          [0, 2, 1],
        ],
      },
    },
    {
      label: 'Disconnected',
      input: {
        n: 4,
        edges: [
          [0, 1, 2],
          [2, 3, 5],
        ],
      },
    },
  ],
  legend: [
    ['done', 'in the MST'],
    ['current', 'considered now'],
    ['error', 'would close a cycle'],
  ],
  code: `
edges.sort((a, b) => a[2] - b[2]);               // by weight      //@sort
const dsu = new DSU(n); let cost = 0, used = 0;
for (const [u, v, w] of edges) {
  if (dsu.union(u, v)) { cost += w; used++; }   // joins two trees //@take
  // else: u and v are already connected → skip                    //@skip
}
return used === n - 1 ? cost : -1;              // -1: not connected //@ret`,
  validate: ({ n, edges }) => wCheck(n, edges, 0),
  run({ n, edges }) {
    const order = edges.map((e, i) => [...e, i]).sort((a, b) => a[2] - b[2] || a[3] - b[3]);
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (x: number) => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    const es: Record<string, string> = {},
      steps: Step[] = [];
    let cost = 0,
      used = 0;
    steps.push({
      es: { ...es },
      cost,
      used,
      line: 'sort',
      note: `Sorted by weight: ${order.map((e) => e[0] + '–' + e[1] + '(' + e[2] + ')').join(', ')}.`,
    });
    for (const [u, v, w, k] of order) {
      const ru = find(u),
        rv = find(v);
      if (ru !== rv) {
        parent[ru] = rv;
        cost += w;
        used++;
        es[k] = 'done';
        steps.push({
          es: { ...es },
          cur: k,
          cost,
          used,
          line: 'take',
          note: `${u}–${v} (${w}) joins two different trees: take it. Cost ${cost}.`,
          why:
            used === 1
              ? 'Cut property: the cheapest edge leaving any group of vertices belongs to some MST, so a cheapest edge between two trees is always safe to take.'
              : null,
        });
      } else {
        es[k] = 'error';
        steps.push({
          es: { ...es },
          cur: k,
          cost,
          used,
          line: 'skip',
          note: `${u}–${v} (${w}): ${u} and ${v} are already connected; it would close a cycle. Skip.`,
        });
      }
      if (used === n - 1) break;
    }
    const ok = used === n - 1;
    steps.push({
      es,
      cost,
      used,
      done: true,
      line: 'ret',
      result: ok ? cost : -1,
      note: ok
        ? `MST with ${used} edges, total ${cost}.`
        : `Only ${used} edges fit: the graph is not connected (−1).`,
      why: 'O(E log E) for the sort; the DSU work is nearly O(E).',
    });
    return steps;
  },
  view(st, stage, { n, edges }) {
    const est = { ...st.es };
    if (st.cur != null && !est[st.cur]) est[st.cur] = 'current';
    stage.append(
      R.graph(
        { nodes: circle(n), edges: edges.map(([u, v, w]) => ({ u, v, w })) },
        { edgeStates: est, w: 340, h: 240 },
      ),
    );
    stage.append(R.vars({ 'MST cost': st.cost, 'edges used': st.used + ' / ' + (n - 1) }));
  },
  random: (g) => {
    const n = rint(g, 1, 7);
    return {
      n,
      edges: Array.from({ length: rint(g, 0, 14) }, () => [
        rint(g, 0, n - 1),
        rint(g, 0, n - 1),
        rint(g, 0, 9),
      ]),
    };
  },
});
