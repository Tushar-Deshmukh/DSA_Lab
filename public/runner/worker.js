// Learner-code runner (decision D-007). Pages may not eval; this file is served with its own policy
// (script-src 'self' 'unsafe-eval'; connect-src 'none'), so learner code can run here but cannot reach the network.
// Before any learner code runs, storage, messaging and worker globals are removed too. Phase 4 adds the test
// harness (adapters, comparison modes, class tests); this is the isolated core it will run in.
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

const MAX_LOG_LINES = 200;
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

function cloneable(value) {
  try {
    return structuredClone(value);
  } catch {
    return show(value);
  }
}

self.onmessage = (event) => {
  const { code, args } = event.data || {};
  const logs = [];
  const capture =
    (prefix) =>
    (...parts) => {
      if (logs.length < MAX_LOG_LINES)
        logs.push((prefix + parts.map(show).join(' ')).slice(0, MAX_LINE_CHARS));
    };
  console.log = capture('');
  console.info = capture('');
  console.warn = capture('warning: ');
  console.error = capture('error: ');
  let result;
  try {
    const fn = new Function('...args', String(code));
    const value = fn(...(Array.isArray(args) ? args : []));
    result = { ok: true, value: cloneable(value), logs };
  } catch (err) {
    result = { ok: false, error: err instanceof Error ? `${err.name}: ${err.message}` : show(err), logs };
  }
  post({ type: 'result', result });
};
