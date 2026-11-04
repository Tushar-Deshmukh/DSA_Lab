import { Schema, type Connection, type Model, type Types } from 'mongoose';

// Mongoose models for the app's own collections (plan §10). Values that come from learners are validated with
// the Zod schemas in lib/domain before they reach these models; Mixed fields hold those validated shapes.

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

export interface Models {
  Settings: Model<SettingsRecord>;
  SyncOp: Model<SyncOpRecord>;
  RateLimit: Model<RateLimitRecord>;
}

export function registerModels(conn: Connection): Models {
  return {
    Settings: conn.models.Settings ?? conn.model<SettingsRecord>('Settings', settingsSchema),
    SyncOp: conn.models.SyncOp ?? conn.model<SyncOpRecord>('SyncOp', syncOpSchema),
    RateLimit: conn.models.RateLimit ?? conn.model<RateLimitRecord>('RateLimit', rateLimitSchema),
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
