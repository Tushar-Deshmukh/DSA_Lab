import 'server-only';
import { getDatabase } from '@/lib/db/connection';

// Fixed-window counters in MongoDB (decision D-023): they work across serverless instances without a third
// party. Old windows disappear through the TTL index on expiresAt.

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function hitRateLimit(
  key: string,
  rule: RateLimitRule,
  now = Date.now(),
): Promise<RateLimitResult> {
  const { models } = await getDatabase();
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs * 2);
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt } };
  let doc;
  try {
    doc = await models.RateLimit.findOneAndUpdate({ key, windowStart }, update, {
      upsert: true,
      returnDocument: 'after',
    });
  } catch (err) {
    // Two first hits in the same window can race on the unique index; the retry finds the winner's document.
    if ((err as { code?: number }).code !== 11000) throw err;
    doc = await models.RateLimit.findOneAndUpdate({ key, windowStart }, update, {
      upsert: true,
      returnDocument: 'after',
    });
  }
  const count = doc.count;
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart.getTime() + windowMs - now) / 1000));
  return { ok: count <= rule.limit, remaining: Math.max(0, rule.limit - count), retryAfterSeconds };
}
