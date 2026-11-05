// Ported from legacy/src/viz/w08.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { layered, edgeCheck } from './_helpers';

interface Input {
  n: number;
  pre: number[][];
}

interface Step extends VizStep {
  indeg: number[];
  queue: number[];
  head: number;
  order: number[];
  cur?: number;
  done?: boolean;
  cyc?: boolean;
  result?: number[];
}

// ---------- directed graphs ----------
export default defineViz<Input, Step>('kahn', {
  title: "Kahn's algorithm: repeatedly take a node with in-degree 0",
  inputs: [
    { key: 'n', label: 'numCourses', type: 'int', def: 4 },
    {
      key: 'pre',
      label: 'prerequisites [course, pre]',
      type: 'json',
      def: [
        [1, 0],
        [2, 0],
        [3, 1],
        [3, 2],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'Handbook 4-course example',
      input: {
        n: 4,
        pre: [
          [1, 0],
          [2, 0],
          [3, 1],
          [3, 2],
        ],
      },
    },
    {
      label: 'A cycle',
      input: {
        n: 3,
        pre: [
          [1, 0],
          [2, 1],
          [0, 2],
        ],
      },
    },
    {
      label: 'Two chains',
      input: {
        n: 6,
        pre: [
          [1, 0],
          [2, 1],
          [4, 3],
          [5, 4],
          [5, 2],
        ],
      },
    },
  ],
  legend: [
    ['frontier', 'in the queue (in-degree 0)'],
    ['current', 'taken now'],
    ['done', 'in the order'],
    ['error', 'blocked by a cycle'],
  ],
  code: `
for (const [course, pre] of prerequisites) {      // [a, b]: b before a
  adj[pre].push(course); indeg[course]++;                              //@build
}
for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);         //@start
for (let head = 0; head < queue.length; head++) {
  const u = queue[head]; order.push(u);                                //@take
  for (const v of adj[u]) if (--indeg[v] === 0) queue.push(v);         //@relax
}
return order.length === n ? order : [];   // fewer = a cycle           //@ret`,
  validate: ({ n, pre }) => edgeCheck(n, pre),
  run({ n, pre }) {
    const adj: number[][] = Array.from({ length: n }, () => []),
      indeg = new Array(n).fill(0),
      steps: Step[] = [];
    for (const [c, p] of pre) {
      adj[p].push(c);
      indeg[c]++;
    }
    const queue: number[] = [];
    for (let i = 0; i < n; i++) if (!indeg[i]) queue.push(i);
    const order: number[] = [];
    steps.push({
      indeg: [...indeg],
      queue: [...queue],
      head: 0,
      order: [],
      line: ['build', 'start'],
      note: `Edges pre → course. In-degrees [${indeg.join(', ')}]. Start with every node of in-degree 0: ${queue.join(', ') || 'none'}.`,
      why: '[a, b] means "b before a", so the edge goes b → a. Reversing it is the most common bug in 207.',
    });
    for (let head = 0; head < queue.length; head++) {
      const u = queue[head];
      order.push(u);
      const freed: number[] = [];
      for (const v of adj[u])
        if (--indeg[v] === 0) {
          queue.push(v);
          freed.push(v);
        }
      steps.push({
        indeg: [...indeg],
        queue: [...queue],
        head: head + 1,
        order: [...order],
        cur: u,
        line: ['take', 'relax'],
        note: `Take ${u}. Decrement its successors${adj[u].length ? ' (' + adj[u].join(', ') + ')' : ''}${freed.length ? '; now free: ' + freed.join(', ') : ''}.`,
        why:
          head === 0 ? 'A node with in-degree 0 has no unmet prerequisites, so it can always go next.' : null,
      });
    }
    const ok = order.length === n;
    steps.push({
      indeg,
      queue,
      head: queue.length,
      order,
      done: true,
      cyc: !ok,
      line: 'ret',
      result: ok ? order : [],
      note: ok
        ? `Order: [${order.join(', ')}].`
        : `Only ${order.length} of ${n} nodes were taken: the rest are on or behind a cycle. Return [].`,
      why: 'O(V + E). The order is one valid answer; others may exist.',
    });
    return steps;
  },
  view(st, stage, { n, pre }) {
    const edges = pre.map(([c, p]) => [p, c]);
    const states: Record<string, string> = {},
      subs: Record<string, string> = {};
    for (let i = 0; i < n; i++) {
      subs[i] = 'in ' + st.indeg[i];
      if (st.cyc && !st.order.includes(i)) states[i] = 'error';
    }
    st.order.forEach((i) => (states[i] = 'done'));
    st.queue.slice(st.head).forEach((i) => (states[i] = 'frontier'));
    if (st.cur != null) states[st.cur] = 'current';
    stage.append(
      R.graph(
        { nodes: layered(n, edges), edges: edges.map(([u, v]) => ({ u, v })), directed: true },
        { states, subs, w: 380, h: 230 },
      ),
    );
    stage.append(R.queue(st.queue.slice(st.head)));
    stage.append(R.cells(st.order, { label: 'order', noIndex: true }));
  },
  random: (g) => {
    const n = rint(g, 1, 8);
    return { n, pre: Array.from({ length: rint(g, 0, 10) }, () => [rint(g, 0, n - 1), rint(g, 0, n - 1)]) };
  },
});
