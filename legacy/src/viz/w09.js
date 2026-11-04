// Week 9 visualizers: Dijkstra with lazy deletion, Union-Find, Kruskal, Prim on a complete
// graph, Bellman-Ford limited to k + 1 rounds, and greedy reachability / running balances.
(function (g) {
  'use strict';
  const { el } = g.Core;
  const R = g.R, V = g.Viz;
  const circle = (n, base = 0) => Array.from({ length: n }, (_, i) => ({ id: i + base, x: n === 1 ? 0.5 : 0.5 + 0.45 * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / n), y: n === 1 ? 0.5 : 0.5 + 0.45 * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / n) }));
  const inf = (x) => (x === Infinity ? '∞' : x);
  const wCheck = (n, edges, base) => (!Number.isInteger(n) || n < 1 || n > 9 ? 'Use 1–9 nodes.' : !Array.isArray(edges) || edges.length > 18 || edges.some((e) => !Array.isArray(e) || e.length !== 3 || e[0] < base || e[1] < base || e[0] >= n + base || e[1] >= n + base || e[2] < 0) ? `Edges look like [u, v, w] with nodes ${base}..${n - 1 + base} and w ≥ 0 (at most 18).` : null);

  V.define('dijkstra', {
    title: "Dijkstra with a min-heap and lazy deletion",
    inputs: [{ key: 'n', label: 'n (nodes 1..n)', type: 'int', def: 5 }, { key: 'edges', label: 'directed edges [u, v, w]', type: 'json', def: [[1, 2, 4], [1, 3, 1], [3, 2, 2], [2, 4, 1], [3, 4, 5], [4, 5, 3]], wide: true }, { key: 'src', label: 'source', type: 'int', def: 1 }],
    presets: [{ label: 'Day 1: 5-node graph', input: { n: 5, edges: [[1, 2, 4], [1, 3, 1], [3, 2, 2], [2, 4, 1], [3, 4, 5], [4, 5, 3]], src: 1 } }, { label: 'Roadmap 743 dry run', input: { n: 4, edges: [[2, 1, 1], [2, 3, 1], [3, 4, 1]], src: 2 } }, { label: 'Unreachable node', input: { n: 3, edges: [[1, 2, 7]], src: 1 } }],
    legend: [['current', 'popped now'], ['done', 'finalised'], ['frontier', 'tentative distance'], ['dim', 'stale heap entry']],
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
    validate: ({ n, edges, src }) => wCheck(n, edges, 1) || (src < 1 || src > n ? 'The source must be a node.' : null),
    run({ n, edges, src }) {
      const adj = Array.from({ length: n + 1 }, () => []); edges.forEach(([u, v, w]) => adj[u].push([v, w]));
      const dist = new Array(n + 1).fill(Infinity); dist[src] = 0; const done = new Set(); let heap = [[0, src]]; const steps = [];
      const sortH = () => heap.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      steps.push({ dist: [...dist], heap: heap.map((x) => [...x]), done: new Set(done), line: 'init', note: `dist[${src}] = 0, everything else ∞. Heap: [0, ${src}].` });
      while (heap.length) {
        const [d, u] = heap.shift();
        if (d > dist[u]) { steps.push({ dist: [...dist], heap: heap.map((x) => [...x]), done: new Set(done), cur: u, stale: [d, u], line: ['pop', 'stale'], note: `Pop [${d}, ${u}]: stale, because dist[${u}] is already ${dist[u]}. Skip it.`, why: 'JavaScript heaps have no decrease-key, so improved distances are pushed again and the old entries are skipped when they surface.' }); continue; }
        done.add(u); const relaxed = [];
        for (const [v, w] of adj[u]) if (d + w < dist[v]) { dist[v] = d + w; heap.push([dist[v], v]); relaxed.push(`${v}: ${dist[v]}`); }
        sortH();
        steps.push({ dist: [...dist], heap: heap.map((x) => [...x]), done: new Set(done), cur: u, line: ['pop', 'relax', 'push'], note: `Pop [${d}, ${u}]: ${u} is final at distance ${d}. ${relaxed.length ? 'Relax: ' + relaxed.join(', ') + '.' : 'No improvements.'}`, why: done.size === 1 ? 'The popped node has the smallest tentative distance; any other route to it would pass through a node at least as far and add non-negative weights, so it cannot be shorter.' : null });
      }
      const res = dist.slice(1);
      steps.push({ dist, heap: [], done, line: null, finished: true, result: res, note: `Distances from ${src}: ${res.map((d, i) => (i + 1) + '=' + inf(d)).join(', ')}.`, why: 'O((V + E) log V) with a binary heap. Negative weights would break the "popped means final" argument.' });
      return steps;
    },
    render(st, stage, { n, edges }) {
      const states = {}, subs = {};
      for (let i = 1; i <= n; i++) { subs[i] = inf(st.dist[i]); if (st.done.has(i)) states[i] = 'done'; else if (st.dist[i] !== Infinity) states[i] = 'frontier'; }
      if (st.cur != null) states[st.cur] = st.stale ? 'dim' : 'current';
      stage.append(R.graph({ nodes: circle(n, 1), edges: edges.map(([u, v, w]) => ({ u, v, w })), directed: true }, { states, subs, w: 360, h: 250 }));
      stage.append(R.queue(st.heap.map(([d, v]) => '[' + d + ', ' + v + ']'), { label: 'heap (smallest first)' }));
    },
  });

  V.define('dsu', {
    title: 'Union-Find: find with path halving, union by size',
    inputs: [{ key: 'n', label: 'n', type: 'int', def: 6 }, { key: 'ops', label: 'operations ["union",a,b] / ["find",x]', type: 'json', def: [['union', 0, 1], ['union', 2, 3], ['union', 1, 3], ['union', 4, 5], ['find', 3], ['union', 0, 2], ['union', 3, 5]], wide: true }],
    presets: [{ label: 'Merge and query', input: { n: 6, ops: [['union', 0, 1], ['union', 2, 3], ['union', 1, 3], ['union', 4, 5], ['find', 3], ['union', 0, 2], ['union', 3, 5]] } }, { label: 'Redundant edge (684)', input: { n: 4, ops: [['union', 1, 2], ['union', 1, 3], ['union', 2, 3]] } }, { label: 'Union by size keeps trees flat', input: { n: 5, ops: [['union', 0, 1], ['union', 1, 2], ['union', 2, 3], ['union', 3, 4], ['find', 4]] } }],
    legend: [['current', 'root / result'], ['compare', 'path walked'], ['error', 'already connected']],
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
    validate: ({ n, ops }) => (n < 1 || n > 10 ? 'Use 1–10 elements.' : !Array.isArray(ops) || ops.length > 12 || ops.some((o) => !(o[0] === 'union' && o.length === 3 || o[0] === 'find' && o.length === 2) || o.slice(1).some((x) => x < 0 || x >= n)) ? 'Operations look like ["union", 0, 1] or ["find", 3], at most 12.' : null),
    run({ n, ops }) {
      const parent = Array.from({ length: n }, (_, i) => i), size = new Array(n).fill(1); let comps = n; const steps = [], out = [];
      const find = (x, path) => { while (parent[x] !== x) { path.push(x); parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
      for (const op of ops) {
        if (op[0] === 'find') { const path = []; const r = find(op[1], path); out.push(r); steps.push({ parent: [...parent], comps, hot: r, path, line: ['halve', 'root'], out: [...out], note: `find(${op[1]}) = ${r}${path.length ? '; walked ' + path.join(' → ') + ' and halved the path on the way' : ''}.`, why: path.length > 1 ? 'Path halving points each visited node at its grandparent, so the next find on this path is shorter.' : null }); continue; }
        const [, a, b] = op; const p1 = [], p2 = []; let ra = find(a, p1), rb = find(b, p2);
        if (ra === rb) { out.push(false); steps.push({ parent: [...parent], comps, hot: ra, bad: [a, b], line: 'same', out: [...out], note: `union(${a}, ${b}): both already have root ${ra}. Return false.`, why: 'In 684 this is exactly the redundant edge: it would close a cycle.' }); continue; }
        if (size[ra] < size[rb]) [ra, rb] = [rb, ra];
        parent[rb] = ra; size[ra] += size[rb]; comps--; out.push(true);
        steps.push({ parent: [...parent], comps, hot: ra, linked: rb, line: 'link', out: [...out], note: `union(${a}, ${b}): attach root ${rb} (size ${size[rb]}) under root ${ra} (size now ${size[ra]}). Components: ${comps}.`, why: 'Attaching the smaller tree under the larger keeps trees shallow: with path compression every operation is O(α(n)), effectively constant.' });
      }
      steps.push({ parent, comps, line: null, done: true, out, result: { out, comps }, note: `${comps} set${comps === 1 ? '' : 's'} remain.` });
      return steps;
    },
    render(st, stage, { n }) {
      const nodes = st.parent.map((p, i) => ({ id: i, label: String(i), parent: p === i ? 'R' : p }));
      const forest = [{ id: 'R', label: '', parent: null, ghost: true }, ...nodes];
      const states = {}; if (st.hot != null) states[st.hot] = 'current'; (st.path || []).forEach((x) => (states[x] = 'compare')); if (st.bad) st.bad.forEach((x) => (states[x] = 'error'));
      stage.append(R.tree(forest.map((f) => ({ ...f, state: states[f.id] })), { dx: 44, dy: 50, r: 16, label: 'forest (each tree is a set; roots at the top)' }));
      stage.append(R.cells(st.parent, { states: Object.fromEntries(Object.entries(states).filter(([k]) => k !== 'R')), label: 'parent[]' }));
      stage.append(R.vars({ components: st.comps }));
    },
  });

  V.define('kruskal', {
    title: "Kruskal's MST: cheapest edges first, skip any that close a cycle",
    inputs: [{ key: 'n', label: 'n (nodes 0..n−1)', type: 'int', def: 5 }, { key: 'edges', label: 'undirected edges [u, v, w]', type: 'json', def: [[0, 1, 4], [0, 2, 1], [1, 2, 2], [1, 3, 5], [2, 3, 8], [3, 4, 3]], wide: true }],
    presets: [{ label: 'Day 3: 5 nodes', input: { n: 5, edges: [[0, 1, 4], [0, 2, 1], [1, 2, 2], [1, 3, 5], [2, 3, 8], [3, 4, 3]] } }, { label: 'Square with a diagonal', input: { n: 4, edges: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 0, 1], [0, 2, 1]] } }, { label: 'Disconnected', input: { n: 4, edges: [[0, 1, 2], [2, 3, 5]] } }],
    legend: [['done', 'in the MST'], ['current', 'considered now'], ['error', 'would close a cycle']],
    code: `
edges.sort((a, b) => a[2] - b[2]);               // by weight      //@sort
const dsu = new DSU(n); let cost = 0, used = 0;
for (const [u, v, w] of edges) {
  if (dsu.union(u, v)) { cost += w; used++; }   // joins two trees //@take
  // else: u and v are already connected → skip                    //@skip
}
return used === n - 1 ? cost : -1;              // -1: not connected //@ret`,
    validate: ({ n, edges }) => wCheck(n, edges, 0),
    run({ n, edges }) {
      const order = edges.map((e, i) => [...e, i]).sort((a, b) => a[2] - b[2] || a[3] - b[3]);
      const parent = Array.from({ length: n }, (_, i) => i); const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
      const es = {}, steps = []; let cost = 0, used = 0;
      steps.push({ es: { ...es }, cost, used, line: 'sort', note: `Sorted by weight: ${order.map((e) => e[0] + '–' + e[1] + '(' + e[2] + ')').join(', ')}.` });
      for (const [u, v, w, k] of order) {
        const ru = find(u), rv = find(v);
        if (ru !== rv) { parent[ru] = rv; cost += w; used++; es[k] = 'done'; steps.push({ es: { ...es }, cur: k, cost, used, line: 'take', note: `${u}–${v} (${w}) joins two different trees: take it. Cost ${cost}.`, why: used === 1 ? 'Cut property: the cheapest edge leaving any group of vertices belongs to some MST, so a cheapest edge between two trees is always safe to take.' : null }); }
        else { es[k] = 'error'; steps.push({ es: { ...es }, cur: k, cost, used, line: 'skip', note: `${u}–${v} (${w}): ${u} and ${v} are already connected; it would close a cycle. Skip.` }); }
        if (used === n - 1) break;
      }
      const ok = used === n - 1;
      steps.push({ es, cost, used, done: true, line: 'ret', result: ok ? cost : -1, note: ok ? `MST with ${used} edges, total ${cost}.` : `Only ${used} edges fit: the graph is not connected (−1).`, why: 'O(E log E) for the sort; the DSU work is nearly O(E).' });
      return steps;
    },
    render(st, stage, { n, edges }) {
      const est = { ...st.es }; if (st.cur != null && !est[st.cur]) est[st.cur] = 'current';
      stage.append(R.graph({ nodes: circle(n), edges: edges.map(([u, v, w]) => ({ u, v, w })) }, { edgeStates: est, w: 340, h: 240 }));
      stage.append(R.vars({ 'MST cost': st.cost, 'edges used': st.used + ' / ' + (n - 1) }));
    },
  });

  V.define('prim-array', {
    title: "Prim's O(V²) version for a complete graph (Min Cost to Connect All Points)",
    inputs: [{ key: 'pts', label: 'points [x, y]', type: 'json', def: [[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]], wide: true }],
    presets: [{ label: 'LeetCode 1584 example', input: { pts: [[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]] } }, { label: 'Three points', input: { pts: [[3, 12], [-2, 5], [-4, 1]] } }, { label: 'One point', input: { pts: [[0, 0]] } }],
    legend: [['done', 'in the tree'], ['current', 'added now'], ['frontier', 'best distance to the tree']],
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
    validate: ({ pts }) => (!Array.isArray(pts) || pts.length < 1 || pts.length > 8 || pts.some((p) => !Array.isArray(p) || p.length !== 2) ? 'Enter 1–8 points like [[0,0],[2,2]].' : null),
    run({ pts }) {
      const n = pts.length, d = (a, b) => Math.abs(pts[a][0] - pts[b][0]) + Math.abs(pts[a][1] - pts[b][1]);
      const best = new Array(n).fill(Infinity), from = new Array(n).fill(-1), inT = new Array(n).fill(false); best[0] = 0; let cost = 0; const tree = [], steps = [];
      for (let k = 0; k < n; k++) {
        let u = -1; for (let i = 0; i < n; i++) if (!inT[i] && (u < 0 || best[i] < best[u])) u = i;
        inT[u] = true; cost += best[u]; if (from[u] >= 0) tree.push([from[u], u, best[u]]);
        for (let v = 0; v < n; v++) if (!inT[v] && d(u, v) < best[v]) { best[v] = d(u, v); from[v] = u; }
        steps.push({ best: [...best], inT: [...inT], tree: tree.map((x) => [...x]), cur: u, cost, line: ['pick', 'add', 'update'], note: k === 0 ? `Start the tree at point 0.` : `Closest point outside the tree: ${u} (distance ${best[u]} via point ${from[u]}). Cost ${cost}.`, why: k === 1 ? 'Every pair of points is an edge (n² edges), so scanning an array of n best distances each round (O(n²) total) beats a heap (O(n² log n)).' : null });
      }
      steps.push({ best, inT, tree, cost, done: true, line: null, result: cost, note: `Total cost ${cost}.` });
      return steps;
    },
    render(st, stage, { pts }) {
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
      const nodes = pts.map((p, i) => ({ id: i, x: maxx === minx ? 0.5 : (p[0] - minx) / (maxx - minx), y: maxy === miny ? 0.5 : 0.12 + 0.88 * (1 - (p[1] - miny) / (maxy - miny)) }));
      const states = {}, subs = {}; st.inT.forEach((t, i) => { states[i] = t ? 'done' : 'frontier'; if (!t) subs[i] = inf(st.best[i]); }); if (st.cur != null) states[st.cur] = 'current';
      stage.append(R.graph({ nodes, edges: st.tree.map(([u, v, w]) => ({ u, v, w })) }, { states, subs, edgeStates: Object.fromEntries(st.tree.map((_, k) => [k, 'done'])), w: 340, h: 240 }));
      stage.append(R.vars({ cost: st.cost }));
    },
  });

  V.define('bellman-k', {
    title: 'Cheapest flights within k stops: k + 1 rounds of relaxation',
    inputs: [{ key: 'n', label: 'n (cities 0..n−1)', type: 'int', def: 4 }, { key: 'flights', label: 'flights [from, to, price]', type: 'json', def: [[0, 1, 100], [1, 2, 100], [2, 0, 100], [1, 3, 600], [2, 3, 200]], wide: true }, { key: 'src', label: 'src', type: 'int', def: 0 }, { key: 'dst', label: 'dst', type: 'int', def: 3 }, { key: 'k', label: 'k (stops)', type: 'int', def: 1 }],
    presets: [{ label: 'LeetCode example 1 (k = 1)', input: { n: 4, flights: [[0, 1, 100], [1, 2, 100], [2, 0, 100], [1, 3, 600], [2, 3, 200]], src: 0, dst: 3, k: 1 } }, { label: 'Same, k = 2', input: { n: 4, flights: [[0, 1, 100], [1, 2, 100], [2, 0, 100], [1, 3, 600], [2, 3, 200]], src: 0, dst: 3, k: 2 } }, { label: 'k = 0', input: { n: 3, flights: [[0, 1, 100], [1, 2, 100], [0, 2, 500]], src: 0, dst: 2, k: 0 } }],
    legend: [['current', 'improved this round'], ['done', 'reached']],
    code: `
let dist = new Array(n).fill(Infinity); dist[src] = 0;
for (let round = 0; round <= k; round++) {        // at most k + 1 flights
  const next = dist.slice();                     // read OLD values only  //@copy
  for (const [u, v, p] of flights)
    if (dist[u] + p < next[v]) next[v] = dist[u] + p;                     //@relax
  dist = next;
}
return dist[dst] === Infinity ? -1 : dist[dst];                           //@ret`,
    validate: ({ n, flights, src, dst, k }) => wCheck(n, flights, 0) || (src < 0 || src >= n || dst < 0 || dst >= n ? 'src and dst must be cities.' : k < 0 || k > 6 ? 'Use 0 ≤ k ≤ 6.' : null),
    run({ n, flights, src, dst, k }) {
      let dist = new Array(n).fill(Infinity); dist[src] = 0; const steps = [];
      steps.push({ dist: [...dist], round: -1, imp: [], line: 'copy', note: `dist[${src}] = 0. Each round allows one more flight.` });
      for (let r = 0; r <= k; r++) {
        const next = dist.slice(), imp = [];
        for (const [u, v, p] of flights) if (dist[u] + p < next[v]) { next[v] = dist[u] + p; imp.push(v); }
        dist = next;
        steps.push({ dist: [...dist], round: r, imp, line: ['copy', 'relax'], note: `Round ${r + 1} (paths with ≤ ${r + 1} flight${r ? 's' : ''}): ${imp.length ? 'improved ' + [...new Set(imp)].map((v) => v + ' → ' + dist[v]).join(', ') : 'no change'}.`, why: r === 0 ? 'Reading from the copy of last round stops a single round from chaining two new flights, which would exceed the stop limit.' : null });
      }
      const ans = dist[dst] === Infinity ? -1 : dist[dst];
      steps.push({ dist, round: k, imp: [], done: true, line: 'ret', result: ans, note: ans < 0 ? `No route to ${dst} with ≤ ${k} stops.` : `Cheapest with ≤ ${k} stops: ${ans}.`, why: 'Dijkstra fails here: the cheapest path to an intermediate city may use too many stops, while a pricier one with fewer stops is the one that leads to the answer. O(k · E).' });
      return steps;
    },
    render(st, stage, { n, flights }) {
      const states = {}, subs = {}; for (let i = 0; i < n; i++) { subs[i] = inf(st.dist[i]); if (st.dist[i] !== Infinity) states[i] = 'done'; } st.imp.forEach((v) => (states[v] = 'current'));
      stage.append(R.graph({ nodes: circle(n), edges: flights.map(([u, v, w]) => ({ u, v, w })), directed: true }, { states, subs, w: 340, h: 240 }));
      stage.append(R.vars({ round: st.round + 1 }));
    },
  });

  // ---------- greedy ----------
  V.define('jump-game', {
    title: 'Jump Game: track the farthest reachable index',
    inputs: [{ key: 'nums', label: 'nums (max jump at each index)', type: 'numbers', def: [3, 2, 1, 0, 4], wide: true }],
    presets: [{ label: 'Roadmap dry run (false)', input: { nums: [3, 2, 1, 0, 4] } }, { label: 'LeetCode example 1 (true)', input: { nums: [2, 3, 1, 1, 4] } }, { label: 'Single element', input: { nums: [0] } }],
    legend: [['window', 'reachable so far'], ['current', 'i'], ['error', 'unreachable']],
    code: `
function canJump(nums) {
  let farthest = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > farthest) return false;           // i cannot be reached     //@fail
    farthest = Math.max(farthest, i + nums[i]);                          //@reach
  }
  return true;                                                           //@ok
}`,
    validate: ({ nums }) => (nums.length < 1 || nums.length > 14 || nums.some((x) => x < 0) ? 'Use 1–14 non-negative numbers.' : null),
    run({ nums }) {
      let far = 0; const steps = [];
      for (let i = 0; i < nums.length; i++) {
        if (i > far) { steps.push({ i, far, bad: i, line: 'fail', done: true, result: false, note: `i = ${i} > farthest = ${far}: index ${i} cannot be reached, so neither can the end. Return false.` }); return steps; }
        const nf = Math.max(far, i + nums[i]);
        steps.push({ i, far: nf, line: 'reach', note: `i = ${i}: from here you can reach ${i + nums[i]}. farthest = ${nf}.`, why: i === 0 ? 'If you can reach i, you can reach every index up to i + nums[i]: one number summarises everything a DP table would store.' : null });
        far = nf;
      }
      steps.push({ i: nums.length - 1, far, line: 'ok', done: true, result: true, note: 'Every index was reachable: return true.', why: 'One pass, O(n) time and O(1) space, against O(n²) for a canReach DP.' });
      return steps;
    },
    render(st, stage, { nums }) {
      const states = {}; nums.forEach((_, k) => { if (k <= st.far) states[k] = 'window'; }); if (st.bad != null) for (let k = st.bad; k < nums.length; k++) states[k] = 'error'; else states[st.i] = 'current';
      stage.append(R.cells(nums, { states, ptrs: { [st.i]: 'i' }, label: 'nums' }));
      stage.append(R.vars({ farthest: st.far }));
    },
  });

  V.define('jump-game2', {
    title: 'Jump Game II: count levels of reach, like BFS',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [2, 3, 1, 1, 4], wide: true }],
    presets: [{ label: 'LeetCode example 1', input: { nums: [2, 3, 1, 1, 4] } }, { label: 'LeetCode example 2', input: { nums: [2, 3, 0, 1, 4] } }, { label: 'Ones', input: { nums: [1, 1, 1, 1] } }],
    legend: [['window', 'current level (reachable with `jumps` jumps)'], ['current', 'i']],
    code: `
function jump(nums) {
  let jumps = 0, end = 0, farthest = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    farthest = Math.max(farthest, i + nums[i]);                        //@reach
    if (i === end) { jumps++; end = farthest; }   // level finished    //@level
  }
  return jumps;
}`,
    validate: ({ nums }) => { if (nums.length < 1 || nums.length > 14 || nums.some((x) => x < 0)) return 'Use 1–14 non-negative numbers.'; let f = 0; for (let i = 0; i < nums.length; i++) { if (i > f) return 'The end must be reachable (problem 45 guarantees it).'; f = Math.max(f, i + nums[i]); } return null; },
    run({ nums }) {
      let jumps = 0, end = 0, far = 0, start = 0; const steps = [];
      for (let i = 0; i < nums.length - 1; i++) {
        far = Math.max(far, i + nums[i]);
        if (i === end) { jumps++; const ps = start; start = end + 1; end = far; steps.push({ i, far, lvl: [ps, i], jumps, line: ['reach', 'level'], note: `i = ${i} is the end of level ${jumps - 1}: take jump #${jumps}. The next level reaches up to index ${end}.`, why: jumps === 1 ? 'Indices reachable with j jumps form a contiguous range; the next range ends at the farthest point reachable from it. This is BFS without a queue.' : null }); }
        else steps.push({ i, far, lvl: [start, end], jumps, line: 'reach', note: `i = ${i}: farthest = ${far}.` });
      }
      steps.push({ i: nums.length - 1, far, lvl: null, jumps, done: true, line: null, result: jumps, note: `Minimum jumps: ${jumps}.`, why: 'O(n) time, O(1) space.' });
      return steps;
    },
    render(st, stage, { nums }) {
      stage.append(R.cells(nums, { window: st.lvl, states: { [st.i]: 'current' }, ptrs: { [st.i]: 'i' }, label: 'nums' }));
      stage.append(R.vars({ jumps: st.jumps, farthest: st.far }));
    },
  });

  V.define('gas-station', {
    title: 'Gas Station: reset the start whenever the tank goes negative',
    inputs: [{ key: 'gas', label: 'gas', type: 'numbers', def: [1, 2, 3, 4, 5] }, { key: 'cost', label: 'cost', type: 'numbers', def: [3, 4, 5, 1, 2] }],
    presets: [{ label: 'Day 5 trace', input: { gas: [1, 2, 3, 4, 5], cost: [3, 4, 5, 1, 2] } }, { label: 'Impossible', input: { gas: [2, 3, 4], cost: [3, 4, 3] } }, { label: 'Start at 0', input: { gas: [5, 1, 2, 3, 4], cost: [4, 4, 1, 5, 1] } }],
    legend: [['window', 'current candidate stretch'], ['error', 'tank went negative here'], ['done', 'answer']],
    code: `
function canCompleteCircuit(gas, cost) {
  let total = 0, tank = 0, start = 0;
  for (let i = 0; i < gas.length; i++) {
    const diff = gas[i] - cost[i];
    total += diff; tank += diff;                                   //@add
    if (tank < 0) { start = i + 1; tank = 0; }   // no start in [start, i] works  //@reset
  }
  return total >= 0 ? start : -1;                                  //@ret
}`,
    validate: ({ gas, cost }) => (gas.length !== cost.length || gas.length < 1 || gas.length > 12 ? 'gas and cost need the same length (1–12).' : null),
    run({ gas, cost }) {
      let total = 0, tank = 0, start = 0; const steps = [];
      for (let i = 0; i < gas.length; i++) {
        const d = gas[i] - cost[i]; total += d; tank += d;
        if (tank < 0) { steps.push({ i, start, tank, total, bad: i, line: ['add', 'reset'], note: `Station ${i}: net ${d >= 0 ? '+' : ''}${d}, tank ${tank} < 0. No start in [${start}, ${i}] can pass station ${i}: try ${i + 1} next.`, why: 'Starting later inside [start, i] only removes stations that contributed a non-negative running tank, so it can only be worse. That is why the start jumps to i + 1.' }); start = i + 1; tank = 0; }
        else steps.push({ i, start, tank, total, line: 'add', note: `Station ${i}: net ${d >= 0 ? '+' : ''}${d}, tank ${tank}.` });
      }
      const ans = total >= 0 ? start : -1;
      steps.push({ i: gas.length - 1, start, tank, total, done: true, ans, line: 'ret', result: ans, note: total >= 0 ? `total = ${total} ≥ 0, so a start exists, and it is ${start}.` : `total = ${total} < 0: not enough gas overall. Return −1.`, why: 'If the total is non-negative, the last reset point works for the rest of the circuit and the deficit before it is covered by the surplus after it. O(n), O(1).' });
      return steps;
    },
    render(st, stage, { gas, cost }) {
      const net = gas.map((g2, i) => g2 - cost[i]); const states = {};
      if (st.done) { if (st.ans >= 0) states[st.ans] = 'done'; } else { for (let k = st.start; k <= st.i; k++) states[k] = 'window'; if (st.bad != null) states[st.bad] = 'error'; }
      stage.append(R.cells(net, { states, label: 'gas[i] − cost[i]' }));
      stage.append(R.vars({ start: st.start, tank: st.tank, total: st.total }));
    },
  });

  V.define('partition-labels', {
    title: 'Partition Labels: extend each part to the last occurrence of its letters',
    inputs: [{ key: 's', label: 's', type: 'string', def: 'ababcbacadefegdehijhklij', wide: true }],
    presets: [{ label: 'LeetCode example 1', input: { s: 'ababcbacadefegdehijhklij' } }, { label: 'LeetCode example 2', input: { s: 'eccbbbbdec' } }, { label: 'All distinct', input: { s: 'abc' } }],
    legend: [['window', 'current part'], ['current', 'i'], ['done', 'finished parts']],
    code: `
function partitionLabels(s) {
  const last = {};
  for (let i = 0; i < s.length; i++) last[s[i]] = i;              //@last
  const res = []; let start = 0, end = 0;
  for (let i = 0; i < s.length; i++) {
    end = Math.max(end, last[s[i]]);       // part must cover this letter  //@extend
    if (i === end) { res.push(end - start + 1); start = i + 1; }    //@cut
  }
  return res;
}`,
    validate: ({ s }) => (!/^[a-z]+$/.test(s) || s.length > 24 ? 'Use 1–24 lower-case letters.' : null),
    run({ s }) {
      const last = {}; for (let i = 0; i < s.length; i++) last[s[i]] = i;
      const steps = [{ i: null, start: 0, end: 0, res: [], line: 'last', note: 'First pass: the last index of every letter.' }]; const res = []; let start = 0, end = 0; const cuts = [];
      for (let i = 0; i < s.length; i++) {
        end = Math.max(end, last[s[i]]);
        if (i === end) { res.push(end - start + 1); cuts.push([start, end]); steps.push({ i, start, end, res: [...res], cuts: cuts.map((c) => [...c]), line: ['extend', 'cut'], note: `i = ${i} reaches the part's end: every letter in [${start}, ${end}] has no copies later. Cut: size ${end - start + 1}.`, why: res.length === 1 ? 'Cutting as soon as possible is safe: any later cut would just merge this part with the next one, giving fewer parts.' : null }); start = i + 1; }
        else steps.push({ i, start, end, res: [...res], cuts: cuts.map((c) => [...c]), line: 'extend', note: `"${s[i]}" last appears at ${last[s[i]]}: the part must reach at least ${end}.` });
      }
      steps.push({ i: null, start, end, res, cuts, done: true, line: null, result: res, note: `Part sizes: [${res.join(', ')}].` });
      return steps;
    },
    render(st, stage, { s }) {
      const states = {}; (st.cuts || []).forEach(([a, b]) => { for (let k = a; k <= b; k++) states[k] = 'done'; }); if (st.i != null) { for (let k = st.start; k <= st.i; k++) if (!states[k]) states[k] = 'window'; states[st.i] = 'current'; }
      stage.append(R.cells([...s], { states, ptrs: st.i != null ? { [st.end]: 'end' } : {}, label: 's' }));
      stage.append(R.vars({ parts: '[' + st.res.join(', ') + ']' }));
    },
  });
})(window);
