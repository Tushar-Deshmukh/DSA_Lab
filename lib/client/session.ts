'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchSession, type SessionUser } from './auth';

// Who is signed in. Checked against the server on load and whenever the tab becomes visible again. When the
// server cannot be reached, the last confirmed answer is used, so a signed-in learner who opens the app offline
// keeps working in their own account's copy instead of silently becoming a guest.

const LAST_USER_KEY = 'dpl-last-user';

function readLastUser(): SessionUser | null {
  try {
    const raw = window.localStorage.getItem(LAST_USER_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<SessionUser>) : null;
    return parsed && typeof parsed.id === 'string' && typeof parsed.email === 'string'
      ? { id: parsed.id, email: parsed.email }
      : null;
  } catch {
    return null;
  }
}

function writeLastUser(user: SessionUser | null): void {
  try {
    if (user) window.localStorage.setItem(LAST_USER_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(LAST_USER_KEY);
  } catch {
    // Storage blocked: offline use simply starts as a guest.
  }
}

export interface Session {
  pending: boolean;
  user: SessionUser | null;
  refresh: () => Promise<void>;
}

export function useSession(): Session {
  const [state, setState] = useState<{ pending: boolean; user: SessionUser | null }>({
    pending: true,
    user: null,
  });

  const refresh = useCallback(
    () =>
      fetchSession().then(
        (user) => {
          writeLastUser(user);
          setState({ pending: false, user });
        },
        () => setState({ pending: false, user: readLastUser() }),
      ),
    [],
  );

  useEffect(() => {
    let alive = true;
    const check = () =>
      fetchSession().then(
        (user) => {
          writeLastUser(user);
          if (alive) setState({ pending: false, user });
        },
        () => alive && setState({ pending: false, user: readLastUser() }),
      );
    void check();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return { ...state, refresh };
}
