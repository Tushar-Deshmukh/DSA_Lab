'use client';

// The answer key of one exercise, fetched from /api/exercises/{slug}/key the first time the learner checks an
// answer (D-011): keys are never in the page payload, and one exercise at a time keeps that honest. The cache
// lives for the page session, so a re-check after a wrong answer never refetches.

export interface ExerciseKey {
  type: string;
  key: Record<string, unknown>;
}

const cache = new Map<string, ExerciseKey>();
const pending = new Map<string, Promise<ExerciseKey | null>>();

export function cachedKey(slug: string): ExerciseKey | undefined {
  return cache.get(slug);
}

export function loadKey(slug: string): Promise<ExerciseKey | null> {
  const hit = cache.get(slug);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(slug);
  if (inflight) return inflight;
  const request = (async () => {
    try {
      const res = await fetch(`/api/exercises/${slug}/key`);
      if (!res.ok) return null;
      const body = (await res.json()) as { slug: string; type: string; key: Record<string, unknown> };
      cache.set(slug, { type: body.type, key: body.key ?? {} });
      return cache.get(slug) ?? null;
    } catch {
      return null;
    } finally {
      pending.delete(slug);
    }
  })();
  pending.set(slug, request);
  return request;
}

/** Narrow views of the key part, in the shape the split wrote it (lib/content/split.ts). */
export interface McqKey {
  options: Array<{ ok?: boolean; why?: string; kind?: 'concept' | 'impl' }>;
  explain?: string;
  clues?: string;
}
export interface ComplexityKey {
  fields: Array<{ answer: string | string[]; why?: Record<string, string> }>;
  explain?: string;
}
export interface PredictKey {
  answer: string | string[];
  traps?: Record<string, string>;
  explain?: string;
}
export interface BugKey {
  bug: number[];
  fine?: Record<string, string>;
  fix?: string;
  kind?: 'concept' | 'impl';
  explain?: string;
}
export interface FillKey {
  blanks: Array<{ accept: string[] }>;
  tests: Array<{ args?: unknown[]; expect?: unknown }>;
  explain?: string;
}
export interface TraceKey {
  rows: Array<{ answer: string | string[]; why?: string }>;
  explain?: string;
}
export interface CodeKey {
  solution?: string;
  tests: Array<{ args?: unknown[]; expect?: unknown; ops?: unknown[][] }>;
  explain?: string;
}
export interface InterviewKey extends CodeKey {
  model?: Record<string, string>;
}

export const asMcqKey = (key: Record<string, unknown>) => key as unknown as McqKey;
export const asComplexityKey = (key: Record<string, unknown>) => key as unknown as ComplexityKey;
export const asPredictKey = (key: Record<string, unknown>) => key as unknown as PredictKey;
export const asBugKey = (key: Record<string, unknown>) => key as unknown as BugKey;
export const asFillKey = (key: Record<string, unknown>) => key as unknown as FillKey;
export const asTraceKey = (key: Record<string, unknown>) => key as unknown as TraceKey;
export const asCodeKey = (key: Record<string, unknown>) => key as unknown as CodeKey;
export const asInterviewKey = (key: Record<string, unknown>) => key as unknown as InterviewKey;
