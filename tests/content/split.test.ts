// D-011: the public part of an exercise gives nothing away, and public plus key together lose nothing.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadContent, type ContentBundle } from '@/lib/content/load';
import type { Exercise } from '@/lib/content/schema';
import { splitExercise } from '@/lib/content/split';
import { CONTENT_DIR } from '@/scripts/import/paths';

let bundle: ContentBundle;
const exercises = (): Exercise[] =>
  bundle.modules.flatMap((m) => [...m.lessons, ...(m.checkpoint ? [m.checkpoint] : [])]).flatMap((p) => p.exercises);

beforeAll(() => {
  bundle = loadContent(CONTENT_DIR);
});

/** All object keys anywhere inside a value. */
function allKeys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => allKeys(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      allKeys(v, out);
    }
  }
  return out;
}

describe('the public part of an exercise', () => {
  it('holds no key field, on all 421', () => {
    const forbidden = ['ok', 'why', 'kind', 'explain', 'clues', 'solution', 'model', 'answer', 'accept', 'traps', 'fine', 'fix', 'bug', 'verify'];
    expect(exercises()).toHaveLength(421);
    for (const e of exercises()) {
      const keys = allKeys(splitExercise(e).public);
      for (const name of forbidden) expect(keys.has(name), `${e.legacyId} has ${name}`).toBe(false);
    }
  });

  it('holds no hidden test: all 233 are in the key part', () => {
    let hidden = 0;
    for (const e of exercises()) {
      if (!('tests' in e)) continue;
      const { public: pub, key } = splitExercise(e);
      for (const t of pub.tests as { hidden?: boolean }[]) expect(t.hidden, e.legacyId).toBeFalsy();
      for (const t of key.tests as { hidden?: boolean }[]) expect(t.hidden, e.legacyId).toBe(true);
      hidden += (key.tests as unknown[]).length;
      expect((pub.tests as unknown[]).length + (key.tests as unknown[]).length).toBe(e.tests.length);
    }
    expect(hidden).toBe(233);
  });

  it('does not contain any solution, model answer or explanation as text', () => {
    for (const e of exercises()) {
      const pub = JSON.stringify(splitExercise(e).public);
      expect(pub, e.legacyId).not.toContain(JSON.stringify(e.explain));
      if ('solution' in e) expect(pub, e.legacyId).not.toContain(JSON.stringify(e.solution));
      if (e.type === 'interview') {
        for (const v of Object.values(e.model)) expect(pub, e.legacyId).not.toContain(JSON.stringify(v));
      }
    }
  });

  it('marks which options are correct nowhere, but says when several can be', () => {
    const mcqs = exercises().filter((e) => e.type === 'mcq');
    const multi = mcqs.filter((e) => e.options.filter((o) => o.ok).length > 1);
    expect(multi).toHaveLength(15);
    for (const e of mcqs) {
      const pub = splitExercise(e).public as { multi: boolean; options: Record<string, unknown>[] };
      expect(pub.multi).toBe(multi.includes(e));
      for (const o of pub.options) expect(Object.keys(o)).toEqual(['t']);
    }
  });

  it('keeps what the learner needs in order to answer', () => {
    for (const e of exercises()) {
      const pub = splitExercise(e).public;
      expect(pub.id).toBe(e.id);
      expect(pub.type).toBe(e.type);
      expect(pub.hints).toEqual(e.hints);
      if ('q' in e && e.q) expect(pub.q).toBe(e.q);
      if ('code' in e && e.code) expect(pub.code).toBe(e.code);
      if ('starter' in e) expect(pub.starter).toBe(e.starter);
      if (e.type === 'fill') expect((pub.blanks as unknown[]).length).toBe(e.blanks.length);
      if (e.type === 'trace') expect((pub.rows as { prompt: string }[]).map((r) => r.prompt)).toEqual(e.rows.map((r) => r.prompt));
    }
  });
});

describe('the key part of an exercise', () => {
  it('holds every answer field', () => {
    for (const e of exercises()) {
      const { key } = splitExercise(e);
      expect(key.explain, e.legacyId).toBe(e.explain);
      switch (e.type) {
        case 'mcq':
        case 'pattern':
          expect((key.options as { ok?: boolean }[]).map((o) => Boolean(o.ok))).toEqual(e.options.map((o) => Boolean(o.ok)));
          expect((key.options as { why?: string }[]).map((o) => o.why)).toEqual(e.options.map((o) => o.why));
          break;
        case 'complexity':
          expect((key.fields as { answer: string }[]).map((f) => f.answer)).toEqual(e.fields.map((f) => f.answer));
          break;
        case 'bug':
          expect(key.bug).toEqual(e.bug);
          expect(key.fix).toBe(e.fix);
          expect(key.fine).toEqual(e.fine);
          break;
        case 'predict':
          expect(key.answer).toBe(e.answer);
          break;
        case 'fill':
          expect((key.blanks as { accept: string[] }[]).map((b) => b.accept)).toEqual(e.blanks.map((b) => b.accept));
          break;
        case 'trace':
          expect((key.rows as { answer: unknown }[]).map((r) => r.answer)).toEqual(e.rows.map((r) => r.answer));
          break;
        case 'code':
          expect(key.solution).toBe(e.solution);
          break;
        case 'interview':
          expect(key.solution).toBe(e.solution);
          expect(key.model).toEqual(e.model);
          break;
      }
    }
  });
});
