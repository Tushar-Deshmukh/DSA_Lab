// Phase 0 inventory: exact counts from the parsed legacy course (read-only; run from the scratch legacy copy).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = process.argv[2];
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const C = JSON.parse(rd('dist/course.json'));
const EX = JSON.parse(rd('dist/exercises.json'));
const road = rd('source/roadmap.md');
const out = {};
const tally = (arr, f) => { const t = {}; for (const x of arr) { const k = f(x); t[k] = (t[k] || 0) + 1; } return t; };

// ---- structure
const lessons = Object.values(C.lessons);
out.lessonPagesByKind = tally(lessons, (l) => l.kind);
out.weekOverviews = C.weeks.filter((w) => w.overview).length;
out.extraPages = Object.keys(C.extra);
out.perWeek = C.weeks.map((w) => {
  const ls = lessons.filter((l) => l.week === w.n);
  return { w: w.n, title: w.title, study: ls.filter((l) => l.kind === 'study').length, sat: ls.filter((l) => l.kind === 'saturday').length, final: ls.filter((l) => l.kind === 'final').length };
});
// ---- units: "## " headings by file
const files = fs.readdirSync(path.join(ROOT, 'content')).filter((f) => f.endsWith('.md')).sort();
const tags = {}; let totalH2 = 0; const h2PerFile = {};
const metaKeys = {}; const callouts = {}; const stageNames = {}; const directives = {};
let pulls = { local: 0, cross: 0, section: 0 }, vizEmbeds = 0, vizWithProps = 0, annos = 0, stagesBlocks = 0;
const vizPropKeys = {};
for (const f of files) {
  let inFence = false; let n = 0;
  for (const l of rd('content/' + f).split('\n')) {
    if (/^```/.test(l)) { if (!inFence) { const m = l.match(/^```(\w*)/); directives['fence:' + (m[1] || 'plain')] = (directives['fence:' + (m[1] || 'plain')] || 0) + 1; if (m[1] === 'anno') annos++; } inFence = !inFence; continue; }
    if (inFence) continue;
    let m;
    if ((m = l.match(/^## (.+?)(?:\s+\{(\w[\w-]*)\})?\s*$/))) { n++; totalH2++; tags[m[2] || '(none)'] = (tags[m[2] || '(none)'] || 0) + 1; }
    if ((m = l.match(/^@(\w+)/))) { const k = m[1]; if (!['pull', 'viz', 'stage'].includes(k)) metaKeys[k] = (metaKeys[k] || 0) + 1; }
    if ((m = l.match(/^@pull\s+s(\d+):/))) pulls.section++; else if ((m = l.match(/^@pull\s+w(\d+):/))) pulls.cross++; else if (/^@pull\s/.test(l)) pulls.local++;
    if ((m = l.match(/^@viz\s+([\w-]+)\s*(\{.*\})?\s*$/))) { vizEmbeds++; if (m[2]) { vizWithProps++; for (const k of Object.keys(JSON.parse(m[2]))) vizPropKeys[k] = (vizPropKeys[k] || 0) + 1; } }
    if ((m = l.match(/^:::(\w+)/))) { callouts[m[1]] = (callouts[m[1]] || 0) + 1; if (m[1] === 'stages') stagesBlocks++; }
    if ((m = l.match(/^@stage\s+(\w+)/))) stageNames[m[1]] = (stageNames[m[1]] || 0) + 1;
  }
  h2PerFile[f] = n;
}
Object.assign(out, { totalH2, h2PerFile, unitTags: tags, metaKeys, callouts, stageNames, directives, pulls, vizEmbeds, vizWithProps, vizPropKeys, annos, stagesBlocks });

// blocks before the first ## in a lesson (would need an implicit intro unit)
const introBlocks = lessons.filter((l) => l.kind === 'study').map((l) => { const i = l.blocks.findIndex((b) => b.t === 'h'); return { id: l.id, before: i }; }).filter((x) => x.before !== 0);
out.studyLessonsWithBlocksBeforeFirstH2 = introBlocks.length;

// ---- exercises
out.exTotal = EX.length;
out.exByType = tally(EX, (e) => e.type);
out.exByLessonGroup = tally(EX, (e) => (/^w\d+/.test(e.lesson) ? 'W' + /^w(\d+)/.exec(e.lesson)[1] : e.lesson));
const fieldSet = {}; for (const e of EX) for (const k of Object.keys(e)) { (fieldSet[e.type] ||= {}); fieldSet[e.type][k] = (fieldSet[e.type][k] || 0) + 1; }
out.exFieldsByType = fieldSet;
out.exWithExplicitId = EX.filter((e) => !new RegExp('^' + e.lesson + '-\\d+$').test(e.id)).map((e) => e.id);
out.compareModes = tally(EX.filter((e) => e.compare), (e) => e.compare);
out.adaptArgs = tally(EX.filter((e) => e.adapt && e.adapt.args).flatMap((e) => e.adapt.args.filter(Boolean)), (x) => x);
out.adaptRet = tally(EX.filter((e) => e.adapt && e.adapt.ret), (e) => e.adapt.ret);
out.checkers = EX.filter((e) => e.checker).length;
out.opsTests = EX.filter((e) => (e.tests || []).some((t) => t.ops)).length;
out.hiddenTests = EX.reduce((a, e) => a + (e.tests || []).filter((t) => t.hidden).length, 0);
out.allTests = EX.reduce((a, e) => a + (e.tests || []).length, 0);
out.interviewWithoutCode = EX.filter((e) => e.type === 'interview' && !e.fn).map((e) => e.id);
out.traceWithVerify = EX.filter((e) => e.type === 'trace' && e.verify).length;
out.traceWithoutVerify = EX.filter((e) => e.type === 'trace' && !e.verify).map((e) => e.id);
out.fillWithoutTests = EX.filter((e) => e.type === 'fill' && !e.fn).map((e) => e.id);
out.mcqMulti = EX.filter((e) => ['mcq', 'pattern', 'recall'].includes(e.type) && e.options.filter((o) => o.ok).length > 1).length;
const noWhy = EX.flatMap((e) => (e.options || []).map((o, i) => ({ id: e.id, i, ok: !!o.ok, why: !!o.why }))).filter((o) => !o.why);
out.optionsNoExplanation = { total: noWhy.length, correct: noWhy.filter((o) => o.ok).length, wrong: noWhy.filter((o) => !o.ok).length, wrongList: noWhy.filter((o) => !o.ok).map((o) => o.id + '#' + o.i) };
out.wrongOptionsNoKind = EX.flatMap((e) => (e.options || []).filter((o) => !o.ok && !o.kind).map(() => e.id)).length;
out.exNoHints = EX.filter((e) => !e.hints || !e.hints.length).length;
out.hintsPerEx = tally(EX, (e) => (e.hints || []).length);

// ---- patterns
const patterns = [...road.matchAll(/^\*\*Pattern (\d+)\.(\d+): (.+?)\*\*\s*$/gm)].map((m) => ({ id: m[1] + '.' + m[2], title: m[3] }));
out.patterns = patterns.length; out.patternsPerWeek = tally(patterns, (p) => 'W' + p.id.split('.')[0]);
const patternBlocks = road.split(/^\*\*Pattern /m).slice(1);
out.patternsWith8Parts = patternBlocks.filter((b) => ['Recognise', 'Clues', 'From brute force', 'Why it works', 'Template', 'Complexity', 'Variations', 'Inappropriate when'].every((k) => new RegExp('\\*' + k).test(b))).length;

// ---- bank
out.bank = C.bank.length; out.bankByTier = tally(C.bank, (b) => b.tier); out.bankByDiff = tally(C.bank, (b) => b.diff); out.bankByWeek = tally(C.bank, (b) => 'W' + b.week); out.bankByRole = tally(C.bank, (b) => b.role);
out.bankDistinctPatternStrings = new Set(C.bank.map((b) => b.pattern)).size;

// ---- assessments/mocks
out.assessments = C.assessments.map((a) => ({ id: a.id, cold: a.coldNums, problems: a.problems.map((p) => p.num + ' ' + p.title), total: a.total, pass: a.pass }));
out.mocks = C.mocks.map((m) => ({ id: m.id, pool: m.pool.map((p) => p.num + ' ' + p.title) }));
const reserved = new Map(); for (const a of C.assessments) for (const p of a.problems) reserved.set(p.num, p.title); for (const m of C.mocks) for (const p of m.pool) reserved.set(p.num, p.title);
out.reservedCount = reserved.size;
const bankNums = new Set(C.bank.map((b) => b.num));
out.reservedAlsoInBank = [...reserved.keys()].filter((n) => bankNums.has(n));

// ---- reserved-problem leak scan: titles and URL slugs, plus bare numbers, outside section 9
const s9a = road.indexOf('## 9. Assessments'), s9b = road.indexOf('\n## 10.', s9a);
const roadNo9 = road.slice(0, s9a) + road.slice(s9b);
const corp = [['roadmap(excl s9)', roadNo9], ...files.map((f) => ['content/' + f, rd('content/' + f)])];
const leaks = [];
for (const [num, title] of reserved) {
  const wordNum = new RegExp('(?<![\\d.,/-])' + num + '(?![\\d,.]\\d|\\d)');
  for (const [name, text] of corp) {
    if (text.toLowerCase().includes(title.toLowerCase())) leaks.push({ num, title, where: name, how: 'title' });
    text.split('\n').forEach((line, i) => { if (wordNum.test(line) && num >= 100) leaks.push({ num, title, where: name + ':' + (i + 1), how: 'number', line: line.slice(0, 140) }); });
  }
}
out.reservedLeaks = leaks;

// ---- week-12 pattern leaks: W12 bank problems mentioned with their pattern elsewhere
const w12 = C.bank.filter((b) => b.week === 12).map((b) => b.num).concat([239, 297]);
const w12hits = [];
for (const n of w12) for (const [name, text] of corp) { if (name.startsWith('content/w12')) continue; text.split('\n').forEach((line, i) => { if (new RegExp('(?<![\\d.,/-])' + n + '(?![\\d,.]\\d|\\d)').test(line)) { const inBank = /^\| \d+ \| \[/.test(line); if (!inBank) w12hits.push({ n, where: name + ':' + (i + 1), line: line.slice(0, 130) }); } }); }
out.week12Mentions = w12hits;

// ---- date / timetable scan (learner-facing text)
const DATE_RES = {
  'calendar date (e.g. 2 Nov, Sat 14 Nov)': /\b\d{1,2}(?:–\d{1,2})? (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}\b/g,
  'weekday name': /\b(?:Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\b/g,
  'Week N reference': /\bWeeks? \d+(?:[–-]\d+)?\b/g,
  'W<n> / W<n>D<n> code': /\bW\d+(?:\s?D\d+)?\b/g,
  'Day N reference': /\bDays? \d+(?:[–-]\d+)?\b/g,
  '"12 weeks"/"12-week"': /\b(?:12|twelve)[- ]weeks?\b/gi,
  'relative time (today/tomorrow/yesterday/tonight)': /\b(?:today|tomorrow|yesterday|tonight|this week|next week|last week|this weekend)\b/gi,
  'holiday note': /\bHoliday\b|\bChristmas\b|New Year/g,
  'falling behind': /\bfall(?:ing)? behind\b|\bcatch-up\b|\bovertime\b/gi,
  '"N days/hours a day" budget': /\b\d+ hours? (?:a|per) (?:day|week)\b|\bhours\/week\b|\b144[- ]hours?\b/gi,
};
const dateScan = {};
for (const [name, text] of corp) {
  for (const [label, re] of Object.entries(DATE_RES)) { const hits = text.match(re); if (hits) { (dateScan[label] ||= { total: 0, byFile: {} }); dateScan[label].total += hits.length; dateScan[label].byFile[name] = hits.length; } }
}
out.dateScan = dateScan;
out.personal = { rohit: (road.match(/@rohit/g) || []).length, mern: [...road.matchAll(/.*(?:3\.5|MERN).*/g)].map((m) => m[0].slice(0, 110)), claude: [...corp].flatMap(([n, t]) => (t.match(/\bClaude\b/g) || []).map(() => n)).length, roadmapWordInContent: files.reduce((a, f) => a + (rd('content/' + f).match(/\broadmap\b/gi) || []).length, 0), sectionRefsInContent: files.reduce((a, f) => a + (rd('content/' + f).match(/\b[Ss]ection \d+|\(\d{1,2}\.\d{1,2}\)/g) || []).length, 0) };
// ---- theory fragments
const frag = {}; let fragTotal = 0; for (let w = 1; w <= 12; w++) { frag['W' + w] = C.weeks ? null : 0; }
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), 'inventory.json'), JSON.stringify(out, null, 1));
for (const k of ['lessonPagesByKind', 'weekOverviews', 'extraPages', 'perWeek', 'totalH2', 'h2PerFile', 'unitTags', 'metaKeys', 'callouts', 'stageNames', 'directives', 'pulls', 'vizEmbeds', 'vizWithProps', 'vizPropKeys', 'annos', 'stagesBlocks', 'studyLessonsWithBlocksBeforeFirstH2', 'exTotal', 'exByType', 'exByLessonGroup', 'exWithExplicitId', 'compareModes', 'adaptArgs', 'adaptRet', 'checkers', 'opsTests', 'hiddenTests', 'allTests', 'interviewWithoutCode', 'traceWithVerify', 'traceWithoutVerify', 'fillWithoutTests', 'mcqMulti', 'optionsNoExplanation', 'wrongOptionsNoKind', 'exNoHints', 'hintsPerEx', 'patterns', 'patternsPerWeek', 'patternsWith8Parts', 'bank', 'bankByTier', 'bankByDiff', 'bankByWeek', 'bankByRole', 'bankDistinctPatternStrings', 'reservedCount', 'reservedAlsoInBank', 'personal']) console.log(k + ':', JSON.stringify(out[k]));
console.log('assessments:'); out.assessments.forEach((a) => console.log(' ', JSON.stringify(a)));
console.log('mocks:'); out.mocks.forEach((m) => console.log(' ', JSON.stringify(m)));
console.log('dateScan:'); for (const [k, v] of Object.entries(out.dateScan)) console.log(' ', k, v.total, 'in', Object.keys(v.byFile).length, 'files; roadmap:', v.byFile['roadmap(excl s9)'] || 0);
console.log('reservedLeaks:', leaks.length); leaks.slice(0, 40).forEach((l) => console.log('  ', JSON.stringify(l)));
console.log('week12Mentions:', w12hits.length); w12hits.slice(0, 40).forEach((l) => console.log('  ', JSON.stringify(l)));
