import './zod';
import * as z from 'zod/mini';

// One exercise attempt document (plan §10 exercise_attempts). The rules are the legacy ones from
// legacy/src/exercises.js (markAttempt, the reveal click, the status line), stated as pure functions so the
// device and the server apply the same logic (D-014) and tests can drive them in Node.
//
// Merge rules (D-014) when two devices hold the same record:
// - the merged event history is the exact source for the counters (events dedupe by id), with the larger
//   stored value kept when the cap has already trimmed old entries; sticky flags (solved, revealed) never revert;
// - free text keeps the later change. Every rule is symmetric: either merge order ends in the same record.

export const MISTAKE_KINDS = ['concept', 'impl'] as const;
export type MistakeKind = (typeof MISTAKE_KINDS)[number];

const MistakeKindSchema = z.enum(MISTAKE_KINDS);

export interface HistoryEntry {
  /** Client-generated id; two devices' copies of one event collapse into one entry. */
  ev: string;
  at: number;
  kind: 'check' | 'hint' | 'reveal';
  ok?: boolean;
  mine?: MistakeKind;
}

const HistoryEntrySchema = z.object({
  ev: z.string().check(z.minLength(1), z.maxLength(64)),
  at: z.int().check(z.nonnegative()),
  kind: z.enum(['check', 'hint', 'reveal']),
  ok: z.optional(z.boolean()),
  mine: z.optional(MistakeKindSchema),
});

export const HISTORY_CAP = 60;

export const ExerciseRecordSchema = z.object({
  at: z.int().check(z.nonnegative()),
  attempts: z.int().check(z.nonnegative()),
  wrong: z.int().check(z.nonnegative()),
  hints: z.int().check(z.nonnegative()),
  solved: z.boolean(),
  revealed: z.boolean(),
  /** True when the first checked answer was right, with no hint seen and no reveal. */
  firstTry: z.optional(z.boolean()),
  /** The answer was viewed before the first solve: the later solve is marked as "viewing the answer" (legacy `revealedUnsolved`). */
  revealedBeforeSolve: z.optional(z.boolean()),
  lastMistakeKind: z.optional(MistakeKindSchema),
  lastAnswer: z.optional(z.unknown()),
  history: z.array(HistoryEntrySchema),
  drafts: z.record(z.string(), z.string()),
  stageNotes: z.record(z.string(), z.string()),
  customTests: z.array(z.object({ args: z.array(z.unknown()), expect: z.optional(z.unknown()) })),
});
export type ExerciseRecord = z.infer<typeof ExerciseRecordSchema>;

export const EMPTY_EXERCISE_RECORD: ExerciseRecord = {
  at: 0,
  attempts: 0,
  wrong: 0,
  hints: 0,
  solved: false,
  revealed: false,
  history: [],
  drafts: {},
  stageNotes: {},
  customTests: [],
};

export const ExerciseDocsSchema = z.record(z.string(), ExerciseRecordSchema);
export type ExerciseDocs = Record<string, ExerciseRecord>;
export const EMPTY_EXERCISE_DOCS: ExerciseDocs = {};

/** The legacy reveal rule: one hint or two wrong attempts open the answer. */
export const canReveal = (r: ExerciseRecord): boolean => r.hints > 0 || r.wrong >= 2;

/** What the header line says, in the legacy words. */
export function exerciseStatus(r: ExerciseRecord | undefined): string {
  if (!r) return 'Not tried';
  if (r.revealed && !r.solved) return 'Answer viewed';
  if (r.solved && r.revealedBeforeSolve) return 'Solved after viewing the answer';
  if (r.solved) return r.firstTry ? 'Solved first try' : `Solved after ${r.attempts} tries`;
  if (r.attempts) return `Tried ${r.attempts}×`;
  return 'Not tried';
}

export type ExerciseOutcome =
  | 'first-try' // solved without hints, no wrong attempt, not revealed
  | 'with-effort' // solved after hints or wrong attempts, or after viewing
  | 'viewed' // answer revealed without a solve
  | 'none';

/** The spaced-repetition rating one record maps to (D-016). */
export function exerciseOutcome(r: ExerciseRecord): ExerciseOutcome {
  if (r.solved) return r.firstTry ? 'first-try' : 'with-effort';
  if (r.revealed) return 'viewed';
  return 'none';
}

export interface CheckEvent {
  ev: string;
  at: number;
  ok: boolean;
  mine?: MistakeKind;
  answer?: unknown;
}

/** One check of an answer (right or wrong): the legacy markAttempt. */
export function checked(r0: ExerciseRecord, e: CheckEvent): ExerciseRecord {
  if (r0.history.some((h) => h.ev === e.ev)) return r0;
  const firstTry: boolean | undefined =
    r0.firstTry !== undefined ? r0.firstTry : e.ok && !r0.revealed && r0.hints === 0;
  return trim({
    ...r0,
    at: Math.max(r0.at, e.at),
    attempts: r0.attempts + 1,
    wrong: e.ok ? r0.wrong : r0.wrong + 1,
    solved: r0.solved || e.ok,
    firstTry,
    lastMistakeKind: e.ok ? r0.lastMistakeKind : (e.mine ?? r0.lastMistakeKind),
    lastAnswer: e.ok ? r0.lastAnswer : (e.answer ?? r0.lastAnswer),
    history: [
      ...r0.history,
      { ev: e.ev, at: e.at, kind: 'check', ok: e.ok, ...(e.mine ? { mine: e.mine } : {}) },
    ],
  });
}

export function hinted(r0: ExerciseRecord, e: { ev: string; at: number; rung: number }): ExerciseRecord {
  if (r0.history.some((h) => h.ev === e.ev)) return r0;
  return trim({
    ...r0,
    at: Math.max(r0.at, e.at),
    hints: Math.max(r0.hints, e.rung),
    history: [...r0.history, { ev: e.ev, at: e.at, kind: 'hint' }],
  });
}

/** The answer was shown. Revealing before the first solve marks the record, as the legacy reveal click did. */
export function revealed(r0: ExerciseRecord, e: { ev: string; at: number }): ExerciseRecord {
  if (r0.history.some((h) => h.ev === e.ev)) return r0;
  if (r0.revealed) return { ...r0, at: Math.max(r0.at, e.at) };
  return trim({
    ...r0,
    at: Math.max(r0.at, e.at),
    revealed: true,
    revealedBeforeSolve: r0.solved ? r0.revealedBeforeSolve : true,
    history: [...r0.history, { ev: e.ev, at: e.at, kind: 'reveal' }],
  });
}

export function drafted(r0: ExerciseRecord, e: { at: number; slot: string; value: string }): ExerciseRecord {
  const prev = r0.drafts[e.slot];
  if (prev === e.value) return r0;
  return { ...r0, at: Math.max(r0.at, e.at), drafts: { ...r0.drafts, [e.slot]: e.value } };
}

export function stageNoted(
  r0: ExerciseRecord,
  e: { at: number; stage: string; value: string },
): ExerciseRecord {
  const prev = r0.stageNotes[e.stage];
  if (prev === e.value) return r0;
  return { ...r0, at: Math.max(r0.at, e.at), stageNotes: { ...r0.stageNotes, [e.stage]: e.value } };
}

const MAX_CUSTOM_TESTS = 24;

export function customTestsSet(
  r0: ExerciseRecord,
  e: { at: number; tests: { args: unknown[]; expect?: unknown }[] },
): ExerciseRecord {
  return { ...r0, at: Math.max(r0.at, e.at), customTests: e.tests.slice(0, MAX_CUSTOM_TESTS) };
}

/** Clears the learner's own work for a retry; the attempt history stays, as in the legacy Reset. */
export function workCleared(r0: ExerciseRecord, e: { at: number }): ExerciseRecord {
  return { ...r0, at: Math.max(r0.at, e.at), drafts: {}, stageNotes: {}, customTests: [] };
}

function trim(r: ExerciseRecord): ExerciseRecord {
  const overflow = r.history.length - HISTORY_CAP;
  return overflow > 0 ? { ...r, history: r.history.slice(overflow) } : r;
}

// ---- merging two copies of the same documents (the server reducer and device merges)

export function mergeExerciseDocs(
  docs: ExerciseDocs,
  slug: string,
  next: ExerciseRecord | undefined,
): ExerciseDocs {
  if (!next) return docs;
  const prev = docs[slug];
  if (!prev) return { ...docs, [slug]: next };
  const history = mergeHistory(prev.history, next.history);
  // Counters add across devices (D-014): the merged history is the exact source (events dedupe by id),
  // and the stored counters keep the larger value when the cap has already trimmed old entries.
  const derived = countersFrom(history);
  return {
    ...docs,
    [slug]: {
      ...pickLater(prev, next),
      at: Math.max(prev.at, next.at),
      attempts: Math.max(prev.attempts, next.attempts, derived.checks),
      wrong: Math.max(prev.wrong, next.wrong, derived.wrong),
      hints: Math.max(prev.hints, next.hints),
      solved: prev.solved || next.solved,
      revealed: prev.revealed || next.revealed,
      revealedBeforeSolve: prev.revealedBeforeSolve || next.revealedBeforeSolve,
      history,
      drafts: keepLatest(prev.drafts, next.drafts, prev.at, next.at),
      stageNotes: keepLatest(prev.stageNotes, next.stageNotes, prev.at, next.at),
      customTests: mergeBySignature(prev.customTests, next.customTests),
    },
  };
}

function countersFrom(history: HistoryEntry[]): { checks: number; wrong: number } {
  let checks = 0;
  let wrong = 0;
  for (const h of history) {
    if (h.kind !== 'check') continue;
    checks += 1;
    if (!h.ok) wrong += 1;
  }
  return { checks, wrong };
}

function pickLater(a: ExerciseRecord, b: ExerciseRecord): ExerciseRecord {
  const out: ExerciseRecord = { ...a };
  for (const key of ['firstTry', 'lastMistakeKind', 'lastAnswer'] as const) {
    if (b[key] !== undefined && (a[key] === undefined || b.at >= a.at)) {
      (out as Record<string, unknown>)[key] = b[key];
    }
  }
  return out;
}

function keepLatest(
  a: Record<string, string>,
  b: Record<string, string>,
  aAt: number,
  bAt: number,
): Record<string, string> {
  // Draft text is rarely edited on two devices at once; where both changed the same slot, the later record wins.
  const first = bAt >= aAt ? a : b;
  const second = bAt >= aAt ? b : a;
  return { ...first, ...second };
}

function mergeHistory(a: HistoryEntry[], b: HistoryEntry[]): HistoryEntry[] {
  const byEv = new Map<string, HistoryEntry>();
  for (const h of [...a, ...b]) {
    const prev = byEv.get(h.ev);
    if (!prev || h.at > prev.at || (!prev.ok && h.ok)) byEv.set(h.ev, h);
  }
  const merged = [...byEv.values()].sort((x, y) => x.at - y.at);
  return merged.length > HISTORY_CAP ? merged.slice(merged.length - HISTORY_CAP) : merged;
}

function mergeBySignature<T>(a: T[], b: T[]): T[] {
  const sig = (t: T) => JSON.stringify(t);
  const seen = new Set(a.map(sig));
  return [...a, ...b.filter((t) => !seen.has(sig(t)))].slice(0, MAX_CUSTOM_TESTS);
}
