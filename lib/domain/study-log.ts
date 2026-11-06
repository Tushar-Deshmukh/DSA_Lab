import './zod';
import * as z from 'zod/mini';

// Study sessions (plan §10 study_sessions, §9.4). A session is planned by the planner (client-side), and its
// record logs what was planned and what actually happened, so the progress page can count time studied. It
// never sets a streak and never names a date in the UI: the record keeps only wall-clock times for the
// learner's own data.

export type SessionItemKind = 'review' | 'unit' | 'problem' | 'check';

export interface SessionItem {
  kind: SessionItemKind;
  /** The item's key: a review item key, `lesson/unit`, `p<bank number>` or `checkpoint/<slug>`. */
  key: string;
  planned: number;
  actual?: number;
}

const MAX_ITEMS = 40;

export interface StudySessionDoc {
  id: string;
  at: number;
  startedAt: number;
  endedAt?: number;
  plannedMinutes: number;
  items: SessionItem[];
}

const SessionItemSchema = z.object({
  kind: z.enum(['review', 'unit', 'problem', 'check']),
  key: z.string().check(z.minLength(1), z.maxLength(220)),
  planned: z.int().check(z.nonnegative()),
  actual: z.optional(z.int().check(z.nonnegative())),
});

export const StudySessionDocSchema = z.object({
  id: z.string().check(z.minLength(8), z.maxLength(64)),
  at: z.int().check(z.nonnegative()),
  startedAt: z.int().check(z.positive()),
  endedAt: z.optional(z.int().check(z.positive())),
  plannedMinutes: z.int().check(z.minimum(0), z.maximum(240)),
  items: z.array(SessionItemSchema).check(z.maxLength(MAX_ITEMS)),
});

export type StudySessionDocs = Record<string, StudySessionDoc>;
export const StudySessionDocsSchema = z.record(z.string(), StudySessionDocSchema);

/** Sums the actual time across ended sessions, in seconds (the progress page's "time studied"). */
export function timeStudiedSec(docs: StudySessionDocs): number {
  let milliseconds = 0;
  for (const s of Object.values(docs)) {
    if (!s.endedAt) continue;
    milliseconds += Math.max(0, Math.min(s.endedAt, s.at) - s.startedAt);
  }
  return Math.floor(milliseconds / 1000);
}

/** The distinct days with a session end (or an item actual), counted across all records (plan §9.6). */
export function activeDays(docs: StudySessionDocs): number {
  const days = new Set<string>();
  for (const s of Object.values(docs)) {
    const end = s.endedAt ?? s.startedAt;
    days.add(dayKey(end));
    for (const item of s.items) if (item.actual) days.add(dayKey(s.startedAt));
  }
  return days.size;
}

const DAY_MS = 86_400_000;
/** Midnight of the day `at` falls on, as a UTC day string: enough to count days, never shown as a date. */
export const dayKey = (at: number): string =>
  new Date(Math.floor(at / DAY_MS) * DAY_MS).toISOString().slice(0, 10);

/** True when `at` falls on a different day than the last recorded study activity. */
export function isNewDay(lastActivityAt: number, at: number): boolean {
  return dayKey(lastActivityAt) !== dayKey(at);
}
