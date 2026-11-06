'use client';
import { useEffect, useRef, useState } from 'react';
import { createCodeEditor, type CodeEditorInstance } from '@/lib/client/cm-editor';
import { useLearnerState } from '@/lib/client/learner-state';

// The coding editor of the exercises (D-019): CodeMirror loaded on demand, the font size from Settings, and
// the legacy Tab rule — Tab indents, without a keymap module. A read-only fallback mirrors the text while the
// chunk loads, so the page never jumps.

export function CodeEditor({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (text: string) => void;
  ariaLabel: string;
}) {
  const { settings } = useLearnerState();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<CodeEditorInstance | null>(null);
  /** The text the running editor already shows, so an outside value (the reveal) replaces it exactly once. */
  const appliedRef = useRef(value);
  const changeRef = useRef(onChange);
  // The running editor keeps its callbacks; this keeps theirs pointed at the latest onChange without a rebuild.
  useEffect(() => {
    changeRef.current = onChange;
  });
  const [loaded, setLoaded] = useState(false);

  const fontSize = settings.editorFontSize;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let stale = false;
    void createCodeEditor({
      parent: host,
      value: appliedRef.current,
      fontSize,
      onChange: (text) => {
        appliedRef.current = text;
        changeRef.current(text);
      },
    }).then((instance) => {
      if (stale) return instance.destroy();
      instanceRef.current = instance;
      setLoaded(true);
      const view = host.querySelector('.cm-editor');
      if (view) view.setAttribute('aria-label', ariaLabel);
      return undefined;
    });
    return () => {
      stale = true;
      instanceRef.current = null;
      setLoaded(false);
      host.replaceChildren();
    };
    // A new view on mount, on an aria-label change and when the font size setting changes; the editor reads
    // `changeRef` for onChange and `appliedRef` for text, so `value` need not be a dependency.
  }, [fontSize, ariaLabel]);

  useEffect(() => {
    if (value === appliedRef.current) return;
    appliedRef.current = value;
    instanceRef.current?.setText(value);
  }, [value]);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (e.key !== 'Tab' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
        if (!hostRef.current?.contains(e.target as Node)) return;
        e.preventDefault();
        e.stopPropagation();
        instanceRef.current?.indent();
      }}
    >
      <div ref={hostRef} className={loaded ? '' : 'hidden'} />
      {!loaded && (
        <textarea
          readOnly
          aria-hidden="true"
          spellCheck={false}
          value={value}
          rows={Math.min(20, value.split('\n').length + 1)}
          className="w-full rounded-control border border-rule-2 bg-code-bg px-3 py-2 font-code text-[13px] leading-6 text-code-ink"
        />
      )}
    </div>
  );
}
