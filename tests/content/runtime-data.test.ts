// The generated runtime data (lib/server/runtime-data.ts): what leaves content/ for the server bundle and the
// three client-safe files. D-011 keeps the keys server-side; D-027 keeps gated content behind its gate; D-012
// keeps the reserved problem lists, mock pools and hidden problem notes out of every page payload.
import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadContent, type ContentBundle } from '@/lib/content/load';
import type { BankProblem, Exercise } from '@/lib/content/schema';
import { splitExercise } from '@/lib/content/split';
import {
  buildRuntimeData,
  PUBLIC_DATA_DIR,
  readExerciseKeys,
  readReserved,
  writeRuntimeData,
  type GateRule,
  type RuntimeData,
} from '@/lib/server/runtime-data';
import { CONTENT_DIR } from '@/scripts/import/paths';

let bundle: ContentBundle;
let data: RuntimeData;
const pages = () => bundle.modules.flatMap((m) => [...m.lessons, ...(m.checkpoint ? [m.checkpoint] : [])]);
const exercises = (): Exercise[] => pages().flatMap((p) => p.exercises);

beforeAll(() => {
  bundle = loadContent(CONTENT_DIR);
  data = buildRuntimeData(bundle);
  writeRuntimeData(data);
});

/** All string values anywhere inside a value. */
function allStrings(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === 'string') out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out));
  else if (value && typeof value === 'object') for (const v of Object.values(value)) allStrings(v, out);
  return out;
}

describe('the exercise keys', () => {
  it('cover every exercise exactly once, by its stable slug (D-011)', () => {
    expect(exercises()).toHaveLength(421);
    expect(Object.keys(data.keys)).toHaveLength(421);
    for (const { module: moduleDoc, lessons, checkpoint } of bundle.modules) {
      for (const page of [...lessons, ...(checkpoint ? [checkpoint] : [])]) {
        for (const e of page.exercises) {
          const slug = `${moduleDoc.frontmatter.slug}/${page.frontmatter.slug}/${e.id}`;
          expect(data.keys[slug]?.type, slug).toBe(e.type);
          expect(data.keys[slug]?.key, slug).toEqual(splitExercise(e).key);
        }
      }
    }
  });
});

describe('the gate content', () => {
  it('holds the public part of all 29 gated exercises and the 3 gated texts, by gate (D-027)', () => {
    expect(Object.keys(data.reserved.gates)).toHaveLength(12);
    let count = 0;
    for (const { module: moduleDoc, lessons, checkpoint } of bundle.modules) {
      for (const page of [...lessons, ...(checkpoint ? [checkpoint] : [])]) {
        for (const e of page.exercises) {
          if (!e.gatedBy) continue;
          const slug = `${moduleDoc.frontmatter.slug}/${page.frontmatter.slug}/${e.id}`;
          const held = data.reserved.gates[e.gatedBy]?.exercises[slug];
          expect(held, slug).toBeDefined();
          expect(held?.public, slug).toEqual(splitExercise(e).public);
          count++;
        }
      }
    }
    expect(count).toBe(29);
    const texts = Object.entries(data.reserved.gates).flatMap(([id, g]) => Object.keys(g.texts).map((t) => `${id}/${t}`));
    expect(texts).toEqual(['assessment-1/classification-drill-6', 'classification-drill/classification-drill-answers', 'placement/placement-answer-key']);
  });
});

describe('the gate rules', () => {
  it('name every gate with the rule its device can evaluate', () => {
    const rules = data.gateRules;
    expect(Object.keys(rules)).toHaveLength(12);
    const named = (kind: GateRule['kind']) => Object.values(rules).filter((r) => r.kind === kind).length;
    expect(named('checkpoint')).toBe(6);
    expect(named('mock')).toBe(4);
    expect(named('placement')).toBe(1);
    expect(named('exercises')).toBe(1);
    expect(rules['placement']).toEqual({ kind: 'placement' });
    for (const mod of bundle.modules) {
      const cf = mod.checkpoint?.frontmatter;
      if (!cf || !('gateId' in cf) || !cf.gateId) continue;
      const rule = rules[cf.gateId];
      if (cf.kind === 'mock' && 'mock' in cf && cf.mock) expect(rule).toEqual({ kind: 'mock', mock: cf.mock.slug });
      else expect(rule).toEqual({ kind: 'checkpoint', checkpoint: `${mod.module.frontmatter.slug}/checkpoint` });
    }
  });

  it('gates the classification drill on one of its two 15-item copies', () => {
    const rule: GateRule | undefined = data.gateRules['classification-drill'];
    expect(rule).toBeDefined();
    if (rule?.kind !== 'exercises') throw new Error('drill rule is not exercise-based');
    expect(rule.copies).toHaveLength(2);
    for (const copy of rule.copies) expect(copy).toHaveLength(15);
    // Every drill slug exists in the keys, so "all 15 solved" is checkable on the device.
    for (const copy of rule.copies) for (const slug of copy) expect(data.keys[slug], slug).toBeDefined();
  });
});

describe('the pattern map', () => {
  it('maps all 47 patterns to the lesson that includes their write-up', () => {
    expect(Object.keys(data.patternMap)).toHaveLength(47);
    for (const [slug, entry] of Object.entries(data.patternMap)) {
      expect(slug).toBe(entry.pattern);
      expect(bundle.patterns.has(`patterns/${slug}`), slug).toBe(true);
      expect(entry.writeUpUnit, slug).toBeDefined();
    }
  });

  it('matches the teaching lesson: every ungated exercise of the lesson, core = not in a stretch unit', () => {
    for (const { module: moduleDoc, lessons } of bundle.modules) {
      for (const lesson of lessons) {
        // A lesson may teach several patterns; all of them map from this lesson.
        const taught = Object.values(data.patternMap).filter(
          (p) => p.lesson === lesson.frontmatter.slug && p.module === moduleDoc.frontmatter.slug,
        );
        if (taught.length === 0) continue;
        for (const entry of taught) {
          const slugs = lesson.exercises.filter((e) => !e.gatedBy).map((e) => `${entry.module}/${entry.lesson}/${e.id}`);
          expect(entry.exercises.map((e) => e.slug), entry.pattern).toEqual(slugs);
          expect(entry.coreExercises, entry.pattern).toEqual(entry.exercises.filter((e) => e.core).map((e) => e.slug));
          // The bank problems of the lesson, minus the module 12 ones whose note is held back (D-012).
          const problems = bundle.bank
            .filter((p) => 'tier' in p && p.module === entry.module && p.lesson === entry.lesson && p.hiddenUntilAttempted !== true)
            .map((p) => String(p.num));
          expect(entry.problems, entry.pattern).toEqual(problems);
        }
      }
    }
  });
});

describe('the search index', () => {
  it('carries the full catalog with no reserved payload', () => {
    expect(data.searchIndex.length).toBeGreaterThan(400);
    const types = new Set(data.searchIndex.map((e) => e.type));
    expect([...types].sort()).toEqual(['checkpoint', 'handbook', 'lesson', 'module', 'pattern', 'problem', 'viz']);
    for (const entry of data.searchIndex) {
      expect(entry.title.length).toBeGreaterThan(0);
      for (const key of ['type', 'id', 'title']) expect(key in entry, key).toBe(true);
    }
  });

  it('says nothing about the six hidden problems beyond their numbers (D-012)', () => {
    const hidden = bundle.bank.filter((p): p is BankProblem => 'tier' in p && p.hiddenUntilAttempted === true);
    expect(hidden).toHaveLength(6);
    for (const p of hidden) {
      const entry = data.searchIndex.find((e) => e.type === 'problem' && e.id === String(p.num));
      expect(entry?.title).toBe(`Problem ${p.num}`);
      expect(entry?.text).toBeUndefined();
    }
    const strings = allStrings(JSON.parse(JSON.stringify(data.searchIndex)));
    for (const p of hidden) {
      expect(strings.has(p.title)).toBe(false);
      expect(strings.has(p.pattern)).toBe(false);
      expect(strings.has(p.why)).toBe(false);
      expect(strings.has(p.hint)).toBe(false);
    }
  });

  it('never names the assessment lists or mock pools', () => {
    const strings = allStrings(JSON.parse(JSON.stringify(data.searchIndex)));
    const reserved = allStrings(data.reserved);
    for (const a of bundle.reserved.assessments.assessments) {
      expect(strings.has(a.slug)).toBe(false);
      for (const p of a.problems) {
        expect(strings.has(p.title)).toBe(false);
        expect(strings.has(p.url)).toBe(false);
        // Only the pattern map (problem numbers) and the reserved bundle may hold the reserved problems.
        expect(reserved.has(p.title)).toBe(true);
      }
    }
    for (const m of bundle.reserved.mocks.mocks) {
      expect(strings.has(m.slug)).toBe(false);
      for (const p of m.pool) {
        expect(strings.has(p.title)).toBe(false);
        expect(strings.has(p.url)).toBe(false);
      }
    }
    // Nor in the other public files: gate rules carry rules only; pattern maps carry slugs and numbers.
    for (const value of [data.gateRules, data.patternMap]) {
      const publicStrings = allStrings(JSON.parse(JSON.stringify(value)));
      for (const a of bundle.reserved.assessments.assessments)
        for (const p of a.problems) expect(publicStrings.has(p.title)).toBe(false);
    }
  });
});

describe('the reserved data', () => {
  it('mirrors the reserved yaml: 6 assessments, 6 mock pools, 6 hidden problem notes', () => {
    expect(Object.keys(data.reserved.assessments)).toHaveLength(6);
    expect(Object.keys(data.reserved.mocks)).toHaveLength(6);
    for (const a of bundle.reserved.assessments.assessments) expect(data.reserved.assessments[a.slug]?.problems).toEqual(a.problems);
    for (const m of bundle.reserved.mocks.mocks) expect(data.reserved.mocks[m.slug]?.pool).toEqual(m.pool);
    expect(Object.keys(data.reserved.problems)).toHaveLength(6);
    for (const p of bundle.bank) {
      if (!('tier' in p) || p.hiddenUntilAttempted !== true) continue;
      expect(data.reserved.problems[String(p.num)]).toEqual({ pattern: p.pattern, prereq: p.prereq, why: p.why, hint: p.hint });
    }
  });
});

describe('the written files', () => {
  it('serve back what the builder built', () => {
    const keys = readExerciseKeys();
    const reserved = readReserved();
    expect(Object.keys(keys)).toHaveLength(421);
    expect(keys).toEqual(data.keys);
    expect(reserved).toEqual(data.reserved);
    for (const file of ['gate-rules.json', 'pattern-map.json', 'search-index.json']) {
      expect(JSON.parse(fs.readFileSync(`${PUBLIC_DATA_DIR}/${file}`, 'utf8'))).toBeTruthy();
    }
  });
});
