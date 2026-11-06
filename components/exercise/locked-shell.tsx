import type { ReactNode } from 'react';

// The quiet card the page shows where an exercise exists but its content is not here yet: a gate that is still
// shut, a load that failed, or a type with no renderer. Same card shape as the exercise frame, so the page's
// rhythm holds while the real exercise is away.

const TONES = {
  locked: 'border-dashed border-rule bg-sheet text-ink-2',
  error: 'border-st-error/50 bg-st-error-soft text-ink',
} as const;

export function LockedExerciseShell({
  tone,
  label,
  data,
  busy,
  children,
}: {
  tone: keyof typeof TONES;
  label: string;
  data: string;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      data-exercise={data}
      data-locked={busy ? undefined : tone === 'locked' ? 'true' : undefined}
      aria-busy={busy || undefined}
      className={`rounded-card border px-3.5 py-3 ${TONES[tone]}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule-2 pb-2">
        <span className="font-ui text-[11px] font-bold tracking-[0.08em] text-ink-3 uppercase">{label}</span>
        <span className="ml-auto font-ui text-xs text-ink-3 tabular">
          {label === 'Locked' ? 'Opens later' : ''}
        </span>
      </div>
      <div className="space-y-2 pt-2.5 text-sm">{children}</div>
    </section>
  );
}
