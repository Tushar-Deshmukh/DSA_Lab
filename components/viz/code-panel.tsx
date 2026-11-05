'use client';

import { useEffect, useMemo, useRef } from 'react';
import { highlightLines } from '@/lib/highlight';

interface Props {
  code: string;
  active: readonly number[];
  breakpoints: ReadonlySet<number>;
  onToggleBreakpoint: (line: number) => void;
}

/**
 * The algorithm's code, with the step's line marked by a bar and an arrow. Each line number is a button that sets or
 * clears a breakpoint, where Play stops.
 */
export function CodePanel({ code, active, breakpoints, onToggleBreakpoint }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const first = active[0];

  // Keep the active line in view by scrolling the panel, never the page.
  useEffect(() => {
    const panel = box.current;
    if (!panel || first === undefined) return;
    const line = panel.querySelector<HTMLElement>(`[data-line="${first}"]`);
    if (!line) return;
    if (line.offsetTop < panel.scrollTop) panel.scrollTop = line.offsetTop - 8;
    else if (line.offsetTop + line.offsetHeight > panel.scrollTop + panel.clientHeight)
      panel.scrollTop = line.offsetTop + line.offsetHeight - panel.clientHeight + 8;
  }, [first]);

  const lines = useMemo(() => highlightLines(code), [code]);
  return (
    <div
      ref={box}
      className="vz-code relative max-h-[26rem] flex-1 overflow-y-auto"
      role="group"
      aria-label="Algorithm code"
    >
      {lines.map((tokens, i) => {
        const n = i + 1;
        const on = active.includes(n);
        return (
          <div key={n} className="vz-code-line" data-line={n} data-active={on || undefined}>
            <button
              type="button"
              className="vz-gutter"
              aria-pressed={breakpoints.has(n)}
              aria-label={`Breakpoint on line ${n}`}
              onClick={() => onToggleBreakpoint(n)}
            >
              {n}
            </button>
            <code className="pr-3">
              {tokens.length
                ? tokens.map((t, k) =>
                    t.kind === 'text' ? (
                      t.text
                    ) : (
                      <span key={k} className={`tk-${t.kind}`}>
                        {t.text}
                      </span>
                    ),
                  )
                : ' '}
              {on && <span className="sr-only"> (current line)</span>}
            </code>
          </div>
        );
      })}
    </div>
  );
}
