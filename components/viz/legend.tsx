'use client';

/** The visualizer's legend: each state drawn the way the primitives draw it, so the cue is learned with the colour. */
export function Legend({ items }: { items: readonly [string, string][] }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2" aria-label="Legend">
      {items.map(([state, label]) => (
        <li key={`${state}-${label}`} className="flex items-center gap-1.5">
          <span className="vz-box vz-swatch" data-state={state} aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}
