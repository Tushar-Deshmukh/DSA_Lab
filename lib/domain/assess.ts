import './zod';
import * as z from 'zod/mini';
import { MISTAKE_CODES, type MistakeCode } from './journal';

// Checkpoints, mocks, placement and readiness (plan §9.5, ported from the legacy rules). Scoring is kept
// as evidence; totals, pass marks and verdicts are derived here, never stored, so a rule fix updates every
// learner's page without moving data.
//
// No dates in the UI: a checkpoint's timer counts down from Start; the result records only `startedAt` and
// `finishedAt` times the learner produced themselves.

// ---- the checkpoint rubric (legacy §9.5: 10 points per problem)

export const RUBRIC = [
  { key: 'correct', label: 'Correct, accepted solution', max: 4 },
  { key: 'complexity', label: 'Optimal or acceptable complexity', max: 2 },
  { key: 'stated', label: 'Complexity stated correctly', max: 1 },
  { key: 'edges', label: 'Edge cases', max: 2 },
  { key: 'brute', label: 'Brute force articulated', max: 1 },
] as const;
export type RubricKey = (typeof RUBRIC)[number]['key'];

export type RubricScores = Partial<Record<RubricKey, number>>;

export const checkpointProblemMax = 10;

const MistakeCodeSchema = z.enum(MISTAKE_CODES);

export interface CheckpointProblem {
  /** The row's own key in the paper, e.g. `cold` or `0`, `1`, … */
  key: string;
  /** True for the unseen problems named in the assessment (they gate the pass). */
  unseen: boolean;
  /** Which reserved problem(s) this row points at, as bank numbers. */
  nums: string[];
  scores: RubricScores;
  mistakeCodes: MistakeCode[];
}

export interface CheckpointResult {
  at: number;
  slug: string;
  startedAt?: number;
  finishedAt?: number;
  problems: CheckpointProblem[];
  notes?: string;
}

export function problemScore(scores: RubricScores): number {
  return RUBRIC.reduce((sum, row) => sum + (scores[row.key] ?? 0), 0);
}

export function checkpointTotal(problems: CheckpointProblem[]): number {
  return problems.reduce((sum, p) => sum + problemScore(p.scores), 0);
}

export const checkpointMax = (problems: CheckpointProblem[]): number =>
  problems.length * checkpointProblemMax;

/** A pass needs at least 70% of the points and one unseen problem fully accepted (correct = 4 of 4). */
export function checkpointPass(problems: CheckpointProblem[]): boolean {
  if (problems.length === 0) return false;
  const max = checkpointMax(problems);
  const passMark = Math.ceil(max * 0.7);
  const unseenFull = problems.some((p) => p.unseen && (p.scores.correct ?? 0) >= 4);
  return checkpointTotal(problems) >= passMark && unseenFull;
}

export const CHECKPOINT_PASS_LABEL = (problems: CheckpointProblem[]): string =>
  `Pass = at least ${Math.ceil(checkpointMax(problems) * 0.7)} points and one unseen problem fully accepted`;

// ---- mocks (five dimensions scored 1–4)

export const MOCK_DIMENSIONS = [
  { key: 'understanding', label: 'Problem understanding' },
  { key: 'approach', label: 'Approach and optimisation' },
  { key: 'coding', label: 'Coding' },
  { key: 'verification', label: 'Verification' },
  { key: 'communication', label: 'Communication' },
] as const;
export const MOCK_SCALE = [1, 2, 3, 4] as const;

export interface MockResult {
  at: number;
  slug: string;
  startedAt?: number;
  finishedAt?: number;
  /** One score per dimension, 0 = not scored yet, 1–4 = the rubric value. */
  scores: number[];
  feedback?: string;
}

export const mockTotal = (scores: readonly number[]): number =>
  scores.reduce((sum, s) => sum + (s > 0 ? s : 0), 0);

/** Pass = 14/20 with no dimension at 1. The legacy target advice (15/20) is shown in Module 12. */
export function mockPass(scores: readonly number[]): boolean {
  const scored = scores.length === MOCK_DIMENSIONS.length;
  return scored && mockTotal(scores) >= 14 && scores.every((s) => s > 1);
}

// ---- placement (legacy rules, plan §9.5)

export type PlacementProfile = 'foundations' | 'standard' | 'accelerated';

/** First matching rule wins: A ≤ 5 or B ≤ 1 → Foundations; A ≥ 10 and B ≥ 4 → Accelerated; otherwise Standard. */
export function placementResult(scoreA: number, scoreB: number): { profile: PlacementProfile; rule: string } {
  if (scoreA <= 5 || scoreB <= 1) {
    return { profile: 'foundations', rule: 'Rule 1 matched: A ≤ 5 or B ≤ 1' };
  }
  if (scoreA >= 10 && scoreB >= 4) {
    return { profile: 'accelerated', rule: 'Rule 2 matched: A ≥ 10 and B ≥ 4' };
  }
  return { profile: 'standard', rule: 'Rule 3: neither rule 1 nor rule 2 matched' };
}

// ---- readiness (brief 5.10; verdict rows in order, first match wins)

export interface ReadinessDoc {
  at: number;
  /** Ticked items: id → the time of the tick. */
  items: Record<string, number>;
  /** The evidence rows, which must all be ticked for the top verdict. */
  evidence: string[];
}

export type ReadinessVerdict = 'ready' | 'nearly' | 'not-yet';

const READY_TOTAL = 23;
const NEAR_TOTAL = 18;

/**
 * Ready for most product-company coding rounds: at least 23 of 26 with all evidence rows demonstrated.
 * Nearly ready: at least 18 of 26 with at least two. Otherwise: not yet.
 */
export function readinessOutcome(
  doc: ReadinessDoc,
  totalItems: number,
): {
  verdict: ReadinessVerdict;
  checked: number;
  evidenceChecked: number;
  evidenceTotal: number;
} {
  const checked = Object.keys(doc.items).length;
  const evidenceChecked = doc.evidence.filter((id) => doc.items[id]).length;
  const evidenceTotal = doc.evidence.length;
  if (evidenceChecked === evidenceTotal && checked >= READY_TOTAL) {
    return { verdict: 'ready', checked, evidenceChecked, evidenceTotal };
  }
  if (evidenceChecked >= Math.min(2, evidenceTotal) && checked >= Math.min(NEAR_TOTAL, totalItems)) {
    return { verdict: 'nearly', checked, evidenceChecked, evidenceTotal };
  }
  return { verdict: 'not-yet', checked, evidenceChecked, evidenceTotal };
}

export const READINESS_VERDICT_LABEL: Record<ReadinessVerdict, string> = {
  ready: 'Ready for most product-company coding rounds',
  nearly: 'Nearly ready',
  'not-yet': 'Not yet',
};

// ---- schemas for the snapshot shape

export const CheckpointResultSchema = z.object({
  at: z.int().check(z.nonnegative()),
  slug: z.string().check(z.minLength(1), z.maxLength(120)),
  startedAt: z.optional(z.int().check(z.positive())),
  finishedAt: z.optional(z.int().check(z.positive())),
  problems: z.array(
    z.object({
      key: z.string().check(z.minLength(1), z.maxLength(24)),
      unseen: z.boolean(),
      nums: z.array(z.string().check(z.minLength(1), z.maxLength(16))).check(z.maxLength(6)),
      scores: z.record(z.string(), z.int().check(z.minimum(0), z.maximum(4))),
      mistakeCodes: z.array(MistakeCodeSchema),
    }),
  ),
  notes: z.optional(z.string().check(z.maxLength(8000))),
});

export const MockResultSchema = z.object({
  at: z.int().check(z.nonnegative()),
  slug: z.string().check(z.minLength(1), z.maxLength(120)),
  startedAt: z.optional(z.int().check(z.positive())),
  finishedAt: z.optional(z.int().check(z.positive())),
  scores: z.array(z.int().check(z.minimum(0), z.maximum(4))).check(z.maxLength(MOCK_DIMENSIONS.length)),
  feedback: z.optional(z.string().check(z.maxLength(8000))),
});

export const ReadinessDocSchema = z.object({
  at: z.int().check(z.nonnegative()),
  items: z.record(z.string(), z.int().check(z.positive())),
  evidence: z.array(z.string().check(z.minLength(1), z.maxLength(80))).check(z.maxLength(10)),
});
