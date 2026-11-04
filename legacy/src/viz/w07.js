// Week 7 visualizers: binary heap operations and heapify, top-k, k-way merge, running median,
// task scheduling, interval merge/insert/selection, sweep line for overlaps, and tries.
(function (g) {
  'use strict';
  const { el } = g.Core;
  const R = g.R, V = g.Viz;
  const fmt = (a) => '[' + a.join(', ') + ']';

  // ---------- heap operations (min-heap, real sift steps) ----------
  function heapSteps(ops, cmp = (a, b) => a - b) {
    const d = [], steps = [], out = [];
    const snap = (o) => Object.assign({ d: [...d], out: [...out] }, o);
    for (const op of ops) {
      if (op[0] === 'push') {
        d.push(op[1]); let i = d.length - 1;
        steps.push(snap({ line: 'append', hot: { [i]: 'current' }, note: `push(${op[1]}): append at index ${i}.`, why: d.length === 1 ? 'Appending keeps the tree complete; only the order may now be wrong along one path.' : null }));
        while (i > 0) {
          const p = (i - 1) >> 1;
          if (cmp(d[i], d[p]) >= 0) { steps.push(snap({ line: 'up', hot: { [i]: 'current', [p]: 'compare' }, note: `${d[i]} ≥ parent ${d[p]} (index ${p}): stop.` })); break; }
          [d[i], d[p]] = [d[p], d[i]];
          steps.push(snap({ line: 'up', hot: { [p]: 'current', [i]: 'compare' }, note: `${d[p]} < parent ${d[i]}: swap with index ${p} = (${i} − 1) >> 1.` }));
          i = p;
        }
      } else if (op[0] === 'pop') {
        if (!d.length) { steps.push(snap({ line: 'pop', note: 'pop on an empty heap returns undefined.' })); continue; }
        const top = d[0], last = d.pop(); out.push(top);
        if (!d.length) { steps.push(snap({ line: 'pop', note: `pop() → ${top}; the heap is now empty.` })); continue; }
        d[0] = last;
        steps.push(snap({ line: 'pop', hot: { 0: 'current' }, note: `pop() → ${top}. Move the last element (${last}) to the root.`, why: 'Removing the last slot keeps the tree complete; now sift the new root down.' }));
        let i = 0;
        while (true) {
          const l = 2 * i + 1, r = l + 1; let s = i;
          if (l < d.length && cmp(d[l], d[s]) < 0) s = l;
          if (r < d.length && cmp(d[r], d[s]) < 0) s = r;
          if (s === i) { steps.push(snap({ line: 'down', hot: { [i]: 'current' }, note: `${d[i]} is ≤ its children${l < d.length ? '' : ' (it has none)'}: stop.` })); break; }
          [d[i], d[s]] = [d[s], d[i]];
          steps.push(snap({ line: 'down', hot: { [s]: 'current', [i]: 'compare' }, note: `Swap with the smaller child ${d[i]} (index ${s}).`, why: 'Swapping with the smaller child keeps the heap property between the two children as well.' }));
          i = s;
        }
      }
    }
    return { steps, d, out };
  }
  const heapCode = `
push(x) {
  d.push(x); let i = d.length - 1;                 // append      //@append
  while (i > 0) {                                  // sift up
    const p = (i - 1) >> 1;
    if (this.compare(d[i], d[p]) >= 0) break;
    [d[i], d[p]] = [d[p], d[i]]; i = p;                           //@up
  }
}
pop() {
  const top = d[0], last = d.pop();
  if (d.length) { d[0] = last; /* sift down from 0 */ }          //@pop
  // while a child is smaller: swap with the SMALLER child      //@down
  return top;
}`;
  V.define('heap-ops', {
    title: 'Min-heap: push sifts up, pop sifts down',
    inputs: [{ key: 'ops', label: 'operations', type: 'json', def: [['push', 5], ['push', 3], ['push', 8], ['push', 1], ['pop'], ['pop']], wide: true }],
    presets: [{ label: 'Roadmap dry run', input: { ops: [['push', 5], ['push', 3], ['push', 8], ['push', 1], ['pop'], ['pop']] } }, { label: 'Push descending', input: { ops: [['push', 9], ['push', 7], ['push', 5], ['push', 3], ['push', 1]] } }, { label: 'Heap sort by popping', input: { ops: [['push', 4], ['push', 1], ['push', 3], ['push', 2], ['pop'], ['pop'], ['pop'], ['pop']] } }],
    legend: [['current', 'element moving'], ['compare', 'compared / swapped with']],
    code: heapCode,
    validate: ({ ops }) => (!Array.isArray(ops) || ops.length > 14 || ops.some((o) => !(o[0] === 'push' && typeof o[1] === 'number' || o[0] === 'pop')) ? 'Operations look like ["push", 5] or ["pop"], at most 14.' : null),
    run({ ops }) {
      const { steps, out } = heapSteps(ops);
      steps.push(Object.assign({}, steps.at(-1) || { d: [], out: [] }, { line: null, hot: {}, done: true, result: out, note: `Popped in order: ${fmt(out)}.`, why: 'Both operations walk one root-to-leaf path of a complete tree: O(log n). peek is O(1).' }));
      return steps;
    },
    render(st, stage) { stage.append(R.heap(st.d, { states: st.hot })); stage.append(R.vars({ popped: fmt(st.out) })); },
  });

  V.define('heapify', {
    title: 'Heapify in O(n): sift down every non-leaf, last to first',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [9, 4, 7, 1, 8, 2, 3], wide: true }],
    presets: [{ label: '7 elements', input: { nums: [9, 4, 7, 1, 8, 2, 3] } }, { label: 'Reversed', input: { nums: [6, 5, 4, 3, 2, 1] } }],
    legend: [['current', 'sifting down'], ['compare', 'swapped with'], ['dim', 'leaf: no work']],
    code: `
function heapify(d) {
  for (let i = (d.length >> 1) - 1; i >= 0; i--) {   // last non-leaf first  //@loop
    let j = i;
    while (true) {                                    // sift down
      const l = 2 * j + 1, r = l + 1; let s = j;
      if (l < d.length && d[l] < d[s]) s = l;
      if (r < d.length && d[r] < d[s]) s = r;
      if (s === j) break;                                                    //@stop
      [d[j], d[s]] = [d[s], d[j]]; j = s;                                    //@swap
    }
  }
}`,
    validate: ({ nums }) => (nums.length < 1 || nums.length > 15 ? 'Use 1–15 numbers.' : null),
    run({ nums }) {
      const d = [...nums], n = d.length, steps = []; let swaps = 0;
      const leaves = Object.fromEntries(Array.from({ length: n }, (_, k) => [k, k >= n >> 1 ? 'dim' : null]).filter(([, v]) => v));
      steps.push({ d: [...d], hot: leaves, line: 'loop', swaps, note: `Indices ${n >> 1}..${n - 1} are leaves (${n - (n >> 1)} of ${n}): they are already heaps of size 1.` });
      for (let i = (n >> 1) - 1; i >= 0; i--) {
        let j = i;
        steps.push({ d: [...d], hot: { ...leaves, [i]: 'current' }, line: 'loop', swaps, note: `Sift down index ${i} (${d[i]}).` });
        while (true) {
          const l = 2 * j + 1, r = l + 1; let s = j;
          if (l < n && d[l] < d[s]) s = l; if (r < n && d[r] < d[s]) s = r;
          if (s === j) break;
          [d[j], d[s]] = [d[s], d[j]]; swaps++;
          steps.push({ d: [...d], hot: { ...leaves, [s]: 'current', [j]: 'compare' }, line: 'swap', swaps, note: `Swap ${d[s]} down with ${d[j]}.` }); j = s;
        }
      }
      steps.push({ d, hot: {}, done: true, line: null, swaps, result: d, note: `Heap built with ${swaps} swaps.`, why: 'Half the nodes do nothing, a quarter sift at most 1 level, an eighth at most 2, …: the total is bounded by n, so O(n), not O(n log n).' });
      return steps;
    },
    render(st, stage) { stage.append(R.heap(st.d, { states: st.hot })); stage.append(R.vars({ swaps: st.swaps })); },
  });

  V.define('heap-topk', {
    title: 'K-th largest: keep a min-heap of the k largest so far',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [3, 2, 1, 5, 6, 4], wide: true }, { key: 'k', label: 'k', type: 'int', def: 2 }],
    presets: [{ label: 'Roadmap dry run', input: { nums: [3, 2, 1, 5, 6, 4], k: 2 } }, { label: 'Duplicates', input: { nums: [3, 2, 3, 1, 2, 4, 5, 5, 6], k: 4 } }, { label: 'k = 1', input: { nums: [7, 1, 9], k: 1 } }],
    legend: [['current', 'just pushed'], ['done', 'heap root = k-th largest so far']],
    code: `
function findKthLargest(nums, k) {
  const heap = new MinHeap((a, b) => a - b);
  for (const x of nums) {
    heap.push(x);                                       //@push
    if (heap.size() > k) heap.pop();   // drop the smallest  //@pop
  }
  return heap.peek();                                   //@ret
}`,
    validate: ({ nums, k }) => (nums.length < 1 || nums.length > 14 ? 'Use 1–14 numbers.' : k < 1 || k > nums.length ? 'k must be between 1 and n.' : null),
    run({ nums, k }) {
      const steps = []; let d = [];
      const push = (x) => { d.push(x); d.sort((a, b) => a - b); };
      nums.forEach((x, i) => {
        push(x); let popped = null;
        if (d.length > k) popped = d.shift();
        steps.push({ d: [...d], i, popped, line: popped != null ? ['push', 'pop'] : 'push', note: `Push ${x}${popped != null ? `; size ${k + 1} > k, pop the smallest (${popped})` : ''}. Heap: ${fmt(d)}.`, why: i === 0 ? 'The root is the weakest of the current k candidates; anything smaller than it can never be among the k largest.' : null });
      });
      steps.push({ d, done: true, line: 'ret', result: d[0], note: `The root is the k-th largest: ${d[0]}.`, why: `n pushes and pops on a heap of size ≤ k + 1: O(n log k) time, O(k) space.` });
      return steps;
    },
    render(st, stage, { nums }) {
      stage.append(R.cells(nums, { states: st.i != null && !st.done ? { [st.i]: 'current' } : {}, label: 'nums' }));
      stage.append(R.cells(st.d, { states: st.d.length ? { 0: 'done' } : {}, label: 'heap contents (shown sorted; the root is the smallest)' }));
      if (st.popped != null) stage.append(el('div.small.ui.muted', 'popped ' + st.popped));
    },
  });

  V.define('kway-merge', {
    title: 'K-way merge with a heap of [value, list, position]',
    inputs: [{ key: 'lists', label: 'sorted lists', type: 'json', def: [[1, 4, 5], [1, 3, 4], [2, 6]], wide: true }],
    presets: [{ label: 'LeetCode 23 example', input: { lists: [[1, 4, 5], [1, 3, 4], [2, 6]] } }, { label: 'Day 2: three short arrays', input: { lists: [[2, 9], [1, 7, 8], [3]] } }, { label: 'An empty list', input: { lists: [[], [1], [0, 5]] } }],
    legend: [['current', 'popped now'], ['done', 'merged'], ['frontier', 'in the heap']],
    code: `
function mergeK(lists) {
  const heap = new MinHeap((a, b) => a[0] - b[0]);       // [value, list, pos]
  lists.forEach((l, i) => { if (l.length) heap.push([l[0], i, 0]); });  //@init
  const out = [];
  while (heap.size()) {
    const [v, i, p] = heap.pop();                                       //@pop
    out.push(v);
    if (p + 1 < lists[i].length) heap.push([lists[i][p + 1], i, p + 1]); //@next
  }
  return out;
}`,
    validate: ({ lists }) => (!Array.isArray(lists) || !lists.every(Array.isArray) || lists.length > 5 ? 'Enter up to 5 lists like [[1,4],[2,3]].' : lists.flat().length > 14 ? 'Keep it to 14 elements in total.' : lists.some((l) => !l.every((x, i) => !i || l[i - 1] <= x)) ? 'Each list must be sorted.' : null),
    run({ lists }) {
      const steps = []; const heap = []; const out = []; const pos = lists.map(() => 0);
      const sortH = () => heap.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      lists.forEach((l, i) => { if (l.length) heap.push([l[0], i, 0]); }); sortH();
      steps.push({ heap: heap.map((x) => [...x]), out: [], pos: [...pos], line: 'init', note: `Push the head of every non-empty list: ${heap.map((h) => h[0] + ' (list ' + h[1] + ')').join(', ')}.`, why: 'The next element of the merged output must be one of the k heads, so the heap never needs more than k entries.' });
      while (heap.length) {
        const [v, i, p] = heap.shift(); out.push(v); pos[i] = p + 1;
        let nx = null; if (p + 1 < lists[i].length) { heap.push([lists[i][p + 1], i, p + 1]); sortH(); nx = lists[i][p + 1]; }
        steps.push({ heap: heap.map((x) => [...x]), out: [...out], pos: [...pos], cur: [i, p], line: ['pop', 'next'], note: `Pop ${v} from list ${i}.${nx != null ? ' Push its successor ' + nx + '.' : ' That list is exhausted.'}` });
      }
      steps.push({ heap: [], out, pos, done: true, line: null, result: out, note: `Merged: ${fmt(out)}.`, why: `N = ${out.length} pops and pushes on a heap of size ≤ k = ${lists.length}: O(N log k).` });
      return steps;
    },
    render(st, stage, { lists }) {
      const inHeap = new Set(st.heap.map((h) => h[1] + ',' + h[2]));
      lists.forEach((l, i) => {
        const states = {}; l.forEach((_, p) => { if (p < st.pos[i]) states[p] = 'done'; if (inHeap.has(i + ',' + p)) states[p] = 'frontier'; if (st.cur && st.cur[0] === i && st.cur[1] === p) states[p] = 'current'; });
        stage.append(R.cells(l, { states, label: 'list ' + i }));
      });
      stage.append(R.queue(st.heap.map((h) => h[0] + ' (L' + h[1] + ')'), { label: 'heap contents (smallest first)' }));
      stage.append(R.cells(st.out, { label: 'output', noIndex: true }));
    },
  });

  V.define('two-heaps', {
    title: 'Running median with two heaps',
    inputs: [{ key: 'stream', label: 'stream', type: 'numbers', def: [5, 15, 1, 3], wide: true }],
    presets: [{ label: 'Day 3 trace', input: { stream: [5, 15, 1, 3] } }, { label: 'LeetCode 295 example', input: { stream: [1, 2, 3] } }, { label: 'Increasing', input: { stream: [1, 2, 3, 4, 5, 6] } }],
    legend: [['frontier', 'lower half (max-heap)'], ['window', 'upper half (min-heap)']],
    code: `
addNum(x) {
  this.lo.push(x);                        // max-heap: smaller half   //@push
  this.hi.push(this.lo.pop());            // move its largest up      //@move
  if (this.hi.size() > this.lo.size())    // keep lo the same or +1   //@rebal
    this.lo.push(this.hi.pop());
}
findMedian() {
  return this.lo.size() > this.hi.size() ? this.lo.peek()
    : (this.lo.peek() + this.hi.peek()) / 2;                          //@median
}`,
    validate: ({ stream }) => (stream.length < 1 || stream.length > 12 ? 'Use 1–12 numbers.' : null),
    run({ stream }) {
      const lo = [], hi = [], steps = [], meds = [];
      const desc = (a) => a.sort((x, y) => y - x), asc = (a) => a.sort((x, y) => x - y);
      for (const x of stream) {
        lo.push(x); desc(lo);
        const moved = lo.shift(); hi.push(moved); asc(hi);
        let back = null; if (hi.length > lo.length) { back = hi.shift(); lo.push(back); desc(lo); }
        const med = lo.length > hi.length ? lo[0] : (lo[0] + hi[0]) / 2; meds.push(med);
        steps.push({ lo: [...lo], hi: [...hi], meds: [...meds], line: ['push', 'move', 'rebal', 'median'], note: `Add ${x}: push to lo, move lo's max (${moved}) to hi${back != null ? ', hi is larger so move its min (' + back + ') back' : ''}. Median ${med}.`, why: steps.length === 0 ? 'Every element of lo is ≤ every element of hi, and lo has the same size or one more: so the median is at the tops.' : null });
      }
      steps.push({ lo, hi, meds, done: true, line: null, result: meds, note: `Medians after each insertion: ${fmt(meds)}.`, why: 'Each addNum is O(log n) (a constant number of heap operations); findMedian is O(1).' });
      return steps;
    },
    render(st, stage) {
      stage.append(el('div.row', { style: { gap: '24px', alignItems: 'flex-start' } },
        R.cells(st.lo, { states: Object.fromEntries(st.lo.map((_, i) => [i, 'frontier'])), label: 'lo: max-heap (largest first)', noIndex: true }),
        R.cells(st.hi, { states: Object.fromEntries(st.hi.map((_, i) => [i, 'window'])), label: 'hi: min-heap (smallest first)', noIndex: true })));
      stage.append(R.vars({ medians: fmt(st.meds) }));
    },
  });

  V.define('task-scheduler', {
    title: 'Task Scheduler: simulate with a heap, check against the formula',
    inputs: [{ key: 'tasks', label: 'tasks', type: 'string', def: 'AAABBB', wide: true }, { key: 'n', label: 'cooldown n', type: 'int', def: 2 }],
    presets: [{ label: 'LeetCode example 1', input: { tasks: 'AAABBB', n: 2 } }, { label: 'No idle needed', input: { tasks: 'ABCDAB', n: 1 } }, { label: 'n = 0', input: { tasks: 'AAB', n: 0 } }, { label: 'One frequent task', input: { tasks: 'AAAABC', n: 2 } }],
    legend: [['current', 'this time slot'], ['dim', 'idle']],
    code: `
// simulation: each slot, run the available task with the most remaining copies
time = 0; ready = max-heap of counts; cooling = queue of [count, readyAt]
while (ready.size() || cooling.length) {
  time++;
  if (ready.size()) { c = ready.pop() - 1; if (c) cooling.push([c, time + n]); }  //@run
  // else: idle                                                                 //@idle
  if (cooling.length && cooling[0][1] === time) ready.push(cooling.shift()[0]); //@back
}
// formula: max(tasks.length, (maxFreq − 1) * (n + 1) + countOfMax)             //@formula`,
    validate: ({ tasks, n }) => (!/^[A-Z]+$/.test(tasks) ? 'Use upper-case letters A–Z.' : tasks.length > 12 ? 'Use at most 12 tasks.' : n < 0 || n > 4 ? 'Use a cooldown of 0–4.' : null),
    run({ tasks, n }) {
      const cnt = {}; for (const c of tasks) cnt[c] = (cnt[c] || 0) + 1;
      let ready = Object.entries(cnt).map(([t, c]) => [c, t]); const cool = []; const slots = []; const steps = []; let time = 0;
      const sortR = () => ready.sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1));
      sortR();
      while (ready.length || cool.length) {
        time++;
        let ran = null;
        if (ready.length) { const [c, t] = ready.shift(); ran = t; if (c - 1) cool.push([c - 1, t, time + n]); }
        slots.push(ran || 'idle');
        while (cool.length && cool[0][2] === time) { const [c, t] = cool.shift(); ready.push([c, t]); } sortR();
        steps.push({ slots: [...slots], ready: ready.map((x) => [...x]), cool: cool.map((x) => [...x]), line: ran ? ['run', 'back'] : ['idle', 'back'], note: ran ? `Time ${time}: run ${ran} (the task with the most copies left that is not cooling).` : `Time ${time}: every remaining task is cooling: idle.` });
      }
      const maxF = Math.max(...Object.values(cnt)), cmax = Object.values(cnt).filter((v) => v === maxF).length;
      const formula = Math.max(tasks.length, (maxF - 1) * (n + 1) + cmax);
      steps.push({ slots, ready: [], cool: [], done: true, line: 'formula', result: time, note: `Total time ${time}. Formula: max(${tasks.length}, (${maxF} − 1) × (${n} + 1) + ${cmax}) = ${formula}.`, why: 'The most frequent task needs maxFreq − 1 gaps of n slots after it; tasks tied for that frequency fill the last row; and the answer can never be below the number of tasks.' });
      return steps;
    },
    render(st, stage) {
      stage.append(R.cells(st.slots.map((s) => (s === 'idle' ? '·' : s)), { states: Object.fromEntries(st.slots.map((s, i) => [i, s === 'idle' ? 'dim' : i === st.slots.length - 1 && !st.done ? 'current' : null]).filter(([, v]) => v)), label: 'schedule (· = idle), time slot 1 at index 0' }));
      stage.append(R.kv(st.ready.map(([c, t]) => [t, c]), { label: 'ready (task → copies left)', empty: '(none)' }));
      stage.append(R.kv(st.cool.map(([c, t, at]) => [t, c + ' left, ready at ' + at]), { label: 'cooling', empty: '(none)' }));
    },
  });

  // ---------- intervals ----------
  const ivCheck = (iv) => (!Array.isArray(iv) || !iv.length || iv.length > 10 || iv.some((x) => !Array.isArray(x) || x.length !== 2 || x[0] > x[1]) ? 'Enter 1–10 intervals like [[1,3],[2,6]] with start ≤ end.' : null);
  V.define('iv-merge', {
    title: 'Merge intervals: sort by start, extend or start a new block',
    inputs: [{ key: 'iv', label: 'intervals', type: 'json', def: [[1, 3], [8, 10], [2, 6], [15, 18]], wide: true }],
    presets: [{ label: 'Roadmap dry run', input: { iv: [[1, 3], [8, 10], [2, 6], [15, 18]] } }, { label: 'Touching endpoints', input: { iv: [[1, 4], [4, 5]] } }, { label: 'Containment (needs max)', input: { iv: [[1, 10], [2, 3], [4, 12]] } }],
    legend: [['current', 'interval being placed'], ['done', 'merged result']],
    code: `
function merge(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);                           //@sort
  const res = [intervals[0].slice()];
  for (let i = 1; i < intervals.length; i++) {
    const last = res[res.length - 1], [s, e] = intervals[i];
    if (s <= last[1]) last[1] = Math.max(last[1], e);   // overlap //@extend
    else res.push([s, e]);                              // gap     //@new
  }
  return res;
}`,
    validate: ({ iv }) => ivCheck(iv),
    run({ iv }) {
      const a = iv.map((x) => [...x]).sort((x, y) => x[0] - y[0]); const steps = [], res = [a[0].slice()];
      steps.push({ a, res: res.map((x) => [...x]), cur: 0, line: 'sort', note: `Sorted by start: ${a.map((x) => '[' + x + ']').join(' ')}. Start the first block with [${a[0]}].`, why: 'In start order, an interval can only overlap the block currently being built, never an earlier one.' });
      for (let i = 1; i < a.length; i++) {
        const last = res.at(-1), [s, e] = a[i];
        if (s <= last[1]) { const old = last[1]; last[1] = Math.max(last[1], e); steps.push({ a, res: res.map((x) => [...x]), cur: i, line: 'extend', note: `[${s},${e}] starts at ${s} ≤ ${old} (the block's end): overlap. End = max(${old}, ${e}) = ${last[1]}.`, why: e < old ? 'Contained interval: without Math.max the block would wrongly shrink.' : s === old ? 'Touching endpoints count as overlapping here (problem 56 uses ≤).' : null }); }
        else { res.push([s, e]); steps.push({ a, res: res.map((x) => [...x]), cur: i, line: 'new', note: `[${s},${e}] starts after ${last[1]}: a gap, so start a new block.` }); }
      }
      steps.push({ a, res, done: true, line: null, result: res, note: `Merged: ${res.map((x) => '[' + x + ']').join(' ')}.`, why: 'O(n log n) for the sort plus one O(n) pass.' });
      return steps;
    },
    render(st, stage) {
      const states = {}; st.a.forEach((_, i) => { if (i < st.cur) states[i] = 'dim'; }); if (st.cur != null && !st.done) states[st.cur] = 'current';
      stage.append(R.intervals(st.a, { states, merged: st.res, mergedLabel: 'merged blocks' }));
    },
  });

  V.define('iv-insert', {
    title: 'Insert an interval: before, overlapping, after (no sort)',
    inputs: [{ key: 'iv', label: 'sorted, non-overlapping intervals', type: 'json', def: [[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], wide: true }, { key: 'nw', label: 'new interval', type: 'json', def: [4, 8] }],
    presets: [{ label: 'LeetCode example 2', input: { iv: [[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], nw: [4, 8] } }, { label: 'LeetCode example 1', input: { iv: [[1, 3], [6, 9]], nw: [2, 5] } }, { label: 'Goes at the end', input: { iv: [[1, 2]], nw: [5, 6] } }],
    legend: [['dim', 'ends before the new interval'], ['current', 'overlaps: absorbed'], ['frontier', 'starts after']],
    code: `
function insert(intervals, nw) {
  const res = []; let i = 0, [s, e] = nw;
  while (i < intervals.length && intervals[i][1] < s) res.push(intervals[i++]);  // before  //@before
  while (i < intervals.length && intervals[i][0] <= e) {                          // overlap //@overlap
    s = Math.min(s, intervals[i][0]); e = Math.max(e, intervals[i][1]); i++;
  }
  res.push([s, e]);                                                                         //@place
  while (i < intervals.length) res.push(intervals[i++]);                          // after   //@after
  return res;
}`,
    validate: ({ iv, nw }) => ivCheck(iv) || (!Array.isArray(nw) || nw.length !== 2 || nw[0] > nw[1] ? 'The new interval looks like [4, 8].' : iv.some((x, k) => k && iv[k - 1][1] >= x[0]) ? 'The input intervals must be sorted and non-overlapping.' : null),
    run({ iv, nw }) {
      const steps = [], res = [], st = {}; let i = 0, [s, e] = nw;
      while (i < iv.length && iv[i][1] < s) { st[i] = 'dim'; res.push(iv[i]); steps.push({ st: { ...st }, res: res.map((x) => [...x]), ne: [s, e], line: 'before', note: `[${iv[i]}] ends at ${iv[i][1]} < ${s}: entirely before. Copy it.` }); i++; }
      while (i < iv.length && iv[i][0] <= e) { st[i] = 'current'; s = Math.min(s, iv[i][0]); e = Math.max(e, iv[i][1]); steps.push({ st: { ...st }, res: res.map((x) => [...x]), ne: [s, e], line: 'overlap', note: `[${iv[i]}] starts at ${iv[i][0]} ≤ ${e}: overlap. The new interval grows to [${s},${e}].` }); i++; }
      res.push([s, e]); steps.push({ st: { ...st }, res: res.map((x) => [...x]), ne: [s, e], line: 'place', note: `Place [${s},${e}].` });
      while (i < iv.length) { st[i] = 'frontier'; res.push(iv[i]); i++; }
      steps.push({ st, res, ne: [s, e], done: true, line: 'after', result: res, note: `Copy the rest. Result: ${res.map((x) => '[' + x + ']').join(' ')}.`, why: 'The input is already sorted, so one O(n) pass suffices: no sort.' });
      return steps;
    },
    render(st, stage, { iv }) { stage.append(R.intervals(iv, { states: st.st, extra: [st.ne], merged: st.res, mergedLabel: 'result' })); stage.append(R.vars({ 'new interval now': '[' + st.ne + ']' })); },
  });

  V.define('iv-select', {
    title: 'Keep the most non-overlapping intervals: sort by end, greedy',
    inputs: [{ key: 'iv', label: 'intervals', type: 'json', def: [[1, 2], [2, 3], [3, 4], [1, 3]], wide: true }],
    presets: [{ label: 'LeetCode 435 example 1', input: { iv: [[1, 2], [2, 3], [3, 4], [1, 3]] } }, { label: 'One long interval', input: { iv: [[1, 100], [11, 22], [1, 11], [2, 12]] } }, { label: 'All the same', input: { iv: [[1, 2], [1, 2], [1, 2]] } }],
    legend: [['done', 'kept'], ['error', 'removed (overlaps the last kept)'], ['current', 'deciding']],
    code: `
function eraseOverlapIntervals(intervals) {
  intervals.sort((a, b) => a[1] - b[1]);              // by END   //@sort
  let kept = 0, lastEnd = -Infinity;
  for (const [s, e] of intervals) {
    if (s >= lastEnd) { kept++; lastEnd = e; }        // compatible: keep  //@keep
  }                                                   // else: remove      //@drop
  return intervals.length - kept;
}`,
    validate: ({ iv }) => ivCheck(iv),
    run({ iv }) {
      const a = iv.map((x) => [...x]).sort((x, y) => x[1] - y[1]); const steps = [], st = {}; let kept = 0, last = -Infinity;
      steps.push({ a, st: {}, kept, line: 'sort', note: `Sorted by end: ${a.map((x) => '[' + x + ']').join(' ')}.`, why: 'Exchange argument (Week 9): the interval that ends first leaves the most room for the rest, so some optimal answer always includes it.' });
      a.forEach(([s, e], i) => {
        if (s >= last) { kept++; last = e; st[i] = 'done'; steps.push({ a, st: { ...st }, cur: i, kept, line: 'keep', note: `[${s},${e}] starts at ${s} ≥ ${last === e ? 'previous end' : last}: compatible. Keep it; lastEnd = ${e}.` }); }
        else { st[i] = 'error'; steps.push({ a, st: { ...st }, cur: i, kept, line: 'drop', note: `[${s},${e}] starts before lastEnd = ${last}: overlap. Remove it.`, why: 'Removing the interval that ends later is never worse: the kept one ends earlier.' }); }
      });
      steps.push({ a, st, kept, done: true, line: null, result: a.length - kept, note: `Kept ${kept}; removed ${a.length - kept}.` });
      return steps;
    },
    render(st, stage) { const s = { ...st.st }; if (st.cur != null && !st.done && !s[st.cur]) s[st.cur] = 'current'; stage.append(R.intervals(st.a, { states: s })); stage.append(R.vars({ kept: st.kept })); },
  });

  V.define('sweep', {
    title: 'Sweep line: +1 at a start, −1 at an end, track the maximum',
    inputs: [{ key: 'iv', label: 'meetings [start, end)', type: 'json', def: [[0, 30], [5, 10], [15, 20]], wide: true }],
    presets: [{ label: 'Day 4: 2 rooms', input: { iv: [[0, 30], [5, 10], [15, 20]] } }, { label: 'Back to back', input: { iv: [[1, 5], [5, 8]] } }, { label: 'Three at once', input: { iv: [[1, 10], [2, 7], [3, 19], [8, 12], [10, 20], [11, 30]] } }],
    legend: [['current', 'event being processed']],
    code: `
function minRooms(meetings) {
  const events = [];
  for (const [s, e] of meetings) { events.push([s, +1]); events.push([e, -1]); }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);   // ends before starts at a tie  //@sort
  let cur = 0, best = 0;
  for (const [, d] of events) { cur += d; best = Math.max(best, cur); }               //@sweep
  return best;
}`,
    validate: ({ iv }) => ivCheck(iv),
    run({ iv }) {
      const ev = []; iv.forEach(([s, e]) => { ev.push([s, 1]); ev.push([e, -1]); }); ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const steps = []; let cur = 0, best = 0;
      steps.push({ ev, k: -1, cur, best, line: 'sort', note: `${ev.length} events sorted by time; at equal times, ends (−1) come first.`, why: 'A meeting ending at 10 frees its room for one starting at 10, so the −1 must be processed first.' });
      ev.forEach(([t, d], k) => { cur += d; const nb = cur > best; best = Math.max(best, cur); steps.push({ ev, k, cur, best, line: 'sweep', note: `t = ${t}: ${d > 0 ? 'a meeting starts' : 'a meeting ends'} → ${cur} in progress.${nb ? ' New maximum.' : ''}` }); });
      steps.push({ ev, k: ev.length, cur, best, done: true, line: null, result: best, note: `${best} room${best === 1 ? '' : 's'} needed.`, why: 'O(n log n) for the sort; the sweep is O(n). A min-heap of end times gives the same answer.' });
      return steps;
    },
    render(st, stage, { iv }) {
      stage.append(R.intervals(iv, {}));
      stage.append(R.cells(st.ev.map(([t, d]) => t + (d > 0 ? ' +1' : ' −1')), { states: st.k >= 0 && st.k < st.ev.length ? { [st.k]: 'current' } : {}, label: 'events (time, change)' }));
      stage.append(R.vars({ 'in progress': st.cur, maximum: st.best }));
    },
  });

  // ---------- trie ----------
  V.define('trie', {
    title: 'Trie: insert, search, prefix and wildcard queries',
    inputs: [{ key: 'words', label: 'insert', type: 'array', def: ['app', 'apple', 'bat'], wide: true }, { key: 'queries', label: 'queries ["search"|"prefix"|"wild", text]', type: 'json', def: [['search', 'app'], ['search', 'ap'], ['prefix', 'ap'], ['wild', 'b.t'], ['wild', 'a..']], wide: true }],
    presets: [{ label: 'Day 5 drawing', input: { words: ['app', 'apple', 'bat'], queries: [['search', 'app'], ['search', 'ap'], ['prefix', 'ap'], ['wild', 'b.t'], ['wild', 'a..']] } }, { label: 'LeetCode 211 example', input: { words: ['bad', 'dad', 'mad'], queries: [['wild', 'pad'], ['wild', 'bad'], ['wild', '.ad'], ['wild', 'b..']] } }],
    legend: [['current', 'node visited'], ['done', 'isEnd = true (a word ends here)'], ['error', 'missing child: stop']],
    code: `
insert(word) {
  let node = this.root;
  for (const ch of word) {
    if (!node.children.has(ch)) node.children.set(ch, newNode());   //@create
    node = node.children.get(ch);
  }
  node.isEnd = true;                       // mark the LAST node      //@end
}
#walk(s) { /* follow s; null if a child is missing */ }              //@walk
search(w) { const n = this.#walk(w); return n !== null && n.isEnd; } //@search
startsWith(p) { return this.#walk(p) !== null; }                     //@prefix
// 211: on '.', try every child (DFS)                                //@wild`,
    validate: ({ words, queries }) => (!Array.isArray(words) || words.length > 6 || words.some((w) => typeof w !== 'string' || !/^[a-z]+$/.test(w) || w.length > 6) ? 'Insert up to 6 lower-case words of ≤ 6 letters.' : !Array.isArray(queries) || queries.length > 8 ? 'Up to 8 queries.' : null),
    run({ words, queries }) {
      const nodes = [{ id: 0, ch: '·', parent: null, end: false, kids: new Map() }]; const steps = [];
      const snap = (o) => ({ nodes: nodes.map((n) => ({ id: n.id, label: n.ch, parent: n.parent, end: n.end })), ...o });
      for (const w of words) {
        let cur = 0; const path = [0]; const created = [];
        for (const ch of w) { if (!nodes[cur].kids.has(ch)) { const id = nodes.length; nodes.push({ id, ch, parent: cur, end: false, kids: new Map() }); nodes[cur].kids.set(ch, id); created.push(ch); } cur = nodes[cur].kids.get(ch); path.push(cur); }
        nodes[cur].end = true;
        steps.push(snap({ path, line: created.length ? ['create', 'end'] : 'end', note: `insert("${w}"): ${created.length ? 'create ' + created.join(', ') : 'every node already exists'}; mark the last node as a word end.`, why: created.length < w.length ? 'Words with a common prefix share its nodes: "' + w.slice(0, w.length - created.length) + '" was already there.' : null }));
      }
      const results = [];
      for (const [kind, s] of queries) {
        if (kind === 'wild') {
          const visited = []; let found = false;
          const dfs = (id, i) => { visited.push(id); if (i === s.length) return nodes[id].end; const ch = s[i]; if (ch === '.') { for (const nx of nodes[id].kids.values()) if (dfs(nx, i + 1)) return true; return false; } const nx = nodes[id].kids.get(ch); return nx != null && dfs(nx, i + 1); };
          found = dfs(0, 0); results.push(found);
          steps.push(snap({ path: visited, line: 'wild', results: [...results], note: `search("${s}") with wildcards: visited ${visited.length - 1} node${visited.length === 2 ? '' : 's'} → ${found}.`, why: '"." branches to every child, so the worst case is O(26^dots · L); letters still follow a single path.' }));
          continue;
        }
        let cur = 0; const path = [0]; let miss = null;
        for (const ch of s) { const nx = nodes[cur].kids.get(ch); if (nx == null) { miss = ch; break; } cur = nx; path.push(cur); }
        const ans = miss != null ? false : kind === 'search' ? nodes[cur].end : true; results.push(ans);
        steps.push(snap({ path, miss: miss != null ? cur : null, line: ['walk', kind === 'search' ? 'search' : 'prefix'], results: [...results], note: `${kind === 'search' ? 'search' : 'startsWith'}("${s}"): ${miss != null ? 'no child "' + miss + '" → false' : kind === 'search' ? (nodes[cur].end ? 'reached a word-end node → true' : 'the path exists but the last node is not a word end → false') : 'the path exists → true'}.`, why: kind === 'search' && miss == null && !nodes[cur].end ? 'This is why isEnd exists: "ap" is a prefix of stored words but not a word itself.' : null }));
      }
      steps.push(snap({ path: [], done: true, line: null, results, result: results, note: `Query results: ${fmt(results)}.`, why: 'Each insert and plain query is O(L) for a word of length L, however many words are stored.' }));
      return steps;
    },
    render(st, stage) {
      const states = {}; st.nodes.forEach((n) => { if (n.end) states[n.id] = 'done'; }); (st.path || []).forEach((id) => (states[id] = 'current')); if (st.miss != null) states[st.miss] = 'error';
      stage.append(R.tree(st.nodes.map((n) => ({ id: n.id, label: n.label, parent: n.parent, state: states[n.id], sub: n.end ? 'end' : null })), { dx: 40, dy: 50, r: 15, label: 'trie (green = a word ends here)' }));
      if (st.results) stage.append(R.vars({ results: fmt(st.results) }));
    },
  });
})(window);
