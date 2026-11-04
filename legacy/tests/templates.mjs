// Checks the JavaScript templates in roadmap section 6 (the JavaScript reference page).
//  - every ```js block must parse;
//  - every runnable template is executed against an independent check (random inputs where useful);
//  - skeleton templates (placeholders such as BASE or `/* window is invalid */ false`) are parse-checked only.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const road = fs.readFileSync(path.join(ROOT, 'source/roadmap.md'), 'utf8');
const a = road.indexOf('## 6. JavaScript DSA reference'), b = road.indexOf('\n## 7.', a);
const blocks = [...road.slice(a, b).matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1]);
let pass = 0, fail = 0; const failures = [];
const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

ok(blocks.length >= 16, `expected at least 16 template blocks, found ${blocks.length}`);
blocks.forEach((src, i) => { try { new vm.Script(src); ok(true); } catch (e) { ok(false, `block ${i + 1} does not parse: ${e.message}`); } });

// Load one block's declarations into a fresh context and return what it defines.
function load(i, names, extra = {}) {
  const ctx = { console, structuredClone, ...extra }; vm.createContext(ctx);
  vm.runInContext(blocks[i] + '\n;globalThis.__x = {' + names.join(',') + '};', ctx);
  return ctx.__x;
}
const find = (re) => blocks.findIndex((s) => re.test(s));

// Queue and Deque (block with class Queue)
{
  const { Queue, Deque } = load(find(/class Queue/), ['Queue', 'Deque'], { x: 1 });
  const q = new Queue(), ref = [];
  for (let k = 0; k < 5000; k++) { if (rnd() < 0.6 || !ref.length) { q.push(k); ref.push(k); } else ok(q.shift() === ref.shift(), 'Queue.shift order'); ok(q.size === ref.length, 'Queue.size'); }
  for (let t = 0; t < 50; t++) {
    const d = new Deque(2), r = [];
    for (let k = 0; k < 300; k++) {
      const op = ri(0, 3);
      if (op === 0) { d.pushBack(k); r.push(k); } else if (op === 1) { d.pushFront(k); r.unshift(k); }
      else if (op === 2) ok(d.popFront() === r.shift(), 'Deque.popFront'); else ok(d.popBack() === r.pop(), 'Deque.popBack');
      ok(d.size === r.length && d.front() === r[0] && d.back() === r[r.length - 1], 'Deque front/back/size');
    }
  }
}
// Linked-list helpers
{
  const { fromArray, toArray } = load(find(/function fromArray/), ['fromArray', 'toArray']);
  for (const arr of [[], [1], [1, 2, 3], [5, 5, 0]]) ok(same(toArray(fromArray(arr)), arr), 'fromArray/toArray round trip ' + JSON.stringify(arr));
}
// 3-way quicksort
{
  const { quickSort } = load(find(/function quickSort/), ['quickSort']);
  for (let t = 0; t < 300; t++) { const arr = Array.from({ length: ri(0, 40) }, () => ri(-5, 5)); ok(same(quickSort([...arr]), [...arr].sort((x, y) => x - y)), 'quickSort ' + JSON.stringify(arr)); }
}
// firstTrue (lower and upper bound)
{
  const { firstTrue } = load(find(/function firstTrue/), ['firstTrue']);
  for (let t = 0; t < 300; t++) {
    const nums = Array.from({ length: ri(0, 20) }, () => ri(0, 9)).sort((x, y) => x - y), target = ri(-1, 10);
    const lb = nums.findIndex((x) => x >= target); ok(firstTrue(0, nums.length, (i) => nums[i] >= target) === (lb < 0 ? nums.length : lb), 'lower bound exact');
    const ub = nums.findIndex((x) => x > target); ok(firstTrue(0, nums.length, (i) => nums[i] > target) === (ub < 0 ? nums.length : ub), 'upper bound exact');
  }
  ok(firstTrue(1, 2 ** 31, (k) => k * k >= 10 ** 12) === 10 ** 6, 'firstTrue over a large answer range');
}
// countSubarrays (prefix sums + map)
{
  const { countSubarrays } = load(find(/function countSubarrays/), ['countSubarrays']);
  for (let t = 0; t < 300; t++) { const nums = Array.from({ length: ri(0, 15) }, () => ri(-3, 3)), k = ri(-3, 3); let c = 0; for (let i = 0; i < nums.length; i++) { let s = 0; for (let j = i; j < nums.length; j++) { s += nums[j]; if (s === k) c++; } } ok(countSubarrays(nums, k) === c, 'countSubarrays'); }
}
// Trees: height and iterative preorder
{
  const { height, preorder } = load(find(/function preorder/), ['height', 'preorder']);
  const N = (val, left = null, right = null) => ({ val, left, right });
  const t = N(1, N(2, N(4), N(5)), N(3, null, N(6, N(7))));
  ok(height(t) === 4 && height(null) === 0, 'height');
  ok(same(preorder(t), [1, 2, 4, 5, 3, 6, 7]) && same(preorder(null), []), 'preorder');
}
// MinHeap
{
  const { MinHeap } = load(find(/class MinHeap/), ['MinHeap']);
  for (let t = 0; t < 100; t++) {
    const h = new MinHeap(), ref = [];
    for (let k = 0; k < 200; k++) { if (rnd() < 0.6 || !ref.length) { const x = ri(-50, 50); h.push(x); ref.push(x); ref.sort((x, y) => x - y); } else ok(h.pop() === ref.shift(), 'MinHeap.pop order'); ok(h.size() === ref.length && h.peek() === ref[0], 'MinHeap size/peek'); }
  }
  const mx = new MinHeap((x, y) => y - x); [3, 9, 1].forEach((x) => mx.push(x)); ok(mx.pop() === 9, 'max-heap comparator');
  ok(new MinHeap().pop() === undefined, 'pop on empty heap');
}
// TrieNode shape
{
  const { TrieNode } = load(find(/class TrieNode/), ['TrieNode']);
  const n = new TrieNode(); ok(n.next.length === 26 && n.next.every((x) => x === null) && n.isEnd === false, 'TrieNode');
}
// BFS distances (the block also contains loose snippets that need n, edges, r, c, m)
{
  const i = find(/function bfs\(/); const ctx = { n: 4, edges: [[0, 1], [1, 2]], r: 0, c: 0, m: 1 }; vm.createContext(ctx);
  vm.runInContext(blocks[i].replace(/^const n = /m, 'var n = ') + '\n;globalThis.__bfs = bfs; globalThis.__adj = adj;', ctx);
  ok(same(ctx.__bfs(ctx.__adj, 0), [0, 1, 2, -1]), 'bfs distances with an unreachable node');
}
// LCS: memo and rolling rows
{
  const { lcsMemo, lcs } = load(find(/function lcsMemo/), ['lcsMemo', 'lcs']);
  const brute = (x, y) => { const f = (i, j) => (i === x.length || j === y.length ? 0 : x[i] === y[j] ? 1 + f(i + 1, j + 1) : Math.max(f(i + 1, j), f(i, j + 1))); return f(0, 0); };
  for (let t = 0; t < 300; t++) { const s1 = Array.from({ length: ri(0, 7) }, () => 'abc'[ri(0, 2)]).join(''), s2 = Array.from({ length: ri(0, 7) }, () => 'abc'[ri(0, 2)]).join(''); const e = brute(s1, s2); ok(lcsMemo(s1, s2) === e && lcs(s1, s2) === e, `lcs ${s1}/${s2}`); }
}
// Bit helpers
{
  const B = load(find(/const isBitSet/), ['isBitSet', 'setBit', 'clearBit', 'toggleBit', 'isPowerOfTwo', 'toUnsigned', 'toBinary']);
  for (let t = 0; t < 500; t++) {
    const x = ri(-(2 ** 31), 2 ** 31 - 1), i = ri(0, 31), bit = Math.floor(((x >>> 0) / 2 ** i)) % 2;
    ok(B.isBitSet(x, i) === (bit === 1), 'isBitSet');
    ok(B.isBitSet(B.setBit(x, i), i) && !B.isBitSet(B.clearBit(x, i), i) && B.isBitSet(B.toggleBit(x, i), i) === (bit === 0), 'set/clear/toggle');
    ok(B.toBinary(x).length === 32 && parseInt(B.toBinary(x), 2) === (x >>> 0) && B.toUnsigned(x) === (x >>> 0), 'toBinary/toUnsigned');
  }
  for (let x = -5; x <= 2000; x++) ok(B.isPowerOfTwo(x) === (x > 0 && Number.isInteger(Math.log2(x))), 'isPowerOfTwo ' + x);
}
// Next greater index (monotonic stack)
{
  const { nextGreaterIndex } = load(find(/function nextGreaterIndex/), ['nextGreaterIndex']);
  for (let t = 0; t < 300; t++) { const arr = Array.from({ length: ri(0, 15) }, () => ri(0, 6)); const e = arr.map((v, i) => { for (let j = i + 1; j < arr.length; j++) if (arr[j] > v) return j; return -1; }); ok(same(nextGreaterIndex(arr), e), 'nextGreaterIndex ' + JSON.stringify(arr)); }
}
// Snippet blocks that only need sample data to run (Map/Set recipes, arrays and sorting)
{
  const i1 = find(/\/\/ Frequency count/); const c1 = { arr: [1, 2, 2], words: ['eat', 'tea', 'tan'], setA: new Set([1, 2]), setB: new Set([2, 3]), s: 'abca' }; vm.createContext(c1);
  vm.runInContext(blocks[i1] + '\n;globalThis.__r = { count: [...count], result, inter, freq0: freq[0] };', c1);
  ok(same(c1.__r.count, [[1, 1], [2, 2]]) && same(c1.__r.result, [['eat', 'tea'], ['tan']]) && same(c1.__r.inter, [2]) && c1.__r.freq0 === 2, 'Map/Set recipes');
  const i2 = find(/179 Largest Number/); const c2 = { arr: [1, 2], nested: [[1]], m: 2, n: 3, nums: [3, 30, 34, 5, 9], pairs: [[2, 1], [1, 2], [1, 1]], words: ['b', 'a'], people: [{ name: 'b' }, { name: 'a' }], structuredClone }; vm.createContext(c2);
  vm.runInContext(blocks[i2] + `\n;globalThis.__r = { bad: bad[0] === bad[1], grid, pairs, strs: strs.join(''), people: people.map((p) => p.name).join('') };`, c2);
  ok(c2.__r.bad === true && same(c2.__r.grid, [[0, 0, 0], [0, 0, 0]]) && same(c2.__r.pairs, [[1, 1], [1, 2], [2, 1]]) && c2.__r.strs === '9534330' && c2.__r.people === 'ab', 'array and sorting recipes (179 → "9534330")');
}

console.log(`templates: ${blocks.length} blocks; ${pass} checks passed, ${fail} failed`);
if (fail) { failures.slice(0, 20).forEach((f) => console.log(' x ' + f)); process.exit(1); }
