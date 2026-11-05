// Writes what a reviewer reads: the rewrite lists grouped by rule, the import report, and the machine-readable change
// log the fidelity tests replay.
import fs from 'node:fs';
import path from 'node:path';
import type { BuildResult } from './build-content';
import { CHANGE_LOG, DOCS_DIR } from './paths';
import { RULES, type FieldChange, type LineChange, type RuleId } from './rewrite-engine';
import { readVizChanges, type VizChange } from './viz-text';

/** Trims the shared start and end of two strings, so a long line shows what changed and some context around it. */
export function changedWindow(
  before: string,
  after: string | null,
  context = 40,
): { before: string; after: string } {
  if (after === null) return { before, after: '(removed)' };
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = 0;
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end++;
  }
  const from = Math.max(0, start - context);
  const clip = (s: string) => {
    const to = Math.min(s.length, s.length - end + context);
    return (from > 0 ? '…' : '') + s.slice(from, to) + (to < s.length ? '…' : '');
  };
  return { before: clip(before), after: clip(after) };
}

const cell = (text: string): string => '`` ' + text.replace(/\|/g, '\\|').replace(/\n/g, ' ⏎ ') + ' ``';

interface Row {
  rule: RuleId;
  also: RuleId[];
  where: string;
  before: string;
  after: string | null;
}

function toRows(lines: LineChange[], fields: FieldChange[], viz: VizChange[]): Row[] {
  const rows: Row[] = [];
  for (const c of lines) {
    const [rule, ...also] = c.rules;
    if (!rule) throw new Error(`change without a rule at ${c.file}:${c.line}`);
    rows.push({ rule, also, where: `${c.file}:${c.line}`, before: c.before, after: c.after });
  }
  for (const c of fields) {
    const [rule, ...also] = c.rules;
    if (!rule) throw new Error(`change without a rule at ${c.item} ${c.path}`);
    rows.push({ rule, also, where: `${c.file} ${c.item} \`${c.path}\``, before: c.before, after: c.after });
  }
  for (const c of viz) {
    const [rule, ...also] = c.rules;
    if (!rule) throw new Error(`change without a rule at ${c.file}:${c.line}`);
    rows.push({ rule, also, where: `${c.file}:${c.line} (${c.item})`, before: c.before, after: c.after });
  }
  return rows;
}

function renderDoc(title: string, intro: string, rows: Row[], doc: 'date' | 'content'): string {
  const rules = (Object.keys(RULES) as RuleId[]).filter((r) => RULES[r].doc === doc);
  const inDoc = rows.filter((r) => rules.includes(r.rule));
  const out = [`# ${title}`, '', intro, ''];
  out.push(`**${inDoc.length} changed lines or fields.**`, '');
  out.push('| Rule | Changes |', '| --- | --- |');
  for (const rule of rules) {
    out.push(`| ${RULES[rule].title} | ${inDoc.filter((r) => r.rule === rule).length} |`);
  }
  out.push('');
  for (const rule of rules) {
    const group = inDoc.filter((r) => r.rule === rule);
    if (!group.length) continue;
    out.push(
      `## ${RULES[rule].title}`,
      '',
      RULES[rule].reason,
      '',
      '| Where | Before | After |',
      '| --- | --- | --- |',
    );
    for (const row of group) {
      const w = changedWindow(row.before, row.after);
      out.push(`| ${row.where} | ${cell(w.before)} | ${cell(w.after)} |`);
    }
    out.push('');
  }
  return out.join('\n');
}

function renderSlugReview(result: BuildResult): string {
  const out = [
    '# Slugs to review',
    '',
    'For your review before these are frozen. Once learners have progress stored against a slug, changing it needs an alias (D-010). Module and lesson slugs were written by hand for readability. To change one, say which: renaming now costs nothing.',
    '',
    'The slug appears in the address: `/learn/<module>/<lesson>`.',
    '',
  ];
  for (const m of result.slugs.modules) {
    out.push(`## ${m.number}. ${m.title}`, '', `Module slug: \`${m.slug}\``, '');
    out.push('| Legacy id | Lesson slug | Title |', '| --- | --- | --- |');
    for (const r of m.rows) out.push(`| ${r.legacyId} | \`${r.slug}\` | ${r.title} |`);
    out.push('');
  }
  out.push(
    '## Everything else',
    '',
    'These are derived from their titles and frozen in `content/ids.lock.json` at the same time. You do not need to read them all.',
    '',
    '| Kind | Count | Example |',
    '| --- | --- | --- |',
  );
  const kinds = [
    [
      'unit:',
      'Units',
      'two-pointers-windows-prefix-sums/opposite-end-two-pointers/the-three-words-that-decide-the-pattern',
    ],
    ['exercise:', 'Exercises', 'two-pointers-windows-prefix-sums/opposite-end-two-pointers/ex-03'],
    ['theory:', 'Theory fragments', 'two-pointers-windows-prefix-sums/subarray-vs-substring-vs-subsequence'],
    ['pattern:', 'Patterns', 'opposite-end-two-pointers'],
    ['handbook:', 'Handbook pages', 'javascript-reference/cost-model-of-built-ins'],
    ['visualizer:', 'Visualizers', 'pair-brute (legacy ids, unchanged)'],
    ['problem:', 'Problems', '167 (the LeetCode number)'],
  ] as const;
  for (const [prefix, label, example] of kinds) {
    out.push(
      `| ${label} | ${result.slugs.ids.filter((id) => id.startsWith(prefix)).length} | \`${example}\` |`,
    );
  }
  out.push('');
  return out.join('\n');
}

/**
 * docs/date-rewrites.md and docs/content-changes.md, from both logs. The content importer and the visualizer port
 * each call this, so the lists are complete whichever of them ran last.
 */
export function writeChangeDocs(changes: BuildResult['changes'], viz: VizChange[]): void {
  const rows = toRows(changes.lines, changes.fields, viz);
  fs.writeFileSync(
    path.join(DOCS_DIR, 'date-rewrites.md'),
    renderDoc(
      'Date and timetable rewrites',
      'Every date and timetable phrase removed from the legacy course, grouped by rule. Generated by `npm run content:import` and `scripts/import/port-visualizers.ts`; the full lines are in [import/changes.json](import/changes.json) and, for visualizer text, [import/viz-changes.json](import/viz-changes.json). A line changed by several rules appears once, under the first rule that touched it. Paths are relative to `legacy/`; a visualizer change names its visualizer in brackets.',
      rows,
      'date',
    ),
  );
  fs.writeFileSync(
    path.join(DOCS_DIR, 'content-changes.md'),
    renderDoc(
      'Other content changes',
      'Every other change to imported text, with its reason. `tests/content/fidelity.test.ts` replays these and the date rewrites over the legacy files, and fails if the imported text differs in any other way; `tests/viz/parity.test.ts` does the same for visualizer text. Generated by `npm run content:import` and `scripts/import/port-visualizers.ts`. Paths are relative to `legacy/`.',
      rows,
      'content',
    ),
  );
}

export function writeImportDocs(result: BuildResult): void {
  fs.mkdirSync(path.dirname(CHANGE_LOG), { recursive: true });
  fs.writeFileSync(CHANGE_LOG, JSON.stringify(result.changes, null, 1) + '\n');
  writeChangeDocs(result.changes, readVizChanges());

  const report = [
    '# Import report',
    '',
    'Generated by `npm run content:import` from `legacy/`.',
    '',
    '## Counts',
    '',
    '```json',
    JSON.stringify(result.counts, null, 2),
    '```',
    '',
    '## Unparsed items',
    '',
    `${result.warnings.length} (the import fails unless this is 0).`,
    '',
    '## Structural drops',
    '',
    'These are not rewrites of a sentence, so they are listed here instead of in the rewrite lists.',
    '',
    '| What | Where | Why |',
    '| --- | --- | --- |',
    ...result.drops.map((d) => `| ${d.what} | ${d.where} | ${d.reason} |`),
    '',
  ];
  fs.writeFileSync(path.join(DOCS_DIR, 'import-report.md'), report.join('\n'));
  fs.writeFileSync(path.join(DOCS_DIR, 'slug-review.md'), renderSlugReview(result));
}
