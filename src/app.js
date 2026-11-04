// Application: navigation, pages, progress, journal, revision, assessments.
(function (g) {
  'use strict';
  const C = g.COURSE;
  const { el, htmlEl, Store, toast, saveFile, dates } = g.Core;
  const { esc } = g.HL;
  const app = document.getElementById('app');
  const LESSONS = C.lessons;
  const BANK = C.bank;
  const BANKBY = Object.fromEntries(BANK.map((b) => [b.num, b]));
  const STUDY = Object.values(LESSONS).filter((l) => l.kind === 'study').sort((a, b) => a.sched.offset - b.sched.offset);
  const ALLDAYS = C.weeks.flatMap((w) => w.days);
  const ORDERED = Object.values(LESSONS).sort((a, b) => a.sched.offset - b.sched.offset);

  // ---------- helpers ----------
  const startDate = () => dates.parseISO(Store.get('settings.startDate', C.startISO) || C.startISO);
  const dateOf = (offset) => dates.addDays(startDate(), offset);
  const dateLabel = (offset) => dates.fmt(dateOf(offset));
  const shifted = () => (Store.get('settings.startDate', C.startISO) || C.startISO) !== C.startISO;
  const lessonDone = (id) => !!Store.get('lessons.' + id + '.done', false);
  const exOfLesson = (L) => { const out = []; const walk = (bs) => bs.forEach((b) => { if (b.t === 'ex') out.push(b.ex); if (b.t === 'stages') b.stages.forEach((s) => walk(s.blocks)); }); walk(L.blocks || []); return out; };
  const exSolved = (id) => !!(Store.get('ex.' + id, {}) || {}).solved;
  function weekProgress(w) {
    const days = C.weeks[w - 1].days.filter((d) => LESSONS[d.id]);
    const done = days.filter((d) => lessonDone(d.id)).length;
    return { done, total: days.length, pct: days.length ? done / days.length : 0 };
  }
  function ring(pct, size = 22) {
    const r = (size - 4) / 2, c = 2 * Math.PI * r;
    const s = g.R.svg('svg', { class: 'ring', width: size, height: size, viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true' },
      g.R.svg('circle', { class: 'bg', cx: size / 2, cy: size / 2, r }),
      g.R.svg('circle', { class: 'fg', cx: size / 2, cy: size / 2, r, 'stroke-dasharray': c, 'stroke-dashoffset': c * (1 - pct), transform: `rotate(-90 ${size / 2} ${size / 2})` }));
    return s;
  }
  const diffChip = (d) => el('span.chip.' + d.toLowerCase(), d);
  const tierName = { C: 'Core', S: 'Stretch', O: 'Optional' };
  const tierChip = (t) => el('span.chip.tier-' + t, tierName[t]);
  function currentDay() {
    const off = dates.daysBetween(startDate(), dates.today());
    if (off < 0) return { before: -off };
    if (off >= 84) return { after: off - 83 };
    return { day: ALLDAYS[off], offset: off };
  }

  // ---------- journal model ----------
  const STATUS = [['none', 'Not started'], ['attempted', 'Attempted'], ['hints', 'Solved with hints'], ['solo', 'Solved independently'], ['revise', 'Needs revision']];
  const STATUS_LABEL = Object.fromEntries(STATUS);
  const INTERVALS = [1, 3, 7, 14, 30];
  // Week 12 problems are unlabeled on purpose (roadmap): hide their pattern and prerequisite until
  // the learner has attempted the problem or explicitly asks to see them.
  function patternBits(b, j) {
    const show = () => [el('span.small.muted.ui', 'Pattern: '), el('span.small.ui', { html: b.patternHTML }), el('span.small.muted.ui', '· prerequisite ' + b.prereq)];
    if (b.week !== 12 || (j && j.status && j.status !== 'none')) return show();
    const box = el('span');
    box.append(el('button.btn.small', { type: 'button', title: 'Week 12 problems are unlabeled on purpose', onclick: () => box.replaceChildren(...show()) }, 'Reveal the pattern (after your attempt)'));
    return [box];
  }
  const MISTAKES = [['', '—'], ['P', 'P · did not recognise the pattern'], ['A', 'A · could not derive the algorithm'], ['D', 'D · wrong data structure'], ['L', 'L · logic or implementation bug'], ['E', 'E · edge case missed'], ['C', 'C · complexity analysis error'], ['R', 'R · understood but could not reproduce']];
  const MISTAKE_FIX = {
    P: 'Add the clue to your own pattern notes; run the classification drill (Pattern guide); next time write the clues before anything else.',
    A: 'Re-derive brute force → bottleneck on paper; redo the theory example for that pattern; re-solve a simpler sibling first.',
    D: 'Review the cost table (JS reference 6.1) and each pattern\'s "inappropriate when" line; state each operation\'s cost before choosing.',
    L: 'Write pseudocode first; dry-run on paper before running; re-type the template from memory three times.',
    E: 'Add the case to your personal edge-case list and test boundary inputs at step 11 every time.',
    C: 'Redo the Week 1 complexity snippets; analyse three tracker problems aloud.',
    R: 'Shorten the interval to one day; explain it aloud without code; re-implement it in two separate sessions.',
  };
  const jget = (num) => Store.get('journal.' + num, null) || { status: 'none' };
  function jset(num, patch) { Store.set('journal.' + num, Object.assign({}, jget(num), patch)); }
  function mastered(j) {
    const clean = (j.resolves || []).filter((r) => r.outcome === 'clean').map((r) => r.date).sort();
    if (clean.length < 3) return false;
    let run = 1;
    for (let i = 1; i < clean.length; i++) { if (dates.daysBetween(dates.parseISO(clean[i - 1]), dates.parseISO(clean[i])) >= 7) run++; if (run >= 3) return true; }
    return false;
  }
  function nextDue(j) {
    if (!j || j.status === 'none' || mastered(j)) return null;
    return j.due || null;
  }
  function setStatus(num, status) {
    const j = jget(num); const t = dates.iso(dates.today());
    const patch = { status };
    if (status === 'attempted') { patch.due = dates.iso(dates.addDays(dates.today(), 1)); }
    if ((status === 'hints' || status === 'solo') && !j.firstSolved) { patch.firstSolved = t; patch.interval = 1; patch.due = dates.iso(dates.addDays(dates.today(), 1)); }
    if (status === 'revise') { patch.due = dates.iso(dates.addDays(dates.today(), 2)); }
    if (!j.firstDate && status !== 'none') patch.firstDate = t;
    jset(num, patch);
  }
  function logResolve(num, outcome) {
    const j = jget(num); const now = dates.today();
    const resolves = [...(j.resolves || []), { date: dates.iso(now), outcome }];
    let interval = j.interval || 1, due;
    if (outcome === 'clean') { const i = INTERVALS.indexOf(interval); interval = INTERVALS[Math.min(INTERVALS.length - 1, (i < 0 ? 0 : i) + 1)]; due = dates.addDays(now, interval); }
    else if (outcome === 'hint') due = dates.addDays(now, interval);
    else { due = dates.addDays(now, 2); }
    const patch = { resolves, interval, due: dates.iso(due) };
    if (outcome === 'fail') patch.status = 'revise';
    else if (j.status === 'revise' || j.status === 'attempted') patch.status = outcome === 'clean' ? 'solo' : 'hints';
    jset(num, patch);
  }
  function statusPill(num) {
    const j = jget(num);
    if (j.status !== 'none' && mastered(j)) return el('span.pill.s-mastered', 'Mastered');
    const cls = { none: 's-none', attempted: 's-attempted', hints: 's-hints', solo: 's-solo', revise: 's-revise' }[j.status || 'none'];
    return el('span.pill.' + cls, STATUS_LABEL[j.status || 'none']);
  }

  // ---------- generic blocks ----------
  let vizUid = 0;
  function renderBlocks(blocks, opts = {}) {
    const out = [];
    for (const b of blocks || []) {
      if (b.t === 'html') { const d = htmlEl(b.html, 'prose'); if (b.pulled) d.classList.add('pulled'); out.push(d); }
      else if (b.t === 'h') out.push(el('div.sec-h', { id: b.id }, el('h2', b.text), b.tag ? el('span.tag', b.tag) : null));
      else if (b.t === 'note') out.push(el('aside.callout.' + b.kind, el('span.ct', b.title || { tip: 'Tip', warn: 'Watch out', key: 'Key idea', mistake: 'Common mistake', interview: 'In the interview' }[b.kind]), htmlEl(b.html)));
      else if (b.t === 'viz') out.push(g.Viz.mount(b.id, Object.assign({ uid: ++vizUid }, b.props)));
      else if (b.t === 'ex') out.push(g.Exercises.render(b.ex));
      else if (b.t === 'anno') out.push(anno(b));
      else if (b.t === 'stages') out.push(stagesBlock(b));
    }
    return out;
  }
  function anno(b) {
    const lines = g.HL.highlight(b.code);
    const notes = el('div.notes');
    const lns = lines.map((h, i) => el('div.ln' + (b.notes[i + 1] ? '.has' : ''), { 'data-n': i + 1 }, el('span.no', String(i + 1)), el('span', { html: h || ' ' })));
    const noteEls = Object.entries(b.notes).map(([n, html]) => el('div.note', { 'data-n': n, tabindex: 0 }, el('b', 'line ' + n), el('span', { html })));
    const sel = (n) => { lns.forEach((l) => l.classList.toggle('sel', l.dataset.n === String(n))); noteEls.forEach((x) => x.classList.toggle('sel', x.dataset.n === String(n))); };
    lns.forEach((l) => l.addEventListener('click', () => sel(l.dataset.n)));
    noteEls.forEach((x) => { x.addEventListener('click', () => sel(x.dataset.n)); x.addEventListener('focus', () => sel(x.dataset.n)); });
    notes.append(el('div.panel-label', 'Line-by-line notes · click a line or a note'), ...noteEls);
    return el('div', b.title ? el('div.panel-label', b.title) : null, el('div.anno', el('div.codecol', ...lns), notes));
  }
  const STAGE_LABEL = { problem: 'Understand the problem', naive: 'Naive approach', insight: 'Discover the optimisation', dryrun: 'Visual dry run', code: 'JavaScript implementation', complexity: 'Complexity derivation', practice: 'Independent practice' };
  function stagesBlock(b) {
    const box = el('section.stages', el('header', el('span.eyebrow', 'Worked problem, step by step'), el('h3', b.title)));
    b.stages.forEach((s, i) => box.append(el('div.stage', el('div.n', String(i + 1)), el('div.b', el('h4', s.label || STAGE_LABEL[s.name] || s.name), ...renderBlocks(s.blocks)))));
    return box;
  }

  // ---------- problem card with journal ----------
  function problemCard(num, opts = {}) {
    const b = BANKBY[num];
    if (!b) return el('div', 'Unknown problem ' + num);
    const d = el('details.prob', { id: 'p-' + num, open: opts.open || null });
    const pill = el('span');
    const due = el('span.small.muted');
    const refreshHead = () => {
      pill.replaceChildren(statusPill(num));
      const j = jget(num), nd = nextDue(j);
      due.textContent = nd ? 'next re-solve ' + dates.fmt(dates.parseISO(nd)) : '';
    };
    d.append(el('summary',
      el('div.ttl', el('span.num', num + '. '), b.title, el('div.meta', diffChip(b.diff), tierChip(b.tier), el('span.chip', { title: 'Role of this problem in the sequence' }, b.role === 'Core' ? 'Core pattern' : b.role), el('span.chip', 'W' + b.week + ' D' + b.day), due)),
      pill));
    const body = el('div.pbody');
    let built = false;
    d.addEventListener('toggle', () => { if (d.open && !built) { built = true; buildBody(); } });
    function buildBody() {
      const j = jget(num);
      const hintBox = el('div');
      body.append(...[
        el('div.row', el('a.btn.small', { href: b.url, target: '_blank', rel: 'noopener' }, 'Open on LeetCode ↗'), ...patternBits(b, j)),
        b.week === 12 && !(j && j.status && j.status !== 'none') ? null : el('div.small.ui', el('b', 'Why solve it: '), el('span', { html: b.whyHTML })),
        el('div', el('button.btn.small', { type: 'button', onclick: (e) => { hintBox.replaceChildren(el('div.fb.hint', el('span.tag', 'Key observation'), el('div', { html: b.hintHTML }))); e.target.remove(); } }, 'Show the hint (after 10 minutes of your own thinking)'), hintBox)].filter(Boolean));
      const sb = el('div.statusbar', { role: 'group', 'aria-label': 'Status' });
      const cls = { none: '', attempted: 's-attempted', hints: 's-hints', solo: 's-solo', revise: 's-revise' };
      const drawStatus = () => { sb.replaceChildren(...STATUS.map(([k, label]) => el('button' + (jget(num).status === k ? '.on' : '') + (cls[k] ? '.' + cls[k] : ''), { type: 'button', onclick: () => { setStatus(num, k); drawStatus(); refreshHead(); drawRes(); } }, label))); };
      drawStatus();
      body.append(el('div', el('div.panel-label', 'Status: be strict. Hints or a viewed editorial means "with hints" or "needs revision".'), sb));
      // journal fields
      const field = (key, label, type = 'textarea', extra = {}) => {
        let ctl;
        if (type === 'select') ctl = el('select', { id: 'j-' + num + '-' + key }, ...extra.options.map(([v, t]) => el('option', { value: v, selected: (jget(num)[key] || '') === v }, t)));
        else if (type === 'textarea') ctl = el('textarea', { id: 'j-' + num + '-' + key, rows: 2 });
        else ctl = el('input', { id: 'j-' + num + '-' + key, type, inputmode: type === 'number' ? 'numeric' : null });
        if (type !== 'select') ctl.value = jget(num)[key] || '';
        let t;
        ctl.addEventListener(type === 'select' ? 'change' : 'input', () => { clearTimeout(t); t = setTimeout(() => { jset(num, { [key]: ctl.value }); if (key === 'mistake' && ctl.value) logMistake(ctl.value, 'Problem ' + num); }, type === 'select' ? 0 : 600); });
        return el('label' + (extra.wide ? '.wide' : ''), label, ctl);
      };
      body.append(el('div.journal',
        field('intuition', 'Initial intuition'), field('brute', 'Brute-force approach'),
        field('optimized', 'Optimised approach'), field('observation', 'Key observation or invariant'),
        field('complexity', 'Complexity (time, space, why)'), field('edges', 'Edge cases'),
        field('mistakes', 'Mistakes made'), field('learned', 'What I learned'),
        field('timeMin', 'Time taken (minutes)', 'number'), field('mistake', 'Main mistake type', 'select', { options: MISTAKES }),
      ));
      const resBox = el('div');
      function drawRes() {
        const j = jget(num);
        const rs = j.resolves || [];
        const nd = nextDue(j);
        resBox.replaceChildren(
          el('div.panel-label', 'Revision'),
          el('div.small.ui', mastered(j) ? 'Mastered: three clean re-solves at least a week apart. It leaves active revision.' : j.status === 'none' ? 'Set a status once you have attempted it; the next re-solve date follows the +1, +3, +7, +14 day rule.' : 'Next re-solve: ' + (nd ? dates.fmt(dates.parseISO(nd)) : 'not scheduled') + '. Log each cold re-solve from a blank editor:'),
          j.status === 'none' ? null : el('div.row', { style: { marginTop: '6px' } },
            el('button.btn.small', { type: 'button', onclick: () => { logResolve(num, 'clean'); drawRes(); drawStatus(); refreshHead(); toast('Clean re-solve logged; interval extended.'); } }, 'Re-solved cleanly'),
            el('button.btn.small', { type: 'button', onclick: () => { logResolve(num, 'hint'); drawRes(); drawStatus(); refreshHead(); toast('Logged; same interval again.'); } }, 'Needed a hint or went over time'),
            el('button.btn.small', { type: 'button', onclick: () => { logResolve(num, 'fail'); drawRes(); drawStatus(); refreshHead(); toast('Logged; due again in 2 days.'); } }, 'Could not re-solve')),
          rs.length ? el('div.small.muted.ui', { style: { marginTop: '6px' } }, 'History: ' + rs.map((r) => dates.fmt(dates.parseISO(r.date)) + ' ' + { clean: 'clean', hint: 'with hint', fail: 'failed' }[r.outcome]).join(' · ')) : null);
      }
      drawRes();
      body.append(resBox);
    }
    refreshHead();
    d.append(body);
    return d;
  }
  function logMistake(code, src) {
    const list = Store.get('mistakes', []) || [];
    list.push({ at: Date.now(), code, src });
    Store.set('mistakes', list.slice(-500));
  }

  // ---------- pages ----------
  const PAGES = {};
  function lessonHead(L, crumbs) {
    const w = C.weeks[L.week - 1];
    const off = L.sched.offset;
    const kindLabel = L.kind === 'study' ? 'Week ' + L.week + ' · Day ' + L.studyDay : L.kind === 'saturday' ? 'Week ' + L.week + ' · Saturday' : 'Final day';
    const head = el('header.lesson-head',
      el('div.eyebrow', kindLabel + ' · ' + dateLabel(off) + (shifted() ? ' (shifted start)' : '')),
      el('h1', L.title || L.sched.topicText),
      L.goal ? el('p.sub', { html: L.goal }) : null);
    return head;
  }
  function timeBar(time) {
    const m = String(time || '').match(/([TIPRN])(\d+)/g);
    const def = time === 'default' ? ['T25', 'I15', 'P60', 'R15', 'N5'] : m;
    if (!def) return el('div.small', time || '');
    const names = { T: 'Theory', I: 'Implement / dry run', P: 'Practice (incl. 10-min warm-up)', R: 'Review', N: 'Notes' };
    const cols = { T: 'var(--st-current)', I: 'var(--st-frontier)', P: 'var(--st-done)', R: 'var(--st-compare)', N: 'var(--st-dim)' };
    const parts = def.map((x) => [x[0], Number(x.slice(1))]);
    const total = parts.reduce((a, [, v]) => a + v, 0);
    const bar = el('div.timebar', ...parts.map(([k, v]) => el('span', { style: { width: (v / total * 100) + '%', background: cols[k] }, title: names[k] + ' ' + v + ' min' })));
    const leg = el('div.timelegend', ...parts.map(([k, v]) => el('span', el('i', { style: { background: cols[k] } }), names[k] + ' ' + v)));
    return el('div', el('div.small', total + ' minutes'), bar, leg);
  }
  function brief(L) {
    const s = L.sched;
    const items = [];
    if (L.why) items.push(el('div', el('h4', 'Why it matters'), el('div', { html: L.why })));
    if (L.outcomes && L.outcomes.length) items.push(el('div', el('h4', 'By the end you can'), el('ul', ...L.outcomes.map((o) => el('li', { html: o })))));
    if (L.prereqs && L.prereqs.length) items.push(el('div', el('h4', 'Before you start'), el('ul', ...L.prereqs.map((o) => el('li', { html: o })))));
    items.push(el('div', el('h4', 'Time plan'), timeBar(s.time)));
    if (s.warmup && s.warmup !== '—') items.push(el('div', el('h4', 'Warm-up re-solve (10 min)'), el('div', { html: warmupText(s.warmup) + ', from a blank editor.' })));
    items.push(el('div', el('h4', 'Done when'), el('div', { html: s.doneWhen })));
    return el('div.brief', ...items);
  }
  function warmupText(w) {
    return w.replace(/\b(\d{1,4})\b/g, (m, n) => (BANKBY[n] ? '<a href="#p-' + n + '">' + n + '. ' + esc(BANKBY[n].title) + '</a>' : m));
  }
  function lessonNav(L) {
    const i = ORDERED.indexOf(L);
    const prev = ORDERED[i - 1], next = ORDERED[i + 1];
    return el('nav.row', { style: { justifyContent: 'space-between', marginTop: '40px', borderTop: '1px solid var(--rule)', paddingTop: '16px' } },
      prev ? el('a.btn', { href: '#' + prev.id }, '← ' + (prev.title || prev.sched.topicText).slice(0, 48)) : el('span'),
      next ? el('a.btn', { href: '#' + next.id }, (next.title || next.sched.topicText).slice(0, 48) + ' →') : el('span'));
  }
  function completion(L) {
    const box = el('section.card', { id: L.id + '-done' });
    const draw = () => {
      const done = lessonDone(L.id);
      const ex = exOfLesson(L);
      const solved = ex.filter((e) => exSolved(e.id)).length;
      const probs = lessonProblems(L).filter((p) => p.tier === 'C');
      const probDone = probs.filter((p) => ['hints', 'solo'].includes(jget(p.num).status)).length;
      const checks = Store.get('lessons.' + L.id + '.checks', {}) || {};
      const crit = L.ready && L.ready.length ? L.ready : [L.sched.doneWhen];
      box.replaceChildren(
        el('h3', 'Ready to move on?'),
        el('div.small.muted', 'Tick each item only if it is true without looking at notes. Reading the theory does not complete a day.'),
        el('div.list', ...crit.map((c, k) => {
          const id = 'rd-' + L.id + '-' + k;
          const cb = el('input', { type: 'checkbox', id, checked: !!checks[k] });
          cb.addEventListener('change', () => { Store.set('lessons.' + L.id + '.checks', Object.assign({}, checks, { [k]: cb.checked })); draw(); });
          return el('label.it', { for: id }, cb, el('span.grow', { html: c }));
        })),
        el('div.row.small', { style: { marginTop: '8px' } },
          ex.length ? el('span.chip', 'Exercises solved ' + solved + ' / ' + ex.length) : null,
          probs.length ? el('span.chip', 'Core problems solved ' + probDone + ' / ' + probs.length) : null),
        el('div.row', { style: { marginTop: '10px' } },
          done ? el('span.pill.s-solo', 'Day completed ' + dates.fmt(new Date(Store.get('lessons.' + L.id + '.doneAt')))) : null,
          el('button.btn' + (done ? '' : '.primary'), { type: 'button', onclick: () => {
            if (!done) {
              const allTicked = crit.every((_, k) => (Store.get('lessons.' + L.id + '.checks', {}) || {})[k]);
              if (!allTicked) { toast('Tick every "ready" item first, or come back after Sunday catch-up.'); return; }
              Store.update('lessons.' + L.id, { done: true, doneAt: Date.now() }); toast('Day marked complete. Review it again in 3 days.');
            } else { Store.update('lessons.' + L.id, { done: false }); }
            draw(); drawSide();
          } }, done ? 'Mark as not complete' : 'Mark day complete')));
    };
    draw();
    return box;
  }
  // Week 12's schedule lists its mixed sets only as text, so take them from the bank by week and day.
  function lessonProblems(L) {
    if ((L.sched.problems || []).length) return L.sched.problems;
    const m = /^w(\d+)d(\d+)$/.exec(L.id);
    return m ? BANK.filter((b) => b.week === Number(m[1]) && b.day === Number(m[2])).map((b) => ({ num: b.num, tier: b.tier })) : [];
  }
  function practiceSection(L) {
    const probs = lessonProblems(L);
    if (!probs.length) return null;
    const order = { C: 0, S: 1, O: 2 };
    const sorted = [...probs].sort((a, b) => order[a.tier] - order[b.tier]);
    return el('section', { id: L.id + '-practice' },
      el('div.sec-h', el('h2', 'Independent practice on LeetCode'), el('span.tag', 'Session step 6')),
      /^w12/.test(L.id) ? el('aside.callout.warn', { style: { marginTop: '8px' } }, el('span.ct', 'Unlabeled on purpose'), el('div', 'This week\'s problems are a mixed set. Their pattern and prerequisite stay hidden until you have attempted them (or choose to reveal them). Time yourself: 25 minutes each, and name the pattern within 8 minutes or log it as missed.')) : null,
      el('p.prose.muted', { style: { marginTop: '8px' } }, 'Core problems are today\'s work (time box: Easy 15, Medium 25, Hard 40 minutes, then the hint ladder). Stretch goes to Sunday if time runs out; Optional is optional. Record each attempt in its journal: the journal decides when you re-solve it.'),
      el('div.stack', { style: { gap: '8px', marginTop: '12px' } }, ...sorted.map((p) => problemCard(p.num))));
  }
  function flowStrip(L) {
    const steps = [];
    const blocks = L.blocks || [];
    if (L.sched.warmup && L.sched.warmup !== '—') steps.push(['1', 'Warm-up', L.id + '-warmup']);
    const hs = blocks.filter((b) => b.t === 'h');
    hs.forEach((h) => steps.push([null, h.text, h.id]));
    if (lessonProblems(L).length) steps.push([null, 'LeetCode practice', L.id + '-practice']);
    steps.push([null, 'Summary & revision', L.id + '-summary']);
    return el('nav.flow', { 'aria-label': 'Sections of this session' }, ...steps.map(([n, t, id], k) => el('a', { href: '#' + L.id, onclick: (e) => { e.preventDefault(); const t2 = document.getElementById(id); if (t2) t2.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, el('b', String(k + 1)), t)));
  }
  function warmupCard(L) {
    const w = L.sched.warmup;
    if (!w || w === '—') return null;
    const nums = (w.replace(/<[^>]+>/g, '').match(/\b\d{1,4}\b/g) || []).map(Number).filter((n) => BANKBY[n]);
    return el('section', { id: L.id + '-warmup' },
      el('div.sec-h', el('h2', 'Warm-up: retrieve before you learn'), el('span.tag', '10 minutes')),
      el('div.prose', { style: { marginTop: '8px' } }, el('p', { html: 'Re-solve <b>' + warmupText(w) + '</b> from a blank editor without notes. Retrieval is what makes yesterday stick. If it is not done in 10 minutes, stop and log it as "could not re-solve": it will come back in two days.' })),
      el('div.stack', { style: { gap: '8px', marginTop: '10px' } }, ...nums.map((n) => problemCard(n))));
  }
  function summarySection(L) {
    return el('section', { id: L.id + '-summary' },
      el('div.sec-h', el('h2', 'Summary and revision prompt'), el('span.tag', 'Session step 7')),
      L.summary && L.summary.length ? el('div.prose', { style: { marginTop: '8px' } }, el('ul', ...L.summary.map((s) => el('li', { html: s })))) : null,
      L.revision ? el('aside.callout.key', { style: { marginTop: '12px' } }, el('span.ct', 'Revision prompt: answer from memory in 3 days'), el('div', { html: L.revision })) : null,
      el('div', { style: { marginTop: '14px' } }, completion(L)));
  }

  PAGES.lesson = (L) => {
    const page = el('article.page.stack');
    page.append(lessonHead(L), L.kind === 'study' ? brief(L) : null, L.kind === 'study' ? flowStrip(L) : null);
    if (L.kind === 'study') { const wu = warmupCard(L); if (wu) page.append(wu); }
    if (L.kind === 'saturday') page.append(saturdayIntro(L));
    if (L.kind === 'final') page.append(finalDay(L));
    page.append(...renderBlocks(L.blocks));
    if (L.kind === 'study') { const p = practiceSection(L); if (p) page.append(p); page.append(summarySection(L)); }
    if (L.kind === 'saturday') page.append(saturdayOutro(L));
    page.append(lessonNav(L));
    return page;
  };

  function saturdayIntro(L) {
    const s = L.sched;
    const wrap = el('div.stack');
    wrap.append(el('div.brief', el('div', el('h4', 'Today'), el('div', { html: s.topic })), el('div', el('h4', 'Plan'), el('div', { html: s.problemsCell })), el('div', el('h4', 'Time plan'), timeBar(s.time)), el('div', el('h4', 'Done when'), el('div', { html: s.doneWhen }))));
    const a = C.assessments.find((x) => /Sat (\d+ \w+)/.test(x.date) && s.date.includes(x.date.replace('Sat ', '')));
    if (a) wrap.append(assessmentCard(a, true));
    const mockNo = (s.topic.match(/Mock (\d)/) || [])[1];
    if (mockNo) wrap.append(mockCard(C.mocks.find((m) => m.id === Number(mockNo)), true));
    const nums = s.problemsCell.replace(/<[^>]+>/g, '').match(/\b\d{1,4}\b(?= \(\+)/g) || [];
    if (nums.length) wrap.append(el('div', el('div.sec-h', el('h2', 'Re-solves due today'), el('span.tag', 'cold, from a blank editor')), el('div.stack', { style: { gap: '8px', marginTop: '10px' } }, ...nums.map(Number).filter((n) => BANKBY[n]).map((n) => problemCard(n)))));
    return wrap;
  }
  function saturdayOutro(L) {
    return el('div.stack', weeklyReflection(L.week), el('a.btn', { href: '#scorecard' }, 'Fill this week\'s scorecard →'));
  }
  function finalDay() {
    return el('div.stack', el('div.brief', el('div', el('h4', 'Today'), el('div', 'Final self-assessment (60 minutes): the readiness checklist and your next-month plan.'))), el('div.row', el('a.btn.primary', { href: '#checklist' }, 'Open the readiness checklist'), el('a.btn', { href: '#after' }, 'Post-roadmap plan')));
  }
  function weeklyReflection(w) {
    const key = 'reflections.w' + w;
    const r = Store.get(key, {}) || {};
    const f = (k, label) => { const t = el('textarea', { id: 'rf-' + w + '-' + k, rows: 2 }); t.value = r[k] || ''; let tm; t.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => Store.update(key, { [k]: t.value }), 600); }); return el('label', label, t); };
    const conf = el('select', { id: 'rf-' + w + '-conf' }, ...['', '1 · cannot start without help', '2', '3 · can solve with effort', '4', '5 · could teach it'].map((v, i) => el('option', { value: i ? String(i) : '', selected: String(r.confidence || '') === String(i || '') }, v || 'Choose…')));
    conf.addEventListener('change', () => Store.update(key, { confidence: conf.value }));
    return el('section.card', el('h3', 'Weekly reflection · Week ' + w), el('p.small.muted', 'Struggling with a problem is the work, not a sign you are behind. Write what actually happened.'),
      el('div.form', f('went', 'What clicked this week?'), f('hard', 'What was hardest, and why?'), f('change', 'One change for next week'), el('label', 'Confidence in this week\'s patterns', conf)));
  }

  PAGES.week = (w) => {
    const W = C.weeks[w - 1];
    const prog = weekProgress(w);
    const page = el('article.page.stack');
    const probs = BANK.filter((b) => b.week === w);
    const cnt = (t) => probs.filter((b) => b.tier === t).length;
    page.append(el('header.lesson-head', el('div.eyebrow', 'Week ' + w + ' · ' + W.dates + (shifted() ? ' (dates shift with your start date)' : '')), el('h1', W.title), W.overview && W.overview.goal ? el('p.sub', { html: W.overview.goal }) : null));
    page.append(el('div.grid3',
      el('div.card', el('div.panel-label', 'Days complete'), el('div.big', prog.done + ' / ' + prog.total), el('div.bar', el('span', { style: { width: (prog.pct * 100) + '%' } }))),
      el('div.card', el('div.panel-label', 'New problems'), el('div.big', String(probs.length)), el('div.small.muted', cnt('C') + ' Core · ' + cnt('S') + ' Stretch · ' + cnt('O') + ' Optional')),
      el('div.card', el('div.panel-label', 'Solved so far'), el('div.big', String(probs.filter((b) => ['hints', 'solo'].includes(jget(b.num).status)).length)), el('div.small.muted', probs.filter((b) => jget(b.num).status === 'solo').length + ' independently'))));
    page.append(el('div.sec-h', el('h2', 'Learning objectives')), htmlEl(W.objectives, 'prose'));
    if (W.overview) page.append(...renderBlocks(W.overview.blocks));
    page.append(el('div.sec-h', el('h2', 'The week, day by day')));
    page.append(el('div.stack', { style: { gap: '8px' } }, ...W.days.map((d) => {
      const L = LESSONS[d.id];
      if (!L) return el('div.weekcard', { style: { opacity: .7 } }, el('span.dot'), el('div', el('div.t', d.kind === 'rest' ? (d.topicText.startsWith('Holiday') ? 'Holiday' : 'Rest or Stretch catch-up') : d.title), el('div.d', dateLabel(d.offset))), el('span'));
      const done = lessonDone(d.id);
      return el('a.weekcard', { href: '#' + d.id }, el('span.dot' + (done ? '.full' : '')), el('div', el('div.t', L.title || d.title), el('div.d', dateLabel(d.offset) + ' · ' + (L.kind === 'saturday' ? 'review, assessment or mock' : 'Day ' + L.studyDay))), el('span.small.muted', done ? 'done' : ''));
    })));
    if (W.notes) page.append(htmlEl(W.notes, 'prose'));
    page.append(el('aside.callout.warn', el('span.ct', 'If you fall behind this week'), el('div', { html: W.fallBehind })));
    page.append(weeklyReflection(w));
    return page;
  };

  // ---------- home & today ----------
  PAGES.home = () => {
    const page = el('article.page.stack');
    const cd = currentDay();
    const totalStudy = STUDY.length;
    const doneStudy = STUDY.filter((l) => lessonDone(l.id)).length;
    const solved = BANK.filter((b) => ['hints', 'solo'].includes(jget(b.num).status)).length;
    const solo = BANK.filter((b) => jget(b.num).status === 'solo').length;
    page.append(el('header.lesson-head', el('div.eyebrow', '12 weeks · JavaScript · about 2 hours a day'), el('h1', 'DSA Pattern Lab'),
      el('p.sub', 'Learn each pattern from its intuition to an interview-ready solution: read the theory, step through the algorithm, test yourself, then solve the problems and log them in your journal.')));
    let todayCard;
    if (cd.before) todayCard = el('div.card', el('h3', 'Week 1 starts in ' + cd.before + ' day' + (cd.before > 1 ? 's' : '')), el('p', 'Take the diagnostic first: it decides whether you follow the Accelerated, Standard or Foundations track for Weeks 1–3.'), el('div.row', { style: { marginTop: '10px' } }, el('a.btn.primary', { href: '#diagnostic' }, 'Take the diagnostic'), el('a.btn', { href: '#w1d1' }, 'Preview Day 1')));
    else if (cd.after) todayCard = el('div.card', el('h3', 'The 12 weeks are over'), el('p', 'Run the readiness checklist and switch to the maintenance plan.'), el('div.row', el('a.btn.primary', { href: '#checklist' }, 'Readiness checklist'), el('a.btn', { href: '#after' }, 'Maintenance plan')));
    else {
      const d = cd.day, L = LESSONS[d.id];
      todayCard = el('div.card', el('div.panel-label', 'Today · ' + dates.fmt(dates.today())), el('h3', L ? (L.title || d.title) : d.kind === 'rest' ? 'Rest or Stretch catch-up' : d.title),
        el('p.small.muted', L ? 'Week ' + L.week + (L.kind === 'study' ? ', Day ' + L.studyDay : ', ' + L.kind) : 'No new material today. Rest, or finish Stretch problems from this week.'),
        el('div.row', { style: { marginTop: '10px' } }, L ? el('a.btn.primary', { href: '#' + d.id }, 'Start today\'s session') : el('a.btn.primary', { href: '#week-' + (Math.floor(cd.offset / 7) + 1) }, 'See this week'), el('a.btn', { href: '#revision' }, 'Revision due: ' + dueProblems().length)));
    }
    page.append(el('div.grid2', todayCard,
      el('div.card', el('div.panel-label', 'Your progress'), el('div.row', { style: { gap: '22px' } },
        el('div', el('div.big', doneStudy + '/' + totalStudy), el('div.small.muted', 'study days complete')),
        el('div', el('div.big', String(solved)), el('div.small.muted', 'problems solved (' + solo + ' alone)')),
        el('div', el('div.big', String(Object.values(Store.state.ex).filter((r) => r && r.solved).length)), el('div.small.muted', 'exercises solved'))),
        el('p.small.muted', { style: { marginTop: '8px' } }, Store.status().text + '. ', el('a', { href: '#preferences' }, 'Storage and backup')))));
    page.append(el('div.sec-h', el('h2', 'How a session works')));
    page.append(el('ol.prose', ...['Warm-up: re-solve one earlier problem from a blank editor (10 min).', 'Theory with diagrams and a visualizer you can step through.', 'A worked problem: naive approach → the observation → visual dry run → code → complexity.', 'Concept checks: short exercises that test what you just read.', 'A guided interview-style problem with hints.', 'Independent LeetCode practice, logged in the journal.', 'Summary, a revision prompt, and an honest "ready to move on" check.'].map((t) => el('li', t))));
    page.append(el('div.sec-h', el('h2', 'The 12 weeks')));
    page.append(el('div.stack', { style: { gap: '8px' } }, ...C.weeks.map((W) => {
      const p = weekProgress(W.n);
      return el('a.weekcard', { href: '#week-' + W.n }, ring(p.pct, 30), el('div', el('div.t', 'Week ' + W.n + ' · ' + W.title), el('div.d', W.dates + ' · ' + p.done + ' of ' + p.total + ' days')), el('span.small.muted', '→'));
    })));
    page.append(el('div.sec-h', el('h2', 'Milestones')), el('div.grid3', ...[[4, 'Week 4', 'Linear patterns, binary search, lists and stacks.'], [8, 'Week 8', 'Recursion, trees, heaps and graph traversal.'], [12, 'Week 12', 'DP, mixed unlabeled practice, final mocks.']].map(([w, t, d]) => el('a.card', { href: '#scorecard', style: { textDecoration: 'none', color: 'inherit' } }, el('div.panel-label', t), el('h3', d), el('div.small.muted', 'Targets and your numbers on the scorecard page.')))));
    return page;
  };
  PAGES.today = () => {
    const cd = currentDay();
    if (cd.day && LESSONS[cd.day.id]) { location.hash = '#' + cd.day.id; return el('div'); }
    return PAGES.home();
  };

  // ---------- problems ----------
  PAGES.problems = (focus) => {
    const page = el('article.page.stack');
    page.append(el('header.lesson-head', el('div.eyebrow', 'Problem bank · ' + BANK.length + ' problems'), el('h1', 'Problems and journal'), el('p.sub', 'Every problem from the curriculum, in the order you meet it, with its pattern, hint and your journal. Statuses are yours to set honestly: viewing a solution never counts as solved.')));
    const f = Store.get('settings.pfilter', {}) || {};
    const q = el('input', { id: 'pf-q', placeholder: 'Search title, number or pattern', value: f.q || '' });
    const wk = el('select', { id: 'pf-w' }, el('option', { value: '' }, 'All weeks'), ...C.weeks.map((W) => el('option', { value: W.n, selected: String(f.w) === String(W.n) }, 'Week ' + W.n)));
    const tier = el('select', { id: 'pf-t' }, el('option', { value: '' }, 'All tiers'), ...['C', 'S', 'O'].map((t) => el('option', { value: t, selected: f.t === t }, tierName[t])));
    const st = el('select', { id: 'pf-s' }, el('option', { value: '' }, 'Any status'), ...STATUS.map(([k, l]) => el('option', { value: k, selected: f.s === k }, l)), el('option', { value: 'due', selected: f.s === 'due' }, 'Due for re-solve'));
    const counts = el('div.small.muted.ui');
    const list = el('div.stack', { style: { gap: '8px' } });
    const draw = () => {
      const qq = q.value.trim().toLowerCase();
      Store.set('settings.pfilter', { q: q.value, w: wk.value, t: tier.value, s: st.value });
      const today = dates.iso(dates.today());
      const rows = BANK.filter((b) => (!wk.value || String(b.week) === wk.value) && (!tier.value || b.tier === tier.value)
        && (!st.value || (st.value === 'due' ? (nextDue(jget(b.num)) && nextDue(jget(b.num)) <= today) : (jget(b.num).status || 'none') === st.value))
        && (!qq || (b.num + ' ' + b.title + ' ' + (b.week === 12 ? '' : b.pattern)).toLowerCase().includes(qq)));
      counts.textContent = rows.length + ' shown';
      list.replaceChildren(...rows.map((b) => problemCard(b.num, { open: focus && Number(focus) === b.num })));
    };
    [q, wk, tier, st].forEach((c) => c.addEventListener(c === q ? 'input' : 'change', draw));
    page.append(el('div.form', el('div.two', el('label', 'Search', q), el('label', 'Week', wk), el('label', 'Tier', tier), el('label', 'Status', st))), counts, list);
    draw();
    if (focus) setTimeout(() => { const t = document.getElementById('p-' + focus); if (t) { t.open = true; t.scrollIntoView({ block: 'start' }); } }, 30);
    return page;
  };

  // ---------- revision ----------
  function dueProblems() {
    const today = dates.iso(dates.today());
    const rank = (j) => (j.status === 'revise' ? 0 : j.status === 'hints' ? 1 : j.status === 'attempted' ? 1 : 2);
    return BANK.map((b) => ({ b, j: jget(b.num) })).filter(({ j }) => { const d = nextDue(j); return d && d <= today; })
      .sort((a, b) => rank(a.j) - rank(b.j) || (a.j.due < b.j.due ? -1 : 1));
  }
  function allExercises() { const out = []; for (const L of Object.values(LESSONS)) exOfLesson(L).forEach((e) => out.push(e)); for (const P of Object.values(C.extra || {})) exOfLesson(P).forEach((e) => out.push(e)); return out; }
  PAGES.revision = () => {
    const page = el('article.page.stack');
    page.append(el('header.lesson-head', el('div.eyebrow', 'Spaced repetition'), el('h1', 'Revision'), el('p.sub', 'What to re-solve today, the questions you missed, the days due for a review quiz, and the mistakes that keep coming back.')));
    const due = dueProblems();
    page.append(el('div.sec-h', el('h2', 'Problems due for a cold re-solve'), el('span.tag', due.length + ' due')));
    page.append(el('p.prose.muted', 'Ordered by the revision rules: problems you could not solve or needed the solution for come first, then problems solved with hints, then the rest by date.'));
    page.append(due.length ? el('div.stack', { style: { gap: '8px' } }, ...due.slice(0, 30).map(({ b }) => problemCard(b.num))) : el('div.empty', 'Nothing due today. Problems appear here once you set a status in their journal.'));
    // missed exercises
    const exAll = allExercises();
    const missed = exAll.filter((e) => { const r = Store.get('ex.' + e.id, null); return r && r.attempts && (r.firstTry === false || r.revealed); });
    const recent = missed.sort((a, b) => ((Store.get('ex.' + b.id, {}) || {}).lastWrong || 0) - ((Store.get('ex.' + a.id, {}) || {}).lastWrong || 0));
    page.append(el('div.sec-h', el('h2', 'Questions you missed'), el('span.tag', missed.length + ' to retry')));
    page.append(recent.length ? el('div.stack', ...recent.slice(0, 8).map((e) => el('div', el('div.small.muted.ui', 'From ', el('a', { href: '#' + e.lesson }, lessonTitle(e.lesson))), g.Exercises.render(e)))) : el('div.empty', 'No missed questions yet. Questions you miss on the first try, or reveal, collect here for a retry.'));
    // lessons due for review
    const now = Date.now();
    const dueLessons = Object.values(LESSONS).filter((L) => { const s = Store.get('lessons.' + L.id, null); if (!s || !s.done || !s.doneAt) return false; const age = (now - s.doneAt) / 864e5; const last = s.quizAt ? (now - s.quizAt) / 864e5 : null; return age >= 3 && (last === null || (last >= 7)); });
    page.append(el('div.sec-h', el('h2', 'Days due for a review quiz'), el('span.tag', 'done 3+ days ago')));
    page.append(dueLessons.length ? el('div.list', ...dueLessons.slice(0, 10).map((L) => el('div.it', el('span.grow', el('a', { href: '#quiz-' + L.id }, L.title || L.sched.topicText), el('div.small.muted', 'Week ' + L.week + ' · ' + (L.revision ? L.revision.replace(/<[^>]+>/g, '').slice(0, 110) + '…' : ''))), el('a.btn.small', { href: '#quiz-' + L.id }, 'Quick quiz')))) : el('div.empty', 'Complete a day and it will come back here three days later for a short quiz.'));
    // mistakes
    const ms = Store.get('mistakes', []) || [];
    const tally = {}; ms.forEach((m) => (tally[m.code] = (tally[m.code] || 0) + 1));
    for (const b of BANK) { const j = jget(b.num); if (j.mistake && !ms.some((m) => m.src === 'Problem ' + b.num)) tally[j.mistake] = (tally[j.mistake] || 0) + 0; }
    page.append(el('div.sec-h', el('h2', 'Recurring mistakes')));
    const max = Math.max(1, ...Object.values(tally));
    const rows = MISTAKES.slice(1).map(([k, label]) => el('div.it', el('span', { style: { width: '260px', flex: 'none' } }, label), el('div.grow', el('div.bar', el('span', { style: { width: ((tally[k] || 0) / max * 100) + '%', background: 'var(--st-error)' } }))), el('span.num.small', String(tally[k] || 0))));
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    page.append(el('div.card', el('div.list', ...rows), top && top[1] >= 3 ? el('aside.callout.mistake', { style: { marginTop: '10px' } }, el('span.ct', 'Most frequent: ' + top[0]), el('div', MISTAKE_FIX[top[0]] + ' Three of the same type in a week: spend Sunday on that category.')) : el('p.small.muted', { style: { marginTop: '8px' } }, 'Log a mistake type in a problem\'s journal, or add one here.')));
    const code = el('select', { id: 'mk-code' }, ...MISTAKES.map(([v, t]) => el('option', { value: v }, t)));
    const note = el('input', { id: 'mk-note', placeholder: 'What happened (optional)' });
    page.append(el('div.form', el('div.two', el('label', 'Mistake type', code), el('label', 'Note', note)), el('div', el('button.btn', { type: 'button', onclick: () => { if (!code.value) return; logMistake(code.value, note.value || 'manual'); toast('Mistake logged'); render(); } }, 'Log a mistake'))));
    page.append(el('aside.callout.tip', el('span.ct', 'How the revision rules work'), htmlEl(sectionHTML(8, ['8.1 Spaced repetition on this calendar']))));
    return page;
  };
  function lessonTitle(id) { const L = LESSONS[id] || (C.extra && C.extra[id]); return L ? (L.title || (L.sched && L.sched.topicText) || id) : id; }
  PAGES.quiz = (id) => {
    const L = LESSONS[id];
    const page = el('article.page.stack');
    if (!L) return page;
    const exs = exOfLesson(L).filter((e) => e.type !== 'interview' && e.type !== 'code');
    page.append(el('header.lesson-head', el('div.eyebrow', 'Review quiz · Week ' + L.week), el('h1', L.title || L.sched.topicText), el('p.sub', 'Answer from memory before reopening the lesson. Then go back only to the parts you missed.')));
    if (L.revision) page.append(el('aside.callout.key', el('span.ct', 'Revision prompt'), el('div', { html: L.revision })));
    const pick = exs.slice(0).sort(() => Math.random() - 0.5).slice(0, 4).map((e) => Object.assign({}, e, { id: e.id + '-rq' }));
    page.append(...pick.map((e) => g.Exercises.render(e)));
    page.append(el('div.row', el('button.btn.primary', { type: 'button', onclick: () => { Store.update('lessons.' + id, { quizAt: Date.now() }); toast('Quiz logged. Next review in 7 days.'); location.hash = '#revision'; } }, 'Finish quiz'), el('a.btn', { href: '#' + id }, 'Reopen the lesson')));
    return page;
  };

  // ---------- sections from the roadmap ----------
  function sectionHTML(n, only) {
    const s = C.sections[n]; if (!s) return '';
    return (only ? '' : s.lead) + s.subs.filter((x) => !only || only.includes(x.title)).map((x) => (only ? '' : '<h3 id="' + x.id + '">' + esc(x.title) + '</h3>') + x.html).join('');
  }
  function sectionPage(n, eyebrow, sub, extraTop, extraBottom) {
    const s = C.sections[n];
    const page = el('article.page.stack');
    page.append(el('header.lesson-head', el('div.eyebrow', eyebrow), el('h1', s.title.replace(/\s*\(.*\)$/, '')), sub ? el('p.sub', sub) : null));
    if (extraTop) page.append(...[].concat(extraTop));
    if (s.lead) page.append(htmlEl(s.lead, 'prose'));
    s.subs.forEach((x) => page.append(el('div.sec-h', { id: x.id }, el('h2', x.title)), htmlEl(x.html, 'prose')));
    if (extraBottom) page.append(...[].concat(extraBottom));
    return page;
  }
  const extraBlocks = (id) => (C.extra && C.extra[id] ? renderBlocks(C.extra[id].blocks) : []);
  PAGES.overview = () => {
    const p = sectionPage(0, 'Course plan', 'Strategy, assumptions and how the 12 weeks fit together.');
    const s2 = C.sections[2];
    p.append(el('div.sec-h', el('h2', s2.title)), htmlEl(s2.lead, 'prose'));
    p.append(...extraBlocks('depmap'));
    s2.subs.forEach((x) => p.append(el('div.sec-h', { id: x.id }, el('h2', x.title)), htmlEl(x.html, 'prose')));
    p.append(el('div.sec-h', el('h2', 'How the daily schedule works')), htmlEl(C.scheduleIntro, 'prose'));
    return p;
  };
  PAGES.reference = () => sectionPage(6, 'JavaScript reference', 'Templates and the cost model of built-ins. Every runnable template here is executed by the test suite (tests/templates.mjs); the three skeletons with placeholders (the recursion, sliding-window and backtracking outlines) are only syntax-checked.', extraBlocks('reference'));
  PAGES.method = () => sectionPage(7, 'Problem-solving method', 'The 14-step method, the pattern table and the classification drill. The drill below is interactive.', null, extraBlocks('method'));
  PAGES['revision-system'] = () => sectionPage(8, 'Revision system', 'The rules the Revision page applies for you.', el('div.row', el('a.btn.primary', { href: '#revision' }, 'Open your revision page')));
  PAGES.after = () => sectionPage(12, 'After the 12 weeks', null);

  // ---------- diagnostic ----------
  PAGES.diagnostic = () => {
    const page = el('article.page.stack');
    const s1 = C.sections[1];
    page.append(el('header.lesson-head', el('div.eyebrow', 'Week 0 · before Monday 2 Nov'), el('h1', 'Starting-point diagnostic'), el('p.sub', 'Two sessions, about 2.5 hours. Session A is answered here and scored automatically; Session B is solved on LeetCode and scored by you. The result routes you to a track for Weeks 1–3.')));
    page.append(htmlEl(s1.lead, 'prose'));
    const sub = (t) => s1.subs.find((x) => x.title.startsWith(t));
    page.append(el('div.sec-h', el('h2', sub('What a 3.5').title)), htmlEl(sub('What a 3.5').html, 'prose'));
    page.append(el('div.sec-h', el('h2', 'Session A: concept check'), el('span.tag', '40 minutes · 12 questions')));
    page.append(...extraBlocks('diagnostic'));
    const scoreA = () => (C.extra.diagnostic ? exOfLesson(C.extra.diagnostic) : []).filter((e) => { const r = Store.get('ex.' + e.id, null); return r && r.solved && r.firstTry; }).length;
    page.append(el('div.sec-h', el('h2', 'Session B: practical coding'), el('span.tag', '90 minutes · timer running')), htmlEl(sub('Session B').html, 'prose'));
    const B = Store.get('diag.B', {}) || {};
    const tasks = ['B1 · 1480 Running Sum', 'B2 · 349 Intersection of Two Arrays', 'B3 · 14 Longest Common Prefix', 'B4 · 2 Add Two Numbers', 'B5 · binary search AND recursive flatten (both parts)'];
    const bList = el('div.list', ...tasks.map((t, k) => {
      const cb = el('input', { type: 'checkbox', id: 'db-' + k, checked: !!B[k] });
      cb.addEventListener('change', () => { Store.set('diag.B', Object.assign({}, Store.get('diag.B', {}) || {}, { [k]: cb.checked })); drawResult(); });
      return el('label.it', { for: 'db-' + k }, cb, el('span.grow', t, el('div.small.muted', 'Tick only if solved within its time box AND you stated the complexity before submitting.')));
    }));
    page.append(el('div.card', bList));
    const result = el('div');
    function drawResult() {
      const A = scoreA();
      const Bs = Object.values(Store.get('diag.B', {}) || {}).filter(Boolean).length;
      const track = A <= 5 || Bs <= 1 ? 'C' : A >= 10 && Bs >= 4 ? 'A' : 'B';
      const rule = track === 'C' ? 'Rule 1 matched: A ≤ 5 or B ≤ 1.' : track === 'A' ? 'Rule 2 matched: A ≥ 10 and B ≥ 4.' : 'Rule 3: neither rule 1 nor rule 2 matched.';
      const names = { A: 'Track A: Accelerated', B: 'Track B: Standard', C: 'Track C: Foundations' };
      const current = Store.get('settings.track', '');
      result.replaceChildren(el('div.card',
        el('div.panel-label', 'Your result'),
        el('div.row', el('div', el('div.big', A + ' / 12'), el('div.small.muted', 'Session A (first-try correct only)')), el('div', el('div.big', Bs + ' / 5'), el('div.small.muted', 'Session B'))),
        el('h3', { style: { marginTop: '10px' } }, names[track]), el('p.small', rule),
        el('div.row', { style: { marginTop: '8px' } }, el('button.btn.primary', { type: 'button', onclick: () => { Store.set('settings.track', track); toast(names[track] + ' saved'); drawResult(); } }, current === track ? 'Saved as your track' : 'Use this track'), current && current !== track ? el('span.small.muted', 'Currently saved: ' + names[current]) : null)));
    }
    drawResult();
    Store.on(() => { if (location.hash === '#diagnostic') drawResult(); });
    page.append(el('div.sec-h', el('h2', 'Scoring and routing')), htmlEl(sub('Scoring').html, 'prose'), result);
    page.append(el('div.sec-h', el('h2', 'Answer key')), el('details', el('summary.ui', 'Show the written answer key (after finishing Session A)'), htmlEl(sub('Answer key').html, 'prose')));
    return page;
  };

  // ---------- assessments & mocks ----------
  function timer(minutes, key) {
    const box = el('div.row');
    const disp = el('span.timer', minutes + ':00');
    let left = minutes * 60, t = null;
    const draw = () => { const m = Math.floor(Math.abs(left) / 60), s = Math.abs(left) % 60; disp.textContent = (left < 0 ? '+' : '') + m + ':' + String(s).padStart(2, '0'); disp.classList.toggle('over', left < 0); };
    const start = el('button.btn.primary.small', { type: 'button', onclick: () => { if (t) { clearInterval(t); t = null; start.textContent = 'Resume'; return; } t = setInterval(() => { left--; draw(); }, 1000); start.textContent = 'Pause'; } }, 'Start');
    const reset = el('button.btn.small.ghost', { type: 'button', onclick: () => { clearInterval(t); t = null; left = minutes * 60; start.textContent = 'Start'; draw(); } }, 'Reset');
    box.append(disp, start, reset);
    return box;
  }
  const RUBRIC = [['Correct, accepted solution', 4, 'Accepted within the time limit (2 if accepted late, 1 if correct approach but buggy)'], ['Optimal or acceptable complexity', 2, 'Meets the complexity the constraints require'], ['Complexity stated correctly', 1, 'Time and space written before submitting'], ['Edge cases', 2, 'Listed at step 2 and tested at step 11'], ['Brute force articulated', 1, 'Written with its complexity before the optimisation']];
  function assessmentCard(a, compact) {
    const key = 'assess.' + a.id;
    const saved = Store.get(key, {}) || {};
    const probs = [{ label: 'Cold re-solve (' + (a.coldNums.length ? 'one of ' + a.coldNums.join(', ') : 'weakest pattern') + ')', num: null }, ...a.problems.map((p) => ({ label: p.num + '. ' + p.title + ' (' + p.diff + ', ' + p.minutes + ' min)', url: p.url, num: p.num }))];
    const box = el('section.card', { id: 'a-' + a.id });
    const result = el('div');
    const drawResult = () => {
      const sc = Store.get(key + '.scores', {}) || {};
      let total = 0, max = probs.length * 10, unseenFull = false;
      probs.forEach((p, i) => { const pts = RUBRIC.reduce((acc, _, r) => acc + (Number(sc[i + '-' + r]) || 0), 0); total += pts; if (i > 0 && Number(sc[i + '-0']) === 4) unseenFull = true; });
      const passMark = Math.ceil(max * 0.7);
      const pass = total >= passMark && unseenFull;
      result.replaceChildren(el('div.row', el('div.big', total + ' / ' + max), el('span.pill.' + (pass ? 's-solo' : 's-revise'), pass ? 'Pass' : 'Not yet a pass'), el('span.small.muted', 'Pass = at least ' + passMark + ' points and one unseen problem fully accepted' + (unseenFull ? ' ✓' : ' (not yet)'))),
        !pass && total ? el('aside.callout.warn', { style: { marginTop: '8px' } }, el('span.ct', 'Remediation'), el('div', 'Use next Sunday: re-solve the two tracker problems closest to each failed problem\'s pattern, then retry the failed problem cold. Two failed assessments in a row: insert a consolidation week (Scorecards page explains how).')) : null);
    };
    box.append(el('div.panel-label', a.date + ' · ' + a.total + ' · pass mark ' + a.pass), el('h3', 'Assessment ' + a.id.replace('A', '')), el('div.small', { html: 'Tests: ' + a.topicsHTML }));
    box.append(el('aside.callout.warn', { style: { margin: '10px 0' } }, el('span.ct', 'Conditions'), el('div', 'Timer running, no notes, no hints, no AI, no editorial. Do not open these problems before the session. Write steps 1–9 of the method as comments before coding each problem.')));
    const total = probs.length === 4 ? 100 : (a.problems.reduce((x, p) => x + p.minutes, 0) + (a.coldMinutes || 20));
    box.append(el('div.row', el('span.small.muted', 'Session timer'), timer(total)));
    const sc = Store.get(key + '.scores', {}) || {};
    probs.forEach((p, i) => {
      const rowEls = RUBRIC.map(([label, max, help], r) => {
        const s = el('select', { id: 'as-' + a.id + '-' + i + '-' + r, 'aria-label': p.label + ': ' + label }, ...Array.from({ length: max + 1 }, (_, v) => el('option', { value: v, selected: Number(sc[i + '-' + r] || 0) === v }, v + ' / ' + max)));
        s.addEventListener('change', () => { Store.set(key + '.scores', Object.assign({}, Store.get(key + '.scores', {}) || {}, { [i + '-' + r]: Number(s.value) })); drawResult(); });
        return el('label', { title: help }, label, s);
      });
      box.append(el('div', { style: { marginTop: '12px' } }, el('div.ui', { style: { fontWeight: 600 } }, p.url ? el('a', { href: p.url, target: '_blank', rel: 'noopener' }, p.label + ' ↗') : p.label), el('div.journal', { style: { marginTop: '6px' } }, ...rowEls)));
    });
    box.append(el('div', { style: { marginTop: '12px' } }, result));
    drawResult();
    return box;
  }
  const MOCK_DIMS = [['Problem understanding', ['Started coding without clarifying', 'Asked some questions, missed key constraints', 'Clarified constraints and edge cases', 'Also proposed test cases and confirmed the output format']],
    ['Approach and optimisation', ['No working approach', 'Brute force only', 'Optimal with a hint', 'Optimal independently, with justification']],
    ['Coding', ['Did not finish', 'Finished with major bugs', 'Minor bugs fixed when found', 'Clean, correct, well-structured']],
    ['Verification', ['No testing', 'Ran examples only', 'Dry-ran and tested edge cases', 'Found and fixed own bug before running']],
    ['Communication', ['Mostly silent', 'Explained only when asked', 'Narrated reasoning clearly', 'Clear, structured, discussed trade-offs']]];
  function mockCard(m) {
    if (!m) return el('div');
    const key = 'mocks.m' + m.id;
    const box = el('section.card', { id: 'm-' + m.id });
    const res = el('div');
    const draw = () => {
      const s = Store.get(key, {}) || {};
      const vals = MOCK_DIMS.map((_, i) => Number(s['d' + i] || 0));
      const total = vals.reduce((a, b) => a + b, 0), filled = vals.every((v) => v > 0);
      const pass = filled && total >= 14 && vals.every((v) => v > 1);
      res.replaceChildren(el('div.row', el('div.big', total + ' / 20'), filled ? el('span.pill.' + (pass ? 's-solo' : 's-revise'), pass ? 'Pass' : 'Below pass') : el('span.small.muted', 'Score all five dimensions'), el('span.small.muted', 'Pass = 14 / 20 with no dimension at 1')),
        filled && !pass ? el('aside.callout.warn', { style: { marginTop: '8px' } }, el('span.ct', 'After a weak mock'), el('div', 'Re-solve the mock problem cold in two days while speaking aloud and recording yourself. If communication scored 1–2, do the 90-second explanation drill daily next week.')) : null);
    };
    box.append(el('div.panel-label', m.date), el('h3', 'Mock interview ' + m.id), el('div.small', { html: 'In scope: ' + m.topicsHTML }));
    box.append(el('div.small.ui', { style: { marginTop: '6px' } }, 'Pool (interviewer picks one; the other two become Sunday practice): ', ...m.pool.map((p, i) => [i ? ' · ' : '', el('a', { href: p.url, target: '_blank', rel: 'noopener' }, p.num + '. ' + p.title)])));
    box.append(el('div.row', { style: { margin: '10px 0' } }, el('span.small.muted', '45-minute interview'), timer(45)));
    const s = Store.get(key, {}) || {};
    box.append(el('div.journal', ...MOCK_DIMS.map(([dim, lv], i) => {
      const sel = el('select', { id: 'mk-' + m.id + '-' + i }, el('option', { value: '' }, 'Score…'), ...lv.map((t, k) => el('option', { value: k + 1, selected: Number(s['d' + i]) === k + 1 }, (k + 1) + ' · ' + t)));
      sel.addEventListener('change', () => { Store.update(key, { ['d' + i]: Number(sel.value) }); draw(); });
      return el('label', dim, sel);
    }), (() => { const t = el('textarea', { id: 'mk-' + m.id + '-fb', rows: 3, placeholder: 'Strengths: … Concerns: … Signal: … To improve: 1) 2) 3)' }); t.value = s.feedback || ''; let tm; t.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => Store.update(key, { feedback: t.value }), 600); }); return el('label.wide', 'Interviewer feedback', t); })()));
    box.append(el('div', { style: { marginTop: '10px' } }, res));
    draw();
    return box;
  }
  PAGES.assessments = () => {
    const page = el('article.page.stack');
    const s9 = C.sections[9];
    page.append(el('header.lesson-head', el('div.eyebrow', 'Weeks 2, 4, 6, 8, 10 and 12'), el('h1', 'Assessments'), el('p.sub', 'Six timed checks of what you can do alone. Score each problem with the rubric; the page applies the pass rule.')));
    page.append(htmlEl(s9.subs[0].html, 'prose'));
    C.assessments.forEach((a) => page.append(assessmentCard(a)));
    return page;
  };
  PAGES.mocks = () => {
    const page = el('article.page.stack');
    const s9 = C.sections[9];
    page.append(el('header.lesson-head', el('div.eyebrow', 'Six sessions'), el('h1', 'Mock interviews'), el('p.sub', 'What you can do while explaining. A peer interviews you, or Claude in a new chat with the prompt below.')));
    page.append(htmlEl(s9.subs[2].html, 'prose'), htmlEl(s9.subs[3].html, 'prose'));
    const prompt = (s9.subs[2].html.match(/<pre class="code"><code>([\s\S]*?)<\/code><\/pre>/) || [])[1];
    if (prompt) {
      const txt = prompt.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
      const ta = el('textarea.editor', { id: 'mock-prompt', readonly: true, style: { minHeight: '120px' } }); ta.value = txt;
      page.append(el('div.row', el('button.btn', { type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(ta.value); toast('Prompt copied'); } catch (e) { ta.select(); toast('Press Ctrl+C (or ⌘C) to copy the selected prompt'); } } }, 'Copy the interviewer prompt')), ta);
    }
    C.mocks.forEach((m) => page.append(mockCard(m)));
    return page;
  };

  // ---------- scorecards & milestones ----------
  PAGES.scorecard = () => {
    const page = el('article.page.stack');
    const s10 = C.sections[10];
    page.append(el('header.lesson-head', el('div.eyebrow', 'Fill every Saturday'), el('h1', 'Scorecards and milestones'), el('p.sub', 'Columns computed from your journal are filled in for you; the rest you enter. Milestone checks run against the same numbers.')));
    page.append(htmlEl(s10.subs[0].html, 'prose'));
    const rows = C.weeks.map((W) => {
      const w = W.n;
      const inWeek = (j) => { if (!j.firstDate) return false; const off = dates.daysBetween(startDate(), dates.parseISO(j.firstDate)); return Math.floor(off / 7) + 1 === w; };
      const js = BANK.map((b) => jget(b.num)).filter(inWeek);
      const attempted = js.length, solo = js.filter((j) => j.status === 'solo').length, hints = js.filter((j) => j.status === 'hints').length, sol = js.filter((j) => j.status === 'revise').length;
      const res = BANK.flatMap((b) => (jget(b.num).resolves || []).filter((r) => Math.floor(dates.daysBetween(startDate(), dates.parseISO(r.date)) / 7) + 1 === w));
      const m = Store.get('scorecards.w' + w, {}) || {};
      const inp = (k, ph) => { const x = el('input', { id: 'sc-' + w + '-' + k, value: m[k] || '', placeholder: ph, style: { width: '7ch' } }); x.addEventListener('change', () => Store.update('scorecards.w' + w, { [k]: x.value })); return x; };
      const conf = (Store.get('reflections.w' + w, {}) || {}).confidence || '';
      return el('tr', el('td', 'W' + w), el('td.num', String(attempted)), el('td.num', String(solo)), el('td.num', String(hints)), el('td.num', String(sol)), el('td.num', res.filter((r) => r.outcome === 'clean').length + ' / ' + res.length), el('td', inp('patterns', '%')), el('td', inp('approach', 'min')), el('td', inp('cxacc', '%')), el('td.num', conf || '—'));
    });
    page.append(el('div.tbl', el('table', el('thead', el('tr', ...['Week', 'Attempted', 'Independent', 'With hints', 'Needed solution', 'Clean re-solves', 'Patterns recognised', 'Avg time to approach', 'Complexity accuracy', 'Confidence'].map((h) => el('th', h)))), el('tbody', ...rows))));
    page.append(el('p.small.muted', 'Attempted / independent / hints / needed solution count problems whose first journal entry falls in that week. Confidence comes from the weekly reflection.'));
    // milestone check
    const unique = BANK.filter((b) => jget(b.num).status !== 'none').length;
    const aPass = (id) => { const sc = Store.get('assess.' + id + '.scores', {}) || {}; const a = C.assessments.find((x) => x.id === id); const n = 1 + a.problems.length; let t = 0, full = false; for (let i = 0; i < n; i++) { for (let r = 0; r < 5; r++) t += Number(sc[i + '-' + r]) || 0; if (i && Number(sc[i + '-0']) === 4) full = true; } return t >= Math.ceil(n * 10 * 0.7) && full; };
    page.append(el('div.sec-h', el('h2', 'Milestone check from your data')));
    page.append(el('div.grid3', ...[[4, 50, ['A1', 'A2']], [8, 100, ['A3', 'A4']], [12, 145, ['A6']]].map(([w, target, as]) => el('div.card', el('div.panel-label', 'Week ' + w), el('div', 'Unique problems attempted: ', el('b', String(unique)), ' of ≥ ' + target), el('div', 'Assessments passed: ' + as.map((x) => x + (aPass(x) ? ' ✓' : ' ✗')).join(', ')), el('div.small.muted', 'Other measures: see the table below and your weekly entries.')))));
    s10.subs.slice(2).forEach((x) => page.append(el('div.sec-h', el('h2', x.title)), htmlEl(x.html, 'prose')));
    return page;
  };

  // ---------- readiness checklist ----------
  PAGES.checklist = () => {
    const page = el('article.page.stack');
    const s11 = C.sections[11];
    page.append(el('header.lesson-head', el('div.eyebrow', 'Sun 24 Jan'), el('h1', 'Interview-readiness checklist'), el('p.sub', 'Tick only what you have demonstrated in the last two weeks (assessment, mock or cold re-solve), not what you have read.')));
    const state = Store.get('checklist', {}) || {};
    const groups = s11.subs.filter((x) => x.title !== 'Verdict');
    const verdict = el('div');
    const items = [];
    groups.forEach((gp) => {
      const lis = [...gp.html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].replace(/<input[^>]*>\s*/g, ''));
      page.append(el('div.sec-h', el('h2', gp.title)));
      page.append(el('div.card', el('div.list', ...lis.map((html, k) => {
        const id = gp.title.slice(0, 12).replace(/\W/g, '') + k;
        items.push({ id, ev: gp.title === 'Evidence' });
        const cb = el('input', { type: 'checkbox', id: 'ck-' + id, checked: !!state[id] });
        cb.addEventListener('change', () => { Store.set('checklist.' + id, cb.checked); draw(); });
        return el('label.it', { for: 'ck-' + id }, cb, el('span.grow', { html }));
      }))));
    });
    function draw() {
      const st = Store.get('checklist', {}) || {};
      const total = items.filter((i) => st[i.id]).length, ev = items.filter((i) => i.ev && st[i.id]).length, evN = items.filter((i) => i.ev).length;
      const v = ev === evN && total >= 23 ? ['Ready for most product-company coding rounds', 's-solo', 'Start applying; use the interview-season mode in the post-roadmap plan.'] : ev >= 2 && total >= 18 ? ['Nearly ready', 's-hints', '3–4 more weeks of the post-roadmap plan focused on unticked items, then apply.'] : ['Not yet', 's-revise', '6–8 more weeks; repeat the weakest phase\'s Core problems as cold re-solves and add two mocks per week.'];
      verdict.replaceChildren(el('div.card', el('div.panel-label', 'Verdict (rows checked in order; first match wins)'), el('div.row', el('div.big', total + ' / ' + items.length), el('span.pill.' + v[1], v[0]), el('span.small.muted', 'Evidence ' + ev + ' / ' + evN)), el('p', { style: { marginTop: '8px' } }, v[2])));
    }
    page.append(el('div.sec-h', el('h2', 'Verdict')), verdict, htmlEl(s11.subs.find((x) => x.title === 'Verdict').html, 'prose'));
    draw();
    return page;
  };

  // ---------- preferences ----------
  PAGES.preferences = () => {
    const page = el('article.page.stack');
    page.append(el('header.lesson-head', el('div.eyebrow', 'Preferences'), el('h1', 'Start date, storage and backup')));
    const st = Store.status();
    page.append(el('div.card', el('div.panel-label', 'Where your progress is saved'), el('h3', st.text), el('p', st.long)));
    const sd = el('input', { type: 'date', id: 'pref-start', value: Store.get('settings.startDate', C.startISO) });
    sd.addEventListener('change', () => { const d = dates.parseISO(sd.value); if (d.getDay() !== 1) { toast('Pick a Monday: Week 1 starts on a Monday.'); sd.value = Store.get('settings.startDate', C.startISO); return; } Store.set('settings.startDate', sd.value); toast('Start date saved; every date in the course shifts with it.'); drawSide(); });
    const tr = el('select', { id: 'pref-track' }, ...[['', 'Not set (take the diagnostic)'], ['A', 'Track A: Accelerated'], ['B', 'Track B: Standard'], ['C', 'Track C: Foundations']].map(([v, t]) => el('option', { value: v, selected: Store.get('settings.track', '') === v }, t)));
    tr.addEventListener('change', () => Store.set('settings.track', tr.value));
    const th = el('select', { id: 'pref-theme' }, ...[['', 'Follow the system'], ['light', 'Light'], ['dark', 'Dark']].map(([v, t]) => el('option', { value: v, selected: Store.get('settings.theme', '') === v }, t)));
    th.addEventListener('change', () => { Store.set('settings.theme', th.value); applyTheme(); });
    page.append(el('div.card.form', el('div.two', el('label', 'Week 1 starts on (a Monday)', sd), el('label', 'Track for Weeks 1–3', tr), el('label', 'Theme', th)), el('p.small.muted', 'The default start is Mon 2 Nov 2026. Changing it shifts every date, re-solve and assessment by the same number of days; week and day numbers stay the same.')));
    const fileIn = el('input', { type: 'file', accept: 'application/json,.json', id: 'pref-import', style: { maxWidth: '100%' } });
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files[0]; if (!f) return;
      try { const obj = JSON.parse(await f.text()); if (!obj || obj.v !== 1) throw new Error('not a course backup'); confirmBox.replaceChildren(el('div.fb.info', el('span.tag', 'Replace your progress?'), el('div', 'This replaces everything saved now with the backup from ' + (obj.updatedAt ? new Date(obj.updatedAt).toLocaleString() : 'an unknown date') + '.'), el('div.row', el('button.btn.primary.small', { type: 'button', onclick: () => { Store.replaceAll(obj); toast('Backup restored'); render(); } }, 'Replace with backup'), el('button.btn.small', { type: 'button', onclick: () => confirmBox.replaceChildren() }, 'Cancel')))); }
      catch (e) { toast('That file is not a course backup (' + e.message + ').'); }
    });
    const confirmBox = el('div');
    page.append(el('div.card', el('h3', 'Backup'), el('p.small', 'Export saves everything (journal, exercises, scores, reflections) as one JSON file. Import it in another browser to continue there.'),
      el('div.row', el('button.btn.primary', { type: 'button', onclick: async () => { const r = await saveFile('dsa-course-backup-' + dates.iso(dates.today()) + '.json', JSON.stringify(Store.state, null, 1)); toast(r === 'failed' ? 'Could not start the download here; use Copy instead.' : r === 'declined' ? 'Download cancelled' : 'Backup file created'); } }, 'Export backup'),
        el('button.btn', { type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(JSON.stringify(Store.state)); toast('Backup copied to the clipboard'); } catch (e) { toast('Clipboard blocked here; use Export instead.'); } } }, 'Copy backup'),
        el('label.small.ui', 'Import a backup file ', fileIn)), confirmBox));
    const resetBox = el('div');
    page.append(el('div.card', el('h3', 'Start over'), el('p.small', 'Erase all progress on this course. Export a backup first if you might want it back.'), el('button.btn', { type: 'button', onclick: () => resetBox.replaceChildren(el('div.fb.bad', el('span.tag', 'Erase everything?'), el('div', 'This cannot be undone.'), el('div.row', el('button.btn.small', { type: 'button', onclick: () => { Store.resetAll(); toast('Progress erased'); render(); } }, 'Erase all progress'), el('button.btn.small', { type: 'button', onclick: () => resetBox.replaceChildren() }, 'Keep it')))) }, 'Erase all progress…'), resetBox));
    return page;
  };

  // ---------- shell ----------
  let sideEl, mainEl, crumbsEl, chipEl;
  function navLink(href, label, extra) { return el('a', { href, class: location.hash === href ? 'active' : '' }, extra || null, el('span', label)); }
  function drawSide() {
    if (!sideEl) return;
    const cd = currentDay();
    const cur = location.hash.slice(1) || 'home';
    const open = new Set(Store.get('settings.navOpen', []) || []);
    const curWeek = (cur.match(/^w(\d+)/) || cur.match(/^week-(\d+)/) || [])[1];
    if (curWeek) open.add(Number(curWeek));
    const weeks = C.weeks.map((W) => {
      const p = weekProgress(W.n);
      const isOpen = open.has(W.n);
      const btn = el('button.navlink.wk', { type: 'button', 'aria-expanded': String(isOpen), onclick: () => { const o = new Set(Store.get('settings.navOpen', []) || []); if (o.has(W.n)) o.delete(W.n); else o.add(W.n); Store.set('settings.navOpen', [...o]); drawSide(); } }, ring(p.pct, 18), el('span', 'Week ' + W.n + ' · ' + W.title.split(/[:,(]/)[0]));
      const days = isOpen ? el('div.days', el('a', { href: '#week-' + W.n, class: cur === 'week-' + W.n ? 'active' : '' }, 'Week overview'),
        ...W.days.filter((d) => LESSONS[d.id]).map((d) => { const L = LESSONS[d.id]; return el('a', { href: '#' + d.id, class: cur === d.id ? 'active' : '' }, el('span.dot' + (lessonDone(d.id) ? '.full' : '')), el('span', (L.kind === 'saturday' ? 'Sat · ' : L.kind === 'final' ? 'Sun · ' : 'D' + L.studyDay + ' · ') + (L.title || d.title))); })) : null;
      return el('div', btn, days);
    });
    sideEl.replaceChildren(
      el('a.brand', { href: '#home' }, brandMark(), el('div', el('b', 'DSA Pattern Lab'), el('span', '12 weeks · JavaScript'))),
      el('nav.nav', { 'aria-label': 'Course' },
        el('div.nav-sec', navLink('#home', 'Home'), navLink('#today', cd.day ? 'Today · ' + dates.fmt(dates.today()) : 'Today'), navLink('#revision', 'Revision (' + dueProblems().length + ' due)'), navLink('#problems', 'Problems and journal')),
        el('div.nav-sec', el('div.nav-label', 'Start here'), navLink('#diagnostic', 'Week 0 diagnostic'), navLink('#overview', 'Course plan and strategy')),
        el('div.nav-sec', el('div.nav-label', 'Weeks'), ...weeks),
        el('div.nav-sec', el('div.nav-label', 'Tools and reference'), navLink('#assessments', 'Assessments'), navLink('#mocks', 'Mock interviews'), navLink('#method', 'Method and pattern guide'), navLink('#reference', 'JavaScript reference'), navLink('#revision-system', 'Revision rules'), navLink('#scorecard', 'Scorecards and milestones'), navLink('#checklist', 'Readiness checklist'), navLink('#after', 'After the 12 weeks'), navLink('#preferences', 'Preferences and backup'))));
  }
  function brandMark() {
    const s = g.R.svg('svg', { class: 'brand-mark', viewBox: '0 0 30 30', 'aria-hidden': 'true' });
    s.append(g.R.svg('rect', { x: 1, y: 1, width: 28, height: 28, rx: 7, fill: 'var(--accent)' }));
    [[8, 20], [15, 9], [22, 20]].forEach(([x, y], i, a) => { if (i) s.append(g.R.svg('line', { x1: a[0][0] + (i === 2 ? 7 : 0), y1: i === 2 ? 9 : a[0][1], x2: x, y2: y, stroke: 'var(--accent-ink)', 'stroke-width': 2 })); });
    s.append(g.R.svg('line', { x1: 15, y1: 9, x2: 8, y2: 20, stroke: 'var(--accent-ink)', 'stroke-width': 2 }));
    [[15, 9], [8, 20], [22, 20]].forEach(([x, y]) => s.append(g.R.svg('circle', { cx: x, cy: y, r: 3.4, fill: 'var(--accent-ink)' })));
    return s;
  }
  function drawChip() { if (!chipEl) return; const s = Store.status(); chipEl.className = 'store-chip ' + s.cls; chipEl.textContent = s.text; chipEl.title = s.long; }
  function applyTheme() { const t = Store.get('settings.theme', ''); if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }

  function route() {
    const h = decodeURIComponent(location.hash.slice(1)) || 'home';
    let m;
    if (LESSONS[h]) return { page: () => PAGES.lesson(LESSONS[h]), crumb: 'Week ' + LESSONS[h].week + ' › ' + (LESSONS[h].title || LESSONS[h].sched.topicText) };
    if ((m = h.match(/^week-(\d+)$/)) && C.weeks[m[1] - 1]) return { page: () => PAGES.week(Number(m[1])), crumb: 'Week ' + m[1] };
    if ((m = h.match(/^p-(\d+)$/))) return { page: () => PAGES.problems(m[1]), crumb: 'Problems › ' + m[1] };
    if ((m = h.match(/^quiz-(.+)$/)) && LESSONS[m[1]]) return { page: () => PAGES.quiz(m[1]), crumb: 'Revision › quiz' };
    const names = { home: 'Home', today: 'Today', problems: 'Problems and journal', revision: 'Revision', diagnostic: 'Diagnostic', overview: 'Course plan', reference: 'JavaScript reference', method: 'Method and pattern guide', 'revision-system': 'Revision rules', after: 'After the 12 weeks', assessments: 'Assessments', mocks: 'Mock interviews', scorecard: 'Scorecards', checklist: 'Readiness checklist', preferences: 'Preferences' };
    if (PAGES[h] && names[h]) return { page: () => PAGES[h](), crumb: names[h] };
    return { page: () => PAGES.home(), crumb: 'Home' };
  }
  let lastHash = null;
  function render() {
    const r = route();
    vizUid = 0;
    mainEl.replaceChildren(r.page());
    crumbsEl.textContent = r.crumb;
    document.title = 'DSA Pattern Lab';
    drawSide();
    if (lastHash !== location.hash) window.scrollTo(0, 0);
    lastHash = location.hash;
    document.body.classList.remove('nav-open');
  }
  function boot() {
    Store.initLocal();
    applyTheme();
    sideEl = el('aside.side');
    crumbsEl = el('div.crumbs');
    chipEl = el('button.store-chip', { type: 'button', onclick: () => (location.hash = '#preferences') });
    const menu = el('button.btn.small.menu-btn', { type: 'button', 'aria-label': 'Open the course menu', onclick: () => document.body.classList.toggle('nav-open') }, '☰ Menu');
    mainEl = el('main.main-inner', { id: 'main' });
    app.replaceChildren(el('div.shell', sideEl, el('div.main', el('div.topbar', menu, crumbsEl, chipEl), mainEl)), el('div.scrim', { onclick: () => document.body.classList.remove('nav-open') }));
    window.addEventListener('hashchange', render);
    render(); drawChip();
    Store.on(() => { drawChip(); });
    Store.initCloud().then(() => { drawChip(); if (Store.mode === 'cloud') { render(); } });
  }
  g.App = { PAGES, render, problemCard, renderBlocks, exOfLesson, LESSONS, jget, setStatus, logResolve, mastered, nextDue, dueProblems, currentDay };
  if (g.MODE !== 'print') boot();
})(window);
