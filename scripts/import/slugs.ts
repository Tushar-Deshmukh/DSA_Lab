// Stable slugs for everything the importer writes (D-010). Module and lesson slugs are written out by hand for
// readability; the rest are derived from titles and then frozen in content/ids.lock.json.

export interface ModuleSlug {
  number: number;
  slug: string;
  title: string;
  lessons: string[];
  /** Prerequisite modules, from roadmap §2 "Dependency chain" and the depmap visualizer. */
  prerequisites: number[];
}

export const MODULES: ModuleSlug[] = [
  {
    number: 0,
    slug: 'foundations',
    title: 'Foundations',
    prerequisites: [],
    lessons: ['placement-check', 'javascript-for-dsa', 'problem-solving-method'],
  },
  {
    number: 1,
    slug: 'complexity-arrays-hashing',
    title: 'Complexity, arrays and hashing',
    prerequisites: [0],
    lessons: [
      'complexity-first-hash-map',
      'arrays-in-place-read-write-pointers',
      'hash-tables-map-set-grouping',
      'frequency-counting-buckets-majority',
      'matrices-boundaries-rotation',
    ],
  },
  {
    number: 2,
    slug: 'two-pointers-windows-prefix-sums',
    title: 'Two pointers, sliding window, prefix sums, strings',
    prerequisites: [1],
    lessons: [
      'opposite-end-two-pointers',
      'partitioning-and-kadane',
      'sliding-window',
      'windows-with-counts-minimum-windows',
      'prefix-sums-difference-arrays',
    ],
  },
  {
    number: 3,
    slug: 'binary-search-sorting',
    title: 'Binary search and sorting',
    prerequisites: [1],
    lessons: [
      'binary-search-first-true',
      'predicates-rotated-arrays',
      'binary-search-on-the-answer',
      'flattened-matrices-peak-finding',
      'sorting-merge-quick-comparators',
    ],
  },
  {
    number: 4,
    slug: 'linked-lists-stacks-queues',
    title: 'Linked lists, stacks, queues and monotonic stacks',
    prerequisites: [1],
    lessons: [
      'linked-lists-dummy-nodes-reversal',
      'fast-and-slow-pointers',
      'composing-list-techniques-lru-cache',
      'stacks-queues-deques',
      'monotonic-stack-and-deque',
    ],
  },
  {
    number: 5,
    slug: 'recursion-backtracking',
    title: 'Recursion and backtracking',
    prerequisites: [4],
    lessons: [
      'recursion-contracts-call-stacks-trees',
      'backtracking-and-subsets',
      'permutations-combinations-pruning',
      'combination-sum-letter-combinations',
      'grid-and-string-backtracking',
    ],
  },
  {
    number: 6,
    slug: 'binary-trees-bst',
    title: 'Binary trees and binary search trees',
    prerequisites: [4, 5],
    lessons: [
      'tree-vocabulary-traversals-question-types',
      'level-order-bfs',
      'bottom-up-height-diameter-balance',
      'top-down-lowest-common-ancestor',
      'binary-search-trees-construction',
    ],
  },
  {
    number: 7,
    slug: 'heaps-intervals-tries',
    title: 'Heaps, intervals and tries',
    prerequisites: [3, 6],
    lessons: [
      'the-binary-heap',
      'top-k-and-k-way-merge',
      'two-heaps-heap-simulation',
      'intervals-merge-insert-select-sweep',
      'tries',
    ],
  },
  {
    number: 8,
    slug: 'graphs-traversal',
    title: 'Graphs I: traversal, components, BFS shortest paths, topological sort',
    prerequisites: [4, 6],
    lessons: [
      'graph-representations-traversal',
      'components-matrix-input-cloning',
      'bfs-shortest-paths-multi-source',
      'topological-sort-directed-cycles',
      'bipartite-graphs-reverse-search',
    ],
  },
  {
    number: 9,
    slug: 'graphs-weighted-greedy',
    title: 'Graphs II (Dijkstra, Union-Find, MST) and greedy algorithms',
    prerequisites: [3, 7, 8],
    lessons: [
      'dijkstras-algorithm',
      'union-find',
      'minimum-spanning-trees',
      'greedy-algorithms-counterexamples',
      'greedy-running-quantity',
    ],
  },
  {
    number: 10,
    slug: 'dynamic-programming-1',
    title: 'Dynamic programming I',
    prerequisites: [5, 9],
    lessons: [
      'what-dp-is-four-steps',
      'take-or-skip',
      'unbounded-knapsack',
      'grid-dp',
      'string-partition-dp',
    ],
  },
  {
    number: 11,
    slug: 'dynamic-programming-2-bits',
    title: 'Dynamic programming II and bit manipulation',
    prerequisites: [10],
    lessons: [
      'knapsack-and-subset-sum',
      'two-sequence-dp',
      'lis-and-palindromes',
      'state-machines-recognising-dp',
      'bit-manipulation',
    ],
  },
  {
    number: 12,
    slug: 'interview-readiness',
    title: 'Mixed practice and interview readiness',
    prerequisites: [11],
    lessons: [
      'interview-end-to-end',
      'repairing-weak-patterns-getting-unstuck',
      'mock-5-explaining-trade-offs',
      'one-hard-problem-complexity-drill',
      'mock-6-90-second-explanation',
    ],
  },
];

export const moduleDir = (m: ModuleSlug): string => `${String(m.number).padStart(2, '0')}-${m.slug}`;
export const lessonFile = (index: number, slug: string): string =>
  `${String(index + 1).padStart(2, '0')}-${slug}`;

/** The roadmap sections that become handbook sections, with their new titles and slugs. */
export const HANDBOOK_SECTIONS: Record<number, { slug: string; title: string }> = {
  0: { slug: 'how-this-course-works', title: 'How this course works' },
  1: { slug: 'starting-point-assessment', title: 'Starting-point assessment' },
  2: { slug: 'course-overview', title: 'Course overview' },
  3: { slug: 'module-theory', title: 'Module theory and learning objectives' },
  4: { slug: 'how-lessons-work', title: 'How lessons work' },
  5: { slug: 'problem-bank', title: 'Curated LeetCode problem bank' },
  6: { slug: 'javascript-reference', title: 'JavaScript DSA reference and code templates' },
  7: { slug: 'method-and-recognition', title: 'Problem-solving method and pattern recognition guide' },
  8: { slug: 'revision-and-mistakes', title: 'Revision and mistake-tracking system' },
  9: { slug: 'assessments-and-mocks', title: 'Assessments and mock interviews' },
  10: { slug: 'progress-and-milestones', title: 'Progress scorecards and milestones' },
  11: { slug: 'readiness-checklist', title: 'Final interview-readiness checklist' },
  12: { slug: 'after-the-course', title: 'Practice strategy after the course' },
};

export function slugify(text: string): string {
  return text
    .replace(/`/g, '')
    .replace(/['’"“”]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "Fast and slow pointers (Floyd)" and "Longest increasing subsequence (300)" lose their asides. */
const withoutAside = (text: string): string => text.replace(/\s*\([^)]*\)\s*$/, '').trim();

const FRAGMENT_SLUGS: Record<string, string> = {
  'Common mistakes this week': 'common-mistakes',
  'Common mistakes': 'common-mistakes',
  'The four-step progression used all week': 'four-step-progression',
  'C. Practice structure for the week': 'practice-structure',
  'D. Realistic outcome after 12 weeks': 'realistic-outcome',
  'Two interval conventions. Pick one and keep it': 'two-interval-conventions',
  'Dummy (sentinel) node': 'dummy-node',
  'Breadth-first (level-order) traversal': 'breadth-first-traversal',
  'Tries (prefix trees)': 'tries',
  'Binary search as "find the boundary"': 'binary-search-as-find-the-boundary',
  'Recursive thinking: the contract': 'recursive-thinking-the-contract',
};

export function fragmentSlug(key: string): string {
  return FRAGMENT_SLUGS[key] ?? slugify(withoutAside(key));
}

export function patternSlug(title: string): string {
  return slugify(withoutAside(title.replace(/^Pattern \d+\.\d+:\s*/, '')));
}

/** Handbook subsection: "6.1 Cost model of built-ins" keeps its number in the title, not in the slug. */
export function subsectionSlug(title: string): string {
  return slugify(withoutAside(title.replace(/^\d+\.\d+\s+/, '')));
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  taken.add(slug);
  return slug;
}

export const checkpointSlug = (kind: 'assessment' | 'mock', n: number | string): string => `${kind}-${n}`;
