// Ported from legacy/src/viz/w09.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { circle, inf, wCheck } from './_helpers';

interface Input {
  n: number;
  flights: number[][];
  src: number;
  dst: number;
  k: number;
}

interface Step extends VizStep {
  dist: number[];
  round: number;
  imp: number[];
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('bellman-k', {
  title: 'Cheapest flights within k stops: k + 1 rounds of relaxation',
  inputs: [
    { key: 'n', label: 'n (cities 0..n−1)', type: 'int', def: 4 },
    {
      key: 'flights',
      label: 'flights [from, to, price]',
      type: 'json',
      def: [
        [0, 1, 100],
        [1, 2, 100],
        [2, 0, 100],
        [1, 3, 600],
        [2, 3, 200],
      ],
      wide: true,
    },
    { key: 'src', label: 'src', type: 'int', def: 0 },
    { key: 'dst', label: 'dst', type: 'int', def: 3 },
    { key: 'k', label: 'k (stops)', type: 'int', def: 1 },
  ],
  presets: [
    {
      label: 'LeetCode example 1 (k = 1)',
      input: {
        n: 4,
        flights: [
          [0, 1, 100],
          [1, 2, 100],
          [2, 0, 100],
          [1, 3, 600],
          [2, 3, 200],
        ],
        src: 0,
        dst: 3,
        k: 1,
      },
    },
    {
      label: 'Same, k = 2',
      input: {
        n: 4,
        flights: [
          [0, 1, 100],
          [1, 2, 100],
          [2, 0, 100],
          [1, 3, 600],
          [2, 3, 200],
        ],
        src: 0,
        dst: 3,
        k: 2,
      },
    },
    {
      label: 'k = 0',
      input: {
        n: 3,
        flights: [
          [0, 1, 100],
          [1, 2, 100],
          [0, 2, 500],
        ],
        src: 0,
        dst: 2,
        k: 0,
      },
    },
  ],
  legend: [
    ['current', 'improved this round'],
    ['done', 'reached'],
  ],
  code: `
let dist = new Array(n).fill(Infinity); dist[src] = 0;
for (let round = 0; round <= k; round++) {        // at most k + 1 flights
  const next = dist.slice();                     // read OLD values only  //@copy
  for (const [u, v, p] of flights)
    if (dist[u] + p < next[v]) next[v] = dist[u] + p;                     //@relax
  dist = next;
}
return dist[dst] === Infinity ? -1 : dist[dst];                           //@ret`,
  validate: ({ n, flights, src, dst, k }) =>
    wCheck(n, flights, 0) ||
    (src < 0 || src >= n || dst < 0 || dst >= n
      ? 'src and dst must be cities.'
      : k < 0 || k > 6
        ? 'Use 0 ≤ k ≤ 6.'
        : null),
  run({ n, flights, src, dst, k }) {
    let dist = new Array(n).fill(Infinity);
    dist[src] = 0;
    const steps: Step[] = [];
    steps.push({
      dist: [...dist],
      round: -1,
      imp: [],
      line: 'copy',
      note: `dist[${src}] = 0. Each round allows one more flight.`,
    });
    for (let r = 0; r <= k; r++) {
      const next = dist.slice(),
        imp: number[] = [];
      for (const [u, v, p] of flights)
        if (dist[u] + p < next[v]) {
          next[v] = dist[u] + p;
          imp.push(v);
        }
      dist = next;
      steps.push({
        dist: [...dist],
        round: r,
        imp,
        line: ['copy', 'relax'],
        note: `Round ${r + 1} (paths with ≤ ${r + 1} flight${r ? 's' : ''}): ${imp.length ? 'improved ' + [...new Set(imp)].map((v) => v + ' → ' + dist[v]).join(', ') : 'no change'}.`,
        why:
          r === 0
            ? 'Reading from the copy of last round stops a single round from chaining two new flights, which would exceed the stop limit.'
            : null,
      });
    }
    const ans = dist[dst] === Infinity ? -1 : dist[dst];
    steps.push({
      dist,
      round: k,
      imp: [],
      done: true,
      line: 'ret',
      result: ans,
      note: ans < 0 ? `No route to ${dst} with ≤ ${k} stops.` : `Cheapest with ≤ ${k} stops: ${ans}.`,
      why: 'Dijkstra fails here: the cheapest path to an intermediate city may use too many stops, while a pricier one with fewer stops is the one that leads to the answer. O(k · E).',
    });
    return steps;
  },
  view(st, stage, { n, flights }) {
    const states: Record<string, string> = {},
      subs: Record<string, number | string> = {};
    for (let i = 0; i < n; i++) {
      subs[i] = inf(st.dist[i]);
      if (st.dist[i] !== Infinity) states[i] = 'done';
    }
    st.imp.forEach((v) => (states[v] = 'current'));
    stage.append(
      R.graph(
        { nodes: circle(n), edges: flights.map(([u, v, w]) => ({ u, v, w })), directed: true },
        { states, subs, w: 340, h: 240 },
      ),
    );
    stage.append(R.vars({ round: st.round + 1 }));
  },
  random: (g) => {
    const n = rint(g, 1, 6);
    return {
      n,
      src: rint(g, 0, n - 1),
      dst: rint(g, 0, n - 1),
      k: rint(g, 0, 4),
      flights: Array.from({ length: rint(g, 0, 12) }, () => [
        rint(g, 0, n - 1),
        rint(g, 0, n - 1),
        rint(g, 1, 9),
      ]),
    };
  },
});
