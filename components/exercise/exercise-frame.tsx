'use client';
import { useCallback, useState, type ReactNode } from 'react';
import { GHOST } from './ui';
import { useExercise, type ExerciseApi } from './use-exercise';
import { exerciseStatus } from '@/lib/domain/exercises';

// The frame every exercise renders into, ported from the legacy `frame()`: header with the kind label, tag and
// status; the body, whose own action buttons come first; then the hint ladder, Show answer (held back until the
// legacy reveal rule is met) and Reset; then the feedback stack. The body re-mounts on Reset, fresh, while the
// record's attempt history stays.

export interface FeedbackItem {
  kind: 'ok' | 'bad' | 'hint' | 'info';
  tag: string;
  content: ReactNode;
}

export interface ExCtx extends ExerciseApi {
  /** Replaces the whole feedback stack. */
  feedback: (item: FeedbackItem) => void;
  /** Adds one box under the latest. */
  addFeedback: (item: FeedbackItem) => void;
  clearFeedback: () => void;
  /** Bumps the body to a fresh render. */
  reset: () => void;
  /** True while this session has shown the answer; a reload starts fresh, as in the legacy app. */
  revealedNow: boolean;
}

const FEEDBACK_STYLES: Record<FeedbackItem['kind'], string> = {
  ok: 'border-st-done/60 bg-st-done-soft',
  bad: 'border-st-error/50 bg-st-error-soft',
  hint: 'border-st-current/50 bg-st-current-soft',
  info: 'border-rule bg-paper',
};

const FEEDBACK_TONES: Record<FeedbackItem['kind'], string> = {
  ok: 'text-st-done',
  bad: 'text-st-error',
  hint: 'text-st-current',
  info: 'text-ink-2',
};

function FeedbackBox({ item }: { item: FeedbackItem }) {
  return (
    <div
      className={`rounded-card border px-3 py-2.5 text-sm text-ink ${FEEDBACK_STYLES[item.kind]}`}
      data-tone={item.kind}
    >
      <span
        className={`mb-1 block font-ui text-[11px] font-bold tracking-[0.08em] uppercase ${FEEDBACK_TONES[item.kind]}`}
      >
        {item.tag}
      </span>
      <div className="space-y-1.5">{item.content}</div>
    </div>
  );
}

export function ExerciseFrame({
  slug,
  label,
  tag,
  hints,
  clearDraftsOnReset = true,
  children,
}: {
  slug: string;
  label: string;
  tag?: string;
  hints: readonly string[];
  /** Code and interview keep the draft across a Reset, as in the legacy app. */
  clearDraftsOnReset?: boolean;
  children: (ctx: ExCtx) => ReactNode;
}) {
  const api = useExercise(slug);
  const record = api.record;
  const [hintShown, setHintShown] = useState(0);
  const [revealedNow, setRevealedNow] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [nonce, setNonce] = useState(0);
  const [solvedFlash, setSolvedFlash] = useState<'ok' | 'bad' | null>(null);

  const reset = useCallback(() => {
    setHintShown(0);
    setRevealedNow(false);
    setFeedback([]);
    setSolvedFlash(null);
    setNonce((n) => n + 1);
    if (clearDraftsOnReset) api.cleared();
  }, [api, clearDraftsOnReset]);

  const ctx: ExCtx = {
    ...api,
    checked: (ok, kind) => {
      setSolvedFlash(ok ? 'ok' : 'bad');
      api.checked(ok, kind);
    },
    feedback: (item) => setFeedback([item]),
    addFeedback: (item) => setFeedback((fb) => [...fb, item]),
    clearFeedback: () => setFeedback([]),
    reset,
    revealedNow,
  };

  const hintStep = (next: number) => {
    if (next > hints.length) return;
    setHintShown(next);
    setFeedback((fb) => [
      ...fb,
      { kind: 'hint', tag: `Hint ${next} of ${hints.length}`, content: <p>{hints[next - 1]}</p> },
    ]);
    api.hinted(next);
  };

  const status = exerciseStatus(record);

  return (
    <section
      data-exercise={slug}
      style={
        solvedFlash === 'bad'
          ? { borderColor: 'var(--st-error)' }
          : solvedFlash === 'ok'
            ? { borderColor: 'var(--st-done)' }
            : undefined
      }
      className="rounded-card border shadow-card"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule-2 bg-sheet px-3.5 py-2">
        <span className="font-ui text-[11px] font-bold tracking-[0.08em] text-accent uppercase">{label}</span>
        {tag ? <span className="font-ui text-xs text-ink-2">{tag}</span> : null}
        <span className="ml-auto font-ui text-xs text-ink-2 tabular">{status}</span>
      </div>
      <div className="space-y-2.5 bg-sheet px-3.5 py-3">
        <div key={nonce} className="space-y-3">
          {children(ctx)}
        </div>
        <div className="flex flex-wrap gap-2">
          {hints.length > 0 && (
            <button
              type="button"
              className={GHOST}
              disabled={hintShown >= hints.length}
              onClick={() => hintStep(hintShown + 1)}
            >
              {hintShown === 0
                ? 'Hint 1'
                : hintShown >= hints.length
                  ? 'No more hints'
                  : `Hint ${hintShown + 1}`}
            </button>
          )}
          <button
            type="button"
            className={GHOST}
            disabled={revealedNow || !api.canReveal}
            title={api.canReveal ? undefined : 'The answer opens after a hint or two wrong attempts.'}
            onClick={() => {
              setRevealedNow(true);
              setSolvedFlash(null);
              api.revealed();
            }}
          >
            Show answer
          </button>
          <button type="button" className={GHOST} onClick={reset}>
            Reset
          </button>
        </div>
        {feedback.length > 0 && (
          <div className="space-y-2" data-feedback="">
            {feedback.map((item, i) => (
              <FeedbackBox key={i} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
