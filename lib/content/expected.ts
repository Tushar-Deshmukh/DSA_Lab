// Counts from docs/inventory.md, typed by hand on purpose. If the content drifts from these numbers, content:check fails
// until the change is explained here.

export const EXPECTED_COUNTS = {
  modules: 13,
  /** 60 study lessons + 3 Foundations lessons built from the legacy extra pages (plan 5.5). */
  lessons: 63,
  checkpoints: 12,
  theoryFragments: 150,
  patterns: 47,
  objectives: 12,
  exercises: 421,
  exercisesByType: {
    mcq: 74,
    pattern: 69,
    interview: 57,
    trace: 50,
    code: 48,
    complexity: 42,
    bug: 34,
    fill: 27,
    predict: 20,
  },
  exercisesByModule: {
    foundations: 29,
    'complexity-arrays-hashing': 48,
    'two-pointers-windows-prefix-sums': 41,
    'binary-search-sorting': 45,
    'linked-lists-stacks-queues': 33,
    'recursion-backtracking': 29,
    'binary-trees-bst': 27,
    'heaps-intervals-tries': 25,
    'graphs-traversal': 24,
    'graphs-weighted-greedy': 35,
    'dynamic-programming-1': 31,
    'dynamic-programming-2-bits': 31,
    'interview-readiness': 23,
  },
  /** 278 legacy `##` sections, plus the units Foundations assembles: 2 + 4 + 3 reference units and 3 practice units. */
  units: 290,
  fragmentIncludes: 197,
  /** The 14 pulled in lessons, plus the 9 that Foundations includes. */
  subsectionIncludes: 23,
  /** Counting the dependency map, which moved from its own page to track.yaml. */
  vizEmbeds: 132,
  vizUnique: 129,
  bank: 173,
  bankByTier: { C: 114, S: 39, O: 20 },
  bankByModule: {
    'complexity-arrays-hashing': 14,
    'two-pointers-windows-prefix-sums': 17,
    'binary-search-sorting': 14,
    'linked-lists-stacks-queues': 17,
    'recursion-backtracking': 15,
    'binary-trees-bst': 19,
    'heaps-intervals-tries': 15,
    'graphs-traversal': 16,
    'graphs-weighted-greedy': 12,
    'dynamic-programming-1': 14,
    'dynamic-programming-2-bits': 14,
    'interview-readiness': 6,
  },
  extensionProblems: 6,
  assessments: 6,
  mocks: 6,
  reservedProblems: 31,
  /** 13 assessment problems + 18 mock pool problems. */
  reservedAssessmentProblems: 13,
  reservedMockProblems: 18,
  /** Roadmap sections 0–12 each have a lead page. Section 9.5 and the section 3, 4 and 5 subsections are not pages. */
  handbookSections: 13,
  /** 4 + 5 + 6 + 19 + 5 + 5 + 4 (9.1–9.4) + 4 + 6 + 4 subsections, plus 13 lead pages. */
  handbookPages: 75,
  /** Saturday-page exercises in "after" units, plus drill item 6 in both copies of the classification drill. */
  gatedExercises: 29,
  gatedTexts: 3,
  /** Exact numbers from docs/inventory.md section 7, used to catch a lost field. */
  runnableTests: 655,
  hiddenTests: 233,
  traceRows: 186,
  fillAlternatives: 147,
};
