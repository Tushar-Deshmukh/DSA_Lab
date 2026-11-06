// Learner-code runner (decision D-007). This file is served with its own policy
// (script-src 'self' 'unsafe-eval'; connect-src 'none'), so learner code can run here but cannot reach the
// network. Storage, messaging and worker globals are removed before any learner code runs. The test harness
// (adapters, comparison modes, class tests) is ported verbatim from legacy/src/exercises.js WORKER_SRC,
// with per-test captured console.log and timing added on top.
'use strict';

const post = self.postMessage.bind(self);

const REMOVED_GLOBALS = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'WebTransport',
  'EventSource',
  'importScripts',
  'indexedDB',
  'caches',
  'BroadcastChannel',
  'Worker',
  'SharedWorker',
  'postMessage',
  'close',
];
const REMOVED_NAVIGATOR = ['storage', 'locks', 'serviceWorker'];

function removeEverywhere(start, name) {
  for (let o = start; o; o = Object.getPrototypeOf(o)) {
    if (Object.prototype.hasOwnProperty.call(o, name)) {
      try {
        Object.defineProperty(o, name, { value: undefined, writable: false, configurable: false });
      } catch {
        // A non-configurable property stays; the policy still blocks its network use.
      }
    }
  }
}

for (const name of REMOVED_GLOBALS) removeEverywhere(self, name);
for (const name of REMOVED_NAVIGATOR) removeEverywhere(self.navigator, name);

const MAX_LOG_LINES = 300;
const MAX_LINE_CHARS = 2000;

function show(value) {
  if (typeof value === 'string') return value;
  try {
    const s = JSON.stringify(value);
    return s === undefined ? String(value) : s;
  } catch {
    return String(value);
  }
}

function captureLogs() {
  const logs = [];
  const capture =
    () =>
    (...parts) => {
      if (logs.length < MAX_LOG_LINES) logs.push(parts.map(show).join(' ').slice(0, MAX_LINE_CHARS));
    };
  const previous = { log: console.log, info: console.info, warn: console.warn, error: console.error };
  console.log = capture();
  console.info = capture();
  console.warn = capture();
  console.error = capture();
  return { logs, restore: () => Object.assign(console, previous) };
}

// ---- the legacy test harness, ported verbatim from legacy/src/exercises.js (WORKER_SRC, with the additions
// marked below)

function ListNode(val = 0, next = null) {
  this.val = val;
  this.next = next;
}
function TreeNode(val = 0, left = null, right = null) {
  this.val = val;
  this.left = left;
  this.right = right;
}
function toList(a) {
  const d = new ListNode();
  let t = d;
  for (const v of a) {
    t.next = new ListNode(v);
    t = t.next;
  }
  return d.next;
}
function fromList(h) {
  const o = [];
  let guard = 0;
  while (h && guard++ < 100000) {
    o.push(h.val);
    h = h.next;
  }
  return o;
}
function toTree(a) {
  if (!a.length || a[0] === null) return null;
  const r = new TreeNode(a[0]);
  const q = [r];
  let i = 1,
    h = 0;
  while (i < a.length) {
    const n = q[h++];
    if (a[i] != null) {
      n.left = new TreeNode(a[i]);
      q.push(n.left);
    }
    i++;
    if (i < a.length && a[i] != null) {
      n.right = new TreeNode(a[i]);
      q.push(n.right);
    }
    i++;
  }
  return r;
}
function fromTree(r) {
  const o = [],
    q = [r];
  let h = 0;
  while (h < q.length) {
    const n = q[h++];
    if (!n) {
      o.push(null);
      continue;
    }
    o.push(n.val);
    q.push(n.left, n.right);
  }
  while (o.length && o[o.length - 1] === null) o.pop();
  return o;
}
let cycNodes = null;
function toCycle(a) {
  const [vals, pos] = a;
  const nodes = vals.map((v) => new ListNode(v));
  nodes.forEach((n, i) => (n.next = nodes[i + 1] || null));
  if (pos >= 0 && nodes.length) nodes[nodes.length - 1].next = nodes[pos];
  cycNodes = nodes;
  return nodes[0] || null;
}
function norm(v, how) {
  if (how === 'unordered' && Array.isArray(v))
    return JSON.stringify(
      v.map((x) => JSON.stringify(Array.isArray(x) ? [...x].sort((a, b) => (a > b) - (a < b)) : x)).sort(),
    );
  if (how === 'sorted' && Array.isArray(v)) return JSON.stringify([...v].sort((a, b) => (a > b) - (a < b)));
  return JSON.stringify(v);
}
function same(a, b, how) {
  if (how === 'float') return typeof a === 'number' && Math.abs(a - b) < 1e-6;
  return norm(a, how) === norm(b, how);
}
function run(data) {
  const { code, fn, tests, compare, adapt, checker } = data;
  let chk = null;
  if (checker) {
    try {
      chk = new Function('return (' + checker + ')')();
    } catch (err) {
      return { error: 'compile', message: 'checker: ' + err.message };
    }
  }
  let f;
  try {
    f = new Function(
      'ListNode',
      'TreeNode',
      code +
        '\n;return typeof ' +
        fn +
        ' === "function" ? ' +
        fn +
        ' : (typeof ' +
        fn +
        ' !== "undefined" ? ' +
        fn +
        ' : undefined);',
    )(ListNode, TreeNode);
  } catch (err) {
    return { error: 'compile', message: String((err && err.message) || err) };
  }
  if (typeof f !== 'function' && !(f && f.prototype))
    return { error: 'missing', message: 'No function or class named ' + fn + ' was found.' };
  const results = [];
  for (const t of tests) {
    let args = t.args ? JSON.parse(JSON.stringify(t.args)) : [];
    if (adapt && adapt.args)
      args = args.map((a, i) =>
        adapt.args[i] === 'list'
          ? toList(a)
          : adapt.args[i] === 'tree'
            ? toTree(a)
            : adapt.args[i] === 'badfn'
              ? (
                  (first) => (v) =>
                    v >= first
                )(a)
              : adapt.args[i] === 'cycle'
                ? toCycle(a)
                : a,
      );
    let got;
    const capture = captureLogs();
    const ms = performance.now ? performance.now() : Date.now();
    try {
      if (t.ops) {
        // class-style test: [['ClassName', ...ctorArgs], ['method', ...args], ...]
        const inst = new f(...t.ops[0].slice(1));
        got = [null];
        for (const op of t.ops.slice(1)) {
          const r = inst[op[0]](...op.slice(1));
          got.push(r === undefined ? null : r);
        }
      } else got = f(...args);
      if (adapt && adapt.ret === 'list') got = fromList(got);
      if (adapt && adapt.ret === 'tree') got = fromTree(got);
      if (adapt && adapt.ret === 'nodeIndex') got = got == null ? -1 : cycNodes.indexOf(got);
      if (adapt && adapt.ret === 'arg0') got = args[0];
      if (adapt && adapt.ret === 'arg0prefix') got = Array.isArray(args[0]) ? args[0].slice(0, got) : got;
    } catch (err) {
      capture.restore();
      results.push({
        ok: false,
        error: String((err && err.message) || err),
        ...(capture.logs.length ? { log: capture.logs } : {}),
        ms: Math.round((performance.now ? performance.now() : Date.now()) - ms),
      });
      continue;
    }
    capture.restore();
    let good;
    try {
      good = chk
        ? !!chk(got, t.args ? JSON.parse(JSON.stringify(t.args)) : [], t.expect)
        : same(got, t.expect, compare);
    } catch {
      good = false;
    }
    results.push({
      ok: good,
      got: got === undefined ? 'undefined' : JSON.stringify(got),
      ...(capture.logs.length ? { log: capture.logs } : {}),
      ms: Math.round((performance.now ? performance.now() : Date.now()) - ms),
    });
  }
  return { results };
}

// Legacy module guard, minus the network reach it never had.
self.onmessage = (event) => {
  const data = event.data;
  if (data === 'ping') {
    post('pong');
    return;
  }
  if (data && data.type === 'run') {
    post(run(data));
    return;
  }
  post({ error: 'compile', message: 'Unknown message' });
};
