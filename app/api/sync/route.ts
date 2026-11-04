import { SyncRequestSchema } from '@/lib/domain/ops';
import { getSessionUser } from '@/lib/server/auth';
import { checkWriteRequest, json, problem, readJson } from '@/lib/server/http';
import { hitRateLimit } from '@/lib/server/rate-limit';
import { applyOps, snapshotFor } from '@/lib/server/sync';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 256 * 1024;
const SYNC_RULE = { limit: 120, windowSeconds: 60 };

/** The signed-in learner's documents, used when a device signs in. */
export async function GET(req: Request): Promise<Response> {
  const user = await getSessionUser(req.headers);
  if (!user) return problem(401, 'not signed in');
  return json({ snapshot: await snapshotFor(user.id) });
}

/** Applies a batch of queued operations from the device's outbox. */
export async function POST(req: Request): Promise<Response> {
  const refused = checkWriteRequest(req);
  if (refused) return refused;
  const user = await getSessionUser(req.headers);
  if (!user) return problem(401, 'not signed in');
  const limit = await hitRateLimit(`sync:${user.id}`, SYNC_RULE);
  if (!limit.ok) return problem(429, 'too many requests', { 'Retry-After': String(limit.retryAfterSeconds) });
  const body = SyncRequestSchema.safeParse(await readJson(req, MAX_BODY_BYTES));
  if (!body.success) return problem(400, 'expected { ops: [...] } with 1 to 100 operations');
  return json(await applyOps(user.id, body.data.ops));
}
