// Content checks that need no browser:
//  - every visualizer runs on its default input, every preset, and 300 random inputs, and its
//    final result matches an independent reference solution (tests/refs.mjs);
//  - every exercise's stored answer is actually right: predict answers are produced by running
//    the code, fill blanks and reference solutions pass their tests, MCQs have a correct option,
//    complexity answers are among the offered choices, bug line indexes exist.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { REFS } from './refs.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let pass = 0, fail = 0; const failures = [], warnings = [];
const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m); } };

// ---- load visualizer modules in a DOM-less sandbox ----
const ctx = { console, document: {}, Node: function () {} };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['src/shared.js', 'src/core.js', 'src/viz/render.js', 'src/viz/player.js']) vm.runInContext(rd(f), ctx, { filename: f });
const vizFiles = fs.readdirSync(path.join(ROOT, 'src/viz')).filter((f) => /^(w\d+|algo).*\.js$/.test(f)).sort();
for (const f of vizFiles) vm.runInContext(rd('src/viz/' + f), ctx, { filename: f });
const { DEFS, runDef } = ctx.Viz;

function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const finalResult = (steps) => { for (let i = steps.length - 1; i >= 0; i--) if (steps[i].result !== undefined) return steps[i].result; return undefined; };

const vizUsed = JSON.parse(rd('dist/build-report.json')).viz;
for (const [id, def] of Object.entries(DEFS)) {
  const defaults = Object.fromEntries((def.inputs || []).map((f) => [f.key, f.def]));
  const inputs = [['default', defaults], ...(def.presets || []).map((p) => ['preset "' + p.label + '"', Object.assign({}, defaults, p.input)])];
  const R = REFS[id];
  if (!R) warnings.push(`visualizer ${id}: no reference solution in tests/refs.mjs`);
  if (R && R.gen) { const g = mulberry(id.length * 7919 + 17); for (let k = 0; k < 300; k++) inputs.push(['random #' + k, R.gen(g)]); }
  let checked = 0;
  for (const [label, inp] of inputs) {
    let steps;
    try { steps = runDef(def, JSON.parse(JSON.stringify(inp))); }
    catch (e) {
      if (label.startsWith('random') && /Keep|Use|must|Need|at most|fits/.test(e.message)) continue; // generator produced an input the UI also rejects
      ok(false, `viz ${id} ${label}: threw ${e.message} for ${JSON.stringify(inp)}`); continue;
    }
    ok(steps.every((s) => s.line == null || [].concat(s.line).every((n) => n >= 1 && n <= def.code.split('\n').length)), `viz ${id} ${label}: a step points outside the code`);
    ok(steps.every((s) => typeof s.note === 'string' && s.note.length > 0), `viz ${id} ${label}: a step has no explanation`);
    if (R) {
      const got = finalResult(steps);
      const good = R.check ? R.check(inp, got) : R.cmp ? R.cmp(got, R.ref(inp)) : same(got, R.ref(inp));
      ok(good, `viz ${id} ${label}: result ${JSON.stringify(got)} but reference says ${R.check ? '(check failed)' : JSON.stringify(R.ref(inp))} for ${JSON.stringify(inp)}`);
      checked++;
    }
  }
  if (!vizUsed.includes(id)) warnings.push(`visualizer ${id} is defined but not used in any lesson`);
}

// ---- unseen problems stay unseen: no lesson may use an assessment or mock problem (roadmap section 9) ----
{
  const road = rd('source/roadmap.md'); const a = road.indexOf('## 9. Assessments'), b = road.indexOf('\n## 10.', a);
  const reserved = new Set([...road.slice(a, b).matchAll(/\[(\d+)\. [^\]]+\]\(https:\/\/leetcode\.com/g)].map((m) => m[1]));
  ok(reserved.size >= 25, `expected the section 9 problem list, found ${reserved.size} problems`);
  const lessonText = fs.readdirSync(path.join(ROOT, 'content')).filter((f) => f.endsWith('.md')).map((f) => [f, rd('content/' + f)]);
  for (const [f, t] of lessonText) for (const m of t.matchAll(/(?:LeetCode|[Pp]roblem) (\d+)\b|\((\d{2,4})\)/g)) {
    const n = m[1] || m[2]; ok(!reserved.has(n), `${f}: mentions ${n}, which is a section 9 assessment/mock problem and must stay unseen`);
  }
}

// ---- exercises ----
const EX = JSON.parse(rd('dist/exercises.json'));
// ---- text fields must be strings (an unquoted "a: b" in YAML silently becomes an object) ----
for (const e of EX) {
  (e.hints || []).forEach((h, i) => ok(typeof h === 'string', `${e.id}: hint ${i + 1} is not a string (quote it in the YAML)`));
  (e.options || []).forEach((o, i) => ok(typeof o.t === 'string' && (o.why == null || typeof o.why === 'string'), `${e.id}: option ${i + 1} text is not a string`));
  for (const k of ['q', 'explain', 'title', 'tag']) if (e[k] != null) ok(typeof e[k] === 'string', `${e.id}: ${k} is not a string`);
  (e.rows || []).forEach((r, i) => ok(typeof r.prompt === 'string' && (r.why == null || typeof r.why === 'string'), `${e.id}: row ${i + 1} text is not a string`));
}

const wctx = { self: {}, module: { exports: {} } }; vm.createContext(wctx);
const WORKER = (/const WORKER_SRC = `([\s\S]*?)`;/.exec(rd('src/exercises.js'))[1]).replace(/\\\\n/g, '\\n');
vm.runInContext(WORKER, wctx);
const runTests = wctx.module.exports.run;
const normOut = (s, how) => { s = String(s).replace(/\r/g, '').trim(); if (how === 'exact') return s.split('\n').map((l) => l.trim()).filter((l, i, a) => l || i < a.length - 1).join('\n'); return s.replace(/\s+/g, '').replace(/'/g, '"').toLowerCase(); };
function runPrint(code) {
  const out = []; const c = { console: { log: (...a) => out.push(a.map((x) => (typeof x === 'string' ? x : fmtVal(x))).join(' ')) } };
  vm.createContext(c); vm.runInContext(code, c, { timeout: 2000 });
  return out.join('\n');
}
// console.log formatting close to Node/Chrome for arrays/objects of primitives
function fmtVal(v) {
  if (Array.isArray(v)) return '[ ' + v.map((x) => (typeof x === 'string' ? "'" + x + "'" : fmtVal(x))).join(', ') + ' ]';
  if (v instanceof Map) return 'Map(' + v.size + ') { ' + [...v].map(([k, x]) => fmtVal(k) + ' => ' + fmtVal(x)).join(', ') + ' }';
  if (v instanceof Set) return 'Set(' + v.size + ') { ' + [...v].map(fmtVal).join(', ') + ' }';
  if (v && typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
const ids = new Set();
for (const ex of EX) {
  const tag = `${ex.id} (${ex.type})`;
  ok(!ids.has(ex.id), `${tag}: duplicate id`); ids.add(ex.id);
  if (['mcq', 'pattern', 'recall'].includes(ex.type)) {
    ok(Array.isArray(ex.options) && ex.options.some((o) => o.ok), `${tag}: no correct option`);
    ok(ex.options.some((o) => !o.ok), `${tag}: no wrong option`);
    ex.options.forEach((o, i) => { if (!o.why) warnings.push(`${tag}: option ${i + 1} has no explanation`); });
  }
  if (ex.type === 'complexity') {
    const C = ['O(1)', 'O(log n)', 'O(√n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)', 'O(2ⁿ)', 'O(n!)'];
    ex.fields.forEach((f) => [].concat(f.answer).forEach((a) => ok((f.options || C).includes(a), `${tag}: answer ${a} is not an offered choice`)));
  }
  if (ex.type === 'predict') {
    let out; try { out = runPrint(ex.code); } catch (e) { ok(false, `${tag}: code throws ${e.message}`); continue; }
    const answers = [].concat(ex.answer).map((a) => normOut(a, ex.normalize));
    ok(answers.includes(normOut(out, ex.normalize)), `${tag}: code prints ${JSON.stringify(out)} but the answer is ${JSON.stringify(ex.answer)}`);
    for (const t of Object.keys(ex.traps || {})) ok(!answers.includes(normOut(t, ex.normalize)), `${tag}: trap "${t}" equals the answer`);
  }
  if (ex.type === 'bug') {
    const n = ex.code.replace(/\n$/, '').split('\n').length;
    ok(ex.bug.every((b) => b >= 0 && b < n), `${tag}: bug line index out of range`);
  }
  if (ex.type === 'fill') {
    const parts = ex.template.split(/\[\[(\d+)\]\]/);
    ok(parts.filter((_, i) => i % 2).length === ex.blanks.length, `${tag}: blanks and placeholders differ`);
    if (ex.fn) {
      // every accepted alternative must pass (alternatives for one blank, reference for the rest)
      for (let k = 0; k < ex.blanks.length; k++) for (const alt of ex.blanks[k].accept) {
        let code = ''; parts.forEach((p, i) => { code += i % 2 === 0 ? p : (Number(p) === k ? alt : ex.blanks[Number(p)].accept[0]); });
        const r = runTests({ code, fn: ex.fn, tests: ex.tests, compare: ex.compare, adapt: ex.adapt, checker: ex.checker });
        ok(!r.error && r.results.every((x) => x.ok), `${tag}: blank ${k + 1} alternative "${alt}" fails: ${r.error ? r.message : JSON.stringify(r.results.filter((x) => !x.ok).slice(0, 2))}`);
      }
    } else warnings.push(`${tag}: no tests; only exact matches accepted`);
  }
  if (ex.type === 'code' || (ex.type === 'interview' && ex.fn)) {
    const r = runTests({ code: ex.solution, fn: ex.fn, tests: ex.tests, compare: ex.compare, adapt: ex.adapt, checker: ex.checker });
    ok(!r.error && r.results.every((x) => x.ok), `${tag}: reference solution fails: ${r.error ? r.message : JSON.stringify(r.results.map((x, i) => [i, x]).filter(([, x]) => !x.ok).slice(0, 3))}`);
    if (ex.starter) { const s = runTests({ code: ex.starter, fn: ex.fn, tests: ex.tests, compare: ex.compare, adapt: ex.adapt, checker: ex.checker }); if (!s.error && s.results.every((x) => x.ok)) ok(false, `${tag}: the starter code already passes every test`); }
    ok(ex.tests.length >= 3, `${tag}: fewer than 3 tests`);
  }
  if (ex.type === 'trace') ok(ex.rows.every((r) => r.answer !== undefined && r.answer !== null && String(r.answer).length), `${tag}: a row has no answer`);
  if (!ex.hints || !ex.hints.length) warnings.push(`${tag}: no hints`);
}
// trace exercises may carry `verify`: JS that must print the answers one per line
for (const ex of EX.filter((e) => e.type === 'trace' && e.verify)) {
  const out = runPrint(ex.verify).split('\n');
  ex.rows.forEach((r, k) => ok([].concat(r.answer).map((a) => normOut(a)).includes(normOut(out[k] ?? '')), `${ex.id}: row ${k + 1} answer ${JSON.stringify(r.answer)} but verify printed ${JSON.stringify(out[k])}`));
}

console.log(`visualizers: ${Object.keys(DEFS).length}, exercises: ${EX.length}`);
console.log(`${pass} checks passed, ${fail} failed, ${warnings.length} warnings`);
failures.slice(0, 80).forEach((f) => console.log(' ✗ ' + f));
if (process.argv.includes('-w')) warnings.forEach((w) => console.log(' ! ' + w));
process.exit(fail ? 1 : 0);
