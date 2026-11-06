import { describe, expect, it } from 'vitest';
import {
  MOCK_DIMENSIONS,
  mockPass,
  mockTotal,
  placementResult,
  problemScore,
  checkpointPass,
  checkpointTotal,
  checkpointMax,
  readinessOutcome,
  CHECKPOINT_PASS_LABEL,
  type CheckpointProblem,
  type ReadinessDoc,
} from '@/lib/domain/assess';

const MAX_SCORES = { correct: 4, complexity: 2, stated: 1, edges: 2, brute: 1 };

const solved = (key: string, unseen: boolean, nums: string[] = ['21']): CheckpointProblem => ({
  key,
  unseen,
  nums,
  scores: { ...MAX_SCORES },
  mistakeCodes: [],
});

describe('checkpoint scoring (the legacy rubric)', () => {
  it('sums the five rows and the max per problem is 10', () => {
    expect(problemScore(MAX_SCORES)).toBe(10);
    expect(problemScore({ correct: 4 })).toBe(4);
    expect(problemScore({})).toBe(0);
    const rows = [solved('cold', false), solved('0', true), solved('1', true)];
    expect(checkpointMax(rows)).toBe(30);
    expect(checkpointTotal(rows)).toBe(30);
  });

  it('pass needs 70% of the points and one unseen problem fully accepted', () => {
    const rows = [solved('cold', false), solved('0', true), solved('1', true)];
    // 70% of 30 = 21 → the legacy A1–A5 mark of 21/30 emerges from the same rule.
    const sixPoint = { correct: 3, complexity: 2, stated: 1, edges: 0, brute: 0 };
    const at21 = rows.map((r, i) => (i === 2 ? { ...r, scores: sixPoint } : r));
    expect(checkpointTotal(at21)).toBe(26);
    expect(checkpointPass(at21)).toBe(true);
    // 19/30: below ceil(21) → no pass.
    const at19 = rows.map(() => ({ ...rows[0], scores: sixPoint }) as CheckpointProblem);
    expect(checkpointTotal(at19)).toBe(18);
    expect(checkpointPass(at19)).toBe(false);
    // Above the mark but no unseen row accepted correctly → no pass.
    const noUnseen = rows.map((r) => ({
      ...r,
      unseen: false,
      scores: { correct: 4, complexity: 2, stated: 1, edges: 2, brute: 0 },
    }));
    expect(checkpointTotal(noUnseen)).toBe(27);
    expect(checkpointPass(noUnseen)).toBe(false);
    expect(CHECKPOINT_PASS_LABEL(rows)).toContain('21');
    expect(checkpointPass([])).toBe(false);
  });
});

describe('mock scoring', () => {
  it('totals only positive scores and passes at 14/20 with nothing at 1', () => {
    expect(mockTotal([4, 3, 3, 4, 0])).toBe(14);
    expect(mockPass([4, 3, 3, 4, 0])).toBe(false); // one dimension missing/unset
    expect(mockPass([2, 3, 3, 3, 3])).toBe(true);
    expect(mockPass([3, 3, 2, 3, 3])).toBe(true);
    expect(mockPass([1, 3, 3, 3, 3])).toBe(false); // one dimension at 1
    expect(mockPass([3, 3, 2, 2, 3])).toBe(false); // 13/20: below the mark
    expect(MOCK_DIMENSIONS).toHaveLength(5);
  });
});

describe('placement rules (the legacy assessment)', () => {
  it('applies the three rules in order', () => {
    expect(placementResult(5, 5).profile).toBe('foundations'); // rule 1: A ≤ 5
    expect(placementResult(9, 1).profile).toBe('foundations'); // rule 1: B ≤ 1
    expect(placementResult(8, 3).profile).toBe('standard'); // A too low for rule 2, B high enough for neither
    expect(placementResult(10, 4).profile).toBe('accelerated'); // rule 2
    expect(placementResult(12, 5).profile).toBe('accelerated');
    expect(placementResult(9, 4).profile).toBe('standard'); // A too low
    expect(placementResult(10, 3).profile).toBe('standard'); // B too low
    // Rule 1 wins over rule 2 when both match.
    const both = placementResult(5, 1);
    expect(both.profile).toBe('foundations');
    expect(both.rule).toContain('Rule 1');
  });
});

describe('readiness verdicts', () => {
  const doc = (items: string[], evidence: string[]): ReadinessDoc => ({
    at: 1,
    items: Object.fromEntries(items.map((id) => [id, 1])),
    evidence,
  });

  it('ready needs the top threshold AND every evidence row', () => {
    const evidence = ['e1', 'e2', 'e3'];
    const ids = Array.from({ length: 23 }, (_, i) => `i${i}`);
    // The evidence rows need ticking themselves: 23 checked with evidence unticked is neither verdict.
    expect(readinessOutcome(doc(ids, evidence), 26).verdict).toBe('not-yet');
    expect(readinessOutcome(doc([...ids, ...evidence], evidence), 26).verdict).toBe('ready');
  });

  it('nearly needs 18+ with at least two evidence rows', () => {
    const nearly = Array.from({ length: 18 }, (_, i) => `i${i}`);
    expect(readinessOutcome(doc([...nearly, 'e1', 'e2'], ['e1', 'e2']), 26).verdict).toBe('nearly');
    expect(readinessOutcome(doc(nearly.slice(0, 17), ['e1', 'e2']), 26).verdict).toBe('not-yet');
    // The evidence floor adapts to the checklist itself: a one-evidence checklist passes with that one ticked.
    expect(readinessOutcome(doc([...nearly, 'e1'], ['e1']), 26).verdict).toBe('nearly');
    // Unticked evidence rows keep the verdict at not-yet, and evidence alone never carries it.
    expect(readinessOutcome(doc(nearly, ['e1', 'e2']), 26).verdict).toBe('not-yet');
    expect(readinessOutcome(doc([], ['e1']), 26).verdict).toBe('not-yet');
  });
});
