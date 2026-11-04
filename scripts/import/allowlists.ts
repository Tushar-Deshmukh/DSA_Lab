// Starting allowlists for content/allowlists/. After the import those YAML files are the source of truth.
// `match` is matched as a literal, bounded by non-word characters. `in` limits an entry to locations starting with it.

export interface AllowlistEntry {
  match: string;
  reason: string;
  in?: string;
}

const entries = (reason: string, inside: string | undefined, matches: string[]): AllowlistEntry[] =>
  matches.map((match) => ({ match, ...(inside ? { in: inside } : {}), reason }));

const SPACING = 'A spaced-repetition interval: relative time, the rule itself, not a date.';
const AFTER_COURSE =
  'Advice on practice after the course has ended. It is a suggested load, tied to no course date.';

export const ALLOWLIST_DATES: AllowlistEntry[] = [
  // ---- Problem statements and their solutions, where days are the data
  ...entries(
    'Problem 121 is about buying and selling across days.',
    'lesson:complexity-arrays-hashing/arrays-in-place-read-write-pointers',
    ['sell day', 'buy day'],
  ),
  ...entries(
    'Problem 121 is about buying and selling across days.',
    'exercise:two-pointers-windows-prefix-sums/partitioning-and-kadane/ex-08',
    ['day', 'daily'],
  ),
  ...entries('Problem 121 is about buying and selling across days.', 'pattern:kadane', ['daily differences']),
  ...entries('Problem 121 is about buying and selling across days.', 'bank:121#hint', ['sold today']),
  ...entries(
    'Problem 1011 ships packages within a number of days.',
    'lesson:binary-search-sorting/binary-search-on-the-answer',
    ['at most k days', 'within D days', 'capacities, days', 'counting hours or days'],
  ),
  ...entries('Problem 1011 ships packages within a number of days.', 'pattern:binary-search-on-the-answer', [
    'within D days',
  ]),
  ...entries(
    'Problem 1011 ships packages within a number of days.',
    'exercise:binary-search-sorting/binary-search-on-the-answer/ex-02',
    ['day', 'days'],
  ),
  ...entries(
    'Problem 1011 ships packages within a number of days.',
    'exercise:binary-search-sorting/binary-search-on-the-answer/ex-03',
    ['day', 'days'],
  ),
  ...entries('Problem 1011 ships packages within a number of days.', 'bank:1011', [
    'Within D Days',
    'count days greedily',
  ]),
  ...entries(
    'Problem 1482 asks for the day enough flowers have bloomed.',
    'exercise:binary-search-sorting/binary-search-on-the-answer/ex-04',
    ['day', 'days', 'Days'],
  ),
  ...entries(
    'Problem 739 counts days until a warmer temperature.',
    'lesson:linked-lists-stacks-queues/monotonic-stack-and-deque',
    ['how many days until it'],
  ),
  ...entries('Problem 739 counts days until a warmer temperature.', 'pattern:monotonic-stack', [
    'days until warmer',
  ]),
  ...entries('Problem 739 counts days until a warmer temperature.', 'bank:739#title', ['Daily Temperatures']),
  ...entries(
    'The worked example in 7.5 is problem 739.',
    'handbook:method-and-recognition/the-method-in-action',
    ['day', 'days', 'Daily Temperatures'],
  ),
  ...entries(
    'Drill item 9 is a statement about prices across days.',
    'handbook:method-and-recognition/classification-drill',
    ['Each day', 'how many days'],
  ),
  ...entries(
    'Drill item 9 is a statement about prices across days.',
    'exercise:foundations/problem-solving-method/ex-09',
    ['Each day', 'how many days'],
  ),
  ...entries(
    'Drill item 9 is a statement about prices across days.',
    'exercise:binary-search-sorting/checkpoint/ex-09',
    ['Each day', 'how many days'],
  ),
  ...entries(
    'The stock span statement compares prices across days. This exercise is gated.',
    'exercise:linked-lists-stacks-queues/checkpoint/ex-02',
    ['day', 'days', 'today'],
  ),
  ...entries(
    'Problem 983 buys travel passes for days of the year.',
    'exercise:dynamic-programming-1/unbounded-knapsack/ex-06',
    ['calendar day', 'day', 'days'],
  ),
  ...entries(
    'Problem 309 is a state machine over days.',
    'theory:dynamic-programming-2-bits/state-machine-dp',
    ['per day'],
  ),
  ...entries('Problem 309 is a state machine over days.', 'pattern:state-machine-dp', ['day']),
  ...entries('Problem 309 is a state machine over days.', 'bank:309#hint', ["previous day's values"]),
  ...entries(
    'Problem 309 is a state machine over days.',
    'lesson:dynamic-programming-2-bits/state-machines-recognising-dp',
    ["previous day's values", "yesterday's values"],
  ),
  ...entries(
    'Problem 309 is a state machine over days.',
    'exercise:dynamic-programming-2-bits/state-machines-recognising-dp/ex-01',
    ['day'],
  ),
  ...entries(
    'Problem 309 is a state machine over days.',
    'exercise:dynamic-programming-2-bits/state-machines-recognising-dp/ex-02',
    ["today's rest", 'made yesterday', 'changed today', "yesterday's sold"],
  ),

  // ---- Intervals of the review rules
  ...entries(SPACING, 'handbook:how-this-course-works/the-strategy-in-five-rules', ['+14 days']),
  ...entries(SPACING, 'handbook:how-lessons-work', ['+14 days', 'in 2 days']),
  ...entries(SPACING, 'handbook:revision-and-mistakes', [
    '+1 day',
    '+2 days',
    '+3 days',
    '+7 days',
    '+14 days',
    '+30 days',
    '7 days apart',
    'a week apart',
    'in 2 days',
    'to 1 day',
  ]),
  ...entries(SPACING, 'handbook:assessments-and-mocks/mock-scoring-rubric', ['two days later']),
  ...entries(SPACING, 'lesson:heaps-intervals-tries/checkpoint', ['in two days']),

  // ---- After the course
  ...entries(AFTER_COURSE, 'handbook:after-the-course', [
    'hours a week',
    'hours/week',
    '3–4 weeks',
    'hours a day',
    '5 days a week',
    'mocks a week',
    'weekly contest',
    're-solves a week',
    'Every four weeks',
    'every two weeks',
  ]),
  ...entries(AFTER_COURSE, 'handbook:progress-and-milestones/if-you-miss-a-milestone', ['4–6 more weeks']),
  ...entries(AFTER_COURSE, 'handbook:readiness-checklist/verdict', [
    '3–4 more weeks',
    '6–8 more weeks',
    'mocks per week',
  ]),

  // ---- Other wording that is not about a schedule
  ...entries('Names the contest that the problem data was checked against.', 'handbook:problem-bank', [
    'Weekly Contest 525',
  ]),
  ...entries(
    'Everyday work experience, not a schedule.',
    'handbook:starting-point-assessment/what-an-experienced',
    ['maps daily'],
  ),
];

const CLUE = 'Clue words for the pattern, not the problem statement. Kept by decision (plan question 5b).';
const COMMON_WORD = 'The shape, not problem 120 "Triangle".';
const NUMBER = 'A value in an example, not a reserved problem number.';

export const ALLOWLIST_RESERVED: AllowlistEntry[] = [
  ...entries(CLUE, 'pattern:prefix-sums', ['divisible by k']),
  ...entries(CLUE, 'handbook:method-and-recognition/pattern-recognition-table', ['divisible by k']),
  ...entries(CLUE, 'lesson:two-pointers-windows-prefix-sums/prefix-sums-difference-arrays#why', [
    'divisible by k',
  ]),
  ...entries(CLUE, 'pattern:monotonic-stack', ['stock span']),
  ...entries(CLUE, 'theory:binary-trees-bst/the-three-question-types', [
    'difference between node and ancestor',
  ]),
  ...entries(COMMON_WORD, 'lesson:two-pointers-windows-prefix-sums/opposite-end-two-pointers', ['triangle']),
  ...entries(COMMON_WORD, 'lesson:graphs-traversal/bipartite-graphs-reverse-search', ['triangle']),
  ...entries(COMMON_WORD, 'exercise:graphs-traversal/bipartite-graphs-reverse-search', [
    'triangle',
    'Triangle',
  ]),
  ...entries(NUMBER, 'theory:graphs-weighted-greedy/greedy-ideas-that-fail', ['120']),
  ...entries(NUMBER, 'lesson:dynamic-programming-1/string-partition-dp#revision', ['2101']),
  ...entries(NUMBER, 'exercise:dynamic-programming-1/string-partition-dp/ex-01', ['2101']),
  ...entries(NUMBER, 'exercise:recursion-backtracking/combination-sum-letter-combinations/ex-04', ['909']),
  ...entries(
    'The contest number the problem data was checked against, not problem 525.',
    'handbook:problem-bank',
    ['Weekly Contest 525'],
  ),
];
