// Sixth pass: where the 278 "##" sections sit, untagged section titles, and the headings of checkpoint pages.
import fs from 'node:fs'; import path from 'node:path';
const ROOT = process.argv[2];
const files = fs.readdirSync(path.join(ROOT, 'content')).filter((f) => /^w\d+\.md$/.test(f)).sort();
const where = { overview: 0, study: 0, saturday: 0 }; const untagged = {}; const satHeads = {}; const perLesson = [];
for (const f of files) {
  const w = Number(f.slice(1, 3)); let cur = 'overview', fence = false, n = 0;
  for (const l of fs.readFileSync(path.join(ROOT, 'content', f), 'utf8').split('\n')) {
    if (/^```/.test(l)) { fence = !fence; continue; } if (fence) continue;
    let m;
    if ((m = l.match(/^# (Lesson (\d+)|Week|Saturday)/))) { if (cur === 'study') perLesson.push(n); n = 0; cur = m[2] ? 'study' : m[1] === 'Saturday' ? 'saturday' : 'overview'; continue; }
    if ((m = l.match(/^## (.+?)(?:\s*\{(\w+)\})?\s*$/))) { where[cur]++; if (cur === 'study') n++; if (!m[2]) (untagged[m[1]] ||= []).push('W' + w + ':' + cur); if (cur === 'saturday') (satHeads['W' + w] ||= []).push(m[1]); }
  }
  if (cur === 'study') perLesson.push(n);
}
console.log('## by place', JSON.stringify(where));
console.log('## per study lesson: lessons', perLesson.length, 'min', Math.min(...perLesson), 'max', Math.max(...perLesson));
console.log('untagged ## titles', JSON.stringify(Object.fromEntries(Object.entries(untagged).map(([k, v]) => [k, v.length]))));
console.log('saturday headings'); for (const [k, v] of Object.entries(satHeads)) console.log(' ', k, v.join(' / '));
