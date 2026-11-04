// Step player shared by every visualizer: editable input, step back/forward, play, reset,
// highlighted code line and an explanation of each decision.
(function (g) {
  'use strict';
  const { el } = g.Core;
  const { highlight } = g.HL;
  const DEFS = {};
  const MAX_STEPS = 600;

  const parsers = {
    array: (s) => { const v = JSON.parse(s.trim().startsWith('[') ? s : '[' + s + ']'); if (!Array.isArray(v)) throw new Error('Enter a list such as 2, 7, 11, 15'); return v; },
    numbers: (s) => { const v = parsers.array(s); if (v.some((x) => typeof x !== 'number' || !isFinite(x))) throw new Error('Use numbers only, separated by commas'); return v; },
    number: (s) => { const v = Number(s); if (!isFinite(v) || String(s).trim() === '') throw new Error('Enter a number'); return v; },
    int: (s) => { const v = Number(s); if (!Number.isInteger(v)) throw new Error('Enter a whole number'); return v; },
    string: (s) => String(s),
    json: (s) => JSON.parse(s),
  };
  const show = (type, v) => (type === 'string' || type === 'select' ? String(v) : type === 'number' || type === 'int' ? String(v) : JSON.stringify(v).replace(/^\[|\]$/g, (m) => (type === 'json' ? m : '')).replace(/,/g, ', '));

  // Code may tag lines with a trailing `//@name`; steps then say line: 'name' (or a list).
  function define(id, def) {
    def.id = id; def.L = {};
    def.code = String(def.code).replace(/^\n+|\s+$/g, '').split('\n').map((ln, i) => {
      const m = ln.match(/\s*\/\/@([\w-]+)\s*$/);
      if (m) { def.L[m[1]] = i + 1; return ln.slice(0, m.index); }
      return ln;
    }).join('\n');
    DEFS[id] = def;
  }
  function resolveLine(def, line) {
    if (line == null) return null;
    const one = (x) => { if (typeof x === 'number') return x; const n = def.L[x]; if (!n) throw new Error('visualizer ' + def.id + ': unknown line tag ' + x); return n; };
    return Array.isArray(line) ? line.map(one) : one(line);
  }

  function runDef(def, input) {
    if (def.validate) { const msg = def.validate(input); if (msg) throw new Error(msg); }
    const steps = def.run(input);
    steps.forEach((s) => { s.line = resolveLine(def, s.line); });
    if (!steps.length) throw new Error('Nothing to show for this input.');
    if (steps.length > MAX_STEPS) throw new Error('This input needs ' + steps.length + ' steps; use a smaller one (at most ' + MAX_STEPS + ').');
    return steps;
  }

  function mount(id, props = {}) {
    const def = DEFS[id];
    if (!def) return el('div.fb.bad', 'Missing visualizer: ' + id);
    const input = {};
    (def.inputs || []).forEach((f) => (input[f.key] = props.input && props.input[f.key] !== undefined ? props.input[f.key] : f.def));
    const root = el('section.viz', { 'data-viz': id });
    const top = el('div.viz-top', el('h4', el('span.lab', 'Visualizer'), props.title || def.title), def.legend ? g.R.legend(def.legend) : null);
    const inputs = el('div.viz-inputs');
    const errBox = el('div.err.small', { hidden: true, role: 'alert' });
    const fields = (def.inputs || []).map((f) => {
      let ctl;
      if (f.type === 'select') ctl = el('select', { id: 'vz-' + id + '-' + f.key + '-' + (props.uid || 0) }, ...f.options.map((o) => el('option', { value: o.value ?? o, selected: (o.value ?? o) === input[f.key] }, o.label ?? o)));
      else ctl = el('input', { id: 'vz-' + id + '-' + f.key + '-' + (props.uid || 0), value: show(f.type, input[f.key]), spellcheck: 'false', autocomplete: 'off' });
      const lab = el('label', { style: { flex: f.wide ? '2 1 240px' : '1 1 120px' } }, f.label, ctl);
      inputs.append(lab);
      return { f, ctl };
    });
    const applyBtn = el('button.btn.small', { type: 'button', onclick: () => rebuild(true) }, 'Run with this input');
    const presetBox = props.presets || def.presets ? el('label', { style: { flex: '1 1 160px' } }, 'Examples', el('select', { onchange: (e) => {
      const p = (props.presets || def.presets)[Number(e.target.value)]; if (!p) return;
      fields.forEach(({ f, ctl }) => { if (p.input[f.key] !== undefined) ctl.value = f.type === 'select' ? p.input[f.key] : show(f.type, p.input[f.key]); });
      rebuild(true);
    } }, el('option', { value: '' }, 'Choose…'), ...(props.presets || def.presets).map((p, i) => el('option', { value: i }, p.label)))) : null;
    if (fields.length) inputs.append(...[presetBox, el('div', applyBtn), errBox].filter(Boolean));

    const stage = el('div.viz-stage', { 'aria-live': 'polite' });
    const codeBox = el('div.viz-code', { 'aria-label': 'Algorithm code' });
    const codeLines = highlight(def.code).map((h, i) => el('div.cl', { html: h || ' ', 'data-line': i + 1 }));
    codeBox.append(...codeLines);
    const note = el('div.viz-note');
    const side = el('div.viz-side', codeBox, note);
    const body = el('div.viz-body', stage, side);

    const prev = el('button.btn.small', { type: 'button', 'aria-label': 'Previous step', onclick: () => go(i - 1) }, '◀ Back');
    const next = el('button.btn.small.primary', { type: 'button', 'aria-label': 'Next step', onclick: () => go(i + 1) }, 'Next ▶');
    const play = el('button.btn.small', { type: 'button', onclick: () => toggle() }, 'Play');
    const reset = el('button.btn.small.ghost', { type: 'button', onclick: () => { stop(); go(0); } }, 'Reset');
    const slider = el('input', { type: 'range', min: 0, max: 0, value: 0, 'aria-label': 'Step', oninput: (e) => go(Number(e.target.value)) });
    const count = el('span.count');
    const controls = el('div.viz-controls', reset, prev, next, play, slider, count);
    root.append(top);
    if (fields.length) root.append(inputs);
    root.append(body, controls);
    root.tabIndex = -1;
    root.addEventListener('keydown', (e) => {
      if (e.target.closest('input,select,textarea')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
    });

    let steps = [], i = 0, timer = null;
    function readInput() {
      const out = {};
      for (const { f, ctl } of fields) {
        try { out[f.key] = f.type === 'select' ? (typeof f.options[0] === 'object' && typeof f.options[0].value === 'number' ? Number(ctl.value) : ctl.value) : parsers[f.type || 'json'](ctl.value); }
        catch (e) { throw new Error(f.label + ': ' + (e.message.startsWith('Unexpected') || e.message.includes('JSON') ? 'could not read this value' : e.message)); }
      }
      return out;
    }
    function rebuild(fromUser) {
      stop();
      let inp = input;
      try { if (fromUser) inp = readInput(); steps = runDef(def, inp); Object.assign(input, inp); errBox.hidden = true; }
      catch (e) { errBox.textContent = e.message; errBox.hidden = false; if (!steps.length) { steps = [{ note: 'Fix the input above to start.' }]; } }
      slider.max = steps.length - 1;
      go(0);
    }
    function go(k) {
      if (k < 0 || k >= steps.length) { if (k >= steps.length) stop(); return; }
      i = k;
      const st = steps[i];
      stage.replaceChildren();
      try { def.render(st, stage, input); } catch (e) { stage.append(el('div.fb.bad', 'Render error: ' + e.message)); console.error(e); }
      codeLines.forEach((c) => c.classList.toggle('on', st.line != null && (Array.isArray(st.line) ? st.line : [st.line]).includes(Number(c.dataset.line))));
      const on = codeLines.find((c) => c.classList.contains('on'));
      if (on && codeBox.scrollHeight > codeBox.clientHeight) on.scrollIntoView({ block: 'nearest' });
      note.replaceChildren(...[el('span.stepno', 'Step ' + (i + 1) + ' of ' + steps.length), el('div', { html: st.note || '' }), st.why ? el('div.why', { html: st.why }) : null].filter(Boolean));
      slider.value = i; count.textContent = (i + 1) + ' / ' + steps.length;
      prev.disabled = i === 0; next.disabled = i === steps.length - 1;
    }
    function toggle() {
      if (timer) { stop(); return; }
      if (i >= steps.length - 1) go(0);
      play.textContent = 'Pause';
      timer = setInterval(() => { if (i >= steps.length - 1) stop(); else go(i + 1); }, props.speed || 1100);
    }
    function stop() { if (timer) clearInterval(timer); timer = null; play.textContent = 'Play'; }
    rebuild(false);
    root._viz = { go, get steps() { return steps; }, get index() { return i; } };
    return root;
  }

  // Print/PDF: a numbered filmstrip of chosen frames with the decision at each.
  function filmstrip(id, props = {}) {
    const def = DEFS[id];
    if (!def) return el('div', 'Missing visualizer ' + id);
    const input = {};
    (def.inputs || []).forEach((f) => (input[f.key] = props.input && props.input[f.key] !== undefined ? props.input[f.key] : f.def));
    const steps = runDef(def, input);
    let pick = props.frames;
    if (!pick) {
      const n = steps.length, k = Math.min(props.maxFrames || 6, n);
      pick = Array.from({ length: k }, (_, j) => Math.round(j * (n - 1) / Math.max(1, k - 1)));
      pick = [...new Set(pick)];
    }
    const wrap = el('figure.film', el('figcaption', el('b', 'Figure: '), (props.title || def.title) + ' — input ' + Object.entries(input).map(([k, v]) => k + ' = ' + JSON.stringify(v)).join(', ') + '. ' + steps.length + ' steps in the website; frames shown: ' + pick.map((p) => p + 1).join(', ') + '.'));
    if (def.legend) wrap.append(g.R.legend(def.legend));
    const grid = el('div.film-grid');
    pick.forEach((p) => {
      const st = steps[p]; const box = el('div.film-frame');
      const stage = el('div.film-stage'); def.render(st, stage, input);
      const lineTxt = st.line != null ? def.code.split('\n')[(Array.isArray(st.line) ? st.line[0] : st.line) - 1] : null;
      box.append(...[el('div.film-no', 'Step ' + (p + 1) + ' of ' + steps.length), stage, lineTxt ? el('div.film-line', el('code', lineTxt.trim())) : null, el('div.film-note', { html: st.note || '' }), st.why ? el('div.film-why', { html: st.why }) : null].filter(Boolean));
      grid.append(box);
    });
    wrap.append(grid);
    return wrap;
  }

  g.Viz = { define, mount, filmstrip, DEFS, runDef };
})(window);
