// Ported from legacy/src/viz/w08.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { circle, edgeCheck, adjOf } from './_helpers';

interface Input {
  n: number;
  edges: number[][];
}

interface Step extends VizStep {
  color: number[];
  cur?: number;
  done?: boolean;
  result?: boolean;
  clash?: number[];
}

export default defineViz<Input, Step>('bipartite', {
  title: 'Bipartite check: 2-colour with BFS from every uncoloured node',
  inputs: [
    { key: 'n', label: 'n', type: 'int', def: 4 },
    {
      key: 'edges',
      label: 'undirected edges',
      type: 'json',
      def: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: '4-cycle (bipartite)',
      input: {
        n: 4,
        edges: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
        ],
      },
    },
    {
      label: 'Triangle (not bipartite)',
      input: {
        n: 3,
        edges: [
          [0, 1],
          [1, 2],
          [2, 0],
        ],
      },
    },
    {
      label: 'Disconnected',
      input: {
        n: 5,
        edges: [
          [0, 1],
          [2, 3],
          [3, 4],
          [4, 2],
        ],
      },
    },
  ],
  legend: [
    ['frontier', 'colour 0'],
    ['window', 'colour 1'],
    ['error', 'conflict'],
    ['current', 'being expanded'],
  ],
  code: `
const color = new Array(n).fill(-1);
for (let s = 0; s < n; s++) {
  if (color[s] !== -1) continue;                 // every component  //@start
  color[s] = 0; const q = [s];
  for (let h = 0; h < q.length; h++) {
    const u = q[h];
    for (const v of adj[u]) {
      if (color[v] === -1) { color[v] = 1 - color[u]; q.push(v); }  //@paint
      else if (color[v] === color[u]) return false;   // conflict  //@clash
    }
  }
}
return true;`,
  validate: ({ n, edges }) => edgeCheck(n, edges),
  run({ n, edges }) {
    const adj = adjOf(n, edges, false),
      color = new Array(n).fill(-1),
      steps: Step[] = [];
    for (let s = 0; s < n; s++) {
      if (color[s] !== -1) continue;
      color[s] = 0;
      const q = [s];
      steps.push({
        color: [...color],
        line: 'start',
        note: `Node ${s} is uncoloured: start a BFS and give it colour 0.`,
        why: s > 0 ? 'Disconnected graphs need a fresh start in each component.' : null,
      });
      for (let h = 0; h < q.length; h++) {
        const u = q[h];
        for (const v of adj[u]) {
          if (color[v] === -1) {
            color[v] = 1 - color[u];
            q.push(v);
            steps.push({
              color: [...color],
              cur: u,
              line: 'paint',
              note: `${v} is a neighbour of ${u} (colour ${color[u]}): it is forced to colour ${color[v]}.`,
            });
          } else if (color[v] === color[u]) {
            steps.push({
              color: [...color],
              cur: u,
              clash: [u, v],
              done: true,
              line: 'clash',
              result: false,
              note: `${u} and ${v} are neighbours with the same colour ${color[u]}: not bipartite.`,
              why: 'A conflict means an odd cycle: going around it, colours alternate an odd number of times and cannot match up.',
            });
            return steps;
          }
        }
      }
    }
    steps.push({
      color,
      done: true,
      line: null,
      result: true,
      note: 'Every edge joins different colours: bipartite.',
      why: 'O(V + E).',
    });
    return steps;
  },
  view(st, stage, { n, edges }) {
    const states: Record<string, string> = {};
    st.color.forEach((c, i) => {
      if (c === 0) states[i] = 'frontier';
      if (c === 1) states[i] = 'window';
    });
    if (st.cur != null) states[st.cur] = 'current';
    const es: Record<string, string> = {};
    if (st.clash) {
      st.clash.forEach((i) => (states[i] = 'error'));
      es[
        edges.findIndex(
          ([u, v]) =>
            (u === st.clash![0] && v === st.clash![1]) || (u === st.clash![1] && v === st.clash![0]),
        )
      ] = 'error';
    }
    stage.append(
      R.graph(
        { nodes: circle(n), edges: edges.map(([u, v]) => ({ u, v })) },
        { states, edgeStates: es, w: 300, h: 230 },
      ),
    );
  },
  random: (g) => {
    const n = rint(g, 1, 8);
    return {
      n,
      edges: Array.from({ length: rint(g, 0, 10) }, () => [rint(g, 0, n - 1), rint(g, 0, n - 1)]).filter(
        ([u, v]) => u !== v,
      ),
    };
  },
});
