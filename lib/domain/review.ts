import './zod';
import * as z from 'zod/mini';
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type State } from 'ts-fsrs';
import type { ExerciseOutcome } from './exercises';

// The review queue (plan §9.2, D-016). One collection holds four kinds of items:
//
// - flashcards and exercises are scheduled by FSRS (ts-fsrs 6.0.0); the rating comes from the outcome:
//   answer viewed → Again, solved after hints or wrong attempts → Hard, first try → Good. Easy exists for
//   flashcards only, chosen by the learner.
// - LeetCode re-solves keep the legacy interval rule exactly; their item mirrors the journal's
//   `nextResolveAt` and stores no card. "Ready", never "overdue": an item is only ever shown in a queue.
// - pattern drills are FSRS items too, rated by the caller after a drill round.
//
// Merge rule (D-014): the item with the later change wins (same tie-breaker as settings: an exact tie goes
// to the larger `reps`), because a card's state cannot be combined from two copies.

export const REVIEW_ITEM_TYPES = ['flashcard', 'exercise', 'problem', 'drill'] as const;
export type ReviewItemType = (typeof REVIEW_ITEM_TYPES)[number];

const FsrsCardSchema = z.object({
  due: z.int().check(z.nonnegative()),
  stability: z.number(),
  difficulty: z.number(),
  scheduledDays: z.int().check(z.nonnegative()),
  reps: z.int().check(z.nonnegative()),
  lapses: z.int().check(z.nonnegative()),
  learningSteps: z.int().check(z.nonnegative()),
  state: z.int().check(z.minimum(0), z.maximum(3)),
});

export interface FsrsCard {
  due: number;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  learningSteps: number;
  state: number;
}

export const ReviewItemSchema = z.object({
  at: z.int().check(z.nonnegative()),
  itemType: z.enum(REVIEW_ITEM_TYPES),
  itemSlug: z.string().check(z.minLength(1), z.maxLength(200)),
  /** When the item is ready again, as a wall-clock ms number. */
  due: z.int().check(z.nonnegative()),
  scheduler: z.enum(['fsrs', 'interval']),
  reps: z.int().check(z.nonnegative()),
  lapses: z.int().check(z.nonnegative()),
  lastReviewedAt: z.optional(z.int().check(z.nonnegative())),
  /** The FSRS memory state; interval items have none. */
  card: z.optional(FsrsCardSchema),
  /** Where the item came from, shown as evidence: `warmup:<lesson>`, `checkpoint:<slug>`, `module:<slug>`. */
  source: z.optional(z.string().check(z.maxLength(200))),
});
export type ReviewItem = z.infer<typeof ReviewItemSchema>;

export const ReviewDocsSchema = z.record(z.string(), ReviewItemSchema);
export type ReviewDocs = Record<string, ReviewItem>;

export const reviewItemKey = (itemType: ReviewItemType, itemSlug: string): string =>
  `${itemType}:${itemSlug}`;

/** One rating per review; the outcome of an exercise maps directly to it (D-016). 1 Again · 2 Hard · 3 Good · 4 Easy. */
export type ReviewRating = 1 | 2 | 3 | 4;

/** Answer viewed → Again, solved after effort → Hard, first try → Good. An attempt that stays unsolved is a
 * miss: the exercise joins the queue for a retry with Again (the legacy "questions you missed" list). */
export function ratingForOutcome(outcome: ExerciseOutcome): Extract<ReviewRating, 1 | 2 | 3> {
  switch (outcome) {
    case 'viewed':
    case 'none':
      return Rating.Again as 1;
    case 'with-effort':
      return Rating.Hard as 2;
    case 'first-try':
      return Rating.Good as 3;
  }
}

// ---- FSRS

let engine: ReturnType<typeof fsrs> | null = null;
function scheduler(): ReturnType<typeof fsrs> {
  if (!engine) engine = fsrs(generatorParameters());
  return engine;
}

function cardFromItem(item: ReviewItem): Card {
  const base = createEmptyCard();
  if (!item.card) return base;
  return {
    ...base,
    due: new Date(item.card.due),
    stability: item.card.stability,
    difficulty: item.card.difficulty,
    scheduled_days: item.card.scheduledDays,
    reps: item.card.reps,
    lapses: item.card.lapses,
    learning_steps: item.card.learningSteps,
    state: item.card.state as State,
  };
}

function itemWithCard(item: ReviewItem, card: Card): ReviewItem {
  return {
    ...item,
    due: card.due.getTime(),
    reps: card.reps,
    lapses: card.lapses,
    card: {
      due: card.due.getTime(),
      stability: card.stability,
      difficulty: card.difficulty,
      scheduledDays: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      learningSteps: card.learning_steps,
      state: card.state,
    },
  };
}

export function emptyCard(now: number): FsrsCard {
  return itemWithCard(itemShape('flashcard', '', now), createEmptyCard(now ? new Date(now) : new Date(0)))
    .card!;
}

function itemShape(itemType: ReviewItemType, itemSlug: string, now: number, source?: string): ReviewItem {
  return {
    at: now,
    itemType,
    itemSlug,
    due: now,
    scheduler: 'fsrs',
    reps: 0,
    lapses: 0,
    ...(source ? { source } : {}),
  };
}

export interface ReviewEvent {
  at: number;
  rating: ReviewRating;
}

/** Applies one review to an FSRS item (D-016): the card's next state decides when it is ready again. */
export function fsrsReviewed(item: ReviewItem, e: ReviewEvent): ReviewItem {
  const next = scheduler().next(cardFromItem(item), new Date(e.at), e.rating).card;
  return { ...itemWithCard(item, next), at: e.at, lastReviewedAt: e.at };
}

/**
 * Interval items mirror the journal's rule (plan §9.1). The journal stays the source of truth; this builds
 * the queue item the review page shows.
 */
export function intervalItem(itemSlug: string, e: { at: number; due: number; source?: string }): ReviewItem {
  return {
    ...itemShape('problem', itemSlug, e.at, e.source),
    scheduler: 'interval',
    due: e.due,
  };
}

export function fsrsItem(
  itemType: Exclude<ReviewItemType, 'problem'>,
  itemSlug: string,
  e: { at: number; source?: string },
): ReviewItem {
  return itemWithCard(itemShape(itemType, itemSlug, e.at, e.source), createEmptyCard(new Date(e.at)));
}

// ---- the queue (plan §9.2: ordered by due, capped to the chosen time)

/** A review item's estimate, in minutes. Flashcard 0.5; re-solves carry their legacy time box. */
export const FLASHCARD_MINUTES = 0.5;

/** Exercise estimates by type (minutes): quick checks 2, multi-part 3, code 4, interviews 5. */
export const EXERCISE_MINUTES: Record<string, number> = {
  mcq: 2,
  pattern: 2,
  complexity: 2,
  bug: 2,
  predict: 2,
  fill: 3,
  trace: 3,
  code: 4,
  interview: 5,
};

export interface ReadyItem extends ReviewItem {
  minutes: number;
}

/**
 * The ready items in due order, greedy on the time cap: an item that does not fit is skipped and the pass
 * continues, so one long interview never blocks five small cards. A cap of 0 (or below) yields nothing.
 */
export function readyQueue(
  docs: ReviewDocs,
  now: number,
  minutes: number,
  estimateOf: (item: ReviewItem) => number,
): ReadyItem[] {
  const ready = Object.values(docs)
    .filter((item) => dueReady(item, now))
    .sort(byDue);
  const out: ReadyItem[] = [];
  let left = minutes;
  for (const item of ready) {
    const cost = estimateOf(item);
    if (cost > left) continue;
    left -= cost;
    out.push({ ...item, minutes: cost });
  }
  return out;
}

const byDue = (a: ReviewItem, b: ReviewItem): number => a.due - b.due || a.itemSlug.localeCompare(b.itemSlug);

/** Ready means now or past: the queue never says "overdue". */
export const dueReady = (item: ReviewItem, now: number): boolean => item.due <= now;

// ---- "Review this module" (plan §9.2)

export interface QuizSource {
  slug: string;
  /** The exercise type; interviews and code are not quiz material (the legacy rule). */
  type: string;
}

/**
 * The module's exercises the learner has not answered cleanly: wrong on the first try, or revealed. Most
 * recently wrong first, capped at a handful — the legacy quiz picked four.
 */
export function moduleQuiz(
  sources: QuizSource[],
  records: Record<string, { attempts: number; firstTry?: boolean; revealed: boolean; at: number }>,
  count = 4,
): string[] {
  const missed = sources
    .filter((s) => s.type !== 'interview' && s.type !== 'code')
    .filter((s) => {
      const r = records[s.slug];
      return r !== undefined && r.attempts > 0 && (r.firstTry === false || r.revealed);
    })
    .sort((a, b) => (records[b.slug]!.at ?? 0) - (records[a.slug]!.at ?? 0));
  return missed.slice(0, count).map((s) => s.slug);
}

// ---- merging (D-014)

export function mergeReviewDocs(docs: ReviewDocs, key: string, next: ReviewItem | undefined): ReviewDocs {
  if (!next) return docs;
  const prev = docs[key];
  if (!prev) return { ...docs, [key]: next };
  const { a, b } = { a: prev, b: next };
  // The card's state cannot be combined from two copies: the later change wins, an exact tie goes to more reps.
  const winner = b.at > a.at ? b : a.at > b.at ? a : a.reps >= b.reps ? a : b;
  if (winner === prev) return docs;
  return { ...docs, [key]: winner };
}

// ---- labels

export const REVIEW_TYPE_LABEL: Record<ReviewItemType, string> = {
  flashcard: 'Flashcard',
  exercise: 'Question',
  problem: 'Re-solve',
  drill: 'Drill',
};
