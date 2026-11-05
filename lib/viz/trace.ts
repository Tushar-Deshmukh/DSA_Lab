// One run of a visualizer, worked out in full before it is shown: the steps, each step's view, the generic predict
// question before each step, and which steps are decisions. At most 600 steps (MAX_STEPS), so scrubbing never waits.
import { defaultInput, runViz, viewOf, type ResolvedStep } from './engine';
import { genericQuestion, type PredictQuestion } from './predict';
import type { AnyViz, VizNode, VizStep } from './types';

export interface Trace {
  input: Record<string, unknown>;
  steps: ResolvedStep<VizStep>[];
  views: VizNode[][];
  /** `questions[k]` is asked before moving from step k to step k + 1. */
  questions: (PredictQuestion | null)[];
  /** Steps that explain a decision (`why`) or follow a change the learner could predict. */
  decisions: number[];
}

/** Runs a visualizer on an input. Throws the message the learner should read, as `runViz` does. */
export function traceOf(viz: AnyViz, input: Record<string, unknown>): Trace {
  // The run may change its input, and the views must read the input the run saw.
  const copy = structuredClone(input);
  const steps = runViz(viz, copy);
  const views = steps.map((s) => viewOf(viz, s, copy));
  const questions = views.map((v, k) =>
    k + 1 < views.length ? genericQuestion(v, views[k + 1] as VizNode[]) : null,
  );
  const decisions = steps.flatMap((s, k) => (s.why || (k > 0 && questions[k - 1]) ? [k] : []));
  return { input, steps, views, questions, decisions };
}

/** The default input with an embed's overrides on top. */
export const startInput = (viz: AnyViz, overrides?: Record<string, unknown>): Record<string, unknown> => ({
  ...(defaultInput(viz) as Record<string, unknown>),
  ...overrides,
});

/** The active code lines of a step, as a list. */
export const activeLines = (step: VizStep): number[] =>
  [step.line ?? []].flat().filter((n): n is number => typeof n === 'number');
