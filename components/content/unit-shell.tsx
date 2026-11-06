'use client';
import type { ReactNode } from 'react';
import { useLearnerState } from '@/lib/client/learner-state';
import { makeOp } from '@/lib/domain/ops';

// One unit of a page (was a legacy `##` section, plan 5.2): header with the kind label and, on lesson pages,
// the mark-done control; below it the unit's blocks. Reading alone marks nothing (plan §10) — the learner marks
// a unit, or a solved exercise inside it records the evidence. Minutes come from the page's unit-minutes map (5.3).

/** The header's label per unit kind, in the course's words (plan 5.2). */
export const UNIT_LABELS: Record<string, string> = {
  before: 'Before you start',
  after: 'After the attempt',
  overview: 'Overview',
  theory: 'Theory',
  reference: 'Reference',
  code: 'Worked example',
  visual: 'Visual dry run',
  dryrun: 'Dry run',
  complexity: 'Complexity',
  tradeoffs: 'Trade-offs',
  pattern: 'Pattern',
  guided: 'Guided problem',
  stretch: 'Stretch, optional',
  practice: 'Practice',
  'warm-up': 'Warm-up',
  drill: 'Drill',
  mock: 'Mock',
  review: 'Review your solutions',
  repair: 'Repair session',
  summary: 'Summary',
  revision: 'Revision prompt',
  'self-check': 'Ready to move on',
};

export function unitLabel(kind: string): string {
  return UNIT_LABELS[kind] ?? kind;
}

export function UnitShell({
  id,
  kind,
  title,
  phase,
  minutes,
  lesson,
  children,
}: {
  id: string;
  kind: string;
  title: string;
  phase?: string;
  minutes?: number;
  /** Present on lesson pages: the lesson key the mark-done op is written against. */
  lesson?: string;
  children: ReactNode;
}) {
  const { snapshot, commit, opContext, ready } = useLearnerState();
  const done = lesson ? Boolean(snapshot.lessons[lesson]?.units[id]) : false;

  const mark = () => {
    if (done) return;
    void (async () => {
      const ctx = await opContext();
      if (!ctx) return;
      await commit(makeOp('lesson.unit-done', { lesson: lesson ?? '', unit: id }, ctx));
    })();
  };

  return (
    <section data-unit-id={id} data-unit-kind={kind} aria-labelledby={`unit-${id}-title`} className="scroll-mt-20 space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={`unit-${id}-title`} className="text-xl font-semibold text-ink">
          {title}
        </h2>
        <span className="font-ui text-[11px] font-bold tracking-[0.08em] text-accent uppercase">{unitLabel(kind)}</span>
        {typeof minutes === 'number' ? (
          <span className="font-ui text-xs text-ink-3 tabular">about {minutes} min</span>
        ) : null}
        {phase ? <span className="font-ui text-xs text-ink-3">{phase}</span> : null}
        {lesson && ready ? (
          done ? (
            <span className="ml-auto font-ui text-xs text-st-done" data-unit-done="true">
              ✓ Done
            </span>
          ) : (
            <button
              type="button"
              onClick={mark}
              className="ml-auto rounded-control border border-rule bg-sheet px-2.5 py-1 text-sm text-ink hover:border-ink-3"
              data-unit-done="false"
            >
              Mark done
            </button>
          )
        ) : null}
      </div>
      {children}
    </section>
  );
}
