import { Schema, type Connection, type Model, type Types } from 'mongoose';
import type { SnapshotPartName } from '@/lib/domain/ops';

// Mongoose models for the app's own collections (plan §10). Values that come from learners are validated with
// the Zod schemas in lib/domain before they reach these models; the `doc` field (Mixed) holds one validated
// record. Every user collection keys on userId plus a content slug or generated id, never an array position.

export interface SettingsRecord {
  userId: Types.ObjectId;
  values: Record<string, unknown>;
  at: Record<string, number>;
}

export interface SyncOpRecord {
  userId: Types.ObjectId;
  opId: string;
  appliedAt: Date;
}

export interface RateLimitRecord {
  key: string;
  windowStart: Date;
  count: number;
  expiresAt: Date;
}

/** One readiness report per learner (a singleton, like settings). */
export interface ReadinessRecord {
  userId: Types.ObjectId;
  doc: unknown;
}

/** One record of a snapshot part: a lesson's progress, an exercise's attempts, a note, and so on. */
export interface PartRecord {
  userId: Types.ObjectId;
  key: string;
  doc: unknown;
}

const settingsSchema = new Schema<SettingsRecord>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    values: { type: Schema.Types.Mixed, default: () => ({}) },
    at: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { collection: 'settings', timestamps: true, minimize: false, strict: 'throw' },
);
settingsSchema.index({ userId: 1 }, { unique: true });

const SYNC_OP_TTL_SECONDS = 60 * 60 * 24 * 30;

const syncOpSchema = new Schema<SyncOpRecord>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    opId: { type: String, required: true },
    appliedAt: { type: Date, required: true },
  },
  { collection: 'sync_ops', strict: 'throw' },
);
syncOpSchema.index({ userId: 1, opId: 1 }, { unique: true });
syncOpSchema.index({ appliedAt: 1 }, { expireAfterSeconds: SYNC_OP_TTL_SECONDS });

const rateLimitSchema = new Schema<RateLimitRecord>(
  {
    key: { type: String, required: true },
    windowStart: { type: Date, required: true },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'rate_limits', strict: 'throw' },
);
rateLimitSchema.index({ key: 1, windowStart: 1 }, { unique: true });
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const readinessSchema = new Schema<ReadinessRecord>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    doc: { type: Schema.Types.Mixed, required: true },
  },
  { collection: 'readiness', minimize: false, strict: 'throw' },
);
readinessSchema.index({ userId: 1 }, { unique: true });

// The snapshot parts (plan §10). One collection per part; one document per record.
export const PART_COLLECTIONS = [
  { part: 'lessons', collection: 'lesson_progress', keyField: 'lessonSlug' },
  { part: 'exercises', collection: 'exercise_attempts', keyField: 'exerciseSlug' },
  { part: 'journal', collection: 'problem_journal', keyField: 'problemNum' },
  { part: 'review', collection: 'review_items', keyField: 'itemKey' },
  { part: 'notes', collection: 'notes', keyField: 'noteId' },
  { part: 'bookmarks', collection: 'bookmarks', keyField: 'bookmarkKey' },
  { part: 'highlights', collection: 'highlights', keyField: 'highlightKey' },
  { part: 'reflections', collection: 'reflections', keyField: 'moduleSlug' },
  { part: 'mistakes', collection: 'mistakes', keyField: 'mistakeId' },
  { part: 'checkpoints', collection: 'checkpoint_results', keyField: 'checkpointSlug' },
  { part: 'mocks', collection: 'mock_results', keyField: 'mockSlug' },
  { part: 'sessions', collection: 'study_sessions', keyField: 'sessionId' },
] as const satisfies ReadonlyArray<{ part: SnapshotPartName; collection: string; keyField: string }>;

/** The part records are stored under their own key field, as plan §10 names them. */
export type PartCollectionInfo = (typeof PART_COLLECTIONS)[number];

export interface PartRecord {
  userId: Types.ObjectId;
  doc: unknown;
  [keyField: string]: unknown;
}

/** Indexes on `doc` paths the plan §10 index list needs beyond the record's key. */
const PART_EXTRA_INDEXES: Partial<
  Record<SnapshotPartName, Array<{ key: Record<string, 1 | -1 | 'text'>; options?: Record<string, unknown> }>>
> = {
  exercises: [{ key: { userId: 1, 'doc.solved': 1 } }],
  journal: [{ key: { userId: 1, 'doc.nextResolveAt': 1 } }],
  review: [{ key: { userId: 1, 'doc.due': 1 } }],
  notes: [{ key: { userId: 1, 'doc.body': 'text' } }],
};

const partSchema = (info: PartCollectionInfo): Schema<PartRecord> => {
  const s = new Schema<PartRecord>(
    {
      userId: { type: Schema.Types.ObjectId, required: true },
      doc: { type: Schema.Types.Mixed, required: true },
    },
    { collection: info.collection, minimize: false, strict: 'throw' },
  );
  s.add({ [info.keyField]: { type: String, required: true } });
  s.index({ userId: 1, [info.keyField]: 1 }, { unique: true });
  for (const extra of PART_EXTRA_INDEXES[info.part] ?? []) {
    s.index(extra.key, extra.options);
  }
  return s;
};

export type PartModels = Record<SnapshotPartName, Model<PartRecord>>;

export interface Models {
  Settings: Model<SettingsRecord>;
  Readiness: Model<ReadinessRecord>;
  SyncOp: Model<SyncOpRecord>;
  RateLimit: Model<RateLimitRecord>;
  Part: PartModels;
}

export function registerModels(conn: Connection): Models {
  const Part = {} as PartModels;
  for (const info of PART_COLLECTIONS) {
    const existing = conn.models[info.collection];
    Part[info.part] = (existing ??
      conn.model<PartRecord>(info.collection, partSchema(info))) as Model<PartRecord>;
  }
  return {
    Settings: conn.models.Settings ?? conn.model<SettingsRecord>('Settings', settingsSchema),
    Readiness: conn.models.Readiness ?? conn.model<ReadinessRecord>('Readiness', readinessSchema),
    SyncOp: conn.models.SyncOp ?? conn.model<SyncOpRecord>('SyncOp', syncOpSchema),
    RateLimit: conn.models.RateLimit ?? conn.model<RateLimitRecord>('RateLimit', rateLimitSchema),
    Part,
  };
}

/** Indexes on the auth collections, which Better Auth's MongoDB adapter does not create itself. */
export const AUTH_INDEXES: Record<string, { key: Record<string, 1>; options?: Record<string, unknown> }[]> = {
  users: [{ key: { email: 1 }, options: { unique: true } }],
  sessions: [
    { key: { token: 1 }, options: { unique: true } },
    { key: { userId: 1 } },
    { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  accounts: [{ key: { userId: 1 } }, { key: { providerId: 1, accountId: 1 }, options: { unique: true } }],
  verification_tokens: [
    { key: { identifier: 1 } },
    { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  auth_rate_limits: [{ key: { key: 1 }, options: { unique: true } }],
};
