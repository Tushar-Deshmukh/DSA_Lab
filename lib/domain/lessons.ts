import './zod';
import * as z from 'zod/mini';

// A lesson's progress (plan §10 lesson_progress). Reading a page never marks anything: a unit is done when the
// learner marks it (theory units) or one of its exercises is solved (evidence recorded by the exercise part);
// a lesson is complete only when the self-check is ticked; the ready check records the tick.

export interface ResumePoint {
  unit: string;
  scrollY?: number;
  /** The visualizer the learner last had open on the lesson, with its step, so "resume exactly where I left off". */
  viz?: { id: string; input?: Record<string, unknown>; step?: number };
  editorDrafts?: Record<string, string>;
}

const ResumeSchema = z.object({
  unit: z.string(),
  scrollY: z.optional(z.int()),
  viz: z.optional(
    z.object({
      id: z.string(),
      input: z.optional(z.looseObject({})),
      step: z.optional(z.int().check(z.nonnegative())),
    }),
  ),
});

export const LessonProgressSchema = z.object({
  at: z.int().check(z.nonnegative()),
  startedAt: z.optional(z.int().check(z.nonnegative())),
  /** The unit ids the learner marked or completed through a solved exercise. */
  units: z.record(z.string(), z.int()),
  /** The ready-check items ticked (legacy `@ready:` lines). */
  ready: z.record(z.string(), z.int()),
  selfCheck: z.optional(z.int().check(z.nonnegative())),
  completedAt: z.optional(z.int().check(z.nonnegative())),
  timeSpentSec: z.optional(z.int().check(z.nonnegative())),
  resume: z.optional(z.partial(ResumeSchema)),
});
export type LessonProgress = z.infer<typeof LessonProgressSchema>;

export const LessonDocsSchema = z.record(z.string(), LessonProgressSchema);
export type LessonDocs = Record<string, LessonProgress>;

export function touched(docs: LessonDocs, lesson: string, at: number): LessonProgress {
  const prev = docs[lesson];
  return {
    ...prev,
    at,
    startedAt: prev?.startedAt ?? at,
    units: prev?.units ?? {},
    ready: prev?.ready ?? {},
  };
}

export function unitDone(docs: LessonDocs, e: { lesson: string; unit: string; at: number }): LessonDocs {
  const p = touched(docs, e.lesson, e.at);
  if (p.units[e.unit]) return docs;
  return { ...docs, [e.lesson]: { ...p, units: { ...p.units, [e.unit]: e.at } } };
}

export function readyChecked(docs: LessonDocs, e: { lesson: string; item: string; at: number }): LessonDocs {
  const p = touched(docs, e.lesson, e.at);
  const toggleOff = Boolean(p.ready[e.item]);
  const ready = { ...p.ready };
  if (toggleOff) delete ready[e.item];
  else ready[e.item] = e.at;
  return { ...docs, [e.lesson]: { ...p, ready } };
}

/** The "ready to move on" self-check. Ticking it is required before a lesson may be marked complete. */
export function selfCheckTicked(
  docs: LessonDocs,
  e: { lesson: string; at: number; on?: boolean },
): LessonDocs {
  const p = touched(docs, e.lesson, e.at);
  const on = e.on ?? !p.selfCheck;
  return { ...docs, [e.lesson]: { ...p, selfCheck: on ? e.at : undefined } };
}

/** Completed requires the self-check; which core exercises must be solved is the page's rule (it knows the content). */
export function lessonCompleted(
  docs: LessonDocs,
  e: { lesson: string; at: number; complete: boolean },
): LessonDocs {
  const p = touched(docs, e.lesson, e.at);
  if (e.complete && !p.selfCheck) return docs; // the reducer refuses: the self-check must be ticked first
  return {
    ...docs,
    [e.lesson]: { ...p, completedAt: e.complete ? e.at : undefined, timeSpentSec: p.timeSpentSec ?? 0 },
  };
}

export function lessonResumed(
  docs: LessonDocs,
  e: { lesson: string; at: number; resume: ResumePoint },
): LessonDocs {
  const p = touched(docs, e.lesson, e.at);
  return { ...docs, [e.lesson]: { ...p, resume: e.resume } };
}

const MAX_TIME_SPENT_SEC = 40 * 3600;

export function timeSpentAdded(
  docs: LessonDocs,
  e: { lesson: string; at: number; seconds: number },
): LessonDocs {
  if (e.seconds <= 0) return docs;
  const p = touched(docs, e.lesson, e.at);
  const total = Math.min(MAX_TIME_SPENT_SEC, (p.timeSpentSec ?? 0) + e.seconds);
  return { ...docs, [e.lesson]: { ...p, timeSpentSec: total } };
}

/** Merge of two devices' copies: sticky marks stay, timestamps keep the later. */
export function mergeLessonDocs(
  docs: LessonDocs,
  lesson: string,
  next: LessonProgress | undefined,
): LessonDocs {
  if (!next) return docs;
  const prev = docs[lesson];
  if (!prev) return { ...docs, [lesson]: next };
  if (
    prev.at === next.at &&
    completedEqual(prev, next) &&
    readyEqual(prev.units, next.units) &&
    readyEqual(prev.ready, next.ready)
  )
    return docs;
  return {
    ...docs,
    [lesson]: {
      at: Math.max(prev.at, next.at),
      // First-seen timestamps take the minimum, the last self-check the maximum (D-014); the merge is
      // commutative: either argument order ends with the same record.
      startedAt: minDefined(prev.startedAt, next.startedAt),
      units: unionEarliest(prev.units, next.units),
      ready: unionEarliest(prev.ready, next.ready),
      selfCheck: maxDefined(prev.selfCheck, next.selfCheck),
      completedAt: minDefined(prev.completedAt, next.completedAt),
      timeSpentSec: Math.max(prev.timeSpentSec ?? 0, next.timeSpentSec ?? 0) || undefined,
      resume: laterResume(prev.resume, next.resume, prev.at, next.at),
    },
  };
}

function minDefined(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.min(a, b);
}

function maxDefined(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}

const completedEqual = (a: LessonProgress, b: LessonProgress) =>
  (a.completedAt ?? null) === (b.completedAt ?? null);
const readyEqual = (a: Record<string, number>, b: Record<string, number>) =>
  Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => a[k] === b[k]);

function unionEarliest(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.min(a[k] ?? Infinity, v);
  for (const k of Object.keys(out)) if (out[k] === Infinity) delete out[k];
  return out;
}

function laterResume(
  a: LessonProgress['resume'],
  b: LessonProgress['resume'],
  aAt: number,
  bAt: number,
): LessonProgress['resume'] {
  return bAt >= aAt ? (b ?? a) : (a ?? b);
}
