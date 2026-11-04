// Spike of the code runner: learner code goes through new Function inside a dedicated static Worker.
self.onmessage = async (e) => {
  const out = { ran: null, evalAllowed: null, fetchBlocked: null, importScriptsCrossBlocked: null, indexedDBPresentBefore: typeof indexedDB !== 'undefined', cachesPresentBefore: typeof caches !== 'undefined', indexedDBAfterLockdown: null, viaFunctionThis: null };
  try { out.ran = new Function('a', 'b', e.data.code)(2, 3); out.evalAllowed = true; } catch (err) { out.evalAllowed = false; out.ran = String(err); }
  try { await fetch(e.data.url); out.fetchBlocked = false; } catch { out.fetchBlocked = true; }
  try { importScripts('https://cdn.jsdelivr.net/npm/left-pad@1.3.0/index.js'); out.importScriptsCrossBlocked = false; } catch { out.importScriptsCrossBlocked = true; }
  for (const name of ['indexedDB', 'caches', 'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts']) {
    try { Object.defineProperty(self, name, { value: undefined, configurable: false, writable: false }); } catch { /* try prototype next */ }
    let p = Object.getPrototypeOf(self); while (p) { try { if (Object.getOwnPropertyDescriptor(p, name)) Object.defineProperty(p, name, { value: undefined, configurable: false, writable: false }); } catch {} p = Object.getPrototypeOf(p); }
  }
  out.indexedDBAfterLockdown = typeof indexedDB;
  try { out.viaFunctionThis = String(typeof new Function('return this')().indexedDB); } catch (err) { out.viaFunctionThis = 'threw ' + err; }
  self.postMessage(out);
};
