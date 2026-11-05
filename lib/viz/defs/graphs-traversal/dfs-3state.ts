// Ported from legacy/src/viz/w08.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { layered, edgeCheck, adjOf } from './_helpers';

interface Input {
  n: number;
  edges: number[][];
}

interface Step extends VizStep {
  state: number[];
  cur?: number;
  cycle?: number[] | null;
  done?: boolean;
  result?: boolean;
  back?: number[];
}

export default defineViz<Input, Step>('dfs-3state', {
  title: 'Directed cycle detection: three states, not two',
  inputs: [
    { key: 'n', label: 'n', type: 'int', def: 4 },
    {
      key: 'edges',
      label: 'directed edges [u, v]',
      type: 'json',
      def: [
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 3],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'Diamond (no cycle)',
      input: {
        n: 4,
        edges: [
          [0, 1],
          [0, 2],
          [1, 3],
          [2, 3],
        ],
      },
    },
    {
      label: '3-cycle',
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
      label: 'Cycle off to the side',
      input: {
        n: 5,
        edges: [
          [0, 1],
          [1, 2],
          [3, 4],
          [4, 3],
        ],
      },
    },
  ],
  legend: [
    ['frontier', 'state 1: on the current path'],
    ['done', 'state 2: finished, safe'],
    ['error', 'back edge: cycle'],
  ],
  code: `
function dfs(u) {
  state[u] = 1;                                   // on the current path  //@enter
  for (const v of adj[u]) {
    if (state[v] === 1) return true;              // back edge: cycle     //@back
    if (state[v] === 0 && dfs(v)) return true;                            //@rec
  }
  state[u] = 2;                                   // fully processed      //@done
  return false;
}`,
  validate: ({ n, edges }) => edgeCheck(n, edges),
  run({ n, edges }) {
    const adj = adjOf(n, edges, true),
      state = new Array(n).fill(0),
      steps: Step[] = [];
    let cycle: number[] | null = null;
    function dfs(u: number) {
      state[u] = 1;
      steps.push({
        state: [...state],
        cur: u,
        line: 'enter',
        note: `Enter ${u}: state 1 (on the current path).`,
      });
      for (const v of adj[u]) {
        if (state[v] === 1) {
          cycle = [u, v];
          steps.push({
            state: [...state],
            cur: u,
            back: [u, v],
            line: 'back',
            note: `Edge ${u} → ${v}, and ${v} is still on the current path: a cycle.`,
          });
          return true;
        }
        if (state[v] === 2)
          steps.push({
            state: [...state],
            cur: u,
            line: 'rec',
            note: `Edge ${u} → ${v}: ${v} is finished (state 2). Already known to be safe; skip it.`,
            why: 'With only "visited / not visited", this edge would look like a cycle. In the diamond, 3 is reached twice through different paths, and that is not a cycle.',
          });
        if (state[v] === 0 && dfs(v)) return true;
      }
      state[u] = 2;
      steps.push({
        state: [...state],
        cur: u,
        line: 'done',
        note: `All of ${u}'s descendants are done: state 2.`,
      });
      return false;
    }
    let found = false;
    for (let i = 0; i < n && !found; i++) if (state[i] === 0 && dfs(i)) found = true;
    steps.push({
      state,
      cycle,
      done: true,
      line: null,
      result: found,
      note: found ? 'Cycle found.' : 'No cycle: the graph is a DAG.',
      why: 'O(V + E). State 1 means "an ancestor on the current path"; only an edge back to such a node closes a cycle.',
    });
    return steps;
  },
  view(st, stage, { n, edges }) {
    const states: Record<string, string> = {};
    st.state.forEach((s, i) => {
      if (s === 1) states[i] = 'frontier';
      if (s === 2) states[i] = 'done';
    });
    if (st.cur != null && st.state[st.cur] === 1) states[st.cur] = 'current';
    const es: Record<string, string> = {};
    if (st.back) {
      const k = edges.findIndex(([u, v]) => u === st.back![0] && v === st.back![1]);
      es[k] = 'error';
      states[st.back[1]] = 'error';
    }
    stage.append(
      R.graph(
        { nodes: layered(n, edges), edges: edges.map(([u, v]) => ({ u, v })), directed: true },
        {
          states,
          edgeStates: es,
          subs: Object.fromEntries(st.state.map((s, i) => [i, 's' + s])),
          w: 360,
          h: 220,
        },
      ),
    );
  },
  random: (g) => {
    const n = rint(g, 1, 8);
    return { n, edges: Array.from({ length: rint(g, 0, 10) }, () => [rint(g, 0, n - 1), rint(g, 0, n - 1)]) };
  },
});
