// Week 6 visualizers: building a tree from LeetCode's array, DFS orders, iterative inorder,
// level-order BFS, bottom-up height/diameter, top-down path sums, LCA, BST bounds, BST walk,
// and construction from preorder + inorder.
(function (g) {
  'use strict';
  const { el } = g.Core;
  const R = g.R, V = g.Viz;

  // Level-order array (LeetCode format) -> { root, nodes: {idx: {val, left, right}} } keyed by array index.
  function parseTree(arr) {
    const nodes = {}; if (!arr.length || arr[0] == null) return { root: null, nodes };
    nodes[0] = { val: arr[0], left: null, right: null };
    const q = [0]; let i = 1, h = 0;
    while (i < arr.length && h < q.length) {
      const p = q[h++];
      if (i < arr.length && arr[i] != null) { nodes[i] = { val: arr[i], left: null, right: null }; nodes[p].left = i; q.push(i); } i++;
      if (i < arr.length && arr[i] != null) { nodes[i] = { val: arr[i], left: null, right: null }; nodes[p].right = i; q.push(i); } i++;
    }
    return { root: 0, nodes };
  }
  const treeCheck = (arr) => (!Array.isArray(arr) ? 'Enter a level-order array such as [3,9,20,null,null,15,7].' : arr.length > 15 ? 'Keep the array to 15 entries.' : arr.length && arr[0] == null ? 'The root cannot be null (use [] for an empty tree).' : arr.some((x) => x !== null && typeof x !== 'number') ? 'Use numbers and null only.' : null);
  const T = (arr, o) => R.binTree(arr, Object.assign({ dx: 50, dy: 56, r: 17 }, o));
  const TREE_PRESETS = [{ label: 'Roadmap tree [3,9,20,null,null,15,7]', input: { tree: [3, 9, 20, null, null, 15, 7] } }, { label: 'Complete [1,2,3,4,5,6,7]', input: { tree: [1, 2, 3, 4, 5, 6, 7] } }, { label: 'Skewed [1,null,2,null,3]', input: { tree: [1, null, 2, null, 3] } }, { label: 'Empty []', input: { tree: [] } }];

  V.define('tree-build', {
    title: 'Reading LeetCode\'s tree array: level order with nulls',
    inputs: [{ key: 'tree', label: 'tree (level order)', type: 'json', def: [3, 9, 20, null, null, 15, 7], wide: true }],
    presets: TREE_PRESETS.slice(0, 3),
    legend: [['current', 'node receiving children'], ['done', 'placed']],
    code: `
// how LeetCode turns [3,9,20,null,null,15,7] into nodes
root = new TreeNode(arr[0]); queue = [root]; i = 1;     //@root
while (i < arr.length) {
  const parent = queue.shift();                          //@parent
  if (arr[i] != null) queue.push(parent.left = new TreeNode(arr[i]));   //@left
  i++;
  if (arr[i] != null) queue.push(parent.right = new TreeNode(arr[i]));  //@right
  i++;
}`,
    validate: ({ tree }) => treeCheck(tree) || (tree.length ? null : 'Use a non-empty tree here.'),
    run({ tree: arr }) {
      const steps = [], shown = [arr[0]]; const q = [0]; let i = 1, h = 0;
      steps.push({ shown: [...shown], cur: null, i: 0, line: 'root', note: `arr[0] = ${arr[0]} is the root.` });
      while (i < arr.length && h < q.length) {
        const p = q[h++];
        const L = i < arr.length ? arr[i] : null; while (shown.length <= i) shown.push(null); shown[i] = L; if (L != null) q.push(i); i++;
        const Rv = i < arr.length ? arr[i] : null; while (shown.length <= i) shown.push(null); if (i < arr.length) shown[i] = Rv; if (Rv != null && i < arr.length) q.push(i); i++;
        steps.push({ shown: [...shown], cur: p, i, line: ['parent', 'left', 'right'], note: `Parent ${arr[p]}: left = ${L == null ? 'null' : L}, right = ${Rv == null ? 'null' : Rv}.`, why: L == null || Rv == null ? 'A null takes a slot in the array but gets no children of its own: nothing is listed for it later.' : null });
      }
      steps.push({ shown: arr, cur: null, done: true, line: null, result: arr.filter((x) => x != null).length, note: `Done: ${arr.filter((x) => x != null).length} nodes.`, why: 'Always sketch the tree from the array before coding; most misread trees come from forgetting that nulls have no children.' });
      return steps;
    },
    render(st, stage, { tree: arr }) {
      const states = {}; if (st.cur != null) states[st.cur] = 'current';
      stage.append(T(st.shown.slice(0, Math.max(1, st.i)), { states }));
      stage.append(R.cells(arr.map((x) => (x == null ? 'null' : x)), { states: Object.fromEntries(arr.map((_, k) => [k, k < st.i ? 'done' : null]).filter(([, v]) => v)), label: 'the array, consumed left to right' }));
    },
  });

  V.define('tree-dfs', {
    title: 'Depth-first traversal: where the visit line sits decides the order',
    inputs: [{ key: 'tree', label: 'tree (level order)', type: 'json', def: [3, 9, 20, null, null, 15, 7], wide: true }, { key: 'order', label: 'order', type: 'select', def: 'pre', options: [{ value: 'pre', label: 'preorder (node, left, right)' }, { value: 'in', label: 'inorder (left, node, right)' }, { value: 'post', label: 'postorder (left, right, node)' }] }],
    presets: [{ label: 'Preorder', input: { tree: [3, 9, 20, null, null, 15, 7], order: 'pre' } }, { label: 'Inorder', input: { tree: [3, 9, 20, null, null, 15, 7], order: 'in' } }, { label: 'Postorder', input: { tree: [3, 9, 20, null, null, 15, 7], order: 'post' } }, { label: 'Inorder of a BST', input: { tree: [4, 2, 6, 1, 3, 5, 7], order: 'in' } }],
    legend: [['current', 'call running'], ['frontier', 'waiting on the stack'], ['done', 'visited (output)']],
    code: `
function dfs(node) {
  if (!node) return;                       //@null
  out.push(node.val);      // preorder     //@pre
  dfs(node.left);                          //@left
  out.push(node.val);      // inorder      //@in
  dfs(node.right);                         //@right
  out.push(node.val);      // postorder    //@post
}   // keep exactly ONE of the three push lines`,
    validate: ({ tree }) => treeCheck(tree),
    run({ tree: arr, order }) {
      const { root, nodes } = parseTree(arr); const steps = [], out = [], visited = new Set(), stack = [];
      const snap = (o) => Object.assign({ out: [...out], visited: new Set(visited), stack: [...stack] }, o);
      function dfs(i) {
        if (i == null) return;
        stack.push(i);
        steps.push(snap({ cur: i, line: 'left', note: `Enter ${nodes[i].val}.` }));
        if (order === 'pre') { out.push(nodes[i].val); visited.add(i); steps.push(snap({ cur: i, line: 'pre', note: `Preorder: visit ${nodes[i].val} before its children.` })); }
        dfs(nodes[i].left);
        if (order === 'in') { out.push(nodes[i].val); visited.add(i); steps.push(snap({ cur: i, line: 'in', note: `Inorder: left subtree done, visit ${nodes[i].val}.` })); }
        dfs(nodes[i].right);
        if (order === 'post') { out.push(nodes[i].val); visited.add(i); steps.push(snap({ cur: i, line: 'post', note: `Postorder: both subtrees done, visit ${nodes[i].val}.`, why: out.length === 1 ? 'Postorder is the order for combining children\'s answers: when a node is visited, both subtrees are finished.' : null })); }
        stack.pop();
      }
      dfs(root);
      steps.push(snap({ cur: null, done: true, line: null, result: out, note: root == null ? 'Empty tree: nothing to visit.' : `${order}order: [${out.join(', ')}].`, why: 'Every node is entered once: O(n) time. The stack holds one root-to-node path: O(h) space, which is O(n) for a skewed tree.' }));
      return steps;
    },
    render(st, stage, { tree: arr }) {
      const states = {}; st.stack.forEach((i) => (states[i] = 'frontier')); st.visited.forEach((i) => (states[i] = 'done')); if (st.cur != null) states[st.cur] = st.visited.has(st.cur) ? 'done' : 'current';
      stage.append(T(arr, { states }));
      stage.append(R.cells(st.out, { label: 'output', noIndex: true }));
    },
  });

  V.define('tree-inorder-iter', {
    title: 'Iterative inorder with an explicit stack (and k-th smallest)',
    inputs: [{ key: 'tree', label: 'tree (level order)', type: 'json', def: [5, 3, 6, 2, 4, null, null, 1], wide: true }, { key: 'k', label: 'stop after k pops (0 = full traversal)', type: 'int', def: 0 }],
    presets: [{ label: 'Full traversal', input: { tree: [5, 3, 6, 2, 4, null, null, 1], k: 0 } }, { label: 'k = 3 (problem 230)', input: { tree: [5, 3, 6, 2, 4, null, null, 1], k: 3 } }, { label: 'Roadmap tree', input: { tree: [3, 9, 20, null, null, 15, 7], k: 0 } }],
    legend: [['current', 'cur'], ['frontier', 'on the stack'], ['done', 'visited']],
    code: `
function inorderTraversal(root) {
  const res = [], stack = [];
  let cur = root;
  while (cur || stack.length) {                       //@loop
    while (cur) { stack.push(cur); cur = cur.left; }  //@left
    cur = stack.pop();                                //@pop
    res.push(cur.val);              // visit          //@visit
    cur = cur.right;                                  //@right
  }
  return res;
}`,
    validate: ({ tree, k }) => treeCheck(tree) || (k < 0 ? 'k must be 0 or more.' : null),
    run({ tree: arr, k }) {
      const { root, nodes } = parseTree(arr); const steps = [], st = [], res = [], vis = new Set(); let cur = root;
      while (cur != null || st.length) {
        const pushed = []; while (cur != null) { st.push(cur); pushed.push(nodes[cur].val); cur = nodes[cur].left; }
        if (pushed.length) steps.push({ st: [...st], cur: null, res: [...res], vis: new Set(vis), line: 'left', note: `Go left as far as possible, pushing ${pushed.join(', ')}.` });
        cur = st.pop(); res.push(nodes[cur].val); vis.add(cur);
        steps.push({ st: [...st], cur, res: [...res], vis: new Set(vis), line: ['pop', 'visit'], note: `Pop ${nodes[cur].val}: its left subtree is finished, so visit it.`, why: res.length === 1 ? 'The stack does the job of the call stack: each node waits there until its left subtree is done.' : null });
        if (k && res.length === k) { steps.push({ st: [...st], cur, res: [...res], vis: new Set(vis), done: true, line: 'visit', result: nodes[cur].val, note: `That was pop number ${k}: the ${k}-th smallest value is ${nodes[cur].val}. Stop early.`, why: 'Inorder of a BST is sorted, so the k-th pop is the k-th smallest: O(h + k) instead of O(n).' }); return steps; }
        cur = nodes[cur].right;
        steps.push({ st: [...st], cur, res: [...res], vis: new Set(vis), line: 'right', note: cur == null ? 'No right child.' : `Move to the right child ${nodes[cur].val}.` });
      }
      steps.push({ st: [], cur: null, res, vis, done: true, line: null, result: k ? undefined : res, note: root == null ? 'Empty tree.' : `Inorder: [${res.join(', ')}].` });
      return steps;
    },
    render(st, stage, { tree: arr }) {
      const states = {}; st.vis.forEach((i) => (states[i] = 'done')); st.st.forEach((i) => (states[i] = 'frontier')); if (st.cur != null) states[st.cur] = 'current';
      stage.append(T(arr, { states }));
      const { nodes } = parseTree(arr);
      stage.append(el('div.row', { style: { alignItems: 'flex-end', gap: '24px' } }, R.stack(st.st.map((i) => nodes[i].val)), R.cells(st.res, { label: 'res', noIndex: true })));
    },
  });

  V.define('tree-bfs', {
    title: 'Level-order BFS with a level-size snapshot',
    inputs: [{ key: 'tree', label: 'tree (level order)', type: 'json', def: [3, 9, 20, null, null, 15, 7], wide: true }, { key: 'mode', label: 'record', type: 'select', def: 'levels', options: [{ value: 'levels', label: 'every level (102)' }, { value: 'right', label: 'last node per level (199)' }] }],
    presets: [{ label: 'Level order (102)', input: { tree: [3, 9, 20, null, null, 15, 7], mode: 'levels' } }, { label: 'Right side view (199)', input: { tree: [1, 2, 3, null, 5, null, 4], mode: 'right' } }, { label: 'Deeper left side', input: { tree: [1, 2, 3, 4], mode: 'right' } }],
    legend: [['current', 'dequeued now'], ['frontier', 'in the queue'], ['done', 'processed']],
    code: `
function levelOrder(root) {
  if (!root) return [];
  const res = [], queue = [root]; let head = 0;
  while (head < queue.length) {
    const levelSize = queue.length - head, level = [];   // snapshot  //@size
    for (let i = 0; i < levelSize; i++) {
      const node = queue[head++];                                    //@deq
      level.push(node.val);
      if (node.left) queue.push(node.left);                          //@kids
      if (node.right) queue.push(node.right);
    }
    res.push(level);            // 199: push level.at(-1) instead   //@record
  }
  return res;
}`,
    validate: ({ tree }) => treeCheck(tree),
    run({ tree: arr, mode }) {
      const { root, nodes } = parseTree(arr); const steps = [], res = [], done = new Set();
      if (root == null) return [{ q: [], head: 0, res: [], done, line: null, result: [], note: 'Empty tree: return [].' }];
      const q = [root]; let head = 0;
      while (head < q.length) {
        const size = q.length - head, level = [];
        steps.push({ q: [...q], head, res: res.map((r) => (Array.isArray(r) ? [...r] : r)), done: new Set(done), line: 'size', note: `The queue holds ${size} node${size > 1 ? 's' : ''}: exactly one level.`, why: res.length === 0 ? 'Reading the size before the inner loop is what separates levels: children pushed during the loop belong to the next level.' : null });
        for (let i = 0; i < size; i++) {
          const n = q[head++]; level.push(nodes[n].val); done.add(n);
          const kids = [nodes[n].left, nodes[n].right].filter((x) => x != null); kids.forEach((c) => q.push(c));
          steps.push({ q: [...q], head, cur: n, res: res.map((r) => (Array.isArray(r) ? [...r] : r)), level: [...level], done: new Set(done), line: ['deq', 'kids'], note: `Dequeue ${nodes[n].val}${kids.length ? '; enqueue ' + kids.map((c) => nodes[c].val).join(', ') : ''}.` });
        }
        res.push(mode === 'right' ? level.at(-1) : level);
        steps.push({ q: [...q], head, res: res.map((r) => (Array.isArray(r) ? [...r] : r)), done: new Set(done), line: 'record', note: mode === 'right' ? `Level done: the rightmost node is ${level.at(-1)}.` : `Level done: [${level.join(', ')}].` });
      }
      steps.push({ q, head, res, done, line: null, finished: true, result: res, note: `Result: ${JSON.stringify(res)}.`, why: 'Each node is enqueued and dequeued once: O(n) time; the queue holds at most one level plus the next: O(width).' });
      return steps;
    },
    render(st, stage, { tree: arr }) {
      const { nodes } = parseTree(arr);
      const states = {}; st.done.forEach((i) => (states[i] = 'done')); st.q.slice(st.head).forEach((i) => (states[i] = 'frontier')); if (st.cur != null) states[st.cur] = 'current';
      stage.append(T(arr, { states }));
      stage.append(R.queue(st.q.slice(st.head).map((i) => nodes[i].val)));
      stage.append(R.vars({ result: JSON.stringify(st.res), 'current level': st.level ? '[' + st.level.join(', ') + ']' : '·' }));
    },
  });

  V.define('tree-diameter', {
    title: 'Diameter: return the height, update a global best',
    inputs: [{ key: 'tree', label: 'tree (level order)', type: 'json', def: [1, 2, 3, 4, 5], wide: true }],
    presets: [{ label: 'Roadmap dry run [1,2,3,4,5]', input: { tree: [1, 2, 3, 4, 5] } }, { label: 'Longest path avoids the root', input: { tree: [1, 2, null, 3, 4, 5, null, null, 6] } }, { label: 'Single node', input: { tree: [1] } }],
    legend: [['current', 'computing now'], ['frontier', 'waiting for children'], ['done', 'height returned (shown below the node)']],
    code: `
function diameterOfBinaryTree(root) {
  let best = 0;
  function height(node) {                      // nodes on the longest downward path
    if (!node) return 0;                                              //@null
    const L = height(node.left), R = height(node.right);              //@kids
    best = Math.max(best, L + R);        // path through node, edges //@best
    return 1 + Math.max(L, R);           // what the parent needs    //@ret
  }
  height(root);
  return best;
}`,
    validate: ({ tree }) => treeCheck(tree),
    run({ tree: arr }) {
      const { root, nodes } = parseTree(arr); const steps = [], hs = {}, stack = []; let best = 0, bestAt = null;
      function h(i) {
        if (i == null) return 0;
        stack.push(i);
        steps.push({ hs: { ...hs }, stack: [...stack], cur: i, best, bestAt, line: 'kids', note: `height(${nodes[i].val}): first get both children's heights.` });
        const L = h(nodes[i].left), Rr = h(nodes[i].right);
        const nb = L + Rr > best; if (nb) { best = L + Rr; bestAt = i; }
        hs[i] = 1 + Math.max(L, Rr); stack.pop();
        steps.push({ hs: { ...hs }, stack: [...stack], cur: i, best, bestAt, line: ['best', 'ret'], note: `At ${nodes[i].val}: L = ${L}, R = ${Rr}. Path through it has ${L + Rr} edges${nb ? ' → new best' : ''}. Return height ${hs[i]}.`, why: steps.length < 4 ? 'The function returns one thing (height, for the parent) and updates another (best, the answer). That is how one O(n) pass replaces calling height() from every node.' : null });
        return hs[i];
      }
      h(root);
      steps.push({ hs, stack: [], cur: null, best, bestAt, done: true, line: null, result: best, note: `Diameter = ${best} edges${bestAt != null && best ? ', through node ' + nodes[bestAt].val : ''}.` });
      return steps;
    },
    render(st, stage, { tree: arr }) {
      const states = {}, subs = {}; Object.entries(st.hs).forEach(([i, v]) => { states[i] = 'done'; subs[i] = 'h=' + v; }); st.stack.forEach((i) => (states[i] = 'frontier')); if (st.cur != null) states[st.cur] = 'current'; if (st.done && st.bestAt != null) states[st.bestAt] = 'current';
      stage.append(T(arr, { states, subs, dy: 62 }));
      stage.append(R.vars({ best: st.best }));
    },
  });

  V.define('tree-pathsum', {
    title: 'Path Sum: pass the remaining sum down, check at leaves',
    inputs: [{ key: 'tree', label: 'tree (level order)', type: 'json', def: [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], wide: true }, { key: 'target', label: 'targetSum', type: 'number', def: 22 }],
    presets: [{ label: 'LeetCode example 1', input: { tree: [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1], target: 22 } }, { label: 'No such path', input: { tree: [1, 2, 3], target: 5 } }, { label: 'Not a leaf', input: { tree: [1, 2], target: 1 } }],
    legend: [['current', 'node being checked'], ['frontier', 'on the path'], ['done', 'leaf where remaining = 0'], ['dim', 'explored']],
    code: `
function hasPathSum(root, targetSum) {
  if (!root) return false;                                    //@null
  const rest = targetSum - root.val;                          //@rest
  if (!root.left && !root.right) return rest === 0;  // leaf  //@leaf
  return hasPathSum(root.left, rest) || hasPathSum(root.right, rest);  //@rec
}`,
    validate: ({ tree }) => treeCheck(tree),
    run({ tree: arr, target }) {
      const { root, nodes } = parseTree(arr); const steps = [], path = [], seen = new Set(), rem = {};
      function f(i, t) {
        if (i == null) return false;
        path.push(i); seen.add(i); const rest = t - nodes[i].val; rem[i] = rest;
        const leaf = nodes[i].left == null && nodes[i].right == null;
        if (leaf) { const ok = rest === 0; steps.push({ path: [...path], seen: new Set(seen), rem: { ...rem }, cur: i, win: ok, line: ['rest', 'leaf'], note: `Leaf ${nodes[i].val}: remaining ${t} − ${nodes[i].val} = ${rest}${ok ? ' = 0. Found.' : ' ≠ 0.'}` }); path.pop(); return ok; }
        steps.push({ path: [...path], seen: new Set(seen), rem: { ...rem }, cur: i, line: ['rest', 'rec'], note: `${nodes[i].val}: pass remaining ${t} − ${nodes[i].val} = ${rest} to the children.`, why: steps.length === 0 ? 'Information from ancestors flows down as a parameter: each call receives exactly what it needs (the sum still to be found).' : null });
        const ok = f(nodes[i].left, rest) || f(nodes[i].right, rest);
        path.pop(); return ok;
      }
      const ok = f(root, target);
      steps.push({ path: [], seen, rem, cur: null, done: true, line: null, result: ok, note: ok ? 'A root-to-leaf path sums to the target: true.' : 'No root-to-leaf path sums to the target: false.', why: 'Only leaves are checked: a path must end at a leaf (try the "Not a leaf" preset).' });
      return steps;
    },
    render(st, stage, { tree: arr }) {
      const states = {}, subs = {}; st.seen.forEach((i) => (states[i] = 'dim')); st.path.forEach((i) => (states[i] = 'frontier')); Object.entries(st.rem).forEach(([i, v]) => (subs[i] = 'rem ' + v)); if (st.cur != null) states[st.cur] = st.win ? 'done' : 'current';
      stage.append(T(arr, { states, subs, dy: 62 }));
    },
  });

  V.define('tree-lca', {
    title: 'Lowest common ancestor: what each call returns',
    inputs: [{ key: 'tree', label: 'tree (level order)', type: 'json', def: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], wide: true }, { key: 'p', label: 'p', type: 'number', def: 6 }, { key: 'q', label: 'q', type: 'number', def: 2 }],
    presets: [{ label: 'Day 4 trace (p = 6, q = 2)', input: { tree: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 6, q: 2 } }, { label: 'LeetCode example 1 (5, 1)', input: { tree: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 1 } }, { label: 'Ancestor of itself (5, 4)', input: { tree: [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], p: 5, q: 4 } }],
    legend: [['current', 'call running'], ['frontier', 'waiting'], ['done', 'returned something'], ['dim', 'returned null'], ['error', 'the LCA']],
    code: `
function lowestCommonAncestor(root, p, q) {
  if (!root || root === p || root === q) return root;     // case 1  //@base
  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);              //@kids
  if (left && right) return root;          // case 2: split here     //@split
  return left ?? right;                    // case 3: pass one up    //@pass
}`,
    validate: ({ tree, p, q }) => { const e = treeCheck(tree); if (e) return e; const vals = tree.filter((x) => x != null); return new Set(vals).size !== vals.length ? 'Values must be distinct.' : !vals.includes(p) || !vals.includes(q) ? 'p and q must both be in the tree.' : null; },
    run({ tree: arr, p, q }) {
      const { root, nodes } = parseTree(arr); const steps = [], ret = {}, stack = []; let lca = null;
      const name = (i) => (i == null ? 'null' : String(nodes[i].val));
      function f(i) {
        if (i == null) return null;
        if (nodes[i].val === p || nodes[i].val === q) { ret[i] = i; steps.push({ ret: { ...ret }, stack: [...stack], cur: i, line: 'base', note: `Node ${nodes[i].val} is ${nodes[i].val === p ? 'p' : 'q'}: return it immediately (case 1).`, why: 'There is no need to look below: if the other target is underneath, this node is the LCA anyway; if not, some ancestor will be.' }); return i; }
        stack.push(i);
        steps.push({ ret: { ...ret }, stack: [...stack], cur: i, line: 'kids', note: `Node ${nodes[i].val}: search both subtrees.` });
        const L = f(nodes[i].left), Rr = f(nodes[i].right); stack.pop();
        let r;
        if (L != null && Rr != null) { r = i; lca = i; steps.push({ ret: { ...ret, [i]: i }, stack: [...stack], cur: i, line: 'split', note: `Left returned ${name(L)} and right returned ${name(Rr)}: p and q are on different sides, so ${nodes[i].val} is the LCA (case 2).` }); }
        else { r = L ?? Rr; steps.push({ ret: { ...ret, [i]: r }, stack: [...stack], cur: i, line: 'pass', note: `Left ${name(L)}, right ${name(Rr)}: return ${name(r)} upward (case 3).` }); }
        ret[i] = r; return r;
      }
      const ans = f(root); if (lca == null) lca = ans;
      steps.push({ ret, stack: [], cur: null, lca, done: true, line: null, result: nodes[ans].val, note: `LCA(${p}, ${q}) = ${nodes[ans].val}.`, why: 'Contract: the call returns p or q if one of them is in this subtree, the LCA if both are, and null if neither. One postorder pass: O(n).' });
      return steps;
    },
    render(st, stage, { tree: arr }) {
      const { nodes } = parseTree(arr);
      const states = {}, subs = {};
      Object.entries(st.ret).forEach(([i, v]) => { states[i] = v == null ? 'dim' : 'done'; subs[i] = '→ ' + (v == null ? 'null' : nodes[v].val); });
      st.stack.forEach((i) => (states[i] = 'frontier')); if (st.cur != null) states[st.cur] = 'current'; if (st.lca != null) states[st.lca] = 'error';
      stage.append(T(arr, { states, subs, dy: 62 }));
    },
  });

  V.define('bst-validate', {
    title: 'Validate a BST: carry (low, high) bounds down',
    inputs: [{ key: 'tree', label: 'tree (level order)', type: 'json', def: [5, 4, 6, null, null, 3, 7], wide: true }],
    presets: [{ label: 'Day 5 trap [5,4,6,null,null,3,7]', input: { tree: [5, 4, 6, null, null, 3, 7] } }, { label: 'Valid [2,1,3]', input: { tree: [2, 1, 3] } }, { label: 'Equal values [2,2,2]', input: { tree: [2, 2, 2] } }],
    legend: [['current', 'checking'], ['done', 'within bounds'], ['error', 'violates its bounds']],
    code: `
function isValidBST(root) {
  function ok(node, low, high) {        // node.val must be in (low, high)
    if (!node) return true;                                            //@null
    if (node.val <= low || node.val >= high) return false;             //@check
    return ok(node.left, low, node.val) && ok(node.right, node.val, high);  //@rec
  }
  return ok(root, -Infinity, Infinity);
}`,
    validate: ({ tree }) => treeCheck(tree),
    run({ tree: arr }) {
      const { root, nodes } = parseTree(arr); const steps = [], bounds = {}, good = new Set(); let bad = null;
      const f = (x) => (x === -Infinity ? '−∞' : x === Infinity ? '∞' : x);
      function ok(i, lo, hi) {
        if (i == null) return true;
        bounds[i] = [lo, hi];
        if (nodes[i].val <= lo || nodes[i].val >= hi) { bad = i; steps.push({ bounds: { ...bounds }, good: new Set(good), bad, cur: i, line: 'check', note: `${nodes[i].val} must lie in (${f(lo)}, ${f(hi)}): it does not. Not a BST.`, why: 'Each bound came from an ancestor. Comparing a node only with its parent would accept this, because the violated bound comes from higher up.' }); return false; }
        good.add(i);
        steps.push({ bounds: { ...bounds }, good: new Set(good), cur: i, line: ['check', 'rec'], note: `${nodes[i].val} is in (${f(lo)}, ${f(hi)}). Left children must be in (${f(lo)}, ${nodes[i].val}); right in (${nodes[i].val}, ${f(hi)}).` });
        return ok(nodes[i].left, lo, nodes[i].val) && ok(nodes[i].right, nodes[i].val, hi);
      }
      const res = ok(root, -Infinity, Infinity);
      steps.push({ bounds, good, bad, cur: null, done: true, line: null, result: res, note: res ? 'Every node respects its bounds: valid BST.' : 'Invalid BST.', why: 'O(n) time, O(h) stack. Strict inequalities because LeetCode\'s BSTs have no duplicates.' });
      return steps;
    },
    render(st, stage, { tree: arr }) {
      const f = (x) => (x === -Infinity ? '−∞' : x === Infinity ? '∞' : x);
      const states = {}, subs = {}; st.good.forEach((i) => (states[i] = 'done')); Object.entries(st.bounds).forEach(([i, [lo, hi]]) => (subs[i] = '(' + f(lo) + ',' + f(hi) + ')'));
      if (st.cur != null) states[st.cur] = 'current'; if (st.bad != null) states[st.bad] = 'error';
      stage.append(T(arr, { states, subs, dx: 64, dy: 62 }));
    },
  });

  V.define('bst-lca', {
    title: 'LCA in a BST: walk down until p and q split',
    inputs: [{ key: 'tree', label: 'BST (level order)', type: 'json', def: [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], wide: true }, { key: 'p', label: 'p', type: 'number', def: 3 }, { key: 'q', label: 'q', type: 'number', def: 5 }],
    presets: [{ label: 'LeetCode tree, p = 2, q = 8', input: { tree: [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], p: 2, q: 8 } }, { label: 'p = 3, q = 5', input: { tree: [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], p: 3, q: 5 } }, { label: 'p = 2, q = 4', input: { tree: [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], p: 2, q: 4 } }],
    legend: [['current', 'current node'], ['dim', 'whole subtree skipped'], ['error', 'LCA']],
    code: `
function lowestCommonAncestor(root, p, q) {
  let node = root;
  while (node) {
    if (p.val < node.val && q.val < node.val) node = node.left;        //@left
    else if (p.val > node.val && q.val > node.val) node = node.right;  //@right
    else return node;              // they split here (or one is here) //@split
  }
}`,
    validate: ({ tree, p, q }) => treeCheck(tree) || (!tree.includes(p) || !tree.includes(q) ? 'p and q must both be in the tree.' : null),
    run({ tree: arr, p, q }) {
      const { root, nodes } = parseTree(arr); const steps = [], path = []; let i = root;
      while (i != null) {
        const v = nodes[i].val; path.push(i);
        if (p < v && q < v) { steps.push({ path: [...path], cur: i, skip: nodes[i].right, line: 'left', note: `${p} and ${q} are both < ${v}: go left. The right subtree is skipped entirely.` }); i = nodes[i].left; }
        else if (p > v && q > v) { steps.push({ path: [...path], cur: i, skip: nodes[i].left, line: 'right', note: `${p} and ${q} are both > ${v}: go right.` }); i = nodes[i].right; }
        else { steps.push({ path: [...path], cur: i, lca: i, done: true, line: 'split', result: v, note: `${p} and ${q} are not on the same side of ${v} (or one equals it): ${v} is the LCA.`, why: 'Each comparison discards a whole subtree: O(h) time, O(1) space, no recursion needed.' }); return steps; }
      }
      return steps;
    },
    render(st, stage, { tree: arr }) {
      const { nodes } = parseTree(arr); const states = {};
      const dimAll = (i) => { if (i == null) return; states[i] = 'dim'; dimAll(nodes[i].left); dimAll(nodes[i].right); };
      st.path.forEach((i) => (states[i] = 'frontier')); if (st.skip != null) dimAll(st.skip); states[st.cur] = st.lca != null ? 'error' : 'current';
      stage.append(T(arr, { states }));
    },
  });

  V.define('tree-construct', {
    title: 'Build a tree from preorder and inorder',
    inputs: [{ key: 'pre', label: 'preorder', type: 'numbers', def: [3, 9, 20, 15, 7] }, { key: 'ino', label: 'inorder', type: 'numbers', def: [9, 3, 15, 20, 7] }],
    presets: [{ label: 'Day 5 by-hand example', input: { pre: [3, 9, 20, 15, 7], ino: [9, 3, 15, 20, 7] } }, { label: 'Left-skewed', input: { pre: [3, 2, 1], ino: [1, 2, 3] } }, { label: 'Seven nodes', input: { pre: [1, 2, 4, 5, 3, 6, 7], ino: [4, 2, 5, 1, 6, 3, 7] } }],
    legend: [['current', 'root of the current call'], ['window', 'inorder range of the call'], ['done', 'built']],
    code: `
function buildTree(preorder, inorder) {
  const pos = new Map(inorder.map((v, i) => [v, i]));   // value -> inorder index
  let p = 0;                                             // next preorder element
  function build(lo, hi) {                               // inorder range [lo, hi]
    if (lo > hi) return null;                                          //@empty
    const val = preorder[p++], mid = pos.get(val);                     //@root
    const node = new TreeNode(val);
    node.left = build(lo, mid - 1);     // left part of inorder        //@left
    node.right = build(mid + 1, hi);    // right part                  //@right
    return node;
  }
  return build(0, inorder.length - 1);
}`,
    validate: ({ pre, ino }) => (pre.length !== ino.length ? 'Both traversals must have the same length.' : pre.length > 9 ? 'Use at most 9 nodes.' : new Set(pre).size !== pre.length ? 'Values must be distinct.' : [...pre].sort().join() !== [...ino].sort().join() ? 'Both traversals must contain the same values.' : null),
    run({ pre, ino }) {
      const pos = new Map(ino.map((v, i) => [v, i])); let p = 0; const steps = [], built = [];
      function build(lo, hi, parent, side) {
        if (lo > hi) return;
        const val = pre[p++], mid = pos.get(val);
        built.push({ id: val, label: String(val), parent, side });
        steps.push({ built: built.map((x) => ({ ...x })), cur: val, range: [lo, hi], mid, p, line: ['root', 'left'], note: `preorder[${p - 1}] = ${val} is the root of inorder[${lo}..${hi}]. It sits at inorder index ${mid}: ${mid - lo} node${mid - lo === 1 ? '' : 's'} on its left, ${hi - mid} on its right.`, why: steps.length === 0 ? 'Preorder lists a root before its subtrees; inorder puts the left subtree before the root and the right subtree after it. Together they pin down the tree.' : null });
        build(lo, mid - 1, val, 'L'); build(mid + 1, hi, val, 'R');
      }
      build(0, ino.length - 1, null, null);
      steps.push({ built, cur: null, range: null, p, done: true, line: null, result: built.length, note: 'Every value placed.', why: 'The Map gives each root\'s inorder position in O(1), and index bounds avoid slicing: O(n) total instead of O(n²).' });
      return steps;
    },
    render(st, stage, { pre, ino }) {
      // ghost placeholders keep left/right positions when only one child exists
      const nodes = []; const kids = {}; st.built.forEach((b) => { kids[b.id] = kids[b.id] || {}; if (b.parent != null) (kids[b.parent] = kids[b.parent] || {})[b.side] = b.id; });
      let gh = -1; const add = (id, parent) => { const b = st.built.find((x) => x.id === id); nodes.push({ id, label: b.label, parent, state: id === st.cur ? 'current' : 'done' }); const k = kids[id] || {}; if (k.L == null && k.R == null) return; if (k.L != null) add(k.L, id); else nodes.push({ id: 'g' + gh--, label: '', parent: id, ghost: true }); if (k.R != null) add(k.R, id); else nodes.push({ id: 'g' + gh--, label: '', parent: id, ghost: true }); };
      if (st.built.length) add(st.built[0].id, null);
      stage.append(R.tree(nodes, { dx: 50, dy: 54, r: 17, label: 'tree built so far' }));
      stage.append(R.cells(pre, { states: Object.fromEntries(pre.map((_, i) => [i, i < st.p ? 'done' : null]).filter(([, v]) => v)), ptrs: st.p < pre.length && !st.done ? { [st.p]: 'p' } : {}, label: 'preorder' }));
      const is = {}; if (st.mid != null) is[st.mid] = 'current';
      stage.append(R.cells(ino, { states: is, window: st.range, label: 'inorder' }));
    },
  });
})(window);
