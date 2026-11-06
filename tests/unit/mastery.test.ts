import { describe, expect, it } from 'vitest';
import {
  MASTERY_LABEL,
  patternMastery,
  repairSession,
  weakestPatterns,
  type PatternMap,
} from '@/lib/domain/mastery';
import { EMPTY_EXERCISE_RECORD, checked, revealed } from '@/lib/domain/exercises';
import type { LessonDocs } from '@/lib/domain/lessons';
import type { ProblemDocs } from '@/lib/domain/journal';

const DAY = 86_400_000;
const T0 = 1_700_000_000_000;

const entry = {
  pattern: 'two-pointers',
  module: 'm1',
  lesson: 'm1/l1',
  writeUpUnit: 'u2',
  coreExercises: ['m1/l1/x1', 'm1/l1/x2'],
  exercises: [
    { slug: 'm1/l1/x0', type: 'mcq', core: false },
    { slug: 'm1/l1/x1', type: 'code', core: true },
    { slug: 'm1/l1/x2', type: 'fill', core: true },
  ],
  problems: ['3', '9'],
};

const map: PatternMap = { 'two-pointers': entry };

describe('patternMastery levels', () => {
  it('stays Not started without documents', () => {
    const m = patternMastery(entry, {}, {}, {});
    expect(m.level).toBe('not-started');
    expect(MASTERY_LABEL[m.level]).toBe('Not started');
  });

  it('Introduced when only the write-up unit is done; Practising once an exercise landed', () => {
    const lessons: LessonDocs = {
      'm1/l1': { at: T0, startedAt: T0, units: { u2: T0 }, ready: {} },
    };
    expect(patternMastery(entry, lessons, {}, {}).level).toBe('introduced');
    const solvedMcq = checked(EMPTY_EXERCISE_RECORD, { ev: 'e', at: T0, ok: true });
    const m = patternMastery(entry, lessons, { 'm1/l1/x0': solvedMcq }, {});
    expect(m.level).toBe('practising');
    expect(m.evidence.conceptFirstTry).toBe('m1/l1/x0');
    // A reveal without a solve adds a waiting item but does not raise the level.
    const revealedOnly = revealed(EMPTY_EXERCISE_RECORD, { ev: 'e2', at: T0 });
    const m2 = patternMastery(entry, lessons, { 'm1/l1/x0': revealedOnly }, {});
    expect(m2.level).toBe('introduced');
    expect(m2.evidence.revealedWaiting).toEqual(['m1/l1/x0']);
  });

  it('Proficient needs every core exercise clean plus one independent problem', () => {
    const lessons: LessonDocs = { 'm1/l1': { at: T0, startedAt: T0, units: { u2: T0 }, ready: {} } };
    const clean = (slug: string) => ({ ...checked(EMPTY_EXERCISE_RECORD, { ev: slug, at: T0, ok: true }) });
    const exercises = { 'm1/l1/x1': clean('x1'), 'm1/l1/x2': clean('x2') };
    const touchedOnly: ProblemDocs = {
      '3': { at: T0, status: 'attempted', attempts: [], notes: {}, cleanResolves: 0, resolvedAts: [] },
    };
    expect(patternMastery(entry, lessons, exercises, touchedOnly).level).toBe('practising');
    const independent: ProblemDocs = {
      '3': { ...touchedOnly['3'], status: 'independent' },
    };
    const m = patternMastery(entry, lessons, exercises, independent);
    expect(m.level).toBe('proficient');
    // A revealed-but-unsolved core exercise still blocks Proficient.
    const revealedCore = { ...exercises, 'm1/l1/x2': revealed(EMPTY_EXERCISE_RECORD, { ev: 'r', at: T0 }) };
    expect(patternMastery(entry, lessons, revealedCore, independent).level).toBe('practising');
  });

  it('Mastered takes one mastered problem and nothing revealed and waiting', () => {
    const lessons: LessonDocs = { 'm1/l1': { at: T0, startedAt: T0, units: { u2: T0 }, ready: {} } };
    const clean = checked(EMPTY_EXERCISE_RECORD, { ev: 'e', at: T0, ok: true });
    const exercises = { 'm1/l1/x1': clean, 'm1/l1/x2': clean };
    const journal: ProblemDocs = {
      // Three counted clean re-solves, each at least 7 days apart (the greedy rule).
      '3': {
        at: T0,
        status: 'independent',
        attempts: [],
        notes: {},
        cleanResolves: 3,
        resolvedAts: [T0, T0 + 7 * DAY + 1, T0 + 14 * DAY + 2],
        mastered: true,
      },
    };
    expect(patternMastery(entry, lessons, exercises, journal).level).toBe('mastered');
    const blocking = { ...exercises, 'm1/l1/x0': revealed(EMPTY_EXERCISE_RECORD, { ev: 'r', at: T0 }) };
    expect(patternMastery(entry, lessons, blocking, journal).level).toBe('proficient');
  });
});

describe('weakestPatterns and the repair session', () => {
  it('orders the weaker patterns first and skips those below the floor or mastered', () => {
    const lessons: LessonDocs = { 'm1/l1': { at: T0, startedAt: T0, units: { u2: T0 }, ready: {} } };
    const clean = checked(EMPTY_EXERCISE_RECORD, { ev: 'e', at: T0, ok: true });
    const exercises = {
      'm1/l1/x1': clean, // code core of both entries
      'm1/l1/x2': clean, // the second core, only entered by strong
    };
    const strongMap: PatternMap = {
      weak: { ...entry, pattern: 'weak', coreExercises: ['m1/l1/x1', 'm1/l1/ghost'] },
      strong: { ...entry, pattern: 'strong', problems: ['3'] },
    };
    const journal: ProblemDocs = {
      '3': { at: T0, status: 'independent', attempts: [], notes: {}, cleanResolves: 0, resolvedAts: [] },
    };
    const weak = weakestPatterns(strongMap, lessons, exercises, journal, 5);
    expect(weak.map((w) => w.pattern)).toEqual(['weak', 'strong']); // weaker first
    // At the proficient floor the practising pattern drops out.
    expect(
      weakestPatterns(strongMap, lessons, exercises, journal, 5, 'proficient').map((w) => w.pattern),
    ).toEqual(['strong']);
  });

  it('repairSession keeps only touched, non-mastered problems, capped at two', () => {
    const journal: ProblemDocs = {
      '3': {
        at: T0,
        status: 'independent',
        attempts: [],
        notes: {},
        cleanResolves: 0,
        resolvedAts: [],
      },
    };
    const list = repairSession(
      [{ pattern: 'two-pointers', level: 'practising', score: 0.4 }],
      map,
      journal,
      (p) => (p === 'two-pointers' ? ['d1', 'd2'] : []),
    );
    expect(list.patterns[0]).toEqual({ pattern: 'two-pointers', problems: ['3'], drills: ['d1', 'd2'] });
    // Untouched problems never enter the repair list; mastered ones are done.
    const masteredJournal: ProblemDocs = {
      '3': { ...journal['3'], mastered: true },
    };
    const empty = repairSession(
      [{ pattern: 'two-pointers', level: 'practising', score: 0.4 }],
      map,
      masteredJournal,
      () => [],
    );
    expect(empty.patterns[0].problems).toEqual([]);
  });
});
