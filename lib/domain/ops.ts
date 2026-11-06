import './zod';
import * as z from 'zod/mini';
import {
  EMPTY_SETTINGS_DOC,
  SETTINGS_KEYS,
  SettingsDocSchema,
  parseSettingValue,
  setSetting,
  mergeSettings,
  type SettingsKey,
  type SettingsValues,
} from './settings';
import {
  EMPTY_EXERCISE_DOCS,
  EMPTY_EXERCISE_RECORD,
  ExerciseDocsSchema,
  checked as exerciseChecked,
  hinted as exerciseHinted,
  revealed as exerciseRevealed,
  drafted as exerciseDrafted,
  stageNoted as exerciseStageNoted,
  customTestsSet as exerciseCustomTests,
  workCleared as exerciseWorkCleared,
  exerciseOutcome,
  type ExerciseDocs,
  type ExerciseRecord,
} from './exercises';
import {
  LessonDocsSchema,
  unitDone as lessonUnitDone,
  readyChecked as lessonReadyChecked,
  selfCheckTicked as lessonSelfCheck,
  lessonCompleted,
  lessonResumed,
  timeSpentAdded as lessonTimeAdded,
  type ResumePoint,
} from './lessons';
import {
  ProblemDocsSchema,
  attemptLogged as journalAttemptLogged,
  quickResolved as journalQuickResolved,
  journalNotesSet,
  statusSet as journalStatusSet,
  type ProblemDocs,
  type JournalAttempt,
  type ProblemRecord,
} from './journal';
import {
  ReviewDocsSchema,
  reviewItemKey,
  intervalItem,
  fsrsItem as newFsrsItem,
  fsrsReviewed,
  type ReviewRating,
} from './review';
import {
  NoteDocsSchema,
  bookmarkKey,
  BookmarkDocsSchema,
  highlightKey,
  HighlightDocsSchema,
  ReflectionDocsSchema,
  MistakeDocsSchema,
  type NoteDoc,
} from './notes';
import {
  CheckpointResultSchema,
  MockResultSchema,
  ReadinessDocSchema,
  type CheckpointProblem,
  type CheckpointResult,
  type MockResult,
} from './assess';
import { StudySessionDocsSchema } from './study-log';
import {
  mergeLessonsPart,
  mergeExercisesPart,
  mergeJournalPart,
  mergeReviewPart,
  mergeNotesPart,
  mergeBookmarksPart,
  mergeHighlightsPart,
  mergeReflectionsPart,
  mergeMistakesPart,
  mergeReadiness,
  mergeCheckpointsPart,
  mergeMocksPart,
  mergeSessionsPart,
} from './merge';

// Every change a learner makes is an operation (decision D-014): applied on the device at once, queued in the
// outbox, then applied again by the server with the same pure function. The opId makes a replayed operation
// harmless. One operation may touch one or two parts (an exercise answer also moves its review item); the
// server diffs the snapshot part by part and writes only what changed.

const base = {
  opId: z.uuid(),
  at: z.int().check(z.positive()),
  deviceId: z.string().check(z.minLength(8), z.maxLength(64)),
};

const ev = z.object({ ev: z.string().check(z.minLength(1), z.maxLength(64)) });
const exerciseSlug = z.string().check(z.minLength(1), z.maxLength(240));

// ---- settings

const SettingsSetOpSchema = z.object({
  ...base,
  type: z.literal('settings.set'),
  payload: z.object({ key: z.enum(SETTINGS_KEYS), value: z.unknown() }),
});

// ---- lessons

const LessonUnitOpSchema = z.object({
  ...base,
  type: z.literal('lesson.unit-done'),
  payload: z.object({
    lesson: z.string().check(z.minLength(1), z.maxLength(220)),
    unit: z.string().check(z.minLength(1), z.maxLength(220)),
  }),
});

const LessonReadyOpSchema = z.object({
  ...base,
  type: z.literal('lesson.ready-checked'),
  payload: z.object({
    lesson: z.string().check(z.minLength(1), z.maxLength(220)),
    item: z.string().check(z.minLength(1), z.maxLength(220)),
  }),
});

const LessonSelfCheckOpSchema = z.object({
  ...base,
  type: z.literal('lesson.self-check'),
  payload: z.object({
    lesson: z.string().check(z.minLength(1), z.maxLength(220)),
    on: z.optional(z.boolean()),
  }),
});

const LessonCompletedOpSchema = z.object({
  ...base,
  type: z.literal('lesson.completed'),
  payload: z.object({ lesson: z.string().check(z.minLength(1), z.maxLength(220)), complete: z.boolean() }),
});

const ResumePayloadSchema = z.object({
  unit: z.string().check(z.minLength(1), z.maxLength(220)),
  scrollY: z.optional(z.int().check(z.nonnegative())),
  viz: z.optional(
    z.object({
      id: z.string().check(z.minLength(1), z.maxLength(160)),
      input: z.optional(z.looseObject({})),
      step: z.optional(z.int().check(z.nonnegative())),
    }),
  ),
});

const LessonResumedOpSchema = z.object({
  ...base,
  type: z.literal('lesson.resumed'),
  payload: z.object({
    lesson: z.string().check(z.minLength(1), z.maxLength(220)),
    resume: ResumePayloadSchema,
  }),
});

const LessonTimeOpSchema = z.object({
  ...base,
  type: z.literal('lesson.time-added'),
  payload: z.object({
    lesson: z.string().check(z.minLength(1), z.maxLength(220)),
    seconds: z.int().check(z.minimum(-3600), z.maximum(7200)),
  }),
});

// ---- exercises

const ExerciseCheckedOpSchema = z.object({
  ...base,
  type: z.literal('exercise.checked'),
  payload: z.object({
    slug: exerciseSlug,
    ...ev.shape,
    ok: z.boolean(),
    mine: z.optional(z.enum(['concept', 'impl'])),
  }),
});

const ExerciseHintedOpSchema = z.object({
  ...base,
  type: z.literal('exercise.hinted'),
  payload: z.object({ slug: exerciseSlug, ...ev.shape, rung: z.int().check(z.minimum(1), z.maximum(6)) }),
});

const ExerciseRevealedOpSchema = z.object({
  ...base,
  type: z.literal('exercise.revealed'),
  payload: z.object({ slug: exerciseSlug, ...ev.shape }),
});

const ExerciseDraftedOpSchema = z.object({
  ...base,
  type: z.literal('exercise.drafted'),
  payload: z.object({
    slug: exerciseSlug,
    slot: z.string().check(z.minLength(1), z.maxLength(60)),
    value: z.string().check(z.maxLength(30000)),
  }),
});

const ExerciseStageNotedOpSchema = z.object({
  ...base,
  type: z.literal('exercise.stage-noted'),
  payload: z.object({
    slug: exerciseSlug,
    stage: z.string().check(z.minLength(1), z.maxLength(60)),
    value: z.string().check(z.maxLength(8000)),
  }),
});

const ExerciseCustomTestsOpSchema = z.object({
  ...base,
  type: z.literal('exercise.custom-tests'),
  payload: z.object({
    slug: exerciseSlug,
    tests: z
      .array(z.object({ args: z.array(z.unknown()), expect: z.optional(z.unknown()) }))
      .check(z.maxLength(24)),
  }),
});

const ExerciseWorkClearedOpSchema = z.object({
  ...base,
  type: z.literal('exercise.work-cleared'),
  payload: z.object({ slug: exerciseSlug }),
});

// ---- the problem journal

const JournalAttemptSchema = z.object({
  at: z.int().check(z.positive()),
  minutes: z.optional(z.int().check(z.nonnegative())),
  outcome: z.enum(['failed', 'solved', 'clean']),
  hintRung: z.optional(z.int().check(z.minimum(0), z.maximum(4))),
  mistake: z.optional(z.enum(['P', 'A', 'D', 'L', 'E', 'C', 'R'])),
  approach: z.optional(z.string().check(z.maxLength(2000))),
  complexity: z.optional(z.string().check(z.maxLength(200))),
  insight: z.optional(z.string().check(z.maxLength(2000))),
  notes: z.optional(z.string().check(z.maxLength(4000))),
});

const numField = { num: z.string().check(z.minLength(1), z.maxLength(16)) };

const JournalAttemptOpSchema = z.object({
  ...base,
  type: z.literal('journal.attempt'),
  payload: z.object({ ...numField, attempt: JournalAttemptSchema }),
});

const JournalNotesOpSchema = z.object({
  ...base,
  type: z.literal('journal.notes'),
  payload: z.object({
    ...numField,
    notes: z.record(z.string().check(z.maxLength(30)), z.string().check(z.maxLength(8000))),
  }),
});

const JournalStatusOpSchema = z.object({
  ...base,
  type: z.literal('journal.status'),
  payload: z.object({
    ...numField,
    status: z.enum(['not-started', 'attempted', 'with-hints', 'independent', 'needs-revision']),
  }),
});

const JournalQuickOpSchema = z.object({
  ...base,
  type: z.literal('journal.quick-solve'),
  payload: z.object({ ...numField, failed: z.optional(z.boolean()) }),
});

// ---- review

const ReviewFsrsOpSchema = z.object({
  ...base,
  type: z.literal('review.fsrs-reviewed'),
  payload: z.object({
    itemType: z.enum(['flashcard', 'exercise', 'drill']),
    itemSlug: z.string().check(z.minLength(1), z.maxLength(240)),
    rating: z.int().check(z.minimum(1), z.maximum(4)),
    source: z.optional(z.string().check(z.maxLength(200))),
  }),
});

const ReviewProblemOpSchema = z.object({
  ...base,
  type: z.literal('review.problem-opened'),
  payload: z.object({ ...numField, source: z.optional(z.string().check(z.maxLength(200))) }),
});

// ---- notes, bookmarks, highlights, reflections, mistakes

const targetTypes = z.enum(['lesson', 'unit', 'pattern', 'problem', 'visualizer', 'handbook']);

const NoteSetOpSchema = z.object({
  ...base,
  type: z.literal('note.set'),
  payload: z.object({
    id: z.string().check(z.minLength(8), z.maxLength(64)),
    target: z.object({
      type: targetTypes,
      slug: z.string().check(z.minLength(1), z.maxLength(220)),
      blockId: z.optional(z.string().check(z.minLength(1), z.maxLength(140))),
      vizState: z.optional(z.string().check(z.maxLength(400))),
    }),
    body: z.string().check(z.maxLength(8000)),
    createdAt: z.int().check(z.positive()),
  }),
});

const NoteDeletedOpSchema = z.object({
  ...base,
  type: z.literal('note.deleted'),
  payload: z.object({ id: z.string().check(z.minLength(8), z.maxLength(64)) }),
});

const BookmarkToggledOpSchema = z.object({
  ...base,
  type: z.literal('bookmark.toggled'),
  payload: z.object({
    target: z.object({
      type: targetTypes,
      slug: z.string().check(z.minLength(1), z.maxLength(220)),
      blockId: z.optional(z.string().check(z.minLength(1), z.maxLength(140))),
    }),
  }),
});

const HighlightToggledOpSchema = z.object({
  ...base,
  type: z.literal('highlight.toggled'),
  payload: z.object({
    target: z.object({
      type: targetTypes,
      slug: z.string().check(z.minLength(1), z.maxLength(220)),
      blockId: z.string().check(z.minLength(1), z.maxLength(160)),
    }),
    quote: z.object({
      exact: z.string().check(z.minLength(1), z.maxLength(400)),
      prefix: z.optional(z.string().check(z.maxLength(80))),
      suffix: z.optional(z.string().check(z.maxLength(80))),
    }),
  }),
});

const ReflectionSetOpSchema = z.object({
  ...base,
  type: z.literal('reflection.set'),
  payload: z.object({
    module: z.string().check(z.minLength(1), z.maxLength(120)),
    createdAt: z.optional(z.int().check(z.positive())),
    answers: z.object({
      went: z.optional(z.string().check(z.maxLength(4000))),
      hard: z.optional(z.string().check(z.maxLength(4000))),
      change: z.optional(z.string().check(z.maxLength(4000))),
      confidence: z.optional(z.string().check(z.maxLength(200))),
    }),
    scorecard: z.object({
      patterns: z.optional(z.string().check(z.maxLength(40))),
      approach: z.optional(z.string().check(z.maxLength(40))),
      complexityAccuracy: z.optional(z.string().check(z.maxLength(40))),
    }),
  }),
});

const MistakeLoggedOpSchema = z.object({
  ...base,
  type: z.literal('mistake.logged'),
  payload: z.object({
    id: z.string().check(z.minLength(8), z.maxLength(64)),
    code: z.enum(['P', 'A', 'D', 'L', 'E', 'C', 'R']),
    source: z.object({ type: z.string().check(z.maxLength(40)), slug: z.string().check(z.maxLength(220)) }),
    note: z.optional(z.string().check(z.maxLength(2000))),
  }),
});

const MistakeDeletedOpSchema = z.object({
  ...base,
  type: z.literal('mistake.deleted'),
  payload: z.object({ id: z.string().check(z.minLength(8), z.maxLength(64)) }),
});

// ---- readiness, checkpoints, mocks, sessions

const ReadinessToggledOpSchema = z.object({
  ...base,
  type: z.literal('readiness.toggled'),
  payload: z.object({ id: z.string().check(z.minLength(1), z.maxLength(120)) }),
});

const ReadinessEvidenceOpSchema = z.object({
  ...base,
  type: z.literal('readiness.evidence'),
  payload: z.object({
    ids: z.array(z.string().check(z.minLength(1), z.maxLength(120))).check(z.maxLength(10)),
  }),
});

const RubricScoresSchema = z.record(
  z.enum(['correct', 'complexity', 'stated', 'edges', 'brute']),
  z.int().check(z.minimum(0), z.maximum(4)),
);

const CheckpointScoredOpSchema = z.object({
  ...base,
  type: z.literal('checkpoint.scored'),
  payload: z.object({
    slug: z.string().check(z.minLength(1), z.maxLength(160)),
    problem: z.object({
      key: z.string().check(z.minLength(1), z.maxLength(24)),
      unseen: z.boolean(),
      nums: z.array(z.string().check(z.minLength(1), z.maxLength(16))).check(z.maxLength(6)),
      scores: RubricScoresSchema,
      mistakeCodes: z.array(z.enum(['P', 'A', 'D', 'L', 'E', 'C', 'R'])).check(z.maxLength(7)),
    }),
  }),
});

const CheckpointSlugOpSchema = z.object({
  ...base,
  type: z.literal('checkpoint.notes'),
  payload: z.object({
    slug: z.string().check(z.minLength(1), z.maxLength(160)),
    notes: z.string().check(z.maxLength(8000)),
  }),
});

const CheckpointLifecycleOpSchema = z.object({
  ...base,
  type: z.enum(['checkpoint.started', 'checkpoint.finished']),
  payload: z.object({ slug: z.string().check(z.minLength(1), z.maxLength(160)) }),
});

const MockStartedOpSchema = z.object({
  ...base,
  type: z.literal('mock.started'),
  payload: z.object({ slug: z.string().check(z.minLength(1), z.maxLength(160)) }),
});

const MockScoredOpSchema = z.object({
  ...base,
  type: z.literal('mock.scored'),
  payload: z.object({
    slug: z.string().check(z.minLength(1), z.maxLength(160)),
    scores: z.array(z.int().check(z.minimum(0), z.maximum(4))).check(z.maxLength(5)),
  }),
});

const MockFinishedOpSchema = z.object({
  ...base,
  type: z.literal('mock.finished'),
  payload: z.object({
    slug: z.string().check(z.minLength(1), z.maxLength(160)),
    feedback: z.optional(z.string().check(z.maxLength(8000))),
  }),
});

const SessionStartedOpSchema = z.object({
  ...base,
  type: z.literal('session.started'),
  payload: z.object({
    id: z.string().check(z.minLength(8), z.maxLength(64)),
    plannedMinutes: z.int().check(z.minimum(0), z.maximum(240)),
    items: sessionItemsSchema(),
  }),
});

const SessionEndedOpSchema = z.object({
  ...base,
  type: z.literal('session.ended'),
  payload: z.object({ id: z.string().check(z.minLength(8), z.maxLength(64)), items: sessionItemsSchema() }),
});

const SessionDeletedOpSchema = z.object({
  ...base,
  type: z.literal('session.deleted'),
  payload: z.object({ id: z.string().check(z.minLength(8), z.maxLength(64)) }),
});

function sessionItemsSchema() {
  return z
    .array(
      z.object({
        kind: z.enum(['review', 'unit', 'problem', 'check']),
        key: z.string().check(z.minLength(1), z.maxLength(240)),
        planned: z.int().check(z.nonnegative()),
        actual: z.optional(z.int().check(z.nonnegative())),
      }),
    )
    .check(z.maxLength(40));
}

// ---- bulk merge (importing another device's or a backup's documents; decision D-014)

const MergePayloadSchema = z.object({
  lessons: z.optional(LessonDocsSchema),
  exercises: z.optional(ExerciseDocsSchema),
  journal: z.optional(ProblemDocsSchema),
  review: z.optional(ReviewDocsSchema),
  notes: z.optional(NoteDocsSchema),
  bookmarks: z.optional(BookmarkDocsSchema),
  highlights: z.optional(HighlightDocsSchema),
  reflections: z.optional(ReflectionDocsSchema),
  mistakes: z.optional(MistakeDocsSchema),
  readiness: z.optional(ReadinessDocSchema),
  checkpoints: z.optional(z.record(z.string(), CheckpointResultSchema)),
  mocks: z.optional(z.record(z.string(), MockResultSchema)),
  sessions: z.optional(StudySessionDocsSchema),
  settings: z.optional(SettingsDocSchema),
});

/** `snapshot.merge` folds whole documents in with the same merge rules the sync path uses. */
const SnapshotMergeOpSchema = z.object({
  ...base,
  type: z.literal('snapshot.merge'),
  payload: MergePayloadSchema,
});

// ---- the operation union, the snapshot and the reducer

export const OpSchema = z.discriminatedUnion('type', [
  SettingsSetOpSchema,
  LessonUnitOpSchema,
  LessonReadyOpSchema,
  LessonSelfCheckOpSchema,
  LessonCompletedOpSchema,
  LessonResumedOpSchema,
  LessonTimeOpSchema,
  ExerciseCheckedOpSchema,
  ExerciseHintedOpSchema,
  ExerciseRevealedOpSchema,
  ExerciseDraftedOpSchema,
  ExerciseStageNotedOpSchema,
  ExerciseCustomTestsOpSchema,
  ExerciseWorkClearedOpSchema,
  JournalAttemptOpSchema,
  JournalNotesOpSchema,
  JournalStatusOpSchema,
  JournalQuickOpSchema,
  ReviewFsrsOpSchema,
  ReviewProblemOpSchema,
  NoteSetOpSchema,
  NoteDeletedOpSchema,
  BookmarkToggledOpSchema,
  HighlightToggledOpSchema,
  ReflectionSetOpSchema,
  MistakeLoggedOpSchema,
  MistakeDeletedOpSchema,
  ReadinessToggledOpSchema,
  ReadinessEvidenceOpSchema,
  CheckpointScoredOpSchema,
  CheckpointSlugOpSchema,
  CheckpointLifecycleOpSchema,
  MockStartedOpSchema,
  MockScoredOpSchema,
  MockFinishedOpSchema,
  SessionStartedOpSchema,
  SessionEndedOpSchema,
  SessionDeletedOpSchema,
  SnapshotMergeOpSchema,
]);
export type Op = z.infer<typeof OpSchema>;
export type OpType = Op['type'];

/** Everything the server keeps for one learner, in the shape the device stores it. */
export const SnapshotSchema = z.object({
  settings: SettingsDocSchema,
  lessons: LessonDocsSchema,
  exercises: ExerciseDocsSchema,
  journal: ProblemDocsSchema,
  review: ReviewDocsSchema,
  notes: NoteDocsSchema,
  bookmarks: BookmarkDocsSchema,
  highlights: HighlightDocsSchema,
  reflections: ReflectionDocsSchema,
  mistakes: MistakeDocsSchema,
  readiness: ReadinessDocSchema,
  checkpoints: z.record(z.string(), CheckpointResultSchema),
  mocks: z.record(z.string(), MockResultSchema),
  sessions: StudySessionDocsSchema,
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

export const EMPTY_SNAPSHOT: Snapshot = {
  settings: EMPTY_SETTINGS_DOC,
  lessons: {},
  exercises: EMPTY_EXERCISE_DOCS,
  journal: {},
  review: {},
  notes: {},
  bookmarks: {},
  highlights: {},
  reflections: {},
  mistakes: {},
  readiness: { at: 0, items: {}, evidence: [] },
  checkpoints: {},
  mocks: {},
  sessions: {},
};

export const MAX_OPS_PER_REQUEST = 100;
/** Each op is validated on its own, so one bad op cannot block the rest of the outbox. */
export const SyncRequestSchema = z.object({
  ops: z.array(z.unknown()).check(z.minLength(1), z.maxLength(MAX_OPS_PER_REQUEST)),
});

export type OpStatus = 'applied' | 'duplicate' | 'rejected';
export interface OpResult {
  opId: string;
  status: OpStatus;
  reason?: string;
}
export interface SyncResponse {
  results: OpResult[];
  snapshot: Snapshot;
}

// Part names and record ids: the server stores one document per part record (user id + record id), so the
// sync path only rewrites the records an operation actually changed.

export const SNAPSHOT_PARTS = [
  'settings',
  'lessons',
  'exercises',
  'journal',
  'review',
  'notes',
  'bookmarks',
  'highlights',
  'reflections',
  'mistakes',
  'readiness',
  'checkpoints',
  'mocks',
  'sessions',
] as const;
export type SnapshotPartName = (typeof SNAPSHOT_PARTS)[number];

export interface PartDiff {
  upserts: Partial<Record<SnapshotPartName, Record<string, unknown>>>;
  deletes: Partial<Record<SnapshotPartName, string[]>>;
}

const DOC_ID = 'doc';

function partRecords(part: SnapshotPartName, snapshot: Snapshot): Record<string, unknown> {
  const value: unknown = snapshot[part];
  if (part === 'settings' || part === 'readiness') return { [DOC_ID]: value };
  return (value ?? {}) as Record<string, unknown>;
}

/** Compares two snapshots record by record; unchanged records keep their reference when no rule moved them. */
export function diffParts(before: Snapshot, after: Snapshot): PartDiff {
  const upserts: PartDiff['upserts'] = {};
  const deletes: PartDiff['deletes'] = {};
  for (const part of SNAPSHOT_PARTS) {
    const a = partRecords(part, before);
    const b = partRecords(part, after);
    const ids = new Set([...Object.keys(a), ...Object.keys(b)]);
    const up: Record<string, unknown> = {};
    const gone: string[] = [];
    for (const id of ids) {
      if (!(id in b)) {
        gone.push(id);
        continue;
      }
      const next = b[id];
      if (a[id] === next) continue;
      if (a[id] !== undefined && sameJson(a[id], next)) continue;
      up[id] = next;
    }
    if (Object.keys(up).length) upserts[part] = up;
    if (gone.length) deletes[part] = gone;
  }
  return { upserts, deletes };
}

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

// ---- the reducer

/** Applies one operation. Returns null when the operation is not valid for these documents. */
export function applyOp(snapshot: Snapshot, op: Op): Snapshot | null {
  switch (op.type) {
    case 'settings.set': {
      const value = parseSettingValue(op.payload.key, op.payload.value);
      if (value === undefined) return null;
      return { ...snapshot, settings: setSetting(snapshot.settings, op.payload.key, value, op.at) };
    }

    case 'lesson.unit-done':
      return {
        ...snapshot,
        lessons: lessonUnitDone(snapshot.lessons, {
          lesson: op.payload.lesson,
          unit: op.payload.unit,
          at: op.at,
        }),
      };

    case 'lesson.ready-checked':
      return {
        ...snapshot,
        lessons: lessonReadyChecked(snapshot.lessons, {
          lesson: op.payload.lesson,
          item: op.payload.item,
          at: op.at,
        }),
      };

    case 'lesson.self-check':
      return {
        ...snapshot,
        lessons: lessonSelfCheck(snapshot.lessons, {
          lesson: op.payload.lesson,
          at: op.at,
          on: op.payload.on,
        }),
      };

    case 'lesson.completed':
      return {
        ...snapshot,
        lessons: lessonCompleted(snapshot.lessons, {
          lesson: op.payload.lesson,
          at: op.at,
          complete: op.payload.complete,
        }),
      };

    case 'lesson.resumed': {
      const resume: ResumePoint = op.payload.resume;
      return {
        ...snapshot,
        lessons: lessonResumed(snapshot.lessons, { lesson: op.payload.lesson, at: op.at, resume }),
      };
    }

    case 'lesson.time-added':
      return {
        ...snapshot,
        lessons: lessonTimeAdded(snapshot.lessons, {
          lesson: op.payload.lesson,
          at: op.at,
          seconds: op.payload.seconds,
        }),
      };

    case 'exercise.checked': {
      const exercises = withExerciseEvent(snapshot.exercises, op.payload.slug, (r) =>
        exerciseChecked(r, { ev: op.payload.ev, at: op.at, ok: op.payload.ok, mine: op.payload.mine }),
      );
      return exercises === null ? null : updateExerciseReview(snapshot, exercises, op.payload.slug, op.at);
    }

    case 'exercise.hinted': {
      const exercises = withExerciseEvent(snapshot.exercises, op.payload.slug, (r) =>
        exerciseHinted(r, { ev: op.payload.ev, at: op.at, rung: op.payload.rung }),
      );
      return exercises === null ? null : updateExerciseReview(snapshot, exercises, op.payload.slug, op.at);
    }

    case 'exercise.revealed': {
      const exercises = withExerciseEvent(snapshot.exercises, op.payload.slug, (r) =>
        exerciseRevealed(r, { ev: op.payload.ev, at: op.at }),
      );
      return exercises === null ? null : updateExerciseReview(snapshot, exercises, op.payload.slug, op.at);
    }

    case 'exercise.drafted': {
      const slug = op.payload.slug;
      const prev = snapshot.exercises[slug] ?? EMPTY_EXERCISE_RECORD;
      const next = exerciseDrafted(prev, { at: op.at, slot: op.payload.slot, value: op.payload.value });
      return { ...snapshot, exercises: { ...snapshot.exercises, [slug]: next } };
    }

    case 'exercise.stage-noted': {
      const slug = op.payload.slug;
      const prev = snapshot.exercises[slug] ?? EMPTY_EXERCISE_RECORD;
      const next = exerciseStageNoted(prev, { at: op.at, stage: op.payload.stage, value: op.payload.value });
      return { ...snapshot, exercises: { ...snapshot.exercises, [slug]: next } };
    }

    case 'exercise.custom-tests': {
      const slug = op.payload.slug;
      const prev = snapshot.exercises[slug] ?? EMPTY_EXERCISE_RECORD;
      const next = exerciseCustomTests(prev, { at: op.at, tests: op.payload.tests });
      return { ...snapshot, exercises: { ...snapshot.exercises, [slug]: next } };
    }

    case 'exercise.work-cleared': {
      const slug = op.payload.slug;
      const prev = snapshot.exercises[slug] ?? EMPTY_EXERCISE_RECORD;
      const next = exerciseWorkCleared(prev, { at: op.at });
      return { ...snapshot, exercises: { ...snapshot.exercises, [slug]: next } };
    }

    case 'journal.attempt': {
      const { num } = op.payload;
      const prev = snapshot.journal[num] ?? emptyProblemRecord();
      const next = applyAttempt(prev, op.payload.attempt, op.at);
      const journal = { ...snapshot.journal, [num]: next };
      return withJournalReviewItem({ ...snapshot, journal }, num, journal, op.at);
    }

    case 'journal.notes': {
      const { num } = op.payload;
      const prev = snapshot.journal[num] ?? emptyProblemRecord();
      const next = journalNotesSet(prev, { at: op.at, notes: op.payload.notes });
      if (!next) return snapshot;
      return { ...snapshot, journal: { ...snapshot.journal, [num]: next } };
    }

    case 'journal.status': {
      const { num } = op.payload;
      const prev = snapshot.journal[num] ?? emptyProblemRecord();
      const next = journalStatusSet(prev, { at: op.at, status: op.payload.status });
      if (!next) return snapshot;
      return withJournalReviewItem(
        { ...snapshot, journal: { ...snapshot.journal, [num]: next } },
        num,
        { [num]: next },
        op.at,
      );
    }

    case 'journal.quick-solve': {
      const { num } = op.payload;
      const prev = snapshot.journal[num] ?? emptyProblemRecord();
      const next = journalQuickResolved(prev, { at: op.at, failed: op.payload.failed });
      return withJournalReviewItem(
        { ...snapshot, journal: { ...snapshot.journal, [num]: next } },
        num,
        { [num]: next },
        op.at,
      );
    }

    case 'review.fsrs-reviewed': {
      const key = reviewItemKey(op.payload.itemType, op.payload.itemSlug);
      const prev = snapshot.review[key];
      const source = op.payload.source ?? prev?.source;
      const start =
        prev && prev.scheduler === 'fsrs'
          ? prev
          : newFsrsItem(op.payload.itemType as 'flashcard' | 'exercise' | 'drill', op.payload.itemSlug, {
              at: op.at,
              ...(source ? { source } : {}),
            });
      const next = fsrsReviewed(start, { at: op.at, rating: op.payload.rating as ReviewRating });
      const review = { ...snapshot.review, [key]: next };
      return { ...snapshot, review };
    }

    case 'review.problem-opened': {
      const { num } = op.payload;
      const key = reviewItemKey('problem', num);
      // Only opens what is not there yet: the journal's own schedule stays the source of truth.
      if (snapshot.review[key]) return snapshot;
      const review = {
        ...snapshot.review,
        [key]: intervalItem(num, {
          at: op.at,
          due: op.at,
          ...(op.payload.source ? { source: op.payload.source } : {}),
        }),
      };
      return { ...snapshot, review };
    }

    case 'note.set': {
      const p = op.payload;
      const prev = snapshot.notes[p.id];
      const note: NoteDoc = {
        id: p.id,
        at: op.at,
        createdAt: p.createdAt,
        target: p.target,
        body: p.body,
      };
      if (prev && prev.body === note.body && sameJson(prev.target, note.target)) return snapshot;
      return { ...snapshot, notes: { ...snapshot.notes, [p.id]: note } };
    }

    case 'note.deleted': {
      const id = op.payload.id;
      if (!snapshot.notes[id]) return snapshot;
      const notes = { ...snapshot.notes };
      delete notes[id];
      return { ...snapshot, notes };
    }

    case 'bookmark.toggled': {
      const key = bookmarkKey(op.payload.target);
      const bookmarks = { ...snapshot.bookmarks };
      if (bookmarks[key]) delete bookmarks[key];
      else bookmarks[key] = { at: op.at, target: op.payload.target };
      return { ...snapshot, bookmarks };
    }

    case 'highlight.toggled': {
      const doc = { at: op.at, target: op.payload.target, quote: op.payload.quote };
      const key = highlightKey(doc);
      const highlights = { ...snapshot.highlights };
      if (highlights[key]) delete highlights[key];
      else highlights[key] = doc;
      return { ...snapshot, highlights };
    }

    case 'reflection.set': {
      const p = op.payload;
      const prev = snapshot.reflections[p.module];
      const reflection = {
        at: op.at,
        module: p.module,
        createdAt: p.createdAt ?? op.at,
        answers: p.answers,
        scorecard: p.scorecard,
      };
      if (prev && sameJson(prev, reflection)) return snapshot;
      return { ...snapshot, reflections: { ...snapshot.reflections, [p.module]: reflection } };
    }

    case 'mistake.logged': {
      const p = op.payload;
      if (snapshot.mistakes[p.id]) return snapshot;
      const mistake = {
        id: p.id,
        at: op.at,
        code: p.code,
        source: p.source,
        ...(p.note ? { note: p.note } : {}),
      };
      return { ...snapshot, mistakes: { ...snapshot.mistakes, [p.id]: mistake } };
    }

    case 'mistake.deleted': {
      const id = op.payload.id;
      if (!snapshot.mistakes[id]) return snapshot;
      const mistakes = { ...snapshot.mistakes };
      delete mistakes[id];
      return { ...snapshot, mistakes };
    }

    case 'readiness.toggled': {
      const id = op.payload.id;
      const items = { ...snapshot.readiness.items };
      if (items[id]) delete items[id];
      else items[id] = op.at;
      return { ...snapshot, readiness: { ...snapshot.readiness, items, at: op.at } };
    }

    case 'readiness.evidence': {
      const evidence = [...new Set([...snapshot.readiness.evidence, ...op.payload.ids])].slice(0, 10);
      if (sameJson(evidence, snapshot.readiness.evidence)) return snapshot;
      return { ...snapshot, readiness: { ...snapshot.readiness, evidence, at: op.at } };
    }

    case 'checkpoint.started': {
      const slug = op.payload.slug;
      const prev = snapshot.checkpoints[slug];
      if (prev?.startedAt) return snapshot;
      return {
        ...snapshot,
        checkpoints: {
          ...snapshot.checkpoints,
          [slug]: prev ? { ...prev, startedAt: op.at, at: op.at } : emptyCheckpoint(slug, op.at),
        },
      };
    }

    case 'checkpoint.scored': {
      const slug = op.payload.slug;
      const prev = snapshot.checkpoints[slug] ?? emptyCheckpoint(slug, op.at);
      const problems = upsertProblem(prev.problems, op.payload.problem);
      return {
        ...snapshot,
        checkpoints: { ...snapshot.checkpoints, [slug]: { ...prev, at: op.at, problems } },
      };
    }

    case 'checkpoint.finished': {
      const slug = op.payload.slug;
      const prev = snapshot.checkpoints[slug] ?? emptyCheckpoint(slug, op.at);
      if (prev.finishedAt) return snapshot;
      return {
        ...snapshot,
        checkpoints: {
          ...snapshot.checkpoints,
          [slug]: { ...prev, at: op.at, finishedAt: op.at, startedAt: prev.startedAt ?? op.at },
        },
      };
    }

    case 'checkpoint.notes': {
      const slug = op.payload.slug;
      const prev = snapshot.checkpoints[slug] ?? emptyCheckpoint(slug, op.at);
      if (prev.notes === op.payload.notes) return snapshot;
      return {
        ...snapshot,
        checkpoints: { ...snapshot.checkpoints, [slug]: { ...prev, at: op.at, notes: op.payload.notes } },
      };
    }

    case 'mock.started': {
      const slug = op.payload.slug;
      const prev = snapshot.mocks[slug];
      if (prev?.startedAt) return snapshot;
      return {
        ...snapshot,
        mocks: {
          ...snapshot.mocks,
          [slug]: prev
            ? { ...prev, startedAt: op.at, at: op.at }
            : { at: op.at, slug, startedAt: op.at, scores: [0, 0, 0, 0, 0] },
        },
      };
    }

    case 'mock.scored': {
      const slug = op.payload.slug;
      const prev = snapshot.mocks[slug] ?? emptyMock(slug, op.at);
      const scores = zeroPad(op.payload.scores, 5);
      if (sameJson(prev.scores, scores)) return snapshot;
      return { ...snapshot, mocks: { ...snapshot.mocks, [slug]: { ...prev, at: op.at, scores } } };
    }

    case 'mock.finished': {
      const slug = op.payload.slug;
      const prev = snapshot.mocks[slug] ?? emptyMock(slug, op.at);
      const feedback = op.payload.feedback ?? prev.feedback;
      if (prev.finishedAt && sameJson(prev.feedback, feedback)) return snapshot;
      return {
        ...snapshot,
        mocks: {
          ...snapshot.mocks,
          [slug]: {
            ...prev,
            at: op.at,
            finishedAt: op.at,
            startedAt: prev.startedAt ?? op.at,
            ...(feedback ? { feedback } : {}),
          },
        },
      };
    }

    case 'session.started': {
      const p = op.payload;
      if (snapshot.sessions[p.id]) return snapshot;
      const session = {
        id: p.id,
        at: op.at,
        startedAt: op.at,
        plannedMinutes: p.plannedMinutes,
        items: p.items,
      };
      return { ...snapshot, sessions: { ...snapshot.sessions, [p.id]: session } };
    }

    case 'session.ended': {
      const p = op.payload;
      const prev = snapshot.sessions[p.id];
      if (prev)
        return {
          ...snapshot,
          sessions: { ...snapshot.sessions, [p.id]: { ...prev, at: op.at, endedAt: op.at, items: p.items } },
        };
      const session = {
        id: p.id,
        at: op.at,
        startedAt: op.at,
        endedAt: op.at,
        plannedMinutes: 0,
        items: p.items,
      };
      return { ...snapshot, sessions: { ...snapshot.sessions, [p.id]: session } };
    }

    case 'session.deleted': {
      const id = op.payload.id;
      if (!snapshot.sessions[id]) return snapshot;
      const sessions = { ...snapshot.sessions };
      delete sessions[id];
      return { ...snapshot, sessions };
    }

    case 'snapshot.merge': {
      const p = op.payload;
      if (MergePartKeys.every((k) => p[k] === undefined)) return null;
      return {
        ...snapshot,
        settings: p.settings ? mergeSettings(snapshot.settings, p.settings) : snapshot.settings,
        lessons: p.lessons ? mergeLessonsPart(snapshot.lessons, p.lessons) : snapshot.lessons,
        exercises: p.exercises ? mergeExercisesPart(snapshot.exercises, p.exercises) : snapshot.exercises,
        journal: p.journal ? mergeJournalPart(snapshot.journal, p.journal) : snapshot.journal,
        review: p.review ? mergeReviewPart(snapshot.review, p.review) : snapshot.review,
        notes: p.notes ? mergeNotesPart(snapshot.notes, p.notes) : snapshot.notes,
        bookmarks: p.bookmarks ? mergeBookmarksPart(snapshot.bookmarks, p.bookmarks) : snapshot.bookmarks,
        highlights: p.highlights
          ? mergeHighlightsPart(snapshot.highlights, p.highlights)
          : snapshot.highlights,
        reflections: p.reflections
          ? mergeReflectionsPart(snapshot.reflections, p.reflections)
          : snapshot.reflections,
        mistakes: p.mistakes ? mergeMistakesPart(snapshot.mistakes, p.mistakes) : snapshot.mistakes,
        readiness: p.readiness ? mergeReadiness(snapshot.readiness, p.readiness) : snapshot.readiness,
        checkpoints: p.checkpoints
          ? mergeCheckpointsPart(snapshot.checkpoints, p.checkpoints)
          : snapshot.checkpoints,
        mocks: p.mocks ? mergeMocksPart(snapshot.mocks, p.mocks) : snapshot.mocks,
        sessions: p.sessions ? mergeSessionsPart(snapshot.sessions, p.sessions) : snapshot.sessions,
      };
    }
  }
}

const MergePartKeys = [
  'lessons',
  'exercises',
  'journal',
  'review',
  'notes',
  'bookmarks',
  'highlights',
  'reflections',
  'mistakes',
  'readiness',
  'checkpoints',
  'mocks',
  'sessions',
  'settings',
] as const;

// ---- small helpers shared by the reducer

const emptyProblemRecord = (): ProblemRecord => ({
  at: 0,
  status: 'not-started',
  attempts: [],
  notes: {},
  cleanResolves: 0,
  resolvedAts: [],
});

const emptyCheckpoint = (slug: string, at: number): CheckpointResult => ({
  at,
  slug,
  startedAt: at,
  problems: [],
});

const emptyMock = (slug: string, at: number): MockResult => ({
  at,
  slug,
  startedAt: at,
  scores: [0, 0, 0, 0, 0],
});

const zeroPad = (scores: number[], length: number): number[] =>
  Array.from({ length }, (_, i) => scores[i] ?? 0);

function upsertProblem(problems: CheckpointProblem[], next: CheckpointProblem): CheckpointProblem[] {
  const i = problems.findIndex((p) => p.key === next.key);
  if (i === -1) return [...problems, next];
  const out = [...problems];
  out[i] = next;
  return out;
}

/** Runs one event rule over the exercise and returns the changed part, or null when the payload is unusable. */
function withExerciseEvent(
  docs: ExerciseDocs,
  slug: string,
  rule: (r: ExerciseRecord) => ExerciseRecord | null,
): ExerciseDocs | null {
  const prev = docs[slug] ?? EMPTY_EXERCISE_RECORD;
  const next = rule(prev);
  const changed = next ?? prev;
  if (changed === prev) return null;
  return { ...docs, [slug]: changed };
}

/** Every exercise event also moves the exercise's review item (plan §9.2): the outcome maps to a rating. */
function updateExerciseReview(
  snapshot: Snapshot,
  exercises: ExerciseDocs,
  slug: string,
  at: number,
): Snapshot {
  const record = exercises[slug];
  if (!record) return snapshot;
  const key = reviewItemKey('exercise', slug);
  const prev = snapshot.review[key];
  const source = prev?.source;
  const start =
    prev && prev.scheduler === 'fsrs'
      ? prev
      : newFsrsItem('exercise', slug, { at, ...(source ? { source } : {}) });
  const next = fsrsReviewed(start, { at, rating: outcomeRating(record) });
  return { ...snapshot, exercises, review: { ...snapshot.review, [key]: next } };
}

function outcomeRating(r: ExerciseRecord): ReviewRating {
  const o = exerciseOutcome(r);
  if (o === 'viewed' || o === 'none') return 1;
  if (o === 'with-effort') return 2;
  return 3;
}

/** After a journal event, the problem's queue item mirrors the rule's next "ready to re-solve". */
function withJournalReviewItem(snapshot: Snapshot, num: string, journal: ProblemDocs, at: number): Snapshot {
  const record = journal[num];
  if (!record) return snapshot;
  const key = reviewItemKey('problem', num);
  const review = { ...snapshot.review };
  if (record.mastered || record.nextResolveAt === undefined) {
    if (review[key]?.scheduler === 'interval') delete review[key];
    return { ...snapshot, review };
  }
  return {
    ...snapshot,
    review: { ...review, [key]: intervalItem(num, { at, due: record.nextResolveAt, source: 'journal' }) },
  };
}

function applyAttempt(prev: ProblemRecord, attempt: JournalAttempt, at: number): ProblemRecord {
  void at;
  return journalAttemptLogged(prev, attempt);
}

/** Re-applies operations the server has not acknowledged yet on top of the server's documents. */
export function rebase(server: Snapshot, pending: readonly Op[]): Snapshot {
  return pending.reduce((acc, op) => applyOp(acc, op) ?? acc, server);
}

export function settingsOp<K extends SettingsKey>(
  key: K,
  value: SettingsValues[K],
  at: number,
  deviceId: string,
  opId: string,
): Extract<Op, { type: 'settings.set' }> {
  return { opId, at, deviceId, type: 'settings.set', payload: { key, value } };
}

/**
 * Builds one operation with its device context. Keeping the construction in one place keeps every call site
 * short and the op types checked against the union.
 */
export interface OpContext {
  deviceId: string;
  at?: number;
  opId?: string;
}

export function makeOp<T extends OpType>(
  type: T,
  payload: Extract<Op, { type: T }>['payload'],
  ctx: OpContext,
): Extract<Op, { type: T }> {
  const op = {
    opId: ctx.opId ?? crypto.randomUUID(),
    at: ctx.at ?? Date.now(),
    deviceId: ctx.deviceId,
    type,
    payload,
  };
  // The generic payload keeps the literal object wider than the one union member, so the cast goes via unknown.
  return op as unknown as Extract<Op, { type: T }>;
}
