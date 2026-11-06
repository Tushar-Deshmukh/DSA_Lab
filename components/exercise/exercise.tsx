'use client';
import { KIND_LABEL } from '@/lib/exercise/public-shape';
import { gateLabel, useGate } from '@/lib/client/gates';
import { LockedExerciseShell } from './locked-shell';
import {
  McqExercise,
  ComplexityExercise,
  PredictExercise,
  BugExercise,
  FillExercise,
  TraceExercise,
  CodeExercise,
  InterviewExercise,
} from './renderers';

// Dispatches one exercise to its renderer by type. The page payload names the type and carries the public half
// (D-011); everything else — keys, gated content — arrives when the learner asks for it. Gated exercises carry
// no public part on the page at all: the card fetches theirs from the gate endpoint once the gate opens (D-027).

export function ExerciseRunner({
  slug,
  type,
  public: p,
}: {
  slug: string;
  type: string;
  public: Record<string, unknown>;
}) {
  switch (type) {
    case 'mcq':
    case 'pattern':
      return <McqExercise slug={slug} public={p} />;
    case 'complexity':
      return <ComplexityExercise slug={slug} public={p} />;
    case 'predict':
      return <PredictExercise slug={slug} public={p} />;
    case 'bug':
      return <BugExercise slug={slug} public={p} />;
    case 'fill':
      return <FillExercise slug={slug} public={p} />;
    case 'trace':
      return <TraceExercise slug={slug} public={p} />;
    case 'code':
      return <CodeExercise slug={slug} public={p} />;
    case 'interview':
      return <InterviewExercise slug={slug} public={p} />;
    default:
      return (
        <LockedExerciseShell tone="error" label="Exercise" data={slug}>
          <p>An exercise of type {type} has no renderer yet.</p>
        </LockedExerciseShell>
      );
  }
}

export { KIND_LABEL };

/** The gated exercise's page card (D-027): locked until the gate opens, then rendered from the gate's content. */
export function LockedExercise({
  id,
  slug,
  gateId,
}: {
  /** The exercise id as the page refers to it, for data attributes only. */
  id: string;
  slug: string;
  gateId: string;
}) {
  const gate = useGate(gateId);

  if (!gate.open) {
    return (
      <LockedExerciseShell tone="locked" label="Locked" data={id}>
        <p>
          <span aria-hidden="true">◇ </span>
          Opens after {gateLabel(gateId)} is finished.
        </p>
      </LockedExerciseShell>
    );
  }

  if (gate.loading) {
    return (
      <LockedExerciseShell tone="locked" label="Loading" data={id} busy>
        <p>Loading the exercises this gate holds…</p>
      </LockedExerciseShell>
    );
  }

  if (gate.failed) {
    return (
      <LockedExerciseShell tone="error" label="Locked" data={id}>
        <p>Could not load the exercise. Check the connection and try again.</p>
        <button
          type="button"
          onClick={gate.retry}
          className="mt-2 rounded-control border border-rule bg-sheet px-2.5 py-1 text-sm text-ink hover:border-ink-3"
        >
          Retry
        </button>
      </LockedExerciseShell>
    );
  }

  if (!gate.content) {
    return (
      <LockedExerciseShell tone="error" label="Locked" data={id}>
        <p role="alert">The exercise did not arrive with the gate&apos;s content.</p>
      </LockedExerciseShell>
    );
  }

  const held = gate.content.exercises[slug];
  if (!held) {
    return (
      <LockedExerciseShell tone="error" label="Exercise" data={id}>
        <p role="alert">Exercise {id} is not in this gate&apos;s content.</p>
      </LockedExerciseShell>
    );
  }

  // Keyed by the gate: a fresh mount when the content arrives, so any cached state from the locked state is gone.
  return <ExerciseRunner key={slug} slug={slug} type={held.type} public={held.public} />;
}
