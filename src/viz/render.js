// Renderers used by every visualizer. They draw state only; algorithms decide the state.
(function (g) {
  'use strict';
  const { el } = g.Core;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}, ...kids) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
    kids.flat().forEach((k) => k != null && n.append(k instanceof Node ? k : document.createTextNode(String(k))));
    return n;
  };
  const fmt = (v) => (v === Infinity ? '∞' : v === -Infinity ? '−∞' : v === null || v === undefined ? '·' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  const labelled = (label, node) => (label ? el('div', el('div.panel-label', label), node) : node);

  // Array cells with pointers, window and per-index states.
  function cells(values, o = {}) {
    const states = o.states || {}, ptrs = o.ptrs || {};
    const row = el('div.cells', { role: 'img', 'aria-label': (o.label || 'array') + ': ' + values.map(fmt).join(', ') });
    values.forEach((v, i) => {
      let st = states[i];
      if (!st && o.window && i >= o.window[0] && i <= o.window[1]) st = 'window';
      if (!st && o.dimOutside && (i < o.dimOutside[0] || i > o.dimOutside[1])) st = 'dim';
      const c = el('div.cell' + (st ? '.s-' + st : ''), fmt(v), o.noIndex ? null : el('span.ix', String(o.indexBase != null ? i + o.indexBase : i)));
      const p = ptrs[i];
      if (p) (Array.isArray(p) ? p : [p]).forEach((lab, k) => c.append(el('span.ptr' + (k ? '.p' + (k + 1) : ''), { style: k ? { top: (-21 - 13 * k) + 'px' } : null }, lab)));
      row.append(c);
    });
    if (!values.length) row.append(el('div.small.muted.ui', '(empty)'));
    if (Object.values(ptrs).some((p) => Array.isArray(p) && p.length > 1)) row.style.paddingTop = '36px';
    return labelled(o.label, el('div', { style: { overflowX: 'auto' } }, row));
  }
  function vars(obj, changed = []) {
    const box = el('div.vars');
    for (const [k, v] of Object.entries(obj)) box.append(el('span' + (changed.includes(k) ? '.chg' : ''), el('b', k + ' ='), fmt(v)));
    return box;
  }
  function kv(entries, o = {}) {
    const box = el('div.kv');
    if (!entries.length) box.append(el('span.small.muted', o.empty || '{ }'));
    for (const [k, v] of entries) box.append(el('span' + (o.states && o.states[k] ? '.s-' + o.states[k] : ''), fmt(k) + (v === undefined ? '' : ' → ' + fmt(v))));
    return labelled(o.label, box);
  }
  function stack(items, o = {}) {
    const box = el('div.stackv');
    items.forEach((it, i) => box.append(el('div' + (o.states && o.states[i] ? '.s-' + o.states[i] : ''), fmt(it))));
    if (!items.length) box.append(el('div.small.muted.ui', { style: { border: 0 } }, '(empty)'));
    return labelled(o.label || 'stack (top at the top)', box);
  }
  function queue(items, o = {}) {
    const box = el('div.queuev');
    items.forEach((it, i) => box.append(el('div' + (o.states && o.states[i] ? '.s-' + o.states[i] : ''), fmt(it))));
    if (!items.length) box.append(el('span.small.muted.ui', '(empty)'));
    return labelled(o.label || 'queue (front on the left)', box);
  }
  function frames(fr, o = {}) {
    const box = el('div.frames');
    fr.forEach((f, i) => box.append(el('div' + (f.state ? '.' + f.state : i === fr.length - 1 ? '.top' : ''), f.text)));
    if (!fr.length) box.append(el('div.small.muted.ui', { style: { border: 0 } }, '(empty: all calls returned)'));
    return labelled(o.label || 'call stack (newest on top)', box);
  }

  // Generic positioned tree: nodes [{id, label, parent, state, sub}] laid out by leaf order.
  function layoutTree(nodes) {
    const kids = new Map(); let root = null;
    nodes.forEach((n) => { kids.set(n.id, []); });
    nodes.forEach((n) => { if (n.parent == null) root = n.id; else kids.get(n.parent) && kids.get(n.parent).push(n.id); });
    const pos = new Map(); let leaf = 0, maxD = 0;
    const walk = (id, d) => {
      maxD = Math.max(maxD, d);
      const ch = kids.get(id) || [];
      if (!ch.length) { pos.set(id, { x: leaf++, d }); return; }
      ch.forEach((c) => walk(c, d + 1));
      const xs = ch.map((c) => pos.get(c).x);
      pos.set(id, { x: (Math.min(...xs) + Math.max(...xs)) / 2, d });
    };
    if (root != null) walk(root, 0);
    return { pos, leaves: leaf, depth: maxD, kids };
  }
  function tree(nodes, o = {}) {
    if (!nodes.length) return labelled(o.label, el('div.small.muted.ui', '(empty tree)'));
    const { pos, leaves, depth } = layoutTree(nodes);
    const ghosts = new Set(nodes.filter((n) => n.ghost).map((n) => n.id));
    const rootN = nodes.find((n) => n.parent == null); const off = rootN && rootN.ghost ? 1 : 0; // forest: hide the virtual root row
    const dx = o.dx || 56, dy = o.dy || 64, r = o.r || 18, pad = 26;
    const W = Math.max(1, leaves) * dx + pad * 2, H = (depth + 1 - off) * dy + pad * 2 - dy / 2;
    const s = svg('svg', { class: 'vz', viewBox: `0 0 ${W} ${H}`, width: W, role: 'img', 'aria-label': o.label || 'tree' });
    const P = (id) => { const p = pos.get(id); return { x: pad + p.x * dx + dx / 2, y: pad + (p.d - off) * dy }; };
    nodes.forEach((n) => {
      if (n.ghost || n.parent == null || !pos.has(n.parent) || ghosts.has(n.parent)) return;
      const a = P(n.parent), b = P(n.id);
      s.append(svg('line', { class: 'edge' + (n.edge ? ' s-' + n.edge : ''), x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
      if (n.edgeLabel) s.append(svg('text', { class: 'lbl', x: (a.x + b.x) / 2 + (b.x < a.x ? -6 : 6), y: (a.y + b.y) / 2, 'text-anchor': b.x < a.x ? 'end' : 'start' }, n.edgeLabel));
    });
    nodes.forEach((n) => {
      if (n.ghost) return;
      const p = P(n.id);
      const wide = String(n.label).length > 3;
      const hw = 7 + String(n.label).length * 3.5;
      if (wide) s.append(svg('rect', { class: 'node' + (n.state ? ' s-' + n.state : ''), x: p.x - hw, y: p.y - 14, width: 2 * hw, height: 28, rx: 8 }));
      else s.append(svg('circle', { class: 'node' + (n.state ? ' s-' + n.state : ''), cx: p.x, cy: p.y, r }));
      s.append(svg('text', { x: p.x, y: p.y + 4.5, 'text-anchor': 'middle', 'font-size': wide ? 11 : 13, 'font-weight': 600 }, String(n.label)));
      if (n.sub != null) s.append(svg('text', { class: 'lbl', x: p.x, y: p.y + r + 13, 'text-anchor': 'middle' }, String(n.sub)));
    });
    return labelled(o.label, el('div', { style: { overflowX: 'auto' } }, s));
  }
  // Binary tree from a LeetCode level-order array; states keyed by array index.
  function binTreeNodes(arr) {
    const nodes = []; if (!arr.length || arr[0] == null) return nodes;
    nodes.push({ idx: 0, val: arr[0], parent: null, side: null });
    const q = [0]; let i = 1, h = 0;
    while (i < arr.length && h < q.length) {
      const p = q[h++];
      for (const side of ['L', 'R']) {
        if (i >= arr.length) break;
        if (arr[i] != null) { nodes.push({ idx: i, val: arr[i], parent: p, side }); q.push(i); }
        i++;
      }
    }
    return nodes;
  }
  function binTree(arr, o = {}) {
    const ns = binTreeNodes(arr);
    // Insert invisible placeholder leaves so left/right positions are preserved.
    const out = []; let ghost = -1;
    const kids = new Map(); ns.forEach((n) => kids.set(n.idx, { L: null, R: null })); ns.forEach((n) => { if (n.parent != null) kids.get(n.parent)[n.side] = n.idx; });
    const add = (idx, parent) => {
      const n = ns.find((x) => x.idx === idx);
      out.push({ id: idx, label: n.val, parent, state: o.states && o.states[idx], sub: o.subs && o.subs[idx], edge: o.edges && o.edges[idx] });
      const k = kids.get(idx);
      if (!k.L && !k.R) return;
      if (k.L != null) add(k.L, idx); else out.push({ id: ghost--, label: '', parent: idx, ghost: true });
      if (k.R != null) add(k.R, idx); else out.push({ id: ghost--, label: '', parent: idx, ghost: true });
    };
    if (ns.length) add(0, null);
    return tree(out, o);
  }

  // Graph with fixed coordinates (0..1 scaled) and node/edge states.
  function graph(G, o = {}) {
    const W = o.w || 420, H = o.h || 260, r = o.r || 17, pad = o.pad || 24;
    const s = svg('svg', { class: 'vz', viewBox: `0 0 ${W} ${H}`, width: W, role: 'img', 'aria-label': o.label || 'graph' });
    const P = (id) => { const n = G.nodes.find((x) => x.id === id); return { x: pad + n.x * (W - 2 * pad), y: pad + n.y * (H - 2 * pad) }; };
    const labOf = (id) => { const n = G.nodes.find((x) => x.id === id); return String(n.label != null ? n.label : n.id); };
    const boxW = (id) => 12 + labOf(id).length * 7.3;
    if (G.directed) {
      const defs = svg('defs'); defs.append(svg('marker', { id: 'ah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 9, markerHeight: 9, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' }, svg('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrowhead' })));
      s.append(defs);
    }
    G.edges.forEach((e, k) => {
      const a = P(e.u), b = P(e.v);
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      // trim the line to the node outline: a circle of radius r, or (o.box) a label-sized rectangle
      const cut = (id) => { if (!o.box) return r; const hw = boxW(id) / 2 + 2, hh = 15; return Math.min(Math.abs(dx) > 1e-9 ? hw * len / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-9 ? hh * len / Math.abs(dy) : Infinity); };
      const ca = cut(e.u), cb = cut(e.v) + (G.directed ? 3 : 0);
      const x1 = a.x + dx / len * ca, y1 = a.y + dy / len * ca, x2 = b.x - dx / len * cb, y2 = b.y - dy / len * cb;
      const st = o.edgeStates && o.edgeStates[k];
      s.append(svg('line', { class: 'edge' + (st ? ' s-' + st : ''), x1, y1, x2, y2, 'marker-end': G.directed ? 'url(#ah)' : null }));
      if (e.w != null) s.append(svg('text', { class: 'lbl', x: (a.x + b.x) / 2 - dy / len * 9, y: (a.y + b.y) / 2 + dx / len * 9 + 4, 'text-anchor': 'middle', style: 'font-size:12px;font-weight:600' }, String(e.w)));
    });
    G.nodes.forEach((n) => {
      const p = P(n.id); const st = o.states && o.states[n.id];
      const lab = String(n.label != null ? n.label : n.id);
      if (o.box) s.append(svg('rect', { class: 'node' + (st ? ' s-' + st : ''), x: p.x - boxW(n.id) / 2, y: p.y - 13, width: boxW(n.id), height: 26, rx: 7 }));
      else s.append(svg('circle', { class: 'node' + (st ? ' s-' + st : ''), cx: p.x, cy: p.y, r }));
      s.append(svg('text', { x: p.x, y: p.y + 4.5, 'text-anchor': 'middle', 'font-weight': 600, 'font-size': o.box ? 12 : lab.length > 2 ? 11 : null }, lab));
      const sub = o.subs && o.subs[n.id];
      if (sub != null) s.append(svg('text', { class: 'lbl', x: p.x, y: p.y - r - 5, 'text-anchor': 'middle', style: 'font-weight:600' }, fmt(sub)));
    });
    return labelled(o.label, el('div', { style: { overflowX: 'auto' } }, s));
  }

  function grid(m, o = {}) {
    const cols = m[0] ? m[0].length : 0;
    const box = el('div.gridv', { style: { gridTemplateColumns: `repeat(${cols}, 34px)` }, role: 'img', 'aria-label': o.label || 'grid' });
    m.forEach((row, r) => row.forEach((v, c) => { const st = o.states && o.states[r + ',' + c]; box.append(el('div' + (st ? '.s-' + st : ''), fmt(o.show ? o.show(v, r, c) : v))); }));
    return labelled(o.label, el('div', { style: { overflowX: 'auto' } }, box));
  }

  // DP table: rows/cols headers, values (null = not computed), states {"i,j": 'current'|'dep'|'best'}
  function table(values, o = {}) {
    const t = el('table.dp');
    if (o.colHead) t.append(el('tr', el('th'), ...o.colHead.map((h) => el('th', fmt(h)))));
    values.forEach((row, i) => {
      const tr = el('tr', el('th', o.rowHead ? fmt(o.rowHead[i]) : ''));
      row.forEach((v, j) => {
        const st = (o.states && o.states[i + ',' + j]) || (v === null || v === undefined ? 'empty' : 'done');
        tr.append(el('td.s-' + st, v === null || v === undefined ? '' : fmt(v)));
      });
      t.append(tr);
    });
    return labelled(o.label, el('div', { style: { overflowX: 'auto' } }, t));
  }
  function row1d(values, o = {}) { return table([values], { colHead: o.colHead || values.map((_, i) => i), rowHead: [o.rowLabel || 'dp'], states: Object.fromEntries(Object.entries(o.states || {}).map(([k, v]) => ['0,' + k, v])), label: o.label }); }

  // Singly linked list: nodes in display order; next pointers by id; pointer labels.
  function list(nodes, o = {}) {
    const bw = 46, bh = 34, gap = 34, pad = 16, top = 34;
    const n = nodes.length;
    const W = pad * 2 + n * bw + (n - 1) * gap + 50, H = top + bh + 64;
    const s = svg('svg', { class: 'vz', viewBox: `0 0 ${W} ${H}`, width: W, role: 'img', 'aria-label': o.label || 'linked list' });
    const defs = svg('defs'); defs.append(svg('marker', { id: 'lah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, svg('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrowhead' })));
    s.append(defs);
    const X = (i) => pad + i * (bw + gap);
    const index = new Map(nodes.map((nd, i) => [nd.id, i]));
    nodes.forEach((nd, i) => {
      const st = o.states && o.states[nd.id];
      s.append(svg('rect', { class: 'node' + (st ? ' s-' + st : ''), x: X(i), y: top, width: bw, height: bh, rx: 6 }));
      s.append(svg('text', { x: X(i) + bw / 2, y: top + bh / 2 + 5, 'text-anchor': 'middle', 'font-weight': 600 }, fmt(nd.val)));
      const nx = o.next[nd.id];
      if (nx === null || nx === undefined) {
        s.append(svg('text', { class: 'lbl', x: X(i) + bw / 2, y: top + bh + 16, 'text-anchor': 'middle' }, nx === null ? '→ null' : ''));
      } else if (index.has(nx)) {
        const j = index.get(nx);
        const est = o.edgeStates && o.edgeStates[nd.id];
        if (j === i + 1) s.append(svg('line', { class: 'edge' + (est ? ' s-' + est : ''), x1: X(i) + bw, y1: top + bh / 2, x2: X(j) - 2, y2: top + bh / 2, 'marker-end': 'url(#lah)' }));
        else {
          const x1 = X(i) + bw / 2, x2 = X(j) + bw / 2, y = top + bh, dip = 22 + Math.abs(j - i) * 6;
          s.append(svg('path', { class: 'edge' + (est ? ' s-' + est : ''), d: `M${x1},${y} C${x1},${y + dip} ${x2},${y + dip} ${x2},${y + 3}`, 'marker-end': 'url(#lah)' }));
        }
      }
      const ps = o.ptrs && o.ptrs[nd.id];
      if (ps) s.append(svg('text', { class: 'lbl', x: X(i) + bw / 2, y: top - 10, 'text-anchor': 'middle', style: 'font-weight:700;fill:var(--st-current)' }, (Array.isArray(ps) ? ps : [ps]).join(', ')));
    });
    if (o.nullPtrs && o.nullPtrs.length) s.append(svg('text', { class: 'lbl', x: X(n) - gap + 12, y: top - 10, style: 'font-weight:700;fill:var(--st-current)' }, o.nullPtrs.join(', ') + ' = null'));
    return labelled(o.label, el('div', { style: { overflowX: 'auto' } }, s));
  }

  function heap(arr, o = {}) {
    const lvl = arr.map((v, i) => v);
    const nodes = arr.map((v, i) => ({ id: i, label: v, parent: i === 0 ? null : (i - 1) >> 1, state: o.states && o.states[i], sub: 'i=' + i }));
    const wrap = el('div.stack', { style: { gap: '10px' } });
    wrap.append(cells(lvl, { states: o.states, label: o.label || 'heap array' }));
    if (arr.length) wrap.append(binTree(arr, { states: o.states, label: 'same heap drawn as a tree', subs: Object.fromEntries(arr.map((_, i) => [i, 'i=' + i])) }));
    return wrap;
  }

  function intervals(list, o = {}) {
    const lo = Math.min(...list.flat(), ...(o.extra || []).flat()), hi = Math.max(...list.flat(), ...(o.extra || []).flat());
    const W = 440, rowH = 22, pad = 20, span = Math.max(1, hi - lo);
    const rows = list.length + (o.merged ? o.merged.length + 1 : 0);
    const H = pad * 2 + rows * rowH + 18;
    const s = svg('svg', { class: 'vz', viewBox: `0 0 ${W} ${H}`, width: W, role: 'img', 'aria-label': 'intervals' });
    const X = (v) => pad + (v - lo) / span * (W - 2 * pad);
    for (let t = lo; t <= hi; t += Math.max(1, Math.ceil(span / 10))) { s.append(svg('line', { x1: X(t), x2: X(t), y1: pad - 6, y2: H - 18, stroke: 'var(--rule)' })); s.append(svg('text', { class: 'lbl', x: X(t), y: H - 4, 'text-anchor': 'middle' }, t)); }
    const bar = (iv, y, st) => { s.append(svg('rect', { class: 'node' + (st ? ' s-' + st : ''), x: X(iv[0]), y, width: Math.max(4, X(iv[1]) - X(iv[0])), height: rowH - 7, rx: 4 })); s.append(svg('text', { class: 'lbl', x: X(iv[1]) + 4, y: y + 12 }, '[' + iv[0] + ',' + iv[1] + ']')); };
    list.forEach((iv, i) => bar(iv, pad + i * rowH, o.states && o.states[i]));
    if (o.merged) { s.append(svg('text', { class: 'lbl', x: pad, y: pad + list.length * rowH + 14 }, o.mergedLabel || 'result')); o.merged.forEach((iv, i) => bar(iv, pad + (list.length + 1 + i) * rowH, o.mergedStates && o.mergedStates[i] || 'done')); }
    return labelled(o.label, el('div', { style: { overflowX: 'auto' } }, s));
  }

  function bits(n, o = {}) {
    const w = o.width || 32;
    const u = (n >>> 0).toString(2).padStart(32, '0').slice(32 - w);
    const box = el('div.bits', { role: 'img', 'aria-label': 'binary ' + u });
    u.split('').forEach((b, i) => box.append(el('span' + (b === '1' ? '.one' : '') + (o.changed && o.changed.includes(w - 1 - i) ? '.chg' : '') + (i && i % 8 === 0 ? '.sep' : ''), b)));
    return labelled(o.label, el('div', box, el('div.small.muted.ui', { style: { marginTop: '4px' } }, (o.label ? '' : '') + 'decimal ' + (o.signed === false ? (n >>> 0) : (n | 0)) + (w === 32 && (n | 0) < 0 ? '  ·  as unsigned ' + (n >>> 0) : ''))));
  }

  // Vertical bars (heights) with pointers, an optional container rectangle and per-index water.
  function bars(values, o = {}) {
    const bw = 30, gap = 6, pad = 14, maxH = o.maxH || 150;
    const top = Math.max(1, ...values, ...(o.levels || []));
    const unit = maxH / top;
    const W = pad * 2 + values.length * (bw + gap) - gap, H = maxH + 58;
    const base = 22 + maxH;
    const s = svg('svg', { class: 'vz', viewBox: `0 0 ${W} ${H}`, width: W, role: 'img', 'aria-label': (o.label || 'bars') + ': ' + values.join(', ') });
    const X = (i) => pad + i * (bw + gap);
    if (o.rect) {
      const { l, r, h, cls } = o.rect;
      s.append(svg('rect', { class: 'water' + (cls ? ' ' + cls : ''), x: X(l) + bw / 2, y: base - h * unit, width: X(r) - X(l), height: h * unit }));
    }
    values.forEach((v, i) => {
      const st = o.states && o.states[i];
      const w = o.water && o.water[i];
      if (w) s.append(svg('rect', { class: 'water', x: X(i), y: base - (v + w) * unit, width: bw, height: w * unit }));
      s.append(svg('rect', { class: 'node bar' + (st ? ' s-' + st : ''), x: X(i), y: base - v * unit, width: bw, height: Math.max(1, v * unit), rx: 3 }));
      s.append(svg('text', { class: 'lbl', x: X(i) + bw / 2, y: base - v * unit - 4, 'text-anchor': 'middle' }, String(v)));
      s.append(svg('text', { class: 'lbl', x: X(i) + bw / 2, y: base + 14, 'text-anchor': 'middle' }, String(i)));
      const p = o.ptrs && o.ptrs[i];
      if (p) s.append(svg('text', { class: 'lbl', x: X(i) + bw / 2, y: base + 30, 'text-anchor': 'middle', style: 'font-weight:700;fill:var(--st-current)' }, (Array.isArray(p) ? p : [p]).join(',')));
    });
    s.append(svg('line', { x1: pad - 4, x2: W - pad + 4, y1: base, y2: base, stroke: 'var(--ink-3)' }));
    return labelled(o.label, el('div', { style: { overflowX: 'auto' } }, s));
  }

  function legend(items) {
    const box = el('div.legend');
    const map = { current: '--st-current', compare: '--st-compare', done: '--st-done', frontier: '--st-frontier', error: '--st-error', dim: '--st-dim', window: '--st-window', dep: '--st-compare', best: '--st-done', wall: '--ink-2' };
    for (const [st, label] of items) box.append(el('span', el('i', { style: { borderColor: `var(${map[st] || '--st-dim'})`, background: `color-mix(in srgb, var(${map[st] || '--st-dim'}) 22%, transparent)` } }), label));
    return box;
  }

  g.R = { bars, cells, vars, kv, stack, queue, frames, tree, binTree, binTreeNodes, graph, grid, table, row1d, list, heap, intervals, bits, legend, fmt, svg };
})(window);
