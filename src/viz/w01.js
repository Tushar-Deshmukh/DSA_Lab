// Week 1 visualizers: growth rates, counting loop iterations, recursion trees, amortised push,
// hash maps and buckets, read/write pointers, counting and grouping, matrices.
(function (g) {
  'use strict';
  const { el } = g.Core;
  const R = g.R, V = g.Viz;
  const sizeCheck = (a, lo, hi, what = 'array') => (a.length < lo ? 'Use at least ' + lo + ' element' + (lo > 1 ? 's.' : '.') : a.length > hi ? 'Keep the ' + what + ' to ' + hi + ' elements or fewer so it fits on screen.' : null);

  // ---------- growth of the common classes ----------
  const CLASSES = [
    ['O(1)', () => 1, 'c1'], ['O(log n)', (n) => Math.max(1, Math.log2(n)), 'clog'], ['O(n)', (n) => n, 'cn'],
    ['O(n log n)', (n) => n * Math.max(1, Math.log2(n)), 'cnlog'], ['O(n²)', (n) => n * n, 'cn2'], ['O(2ⁿ)', (n) => Math.pow(2, n), 'c2n'],
  ];
  const human = (ops) => {
    if (!isFinite(ops) || ops > 1e30) return 'longer than the age of the universe';
    const s = ops / 1e8; // ~10^8 simple operations per second (roadmap's upper estimate)
    if (s < 1e-3) return 'instant';
    if (s < 1) return (s * 1000).toFixed(s < 0.01 ? 2 : 0) + ' ms';
    if (s < 120) return s.toFixed(1) + ' s';
    if (s < 7200) return (s / 60).toFixed(0) + ' min';
    if (s < 86400 * 3) return (s / 3600).toFixed(0) + ' h';
    if (s < 3.15e7 * 3) return (s / 86400).toFixed(0) + ' days';
    return (s / 3.15e7).toExponential(1) + ' years';
  };
  const big = (x) => (!isFinite(x) || x > 1e15 ? x > 1e300 || !isFinite(x) ? '> 10³⁰⁰' : '≈ 10^' + Math.floor(Math.log10(x)) : Math.round(x).toLocaleString('en-US'));
  V.define('growth', {
    title: 'How the common complexity classes grow',
    inputs: [{ key: 'n', label: 'n (input size)', type: 'int', def: 1000 }],
    presets: [{ label: 'n = 20', input: { n: 20 } }, { label: 'n = 1,000', input: { n: 1000 } }, { label: 'n = 100,000', input: { n: 100000 } }, { label: 'n = 1,000,000', input: { n: 1000000 } }],
    legend: [['current', 'class just added'], ['error', 'too slow for one second']],
    code: `
return a[0];                                               //@c1
for (let i = n; i > 1; i = Math.floor(i / 2)) work();      //@clog
for (let i = 0; i < n; i++) work();                        //@cn
for (let i = 0; i < n; i++)
  for (let j = 1; j < n; j *= 2) work();                   //@cnlog
for (let i = 0; i < n; i++)
  for (let j = 0; j < n; j++) work();                      //@cn2
function f(n) { if (n <= 1) return; f(n - 1); f(n - 1); }  //@c2n`,
    validate: ({ n }) => (n < 2 ? 'Use n ≥ 2.' : n > 1e9 ? 'Use n ≤ 10⁹.' : null),
    run({ n }) {
      return CLASSES.map(([name, f, tag], k) => {
        const ops = f(n);
        return { line: tag, k, note: `${name}: about ${big(ops)} operations for n = ${n.toLocaleString('en-US')} → ${human(ops)} at ~10⁸ simple operations per second.`, why: k === 5 ? 'Exponential growth is why n ≤ 20–25 is the limit for subset-style brute force.' : k === 4 ? 'Quadratic is fine up to n ≈ 5,000 and hopeless at 10⁵ and beyond.' : k === 3 ? 'n log n is barely more than n: sorting first is usually affordable.' : null, result: k === 5 ? n : undefined };
      });
    },
    render(st, stage, { n }) {
      const W = 460, rowH = 30, labW = 86, H = CLASSES.length * rowH + 10;
      const s = R.svg('svg', { class: 'vz', viewBox: `0 0 ${W + 150} ${H}`, width: W + 150, role: 'img', 'aria-label': 'operation counts, log scale' });
      const maxLog = 18;
      CLASSES.forEach(([name, f], k) => {
        const y = 6 + k * rowH;
        s.append(R.svg('text', { x: 0, y: y + 17, style: 'font-family:var(--f-ui);font-size:12.5px;font-weight:600' }, name));
        if (k > st.k) return;
        const ops = f(n), lg = Math.min(maxLog, Math.log10(Math.max(1, ops)));
        const slow = ops / 1e8 > 1;
        s.append(R.svg('rect', { class: 'node ' + (k === st.k ? 's-current' : slow ? 's-error' : 's-done'), x: labW, y: y + 2, width: Math.max(3, (lg / maxLog) * (W - labW)), height: rowH - 10, rx: 3 }));
        s.append(R.svg('text', { class: 'lbl', x: labW + Math.max(3, (lg / maxLog) * (W - labW)) + 6, y: y + 17 }, big(ops) + ' · ' + human(ops)));
      });
      stage.append(el('div', el('div.panel-label', 'operations (logarithmic scale)'), el('div', { style: { overflowX: 'auto' } }, s)));
    },
  });

  // ---------- counting loop iterations ----------
  function loopDef(id, title, code, body, formula, why) {
    V.define(id, {
      title, code,
      inputs: [{ key: 'n', label: 'n', type: 'int', def: 16 }],
      presets: [{ label: 'n = 8', input: { n: 8 } }, { label: 'n = 16', input: { n: 16 } }, { label: 'n = 32', input: { n: 32 } }],
      legend: [['current', 'this iteration']],
      validate: ({ n }) => (n < 1 || n > 32 ? 'Use 1 ≤ n ≤ 32 so the steps fit.' : null),
      run({ n }) { const steps = []; let count = 0; body(n, (vars, line) => { count++; steps.push({ line, vars: { ...vars }, count, note: `work() call #${count}: ${Object.entries(vars).map(([k, v]) => k + ' = ' + v).join(', ')}.` }); }); steps.push({ line: null, vars: {}, count, done: true, result: count, note: `Total: ${count} calls for n = ${n}. ${formula(n)}`, why }); return steps; },
      render(st, stage, { n }) {
        stage.append(R.vars(Object.assign({ n }, st.vars, { 'work() calls so far': st.count })));
        const marks = el('div.small.ui.muted', { style: { display: 'flex', flexWrap: 'wrap', gap: '2px' } });
        for (let k = 0; k < st.count; k++) marks.append(el('span', { style: { width: '8px', height: '14px', background: k === st.count - 1 && !st.done ? 'var(--st-current)' : 'var(--st-done)', borderRadius: '2px', display: 'inline-block' } }));
        stage.append(el('div', el('div.panel-label', 'one mark per work() call'), marks));
      },
    });
  }
  loopDef('loop-halving', 'A loop whose index halves: O(log n)', `
for (let i = n; i > 1; i = Math.floor(i / 2)) {   //@loop
  work();                                         //@work
}`, (n, hit) => { for (let i = n; i > 1; i = Math.floor(i / 2)) hit({ i }, 'work'); }, (n) => 'log₂(' + n + ') ≈ ' + Math.log2(n).toFixed(2) + '. Doubling n adds only one more iteration.', 'Each iteration halves the remaining range, so the number of iterations is the number of halvings needed to reach 1: about log₂ n.');
  loopDef('loop-nlogn', 'Outer loop n, inner loop doubling: O(n log n)', `
for (let i = 0; i < n; i++) {                     //@outer
  for (let j = 1; j < n; j *= 2) {                //@inner
    work();                                       //@work
  }
}`, (n, hit) => { for (let i = 0; i < n; i++) for (let j = 1; j < n; j *= 2) hit({ i, j }, 'work'); }, (n) => 'n · ⌈log₂ n⌉ = ' + n + ' · ' + Math.ceil(Math.log2(Math.max(1, n))) + ' = ' + n * Math.ceil(Math.log2(Math.max(1, n))) + '.', 'The inner loop does not depend on i: it always runs about log₂ n times. n outer iterations × log n inner = O(n log n).');
  loopDef('loop-triangle', 'Inner loop starts at i + 1: still O(n²)', `
for (let i = 0; i < n; i++) {                     //@outer
  for (let j = i + 1; j < n; j++) {               //@inner
    work();                                       //@work
  }
}`, (n, hit) => { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) hit({ i, j }, 'work'); }, (n) => 'n(n − 1)/2 = ' + (n * (n - 1)) / 2 + ', about half of n² = ' + n * n + '.', 'Halving the work is a constant factor. n(n−1)/2 grows like n², so this is still O(n²): this is the pair loop in every brute force.');

  // ---------- recursion tree ----------
  V.define('tree-double', {
    title: 'Recursion tree: two calls on n − 1 is O(2ⁿ)',
    inputs: [{ key: 'n', label: 'n', type: 'int', def: 4 }],
    presets: [{ label: 'n = 3', input: { n: 3 } }, { label: 'n = 4', input: { n: 4 } }, { label: 'n = 5', input: { n: 5 } }],
    legend: [['current', 'running now'], ['frontier', 'waiting on the stack'], ['done', 'returned']],
    code: `
function f(n) {
  if (n <= 1) return;   // base case     //@base
  f(n - 1);             // first call    //@c1
  f(n - 1);             // second call   //@c2
}                                        //@ret`,
    validate: ({ n }) => (n < 1 || n > 5 ? 'Use 1 ≤ n ≤ 5 (n = 5 already makes 31 calls).' : null),
    run({ n }) {
      const steps = [], nodes = [], stack = []; let id = 0, maxDepth = 0;
      const state = {};
      const snap = (o) => ({ nodes: nodes.map((x) => ({ ...x, state: state[x.id] })), stack: stack.map((x) => 'f(' + x.n + ')'), calls: nodes.length, maxDepth, ...o });
      function call(k, parent) {
        const me = id++; nodes.push({ id: me, label: 'f(' + k + ')', parent }); stack.push({ n: k, id: me }); maxDepth = Math.max(maxDepth, stack.length);
        stack.forEach((x) => (state[x.id] = 'frontier')); state[me] = 'current';
        if (k <= 1) { steps.push(snap({ line: 'base', note: `f(${k}): base case, return immediately.` })); }
        else {
          steps.push(snap({ line: 'c1', note: `f(${k}) calls f(${k - 1}) for the first time.`, why: me === 0 ? 'The caller waits on the stack until the call returns: this is the call stack.' : null }));
          call(k - 1, me); state[me] = 'current';
          steps.push(snap({ line: 'c2', note: `Back in f(${k}); it calls f(${k - 1}) again.`, why: 'The second call repeats all the work of the first: nothing is remembered between them.' }));
          call(k - 1, me); state[me] = 'current';
        }
        stack.pop(); state[me] = 'done';
        steps.push(snap({ line: 'ret', note: `f(${k}) returns.` }));
      }
      call(n, null);
      steps.push(snap({ line: null, done: true, result: nodes.length, note: `${nodes.length} calls in total = 2^${n} − 1. Deepest stack: ${maxDepth} frames.`, why: 'Time = number of calls × work per call = O(2ⁿ) × O(1). Space = deepest stack = O(n): only one root-to-leaf path is on the stack at a time.' }));
      return steps;
    },
    render(st, stage) {
      stage.append(R.tree(st.nodes, { dx: 46, dy: 54, r: 17, label: 'recursion tree (one node per call)' }));
      stage.append(R.vars({ 'calls so far': st.calls, 'max stack depth': st.maxDepth }));
      stage.append(R.frames(st.stack.map((t) => ({ text: t }))));
    },
  });

  // ---------- amortised push ----------
  V.define('amortized-push', {
    title: 'Dynamic array push: occasional O(n) copy, O(1) amortised',
    inputs: [{ key: 'n', label: 'number of pushes', type: 'int', def: 17 }],
    presets: [{ label: '9 pushes', input: { n: 9 } }, { label: '17 pushes', input: { n: 17 } }, { label: '33 pushes', input: { n: 33 } }],
    legend: [['current', 'written now'], ['compare', 'copied during a resize'], ['dim', 'allocated but empty']],
    code: `
function push(arr, x) {
  if (arr.size === arr.capacity) {          //@full
    const bigger = new Buffer(2 * arr.capacity);
    copy(arr.buffer, bigger);   // O(size)   //@copy
    arr.buffer = bigger; arr.capacity *= 2; //@grow
  }
  arr.buffer[arr.size++] = x;   // O(1)      //@write
}`,
    validate: ({ n }) => (n < 1 || n > 40 ? 'Use 1–40 pushes.' : null),
    run({ n }) {
      const steps = []; let cap = 1, size = 0, copies = 0; let buf = [null];
      for (let x = 1; x <= n; x++) {
        if (size === cap) {
          copies += size; cap *= 2; const nb = new Array(cap).fill(null); for (let i = 0; i < size; i++) nb[i] = buf[i]; buf = nb;
          steps.push({ line: ['full', 'copy', 'grow'], buf: [...buf], size, cap, copies, ops: copies + size, copied: size, note: `Full (size ${size} = capacity). Allocate ${cap} slots and copy ${size} element${size === 1 ? '' : 's'}.`, why: 'This push costs O(size). But the capacity doubled, so the next ' + (cap / 2 - 1) + ' pushes will be cheap.' });
        }
        buf[size++] = x;
        steps.push({ line: 'write', buf: [...buf], size, cap, copies, ops: copies + size, wrote: size - 1, note: `Write ${x} at index ${size - 1}.`, why: x === n ? `After ${n} pushes: ${n} writes + ${copies} copied elements = ${n + copies} units of work, ${((n + copies) / n).toFixed(2)} per push. It never exceeds 3 per push.` : null, result: x === n ? (n + copies) / n <= 3 : undefined });
      }
      return steps;
    },
    render(st, stage) {
      const states = {}; st.buf.forEach((v, i) => { if (v === null) states[i] = 'dim'; });
      if (st.copied) for (let i = 0; i < st.copied; i++) states[i] = 'compare';
      if (st.wrote != null) states[st.wrote] = 'current';
      stage.append(R.cells(st.buf.map((v) => (v === null ? '' : v)), { states, label: 'buffer (capacity ' + st.cap + ')' }));
      stage.append(R.vars({ size: st.size, capacity: st.cap, 'elements copied (total)': st.copies, 'work per push so far': (st.ops / st.size).toFixed(2) }));
    },
  });

  // ---------- Two Sum with a hash map ----------
  V.define('hash-twosum', {
    title: 'Two Sum: check for the complement, then store',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [3, 2, 4], wide: true }, { key: 'target', label: 'target', type: 'number', def: 6 }],
    presets: [{ label: 'Roadmap dry run', input: { nums: [3, 2, 4], target: 6 } }, { label: 'LeetCode example', input: { nums: [2, 7, 11, 15], target: 9 } }, { label: 'Same value twice', input: { nums: [3, 3], target: 6 } }, { label: 'Negatives', input: { nums: [-1, -2, -3, -4, -5], target: -8 } }],
    legend: [['current', 'index i'], ['done', 'answer pair'], ['compare', 'already stored']],
    code: `
function twoSum(nums, target) {
  const indexOf = new Map();       // value -> index    //@init
  for (let i = 0; i < nums.length; i++) {             //@loop
    const need = target - nums[i];                    //@need
    if (indexOf.has(need)) return [indexOf.get(need), i];  //@check
    indexOf.set(nums[i], i);      // store AFTER check //@store
  }
  return [];                                          //@none
}`,
    validate: ({ nums }) => sizeCheck(nums, 1, 14),
    run({ nums: a, target }) {
      const steps = [], map = new Map();
      steps.push({ line: 'init', map: [], note: 'Empty map: no values seen yet.' });
      for (let i = 0; i < a.length; i++) {
        const need = target - a[i];
        if (map.has(need)) { steps.push({ line: ['need', 'check'], i, need, map: [...map], hit: need, found: [map.get(need), i], result: [map.get(need), i], note: `i = ${i}: need ${target} − ${a[i]} = ${need}. It is in the map at index ${map.get(need)}: return [${map.get(need)}, ${i}].`, why: 'Every earlier element was stored, so each pair (j, i) with j < i is checked exactly when i is visited: one pass, O(n) average.' }); return steps; }
        steps.push({ line: ['need', 'check'], i, need, map: [...map], note: `i = ${i}: need ${target} − ${a[i]} = ${need}. Not in the map.`, why: i === 0 ? 'This lookup is O(1) on average. It replaces the brute force inner loop over all earlier elements.' : null });
        map.set(a[i], i);
        steps.push({ line: 'store', i, map: [...map], stored: a[i], note: `Store ${a[i]} → ${i}.`, why: i === 0 ? 'Storing after the check means an element can never pair with itself (try nums = [3], target = 6).' : null });
      }
      steps.push({ line: 'none', map: [...map], result: [], note: 'No pair found: return [].' });
      return steps;
    },
    render(st, stage, { nums: a, target }) {
      const states = {}; if (st.i != null) states[st.i] = 'current';
      if (st.found) { states[st.found[0]] = 'done'; states[st.found[1]] = 'done'; }
      stage.append(R.cells(a, { states, ptrs: st.i != null ? { [st.i]: 'i' } : {}, label: 'nums' }));
      const ms = {}; if (st.hit != null) ms[st.hit] = 'done'; if (st.stored != null) ms[st.stored] = 'current';
      stage.append(R.kv(st.map, { label: 'indexOf (value → index)', states: ms }));
      stage.append(R.vars({ target, need: st.need ?? '·' }));
    },
  });

  // ---------- hash table buckets ----------
  const hashStr = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  V.define('hash-buckets', {
    title: 'Inside a hash table: buckets, collisions and resizing',
    inputs: [{ key: 'keys', label: 'keys to insert', type: 'array', def: ['cat', 'dog', 'emu', 'ant', 'owl', 'bee', 'yak'], wide: true }, { key: 'buckets', label: 'initial buckets', type: 'int', def: 4 }, { key: 'find', label: 'then look up', type: 'string', def: 'owl' }],
    presets: [{ label: 'Resize happens', input: { keys: ['cat', 'dog', 'emu', 'ant', 'owl', 'bee', 'yak'], buckets: 4, find: 'owl' } }, { label: 'Missing key', input: { keys: ['a', 'b', 'c'], buckets: 4, find: 'z' } }, { label: 'Many collisions (1 bucket)', input: { keys: ['k1', 'k2', 'k3'], buckets: 1, find: 'k3' } }],
    legend: [['current', 'key being placed or compared'], ['done', 'found']],
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
    validate: ({ keys, buckets }) => sizeCheck(keys, 1, 12, 'key list') || (buckets < 1 || buckets > 16 ? 'Use 1–16 buckets.' : new Set(keys.map(String)).size !== keys.length ? 'Use distinct keys (a set stores each key once).' : null),
    run({ keys, buckets: m0, find }) {
      const steps = []; let m = m0; let B = Array.from({ length: m }, () => []); let size = 0;
      const snap = (o) => ({ B: B.map((x) => [...x]), m, size, ...o });
      for (const k0 of keys) {
        const k = String(k0); const h = hashStr(k), b = h % m; const coll = B[b].length > 0;
        B[b].push(k); size++;
        steps.push(snap({ line: ['hash', 'push'], key: k, b, note: `hash("${k}") = ${h}; ${h} mod ${m} = bucket ${b}.${coll ? ' Collision: the bucket already holds ' + B[b].slice(0, -1).map((x) => '"' + x + '"').join(', ') + '; chain it.' : ''}`, why: coll ? 'Different keys can land in the same bucket. Chaining keeps a short list per bucket; lookups compare keys only within that list.' : null }));
        if (size / m > 0.75) {
          const old = m; m *= 2; const nb = Array.from({ length: m }, () => []);
          B.flat().forEach((x) => nb[hashStr(x) % m].push(x)); B = nb;
          steps.push(snap({ line: 'resize', note: `Load factor ${size}/${old} = ${(size / old).toFixed(2)} > 0.75: double to ${m} buckets and re-insert every key.`, why: 'Resizing is O(n) when it happens, but doubling makes it rare (amortised O(1) per insert, like array push). It keeps the average bucket length O(1).' }));
        }
      }
      const fk = String(find); const h = hashStr(fk), b = h % m;
      const found = B[b].includes(fk);
      steps.push(snap({ line: 'find', key: fk, b, look: true, found, result: found, note: `Look up "${fk}": bucket ${b} holds [${B[b].map((x) => '"' + x + '"').join(', ')}] → ${found ? 'found' : 'not found'} after ${B[b].length} comparison${B[b].length === 1 ? '' : 's'}.`, why: 'Only one bucket is searched. With a good hash and resizing, buckets stay short on average: O(1) average. If every key collided (try the 1-bucket preset), it degrades to O(n).' }));
      return steps;
    },
    render(st, stage) {
      const rows = el('div.stack', { style: { gap: '4px', fontFamily: 'var(--f-code)', fontSize: '13px' } });
      st.B.forEach((chain, i) => {
        rows.append(el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
          el('span', { style: { width: '74px', color: i === st.b ? 'var(--st-current)' : 'var(--ink-3)', fontWeight: i === st.b ? 700 : 400 } }, 'bucket ' + i),
          ...(chain.length ? chain.map((k) => el('span', { class: 'chip', style: k === st.key ? { borderColor: st.look ? (st.found ? 'var(--st-done)' : 'var(--st-error)') : 'var(--st-current)', fontWeight: 700 } : null }, k)) : [el('span.small.muted', 'empty')])));
      });
      stage.append(el('div', el('div.panel-label', 'buckets (chaining)'), rows));
      stage.append(R.vars({ keys: st.size, buckets: st.m, 'load factor': (st.size / st.m).toFixed(2) }));
    },
  });

  // ---------- read/write pointers ----------
  V.define('remove-dups', {
    title: 'Read/write pointers: Remove Duplicates from Sorted Array',
    inputs: [{ key: 'nums', label: 'nums (sorted)', type: 'numbers', def: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4], wide: true }],
    presets: [{ label: 'Day 2 trace', input: { nums: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4] } }, { label: 'Roadmap example', input: { nums: [1, 1, 2, 3, 3] } }, { label: 'All equal', input: { nums: [5, 5, 5] } }, { label: 'No duplicates', input: { nums: [1, 2, 3] } }],
    legend: [['done', 'kept prefix nums[0..write−1]'], ['current', 'read'], ['compare', 'last kept value']],
    code: `
function removeDuplicates(nums) {
  if (nums.length === 0) return 0;                  //@empty
  let write = 1;                                    //@init
  for (let read = 1; read < nums.length; read++) {  //@loop
    if (nums[read] !== nums[write - 1]) {           //@cmp
      nums[write] = nums[read];                     //@copy
      write++;                                      //@inc
    }
  }
  return write;                                     //@ret
}`,
    validate: ({ nums }) => sizeCheck(nums, 0, 14) || (nums.every((x, i) => i === 0 || nums[i - 1] <= x) ? null : 'The input must be sorted (non-decreasing).'),
    run({ nums }) {
      const a = [...nums], steps = [];
      if (!a.length) return [{ line: 'empty', a, write: 0, result: 0, note: 'Empty array: return 0.' }];
      let write = 1;
      steps.push({ line: 'init', a: [...a], write, note: 'nums[0] is always kept, so the kept prefix starts as nums[0..0] and write = 1.', why: 'Invariant: nums[0..write−1] holds the distinct values seen so far, in order.' });
      for (let read = 1; read < a.length; read++) {
        if (a[read] !== a[write - 1]) {
          a[write] = a[read]; write++;
          steps.push({ line: ['cmp', 'copy', 'inc'], a: [...a], write, read, wrote: write - 1, note: `nums[${read}] = ${a[read]} differs from the last kept value ${a[write - 2]}: copy it to index ${write - 1}; write = ${write}.`, why: 'write ≤ read always, so we only overwrite positions that have already been read.' });
        } else steps.push({ line: 'cmp', a: [...a], write, read, note: `nums[${read}] = ${a[read]} equals the last kept value nums[${write - 1}]: skip it.`, why: read === 1 ? 'Compare with the last *kept* value (nums[write − 1]), not with nums[read − 1]. Here they happen to be equal; on [1,1,2,2] after the first copy they would differ.' : null });
      }
      steps.push({ line: 'ret', a: [...a], write, done: true, result: write, note: `Return ${write}. The first ${write} slots hold [${a.slice(0, write).join(', ')}]; what follows does not matter.` });
      return steps;
    },
    render(st, stage) {
      const states = {}; for (let i = 0; i < st.write; i++) states[i] = 'done';
      if (!st.done && st.write > 0) states[st.write - 1] = st.wrote === st.write - 1 ? 'current' : 'compare';
      if (st.read != null && !st.done) states[st.read] = 'current';
      const ptrs = {}; if (!st.done) { if (st.read != null) ptrs[st.read] = 'read'; if (st.write < st.a.length) ptrs[st.write] = ptrs[st.write] ? [ptrs[st.write], 'write'] : 'write'; }
      stage.append(R.cells(st.a, { states, ptrs, label: 'nums' }));
      stage.append(R.vars({ write: st.write, read: st.read ?? '·' }));
    },
  });
  V.define('move-zeroes', {
    title: 'Read/write pointers with swaps: Move Zeroes',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [0, 1, 0, 3, 12], wide: true }],
    presets: [{ label: 'LeetCode example', input: { nums: [0, 1, 0, 3, 12] } }, { label: 'No zeros', input: { nums: [1, 2, 3] } }, { label: 'All zeros', input: { nums: [0, 0, 0] } }],
    legend: [['done', 'non-zeros, in order: [0, write)'], ['current', 'read'], ['compare', 'swapped']],
    code: `
function moveZeroes(nums) {
  let write = 0;                                       //@init
  for (let read = 0; read < nums.length; read++) {     //@loop
    if (nums[read] !== 0) {                            //@cmp
      [nums[write], nums[read]] = [nums[read], nums[write]];  //@swap
      write++;                                         //@inc
    }
  }
}`,
    validate: ({ nums }) => sizeCheck(nums, 1, 14),
    run({ nums }) {
      const a = [...nums], steps = []; let write = 0;
      steps.push({ line: 'init', a: [...a], write, note: 'write = 0: no non-zero values placed yet.', why: 'Invariant: [0, write) holds the non-zeros seen so far in their original order; [write, read) holds only zeros.' });
      for (let read = 0; read < a.length; read++) {
        if (a[read] !== 0) {
          const same = write === read;
          [a[write], a[read]] = [a[read], a[write]]; write++;
          steps.push({ line: ['cmp', 'swap', 'inc'], a: [...a], write, read, sw: [write - 1, read], note: same ? `nums[${read}] = ${a[write - 1]} is non-zero and already in place (write = read); write = ${write}.` : `nums[${read}] = ${a[write - 1]} is non-zero: swap it with the zero at index ${write - 1}; write = ${write}.` });
        } else steps.push({ line: 'cmp', a: [...a], write, read, note: `nums[${read}] = 0: leave it; it will be pushed right by later swaps.` });
      }
      steps.push({ line: null, a: [...a], write, done: true, result: [...a], note: `Done: [${a.join(', ')}].`, why: 'One pass, O(n) time, O(1) space, and the non-zeros keep their relative order (the problem requires it).' });
      return steps;
    },
    render(st, stage) {
      const states = {}; for (let i = 0; i < st.write; i++) states[i] = 'done';
      if (st.sw && st.sw[0] !== st.sw[1]) { states[st.sw[0]] = 'compare'; states[st.sw[1]] = 'compare'; }
      else if (st.read != null && !st.done) states[st.read] = 'current';
      const ptrs = {}; if (!st.done) { if (st.read != null) ptrs[st.read] = 'read'; if (st.write < st.a.length) ptrs[st.write] = ptrs[st.write] ? [ptrs[st.write], 'write'] : 'write'; }
      stage.append(R.cells(st.a, { states, ptrs, label: 'nums' }));
      stage.append(R.vars({ write: st.write, read: st.read ?? '·' }));
    },
  });
  V.define('running-min', {
    title: 'One pass with a running minimum (Best Time to Buy and Sell Stock)',
    inputs: [{ key: 'prices', label: 'prices', type: 'numbers', def: [7, 1, 5, 3, 6, 4], wide: true }],
    presets: [{ label: 'LeetCode example 1', input: { prices: [7, 1, 5, 3, 6, 4] } }, { label: 'Falling prices', input: { prices: [7, 6, 4, 3, 1] } }, { label: 'New minimum late', input: { prices: [3, 8, 1, 4] } }],
    legend: [['current', 'today (sell day)'], ['done', 'cheapest day so far (buy day)']],
    code: `
function maxProfit(prices) {
  let minPrice = Infinity, best = 0;         //@init
  for (const p of prices) {                  //@loop
    minPrice = Math.min(minPrice, p);        //@min
    best = Math.max(best, p - minPrice);     //@best
  }
  return best;                               //@ret
}`,
    validate: ({ prices }) => sizeCheck(prices, 1, 16) || (prices.some((x) => x < 0) ? 'Prices are 0 or more.' : null),
    run({ prices: a }) {
      const steps = []; let mn = Infinity, mi = -1, best = 0, bp = null;
      a.forEach((p, i) => {
        if (p < mn) { mn = p; mi = i; }
        const nb = p - mn > best; if (nb) { best = p - mn; bp = [mi, i]; }
        steps.push({ line: ['min', 'best'], i, mn, mi, best, bp, note: `Day ${i}, price ${p}: cheapest so far ${mn} (day ${mi}). Selling today earns ${p - mn}.${nb ? ' New best.' : ''}`, why: i === 0 ? 'For each sell day, the best buy day is simply the cheapest earlier day. Remembering it replaces the inner loop over all earlier days.' : null });
      });
      steps.push({ line: 'ret', best, bp, mi, mn, done: true, result: best, note: best ? `Best profit ${best}: buy on day ${bp[0]}, sell on day ${bp[1]}.` : 'Prices never rise: profit 0 (do not trade).' });
      return steps;
    },
    render(st, stage, { prices: a }) {
      const states = {}; if (st.done) { if (st.bp) { states[st.bp[0]] = 'done'; states[st.bp[1]] = 'current'; } } else { states[st.mi] = 'done'; states[st.i] = 'current'; }
      stage.append(R.bars(a, { states, label: 'prices by day' }));
      stage.append(R.vars({ minPrice: st.mn, best: st.best }));
    },
  });

  // ---------- counting and grouping ----------
  V.define('anagram-count', {
    title: 'Valid Anagram with a 26-slot count array',
    inputs: [{ key: 's', label: 's', type: 'string', def: 'anagram' }, { key: 't', label: 't', type: 'string', def: 'nagaram' }],
    presets: [{ label: 'LeetCode example 1', input: { s: 'anagram', t: 'nagaram' } }, { label: 'LeetCode example 2', input: { s: 'rat', t: 'car' } }, { label: 'Different lengths', input: { s: 'ab', t: 'a' } }],
    legend: [['current', 'changed now'], ['error', 'non-zero at the end']],
    code: `
function isAnagram(s, t) {
  if (s.length !== t.length) return false;      //@len
  const count = new Array(26).fill(0);           //@init
  for (let i = 0; i < s.length; i++) {           //@loop
    count[s.charCodeAt(i) - 97]++;               //@inc
    count[t.charCodeAt(i) - 97]--;               //@dec
  }
  return count.every((c) => c === 0);            //@ret
}`,
    validate: ({ s, t }) => (!/^[a-z]*$/.test(s + t) ? 'Use lower-case letters a–z.' : s.length > 14 || t.length > 14 ? 'Keep each string to 14 letters.' : null),
    run({ s, t }) {
      const steps = []; const cnt = new Array(26).fill(0);
      const view = () => cnt.map((c, i) => [String.fromCharCode(97 + i), c]).filter(([, c]) => c !== 0);
      if (s.length !== t.length) return [{ line: 'len', counts: [], result: false, note: `Lengths ${s.length} and ${t.length} differ: not an anagram. Return false without counting.` }];
      steps.push({ line: 'init', counts: [], note: '26 zeros, one per letter: index = charCode − 97.', why: 'A fixed array beats a Map here: the key space is small and dense (Hash tables, "when not to use one").' });
      for (let i = 0; i < s.length; i++) {
        cnt[s.charCodeAt(i) - 97]++; cnt[t.charCodeAt(i) - 97]--;
        steps.push({ line: ['inc', 'dec'], counts: view(), ch: [s[i], t[i]], i, note: `i = ${i}: +1 for "${s[i]}" (from s), −1 for "${t[i]}" (from t).${s[i] === t[i] ? ' They cancel.' : ''}` });
      }
      const ok = cnt.every((c) => c === 0);
      steps.push({ line: 'ret', counts: view(), done: true, result: ok, note: ok ? 'Every count is back to 0: same letters, same multiplicities. Return true.' : 'Some counts are not 0: ' + view().map(([c, v]) => c + ' ' + (v > 0 ? '+' : '') + v).join(', ') + '. Return false.', why: 'O(n) time and O(26) = O(1) space, against O(n log n) for sorting both strings.' });
      return steps;
    },
    render(st, stage, { s, t }) {
      stage.append(R.cells([...s], { states: st.i != null ? { [st.i]: 'current' } : {}, label: 's' }));
      stage.append(R.cells([...t], { states: st.i != null ? { [st.i]: 'current' } : {}, label: 't' }));
      const states = {}; if (st.ch) st.ch.forEach((c) => (states[c] = 'current')); if (st.done) st.counts.forEach(([c]) => (states[c] = 'error'));
      stage.append(R.kv(st.counts, { label: 'non-zero counts (letter → count)', empty: 'all 26 counts are 0', states }));
    },
  });
  V.define('group-anagrams', {
    title: 'Group Anagrams by a canonical key',
    inputs: [{ key: 'strs', label: 'strs', type: 'array', def: ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'], wide: true }, { key: 'keyType', label: 'key', type: 'select', def: 'sorted', options: [{ value: 'sorted', label: 'sorted letters' }, { value: 'counts', label: '26 counts joined with #' }] }],
    presets: [{ label: 'LeetCode example', input: { strs: ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'], keyType: 'sorted' } }, { label: 'Count-signature key', input: { strs: ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'], keyType: 'counts' } }, { label: 'Empty string', input: { strs: [''], keyType: 'sorted' } }],
    legend: [['current', 'group receiving the word']],
    code: `
function groupAnagrams(strs) {
  const groups = new Map();                       //@init
  for (const s of strs) {                         //@loop
    const key = [...s].sort().join('');           //@key
    if (!groups.has(key)) groups.set(key, []);    //@new
    groups.get(key).push(s);                      //@push
  }
  return [...groups.values()];                    //@ret
}`,
    validate: ({ strs }) => sizeCheck(strs, 1, 10, 'word list') || (strs.every((x) => typeof x === 'string' && /^[a-z]*$/.test(x)) ? null : 'Use lower-case words in quotes, e.g. "eat", "tea".'),
    run({ strs, keyType }) {
      const steps = [], groups = new Map();
      const keyOf = (s) => (keyType === 'counts' ? (() => { const c = new Array(26).fill(0); for (const ch of s) c[ch.charCodeAt(0) - 97]++; return c.join('#'); })() : [...s].sort().join(''));
      const shortKey = (k) => (keyType === 'counts' ? k.split('#').map((v, i) => (v !== '0' ? String.fromCharCode(97 + i) + v : '')).join('') || '(all zero)' : k || '""');
      for (const s of strs) {
        const k = keyOf(s); const isNew = !groups.has(k);
        if (isNew) groups.set(k, []);
        groups.get(k).push(s);
        steps.push({ line: isNew ? ['key', 'new', 'push'] : ['key', 'push'], groups: [...groups].map(([kk, v]) => [shortKey(kk), [...v]]), cur: shortKey(k), note: `"${s}" → key ${keyType === 'counts' ? '(counts) ' : ''}"${shortKey(k)}". ${isNew ? 'New key: start a group.' : 'Key exists: join that group.'}`, why: s === strs[0] ? 'Two words are anagrams exactly when their keys are equal, so grouping by key replaces comparing every pair of words.' : null });
      }
      steps.push({ line: 'ret', groups: [...groups].map(([kk, v]) => [shortKey(kk), [...v]]), done: true, result: [...groups.values()], note: `${groups.size} group${groups.size === 1 ? '' : 's'}.`, why: keyType === 'counts' ? 'Count keys cost O(k) per word of length k: O(n·k) total.' : 'Sorting each word costs O(k log k): O(n·k log k) total. The count signature avoids the log factor.' });
      return steps;
    },
    render(st, stage) {
      const rows = el('div.stack', { style: { gap: '6px' } });
      st.groups.forEach(([k, words]) => rows.append(el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', fontFamily: 'var(--f-code)', fontSize: '13px' } }, el('span', { class: 'chip', style: k === st.cur && !st.done ? { borderColor: 'var(--st-current)', fontWeight: 700 } : null }, k), '→', words.join(', '))));
      stage.append(el('div', el('div.panel-label', 'groups (key → words)'), rows));
    },
  });
  V.define('longest-consec', {
    title: 'Longest Consecutive Sequence: count only from sequence starts',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [100, 4, 200, 1, 3, 2], wide: true }],
    presets: [{ label: 'LeetCode example 1', input: { nums: [100, 4, 200, 1, 3, 2] } }, { label: 'LeetCode example 2', input: { nums: [0, 3, 7, 2, 5, 8, 4, 6, 0, 1] } }, { label: 'Duplicates', input: { nums: [1, 2, 0, 1] } }],
    legend: [['current', 'start being expanded'], ['dim', 'skipped: x − 1 exists'], ['done', 'counted in a run']],
    code: `
function longestConsecutive(nums) {
  const set = new Set(nums);                    //@set
  let best = 0;
  for (const x of set) {                        //@loop
    if (set.has(x - 1)) continue;   // not a start  //@skip
    let len = 1;                                //@start
    while (set.has(x + len)) len++;             //@grow
    best = Math.max(best, len);                 //@best
  }
  return best;                                  //@ret
}`,
    validate: ({ nums }) => sizeCheck(nums, 0, 14),
    run({ nums }) {
      const set = new Set(nums), steps = []; let best = 0; const skipped = new Set(), counted = new Set();
      steps.push({ line: 'set', vals: [...set], skipped: new Set(), counted: new Set(), best, note: `Put all ${nums.length} numbers in a Set (${set.size} distinct).` });
      for (const x of set) {
        if (set.has(x - 1)) { skipped.add(x); steps.push({ line: 'skip', vals: [...set], cur: x, skipped: new Set(skipped), counted: new Set(counted), best, note: `${x}: ${x - 1} is in the set, so ${x} is not the start of a run. Skip it.`, why: 'This check is what makes it O(n): each run is walked only once, from its smallest element.' }); continue; }
        let len = 1; counted.add(x);
        while (set.has(x + len)) { counted.add(x + len); len++; }
        best = Math.max(best, len);
        steps.push({ line: ['start', 'grow', 'best'], vals: [...set], cur: x, run: [x, x + len - 1], skipped: new Set(skipped), counted: new Set(counted), best, note: `${x} starts a run (${x - 1} absent). Walk ${x}, ${x + 1}, …: length ${len}.` });
      }
      steps.push({ line: 'ret', vals: [...set], skipped, counted, best, done: true, result: best, note: `Answer ${best}.`, why: 'Every number is checked once as a possible start and visited once inside a run: O(n) average time, O(n) space. Sorting would give O(n log n).' });
      return steps;
    },
    render(st, stage) {
      const vals = [...st.vals].sort((a, b) => a - b);
      const states = {}; vals.forEach((v, i) => { if (st.counted.has(v)) states[i] = 'done'; if (st.skipped.has(v)) states[i] = 'dim'; if (st.run && v >= st.run[0] && v <= st.run[1]) states[i] = 'current'; if (v === st.cur && !st.run) states[i] = 'dim'; });
      stage.append(R.cells(vals, { states, label: 'set contents, shown sorted (the algorithm never sorts)' }));
      stage.append(R.vars({ best: st.best }));
    },
  });
  V.define('bucket-freq', {
    title: 'Top K Frequent: buckets indexed by count',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [1, 1, 1, 2, 2, 3], wide: true }, { key: 'k', label: 'k', type: 'int', def: 2 }],
    presets: [{ label: 'Day 4 trace', input: { nums: [1, 1, 1, 2, 2, 3], k: 2 } }, { label: 'k = 1', input: { nums: [4, 4, 5, 6, 6, 6], k: 1 } }, { label: 'All distinct', input: { nums: [9, 8, 7], k: 3 } }],
    legend: [['current', 'being placed or read'], ['done', 'in the answer']],
    code: `
function topKFrequent(nums, k) {
  const count = new Map();                                        //@init
  for (const x of nums) count.set(x, (count.get(x) ?? 0) + 1);     //@count
  const buckets = Array.from({ length: nums.length + 1 }, () => []); //@buckets
  for (const [x, c] of count) buckets[c].push(x);                  //@place
  const out = [];                                                 //@out
  for (let c = nums.length; c >= 1 && out.length < k; c--)        //@scan
    for (const x of buckets[c]) if (out.length < k) out.push(x);  //@take
  return out;                                                     //@ret
}`,
    validate: ({ nums, k }) => sizeCheck(nums, 1, 14) || (k < 1 || k > new Set(nums).size ? 'k must be between 1 and the number of distinct values.' : null),
    run({ nums, k }) {
      const steps = [], count = new Map();
      for (const x of nums) count.set(x, (count.get(x) ?? 0) + 1);
      const n = nums.length, B = Array.from({ length: n + 1 }, () => []);
      steps.push({ line: ['init', 'count'], count: [...count], B: B.map((b) => [...b]), out: [], note: 'Count every value: ' + [...count].map(([x, c]) => x + '×' + c).join(', ') + '.' });
      for (const [x, c] of count) { B[c].push(x); steps.push({ line: ['buckets', 'place'], count: [...count], B: B.map((b) => [...b]), out: [], hot: c, note: `${x} appears ${c}× → bucket ${c}.`, why: 'A count can be at most n, so n + 1 buckets cover every possible count. No sorting by frequency is needed.' }); }
      const out = [];
      for (let c = n; c >= 1 && out.length < k; c--) {
        if (!B[c].length) continue;
        for (const x of B[c]) if (out.length < k) out.push(x);
        steps.push({ line: ['scan', 'take'], count: [...count], B: B.map((b) => [...b]), out: [...out], hot: c, note: `Bucket ${c}: take ${B[c].join(', ')}${out.length >= k ? ' → have k = ' + k : ''}.` });
      }
      steps.push({ line: 'ret', count: [...count], B: B.map((b) => [...b]), out, done: true, result: out, note: `Answer [${out.join(', ')}].`, why: 'Counting O(n), placing O(distinct), scanning O(n): O(n) total, against O(n log n) for sorting by count. Week 7 redoes this with a heap in O(n log k).' });
      return steps;
    },
    render(st, stage) {
      stage.append(R.kv(st.count, { label: 'count (value → times)' }));
      const vals = st.B.map((b) => (b.length ? b.join(',') : '')); const states = {}; if (st.hot != null) states[st.hot] = 'current';
      stage.append(R.cells(vals, { states, label: 'buckets: index = count, contents = values with that count' }));
      stage.append(R.cells(st.out, { states: Object.fromEntries(st.out.map((_, i) => [i, 'done'])), label: 'answer so far' }));
    },
  });
  V.define('boyer-moore', {
    title: 'Boyer–Moore majority vote: O(1) space',
    inputs: [{ key: 'nums', label: 'nums (a majority must exist)', type: 'numbers', def: [2, 2, 1, 1, 1, 2, 2], wide: true }],
    presets: [{ label: 'LeetCode example 2', input: { nums: [2, 2, 1, 1, 1, 2, 2] } }, { label: 'LeetCode example 1', input: { nums: [3, 2, 3] } }, { label: 'Majority at the end', input: { nums: [1, 2, 3, 3, 3] } }],
    legend: [['current', 'x'], ['done', 'candidate']],
    code: `
function majorityElement(nums) {
  let candidate = null, votes = 0;            //@init
  for (const x of nums) {                     //@loop
    if (votes === 0) candidate = x;           //@pick
    votes += x === candidate ? 1 : -1;        //@vote
  }
  return candidate;                           //@ret
}`,
    validate: ({ nums }) => { const e = sizeCheck(nums, 1, 15); if (e) return e; const c = {}; nums.forEach((x) => (c[x] = (c[x] || 0) + 1)); return Object.values(c).some((v) => v > nums.length / 2) ? null : 'Some value must appear more than n/2 times (the problem guarantees it).'; },
    run({ nums }) {
      const steps = []; let cand = null, votes = 0;
      nums.forEach((x, i) => {
        const picked = votes === 0; if (picked) cand = x;
        votes += x === cand ? 1 : -1;
        steps.push({ line: picked ? ['pick', 'vote'] : 'vote', i, cand, votes, note: `${picked ? 'Votes were 0, so ' + x + ' becomes the candidate. ' : ''}${x} ${x === cand ? 'matches the candidate: votes + 1' : 'differs: votes − 1'} → ${votes}.`, why: i === 0 ? 'Pair each majority element with a different element and cancel them; the majority has more than n/2 copies, so it cannot be fully cancelled.' : null });
      });
      steps.push({ line: 'ret', cand, votes, done: true, result: cand, note: `Return ${cand}.`, why: 'O(n) time, O(1) space. It only works because a majority is guaranteed; otherwise a second pass must count the candidate.' });
      return steps;
    },
    render(st, stage, { nums }) {
      const states = {}; if (st.i != null && !st.done) states[st.i] = 'current';
      stage.append(R.cells(nums, { states, ptrs: st.i != null && !st.done ? { [st.i]: 'x' } : {}, label: 'nums' }));
      stage.append(R.vars({ candidate: st.cand, votes: st.votes }));
    },
  });

  // ---------- matrices ----------
  const gridCheck = (m) => (!Array.isArray(m) || !m.length || !m.every((r) => Array.isArray(r) && r.length === m[0].length && r.length > 0) ? 'Enter a rectangular grid such as [[1,2],[3,4]].' : m.length > 7 || m[0].length > 7 ? 'Keep it to 7 × 7.' : null);
  V.define('spiral', {
    title: 'Spiral order with four shrinking boundaries',
    inputs: [{ key: 'matrix', label: 'matrix', type: 'json', def: [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]], wide: true }],
    presets: [{ label: '3 × 4', input: { matrix: [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]] } }, { label: '3 × 3', input: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] } }, { label: '1 × n', input: { matrix: [[1, 2, 3, 4]] } }, { label: 'n × 1', input: { matrix: [[1], [2], [3]] } }, { label: '4 × 2', input: { matrix: [[1, 2], [3, 4], [5, 6], [7, 8]] } }],
    legend: [['current', 'just added'], ['done', 'already output'], ['window', 'remaining ring']],
    code: `
function spiralOrder(m) {
  const out = [];
  let top = 0, bottom = m.length - 1, left = 0, right = m[0].length - 1;
  while (top <= bottom && left <= right) {                         //@while
    for (let c = left; c <= right; c++) out.push(m[top][c]);       //@top
    top++;
    for (let r = top; r <= bottom; r++) out.push(m[r][right]);     //@right
    right--;
    if (top <= bottom) {                                           //@chkb
      for (let c = right; c >= left; c--) out.push(m[bottom][c]);  //@bottom
      bottom--;
    }
    if (left <= right) {                                           //@chkl
      for (let r = bottom; r >= top; r--) out.push(m[r][left]);    //@left
      left++;
    }
  }
  return out;
}`,
    validate: ({ matrix }) => gridCheck(matrix),
    run({ matrix: m }) {
      const steps = [], out = [], seen = new Set();
      let top = 0, bottom = m.length - 1, left = 0, right = m[0].length - 1;
      const push = (r, c, line, why) => { out.push(m[r][c]); seen.add(r + ',' + c); steps.push({ line, cur: [r, c], seen: new Set(seen), out: [...out], b: { top, bottom, left, right }, note: `Add m[${r}][${c}] = ${m[r][c]}.`, why }); };
      while (top <= bottom && left <= right) {
        for (let c = left; c <= right; c++) push(top, c, 'top', c === left ? 'Left to right along row top = ' + top + '.' : null);
        top++;
        for (let r = top; r <= bottom; r++) push(r, right, 'right', r === top ? 'Down column right = ' + right + '.' : null);
        right--;
        if (top <= bottom) { for (let c = right; c >= left; c--) push(bottom, c, 'bottom', c === right ? 'Right to left along row bottom = ' + bottom + ' (only because top ≤ bottom still).' : null); bottom--; }
        else steps.push({ line: 'chkb', seen: new Set(seen), out: [...out], b: { top, bottom, left, right }, note: `top (${top}) > bottom (${bottom}): no bottom row is left, so skip the leftward pass.`, why: 'Without this check, a single remaining row would be output twice. Try the 1 × n preset.' });
        if (left <= right) { for (let r = bottom; r >= top; r--) push(r, left, 'left', r === bottom ? 'Up column left = ' + left + '.' : null); left++; }
        else steps.push({ line: 'chkl', seen: new Set(seen), out: [...out], b: { top, bottom, left, right }, note: `left (${left}) > right (${right}): no left column is left, so skip the upward pass.`, why: 'Without this check, a single remaining column would be output twice. Try the n × 1 preset.' });
      }
      steps.push({ line: null, seen, out, b: { top, bottom, left, right }, done: true, result: out, note: `Done: ${out.length} = m × n elements, each output once.`, why: 'O(m·n) time; O(1) extra space besides the output (four integers instead of a visited matrix).' });
      return steps;
    },
    render(st, stage, { matrix: m }) {
      const states = {};
      m.forEach((row, r) => row.forEach((_, c) => { const k = r + ',' + c; if (st.seen.has(k)) states[k] = 'done'; else if (r >= st.b.top && r <= st.b.bottom && c >= st.b.left && c <= st.b.right) states[k] = 'window'; }));
      if (st.cur) states[st.cur.join(',')] = 'current';
      stage.append(R.grid(m, { states, label: 'matrix' }));
      stage.append(R.vars(st.b));
      stage.append(R.cells(st.out, { label: 'out' }));
    },
  });
  V.define('rotate', {
    title: 'Rotate 90° clockwise in place: transpose, then reverse each row',
    inputs: [{ key: 'matrix', label: 'matrix (n × n)', type: 'json', def: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], wide: true }],
    presets: [{ label: '3 × 3', input: { matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] } }, { label: '4 × 4', input: { matrix: [[5, 1, 9, 11], [2, 4, 8, 10], [13, 3, 6, 7], [15, 14, 12, 16]] } }, { label: '1 × 1', input: { matrix: [[1]] } }],
    legend: [['current', 'swapped now'], ['done', 'final position']],
    code: `
function rotate(m) {
  const n = m.length;
  for (let i = 0; i < n; i++)                                    //@ti
    for (let j = i + 1; j < n; j++)                              //@tj
      [m[i][j], m[j][i]] = [m[j][i], m[i][j]];   // transpose    //@tswap
  for (const row of m) row.reverse();            // mirror       //@rev
}`,
    validate: ({ matrix }) => gridCheck(matrix) || (matrix.length !== matrix[0].length ? 'In-place rotation needs a square matrix.' : null),
    run({ matrix }) {
      const m = matrix.map((r) => [...r]), n = m.length, steps = [];
      steps.push({ line: null, m: m.map((r) => [...r]), note: 'Goal: element at (r, c) moves to (c, n − 1 − r).', why: 'Transpose sends (r, c) → (c, r); reversing each row then sends (c, r) → (c, n − 1 − r). Together they are the rotation.' });
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        [m[i][j], m[j][i]] = [m[j][i], m[i][j]];
        steps.push({ line: 'tswap', m: m.map((r) => [...r]), sw: [[i, j], [j, i]], note: `Transpose: swap m[${i}][${j}] and m[${j}][${i}].`, why: i === 0 && j === 1 ? 'Only j > i: swapping every pair twice would undo the transpose.' : null });
      }
      steps.push({ line: 'tswap', m: m.map((r) => [...r]), phase: 'T', note: 'Transpose finished: rows have become columns.' });
      m.forEach((row, r) => { row.reverse(); steps.push({ line: 'rev', m: m.map((x) => [...x]), row: r, note: `Reverse row ${r}.` }); });
      steps.push({ line: null, m, done: true, result: m, note: 'Rotated.', why: 'n²/2 swaps plus n reversals: O(n²) time, O(1) extra space.' });
      return steps;
    },
    render(st, stage) {
      const states = {};
      if (st.sw) st.sw.forEach(([r, c]) => (states[r + ',' + c] = 'current'));
      if (st.row != null) st.m[0].forEach((_, c) => (states[st.row + ',' + c] = 'current'));
      if (st.done) st.m.forEach((row, r) => row.forEach((_, c) => (states[r + ',' + c] = 'done')));
      stage.append(R.grid(st.m, { states, label: 'matrix' }));
    },
  });
})(window);
