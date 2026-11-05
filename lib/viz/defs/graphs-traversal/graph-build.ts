// Ported from legacy/src/viz/w08.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { circle, edgeCheck } from './_helpers';

interface Input {
  n: number;
  edges: number[][];
  dir: string;
}

interface Step extends VizStep {
  adj: number[][];
  k: number;
  done?: boolean;
  result?: number[][];
}

const adjView = (adj: number[][]) =>
  R.panel('adjacency list', R.codeLines(adj.map((a: number[], i: number) => i + ': [' + a.join(', ') + ']')));

export default defineViz<Input, Step>('graph-build', {
  title: 'From an edge list to an adjacency list',
  inputs: [
    { key: 'n', label: 'n (nodes 0..n−1)', type: 'int', def: 5 },
    {
      key: 'edges',
      label: 'edges',
      type: 'json',
      def: [
        [0, 1],
        [1, 2],
        [3, 4],
      ],
      wide: true,
    },
    {
      key: 'dir',
      label: 'edges are',
      type: 'select',
      def: 'undirected',
      options: [
        { value: 'undirected', label: 'undirected (push both ways)' },
        { value: 'directed', label: 'directed (u → v only)' },
      ],
    },
  ],
  presets: [
    {
      label: 'Lesson 1 graph (undirected)',
      input: {
        n: 5,
        edges: [
          [0, 1],
          [1, 2],
          [3, 4],
        ],
        dir: 'undirected',
      },
    },
    {
      label: 'Same edges, directed',
      input: {
        n: 5,
        edges: [
          [0, 1],
          [1, 2],
          [3, 4],
        ],
        dir: 'directed',
      },
    },
  ],
  legend: [['current', 'edge being added']],
  code: `
const adj = Array.from({ length: n }, () => []);     // one list per node   //@init
for (const [u, v] of edges) {
  adj[u].push(v);                                                          //@uv
  adj[v].push(u);                // undirected only: the reverse direction //@vu
}`,
  validate: ({ n, edges }) => edgeCheck(n, edges),
  run({ n, edges, dir }) {
    const adj: number[][] = Array.from({ length: n }, () => []),
      steps: Step[] = [];
    steps.push({
      adj: adj.map((a) => [...a]),
      k: -1,
      line: 'init',
      note: `${n} empty lists. Use Array.from with a function so every list is a different array (Module 1: the shared-row bug).`,
    });
    edges.forEach(([u, v], k) => {
      adj[u].push(v);
      if (dir === 'undirected') adj[v].push(u);
      steps.push({
        adj: adj.map((a) => [...a]),
        k,
        line: dir === 'undirected' ? ['uv', 'vu'] : 'uv',
        note:
          dir === 'undirected'
            ? `Edge ${u}–${v}: add ${v} to ${u}'s list and ${u} to ${v}'s.`
            : `Edge ${u} → ${v}: add ${v} to ${u}'s list only.`,
      });
    });
    steps.push({
      adj,
      k: edges.length,
      done: true,
      line: null,
      result: adj,
      note: `${edges.length} edges → ${adj.reduce((s, a) => s + a.length, 0)} list entries.`,
      why: 'O(V + E) space. Forgetting the reverse push for undirected edges is a classic bug (problem 1971).',
    });
    return steps;
  },
  view(st, stage, { n, edges, dir }) {
    const es: Record<string, string> = {};
    if (st.k >= 0 && st.k < edges.length) es[st.k] = 'current';
    stage.append(
      R.graph(
        { nodes: circle(n), edges: edges.map(([u, v]) => ({ u, v })), directed: dir === 'directed' },
        { edgeStates: es, w: 300, h: 220 },
      ),
    );
    stage.append(adjView(st.adj));
  },
  random: (g) => {
    const n = rint(g, 1, 8);
    return {
      n,
      edges: Array.from({ length: rint(g, 0, 10) }, () => [rint(g, 0, n - 1), rint(g, 0, n - 1)]),
      dir: g() < 0.5 ? 'directed' : 'undirected',
    };
  },
});
