import 'server-only';
import { Types, type ClientSession } from 'mongoose';
import { getDatabase } from '@/lib/db/connection';
import { PART_COLLECTIONS } from '@/lib/db/models';
import {
  EMPTY_SNAPSHOT,
  OpSchema,
  SNAPSHOT_PARTS,
  applyOp,
  diffParts,
  type Op,
  type OpResult,
  type PartDiff,
  type Snapshot,
  type SnapshotPartName,
  type SyncResponse,
} from '@/lib/domain/ops';
import { SettingsDocSchema } from '@/lib/domain/settings';
import { LessonProgressSchema } from '@/lib/domain/lessons';
import { ExerciseRecordSchema } from '@/lib/domain/exercises';
import { ReviewItemSchema } from '@/lib/domain/review';
import {
  NoteDocSchema,
  BookmarkDocSchema,
  HighlightDocSchema,
  ReflectionDocSchema,
  MistakeDocSchema,
} from '@/lib/domain/notes';
import { ReadinessDocSchema, CheckpointResultSchema, MockResultSchema } from '@/lib/domain/assess';
import { StudySessionDocSchema } from '@/lib/domain/study-log';
import type { z } from 'zod';

// The server side of the outbox (decision D-014). Every operation runs in its own transaction: its id is
// recorded (a unique index turns a replay into a no-op), then the same pure function the device used is
// applied, and only the records that changed are written back (plan §10: one document per part record).

const PART_VALUE_SCHEMAS: Partial<Record<SnapshotPartName, z.ZodType>> = {
  lessons: LessonProgressSchema as unknown as z.ZodType,
  exercises: ExerciseRecordSchema as unknown as z.ZodType,
  review: ReviewItemSchema as unknown as z.ZodType,
  notes: NoteDocSchema as unknown as z.ZodType,
  bookmarks: BookmarkDocSchema as unknown as z.ZodType,
  highlights: HighlightDocSchema as unknown as z.ZodType,
  reflections: ReflectionDocSchema as unknown as z.ZodType,
  mistakes: MistakeDocSchema as unknown as z.ZodType,
  checkpoints: CheckpointResultSchema as unknown as z.ZodType,
  mocks: MockResultSchema as unknown as z.ZodType,
  sessions: StudySessionDocSchema as unknown as z.ZodType,
};

/** A device clock may run fast; changes stamped more than this far ahead count as made now. */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function toObjectId(userId: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(userId)) throw new Error('invalid user id');
  return new Types.ObjectId(userId);
}

const READY_VALUE_SCHEMA = ReadinessDocSchema as unknown as z.ZodType;

async function readRecordPart(part: SnapshotPartName, uid: Types.ObjectId): Promise<Record<string, unknown>> {
  const { models } = await getDatabase();
  const model = models.Part[part];
  const rows = await model.find({ userId: uid }).lean<{ doc?: unknown; [k: string]: unknown }[]>();
  const schema = PART_VALUE_SCHEMAS[part];
  const info = PART_COLLECTIONS.find((c) => c.part === part)!;
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    const key = row[info.keyField];
    if (typeof key !== 'string' || !schema) continue;
    const parsed = schema.safeParse(row.doc);
    if (parsed.success) out[key] = parsed.data;
    // A document that no longer matches the schema is skipped rather than breaking every device.
  }
  return out;
}

export async function snapshotFor(userId: string): Promise<Snapshot> {
  const { models } = await getDatabase();
  const uid = toObjectId(userId);
  const settingsRow = await models.Settings.findOne({ userId: uid }).lean<{
    values?: unknown;
    at?: unknown;
  }>();
  const settingsParsed = SettingsDocSchema.safeParse(
    settingsRow ? { values: settingsRow.values, at: settingsRow.at } : EMPTY_SNAPSHOT.settings,
  );
  const readinessRow = await models.Readiness.findOne({ userId: uid }).lean<{ doc?: unknown }>();
  const readinessParsed = READY_VALUE_SCHEMA.safeParse(readinessRow?.doc ?? EMPTY_SNAPSHOT.readiness);

  const snapshot: Snapshot = {
    ...EMPTY_SNAPSHOT,
    settings: settingsParsed.success ? settingsParsed.data : EMPTY_SNAPSHOT.settings,
    readiness: readinessParsed.success
      ? (readinessParsed.data as Snapshot['readiness'])
      : EMPTY_SNAPSHOT.readiness,
  };

  const keyed = SNAPSHOT_PARTS.filter((p) => PART_VALUE_SCHEMAS[p] !== undefined);
  const parts = await Promise.all(keyed.map((part) => readRecordPart(part, uid)));
  keyed.forEach((part, i) => {
    (snapshot as Record<SnapshotPartName, unknown>)[part] = parts[i];
  });
  return snapshot;
}

async function writeDiffs(uid: Types.ObjectId, diff: PartDiff, session: ClientSession): Promise<void> {
  const { models } = await getDatabase();
  // Records go through a JSON round-trip first: Mongoose stores an undefined field as null, which would
  // then fail the schema on the way back out (an absent optional field must stay absent).
  const sanitize = (v: unknown) => JSON.parse(JSON.stringify(v)) as Record<string, unknown>;
  for (const [part, records] of Object.entries(diff.upserts) as [
    SnapshotPartName,
    Record<string, unknown>,
  ][]) {
    if (part === 'settings') {
      const doc = sanitize(records.doc);
      await models.Settings.updateOne(
        { userId: uid },
        { $set: { values: doc.values, at: doc.at } },
        { upsert: true, session },
      );
      continue;
    }
    if (part === 'readiness') {
      const doc = sanitize(records.doc);
      await models.Readiness.updateOne(
        { userId: uid },
        { $set: { doc: { items: doc.items, evidence: doc.evidence, at: doc.at } } },
        { upsert: true, session },
      );
      continue;
    }
    const info = PART_COLLECTIONS.find((c) => c.part === part)!;
    const model = models.Part[part];
    for (const [key, record] of Object.entries(records)) {
      await model.updateOne(
        { userId: uid, [info.keyField]: key },
        { $set: { userId: uid, [info.keyField]: key, doc: sanitize(record) } },
        { upsert: true, session },
      );
    }
  }
  for (const [part, keys] of Object.entries(diff.deletes) as [SnapshotPartName, string[]][]) {
    if (part === 'settings' || part === 'readiness') continue; // never deleted record-wise
    const info = PART_COLLECTIONS.find((c) => c.part === part)!;
    await models.Part[part].deleteMany({ userId: uid, [info.keyField]: { $in: keys } }, { session });
  }
}

export async function applyOps(userId: string, rawOps: unknown[], now = Date.now()): Promise<SyncResponse> {
  const { conn, models } = await getDatabase();
  const uid = toObjectId(userId);
  const results: OpResult[] = [];
  let server = await snapshotFor(userId);

  for (const raw of rawOps) {
    const parsed = OpSchema.safeParse(raw);
    const opId = typeof (raw as { opId?: unknown })?.opId === 'string' ? (raw as { opId: string }).opId : '';
    if (!parsed.success) {
      results.push({ opId, status: 'rejected', reason: 'invalid operation' });
      continue;
    }
    const op: Op = { ...parsed.data, at: Math.min(parsed.data.at, now + MAX_CLOCK_SKEW_MS) };
    // The empty-state probe catches payload values no reducer accepts; a null result against the live
    // documents then means either invalid state or an idempotent no-op (an event replay). No-ops still go
    // through the opId ledger, so a replay arrives as a duplicate rather than a rejection.
    if (applyOp(EMPTY_SNAPSHOT, op) === null) {
      results.push({ opId: op.opId, status: 'rejected', reason: 'invalid value' });
      continue;
    }
    const before = server;
    const after = applyOp(before, op);
    try {
      if (after === null) {
        try {
          await models.SyncOp.create([{ userId: uid, opId: op.opId, appliedAt: new Date(now) }]);
          server = before;
          results.push({ opId: op.opId, status: 'applied' });
        } catch (err) {
          if ((err as { code?: number }).code === 11000) results.push({ opId: op.opId, status: 'duplicate' });
          else throw err;
        }
        continue;
      }
      const change = diffParts(before, after);
      const changed = Object.keys(change.upserts).length + Object.keys(change.deletes).length > 0;
      await conn.transaction(async (session) => {
        await models.SyncOp.create([{ userId: uid, opId: op.opId, appliedAt: new Date(now) }], { session });
        if (changed) await writeDiffs(uid, change, session);
      });
      server = after;
      results.push({ opId: op.opId, status: 'applied' });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) results.push({ opId: op.opId, status: 'duplicate' });
      else throw err;
    }
  }

  return { results, snapshot: await snapshotFor(userId) };
}

/** Replaces the learner's documents with an imported snapshot (backup restore, plan §10). One transaction:
 * wipe every record the learner owns, then write the validated snapshot record by record. The op ledger is
 * wiped with the data: it describes history that no longer applies. */
export async function replaceSnapshotFor(
  userId: string,
  snapshot: Snapshot,
): Promise<Record<string, number>> {
  const { conn, models } = await getDatabase();
  const uid = toObjectId(userId);
  const upserts: PartDiff['upserts'] = {
    settings: { doc: snapshot.settings },
    readiness: { doc: snapshot.readiness },
  };
  for (const part of SNAPSHOT_PARTS) {
    const value: unknown = snapshot[part];
    if (part !== 'settings' && part !== 'readiness') upserts[part] = value as Record<string, unknown>;
  }
  await conn.transaction(async (session) => {
    for (const part of SNAPSHOT_PARTS) {
      if (part === 'settings') await models.Settings.deleteMany({ userId: uid }, { session });
      else if (part === 'readiness') await models.Readiness.deleteMany({ userId: uid }, { session });
      else await models.Part[part].deleteMany({ userId: uid }, { session });
    }
    await models.SyncOp.deleteMany({ userId: uid }, { session });
    await writeDiffs(uid, { upserts, deletes: {} }, session);
  });
  const counts: Record<string, number> = {};
  for (const [part, records] of Object.entries(upserts) as [SnapshotPartName, Record<string, unknown>][])
    counts[part] = Object.keys(records).length;
  return counts;
}

/** Erases every learner record (settings, readiness, parts, op ledger). The account itself stays, so signing
 * in again starts clean rather than failing; sessions stay too, which is Better Auth's own state. */
export async function eraseLearnerData(userId: string): Promise<void> {
  const { conn, models } = await getDatabase();
  const uid = toObjectId(userId);
  await conn.transaction(async (session) => {
    for (const part of SNAPSHOT_PARTS) {
      if (part === 'settings') await models.Settings.deleteMany({ userId: uid }, { session });
      else if (part === 'readiness') await models.Readiness.deleteMany({ userId: uid }, { session });
      else await models.Part[part].deleteMany({ userId: uid }, { session });
    }
    await models.SyncOp.deleteMany({ userId: uid }, { session });
  });
}
