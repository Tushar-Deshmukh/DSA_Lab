'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useId, useState, type FormEvent } from 'react';
import { requestMagicLink, startGitHubSignIn } from '@/lib/client/auth';
import { useLearnerState } from '@/lib/client/learner-state';

interface Props {
  github: boolean;
  email: boolean;
  emailPrintedToConsole: boolean;
}

type SendState =
  { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; to: string } | { kind: 'error'; message: string };

/** Better Auth sends the learner back here with ?error=… when a link is expired or already used. */
function LinkErrorNotice() {
  const error = useSearchParams().get('error');
  if (!error) return null;
  return (
    <p role="alert" className="mt-4 rounded-control bg-warn-soft p-3 text-sm text-ink">
      That sign-in link has expired or was already used. Ask for a new one below.
    </p>
  );
}

export function SignInForm({ github, email, emailPrintedToConsole }: Props) {
  const { account } = useLearnerState();
  const [state, setState] = useState<SendState>({ kind: 'idle' });
  const emailId = useId();

  if (account) {
    return (
      <div className="max-w-prose">
        <h1 className="text-2xl font-semibold text-ink">You are signed in</h1>
        <p className="mt-3 text-ink-2">Signed in as {account.email}.</p>
        <p className="mt-4">
          <Link href="/">Go to the home page</Link>
        </p>
      </div>
    );
  }

  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const to = String(new FormData(e.currentTarget).get('email') ?? '').trim();
    setState({ kind: 'sending' });
    const status = await requestMagicLink(to).catch(() => 0);
    if (status === 200) setState({ kind: 'sent', to });
    else
      setState({
        kind: 'error',
        message:
          status === 429
            ? 'Too many sign-in requests. Wait a minute, then try again.'
            : status === 0
              ? 'The server could not be reached. Check your connection and try again.'
              : 'The link could not be sent. Check the address and try again.',
      });
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
      <p className="mt-2 text-sm text-ink-2">
        Signing in keeps your progress in your account, so it follows you to other devices. Without an
        account, progress stays in this browser.
      </p>
      <Suspense fallback={null}>
        <LinkErrorNotice />
      </Suspense>

      {!email && !github && (
        <p className="mt-6 text-sm text-ink-2">Sign-in is not set up on this server yet.</p>
      )}

      {email &&
        (state.kind === 'sent' ? (
          <div role="status" className="mt-6 rounded-card border border-rule bg-sheet p-4">
            <p className="font-medium text-ink">Check your inbox</p>
            <p className="mt-1 text-sm text-ink-2">
              We sent a sign-in link to {state.to}. It works once and expires in 5 minutes.
              {emailPrintedToConsole && ' (Development server: the link is printed in the terminal.)'}
            </p>
            <button
              type="button"
              onClick={() => setState({ kind: 'idle' })}
              className="mt-3 text-sm text-accent underline"
            >
              Use a different address
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void send(e)} className="mt-6 flex flex-col gap-2" noValidate={false}>
            <label htmlFor={emailId} className="text-sm font-medium text-ink">
              Email address
            </label>
            <input
              id={emailId}
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-control border border-rule bg-sheet px-3 py-2 text-ink"
            />
            <button
              type="submit"
              disabled={state.kind === 'sending'}
              className="mt-2 rounded-control bg-accent px-3 py-2 font-medium text-accent-ink disabled:opacity-60"
            >
              {state.kind === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            {state.kind === 'error' && (
              <p role="alert" className="text-sm text-mistake">
                {state.message}
              </p>
            )}
          </form>
        ))}

      {github && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => void startGitHubSignIn()}
            className="w-full rounded-control border border-rule bg-sheet px-3 py-2 font-medium text-ink"
          >
            Continue with GitHub
          </button>
        </div>
      )}
    </div>
  );
}
