import { getDatabase } from '@/lib/db/connection';
import { json } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

/** Readiness probe for deploys and the end-to-end test server. */
export async function GET(): Promise<Response> {
  try {
    const { db } = await getDatabase();
    await db.command({ ping: 1 });
    return json({ ok: true, db: 'up' });
  } catch {
    return json({ ok: false, db: 'down' }, { status: 503 });
  }
}
