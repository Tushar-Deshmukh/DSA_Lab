import { describe, expect, it } from 'vitest';
import {
  FLASHCARD_MINUTES,
  EXERCISE_MINUTES,
  ReviewItemSchema,
  emptyCard,
  fsrsItem,
  fsrsReviewed,
  intervalItem,
  mergeReviewDocs,
  moduleQuiz,
  ratingForOutcome,
  readyQueue,
  reviewItemKey,
  type ReviewDocs,
  type ReviewItem,
} from '@/lib/domain/review';
import { EMPTY_EXERCISE_RECORD, exerciseOutcome, checked, hinted, revealed } from '@/lib/domain/exercises';

const DAY = 86_400_000;
const T0 = 1_700_000_000_000;

describe('ratingForOutcome (D-016)', () => {
  it('maps viewed and none to Again, effort to Hard, first try to Good', () => {
    const solved = checked(EMPTY_EXERCISE_RECORD, { ev: 'e1', at: T0, ok: true });
    const afterHints = (() => {
      const h = hinted(EMPTY_EXERCISE_RECORD, { ev: 'e0', at: T0, rung: 1 });
      return checked(h, { ev: 'e1', at: T0 + 1, ok: true });
    })();
    expect(ratingForOutcome(exerciseOutcome(EMPTY_EXERCISE_RECORD))).toBe(1);
    expect(ratingForOutcome(exerciseOutcome(revealed(EMPTY_EXERCISE_RECORD, { ev: 'e2', at: T0 })))).toBe(1);
    expect(ratingForOutcome(exerciseOutcome(afterHints))).toBe(2);
    expect(ratingForOutcome(exerciseOutcome(solved))).toBe(3);
  });
});

describe('FSRS scheduling', () => {
  it('creates an item whose card starts empty and is due now', () => {
    const item = fsrsItem('flashcard', 'm/l/u', { at: T0 });
    const parsed = ReviewItemSchema.safeParse(item);
    expect(parsed.success).toBe(true);
    expect(item.reps).toBe(0);
    expect(item.due).toBe(T0);
    expect(item.scheduler).toBe('fsrs');
  });

  it('moves the due out on a Good but keeps it close on an Again', () => {
    const item = fsrsItem('exercise', 'm/l/x', { at: T0 });
    const good = fsrsReviewed(item, { at: T0, rating: 3 });
    expect(good.reps).toBe(1);
    // The first learning step is minutes, not days; it is still strictly later.
    expect(good.due).toBeGreaterThan(T0 + 60_000);
    expect(good.due).toBeLessThan(T0 + DAY);
    const again = fsrsReviewed(item, { at: T0, rating: 1 });
    // In the short learning steps an Again does not count a lapse; the card stays due within minutes.
    expect(again.lapses).toBe(0);
    expect(again.due).toBeGreaterThanOrEqual(T0);
    expect(again.due).toBeLessThanOrEqual(T0 + 0.5 * DAY);
    // Once the card has left the learning steps, an Again counts a lapse.
    const graduated = fsrsReviewed(good, { at: good.due, rating: 3 });
    const lapsed = fsrsReviewed(graduated, { at: T0 + 5 * DAY, rating: 1 });
    expect(lapsed.lapses).toBe(1);
    // The state is serialisable: a plain roundtrip through the schema keeps the review working.
    const stored = ReviewItemSchema.parse(good);
    expect(stored.card?.reps).toBe(1);
    const againLater = fsrsReviewed(ReviewItemSchema.parse(stored), { at: T0 + DAY, rating: 3 });
    expect(againLater.due).toBeGreaterThan(T0 + DAY);
  });
});

describe('interval items', () => {
  it('mirror the journal rule without a card', () => {
    const item = intervalItem('12', { at: T0, due: T0 + 3 * DAY, source: 'journal' });
    expect(item.scheduler).toBe('interval');
    expect(item.card).toBeUndefined();
    expect(item.itemType).toBe('problem');
    expect(item.due).toBe(T0 + 3 * DAY);
    expect(reviewItemKey('problem', '12')).toBe('problem:12');
  });
});

describe('the ready queue', () => {
  const est = (item: ReviewItem) =>
    item.itemType === 'flashcard' ? FLASHCARD_MINUTES : (EXERCISE_MINUTES[item.itemSlug] ?? 4);

  it('skips items that are not due yet and orders the rest by due', () => {
    const a = intervalItem('1', { at: T0, due: T0 - 100 });
    const b = intervalItem('2', { at: T0, due: T0 + 10 });
    const c = intervalItem('3', { at: T0, due: T0 - 50 });
    const docs: ReviewDocs = { 'problem:1': a, 'problem:2': b, 'problem:3': c };
    const queue = readyQueue(docs, T0 - 1, 60, est);
    expect(queue.map((q) => q.itemSlug)).toEqual(['1', '3']);
    // The item due "now" enters once the clock reaches it (the queue is never "overdue").
    const now = readyQueue(docs, T0, 60, est);
    expect(now.map((q) => q.itemSlug)).toEqual(['1', '3']);
    const later = readyQueue(docs, T0 + 10, 60, est);
    expect(later.map((q) => q.itemSlug)).toEqual(['1', '3', '2']);
  });

  it('is greedy: a long item is skipped without blocking later small items', () => {
    const big = { ...fsrsItem('flashcard', 'big', { at: T0 }), due: T0 - 10 };
    const small1 = intervalItem('s1', { at: T0, due: T0 - 5 });
    const small2 = intervalItem('s2', { at: T0, due: T0 - 4 });
    const estimate = (item: ReviewItem) => (item.itemSlug === 'big' ? 30 : 2);
    const queue = readyQueue(
      { 'flashcard:big': big, 'problem:s1': small1, 'problem:s2': small2 },
      T0,
      10,
      estimate,
    );
    expect(queue.map((q) => q.itemSlug)).toEqual(['s1', 's2']);
  });

  it('yields nothing when the cap is 0', () => {
    const a = intervalItem('1', { at: T0, due: T0 - 100 });
    expect(readyQueue({ 'problem:1': a }, T0, 0, est)).toEqual([]);
  });
});

describe('moduleQuiz (the legacy "review this module")', () => {
  const sources = [
    { slug: 'a', type: 'mcq' },
    { slug: 'b', type: 'fill' },
    { slug: 'c', type: 'code' },
    { slug: 'd', type: 'interview' },
  ];

  it('picks the missed exercises, most recently wrong first, four at most', () => {
    const records: Record<string, { attempts: number; firstTry?: boolean; revealed: boolean; at: number }> = {
      a: { attempts: 2, firstTry: false, revealed: false, at: T0 },
      b: { attempts: 1, firstTry: false, revealed: true, at: T0 + 5 },
    };
    expect(moduleQuiz(sources, records)).toEqual(['b', 'a']);
  });

  it('excludes code and interview exercises and untouched ones', () => {
    const records: Record<string, { attempts: number; firstTry?: boolean; revealed: boolean; at: number }> = {
      c: { attempts: 3, firstTry: false, revealed: false, at: T0 },
      a: { attempts: 1, firstTry: true, revealed: false, at: T0 + 9 },
    };
    expect(moduleQuiz(sources, records)).toEqual([]);
  });
});

describe('mergeReviewDocs (D-014)', () => {
  const base = fsrsItem('flashcard', 'f', { at: T0 });

  it('the later change wins, an exact tie goes to the larger reps', () => {
    const later = fsrsReviewed(base, { at: T0 + 100, rating: 2 });
    expect(mergeReviewDocs({ 'flashcard:f': base }, 'flashcard:f', later)['flashcard:f']).toBe(later);
    const back = mergeReviewDocs({ 'flashcard:f': later }, 'flashcard:f', base);
    expect(back['flashcard:f']).toBe(later);
    // A tie on `at` with different reps keeps the more-revised card.
    const moreReps = { ...base, reps: 3 };
    expect(mergeReviewDocs({ 'flashcard:f': base }, 'flashcard:f', moreReps)['flashcard:f']).toBe(moreReps);
    expect(mergeReviewDocs({ 'flashcard:f': moreReps }, 'flashcard:f', base)['flashcard:f']).toBe(moreReps);
  });

  it('is idempotent and commutative, like every part merge', () => {
    const b = fsrsReviewed(base, { at: T0 + 50, rating: 3 });
    const idempotent = mergeReviewDocs(mergeReviewDocs({}, 'flashcard:f', b), 'flashcard:f', b);
    expect(idempotent).toEqual({ 'flashcard:f': b });
    const ab = mergeReviewDocs(mergeReviewDocs({}, 'flashcard:f', base), 'flashcard:f', b);
    const ba = mergeReviewDocs(mergeReviewDocs({}, 'flashcard:f', b), 'flashcard:f', base);
    expect(ab).toEqual(ba);
  });

  it('ignores empty input', () => {
    const docs = { 'flashcard:f': base };
    expect(mergeReviewDocs(docs, 'flashcard:f', undefined)).toBe(docs);
  });
});

describe('emptyCard', () => {
  it('gives a serialisable fresh card', () => {
    const card = emptyCard(T0);
    expect(card.due).toBe(T0);
    expect(card.reps).toBe(0);
    expect(card.state).toBe(0);
    expect(ReviewItemSchema.safeParse(fsrsItem('drill', 'd', { at: T0 })).success).toBe(true);
  });
});
