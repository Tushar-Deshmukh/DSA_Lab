import { checkWriteRequest, clientIp, json, problem, readJson } from '@/lib/server/http';
import { hitRateLimit } from '@/lib/server/rate-limit';
import { readReserved } from '@/lib/server/runtime-data';

export const dynamic = 'force-dynamic';

const START_RULE = { limit: 30, windowSeconds: 60 };

/** The reserved assessment problems, exactly when the learner presses Start (D-012). Before this the page
 * holds only rules, timer and rubric, so nothing on it betrays an unseen problem. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const refused = checkWriteRequest(req);
  if (refused) return refused;
  const { slug } = await params;
  const assessment = readReserved().assessments[slug];
  const limit = await hitRateLimit(`start:${clientIp(req)}`, START_RULE);
  if (!limit.ok) return problem(429, 'too many requests', { 'Retry-After': String(limit.retryAfterSeconds) });
  if (!assessment) return problem(404, 'not found');
  await readJson(req, 1024); // the body carries no data; only its media type was checked above
  return json({ assessment: { id: assessment.id, slug: assessment.slug, problems: assessment.problems } });
}
