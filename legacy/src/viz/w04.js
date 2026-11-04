// Week 4 visualizers: linked-list rewiring, fast/slow pointers, LRU, stacks, queues,
// monotonic stacks and the monotonic deque.
(function (g) {
  'use strict';
  const { el } = g.Core;
  const R = g.R, V = g.Viz;
  const sizeCheck = (a, lo, hi) => (a.length < lo ? 'Use at least ' + lo + ' element' + (lo > 1 ? 's.' : '.') : a.length > hi ? 'Keep it to ' + hi + ' elements so it fits on screen.' : null);
  const addPtr = (p, id, lab) => { if (id == null) return; p[id] = p[id] ? [].concat(p[id], lab) : lab; };
  const nodesOf = (vals) => vals.map((v, i) => ({ id: i, val: v }));
  const chain = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, i + 1 < n ? i + 1 : null]));
  const readList = (next, head, vals) => { const out = []; let c = head, guard = 0; while (c != null && guard++ < 100) { out.push(vals[c]); c = next[c]; } return out; };

  // ---------- reversal ----------
  V.define('ll-reverse', {
    title: 'Reverse a linked list: save, point back, advance',
    inputs: [{ key: 'vals', label: 'list values', type: 'numbers', def: [1, 2, 3, 4], wide: true }],
    presets: [{ label: '1→2→3→4', input: { vals: [1, 2, 3, 4] } }, { label: 'Roadmap dry run', input: { vals: [1, 2, 3] } }, { label: 'One node', input: { vals: [7] } }],
    legend: [['current', 'cur'], ['done', 'already reversed (prev side)']],
    code: `
function reverseList(head) {
  let prev = null, cur = head;          //@init
  while (cur) {                         //@loop
    const next = cur.next;  // 1. save  //@save
    cur.next = prev;        // 2. back  //@back
    prev = cur;             // 3.       //@prev
    cur = next;             // 4.       //@cur
  }
  return prev;              // new head //@ret
}`,
    validate: ({ vals }) => sizeCheck(vals, 1, 8),
    run({ vals }) {
      const n = vals.length, next = chain(n), steps = []; let prev = null, cur = 0;
      const snap = (o) => Object.assign({ next: { ...next }, prev, cur }, o);
      steps.push(snap({ line: 'init', note: 'prev = null (the reversed part is empty), cur = head.' }));
      while (cur != null) {
        const nx = next[cur];
        steps.push(snap({ line: 'save', nx, note: `Save next = ${nx == null ? 'null' : 'node ' + vals[nx]} before touching cur.next.`, why: cur === 0 ? 'Once cur.next is overwritten, this is the only reference to the rest of the list.' : null }));
        next[cur] = prev;
        steps.push(snap({ line: 'back', nx, flipped: cur, note: `Point node ${vals[cur]} back to ${prev == null ? 'null' : 'node ' + vals[prev]}.`, why: cur === 0 ? 'The old head becomes the tail, so its next must be null; otherwise the list would contain a cycle.' : null }));
        prev = cur; cur = nx;
        steps.push(snap({ line: ['prev', 'cur'], note: `Advance: prev = node ${vals[prev]}, cur = ${cur == null ? 'null' : 'node ' + vals[cur]}.` }));
      }
      const res = readList(next, prev, vals);
      steps.push(snap({ line: 'ret', done: true, result: res, note: `cur is null: return prev, node ${vals[prev]}. List: ${res.join(' → ')}.`, why: 'Each node is rewired exactly once: O(n) time, O(1) extra space.' }));
      return steps;
    },
    render(st, stage, { vals }) {
      const ptrs = {}, states = {};
      addPtr(ptrs, st.prev, 'prev'); addPtr(ptrs, st.cur, 'cur'); if (!st.done) addPtr(ptrs, st.nx, 'next');
      vals.forEach((_, i) => { if (st.prev != null && (i <= st.prev)) states[i] = 'done'; });
      if (st.cur != null) states[st.cur] = 'current';
      const es = {}; if (st.flipped != null) es[st.flipped] = 'current';
      stage.append(R.list(nodesOf(vals), { next: st.next, ptrs, states, edgeStates: es, nullPtrs: st.cur == null && !st.done ? ['cur'] : st.done ? ['cur'] : [], label: 'nodes stay in place; only the arrows change' }));
      stage.append(R.vars({ prev: st.prev == null ? 'null' : vals[st.prev], cur: st.cur == null ? 'null' : vals[st.cur] }));
    },
  });

  V.define('ll-reverse-rec', {
    title: 'Reverse recursively: trust the call, then fix two pointers',
    inputs: [{ key: 'vals', label: 'list values', type: 'numbers', def: [1, 2, 3, 4], wide: true }],
    presets: [{ label: '1→2→3→4', input: { vals: [1, 2, 3, 4] } }, { label: 'Two nodes', input: { vals: [1, 2] } }],
    legend: [['current', 'head of this call'], ['done', 'reversed part']],
    code: `
function reverseListRec(head) {
  if (!head || !head.next) return head;          //@base
  const newHead = reverseListRec(head.next);     //@rec
  head.next.next = head;   // attach head after its old successor  //@attach
  head.next = null;        // head is the new tail                  //@null
  return newHead;                                                   //@ret
}`,
    validate: ({ vals }) => sizeCheck(vals, 1, 7),
    run({ vals }) {
      const n = vals.length, next = chain(n), steps = [], frames = []; let newHead = null;
      const snap = (o) => Object.assign({ next: { ...next }, frames: [...frames] }, o);
      function rec(h) {
        frames.push('reverse(' + vals[h] + ')');
        if (next[h] == null) { steps.push(snap({ line: 'base', h, note: `Node ${vals[h]} has no next: it is the last node, so it is the new head. Return it.` })); frames.pop(); return h; }
        steps.push(snap({ line: 'rec', h, note: `reverse(${vals[h]}) first reverses the rest, starting at ${vals[next[h]]}.`, why: frames.length === 1 ? 'The contract: the call returns the head of the reversed rest. Node ' + vals[h] + "'s next still points at the rest's old first node, which will be its tail." : null }));
        const nh = rec(next[h]); newHead = nh;
        const succ = next[h];
        next[succ] = h;
        steps.push(snap({ line: 'attach', h, flipped: succ, note: `Back in reverse(${vals[h]}): node ${vals[succ]} (the rest's new tail) now points to ${vals[h]}.` }));
        next[h] = null;
        steps.push(snap({ line: ['null', 'ret'], h, note: `Node ${vals[h]}.next = null: it is the tail for now. Return the new head ${vals[nh]}.` }));
        frames.pop(); return nh;
      }
      const h = rec(0);
      steps.push(snap({ line: null, done: true, result: readList(next, h, vals), head: h, note: `Reversed: ${readList(next, h, vals).join(' → ')}.`, why: `n frames are on the stack at the deepest point: O(n) space, versus O(1) for the iterative version.` }));
      return steps;
    },
    render(st, stage, { vals }) {
      const ptrs = {}, states = {}; if (st.h != null) { addPtr(ptrs, st.h, 'head'); states[st.h] = 'current'; } if (st.head != null) addPtr(ptrs, st.head, 'newHead');
      const es = {}; if (st.flipped != null) es[st.flipped] = 'current';
      stage.append(R.list(nodesOf(vals), { next: st.next, ptrs, states, edgeStates: es }));
      stage.append(R.frames(st.frames.map((t) => ({ text: t }))));
    },
  });

  // ---------- merge with a dummy node ----------
  V.define('ll-merge', {
    title: 'Merge two sorted lists behind a dummy node',
    inputs: [{ key: 'a', label: 'list1 (sorted)', type: 'numbers', def: [1, 2, 4] }, { key: 'b', label: 'list2 (sorted)', type: 'numbers', def: [1, 3, 4] }],
    presets: [{ label: 'LeetCode example 1', input: { a: [1, 2, 4], b: [1, 3, 4] } }, { label: 'One empty', input: { a: [], b: [0] } }, { label: 'Interleaved', input: { a: [1, 5, 9], b: [2, 3, 10, 11] } }],
    legend: [['current', 'compared heads'], ['done', 'linked into the result']],
    code: `
function mergeTwoLists(l1, l2) {
  const dummy = new ListNode(0);
  let tail = dummy;                                   //@init
  while (l1 && l2) {                                  //@loop
    if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }  //@take1
    else { tail.next = l2; l2 = l2.next; }            //@take2
    tail = tail.next;                                 //@tail
  }
  tail.next = l1 ?? l2;     // append the leftover    //@rest
  return dummy.next;                                  //@ret
}`,
    validate: ({ a, b }) => (a.length + b.length > 10 ? 'Keep the two lists to 10 nodes in total.' : !a.every((x, i) => !i || a[i - 1] <= x) || !b.every((x, i) => !i || b[i - 1] <= x) ? 'Both lists must be sorted.' : null),
    run({ a, b }) {
      const steps = [], out = []; let i = 0, j = 0;
      steps.push({ i, j, out: [], line: 'init', note: 'A dummy node stands in front of the result, so the first attach is not a special case.', why: 'Without it you would need an if to decide which list provides the head.' });
      while (i < a.length && j < b.length) {
        const t1 = a[i] <= b[j];
        out.push(t1 ? ['a', i, a[i]] : ['b', j, b[j]]);
        steps.push({ i: t1 ? i + 1 : i, j: t1 ? j : j + 1, out: [...out], cmp: [i, j], line: [t1 ? 'take1' : 'take2', 'tail'], note: `${a[i]} ${t1 ? '≤' : '>'} ${b[j]}: link ${t1 ? a[i] + ' from list1' : b[j] + ' from list2'} after tail.`, why: t1 && a[i] === b[j] ? 'On ties take from list1 first; either is correct for this problem.' : null });
        if (t1) i++; else j++;
      }
      const rest = i < a.length ? a.slice(i).map((v, k) => ['a', i + k, v]) : b.slice(j).map((v, k) => ['b', j + k, v]);
      out.push(...rest);
      steps.push({ i: a.length, j: b.length, out: [...out], line: ['rest', 'ret'], done: true, result: out.map((x) => x[2]), note: rest.length ? `One list is empty: link the rest (${rest.map((x) => x[2]).join(', ')}) in one step and return dummy.next.` : 'Both lists are used up: return dummy.next.', why: 'No new nodes are created; only next pointers change. O(m + n) time, O(1) extra space.' });
      return steps;
    },
    render(st, stage, { a, b }) {
      const sa = {}, sb = {};
      a.forEach((_, k) => { if (k < st.i) sa[k] = 'done'; }); b.forEach((_, k) => { if (k < st.j) sb[k] = 'done'; });
      if (st.cmp) { sa[st.cmp[0]] = 'current'; sb[st.cmp[1]] = 'current'; }
      stage.append(R.cells(a, { states: sa, ptrs: st.i < a.length ? { [st.i]: 'l1' } : {}, label: 'list1' }));
      stage.append(R.cells(b, { states: sb, ptrs: st.j < b.length ? { [st.j]: 'l2' } : {}, label: 'list2' }));
      const vals = ['D', ...st.out.map((x) => x[2])];
      stage.append(R.list(vals.map((v, k) => ({ id: k, val: v })), { next: Object.fromEntries(vals.map((_, k) => [k, k + 1 < vals.length ? k + 1 : null])), ptrs: { 0: 'dummy', [vals.length - 1]: vals.length > 1 ? 'tail' : ['dummy', 'tail'] }, states: { 0: 'dim' }, label: 'result (D = dummy)' }));
    },
  });

  // ---------- fast and slow pointers ----------
  V.define('ll-middle', {
    title: 'Middle of a list: fast moves two, slow moves one',
    inputs: [{ key: 'vals', label: 'list values', type: 'numbers', def: [1, 2, 3, 4, 5], wide: true }],
    presets: [{ label: 'Odd length', input: { vals: [1, 2, 3, 4, 5] } }, { label: 'Even length (second middle)', input: { vals: [1, 2, 3, 4, 5, 6] } }, { label: 'One node', input: { vals: [1] } }],
    legend: [['current', 'slow'], ['frontier', 'fast']],
    code: `
function middleNode(head) {
  let slow = head, fast = head;          //@init
  while (fast && fast.next) {            //@loop
    slow = slow.next;                    //@slow
    fast = fast.next.next;               //@fast
  }
  return slow;                           //@ret
}`,
    validate: ({ vals }) => sizeCheck(vals, 1, 9),
    run({ vals }) {
      const n = vals.length, steps = []; let slow = 0, fast = 0;
      steps.push({ slow, fast, line: 'init', note: 'Both start at the head.' });
      while (fast != null && fast + 1 < n) { slow++; fast = fast + 2 < n ? fast + 2 : null; steps.push({ slow, fast, line: ['loop', 'slow', 'fast'], note: `slow → node ${vals[slow]}, fast → ${fast == null ? 'null' : 'node ' + vals[fast]}.`, why: steps.length === 1 ? 'fast has always travelled twice as far as slow, so when fast reaches the end, slow is halfway.' : null }); }
      steps.push({ slow, fast, line: 'ret', done: true, result: vals[slow], note: `${fast == null ? 'fast is null' : 'fast.next is null'}: stop. slow is at node ${vals[slow]} (index ${slow}).`, why: n % 2 === 0 ? 'For even length this gives the second of the two middles; `while (fast.next && fast.next.next)` would give the first.' : 'One pass, O(1) space: no need to count the length first.' });
      return steps;
    },
    render(st, stage, { vals }) {
      const ptrs = {}, states = {}; addPtr(ptrs, st.slow, 'slow'); addPtr(ptrs, st.fast, 'fast');
      states[st.slow] = 'current'; if (st.fast != null && st.fast !== st.slow) states[st.fast] = 'frontier';
      stage.append(R.list(nodesOf(vals), { next: chain(vals.length), ptrs, states, nullPtrs: st.fast == null ? ['fast'] : [] }));
    },
  });

  V.define('floyd', {
    title: "Floyd's cycle detection, then the cycle start",
    inputs: [{ key: 'vals', label: 'list values', type: 'numbers', def: [3, 2, 0, -4, 7, 9], wide: true }, { key: 'pos', label: 'tail links to index (−1 = no cycle)', type: 'int', def: 2 }],
    presets: [{ label: '6 nodes, cycle of 4', input: { vals: [3, 2, 0, -4, 7, 9], pos: 2 } }, { label: 'LeetCode example 1', input: { vals: [3, 2, 0, -4], pos: 1 } }, { label: 'No cycle', input: { vals: [1, 2, 3], pos: -1 } }, { label: 'Self-loop', input: { vals: [1], pos: 0 } }],
    legend: [['current', 'slow'], ['frontier', 'fast'], ['done', 'meeting point / cycle start']],
    code: `
function detectCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {                    //@loop
    slow = slow.next; fast = fast.next.next;     //@step
    if (slow === fast) {                         //@meet
      let p = head;                              //@phase2
      while (p !== slow) { p = p.next; slow = slow.next; }  //@walk
      return p;               // cycle start     //@start
    }
  }
  return null;                // no cycle        //@none
}`,
    validate: ({ vals, pos }) => sizeCheck(vals, 1, 8) || (pos < -1 || pos >= vals.length ? 'pos must be −1 or a valid index.' : null),
    run({ vals, pos }) {
      const n = vals.length, nxt = (i) => (i + 1 < n ? i + 1 : pos >= 0 ? pos : null), steps = [];
      let slow = 0, fast = 0, k = 0;
      const next = Object.fromEntries(vals.map((_, i) => [i, nxt(i)]));
      steps.push({ next, slow, fast, line: 'loop', note: pos >= 0 ? `The tail (node ${vals[n - 1]}) links back to index ${pos}: a cycle of length ${n - pos}.` : 'The tail links to null: no cycle.' });
      while (fast != null && nxt(fast) != null) {
        slow = nxt(slow); fast = nxt(nxt(fast)); k++;
        if (fast != null && slow === fast) {
          steps.push({ next, slow, fast, meet: slow, line: ['step', 'meet'], note: `Step ${k}: slow and fast meet at node ${vals[slow]} (index ${slow}).`, why: 'Inside the cycle fast gains exactly one node per step on slow, so the gap closes to 0 within one lap: it cannot jump over slow.' });
          let p = 0;
          steps.push({ next, slow, p, meet: slow, line: 'phase2', note: 'Phase 2: put p at the head; move p and slow one step at a time.', why: 'If the head is a steps from the cycle start and they met b steps into a cycle of length c, then 2(a + b) = a + b + kc, so a = kc − b: walking a steps from the meeting point reaches the start.' });
          while (p !== slow) { p = nxt(p); slow = nxt(slow); steps.push({ next, slow, p, line: 'walk', note: `p → ${vals[p]}, slow → ${vals[slow]}.` }); }
          steps.push({ next, slow, p, start: p, line: 'start', done: true, result: p, note: `They meet at index ${p} (value ${vals[p]}): the cycle starts here.` });
          return steps;
        }
        steps.push({ next, slow, fast, line: 'step', note: `Step ${k}: slow → index ${slow}, fast → ${fast == null ? 'null' : 'index ' + fast}.` });
      }
      steps.push({ next, slow, fast, line: 'none', done: true, result: -1, note: 'fast reached the end: there is no cycle.', why: 'O(n) time, O(1) space, against O(n) space for a Set of visited nodes.' });
      return steps;
    },
    render(st, stage, { vals }) {
      const ptrs = {}, states = {};
      if (st.p != null) addPtr(ptrs, st.p, 'p'); addPtr(ptrs, st.slow, 'slow'); if (st.fast != null && st.p == null) addPtr(ptrs, st.fast, 'fast');
      if (st.slow != null) states[st.slow] = 'current'; if (st.fast != null && st.p == null) states[st.fast] = 'frontier'; if (st.p != null) states[st.p] = 'frontier';
      if (st.meet != null) states[st.meet] = 'done'; if (st.start != null) states[st.start] = 'done';
      stage.append(R.list(nodesOf(vals), { next: st.next, ptrs, states, nullPtrs: st.fast === null && st.p == null ? ['fast'] : [] }));
    },
  });

  V.define('nth-end', {
    title: 'Remove the n-th node from the end: a gap of n + 1 behind a dummy',
    inputs: [{ key: 'vals', label: 'list values', type: 'numbers', def: [1, 2, 3, 4, 5], wide: true }, { key: 'n', label: 'n', type: 'int', def: 2 }],
    presets: [{ label: 'LeetCode example 1', input: { vals: [1, 2, 3, 4, 5], n: 2 } }, { label: 'Remove the head', input: { vals: [1, 2], n: 2 } }, { label: 'Single node', input: { vals: [1], n: 1 } }],
    legend: [['current', 'slow'], ['frontier', 'fast'], ['error', 'removed']],
    code: `
function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head);
  let slow = dummy, fast = dummy;                         //@init
  for (let i = 0; i <= n; i++) fast = fast.next;          //@gap
  while (fast) { slow = slow.next; fast = fast.next; }    //@walk
  slow.next = slow.next.next;      // unlink the target   //@unlink
  return dummy.next;                                      //@ret
}`,
    validate: ({ vals, n }) => sizeCheck(vals, 1, 8) || (n < 1 || n > vals.length ? 'n must be between 1 and the list length.' : null),
    run({ vals, n }) {
      const all = ['D', ...vals], L = all.length, steps = []; let slow = 0, fast = 0;
      const next = chain(L);
      steps.push({ next: { ...next }, slow, fast, line: 'init', note: 'Both start at the dummy (D), which sits before the head.', why: 'If the head itself is removed, slow must stop at the node before it: the dummy.' });
      for (let i = 0; i <= n; i++) { fast = fast + 1 < L ? fast + 1 : null; steps.push({ next: { ...next }, slow, fast, line: 'gap', note: `Move fast ${i + 1} of ${n + 1} steps → ${fast == null ? 'null' : all[fast]}.` }); }
      while (fast != null) { slow++; fast = fast + 1 < L ? fast + 1 : null; steps.push({ next: { ...next }, slow, fast, line: 'walk', note: `slow → ${all[slow]}, fast → ${fast == null ? 'null' : all[fast]}.`, why: fast == null ? `fast is null, n + 1 = ${n + 1} nodes ahead of slow, so slow.next is the n-th node from the end.` : null }); }
      const target = slow + 1; next[slow] = next[target]; next[target] = undefined;
      const res = readList(next, next[0], all);
      steps.push({ next: { ...next }, slow, fast, removed: target, line: ['unlink', 'ret'], done: true, result: res, note: `Unlink node ${all[target]}: slow.next = slow.next.next. Return dummy.next → ${res.length ? res.join(' → ') : 'empty list'}.`, why: 'One pass, O(1) space. The gap of n + 1 (not n) is what leaves slow before the target.' });
      return steps;
    },
    render(st, stage, { vals }) {
      const all = ['D', ...vals]; const ptrs = {}, states = { 0: 'dim' };
      addPtr(ptrs, st.slow, 'slow'); addPtr(ptrs, st.fast, 'fast'); states[st.slow] = 'current'; if (st.fast != null) states[st.fast] = 'frontier'; if (st.removed != null) states[st.removed] = 'error';
      stage.append(R.list(all.map((v, i) => ({ id: i, val: v })), { next: st.next, ptrs, states, nullPtrs: st.fast == null ? ['fast'] : [], label: 'D = dummy node' }));
    },
  });

  // ---------- LRU cache ----------
  V.define('lru', {
    title: 'LRU cache: Map for lookup, doubly linked list for recency',
    inputs: [{ key: 'cap', label: 'capacity', type: 'int', def: 2 }, { key: 'ops', label: 'operations ["put",k,v] / ["get",k]', type: 'json', def: [['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3], ['get', 2], ['put', 4, 4], ['get', 1], ['get', 3], ['get', 4]], wide: true }],
    presets: [{ label: 'LeetCode example', input: { cap: 2, ops: [['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3], ['get', 2], ['put', 4, 4], ['get', 1], ['get', 3], ['get', 4]] } }, { label: 'Update an existing key', input: { cap: 2, ops: [['put', 1, 1], ['put', 2, 2], ['put', 1, 10], ['put', 3, 3], ['get', 1], ['get', 2]] } }, { label: 'Capacity 1', input: { cap: 1, ops: [['put', 2, 1], ['get', 2], ['put', 3, 2], ['get', 2], ['get', 3]] } }],
    legend: [['current', 'just used (moved to front)'], ['error', 'evicted']],
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
    validate: ({ cap, ops }) => (cap < 1 || cap > 5 ? 'Use capacity 1–5.' : !Array.isArray(ops) || ops.length > 14 || ops.some((o) => !Array.isArray(o) || !(o[0] === 'get' && o.length === 2 || o[0] === 'put' && o.length === 3)) ? 'Operations look like ["put", 1, 1] or ["get", 1], at most 14.' : null),
    run({ cap, ops }) {
      const steps = []; let order = []; const vals = new Map(); const results = [];
      for (const op of ops) {
        if (op[0] === 'get') {
          const k = op[1];
          if (!vals.has(k)) { results.push(-1); steps.push({ order: [...order], vals: [...vals], op, line: 'miss', results: [...results], note: `get(${k}): not in the map → −1.` }); continue; }
          order = [k, ...order.filter((x) => x !== k)]; results.push(vals.get(k));
          steps.push({ order: [...order], vals: [...vals], op, hot: k, line: 'touch', results: [...results], note: `get(${k}) = ${vals.get(k)}. Unlink its node and insert it at the front: it is now the most recently used.`, why: 'The map finds the node in O(1); prev/next pointers let it be unlinked in O(1) without searching the list.' });
        } else {
          const [, k, v] = op; const had = vals.has(k);
          order = [k, ...order.filter((x) => x !== k)]; vals.set(k, v); results.push(null);
          let ev = null;
          if (vals.size > cap) { ev = order.pop(); vals.delete(ev); }
          steps.push({ order: [...order], vals: [...vals], op, hot: k, ev, line: ev != null ? ['add', 'lru', 'evict'] : had ? ['old', 'add'] : 'add', results: [...results], note: `put(${k}, ${v})${had ? ': key exists, so remove its old node first.' : '.'} Insert at the front.${ev != null ? ' Over capacity: evict key ' + ev + ' from the back (tail.prev) and from the map.' : ''}`, why: ev != null ? 'The node stores its key, which is how the map entry for the evicted node can be deleted in O(1).' : null });
        }
      }
      steps.push({ order, vals: [...vals], done: true, results, line: null, result: results, note: `Outputs: [${results.map((x) => (x === null ? 'null' : x)).join(', ')}].`, why: 'Every operation is O(1): one map lookup plus a constant number of pointer changes.' });
      return steps;
    },
    render(st, stage) {
      const items = ['head', ...st.order.map((k) => k + ':' + new Map(st.vals).get(k)), 'tail'];
      const states = { 0: 'dim', [items.length - 1]: 'dim' };
      const hi = st.order.indexOf(st.hot); if (hi >= 0) states[hi + 1] = 'current';
      stage.append(R.cells(items, { states, label: 'doubly linked list, most recent → least recent (key:value)', noIndex: true }));
      if (st.ev != null) stage.append(el('div.small.ui', { style: { color: 'var(--st-error)' } }, 'evicted key ' + st.ev));
      stage.append(R.kv(st.order.map((k) => [k, 'node']), { label: 'map (key → node)' }));
      stage.append(R.vars({ op: st.op ? JSON.stringify(st.op) : '·', outputs: '[' + st.results.map((x) => (x === null ? 'null' : x)).join(', ') + ']' }));
    },
  });

  // ---------- stacks and queues ----------
  V.define('stack-match', {
    title: 'Valid Parentheses: the most recent opener must close first',
    inputs: [{ key: 's', label: 's', type: 'string', def: '{[()()]}', wide: true }],
    presets: [{ label: 'Valid, nested', input: { s: '{[()()]}' } }, { label: 'Wrong order', input: { s: '([)]' } }, { label: 'Unclosed', input: { s: '((' } }, { label: 'Closer first', input: { s: ')(' } }],
    legend: [['current', 'character being read'], ['done', 'matched'], ['error', 'mismatch']],
    code: `
function isValid(s) {
  const match = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const c of s) {
    if (!(c in match)) stack.push(c);                 // opener  //@push
    else if (stack.pop() !== match[c]) return false;  // closer  //@pop
  }
  return stack.length === 0;                                     //@end
}`,
    validate: ({ s }) => (!/^[()[\]{}]*$/.test(s) ? 'Use only ()[]{} characters.' : s.length > 20 ? 'Keep it to 20 characters.' : null),
    run({ s }) {
      const match = { ')': '(', ']': '[', '}': '{' }; const stack = [], steps = [], matched = new Set(), openIdx = [];
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (!(c in match)) { stack.push(c); openIdx.push(i); steps.push({ i, stack: [...stack], matched: new Set(matched), line: 'push', note: `"${c}" opens: push it.` }); continue; }
        const top = stack.pop(); const oi = openIdx.pop();
        if (top !== match[c]) { steps.push({ i, stack: [...stack], matched: new Set(matched), bad: [i, oi], line: 'pop', done: true, result: false, note: top === undefined ? `"${c}" closes, but the stack is empty: nothing to match. Return false.` : `"${c}" closes, but the most recent opener is "${top}". Return false.`, why: 'Nesting means the last opened bracket must be the first closed: that is exactly LIFO.' }); return steps; }
        matched.add(i); matched.add(oi);
        steps.push({ i, stack: [...stack], matched: new Set(matched), line: 'pop', note: `"${c}" matches the top "${top}": pop.` });
      }
      const ok = stack.length === 0;
      steps.push({ i: null, stack: [...stack], matched, line: 'end', done: true, result: ok, note: ok ? 'Every opener was closed: return true.' : `${stack.length} opener${stack.length > 1 ? 's are' : ' is'} still waiting: return false.`, why: 'O(n) time; O(n) space in the worst case (all openers).' });
      return steps;
    },
    render(st, stage, { s }) {
      const states = {}; st.matched.forEach((k) => (states[k] = 'done')); if (st.i != null) states[st.i] = 'current'; if (st.bad) st.bad.forEach((k) => { if (k != null) states[k] = 'error'; });
      stage.append(R.cells([...s], { states, label: 's' }));
      stage.append(R.stack(st.stack));
    },
  });

  V.define('min-stack', {
    title: 'Min Stack: store the minimum alongside each value',
    inputs: [{ key: 'ops', label: 'operations', type: 'json', def: [['push', -2], ['push', 0], ['push', -3], ['getMin'], ['pop'], ['top'], ['getMin']], wide: true }],
    presets: [{ label: 'LeetCode example', input: { ops: [['push', -2], ['push', 0], ['push', -3], ['getMin'], ['pop'], ['top'], ['getMin']] } }, { label: 'Equal minimums', input: { ops: [['push', 1], ['push', 1], ['pop'], ['getMin']] } }],
    legend: [['current', 'top'], ['done', 'pair holding the current minimum']],
    code: `
class MinStack {
  constructor() { this.s = []; }                           // [val, minSoFar]
  push(val) {
    const min = this.s.length ? Math.min(val, this.s.at(-1)[1]) : val;
    this.s.push([val, min]);                               //@push
  }
  pop() { this.s.pop(); }                                  //@pop
  top() { return this.s.at(-1)[0]; }                       //@top
  getMin() { return this.s.at(-1)[1]; }                    //@min
}`,
    validate: ({ ops }) => (!Array.isArray(ops) || ops.length > 14 ? 'At most 14 operations.' : null),
    run({ ops }) {
      const s = [], steps = [], out = [];
      for (const op of ops) {
        if (op[0] === 'push') { const m = s.length ? Math.min(op[1], s.at(-1)[1]) : op[1]; s.push([op[1], m]); out.push(null); steps.push({ s: s.map((x) => [...x]), line: 'push', out: [...out], note: `push(${op[1]}): the minimum of everything up to here is ${m}; store [${op[1]}, ${m}].`, why: s.length === 1 ? 'Each pair remembers the minimum of the stack *as it was when the pair was on top*, so popping restores the previous minimum automatically.' : null }); }
        else if (op[0] === 'pop') { if (!s.length) { steps.push({ s: [], line: 'pop', out: [...out], note: 'pop on an empty stack: LeetCode never does this.' }); continue; } const x = s.pop(); out.push(null); steps.push({ s: s.map((y) => [...y]), line: 'pop', out: [...out], note: `pop(): remove [${x.join(', ')}]. The minimum is now ${s.length ? s.at(-1)[1] : '(empty)'}.` }); }
        else if (op[0] === 'top') { out.push(s.at(-1)[0]); steps.push({ s: s.map((y) => [...y]), line: 'top', out: [...out], note: `top() = ${s.at(-1)[0]}.` }); }
        else { out.push(s.at(-1)[1]); steps.push({ s: s.map((y) => [...y]), line: 'min', out: [...out], note: `getMin() = ${s.at(-1)[1]}, read from the top pair in O(1).` }); }
      }
      steps.push({ s: s.map((y) => [...y]), out, done: true, line: null, result: out, note: `Outputs: [${out.map((x) => (x === null ? 'null' : x)).join(', ')}].`, why: 'Every operation is O(1); the extra space is one number per element.' });
      return steps;
    },
    render(st, stage) {
      const states = {}; if (st.s.length) states[st.s.length - 1] = 'current';
      stage.append(R.stack(st.s.map((p) => p[0] + '  (min ' + p[1] + ')'), { states, label: 'stack of [val, minSoFar], top at the top' }));
      stage.append(R.vars({ outputs: '[' + st.out.map((x) => (x === null ? 'null' : x)).join(', ') + ']' }));
    },
  });

  V.define('queue-2stacks', {
    title: 'Queue from two stacks: amortised O(1)',
    inputs: [{ key: 'ops', label: 'operations', type: 'json', def: [['push', 1], ['push', 2], ['peek'], ['pop'], ['push', 3], ['pop'], ['pop']], wide: true }],
    presets: [{ label: 'Mixed', input: { ops: [['push', 1], ['push', 2], ['peek'], ['pop'], ['push', 3], ['pop'], ['pop']] } }, { label: 'Many pushes, then pops', input: { ops: [['push', 1], ['push', 2], ['push', 3], ['push', 4], ['pop'], ['pop'], ['pop'], ['pop']] } }],
    legend: [['current', 'moved now']],
    code: `
class MyQueue {
  constructor() { this.in = []; this.out = []; }
  push(x) { this.in.push(x); }                          //@push
  #fill() {
    if (!this.out.length)                               //@check
      while (this.in.length) this.out.push(this.in.pop()); //@move
  }
  pop() { this.#fill(); return this.out.pop(); }        //@pop
  peek() { this.#fill(); return this.out.at(-1); }      //@peek
}`,
    validate: ({ ops }) => (!Array.isArray(ops) || ops.length > 14 ? 'At most 14 operations.' : null),
    run({ ops }) {
      const inn = [], out = [], steps = [], res = []; let moves = 0;
      for (const op of ops) {
        if (op[0] === 'push') { inn.push(op[1]); res.push(null); steps.push({ inn: [...inn], out: [...out], line: 'push', res: [...res], moves, note: `push(${op[1]}) onto the in-stack: O(1).` }); continue; }
        if (!out.length && inn.length) { const k = inn.length; while (inn.length) { out.push(inn.pop()); moves++; } steps.push({ inn: [...inn], out: [...out], line: ['check', 'move'], res: [...res], moves, moved: k, note: `out is empty: move all ${k} element${k > 1 ? 's' : ''} from in to out, reversing their order so the oldest is on top.`, why: 'Each element is moved from in to out at most once in its life, so over any sequence of n operations the total work is O(n): amortised O(1) each.' }); }
        if (!out.length) { res.push(undefined); steps.push({ inn: [...inn], out: [...out], line: op[0] === 'pop' ? 'pop' : 'peek', res: [...res], moves, note: `${op[0]}() on an empty queue: LeetCode never does this.` }); continue; }
        if (op[0] === 'pop') { const x = out.pop(); res.push(x); steps.push({ inn: [...inn], out: [...out], line: 'pop', res: [...res], moves, note: `pop() = ${x}, the oldest element.` }); }
        else { res.push(out.at(-1)); steps.push({ inn: [...inn], out: [...out], line: 'peek', res: [...res], moves, note: `peek() = ${out.at(-1)}.` }); }
      }
      steps.push({ inn, out, done: true, line: null, res, moves, result: res, note: `Outputs: [${res.map((x) => (x === null ? 'null' : x)).join(', ')}]; ${moves} element moves in total.` });
      return steps;
    },
    render(st, stage) {
      const os = {}; if (st.moved) for (let k = st.out.length - st.moved; k < st.out.length; k++) os[k] = 'current';
      stage.append(el('div.row', { style: { alignItems: 'flex-end', gap: '28px' } }, R.stack(st.inn, { label: 'in (push here)' }), R.stack(st.out, { label: 'out (pop here)', states: os })));
      stage.append(R.vars({ 'total moves': st.moves, outputs: '[' + st.res.map((x) => (x === null ? 'null' : x)).join(', ') + ']' }));
    },
  });

  // ---------- monotonic stack ----------
  V.define('mono-stack', {
    title: 'Next greater element with a monotonic stack of indices',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [2, 1, 5, 3, 6], wide: true }],
    presets: [{ label: 'Roadmap dry run', input: { nums: [2, 1, 5, 3, 6] } }, { label: 'Decreasing', input: { nums: [5, 4, 3, 2, 1] } }, { label: 'Equal values', input: { nums: [2, 2, 3] } }],
    legend: [['current', 'i'], ['frontier', 'waiting on the stack'], ['done', 'answer found']],
    code: `
function nextGreater(nums) {
  const ans = new Array(nums.length).fill(-1);
  const stack = [];        // indices, values decreasing       //@init
  for (let i = 0; i < nums.length; i++) {                      //@loop
    while (stack.length && nums[stack.at(-1)] < nums[i])       //@while
      ans[stack.pop()] = nums[i];   // i resolves them         //@pop
    stack.push(i);                                             //@push
  }
  return ans;                                                  //@ret
}`,
    validate: ({ nums }) => sizeCheck(nums, 1, 14),
    run({ nums: a }) {
      const ans = new Array(a.length).fill(-1), st = [], steps = []; let ops = 0;
      steps.push({ ans: [...ans], st: [], line: 'init', note: 'ans starts as −1 everywhere: "no greater element to the right".' });
      for (let i = 0; i < a.length; i++) {
        while (st.length && a[st.at(-1)] < a[i]) { const j = st.pop(); ans[j] = a[i]; ops++; steps.push({ i, ans: [...ans], st: [...st], popped: j, line: ['while', 'pop'], note: `nums[${i}] = ${a[i]} > nums[${j}] = ${a[j]}: ${a[i]} is the next greater of index ${j}. Pop it.`, why: 'Anything smaller than a newer, larger value can never be the next greater for a later index, so it leaves the stack forever.' }); }
        st.push(i); ops++;
        steps.push({ i, ans: [...ans], st: [...st], line: 'push', note: `Push index ${i} (value ${a[i]}): it waits for something greater.`, why: st.length > 1 ? 'The values of the waiting indices decrease from bottom to top, hence "monotonic".' : null });
      }
      steps.push({ ans, st, done: true, line: 'ret', result: ans, note: `Indices still on the stack (${st.join(', ') || 'none'}) have no greater element: −1. Result [${ans.join(', ')}].`, why: `${ops} pushes and pops for ${a.length} elements: each index is pushed once and popped at most once, so O(n).` });
      return steps;
    },
    render(st, stage, { nums: a }) {
      const states = {}; st.st.forEach((j) => (states[j] = 'frontier')); a.forEach((_, j) => { if (st.ans[j] !== -1) states[j] = 'done'; }); if (st.i != null && !st.done) states[st.i] = 'current';
      stage.append(R.cells(a, { states, ptrs: st.i != null && !st.done ? { [st.i]: 'i' } : {}, label: 'nums' }));
      stage.append(R.stack(st.st.map((j) => 'index ' + j + ' (' + a[j] + ')'), { label: 'stack (top at the top)' }));
      stage.append(R.cells(st.ans, { states: st.popped != null ? { [st.popped]: 'current' } : {}, label: 'ans' }));
    },
  });

  V.define('daily-temps', {
    title: 'Daily Temperatures: distances from stored indices',
    inputs: [{ key: 't', label: 'temperatures', type: 'numbers', def: [73, 74, 75, 71, 69, 72, 76, 73], wide: true }],
    presets: [{ label: 'LeetCode example 1', input: { t: [73, 74, 75, 71, 69, 72, 76, 73] } }, { label: 'Increasing', input: { t: [30, 40, 50, 60] } }],
    legend: [['current', 'today'], ['frontier', 'waiting for a warmer day'], ['done', 'answered']],
    code: `
function dailyTemperatures(t) {
  const ans = new Array(t.length).fill(0);
  const stack = [];                                      // indices
  for (let i = 0; i < t.length; i++) {
    while (stack.length && t[stack.at(-1)] < t[i]) {     //@while
      const j = stack.pop();
      ans[j] = i - j;               // days waited       //@dist
    }
    stack.push(i);                                       //@push
  }
  return ans;
}`,
    validate: ({ t }) => sizeCheck(t, 1, 14),
    run({ t }) {
      const ans = new Array(t.length).fill(0), st = [], steps = [];
      for (let i = 0; i < t.length; i++) {
        while (st.length && t[st.at(-1)] < t[i]) { const j = st.pop(); ans[j] = i - j; steps.push({ i, ans: [...ans], st: [...st], popped: j, line: ['while', 'dist'], note: `Day ${i} (${t[i]}) is warmer than day ${j} (${t[j]}): ans[${j}] = ${i} − ${j} = ${i - j}.`, why: 'Storing indices, not temperatures, is what makes the distance computable.' }); }
        st.push(i); steps.push({ i, ans: [...ans], st: [...st], line: 'push', note: `Day ${i} waits.` });
      }
      steps.push({ ans, st, done: true, line: null, result: ans, note: `Days left on the stack never get warmer: 0. Result [${ans.join(', ')}].` });
      return steps;
    },
    render(st, stage, { t }) {
      const states = {}; st.st.forEach((j) => (states[j] = 'frontier')); t.forEach((_, j) => { if (st.ans[j]) states[j] = 'done'; }); if (st.i != null && !st.done) states[st.i] = 'current';
      stage.append(R.bars(t.map((x) => x - Math.min(...t) + 1), { states, ptrs: st.i != null && !st.done ? { [st.i]: 'i' } : {}, label: 'temperatures (heights relative to the coldest day)' }));
      stage.append(R.stack(st.st.map((j) => 'day ' + j + ' (' + t[j] + ')')));
      stage.append(R.cells(st.ans, { states: st.popped != null ? { [st.popped]: 'current' } : {}, label: 'ans (days to wait)' }));
    },
  });

  V.define('histogram', {
    title: 'Largest Rectangle in Histogram: widths from previous and next smaller bars',
    inputs: [{ key: 'h', label: 'heights', type: 'numbers', def: [2, 1, 5, 6, 2, 3], wide: true }],
    presets: [{ label: 'LeetCode example 1', input: { h: [2, 1, 5, 6, 2, 3] } }, { label: 'Increasing', input: { h: [1, 2, 3, 4] } }, { label: 'All equal', input: { h: [3, 3, 3] } }],
    legend: [['frontier', 'on the stack (increasing heights)'], ['current', 'bar being resolved'], ['best', 'best rectangle']],
    code: `
function largestRectangleArea(heights) {
  const h = [...heights, 0];          // sentinel flushes the stack   //@sentinel
  const stack = []; let best = 0;
  for (let i = 0; i < h.length; i++) {
    while (stack.length && h[stack.at(-1)] >= h[i]) {                 //@while
      const top = stack.pop();
      const left = stack.length ? stack.at(-1) + 1 : 0;  // prev smaller + 1  //@left
      best = Math.max(best, h[top] * (i - left));        // i = next smaller  //@area
    }
    stack.push(i);                                                    //@push
  }
  return best;
}`,
    validate: ({ h }) => sizeCheck(h, 1, 12) || (h.some((x) => x < 0) ? 'Heights must be 0 or more.' : null),
    run({ h: hs }) {
      const h = [...hs, 0], st = [], steps = []; let best = 0, bestR = null;
      steps.push({ st: [], best, line: 'sentinel', note: 'Append a 0-height bar: it is smaller than everything, so it resolves every bar left on the stack at the end.' });
      for (let i = 0; i < h.length; i++) {
        while (st.length && h[st.at(-1)] >= h[i]) {
          const top = st.pop(); const left = st.length ? st.at(-1) + 1 : 0; const area = h[top] * (i - left);
          const nb = area > best; if (nb) { best = area; bestR = [left, i - 1, h[top]]; }
          steps.push({ i, st: [...st], best, bestR, cur: [left, i - 1, h[top]], top, line: ['while', 'left', 'area'], note: `Bar ${top} (height ${h[top]}) is resolved by bar ${i}: it can extend from ${left} to ${i - 1} → width ${i - left}, area ${area}.${nb ? ' New best.' : ''}`, why: 'The bar below it on the stack is the previous smaller bar and i is the next smaller bar, so the widest rectangle of exactly this height spans between them.' });
        }
        st.push(i);
        if (i < hs.length) steps.push({ i, st: [...st], best, bestR, line: 'push', note: `Push bar ${i} (height ${h[i]}).` });
      }
      steps.push({ st: [], best, bestR, done: true, line: null, result: best, note: `Largest area ${best}.`, why: 'Each bar is pushed and popped once: O(n), against O(n²) for expanding around every bar.' });
      return steps;
    },
    render(st, stage, { h }) {
      const states = {}; st.st.forEach((j) => { if (j < h.length) states[j] = 'frontier'; }); if (st.top != null) states[st.top] = 'current';
      const r = st.cur || st.bestR;
      stage.append(R.bars(h, { states, rect: r ? { l: r[0], r: r[1], h: r[2], cls: st.cur ? '' : 'best' } : null, ptrs: st.i != null && st.i < h.length && !st.done ? { [st.i]: 'i' } : {}, label: 'heights (shaded: rectangle being measured)' }));
      stage.append(R.vars({ best: st.best }));
    },
  });

  V.define('mono-deque', {
    title: 'Sliding window maximum with a monotonic deque',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [1, 3, -1, -3, 5, 3, 6, 7], wide: true }, { key: 'k', label: 'k', type: 'int', def: 3 }],
    presets: [{ label: 'Roadmap dry run', input: { nums: [1, 3, -1, -3, 5, 3, 6, 7], k: 3 } }, { label: 'k = 1', input: { nums: [4, 2, 5], k: 1 } }, { label: 'Decreasing', input: { nums: [9, 7, 5, 3, 1], k: 2 } }],
    legend: [['window', 'current window'], ['frontier', 'in the deque'], ['current', 'i'], ['done', 'window maximum']],
    code: `
function maxSlidingWindow(nums, k) {
  const dq = []; let head = 0; const res = [];
  for (let i = 0; i < nums.length; i++) {
    if (head < dq.length && dq[head] <= i - k) head++;   // left the window  //@expire
    while (dq.length > head && nums[dq.at(-1)] <= nums[i]) dq.pop();         //@popback
    dq.push(i);                                                              //@push
    if (i >= k - 1) res.push(nums[dq[head]]);            // front = max      //@max
  }
  return res;
}`,
    validate: ({ nums, k }) => sizeCheck(nums, 1, 14) || (k < 1 || k > nums.length ? 'k must be between 1 and n.' : null),
    run({ nums: a, k }) {
      const dq = [], res = [], steps = []; let head = 0;
      for (let i = 0; i < a.length; i++) {
        const notes = [];
        if (head < dq.length && dq[head] <= i - k) { notes.push(`index ${dq[head]} left the window`); head++; }
        const popped = []; while (dq.length > head && a[dq.at(-1)] <= a[i]) popped.push(dq.pop());
        if (popped.length) notes.push(`popped ${popped.map((j) => a[j]).join(', ')} from the back (≤ ${a[i]}, can never be a maximum again)`);
        dq.push(i);
        if (i >= k - 1) res.push(a[dq[head]]);
        steps.push({ i, dq: dq.slice(head), res: [...res], line: ['expire', 'popback', 'push', ...(i >= k - 1 ? ['max'] : [])], note: `i = ${i} (${a[i]}): ${notes.length ? notes.join('; ') + '; ' : ''}push ${i}.${i >= k - 1 ? ' Window max = front = ' + a[dq[head]] + '.' : ' Window not full yet.'}`, why: i === 0 ? 'Deque values decrease from front to back, so the front is always the largest value still inside the window.' : null });
      }
      steps.push({ i: null, dq: dq.slice(head), res, done: true, line: null, result: res, note: `Maxima: [${res.join(', ')}].`, why: 'Each index is pushed once and removed at most once: O(n), against O(n·k) for scanning every window.' });
      return steps;
    },
    render(st, stage, { nums: a, k }) {
      const states = {}; st.dq.forEach((j) => (states[j] = 'frontier')); if (st.i != null) { states[st.i] = 'current'; if (st.i >= k - 1) states[st.dq[0]] = 'done'; }
      stage.append(R.cells(a, { states, window: st.i != null ? [Math.max(0, st.i - k + 1), st.i] : null, label: 'nums' }));
      stage.append(R.queue(st.dq.map((j) => a[j] + ' (i=' + j + ')'), { label: 'deque (front on the left)' }));
      stage.append(R.cells(st.res, { label: 'window maxima' }));
    },
  });
})(window);
