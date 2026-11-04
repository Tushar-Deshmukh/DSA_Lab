import { describe, expect, it } from 'vitest';
import { saveStatus, type SaveStatusInput } from '@/lib/client/save-status';

const base: SaveStatusInput = {
  ready: true,
  signedIn: false,
  durable: true,
  localWrites: 0,
  sync: { phase: 'idle', pending: 0 },
  online: true,
};
const status = (over: Partial<SaveStatusInput>) => saveStatus({ ...base, ...over });

describe('save status (honest state)', () => {
  it('says nothing until the store is open', () => {
    expect(status({ ready: false })).toEqual({ kind: 'loading' });
  });

  it('for guests: on this device, saving while a write is in flight, or not saved at all', () => {
    expect(status({})).toEqual({ kind: 'device' });
    expect(status({ localWrites: 1 })).toMatchObject({ kind: 'saving', to: 'device' });
    expect(status({ durable: false })).toEqual({ kind: 'unavailable' });
  });

  it('for accounts: saved only when nothing is queued', () => {
    const signedIn = { signedIn: true };
    expect(status(signedIn)).toEqual({ kind: 'saved' });
    expect(status({ ...signedIn, localWrites: 1 })).toMatchObject({ kind: 'saving', to: 'device' });
    // Queued and about to be sent: still saving, not "waiting".
    expect(status({ ...signedIn, sync: { phase: 'idle', pending: 1 } })).toMatchObject({
      kind: 'saving',
      to: 'account',
    });
    expect(status({ ...signedIn, sync: { phase: 'syncing', pending: 2 } })).toMatchObject({
      kind: 'saving',
      pending: 2,
    });
  });

  it('reports waiting only after a failed attempt, and says whether the browser is offline', () => {
    expect(status({ signedIn: true, sync: { phase: 'waiting', pending: 3 }, online: false })).toEqual({
      kind: 'waiting',
      pending: 3,
      online: false,
    });
  });

  it('asks to sign in again when the session ended', () => {
    expect(status({ signedIn: true, sync: { phase: 'signed-out', pending: 1 } })).toEqual({
      kind: 'signed-out',
      pending: 1,
    });
  });
});
