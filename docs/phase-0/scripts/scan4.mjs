// Fourth pass: MDX-breaking characters in legacy Markdown, per-category baseline of the content test, bank <-> lesson placement.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
const ROOT = process.argv[2];
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---- MDX risk: `{`, `}`, `<` outside code spans/fences in prose (roadmap + content, excluding ```ex/```anno YAML which becomes YAML, not MDX)
function prose(text) {
  const out = []; let fence = null;
  text.split('\n').forEach((l, i) => {
    const f = l.match(/^```(\w*)/);
    if (f) { fence = fence === null ? f[1] : null; return; }
    if (fence !== null) return;
    if (/^@(viz|pull|stage|goal|why|prereqs|outcomes|ready|summary|revision)\b/.test(l)) { if (/^@(viz|pull|stage)\b/.test(l)) return; }
    out.push([i + 1, l.replace(/`[^`]*`/g, '')]);
  });
  return out;
}
const files = ['source/roadmap.md', ...fs.readdirSync(path.join(ROOT, 'content')).filter((f) => f.endsWith('.md')).sort().map((f) => 'content/' + f)];
let braces = 0, angle = 0, tagLike = 0; const samples = [];
for (const f of files) for (const [n, l] of prose(rd(f))) {
  const noLinks = l.replace(/\]\([^)]*\)/g, ']');
  const b = /[{}]/.test(noLinks), a = /</.test(noLinks);
  if (b) braces++; if (a) angle++; if (/<[A-Za-z/]/.test(noLinks)) tagLike++;
  if ((b || a) && samples.length < 14) samples.push(f + ':' + n + ': ' + noLinks.trim().slice(0, 120));
}
console.log('prose lines with { or } outside code:', braces, '| with < outside code:', angle, '| with <letter (parsed as a JSX tag):', tagLike);
samples.forEach((s) => console.log('   ', s));
const escapes = files.reduce((a, f) => a + (rd(f).match(/\\[~\[\]|]/g) || []).length, 0);
console.log('backslash escapes (\\~ \\[ \\] \\|):', escapes);

// ---- per-category baseline of tests/content.mjs (same logic, split counters)
const ctx = { console, document: {}, Node: function () {} }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['src/shared.js', 'src/core.js', 'src/viz/render.js', 'src/viz/player.js']) vm.runInContext(rd(f), ctx, { filename: f });
for (const f of fs.readdirSync(path.join(ROOT, 'src/viz')).filter((f) => /^(w\d+|algo).*\.js$/.test(f)).sort()) vm.runInContext(rd('src/viz/' + f), ctx, { filename: f });
const { DEFS, runDef } = ctx.Viz;
const { REFS } = await import(pathToFileURL(path.join(ROOT, 'tests/refs.mjs')).href);
function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let inputsRun = 0, randomRun = 0, randomSkipped = 0, presets = 0, stepsTotal = 0; const lowAccept = [];
for (const [id, def] of Object.entries(DEFS)) {
  const defaults = Object.fromEntries((def.inputs || []).map((f) => [f.key, f.def]));
  const list = [['default', defaults], ...(def.presets || []).map((p) => ['preset', Object.assign({}, defaults, p.input)])]; presets += (def.presets || []).length;
  const R = REFS[id]; let acc = 0, skip = 0;
  if (R && R.gen) { const g = mulberry(id.length * 7919 + 17); for (let k = 0; k < 300; k++) list.push(['random', R.gen(g)]); }
  for (const [label, inp] of list) { try { const st = runDef(def, JSON.parse(JSON.stringify(inp))); inputsRun++; stepsTotal += st.length; if (label === 'random') { randomRun++; acc++; } } catch (e) { if (label === 'random') { randomSkipped++; skip++; } } }
  if (R && R.gen && acc < 250) lowAccept.push(id + ' ' + acc + '/300');
}
console.log('viz baseline: inputs run', inputsRun, '| presets', presets, '| random accepted', randomRun, '| random rejected by validate', randomSkipped, '| steps generated', stepsTotal);
console.log('viz with <250/300 random inputs accepted:', lowAccept.join('; ') || 'none');
const EX = JSON.parse(rd('dist/exercises.json'));
console.log('fill alternatives', EX.filter((e) => e.type === 'fill').reduce((a, e) => a + e.blanks.reduce((b, x) => b + x.accept.length, 0), 0), '| trace rows', EX.filter((e) => e.type === 'trace').reduce((a, e) => a + e.rows.length, 0));
console.log('exercise yaml sizes: code solutions total chars', EX.reduce((a, e) => a + (e.solution || '').length, 0), '| exercises.json bytes', rd('dist/exercises.json').length);
// ---- per-module visualizer and exercise table, and pages with visualizers
const C = JSON.parse(rd('dist/course.json'));
const vizByLesson = {}; const walk = (bs, id) => (bs || []).forEach((b) => { if (b.t === 'viz') (vizByLesson[id] ||= []).push(b.id); if (b.t === 'stages') b.stages.forEach((s) => walk(s.blocks, id)); });
Object.values(C.lessons).forEach((l) => walk(l.blocks, l.id)); C.weeks.forEach((w) => w.overview && walk(w.overview.blocks, 'week' + w.n)); Object.values(C.extra).forEach((p) => walk(p.blocks, p.id));
const counts = Object.values(vizByLesson).map((a) => a.length); console.log('pages with visualizers', counts.length, 'max per page', Math.max(...counts));
const dup = {}; Object.entries(vizByLesson).forEach(([p, ids]) => ids.forEach((i) => (dup[i] ||= []).push(p))); console.log('viz embedded twice:', JSON.stringify(Object.fromEntries(Object.entries(dup).filter(([, v]) => v.length > 1))));
// lesson byte sizes after HTML render (to judge payload)
const sizes = Object.values(C.lessons).filter((l) => l.kind === 'study').map((l) => JSON.stringify(l.blocks).length).sort((a, b) => a - b); console.log('lesson JSON bytes: min', sizes[0], 'median', sizes[sizes.length >> 1], 'max', sizes.at(-1));
