import { mergeLessonDocs, type LessonDocs } from './lessons';
import { mergeExerciseDocs, type ExerciseDocs } from './exercises';
import { mergeProblemDocs, type ProblemDocs } from './journal';
import { mergeReviewDocs, type ReviewDocs } from './review';
import {
  bookmarkKey,
  highlightKey,
  type NoteDocs,
  type BookmarkDocs,
  type HighlightDocs,
  type ReflectionDocs,
  type MistakeDocs,
  type HighlightDoc,
} from './notes';
import { type CheckpointProblem, type CheckpointResult, type MockResult, type ReadinessDoc } from './assess';
import type { StudySessionDocs } from './study-log';

// Bulk merges (decision D-014): the same rules the sync path applies record by record, here over whole parts.
// Used by the guest-to-account merge, `/api/me/import`, and the legacy backup import. Every fold is
// idempotent and commutative for the same inputs.

export function mergeLessonsPart(docs: LessonDocs, next: LessonDocs): LessonDocs {
  let out = docs;
  for (const [lesson, record] of Object.entries(next)) out = mergeLessonDocs(out, lesson, record);
  return out;
}

export function mergeExercisesPart(docs: ExerciseDocs, next: ExerciseDocs): ExerciseDocs {
  let out = docs;
  for (const [slug, record] of Object.entries(next)) out = mergeExerciseDocs(out, slug, record);
  return out;
}

export function mergeJournalPart(docs: ProblemDocs, next: ProblemDocs): ProblemDocs {
  let out = docs;
  for (const [num, record] of Object.entries(next)) out = mergeProblemDocs(out, num, record);
  return out;
}

export function mergeReviewPart(docs: ReviewDocs, next: ReviewDocs): ReviewDocs {
  let out = docs;
  for (const [key, record] of Object.entries(next)) out = mergeReviewDocs(out, key, record);
  return out;
}

export function mergeNotesPart(docs: NoteDocs, next: NoteDocs): NoteDocs {
  const out = { ...docs };
  for (const [id, note] of Object.entries(next)) {
    const prev = out[id];
    if (!prev || note.at > prev.at || (note.at === prev.at && note.createdAt < prev.createdAt))
      out[id] = note;
  }
  return out;
}

export function mergeBookmarksPart(docs: BookmarkDocs, next: BookmarkDocs): BookmarkDocs {
  // A bookmark is a mark: present on either device stays present, the timestamp keeps the later.
  const out = { ...docs };
  for (const [rawKey, doc] of Object.entries(next)) {
    const key = doc.target ? bookmarkKey(doc.target) : rawKey;
    const prev = out[key];
    out[key] = prev ? { ...prev, at: Math.max(prev.at, doc.at) } : doc;
  }
  return out;
}

export function mergeHighlightsPart(docs: HighlightDocs, next: HighlightDocs): HighlightDocs {
  const out = { ...docs };
  for (const [, doc] of Object.entries(next)) {
    const key = highlightKey(doc as HighlightDoc);
    const prev = out[key];
    if (!prev || doc.at >= prev.at) out[key] = doc;
  }
  return out;
}

export function mergeReflectionsPart(docs: ReflectionDocs, next: ReflectionDocs): ReflectionDocs {
  const out = { ...docs };
  for (const [module, r] of Object.entries(next)) {
    const prev = out[module];
    if (!prev || r.at > prev.at) out[module] = r;
  }
  return out;
}

export function mergeMistakesPart(docs: MistakeDocs, next: MistakeDocs): MistakeDocs {
  const out = { ...docs };
  for (const [id, m] of Object.entries(next)) {
    const prev = out[id];
    if (!prev || m.at > prev.at) out[id] = m;
  }
  return out;
}

export function mergeReadiness(docs: ReadinessDoc, next: ReadinessDoc): ReadinessDoc {
  const items: Record<string, number> = { ...docs.items };
  for (const [id, at] of Object.entries(next.items)) {
    const prev = items[id];
    items[id] = prev === undefined ? at : Math.min(prev, at);
  }
  return {
    at: Math.max(docs.at, next.at),
    items,
    evidence: [...new Set([...docs.evidence, ...next.evidence])].slice(0, 10),
  };
}

export function mergeCheckpointsPart(
  docs: Record<string, CheckpointResult>,
  next: Record<string, CheckpointResult>,
): Record<string, CheckpointResult> {
  const out = { ...docs };
  for (const [slug, doc] of Object.entries(next)) {
    const prev = out[slug];
    if (!prev) {
      out[slug] = doc;
      continue;
    }
    // Started earlier, scored rows from the later copy, finished when either finished.
    const later = doc.at >= prev.at ? doc : prev;
    const earlier = later === doc ? prev : doc;
    out[slug] = {
      ...later,
      at: Math.max(prev.at, doc.at),
      startedAt: minDefined(prev.startedAt, doc.startedAt),
      finishedAt: later.finishedAt ?? earlier.finishedAt,
      problems: mergeProblems(later.problems, earlier.problems),
      notes: later.notes ?? earlier.notes,
    };
  }
  return out;
}

function mergeProblems(later: CheckpointProblem[], other: CheckpointProblem[]): CheckpointProblem[] {
  const out = [...later];
  for (const p of other) {
    const i = out.findIndex((x) => x.key === p.key);
    // A missing row from the other device is kept; a row both scored already came in from the later copy.
    if (i === -1) out.push(p);
  }
  return out;
}

export function mergeMocksPart(
  docs: Record<string, MockResult>,
  next: Record<string, MockResult>,
): Record<string, MockResult> {
  const out = { ...docs };
  for (const [slug, doc] of Object.entries(next)) {
    const prev = out[slug];
    if (!prev) {
      out[slug] = doc;
      continue;
    }
    const later = doc.at >= prev.at ? doc : prev;
    const earlier = later === doc ? prev : doc;
    out[slug] = {
      ...later,
      at: Math.max(prev.at, doc.at),
      startedAt: minDefined(prev.startedAt, doc.startedAt),
      finishedAt: later.finishedAt ?? earlier.finishedAt,
      scores: later.scores.length >= earlier.scores.length ? later.scores : earlier.scores,
      feedback: later.feedback ?? earlier.feedback,
    };
  }
  return out;
}

export function mergeSessionsPart(docs: StudySessionDocs, next: StudySessionDocs): StudySessionDocs {
  const out = { ...docs };
  for (const [id, s] of Object.entries(next)) {
    const prev = out[id];
    if (!prev) {
      out[id] = s;
      continue;
    }
    const later = s.at >= prev.at ? s : prev;
    out[id] = {
      ...later,
      at: Math.max(prev.at, s.at),
      startedAt: later.startedAt ?? prev.startedAt,
      endedAt: later.endedAt ?? prev.endedAt,
      plannedMinutes: later.plannedMinutes || prev.plannedMinutes,
      items: later.items.length >= prev.items.length ? later.items : prev.items,
    };
  }
  return out;
}

function minDefined(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.min(a, b);
}
