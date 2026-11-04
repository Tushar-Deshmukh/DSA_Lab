// Week 8 visualizers: building adjacency lists, DFS/BFS components, grid flood fill,
// multi-source BFS, grid shortest path, Kahn's topological sort, three-state cycle detection,
// two-colouring and reverse search from the oceans.
(function (g) {
  'use strict';
  const { el } = g.Core;
  const R = g.R, V = g.Viz;

  // ---------- layouts ----------
  function circle(n) { return Array.from({ length: n }, (_, i) => ({ id: i, x: n === 1 ? 0.5 : 0.5 + 0.45 * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / n), y: n === 1 ? 0.5 : 0.5 + 0.45 * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / n) })); }
  function layered(n, edges) { // longest-path layering for DAGs; falls back to circle on cycles
    const indeg = new Array(n).fill(0), adj = Array.from({ length: n }, () => []);
    edges.forEach(([u, v]) => { adj[u].push(v); indeg[v]++; });
    const level = new Array(n).fill(0), q = []; indeg.forEach((d, i) => { if (!d) q.push(i); }); let seen = 0; const deg = [...indeg];
    for (let h = 0; h < q.length; h++) { const u = q[h]; seen++; for (const v of adj[u]) { level[v] = Math.max(level[v], level[u] + 1); if (--deg[v] === 0) q.push(v); } }
    if (seen < n) return circle(n);
    const maxL = Math.max(...level), byL = {}; level.forEach((l, i) => (byL[l] = byL[l] || []).push(i));
    const pos = new Array(n);
    Object.entries(byL).forEach(([l, ids]) => ids.forEach((id, k) => (pos[id] = { id, x: maxL ? Number(l) / maxL : 0.5, y: ids.length === 1 ? 0.5 : k / (ids.length - 1) })));
    return pos;
  }
  const edgeCheck = (n, edges) => (!Number.isInteger(n) || n < 1 || n > 10 ? 'Use 1–10 nodes.' : !Array.isArray(edges) || edges.length > 16 || edges.some((e) => !Array.isArray(e) || e.length < 2 || e[0] < 0 || e[1] < 0 || e[0] >= n || e[1] >= n) ? 'Edges look like [[0,1],[1,2]] with node numbers below n (at most 16 edges).' : null);
  const adjOf = (n, edges, directed) => { const adj = Array.from({ length: n }, () => []); for (const [u, v] of edges) { adj[u].push(v); if (!directed) adj[v].push(u); } return adj; };
  const adjView = (adj) => el('div.small.ui', { style: { fontFamily: 'var(--f-code)', lineHeight: '1.7' } }, el('div.panel-label', 'adjacency list'), ...adj.map((a, i) => el('div', i + ': [' + a.join(', ') + ']')));

  V.define('graph-build', {
    title: 'From an edge list to an adjacency list',
    inputs: [{ key: 'n', label: 'n (nodes 0..n−1)', type: 'int', def: 5 }, { key: 'edges', label: 'edges', type: 'json', def: [[0, 1], [1, 2], [3, 4]], wide: true }, { key: 'dir', label: 'edges are', type: 'select', def: 'undirected', options: [{ value: 'undirected', label: 'undirected (push both ways)' }, { value: 'directed', label: 'directed (u → v only)' }] }],
    presets: [{ label: 'Day 1 graph (undirected)', input: { n: 5, edges: [[0, 1], [1, 2], [3, 4]], dir: 'undirected' } }, { label: 'Same edges, directed', input: { n: 5, edges: [[0, 1], [1, 2], [3, 4]], dir: 'directed' } }],
    legend: [['current', 'edge being added']],
    code: `
const adj = Array.from({ length: n }, () => []);     // one list per node   //@init
for (const [u, v] of edges) {
  adj[u].push(v);                                                          //@uv
  adj[v].push(u);                // undirected only: the reverse direction //@vu
}`,
    validate: ({ n, edges }) => edgeCheck(n, edges),
    run({ n, edges, dir }) {
      const adj = Array.from({ length: n }, () => []), steps = [];
      steps.push({ adj: adj.map((a) => [...a]), k: -1, line: 'init', note: `${n} empty lists. Use Array.from with a function so every list is a different array (Week 1: the shared-row bug).` });
      edges.forEach(([u, v], k) => { adj[u].push(v); if (dir === 'undirected') adj[v].push(u); steps.push({ adj: adj.map((a) => [...a]), k, line: dir === 'undirected' ? ['uv', 'vu'] : 'uv', note: dir === 'undirected' ? `Edge ${u}–${v}: add ${v} to ${u}'s list and ${u} to ${v}'s.` : `Edge ${u} → ${v}: add ${v} to ${u}'s list only.` }); });
      steps.push({ adj, k: edges.length, done: true, line: null, result: adj, note: `${edges.length} edges → ${adj.reduce((s, a) => s + a.length, 0)} list entries.`, why: 'O(V + E) space. Forgetting the reverse push for undirected edges is a classic bug (problem 1971).' });
      return steps;
    },
    render(st, stage, { n, edges, dir }) {
      const es = {}; if (st.k >= 0 && st.k < edges.length) es[st.k] = 'current';
      stage.append(R.graph({ nodes: circle(n), edges: edges.map(([u, v]) => ({ u, v })), directed: dir === 'directed' }, { edgeStates: es, w: 300, h: 220 }));
      stage.append(adjView(st.adj));
    },
  });

  function componentsDef(id, title, useStack) {
    V.define(id, {
      title,
      inputs: [{ key: 'n', label: 'n', type: 'int', def: 5 }, { key: 'edges', label: 'undirected edges', type: 'json', def: [[0, 1], [1, 2], [3, 4]], wide: true }],
      presets: [{ label: 'Day 1–2 graph', input: { n: 5, edges: [[0, 1], [1, 2], [3, 4]] } }, { label: 'One component', input: { n: 6, edges: [[0, 1], [0, 2], [1, 3], [2, 4], [4, 5]] } }, { label: 'Isolated nodes', input: { n: 4, edges: [[1, 2]] } }],
      legend: [['current', 'popped / dequeued'], ['frontier', `in the ${useStack ? 'stack' : 'queue'}`], ['done', 'visited']],
      code: useStack ? `
let count = 0; const seen = new Array(n).fill(false);
for (let s = 0; s < n; s++) {
  if (seen[s]) continue;
  count++; seen[s] = true; const stack = [s];              // new component //@new
  while (stack.length) {
    const u = stack.pop();                                                  //@pop
    for (const v of adj[u]) if (!seen[v]) { seen[v] = true; stack.push(v); } //@push
  }
}` : `
let count = 0; const seen = new Array(n).fill(false);
for (let s = 0; s < n; s++) {
  if (seen[s]) continue;
  count++; seen[s] = true; const q = [s];                  // new component //@new
  for (let h = 0; h < q.length; h++) {
    const u = q[h];                                                         //@pop
    for (const v of adj[u]) if (!seen[v]) { seen[v] = true; q.push(v); }    //@push
  }
}`,
      validate: ({ n, edges }) => edgeCheck(n, edges),
      run({ n, edges }) {
        const adj = adjOf(n, edges, false), seen = new Array(n).fill(false), comp = new Array(n).fill(-1), steps = []; let count = 0;
        for (let s = 0; s < n; s++) {
          if (seen[s]) continue;
          count++; seen[s] = true; comp[s] = count - 1; const box = [s];
          steps.push({ box: [...box], seen: [...seen], comp: [...comp], count, line: 'new', note: `Node ${s} is unvisited: component #${count} starts here.` });
          let h = 0;
          while (useStack ? box.length : h < box.length) {
            const u = useStack ? box.pop() : box[h++]; const added = [];
            for (const v of adj[u]) if (!seen[v]) { seen[v] = true; comp[v] = count - 1; box.push(v); added.push(v); }
            steps.push({ box: useStack ? [...box] : box.slice(h), seen: [...seen], comp: [...comp], cur: u, count, line: ['pop', 'push'], note: `${useStack ? 'Pop' : 'Dequeue'} ${u}; ${added.length ? 'mark and ' + (useStack ? 'push' : 'enqueue') + ' ' + added.join(', ') : 'no unvisited neighbours'}.`, why: added.length && steps.length < 4 ? 'Mark when pushing, not when popping: otherwise a node reachable from several neighbours is pushed several times.' : null });
          }
        }
        steps.push({ box: [], seen, comp, count, done: true, line: null, result: count, note: `${count} component${count === 1 ? '' : 's'}.`, why: 'Every node is marked once and every edge looked at twice: O(V + E).' });
        return steps;
      },
      render(st, stage, { n, edges }) {
        const states = {}, subs = {}; st.seen.forEach((s, i) => { if (s) { states[i] = 'done'; subs[i] = 'c' + (st.comp[i] + 1); } });
        st.box.forEach((i) => (states[i] = 'frontier')); if (st.cur != null) states[st.cur] = 'current';
        stage.append(R.graph({ nodes: circle(n), edges: edges.map(([u, v]) => ({ u, v })) }, { states, subs, w: 300, h: 230 }));
        stage.append(useStack ? R.stack(st.box) : R.queue(st.box));
        stage.append(R.vars({ components: st.count }));
      },
    });
  }
  componentsDef('graph-dfs', 'Components with iterative DFS (explicit stack)', true);
  componentsDef('graph-bfs', 'Components with BFS (head-pointer queue)', false);

  // ---------- grids ----------
  const gridCheck = (gr, cells) => (!Array.isArray(gr) || !gr.length || !gr.every((r) => Array.isArray(r) && r.length === gr[0].length) ? 'Enter a rectangular grid.' : gr.length * gr[0].length > 49 ? 'Keep the grid to 49 cells (e.g. 7 × 7).' : cells && gr.flat().some((x) => !cells.includes(String(x))) ? 'Use only ' + cells.join(', ') + ' in the grid.' : null);
  const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  V.define('islands', {
    title: 'Number of Islands: sink each island with a stack',
    inputs: [{ key: 'grid', label: 'grid ("1" land, "0" water)', type: 'json', def: [['1', '1', '0', '0', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '1', '0', '0'], ['0', '0', '0', '1', '1']], wide: true }],
    presets: [{ label: 'LeetCode example 2', input: { grid: [['1', '1', '0', '0', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '1', '0', '0'], ['0', '0', '0', '1', '1']] } }, { label: 'One snake island', input: { grid: [['1', '1', '1'], ['0', '0', '1'], ['1', '1', '1']] } }, { label: 'Diagonals do not connect', input: { grid: [['1', '0'], ['0', '1']] } }],
    legend: [['current', 'popped'], ['frontier', 'in the stack'], ['done', 'sunk (visited)'], ['window', 'land not yet visited']],
    code: `
for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
  if (grid[r][c] !== '1') continue;
  count++; grid[r][c] = '0'; const stack = [[r, c]];        // new island  //@new
  while (stack.length) {
    const [cr, cc] = stack.pop();                                         //@pop
    for (const [dr, dc] of dirs) {
      const nr = cr + dr, nc = cc + dc;
      if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;   // bounds    //@bounds
      if (grid[nr][nc] !== '1') continue;
      grid[nr][nc] = '0'; stack.push([nr, nc]);               // sink+push //@push
    }
  }
}`,
    validate: ({ grid }) => gridCheck(grid, ['0', '1']),
    run({ grid }) {
      const g2 = grid.map((r) => r.map(String)), m = g2.length, n = g2[0].length, steps = []; let count = 0; const sunk = new Set();
      for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
        if (g2[r][c] !== '1') continue;
        count++; g2[r][c] = '0'; sunk.add(r + ',' + c); const st = [[r, c]];
        steps.push({ g: g2.map((x) => [...x]), sunk: new Set(sunk), st: st.map((x) => [...x]), count, line: 'new', note: `(${r}, ${c}) is unvisited land: island #${count}. Sink it and push it.` });
        while (st.length) {
          const [cr, cc] = st.pop(); const added = [];
          for (const [dr, dc] of DIR4) { const nr = cr + dr, nc = cc + dc; if (nr < 0 || nr >= m || nc < 0 || nc >= n || g2[nr][nc] !== '1') continue; g2[nr][nc] = '0'; sunk.add(nr + ',' + nc); st.push([nr, nc]); added.push('(' + nr + ',' + nc + ')'); }
          steps.push({ g: g2.map((x) => [...x]), sunk: new Set(sunk), st: st.map((x) => [...x]), cur: [cr, cc], count, line: ['pop', 'push'], note: `Pop (${cr}, ${cc}); ${added.length ? 'sink and push ' + added.join(', ') : 'no land neighbours left'}.` });
        }
      }
      steps.push({ g: g2, sunk, st: [], count, done: true, line: null, result: count, note: `${count} island${count === 1 ? '' : 's'}.`, why: 'Each land cell is sunk and pushed once: O(m·n) time and up to O(m·n) stack. This version mutates the input; say so, or use a visited array.' });
      return steps;
    },
    render(st, stage, { grid }) {
      const states = {}; grid.forEach((row, r) => row.forEach((v, c) => { const k = r + ',' + c; if (st.sunk.has(k)) states[k] = 'done'; else if (String(v) === '1') states[k] = 'window'; }));
      st.st.forEach(([r, c]) => (states[r + ',' + c] = 'frontier')); if (st.cur) states[st.cur.join(',')] = 'current';
      stage.append(R.grid(grid.map((row) => row.map(String)), { states, label: 'grid (original values shown)' }));
      stage.append(R.vars({ islands: st.count, 'stack size': st.st.length }));
    },
  });

  V.define('rotting', {
    title: 'Rotting Oranges: multi-source BFS, one minute per level',
    inputs: [{ key: 'grid', label: 'grid (0 empty, 1 fresh, 2 rotten)', type: 'json', def: [[2, 1, 1], [1, 1, 0], [0, 1, 1]], wide: true }],
    presets: [{ label: 'Roadmap example', input: { grid: [[2, 1, 1], [1, 1, 0], [0, 1, 1]] } }, { label: 'Unreachable orange (−1)', input: { grid: [[2, 1, 1], [0, 1, 1], [1, 0, 1]] } }, { label: 'Two sources', input: { grid: [[2, 1, 1, 1, 2]] } }, { label: 'Nothing fresh', input: { grid: [[0, 2]] } }],
    legend: [['error', 'rotten'], ['current', 'rotted this minute'], ['window', 'fresh']],
    code: `
const q = []; let fresh = 0;
for (r…) for (c…) { if (grid[r][c] === 2) q.push([r, c]); else if (grid[r][c] === 1) fresh++; }  //@init
let minutes = 0, head = 0;
while (head < q.length && fresh > 0) {
  const size = q.length - head;                    // one minute = one level  //@level
  for (let i = 0; i < size; i++) {
    const [r, c] = q[head++];
    for (const [dr, dc] of dirs) { /* fresh neighbour: rot it, fresh--, push */ }  //@rot
  }
  minutes++;
}
return fresh === 0 ? minutes : -1;                                             //@ret`,
    validate: ({ grid }) => gridCheck(grid, ['0', '1', '2']),
    run({ grid }) {
      const g2 = grid.map((r) => [...r]), m = g2.length, n = g2[0].length, steps = [], q = []; let fresh = 0;
      for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) { if (g2[r][c] === 2) q.push([r, c]); else if (g2[r][c] === 1) fresh++; }
      steps.push({ g: g2.map((x) => [...x]), minutes: 0, fresh, line: 'init', note: `${q.length} rotten orange${q.length === 1 ? '' : 's'} enqueued at minute 0; ${fresh} fresh.`, why: 'All sources start in the queue together, so one BFS measures the distance to the *nearest* rotten orange for every cell.' });
      let minutes = 0, head = 0;
      while (head < q.length && fresh > 0) {
        const size = q.length - head, now = [];
        for (let i = 0; i < size; i++) { const [r, c] = q[head++]; for (const [dr, dc] of DIR4) { const nr = r + dr, nc = c + dc; if (nr < 0 || nr >= m || nc < 0 || nc >= n || g2[nr][nc] !== 1) continue; g2[nr][nc] = 2; fresh--; q.push([nr, nc]); now.push([nr, nc]); } }
        minutes++;
        steps.push({ g: g2.map((x) => [...x]), now, minutes, fresh, line: ['level', 'rot'], note: `Minute ${minutes}: ${now.length ? now.map(([r, c]) => '(' + r + ',' + c + ')').join(', ') + ' rot' : 'nothing new rots'}. Fresh left: ${fresh}.` });
      }
      const ans = fresh === 0 ? minutes : -1;
      steps.push({ g: g2, minutes, fresh, done: true, line: 'ret', result: ans, note: fresh === 0 ? `All oranges rotten after ${minutes} minute${minutes === 1 ? '' : 's'}.` : `${fresh} fresh orange${fresh === 1 ? ' is' : 's are'} unreachable: return −1.`, why: 'O(m·n): every cell enters the queue at most once.' });
      return steps;
    },
    render(st, stage) {
      const states = {}; st.g.forEach((row, r) => row.forEach((v, c) => { if (v === 2) states[r + ',' + c] = 'error'; else if (v === 1) states[r + ',' + c] = 'window'; }));
      (st.now || []).forEach(([r, c]) => (states[r + ',' + c] = 'current'));
      stage.append(R.grid(st.g, { states, label: 'grid' }));
      stage.append(R.vars({ minute: st.minutes, fresh: st.fresh }));
    },
  });

  V.define('grid-bfs', {
    title: 'Shortest Path in Binary Matrix: BFS with 8 directions',
    inputs: [{ key: 'grid', label: 'grid (0 open, 1 blocked)', type: 'json', def: [[0, 0, 0], [1, 1, 0], [1, 1, 0]], wide: true }],
    presets: [{ label: 'LeetCode example 2', input: { grid: [[0, 0, 0], [1, 1, 0], [1, 1, 0]] } }, { label: 'Diagonal shortcut', input: { grid: [[0, 1], [1, 0]] } }, { label: 'Blocked start', input: { grid: [[1, 0], [0, 0]] } }, { label: 'Maze', input: { grid: [[0, 0, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 1, 1, 1], [0, 0, 0, 0]] } }],
    legend: [['current', 'this BFS level'], ['done', 'distance known'], ['wall', 'blocked']],
    code: `
if (grid[0][0] || grid[n-1][n-1]) return -1;          // blocked ends  //@blocked
const dist = …; dist[0][0] = 1; const q = [[0, 0]];  // counts CELLS  //@init
for (let h = 0; h < q.length; h++) {
  const [r, c] = q[h];
  if (r === m - 1 && c === n - 1) return dist[r][c];                 //@goal
  for (const [dr, dc] of DIRS8) { /* open, unvisited: dist+1, push */ }  //@expand
}
return -1;`,
    validate: ({ grid }) => gridCheck(grid, ['0', '1']),
    run({ grid }) {
      const m = grid.length, n = grid[0].length, steps = [];
      const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      const dist = grid.map((r) => r.map(() => null));
      if (grid[0][0] || grid[m - 1][n - 1]) return [{ dist, line: 'blocked', result: -1, done: true, note: 'The start or the end is blocked: −1.' }];
      dist[0][0] = 1; let level = [[0, 0]];
      steps.push({ dist: dist.map((r) => [...r]), level, line: 'init', note: 'Start at (0, 0) with path length 1: the problem counts cells, not moves.' });
      while (level.length) {
        if (level.some(([r, c]) => r === m - 1 && c === n - 1)) { steps.push({ dist: dist.map((r) => [...r]), level, done: true, line: 'goal', result: dist[m - 1][n - 1], note: `Reached the bottom-right corner: path length ${dist[m - 1][n - 1]}.`, why: 'BFS reaches every cell first along a shortest path, so the first arrival is the answer.' }); return steps; }
        const next = [];
        for (const [r, c] of level) for (const [dr, dc] of D8) { const nr = r + dr, nc = c + dc; if (nr < 0 || nr >= m || nc < 0 || nc >= n || grid[nr][nc] || dist[nr][nc] != null) continue; dist[nr][nc] = dist[r][c] + 1; next.push([nr, nc]); }
        if (!next.length) break;
        steps.push({ dist: dist.map((r) => [...r]), level: next, line: 'expand', note: `Distance ${dist[next[0][0]][next[0][1]]}: ${next.length} new cell${next.length === 1 ? '' : 's'}.` });
        level = next;
      }
      steps.push({ dist, level: [], done: true, line: null, result: -1, note: 'The queue emptied without reaching the corner: −1.' });
      return steps;
    },
    render(st, stage, { grid }) {
      const states = {}; grid.forEach((row, r) => row.forEach((v, c) => { if (v) states[r + ',' + c] = 'wall'; else if (st.dist[r][c] != null) states[r + ',' + c] = 'done'; }));
      (st.level || []).forEach(([r, c]) => (states[r + ',' + c] = 'current'));
      stage.append(R.grid(st.dist.map((row, r) => row.map((d, c) => (grid[r][c] ? '' : d == null ? '' : d))), { states, label: 'path length to each cell' }));
    },
  });

  // ---------- directed graphs ----------
  V.define('kahn', {
    title: "Kahn's algorithm: repeatedly take a node with in-degree 0",
    inputs: [{ key: 'n', label: 'numCourses', type: 'int', def: 4 }, { key: 'pre', label: 'prerequisites [course, pre]', type: 'json', def: [[1, 0], [2, 0], [3, 1], [3, 2]], wide: true }],
    presets: [{ label: 'Roadmap 4-course example', input: { n: 4, pre: [[1, 0], [2, 0], [3, 1], [3, 2]] } }, { label: 'A cycle', input: { n: 3, pre: [[1, 0], [2, 1], [0, 2]] } }, { label: 'Two chains', input: { n: 6, pre: [[1, 0], [2, 1], [4, 3], [5, 4], [5, 2]] } }],
    legend: [['frontier', 'in the queue (in-degree 0)'], ['current', 'taken now'], ['done', 'in the order'], ['error', 'blocked by a cycle']],
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
      const adj = Array.from({ length: n }, () => []), indeg = new Array(n).fill(0), steps = [];
      for (const [c, p] of pre) { adj[p].push(c); indeg[c]++; }
      const queue = []; for (let i = 0; i < n; i++) if (!indeg[i]) queue.push(i);
      const order = [];
      steps.push({ indeg: [...indeg], queue: [...queue], head: 0, order: [], line: ['build', 'start'], note: `Edges pre → course. In-degrees [${indeg.join(', ')}]. Start with every node of in-degree 0: ${queue.join(', ') || 'none'}.`, why: '[a, b] means "b before a", so the edge goes b → a. Reversing it is the most common bug in 207.' });
      for (let head = 0; head < queue.length; head++) {
        const u = queue[head]; order.push(u); const freed = [];
        for (const v of adj[u]) if (--indeg[v] === 0) { queue.push(v); freed.push(v); }
        steps.push({ indeg: [...indeg], queue: [...queue], head: head + 1, order: [...order], cur: u, line: ['take', 'relax'], note: `Take ${u}. Decrement its successors${adj[u].length ? ' (' + adj[u].join(', ') + ')' : ''}${freed.length ? '; now free: ' + freed.join(', ') : ''}.`, why: head === 0 ? 'A node with in-degree 0 has no unmet prerequisites, so it can always go next.' : null });
      }
      const ok = order.length === n;
      steps.push({ indeg, queue, head: queue.length, order, done: true, cyc: !ok, line: 'ret', result: ok ? order : [], note: ok ? `Order: [${order.join(', ')}].` : `Only ${order.length} of ${n} nodes were taken: the rest are on or behind a cycle. Return [].`, why: 'O(V + E). The order is one valid answer; others may exist.' });
      return steps;
    },
    render(st, stage, { n, pre }) {
      const edges = pre.map(([c, p]) => [p, c]); const states = {}, subs = {};
      for (let i = 0; i < n; i++) { subs[i] = 'in ' + st.indeg[i]; if (st.cyc && !st.order.includes(i)) states[i] = 'error'; }
      st.order.forEach((i) => (states[i] = 'done')); st.queue.slice(st.head).forEach((i) => (states[i] = 'frontier')); if (st.cur != null) states[st.cur] = 'current';
      stage.append(R.graph({ nodes: layered(n, edges), edges: edges.map(([u, v]) => ({ u, v })), directed: true }, { states, subs, w: 380, h: 230 }));
      stage.append(R.queue(st.queue.slice(st.head)));
      stage.append(R.cells(st.order, { label: 'order', noIndex: true }));
    },
  });

  V.define('dfs-3state', {
    title: 'Directed cycle detection: three states, not two',
    inputs: [{ key: 'n', label: 'n', type: 'int', def: 4 }, { key: 'edges', label: 'directed edges [u, v]', type: 'json', def: [[0, 1], [0, 2], [1, 3], [2, 3]], wide: true }],
    presets: [{ label: 'Diamond (no cycle)', input: { n: 4, edges: [[0, 1], [0, 2], [1, 3], [2, 3]] } }, { label: '3-cycle', input: { n: 3, edges: [[0, 1], [1, 2], [2, 0]] } }, { label: 'Cycle off to the side', input: { n: 5, edges: [[0, 1], [1, 2], [3, 4], [4, 3]] } }],
    legend: [['frontier', 'state 1: on the current path'], ['done', 'state 2: finished, safe'], ['error', 'back edge: cycle']],
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
      const adj = adjOf(n, edges, true), state = new Array(n).fill(0), steps = []; let cycle = null;
      function dfs(u) {
        state[u] = 1; steps.push({ state: [...state], cur: u, line: 'enter', note: `Enter ${u}: state 1 (on the current path).` });
        for (const v of adj[u]) {
          if (state[v] === 1) { cycle = [u, v]; steps.push({ state: [...state], cur: u, back: [u, v], line: 'back', note: `Edge ${u} → ${v}, and ${v} is still on the current path: a cycle.` }); return true; }
          if (state[v] === 2) steps.push({ state: [...state], cur: u, line: 'rec', note: `Edge ${u} → ${v}: ${v} is finished (state 2). Already known to be safe; skip it.`, why: 'With only "visited / not visited", this edge would look like a cycle. In the diamond, 3 is reached twice through different paths, and that is not a cycle.' });
          if (state[v] === 0 && dfs(v)) return true;
        }
        state[u] = 2; steps.push({ state: [...state], cur: u, line: 'done', note: `All of ${u}'s descendants are done: state 2.` });
        return false;
      }
      let found = false;
      for (let i = 0; i < n && !found; i++) if (state[i] === 0 && dfs(i)) found = true;
      steps.push({ state, cycle, done: true, line: null, result: found, note: found ? 'Cycle found.' : 'No cycle: the graph is a DAG.', why: 'O(V + E). State 1 means "an ancestor on the current path"; only an edge back to such a node closes a cycle.' });
      return steps;
    },
    render(st, stage, { n, edges }) {
      const states = {}; st.state.forEach((s, i) => { if (s === 1) states[i] = 'frontier'; if (s === 2) states[i] = 'done'; }); if (st.cur != null && st.state[st.cur] === 1) states[st.cur] = 'current';
      const es = {}; if (st.back) { const k = edges.findIndex(([u, v]) => u === st.back[0] && v === st.back[1]); es[k] = 'error'; states[st.back[1]] = 'error'; }
      stage.append(R.graph({ nodes: layered(n, edges), edges: edges.map(([u, v]) => ({ u, v })), directed: true }, { states, edgeStates: es, subs: Object.fromEntries(st.state.map((s, i) => [i, 's' + s])), w: 360, h: 220 }));
    },
  });

  V.define('bipartite', {
    title: 'Bipartite check: 2-colour with BFS from every uncoloured node',
    inputs: [{ key: 'n', label: 'n', type: 'int', def: 4 }, { key: 'edges', label: 'undirected edges', type: 'json', def: [[0, 1], [1, 2], [2, 3], [3, 0]], wide: true }],
    presets: [{ label: '4-cycle (bipartite)', input: { n: 4, edges: [[0, 1], [1, 2], [2, 3], [3, 0]] } }, { label: 'Triangle (not bipartite)', input: { n: 3, edges: [[0, 1], [1, 2], [2, 0]] } }, { label: 'Disconnected', input: { n: 5, edges: [[0, 1], [2, 3], [3, 4], [4, 2]] } }],
    legend: [['frontier', 'colour 0'], ['window', 'colour 1'], ['error', 'conflict'], ['current', 'being expanded']],
    code: `
const color = new Array(n).fill(-1);
for (let s = 0; s < n; s++) {
  if (color[s] !== -1) continue;                 // every component  //@start
  color[s] = 0; const q = [s];
  for (let h = 0; h < q.length; h++) {
    const u = q[h];
    for (const v of adj[u]) {
      if (color[v] === -1) { color[v] = 1 - color[u]; q.push(v); }  //@paint
      else if (color[v] === color[u]) return false;   // conflict  //@clash
    }
  }
}
return true;`,
    validate: ({ n, edges }) => edgeCheck(n, edges),
    run({ n, edges }) {
      const adj = adjOf(n, edges, false), color = new Array(n).fill(-1), steps = [];
      for (let s = 0; s < n; s++) {
        if (color[s] !== -1) continue;
        color[s] = 0; const q = [s];
        steps.push({ color: [...color], line: 'start', note: `Node ${s} is uncoloured: start a BFS and give it colour 0.`, why: s > 0 ? 'Disconnected graphs need a fresh start in each component.' : null });
        for (let h = 0; h < q.length; h++) {
          const u = q[h];
          for (const v of adj[u]) {
            if (color[v] === -1) { color[v] = 1 - color[u]; q.push(v); steps.push({ color: [...color], cur: u, line: 'paint', note: `${v} is a neighbour of ${u} (colour ${color[u]}): it is forced to colour ${color[v]}.` }); }
            else if (color[v] === color[u]) { steps.push({ color: [...color], cur: u, clash: [u, v], done: true, line: 'clash', result: false, note: `${u} and ${v} are neighbours with the same colour ${color[u]}: not bipartite.`, why: 'A conflict means an odd cycle: going around it, colours alternate an odd number of times and cannot match up.' }); return steps; }
          }
        }
      }
      steps.push({ color, done: true, line: null, result: true, note: 'Every edge joins different colours: bipartite.', why: 'O(V + E).' });
      return steps;
    },
    render(st, stage, { n, edges }) {
      const states = {}; st.color.forEach((c, i) => { if (c === 0) states[i] = 'frontier'; if (c === 1) states[i] = 'window'; }); if (st.cur != null) states[st.cur] = 'current';
      const es = {}; if (st.clash) { st.clash.forEach((i) => (states[i] = 'error')); es[edges.findIndex(([u, v]) => (u === st.clash[0] && v === st.clash[1]) || (u === st.clash[1] && v === st.clash[0]))] = 'error'; }
      stage.append(R.graph({ nodes: circle(n), edges: edges.map(([u, v]) => ({ u, v })) }, { states, edgeStates: es, w: 300, h: 230 }));
    },
  });

  V.define('pacific', {
    title: 'Pacific Atlantic: search uphill from each ocean, then intersect',
    inputs: [{ key: 'h', label: 'heights', type: 'json', def: [[1, 2, 2, 3, 5], [3, 2, 3, 4, 4], [2, 4, 5, 3, 1], [6, 7, 1, 4, 5], [5, 1, 1, 2, 4]], wide: true }],
    presets: [{ label: 'LeetCode example 1', input: { h: [[1, 2, 2, 3, 5], [3, 2, 3, 4, 4], [2, 4, 5, 3, 1], [6, 7, 1, 4, 5], [5, 1, 1, 2, 4]] } }, { label: 'Single cell', input: { h: [[1]] } }, { label: 'Flat 3 × 3', input: { h: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] } }],
    legend: [['frontier', 'reaches the Pacific'], ['window', 'reaches the Atlantic'], ['done', 'reaches both']],
    code: `
// water flows to a neighbour with height <= current; search the REVERSE way:
function climb(starts) {                       // from the ocean's border cells
  const seen = …; const stack = [...starts];                          //@seed
  while (stack.length) {
    const [r, c] = stack.pop();
    for (each neighbour [nr, nc] with heights[nr][nc] >= heights[r][c] and not seen)
      seen[nr][nc] = true, stack.push([nr, nc]);                       //@climb
  }
  return seen;
}
answer = cells seen by climb(pacificBorder) AND climb(atlanticBorder) //@both`,
    validate: ({ h }) => gridCheck(h) || (h.flat().some((x) => typeof x !== 'number') ? 'Heights are numbers.' : null),
    run({ h }) {
      const m = h.length, n = h[0].length, steps = [];
      function climb(starts, name) {
        const seen = h.map((r) => r.map(() => false)); const st = [];
        for (const [r, c] of starts) if (!seen[r][c]) { seen[r][c] = true; st.push([r, c]); }
        while (st.length) { const [r, c] = st.pop(); for (const [dr, dc] of DIR4) { const nr = r + dr, nc = c + dc; if (nr < 0 || nr >= m || nc < 0 || nc >= n || seen[nr][nc] || h[nr][nc] < h[r][c]) continue; seen[nr][nc] = true; st.push([nr, nc]); } }
        return seen;
      }
      const pacStarts = [], atlStarts = [];
      for (let r = 0; r < m; r++) { pacStarts.push([r, 0]); atlStarts.push([r, n - 1]); }
      for (let c = 0; c < n; c++) { pacStarts.push([0, c]); atlStarts.push([m - 1, c]); }
      const pac = climb(pacStarts, 'P');
      steps.push({ pac, atl: null, line: ['seed', 'climb'], note: 'Climb from the Pacific border (top row and left column): a cell is reached if water could flow from it down to the Pacific.', why: 'One search from all ocean cells replaces a separate search from every cell: O(m·n) instead of O((m·n)²).' });
      const atl = climb(atlStarts, 'A');
      steps.push({ pac, atl, line: ['seed', 'climb'], note: 'Climb from the Atlantic border (bottom row and right column).' });
      const both = []; for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) if (pac[r][c] && atl[r][c]) both.push([r, c]);
      steps.push({ pac, atl, both, done: true, line: 'both', result: both, note: `${both.length} cell${both.length === 1 ? '' : 's'} reach both oceans.` });
      return steps;
    },
    render(st, stage, { h }) {
      const states = {}; h.forEach((row, r) => row.forEach((_, c) => { const p = st.pac && st.pac[r][c], a = st.atl && st.atl[r][c]; if (p && a) states[r + ',' + c] = 'done'; else if (p) states[r + ',' + c] = 'frontier'; else if (a) states[r + ',' + c] = 'window'; }));
      stage.append(R.grid(h, { states, label: 'heights (Pacific: top/left edges, Atlantic: bottom/right edges)' }));
    },
  });
})(window);
