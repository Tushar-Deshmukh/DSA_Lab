// Ported from legacy/src/viz/w04.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  cap: number;
  ops: [string, ...number[]][];
}

interface Step extends VizStep {
  order: number[];
  vals: number[][];
  op?: [string, ...number[]];
  hot?: number;
  ev?: number | null;
  results: (number | null)[];
  done?: boolean;
  result?: (number | null)[];
}

// ---------- LRU cache ----------
export default defineViz<Input, Step>('lru', {
  title: 'LRU cache: Map for lookup, doubly linked list for recency',
  inputs: [
    { key: 'cap', label: 'capacity', type: 'int', def: 2 },
    {
      key: 'ops',
      label: 'operations ["put",k,v] / ["get",k]',
      type: 'json',
      def: [
        ['put', 1, 1],
        ['put', 2, 2],
        ['get', 1],
        ['put', 3, 3],
        ['get', 2],
        ['put', 4, 4],
        ['get', 1],
        ['get', 3],
        ['get', 4],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'LeetCode example',
      input: {
        cap: 2,
        ops: [
          ['put', 1, 1],
          ['put', 2, 2],
          ['get', 1],
          ['put', 3, 3],
          ['get', 2],
          ['put', 4, 4],
          ['get', 1],
          ['get', 3],
          ['get', 4],
        ],
      },
    },
    {
      label: 'Update an existing key',
      input: {
        cap: 2,
        ops: [
          ['put', 1, 1],
          ['put', 2, 2],
          ['put', 1, 10],
          ['put', 3, 3],
          ['get', 1],
          ['get', 2],
        ],
      },
    },
    {
      label: 'Capacity 1',
      input: {
        cap: 1,
        ops: [
          ['put', 2, 1],
          ['get', 2],
          ['put', 3, 2],
          ['get', 2],
          ['get', 3],
        ],
      },
    },
  ],
  legend: [
    ['current', 'just used (moved to front)'],
    ['error', 'evicted'],
  ],
  code: `
get(key) {
  const node = this.map.get(key);
  if (!node) return -1;                                  //@miss
  this.#remove(node); this.#addFront(node);  // now MRU  //@touch
  return node.val;
}
put(key, value) {
  if (this.map.has(key)) this.#remove(this.map.get(key)); //@old
  const node = { key, val: value, prev: null, next: null };
  this.#addFront(node); this.map.set(key, node);          //@add
  if (this.map.size > this.cap) {
    const lru = this.tail.prev;          // least recent    //@lru
    this.#remove(lru); this.map.delete(lru.key);           //@evict
  }
}`,
  validate: ({ cap, ops }) =>
    cap < 1 || cap > 5
      ? 'Use capacity 1–5.'
      : !Array.isArray(ops) ||
          ops.length > 14 ||
          ops.some(
            (o) =>
              !Array.isArray(o) ||
              !((o[0] === 'get' && o.length === 2) || (o[0] === 'put' && o.length === 3)),
          )
        ? 'Operations look like ["put", 1, 1] or ["get", 1], at most 14.'
        : null,
  run({ cap, ops }) {
    const steps: Step[] = [];
    let order: number[] = [];
    const vals: Map<number, number> = new Map();
    const results: (number | null)[] = [];
    for (const op of ops) {
      if (op[0] === 'get') {
        const k = op[1];
        if (!vals.has(k)) {
          results.push(-1);
          steps.push({
            order: [...order],
            vals: [...vals],
            op,
            line: 'miss',
            results: [...results],
            note: `get(${k}): not in the map → −1.`,
          });
          continue;
        }
        order = [k, ...order.filter((x) => x !== k)];
        results.push(vals.get(k)!);
        steps.push({
          order: [...order],
          vals: [...vals],
          op,
          hot: k,
          line: 'touch',
          results: [...results],
          note: `get(${k}) = ${vals.get(k)}. Unlink its node and insert it at the front: it is now the most recently used.`,
          why: 'The map finds the node in O(1); prev/next pointers let it be unlinked in O(1) without searching the list.',
        });
      } else {
        const [, k, v] = op;
        const had = vals.has(k);
        order = [k, ...order.filter((x) => x !== k)];
        vals.set(k, v);
        results.push(null);
        let ev: number | null = null;
        if (vals.size > cap) {
          ev = order.pop()!;
          vals.delete(ev!);
        }
        steps.push({
          order: [...order],
          vals: [...vals],
          op,
          hot: k,
          ev,
          line: ev != null ? ['add', 'lru', 'evict'] : had ? ['old', 'add'] : 'add',
          results: [...results],
          note: `put(${k}, ${v})${had ? ': key exists, so remove its old node first.' : '.'} Insert at the front.${ev != null ? ' Over capacity: evict key ' + ev + ' from the back (tail.prev) and from the map.' : ''}`,
          why:
            ev != null
              ? 'The node stores its key, which is how the map entry for the evicted node can be deleted in O(1).'
              : null,
        });
      }
    }
    steps.push({
      order,
      vals: [...vals],
      done: true,
      results,
      line: null,
      result: results,
      note: `Outputs: [${results.map((x) => (x === null ? 'null' : x)).join(', ')}].`,
      why: 'Every operation is O(1): one map lookup plus a constant number of pointer changes.',
    });
    return steps;
  },
  view(st, stage) {
    const items = [
      'head',
      ...st.order.map((k) => k + ':' + new Map(st.vals as [number, number][]).get(k)),
      'tail',
    ];
    const states = { 0: 'dim', [items.length - 1]: 'dim' };
    const hi = st.order.indexOf(st.hot!);
    if (hi >= 0) states[hi + 1] = 'current';
    stage.append(
      R.cells(items, {
        states,
        label: 'doubly linked list, most recent → least recent (key:value)',
        noIndex: true,
      }),
    );
    if (st.ev != null) stage.append(R.caption('evicted key ' + st.ev, { tone: 'error' }));
    stage.append(
      R.kv(
        st.order.map((k) => [k, 'node']),
        { label: 'map (key → node)' },
      ),
    );
    stage.append(
      R.vars({
        op: st.op ? JSON.stringify(st.op) : '·',
        outputs: '[' + st.results.map((x) => (x === null ? 'null' : x)).join(', ') + ']',
      }),
    );
  },
  random: (g) => ({
    cap: rint(g, 1, 3),
    ops: Array.from({ length: rint(g, 1, 14) }, () =>
      g() < 0.5 ? ['put', rint(g, 1, 4), rint(g, 1, 9)] : ['get', rint(g, 1, 4)],
    ),
  }),
});
