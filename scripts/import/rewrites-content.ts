// Hand-reviewed edits to legacy/content/*.md. Prose edits name a line; exercise edits name the exact text inside the
// file's exercise and annotated-code fields, because exercises are rewritten as parsed objects, not as lines.
import { D, E, L, T, type DomainPhrase, type LineEdit, type RuleId } from './rewrite-engine';

const WEEKDAY_TO_LESSON: Record<string, string> = { Mon: '1', Tue: '2', Wed: '3', Thu: '4', Fri: '5' };

/** The overview table of a module: "Day" becomes "Lesson", and Monday to Friday become 1 to 5. */
const lessonTable = (header: number, rows: number[]): LineEdit[] => [
  E(header, '| Day |', '| Lesson |', 'weekday'),
  ...rows.map((n) =>
    T(
      n,
      (text) =>
        text.replace(/^\| (Mon|Tue|Wed|Thu|Fri) \|/, (_, day: string) => `| ${WEEKDAY_TO_LESSON[day]} |`),
      'weekday',
    ),
  ),
];

const ALL_FIVE = [9, 10, 11, 12, 13];

export const CONTENT_EDITS: Record<string, LineEdit[]> = {
  'extra.md': [],
  'w01.md': [
    ...lessonTable(7, ALL_FIVE),
    E(
      5,
      'Everything in the next eleven weeks is judged',
      'Everything in the next eleven modules is judged',
      'relative-week',
    ),
    E(45, 'at the top of the week page', 'at the top of the module overview', 'page-name'),
    E(1315, 'Assessment 1 (next Saturday)', "Assessment 1 (the next module's checkpoint)", 'checkpoint'),
    E(1506, 're-answer the drill on Sunday.', 're-answer the drill later.', 'timetable'),
    E(1506, 'so the revision page can', 'so the Progress page can', 'page-name'),
  ],
  'w02.md': [
    ...lessonTable(7, ALL_FIVE),
    E(515, '@why: Today has three ideas', '@why: This lesson has three ideas', 'relative-day'),
    E(538, 'Yesterday both pointers walked', 'In the previous lesson both pointers walked', 'relative-day'),
    E(866, '(Optional today)', '(Optional in this lesson)', 'relative-day'),
    E(948, '(Friday)', '(lesson 5)', 'weekday'),
    E(1092, '(Friday)', '(lesson 5)', 'weekday'),
    E(1670, 'a short review of the week.', 'a short review of the module.', 'relative-week'),
  ],
  'w03.md': [
    ...lessonTable(7, ALL_FIVE),
    E(5, 'and, on Wednesday, to answers', 'and, in lesson 3, to answers', 'weekday'),
    E(5, 'Friday covers the', 'Lesson 5 covers the', 'weekday'),
    E(1103, 'the point today is to practise', 'the point here is to practise', 'relative-day'),
    E(
      1376,
      "Note today's score in your weekly reflection;",
      'Note this score in your module reflection;',
      'relative-day',
    ),
  ],
  'w04.md': [
    ...lessonTable(7, ALL_FIVE),
    E(15, 'Saturday is **Assessment 2**', 'The checkpoint is **Assessment 2**', 'checkpoint'),
    E(
      1155,
      'open the Scorecards page: today is the first milestone check',
      'open the Progress page: this is the first milestone check',
      'page-name',
    ),
    E(
      1158,
      'near each failed pattern on Sunday, then a cold retry.',
      'near each failed pattern, then a cold retry.',
      'timetable',
    ),
  ],
  'w05.md': [
    ...lessonTable(7, ALL_FIVE),
    E(15, 'Saturday is **Mock 1**', 'The checkpoint is **Mock 1**', 'checkpoint'),
    E(
      106,
      'is the example every later week refers back to',
      'is the example every later module refers back to',
      'relative-week',
    ),
    E(
      303,
      "- Today's contract-first recursion (Day 1)",
      '- Contract-first recursion (lesson 1)',
      'relative-day',
    ),
  ],
  'w06.md': [
    ...lessonTable(7, ALL_FIVE),
    E(15, 'Saturday is **Assessment 3**.', 'The checkpoint is **Assessment 3**.', 'checkpoint'),
    E(988, 'This Saturday closes Phase 2', 'This checkpoint closes Phase 2', 'checkpoint'),
    E(988, 'on the Revision page:', 'on the Progress page:', 'page-name'),
    E(988, 'that is your Sunday focus.', 'that is your next focus.', 'timetable'),
  ],
  'w07.md': [
    ...lessonTable(7, ALL_FIVE),
    E(15, "so Monday's 35-line", "so lesson 1's 35-line", 'weekday'),
    E(992, 'focus on exactly those today:', 'focus on exactly those this time:', 'relative-day'),
    E(
      995,
      'do the 90-second explanation drill daily next week.',
      'do the 90-second explanation drill in every session of the next module.',
      'timetable',
    ),
  ],
  'w08.md': [
    ...lessonTable(7, [9, 10, 11, 12]),
    L(13, '| 5 | Bipartite, reverse search | two colours; search from the targets |', 'module-order'),
    L(14, '| Checkpoint | **Assessment 4** | Module 8 milestone check |', 'checkpoint'),
    D(15, 'module-order'),
    E(
      236,
      "Today's adjacency lists and traversals (Day 1)",
      'Adjacency lists and traversals (lesson 1)',
      'relative-day',
    ),
    E(244, "of Monday's graph", "of lesson 1's graph", 'weekday'),
    E(970, "except Sunday's bipartite topic:", "except lesson 5's bipartite topic:", 'module-order'),
    E(972, ':::tip Milestone week', ':::tip Milestone module', 'relative-week'),
    E(
      973,
      'open Scorecards: today is the Week 8 milestone',
      'open the Progress page: this is the Module 8 milestone',
      'page-name',
    ),
  ],
  'w09.md': [
    ...lessonTable(7, [9, 10, 11, 12]),
    E(5, 'Last week every edge', 'In the previous module every edge', 'relative-week'),
    L(
      13,
      '| 5 | Greedy with a running quantity | one variable summarises everything a DP would store |',
      'module-order',
    ),
    L(14, '| Checkpoint | **Module review + Mock 3** | interview conditions, scored |', 'checkpoint'),
    D(15, 'module-order'),
    E(
      1029,
      ' This is the day after a holiday and a mock, so it is deliberately compact.',
      ' It is deliberately compact.',
      'module-order',
    ),
    L(
      1246,
      "This checkpoint is Mock 3 plus the module review. The mock covers Modules 1–9 up to lesson 4's greedy lesson. The re-solves are 743, 210 and 215: do them before the mock as a warm-up, without notes.",
      'module-order',
    ),
  ],
  'w10.md': [
    ...lessonTable(7, ALL_FIVE),
    L(14, '| Checkpoint | **Assessment 5** | timed, unseen problems |', 'checkpoint'),
    D(15, 'timetable'),
    E(18, 'That is normal in week one of DP.', 'That is normal at the start of DP.', 'timetable'),
    E(18, "The roadmap's fall-behind rule:", "The handbook's short-on-time rule:", 'short-on-time'),
    E(
      18,
      "spend Sunday redoing Monday's four-step exercise",
      "spend an extra session redoing lesson 1's four-step exercise",
      'short-on-time',
    ),
    E(
      23,
      'for the whole week and most of next week.',
      'for the whole module and most of the next module.',
      'relative-week',
    ),
    E(
      1029,
      'Open the Assessments page for the rules, the timer and the rubric, and do not look',
      'Use the attempt section of this page for the rules, the timer and the rubric, and do not look',
      'page-name',
    ),
  ],
  'w11.md': [
    ...lessonTable(7, ALL_FIVE),
    E(5, 'Friday changes topic', 'Lesson 5 changes topic', 'weekday'),
    L(14, '| Checkpoint | **Module review + Mock 4** | interview conditions, scored |', 'checkpoint'),
    D(15, 'timetable'),
    E(814, "why today's 190,", 'why the current 190,', 'relative-day'),
    E(
      1008,
      'Re-solve 416 (5 days old), 139 (8 days), 743 (19 days) and 200 (26 days) first,',
      'Re-solve 416, 139, 743 and 200 first,',
      'resolve-offset',
    ),
  ],
  'w12.md': [
    ...lessonTable(7, ALL_FIVE),
    E(5, 'Every day pairs', 'Every lesson pairs', 'timetable'),
    L(14, '| Checkpoint | **Final Assessment 6** | Final scorecard |', 'checkpoint'),
    L(
      15,
      '| Final | Final self-assessment and follow-on plan | Readiness checklist completed honestly |',
      'timetable',
    ),
    E(
      18,
      "If you fall behind, skip Thursday's Hard problem first,",
      "If you are short on time, skip lesson 4's Hard problem first,",
      'short-on-time',
    ),
    E(18, 'for your self-assessment on Sunday.', 'for your final self-assessment.', 'timetable'),
    E(257, '(Problems and journal; Scorecards)', '(Practice; Progress)', 'page-name'),
    E(278, 'Open the Problems and journal page and filter', 'Open the Practice page and filter', 'page-name'),
    E(278, "Use the Revision page's mistake tally", "Use the Progress page's mistake tally", 'page-name'),
    E(476, '(Revision rules, section 8)', '(section 8)', 'page-name'),
    E(652, 'under the rules on the Assessments page.', 'under the rules on this page.', 'page-name'),
    E(
      655,
      "on the Scorecards page today, while the evidence is fresh. Tomorrow's self-assessment uses it.",
      'on the Progress page now, while the evidence is fresh. The final self-assessment uses it.',
      'page-name',
    ),
  ],
};

export interface FieldTextEdit {
  file: string;
  from: string;
  to: string;
  rule: RuleId;
  /** How many fields the text must occur in. Defaults to 1, so a typo or a changed source fails loudly. */
  count?: number;
  /** Set for a comment inside a code field. Text fields are searched otherwise. */
  codeField?: string;
}

export const FIELD_EDITS: FieldTextEdit[] = [
  {
    file: 'extra.md',
    from: "This was Tuesday's Stretch (33).",
    to: "This is Module 3 lesson 2's Stretch (33).",
    rule: 'weekday',
  },
  {
    file: 'w03.md',
    from: "This was Tuesday's Stretch (33).",
    to: "This is Module 3 lesson 2's Stretch (33).",
    rule: 'weekday',
  },
  {
    file: 'w03.md',
    from: 'should be solved with today.',
    to: 'should be solved with in this lesson.',
    rule: 'relative-day',
  },
  {
    file: 'w04.md',
    from: "variant from today's lesson.",
    to: 'variant of the monotonic stack.',
    rule: 'relative-day',
  },
  { file: 'w07.md', from: 'earlier today', to: 'earlier in this lesson', rule: 'relative-day' },
  {
    file: 'w07.md',
    from: "from today's lesson",
    to: 'from this lesson',
    rule: 'relative-day',
    codeField: 'starter',
  },
  { file: 'w11.md', from: "Today's LeetCode 190", to: 'The current LeetCode 190', rule: 'relative-day' },
  {
    file: 'w12.md',
    from: "Which week's problem is this?",
    to: "Which module's problem is this?",
    rule: 'relative-week',
  },
];

/** A field the legacy exercise did not have at all. Recorded as a field change with an empty before, so the
 * fidelity tests set it when they rebuild the expected exercise. */
export interface FieldAddition {
  file: string;
  /** The legacy exercise id. */
  item: string;
  /** Always `verify` today: a trace exercise's reference script (plan 8.4). */
  path: string;
  to: string;
  rule: RuleId;
}

// The trailing newline of each script is part of it, as it is for every verify script that comes from the legacy files.
export const FIELD_ADDITIONS: FieldAddition[] = [
  {
    file: 'w02.md',
    item: 'w2d1-4',
    path: 'verify',
    rule: 'trace-verify',
    to: `const numbers = [-3, -1, 0, 2, 5, 8]; const target = 4;
let l = 0, r = numbers.length - 1;
while (l < r) {
  const sum = numbers[l] + numbers[r];
  console.log(sum);
  if (sum === target) { console.log(JSON.stringify([l + 1, r + 1])); break; }
  if (sum < target) l++;
  else r--;
}
`,
  },
  {
    file: 'w09.md',
    item: 'w9d3-1',
    path: 'verify',
    rule: 'trace-verify',
    to: `const edges = [[0, 1, 4], [0, 2, 1], [1, 2, 2], [1, 3, 5], [3, 4, 3]];
const parent = [0, 1, 2, 3, 4];
const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
const used = []; const skipped = []; let cost = 0;
for (const [u, v, w] of [...edges].sort((a, b) => a[2] - b[2])) {
  const ru = find(u), rv = find(v);
  if (ru === rv) { skipped.push(u + '-' + v); continue; }
  parent[ru] = rv; cost += w; used.push(u + '-' + v);
}
console.log(used[0]); console.log(skipped[0]); console.log(cost); console.log(used.length);
`,
  },
  {
    file: 'w12.md',
    item: 'w12d1-2',
    path: 'verify',
    rule: 'trace-verify',
    to: `// The clock the handbook's table teaches: phases end at 5, 15, 35, 42 and the total is 45.
const total = 45;
const phaseEnd = { clarify: 5, approach: 15, code: 35, verify: 42, wrap: total };
console.log(phaseEnd.clarify);
console.log(phaseEnd.approach);
console.log(phaseEnd.verify - phaseEnd.code);
console.log(phaseEnd.wrap - phaseEnd.verify);
`,
  },
];

/** Wording about the problem, not the timetable. Generic rules must not touch it. */
export const PROTECTED_PHRASES: DomainPhrase[] = [
  { phrase: "yesterday's values", reason: 'State-machine DP over days (309)' },
  { phrase: "yesterday's sold", reason: 'State-machine DP over days (309)' },
  { phrase: "today's rest", reason: 'State-machine DP over days (309)' },
  { phrase: "≤ today's", reason: 'Stock span statement: a price compared across days' },
];
