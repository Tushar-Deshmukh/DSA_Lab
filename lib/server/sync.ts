import 'server-only';
import { Types } from 'mongoose';
import { getDatabase } from '@/lib/db/connection';
import {
  EMPTY_SNAPSHOT,
  OpSchema,
  applyOp,
  type Op,
  type OpResult,
  type Snapshot,
  type SyncResponse,
} from '@/lib/domain/ops';
import { SettingsDocSchema } from '@/lib/domain/settings';

// The server side of the outbox (decision D-014). Every operation runs in its own transaction: record its id
// (a unique index turns a replay into a no-op), then apply the same pure function the device used.

/** A device clock may run fast; changes stamped more than this far ahead count as made now. */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function toObjectId(userId: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(userId)) throw new Error('invalid user id');
  return new Types.ObjectId(userId);
}

export async function snapshotFor(userId: string): Promise<Snapshot> {
  const { models } = await getDatabase();
  const settings = await models.Settings.findOne({ userId: toObjectId(userId) }).lean();
  if (!settings) return EMPTY_SNAPSHOT;
  const parsed = SettingsDocSchema.safeParse({ values: settings.values, at: settings.at });
  // A document that no longer matches the schema is treated as empty rather than breaking every device.
  return { settings: parsed.success ? parsed.data : EMPTY_SNAPSHOT.settings };
}

export async function applyOps(userId: string, rawOps: unknown[], now = Date.now()): Promise<SyncResponse> {
  const { conn, models } = await getDatabase();
  const uid = toObjectId(userId);
  const results: OpResult[] = [];

  for (const raw of rawOps) {
    const parsed = OpSchema.safeParse(raw);
    const opId = typeof (raw as { opId?: unknown })?.opId === 'string' ? (raw as { opId: string }).opId : '';
    if (!parsed.success) {
      results.push({ opId, status: 'rejected', reason: 'invalid operation' });
      continue;
    }
    const op: Op = { ...parsed.data, at: Math.min(parsed.data.at, now + MAX_CLOCK_SKEW_MS) };
    if (applyOp(EMPTY_SNAPSHOT, op) === null) {
      results.push({ opId: op.opId, status: 'rejected', reason: 'invalid value' });
      continue;
    }
    try {
      await conn.transaction(async (session) => {
        await models.SyncOp.create([{ userId: uid, opId: op.opId, appliedAt: new Date(now) }], { session });
        const current = await models.Settings.findOne({ userId: uid }).session(session).lean();
        const before: Snapshot = current
          ? { settings: { values: current.values, at: current.at } as Snapshot['settings'] }
          : EMPTY_SNAPSHOT;
        const after = applyOp(before, op) ?? before;
        await models.Settings.updateOne(
          { userId: uid },
          { $set: { values: after.settings.values, at: after.settings.at } },
          { upsert: true, session },
        );
      });
      results.push({ opId: op.opId, status: 'applied' });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) results.push({ opId: op.opId, status: 'duplicate' });
      else throw err;
    }
  }

  return { results, snapshot: await snapshotFor(userId) };
}
