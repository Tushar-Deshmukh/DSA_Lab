// Ported from legacy/src/viz/w09.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  n: number;
  ops: [string, ...number[]][];
}

interface Step extends VizStep {
  parent: number[];
  comps: number;
  hot?: number;
  linked?: number;
  out: (number | boolean)[];
  path?: number[];
  bad?: number[];
  done?: boolean;
  result?: { out: (number | boolean)[]; comps: number };
}

export default defineViz<Input, Step>('dsu', {
  title: 'Union-Find: find with path halving, union by size',
  inputs: [
    { key: 'n', label: 'n', type: 'int', def: 6 },
    {
      key: 'ops',
      label: 'operations ["union",a,b] / ["find",x]',
      type: 'json',
      def: [
        ['union', 0, 1],
        ['union', 2, 3],
        ['union', 1, 3],
        ['union', 4, 5],
        ['find', 3],
        ['union', 0, 2],
        ['union', 3, 5],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'Merge and query',
      input: {
        n: 6,
        ops: [
          ['union', 0, 1],
          ['union', 2, 3],
          ['union', 1, 3],
          ['union', 4, 5],
          ['find', 3],
          ['union', 0, 2],
          ['union', 3, 5],
        ],
      },
    },
    {
      label: 'Redundant edge (684)',
      input: {
        n: 4,
        ops: [
          ['union', 1, 2],
          ['union', 1, 3],
          ['union', 2, 3],
        ],
      },
    },
    {
      label: 'Union by size keeps trees flat',
      input: {
        n: 5,
        ops: [
          ['union', 0, 1],
          ['union', 1, 2],
          ['union', 2, 3],
          ['union', 3, 4],
          ['find', 4],
        ],
      },
    },
  ],
  legend: [
    ['current', 'root / result'],
    ['compare', 'path walked'],
    ['error', 'already connected'],
  ],
  code: `
find(x) {
  while (this.parent[x] !== x) {
    this.parent[x] = this.parent[this.parent[x]];   // path halving  //@halve
    x = this.parent[x];
  }
  return x;                                                          //@root
}
union(a, b) {
  let ra = this.find(a), rb = this.find(b);
  if (ra === rb) return false;            // already connected       //@same
  if (this.size[ra] < this.size[rb]) [ra, rb] = [rb, ra];
  this.parent[rb] = ra; this.size[ra] += this.size[rb];  // small under large //@link
  this.components--; return true;
}`,
  validate: ({ n, ops }) =>
    n < 1 || n > 10
      ? 'Use 1–10 elements.'
      : !Array.isArray(ops) ||
          ops.length > 12 ||
          ops.some(
            (o) =>
              !((o[0] === 'union' && o.length === 3) || (o[0] === 'find' && o.length === 2)) ||
              (o.slice(1) as number[]).some((x) => x < 0 || x >= n),
          )
        ? 'Operations look like ["union", 0, 1] or ["find", 3], at most 12.'
        : null,
  run({ n, ops }) {
    const parent = Array.from({ length: n }, (_, i) => i),
      size = new Array(n).fill(1);
    let comps = n;
    const steps: Step[] = [],
      out: (number | boolean)[] = [];
    const find = (x: number, path: number[]) => {
      while (parent[x] !== x) {
        path.push(x);
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    for (const op of ops) {
      if (op[0] === 'find') {
        const path: number[] = [];
        const r = find(op[1], path);
        out.push(r);
        steps.push({
          parent: [...parent],
          comps,
          hot: r,
          path,
          line: ['halve', 'root'],
          out: [...out],
          note: `find(${op[1]}) = ${r}${path.length ? '; walked ' + path.join(' → ') + ' and halved the path on the way' : ''}.`,
          why:
            path.length > 1
              ? 'Path halving points each visited node at its grandparent, so the next find on this path is shorter.'
              : null,
        });
        continue;
      }
      const [, a, b] = op;
      const p1: number[] = [],
        p2: number[] = [];
      let ra = find(a, p1),
        rb = find(b, p2);
      if (ra === rb) {
        out.push(false);
        steps.push({
          parent: [...parent],
          comps,
          hot: ra,
          bad: [a, b],
          line: 'same',
          out: [...out],
          note: `union(${a}, ${b}): both already have root ${ra}. Return false.`,
          why: 'In 684 this is exactly the redundant edge: it would close a cycle.',
        });
        continue;
      }
      if (size[ra] < size[rb]) [ra, rb] = [rb, ra];
      parent[rb] = ra;
      size[ra] += size[rb];
      comps--;
      out.push(true);
      steps.push({
        parent: [...parent],
        comps,
        hot: ra,
        linked: rb,
        line: 'link',
        out: [...out],
        note: `union(${a}, ${b}): attach root ${rb} (size ${size[rb]}) under root ${ra} (size now ${size[ra]}). Components: ${comps}.`,
        why: 'Attaching the smaller tree under the larger keeps trees shallow: with path compression every operation is O(α(n)), effectively constant.',
      });
    }
    steps.push({
      parent,
      comps,
      line: null,
      done: true,
      out,
      result: { out, comps },
      note: `${comps} set${comps === 1 ? '' : 's'} remain.`,
    });
    return steps;
  },
  view(st, stage, { n }) {
    const nodes = st.parent.map((p, i) => ({ id: i, label: String(i), parent: p === i ? 'R' : p }));
    const forest: { id: number | string; label: string; parent: number | string | null; ghost?: boolean }[] =
      [{ id: 'R', label: '', parent: null, ghost: true }, ...nodes];
    const states: Record<string, string> = {};
    if (st.hot != null) states[st.hot] = 'current';
    (st.path || []).forEach((x) => (states[x] = 'compare'));
    if (st.bad) st.bad.forEach((x) => (states[x] = 'error'));
    stage.append(
      R.tree(
        forest.map((f) => ({ ...f, state: states[f.id] })),
        { dx: 44, dy: 50, r: 16, label: 'forest (each tree is a set; roots at the top)' },
      ),
    );
    stage.append(
      R.cells(st.parent, {
        states: Object.fromEntries(Object.entries(states).filter(([k]) => k !== 'R')),
        label: 'parent[]',
      }),
    );
    stage.append(R.vars({ components: st.comps }));
  },
  random: (g) => {
    const n = rint(g, 1, 8);
    return {
      n,
      ops: Array.from({ length: rint(g, 0, 12) }, () =>
        g() < 0.7 ? ['union', rint(g, 0, n - 1), rint(g, 0, n - 1)] : ['find', rint(g, 0, n - 1)],
      ),
    };
  },
});
