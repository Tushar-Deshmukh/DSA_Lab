'use client';

import { useState } from 'react';
import { useLearnerState } from '@/lib/client/learner-state';
import { Dialog } from './Dialog';

// First sign-in on a device that holds guest progress (brief 5.13). Merging keeps the latest change of each
// setting, so nothing already in the account is overwritten by something older.

export function MergePrompt() {
  const { merge } = useLearnerState();
  const [busy, setBusy] = useState(false);
  const accept = async () => {
    setBusy(true);
    await merge.accept();
    setBusy(false);
  };
  return (
    <Dialog
      open={merge.open}
      onClose={merge.dismiss}
      title="Add this device's progress to your account?"
      requireChoice
    >
      <p className="text-sm text-ink-2">
        Before you signed in, this browser saved some of your choices. Adding them keeps the most recent
        version of each one, so nothing newer in your account is replaced.
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={merge.dismiss}
          className="rounded-control border border-rule px-3 py-1.5 text-sm"
        >
          Not now
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void accept()}
          className="rounded-control bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink"
        >
          {busy ? 'Adding…' : 'Add to my account'}
        </button>
      </div>
    </Dialog>
  );
}
