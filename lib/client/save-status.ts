import type { SyncStatus } from './sync-engine';

// What the header's save chip says (brief principle 7: honest state). Kept pure so every case is unit-tested.

export type SaveStatus =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'device' }
  | { kind: 'saving'; pending: number; to: 'device' | 'account' }
  | { kind: 'waiting'; pending: number; online: boolean }
  | { kind: 'saved' }
  | { kind: 'signed-out'; pending: number };

export interface SaveStatusInput {
  ready: boolean;
  signedIn: boolean;
  /** False when the browser blocks IndexedDB and the store lives in memory. */
  durable: boolean;
  /** Changes not yet written to the device store. */
  localWrites: number;
  sync: SyncStatus;
  online: boolean;
}

export function saveStatus({
  ready,
  signedIn,
  durable,
  localWrites,
  sync,
  online,
}: SaveStatusInput): SaveStatus {
  if (!ready) return { kind: 'loading' };
  if (!durable && !signedIn) return { kind: 'unavailable' };
  if (localWrites > 0) return { kind: 'saving', pending: sync.pending, to: 'device' };
  if (!signedIn) return { kind: 'device' };
  if (sync.phase === 'signed-out') return { kind: 'signed-out', pending: sync.pending };
  // "Waiting" only after a failed attempt; a change about to be sent is still "Saving…".
  if (sync.phase === 'waiting' && sync.pending > 0) return { kind: 'waiting', pending: sync.pending, online };
  if (sync.phase === 'syncing' || sync.pending > 0)
    return { kind: 'saving', pending: sync.pending, to: 'account' };
  return { kind: 'saved' };
}
