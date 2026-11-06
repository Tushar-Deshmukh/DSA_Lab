import './zod';
import type { ExerciseDocs } from './exercises';
import type { LessonDocs } from './lessons';
import type { ProblemDocs } from './journal';

// Mastery per pattern (plan §9.3). The level follows from evidence the app already records; nothing hides,
// nothing is a streak. Exercises map to patterns through the lesson that teaches the pattern, problems
// through the bank's problem-to-pattern table — both supplied by the generated, client-safe pattern map.
//
// The documents are derived and recomputable (plan §10 pattern_mastery): nothing syncs, the page computes
// levels from the snapshot and the map on every render.

export const MASTERY_LEVELS = ['not-started', 'introduced', 'practising', 'proficient', 'mastered'] as const;
export type MasteryLevel = (typeof MASTERY_LEVELS)[number];

/** One pattern's mapped content, from the generated pattern map (module slugs stay stable, ids.lock). */
export interface PatternMapEntry {
  pattern: string;
  module: string;
  /** The lesson teaching the pattern. */
  lesson: string;
  /** The unit holding the pattern's write-up. */
  writeUpUnit?: string;
  /** The lesson's Core exercises, by slug. */
  coreExercises: string[];
  /** Every exercise of the pattern's lesson, with its type, for the concept-check evidence. */
  exercises: Array<{ slug: string; type: string; core: boolean }>;
  /** The bank problems of this pattern. */
  problems: string[];
}

export type PatternMap = Record<string, PatternMapEntry>;

export interface PatternEvidence {
  /** The unit holding the write-up is completed. */
  introduced: boolean;
  /** A concept check on the pattern right first time (mcq/pattern/complexity/predict/trace/bug/fill). */
  conceptFirstTry: string | null;
  /** A code exercise of the pattern solved. */
  codeSolved: string | null;
  /** Core exercises solved without ever viewing the answer. */
  coreClean: string[];
  /** Core exercises that still miss: shown as the gap to Proficient. */
  coreLeft: string[];
  /** Bank problems solved independently (or better). */
  problemsIndependent: string[];
  /** Bank problems mastered (three spaced clean re-solves). */
  problemsMastered: string[];
  /** Exercises of the pattern revealed but not solved: they wait for review. */
  revealedWaiting: string[];
}

export interface PatternMastery {
  level: MasteryLevel;
  evidence: PatternEvidence;
}

/** Exercise types that build concept understanding (used to derive flashcards and mastery signals). */
export const CONCEPT_TYPES = new Set(['mcq', 'pattern', 'complexity', 'predict', 'trace', 'bug', 'fill']);

/** Computes one pattern's level and the evidence behind it, from the learner's documents. */
export function patternMastery(
  entry: PatternMapEntry | undefined,
  lessons: LessonDocs,
  exercises: ExerciseDocs,
  journal: ProblemDocs,
): PatternMastery {
  if (!entry) return { level: 'not-started', evidence: emptyEvidence() };
  const lessonDoc = lessons[entry.lesson];
  const introduced = Boolean(entry.writeUpUnit && lessonDoc?.units[entry.writeUpUnit]);

  let conceptFirstTry: string | null = null;
  let codeSolved: string | null = null;
  const revealedWaiting: string[] = [];
  for (const e of entry.exercises) {
    const r = exercises[e.slug];
    if (r && r.revealed && !r.solved) revealedWaiting.push(e.slug);
    if (e.type === 'code') {
      if (!codeSolved && r?.solved) codeSolved = e.slug;
      continue;
    }
    if (!conceptFirstTry && r?.solved && r.firstTry) conceptFirstTry = e.slug;
  }
  const coreClean = entry.coreExercises.filter((s) => {
    const r = exercises[s];
    return Boolean(r?.solved && !(r.revealed && !r.solved) && !r.revealedBeforeSolve);
  });
  const coreLeft = entry.coreExercises.filter((s) => !coreClean.includes(s));

  const problemsIndependent: string[] = [];
  const problemsMastered: string[] = [];
  for (const num of entry.problems) {
    const p = journal[num];
    if (!p) continue;
    if (p.status === 'independent') problemsIndependent.push(num);
    if (p.mastered) problemsMastered.push(num);
  }

  const evidence: PatternEvidence = {
    introduced,
    conceptFirstTry,
    codeSolved,
    coreClean,
    coreLeft,
    problemsIndependent,
    problemsMastered,
    revealedWaiting,
  };
  return { level: levelOf(evidence), evidence };
}

export const emptyEvidence = (): PatternEvidence => ({
  introduced: false,
  conceptFirstTry: null,
  codeSolved: null,
  coreClean: [],
  coreLeft: [],
  problemsIndependent: [],
  problemsMastered: [],
  revealedWaiting: [],
});

function levelOf(e: PatternEvidence): MasteryLevel {
  if (e.problemsMastered.length > 0 && e.revealedWaiting.length === 0) return 'mastered';
  const proficient = e.coreLeft.length === 0 && e.coreClean.length > 0 && e.problemsIndependent.length > 0;
  if (proficient) return 'proficient';
  if (e.conceptFirstTry || e.codeSolved) return 'practising';
  if (e.introduced) return 'introduced';
  return 'not-started';
}

/** The weakest patterns first: fewest cleared core exercises, then fewest solved problems (plan §9.6). */
export interface Weakness {
  pattern: string;
  level: MasteryLevel;
  score: number; // 0..1, higher is stronger
}

export function weakestPatterns(
  map: PatternMap,
  lessons: LessonDocs,
  exercises: ExerciseDocs,
  journal: ProblemDocs,
  count: number,
  atLeastLevel = 'practising',
): Weakness[] {
  const minIndex = MASTERY_LEVELS.indexOf(atLeastLevel as MasteryLevel);
  const rows: Weakness[] = [];
  for (const [pattern, entry] of Object.entries(map)) {
    const m = patternMastery(entry, lessons, exercises, journal);
    const li = MASTERY_LEVELS.indexOf(m.level);
    if (li < minIndex || m.level === 'mastered') continue;
    const coreDone = entry.coreExercises.length
      ? m.evidence.coreClean.length / entry.coreExercises.length
      : 1;
    const problemsDone = entry.problems.length
      ? m.evidence.problemsIndependent.length / entry.problems.length
      : 1;
    rows.push({
      pattern,
      level: m.level,
      score: MASTERY_WEIGHT[m.level] * 0.4 + coreDone * 0.3 + problemsDone * 0.3,
    });
  }
  return rows.sort((a, b) => a.score - b.score).slice(0, count);
}

const MASTERY_WEIGHT: Record<MasteryLevel, number> = {
  'not-started': 0,
  introduced: 0.25,
  practising: 0.5,
  proficient: 0.75,
  mastered: 1,
};

export const MASTERY_LABEL: Record<MasteryLevel, string> = {
  'not-started': 'Not started',
  introduced: 'Introduced',
  practising: 'Practising',
  proficient: 'Proficient',
  mastered: 'Mastered',
};

/** The repair session (plan §9.6): two re-solves per weak pattern plus its drills. */
export interface RepairList {
  patterns: Array<{ pattern: string; problems: string[]; drills: string[] }>;
}

export function repairSession(
  weaknesses: Weakness[],
  map: PatternMap,
  journal: ProblemDocs,
  drillsOf: (pattern: string) => string[] | undefined,
  problemsPerPattern = 2,
): RepairList {
  const patterns: RepairList['patterns'] = [];
  for (const w of weaknesses) {
    const entry = map[w.pattern];
    const problems = (entry?.problems ?? [])
      .filter((num) => {
        const p = journal[num];
        // Only problems the learner has touched, and none that are done: a repair needs something to fix.
        return p !== undefined && p.status !== 'not-started' && !p.mastered;
      })
      .slice(0, problemsPerPattern);
    patterns.push({ pattern: w.pattern, problems, drills: drillsOf(w.pattern) ?? [] });
  }
  return { patterns };
}
