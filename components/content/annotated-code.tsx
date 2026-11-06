'use client';
import { useState } from 'react';
import { highlightLines } from '@/lib/highlight';
import { CodeLine } from '@/components/exercise/code-block';
import { md } from '@/components/exercise/renderers';

// The annotated code block (plan 6.2, ported from the legacy `.anno`): the code with line numbers, and the
// line-by-line notes beside it. Clicking a line highlights it and its note; clicking the note highlights the
// line, as in the legacy app, with keyboard focus on the notes.

export interface AnnotatedBlock {
  title: string;
  code: string;
  /** By 1-based line number. */
  notes: Record<string, string>;
}

export function AnnotatedCodeView({ title, code, notes }: AnnotatedBlock) {
  const [selected, setSelected] = useState<string | null>(null);
  const lines = highlightLines(code);
  const noteEntries = Object.entries(notes);

  const select = (n: string | null) => setSelected((cur) => (cur === n ? null : n));

  return (
    <figure className="space-y-2" data-anno="">
      {title ? <figcaption className="font-ui text-sm text-ink">{title}</figcaption> : null}
      <div className="grid gap-3 lg:grid-cols-[1fr_minmax(20rem,0.6fr)]" data-anno-body="">
        <div
          role="list"
          aria-label="Code, line by line"
          className="overflow-x-auto rounded-control border border-rule-2 bg-code-bg px-0 py-2 font-code text-[13px] leading-6 text-code-ink"
        >
          {lines.map((tokens, i) => {
            const n = String(i + 1);
            const note = notes[n];
            return (
              <div key={n} role="listitem" data-n={n} data-anno-line="">
                {note ? (
                  <button
                    type="button"
                    onClick={() => select(n)}
                    aria-pressed={selected === n}
                    className={`flex w-full items-baseline gap-3 px-3 text-left hover:bg-rule-2/50 ${
                      selected === n ? 'bg-st-current-soft' : ''
                    }`}
                  >
                    <span className="w-5 shrink-0 text-right text-ink-3 tabular">{n}</span>
                    <span className="min-w-0">
                      <CodeLine tokens={tokens} />
                    </span>
                  </button>
                ) : (
                  <div className="flex items-baseline gap-3 px-3">
                    <span className="w-5 shrink-0 text-right text-ink-3 tabular">{n}</span>
                    <span className="min-w-0">
                      <CodeLine tokens={tokens} />
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="space-y-2" data-anno-notes="">
          <p className="font-ui text-[11px] font-bold tracking-[0.08em] text-ink-2 uppercase">
            Line-by-line notes · click a line or a note
          </p>
          {noteEntries.map(([n, html]) => (
            <button
              key={n}
              type="button"
              onClick={() => select(n)}
              data-n={n}
              data-anno-note=""
              aria-pressed={selected === n}
              className={`block w-full rounded-control border px-3 py-2 text-left text-sm text-ink ${
                selected === n ? 'border-st-current bg-st-current-soft' : 'border-rule bg-sheet hover:border-ink-3'
              }`}
            >
              <b className="mb-0.5 block font-ui text-[11px] font-bold text-ink-2">line {n}</b>
              {md(html)}
            </button>
          ))}
        </div>
      </div>
    </figure>
  );
}
