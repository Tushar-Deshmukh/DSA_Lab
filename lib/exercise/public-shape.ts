import type { Exercise } from '@/lib/content/schema';

// The public half of an exercise (D-011), in the shape lib/content/split.ts writes it. The renderer passes it
// to the client components as plain JSON; these narrow types keep the renderers honest about what is there.
// Nothing here may say what is correct: no ok flags, explanations, solutions or hidden tests.

export interface PublicBase {
  id: string;
  legacyId: string;
  type: Exercise['type'];
  hints: string[];
  tag?: string;
}

export interface McqPublic extends PublicBase {
  type: 'mcq' | 'pattern';
  q: string;
  code?: string;
  multi: boolean;
  options: Array<{ t: string }>;
}

export interface ComplexityPublic extends PublicBase {
  type: 'complexity';
  q?: string;
  code?: string;
  fields: Array<{ label: string; options?: string[] }>;
}

export interface BugPublic extends PublicBase {
  type: 'bug';
  q: string;
  code: string;
}

export interface PredictPublic extends PublicBase {
  type: 'predict';
  q: string;
  code: string;
  normalize?: 'exact';
  placeholder?: string;
  answerLines: number;
}

export interface FillPublic extends PublicBase {
  type: 'fill';
  q: string;
  template: string;
  blanks: Array<{ w?: number }>;
  fn: string;
  tests: NonNullable<Extract<Exercise, { type: 'fill' }>['tests']>[number][];
  compare?: 'unordered' | 'sorted' | 'float';
  adapt?: { args?: (string | null)[]; ret?: string };
  checker?: string;
}

export interface TracePublic extends PublicBase {
  type: 'trace';
  q: string;
  code?: string;
  rows: Array<{ prompt: string; w?: number }>;
}

export interface CodePublic extends PublicBase {
  type: 'code';
  q: string;
  starter: string;
  fn: string;
  tests: Array<{ args?: unknown[]; expect?: unknown; ops?: unknown[][] }>;
  compare?: 'unordered' | 'sorted' | 'float';
  adapt?: { args?: (string | null)[]; ret?: string };
  checker?: string;
}

export interface InterviewPublic extends PublicBase {
  type: 'interview';
  title: string;
  q: string;
  starter?: string;
  fn?: string;
  tests?: Array<{ args?: unknown[]; expect?: unknown; ops?: unknown[][] }>;
  compare?: 'unordered' | 'sorted' | 'float';
  adapt?: { args?: (string | null)[]; ret?: string };
  checker?: string;
}

export type AnyPublic =
  | McqPublic
  | ComplexityPublic
  | BugPublic
  | PredictPublic
  | FillPublic
  | TracePublic
  | CodePublic
  | InterviewPublic;

export const asMcq = (p: Record<string, unknown>) => p as unknown as McqPublic;
export const asComplexity = (p: Record<string, unknown>) => p as unknown as ComplexityPublic;
export const asBug = (p: Record<string, unknown>) => p as unknown as BugPublic;
export const asPredict = (p: Record<string, unknown>) => p as unknown as PredictPublic;
export const asFill = (p: Record<string, unknown>) => p as unknown as FillPublic;
export const asTrace = (p: Record<string, unknown>) => p as unknown as TracePublic;
export const asCode = (p: Record<string, unknown>) => p as unknown as CodePublic;
export const asInterview = (p: Record<string, unknown>) => p as unknown as InterviewPublic;

/** The header's kind label, in the legacy words. */
export const KIND_LABEL: Record<Exercise['type'], string> = {
  mcq: 'Concept check',
  pattern: 'Choose the pattern',
  complexity: 'Complexity challenge',
  predict: 'Predict the output',
  bug: 'Find the bug',
  fill: 'Fill in the missing code',
  trace: 'Manual dry run',
  code: 'Write the code',
  interview: 'Interview problem',
};
