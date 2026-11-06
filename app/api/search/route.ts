import { CONTENT_COLLECTIONS } from '@/lib/db/content-models';
import { getDatabase } from '@/lib/db/connection';
import { clientIp, json, problem } from '@/lib/server/http';
import { hitRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

const SEARCH_RULE = { limit: 60, windowSeconds: 60 };
const LIMIT = 20;

interface Hit {
  collection: string;
  slug: string;
  title: string;
  score: number;
}

/** Full-text search over the public content copies (D-017). MongoDB holds the only copy with exercise
 * questions and problem notes; the page payload never does. The palette searches its small local index
 * first and asks this endpoint for everything else. */
export async function GET(req: Request): Promise<Response> {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2 || q.length > 200) return problem(400, 'expected q of 2 to 200 characters');
  const limit = await hitRateLimit(`search:${clientIp(req)}`, SEARCH_RULE);
  if (!limit.ok) return problem(429, 'too many requests', { 'Retry-After': String(limit.retryAfterSeconds) });
  try {
    const { db } = await getDatabase();
    const per = await Promise.all(
      CONTENT_COLLECTIONS.map(async (collection) =>
        db
          .collection(collection)
          .aggregate<Hit>([
            { $match: { $text: { $search: q } } },
            { $sort: { score: { $meta: 'textScore' } } },
            { $limit: LIMIT * 2 },
            {
              $project: {
                _id: 0,
                collection: { $literal: collection },
                slug: 1,
                title: 1,
                score: { $meta: 'textScore' },
              },
            },
          ])
          .toArray(),
      ),
    );
    const results = per
      .flat()
      .sort((a, b) => b.score - a.score)
      .slice(0, LIMIT)
      .map(({ collection, slug, title }) => ({ collection, slug, title }));
    return json({ q, results });
  } catch {
    // Missing text index (content:sync not yet run) or a database hiccup: search is optional, not broken.
    return problem(503, 'search unavailable');
  }
}
