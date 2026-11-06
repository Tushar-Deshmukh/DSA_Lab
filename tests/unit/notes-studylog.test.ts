import { describe, expect, it } from 'vitest';
import { bookmarkKey, highlightKey } from '@/lib/domain/notes';
import { dayKey, isNewDay, timeStudiedSec, activeDays, type StudySessionDocs } from '@/lib/domain/study-log';

const DAY = 86_400_000;
const T0 = 1_700_000_000_000;

describe('keys', () => {
  it('bookmarks key on type, slug and optional block', () => {
    expect(bookmarkKey({ type: 'lesson', slug: 'm1/l1' })).toBe('lesson:m1/l1');
    expect(bookmarkKey({ type: 'unit', slug: 'm1/l1', blockId: 'u2' })).toBe('unit:m1/l1:u2');
  });

  it('highlights key on the quote, with the context window', () => {
    const target = { type: 'lesson' as const, slug: 'm1/l1', blockId: 'b1' };
    expect(highlightKey({ target, quote: { exact: 'the same sentence' } })).toBe(
      'm1/l1|b1|the same sentence',
    );
    const withContext = highlightKey({
      target,
      quote: {
        exact: 'x'.repeat(100),
        prefix: 'before'.repeat(20),
        suffix: 'after the sentence comes a long tail of text',
      },
    });
    // The exact is capped and the context keeps short distinctive head/tail slices.
    expect(withContext.length).toBeLessThan(200);
    expect(withContext.startsWith('m1/l1|b1|x')).toBe(true);
    expect(withContext).toContain('|p:');
    expect(withContext).toContain('|s:after the sent');
  });
});

describe('study log', () => {
  const session = (
    at: number,
    startedAt: number,
    endedAt?: number,
    plannedMinutes = 30,
  ): StudySessionDocs['s'] => ({
    id: `s-${startedAt}`,
    at,
    startedAt,
    ...(endedAt ? { endedAt } : {}),
    plannedMinutes,
    items: [],
  });

  it('timeStudiedSec sums ended sessions only, capped by the write time', () => {
    // A normal session: written when it ended.
    const long = session(T0 + 25 * 60_000, T0, T0 + 25 * 60_000);
    expect(timeStudiedSec({ long })).toBe(25 * 60);
    // A clock running past the write time never counts past `at`.
    const skewed = { ...long, startedAt: T0, endedAt: T0 + 60 * 60_000, at: T0 + 30 * 60_000 };
    expect(timeStudiedSec({ skewed })).toBe(30 * 60);
    expect(timeStudiedSec({ open: session(T0, T0, T0) })).toBe(0); // never ended: no time
  });

  it('activeDays counts distinct UTC days a session ended (or an item landed)', () => {
    const docs = {
      a: session(T0, T0, T0 + 1000),
      b: session(T0 + 2 * DAY, T0 + 2 * DAY, T0 + 2 * DAY + 1000),
      c: session(T0 + 2 * DAY + 10, T0 + 2 * DAY + 10, T0 + 2 * DAY + 20),
    };
    expect(activeDays(docs)).toBe(2);
  });

  it('dayKey and isNewDay work on UTC days, never local ones', () => {
    expect(dayKey(T0)).toBe('2023-11-14');
    expect(dayKey(T0 + DAY)).toBe('2023-11-15');
    expect(isNewDay(T0 + DAY, T0)).toBe(true);
    expect(isNewDay(T0, T0 + 100)).toBe(false);
  });
});
