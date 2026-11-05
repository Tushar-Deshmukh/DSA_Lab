// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  keys: string[];
  buckets: number;
  find: string;
}

interface Step extends VizStep {
  B: string[][];
  m: number;
  size: number;
  key?: string;
  b?: number;
  look?: boolean;
  found?: boolean;
  result?: boolean;
}

// ---------- hash table buckets ----------
const hashStr = (s: string) => {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

export default defineViz<Input, Step>('hash-buckets', {
  title: 'Inside a hash table: buckets, collisions and resizing',
  inputs: [
    {
      key: 'keys',
      label: 'keys to insert',
      type: 'array',
      def: ['cat', 'dog', 'emu', 'ant', 'owl', 'bee', 'yak'],
      wide: true,
    },
    { key: 'buckets', label: 'initial buckets', type: 'int', def: 4 },
    { key: 'find', label: 'then look up', type: 'string', def: 'owl' },
  ],
  presets: [
    {
      label: 'Resize happens',
      input: { keys: ['cat', 'dog', 'emu', 'ant', 'owl', 'bee', 'yak'], buckets: 4, find: 'owl' },
    },
    { label: 'Missing key', input: { keys: ['a', 'b', 'c'], buckets: 4, find: 'z' } },
    { label: 'Many collisions (1 bucket)', input: { keys: ['k1', 'k2', 'k3'], buckets: 1, find: 'k3' } },
  ],
  legend: [
    ['current', 'key being placed or compared'],
    ['done', 'found'],
  ],
  code: `
function bucketOf(key, m) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % m;                                   //@hash
}
function set(table, key) {
  const b = bucketOf(key, table.m);
  table.buckets[b].push(key);    // chaining       //@push
  table.size++;
  if (table.size / table.m > 0.75) resize(table); // load factor  //@resize
}
function has(table, key) {
  const b = bucketOf(key, table.m);
  return table.buckets[b].includes(key);  // short list   //@find
}`,
  validate: ({ keys, buckets }) =>
    sizeCheck(keys, 1, 12, 'key list') ||
    (buckets < 1 || buckets > 16
      ? 'Use 1–16 buckets.'
      : new Set(keys.map(String)).size !== keys.length
        ? 'Use distinct keys (a set stores each key once).'
        : null),
  run({ keys, buckets: m0, find }) {
    const steps: Step[] = [];
    let m = m0;
    let B: string[][] = Array.from({ length: m }, () => []);
    let size = 0;
    const snap = <O extends object>(o: O) => ({ B: B.map((x) => [...x]), m, size, ...o });
    for (const k0 of keys) {
      const k = String(k0);
      const h = hashStr(k),
        b = h % m;
      const coll = B[b].length > 0;
      B[b].push(k);
      size++;
      steps.push(
        snap({
          line: ['hash', 'push'],
          key: k,
          b,
          note: `hash("${k}") = ${h}; ${h} mod ${m} = bucket ${b}.${
            coll
              ? ' Collision: the bucket already holds ' +
                B[b]
                  .slice(0, -1)
                  .map((x) => '"' + x + '"')
                  .join(', ') +
                '; chain it.'
              : ''
          }`,
          why: coll
            ? 'Different keys can land in the same bucket. Chaining keeps a short list per bucket; lookups compare keys only within that list.'
            : null,
        }),
      );
      if (size / m > 0.75) {
        const old = m;
        m *= 2;
        const nb: string[][] = Array.from({ length: m }, () => []);
        B.flat().forEach((x) => nb[hashStr(x) % m].push(x));
        B = nb;
        steps.push(
          snap({
            line: 'resize',
            note: `Load factor ${size}/${old} = ${(size / old).toFixed(2)} > 0.75: double to ${m} buckets and re-insert every key.`,
            why: 'Resizing is O(n) when it happens, but doubling makes it rare (amortised O(1) per insert, like array push). It keeps the average bucket length O(1).',
          }),
        );
      }
    }
    const fk = String(find);
    const h = hashStr(fk),
      b = h % m;
    const found = B[b].includes(fk);
    steps.push(
      snap({
        line: 'find',
        key: fk,
        b,
        look: true,
        found,
        result: found,
        note: `Look up "${fk}": bucket ${b} holds [${B[b].map((x) => '"' + x + '"').join(', ')}] → ${found ? 'found' : 'not found'} after ${B[b].length} comparison${B[b].length === 1 ? '' : 's'}.`,
        why: 'Only one bucket is searched. With a good hash and resizing, buckets stay short on average: O(1) average. If every key collided (try the 1-bucket preset), it degrades to O(n).',
      }),
    );
    return steps;
  },
  view(st, stage) {
    const rows = st.B.map((chain, i) => ({
      label: 'bucket ' + i,
      state: i === st.b ? 'current' : null,
      chips: chain.map((k) => ({
        text: k,
        state: k === st.key ? (st.look ? (st.found ? 'done' : 'error') : 'current') : null,
      })),
      empty: 'empty',
    }));
    stage.append(R.panel('buckets (chaining)', R.chipRows(rows)));
    stage.append(R.vars({ keys: st.size, buckets: st.m, 'load factor': (st.size / st.m).toFixed(2) }));
  },
  random: (g) => {
    const pool = ['ab', 'ba', 'cat', 'dog', 'x', 'yy', 'zzz', 'k1', 'k2', 'owl', 'emu', 'q'];
    const keys = [
      ...new Set(Array.from({ length: rint(g, 1, 10) }, () => pool[rint(g, 0, pool.length - 1)])),
    ];
    return { keys, buckets: rint(g, 1, 8), find: pool[rint(g, 0, pool.length - 1)] };
  },
});
