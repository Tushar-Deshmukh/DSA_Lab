// Fifth pass: raw line endings, module table, section subsections, exact leak lines, explain coverage.
import fs from 'node:fs'; import path from 'node:path';
const ORIG = 'C:/DSA/dsa-pattern-lab';
const ROOT = process.argv[2]; // patched scratch copy (has dist/)
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

console.log('=== raw line endings in the ORIGINAL folder (byte counts) ===');
function walk(d, out = []) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === 'node_modules' || e.name === '.git') continue; const p = path.join(d, e.name); e.isDirectory() ? walk(p, out) : out.push(p); } return out; }
let crlfFiles = 0, lfFiles = 0, mixed = 0; const rows = [];
for (const f of walk(ORIG)) { const b = fs.readFileSync(f); let cr = 0, lf = 0; for (const x of b) { if (x === 13) cr++; else if (x === 10) lf++; } const kind = cr === 0 ? 'LF' : cr === lf ? 'CRLF' : 'MIXED'; if (kind === 'LF') lfFiles++; else if (kind === 'CRLF') crlfFiles++; else mixed++; rows.push([path.relative(ORIG, f), b.length, cr, lf, kind]); }
console.log('files', rows.length, 'LF', lfFiles, 'CRLF', crlfFiles, 'MIXED', mixed);
rows.filter((r) => r[4] !== 'LF').slice(0, 15).forEach((r) => console.log('  ', r.join(' | ')));

const C = JSON.parse(rd('dist/course.json'));
const EX = JSON.parse(rd('dist/exercises.json'));
console.log('\n=== course.json top-level keys ===', Object.keys(C).join(', '));
console.log('week keys', Object.keys(C.weeks[0]).join(', '));
console.log('\n=== module table ===');
const road = rd('source/roadmap.md');
const pat = [...road.matchAll(/^\*\*Pattern (\d+)\.(\d+): (.+?)\*\*\s*$/gm)];
for (const w of C.weeks) {
  const ls = w.days.map((d) => C.lessons[d.id]).filter(Boolean);
  const study = ls.filter((l) => l.kind === 'study');
  const exN = EX.filter((e) => new RegExp('^w' + w.n + '(d|sat|final)').test(e.lesson)).length;
  const bank = C.bank.filter((b) => b.week === w.n).length;
  console.log(`W${w.n} | ${w.title} | study ${study.length} | ex ${exN} | bank ${bank} | patterns ${pat.filter((m) => Number(m[1]) === w.n).length}`);
  study.forEach((l, i) => console.log(`    L${i + 1}: ${l.title} | time ${l.sched.time}`));
  const sat = ls.find((l) => l.kind === 'saturday'); if (sat) console.log(`    SAT: ${sat.title} | ${String(sat.sched.topicText || sat.sched.topic).replace(/<[^>]+>/g, '').slice(0, 120)}`);
  const fin = ls.find((l) => l.kind === 'final'); if (fin) console.log(`    FINAL: ${fin.title}`);
}
console.log('\n=== roadmap sections ===');
for (const s of Object.values(C.sections)) console.log(s.n, '|', s.title, '|', s.subs.map((x) => x.title).join(' ;; ').slice(0, 900));

console.log('\n=== mcq/pattern options: correct option without why -> has exercise explain? ===');
const mc = EX.filter((e) => ['mcq', 'pattern', 'recall'].includes(e.type));
let noWhy = 0, withExplain = 0; const miss = [];
for (const e of mc) e.options.forEach((o) => { if (o.ok && !o.why) { noWhy++; if (e.explain) withExplain++; else miss.push(e.id); } });
console.log('correct options without why', noWhy, '| of those whose exercise has explain', withExplain, '| neither:', miss.join(', ') || 'none');
console.log('exercises with explain by type', JSON.stringify(EX.reduce((a, e) => { a[e.type] = a[e.type] || [0, 0]; a[e.type][e.explain ? 0 : 1]++; return a; }, {})));

console.log('\n=== exact leak lines ===');
const corp = ['source/roadmap.md', ...fs.readdirSync(path.join(ROOT, 'content')).filter((f) => f.endsWith('.md')).sort().map((f) => 'content/' + f)];
const grepAll = (re, label) => { console.log('--', label); for (const f of corp) rd(f).split('\n').forEach((l, i) => { if (re.test(l)) console.log(`  ${f}:${i + 1}: ${l.trim().slice(0, 230)}`); }); };
grepAll(/divisible by k/i, '974 words');
grepAll(/stock span/i, '901 words');
grepAll(/node and (an )?ancestor|ancestor difference/i, '1026 words');
grepAll(/\(Module 14\)|Module \d/i, 'word Module in legacy');
grepAll(/567\/438|\b287\b|\b678\b/, 'W12 pattern numbers');
grepAll(/Design problems/, 'design problems');
grepAll(/@rohit|Corrected edition|3\.5[- ]year|full-time job/i, 'personal wording');
grepAll(/\b523\b|Continuous Subarray Sum/, '523 bank neighbour of 974');

console.log('\n=== dependency chain lines (s2) ===');
const ls = road.split('\n'); const iDep = ls.findIndex((l) => /Dependency chain/i.test(l)); ls.slice(iDep, iDep + 22).forEach((l, i) => console.log(`  ${iDep + 1 + i}: ${l.slice(0, 220)}`));
const am = rd('src/viz/algo-map.js'); console.log('--- algo-map (first 1800 chars) ---\n' + am.slice(0, 1800));

console.log('\n=== mistakes / scorecards / track in legacy app ===');
const app = rd('src/app.js');
app.split('\n').forEach((l, i) => { if (/\b(S\.mistakes|mistakes\.push|settings\.track|\.track\b|scorecards\[)/.test(l)) console.log(`  app.js:${i + 1}: ${l.trim().slice(0, 200)}`); });
const exj = rd('src/exercises.js'); exj.split('\n').forEach((l, i) => { if (/mistakes\.push|settings\.track/.test(l)) console.log(`  exercises.js:${i + 1}: ${l.trim().slice(0, 200)}`); });

console.log('\n=== section 1 tracks ===');
const i1 = ls.findIndex((l) => /^## 1\./.test(l)); const i2 = ls.findIndex((l) => /^## 2\./.test(l)); ls.slice(i1, i2).forEach((l, i) => { if (/track|Answer key|^### /i.test(l)) console.log(`  ${i1 + 1 + i}: ${l.slice(0, 240)}`); });
