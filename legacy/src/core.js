// Core: DOM helper, persistent store (Claude account -> browser -> memory), router, toasts.
(function (g) {
  'use strict';
  const esc = g.HL.esc;

  // el('div.card#id', {onclick, html, class, ...attrs}, ...children)
  function el(sel, attrs, ...kids) {
    const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const node = document.createElement(m[1] || 'div');
    (m[2].match(/[.#][\w-]+/g) || []).forEach((p) => (p[0] === '.' ? node.classList.add(p.slice(1)) : (node.id = p.slice(1))));
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'class') String(v).split(/\s+/).filter(Boolean).forEach((c) => node.classList.add(c));
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, v);
    }
    for (const k of kids.flat(Infinity)) {
      if (k == null || k === false) continue;
      node.append(k instanceof Node ? k : document.createTextNode(String(k)));
    }
    return node;
  }
  const htmlEl = (html, cls) => el('div', { class: cls || '', html });

  // ---------------- storage ----------------
  const LS_KEY = 'dsa-course-v1';
  const blank = () => ({
    v: 1, updatedAt: 0,
    settings: { startDate: '2026-11-02', track: '', theme: '' },
    lessons: {},        // id -> {done, doneAt, checks:{}}
    ex: {},             // exercise id -> {attempts, solved, firstTry, hints, revealed, lastWrong, lastAt}
    journal: {},        // problem num -> entry
    mistakes: [],       // {at, code, note, src}
    reflections: {},    // w1.. -> {went, hard, change, confidence}
    scorecards: {},     // w1.. -> manual fields
    diag: {},           // diagnostic answers
    assess: {},         // A1..A6 -> {scores, notes}
    mocks: {},          // 1..6 -> rubric
    checklist: {},      // item -> bool
    quiz: {},           // revision quiz log
  });
  function mergeDeep(base, add) {
    if (!add || typeof add !== 'object' || Array.isArray(add)) return add === undefined ? base : add;
    const out = Array.isArray(base) ? [...base] : { ...base };
    for (const [k, v] of Object.entries(add)) out[k] = (v && typeof v === 'object' && !Array.isArray(v) && base && typeof base[k] === 'object' && !Array.isArray(base[k])) ? mergeDeep(base[k], v) : v;
    return out;
  }
  // Cloud layout (per user, private): core + journal-w0..w12 + ex-w0..w12, so no document
  // approaches the 256 KiB limit and each save rewrites only the week that changed.
  const WEEKS = 12;
  const weekOfProblem = (num) => (g.COURSE && g.COURSE.problemWeek[num]) || 0;
  const weekOfEx = (id) => { const m = /^w(\d+)/.exec(id); return m ? Number(m[1]) : 0; };
  const SPLIT = { journal: weekOfProblem, ex: weekOfEx };
  const ALL_DOCS = ['core', ...Object.keys(SPLIT).flatMap((k) => Array.from({ length: WEEKS + 1 }, (_, i) => k + '-w' + i))];

  const Store = {
    state: blank(), mode: 'memory', listeners: new Set(), cloud: null, uid: null, localOK: false,
    status() {
      return this.mode === 'cloud' ? { cls: 'ok', text: 'Saved to your Claude account', long: 'Progress is saved to your own private space in this artifact and follows you to any device where you open it signed in. A copy is also kept in this browser.' }
        : this.mode === 'local' ? { cls: 'local', text: 'Saved in this browser', long: 'Progress is saved in this browser on this device only. It does not sync to other devices or browsers, and clearing site data erases it. Use Export backup to move it.' }
          : { cls: 'none', text: 'Not saving', long: 'This browser is blocking storage (private window or blocked site data), so progress lasts only until you close the page. Use Export backup before leaving.' };
    },
    initLocal() {
      try {
        const k = '__probe__'; localStorage.setItem(k, '1'); localStorage.removeItem(k); this.localOK = true;
        const raw = localStorage.getItem(LS_KEY);
        if (raw) this.state = mergeDeep(blank(), JSON.parse(raw));
        this.mode = 'local';
      } catch (e) { this.localOK = false; this.mode = 'memory'; }
    },
    async initCloud() {
      if (!g.claude || typeof g.claude.use !== 'function') return;
      try {
        const [db, user] = await Promise.all([g.claude.use('db'), g.claude.use('user')]);
        if (!db || !user) return;
        const uid = await user.id();
        if (!uid) return;
        const base = 'data/users/' + uid;
        const snaps = await Promise.all(ALL_DOCS.map((d) => db.doc(base + '/' + d).get()));
        const core = snaps[0];
        let cloudState = null;
        if (core.exists) {
          cloudState = mergeDeep(blank(), core.data());
          for (const k of Object.keys(SPLIT)) cloudState[k] = {};
          ALL_DOCS.forEach((d, i) => { if (i && snaps[i].exists) Object.assign(cloudState[d.split('-w')[0]], snaps[i].data().entries || {}); });
        }
        this.cloud = db; this.uid = uid; this.base = base; this.mode = 'cloud';
        if (cloudState && (cloudState.updatedAt || 0) >= (this.state.updatedAt || 0)) {
          this.state = cloudState; this.writeLocal(); this.emit();
        } else if (this.state.updatedAt) {
          this.dirty = new Set(ALL_DOCS);
          this.flush();
        }
        this.emit();
      } catch (e) { console.warn('cloud storage unavailable', e); }
    },
    writeLocal() { if (!this.localOK) return; try { localStorage.setItem(LS_KEY, JSON.stringify(this.state)); } catch (e) { /* quota or blocked */ } },
    get(path, dflt) {
      let o = this.state;
      for (const p of path.split('.')) { if (o == null) return dflt; o = o[p]; }
      return o === undefined ? dflt : o;
    },
    // set('ex.w2d1-q1', {...}) ; marks the right cloud doc dirty
    set(path, value) {
      const parts = path.split('.');
      let o = this.state;
      for (let i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
      if (value === undefined) delete o[parts.at(-1)]; else o[parts.at(-1)] = value;
      this.touch(SPLIT[parts[0]] && parts[1] ? parts[0] + '-w' + SPLIT[parts[0]](parts[1]) : SPLIT[parts[0]] ? null : 'core');
    },
    update(path, patch) { this.set(path, Object.assign({}, this.get(path, {}), patch)); },
    touch(doc) {
      this.state.updatedAt = Date.now();
      this.writeLocal();
      if (doc) (this.dirty ||= new Set()).add(doc); else this.dirty = new Set(ALL_DOCS);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), 1200);
      this.emit();
    },
    async flush() {
      if (this.mode !== 'cloud' || !this.dirty || this.writing) return;
      const docs = [...this.dirty]; this.dirty.clear(); this.writing = true;
      try {
        for (const d of docs) {
          let body;
          if (d === 'core') { body = { ...this.state }; for (const k of Object.keys(SPLIT)) delete body[k]; }
          else {
            const [k, wk] = d.split('-w'); const w = Number(wk); const entries = {};
            for (const [id, v] of Object.entries(this.state[k] || {})) if (SPLIT[k](id) === w) entries[id] = v;
            body = { entries, updatedAt: this.state.updatedAt };
          }
          try { await this.cloud.doc(this.base + '/' + d).set(JSON.parse(JSON.stringify(body))); }
          catch (e) {
            if (e && (e.code === 'unavailable')) { this.dirty.add(d); }
            else { console.warn('save failed', e); if (e && (e.code === 'invalid_argument' || e.code === 'revoked' || e.code === 'not_granted')) { this.mode = this.localOK ? 'local' : 'memory'; this.emit(); } }
          }
        }
      } finally { this.writing = false; }
      if (this.dirty.size) { clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), 2500 + Math.random() * 1000); }
    },
    replaceAll(obj) {
      this.state = mergeDeep(blank(), obj); this.state.updatedAt = Date.now(); this.writeLocal();
      this.dirty = new Set(ALL_DOCS);
      this.flush(); this.emit();
    },
    resetAll() { this.replaceAll(blank()); },
    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
    emit() { this.listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); },
  };

  // ---------------- downloads ----------------
  async function saveFile(filename, text, mime = 'application/json') {
    try {
      if (g.claude && g.claude.use) {
        const dl = await Promise.race([g.claude.use('downloads'), new Promise((r) => setTimeout(() => r(null), 1500))]);
        if (dl) { await dl.save({ filename, data: new Blob([text], { type: mime }) }); return 'saved'; }
      }
    } catch (e) { if (e && e.code === 'declined') return 'declined'; }
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = filename;
      document.body.append(a); a.click(); a.remove();
      return 'link';
    } catch (e) { return 'failed'; }
  }

  // ---------------- toast ----------------
  let toastTimer;
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = el('div.toast', { role: 'status' }); document.body.append(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2600);
  }

  // ---------------- dates ----------------
  const DAY = 86400000;
  const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const fmt = (d) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const daysBetween = (a, b) => Math.round((b - a) / DAY);

  g.Core = { el, htmlEl, esc, Store, saveFile, toast, dates: { parseISO, iso, addDays, fmt, today, daysBetween, DAY } };
})(window);
