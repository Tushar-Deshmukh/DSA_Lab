// Week 5 visualizers: recursion trees (Fibonacci, fast power) and backtracking decision trees
// (subsets, duplicates, permutations, combinations, combination sum, phone letters,
// parentheses) plus grid backtracking (Word Search) and N-Queens.
(function (g) {
  'use strict';
  const { el } = g.Core;
  const R = g.R, V = g.Viz;
  const fmtArr = (a) => '[' + a.join(',') + ']';

  // A tracer records a decision tree while the real algorithm runs.
  function tracer() {
    const nodes = [], state = {}, sub = {}, edge = {};
    const stack = [];
    return {
      nodes, stack,
      add(label, parent, edgeLabel) { const id = nodes.length; nodes.push({ id, label, parent }); if (edgeLabel != null) edge[id] = edgeLabel; return id; },
      enter(id) { stack.forEach((s) => (state[s] = 'frontier')); stack.push(id); state[id] = 'current'; },
      leave(id, st = 'done') { stack.pop(); state[id] = st; if (stack.length) state[stack.at(-1)] = 'current'; },
      mark(id, st, s) { state[id] = st; if (s != null) sub[id] = s; },
      snap(o) { return Object.assign({ tree: nodes.map((n) => ({ ...n, state: state[n.id], sub: sub[n.id], edgeLabel: edge[n.id] })) }, o); },
    };
  }
  const treeOpts = (n) => ({ dx: n > 24 ? 40 : 50, dy: 52, r: 16, label: 'decision tree (one node per call)' });
  function renderBT(st, stage, extra) {
    stage.append(R.tree(st.tree, treeOpts(st.tree.length)));
    if (st.path) stage.append(R.cells(st.path, { label: 'path (shared, mutated in place)', noIndex: true }));
    if (st.res) stage.append(el('div', el('div.panel-label', 'results so far (' + st.res.length + ')'), el('div.small.ui', { style: { fontFamily: 'var(--f-code)', wordBreak: 'break-word' } }, st.res.map((r) => (Array.isArray(r) ? fmtArr(r) : JSON.stringify(r))).join('  ') || '(none yet)')));
    if (extra) stage.append(extra);
  }

  // ---------- recursion trees ----------
  V.define('rec-fib', {
    title: 'Naive Fibonacci: the same subproblems again and again',
    inputs: [{ key: 'n', label: 'n', type: 'int', def: 5 }, { key: 'memo', label: 'memoise?', type: 'select', def: 'no', options: [{ value: 'no', label: 'no (plain recursion)' }, { value: 'yes', label: 'yes (cache results)' }] }],
    presets: [{ label: 'fib(5), no memo', input: { n: 5, memo: 'no' } }, { label: 'fib(5), with memo', input: { n: 5, memo: 'yes' } }, { label: 'fib(6), no memo', input: { n: 6, memo: 'no' } }],
    legend: [['current', 'running'], ['frontier', 'waiting'], ['done', 'returned'], ['compare', 'answered from the cache']],
    code: `
function fib(n, memo = new Map()) {
  if (n <= 1) return n;                       // base cases   //@base
  if (memo.has(n)) return memo.get(n);        // memo only    //@hit
  const v = fib(n - 1, memo) + fib(n - 2, memo);             //@rec
  memo.set(n, v);                             // memo only    //@store
  return v;                                                   //@ret
}`,
    validate: ({ n }) => (n < 0 || n > 6 ? 'Use 0 ≤ n ≤ 6 (fib(6) already makes 25 calls).' : null),
    run({ n, memo }) {
      const T = tracer(), steps = [], cache = new Map(); let calls = 0;
      function f(k, parent) {
        const id = T.add('f(' + k + ')', parent); T.enter(id); calls++;
        if (k <= 1) { T.mark(id, 'current', '=' + k); steps.push(T.snap({ line: 'base', calls, note: `fib(${k}) = ${k}: base case.` })); T.leave(id); return k; }
        if (memo === 'yes' && cache.has(k)) { T.mark(id, 'current', '=' + cache.get(k)); steps.push(T.snap({ line: 'hit', calls, note: `fib(${k}) is already in the cache: ${cache.get(k)}. No further calls.`, why: 'This is the whole effect of memoisation: each subproblem is computed once.' })); T.leave(id, 'compare'); return cache.get(k); }
        steps.push(T.snap({ line: 'rec', calls, note: `fib(${k}) calls fib(${k - 1}) and then fib(${k - 2}).` }));
        const v = f(k - 1, id) + f(k - 2, id);
        if (memo === 'yes') cache.set(k, v);
        T.mark(id, 'current', '=' + v);
        steps.push(T.snap({ line: memo === 'yes' ? ['store', 'ret'] : 'ret', calls, note: `fib(${k}) = ${v}.` }));
        T.leave(id); return v;
      }
      const v = f(n, null);
      steps.push(T.snap({ line: null, calls, done: true, result: v, note: `fib(${n}) = ${v} using ${calls} calls.`, why: memo === 'yes' ? 'With a cache every n is computed once: O(n) calls, O(n) space. This is top-down dynamic programming (Week 10).' : 'Each call branches twice, so calls grow like ~1.6ⁿ: exponential. Count how often fib(2) appears in the tree.' }));
      return steps;
    },
    render(st, stage) { stage.append(R.tree(st.tree, { dx: 44, dy: 50, r: 16, label: 'recursion tree' })); stage.append(R.vars({ 'calls so far': st.calls })); },
  });

  V.define('rec-pow', {
    title: 'Fast power: one branch per level, log n levels',
    inputs: [{ key: 'x', label: 'x', type: 'number', def: 2 }, { key: 'n', label: 'n', type: 'int', def: 13 }],
    presets: [{ label: '2^13', input: { x: 2, n: 13 } }, { label: '2^-2', input: { x: 2, n: -2 } }, { label: '3^0', input: { x: 3, n: 0 } }, { label: '1.5^10', input: { x: 1.5, n: 10 } }],
    legend: [['current', 'running'], ['frontier', 'waiting'], ['done', 'returned']],
    code: `
function myPow(x, n) {
  if (n < 0) return 1 / myPow(x, -n);       // once, at the top  //@neg
  if (n === 0) return 1;                                        //@base
  const half = myPow(x, Math.floor(n / 2)); // computed ONCE    //@half
  return n % 2 === 0 ? half * half : half * half * x;           //@ret
}`,
    validate: ({ x, n }) => (Math.abs(n) > 1e6 ? 'Keep |n| ≤ 10⁶.' : x === 0 && n < 0 ? '0 to a negative power is undefined.' : null),
    run({ x, n }) {
      const T = tracer(), steps = []; let calls = 0;
      const fmt = (v) => (Number.isInteger(v) ? String(v) : +v.toPrecision(6) + '');
      function p(k, parent) {
        const id = T.add('pow(' + k + ')', parent); T.enter(id); calls++;
        if (k < 0) { steps.push(T.snap({ line: 'neg', calls, note: `n = ${k} < 0: compute 1 / x^${-k}.` })); const v = 1 / p(-k, id); T.mark(id, 'current', '=' + fmt(v)); steps.push(T.snap({ line: 'neg', calls, note: `1 / ${fmt(1 / v)} = ${fmt(v)}.` })); T.leave(id); return v; }
        if (k === 0) { T.mark(id, 'current', '=1'); steps.push(T.snap({ line: 'base', calls, note: 'x⁰ = 1.' })); T.leave(id); return 1; }
        steps.push(T.snap({ line: 'half', calls, note: `x^${k}: compute half = x^${Math.floor(k / 2)} once.`, why: calls === 1 ? 'Calling myPow(x, n/2) twice instead of storing it would turn this chain into a binary tree with ~n nodes: O(n) instead of O(log n).' : null }));
        const h = p(Math.floor(k / 2), id); const v = k % 2 === 0 ? h * h : h * h * x;
        T.mark(id, 'current', '=' + fmt(v));
        steps.push(T.snap({ line: 'ret', calls, note: `${k} is ${k % 2 === 0 ? 'even: half × half' : 'odd: half × half × x'} = ${fmt(v)}.` }));
        T.leave(id); return v;
      }
      const v = p(n, null);
      steps.push(T.snap({ line: null, calls, done: true, result: v, note: `x^n = ${fmt(v)} in ${calls} calls.`, why: 'n halves at every level: about log₂|n| + 2 calls, O(log n) time and O(log n) stack.' }));
      return steps;
    },
    render(st, stage) { stage.append(R.tree(st.tree, { dx: 120, dy: 46, r: 16, label: 'recursion tree (a chain)' })); stage.append(R.vars({ calls: st.calls })); },
  });

  // ---------- subsets ----------
  V.define('bt-subsets-a', {
    title: 'Subsets, way A: take or skip each element',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [1, 2, 3] }],
    presets: [{ label: '[1, 2]', input: { nums: [1, 2] } }, { label: '[1, 2, 3]', input: { nums: [1, 2, 3] } }],
    legend: [['current', 'running'], ['frontier', 'on the stack'], ['done', 'leaf: subset recorded']],
    code: `
function subsetsA(nums) {
  const res = [], path = [];
  function dfs(i) {
    if (i === nums.length) { res.push([...path]); return; }  //@leaf
    path.push(nums[i]); dfs(i + 1); path.pop();   // take     //@take
    dfs(i + 1);                                   // skip     //@skip
  }
  dfs(0);
  return res;
}`,
    validate: ({ nums }) => (nums.length > 4 ? 'Use at most 4 numbers (already 31 calls).' : null),
    run({ nums }) {
      const T = tracer(), steps = [], res = [], path = [];
      function dfs(i, parent, how) {
        const id = T.add(fmtArr(path), parent, how); T.enter(id);
        if (i === nums.length) { res.push([...path]); T.mark(id, 'current', '✓'); steps.push(T.snap({ line: 'leaf', path: [...path], res: [...res], note: `All ${nums.length} decisions made: record ${fmtArr(path)}.` })); T.leave(id); return; }
        path.push(nums[i]); steps.push(T.snap({ line: 'take', path: [...path], res: [...res], note: `Level ${i}: take ${nums[i]}.` }));
        dfs(i + 1, id, '+' + nums[i]); path.pop();
        steps.push(T.snap({ line: 'skip', path: [...path], res: [...res], note: `Undo (pop ${nums[i]}); now skip ${nums[i]}.`, why: 'The pop restores path exactly as it was before the take branch, so one shared array serves the whole search.' }));
        dfs(i + 1, id, '−'); T.leave(id);
      }
      dfs(0, null, null);
      steps.push(T.snap({ path: [], res, done: true, result: res, line: null, note: `${res.length} = 2^${nums.length} subsets, one per leaf.`, why: 'There are 2ⁿ leaves and copying each subset costs up to n: O(n · 2ⁿ) time, O(n) recursion depth.' }));
      return steps;
    },
    render: (st, stage) => renderBT(st, stage),
  });

  V.define('bt-subsets-b', {
    title: 'Subsets, way B: every node is a subset; choose the next element from start',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [1, 2, 3] }],
    presets: [{ label: '[1, 2, 3]', input: { nums: [1, 2, 3] } }, { label: '[1, 2, 3, 4]', input: { nums: [1, 2, 3, 4] } }],
    legend: [['current', 'running'], ['frontier', 'on the stack'], ['done', 'returned']],
    code: `
function subsetsB(nums) {
  const res = [], path = [];
  function dfs(start) {
    res.push([...path]);                   // every node      //@rec
    for (let i = start; i < nums.length; i++) {               //@loop
      path.push(nums[i]); dfs(i + 1); path.pop();             //@choose
    }
  }
  dfs(0);
  return res;
}`,
    validate: ({ nums }) => (nums.length > 4 ? 'Use at most 4 numbers.' : null),
    run({ nums }) {
      const T = tracer(), steps = [], res = [], path = [];
      function dfs(start, parent, how) {
        const id = T.add(fmtArr(path), parent, how); T.enter(id);
        res.push([...path]); T.mark(id, 'current', '✓');
        steps.push(T.snap({ line: 'rec', path: [...path], res: [...res], note: `Record ${fmtArr(path)}. Next elements may come from index ${start} on.`, why: start === 0 ? 'Choosing only from `start` onward lists each set once, in increasing index order: [1,2] is generated, [2,1] never is.' : null }));
        for (let i = start; i < nums.length; i++) { path.push(nums[i]); steps.push(T.snap({ line: ['loop', 'choose'], path: [...path], res: [...res], note: `Choose ${nums[i]} (index ${i}).` })); dfs(i + 1, id, '+' + nums[i]); path.pop(); }
        T.leave(id);
      }
      dfs(0, null, null);
      steps.push(T.snap({ path: [], res, done: true, result: res, line: null, note: `${res.length} subsets, one per node.`, why: 'This form extends directly to combinations (stop at size k) and to duplicate skipping (Subsets II).' }));
      return steps;
    },
    render: (st, stage) => renderBT(st, stage),
  });

  V.define('bt-subsets-dup', {
    title: 'Subsets II: sort, then skip equal values at the same level',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [1, 2, 2] }],
    presets: [{ label: 'Roadmap dry run [1,2,2]', input: { nums: [1, 2, 2] } }, { label: '[2,2,2]', input: { nums: [2, 2, 2] } }, { label: '[1,2,2,3]', input: { nums: [1, 2, 2, 3] } }],
    legend: [['current', 'running'], ['frontier', 'on the stack'], ['done', 'returned'], ['dim', 'skipped duplicate branch']],
    code: `
function subsetsWithDup(nums) {
  nums.sort((a, b) => a - b);
  const res = [], path = [];
  function dfs(start) {
    res.push([...path]);                                         //@rec
    for (let i = start; i < nums.length; i++) {
      if (i > start && nums[i] === nums[i - 1]) continue;        //@skip
      path.push(nums[i]); dfs(i + 1); path.pop();                //@choose
    }
  }
  dfs(0);
  return res;
}`,
    validate: ({ nums }) => (nums.length > 4 ? 'Use at most 4 numbers.' : null),
    run({ nums: input }) {
      const nums = [...input].sort((a, b) => a - b);
      const T = tracer(), steps = [], res = [], path = [];
      function dfs(start, parent, how) {
        const id = T.add(fmtArr(path), parent, how); T.enter(id);
        res.push([...path]); T.mark(id, 'current', '✓');
        steps.push(T.snap({ line: 'rec', path: [...path], res: [...res], note: `Record ${fmtArr(path)} (start = ${start}).` }));
        for (let i = start; i < nums.length; i++) {
          if (i > start && nums[i] === nums[i - 1]) {
            const sk = T.add('skip', id, '+' + nums[i]); T.mark(sk, 'dim');
            steps.push(T.snap({ line: 'skip', path: [...path], res: [...res], note: `i = ${i} > start = ${start} and nums[${i}] = nums[${i - 1}] = ${nums[i]}: skip.`, why: 'Choosing this 2 here would produce exactly the same branch as choosing the previous 2 at this level. Deeper in the branch (i = start) the duplicate is still allowed, which is how [1,2,2] is generated.' }));
            continue;
          }
          path.push(nums[i]); steps.push(T.snap({ line: 'choose', path: [...path], res: [...res], note: `Choose ${nums[i]} (index ${i}).` }));
          dfs(i + 1, id, '+' + nums[i]); path.pop();
        }
        T.leave(id);
      }
      dfs(0, null, null);
      steps.push(T.snap({ path: [], res, done: true, result: res, line: null, note: `${res.length} distinct subsets.` }));
      return steps;
    },
    render: (st, stage) => renderBT(st, stage),
  });

  // ---------- permutations ----------
  V.define('bt-permute', {
    title: 'Permutations with a used array',
    inputs: [{ key: 'nums', label: 'nums (distinct)', type: 'numbers', def: [1, 2, 3] }],
    presets: [{ label: '[1, 2, 3]', input: { nums: [1, 2, 3] } }, { label: '[0, 1]', input: { nums: [0, 1] } }],
    legend: [['current', 'running'], ['frontier', 'on the stack'], ['done', 'returned']],
    code: `
function permute(nums) {
  const res = [], path = [], used = new Array(nums.length).fill(false);
  function dfs() {
    if (path.length === nums.length) { res.push([...path]); return; }  //@leaf
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;                                          //@used
      used[i] = true; path.push(nums[i]);        // choose            //@choose
      dfs();                                     // explore
      path.pop(); used[i] = false;               // unchoose          //@undo
    }
  }
  dfs();
  return res;
}`,
    validate: ({ nums }) => (nums.length > 4 ? 'Use at most 4 numbers (4! = 24 leaves).' : new Set(nums).size !== nums.length ? 'Use distinct numbers (duplicates are problem 47).' : null),
    run({ nums }) {
      const T = tracer(), steps = [], res = [], path = [], used = new Array(nums.length).fill(false);
      const flags = () => used.map((u) => (u ? 'T' : 'F')).join('');
      function dfs(parent, how) {
        const id = T.add(fmtArr(path), parent, how); T.enter(id);
        if (path.length === nums.length) { res.push([...path]); T.mark(id, 'current', '✓'); steps.push(T.snap({ line: 'leaf', path: [...path], res: [...res], used: [...used], note: `Every position filled: record ${fmtArr(path)}.` })); T.leave(id); return; }
        for (let i = 0; i < nums.length; i++) {
          if (used[i]) continue;
          used[i] = true; path.push(nums[i]);
          steps.push(T.snap({ line: 'choose', path: [...path], res: [...res], used: [...used], note: `Position ${path.length - 1} ← ${nums[i]}. used = ${flags()}.`, why: steps.length === 0 ? 'Each level fills one position with one element that is not used yet, so each permutation is one root-to-leaf path.' : null }));
          dfs(id, String(nums[i]));
          path.pop(); used[i] = false;
          steps.push(T.snap({ line: 'undo', path: [...path], res: [...res], used: [...used], note: `Undo: remove ${nums[i]}, mark it unused.` }));
        }
        T.leave(id);
      }
      dfs(null, null);
      steps.push(T.snap({ path: [], res, used, done: true, result: res, line: null, note: `${res.length} = ${nums.length}! permutations.`, why: 'n! leaves, each copied in O(n): O(n · n!) time; O(n) depth plus the used array.' }));
      return steps;
    },
    render: (st, stage) => renderBT(st, stage, st.used ? R.cells(st.used.map((u) => (u ? 'T' : 'F')), { label: 'used[i]', states: Object.fromEntries(st.used.map((u, i) => [i, u ? 'current' : null]).filter(([, v]) => v)) }) : null),
  });

  // ---------- combinations ----------
  V.define('bt-combine', {
    title: 'Combinations of size k, with the pruning bound',
    inputs: [{ key: 'n', label: 'n', type: 'int', def: 4 }, { key: 'k', label: 'k', type: 'int', def: 2 }, { key: 'prune', label: 'prune?', type: 'select', def: 'yes', options: [{ value: 'yes', label: 'yes: stop when too few remain' }, { value: 'no', label: 'no pruning' }] }],
    presets: [{ label: 'n = 4, k = 2', input: { n: 4, k: 2, prune: 'yes' } }, { label: 'n = 4, k = 3, pruned', input: { n: 4, k: 3, prune: 'yes' } }, { label: 'n = 4, k = 3, not pruned', input: { n: 4, k: 3, prune: 'no' } }],
    legend: [['current', 'running'], ['done', 'combination recorded'], ['dim', 'pruned']],
    code: `
function combine(n, k) {
  const res = [], path = [];
  function dfs(start) {
    if (path.length === k) { res.push([...path]); return; }              //@leaf
    for (let i = start; i <= n; i++) {
      if (n - i + 1 < k - path.length) break;   // too few numbers left    //@prune
      path.push(i); dfs(i + 1); path.pop();                              //@choose
    }
  }
  dfs(1);
  return res;
}`,
    validate: ({ n, k }) => (n < 1 || n > 5 ? 'Use 1 ≤ n ≤ 5.' : k < 1 || k > n ? 'Use 1 ≤ k ≤ n.' : null),
    run({ n, k, prune }) {
      const T = tracer(), steps = [], res = [], path = []; let calls = 0;
      function dfs(start, parent, how) {
        const id = T.add(fmtArr(path), parent, how); T.enter(id); calls++;
        if (path.length === k) { res.push([...path]); T.mark(id, 'current', '✓'); steps.push(T.snap({ line: 'leaf', path: [...path], res: [...res], calls, note: `Size ${k}: record ${fmtArr(path)}.` })); T.leave(id); return; }
        for (let i = start; i <= n; i++) {
          if (prune === 'yes' && n - i + 1 < k - path.length) {
            const pr = T.add('✗', id, '+' + i); T.mark(pr, 'dim');
            steps.push(T.snap({ line: 'prune', path: [...path], res: [...res], calls, note: `From ${i} only ${n - i + 1} number${n - i + 1 === 1 ? '' : 's'} remain, but ${k - path.length} are needed: break.`, why: 'Breaking (not continuing) is right because larger i leave even fewer numbers.' }));
            break;
          }
          path.push(i); steps.push(T.snap({ line: 'choose', path: [...path], res: [...res], calls, note: `Choose ${i}.` }));
          dfs(i + 1, id, '+' + i); path.pop();
        }
        if (path.length + (n - start + 1) < k && prune === 'no' && path.length < k) T.mark(id, 'error', 'dead');
        T.leave(id, path.length + (n - start + 1) < k && prune === 'no' ? 'error' : 'done');
      }
      dfs(1, null, null);
      steps.push(T.snap({ path: [], res, calls, done: true, result: res, line: null, note: `${res.length} combinations using ${calls} calls${prune === 'yes' ? ' (with pruning)' : ' (without pruning: red nodes are dead ends)'}.`, why: 'C(n, k) results, each O(k) to copy. Pruning removes dead branches; compare the call count with the other setting.' }));
      return steps;
    },
    render: (st, stage) => renderBT(st, stage, R.vars({ calls: st.calls })),
  });

  V.define('bt-combsum', {
    title: 'Combination Sum: reuse allowed (recurse with i), sorted + break',
    inputs: [{ key: 'cands', label: 'candidates (distinct)', type: 'numbers', def: [2, 3, 6, 7] }, { key: 'target', label: 'target', type: 'int', def: 7 }],
    presets: [{ label: 'Day 4 state table', input: { cands: [2, 3, 6, 7], target: 7 } }, { label: 'LeetCode example 2', input: { cands: [2, 3, 5], target: 8 } }, { label: 'Impossible', input: { cands: [2], target: 1 } }],
    legend: [['current', 'running'], ['done', 'sum reached: recorded'], ['dim', 'pruned: candidate > remaining']],
    code: `
function combinationSum(candidates, target) {
  candidates.sort((a, b) => a - b);
  const res = [], path = [];
  function dfs(start, remaining) {
    if (remaining === 0) { res.push([...path]); return; }             //@leaf
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break;     // sorted: rest too big  //@prune
      path.push(candidates[i]);
      dfs(i, remaining - candidates[i]);        // i: reuse allowed      //@rec
      path.pop();
    }
  }
  dfs(0, target);
  return res;
}`,
    validate: ({ cands, target }) => (cands.length > 5 || target > 12 || target < 1 ? 'Use at most 5 candidates and a target of 1–12.' : cands.some((c) => c < 1) ? 'Candidates are positive.' : new Set(cands).size !== cands.length ? 'Candidates are distinct in problem 39.' : null),
    run({ cands: input, target }) {
      const c = [...input].sort((a, b) => a - b); const T = tracer(), steps = [], res = [], path = [];
      function dfs(start, rem, parent, how) {
        const id = T.add(String(rem), parent, how); T.enter(id);
        if (rem === 0) { res.push([...path]); T.mark(id, 'current', '✓'); steps.push(T.snap({ line: 'leaf', path: [...path], res: [...res], note: `Remaining 0: record ${fmtArr(path)}.` })); T.leave(id); return; }
        for (let i = start; i < c.length; i++) {
          if (c[i] > rem) { const pr = T.add('✗', id, '+' + c[i]); T.mark(pr, 'dim'); steps.push(T.snap({ line: 'prune', path: [...path], res: [...res], note: `${c[i]} > remaining ${rem}: break (every later candidate is larger too).` })); break; }
          path.push(c[i]); steps.push(T.snap({ line: 'rec', path: [...path], res: [...res], note: `Choose ${c[i]} → remaining ${rem - c[i]}. Recurse with start = ${i}, so ${c[i]} may be used again.`, why: steps.length === 0 ? 'Recursing with i (not i + 1) allows reuse; never going back below i keeps each combination in non-decreasing order, so [2,2,3] appears once and [3,2,2] never.' : null }));
          dfs(i, rem - c[i], id, '+' + c[i]); path.pop();
        }
        T.leave(id);
      }
      dfs(0, target, null, null);
      steps.push(T.snap({ path: [], res, done: true, result: res, line: null, note: res.length ? `${res.length} combination${res.length > 1 ? 's' : ''}: ${res.map(fmtArr).join(' ')}.` : 'No combination reaches the target.' }));
      return steps;
    },
    render: (st, stage) => renderBT(st, stage, el('div.small.muted.ui', 'Node labels show the remaining target.')),
  });

  V.define('bt-phone', {
    title: 'Letter combinations: one level per digit',
    inputs: [{ key: 'digits', label: 'digits (2–9)', type: 'string', def: '23' }],
    presets: [{ label: '"23"', input: { digits: '23' } }, { label: '"7"', input: { digits: '7' } }, { label: '""', input: { digits: '' } }],
    legend: [['current', 'running'], ['done', 'complete string']],
    code: `
function letterCombinations(digits) {
  if (!digits) return [];                                         //@empty
  const map = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];
  const res = [], path = [];
  function dfs(i) {
    if (i === digits.length) { res.push(path.join('')); return; } //@leaf
    for (const ch of map[digits[i]]) {                            //@loop
      path.push(ch); dfs(i + 1); path.pop();                      //@choose
    }
  }
  dfs(0);
  return res;
}`,
    validate: ({ digits }) => (!/^[2-9]*$/.test(digits) ? 'Use digits 2–9 only.' : digits.length > 3 ? 'Use at most 3 digits.' : null),
    run({ digits }) {
      const map = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'];
      if (!digits) return [{ tree: [], line: 'empty', res: [], result: [], note: 'No digits: return [] (not [""]).' }];
      const T = tracer(), steps = [], res = [], path = [];
      function dfs(i, parent, how) {
        const id = T.add(path.join('') || '""', parent, how); T.enter(id);
        if (i === digits.length) { res.push(path.join('')); T.mark(id, 'current', '✓'); steps.push(T.snap({ line: 'leaf', path: [...path], res: [...res], note: `Record "${path.join('')}".` })); T.leave(id); return; }
        steps.push(T.snap({ line: 'loop', path: [...path], res: [...res], note: `Digit ${digits[i]} → letters "${map[digits[i]]}": ${map[digits[i]].length} branches.`, why: i === 0 ? 'The branching factor depends on the digit (3 or 4), so the worst case is O(4ⁿ · n).' : null }));
        for (const ch of map[digits[i]]) { path.push(ch); dfs(i + 1, id, ch); path.pop(); }
        T.leave(id);
      }
      dfs(0, null, null);
      steps.push(T.snap({ path: [], res, done: true, result: res, line: null, note: `${res.length} strings.` }));
      return steps;
    },
    render: (st, stage) => renderBT(st, stage),
  });

  V.define('bt-parens', {
    title: 'Generate Parentheses: the state is (open, close), not the string',
    inputs: [{ key: 'n', label: 'n (pairs)', type: 'int', def: 3 }],
    presets: [{ label: 'n = 2', input: { n: 2 } }, { label: 'n = 3', input: { n: 3 } }],
    legend: [['current', 'running'], ['frontier', 'on the stack'], ['done', 'complete']],
    code: `
function generateParenthesis(n) {
  const res = [];
  function dfs(s, open, close) {
    if (s.length === 2 * n) { res.push(s); return; }      //@leaf
    if (open < n) dfs(s + '(', open + 1, close);          //@open
    if (close < open) dfs(s + ')', open, close + 1);      //@close
  }
  dfs('', 0, 0);
  return res;
}`,
    validate: ({ n }) => (n < 1 || n > 3 ? 'Use 1 ≤ n ≤ 3.' : null),
    run({ n }) {
      const T = tracer(), steps = [], res = [];
      function dfs(s, o, c, parent, how) {
        const id = T.add(s || '""', parent, how); T.enter(id);
        if (s.length === 2 * n) { res.push(s); T.mark(id, 'current', '✓'); steps.push(T.snap({ line: 'leaf', res: [...res], note: `Length ${2 * n}: record "${s}".` })); T.leave(id); return; }
        steps.push(T.snap({ line: o < n ? 'open' : 'close', res: [...res], note: `"${s || ''}" with open = ${o}, close = ${c}: ${o < n ? 'may add "("' : 'no "(" left'}${c < o ? ' and may add ")"' : '; ")" not allowed (close = open)'}.`, why: steps.length === 0 ? 'A ")" is only legal while some "(" is unmatched (close < open). Tracking two counts replaces checking the whole string.' : null }));
        if (o < n) dfs(s + '(', o + 1, c, id, '(');
        if (c < o) dfs(s + ')', o, c + 1, id, ')');
        T.leave(id);
      }
      dfs('', 0, 0, null, null);
      steps.push(T.snap({ res, done: true, result: res, line: null, note: `${res.length} valid strings (the ${n}${n === 1 ? 'st' : n === 2 ? 'nd' : 'rd'} Catalan number).`, why: 'Every leaf is valid: the two rules never allow a dead end, so there is nothing to filter afterwards.' }));
      return steps;
    },
    render: (st, stage) => renderBT(st, stage),
  });

  // ---------- grid backtracking ----------
  V.define('word-search', {
    title: 'Word Search: mark a cell, try four directions, restore it',
    inputs: [{ key: 'board', label: 'board', type: 'json', def: [['A', 'B', 'C'], ['D', 'B', 'E'], ['A', 'C', 'B']], wide: true }, { key: 'word', label: 'word', type: 'string', def: 'ABC' }],
    presets: [{ label: 'Day 5 run: "ABC"', input: { board: [['A', 'B', 'C'], ['D', 'B', 'E'], ['A', 'C', 'B']], word: 'ABC' } }, { label: 'LeetCode "ABCCED"', input: { board: [['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], word: 'ABCCED' } }, { label: 'Reuse not allowed: "ABCB"', input: { board: [['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], word: 'ABCB' } }],
    legend: [['current', 'cell being matched'], ['frontier', 'marked # on the current path'], ['error', 'mismatch / out of bounds'], ['done', 'word found']],
    code: `
function exist(board, word) {
  const m = board.length, n = board[0].length;
  function dfs(r, c, k) {
    if (k === word.length) return true;                                  //@found
    if (r < 0 || r >= m || c < 0 || c >= n || board[r][c] !== word[k])
      return false;                                                      //@fail
    const tmp = board[r][c]; board[r][c] = '#';            // mark       //@mark
    const ok = dfs(r + 1, c, k + 1) || dfs(r - 1, c, k + 1) ||
               dfs(r, c + 1, k + 1) || dfs(r, c - 1, k + 1);             //@dirs
    board[r][c] = tmp;                                     // restore    //@restore
    return ok;
  }
  for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) if (dfs(r, c, 0)) return true;  //@starts
  return false;
}`,
    validate: ({ board, word }) => (!Array.isArray(board) || !board.length || !board.every((r) => Array.isArray(r) && r.length === board[0].length) ? 'Enter a rectangular grid of letters.' : board.length * board[0].length > 16 ? 'Keep the board to 16 cells.' : word.length < 1 || word.length > 6 ? 'Use a word of 1–6 letters.' : null),
    run({ board: b0, word }) {
      const b = b0.map((r) => [...r]), m = b.length, n = b[0].length, steps = []; const path = [];
      const snap = (o) => Object.assign({ b: b.map((r) => [...r]), path: path.map((p) => [...p]) }, o);
      let found = false;
      function dfs(r, c, k) {
        if (k === word.length) return true;
        if (r < 0 || r >= m || c < 0 || c >= n) { steps.push(snap({ line: 'fail', oob: [r, c], k, note: `(${r}, ${c}) is off the board.` })); return false; }
        if (b[r][c] !== word[k]) { steps.push(snap({ line: 'fail', bad: [r, c], k, note: `(${r}, ${c}) holds "${b[r][c]}", need "${word[k]}": fail.`, why: b[r][c] === '#' ? 'The cell is already on this path (marked #), so it cannot be reused.' : null })); return false; }
        const tmp = b[r][c]; b[r][c] = '#'; path.push([r, c]);
        steps.push(snap({ line: 'mark', cur: [r, c], k, note: `(${r}, ${c}) = "${tmp}" matches word[${k}]. Mark it # and try its neighbours.` }));
        if (k + 1 === word.length) { steps.push(snap({ line: 'found', cur: [r, c], k, win: true, note: `All ${word.length} letters matched.` })); b[r][c] = tmp; return true; }
        const ok = dfs(r + 1, c, k + 1) || dfs(r - 1, c, k + 1) || dfs(r, c + 1, k + 1) || dfs(r, c - 1, k + 1);
        b[r][c] = tmp; path.pop();
        if (!ok) steps.push(snap({ line: 'restore', restored: [r, c], k, note: `No neighbour continues the word: restore (${r}, ${c}) to "${tmp}" and backtrack.`, why: 'Restoring lets this cell be used by a different path later. Forgetting it is the classic bug in 79.' }));
        return ok;
      }
      outer: for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) { if (b[r][c] !== word[0]) continue; steps.push(snap({ line: 'starts', start: [r, c], note: `Start a search at (${r}, ${c}).` })); if (dfs(r, c, 0)) { found = true; break outer; } }
      steps.push(snap({ line: null, done: true, win: found, result: found, note: found ? `"${word}" exists.` : `"${word}" cannot be formed.`, why: 'O(m · n · 3^L): every cell can start, and after the first letter each step has at most 3 new directions.' }));
      return steps;
    },
    render(st, stage) {
      const states = {};
      st.path.forEach(([r, c]) => (states[r + ',' + c] = st.win ? 'done' : 'frontier'));
      if (st.cur) states[st.cur.join(',')] = st.win ? 'done' : 'current';
      if (st.bad) states[st.bad.join(',')] = 'error';
      if (st.restored) states[st.restored.join(',')] = 'compare';
      if (st.start) states[st.start.join(',')] = 'current';
      stage.append(R.grid(st.b, { states, label: 'board (# = marked on the current path)' }));
      if (st.oob) stage.append(el('div.small.ui', { style: { color: 'var(--st-error)' } }, 'tried (' + st.oob.join(', ') + '): out of bounds'));
      stage.append(R.vars({ 'letters matched': st.path.length }));
    },
  });

  V.define('n-queens', {
    title: 'N-Queens: one row per level, columns and diagonals in sets',
    inputs: [{ key: 'n', label: 'n', type: 'int', def: 4 }],
    presets: [{ label: 'n = 4', input: { n: 4 } }, { label: 'n = 5', input: { n: 5 } }],
    legend: [['current', 'queen being tried'], ['done', 'queens placed'], ['error', 'attacked: pruned']],
    code: `
function solveNQueens(n) {
  const res = [], cols = new Set(), d1 = new Set(), d2 = new Set(), q = [];
  function dfs(r) {
    if (r === n) { res.push(q.map((c) => '.'.repeat(c) + 'Q' + '.'.repeat(n - c - 1))); return; }  //@leaf
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) continue;   // attacked  //@prune
      cols.add(c); d1.add(r - c); d2.add(r + c); q.push(c);          // place     //@place
      dfs(r + 1);
      cols.delete(c); d1.delete(r - c); d2.delete(r + c); q.pop();   // remove    //@remove
    }
  }
  dfs(0);
  return res;
}`,
    validate: ({ n }) => (n < 1 || n > 5 ? 'Use 1 ≤ n ≤ 5.' : null),
    run({ n }) {
      const steps = [], cols = new Set(), d1 = new Set(), d2 = new Set(), q = [], res = [];
      const snap = (o) => Object.assign({ q: [...q], sols: res.length }, o);
      function dfs(r) {
        if (r === n) { res.push(q.map((c) => '.'.repeat(c) + 'Q' + '.'.repeat(n - c - 1))); steps.push(snap({ line: 'leaf', win: true, note: `All ${n} rows filled: solution ${res.length}.` })); return; }
        for (let c = 0; c < n; c++) {
          if (cols.has(c) || d1.has(r - c) || d2.has(r + c)) { steps.push(snap({ line: 'prune', bad: [r, c], note: `(${r}, ${c}) is attacked (${cols.has(c) ? 'column ' + c : d1.has(r - c) ? 'diagonal r − c = ' + (r - c) : 'anti-diagonal r + c = ' + (r + c)}).`, why: 'Cells on one diagonal share r − c; cells on one anti-diagonal share r + c. Three Set lookups replace scanning the board.' })); continue; }
          cols.add(c); d1.add(r - c); d2.add(r + c); q.push(c);
          steps.push(snap({ line: 'place', cur: [r, c], note: `Place a queen at row ${r}, column ${c}.` }));
          dfs(r + 1);
          cols.delete(c); d1.delete(r - c); d2.delete(r + c); q.pop();
          steps.push(snap({ line: 'remove', note: `Remove the queen from (${r}, ${c}) and try the next column.` }));
        }
      }
      dfs(0);
      steps.push(snap({ line: null, done: true, result: res.length, note: `${res.length} solution${res.length === 1 ? '' : 's'} for n = ${n}.` }));
      return steps;
    },
    render(st, stage, { n }) {
      const m = Array.from({ length: n }, () => new Array(n).fill(''));
      const states = {};
      st.q.forEach((c, r) => { m[r][c] = '♛'; states[r + ',' + c] = st.win ? 'done' : 'done'; });
      if (st.cur) states[st.cur.join(',')] = 'current';
      if (st.bad) { m[st.bad[0]][st.bad[1]] = '✗'; states[st.bad.join(',')] = 'error'; }
      stage.append(R.grid(m, { states, label: 'board' }));
      stage.append(R.vars({ 'solutions found': st.sols }));
    },
  });
})(window);
