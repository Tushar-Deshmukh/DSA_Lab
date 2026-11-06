// The session planner (plan §9.4). The learner picks 15, 30, 60 or 90 minutes; the plan is built in order:
// 1. ready reviews, in due order, up to about a third of the time;
// 2. the next units of the current lesson, while they fit;
// 3. one practice problem, if its time box still fits.
//
// A session can stop at any item boundary without losing anything. Planned and actual items are saved in
// study_sessions; the plan itself is derived and never synced.

export interface PlanReviewItem {
  kind: 'review';
  /** `${itemType}:${itemSlug}` of the review item. */
  key: string;
  minutes: number;
  estimate: number;
}

export interface PlanUnitItem {
  kind: 'unit';
  lesson: string;
  unit: string;
  minutes: number;
  estimate: number;
}

export interface PlanProblemItem {
  kind: 'problem';
  problem: string;
  minutes: number;
  estimate: number;
}

export type PlanItem = PlanReviewItem | PlanUnitItem | PlanProblemItem;

export interface PlannerInput {
  minutes: number;
  /** Ready review items, already in due order, each with its minutes estimate. */
  reviews: Array<{ key: string; minutes: number }>;
  /** The units still open in the current lesson, in lesson order, each with its estimate. */
  openUnits: Array<{ lesson: string; unit: string; minutes: number }>;
  /** Candidate practice problems in the order they would be picked, each with its legacy time box. */
  practice: Array<{ problem: string; minutes: number }>;
}

export interface SessionPlan {
  minutes: number;
  reviewBudget: number;
  items: PlanItem[];
}

/** Reviews take at most about a third of the session (plan §9.4). */
export const reviewBudgetFor = (minutes: number): number => Math.round(minutes / 3);

/** Builds the plan. Reviews first (capped), then units while they fit, then one problem if its box fits. */
export function planSession(input: PlannerInput): SessionPlan {
  const items: PlanItem[] = [];
  const budget = reviewBudgetFor(input.minutes);
  let left = input.minutes;

  let reviewSpent = 0;
  for (const r of input.reviews) {
    if (reviewSpent + r.minutes > budget) continue;
    if (r.minutes > left) continue;
    reviewSpent += r.minutes;
    left -= r.minutes;
    items.push({ kind: 'review', key: r.key, minutes: r.minutes, estimate: r.minutes });
  }

  for (const u of input.openUnits) {
    if (u.minutes > left) break;
    left -= u.minutes;
    items.push({ kind: 'unit', lesson: u.lesson, unit: u.unit, minutes: u.minutes, estimate: u.minutes });
  }

  const problem = input.practice.find((p) => p.minutes <= left);
  if (problem) {
    left -= problem.minutes;
    items.push({
      kind: 'problem',
      problem: problem.problem,
      minutes: problem.minutes,
      estimate: problem.minutes,
    });
  }

  return { minutes: input.minutes, reviewBudget: budget, items };
}

/** The plan's total, so the card can say how much of the chosen time the plan uses. */
export const planMinutes = (items: PlanItem[]): number => items.reduce((sum, item) => sum + item.minutes, 0);
