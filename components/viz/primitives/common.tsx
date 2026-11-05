'use client';

import { createContext, useContext, type ReactNode } from 'react';

// What screen readers hear for a state. A visualizer's legend says what a state means there ("l and r", "pair
// found"), so its words win over these.
const STATE_WORDS: Record<string, string> = {
  current: 'current',
  compare: 'being compared',
  done: 'done',
  frontier: 'frontier',
  error: 'error',
  dim: 'out of play',
  window: 'in the window',
  wall: 'wall',
  dep: 'needed for the current cell',
  best: 'best',
  out: 'removed',
  empty: 'not computed yet',
  top: 'running',
  ret: 'returned',
};

export const LegendContext = createContext<Record<string, string>>({});

/** Turns a state into words: the legend's, else a plain name. Falsy states have none. */
export function useStateWords(): (state: unknown) => string {
  const legend = useContext(LegendContext);
  return (state) =>
    typeof state === 'string' && state ? (legend[state] ?? STATE_WORDS[state] ?? state) : '';
}

/** A state usable as a `data-state` attribute: the legacy views pass false, null or '' for none. */
export const stateAttr = (state: unknown): string | undefined =>
  typeof state === 'string' && state ? state : undefined;

/** The legacy `labelled()`: a small caps label over the drawing. */
export function Labelled({ label, children }: { label?: string | null; children: ReactNode }) {
  if (!label) return <>{children}</>;
  return (
    <div>
      <div className="vz-label">{label}</div>
      {children}
    </div>
  );
}

/** One item for a screen reader: the value, then its state and any pointers, in words. */
export function spoken(value: string, state: string, extra: string[] = []): string {
  return [value, state, ...extra].filter(Boolean).join(', ');
}
