import { describe, expect, it } from 'vitest';
import {
  EMPTY_SNAPSHOT,
  MAX_OPS_PER_REQUEST,
  OpSchema,
  SyncRequestSchema,
  applyOp,
  rebase,
  settingsOp,
  type Op,
} from '@/lib/domain/ops';

const DEVICE = 'device-0001';
let n = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;

describe('operations', () => {
  it('validate their envelope', () => {
    const op = settingsOp('theme', 'dark', 1000, DEVICE, uuid());
    expect(OpSchema.safeParse(op).success).toBe(true);
    expect(OpSchema.safeParse({ ...op, opId: 'not-a-uuid' }).success).toBe(false);
    expect(OpSchema.safeParse({ ...op, deviceId: 'x' }).success).toBe(false);
    expect(OpSchema.safeParse({ ...op, at: -1 }).success).toBe(false);
    expect(OpSchema.safeParse({ ...op, payload: { key: 'colour', value: 'red' } }).success).toBe(false);
    expect(OpSchema.safeParse({ ...op, type: 'settings.delete' }).success).toBe(false);
  });

  it('apply valid values and refuse invalid ones', () => {
    const ok = applyOp(EMPTY_SNAPSHOT, settingsOp('editorFontSize', 18, 1000, DEVICE, uuid()));
    expect(ok?.settings.values.editorFontSize).toBe(18);
    const bad: Op = {
      ...settingsOp('theme', 'dark', 1000, DEVICE, uuid()),
      payload: { key: 'theme', value: 'blue' },
    };
    expect(applyOp(EMPTY_SNAPSHOT, bad)).toBeNull();
  });

  it('rebase pending changes on top of the server copy', () => {
    const server = applyOp(EMPTY_SNAPSHOT, settingsOp('theme', 'light', 2000, DEVICE, uuid()))!;
    const pending = [
      settingsOp('theme', 'dark', 3000, DEVICE, uuid()),
      settingsOp('focusMode', true, 1000, DEVICE, uuid()),
      // Older than the server's change: loses.
      settingsOp('theme', 'system', 1500, DEVICE, uuid()),
    ];
    const local = rebase(server, pending);
    expect(local.settings.values).toEqual({ theme: 'dark', focusMode: true });
  });

  it('accept 1 to 100 operations per request', () => {
    expect(SyncRequestSchema.safeParse({ ops: [] }).success).toBe(false);
    expect(SyncRequestSchema.safeParse({ ops: [{}] }).success).toBe(true);
    expect(SyncRequestSchema.safeParse({ ops: Array(MAX_OPS_PER_REQUEST + 1).fill({}) }).success).toBe(false);
    expect(SyncRequestSchema.safeParse({ notOps: 1 }).success).toBe(false);
  });
});
