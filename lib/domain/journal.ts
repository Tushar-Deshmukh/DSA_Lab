import './zod';
import * as z from 'zod/mini';

// One problem's journal (plan §10 problem_journal). The scheduling rules are the legacy ones (roadmap §8,
// restated in plan §9.1), plus the fix for legacy defect 1: a problem is mastered after three clean
// re-solves, each at least 7 days after the previous counted one, chosen greedily from actual dates (D-016).
//
// Statuses (the legacy five): not-started, attempted, with-hints, independent, needs-revision.
// A peeked hint or a viewed editorial means "with hints"; never independent.

export const JOURNAL_STATUSES = [
  'not-started',
  'attempted',
  'with-hints',
  'independent',
  'needs-revision',
] as const;
export type JournalStatus = (typeof JOURNAL_STATUSES)[number];

export const MISTAKE_CODES = ['P', 'A', 'D', 'L', 'E', 'C', 'R'] as const;
export type MistakeCode = (typeof MISTAKE_CODES)[number];

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TEXT = 8000;

export interface JournalAttempt {
  at: number;
  /** Minutes taken; absent when the learner did not time it (planned time box is then the estimate). */
  minutes?: number;
  outcome: 'failed' | 'solved' | 'clean';
  hintRung?: number;
  mistake?: MistakeCode;
  approach?: string;
  complexity?: string;
  insight?: string;
  notes?: string;
}

const AttemptSchema = z.object({
  at: z.int().check(z.positive()),
  minutes: z.optional(z.int().check(z.nonnegative())),
  outcome: z.enum(['failed', 'solved', 'clean']),
  hintRung: z.optional(z.int().check(z.minimum(0), z.maximum(4))),
  mistake: z.optional(z.enum(MISTAKE_CODES)),
  approach: z.optional(z.string().check(z.maxLength(2000))),
  complexity: z.optional(z.string().check(z.maxLength(200))),
  insight: z.optional(z.string().check(z.maxLength(2000))),
  notes: z.optional(z.string().check(z.maxLength(4000))),
});

export interface ProblemRecord {
  at: number;
  status: JournalStatus;
  attempts: JournalAttempt[];
  /** The eight legacy note fields (plan §9 journal notes; see NOTE_FIELDS). */
  notes: Record<string, string>;
  cleanResolves: number;
  /** Dates of clean re-solves: the evidence for `mastered`. */
  resolvedAts: number[];
  nextResolveAt?: number;
  mastered?: boolean;
}

const ProblemRecordSchema = z.object({
  at: z.int().check(z.nonnegative()),
  status: z.enum(JOURNAL_STATUSES),
  attempts: z.array(AttemptSchema),
  notes: z.record(z.string(), z.string()),
  cleanResolves: z.int().check(z.nonnegative()),
  resolvedAts: z.array(z.int().check(z.positive())),
  nextResolveAt: z.optional(z.int().check(z.positive())),
  mastered: z.optional(z.boolean()),
});

export const ProblemDocsSchema = z.record(z.string(), ProblemRecordSchema);
export type ProblemDocs = Record<string, ProblemRecord>;

export const NOTE_FIELDS = [
  'intuition',
  'brute',
  'optimized',
  'observation',
  'complexity',
  'edges',
  'mistakes',
  'learned',
] as const;

export function validateProblemRecord(record: unknown): ProblemRecord | null {
  const result = ProblemRecordSchema.safeParse(record);
  if (!result.success) return null;
  const r = result.data;
  const resolvedAts = unionNumbers(
    r.resolvedAts,
    r.attempts.filter((a) => a.outcome === 'clean').map((a) => a.at),
  );
  return {
    ...r,
    cleanResolves: countMasteredResolves(resolvedAts),
    resolvedAts,
    mastered: countMasteredResolves(resolvedAts) >= MASTER_RESOLVES,
  };
}

function attemptKey(a: JournalAttempt): string {
  return `${a.at}|${a.outcome}|${a.hintRung ?? ''}|${a.mistake ?? ''}|${(a.notes ?? '').slice(0, 64)}`;
}

// ---- the scheduling rule (plan §9.1)

export interface SchedulingEvent {
  at: number;
  outcome: 'failed' | 'solved' | 'clean';
  hintRung?: number;
}

/** The next "ready to re-solve" after one event, measured from the event's own date. */
export function nextResolveAfter(cleanResolvesBefore: number, e: SchedulingEvent): number {
  switch (e.outcome) {
    case 'failed':
      return e.at + 2 * DAY_MS; // a failed (re-)solve: after 2 days
    case 'clean': {
      const intervals = [1, 3, 7, 14, 30];
      return e.at + intervals[Math.min(cleanResolvesBefore, intervals.length - 1)]! * DAY_MS;
    }
    default:
      // A first solve, a solve with hints, or a re-solve with a hint: after 1 day.
      return e.at + 1 * DAY_MS;
  }
}

const MIN_MASTER_GAP_MS = 7 * DAY_MS;
const MASTER_RESOLVES = 3;

/** Greedy count of counted re-solves: each counted one at least 7 days after the previous counted one. */
export function countMasteredResolves(ats: number[]): number {
  let counted = 0;
  let last = -Infinity;
  for (const at of [...ats].sort((x, y) => x - y)) {
    if (at - last >= MIN_MASTER_GAP_MS) {
      counted += 1;
      last = at;
    }
  }
  return counted;
}

export const isMastered = (resolvedAts: number[]): boolean =>
  countMasteredResolves(resolvedAts) >= MASTER_RESOLVES;

// ---- the event rules

/** Applies one logged attempt; the status and the next re-solve follow the legacy rules. */
export function attemptLogged(p: ProblemRecord, a: JournalAttempt): ProblemRecord {
  const previous = countMasteredResolves(p.resolvedAts);
  const after = {
    at: Math.max(p.at, a.at),
    attempts: appendAttempt(p.attempts, a),
    cleanResolves: p.cleanResolves,
    resolvedAts: p.resolvedAts,
    notes: p.notes,
    nextResolveAt: nextResolveAfter(previous, a),
    mastered: p.mastered,
  };
  switch (a.outcome) {
    case 'failed':
      return { ...after, status: p.status === 'not-started' ? 'attempted' : 'needs-revision' };
    case 'clean': {
      const resolvedAts = [...p.resolvedAts, a.at];
      return {
        ...after,
        status: 'independent',
        cleanResolves: countMasteredResolves(resolvedAts),
        resolvedAts,
        nextResolveAt: nextResolveAfter(p.cleanResolves, a),
        mastered: isMastered(resolvedAts),
      };
    }
    default:
      // A solve that used a hint is "with hints", never independent; a hint-free first solve is independent.
      return { ...after, status: a.hintRung ? 'with-hints' : 'independent' };
  }
}

function appendAttempt(attempts: JournalAttempt[], next: JournalAttempt): JournalAttempt[] {
  const key = attemptKey(next);
  return attempts.some((a) => attemptKey(a) === key) ? attempts : [...attempts, next];
}

export function journalNotesSet(
  p: ProblemRecord,
  e: { at: number; notes: Record<string, string> },
): ProblemRecord | null {
  const notes: Record<string, string> = { ...p.notes };
  for (const [k, v] of Object.entries(e.notes)) {
    const value = String(v).slice(0, MAX_TEXT);
    if (value) notes[k] = value;
    else delete notes[k];
  }
  if (sameText(notes, p.notes)) return null;
  return { ...p, at: Math.max(p.at, e.at), notes };
}

/** The learner may mark the status directly (for example Needs revision after an untimed failed attempt).
 * A direct status is also an event for the re-solve rule: needs revision after 2 days, any solve after 1,
 * and the schedule clears when the problem goes back to Not started (the legacy setStatus). */
export function statusSet(p: ProblemRecord, e: { at: number; status: JournalStatus }): ProblemRecord | null {
  const nextResolveAt =
    e.status === 'not-started' || p.mastered
      ? undefined
      : e.at + (e.status === 'needs-revision' ? 2 : 1) * DAY_MS;
  if (p.status === e.status && p.nextResolveAt === nextResolveAt) return null;
  return { ...p, at: Math.max(p.at, e.at), status: e.status, nextResolveAt };
}

/** The problem was re-solved now, outside the timing form: a clean re-solve with no further data. */
export function quickResolved(p: ProblemRecord, e: { at: number; failed?: boolean }): ProblemRecord {
  const a: JournalAttempt = { at: e.at, outcome: e.failed ? 'failed' : 'clean' };
  return attemptLogged(p, a);
}

// ---- merge (D-014: sticky and additive)

export function mergeProblemDocs(
  docs: ProblemDocs,
  num: string,
  next: ProblemRecord | undefined,
): ProblemDocs {
  if (!next) return docs;
  const prev = docs[num];
  if (!prev) return { ...docs, [num]: next };
  const resolvedAts = unionNumbers(prev.resolvedAts, next.resolvedAts);
  const attempts = mergeAttempts(prev.attempts, next.attempts);
  const notes = { ...prev.notes, ...next.notes };
  return {
    ...docs,
    [num]: {
      at: Math.max(prev.at, next.at),
      status: pickStatus(prev, next),
      attempts,
      notes,
      cleanResolves: countMasteredResolves(resolvedAts),
      resolvedAts,
      nextResolveAt: pickNextResolve(prev, next, attempts),
      mastered: isMastered(resolvedAts),
    },
  };
}

function pickStatus(a: ProblemRecord, b: ProblemRecord): JournalStatus {
  const rank: Record<JournalStatus, number> = {
    'not-started': 0,
    attempted: 1,
    'with-hints': 2,
    independent: 3,
    'needs-revision': 4,
  };
  const later = b.at >= a.at ? b : a;
  const earlier = later === b ? a : b;
  // Progress rank can only rise (a solve is not undone); Needs revision is a state, not progress, so the later wins.
  return rank[later.status] >= rank[earlier.status] ? later.status : earlier.status;
}

function pickNextResolve(a: ProblemRecord, b: ProblemRecord, attempts: JournalAttempt[]): number | undefined {
  const later = b.at >= a.at ? b : a;
  if (later.nextResolveAt !== undefined) return later.nextResolveAt;
  const other = later === b ? a : b;
  if (other.nextResolveAt !== undefined) return other.nextResolveAt;
  const last = attempts[attempts.length - 1];
  if (!last) return undefined;
  const cleanBefore = attempts.slice(0, -1).filter((x) => x.outcome === 'clean').length;
  return nextResolveAfter(cleanBefore, last);
}

function unionNumbers(a: number[], b: number[]): number[] {
  return [...new Set([...a, ...b])].sort((x, y) => x - y);
}

function mergeAttempts(a: JournalAttempt[], b: JournalAttempt[]): JournalAttempt[] {
  const byKey = new Map<string, JournalAttempt>();
  for (const t of [...a, ...b]) {
    const prev = byKey.get(attemptKey(t));
    if (!prev || JSON.stringify(t) >= JSON.stringify(prev)) byKey.set(attemptKey(t), t);
  }
  return [...byKey.values()].sort((x, y) => x.at - y.at).slice(0, 200);
}

function sameText(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
}

// ---- labels

export const STATUS_LABEL: Record<JournalStatus, string> = {
  'not-started': 'Not started',
  attempted: 'Attempted',
  'with-hints': 'Solved with hints',
  independent: 'Solved independently',
  'needs-revision': 'Needs revision',
};

/** The remedies of roadmap §8.3, one line each (shown next to the code in the journal and the progress page). */
export const MISTAKE_REMEDIES: Record<MistakeCode, string> = {
  P: 'Process: state the pattern and the plan in one sentence before typing any code.',
  A: 'Approach: the first idea was wrong; list two candidate approaches before starting.',
  D: 'Data structure: pick the structure before the loop, and say what each field holds.',
  L: 'Language: practise the exact API or syntax in a scratch file until it is automatic.',
  E: 'Edge cases: write the empty, single and duplicate tests before submitting.',
  C: 'Complexity: count the work before running; check the worst case against the constraints.',
  R: 'Rushed: slow down at the start and read the constraints twice before the first line.',
};
