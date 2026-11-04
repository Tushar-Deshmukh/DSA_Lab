// Second-pass scans: paraphrased leaks, week-12 pattern leaks, visualizer structure.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const ROOT = process.argv[2];
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const road = rd('source/roadmap.md');
const files = fs.readdirSync(path.join(ROOT, 'content')).filter((f) => f.endsWith('.md')).sort();
const s9a = road.indexOf('## 9. Assessments'), s9b = road.indexOf('\n## 10.', s9a);
const corp = [['roadmap', road.slice(0, s9a) + '\n'.repeat(road.slice(s9a, s9b).split('\n').length - 1) + road.slice(s9b)], ...files.map((f) => ['content/' + f, rd('content/' + f)])];

console.log('--- paraphrase phrases for reserved problems (outside section 9) ---');
const phrases = { 'stock span': 901, 'divisible by k': 974, 'vowel': 1456, 'node and ancestor': 1026, 'asteroid': 735, 'k-sum pair': 1679, 'furthest building': 1642, 'inform all employees': 1376, 'integer break': 343, 'snakes': 909, 'last stone weight ii': 1049, 'search suggestion': 1268, 'contiguous array': 525, 'path sum iii': 437, 'top k frequent words': 692, 'nearest exit': 1926, 'reorder routes': 1466, 'jump game iii': 1306, 'falling path': 931, 'string chain': 1048, 'single-threaded': 1834, 'detonate': 2101, 'last k numbers': 1352, 'distance k': 863, 'far from land': 1162, 'confusion': 2024, 'level sum': 1161, 'operations to make network': 1319, 'duplicates from sorted list ii': 82, 'combination sum iii': 216 };
for (const [p, n] of Object.entries(phrases)) for (const [name, t] of corp) t.split('\n').forEach((l, i) => { if (l.toLowerCase().includes(p)) console.log(`  ${n} "${p}" ${name}:${i + 1}: ${l.trim().slice(0, 150)}`); });

console.log('--- week-12 numbers, slash-separated forms included (outside w12.md and bank/schedule rows) ---');
for (const n of [438, 287, 853, 981, 380, 678]) for (const [name, t] of corp) { if (name.includes('w12')) continue; t.split('\n').forEach((l, i) => { if (new RegExp('(?<![\\d.,-])' + n + '(?![\\d,.]\\d|\\d)').test(l) && !/^\| \d+ \| \[/.test(l) && !/^\| (Mon|Tue|Wed|Thu|Fri|Sat|Sun) /.test(l)) console.log(`  ${n} ${name}:${i + 1}: ${l.trim().slice(0, 170)}`); }); }

console.log('--- trace exercises without verify ---');
const EX = JSON.parse(rd('dist/exercises.json'));
for (const id of ['w2d1-4', 'w9d3-1', 'w12d1-2']) { const e = EX.find((x) => x.id === id); console.log(' ', id, JSON.stringify({ q: e.q, rows: e.rows.map((r) => [r.prompt, r.answer]) }).slice(0, 420)); }

console.log('--- exercises per lesson page kinds ---');
const pageTally = {}; for (const e of EX) { const k = /sat$/.test(e.lesson) ? 'saturday' : /^w\d+d\d+$/.test(e.lesson) ? 'study' : e.lesson; pageTally[k] = (pageTally[k] || 0) + 1; } console.log(' ', JSON.stringify(pageTally));
console.log('--- distinct pages with exercises:', new Set(EX.map((e) => e.lesson)).size);

// ---- visualizers
const ctx = { console, document: {}, Node: function () {} }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['src/shared.js', 'src/core.js', 'src/viz/render.js', 'src/viz/player.js']) vm.runInContext(rd(f), ctx, { filename: f });
const vizFiles = fs.readdirSync(path.join(ROOT, 'src/viz')).filter((f) => /^(w\d+|algo).*\.js$/.test(f)).sort();
const byFile = {}; const before = new Set();
for (const f of vizFiles) { vm.runInContext(rd('src/viz/' + f), ctx, { filename: f }); const now = Object.keys(ctx.Viz.DEFS).filter((k) => !before.has(k)); now.forEach((k) => before.add(k)); byFile[f] = now; }
console.log('--- visualizers per file ---'); for (const [f, l] of Object.entries(byFile)) console.log(' ', f, l.length);
const { DEFS, runDef } = ctx.Viz;
const { REFS } = await import(new URL('file:///' + path.join(ROOT, 'tests/refs.mjs').replace(/\\/g, '/')).href);
const ids = Object.keys(DEFS);
console.log('total', ids.length);
console.log('with REFS', ids.filter((i) => REFS[i]).length, 'without', ids.filter((i) => !REFS[i]));
console.log('REFS with gen', ids.filter((i) => REFS[i] && REFS[i].gen).length, ' no gen:', ids.filter((i) => REFS[i] && !REFS[i].gen));
console.log('REFS by kind: ref', ids.filter((i) => REFS[i] && REFS[i].ref && !REFS[i].cmp).length, 'ref+cmp', ids.filter((i) => REFS[i] && REFS[i].cmp).length, 'check', ids.filter((i) => REFS[i] && REFS[i].check).length);
console.log('REFS extra (no viz):', Object.keys(REFS).filter((k) => !DEFS[k]));
const stepCounts = [], stepKeys = {}, inputTypes = {}, widest = [], rend = {}, noPreset = [], whyCount = { steps: 0, why: 0 };
for (const id of ids) {
  const def = DEFS[id];
  (def.inputs || []).forEach((f) => { inputTypes[f.type || '(none)'] = (inputTypes[f.type || '(none)'] || 0) + 1; });
  if (!def.presets || !def.presets.length) noPreset.push(id);
  const defaults = Object.fromEntries((def.inputs || []).map((f) => [f.key, f.def]));
  const steps = runDef(def, JSON.parse(JSON.stringify(defaults)));
  stepCounts.push([id, steps.length]);
  for (const s of steps) { whyCount.steps++; if (s.why) whyCount.why++; for (const k of Object.keys(s)) stepKeys[k] = (stepKeys[k] || 0) + 1; }
  const src = String(def.render);
  for (const m of src.matchAll(/\bR\.(\w+)\(/g)) rend[m[1]] = (rend[m[1]] || 0) + 1;
  for (const m of src.matchAll(/\bel\('([^']+)'/g)) { const k = 'el:' + m[1].split(/[.#]/)[0] + (m[1].includes('.') ? '.' + m[1].split('.').slice(1).join('.') : ''); rend[k] = (rend[k] || 0) + 1; }
  if (/document\.|innerHTML|createElement|svg\(|R\.svg/.test(src)) widest.push(id);
}
stepCounts.sort((a, b) => a[1] - b[1]);
console.log('default-input step counts: min', stepCounts[0], 'median', stepCounts[stepCounts.length >> 1], 'max', stepCounts.at(-1), 'total', stepCounts.reduce((a, x) => a + x[1], 0));
console.log('input field types', JSON.stringify(inputTypes));
console.log('viz without presets', noPreset.length, noPreset.slice(0, 30));
console.log('why coverage', JSON.stringify(whyCount));
console.log('top step-state keys', JSON.stringify(Object.entries(stepKeys).sort((a, b) => b[1] - a[1]).slice(0, 40)));
console.log('distinct step-state keys', Object.keys(stepKeys).length);
console.log('render uses', JSON.stringify(Object.entries(rend).sort((a, b) => b[1] - a[1])));
console.log('render with direct DOM/svg:', widest);
const lens = ids.map((i) => [i, String(DEFS[i].render).length]).sort((a, b) => b[1] - a[1]); console.log('longest render()s', JSON.stringify(lens.slice(0, 12)), 'median', lens[lens.length >> 1][1]);
const opsLike = ids.filter((i) => /\bops?\b|\bcount\b|comparisons|steps\b/.test(String(DEFS[i].run))); console.log('run() mentions an op-like counter:', opsLike.length);
const bruteLike = ids.filter((i) => /brute/i.test(i) || /brute/i.test(DEFS[i].title)); console.log('brute-titled viz:', bruteLike);
const shareBase = fs.readdirSync(path.join(ROOT, 'src/viz')).filter((f) => /^w\d+/.test(f)).map((f) => { const s = rd('src/viz/' + f); return [f, (s.match(/^\s*(?:const|function) [a-zA-Z_]\w*/gm) || []).length, (s.match(/[a-z]Def\(/g) || []).length]; }); console.log('per-file helper decl counts, *Def() calls', JSON.stringify(shareBase));
