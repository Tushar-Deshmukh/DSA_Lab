'use client';

import type * as codemirror from 'codemirror';

// CodeMirror 6 (D-019) behind a small loader: the module is imported on demand, so a page with no editor never
// loads it. The view grows with its text, honours the exercise font size from Settings, and reports every user
// edit. An outside text change (the reveal action loading a reference solution) replaces the document and is
// reported back as no edit — a viewed solution must not become the learner's draft, as in the legacy editor.

let mod: Promise<typeof codemirror> | null = null;
const loadModule = () => (mod ??= import('codemirror'));

export interface CodeEditorInstance {
  getText: () => string;
  setText: (text: string) => void;
  /** Two spaces at every cursor, in place of a keymap (Tab stays ours, so Shift-Tab can move focus). */
  indent: () => void;
  destroy: () => void;
}

export interface CodeEditorOptions {
  parent: HTMLElement;
  value: string;
  fontSize: number;
  /** Fired for edits made in the editor, never for `setText`. */
  onChange?: (text: string) => void;
}

export async function createCodeEditor(options: CodeEditorOptions): Promise<CodeEditorInstance> {
  const { basicSetup, EditorView } = await loadModule();
  const { javascript } = await import('@codemirror/lang-javascript');

  let replacing = false;
  const view = new EditorView({
    doc: options.value,
    parent: options.parent,
    extensions: [
      basicSetup,
      javascript(),
      EditorView.theme({
        '&': { fontSize: `${options.fontSize}px` },
        '&.cm-editor': {
          height: 'auto',
          background: 'var(--code-bg)',
          color: 'var(--code-ink)',
          borderRadius: 'var(--r-1)',
          border: '1px solid var(--rule-2)',
        },
        '&.cm-editor.cm-focused': { outline: 'none', borderColor: 'var(--accent)' },
        '.cm-scroller': {
          overflow: 'auto',
          minHeight: '8rem',
          maxHeight: '22rem',
          fontFamily: 'var(--f-code)',
          lineHeight: 1.55,
        },
        '.cm-gutters': { background: 'var(--code-bg)', color: 'var(--st-dim)', borderRight: 'none' },
        '.cm-activeLine': { background: 'color-mix(in srgb, var(--accent) 6%, transparent)' },
        '.cm-activeLineGutter': { background: 'transparent' },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !replacing) options.onChange?.(update.state.doc.toString());
      }),
    ],
  });

  return {
    getText: () => view.state.doc.toString(),
    setText: (text: string) => {
      const current = view.state.doc.toString();
      if (text === current) return;
      replacing = true;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
      replacing = false; // dispatch is synchronous: the listener saw `replacing` and stayed quiet
    },
    indent: () => {
      view.dispatch(view.state.replaceSelection('  '));
    },
    destroy: () => view.destroy(),
  };
}
