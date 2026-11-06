'use client';
import { useLearnerState } from '@/lib/client/learner-state';
import { makeOp } from '@/lib/domain/ops';
import { canReveal, exerciseOutcome, type ExerciseRecord, type MistakeKind } from '@/lib/domain/exercises';

// One exercise's record and the operations that change it (D-014). Every UI event becomes an op: applied on
// the device at once, queued for sync, applied again by the server with the same rule. The record drives the
// header status, the hint ladder and the reveal rule; no answer text is stored in it.

export interface ExerciseApi {
  record: ExerciseRecord | undefined;
  ready: boolean;
  /** The reveal rule, ported: one hint or two wrong attempts. */
  canReveal: boolean;
  checked: (ok: boolean, kind?: MistakeKind) => void;
  hinted: (rung: number) => void;
  revealed: () => void;
  drafted: (slot: string, value: string) => void;
  stageNoted: (stage: string, value: string) => void;
  setCustomTests: (tests: { args: unknown[]; expect?: unknown }[]) => void;
  cleared: () => void;
}

const ev = () => crypto.randomUUID().slice(0, 64);

export function useExercise(slug: string): ExerciseApi {
  const { snapshot, commit, opContext, ready } = useLearnerState();
  const record = snapshot.exercises[slug];

  /** Builds the op here so its payload is typed against the union, then commits with the device context. */
  async function withCtx(op: (deviceId: string, at: number) => Parameters<typeof commit>[0]): Promise<void> {
    if (!ready) return;
    const ctx = await opContext();
    if (!ctx) return;
    await commit(op(ctx.deviceId, ctx.at));
  }

  return {
    record,
    ready,
    canReveal: canReveal(record),
    checked: (ok, kind) =>
      void withCtx((deviceId, at) =>
        makeOp('exercise.checked', { slug, ev: ev(), ok, ...(kind ? { mine: kind } : {}) }, { deviceId, at }),
      ),
    hinted: (rung) =>
      void withCtx((deviceId, at) => makeOp('exercise.hinted', { slug, ev: ev(), rung }, { deviceId, at })),
    revealed: () =>
      void withCtx((deviceId, at) => makeOp('exercise.revealed', { slug, ev: ev() }, { deviceId, at })),
    drafted: (slot, value) =>
      void withCtx((deviceId, at) => makeOp('exercise.drafted', { slug, slot, value }, { deviceId, at })),
    stageNoted: (stage, value) =>
      void withCtx((deviceId, at) =>
        makeOp('exercise.stage-noted', { slug, stage, value }, { deviceId, at }),
      ),
    setCustomTests: (tests) =>
      void withCtx((deviceId, at) => makeOp('exercise.custom-tests', { slug, tests }, { deviceId, at })),
    cleared: () =>
      void withCtx((deviceId, at) => makeOp('exercise.work-cleared', { slug }, { deviceId, at })),
  };
}

/** The spaced-repetition rating this record maps to, for the review queue and status lines. */
export function recordRating(r: ExerciseRecord | undefined): 'first-try' | 'with-effort' | 'viewed' | 'none' {
  if (!r) return 'none';
  return exerciseOutcome(r);
}
