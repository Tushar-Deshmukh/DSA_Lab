import { getSessionUser } from '@/lib/server/auth';
import { checkWriteRequest, json, problem } from '@/lib/server/http';
import { eraseLearnerData } from '@/lib/server/sync';

export const dynamic = 'force-dynamic';

/** Erases all of the learner's data (settings/data "erase"): settings, readiness, every part record and the
 * op ledger, in one transaction. The account and its sessions stay, so a later sign-in starts clean. */
export async function DELETE(req: Request): Promise<Response> {
  const refused = checkWriteRequest(req);
  if (refused) return refused;
  const user = await getSessionUser(req.headers);
  if (!user) return problem(401, 'not signed in');
  await eraseLearnerData(user.id);
  return json({ ok: true });
}
