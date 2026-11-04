// PDF companion: renders the whole course as a static book from the same COURSE data the website
// uses. Visualizers become numbered filmstrips; exercises become printable questions whose answers
// are collected in an answer key at the end of each week. tools/pdf.mjs prints this page twice:
// pass 1 finds the page of every table-of-contents target (via hidden markers), pass 2 fills them in.
(function (g) {
  'use strict';
  const { el } = g.Core;
  const C = g.COURSE, R = g.R;
  const H = g.HL;
  const htmlEl = (html, cls) => (Array.isArray(html) ? el('div', { class: cls || 'prose' }, el('ul', ...html.map((h) => el('li', { html: h })))) : el('div', { class: cls || 'prose', html: html || '' }));
  const root = document.getElementById('app');
  const BANK = Object.fromEntries(C.bank.map((b) => [b.num, b]));
  const PAGES = (g.TOC_PAGES || {});
  const toc = []; let mk = 0;
  // A TOC target: an anchor id for links, plus a hidden marker string that pass 1 locates in the PDF text.
  function target(level, text) { const id = 't' + (++mk); toc.push({ id, level, text }); return [el('a', { id, class: 'anchor' }), el('span.marker', '⟦' + id + '⟧')]; }
  const code = (src) => el('pre.code', { html: H.highlight(String(src).replace(/\n+$/, '')).join('\n') });
  const numbered = (src) => el('pre.code.numbered', ...H.highlight(String(src).replace(/\n+$/, '')).map((h, i) => el('span.ln', el('span.no', String(i + 1)), el('span', { html: h || ' ' }))));
  const strip = (h) => String(h || '').replace(/<[^>]+>/g, '');
  const lettered = (i) => 'ABCDEFGH'[i];

  // ---------- exercises ----------
  let keyItems = [];
  function exercise(ex, label) {
    const box = el('section.ex-print');
    const kind = { mcq: 'Concept check', pattern: 'Name the pattern', recall: 'Recall', complexity: 'Complexity', predict: 'Predict the output', bug: 'Find the bug', fill: 'Fill in the blanks', trace: 'Dry run by hand', code: 'Write the code', interview: 'Interview problem' }[ex.type] || ex.type;
    box.append(el('div.ex-head', el('b', 'Exercise ' + label), ' · ' + kind + (ex.tag ? ' · ' + strip(ex.tag) : '') + (ex.title ? ' · ' + strip(ex.title) : '')));
    if (ex.q) box.append(htmlEl(ex.q, 'prose q'));
    const key = el('div.key-item', el('div.key-head', el('b', 'Exercise ' + label), ex.tag ? ' · ' + strip(ex.tag) : '', ex.title ? ' · ' + strip(ex.title) : ''));
    const keyAns = (lbl, node) => key.append(el('div.key-row', el('span.kl', lbl), node));
    switch (ex.type) {
      case 'mcq': case 'pattern': case 'recall': {
        const many = ex.options.filter((o) => o.ok).length > 1;
        if (many) box.append(el('div.small', 'Select all that apply.'));
        box.append(el('ol.opts', ...ex.options.map((o, i) => el('li', el('span.box'), el('span.lt', lettered(i) + '.'), el('span', { html: o.t })))));
        keyAns('Answer', el('span', ex.options.map((o, i) => (o.ok ? lettered(i) : null)).filter(Boolean).join(', ')));
        const why = ex.options.map((o, i) => (o.why ? el('li', el('b', lettered(i) + (o.ok ? ' (correct): ' : ': ')), el('span', { html: o.why })) : null)).filter(Boolean);
        if (why.length) key.append(el('ul.why', ...why));
        break;
      }
      case 'complexity': {
        if (ex.code) box.append(code(ex.code));
        box.append(el('table.fields', ...ex.fields.map((f) => el('tr', el('td', f.label), el('td.blank', ''), el('td.small', f.options ? 'choose: ' + f.options.join(' · ') : '')))));
        keyAns('Answer', el('span', ex.fields.map((f) => f.label + ': ' + f.answer).join('; ')));
        break;
      }
      case 'predict': {
        box.append(code(ex.code), el('div.answer-lines', el('span.small', 'Output:')));
        keyAns('Output', el('pre.code', ex.answer));
        break;
      }
      case 'bug': {
        box.append(numbered(ex.code), el('div.small', 'Line number(s) of the bug: ________'));
        keyAns('Bug', el('span', 'line ' + ex.bug.map((b) => b + 1).join(' / ')));
        if (ex.fix) keyAns('Fix', code(ex.fix));
        break;
      }
      case 'fill': {
        let k = 0; const t = ex.template.replace(/\[\[(\d+)\]\]/g, (_, n) => '____(' + (Number(n) + 1) + ')____');
        box.append(code(t));
        keyAns('Blanks', el('ol.blanks', ...ex.blanks.map((b) => el('li', el('code', b.accept[0]), b.accept.length > 1 ? el('span.small', ' (also accepted: ' + b.accept.slice(1).join(' | ') + ')') : null))));
        void k; break;
      }
      case 'trace': {
        box.append(el('table.fields', ...ex.rows.map((r, i) => el('tr', el('td', String(i + 1) + '. ', el('span', { html: r.prompt })), el('td.blank', '')))));
        keyAns('Answers', el('ol', ...ex.rows.map((r) => el('li', el('code', [].concat(r.answer)[0]), r.why ? el('span.small', { html: ' — ' + r.why }) : null))));
        break;
      }
      case 'code': case 'interview': {
        const vis = (ex.tests || []).filter((t) => !t.hidden);
        if (ex.starter) box.append(el('div.small', 'Starter:'), code(ex.starter));
        if (vis.length) box.append(el('div.small', 'Examples (the website also runs hidden tests):'), el('ul.tests', ...vis.map((t) => el('li', el('code', t.ops ? JSON.stringify(t.ops) + ' → ' + JSON.stringify(t.expect) : (ex.fn || 'f') + '(' + (t.args || []).map((a) => JSON.stringify(a)).join(', ') + ') → ' + JSON.stringify(t.expect))))));
        box.append(el('div.small.muted', 'Write your solution, then run it against the tests in the website.'));
        if (ex.model) {
          const m = ex.model;
          [['clarify', 'Clarify'], ['brute', 'Brute force'], ['optimize', 'Optimise'], ['edges', 'Edge cases'], ['complexity', 'Complexity']].forEach(([k, l]) => { if (m[k]) keyAns(l, htmlEl(m[k], 'prose')); });
        }
        if (ex.solution) keyAns('Solution', code(ex.solution));
        break;
      }
      default: break;
    }
    if (ex.hints && ex.hints.length) key.append(el('div.key-row', el('span.kl', 'Hints'), el('ol.hints', ...ex.hints.map((h) => el('li', { html: h })))));
    if (ex.explain) keyAns('Why', htmlEl(ex.explain, 'prose'));
    keyItems.push(key);
    return box;
  }
  function answerKey(title) {
    const sec = el('section.answer-key', el('h2', ...target(2, title), title), el('p.small.muted', 'Try each exercise before reading its answer. Hints are listed first for the code problems; read them one at a time.'), ...keyItems);
    keyItems = [];
    return sec;
  }

  // ---------- lesson blocks ----------
  function blocks(list, ctx) {
    const out = [];
    for (const b of list || []) {
      if (b.t === 'html') out.push(htmlEl(b.html, 'prose' + (b.pulled ? ' pulled' : '')));
      else if (b.t === 'h') out.push(el('h3', b.text, b.tag ? el('span.tag', b.tag) : null));
      else if (b.t === 'note') out.push(el('aside.callout.' + b.kind, el('b', b.title || { tip: 'Tip', warn: 'Watch out', key: 'Key idea', mistake: 'Common mistake', interview: 'In the interview' }[b.kind]), htmlEl(b.html)));
      else if (b.t === 'viz') out.push(g.Viz.filmstrip(b.id, Object.assign({ maxFrames: 4 }, b.props)));
      else if (b.t === 'ex') out.push(exercise(b.ex, ctx.prefix + '.' + (++ctx.n)));
      else if (b.t === 'anno') out.push(el('div.anno-print', b.title ? el('div.panel-label', b.title) : null, numbered(b.code), el('ol.anno-notes', ...Object.entries(b.notes).map(([n, h]) => el('li', el('b', 'line ' + n + ': '), el('span', { html: h }))))));
      else if (b.t === 'stages') out.push(el('section.stages-print', el('h3', b.title), ...b.stages.map((s, i) => el('div', el('h4', (i + 1) + '. ' + (s.label || s.name)), ...blocks(s.blocks, ctx)))));
    }
    return out;
  }
  const metaList = (title, html) => (html && html.length ? el('div.meta-block', el('div.panel-label', title), htmlEl(html, 'prose')) : null);
  function problemTable(probs, w) {
    if (!probs.length) return null;
    return el('table.probs', el('tr', el('th', '#'), el('th', 'Problem'), el('th', 'Diff.'), el('th', 'Tier'), el('th', 'Pattern'), el('th', 'Journal')),
      ...probs.map((p) => { const b = BANK[p.num]; return el('tr', el('td', String(p.num)), el('td', el('a', { href: b.url }, b.title)), el('td', b.diff), el('td', { C: 'Core', S: 'Stretch', O: 'Optional' }[b.tier] || b.tier), el('td', w === 12 ? el('i', 'hidden: see answer key') : el('span', { html: b.patternHTML })), el('td', '☐ attempted ☐ hints ☐ solo')); }));
  }
  function lesson(L, w) {
    const s = L.sched;
    const label = L.kind === 'saturday' ? 'Saturday' : 'Day ' + L.studyDay;
    const ttl = 'Week ' + w + ' · ' + label + ': ' + (L.title || strip(s.topic));
    const ctx = { prefix: w + '.' + (L.kind === 'saturday' ? 'S' : L.studyDay), n: 0 };
    const sec = el('section.lesson', el('div.kicker', s.date + ' · ' + (s.time && s.time !== 'default' ? s.time : 'T25 · I20 · P50 · R20 · N5 (default)')), el('h2', ...target(2, ttl), ttl));
    if (L.goal) sec.append(htmlEl(L.goal, 'prose goal'));
    const grid = el('div.meta-grid', metaList('Why it matters', L.why), metaList('Prerequisites', L.prereqs), metaList('You will be able to', L.outcomes));
    sec.append(grid);
    const today = el('table.today', el('tr', el('th', 'Topic'), el('td', { html: s.topic })), s.warmup && s.warmup !== '—' ? el('tr', el('th', 'Warm-up'), el('td', { html: s.warmup + ' (re-solve from a blank editor, 10 min)' })) : null, s.implement && s.implement !== '—' ? el('tr', el('th', 'Implement / dry run'), el('td', { html: s.implement })) : null, el('tr', el('th', 'Problems'), el('td', { html: s.problemsCell || '—' })), s.doneWhen ? el('tr', el('th', 'Done when'), el('td', { html: s.doneWhen })) : null);
    sec.append(today);
    sec.append(...blocks(L.blocks, ctx));
    const probs = (s.problems && s.problems.length) ? s.problems : C.bank.filter((b) => b.week === w && b.day === L.studyDay && L.kind === 'study').map((b) => ({ num: b.num, tier: b.tier }));
    if (probs.length) sec.append(el('h3', 'Independent practice on LeetCode'), problemTable(probs, w));
    if (L.summary) sec.append(el('div.summary', el('div.panel-label', 'Summary'), htmlEl(L.summary)));
    if (L.revision) sec.append(el('div.summary', el('div.panel-label', 'Revision prompt'), htmlEl(L.revision)));
    const crit = (L.ready && L.ready.length) ? L.ready : null;
    if (crit) sec.append(el('div.ready', el('div.panel-label', 'Ready to move on? Tick only what is true without notes'), htmlEl(crit)));
    return sec;
  }
  function week(W) {
    const w = W.n;
    const sec = el('section.week', el('div.kicker', 'Week ' + w + ' · ' + W.dates), el('h1', ...target(1, 'Week ' + w + ': ' + W.title), 'Week ' + w + ': ' + W.title));
    sec.append(el('h3', 'Learning objectives'), htmlEl(W.objectives));
    if (W.overview) sec.append(...blocks(W.overview.blocks, { prefix: w + '.0', n: 0 }));
    sec.append(el('h3', 'The week at a glance'), el('table.sched', el('tr', el('th', 'Date'), el('th', 'Topic'), el('th', 'Problems'), el('th', 'Time')), ...W.days.map((d) => { const L = C.lessons[d.id]; return el('tr', el('td', d.date), el('td', d.topicText), el('td', { html: L ? L.sched.problemsCell : '' }), el('td', L ? L.sched.time : '')); })));
    if (W.notes) sec.append(htmlEl(W.notes));
    if (W.fallBehind) sec.append(el('aside.callout.warn', el('b', 'If you fall behind'), htmlEl('<p>' + W.fallBehind + '</p>')));
    const parts = [sec];
    W.days.forEach((d) => { const L = C.lessons[d.id]; if (L && (L.kind === 'study' || L.kind === 'saturday')) parts.push(lesson(L, w)); });
    if (w === 12) keyItems.push(el('div.key-item', el('div.key-head', el('b', 'Week 12 problem patterns (read after attempting)')), el('ul', ...C.bank.filter((b) => b.week === 12).map((b) => el('li', b.num + '. ' + b.title + ': ', el('span', { html: b.patternHTML }), ' — ', el('span', { html: b.hintHTML }))))));
    parts.push(answerKey('Week ' + w + ' answer key'));
    return parts;
  }
  function section(n, opts = {}) {
    const s = C.sections[n]; if (!s) return [];
    const sec = el('section.part', el('h1', ...target(1, s.title), s.title));
    if (s.lead) sec.append(htmlEl(s.lead));
    s.subs.forEach((x) => { if (opts.skip && opts.skip(x)) return; sec.append(el('h3', x.title), htmlEl(x.html)); });
    return [sec];
  }

  // ---------- assemble ----------
  const book = el('div.book');
  book.append(el('section.cover',
    el('div.cover-kicker', 'Companion to the website'),
    el('h1', 'DSA Pattern Lab'),
    el('p.cover-sub', 'A 12-week, JavaScript-first course in data structures and algorithms for product-company interviews'),
    el('p.cover-meta', 'Mon 2 Nov 2026 – Sun 24 Jan 2027 · 60 study days · 173 bank problems · 6 assessments · 6 mock interviews'),
    el('div.cover-how', el('h3', 'How to use this book'),
      el('ul', el('li', 'Each study day follows the same plan: a 10-minute warm-up, theory, a visual dry run, concept checks, a guided interview problem, LeetCode practice, then a summary and an honest "ready" check.'),
        el('li', 'Figures are filmstrips: a few frames from the website\'s step-through visualizers. Each says which frames are shown; the website lets you step through every frame and change the input.'),
        el('li', 'Exercises are numbered week.day.n. Answers, hints and model solutions are in the answer key at the end of each week. The website checks your answers and runs your code; here you check yourself.'),
        el('li', 'Problem tables include a journal column. Be strict: a viewed editorial or hint means "with hints", never "solved independently".'),
        el('li', 'Times are written T (theory) · I (implement) · P (practice) · R (review) · N (notes), in minutes.')))));
  const tocBox = el('section.toc', el('h1', 'Contents'));
  book.append(tocBox);
  [0, 1].forEach((n) => book.append(...section(n, { skip: n === 1 ? (x) => /^Answer key/.test(x.title) : null })));
  if (C.extra && C.extra.diagnostic) { const ctx = { prefix: '0.A', n: 0 }; book.append(el('section.part', el('h2', ...target(2, 'Session A as printable questions'), 'Session A as printable questions'), ...blocks(C.extra.diagnostic.blocks, ctx))); book.append(answerKey('Diagnostic answer key')); }
  book.append(...section(2));
  book.append(el('section.part', el('h2', ...target(2, 'Dependency map'), 'Dependency map'), g.Viz.filmstrip('depmap', { frames: [0, 4, 9] })));
  C.weeks.forEach((W) => book.append(...week(W)));
  book.append(...section(6));
  if (C.extra && C.extra.reference) { const ctx = { prefix: 'R', n: 0 }; book.append(el('section.part', el('h2', 'Reference exercises'), ...blocks(C.extra.reference.blocks, ctx))); }
  book.append(...section(7));
  book.append(...section(8));
  book.append(...section(9, { skip: (x) => /^9\.[25]/.test(x.title) }));
  book.append(...section(10), ...section(11), ...section(12));
  if (keyItems.length) book.append(answerKey('Reference exercises answer key'));
  // appendices
  const app = el('section.part', el('h1', ...target(1, 'Appendix A: problem bank'), 'Appendix A: problem bank'), el('p.small', 'All 173 curriculum problems in the order you meet them. Week 12 patterns are listed in the Week 12 answer key, so the mixed sets stay unlabeled.'));
  app.append(el('table.probs.bank', el('tr', el('th', '#'), el('th', 'Problem'), el('th', 'Diff.'), el('th', 'When'), el('th', 'Tier'), el('th', 'Pattern')), ...C.bank.map((b) => el('tr', el('td', String(b.num)), el('td', el('a', { href: b.url }, b.title)), el('td', b.diff), el('td', b.when), el('td', b.tier), el('td', b.week === 12 ? el('i', 'see Week 12 key') : el('span', { html: b.patternHTML }))))));
  book.append(app);
  const s9 = C.sections[9];
  if (s9) book.append(el('section.part', el('h1', ...target(1, 'Appendix B: assessment and mock problems (interviewer copy)'), 'Appendix B: assessment and mock problems (interviewer copy)'), el('aside.callout.warn', el('b', 'Do not read before the session'), htmlEl('<p>These problems are kept out of the bank so they stay unseen. Give this appendix to your interviewer, or open it only when the session starts.</p>')), ...s9.subs.filter((x) => /^9\.[25]/.test(x.title)).map((x) => el('div', el('h3', x.title), htmlEl(x.html)))));

  // table of contents (page numbers come from pass 1 via window.TOC_PAGES)
  tocBox.append(el('ol.toc-list', ...toc.map((t) => el('li.l' + t.level, el('a', { href: '#' + t.id }, t.text), el('span.dots'), el('span.pg', PAGES[t.id] != null ? String(PAGES[t.id]) : '000')))));
  root.replaceChildren(book);
  g.PRINT_TOC = toc;
  document.title = 'DSA Pattern Lab — PDF companion';
  g.PRINT_READY = true;
})(window);
