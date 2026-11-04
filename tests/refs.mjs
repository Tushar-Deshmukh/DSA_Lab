// Independent reference solutions (brute force where possible) and random input generators
// for every visualizer. tests/content.mjs runs each visualizer's real algorithm on hundreds of
// random inputs and compares its final `result` with these.
export const rint = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
export const rarr = (rng, n, lo, hi) => Array.from({ length: n }, () => rint(rng, lo, hi));
const sorted = (a) => [...a].sort((x, y) => x - y);
const rstr = (rng, n, alpha) => Array.from({ length: n }, () => alpha[rint(rng, 0, alpha.length - 1)]).join('');

// random binary trees in LeetCode level-order form
function toT(arr) { if (!arr.length || arr[0] == null) return null; const root = { val: arr[0], left: null, right: null }; const q = [root]; let i = 1, h = 0; while (i < arr.length && h < q.length) { const n = q[h++]; if (arr[i] != null) { n.left = { val: arr[i], left: null, right: null }; q.push(n.left); } i++; if (i < arr.length && arr[i] != null) { n.right = { val: arr[i], left: null, right: null }; q.push(n.right); } i++; } return root; }
function fromT(root) { const o = [], q = [root]; let h = 0; while (h < q.length) { const n = q[h++]; if (!n) { o.push(null); continue; } o.push(n.val); q.push(n.left, n.right); } while (o.length && o[o.length - 1] === null) o.pop(); return o; }
function randTree(g, n, distinct) { if (!n) return []; let next = 1; const val = () => (distinct ? next++ : rint(g, 0, 9)); const root = { val: val(), left: null, right: null }; const all = [root]; while (all.length < n) { const p = all[rint(g, 0, all.length - 1)]; const side = g() < 0.5 ? 'left' : 'right'; if (p[side]) continue; p[side] = { val: val(), left: null, right: null }; all.push(p[side]); } const out = fromT(root); return out.length > 15 ? randTree(g, Math.max(1, n - 2), distinct) : out; }
function randBST(g, n) { const vals = [...new Set(Array.from({ length: n }, () => rint(g, 0, 30)))]; let root = null; const ins = (t, v) => { if (!t) return { val: v, left: null, right: null }; if (v < t.val) t.left = ins(t.left, v); else t.right = ins(t.right, v); return t; }; for (const v of vals) root = ins(root, v); const out = fromT(root); return out.length > 15 ? randBST(g, Math.max(1, n - 2)) : out; }

function comps(n, edges) { const p = Array.from({ length: n }, (_, i) => i); const f = (x) => (p[x] === x ? x : (p[x] = f(p[x]))); for (const [u, v] of edges) p[f(u)] = f(v); return new Set(p.map((_, i) => f(i))).size; }
function hasCyc(n, edges) { const adj = Array.from({ length: n }, () => []); edges.forEach(([u, v]) => adj[u].push(v)); const indeg = new Array(n).fill(0); edges.forEach(([, v]) => indeg[v]++); const q = []; indeg.forEach((d, i) => { if (!d) q.push(i); }); let k = 0; for (let h = 0; h < q.length; h++) { k++; for (const v of adj[q[h]]) if (--indeg[v] === 0) q.push(v); } return k < n; }

export const REFS = {

  // ---------- week 8 ----------
  'graph-build': { gen: (g) => { const n = rint(g, 1, 8); return { n, edges: Array.from({ length: rint(g, 0, 10) }, () => [rint(g, 0, n - 1), rint(g, 0, n - 1)]), dir: g() < 0.5 ? 'directed' : 'undirected' }; }, ref: ({ n, edges, dir }) => { const a = Array.from({ length: n }, () => []); for (const [u, v] of edges) { a[u].push(v); if (dir === 'undirected') a[v].push(u); } return a; } },
  'graph-dfs': { gen: (g) => { const n = rint(g, 1, 10); return { n, edges: Array.from({ length: rint(g, 0, 12) }, () => [rint(g, 0, n - 1), rint(g, 0, n - 1)]) }; }, ref: ({ n, edges }) => comps(n, edges) },
  'graph-bfs': { gen: (g) => { const n = rint(g, 1, 10); return { n, edges: Array.from({ length: rint(g, 0, 12) }, () => [rint(g, 0, n - 1), rint(g, 0, n - 1)]) }; }, ref: ({ n, edges }) => comps(n, edges) },
  islands: { gen: (g) => { const r = rint(g, 1, 6), c = rint(g, 1, 6); return { grid: Array.from({ length: r }, () => Array.from({ length: c }, () => (g() < 0.45 ? '1' : '0'))) }; }, ref: ({ grid }) => { const m = grid.length, n = grid[0].length; const id = (r, c) => r * n + c; const p = Array.from({ length: m * n }, (_, i) => i); const f = (x) => (p[x] === x ? x : (p[x] = f(p[x]))); for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) { if (grid[r][c] !== '1') continue; if (r + 1 < m && grid[r + 1][c] === '1') p[f(id(r, c))] = f(id(r + 1, c)); if (c + 1 < n && grid[r][c + 1] === '1') p[f(id(r, c))] = f(id(r, c + 1)); } const roots = new Set(); for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) if (grid[r][c] === '1') roots.add(f(id(r, c))); return roots.size; } },
  rotting: { gen: (g) => { const r = rint(g, 1, 6), c = rint(g, 1, 6); return { grid: Array.from({ length: r }, () => Array.from({ length: c }, () => [0, 1, 1, 2][rint(g, 0, 3)])) }; }, ref: ({ grid }) => { const m = grid.length, n = grid[0].length; let t = 0; let gr = grid.map((r) => [...r]); while (true) { const fresh = gr.flat().filter((x) => x === 1).length; if (!fresh) return t; const nx = gr.map((r) => [...r]); let ch = false; for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) if (gr[r][c] === 1 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => gr[r + a] && gr[r + a][c + b] === 2)) { nx[r][c] = 2; ch = true; } if (!ch) return -1; gr = nx; t++; } } },
  'grid-bfs': { gen: (g) => { const r = rint(g, 1, 6), c = rint(g, 1, 6); return { grid: Array.from({ length: r }, () => Array.from({ length: c }, () => (g() < 0.3 ? 1 : 0))) }; }, ref: ({ grid }) => { const m = grid.length, n = grid[0].length; if (grid[0][0] || grid[m - 1][n - 1]) return -1; const d = grid.map((r) => r.map(() => Infinity)); d[0][0] = 1; let changed = true; while (changed) { changed = false; for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) { if (grid[r][c]) continue; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const rr = r + a, cc = c + b; if (rr < 0 || cc < 0 || rr >= m || cc >= n || grid[rr][cc]) continue; if (d[rr][cc] + 1 < d[r][c]) { d[r][c] = d[rr][cc] + 1; changed = true; } } } } return d[m - 1][n - 1] === Infinity ? -1 : d[m - 1][n - 1]; } },
  kahn: { gen: (g) => { const n = rint(g, 1, 8); return { n, pre: Array.from({ length: rint(g, 0, 10) }, () => [rint(g, 0, n - 1), rint(g, 0, n - 1)]) }; }, check: ({ n, pre }, order) => { const acyclic = !hasCyc(n, pre.map(([c, p]) => [p, c])); if (!acyclic) return Array.isArray(order) && order.length === 0; if (!Array.isArray(order) || order.length !== n || new Set(order).size !== n) return false; const pos = new Map(order.map((v, i) => [v, i])); return pre.every(([c, p]) => pos.get(p) < pos.get(c)); } },
  'dfs-3state': { gen: (g) => { const n = rint(g, 1, 8); return { n, edges: Array.from({ length: rint(g, 0, 10) }, () => [rint(g, 0, n - 1), rint(g, 0, n - 1)]) }; }, ref: ({ n, edges }) => hasCyc(n, edges) },
  bipartite: { gen: (g) => { const n = rint(g, 1, 8); return { n, edges: Array.from({ length: rint(g, 0, 10) }, () => [rint(g, 0, n - 1), rint(g, 0, n - 1)]).filter(([u, v]) => u !== v) }; }, ref: ({ n, edges }) => { for (let m = 0; m < 1 << n; m++) if (edges.every(([u, v]) => ((m >> u) & 1) !== ((m >> v) & 1))) return true; return false; } },
  pacific: { gen: (g) => { const r = rint(g, 1, 5), c = rint(g, 1, 5); return { h: Array.from({ length: r }, () => rarr(g, c, 0, 6)) }; }, ref: ({ h }) => { const m = h.length, n = h[0].length, out = []; const reach = (r0, c0, test) => { const seen = new Set([r0 + ',' + c0]), st = [[r0, c0]]; while (st.length) { const [r, c] = st.pop(); if (test(r, c)) return true; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const rr = r + a, cc = c + b; if (rr < 0 || cc < 0 || rr >= m || cc >= n || seen.has(rr + ',' + cc) || h[rr][cc] > h[r][c]) continue; seen.add(rr + ',' + cc); st.push([rr, cc]); } } return false; }; for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) if (reach(r, c, (a, b) => a === 0 || b === 0) && reach(r, c, (a, b) => a === m - 1 || b === n - 1)) out.push([r, c]); return out; } },

  // ---------- week 7 ----------
  'heap-ops': { gen: (g) => { const ops = []; let n = 0; for (let k = rint(g, 1, 14); k > 0; k--) { if (!n || g() < 0.6) { ops.push(['push', rint(g, 0, 20)]); n++; } else { ops.push(['pop']); n--; } } return { ops }; }, ref: ({ ops }) => { const h = [], out = []; for (const o of ops) { if (o[0] === 'push') h.push(o[1]); else if (h.length) { h.sort((a, b) => a - b); out.push(h.shift()); } } return out; } },
  heapify: { gen: (g) => ({ nums: rarr(g, rint(g, 1, 15), 0, 30) }), check: ({ nums }, d) => Array.isArray(d) && JSON.stringify([...d].sort((a, b) => a - b)) === JSON.stringify([...nums].sort((a, b) => a - b)) && d.every((x, i) => i === 0 || d[(i - 1) >> 1] <= x) },
  'heap-topk': { gen: (g) => { const a = rarr(g, rint(g, 1, 14), -5, 9); return { nums: a, k: rint(g, 1, a.length) }; }, ref: ({ nums, k }) => [...nums].sort((a, b) => b - a)[k - 1] },
  'kway-merge': { gen: (g) => ({ lists: Array.from({ length: rint(g, 1, 5) }, () => sorted(rarr(g, rint(g, 0, 3), 0, 9))) }), ref: ({ lists }) => sorted(lists.flat()) },
  'two-heaps': { gen: (g) => ({ stream: rarr(g, rint(g, 1, 12), -9, 20) }), ref: ({ stream }) => stream.map((_, i) => { const a = sorted(stream.slice(0, i + 1)); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }) },
  'task-scheduler': { gen: (g) => ({ tasks: rstr(g, rint(g, 1, 12), 'ABCD'), n: rint(g, 0, 4) }), ref: ({ tasks, n }) => { const c = {}; for (const t of tasks) c[t] = (c[t] || 0) + 1; const v = Object.values(c), m = Math.max(...v); return Math.max(tasks.length, (m - 1) * (n + 1) + v.filter((x) => x === m).length); } },
  'iv-merge': { gen: (g) => ({ iv: Array.from({ length: rint(g, 1, 10) }, () => { const s = rint(g, 0, 20); return [s, s + rint(g, 0, 6)]; }) }), ref: ({ iv }) => { const pts = new Set(); const cov = (x) => iv.some(([s, e]) => s <= x && x <= e); const out = []; const a = iv.map((x) => [...x]).sort((x, y) => x[0] - y[0]); for (const [s, e] of a) { if (out.length && s <= out.at(-1)[1]) out.at(-1)[1] = Math.max(out.at(-1)[1], e); else out.push([s, e]); } return out; } },
  'iv-insert': { gen: (g) => { const iv = []; let t = rint(g, 0, 3); for (let k = rint(g, 1, 6); k > 0; k--) { const s = t, e = s + rint(g, 0, 3); iv.push([s, e]); t = e + rint(g, 1, 3); } const s = rint(g, 0, t), e = s + rint(g, 0, 6); return { iv, nw: [s, e] }; }, ref: ({ iv, nw }) => { const a = [...iv.map((x) => [...x]), [...nw]].sort((x, y) => x[0] - y[0]); const out = []; for (const [s, e] of a) { if (out.length && s <= out.at(-1)[1]) out.at(-1)[1] = Math.max(out.at(-1)[1], e); else out.push([s, e]); } return out; } },
  'iv-select': { gen: (g) => ({ iv: Array.from({ length: rint(g, 1, 8) }, () => { const s = rint(g, 0, 12); return [s, s + rint(g, 1, 5)]; }) }), ref: ({ iv }) => { const n = iv.length; let best = 0; for (let m = 0; m < 1 << n; m++) { const pick = iv.filter((_, i) => m >> i & 1).sort((a, b) => a[0] - b[0]); if (pick.every((x, i) => !i || pick[i - 1][1] <= x[0])) best = Math.max(best, pick.length); } return n - best; } },
  sweep: { gen: (g) => ({ iv: Array.from({ length: rint(g, 1, 8) }, () => { const s = rint(g, 0, 20); return [s, s + rint(g, 1, 8)]; }) }), ref: ({ iv }) => { let b = 0; for (let t = 0; t <= 40; t++) b = Math.max(b, iv.filter(([s, e]) => s <= t && t < e).length); return b; } },
  trie: { gen: (g) => { const words = [...new Set(Array.from({ length: rint(g, 1, 6) }, () => rstr(g, rint(g, 1, 4), 'abc')))]; const queries = Array.from({ length: rint(g, 1, 8) }, () => [['search', 'prefix', 'wild'][rint(g, 0, 2)], rstr(g, rint(g, 1, 4), 'abc.')]).map(([k, t]) => [k, k === 'wild' ? t : t.replace(/\./g, 'a')]); return { words, queries }; }, ref: ({ words, queries }) => queries.map(([k, t]) => (k === 'search' ? words.includes(t) : k === 'prefix' ? words.some((w) => w.startsWith(t)) : words.some((w) => w.length === t.length && [...t].every((c, i) => c === '.' || c === w[i])))) },

  // ---------- week 6 ----------
  'tree-build': { gen: (g) => ({ tree: randTree(g, rint(g, 1, 9)) }), ref: ({ tree }) => tree.filter((x) => x != null).length },
  'tree-dfs': { gen: (g) => ({ tree: randTree(g, rint(g, 0, 10)), order: ['pre', 'in', 'post'][rint(g, 0, 2)] }), ref: ({ tree, order }) => { const t = toT(tree), out = []; const go = (n) => { if (!n) return; if (order === 'pre') out.push(n.val); go(n.left); if (order === 'in') out.push(n.val); go(n.right); if (order === 'post') out.push(n.val); }; go(t); return out; } },
  'tree-inorder-iter': { gen: (g) => { const t = randTree(g, rint(g, 0, 10)); const n = t.filter((x) => x != null).length; return { tree: t, k: g() < 0.5 || !n ? 0 : rint(g, 1, n) }; }, ref: ({ tree, k }) => { const out = []; const go = (n) => { if (!n) return; go(n.left); out.push(n.val); go(n.right); }; go(toT(tree)); return k ? out[k - 1] : out; } },
  'tree-bfs': { gen: (g) => ({ tree: randTree(g, rint(g, 0, 10)), mode: g() < 0.5 ? 'levels' : 'right' }), ref: ({ tree, mode }) => { const t = toT(tree); if (!t) return []; const res = []; let lvl = [t]; while (lvl.length) { res.push(mode === 'right' ? lvl.at(-1).val : lvl.map((n) => n.val)); lvl = lvl.flatMap((n) => [n.left, n.right].filter(Boolean)); } return res; } },
  'tree-diameter': { gen: (g) => ({ tree: randTree(g, rint(g, 0, 10)) }), ref: ({ tree }) => { const t = toT(tree); const nodes = []; const all = (n) => { if (!n) return; nodes.push(n); all(n.left); all(n.right); }; all(t); const h = (n) => (n ? 1 + Math.max(h(n.left), h(n.right)) : 0); return nodes.reduce((b, n) => Math.max(b, h(n.left) + h(n.right)), 0); } },
  'tree-pathsum': { gen: (g) => ({ tree: randTree(g, rint(g, 0, 10)), target: rint(g, 0, 25) }), ref: ({ tree, target }) => { const go = (n, s) => { if (!n) return false; s += n.val; if (!n.left && !n.right) return s === target; return go(n.left, s) || go(n.right, s); }; return go(toT(tree), 0); } },
  'tree-lca': { gen: (g) => { const t = randTree(g, rint(g, 2, 10), true); const v = t.filter((x) => x != null); return { tree: t, p: v[rint(g, 0, v.length - 1)], q: v[rint(g, 0, v.length - 1)] }; }, ref: ({ tree, p, q }) => { const t = toT(tree); const path = (n, x, acc) => { if (!n) return null; acc = [...acc, n.val]; if (n.val === x) return acc; return path(n.left, x, acc) || path(n.right, x, acc); }; const a = path(t, p, []), b = path(t, q, []); let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return a[i - 1]; } },
  'bst-validate': { gen: (g) => ({ tree: g() < 0.5 ? randBST(g, rint(g, 1, 9)) : randTree(g, rint(g, 1, 9)) }), ref: ({ tree }) => { const out = []; const go = (n) => { if (!n) return; go(n.left); out.push(n.val); go(n.right); }; go(toT(tree)); return out.every((x, i) => i === 0 || out[i - 1] < x); } },
  'bst-lca': { gen: (g) => { const t = randBST(g, rint(g, 2, 10)); const v = t.filter((x) => x != null); return { tree: t, p: v[rint(g, 0, v.length - 1)], q: v[rint(g, 0, v.length - 1)] }; }, ref: ({ tree, p, q }) => { let n = toT(tree); while (n) { if (p < n.val && q < n.val) n = n.left; else if (p > n.val && q > n.val) n = n.right; else return n.val; } } },
  'tree-construct': { gen: (g) => { const t = randTree(g, rint(g, 1, 9), true); const pre = [], ino = []; const a = (n) => { if (!n) return; pre.push(n.val); a(n.left); a(n.right); }; const b = (n) => { if (!n) return; b(n.left); ino.push(n.val); b(n.right); }; const T = toT(t); a(T); b(T); return { pre, ino }; }, ref: ({ pre }) => pre.length },

  // ---------- week 5 ----------
  'rec-fib': { gen: (g) => ({ n: rint(g, 0, 6), memo: g() < 0.5 ? 'yes' : 'no' }), ref: ({ n }) => { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; } },
  'rec-pow': { gen: (g) => ({ x: [2, 3, 0.5, -2, 1.5][rint(g, 0, 4)], n: rint(g, -12, 20) }), ref: ({ x, n }) => x ** n, cmp: (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)) },
  'bt-subsets-a': { gen: (g) => ({ nums: [...new Set(rarr(g, rint(g, 0, 4), 0, 9))] }), ref: ({ nums }) => Array.from({ length: 1 << nums.length }, (_, m) => nums.filter((_, i) => m >> i & 1)), cmp: (a, b) => { const k = (x) => JSON.stringify(x.map((s) => JSON.stringify([...s].sort())).sort()); return a.length === b.length && k(a) === k(b); } },
  'bt-subsets-b': { gen: (g) => ({ nums: [...new Set(rarr(g, rint(g, 0, 4), 0, 9))] }), ref: ({ nums }) => Array.from({ length: 1 << nums.length }, (_, m) => nums.filter((_, i) => m >> i & 1)), cmp: (a, b) => { const k = (x) => JSON.stringify(x.map((s) => JSON.stringify([...s].sort())).sort()); return a.length === b.length && k(a) === k(b); } },
  'bt-subsets-dup': { gen: (g) => ({ nums: rarr(g, rint(g, 0, 4), 1, 3) }), ref: ({ nums }) => { const set = new Set(); for (let m = 0; m < 1 << nums.length; m++) set.add(JSON.stringify(nums.filter((_, i) => m >> i & 1).sort((a, b) => a - b))); return [...set].map((x) => JSON.parse(x)); }, cmp: (a, b) => { const k = (x) => JSON.stringify(x.map((s) => JSON.stringify([...s].sort())).sort()); return a.length === b.length && k(a) === k(b); } },
  'bt-permute': { gen: (g) => ({ nums: [...new Set(rarr(g, rint(g, 1, 4), 0, 9))] }), ref: ({ nums }) => { const out = []; const go = (p, rest) => { if (!rest.length) out.push(p); rest.forEach((x, i) => go([...p, x], rest.filter((_, j) => j !== i))); }; go([], nums); return out; }, cmp: (a, b) => JSON.stringify(a.map(String).sort()) === JSON.stringify(b.map(String).sort()) },
  'bt-combine': { gen: (g) => { const n = rint(g, 1, 5); return { n, k: rint(g, 1, n), prune: g() < 0.5 ? 'yes' : 'no' }; }, ref: ({ n, k }) => { const out = []; for (let m = 0; m < 1 << n; m++) { const s = []; for (let i = 0; i < n; i++) if (m >> i & 1) s.push(i + 1); if (s.length === k) out.push(s); } return out; }, cmp: (a, b) => JSON.stringify(a.map(String).sort()) === JSON.stringify(b.map(String).sort()) },
  'bt-combsum': { gen: (g) => ({ cands: [...new Set(rarr(g, rint(g, 1, 4), 2, 7))], target: rint(g, 1, 12) }), ref: ({ cands, target }) => { const c = [...cands].sort((a, b) => a - b), out = []; const go = (i, rem, p) => { if (rem === 0) { out.push(p); return; } if (i === c.length || rem < 0) return; go(i, rem - c[i], [...p, c[i]]); go(i + 1, rem, p); }; go(0, target, []); return out; }, cmp: (a, b) => JSON.stringify(a.map(String).sort()) === JSON.stringify(b.map(String).sort()) },
  'bt-phone': { gen: (g) => ({ digits: rstr(g, rint(g, 0, 3), '23456789') }), ref: ({ digits }) => { if (!digits) return []; const map = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz']; let out = ['']; for (const d of digits) out = out.flatMap((p) => [...map[d]].map((c) => p + c)); return out; } },
  'bt-parens': { gen: (g) => ({ n: rint(g, 1, 3) }), ref: ({ n }) => { const out = []; for (let m = 0; m < 1 << (2 * n); m++) { let s = '', bal = 0, ok = true; for (let i = 2 * n - 1; i >= 0; i--) { const c = m >> i & 1 ? ')' : '('; s += c; bal += c === '(' ? 1 : -1; if (bal < 0) ok = false; } if (ok && bal === 0) out.push(s); } return out; }, cmp: (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort()) },
  'word-search': {
    gen: (g) => { const r = rint(g, 1, 4), c = rint(g, 1, 4); const board = Array.from({ length: r }, () => Array.from({ length: c }, () => 'ABC'[rint(g, 0, 2)])); return { board, word: rstr(g, rint(g, 1, 5), 'ABC') }; },
    ref: ({ board, word }) => { const m = board.length, n = board[0].length; const seen = board.map((r) => r.map(() => false)); const go = (r, c, k) => { if (k === word.length) return true; if (r < 0 || c < 0 || r >= m || c >= n || seen[r][c] || board[r][c] !== word[k]) return false; seen[r][c] = true; const ok = go(r + 1, c, k + 1) || go(r - 1, c, k + 1) || go(r, c + 1, k + 1) || go(r, c - 1, k + 1); seen[r][c] = false; return ok; }; for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) if (go(r, c, 0)) return true; return false; },
  },
  'n-queens': { gen: (g) => ({ n: rint(g, 1, 5) }), ref: ({ n }) => [1, 0, 0, 2, 10][n - 1] },

  // ---------- week 4 ----------
  'll-reverse': { gen: (g) => ({ vals: rarr(g, rint(g, 1, 8), 0, 9) }), ref: ({ vals }) => [...vals].reverse() },
  'll-reverse-rec': { gen: (g) => ({ vals: rarr(g, rint(g, 1, 7), 0, 9) }), ref: ({ vals }) => [...vals].reverse() },
  'll-merge': { gen: (g) => { const a = sorted(rarr(g, rint(g, 0, 5), 0, 9)), b = sorted(rarr(g, rint(g, 0, 5), 0, 9)); return { a, b }; }, ref: ({ a, b }) => sorted([...a, ...b]) },
  'll-middle': { gen: (g) => ({ vals: rarr(g, rint(g, 1, 9), 0, 9) }), ref: ({ vals }) => vals[Math.floor(vals.length / 2)] },
  floyd: { gen: (g) => { const n = rint(g, 1, 8); return { vals: rarr(g, n, -9, 9), pos: rint(g, -1, n - 1) }; }, ref: ({ pos }) => pos },
  'nth-end': { gen: (g) => { const v = rarr(g, rint(g, 1, 8), 0, 9); return { vals: v, n: rint(g, 1, v.length) }; }, ref: ({ vals, n }) => vals.filter((_, i) => i !== vals.length - n) },
  lru: {
    gen: (g) => ({ cap: rint(g, 1, 3), ops: Array.from({ length: rint(g, 1, 14) }, () => (g() < 0.5 ? ['put', rint(g, 1, 4), rint(g, 1, 9)] : ['get', rint(g, 1, 4)])) }),
    ref: ({ cap, ops }) => { const m = new Map(); return ops.map((o) => { if (o[0] === 'get') { if (!m.has(o[1])) return -1; const v = m.get(o[1]); m.delete(o[1]); m.set(o[1], v); return v; } m.delete(o[1]); m.set(o[1], o[2]); if (m.size > cap) m.delete(m.keys().next().value); return null; }); },
  },
  'stack-match': { gen: (g) => ({ s: rstr(g, rint(g, 0, 12), '()[]{}') }), ref: ({ s }) => { let t = s, prev; do { prev = t; t = t.replace(/\(\)|\[\]|\{\}/g, ''); } while (t !== prev); return t === ''; } },
  'min-stack': {
    gen: (g) => { const ops = []; let size = 0; for (let k = rint(g, 1, 14); k > 0; k--) { if (!size || g() < 0.5) { ops.push(['push', rint(g, -5, 5)]); size++; } else { const r = g(); if (r < 0.34) { ops.push(['pop']); size--; } else ops.push([r < 0.67 ? 'top' : 'getMin']); } } return { ops }; },
    ref: ({ ops }) => { const s = []; return ops.map((o) => { if (o[0] === 'push') { s.push(o[1]); return null; } if (o[0] === 'pop') { s.pop(); return null; } if (o[0] === 'top') return s.at(-1); return Math.min(...s); }); },
  },
  'queue-2stacks': {
    gen: (g) => { const ops = []; let size = 0; for (let k = rint(g, 1, 14); k > 0; k--) { if (!size || g() < 0.5) { ops.push(['push', rint(g, 0, 9)]); size++; } else if (g() < 0.5) { ops.push(['pop']); size--; } else ops.push(['peek']); } return { ops }; },
    ref: ({ ops }) => { const q = []; return ops.map((o) => (o[0] === 'push' ? (q.push(o[1]), null) : o[0] === 'pop' ? q.shift() : q[0])); },
  },
  'mono-stack': { gen: (g) => ({ nums: rarr(g, rint(g, 1, 14), 0, 9) }), ref: ({ nums: a }) => a.map((x, i) => { for (let j = i + 1; j < a.length; j++) if (a[j] > x) return a[j]; return -1; }) },
  'daily-temps': { gen: (g) => ({ t: rarr(g, rint(g, 1, 14), 30, 40) }), ref: ({ t }) => t.map((x, i) => { for (let j = i + 1; j < t.length; j++) if (t[j] > x) return j - i; return 0; }) },
  histogram: { gen: (g) => ({ h: rarr(g, rint(g, 1, 12), 0, 8) }), ref: ({ h }) => { let b = 0; for (let i = 0; i < h.length; i++) { let m = Infinity; for (let j = i; j < h.length; j++) { m = Math.min(m, h[j]); b = Math.max(b, m * (j - i + 1)); } } return b; } },
  'mono-deque': { gen: (g) => { const a = rarr(g, rint(g, 1, 14), -9, 9); return { nums: a, k: rint(g, 1, a.length) }; }, ref: ({ nums: a, k }) => { const r = []; for (let i = 0; i + k <= a.length; i++) r.push(Math.max(...a.slice(i, i + k))); return r; } },

  // ---------- week 3 ----------
  'bs-lower': { gen: (g) => ({ nums: sorted(rarr(g, rint(g, 0, 14), 0, 9)), target: rint(g, -1, 10) }), ref: ({ nums, target }) => { const i = nums.findIndex((x) => x >= target); return i < 0 ? nums.length : i; } },
  'bs-upper': { gen: (g) => ({ nums: sorted(rarr(g, rint(g, 0, 14), 0, 9)), target: rint(g, -1, 10) }), ref: ({ nums, target }) => { const i = nums.findIndex((x) => x > target); return i < 0 ? nums.length : i; } },
  'bs-closed': { gen: (g) => ({ nums: [...new Set(sorted(rarr(g, rint(g, 1, 14), -9, 20)))], target: rint(g, -10, 21) }), ref: ({ nums, target }) => nums.indexOf(target) },
  'bs-rotated-min': { gen: (g) => { const a = [...new Set(sorted(rarr(g, rint(g, 1, 14), -9, 30)))]; const k = rint(g, 0, a.length - 1); return { nums: [...a.slice(k), ...a.slice(0, k)] }; }, ref: ({ nums }) => Math.min(...nums) },
  'bs-rotated-search': { gen: (g) => { const a = [...new Set(sorted(rarr(g, rint(g, 1, 14), -9, 30)))]; const k = rint(g, 0, a.length - 1); return { nums: [...a.slice(k), ...a.slice(0, k)], target: rint(g, -10, 31) }; }, ref: ({ nums, target }) => nums.indexOf(target) },
  'bs-answer': { gen: (g) => { const piles = rarr(g, rint(g, 1, 8), 1, 40); return { piles, h: rint(g, piles.length, piles.length * 6) }; }, ref: ({ piles, h }) => { for (let k = 1; ; k++) if (piles.reduce((s, p) => s + Math.ceil(p / k), 0) <= h) return k; } },
  'bs-matrix': { gen: (g) => { const r = rint(g, 1, 6), c = rint(g, 1, 6); const f = sorted(rarr(g, r * c, 0, 60)); return { matrix: Array.from({ length: r }, (_, i) => f.slice(i * c, i * c + c)), target: rint(g, -1, 61) }; }, ref: ({ matrix, target }) => matrix.flat().includes(target) },
  'bs-peak': { gen: (g) => { const a = [rint(g, 0, 9)]; const n = rint(g, 1, 14); while (a.length < n) { const x = rint(g, 0, 9); if (x !== a.at(-1)) a.push(x); } return { nums: a }; },
    check: ({ nums: a }, i) => Number.isInteger(i) && i >= 0 && i < a.length && (i === 0 || a[i] > a[i - 1]) && (i === a.length - 1 || a[i] > a[i + 1]) },
  'merge-sort': { gen: (g) => ({ nums: rarr(g, rint(g, 1, 9), -5, 9) }), ref: ({ nums }) => sorted(nums) },
  quicksort3: { gen: (g) => ({ nums: rarr(g, rint(g, 1, 12), 0, 5), pivotRule: g() < 0.5 ? 'first' : 'random' }), ref: ({ nums }) => sorted(nums) },
  'merge-back': { gen: (g) => { const A = sorted(rarr(g, rint(g, 0, 6), 0, 9)), B = sorted(rarr(g, rint(g, 1, 6), 0, 9)); return { nums1: [...A, ...B.map(() => 0)], m: A.length, nums2: B }; }, ref: ({ nums1, m, nums2 }) => sorted([...nums1.slice(0, m), ...nums2]) },

  // ---------- week 1 ----------
  growth: { gen: (g) => ({ n: rint(g, 2, 60) }), ref: ({ n }) => n },
  'loop-halving': { gen: (g) => ({ n: rint(g, 1, 32) }), ref: ({ n }) => { let c = 0; for (let i = n; i > 1; i = Math.floor(i / 2)) c++; return c; } },
  'loop-nlogn': { gen: (g) => ({ n: rint(g, 1, 32) }), ref: ({ n }) => { let c = 0; for (let i = 0; i < n; i++) for (let j = 1; j < n; j *= 2) c++; return c; } },
  'loop-triangle': { gen: (g) => ({ n: rint(g, 1, 32) }), ref: ({ n }) => (n * (n - 1)) / 2 },
  'tree-double': { gen: (g) => ({ n: rint(g, 1, 5) }), ref: ({ n }) => 2 ** Math.max(1, n) - 1 - (n <= 1 ? 0 : 0) },
  'amortized-push': { gen: (g) => ({ n: rint(g, 1, 40) }), ref: () => true },
  'hash-twosum': {
    gen: (g) => ({ nums: rarr(g, rint(g, 1, 14), -6, 9), target: rint(g, -8, 14) }),
    ref: ({ nums: a, target }) => { for (let j = 0; j < a.length; j++) for (let i = 0; i < j; i++) if (a[i] + a[j] === target) { let first = i; for (let t = 0; t < j; t++) if (a[t] === a[i]) first = t; return [first, j]; } return []; },
  },
  'hash-buckets': {
    gen: (g) => { const pool = ['ab', 'ba', 'cat', 'dog', 'x', 'yy', 'zzz', 'k1', 'k2', 'owl', 'emu', 'q']; const keys = [...new Set(Array.from({ length: rint(g, 1, 10) }, () => pool[rint(g, 0, pool.length - 1)]))]; return { keys, buckets: rint(g, 1, 8), find: pool[rint(g, 0, pool.length - 1)] }; },
    ref: ({ keys, find }) => keys.includes(find),
  },
  'remove-dups': { gen: (g) => ({ nums: sorted(rarr(g, rint(g, 0, 14), 0, 5)) }), ref: ({ nums }) => new Set(nums).size },
  'move-zeroes': { gen: (g) => ({ nums: rarr(g, rint(g, 1, 14), 0, 3) }), ref: ({ nums }) => [...nums.filter((x) => x !== 0), ...nums.filter((x) => x === 0)] },
  'running-min': { gen: (g) => ({ prices: rarr(g, rint(g, 1, 16), 0, 20) }), ref: ({ prices: p }) => { let b = 0; for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) b = Math.max(b, p[j] - p[i]); return b; } },
  'anagram-count': { gen: (g) => { const s = rstr(g, rint(g, 0, 10), 'abc'); return { s, t: g() < 0.5 ? [...s].sort(() => g() - 0.5).join('') : rstr(g, rint(g, 0, 10), 'abc') }; }, ref: ({ s, t }) => [...s].sort().join('') === [...t].sort().join('') },
  'group-anagrams': {
    gen: (g) => ({ strs: Array.from({ length: rint(g, 1, 10) }, () => rstr(g, rint(g, 0, 3), 'abt')), keyType: g() < 0.5 ? 'sorted' : 'counts' }),
    ref: ({ strs }) => { const m = new Map(); for (const s of strs) { const k = [...s].sort().join(''); if (!m.has(k)) m.set(k, []); m.get(k).push(s); } return [...m.values()]; },
    cmp: (a, b) => { const n = (x) => JSON.stringify(x.map((y) => [...y].sort()).sort()); return n(a) === n(b); },
  },
  'longest-consec': { gen: (g) => ({ nums: rarr(g, rint(g, 0, 14), -3, 12) }), ref: ({ nums }) => { const s = new Set(nums); let b = 0; for (const x of s) { let l = 0; while (s.has(x + l)) l++; b = Math.max(b, l); } return b; } },
  'bucket-freq': {
    gen: (g) => { const a = rarr(g, rint(g, 1, 14), 1, 5); return { nums: a, k: rint(g, 1, new Set(a).size) }; },
    // any valid top-k: every chosen value's count >= every unchosen value's count
    check: ({ nums, k }, res) => { const c = {}; nums.forEach((x) => (c[x] = (c[x] || 0) + 1)); if (!Array.isArray(res) || res.length !== k || new Set(res).size !== k) return false; const chosen = new Set(res.map(String)); const minIn = Math.min(...res.map((x) => c[x])); return Object.keys(c).every((x) => chosen.has(x) || c[x] <= minIn); },
  },
  'boyer-moore': {
    gen: (g) => { const n = rint(g, 1, 15), maj = rint(g, 0, 3), a = rarr(g, n, 0, 3); const need = Math.floor(n / 2) + 1; let cnt = a.filter((x) => x === maj).length; for (let i = 0; i < n && cnt < need; i++) if (a[i] !== maj) { a[i] = maj; cnt++; } return { nums: a }; },
    ref: ({ nums }) => { const c = {}; nums.forEach((x) => (c[x] = (c[x] || 0) + 1)); return Number(Object.keys(c).find((x) => c[x] > nums.length / 2)); },
  },
  spiral: {
    gen: (g) => { const r = rint(g, 1, 6), c = rint(g, 1, 6); let v = 1; return { matrix: Array.from({ length: r }, () => Array.from({ length: c }, () => v++)) }; },
    ref: ({ matrix: m }) => { const R = m.length, C = m[0].length, seen = m.map((r) => r.map(() => false)), out = []; const d = [[0, 1], [1, 0], [0, -1], [-1, 0]]; let r = 0, c = 0, k = 0; for (let t = 0; t < R * C; t++) { out.push(m[r][c]); seen[r][c] = true; const nr = r + d[k][0], nc = c + d[k][1]; if (nr < 0 || nr >= R || nc < 0 || nc >= C || seen[nr][nc]) k = (k + 1) % 4; r += d[k][0]; c += d[k][1]; } return out; },
  },
  rotate: {
    gen: (g) => { const n = rint(g, 1, 6); let v = 1; return { matrix: Array.from({ length: n }, () => Array.from({ length: n }, () => v++)) }; },
    ref: ({ matrix: m }) => { const n = m.length; return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => m[n - 1 - c][r])); },
  },
  'pair-brute': {
    gen: (g) => { const a = sorted(rarr(g, rint(g, 2, 9), -9, 15)); return { numbers: a, target: rint(g, -10, 25) }; },
    // first pair in (i, j) lexicographic order
    ref: ({ numbers: a, target }) => { for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] + a[j] === target) return [i + 1, j + 1]; return []; },
  },
  'two-sum-sorted': {
    gen: (g) => { const a = sorted(rarr(g, rint(g, 2, 10), -9, 15)); return { numbers: a, target: rint(g, -10, 25) }; },
    // any valid pair is accepted: check the pair, or that none exists
    check: ({ numbers: a, target }, res) => {
      const exists = a.some((x, i) => a.some((y, j) => j > i && x + y === target));
      if (!exists) return Array.isArray(res) && res.length === 0;
      return Array.isArray(res) && res.length === 2 && res[0] < res[1] && a[res[0] - 1] + a[res[1] - 1] === target;
    },
  },
  palindrome: {
    gen: (g) => { const base = rstr(g, rint(g, 0, 8), 'aAb1 ,.'); const s = g() < 0.5 ? base + [...base].reverse().join('') : base; return { s: s || ' ' }; },
    ref: ({ s }) => { const t = s.toLowerCase().replace(/[^a-z0-9]/g, ''); return t === [...t].reverse().join(''); },
  },
  container: {
    gen: (g) => ({ height: rarr(g, rint(g, 2, 14), 0, 12) }),
    ref: ({ height: h }) => { let b = 0; for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) b = Math.max(b, Math.min(h[i], h[j]) * (j - i)); return b; },
  },
  trap: {
    gen: (g) => ({ height: rarr(g, rint(g, 1, 16), 0, 6) }),
    ref: ({ height: h }) => h.reduce((acc, x, i) => acc + Math.max(0, Math.min(Math.max(...h.slice(0, i + 1)), Math.max(...h.slice(i))) - x), 0),
  },
  'dutch-flag': {
    gen: (g) => ({ nums: rarr(g, rint(g, 1, 14), 0, 2) }),
    ref: ({ nums }) => sorted(nums),
  },
  kadane: {
    gen: (g) => ({ nums: rarr(g, rint(g, 1, 14), -9, 9) }),
    ref: ({ nums: a }) => { let b = -Infinity; for (let i = 0; i < a.length; i++) { let s = 0; for (let j = i; j < a.length; j++) { s += a[j]; b = Math.max(b, s); } } return b; },
  },
  'win-fixed': {
    gen: (g) => { const a = rarr(g, rint(g, 1, 16), -20, 50); return { nums: a, k: rint(g, 1, a.length) }; },
    ref: ({ nums: a, k }) => { let b = -Infinity; for (let i = 0; i + k <= a.length; i++) b = Math.max(b, a.slice(i, i + k).reduce((x, y) => x + y, 0)); return b / k; },
    cmp: (a, b) => Math.abs(a - b) < 1e-9,
  },
  'win-longest': {
    gen: (g) => ({ s: rstr(g, rint(g, 0, 20), 'abcd ') }),
    ref: ({ s }) => { let b = 0; for (let i = 0; i < s.length; i++) { const seen = new Set(); for (let j = i; j < s.length && !seen.has(s[j]); j++) { seen.add(s[j]); b = Math.max(b, j - i + 1); } } return b; },
  },
  'win-replace': {
    gen: (g) => ({ s: rstr(g, rint(g, 1, 20), 'ABC'), k: rint(g, 0, 3) }),
    ref: ({ s, k }) => { let b = 0; for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) { const c = {}; let m = 0; for (let t = i; t <= j; t++) { c[s[t]] = (c[s[t]] || 0) + 1; m = Math.max(m, c[s[t]]); } if (j - i + 1 - m <= k) b = Math.max(b, j - i + 1); } return b; },
  },
  'win-min': {
    gen: (g) => ({ nums: rarr(g, rint(g, 1, 16), 1, 9), target: rint(g, 1, 40) }),
    ref: ({ nums: a, target }) => { let b = Infinity; for (let i = 0; i < a.length; i++) { let s = 0; for (let j = i; j < a.length; j++) { s += a[j]; if (s >= target) { b = Math.min(b, j - i + 1); break; } } } return b === Infinity ? 0 : b; },
  },
  'win-perm': {
    gen: (g) => ({ s1: rstr(g, rint(g, 1, 4), 'abc'), s2: rstr(g, rint(g, 1, 20), 'abcd') }),
    ref: ({ s1, s2 }) => { const key = (x) => [...x].sort().join(''); const k = key(s1); for (let i = 0; i + s1.length <= s2.length; i++) if (key(s2.slice(i, i + s1.length)) === k) return true; return false; },
  },
  'prefix-range': {
    gen: (g) => { const a = rarr(g, rint(g, 1, 14), -9, 9); const l = rint(g, 0, a.length - 1); return { nums: a, l, r: rint(g, l, a.length - 1) }; },
    ref: ({ nums, l, r }) => nums.slice(l, r + 1).reduce((x, y) => x + y, 0),
  },
  'prefix-map': {
    gen: (g) => ({ nums: rarr(g, rint(g, 1, 12), -3, 3), k: rint(g, -3, 4) }),
    ref: ({ nums: a, k }) => { let c = 0; for (let i = 0; i < a.length; i++) { let s = 0; for (let j = i; j < a.length; j++) { s += a[j]; if (s === k) c++; } } return c; },
  },
  'diff-array': {
    gen: (g) => { const n = rint(g, 1, 14); return { n, updates: Array.from({ length: rint(g, 0, 8) }, () => { const l = rint(g, 0, n - 1); return [l, rint(g, l, n - 1), rint(g, -5, 10)]; }) }; },
    ref: ({ n, updates }) => { const o = new Array(n).fill(0); for (const [l, r, v] of updates) for (let i = l; i <= r; i++) o[i] += v; return o; },
  },

  // ---------- week 9 ----------
  dijkstra: { gen: (g) => { const n = rint(g, 1, 7); return { n, src: rint(g, 1, n), edges: Array.from({ length: rint(g, 0, 14) }, () => [rint(g, 1, n), rint(g, 1, n), rint(g, 0, 9)]) }; },
    ref: ({ n, edges, src }) => { const d = new Array(n + 1).fill(Infinity); d[src] = 0; for (let k = 0; k < n; k++) for (const [u, v, w] of edges) if (d[u] + w < d[v]) d[v] = d[u] + w; return d.slice(1); } },
  dsu: { gen: (g) => { const n = rint(g, 1, 8); return { n, ops: Array.from({ length: rint(g, 0, 12) }, () => (g() < 0.7 ? ['union', rint(g, 0, n - 1), rint(g, 0, n - 1)] : ['find', rint(g, 0, n - 1)])) }; },
    check: ({ n, ops }, r) => { const comp = Array.from({ length: n }, (_, i) => i); const same = (a, b) => comp[a] === comp[b]; const merge = (a, b) => { const x = comp[a], y = comp[b]; for (let i = 0; i < n; i++) if (comp[i] === y) comp[i] = x; }; let k = 0; for (const o of ops) { const got = r.out[k++]; if (o[0] === 'union') { const exp = !same(o[1], o[2]); if (got !== exp) return false; if (exp) merge(o[1], o[2]); } else if (!(got >= 0 && got < n && same(got, o[1]))) return false; } return r.comps === new Set(comp).size; } },
  kruskal: { gen: (g) => { const n = rint(g, 1, 7); return { n, edges: Array.from({ length: rint(g, 0, 14) }, () => [rint(g, 0, n - 1), rint(g, 0, n - 1), rint(g, 0, 9)]) }; },
    ref: ({ n, edges }) => { // brute force: cheapest spanning tree over all edge subsets of size n − 1 (small inputs)
      if (n === 1) return 0; let best = Infinity; const m = edges.length; const pick = (i, chosen, cost) => { if (cost >= best) return; if (chosen.length === n - 1) { const p = Array.from({ length: n }, (_, k) => k); const f = (x) => (p[x] === x ? x : (p[x] = f(p[x]))); for (const [u, v] of chosen) { const a = f(u), b = f(v); if (a === b) return; p[a] = b; } best = cost; return; } if (m - i < n - 1 - chosen.length) return; pick(i + 1, [...chosen, edges[i]], cost + edges[i][2]); pick(i + 1, chosen, cost); }; pick(0, [], 0); return best === Infinity ? -1 : best; } },
  'prim-array': { gen: (g) => ({ pts: Array.from({ length: rint(g, 1, 7) }, () => [rint(g, -9, 9), rint(g, -9, 9)]) }),
    ref: ({ pts }) => { const n = pts.length, es = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) es.push([i, j, Math.abs(pts[i][0] - pts[j][0]) + Math.abs(pts[i][1] - pts[j][1])]); es.sort((a, b) => a[2] - b[2]); const p = pts.map((_, i) => i); const f = (x) => (p[x] === x ? x : (p[x] = f(p[x]))); let c = 0; for (const [u, v, w] of es) { const a = f(u), b = f(v); if (a !== b) { p[a] = b; c += w; } } return c; } },
  'bellman-k': { gen: (g) => { const n = rint(g, 1, 6); return { n, src: rint(g, 0, n - 1), dst: rint(g, 0, n - 1), k: rint(g, 0, 4), flights: Array.from({ length: rint(g, 0, 12) }, () => [rint(g, 0, n - 1), rint(g, 0, n - 1), rint(g, 1, 9)]) }; },
    ref: ({ n, flights, src, dst, k }) => { if (src === dst) return 0; let best = Infinity; const go = (u, cost, used) => { if (u === dst) { best = Math.min(best, cost); return; } if (used === k + 1) return; for (const [a, b, p] of flights) if (a === u) go(b, cost + p, used + 1); }; go(src, 0, 0); return best === Infinity ? -1 : best; } },
  'jump-game': { gen: (g) => ({ nums: rarr(g, rint(g, 1, 12), 0, 3) }), ref: ({ nums }) => { const ok = new Array(nums.length).fill(false); ok[0] = true; for (let i = 0; i < nums.length; i++) if (ok[i]) for (let j = 1; j <= nums[i] && i + j < nums.length; j++) ok[i + j] = true; return ok[nums.length - 1]; } },
  'jump-game2': { gen: (g) => { let a; do a = rarr(g, rint(g, 1, 12), 0, 3); while ((() => { let f = 0; for (let i = 0; i < a.length; i++) { if (i > f) return true; f = Math.max(f, i + a[i]); } return false; })()); return { nums: a }; },
    ref: ({ nums }) => { const d = new Array(nums.length).fill(Infinity); d[0] = 0; for (let i = 0; i < nums.length; i++) for (let j = 1; j <= nums[i] && i + j < nums.length; j++) d[i + j] = Math.min(d[i + j], d[i] + 1); return d[nums.length - 1]; } },
  'gas-station': { gen: (g) => { const n = rint(g, 1, 8); return { gas: rarr(g, n, 0, 6), cost: rarr(g, n, 0, 6) }; },
    check: ({ gas, cost }, r) => { const n = gas.length; const works = (s) => { let t = 0; for (let k = 0; k < n; k++) { const i = (s + k) % n; t += gas[i] - cost[i]; if (t < 0) return false; } return true; }; const any = gas.some((_, s) => works(s)); return any ? r >= 0 && r < n && works(r) : r === -1; } },
  'partition-labels': { gen: (g) => ({ s: rstr(g, rint(g, 1, 18), 'abcdef') }),
    ref: ({ s }) => { const out = []; let i = 0; while (i < s.length) { let j = i; for (let e = i; e <= j; e++) j = Math.max(j, s.lastIndexOf(s[e])); out.push(j - i + 1); i = j + 1; } return out; } },

  // ---------- week 10 (references are brute-force recursions, not the DP being tested) ----------
  'dp-stairs': { gen: (g) => (g() < 0.5 ? { problem: 'ways', n: rint(g, 1, 15), cost: [1, 1] } : { problem: 'cost', n: 2, cost: rarr(g, rint(g, 2, 12), 0, 20) }),
    ref: ({ problem, n, cost }) => { if (problem === 'ways') { const f = (k) => (k <= 1 ? 1 : f(k - 1) + f(k - 2)); return f(n); } const N = cost.length; const f = (i) => (i >= N ? 0 : cost[i] + Math.min(f(i + 1), f(i + 2))); return Math.min(f(0), f(1)); } },
  'house-robber': { gen: (g) => ({ nums: rarr(g, rint(g, 1, 12), 0, 20), circle: g() < 0.5 ? 'yes' : 'no' }),
    ref: ({ nums, circle }) => { const n = nums.length; let best = 0; for (let m = 0; m < 1 << n; m++) { if (m & (m << 1)) continue; if (circle === 'yes' && n > 1 && (m & 1) && (m >> (n - 1) & 1)) continue; let s = 0; for (let i = 0; i < n; i++) if (m >> i & 1) s += nums[i]; best = Math.max(best, s); } return best; } },
  'coin-change': { gen: (g) => ({ coins: [...new Set(rarr(g, rint(g, 1, 4), 1, 9))], amount: rint(g, 0, 20) }),
    ref: ({ coins, amount }) => { let best = Infinity; const go = (rem, used, k) => { if (rem === 0) { best = Math.min(best, used); return; } if (k === coins.length || used >= best) return; for (let t = Math.floor(rem / coins[k]); t >= 0; t--) go(rem - t * coins[k], used + t, k + 1); }; go(amount, 0, 0); return best === Infinity ? -1 : best; } },
  'coin-ways': { gen: (g) => ({ coins: [...new Set(rarr(g, rint(g, 1, 4), 1, 6))], amount: rint(g, 0, 12), order: g() < 0.5 ? 'coins' : 'amounts' }),
    ref: ({ coins, amount, order }) => { if (order === 'amounts') { const f = (r) => (r === 0 ? 1 : coins.reduce((s, c) => s + (c <= r ? f(r - c) : 0), 0)); return f(amount); } const f = (r, k) => (r === 0 ? 1 : k === coins.length ? 0 : (coins[k] <= r ? f(r - coins[k], k) : 0) + f(r, k + 1)); return f(amount, 0); } },
  'grid-dp': { gen: (g) => { const m = rint(g, 1, 5), n = rint(g, 1, 5), mode = g() < 0.5 ? 'paths' : 'sum'; return { mode, grid: Array.from({ length: m }, () => Array.from({ length: n }, () => (mode === 'paths' ? (g() < 0.2 ? 1 : 0) : rint(g, 0, 9)))) }; },
    ref: ({ mode, grid }) => { const m = grid.length, n = grid[0].length; const f = (r, c) => { if (r >= m || c >= n) return mode === 'paths' ? 0 : Infinity; if (mode === 'paths' && grid[r][c] === 1) return 0; if (r === m - 1 && c === n - 1) return mode === 'paths' ? 1 : grid[r][c]; return mode === 'paths' ? f(r + 1, c) + f(r, c + 1) : grid[r][c] + Math.min(f(r + 1, c), f(r, c + 1)); }; return f(0, 0); } },
  'word-break': { gen: (g) => ({ s: rstr(g, rint(g, 1, 12), 'ab'), words: Array.from({ length: rint(g, 0, 4) }, () => rstr(g, rint(g, 1, 3), 'ab')) }),
    ref: ({ s, words }) => { const f = (i) => i === s.length || words.some((w) => w && s.startsWith(w, i) && f(i + w.length)); return f(0); } },
  'decode-ways': { gen: (g) => ({ s: rstr(g, rint(g, 1, 10), '0121262789') }),
    ref: ({ s }) => { const f = (i) => { if (i === s.length) return 1; if (s[i] === '0') return 0; let t = f(i + 1); if (i + 1 < s.length && Number(s.slice(i, i + 2)) <= 26) t += f(i + 2); return t; }; return f(0); } },
  'max-product': { gen: (g) => ({ nums: rarr(g, rint(g, 1, 10), -4, 4) }),
    ref: ({ nums }) => { let b = -Infinity; for (let i = 0; i < nums.length; i++) { let p = 1; for (let j = i; j < nums.length; j++) { p *= nums[j]; b = Math.max(b, p); } } return b; } },

  // ---------- week 11 ----------
  knap01: { gen: (g) => ({ nums: rarr(g, rint(g, 1, 6), 1, 8), target: g() < 0.5 ? '' : String(rint(g, 0, 20)), dir: g() < 0.7 ? 'down' : 'up' }),
    ref: ({ nums, target, dir }) => { const total = nums.reduce((a, b) => a + b, 0); if (target === '' && total % 2) return false; const T = target === '' ? total / 2 : Number(target);
      if (dir === 'up') { const ok = new Array(T + 1).fill(false); ok[0] = true; for (let j = 1; j <= T; j++) ok[j] = nums.some((x) => x <= j && ok[j - x]); return ok[T]; } // upward loop = unbounded
      for (let m = 0; m < 1 << nums.length; m++) { let t = 0; nums.forEach((x, i) => { if (m >> i & 1) t += x; }); if (t === T) return true; } return false; } },
  'two-seq': { gen: (g) => ({ mode: g() < 0.5 ? 'lcs' : 'edit', a: rstr(g, rint(g, 0, 7), 'abc'), b: rstr(g, rint(g, 0, 7), 'abc') }),
    ref: ({ mode, a, b }) => { const memo = new Map(); const f = (i, j) => { const k = i * 100 + j; if (memo.has(k)) return memo.get(k); let v; if (mode === 'lcs') v = i === a.length || j === b.length ? 0 : a[i] === b[j] ? 1 + f(i + 1, j + 1) : Math.max(f(i + 1, j), f(i, j + 1)); else v = i === a.length ? b.length - j : j === b.length ? a.length - i : a[i] === b[j] ? f(i + 1, j + 1) : 1 + Math.min(f(i + 1, j), f(i, j + 1), f(i + 1, j + 1)); memo.set(k, v); return v; }; return f(0, 0); } },
  lis: { gen: (g) => ({ nums: rarr(g, rint(g, 1, 12), 0, 9), method: g() < 0.5 ? 'dp' : 'tails' }),
    ref: ({ nums }) => { let best = 0; for (let m = 1; m < 1 << nums.length; m++) { const sub = nums.filter((_, i) => m >> i & 1); if (sub.every((x, i) => i === 0 || sub[i - 1] < x)) best = Math.max(best, sub.length); } return best; } },
  'pal-expand': { gen: (g) => ({ s: rstr(g, rint(g, 1, 12), 'ab'), goal: g() < 0.5 ? 'longest' : 'count' }),
    ref: ({ s, goal }) => { let c = 0, b = 0; for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) { const t = s.slice(i, j + 1); if (t === [...t].reverse().join('')) { c++; b = Math.max(b, t.length); } } return goal === 'count' ? c : b; } },
  'stock-cooldown': { gen: (g) => ({ prices: rarr(g, rint(g, 1, 10), 0, 9) }),
    ref: ({ prices }) => { const n = prices.length; const memo = new Map(); const f = (i, holding) => { if (i >= n) return 0; const k = i * 2 + holding; if (memo.has(k)) return memo.get(k); const v = holding ? Math.max(f(i + 1, 1), prices[i] + f(i + 2, 0)) : Math.max(f(i + 1, 0), -prices[i] + f(i + 1, 1)); memo.set(k, v); return v; }; return f(0, 0); } },
  'bit-count': { gen: (g) => ({ x: rint(g, -2147483648, 2147483647) }), ref: ({ x }) => [...((x >>> 0).toString(2))].filter((c) => c === '1').length },
  'xor-fold': { gen: (g) => { if (g() < 0.5) { const k = rint(g, 0, 5); const vals = [...new Set(rarr(g, k + 1, 0, 50))]; const single = vals.pop(); const arr = [...vals, ...vals, single]; for (let i = arr.length - 1; i > 0; i--) { const j = rint(g, 0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return { nums: arr, mode: 'single' }; } const n = rint(g, 1, 11), miss = rint(g, 0, n); const arr = Array.from({ length: n + 1 }, (_, i) => i).filter((x) => x !== miss); for (let i = arr.length - 1; i > 0; i--) { const j = rint(g, 0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return { nums: arr, mode: 'missing' }; },
    ref: ({ nums, mode }) => { if (mode === 'missing') { for (let i = 0; i <= nums.length; i++) if (!nums.includes(i)) return i; } const c = {}; nums.forEach((x) => (c[x] = (c[x] || 0) + 1)); return Number(Object.keys(c).find((k) => c[k] === 1)); } },
  'count-bits-dp': { gen: (g) => ({ n: rint(g, 0, 20) }), ref: ({ n }) => Array.from({ length: n + 1 }, (_, i) => [...i.toString(2)].filter((c) => c === '1').length) },

  // ---------- week 12 (method visualizers: the final step must name the expected pattern) ----------
  recognise: { ref: ({ problem }) => ({ window: 'Sliding window', teams: 'Backtracking', maze: 'BFS', stairs: 'DP', queries: 'Binary search' })[problem] },
  'interview-clock': { ref: ({ scenario }) => scenario },
  depmap: { ref: () => 10 },
};
