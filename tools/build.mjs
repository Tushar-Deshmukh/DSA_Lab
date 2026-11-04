// Build: roadmap (source of truth) + lesson content (content/wNN.md) -> dist/index.html (one file)
// and dist/print.html (PDF companion source). Run: node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import yaml from 'js-yaml';
import { marked } from 'marked';
import { parseRoadmap } from './curriculum.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ctx = {}; vm.createContext(ctx); vm.runInContext(rd('src/shared.js'), ctx);
const HL = ctx.HL;
const errors = [];
const warn = (m) => errors.push(m);

// ---------- markdown ----------
const renderer = {
  code({ text, lang }) { return HL.codeHTML(text, lang || 'js'); },
  table(token) {
    const head = '<tr>' + token.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join('') + '</tr>';
    const body = token.rows.map((r) => '<tr>' + r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join('') + '</tr>').join('');
    return `<div class="tbl"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  },
  link({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    const ext = /^https?:/.test(href);
    return `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}${title ? ` title="${title}"` : ''}>${text}</a>`;
  },
};
marked.use({ renderer, gfm: true });
const mdHTML = (s) => marked.parse(String(s || '').replace(/\\~/g, '~'));
const inlineHTML = (s) => marked.parseInline(String(s || '').replace(/\\~/g, '~'));

// ---------- roadmap ----------
const R = parseRoadmap(path.join(ROOT, 'source/roadmap.md'));
const used = {}; // week -> Set of fragment keys used
function getFrag(week, key) {
  const wk = R.theory[week];
  if (!wk) { warn(`pull: no week ${week}`); return ''; }
  const f = wk.frags[key];
  if (f == null) { warn(`pull: W${week} has no fragment "${key}". Known: ${wk.order.join(' | ')}`); return ''; }
  (used[week] ||= new Set()).add(key);
  return f;
}

// ---------- content parser ----------
const TEXT_FIELDS = new Set(['q', 't', 'why', 'explain', 'clues', 'prompt', 'title', 'tag']);
function exToHTML(o, inArr) {
  if (Array.isArray(o)) return o.map((x) => exToHTML(x, true));
  if (!o || typeof o !== 'object') return o;
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (TEXT_FIELDS.has(k) && typeof v === 'string') out[k] = k === 'q' || k === 'explain' ? mdHTML(v) : inlineHTML(v);
    else if (k === 'hints' && Array.isArray(v)) out[k] = v.map(inlineHTML);
    else if (k === 'model' && v && typeof v === 'object') out[k] = Object.fromEntries(Object.entries(v).map(([a, b]) => [a, mdHTML(b)]));
    else if ((k === 'why' || k === 'fine') && v && typeof v === 'object') out[k] = Object.fromEntries(Object.entries(v).map(([a, b]) => [a, inlineHTML(b)]));
    else if (k === 'traps' && v && typeof v === 'object') out[k] = Object.fromEntries(Object.entries(v).map(([a, b]) => [a, inlineHTML(b)]));
    else if (k === 'options' || k === 'rows' || k === 'fields' || k === 'blanks' || k === 'tests') out[k] = v.map((x) => (x && typeof x === 'object' && !Array.isArray(x) ? exToHTML(x) : x));
    else out[k] = v;
  }
  return out;
}

function parseBlocks(lines, ctxL) {
  const blocks = [];
  let buf = [];
  const flush = () => { const t = buf.join('\n').trim(); if (t) blocks.push({ t: 'html', html: mdHTML(t) }); buf = []; };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if ((m = line.match(/^## (.+?)(?:\s+\{(\w[\w-]*)\})?\s*$/))) {
      flush(); const id = (ctxL.id + '-' + m[1]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
      blocks.push({ t: 'h', text: m[1], tag: m[2] || '', id }); continue;
    }
    if ((m = line.match(/^@pull\s+s(\d+):(.+)$/))) {
      flush(); const sec = R.sections[m[1]]; const key = m[2].trim();
      const sub = sec && sec.subs.find((x) => x.title.startsWith(key));
      if (!sub) warn(`${ctxL.id}: no section ${m[1]} subsection starting "${key}"`);
      else blocks.push({ t: 'html', html: '<h3>' + inlineHTML(sub.title) + '</h3>' + mdHTML(sub.md), src: `§${m[1]} · ${sub.title}`, pulled: true });
      continue;
    }
    if ((m = line.match(/^@pull\s+(?:w(\d+):)?(.+)$/))) {
      flush(); const w = m[1] ? Number(m[1]) : ctxL.week; const key = m[2].trim();
      blocks.push({ t: 'html', html: mdHTML(getFrag(w, key)), src: `W${w} · ${key}`, pulled: true }); continue;
    }
    if ((m = line.match(/^@viz\s+([\w-]+)\s*(\{.*\})?\s*$/))) {
      flush(); let props = {};
      if (m[2]) { try { props = JSON.parse(m[2]); } catch (e) { warn(`${ctxL.id}: bad @viz JSON: ${m[2]}`); } }
      if (props.title) props.title = props.title;
      ctxL.viz.push(m[1]);
      blocks.push({ t: 'viz', id: m[1], props }); continue;
    }
    if ((m = line.match(/^:::(tip|warn|key|mistake|interview)\s*(.*)$/))) {
      flush(); const body = []; i++;
      while (i < lines.length && lines[i].trim() !== ':::') body.push(lines[i++]);
      blocks.push({ t: 'note', kind: m[1], title: m[2] || '', html: mdHTML(body.join('\n')) }); continue;
    }
    if ((m = line.match(/^:::stages\s*(.*)$/))) {
      flush(); const body = []; i++; let depth = 0;
      while (i < lines.length && !(lines[i].trim() === ':::' && depth === 0)) {
        if (/^:::(tip|warn|key|mistake|interview)/.test(lines[i])) depth++;
        else if (lines[i].trim() === ':::') depth--;
        body.push(lines[i++]);
      }
      const stages = []; let cur = null;
      for (const l of body) {
        const sm = l.match(/^@stage\s+(\w+)\s*(.*)$/);
        if (sm) { cur = { name: sm[1], label: sm[2], lines: [] }; stages.push(cur); } else if (cur) cur.lines.push(l);
      }
      blocks.push({ t: 'stages', title: m[1], stages: stages.map((s) => ({ name: s.name, label: s.label, blocks: parseBlocks(s.lines, ctxL) })) });
      continue;
    }
    if ((m = line.match(/^```(ex|anno)\s*$/))) {
      flush(); const body = []; i++;
      while (i < lines.length && lines[i] !== '```') body.push(lines[i++]);
      let o; try { o = yaml.load(body.join('\n')); } catch (e) { warn(`${ctxL.id}: YAML error in ${m[1]} block starting "${body.slice(0,2).join(' | ').slice(0,80)}": ${e.message.split('\n')[0]}`); continue; }
      if (m[1] === 'ex') {
        o.id = o.id ? o.id : ctxL.id + '-' + (++ctxL.exN);
        if (ctxL.exIds.has(o.id)) warn('duplicate exercise id ' + o.id);
        ctxL.exIds.add(o.id);
        o.lesson = ctxL.id;
        ctxL.ex.push(o);
        blocks.push({ t: 'ex', ex: exToHTML(o) });
      } else {
        blocks.push({ t: 'anno', code: String(o.code).replace(/\n$/, ''), notes: Object.fromEntries(Object.entries(o.notes || {}).map(([k, v]) => [k, inlineHTML(v)])), title: o.title || '' });
      }
      continue;
    }
    buf.push(line);
  }
  flush();
  return blocks;
}

function parseMeta(lines) {
  const meta = {}; let i = 0; let key = null;
  for (; i < lines.length; i++) {
    const l = lines[i];
    const m = l.match(/^@(goal|why|prereqs|outcomes|ready|summary|revision|title|challenge|reflect|milestone|map):\s*(.*)$/);
    if (m) { key = m[1]; if (m[2]) meta[key] = m[2]; else meta[key] = []; continue; }
    if (key && Array.isArray(meta[key]) && /^\s*- /.test(l)) { meta[key].push(l.replace(/^\s*- /, '')); continue; }
    if (!l.trim()) { key = null; continue; }
    break;
  }
  return { meta, rest: lines.slice(i) };
}
const metaHTML = (meta) => Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, Array.isArray(v) ? v.map(inlineHTML) : inlineHTML(v)]));

const allEx = [];
const vizUsed = new Set();
function parseWeekFile(week) {
  const file = path.join(ROOT, 'content', `w${String(week).padStart(2, '0')}.md`);
  if (!fs.existsSync(file)) { warn(`missing content file for week ${week}`); return { lessons: {}, week: {}, saturday: {} }; }
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const parts = []; let cur = null;
  for (const l of lines) {
    const m = l.match(/^# (Lesson (\d+)|Week|Saturday)(?::\s*(.*))?$/);
    if (m) { cur = { kind: m[2] ? 'lesson' : m[1].toLowerCase(), n: m[2] ? Number(m[2]) : null, title: m[3] || '', lines: [] }; parts.push(cur); continue; }
    if (cur) cur.lines.push(l);
  }
  const out = { lessons: {}, week: null, saturday: null };
  for (const p of parts) {
    const id = p.kind === 'lesson' ? `w${week}d${p.n}` : p.kind === 'week' ? `w${week}` : `w${week}sat`;
    const c = { id, week, exN: 0, exIds: new Set(allEx.map((e) => e.id)), ex: [], viz: [] };
    const { meta, rest } = parseMeta(p.lines);
    const blocks = parseBlocks(rest, c);
    c.ex.forEach((e) => allEx.push(e)); c.viz.forEach((v) => vizUsed.add(v));
    const obj = { id, title: p.title, ...metaHTML(meta), blocks };
    if (p.kind === 'lesson') out.lessons[p.n] = obj; else if (p.kind === 'week') out.week = obj; else out.saturday = obj;
  }
  return out;
}

// ---------- assemble course ----------
const bankBy = Object.fromEntries(R.bank.map((b) => [b.num, b]));
const problemWeek = Object.fromEntries(R.bank.map((b) => [b.num, b.week]));
const startISO = '2026-11-02';
const weeks = [];
const lessons = {};
for (let w = 1; w <= 12; w++) {
  const th = R.theory[w], sc = R.schedule.weeks[w];
  const content = parseWeekFile(w);
  const days = [];
  let study = 0;
  sc.days.forEach((d, idx) => {
    let id, kind = d.kind;
    if (kind === 'study') { study++; id = `w${w}d${study}`; }
    else if (kind === 'saturday') id = `w${w}sat`;
    else if (kind === 'final') id = `w${w}final`;
    else id = `w${w}rest${idx}`;
    const offset = (w - 1) * 7 + idx; // calendar offset from the start Monday (rows are Mon..Sun in order)
    const sched = { date: d.date, offset, topic: inlineHTML(d.topic), topicText: d.topic.replace(/\*\*/g, ''), implement: inlineHTML(d.implement), problemsCell: inlineHTML(d.problemsCell), problems: d.problems, time: d.time, warmup: inlineHTML(d.warmup), doneWhen: inlineHTML(d.doneWhen) };
    let L = null;
    if (kind === 'study') {
      L = content.lessons[study];
      if (!L) warn(`W${w} study day ${study} (${d.date}) has no lesson content`);
    } else if (kind === 'saturday') L = content.saturday;
    const lesson = Object.assign({ id, week: w, kind, studyDay: kind === 'study' ? study : null, title: '', blocks: [] }, L || {}, { sched });
    if (kind === 'study' || kind === 'saturday' || kind === 'final') lessons[id] = lesson;
    days.push({ id, kind, date: d.date, offset, title: lesson.title || d.topic.replace(/\*\*/g, '').split(/[;:(]/)[0].trim(), topicText: d.topic.replace(/\*\*/g, '') });
  });
  weeks.push({
    n: w, title: th.title, dates: th.dates, schedTitle: sc.title,
    objectives: mdHTML(getFrag(w, 'A. Learning objectives')),
    notes: sc.notes.map(mdHTML).join(''), fallBehind: inlineHTML(sc.fallBehind), days,
    overview: content.week ? content.week : null,
  });
}

// coverage: every theory fragment of the roadmap must appear in some lesson
const coverage = [];
for (let w = 1; w <= 12; w++) for (const k of R.theory[w].order) if (!(used[w] && used[w].has(k))) coverage.push(`W${w}: ${k}`);
if (coverage.length) warn('Roadmap theory not used in any lesson (' + coverage.length + '): ' + coverage.join(' | '));
// schedule problems must all be in the bank (they are, by construction of the audit), check anyway
for (const L of Object.values(lessons)) for (const p of (L.sched.problems || [])) if (!bankBy[p.num]) warn(`${L.id}: problem ${p.num} not in bank`);

const sectionsHTML = {};
for (const [n, s] of Object.entries(R.sections)) {
  if (n === '3' || n === '4' || n === '5') continue;
  sectionsHTML[n] = { title: s.title, lead: mdHTML(s.lead), subs: s.subs.map((x) => ({ title: x.title, html: mdHTML(x.md), id: ('s' + n + '-' + x.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') })) };
}

const extraPath = path.join(ROOT, 'content', 'extra.md');
let extra = {};
if (fs.existsSync(extraPath)) {
  const lines = fs.readFileSync(extraPath, 'utf8').split('\n');
  let cur = null; const parts = [];
  for (const l of lines) { const m = l.match(/^# Page ([\w-]+):\s*(.*)$/); if (m) { cur = { id: m[1], title: m[2], lines: [] }; parts.push(cur); continue; } if (cur) cur.lines.push(l); }
  for (const p of parts) {
    const c = { id: p.id, week: 0, exN: 0, exIds: new Set(allEx.map((e) => e.id)), ex: [], viz: [] };
    const { meta, rest } = parseMeta(p.lines);
    extra[p.id] = { id: p.id, title: p.title, ...metaHTML(meta), blocks: parseBlocks(rest, c) };
    c.ex.forEach((e) => allEx.push(e)); c.viz.forEach((v) => vizUsed.add(v));
  }
}

const COURSE = {
  builtAt: new Date().toISOString(), sourceRev: 103, startISO,
  weeks, lessons, extra,
  bank: R.bank.map((b) => ({ ...b, hintHTML: inlineHTML(b.hint), whyHTML: inlineHTML(b.why), patternHTML: inlineHTML(b.pattern) })),
  problemWeek,
  assessments: R.assessments.map((a) => ({ ...a, topicsHTML: inlineHTML(a.topics), coldHTML: inlineHTML(a.coldCell) })),
  mocks: R.mocks.map((m) => ({ ...m, topicsHTML: inlineHTML(m.topics) })),
  sections: sectionsHTML,
  scheduleIntro: mdHTML(R.schedule.intro),
};
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'course.json'), JSON.stringify(COURSE));
fs.writeFileSync(path.join(ROOT, 'dist', 'exercises.json'), JSON.stringify(allEx, null, 1));

// ---------- bundle ----------
const vizFiles = fs.readdirSync(path.join(ROOT, 'src/viz')).filter((f) => /^(w\d+|algo).*\.js$/.test(f)).sort();
const JS = ['src/shared.js', 'src/core.js', 'src/exercises.js', 'src/viz/render.js', 'src/viz/player.js', ...vizFiles.map((f) => 'src/viz/' + f), 'src/app.js'];
const jsText = JS.map((f) => `/* ${f} */\n` + rd(f)).join('\n');
// verify every referenced visualizer exists
const defined = new Set([...jsText.matchAll(/(?:\.define|[a-z]Def)\('([\w-]+)'/g)].map((m) => m[1]));
for (const v of vizUsed) if (!defined.has(v)) warn('visualizer used but not defined: ' + v);

const css = rd('src/styles.css');
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Literata:opsz,wght@7..72,400;7..72,600;7..72,700&display=swap">';
const safeJSON = JSON.stringify(COURSE).replace(/</g, '\\u003c');
const page = (mode) => `<title>DSA Pattern Lab</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="A 12-week, JavaScript-first data structures and algorithms course with visualizers, exercises, a problem journal and spaced revision.">
${fonts}
<style>${css}${mode === 'print' ? rd('src/print.css') : ''}</style>
<div id="app" class="${mode}"><noscript>This course needs JavaScript enabled.</noscript></div>
<script>window.COURSE = ${safeJSON};window.MODE = ${JSON.stringify(mode)};</script>
<script>${jsText}${mode === 'print' && fs.existsSync(path.join(ROOT, 'src/print.js')) ? '\n' + rd('src/print.js') : ''}</script>
`;
fs.writeFileSync(path.join(ROOT, 'dist', 'index.html'), page('web'));
// standalone file for local use: same page with its own document skeleton
fs.writeFileSync(path.join(ROOT, 'dist', 'dsa-pattern-lab.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n' + page('web') + '</body></html>\n');
if (fs.existsSync(path.join(ROOT, 'src/print.css'))) fs.writeFileSync(path.join(ROOT, 'dist', 'print.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>\n' + page('print') + '</body></html>\n');

const sizeKB = Math.round(fs.statSync(path.join(ROOT, 'dist', 'index.html')).size / 1024);
console.log(`built: ${Object.keys(lessons).length} lesson pages, ${allEx.length} exercises, ${vizUsed.size} visualizers used (${defined.size} defined), index.html ${sizeKB} KB`);
if (errors.length) { console.log('\nWARNINGS (' + errors.length + '):'); errors.forEach((e) => console.log(' - ' + e)); }
fs.writeFileSync(path.join(ROOT, 'dist', 'build-report.json'), JSON.stringify({ errors, coverage, exercises: allEx.length, viz: [...vizUsed] }, null, 1));
