// The render code that built DOM by hand (legacy/src/viz/w*.js), replaced by the matching primitive. Everything else in
// a render body is copied unchanged. Each entry must match its file exactly once.

export const VIEW_PATCHES: Record<string, [string, string][]> = {
  'w01.js': [
    [
      String.raw`      const W = 460, rowH = 30, labW = 86, H = CLASSES.length * rowH + 10;
      const s = R.svg('svg', { class: 'vz', viewBox: ${'`'}0 0 ${'$'}{W + 150} ${'$'}{H}${'`'}, width: W + 150, role: 'img', 'aria-label': 'operation counts, log scale' });
      const maxLog = 18;
      CLASSES.forEach(([name, f], k) => {
        const y = 6 + k * rowH;
        s.append(R.svg('text', { x: 0, y: y + 17, style: 'font-family:var(--f-ui);font-size:12.5px;font-weight:600' }, name));
        if (k > st.k) return;
        const ops = f(n), lg = Math.min(maxLog, Math.log10(Math.max(1, ops)));
        const slow = ops / 1e8 > 1;
        s.append(R.svg('rect', { class: 'node ' + (k === st.k ? 's-current' : slow ? 's-error' : 's-done'), x: labW, y: y + 2, width: Math.max(3, (lg / maxLog) * (W - labW)), height: rowH - 10, rx: 3 }));
        s.append(R.svg('text', { class: 'lbl', x: labW + Math.max(3, (lg / maxLog) * (W - labW)) + 6, y: y + 17 }, big(ops) + ' · ' + human(ops)));
      });
      stage.append(el('div', el('div.panel-label', 'operations (logarithmic scale)'), el('div', { style: { overflowX: 'auto' } }, s)));`,
      String.raw`      const maxLog = 18;
      const rows = CLASSES.map(([name, f], k) => {
        if (k > st.k) return { name, fraction: null };
        const ops = f(n), lg = Math.min(maxLog, Math.log10(Math.max(1, ops)));
        const slow = ops / 1e8 > 1;
        return { name, fraction: lg / maxLog, text: big(ops) + ' · ' + human(ops), state: k === st.k ? 'current' : slow ? 'error' : 'done' };
      });
      stage.append(R.panel('operations (logarithmic scale)', R.logBars(rows, 'operation counts, log scale')));`,
    ],
    [
      String.raw`        const marks = el('div.small.ui.muted', { style: { display: 'flex', flexWrap: 'wrap', gap: '2px' } });
        for (let k = 0; k < st.count; k++) marks.append(el('span', { style: { width: '8px', height: '14px', background: k === st.count - 1 && !st.done ? 'var(--st-current)' : 'var(--st-done)', borderRadius: '2px', display: 'inline-block' } }));
        stage.append(el('div', el('div.panel-label', 'one mark per work() call'), marks));`,
      String.raw`        stage.append(R.panel('one mark per work() call', R.marks(st.count, st.done ? undefined : st.count - 1)));`,
    ],
    [
      String.raw`      const rows = el('div.stack', { style: { gap: '4px', fontFamily: 'var(--f-code)', fontSize: '13px' } });
      st.B.forEach((chain, i) => {
        rows.append(el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
          el('span', { style: { width: '74px', color: i === st.b ? 'var(--st-current)' : 'var(--ink-3)', fontWeight: i === st.b ? 700 : 400 } }, 'bucket ' + i),
          ...(chain.length ? chain.map((k) => el('span', { class: 'chip', style: k === st.key ? { borderColor: st.look ? (st.found ? 'var(--st-done)' : 'var(--st-error)') : 'var(--st-current)', fontWeight: 700 } : null }, k)) : [el('span.small.muted', 'empty')])));
      });
      stage.append(el('div', el('div.panel-label', 'buckets (chaining)'), rows));`,
      String.raw`      const rows = st.B.map((chain, i) => ({
        label: 'bucket ' + i,
        state: i === st.b ? 'current' : null,
        chips: chain.map((k) => ({ text: k, state: k === st.key ? (st.look ? (st.found ? 'done' : 'error') : 'current') : null })),
        empty: 'empty',
      }));
      stage.append(R.panel('buckets (chaining)', R.chipRows(rows)));`,
    ],
    [
      String.raw`      const rows = el('div.stack', { style: { gap: '6px' } });
      st.groups.forEach(([k, words]) => rows.append(el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', fontFamily: 'var(--f-code)', fontSize: '13px' } }, el('span', { class: 'chip', style: k === st.cur && !st.done ? { borderColor: 'var(--st-current)', fontWeight: 700 } : null }, k), '→', words.join(', '))));
      stage.append(el('div', el('div.panel-label', 'groups (key → words)'), rows));`,
      String.raw`      const rows = st.groups.map(([k, words]) => ({
        label: '',
        chips: [{ text: k, state: k === st.cur && !st.done ? 'current' : null }],
        trailing: '→ ' + words.join(', '),
      }));
      stage.append(R.panel('groups (key → words)', R.chipRows(rows)));`,
    ],
  ],
  'w02.js': [
    [
      String.raw`    const box = R.grid(m, { states, label: 'Every pair (i, j) with i < j · cell = numbers[i] + numbers[j]' });
    box.querySelector('.gridv').classList.add('small');
    return box;`,
      String.raw`    return R.grid(m, { states, small: true, label: 'Every pair (i, j) with i < j · cell = numbers[i] + numbers[j]' });`,
    ],
    [
      String.raw`stage.append(el('div.small.ui', el('span.muted', 'Subarrays found: '), st.found.map(([s, e]) => '[' + s + '..' + e + ']').join(' ')));`,
      String.raw`stage.append(R.caption('Subarrays found: ' + st.found.map(([s, e]) => '[' + s + '..' + e + ']').join(' ')));`,
    ],
  ],
  'w03.js': [
    [
      String.raw`        stage.append(el('div.row', { style: { alignItems: 'flex-start', gap: '18px' } },
          R.cells(m.L,`,
      String.raw`        stage.append(R.row({ align: 'start' },
          R.cells(m.L,`,
    ],
  ],
  'w04.js': [
    [
      String.raw`stage.append(el('div.small.ui', { style: { color: 'var(--st-error)' } }, 'evicted key ' + st.ev));`,
      String.raw`stage.append(R.caption('evicted key ' + st.ev, { tone: 'error' }));`,
    ],
    [
      String.raw`stage.append(el('div.row', { style: { alignItems: 'flex-end', gap: '28px' } }, R.stack(st.inn,`,
      String.raw`stage.append(R.row({ align: 'end', gap: 'wide' }, R.stack(st.inn,`,
    ],
  ],
  'w05.js': [
    [
      String.raw`stage.append(el('div', el('div.panel-label', 'results so far (' + st.res.length + ')'), el('div.small.ui', { style: { fontFamily: 'var(--f-code)', wordBreak: 'break-word' } }, st.res.map((r) => (Array.isArray(r) ? fmtArr(r) : JSON.stringify(r))).join('  ') || '(none yet)')));`,
      String.raw`stage.append(R.panel('results so far (' + st.res.length + ')', R.caption(st.res.map((r) => (Array.isArray(r) ? fmtArr(r) : JSON.stringify(r))).join('  ') || '(none yet)', { mono: true })));`,
    ],
    [
      String.raw`renderBT(st, stage, el('div.small.muted.ui', 'Node labels show the remaining target.'))`,
      String.raw`renderBT(st, stage, R.caption('Node labels show the remaining target.', { tone: 'muted' }))`,
    ],
    [
      String.raw`stage.append(el('div.small.ui', { style: { color: 'var(--st-error)' } }, 'tried (' + st.oob.join(', ') + '): out of bounds'));`,
      String.raw`stage.append(R.caption('tried (' + st.oob.join(', ') + '): out of bounds', { tone: 'error' }));`,
    ],
  ],
  'w06.js': [
    [
      String.raw`stage.append(el('div.row', { style: { alignItems: 'flex-end', gap: '24px' } }, R.stack(st.st.map(`,
      String.raw`stage.append(R.row({ align: 'end', gap: 'wide' }, R.stack(st.st.map(`,
    ],
  ],
  'w07.js': [
    [
      String.raw`stage.append(el('div.small.ui.muted', 'popped ' + st.popped));`,
      String.raw`stage.append(R.caption('popped ' + st.popped, { tone: 'muted' }));`,
    ],
    [
      String.raw`stage.append(el('div.row', { style: { gap: '24px', alignItems: 'flex-start' } },
        R.cells(st.lo,`,
      String.raw`stage.append(R.row({ align: 'start', gap: 'wide' },
        R.cells(st.lo,`,
    ],
  ],
  'w08.js': [
    [
      String.raw`const adjView = (adj) => el('div.small.ui', { style: { fontFamily: 'var(--f-code)', lineHeight: '1.7' } }, el('div.panel-label', 'adjacency list'), ...adj.map((a, i) => el('div', i + ': [' + a.join(', ') + ']')));`,
      String.raw`const adjView = (adj) => R.panel('adjacency list', R.codeLines(adj.map((a, i) => i + ': [' + a.join(', ') + ']')));`,
    ],
  ],
  'w12.js': [
    [
      String.raw`stage.append(el('div.panel-label', 'the problem (no label)'), el('p.viz-problem', PROBLEMS[problem].text));`,
      String.raw`stage.append(R.panel('the problem (no label)', R.problem(PROBLEMS[problem].text)));`,
    ],
  ],
};
