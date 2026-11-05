// Ported from legacy/src/viz/w09.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { circle, inf, wCheck } from './_helpers';

interface Input {
  n: number;
  edges: number[][];
  src: number;
}

interface Step extends VizStep {
  dist: number[];
  heap: number[][];
  done: Set<number>;
  cur?: number;
  stale?: number[];
  finished?: boolean;
  result?: number[];
}

export default defineViz<Input, Step>('dijkstra', {
  title: 'Dijkstra with a min-heap and lazy deletion',
  inputs: [
    { key: 'n', label: 'n (nodes 1..n)', type: 'int', def: 5 },
    {
      key: 'edges',
      label: 'directed edges [u, v, w]',
      type: 'json',
      def: [
        [1, 2, 4],
        [1, 3, 1],
        [3, 2, 2],
        [2, 4, 1],
        [3, 4, 5],
        [4, 5, 3],
      ],
      wide: true,
    },
    { key: 'src', label: 'source', type: 'int', def: 1 },
  ],
  presets: [
    {
      label: 'Lesson 1: 5-node graph',
      input: {
        n: 5,
        edges: [
          [1, 2, 4],
          [1, 3, 1],
          [3, 2, 2],
          [2, 4, 1],
          [3, 4, 5],
          [4, 5, 3],
        ],
        src: 1,
      },
    },
    {
      label: 'Handbook 743 dry run',
      input: {
        n: 4,
        edges: [
          [2, 1, 1],
          [2, 3, 1],
          [3, 4, 1],
        ],
        src: 2,
      },
    },
    { label: 'Unreachable node', input: { n: 3, edges: [[1, 2, 7]], src: 1 } },
  ],
  legend: [
    ['current', 'popped now'],
    ['done', 'finalised'],
    ['frontier', 'tentative distance'],
    ['dim', 'stale heap entry'],
  ],
  code: `
dist.fill(Infinity); dist[src] = 0; heap.push([0, src]);            //@init
while (heap.size()) {
  const [d, u] = heap.pop();                                        //@pop
  if (d > dist[u]) continue;            // stale: already improved  //@stale
  for (const [v, w] of adj[u]) {
    if (d + w < dist[v]) {                                          //@relax
      dist[v] = d + w; heap.push([dist[v], v]);                     //@push
    }
  }
}`,
  validate: ({ n, edges, src }) =>
    wCheck(n, edges, 1) || (src < 1 || src > n ? 'The source must be a node.' : null),
  run({ n, edges, src }) {
    const adj: number[][][] = Array.from({ length: n + 1 }, () => []);
    edges.forEach(([u, v, w]) => adj[u].push([v, w]));
    const dist = new Array(n + 1).fill(Infinity);
    dist[src] = 0;
    const done: Set<number> = new Set();
    const heap = [[0, src]];
    const steps: Step[] = [];
    const sortH = () => heap.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    steps.push({
      dist: [...dist],
      heap: heap.map((x) => [...x]),
      done: new Set(done),
      line: 'init',
      note: `dist[${src}] = 0, everything else ∞. Heap: [0, ${src}].`,
    });
    while (heap.length) {
      const [d, u] = heap.shift()!;
      if (d > dist[u]) {
        steps.push({
          dist: [...dist],
          heap: heap.map((x) => [...x]),
          done: new Set(done),
          cur: u,
          stale: [d, u],
          line: ['pop', 'stale'],
          note: `Pop [${d}, ${u}]: stale, because dist[${u}] is already ${dist[u]}. Skip it.`,
          why: 'JavaScript heaps have no decrease-key, so improved distances are pushed again and the old entries are skipped when they surface.',
        });
        continue;
      }
      done.add(u);
      const relaxed: string[] = [];
      for (const [v, w] of adj[u])
        if (d + w < dist[v]) {
          dist[v] = d + w;
          heap.push([dist[v], v]);
          relaxed.push(`${v}: ${dist[v]}`);
        }
      sortH();
      steps.push({
        dist: [...dist],
        heap: heap.map((x) => [...x]),
        done: new Set(done),
        cur: u,
        line: ['pop', 'relax', 'push'],
        note: `Pop [${d}, ${u}]: ${u} is final at distance ${d}. ${relaxed.length ? 'Relax: ' + relaxed.join(', ') + '.' : 'No improvements.'}`,
        why:
          done.size === 1
            ? 'The popped node has the smallest tentative distance; any other route to it would pass through a node at least as far and add non-negative weights, so it cannot be shorter.'
            : null,
      });
    }
    const res = dist.slice(1);
    steps.push({
      dist,
      heap: [],
      done,
      line: null,
      finished: true,
      result: res,
      note: `Distances from ${src}: ${res.map((d, i) => i + 1 + '=' + inf(d)).join(', ')}.`,
      why: 'O((V + E) log V) with a binary heap. Negative weights would break the "popped means final" argument.',
    });
    return steps;
  },
  view(st, stage, { n, edges }) {
    const states: Record<string, string> = {},
      subs: Record<string, number | string> = {};
    for (let i = 1; i <= n; i++) {
      subs[i] = inf(st.dist[i]);
      if (st.done.has(i)) states[i] = 'done';
      else if (st.dist[i] !== Infinity) states[i] = 'frontier';
    }
    if (st.cur != null) states[st.cur] = st.stale ? 'dim' : 'current';
    stage.append(
      R.graph(
        { nodes: circle(n, 1), edges: edges.map(([u, v, w]) => ({ u, v, w })), directed: true },
        { states, subs, w: 360, h: 250 },
      ),
    );
    stage.append(
      R.queue(
        st.heap.map(([d, v]) => '[' + d + ', ' + v + ']'),
        { label: 'heap (smallest first)' },
      ),
    );
  },
  random: (g) => {
    const n = rint(g, 1, 7);
    return {
      n,
      src: rint(g, 1, n),
      edges: Array.from({ length: rint(g, 0, 14) }, () => [rint(g, 1, n), rint(g, 1, n), rint(g, 0, 9)]),
    };
  },
});
