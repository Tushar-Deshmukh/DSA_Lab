// Exercise engine: every exercise accepts real input, validates it, explains the result,
// offers a hint ladder before revealing, allows retry and reset, and records attempts.
(function (g) {
  'use strict';
  const { el, Store, toast } = g.Core;
  const { highlight, esc } = g.HL;

  const KIND_LABEL = {
    mcq: 'Concept check', pattern: 'Choose the pattern', complexity: 'Complexity challenge', predict: 'Predict the output',
    bug: 'Find the bug', fill: 'Fill in the missing code', trace: 'Manual dry run', code: 'Write the code', interview: 'Interview problem', recall: 'Warm-up recall',
  };
  const COMPLEXITIES = ['O(1)', 'O(log n)', 'O(√n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)', 'O(2ⁿ)', 'O(n!)'];

  // ---------- record keeping ----------
  function rec(id) { return Store.get('ex.' + id, null) || { attempts: 0, solved: false, firstTry: null, hints: 0, revealed: false }; }
  function saveRec(id, r) { r.lastAt = Date.now(); Store.set('ex.' + id, r); }
  function markAttempt(id, ok, meta = {}) {
    const r = rec(id);
    r.attempts += 1;
    if (r.firstTry === null) r.firstTry = ok && !r.revealed && !r.hints;
    if (ok) { r.solved = true; r.solvedAt = Date.now(); }
    else { r.lastWrong = Date.now(); r.wrongCount = (r.wrongCount || 0) + 1; if (meta.kind) r.lastKind = meta.kind; }
    saveRec(id, r);
    return r;
  }

  // ---------- code runner (Web Worker with a time limit; main-thread fallback) ----------
  const WORKER_SRC = `
    function ListNode(val = 0, next = null) { this.val = val; this.next = next; }
    function TreeNode(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
    function toList(a) { const d = new ListNode(); let t = d; for (const v of a) { t.next = new ListNode(v); t = t.next; } return d.next; }
    function fromList(h) { const o = []; let guard = 0; while (h && guard++ < 100000) { o.push(h.val); h = h.next; } return o; }
    function toTree(a) { if (!a.length || a[0] === null) return null; const r = new TreeNode(a[0]); const q = [r]; let i = 1, h = 0;
      while (i < a.length) { const n = q[h++]; if (a[i] != null) { n.left = new TreeNode(a[i]); q.push(n.left); } i++; if (i < a.length && a[i] != null) { n.right = new TreeNode(a[i]); q.push(n.right); } i++; } return r; }
    function fromTree(r) { const o = [], q = [r]; let h = 0; while (h < q.length) { const n = q[h++]; if (!n) { o.push(null); continue; } o.push(n.val); q.push(n.left, n.right); } while (o.length && o[o.length - 1] === null) o.pop(); return o; }
    let cycNodes = null;
    function toCycle(a) { const [vals, pos] = a; const nodes = vals.map((v) => new ListNode(v)); nodes.forEach((n, i) => (n.next = nodes[i + 1] || null)); if (pos >= 0 && nodes.length) nodes[nodes.length - 1].next = nodes[pos]; cycNodes = nodes; return nodes[0] || null; }
    function norm(v, how) {
      if (how === 'unordered' && Array.isArray(v)) return JSON.stringify(v.map((x) => JSON.stringify(Array.isArray(x) ? [...x].sort((a, b) => (a > b) - (a < b)) : x)).sort());
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
      if (checker) { try { chk = new Function('return (' + checker + ')')(); } catch (err) { return { error: 'compile', message: 'checker: ' + err.message }; } }
      let f;
      try { f = new Function('ListNode', 'TreeNode', code + '\\n;return typeof ' + fn + ' === "function" ? ' + fn + ' : (typeof ' + fn + ' !== "undefined" ? ' + fn + ' : undefined);')(ListNode, TreeNode); }
      catch (err) { return { error: 'compile', message: String(err && err.message || err) }; }
      if (typeof f !== 'function' && !(f && f.prototype)) return { error: 'missing', message: 'No function or class named ' + fn + ' was found.' };
      const results = [];
      for (const t of tests) {
        let args = t.args ? JSON.parse(JSON.stringify(t.args)) : [];
        if (adapt && adapt.args) args = args.map((a, i) => adapt.args[i] === 'list' ? toList(a) : adapt.args[i] === 'tree' ? toTree(a) : adapt.args[i] === 'badfn' ? ((first) => (v) => v >= first)(a) : adapt.args[i] === 'cycle' ? toCycle(a) : a);
        let got;
        try {
          if (t.ops) { // class-style test: [['ClassName', ...ctorArgs], ['method', ...args], ...]
            const inst = new f(...t.ops[0].slice(1)); got = [null];
            for (const op of t.ops.slice(1)) { const r = inst[op[0]](...op.slice(1)); got.push(r === undefined ? null : r); }
          } else got = f(...args);
          if (adapt && adapt.ret === 'list') got = fromList(got);
          if (adapt && adapt.ret === 'tree') got = fromTree(got);
          if (adapt && adapt.ret === 'nodeIndex') got = got == null ? -1 : cycNodes.indexOf(got);
          if (adapt && adapt.ret === 'arg0') got = args[0];
          if (adapt && adapt.ret === 'arg0prefix') got = (Array.isArray(args[0]) ? args[0].slice(0, got) : got);
        } catch (err) { results.push({ ok: false, error: String(err && err.message || err) }); continue; }
        let good;
        try { good = chk ? !!chk(got, t.args ? JSON.parse(JSON.stringify(t.args)) : [], t.expect) : same(got, t.expect, compare); } catch (err) { good = false; }
        results.push({ ok: good, got: got === undefined ? 'undefined' : JSON.stringify(got) });
      }
      return { results };
    }
    self.onmessage = (e) => { if (e.data === 'ping') { self.postMessage('pong'); return; } self.postMessage(run(e.data)); };
    if (typeof module !== 'undefined') module.exports = { run };
  `;
  let workerOK = null; // null unknown, true, false
  function probeWorker() {
    if (workerOK !== null) return Promise.resolve(workerOK);
    return new Promise((resolve) => {
      try {
        const w = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
        const t = setTimeout(() => { w.terminate(); workerOK = false; resolve(false); }, 2500);
        w.onmessage = () => { clearTimeout(t); w.terminate(); workerOK = true; resolve(true); };
        w.onerror = () => { clearTimeout(t); w.terminate(); workerOK = false; resolve(false); };
        w.postMessage('ping');
      } catch (e) { workerOK = false; resolve(false); }
    });
  }
  let mainRun = null;
  async function runCode(job, limitMs = 3000) {
    if (await probeWorker()) {
      return new Promise((resolve) => {
        const w = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
        const t = setTimeout(() => { w.terminate(); resolve({ error: 'timeout', message: 'Stopped after ' + limitMs / 1000 + ' s: probably an infinite loop (check the loop condition and that pointers move).' }); }, limitMs);
        w.onmessage = (e) => { clearTimeout(t); w.terminate(); resolve(e.data); };
        w.onerror = (e) => { clearTimeout(t); w.terminate(); resolve({ error: 'compile', message: e.message }); };
        w.postMessage(job);
      });
    }
    if (!mainRun) { const m = { exports: {} }; new Function('module', 'self', WORKER_SRC)(m, {}); mainRun = m.exports.run; }
    try { return mainRun(job); } catch (e) { return { error: 'compile', message: String(e.message || e) }; }
  }

  // ---------- shared UI pieces ----------
  const fbBox = (cls, tag, html) => el('div.fb.' + cls, el('span.tag', tag), el('div', { html }));
  function codeBlock(code) { return el('pre.code', el('code', { html: highlight(code).join('\n') })); }
  function statusText(r) {
    if (r.revealed && !r.solved) return 'Answer viewed';
    if (r.solved && r.revealedUnsolved) return 'Solved after viewing the answer: retry later';
    if (r.solved) return r.firstTry ? 'Solved first try' : 'Solved after ' + r.attempts + ' tries';
    if (r.attempts) return 'Tried ' + r.attempts + '×';
    return 'Not tried';
  }

  // Frame: header + body + hint ladder + reveal + reset; type renderers fill `body` and call api.
  function frame(ex, renderBody) {
    const id = ex.id;
    const root = el('section.ex', { id: 'ex-' + id, 'data-ex': id });
    const status = el('span.status');
    const head = el('div.ex-head', el('span.kind', KIND_LABEL[ex.type] || 'Exercise'), ex.tag ? el('span', ex.tag) : null, status);
    const body = el('div.ex-body');
    const fbArea = el('div.stack', { style: { gap: '8px' } });
    const hintArea = el('div.hintbox');
    const actions = el('div.ex-actions');
    root.append(head, body);
    const refresh = () => {
      const r = rec(id);
      status.textContent = statusText(r);
      root.classList.toggle('right', !!r.solved);
    };
    let shownHints = 0;
    const hints = ex.hints || [];
    const hintBtn = hints.length ? el('button.btn.small', { type: 'button', onclick: () => {
      if (shownHints >= hints.length) return;
      hintArea.append(fbBox('hint', 'Hint ' + (shownHints + 1) + ' of ' + hints.length, hints[shownHints]));
      shownHints++;
      const r = rec(id); r.hints = Math.max(r.hints || 0, shownHints); saveRec(id, r);
      hintBtn.textContent = shownHints >= hints.length ? 'No more hints' : 'Hint ' + (shownHints + 1);
      hintBtn.disabled = shownHints >= hints.length;
    } }, 'Hint 1') : null;
    let revealFn = null;
    const revealBtn = el('button.btn.small.ghost', { type: 'button', onclick: () => {
      if (!revealFn) return;
      const r = rec(id); if (!r.solved) r.revealedUnsolved = true; r.revealed = true; saveRec(id, r); refresh();
      revealFn(); revealBtn.disabled = true;
    } }, 'Show answer');
    const resetBtn = el('button.btn.small.ghost', { type: 'button', onclick: () => { api.reset(); } }, 'Reset');
    const api = {
      root, body, fbArea, actions,
      feedback(cls, tag, html) { fbArea.replaceChildren(fbBox(cls, tag, html)); },
      addFeedback(cls, tag, html) { fbArea.append(fbBox(cls, tag, html)); },
      clearFeedback() { fbArea.replaceChildren(); },
      attempt(ok, meta) { const r = markAttempt(id, ok, meta); refresh(); root.classList.toggle('wrong', !ok); if (ok) root.classList.remove('wrong'); return r; },
      onReveal(fn) { revealFn = fn; },
      reset() { shownHints = 0; hintArea.replaceChildren(); if (hintBtn) { hintBtn.disabled = false; hintBtn.textContent = 'Hint 1'; } revealBtn.disabled = false; fbArea.replaceChildren(); root.classList.remove('wrong'); body.replaceChildren(); renderBody(api); body.append(actions, hintArea, fbArea); }
    };
    actions.append(...[hintBtn, revealBtn, resetBtn].filter(Boolean));
    renderBody(api);
    body.append(actions, hintArea, fbArea);
    refresh();
    return root;
  }
  const prependActions = (api, ...btns) => { api.actions.prepend(...btns.filter(Boolean)); };

  // ---------- MCQ / pattern / recall ----------
  function mcq(ex) {
    return frame(ex, (api) => {
      api.actions.replaceChildren(...[...api.actions.children]);
      if (ex.q) api.body.append(el('div.ex-q', { html: ex.q }));
      if (ex.code) api.body.append(codeBlock(ex.code));
      const multi = ex.options.filter((o) => o.ok).length > 1 || ex.multi;
      const box = el('div.opts', { role: multi ? 'group' : 'radiogroup' });
      const picked = new Set();
      const btns = ex.options.map((o, i) => {
        const b = el('button.opt', { type: 'button', 'aria-pressed': 'false', onclick: () => {
          if (box.dataset.locked) return;
          if (!multi) { picked.clear(); btns.forEach((x) => { x.classList.remove('sel'); x.setAttribute('aria-pressed', 'false'); }); }
          if (picked.has(i)) { picked.delete(i); b.classList.remove('sel'); b.setAttribute('aria-pressed', 'false'); }
          else { picked.add(i); b.classList.add('sel'); b.setAttribute('aria-pressed', 'true'); }
        } }, el('span.mk', String.fromCharCode(65 + i)), el('span', { html: o.t }));
        return b;
      });
      box.append(...btns);
      api.body.append(box);
      if (multi) api.body.append(el('div.small.muted.ui', 'Select every option that applies.'));
      const check = el('button.btn.primary.small', { type: 'button', onclick: () => {
        if (!picked.size) { api.feedback('info', 'Pick an answer', 'Choose an option first, then check it.'); return; }
        const correct = new Set(ex.options.map((o, i) => (o.ok ? i : -1)).filter((i) => i >= 0));
        const ok = picked.size === correct.size && [...picked].every((i) => correct.has(i));
        btns.forEach((b, i) => { b.classList.remove('ok', 'bad'); if (picked.has(i)) b.classList.add(correct.has(i) ? 'ok' : 'bad'); });
        const parts = [...picked].map((i) => {
          const o = ex.options[i];
          const label = o.ok ? '' : o.kind === 'impl' ? '<b>Implementation slip.</b> ' : o.kind === 'concept' ? '<b>Conceptual mistake.</b> ' : '';
          return '<p><b>' + String.fromCharCode(65 + i) + '.</b> ' + label + (o.why || (o.ok ? 'Correct.' : 'Not this one.')) + '</p>';
        });
        api.attempt(ok, { kind: [...picked].map((i) => ex.options[i].kind).find(Boolean) });
        if (ok) { api.feedback('ok', 'Correct', parts.join('') + (ex.explain ? '<p>' + ex.explain + '</p>' : '') + (ex.clues ? '<p><b>Clues to notice:</b> ' + ex.clues + '</p>' : '')); box.dataset.locked = '1'; btns.forEach((b) => b.classList.add('locked')); }
        else {
          const missing = [...correct].filter((i) => !picked.has(i)).length && multi ? '<p>At least one correct option is still unselected.</p>' : '';
          api.feedback('bad', 'Not yet', parts.join('') + missing + '<p>Change your choice and check again, or take a hint.</p>');
        }
      } }, 'Check');
      prependActions(api, check);
      api.onReveal(() => {
        btns.forEach((b, i) => { b.classList.remove('sel', 'bad'); if (ex.options[i].ok) b.classList.add('ok'); });
        box.dataset.locked = '1';
        api.feedback('info', 'Answer', ex.options.map((o, i) => o.ok ? '<p><b>' + String.fromCharCode(65 + i) + '.</b> ' + (o.why || '') + '</p>' : '').join('') + (ex.explain ? '<p>' + ex.explain + '</p>' : '') + (ex.clues ? '<p><b>Clues to notice:</b> ' + ex.clues + '</p>' : ''));
      });
    });
  }

  // ---------- complexity ----------
  function complexity(ex) {
    return frame(ex, (api) => {
      if (ex.q) api.body.append(el('div.ex-q', { html: ex.q }));
      if (ex.code) api.body.append(codeBlock(ex.code));
      const sels = ex.fields.map((f, k) => {
        const s = el('select.ex-input', { id: 'cx-' + ex.id + '-' + k, 'aria-label': f.label }, el('option', { value: '' }, 'Choose…'), ...(f.options || COMPLEXITIES).map((o) => el('option', { value: o }, o)));
        return { f, s, wrap: el('label.ui.small', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, f.label, s) };
      });
      api.body.append(el('div.row', ...sels.map((x) => x.wrap)));
      const check = el('button.btn.primary.small', { type: 'button', onclick: () => {
        if (sels.some((x) => !x.s.value)) { api.feedback('info', 'Pick every field', 'Choose a complexity for each field.'); return; }
        let ok = true; const notes = [];
        for (const { f, s } of sels) {
          const good = (Array.isArray(f.answer) ? f.answer : [f.answer]).includes(s.value);
          s.classList.toggle('ok', good); s.classList.toggle('bad', !good);
          if (!good) { ok = false; notes.push('<p><b>' + f.label + ':</b> ' + ((f.why && f.why[s.value]) || 'Not ' + s.value + '. Count how many times the innermost work runs as n grows.') + '</p>'); }
        }
        api.attempt(ok, { kind: 'concept' });
        api.feedback(ok ? 'ok' : 'bad', ok ? 'Correct' : 'Not yet', ok ? (ex.explain || '') : notes.join('') + '<p>Adjust and check again.</p>');
      } }, 'Check');
      prependActions(api, check);
      api.onReveal(() => { sels.forEach(({ f, s }) => { s.value = Array.isArray(f.answer) ? f.answer[0] : f.answer; s.classList.add('ok'); s.classList.remove('bad'); }); api.feedback('info', 'Answer', ex.explain || ''); });
    });
  }

  // ---------- predict the output ----------
  // exact: compare line by line, ignoring leading/trailing spaces on each line;
  // default: ignore all whitespace and case, treat ' and " alike.
  const normOut = (s, how) => {
    s = String(s).replace(/\r/g, '').trim();
    if (how === 'exact') return s.split('\n').map((l) => l.trim()).filter((l, i, a) => l || i < a.length - 1).join('\n');
    return s.replace(/\s+/g, '').replace(/'/g, '"').toLowerCase();
  };
  function predict(ex) {
    return frame(ex, (api) => {
      if (ex.q) api.body.append(el('div.ex-q', { html: ex.q }));
      api.body.append(codeBlock(ex.code));
      const multi = (Array.isArray(ex.answer) ? ex.answer : [ex.answer]).some((a) => String(a).includes('\n'));
      const inp = multi
        ? el('textarea.ex-input', { id: 'pr-' + ex.id, rows: String(ex.answer).split('\n').length + 1, placeholder: ex.placeholder || 'One line per console.log call', 'aria-label': 'Your predicted output', style: { width: '100%', fontFamily: 'var(--f-code)' } })
        : el('input.ex-input', { id: 'pr-' + ex.id, placeholder: ex.placeholder || 'Type the exact output', 'aria-label': 'Your predicted output', style: { width: '100%' } });
      if (multi) api.body.append(el('div.small.muted.ui', 'This prints more than one line: write one line per console.log call.'));
      api.body.append(inp);
      const accepts = (Array.isArray(ex.answer) ? ex.answer : [ex.answer]).map((a) => normOut(a, ex.normalize));
      const check = el('button.btn.primary.small', { type: 'button', onclick: () => {
        if (!inp.value.trim()) { api.feedback('info', 'Type an answer', 'Write what the code prints, then check.'); return; }
        const v = normOut(inp.value, ex.normalize);
        const ok = accepts.includes(v);
        inp.classList.toggle('ok', ok); inp.classList.toggle('bad', !ok);
        const trap = ex.traps && Object.entries(ex.traps).find(([k]) => normOut(k, ex.normalize) === v);
        api.attempt(ok, { kind: trap ? 'concept' : undefined });
        if (ok) api.feedback('ok', 'Correct', ex.explain);
        else api.feedback('bad', 'Not quite', trap ? trap[1] : 'That is not what it prints. Trace it line by line, writing down each variable, then try again.');
      } }, 'Check');
      if (!multi) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check.click(); });
      prependActions(api, check);
      api.onReveal(() => { inp.value = Array.isArray(ex.answer) ? ex.answer[0] : ex.answer; inp.classList.add('ok'); api.feedback('info', 'Answer', ex.explain); });
    });
  }

  // ---------- find the bug ----------
  function bug(ex) {
    return frame(ex, (api) => {
      if (ex.q) api.body.append(el('div.ex-q', { html: ex.q }));
      const lines = ex.code.split('\n');
      const hl = highlight(ex.code);
      let sel = -1;
      const pick = el('div.codepick', { role: 'listbox', 'aria-label': 'Code lines: pick the buggy line' });
      const btns = lines.map((_, i) => el('button', { type: 'button', role: 'option', onclick: () => { sel = i; btns.forEach((b) => b.classList.remove('sel')); btns[i].classList.add('sel'); } }, el('span.no', String(i + 1)), el('span', { html: hl[i] || ' ' })));
      pick.append(...btns);
      api.body.append(el('div.small.muted.ui', 'Click the line that contains the bug, then check.'), pick);
      const bugs = new Set(ex.bug);
      const check = el('button.btn.primary.small', { type: 'button', onclick: () => {
        if (sel < 0) { api.feedback('info', 'Pick a line', 'Click a line first.'); return; }
        const ok = bugs.has(sel);
        btns.forEach((b) => b.classList.remove('ok', 'bad'));
        btns[sel].classList.add(ok ? 'ok' : 'bad');
        api.attempt(ok, { kind: ex.kind || 'impl' });
        if (ok) api.feedback('ok', 'Found it', ex.explain + (ex.fix ? '<p><b>Fixed version:</b></p>' + '<pre class="code"><code>' + highlight(ex.fix).join('\n') + '</code></pre>' : ''));
        else api.feedback('bad', 'That line is fine', ((ex.fine && ex.fine[sel]) || 'Line ' + (sel + 1) + ' does what it should.') + ' Run the failing input in your head and see where the state first goes wrong.');
      } }, 'Check');
      prependActions(api, check);
      api.onReveal(() => { btns.forEach((b, i) => b.classList.toggle('ok', bugs.has(i))); api.feedback('info', 'Answer', ex.explain + (ex.fix ? '<pre class="code"><code>' + highlight(ex.fix).join('\n') + '</code></pre>' : '')); });
    });
  }

  // ---------- fill in the missing code ----------
  const normCode = (s) => String(s).replace(/\s+/g, '').replace(/;$/, '');
  function fill(ex) {
    return frame(ex, (api) => {
      if (ex.q) api.body.append(el('div.ex-q', { html: ex.q }));
      const box = el('div.fillcode');
      const inputs = [];
      const parts = ex.template.split(/\[\[(\d+)\]\]/);
      parts.forEach((p, i) => {
        if (i % 2 === 0) { const hl = highlight(p).join('\n'); box.append(el('span', { html: hl })); }
        else {
          const k = Number(p); const b = ex.blanks[k];
          const inp = el('input', { id: 'fill-' + ex.id + '-' + k, size: b.w || Math.max(4, (b.accept[0] || '').length + 1), 'aria-label': 'Blank ' + (k + 1), autocomplete: 'off', spellcheck: 'false' });
          inputs[k] = inp; box.append(inp);
        }
      });
      api.body.append(box);
      const check = el('button.btn.primary.small', { type: 'button', onclick: async () => {
        if (inputs.some((x) => !x.value.trim())) { api.feedback('info', 'Fill every blank', 'Each dashed box needs an expression.'); return; }
        const exact = inputs.map((x, k) => ex.blanks[k].accept.map(normCode).includes(normCode(x.value)));
        let code = ''; parts.forEach((p, i) => { code += i % 2 === 0 ? p : inputs[Number(p)].value; });
        if (exact.every(Boolean)) {
          inputs.forEach((x) => { x.classList.add('ok'); x.classList.remove('bad'); });
          api.attempt(true); api.feedback('ok', 'Correct', ex.explain || ''); return;
        }
        if (!ex.tests || !ex.fn) {
          inputs.forEach((x, k) => { x.classList.toggle('ok', exact[k]); x.classList.toggle('bad', !exact[k]); });
          api.attempt(false, { kind: 'impl' }); api.feedback('bad', 'Not yet', 'The highlighted blanks are not right yet.'); return;
        }
        api.feedback('info', 'Running', 'Running your version against the tests…');
        const res = await runCode({ code, fn: ex.fn, tests: ex.tests, compare: ex.compare, adapt: ex.adapt, checker: ex.checker });
        if (res.error) { inputs.forEach((x, k) => x.classList.toggle('bad', !exact[k])); api.attempt(false, { kind: 'impl' }); api.feedback('bad', res.error === 'compile' ? 'Syntax error' : 'Did not finish', esc(res.message)); return; }
        const passed = res.results.filter((r) => r.ok).length;
        const ok = passed === res.results.length;
        inputs.forEach((x, k) => { x.classList.toggle('ok', ok || exact[k]); x.classList.toggle('bad', !ok && !exact[k]); });
        api.attempt(ok, { kind: 'impl' });
        if (ok) api.feedback('ok', 'Correct', 'Your expressions differ from the reference but pass all ' + passed + ' tests. ' + (ex.explain || ''));
        else {
          const fails = res.results.map((r, i) => ({ r, t: ex.tests[i] })).filter((x) => !x.r.ok).slice(0, 3)
            .map((x) => '<code>' + esc(JSON.stringify(x.t.args)) + '</code> → expected <code>' + esc(JSON.stringify(x.t.expect)) + '</code>, got <code>' + esc(x.r.error || x.r.got) + '</code>');
          api.feedback('bad', 'Implementation slip: ' + passed + ' of ' + res.results.length + ' tests pass', fails.join('<br>') + '<p>Trace the first failing input by hand.</p>');
        }
      } }, 'Check');
      prependActions(api, check);
      api.onReveal(() => { inputs.forEach((x, k) => { x.value = ex.blanks[k].accept[0]; x.classList.add('ok'); x.classList.remove('bad'); }); api.feedback('info', 'Answer', ex.explain || ''); });
    });
  }

  // ---------- manual dry run ----------
  function trace(ex) {
    return frame(ex, (api) => {
      if (ex.q) api.body.append(el('div.ex-q', { html: ex.q }));
      if (ex.code) api.body.append(codeBlock(ex.code));
      const grid = el('div.tracegrid');
      const inputs = ex.rows.map((r, k) => {
        const inp = el('input.ex-input', { id: 'tr-' + ex.id + '-' + k, size: r.w || 10, 'aria-label': r.prompt.replace(/<[^>]+>/g, ''), autocomplete: 'off' });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check.click(); });
        grid.append(el('div', { html: r.prompt }), inp);
        return inp;
      });
      api.body.append(grid);
      const check = el('button.btn.primary.small', { type: 'button', onclick: () => {
        if (inputs.some((x) => !x.value.trim())) { api.feedback('info', 'Fill every row', 'Predict each value before checking.'); return; }
        const res = inputs.map((x, k) => (Array.isArray(ex.rows[k].answer) ? ex.rows[k].answer : [ex.rows[k].answer]).map((a) => normOut(a)).includes(normOut(x.value)));
        res.forEach((ok, k) => { inputs[k].classList.toggle('ok', ok); inputs[k].classList.toggle('bad', !ok); });
        const ok = res.every(Boolean);
        api.attempt(ok, { kind: 'concept' });
        if (ok) api.feedback('ok', 'All rows correct', ex.explain || '');
        else {
          const first = res.indexOf(false);
          api.feedback('bad', (res.filter(Boolean).length) + ' of ' + res.length + ' rows correct', 'The first wrong row is row ' + (first + 1) + '. ' + (ex.rows[first].why ? 'Look again at: ' + ex.rows[first].why : 'Re-trace from the last row you got right.'));
        }
      } }, 'Check');
      prependActions(api, check);
      api.onReveal(() => { inputs.forEach((x, k) => { x.value = Array.isArray(ex.rows[k].answer) ? ex.rows[k].answer[0] : ex.rows[k].answer; x.classList.add('ok'); x.classList.remove('bad'); }); api.feedback('info', 'Answer', ex.rows.map((r, k) => r.why ? '<p><b>Row ' + (k + 1) + ':</b> ' + r.why + '</p>' : '').join('') + (ex.explain || '')); });
    });
  }

  // ---------- write the code (and the coding part of interview problems) ----------
  function codeRunner(ex, api, opts = {}) {
    const key = 'code-' + ex.id;
    const saved = Store.get('ex.' + ex.id + '.draft', null);
    const ta = el('textarea.editor', { id: 'ed-' + ex.id, spellcheck: 'false', 'aria-label': 'Your JavaScript solution' });
    ta.value = saved || ex.starter || '';
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); }
    });
    let draftTimer;
    ta.addEventListener('input', () => { clearTimeout(draftTimer); draftTimer = setTimeout(() => { const r = rec(ex.id); r.draft = ta.value; saveRec(ex.id, r); }, 800); });
    const out = el('div.tests');
    const visible = ex.tests.filter((t) => !t.hidden);
    const runBtn = el('button.btn.small', { type: 'button', onclick: () => go(visible, false) }, 'Run examples');
    const subBtn = el('button.btn.primary.small', { type: 'button', onclick: () => go(ex.tests, true) }, 'Submit (all ' + ex.tests.length + ' tests)');
    async function go(tests, submit) {
      out.replaceChildren(el('div', 'Running…'));
      const res = await runCode({ code: ta.value, fn: ex.fn, tests, compare: ex.compare, adapt: ex.adapt, checker: ex.checker });
      out.replaceChildren();
      if (res.error) {
        out.append(el('div.bad', (res.error === 'compile' ? 'Syntax error: ' : res.error === 'timeout' ? '' : '') + res.message));
        if (submit) { api.attempt(false, { kind: 'impl' }); api.feedback('bad', res.error === 'compile' ? 'Syntax error' : 'Did not run', 'Fix the error shown above and submit again.'); }
        return;
      }
      res.results.forEach((r, i) => {
        const t = tests[i];
        const label = t.hidden ? 'Hidden test ' + (i + 1) : (t.ops ? 'ops ' + JSON.stringify(t.ops) : 'input ' + JSON.stringify(t.args));
        out.append(el('div.' + (r.ok ? 'ok' : 'bad'), (r.ok ? '✓ ' : '✗ ') + label + (t.hidden && r.ok ? '' : '  expected ' + JSON.stringify(t.expect) + (r.ok ? '' : ', got ' + (r.error ? 'error: ' + r.error : r.got)))));
      });
      const passed = res.results.filter((r) => r.ok).length;
      if (submit) {
        const ok = passed === res.results.length;
        api.attempt(ok, { kind: 'impl' });
        if (ok) api.feedback('ok', 'All ' + passed + ' tests pass', (ex.explain || '') + (opts.after || ''));
        else api.feedback('bad', passed + ' of ' + res.results.length + ' tests pass', 'Read the first failing case, predict what your code does on it by hand, then fix one thing at a time. A wrong answer on an edge case (empty input, one element, duplicates) is an implementation slip; a wrong answer on most cases usually means the approach itself needs rethinking.');
      }
    }
    return { editor: ta, out, runBtn, subBtn, reveal() { ta.value = ex.solution; } };
  }
  function code(ex) {
    return frame(ex, (api) => {
      if (ex.q) api.body.append(el('div.ex-q', { html: ex.q }));
      const cr = codeRunner(ex, api);
      api.body.append(cr.editor, cr.out);
      prependActions(api, cr.runBtn, cr.subBtn);
      api.onReveal(() => { cr.reveal(); api.feedback('info', 'Reference solution loaded into the editor', (ex.explain || '') + '<p>Run it, then close it and rewrite it from memory tomorrow: a viewed solution does not count as solved.</p>'); });
    });
  }

  // ---------- interview problem ----------
  const IVW_STAGES = [
    ['clarify', 'Clarifying questions', 'What would you ask the interviewer? Inputs, sizes, edge cases, output format.'],
    ['brute', 'Brute force and its complexity', 'The most direct correct method, with time and space.'],
    ['optimize', 'Optimisation', 'Which repeated work does the brute force do, and what removes it?'],
    ['edges', 'Edge cases to test', 'List the inputs you will test before submitting.'],
    ['complexity', 'Final complexity', 'Time and space of your optimised solution, with the reason.'],
  ];
  function interview(ex) {
    return frame(ex, (api) => {
      api.body.append(el('div.ex-q', { html: (ex.title ? '<h4 style="font-family:var(--f-ui);font-size:15px;margin-bottom:6px">' + ex.title + '</h4>' : '') + ex.q }));
      const wrap = el('div.steps-ivw');
      const notes = Store.get('ex.' + ex.id + '.notes', {}) || {};
      IVW_STAGES.forEach(([k, label, ph], i) => {
        if (!ex.model || !ex.model[k]) return;
        const ta = el('textarea', { id: 'iv-' + ex.id + '-' + k, placeholder: ph, 'aria-label': label });
        ta.value = notes[k] || '';
        let t; ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { const r = rec(ex.id); r.notes = Object.assign({}, r.notes, { [k]: ta.value }); saveRec(ex.id, r); }, 700); });
        const model = el('div', { hidden: true });
        model.append(fbBox('info', 'What a strong candidate says', ex.model[k]));
        const show = el('button.btn.small', { type: 'button', onclick: () => {
          if (!ta.value.trim()) { toast('Write your own answer first; then compare.'); ta.focus(); return; }
          model.hidden = false; show.disabled = true;
        } }, 'Compare with model answer');
        wrap.append(el('details', { open: i === 0 }, el('summary', (i + 1) + '. ' + label), el('div.stack', { style: { gap: '8px', marginTop: '8px' } }, ta, el('div', show), model)));
      });
      api.body.append(wrap);
      if (ex.fn) {
        const cr = codeRunner(ex, api);
        api.body.append(el('div.panel-label', 'Code it'), cr.editor, cr.out);
        prependActions(api, cr.runBtn, cr.subBtn);
        api.onReveal(() => { cr.reveal(); api.feedback('info', 'Reference solution loaded', (ex.explain || '') + '<p>Viewing the solution is logged. Re-solve it cold in two days before you count it.</p>'); });
      } else api.onReveal(() => api.feedback('info', 'Answer', ex.explain || ''));
    });
  }

  const RENDER = { mcq, pattern: mcq, recall: mcq, complexity, predict, bug, fill, trace, code, interview };
  function render(ex) {
    const fn = RENDER[ex.type];
    if (!fn) return el('div.fb.bad', 'Unknown exercise type ' + ex.type);
    return fn(ex);
  }
  g.Exercises = { render, runCode, rec, KIND_LABEL, WORKER_SRC, probeWorker };
})(window);
