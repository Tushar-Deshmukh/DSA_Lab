import { checkWriteRequest, clientIp, json, problem, readJson } from '@/lib/server/http';
import { hitRateLimit } from '@/lib/server/rate-limit';
import { readReserved } from '@/lib/server/runtime-data';

export const dynamic = 'force-dynamic';

const POOL_RULE = { limit: 30, windowSeconds: 60 };

/** A mock's problem pool, after the page's "I am the interviewer" confirmation (D-012). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const refused = checkWriteRequest(req);
  if (refused) return refused;
  const { slug } = await params;
  const mock = readReserved().mocks[slug];
  const limit = await hitRateLimit(`pool:${clientIp(req)}`, POOL_RULE);
  if (!limit.ok) return problem(429, 'too many requests', { 'Retry-After': String(limit.retryAfterSeconds) });
  if (!mock) return problem(404, 'not found');
  await readJson(req, 1024); // the body carries no data; only its media type was checked above
  return json({ mock: { id: mock.id, slug: mock.slug, pool: mock.pool } });
}
