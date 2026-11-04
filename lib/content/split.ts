// Splits an exercise into what may ship with a page and what the key endpoint serves one exercise at a time (D-011).
// Nothing in the public part may tell a learner the answer: no correct flags, explanations, solutions or hidden tests.
import type { Exercise } from './schema';

type Runnable = Extract<Exercise, { type: 'code' | 'interview' | 'fill' }>;

const base = (e: Exercise) => ({ id: e.id, legacyId: e.legacyId, type: e.type, hints: e.hints });

const runnablePublic = (e: Runnable) => ({
  fn: e.fn,
  tests: e.tests.filter((t) => !t.hidden),
  ...(e.compare ? { compare: e.compare } : {}),
  ...(e.adapt ? { adapt: e.adapt } : {}),
  ...(e.checker ? { checker: e.checker } : {}),
});

const hiddenTests = (e: Runnable) => e.tests.filter((t) => t.hidden);

export interface SplitExercise {
  public: Record<string, unknown>;
  key: Record<string, unknown>;
}

export function splitExercise(e: Exercise): SplitExercise {
  switch (e.type) {
    case 'mcq':
    case 'pattern': {
      const optionKeys = e.options.map((o) => ({
        ...(o.ok ? { ok: true } : {}),
        ...(o.why ? { why: o.why } : {}),
        ...(o.kind ? { kind: o.kind } : {}),
      }));
      return {
        public: {
          ...base(e),
          tag: e.tag,
          q: e.q,
          ...(e.type === 'mcq' && e.code ? { code: e.code } : {}),
          // Whether to draw checkboxes or radio buttons. The legacy app derives it the same way.
          multi: e.options.filter((o) => o.ok).length > 1 || (e.type === 'mcq' && Boolean(e.multi)),
          options: e.options.map((o) => ({ t: o.t })),
        },
        key: {
          options: optionKeys,
          explain: e.explain,
          ...(e.type === 'pattern' && e.clues ? { clues: e.clues } : {}),
        },
      };
    }
    case 'complexity':
      return {
        public: {
          ...base(e),
          tag: e.tag,
          ...(e.q ? { q: e.q } : {}),
          ...(e.code ? { code: e.code } : {}),
          fields: e.fields.map((f) => ({ label: f.label, ...(f.options ? { options: f.options } : {}) })),
        },
        key: {
          fields: e.fields.map((f) => ({ answer: f.answer, ...(f.why ? { why: f.why } : {}) })),
          explain: e.explain,
        },
      };
    case 'bug':
      return {
        public: { ...base(e), tag: e.tag, q: e.q, code: e.code },
        key: { bug: e.bug, fine: e.fine, fix: e.fix, kind: e.kind, explain: e.explain },
      };
    case 'predict':
      return {
        public: {
          ...base(e),
          tag: e.tag,
          q: e.q,
          code: e.code,
          ...(e.normalize ? { normalize: e.normalize } : {}),
          ...(e.placeholder ? { placeholder: e.placeholder } : {}),
          // Sizes the answer box. The legacy app does the same, and it gives away only the number of output lines.
          answerLines: e.answer.split('\n').length,
        },
        key: { answer: e.answer, ...(e.traps ? { traps: e.traps } : {}), explain: e.explain },
      };
    case 'fill':
      return {
        public: {
          ...base(e),
          ...runnablePublic(e),
          tag: e.tag,
          q: e.q,
          template: e.template,
          blanks: e.blanks.map((b) => ({ ...(b.w ? { w: b.w } : {}) })),
        },
        key: { blanks: e.blanks.map((b) => ({ accept: b.accept })), tests: hiddenTests(e), explain: e.explain },
      };
    case 'trace':
      return {
        public: {
          ...base(e),
          tag: e.tag,
          q: e.q,
          ...(e.code ? { code: e.code } : {}),
          rows: e.rows.map((r) => ({ prompt: r.prompt, ...(r.w ? { w: r.w } : {}) })),
        },
        key: {
          rows: e.rows.map((r) => ({ answer: r.answer, ...(r.why ? { why: r.why } : {}) })),
          explain: e.explain,
          ...(e.verify ? { verify: e.verify } : {}),
        },
      };
    case 'code':
      return {
        public: { ...base(e), ...runnablePublic(e), tag: e.tag, q: e.q, starter: e.starter },
        key: { solution: e.solution, tests: hiddenTests(e), explain: e.explain },
      };
    case 'interview':
      return {
        public: { ...base(e), ...runnablePublic(e), title: e.title, q: e.q, starter: e.starter },
        key: { solution: e.solution, model: e.model, tests: hiddenTests(e), explain: e.explain },
      };
  }
}
