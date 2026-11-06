import { describe, expect, it } from 'vitest';
import {
  mergeBookmarksPart,
  mergeCheckpointsPart,
  mergeExercisesPart,
  mergeHighlightsPart,
  mergeJournalPart,
  mergeLessonsPart,
  mergeMistakesPart,
  mergeMocksPart,
  mergeNotesPart,
  mergeReadiness,
  mergeReflectionsPart,
  mergeReviewPart,
  mergeSessionsPart,
} from '@/lib/domain/merge';
import { EMPTY_EXERCISE_RECORD, checked } from '@/lib/domain/exercises';
import { fsrsItem } from '@/lib/domain/review';
import type { LessonDocs } from '@/lib/domain/lessons';
import type { ProblemDocs } from '@/lib/domain/journal';
import type { NoteDoc } from '@/lib/domain/notes';
import type { StudySessionDocs } from '@/lib/domain/study-log';

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;

describe('part merges (D-014)', () => {
  it('lessons: unit ticks union, the later copy wins the scalar fields', () => {
    const a: LessonDocs = {
      'm1/l1': {
        at: T0,
        startedAt: T0,
        units: { u1: T0 },
        ready: { r1: T0 },
        selfCheck: T0,
        completedAt: T0,
        timeSpentSec: 100,
      },
    };
    const b: LessonDocs = {
      'm1/l1': {
        at: T0 + DAY,
        startedAt: T0 + 1,
        units: { u2: T0 + DAY },
        ready: {},
        completedAt: undefined,
        timeSpentSec: 50,
      },
    };
    const one = mergeLessonsPart(a, b);
    const two = mergeLessonsPart(b, a);
    expect(one).toEqual(two);
    expect(one['m1/l1']?.units).toEqual({ u1: T0, u2: T0 + DAY });
    expect(mergeLessonsPart(one, b)).toEqual(one); // idempotent
  });

  it('exercises: counters add across devices through the deduped history, sticky flags never revert', () => {
    const a = { 'm1/l1/x': { ...checked(EMPTY_EXERCISE_RECORD, { ev: 'a1', at: T0, ok: false }) } };
    const b = {
      'm1/l1/x': { ...checked(EMPTY_EXERCISE_RECORD, { ev: 'b1', at: T0 + 1, ok: true }), revealed: true },
    };
    const one = mergeExercisesPart(a, b);
    const two = mergeExercisesPart(b, a);
    expect(one['m1/l1/x']?.attempts).toBe(2); // both devices' events, deduped by id
    expect(one['m1/l1/x']?.wrong).toBe(1); // only a1 was wrong
    expect(one['m1/l1/x']?.solved).toBe(true);
    expect(one['m1/l1/x']?.revealed).toBe(true);
    expect(one['m1/l1/x']?.history.map((h) => h.ev).sort()).toEqual(['a1', 'b1']);
    expect(one).toEqual(two);
    expect(mergeExercisesPart(one, b)).toEqual(one);
  });

  it('journal: resolvedAts decide mastery the same from either device', () => {
    const mastered: ProblemDocs = {
      '12': {
        at: T0,
        status: 'independent',
        attempts: [],
        notes: {},
        cleanResolves: 3,
        resolvedAts: [T0, T0 + 7 * DAY + 1, T0 + 14 * DAY + 2],
        mastered: true,
      },
    };
    const other: ProblemDocs = {
      '13': {
        at: T0 + DAY,
        status: 'needs-revision',
        attempts: [],
        notes: {},
        cleanResolves: 0,
        resolvedAts: [],
        nextResolveAt: T0 + DAY + 2 * DAY,
        mastered: false,
      },
    };
    const one = mergeJournalPart(mastered, other);
    const two = mergeJournalPart(other, mastered);
    expect(one).toEqual(two);
    expect(one['12']?.mastered).toBe(true);
    expect(one['12']?.status).toBe('independent');
    expect(one['13']?.status).toBe('needs-revision');
    expect(mergeJournalPart(one, other)).toEqual(one);
  });

  it('review: the later change wins and merging is symmetric', () => {
    const item = fsrsItem('flashcard', 'f', { at: T0 });
    const later = { ...item, at: T0 + 100, reps: 2 };
    expect(mergeReviewPart({ 'flashcard:f': item }, { 'flashcard:f': later })).toEqual(
      mergeReviewPart({ 'flashcard:f': later }, { 'flashcard:f': item }),
    );
    expect(mergeReviewPart({ 'flashcard:f': later }, { 'flashcard:f': later })).toEqual({
      'flashcard:f': later,
    });
  });

  it('notes: the later edit of the same note wins', () => {
    const doc = (at: number, body: string): NoteDoc => ({
      id: 'note-0001',
      at,
      createdAt: T0,
      target: { type: 'lesson', slug: 's' },
      body,
    });
    const one = mergeNotesPart({ 'note-0001': doc(T0, 'old') }, { 'note-0001': doc(T0 + 5, 'new') });
    expect(one['note-0001']?.body).toBe('new');
    expect(mergeNotesPart({ 'note-0001': doc(T0 + 5, 'new') }, { 'note-0001': doc(T0, 'old') })).toEqual(one);
  });

  it('bookmarks: present on either side stays, the timestamp keeps the later', () => {
    const doc = (slug: string, at: number) => ({ at, target: { type: 'handbook' as const, slug } });
    expect(Object.keys(mergeBookmarksPart({ 'handbook:p1': doc('p1', T0) }, {}))).toContain('handbook:p1');
    const kept = mergeBookmarksPart({ 'handbook:p1': doc('p1', T0 + 9) }, { 'handbook:p1': doc('p1', T0) });
    expect(kept['handbook:p1']?.at).toBe(T0 + 9);
    const both = mergeBookmarksPart({ 'handbook:p1': doc('p1', T0) }, { 'handbook:p2': doc('p2', T0 + 1) });
    expect(Object.keys(both).sort()).toEqual(['handbook:p1', 'handbook:p2']);
  });

  it('highlights: the same quote collapses onto its key', () => {
    const doc = (at: number) => ({
      at,
      target: { type: 'lesson' as const, slug: 'm1/l1', blockId: 'b1' },
      quote: { exact: 'two pointers meet', prefix: 'when' },
    });
    const one = mergeHighlightsPart({}, { 'm1/l1|b1|two pointers meet': doc(T0) });
    const two = mergeHighlightsPart(one, { other: doc(T0 + 1) });
    expect(Object.keys(two)).toHaveLength(1);
  });

  it('reflections and mistakes: the later change wins per module and id', () => {
    const mk = (at: number) => ({
      at,
      module: 'm1',
      createdAt: T0,
      answers: { went: `answer ${at}` },
      scorecard: {},
    });
    const one = mergeReflectionsPart({ m1: mk(T0) }, { m1: mk(T0 + 3) });
    expect(one.m1).toEqual(mk(T0 + 3));
    expect(mergeReflectionsPart({ m1: mk(T0 + 3) }, { m1: mk(T0) })).toEqual(one);
    const mistake = (at: number) => ({
      id: 'mistake-01',
      at,
      code: 'P' as const,
      source: { type: 'problem', slug: '12' },
    });
    expect(
      mergeMistakesPart({ 'mistake-01': mistake(T0) }, { 'mistake-01': mistake(T0 + 2) })['mistake-01']?.at,
    ).toBe(T0 + 2);
  });

  it('readiness: items keep the earliest tick, evidence unions', () => {
    const one = mergeReadiness(
      { at: T0, items: { a: 5, b: 9 }, evidence: ['e1'] },
      { at: T0 + 1, items: { a: 3 }, evidence: ['e2'] },
    );
    expect(one.items).toEqual({ a: 3, b: 9 });
    expect(one.evidence).toEqual(['e1', 'e2']);
    expect(one.at).toBe(T0 + 1);
    expect(mergeReadiness(one, { at: T0 + 1, items: { a: 3 }, evidence: ['e2'] })).toEqual(one);
  });

  it('checkpoints: rows merge from the later copy, startedAt keeps the earlier', () => {
    const result = (at: number, started: boolean, withRow: boolean) => ({
      at,
      slug: 'm1/cp',
      ...(started ? { startedAt: at } : {}),
      ...(withRow
        ? {
            problems: [{ key: 'cold', unseen: false, nums: ['1'], scores: { correct: 4 }, mistakeCodes: [] }],
          }
        : { problems: [] }),
    });
    const one = mergeCheckpointsPart(
      { 'm1/cp': result(T0 + 100, false, false) },
      { 'm1/cp': result(T0, true, true) },
    );
    expect(one['m1/cp']?.startedAt).toBe(T0);
    expect(one['m1/cp']?.problems.map((p) => p.key)).toEqual(['cold']);
    expect(mergeCheckpointsPart(one, { 'm1/cp': result(T0, true, true) })).toEqual(one);
  });

  it('mocks and sessions: the later, richer record wins', () => {
    const mock = (at: number, scores: number[]) => ({
      at,
      slug: 'm2',
      ...(at ? { startedAt: at } : {}),
      scores,
    });
    // The fuller scoring survives, even when it came from the earlier copy.
    expect(mergeMocksPart({ m2: mock(T0, [1, 2]) }, { m2: mock(T0 + 5, [3]) }).m2.scores).toEqual([1, 2]);
    const sessionsA: StudySessionDocs = {
      s1: {
        id: 's1',
        at: T0,
        startedAt: T0,
        plannedMinutes: 30,
        items: [{ kind: 'unit', key: 'u1', planned: 10 }],
      },
    };
    const sessionsB: StudySessionDocs = {
      s1: {
        id: 's1',
        at: T0 + 100,
        startedAt: T0,
        plannedMinutes: 30,
        endedAt: T0 + 90,
        items: [
          { kind: 'unit', key: 'u1', planned: 10 },
          { kind: 'review', key: 'r', planned: 2 },
        ],
      },
    };
    const merged = mergeSessionsPart(sessionsA, sessionsB);
    expect(merged.s1.endedAt).toBe(T0 + 90);
    expect(merged.s1.items).toHaveLength(2);
    expect(mergeSessionsPart(merged, sessionsB)).toEqual(merged);
  });
});
