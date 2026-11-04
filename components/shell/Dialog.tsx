'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

// A modal built on the native <dialog>: focus is trapped and Escape closes it without extra code.

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Escape and the backdrop do nothing when the learner must choose. */
  requireChoice?: boolean;
}

export function Dialog({ open, onClose, title, children, requireChoice = false }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!requireChoice) onClose();
      }}
      onClick={(e) => {
        if (!requireChoice && e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-card border border-rule bg-sheet p-0 text-ink shadow-card backdrop:bg-ink/30"
    >
      <div className="p-5">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </dialog>
  );
}
