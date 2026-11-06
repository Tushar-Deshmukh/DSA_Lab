import { describe, expect, it } from 'vitest';
import { planMinutes, planSession, reviewBudgetFor, type PlannerInput } from '@/lib/domain/planner';

const base: PlannerInput = {
  minutes: 30,
  reviews: [
    { key: 'flashcard:a', minutes: 2 },
    { key: 'problem:11', minutes: 5 },
  ],
  openUnits: [
    { lesson: 'm1/l1', unit: 'u3', minutes: 10 },
    { lesson: 'm1/l1', unit: 'u4', minutes: 10 },
  ],
  practice: [{ problem: '12', minutes: 20 }],
};

describe('planSession (plan §9.4)', () => {
  it('budgets about a third of the time for reviews and keeps due order', () => {
    expect(reviewBudgetFor(30)).toBe(10);
    expect(reviewBudgetFor(60)).toBe(20);
    const plan = planSession(base);
    expect(plan.reviewBudget).toBe(10);
    expect(plan.items[0]).toMatchObject({ kind: 'review', key: 'flashcard:a' });
    expect(plan.items[1]).toMatchObject({ kind: 'review', key: 'problem:11' });
  });

  it('fills the remaining time with units in lesson order, then a problem only if its box fits', () => {
    const plan = planSession(base); // 30 min: 2 + 5 reviews, then 10 + 10 units; no room for the 20-min problem
    expect(plan.items.map((i) => i.kind)).toEqual(['review', 'review', 'unit', 'unit']);
    expect(plan.items[2]).toMatchObject({ kind: 'unit', unit: 'u3' });
    expect(planMinutes(plan.items)).toBeLessThanOrEqual(30);
    expect(planMinutes(plan.items)).toBeGreaterThan(0);

    const withRoom = planSession({
      ...base,
      minutes: 60,
      reviews: [{ key: 'flashcard:a', minutes: 2 }],
      openUnits: [{ lesson: 'm1/l1', unit: 'u3', minutes: 10 }],
      practice: [{ problem: '12', minutes: 20 }],
    });
    expect(withRoom.items.map((i) => i.kind)).toEqual(['review', 'unit', 'problem']);
    expect(withRoom.items[2]).toMatchObject({ kind: 'problem', problem: '12' });
  });

  it('stops at a unit boundary rather than partially fitting one', () => {
    const plan = planSession({ ...base, minutes: 15, reviews: [{ key: 'flashcard:a', minutes: 2 }] });
    expect(plan.items.map((i) => i.kind)).toEqual(['review', 'unit']);
    // 15 - 2 = 13 left; the next unit (10) fits, but the remaining 3 cannot take a 10-minute unit.
  });

  it('skips an over-budget review but keeps later small ones', () => {
    const plan = planSession({
      ...base,
      minutes: 30,
      reviews: [
        { key: 'problem:big', minutes: 20 },
        { key: 'flashcard:a', minutes: 2 },
      ],
      openUnits: [],
      practice: [],
    });
    expect(plan.items.map((i) => i.kind)).toEqual(['review']);
    expect(plan.items[0]).toMatchObject({ key: 'flashcard:a' });
  });

  it('returns an empty plan when nothing fits', () => {
    const plan = planSession({ ...base, minutes: 1 });
    expect(plan.items).toEqual([]);
  });
});
