// Ported from legacy/src/viz/w09.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { inf } from './_helpers';

interface Input {
  pts: number[][];
}

interface Step extends VizStep {
  best: number[];
  inT: boolean[];
  tree: number[][];
  cur?: number;
  cost: number;
  done?: boolean;
  result?: number;
}

export default defineViz<Input, Step>('prim-array', {
  title: "Prim's O(V²) version for a complete graph (Min Cost to Connect All Points)",
  inputs: [
    {
      key: 'pts',
      label: 'points [x, y]',
      type: 'json',
      def: [
        [0, 0],
        [2, 2],
        [3, 10],
        [5, 2],
        [7, 0],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'LeetCode 1584 example',
      input: {
        pts: [
          [0, 0],
          [2, 2],
          [3, 10],
          [5, 2],
          [7, 0],
        ],
      },
    },
    {
      label: 'Three points',
      input: {
        pts: [
          [3, 12],
          [-2, 5],
          [-4, 1],
        ],
      },
    },
    { label: 'One point', input: { pts: [[0, 0]] } },
  ],
  legend: [
    ['done', 'in the tree'],
    ['current', 'added now'],
    ['frontier', 'best distance to the tree'],
  ],
  code: `
const n = points.length, best = new Array(n).fill(Infinity), inTree = new Array(n).fill(false);
best[0] = 0; let cost = 0;
for (let k = 0; k < n; k++) {
  let u = -1;                                       // closest point not in the tree
  for (let i = 0; i < n; i++) if (!inTree[i] && (u < 0 || best[i] < best[u])) u = i;  //@pick
  inTree[u] = true; cost += best[u];                                                   //@add
  for (let v = 0; v < n; v++) if (!inTree[v]) best[v] = Math.min(best[v], dist(u, v)); //@update
}
return cost;`,
  validate: ({ pts }) =>
    !Array.isArray(pts) ||
    pts.length < 1 ||
    pts.length > 8 ||
    pts.some((p) => !Array.isArray(p) || p.length !== 2)
      ? 'Enter 1–8 points like [[0,0],[2,2]].'
      : null,
  run({ pts }) {
    const n = pts.length,
      d = (a: number, b: number) => Math.abs(pts[a][0] - pts[b][0]) + Math.abs(pts[a][1] - pts[b][1]);
    const best = new Array(n).fill(Infinity),
      from = new Array(n).fill(-1),
      inT = new Array(n).fill(false);
    best[0] = 0;
    let cost = 0;
    const tree: number[][] = [],
      steps: Step[] = [];
    for (let k = 0; k < n; k++) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!inT[i] && (u < 0 || best[i] < best[u])) u = i;
      inT[u] = true;
      cost += best[u];
      if (from[u] >= 0) tree.push([from[u], u, best[u]]);
      for (let v = 0; v < n; v++)
        if (!inT[v] && d(u, v) < best[v]) {
          best[v] = d(u, v);
          from[v] = u;
        }
      steps.push({
        best: [...best],
        inT: [...inT],
        tree: tree.map((x) => [...x]),
        cur: u,
        cost,
        line: ['pick', 'add', 'update'],
        note:
          k === 0
            ? `Start the tree at point 0.`
            : `Closest point outside the tree: ${u} (distance ${best[u]} via point ${from[u]}). Cost ${cost}.`,
        why:
          k === 1
            ? 'Every pair of points is an edge (n² edges), so scanning an array of n best distances each round (O(n²) total) beats a heap (O(n² log n)).'
            : null,
      });
    }
    steps.push({ best, inT, tree, cost, done: true, line: null, result: cost, note: `Total cost ${cost}.` });
    return steps;
  },
  view(st, stage, { pts }) {
    const xs = pts.map((p) => p[0]),
      ys = pts.map((p) => p[1]);
    const minx = Math.min(...xs),
      maxx = Math.max(...xs),
      miny = Math.min(...ys),
      maxy = Math.max(...ys);
    const nodes = pts.map((p, i) => ({
      id: i,
      x: maxx === minx ? 0.5 : (p[0] - minx) / (maxx - minx),
      y: maxy === miny ? 0.5 : 0.12 + 0.88 * (1 - (p[1] - miny) / (maxy - miny)),
    }));
    const states: Record<string, string> = {},
      subs: Record<string, number | string> = {};
    st.inT.forEach((t, i) => {
      states[i] = t ? 'done' : 'frontier';
      if (!t) subs[i] = inf(st.best[i]);
    });
    if (st.cur != null) states[st.cur] = 'current';
    stage.append(
      R.graph(
        { nodes, edges: st.tree.map(([u, v, w]) => ({ u, v, w })) },
        { states, subs, edgeStates: Object.fromEntries(st.tree.map((_, k) => [k, 'done'])), w: 340, h: 240 },
      ),
    );
    stage.append(R.vars({ cost: st.cost }));
  },
  random: (g) => ({ pts: Array.from({ length: rint(g, 1, 7) }, () => [rint(g, -9, 9), rint(g, -9, 9)]) }),
});
