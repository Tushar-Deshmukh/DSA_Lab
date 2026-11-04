// Third pass: fragments, time specs, warm-ups, pattern <-> lesson placement, viz date strings, mastered() bug proof.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
const ROOT = process.argv[2];
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { parseRoadmap } = await import(pathToFileURL(path.join(ROOT, 'tools/curriculum.mjs')).href);
const R = parseRoadmap(path.join(ROOT, 'source/roadmap.md'));
const C = JSON.parse(rd('dist/course.json'));

// ---- theory fragments
let fragTotal = 0; const perW = {};
for (const [w, t] of Object.entries(R.theory)) { perW['W' + w] = t.order.length; fragTotal += t.order.length; }
console.log('theory fragments total', fragTotal, JSON.stringify(perW));
console.log('roadmap ## sections', Object.keys(R.sections).length, 'subsections per section', JSON.stringify(Object.fromEntries(Object.values(R.sections).map((s) => [s.n, s.subs.length]))));

// ---- @pull usage: how many fragments are pulled more than once / where patterns go
const files = fs.readdirSync(path.join(ROOT, 'content')).filter((f) => /^w\d+\.md$/.test(f)).sort();
const pulledCount = {}; const patternAt = {}; const secPulls = {};
for (const f of files) {
  const w = Number(f.slice(1, 3)); let cur = null;
  for (const l of rd('content/' + f).split('\n')) {
    let m; if ((m = l.match(/^# (Lesson (\d+)|Week|Saturday)/))) cur = m[2] ? 'L' + m[2] : m[1];
    if ((m = l.match(/^@pull\s+s(\d+):(.+)$/))) { (secPulls[m[1] + ':' + m[2].trim()] ||= []).push('W' + w + cur); continue; }
    if ((m = l.match(/^@pull\s+(.+)$/))) { const k = 'W' + w + '|' + m[1].trim(); pulledCount[k] = (pulledCount[k] || 0) + 1; const p = m[1].match(/^Pattern (\d+\.\d+)/); if (p) (patternAt[p[1]] ||= []).push('W' + w + cur); }
  }
}
console.log('distinct fragments pulled', Object.keys(pulledCount).length, 'pulled >1x', Object.entries(pulledCount).filter(([, v]) => v > 1).map(([k, v]) => k + ' x' + v));
console.log('patterns placed exactly once:', Object.values(patternAt).filter((a) => a.length === 1).length, 'of', Object.keys(patternAt).length);
console.log('patternAt sample', JSON.stringify(patternAt).slice(0, 700));
console.log('section pulls', JSON.stringify(secPulls));

// ---- time specs
const specs = {}; const rows = Object.values(R.schedule.weeks).flatMap((w) => w.days.map((d) => ({ w: w.week, ...d })));
for (const d of rows) { const t = (d.time || '').trim(); const shape = t === 'default' ? 'default' : t.replace(/\d+/g, '#'); specs[d.kind + ' | ' + shape] = (specs[d.kind + ' | ' + shape] || 0) + 1; }
console.log('time spec shapes', JSON.stringify(specs, null, 0));
const totals = rows.filter((d) => d.kind === 'study').map((d) => { if (d.time === 'default') return 120; return (d.time.match(/\d+/g) || []).reduce((a, b) => a + Number(b), 0); });
console.log('study-day minutes: distinct', [...new Set(totals)], 'sum', totals.reduce((a, b) => a + b, 0));

// ---- warm-ups
const wu = rows.filter((d) => d.kind === 'study').map((d) => (d.warmup || '').trim());
console.log('warm-ups: dash', wu.filter((x) => x === '—' || !x).length, 'plain number', wu.filter((x) => /^\d+$/.test(x)).length, 'other', wu.filter((x) => x && x !== '—' && !/^\d+$/.test(x)));
const bankNums = new Set(C.bank.map((b) => b.num));
const wuNums = wu.flatMap((x) => (x.match(/\b\d{1,4}\b/g) || []).map(Number));
console.log('warm-up numbers not in bank', [...new Set(wuNums.filter((n) => !bankNums.has(n)))]);
const satRows = rows.filter((d) => d.kind === 'saturday').map((d) => d.problemsCell);
console.log('saturday problem cells:'); satRows.forEach((s, i) => console.log('  W' + (i + 1), s));
console.log('saturday time specs', rows.filter((d) => d.kind === 'saturday').map((d) => d.time));

// ---- schedule problems vs bank "when"
let mismatch = 0; const seen = new Set();
for (const w of Object.values(R.schedule.weeks)) { let sd = 0; for (const d of w.days) { if (d.kind !== 'study') continue; sd++; for (const p of d.problems) { const b = C.bank.find((x) => x.num === p.num); seen.add(p.num); if (!b) { console.log('  sched problem not in bank', w.week, sd, p.num); continue; } if ((b.week !== w.week || b.day !== sd) && !(p.num === 424 || p.num === 33)) { mismatch++; console.log('  when mismatch', p.num, 'bank', b.when, 'sched W' + w.week + 'D' + sd); } if (b.tier !== p.tier) console.log('  tier mismatch', p.num, b.tier, p.tier); } } }
console.log('schedule-vs-bank week/day mismatches:', mismatch, '; bank problems never in a schedule row:', C.bank.filter((b) => !seen.has(b.num)).map((b) => b.num));

// ---- bank column stats for the pattern mapping
const patterns = [...rd('source/roadmap.md').matchAll(/^\*\*Pattern (\d+)\.(\d+): (.+?)\*\*\s*$/gm)].map((m) => m[1] + '.' + m[2] + ' ' + m[3]);
console.log('pattern titles:', patterns.join(' | '));

// ---- viz strings with date/timetable words
const ctx = { console, document: {}, Node: function () {} }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['src/shared.js', 'src/core.js', 'src/viz/render.js', 'src/viz/player.js']) vm.runInContext(rd(f), ctx, { filename: f });
for (const f of fs.readdirSync(path.join(ROOT, 'src/viz')).filter((f) => /^(w\d+|algo).*\.js$/.test(f)).sort()) vm.runInContext(rd('src/viz/' + f), ctx, { filename: f });
const { DEFS, runDef } = ctx.Viz;
const hit = {}; const RE = /\b(Week \d+|Weeks \d+|Day \d+|Days? \d|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|today|tomorrow|yesterday|Roadmap|roadmap)\b/;
let vizStrHits = 0; const samples = new Set();
for (const [id, def] of Object.entries(DEFS)) {
  const blobs = [def.title, ...(def.presets || []).map((p) => p.label), ...(def.legend || []).map((l) => l[1]), ...(def.inputs || []).map((i) => i.label)];
  const defaults = Object.fromEntries((def.inputs || []).map((f) => [f.key, f.def]));
  for (const inp of [defaults, ...(def.presets || []).map((p) => Object.assign({}, defaults, p.input))]) { try { for (const s of runDef(def, JSON.parse(JSON.stringify(inp)))) blobs.push(s.note, s.why); } catch {} }
  for (const b of new Set(blobs.filter(Boolean))) { const m = String(b).match(RE); if (m) { vizStrHits++; hit[id] = (hit[id] || 0) + 1; if (samples.size < 28) samples.add(id + ': ' + String(b).slice(0, 90)); } }
}
console.log('viz strings with date/timetable words:', vizStrHits, 'in', Object.keys(hit).length, 'visualizers'); [...samples].forEach((s) => console.log('   ', s));

// ---- legacy mastered() proof (copied logic, app.js L70-76)
const DAY = 864e5; const parse = (s) => new Date(s + 'T00:00:00Z');
const between = (a, b) => Math.round((parse(b) - parse(a)) / DAY);
function legacyMastered(dates) { const clean = [...dates].sort(); if (clean.length < 3) return false; let run = 1; for (let i = 1; i < clean.length; i++) { if (between(clean[i - 1], clean[i]) >= 7) run++; if (run >= 3) return true; } return false; }
function greedyMastered(dates) { const clean = [...dates].sort(); let kept = 0, last = null; for (const d of clean) { if (last === null || between(last, d) >= 7) { kept++; last = d; } } return kept >= 3; }
const day = (n) => new Date(Date.UTC(2027, 0, 1 + n)).toISOString().slice(0, 10);
for (const c of [[0, 7, 14], [0, 6, 7, 13, 14], [0, 3, 6, 9, 12, 15, 18, 21], [0, 1, 8, 9, 16]]) console.log('clean days', c.join(','), 'legacy', legacyMastered(c.map(day)), 'greedy', greedyMastered(c.map(day)));
