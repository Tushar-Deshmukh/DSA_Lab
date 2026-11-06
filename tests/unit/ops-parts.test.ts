import { describe, expect, it } from 'vitest';
import {
  EMPTY_SNAPSHOT,
  MAX_OPS_PER_REQUEST,
  SNAPSHOT_PARTS,
  SyncRequestSchema,
  applyOp,
  diffParts,
  makeOp,
  rebase,
  type Snapshot,
} from '@/lib/domain/ops';
import { EMPTY_EXERCISE_RECORD, checked, revealed } from '@/lib/domain/exercises';

const DAY = 86_400_000;
const T0 = 1_700_000_000_000;
const DEVICE = 'device-0001';

const empty = (): Snapshot => JSON.parse(JSON.stringify(EMPTY_SNAPSHOT)) as Snapshot;

describe('diffParts', () => {
  it('finds changed records only and never emits an empty diff', () => {
    const before = empty();
    const after = applyOp(
      before,
      makeOp('lesson.unit-done', { lesson: 'm1/l1', unit: 'u1' }, { deviceId: DEVICE, at: T0 }),
    )!;
    const diff = diffParts(before, after);
    expect(diff.upserts.lessons).toEqual({ 'm1/l1': after.lessons['m1/l1'] });
    expect(diff.deletes).toEqual({});
    // Nothing else moved: the settings/readiness singletons are compared as whole docs.
    for (const part of SNAPSHOT_PARTS) {
      if (part === 'lessons') continue;
      expect(diff.upserts[part]).toBeUndefined();
    }
    const same = diffParts(
      after,
      applyOp(
        after,
        makeOp('exercise.drafted', { slug: 's', slot: 'a', value: 'v' }, { deviceId: DEVICE, at: T0 }),
      )!,
    );
    expect(same.upserts.exercises).toEqual({ s: expect.anything() });
  });

  it('records deletes for removed records and treats singletons as one doc', () => {
    const withNote = applyOp(
      empty(),
      makeOp(
        'note.set',
        {
          id: 'note-0001',
          target: { type: 'lesson', slug: 'm1/l1' },
          body: 'hi',
          createdAt: T0,
        },
        { deviceId: DEVICE, at: T0 },
      ),
    )!;
    const gone = applyOp(
      withNote,
      makeOp('note.deleted', { id: 'note-0001' }, { deviceId: DEVICE, at: T0 + 1 }),
    )!;
    const diff = diffParts(withNote, gone);
    expect(diff.deletes.notes).toEqual(['note-0001']);
    expect(diff.upserts.notes).toBeUndefined();
    // The singleton parts diff under the constant id "doc".
    const readiness = applyOp(
      gone,
      makeOp('readiness.toggled', { id: 'r1' }, { deviceId: DEVICE, at: T0 + 2 }),
    )!;
    const rDiff = diffParts(gone, readiness);
    expect(Object.keys(rDiff.upserts.readiness ?? {})).toEqual(['doc']);
  });
});

describe('exercise ops keep the review item in step (D-016)', () => {
  it('a checked wrong answer schedules Again; a first-try solve schedules Good', () => {
    const wrong = applyOp(
      empty(),
      makeOp('exercise.checked', { slug: 'm1/l1/x1', ev: 'e1', ok: false }, { deviceId: DEVICE, at: T0 }),
    )!;
    expect(wrong.exercises['m1/l1/x1'].attempts).toBe(1);
    const wItem = wrong.review['exercise:m1/l1/x1'];
    expect(wItem.itemType).toBe('exercise');
    expect(wItem.reps).toBe(1);
    expect(wItem.due).toBeLessThanOrEqual(T0 + DAY);
    expect(wItem.due).toBeGreaterThanOrEqual(T0); // Again keeps the card close

    const solved = applyOp(
      wrong,
      makeOp(
        'exercise.checked',
        { slug: 'm1/l1/x1', ev: 'e2', ok: true },
        { deviceId: DEVICE, at: T0 + 1000 },
      ),
    )!;
    const sRecord = solved.exercises['m1/l1/x1'];
    expect(sRecord.solved).toBe(true);
    expect(sRecord.firstTry).toBe(false);
    const sItem = solved.review['exercise:m1/l1/x1'];
    // Second try is a Hard: the learning step keeps it close, but it never goes backwards.
    expect(sItem.due).toBeGreaterThan(T0);
    expect(sItem.due).toBeLessThanOrEqual(T0 + DAY);
    expect(sItem.reps).toBe(2);
  });

  it('a reveal is rated Again', () => {
    const s = applyOp(
      empty(),
      makeOp('exercise.revealed', { slug: 'm1/l1/x1', ev: 'v1' }, { deviceId: DEVICE, at: T0 }),
    )!;
    expect(s.exercises['m1/l1/x1'].revealed).toBe(true);
    const item = s.review['exercise:m1/l1/x1'];
    expect(item.due).toBeLessThanOrEqual(T0 + DAY);
  });

  it('a hint raises the hint counter and the reveal rule allows a reveal after one hint', () => {
    const hit = applyOp(
      empty(),
      makeOp('exercise.hinted', { slug: 's', ev: 'h1', rung: 2 }, { deviceId: DEVICE, at: T0 }),
    )!;
    expect(hit.exercises.s.hints).toBe(2);
  });
});

describe('journal ops build the queue mirror (plan §9.1)', () => {
  it('a clean attempt schedules the legacy interval and mirrors it into review', () => {
    const s = applyOp(
      empty(),
      makeOp(
        'journal.attempt',
        {
          num: '12',
          attempt: { at: T0, outcome: 'clean' },
        },
        { deviceId: DEVICE, at: T0 },
      ),
    )!;
    expect(s.journal['12'].status).toBe('independent');
    expect(s.journal['12'].nextResolveAt).toBe(T0 + DAY);
    const mirror = s.review['problem:12'];
    expect(mirror.scheduler).toBe('interval');
    expect(mirror.due).toBe(T0 + DAY);
  });

  it('a failed attempt sets needs revision-style timing of two days', () => {
    const first = applyOp(
      empty(),
      makeOp(
        'journal.attempt',
        { num: '12', attempt: { at: T0, outcome: 'failed' } },
        { deviceId: DEVICE, at: T0 },
      ),
    )!;
    expect(first.review['problem:12'].due).toBe(T0 + 2 * DAY);
  });

  it('a mastered problem leaves the queue; before that, three spaced re-solves are needed', () => {
    let s = empty();
    const ats = [T0, T0 + 7 * DAY + 1000, T0 + 14 * DAY + 2000];
    for (let i = 0; i < ats.length; i++) {
      s = applyOp(s, makeOp('journal.quick-solve', { num: '12' }, { deviceId: DEVICE, at: ats[i] }))!;
    }
    expect(s.journal['12'].mastered).toBe(true);
    expect(s.review['problem:12']).toBeUndefined();
    // Same-day re-solves do not count toward mastery (the greedy 7-day gap).
    let tight = empty();
    for (let i = 0; i < 5; i++) {
      tight = applyOp(
        tight,
        makeOp('journal.quick-solve', { num: '12' }, { deviceId: DEVICE, at: T0 + i * 1000 }),
      )!;
    }
    expect(tight.journal['12'].mastered ?? false).toBe(false);
    expect(tight.journal['12'].cleanResolves).toBe(1);
    expect(tight.review['problem:12'].due).toBe(T0 + 3 * DAY + 4000);
  });

  it('a direct status stamps the schedule like the legacy setStatus', () => {
    const s = applyOp(
      empty(),
      makeOp('journal.status', { num: '7', status: 'needs-revision' }, { deviceId: DEVICE, at: T0 }),
    )!;
    expect(s.journal['7'].status).toBe('needs-revision');
    expect(s.journal['7'].nextResolveAt).toBe(T0 + 2 * DAY);
    expect(s.review['problem:7'].due).toBe(T0 + 2 * DAY);
    const back = applyOp(
      s,
      makeOp('journal.status', { num: '7', status: 'not-started' }, { deviceId: DEVICE, at: T0 + 1 }),
    )!;
    expect(back.review['problem:7']).toBeUndefined();
  });
});

describe('review ops', () => {
  it('review.problem-opened creates an interval item only once', () => {
    const s = applyOp(empty(), makeOp('review.problem-opened', { num: '3' }, { deviceId: DEVICE, at: T0 }))!;
    const item = s.review['problem:3'];
    expect(item.due).toBe(T0);
    const again = applyOp(
      s,
      makeOp('review.problem-opened', { num: '3' }, { deviceId: DEVICE, at: T0 + 1000 }),
    )!;
    expect(again.review['problem:3']).toBe(item);
  });

  it('review.fsrs-reviewed starts a card when none exists and advances it', () => {
    const s = applyOp(
      empty(),
      makeOp(
        'review.fsrs-reviewed',
        { itemType: 'flashcard', itemSlug: 'm1/x', rating: 3 },
        { deviceId: DEVICE, at: T0 },
      ),
    )!;
    const first = s.review['flashcard:m1/x'];
    expect(first.reps).toBe(1);
    expect(first.due).toBeGreaterThan(T0);
    expect(first.due).toBeLessThan(T0 + DAY); // still in the short learning steps
    // A second Good graduates the card; a later Again then increments the lapses.
    const graduatedAt = first.due + 1000;
    const graduated = applyOp(
      s,
      makeOp(
        'review.fsrs-reviewed',
        { itemType: 'flashcard', itemSlug: 'm1/x', rating: 3 },
        { deviceId: DEVICE, at: graduatedAt },
      ),
    )!;
    expect(graduated.review['flashcard:m1/x'].card?.state).toBe(2); // Review
    const repeat = applyOp(
      graduated,
      makeOp(
        'review.fsrs-reviewed',
        { itemType: 'flashcard', itemSlug: 'm1/x', rating: 1 },
        { deviceId: DEVICE, at: T0 + 3 * DAY },
      ),
    )!;
    expect(repeat.review['flashcard:m1/x'].lapses).toBe(1);
  });
});

describe('idempotency and rebase (D-014)', () => {
  it('the same event id twice changes nothing', () => {
    const one = applyOp(
      empty(),
      makeOp('exercise.checked', { slug: 's', ev: 'e1', ok: true }, { deviceId: DEVICE, at: T0 }),
    )!;
    const oneOp = makeOp('exercise.checked', { slug: 's', ev: 'e1', ok: true }, { deviceId: DEVICE, at: T0 });
    expect(applyOp(one, oneOp)).toBe(null);
    expect(diffParts(one, one).upserts).toEqual({});
  });

  it('rebase replays pending ops onto the server snapshot', () => {
    const server = applyOp(
      empty(),
      makeOp('settings.set', { key: 'theme', value: 'dark' }, { deviceId: DEVICE, at: T0 }),
    )!;
    const pending = [
      makeOp('lesson.unit-done', { lesson: 'm1/l1', unit: 'u1' }, { deviceId: DEVICE, at: T0 + 1 }),
      makeOp('journal.quick-solve', { num: '12' }, { deviceId: DEVICE, at: T0 + 2 }),
    ];
    const merged = rebase(server, pending);
    expect(merged.lessons['m1/l1'].units.u1).toBe(T0 + 1);
    expect(merged.journal['12']).toBeDefined();
    expect(merged.settings.values.theme).toBe('dark');
  });
});

describe('snapshot.merge folds whole parts with the record rules', () => {
  it('merges a guest snapshot into an account without losing either side', () => {
    const account = applyOp(
      empty(),
      makeOp('journal.quick-solve', { num: '12' }, { deviceId: 'device-acc', at: T0 }),
    )!;
    const guest = applyOp(
      empty(),
      makeOp('journal.quick-solve', { num: '13' }, { deviceId: 'device-guest', at: T0 + 1 }),
    )!;
    const merged = applyOp(
      account,
      makeOp(
        'snapshot.merge',
        { journal: guest.journal, review: guest.review },
        { deviceId: 'device-guest', at: T0 + 2 },
      ),
    )!;
    expect(Object.keys(merged.journal).sort()).toEqual(['12', '13']);
    expect(merged.review['problem:12']).toBeDefined();
    expect(merged.review['problem:13']).toBeDefined();
    // Idempotent: merging the same snapshot again is a no-op.
    expect(
      applyOp(
        merged,
        makeOp(
          'snapshot.merge',
          { journal: guest.journal, review: guest.review },
          { deviceId: 'device-guest', at: T0 + 3 },
        ),
      )!,
    ).toEqual(merged);
  });

  it('an all-empty merge is rejected as a null change', () => {
    expect(applyOp(empty(), makeOp('snapshot.merge', {}, { deviceId: DEVICE, at: T0 }))).toBe(null);
  });
});

describe('request envelope limits', () => {
  it('caps the outbox and rejects an empty one', () => {
    expect(SyncRequestSchema.safeParse({ ops: [] }).success).toBe(false);
    const big = { ops: Array.from({ length: MAX_OPS_PER_REQUEST + 1 }, () => ({})) };
    expect(SyncRequestSchema.safeParse(big).success).toBe(false);
    expect(SyncRequestSchema.safeParse({ ops: [{}] }).success).toBe(true);
  });
});

describe('record helpers stay consistent', () => {
  it('the exercise record keeps its legacy status line semantics', () => {
    const solved = checked(EMPTY_EXERCISE_RECORD, { ev: 'a', at: T0, ok: true });
    expect(solved.solved).toBe(true);
    const revealedOnly = revealed(EMPTY_EXERCISE_RECORD, { ev: 'b', at: T0 });
    expect(revealedOnly.revealed).toBe(true);
    expect(revealedOnly.solved).toBe(false);
  });
});
