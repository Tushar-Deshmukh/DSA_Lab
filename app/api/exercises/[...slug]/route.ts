import { clientIp, json, problem } from '@/lib/server/http';
import { hitRateLimit } from '@/lib/server/rate-limit';
import { readExerciseKeys } from '@/lib/server/runtime-data';

export const dynamic = 'force-dynamic';

const KEY_RULE = { limit: 120, windowSeconds: 60 };

/** The answer key of exactly one exercise (D-011). The catch-all keeps the slug's slashes out of the URL;
 * the lookup in the generated server bundle is the validation. Guests use this too: keys are not a secret
 * from the learner, only from the page payload, which would serve them in bulk. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
): Promise<Response> {
  const { slug } = await params;
  const last = slug[slug.length - 1];
  if (slug.length < 2 || last !== 'key') return problem(404, 'not found');
  const exerciseSlug = slug.slice(0, -1).join('/');
  const served = readExerciseKeys()[exerciseSlug];
  const limit = await hitRateLimit(`keys:${clientIp(req)}`, KEY_RULE);
  if (!limit.ok) return problem(429, 'too many requests', { 'Retry-After': String(limit.retryAfterSeconds) });
  if (!served) return problem(404, 'not found');
  return json({ slug: exerciseSlug, type: served.type, key: served.key });
}
