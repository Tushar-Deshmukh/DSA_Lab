// The four Better Auth endpoints the browser needs, called directly. Better Auth's own client library would add
// about 100 KB (gzip) to every page, mostly a second copy of the validation code the server already runs.

export interface SessionUser {
  id: string;
  email: string;
}

const json = { 'Content-Type': 'application/json' };

/** The signed-in learner, or null for a guest. Throws when the server cannot be reached. */
export async function fetchSession(): Promise<SessionUser | null> {
  const res = await fetch('/api/auth/get-session', { credentials: 'same-origin', cache: 'no-store' });
  if (!res.ok) throw new Error(`session check failed (${res.status})`);
  const body = (await res.json()) as { user?: { id?: unknown; email?: unknown } } | null;
  const user = body?.user;
  return user && typeof user.id === 'string' && typeof user.email === 'string'
    ? { id: user.id, email: user.email }
    : null;
}

/** Asks for a sign-in email. Returns the HTTP status (200 when the email was sent). */
export async function requestMagicLink(email: string): Promise<number> {
  const res = await fetch('/api/auth/sign-in/magic-link', {
    method: 'POST',
    headers: json,
    credentials: 'same-origin',
    body: JSON.stringify({ email, callbackURL: '/', errorCallbackURL: '/sign-in' }),
  });
  return res.status;
}

/** Starts GitHub sign-in: the server answers with GitHub's authorisation page, which the browser opens. */
export async function startGitHubSignIn(): Promise<boolean> {
  const res = await fetch('/api/auth/sign-in/social', {
    method: 'POST',
    headers: json,
    credentials: 'same-origin',
    body: JSON.stringify({ provider: 'github', callbackURL: '/' }),
  });
  const body = (await res.json().catch(() => null)) as { url?: unknown } | null;
  if (!res.ok || typeof body?.url !== 'string') return false;
  window.location.assign(body.url);
  return true;
}

/** Ends the session. Returns false when the server did not confirm it. */
export async function signOutRequest(): Promise<boolean> {
  const res = await fetch('/api/auth/sign-out', {
    method: 'POST',
    headers: json,
    credentials: 'same-origin',
    body: '{}',
  });
  return res.ok;
}
