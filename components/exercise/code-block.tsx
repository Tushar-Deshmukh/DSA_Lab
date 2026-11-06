import { highlightLines } from '@/lib/highlight';

// A highlighted code block for teaching text, in code fences, exercise prompts and solutions. Tokens come from
// lib/highlight, so this renders on the server and in the client alike — the code is always text.

export function CodeBlock({
  code,
  lang,
  className = 'overflow-x-auto rounded-control bg-code-bg px-3 py-2.5 font-code text-[13px] leading-6 text-code-ink',
  'aria-label': label,
}: {
  code: string;
  /** The fence's language, when the source said one: anything not JavaScript-like is shown plain. */
  lang?: string | null;
  className?: string;
  'aria-label'?: string;
}) {
  const lines = highlightLines(code, lang);
  return (
    <pre className={className} aria-label={label}>
      <code>
        {lines.map((tokens, i) => (
          <CodeLine key={i} tokens={tokens} />
        ))}
      </code>
    </pre>
  );
}

export function CodeLine({ tokens }: { tokens: { kind: string; text: string }[] }) {
  return (
    <span className="block">
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
        : null}
    </span>
  );
}
