'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useLearnerState } from '@/lib/client/learner-state';

export function AccountMenu() {
  const { account, signOut } = useLearnerState();
  const [open, setOpen] = useState(false);
  const [unsent, setUnsent] = useState(0);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!account) {
    return (
      <Link
        href="/sign-in"
        className="rounded-control px-2 py-1 text-sm font-medium text-accent hover:underline"
      >
        Sign in
      </Link>
    );
  }

  const run = async (force: boolean) => {
    setBusy(true);
    const result = await signOut(force);
    setBusy(false);
    setFailed(Boolean(result.failed));
    if (result.signedOut) {
      setOpen(false);
      setUnsent(0);
    } else setUnsent(result.unsent);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="max-w-48 truncate rounded-control border border-rule px-2 py-1 text-sm text-ink"
      >
        <span className="sr-only">Account: </span>
        {account.email}
      </button>
      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-20 mt-2 w-72 rounded-card border border-rule bg-sheet p-3 shadow-card"
        >
          <p className="text-sm text-ink-2">
            Signed in as <span className="font-medium text-ink">{account.email}</span>
          </p>
          {unsent > 0 ? (
            <div className="mt-3 rounded-control bg-warn-soft p-2 text-sm text-ink" role="alert">
              <p>
                {unsent} change{unsent === 1 ? ' has' : 's have'} not reached your account yet. Signing out
                now loses {unsent === 1 ? 'it' : 'them'}.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(true)}
                  className="rounded-control border border-rule px-2 py-1"
                >
                  Sign out anyway
                </button>
                <button
                  type="button"
                  onClick={() => setUnsent(0)}
                  className="rounded-control bg-accent px-2 py-1 text-accent-ink"
                >
                  Stay signed in
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(false)}
              className="mt-3 rounded-control border border-rule px-2 py-1 text-sm text-ink"
            >
              {busy ? 'Signing out…' : 'Sign out'}
            </button>
          )}
          {failed && (
            <p role="alert" className="mt-2 text-sm text-mistake">
              Signing out did not work. You are still signed in; check your connection and try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
