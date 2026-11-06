'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import {
  EMPTY_SNAPSHOT,
  SNAPSHOT_PARTS,
  applyOp,
  makeOp,
  settingsOp,
  type Snapshot,
  type SnapshotPartName,
} from '@/lib/domain/ops';
import {
  effectiveSettings,
  hasChangedSettings,
  type SettingsKey,
  type SettingsValues,
} from '@/lib/domain/settings';
import { applyAppearance } from './appearance';
import { signOutRequest } from './auth';
import { saveStatus, type SaveStatus } from './save-status';
import { useSession } from './session';
import { openStore, type LocalStore } from './store';
import { SyncEngine, type SyncStatus } from './sync-engine';

// Owns the learner's state on this device: which store is open (guest or account), the settings in it, the sync
// engine for signed-in learners, and the save status shown in the header.

export type { SaveStatus } from './save-status';

export interface Account {
  id: string;
  email: string;
}

interface LearnerState {
  ready: boolean;
  account: Account | null;
  settings: SettingsValues;
  status: SaveStatus;
  setSetting: <K extends SettingsKey>(key: K, value: SettingsValues[K]) => Promise<void>;
  merge: { open: boolean; accept: () => Promise<void>; dismiss: () => void };
  /** Tries to send queued changes, then signs out. Reports changes that could not be sent, or a failed request. */
  signOut: (force?: boolean) => Promise<{ signedOut: boolean; unsent: number; failed?: boolean }>;
}

const Ctx = createContext<LearnerState | null>(null);

const dismissKey = (userId: string) => `dpl-merge-dismissed-${userId}`;

function readDismissed(userId: string): boolean {
  try {
    return window.localStorage.getItem(dismissKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function LearnerStateProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const refreshSession = session.refresh;
  const userId = session.user?.id;
  const userEmail = session.user?.email;
  const account = useMemo<Account | null>(
    () => (userId && userEmail ? { id: userId, email: userEmail } : null),
    [userId, userEmail],
  );
  const owner = session.pending ? null : account ? `user-${account.id}` : 'guest';

  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
  const [ready, setReady] = useState(false);
  const [durable, setDurable] = useState(true);
  const [sync, setSync] = useState<SyncStatus>({ phase: 'idle', pending: 0 });
  const [online, setOnline] = useState(true);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [localWrites, setLocalWrites] = useState(0);
  const storeRef = useRef<LocalStore | null>(null);
  const engineRef = useRef<SyncEngine | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const snapshotRef = useRef<Snapshot>(EMPTY_SNAPSHOT);

  /** Puts a snapshot on screen and applies its theme, motion and focus settings. */
  const show = useCallback((s: Snapshot) => {
    snapshotRef.current = s;
    setSnapshot(s);
    applyAppearance(effectiveSettings(s.settings));
  }, []);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // Marks the page as interactive (used by the end-to-end tests). Set in an effect, after React has committed
  // `ready`, so every handler that reads it is already up to date.
  useEffect(() => {
    if (ready) document.documentElement.dataset.appReady = '1';
    else delete document.documentElement.dataset.appReady;
  }, [ready]);

  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    let store: LocalStore | null = null;
    let engine: SyncEngine | null = null;
    const accountId = owner.startsWith('user-') ? owner.slice('user-'.length) : null;

    void (async () => {
      store = await openStore(owner);
      if (cancelled) return store.close();
      storeRef.current = store;
      setDurable(store.durable);
      deviceIdRef.current = await store.deviceId();
      const local = await store.readSnapshot();
      if (cancelled) return;
      show(local);
      setReady(true);

      if (accountId) {
        engine = new SyncEngine(
          store,
          (s) => !cancelled && show(s),
          (s) => !cancelled && setSync(s),
        );
        engineRef.current = engine;
        await engine.start();
        if (cancelled || readDismissed(accountId)) return;
        const guest = await openStore('guest');
        const guestSnapshot = await guest.readSnapshot();
        guest.close();
        if (!cancelled && hasChangedSettings(guestSnapshot.settings)) setMergeOpen(true);
      }
    })();

    return () => {
      cancelled = true;
      engine?.stop();
      store?.close();
      storeRef.current = null;
      engineRef.current = null;
      deviceIdRef.current = null;
      setReady(false);
      setMergeOpen(false);
      setSync({ phase: 'idle', pending: 0 });
    };
  }, [owner, show]);

  const setSetting = useCallback(
    async <K extends SettingsKey>(key: K, value: SettingsValues[K]) => {
      const store = storeRef.current;
      const deviceId = deviceIdRef.current;
      if (!store || !deviceId) return;
      const op = settingsOp(key, value, Date.now(), deviceId, crypto.randomUUID());
      const engine = engineRef.current;
      // Show the change at once (a controlled input would otherwise snap back until the write finishes), and
      // render "Saving…" before this handler returns. The status only leaves "Saving…" once the device has stored
      // the change and, when signed in, the sync engine has counted it as queued: never "saved" too early.
      flushSync(() => {
        show(applyOp(snapshotRef.current, op) ?? snapshotRef.current);
        setLocalWrites((n) => n + 1);
      });
      try {
        show(await store.commitOp(op, engine !== null));
        if (engine) await engine.queued();
      } finally {
        setLocalWrites((n) => n - 1);
      }
    },
    [show],
  );

  const acceptMerge = useCallback(async () => {
    const store = storeRef.current;
    const engine = engineRef.current;
    if (!store || !engine) return;
    setLocalWrites((n) => n + 1);
    try {
      const guest = await openStore('guest');
      const guestSnapshot = await guest.readSnapshot();
      const deviceId = await store.deviceId();
      // One whole-snapshot merge (D-014): every part goes through its own merge rule, so the guest's
      // progress, notes and review queue fold into the account without losing either side.
      const payload: Record<string, unknown> = { settings: guestSnapshot.settings };
      for (const key of SNAPSHOT_PARTS as readonly SnapshotPartName[]) {
        if (key !== 'settings') payload[key] = guestSnapshot[key];
      }
      const next = await store.commitOp(
        makeOp('snapshot.merge', payload, { deviceId, at: Date.now() }),
        true,
      );
      await guest.destroy();
      show(next);
      setMergeOpen(false);
      await engine.queued();
    } finally {
      setLocalWrites((n) => n - 1);
    }
  }, [show]);

  const dismissMerge = useCallback(() => {
    if (account) {
      try {
        window.localStorage.setItem(dismissKey(account.id), '1');
      } catch {
        // Without storage the question simply comes back next time.
      }
    }
    setMergeOpen(false);
  }, [account]);

  const signOut = useCallback(
    async (force = false) => {
      const store = storeRef.current;
      const engine = engineRef.current;
      if (store && engine) {
        await engine.flush();
        const unsent = (await store.readOutbox()).length;
        if (unsent > 0 && !force) return { signedOut: false, unsent };
      }
      // Still signed in when the server did not confirm: keep everything on the device and let the learner retry.
      if (!(await signOutRequest().catch(() => false))) return { signedOut: false, unsent: 0, failed: true };
      // Shared computers: the account's copy on this device goes away with the session.
      engine?.stop();
      await store?.destroy();
      await refreshSession();
      return { signedOut: true, unsent: 0 };
    },
    [refreshSession],
  );

  const status: SaveStatus = useMemo(
    () => saveStatus({ ready, signedIn: account !== null, durable, localWrites, sync, online }),
    [ready, account, durable, localWrites, sync, online],
  );

  const value: LearnerState = {
    ready,
    account,
    settings: effectiveSettings(snapshot.settings),
    status,
    setSetting,
    merge: { open: mergeOpen, accept: acceptMerge, dismiss: dismissMerge },
    signOut,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLearnerState(): LearnerState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLearnerState must be used inside LearnerStateProvider');
  return ctx;
}
