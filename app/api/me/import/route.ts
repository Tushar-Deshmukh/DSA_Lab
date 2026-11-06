import { SnapshotSchema } from '@/lib/domain/ops';
import { getSessionUser } from '@/lib/server/auth';
import { checkWriteRequest, json, problem, readJson } from '@/lib/server/http';
import { hitRateLimit } from '@/lib/server/rate-limit';
import { replaceSnapshotFor } from '@/lib/server/sync';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const IMPORT_RULE = { limit: 5, windowSeconds: 60 };

/** Replaces the learner's documents with a validated export (backup restore). Unlike the op sync, this is a
 * whole-snapshot write: the file is every document, so it goes back as every document. */
export async function POST(req: Request): Promise<Response> {
  const refused = checkWriteRequest(req);
  if (refused) return refused;
  const user = await getSessionUser(req.headers);
  if (!user) return problem(401, 'not signed in');
  const limit = await hitRateLimit(`import:${user.id}`, IMPORT_RULE);
  if (!limit.ok) return problem(429, 'too many requests', { 'Retry-After': String(limit.retryAfterSeconds) });
  const body = await readJson(req, MAX_BODY_BYTES);
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return problem(400, 'expected { snapshot: ... }');
  const parsed = SnapshotSchema.safeParse((body as { snapshot?: unknown }).snapshot);
  if (!parsed.success) return problem(400, 'the snapshot must be exactly what /api/me/export produced');
  const counts = await replaceSnapshotFor(user.id, parsed.data);
  return json({ ok: true, counts });
}
