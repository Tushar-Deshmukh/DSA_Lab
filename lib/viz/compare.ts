// Compare mode (plan 7.4): two approaches on the same input, side by side, with their step counts. Every pair here
// is built from material the course already has: two visualizers that take the same input, or one visualizer's
// switch between a naive and a better method. tests/viz/compare.test.ts checks that both sides give the same answer.

export interface CompareSide {
  viz: string;
  label: string;
  /** Input values that pick this side's method, such as `{ memo: 'yes' }`. */
  fixed?: Record<string, unknown>;
}

export interface ComparePair {
  id: string;
  title: string;
  left: CompareSide;
  right: CompareSide;
  /**
   * How the two answers relate: equal, the same items in any order, or `any-valid` when the problem has several right
   * answers and the two methods may find different ones (each is checked against the reference in the tests).
   */
  answers: 'equal' | 'same-items' | 'any-valid';
}

export const COMPARE_PAIRS: ComparePair[] = [
  {
    id: 'pairs-vs-two-pointers',
    title: 'Every pair against two pointers',
    left: { viz: 'pair-brute', label: 'Brute force: every pair' },
    right: { viz: 'two-sum-sorted', label: 'Two pointers' },
    answers: 'any-valid',
  },
  {
    id: 'anagram-keys',
    title: 'Sorted letters against letter counts as the key',
    left: { viz: 'group-anagrams', label: 'Sorted letters', fixed: { keyType: 'sorted' } },
    right: { viz: 'group-anagrams', label: 'Letter counts', fixed: { keyType: 'counts' } },
    answers: 'equal',
  },
  {
    id: 'quicksort-pivots',
    title: 'First element against a random pivot',
    left: { viz: 'quicksort3', label: 'Pivot a[lo]', fixed: { pivotRule: 'first' } },
    right: { viz: 'quicksort3', label: 'Random pivot', fixed: { pivotRule: 'random' } },
    answers: 'equal',
  },
  {
    id: 'reverse-list',
    title: 'Reversing a list in a loop and by recursion',
    left: { viz: 'll-reverse', label: 'Iterative' },
    right: { viz: 'll-reverse-rec', label: 'Recursive' },
    answers: 'equal',
  },
  {
    id: 'fib-memo',
    title: 'Plain recursion against a cache',
    left: { viz: 'rec-fib', label: 'Plain recursion', fixed: { memo: 'no' } },
    right: { viz: 'rec-fib', label: 'With a cache', fixed: { memo: 'yes' } },
    answers: 'equal',
  },
  {
    id: 'subsets-two-ways',
    title: 'Subsets: take or skip, against choose the next element',
    left: { viz: 'bt-subsets-a', label: 'Take or skip' },
    right: { viz: 'bt-subsets-b', label: 'Choose the next' },
    answers: 'same-items',
  },
  {
    id: 'combinations-pruning',
    title: 'Combinations with and without pruning',
    left: { viz: 'bt-combine', label: 'No pruning', fixed: { prune: 'no' } },
    right: { viz: 'bt-combine', label: 'With pruning', fixed: { prune: 'yes' } },
    answers: 'equal',
  },
  {
    id: 'components-bfs-dfs',
    title: 'Counting components with BFS and with DFS',
    left: { viz: 'graph-bfs', label: 'BFS' },
    right: { viz: 'graph-dfs', label: 'DFS' },
    answers: 'equal',
  },
  {
    id: 'lis-methods',
    title: 'Longest increasing subsequence: the O(n²) table against tails',
    left: { viz: 'lis', label: 'O(n²) table', fixed: { method: 'dp' } },
    right: { viz: 'lis', label: 'Tails and binary search', fixed: { method: 'tails' } },
    answers: 'equal',
  },
];

export const pairsFor = (id: string): ComparePair[] =>
  COMPARE_PAIRS.filter((p) => p.left.viz === id || p.right.viz === id);

/** One side's input: the shared values with this side's method on top. */
export const sideInput = (side: CompareSide, shared: Record<string, unknown>): Record<string, unknown> => ({
  ...shared,
  ...side.fixed,
});

/** The final answer of a run: the last step that carries one. */
export function finalAnswer(steps: readonly { result?: unknown }[]): unknown {
  for (let i = steps.length - 1; i >= 0; i--) if (steps[i]?.result !== undefined) return steps[i]?.result;
  return undefined;
}

const canonical = (v: unknown): string => JSON.stringify(v);

/** Whether both sides found the same answer; null when the pair's answers may rightly differ. */
export function sameAnswer(pair: ComparePair, a: unknown, b: unknown): boolean | null {
  if (pair.answers === 'any-valid') return null;
  if (pair.answers === 'equal') return canonical(a) === canonical(b);
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  return canonical(a.map(canonical).sort()) === canonical(b.map(canonical).sort());
}
