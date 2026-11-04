// Parses the corrected roadmap (source/roadmap.md) into structured curriculum data.
// The roadmap is the single source of truth: theory fragments, the day-by-day
// schedule, the problem bank, assessments and mocks all come from it.
import fs from 'node:fs';

const splitCells = (line) =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '')
    .split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));

function sectionLines(lines, startRe, endRe) {
  const s = lines.findIndex((l) => startRe.test(l));
  if (s < 0) throw new Error('section not found: ' + startRe);
  let e = lines.findIndex((l, i) => i > s && endRe.test(l));
  if (e < 0) e = lines.length;
  return lines.slice(s, e);
}

function tableAfter(lines, idx) {
  // returns {rows, end} for the first markdown table at or after idx
  let i = idx;
  while (i < lines.length && !lines[i].startsWith('|')) i++;
  const header = splitCells(lines[i]);
  const rows = [];
  i += 2;
  while (i < lines.length && lines[i].startsWith('|')) {
    const cells = splitCells(lines[i]);
    const row = {};
    header.forEach((h, k) => (row[h] = cells[k] ?? ''));
    rows.push(row);
    i++;
  }
  return { header, rows, end: i };
}

const keyOf = (label) => {
  let k = label.replace(/`/g, '').trim();
  const ex = k.match(/^(Example \d+|Pattern \d+\.\d+)/);
  if (ex) return ex[1];
  return k.replace(/[.:]\s*$/, '').replace(/\.$/, '').trim();
};

// ---------- weekly theory fragments (section 3)
function parseTheory(lines) {
  const sec = sectionLines(lines, /^## 3\. /, /^## 4\. /);
  const weeks = {};
  let w = null, cur = null;
  const push = () => {
    if (cur && w) {
      const body = cur.lines.join('\n').trim();
      if (body) {
        if (weeks[w].frags[cur.key]) cur.key += ' (2)';
        weeks[w].frags[cur.key] = body;
        weeks[w].order.push(cur.key);
      }
    }
    cur = null;
  };
  for (const line of sec) {
    const wm = line.match(/^### Week (\d+) \((.+?)\): (.+)$/);
    if (wm) {
      push();
      w = Number(wm[1]);
      weeks[w] = { week: w, dates: wm[2], title: wm[3], frags: {}, order: [], intro: '' };
      continue;
    }
    if (!w) continue;
    const hm = line.match(/^#### (.+)$/);
    if (hm) {
      push();
      cur = { key: hm[1].trim(), lines: [], heading: true };
      continue;
    }
    const bm = line.match(/^\*\*(.+?)\*\*/);
    if (bm) {
      push();
      cur = { key: keyOf(bm[1]), lines: [line] };
      continue;
    }
    if (!cur) {
      if (line.trim()) weeks[w].intro += line + '\n';
      continue;
    }
    cur.lines.push(line);
  }
  push();
  return weeks;
}

// ---------- day-by-day schedule (section 4)
function parseProblems(cell) {
  const out = [];
  for (const m of cell.matchAll(/\b([CSO]): ([^·]+)/g)) {
    const tier = m[1];
    const nums = m[2].split('+')[0].match(/\b\d+\b/g) || [];
    for (const n of nums) out.push({ num: Number(n), tier });
  }
  return out;
}
function parseSchedule(lines) {
  const sec = sectionLines(lines, /^## 4\. /, /^## 5\. /);
  const intro = [];
  const weeks = {};
  let w = null;
  for (let i = 0; i < sec.length; i++) {
    const line = sec[i];
    const wm = line.match(/^### Week (\d+) \((.+?)\): (.+)$/);
    if (wm) { w = Number(wm[1]); weeks[w] = { week: w, dates: wm[2], title: wm[3], notes: [], days: [], fallBehind: '' }; continue; }
    if (!w) { if (!line.startsWith('## ')) intro.push(line); continue; }
    if (line.startsWith('| Day')) {
      const { rows, end } = tableAfter(sec, i);
      let studyIdx = 0;
      for (const r of rows) {
        const date = r['Day'];
        const topic = r['Topic and theory'];
        const isRest = /^Rest or/.test(topic) || /^Holiday/.test(topic);
        const isSat = /^Sat /.test(date);
        const isFinal = /^Final self/.test(topic);
        const kind = isRest ? 'rest' : isSat ? 'saturday' : isFinal ? 'final' : 'study';
        if (kind === 'study') studyIdx++;
        weeks[w].days.push({
          date, kind, studyDay: kind === 'study' ? studyIdx : null,
          topic, implement: r['Implement / dry run'], problemsCell: r['Problems'],
          problems: kind === 'study' ? parseProblems(r['Problems']) : [],
          time: r['Time'], warmup: r['Warm-up'], doneWhen: r['Done when'],
        });
      }
      i = end - 1;
      continue;
    }
    const fb = line.match(/^\*\*If you fall behind in Week \d+:\*\* (.+)$/);
    if (fb) { weeks[w].fallBehind = fb[1]; continue; }
    if (line.trim()) weeks[w].notes.push(line);
  }
  return { intro: intro.join('\n').trim(), weeks };
}

// ---------- problem bank (section 5)
function parseBank(lines) {
  const sec = sectionLines(lines, /^## 5\. /, /^## 6\. /);
  const bank = [];
  for (let i = 0; i < sec.length; i++) {
    if (sec[i].startsWith('| # |')) {
      const { rows, end } = tableAfter(sec, i);
      for (const r of rows) {
        const m = r['Problem'].match(/^\[(.+)\]\((https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/)\)$/);
        const [tier, role] = r['Tier · Role'].split('·').map((s) => s.trim());
        bank.push({
          num: Number(r['#']), title: m[1], url: m[2], diff: r['Diff'], when: r['When'],
          week: Number(r['When'].match(/W(\d+)/)[1]), day: Number(r['When'].match(/D(\d+)/)[1]),
          tier, role, pattern: r['Pattern'], prereq: r['Prerequisite'], why: r['Why it is worth solving'],
          hint: r['Hint (key observation)'],
        });
      }
      i = end - 1;
    }
  }
  return bank;
}

// ---------- assessments and mocks (section 9)
function parseAssessments(lines) {
  const sec = sectionLines(lines, /^## 9\. /, /^## 10\. /);
  const ai = sec.findIndex((l) => l.startsWith('| # | Date'));
  const a = tableAfter(sec, ai).rows.map((r) => {
    const probs = [...r['Unseen problems and time limits'].matchAll(/\[(\d+)\. ([^\]]+)\]\((https:[^)]+)\) \((Easy|Medium|Hard), (\d+) min\)/g)]
      .map((m) => ({ num: Number(m[1]), title: m[2], url: m[3], diff: m[4], minutes: Number(m[5]) }));
    const cold = r['Cold re-solve (pick 1 at random)'];
    return {
      id: r['#'], date: r['Date'], topics: r['Topics tested'], coldCell: cold,
      coldNums: (cold.split('(')[0].match(/\b\d+\b/g) || []).map(Number),
      coldMinutes: Number((cold.match(/\((\d+) min\)/) || [])[1]),
      problems: probs, total: r['Total time'], pass: r['Pass mark'],
    };
  });
  const mi = sec.findIndex((l) => l.startsWith('| Mock | Date'));
  const m = tableAfter(sec, mi).rows.map((r) => ({
    id: Number(r['Mock']), date: r['Date'], topics: r['Topics in scope'],
    pool: [...r['Pool'].matchAll(/\[(\d+)\. ([^\]]+)\]\((https:[^)]+)\)/g)].map((x) => ({ num: Number(x[1]), title: x[2], url: x[3] })),
  }));
  return { assessments: a, mocks: m };
}

// ---------- other sections as markdown, split by ### headings
function parseSectionsMd(lines) {
  const out = {};
  let cur = null, sub = null;
  for (const line of lines) {
    const h2 = line.match(/^## (\d+)\. (.+)$/);
    if (h2) { cur = { n: Number(h2[1]), title: h2[2], lead: '', subs: [] }; out[cur.n] = cur; sub = null; continue; }
    if (!cur) continue;
    const h3 = line.match(/^### (.+)$/);
    if (h3) { sub = { title: h3[1], md: '' }; cur.subs.push(sub); continue; }
    if (sub) sub.md += line + '\n'; else cur.lead += line + '\n';
  }
  for (const s of Object.values(out)) { s.lead = s.lead.trim(); s.subs.forEach((x) => (x.md = x.md.trim())); }
  return out;
}

export function parseRoadmap(path) {
  const text = fs.readFileSync(path, 'utf8');
  const lines = text.split('\n');
  return {
    theory: parseTheory(lines),
    schedule: parseSchedule(lines),
    bank: parseBank(lines),
    ...parseAssessments(lines),
    sections: parseSectionsMd(lines),
  };
}

if (process.argv[1] && process.argv[1].endsWith('curriculum.mjs')) {
  const c = parseRoadmap(new URL('../source/roadmap.md', import.meta.url).pathname);
  for (const [w, wk] of Object.entries(c.theory)) console.log('W' + w, wk.order.length, wk.order.join(' | '));
  const days = Object.values(c.schedule.weeks).flatMap((w) => w.days);
  console.log('schedule rows', days.length, 'study', days.filter((d) => d.kind === 'study').length);
  const tiers = {}; c.bank.forEach((b) => (tiers[b.tier] = (tiers[b.tier] || 0) + 1));
  console.log('bank', c.bank.length, tiers);
  console.log('assessments', c.assessments.map((a) => a.id + ':' + a.problems.map((p) => p.num).join(',') + ' cold ' + a.coldNums));
  console.log('mocks', c.mocks.map((m) => m.id + ':' + m.pool.map((p) => p.num)));
  console.log('sections', Object.values(c.sections).map((s) => s.n + ' ' + s.subs.length));
}
