import './zod';
import * as z from 'zod/mini';
import {
  EMPTY_SETTINGS_DOC,
  SETTINGS_KEYS,
  SettingsDocSchema,
  parseSettingValue,
  setSetting,
  type SettingsKey,
  type SettingsValues,
} from './settings';

// Every change a learner makes is an operation (decision D-014): applied on the device at once, queued in the
// outbox, then applied again by the server with the same function. The opId makes a replayed operation harmless.

const base = {
  opId: z.uuid(),
  at: z.int().check(z.positive()),
  deviceId: z.string().check(z.minLength(8), z.maxLength(64)),
};

export const SettingsSetOpSchema = z.object({
  ...base,
  type: z.literal('settings.set'),
  payload: z.object({ key: z.enum(SETTINGS_KEYS), value: z.unknown() }),
});

export const OpSchema = z.discriminatedUnion('type', [SettingsSetOpSchema]);
export type Op = z.infer<typeof OpSchema>;

/** Everything the server keeps for one learner, in the shape the device stores it. */
export const SnapshotSchema = z.object({ settings: SettingsDocSchema });
export type Snapshot = z.infer<typeof SnapshotSchema>;
export const EMPTY_SNAPSHOT: Snapshot = { settings: EMPTY_SETTINGS_DOC };

export const MAX_OPS_PER_REQUEST = 100;
/** Each op is validated on its own, so one bad op cannot block the rest of the outbox. */
export const SyncRequestSchema = z.object({
  ops: z.array(z.unknown()).check(z.minLength(1), z.maxLength(MAX_OPS_PER_REQUEST)),
});

export type OpStatus = 'applied' | 'duplicate' | 'rejected';
export interface OpResult {
  opId: string;
  status: OpStatus;
  reason?: string;
}
export interface SyncResponse {
  results: OpResult[];
  snapshot: Snapshot;
}

/** Applies one operation. Returns null when the operation is not valid for these documents. */
export function applyOp(snapshot: Snapshot, op: Op): Snapshot | null {
  switch (op.type) {
    case 'settings.set': {
      const value = parseSettingValue(op.payload.key, op.payload.value);
      if (value === undefined) return null;
      return { ...snapshot, settings: setSetting(snapshot.settings, op.payload.key, value, op.at) };
    }
  }
}

/** Re-applies operations the server has not acknowledged yet on top of the server's documents. */
export function rebase(server: Snapshot, pending: readonly Op[]): Snapshot {
  return pending.reduce((acc, op) => applyOp(acc, op) ?? acc, server);
}

export function settingsOp<K extends SettingsKey>(
  key: K,
  value: SettingsValues[K],
  at: number,
  deviceId: string,
  opId: string,
): Op {
  return { opId, at, deviceId, type: 'settings.set', payload: { key, value } };
}
