import { getSessionUser } from '@/lib/server/auth';
import { json, problem } from '@/lib/server/http';
import { snapshotFor } from '@/lib/server/sync';

export const dynamic = 'force-dynamic';

/** The learner's full export (plan §11): every document, in the shape the device stores it. Import feeds it
 * straight back to /api/me/import, so the round trip needs no extra schema. */
export async function GET(req: Request): Promise<Response> {
  const user = await getSessionUser(req.headers);
  if (!user) return problem(401, 'not signed in');
  return json({ version: 1, exportedAt: new Date().toISOString(), snapshot: await snapshotFor(user.id) });
}
