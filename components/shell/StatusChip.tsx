'use client';

import { Cloud, CloudOff, HardDrive, Loader2, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLearnerState, type SaveStatus } from '@/lib/client/learner-state';

// Honest save state (brief principle 7): where the learner's progress is right now.

function describe(status: SaveStatus): { text: string; detail: string; icon: ReactNode } | null {
  const plural = (n: number) => `${n} change${n === 1 ? '' : 's'}`;
  switch (status.kind) {
    case 'loading':
      return null;
    case 'unavailable':
      return {
        text: 'Not saved',
        detail: 'This browser blocks storage, so progress will be lost when the page closes.',
        icon: <TriangleAlert aria-hidden size={14} />,
      };
    case 'device':
      return {
        text: 'Saved on this device',
        detail: 'Sign in to keep your progress in your account.',
        icon: <HardDrive aria-hidden size={14} />,
      };
    case 'saving':
      return {
        text: 'Saving…',
        detail:
          status.to === 'device'
            ? 'Storing your change on this device.'
            : 'Sending your changes to your account.',
        icon: <Loader2 aria-hidden size={14} />,
      };
    case 'waiting':
      return {
        text: `${plural(status.pending)} waiting`,
        detail: status.online
          ? 'Your account could not be reached. Changes are kept on this device and sent automatically.'
          : 'You are offline. Changes are kept on this device and sent when you reconnect.',
        icon: <CloudOff aria-hidden size={14} />,
      };
    case 'saved':
      return {
        text: 'Saved to your account',
        detail: 'Everything is saved.',
        icon: <Cloud aria-hidden size={14} />,
      };
    case 'signed-out':
      return {
        text: 'Sign in again',
        detail: `Your session ended. ${status.pending > 0 ? `${plural(status.pending)} on this device will be sent after you sign in.` : ''}`,
        icon: <TriangleAlert aria-hidden size={14} />,
      };
  }
}

export function StatusChip() {
  const { status } = useLearnerState();
  const d = describe(status);
  return (
    <span
      role="status"
      data-save-state={status.kind}
      title={d?.detail}
      className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-rule px-2.5 text-xs text-ink-2"
    >
      {d ? (
        <>
          {d.icon}
          <span>{d.text}</span>
          <span className="sr-only">. {d.detail}</span>
        </>
      ) : (
        <span className="sr-only">Loading your progress</span>
      )}
    </span>
  );
}
