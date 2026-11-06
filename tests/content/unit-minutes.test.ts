// unit-minutes (lib/content/unit-minutes.ts) against the real content (plan 5.3): every lesson's unit
// estimates add up to its legacy total, the checkpoint formats map to the attempt and the after phase, and
// the distribution rules behave where the content cannot pin them.
import { beforeAll, describe, expect, it } from 'vitest';
import { CONTENT_DIR } from '@/scripts/import/paths';
import { loadContent, type ContentBundle, type LoadedModule, type PageContent } from '@/lib/content/load';
import type { FoundationFrontmatter } from '@/lib/content/load';
import type { CheckpointFrontmatter, LessonFrontmatter } from '@/lib/content/schema';
import { DEFAULT_ESTIMATE, totalMinutes } from '@/lib/content/estimates';
import { CHECKPOINT_UNITS, DERIVED_UNITS, checkpointUnitMinutes, lessonUnitMinutes, shareMinutes, surveyUnits } from '@/lib/content/unit-minutes';

let bundle: ContentBundle;

beforeAll(() => {
  bundle = loadContent(CONTENT_DIR);
});

const asLesson = (page: PageContent<FoundationFrontmatter | LessonFrontmatter>): PageContent<LessonFrontmatter> | null =>
  'estimate' in page.frontmatter && page.frontmatter.estimate ? (page as PageContent<LessonFrontmatter>) : null;

/** Every study lesson: 55 in the standard format, 5 with the special named formats. */
function studyLessons(): { moduleSlug: string; page: PageContent<LessonFrontmatter> }[] {
  const out: { moduleSlug: string; page: PageContent<LessonFrontmatter> }[] = [];
  for (const loaded of bundle.modules) {
    for (const page of loaded.lessons) {
      const lesson = asLesson(page);
      if (lesson) out.push({ moduleSlug: loaded.module.frontmatter.slug, page: lesson });
    }
  }
  return out;
}

let lessons: { moduleSlug: string; page: PageContent<LessonFrontmatter> }[];

beforeAll(() => {
  lessons = studyLessons();
});

describe('the standard format T·I·P·R·N', () => {
  it('spreads the letters over units and adds up to the legacy total on every standard lesson', () => {
    let standard = 0;
    for (const { page } of lessons) {
      const keys = Object.keys(page.frontmatter.estimate).sort().join('');
      if (keys !== 'INPRT') continue;
      standard++;
      const minutes = lessonUnitMinutes(page.frontmatter, page.body);
      const sum = Object.values(minutes).reduce((a, b) => a + b, 0);
      expect(sum, page.frontmatter.slug).toBe(totalMinutes(page.frontmatter.estimate));
    }
    expect(standard).toBeGreaterThan(50);
  });

  it('gives the warm-up 10 of P and shares the rest over one guided unit and the practice step', () => {
    const { page } = lessons.find(({ page }) => page.frontmatter.estimate.T === DEFAULT_ESTIMATE.T)!;
    const minutes = lessonUnitMinutes(page.frontmatter, page.body);
    const rest = page.frontmatter.estimate.P - 10;
    expect(minutes[DERIVED_UNITS.warmUp]).toBe(10);
    const guided = surveyUnits(page.body).filter((u) => u.kind === 'guided');
    const practiceShare = minutes[DERIVED_UNITS.practice] ?? 0;
    expect(guidedShare(page, minutes) + practiceShare).toBe(rest);
    const weights = guided.length + page.frontmatter.problems.length;
    const share = (rest * page.frontmatter.problems.length) / weights;
    expect(Math.abs(practiceShare - share)).toBeLessThanOrEqual(0.5);
  });

  const guidedShare = (page: PageContent<LessonFrontmatter>, minutes: Record<string, number>): number =>
    surveyUnits(page.body).filter((u) => u.kind === 'guided').reduce((sum, u) => sum + (minutes[u.id] ?? 0), 0);

  it('splits T over theory and reference units by text length, with the longest earning most', () => {
    const { page } = lessons.find(({ page }) => page.frontmatter.estimate.T === 30 && page.frontmatter.estimate.I === 20)!;
    const minutes = lessonUnitMinutes(page.frontmatter, page.body);
    const theory = surveyUnits(page.body).filter((u) => u.kind === 'theory' || u.kind === 'reference');
    expect(theory.length).toBeGreaterThan(1);
    const shares = theory.map((u) => minutes[u.id]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(30);
    const longest = theory.reduce((max, u) => (u.textLength > max.textLength ? u : max), theory[0]);
    expect(minutes[longest.id]).toBe(Math.max(...shares));
  });

  it('folds I into the practice step when the lesson has no implement-family units', () => {
    const withoutCode = lessons.find(({ page }) => {
      const keys = Object.keys(page.frontmatter.estimate).sort().join('');
      return keys === 'INPRT' && !surveyUnits(page.body).some((u) => u.kind === 'code');
    });
    const { page } = withoutCode!;
    const minutes = lessonUnitMinutes(page.frontmatter, page.body);
    expect(minutes[DERIVED_UNITS.practice] ?? 0).toBeGreaterThanOrEqual(page.frontmatter.estimate.I);
  });

  it('gives R to the review step and splits N equally over the notes units', () => {
    const anyLesson = lessons.find(({ page }) => page.frontmatter.estimate.R === 30 && page.frontmatter.estimate.N === 10)!;
    const minutes = lessonUnitMinutes(anyLesson.page.frontmatter, anyLesson.page.body);
    expect(minutes[DERIVED_UNITS.review]).toBe(30);
    expect(minutes[DERIVED_UNITS.summary] + minutes[DERIVED_UNITS.revision] + minutes[DERIVED_UNITS.selfCheck]).toBe(10);
    for (const id of [DERIVED_UNITS.summary, DERIVED_UNITS.revision, DERIVED_UNITS.selfCheck]) expect(minutes[id]).toBeGreaterThanOrEqual(3);
  });
});

describe('the special formats (module 12)', () => {
  const special = (slug: string): PageContent<LessonFrontmatter> =>
    lessons.find(({ page }) => page.frontmatter.slug === slug)!.page;

  it('lesson 1: T over the theory units, P to the warm-up and the guided problem, no I', () => {
    const page = special('interview-end-to-end');
    const minutes = lessonUnitMinutes(page.frontmatter, page.body);
    expect(sum(minutes)).toBe(120);
    expect(minutes[DERIVED_UNITS.warmUp]).toBe(10);
    const guided = surveyUnits(page.body).find((u) => u.kind === 'guided')!;
    expect(minutes[guided.id]).toBe(70);
    const theory = surveyUnits(page.body).filter((u) => u.kind === 'theory');
    expect(theory.map((u) => minutes[u.id]).reduce((a, b) => a + b, 0)).toBe(page.frontmatter.estimate.T);
    expect(minutes[DERIVED_UNITS.practice] ?? 0).toBe(0);
  });

  it('lesson 2: the Repair letter is the practice step, P goes to the guided problem', () => {
    const page = special('repairing-weak-patterns-getting-unstuck');
    const minutes = lessonUnitMinutes(page.frontmatter, page.body);
    expect(sum(minutes)).toBe(120);
    expect(minutes[DERIVED_UNITS.practice]).toBe(page.frontmatter.estimate.Repair);
    const guided = surveyUnits(page.body).find((u) => u.kind === 'guided')!;
    expect(minutes[guided.id]).toBe(page.frontmatter.estimate.P);
    for (const unit of surveyUnits(page.body).filter((u) => u.kind === 'theory')) expect(minutes[unit.id]).toBeUndefined();
  });

  it('lesson 3: the Mock letter builds the mock unit, the rest of P lands on practice', () => {
    const page = special('mock-5-explaining-trade-offs');
    const minutes = lessonUnitMinutes(page.frontmatter, page.body);
    expect(sum(minutes)).toBe(120);
    expect(minutes[DERIVED_UNITS.mock]).toBe(60);
    expect(minutes[DERIVED_UNITS.practice]).toBe(35);
    expect(minutes[DERIVED_UNITS.review]).toBe(20);
    expect(minutes[DERIVED_UNITS.summary] + minutes[DERIVED_UNITS.revision] + minutes[DERIVED_UNITS.selfCheck]).toBe(5);
  });

  it('lesson 4: the drill letter lands on the complexity-drill unit, P on practice', () => {
    const page = special('one-hard-problem-complexity-drill');
    const minutes = lessonUnitMinutes(page.frontmatter, page.body);
    expect(sum(minutes)).toBe(120);
    expect(minutes['complexity-drill']).toBe(20);
    expect(minutes[DERIVED_UNITS.practice]).toBe(60);
  });

  it('lesson 5: the verbal letter lands on the explanation unit, the mock takes Mock; there is no practice', () => {
    const page = special('mock-6-90-second-explanation');
    const minutes = lessonUnitMinutes(page.frontmatter, page.body);
    expect(sum(minutes)).toBe(120);
    expect(minutes['the-90-second-explanation']).toBe(30);
    expect(minutes[DERIVED_UNITS.mock]).toBe(60);
    expect(minutes[DERIVED_UNITS.practice]).toBeUndefined();
    expect(minutes[DERIVED_UNITS.review]).toBe(20);
  });
});

const sum = (minutes: Record<string, number>): number => Object.values(minutes).reduce((a, b) => a + b, 0);

describe('the checkpoint formats', () => {
  it('maps test · R · N: the attempt card takes test, the after phase takes R with N', () => {
    const loaded = bundle.modules.find((m) => m.checkpoint !== null && 'test' in m.checkpoint.frontmatter.estimate)!;
    const checkpoint = loaded.checkpoint as PageContent<CheckpointFrontmatter>;
    const minutes = checkpointUnitMinutes(checkpoint.frontmatter, checkpoint.body);
    expect(Object.keys(minutes)).toEqual(expect.arrayContaining([CHECKPOINT_UNITS.attempt]));
    expect(minutes[CHECKPOINT_UNITS.attempt]).toBe(checkpoint.frontmatter.estimate.test);
    const afterUnit = surveyUnits(checkpoint.body).find((u) => u.kind === 'after')!;
    expect(minutes[afterUnit.id]).toBe((checkpoint.frontmatter.estimate.R ?? 0) + (checkpoint.frontmatter.estimate.N ?? 0));
    expect(sum(minutes)).toBe(totalMinutes(checkpoint.frontmatter.estimate));
    expect(minutes[CHECKPOINT_UNITS.after]).toBeUndefined();
  });

  it("maps Mock 60 · P45 · N15: the mock unit carries 105 (mock plus re-solves), the after unit the notes", () => {
    const loaded = bundle.modules.find((m) => m.module.frontmatter.slug === 'recursion-backtracking')!;
    const checkpoint = loaded.checkpoint as PageContent<CheckpointFrontmatter>;
    const minutes = checkpointUnitMinutes(checkpoint.frontmatter, checkpoint.body);
    const mockUnit = surveyUnits(checkpoint.body).find((u) => u.kind === 'mock')!;
    expect(minutes[mockUnit.id]).toBe(105);
    const afterUnit = surveyUnits(checkpoint.body).find((u) => u.kind === 'after')!;
    expect(minutes[afterUnit.id]).toBe(15);
    expect(sum(minutes)).toBe(120);
  });

  it('maps P on the drill checkpoints: the drill unit is the attempt, and the after phase has no body units', () => {
    const loaded = bundle.modules.find((m) => m.module.frontmatter.slug === 'complexity-arrays-hashing')!;
    const checkpoint = loaded.checkpoint as PageContent<CheckpointFrontmatter>;
    const minutes = checkpointUnitMinutes(checkpoint.frontmatter, checkpoint.body);
    const drillUnit = surveyUnits(checkpoint.body).find((u) => u.kind === 'drill')!;
    expect(minutes[drillUnit.id]).toBe(80);
    expect(minutes[CHECKPOINT_UNITS.after]).toBe(40);
    expect(sum(minutes)).toBe(120);
  });

  it('adds up to the legacy total on all twelve checkpoints', () => {
    const checkpoints = bundle.modules.filter((m): m is LoadedModule & { checkpoint: PageContent<CheckpointFrontmatter> } => m.checkpoint !== null);
    expect(checkpoints).toHaveLength(12);
    for (const m of checkpoints) {
      const minutes = checkpointUnitMinutes(m.checkpoint.frontmatter, m.checkpoint.body);
      expect(sum(minutes), m.module.frontmatter.slug).toBe(totalMinutes(m.checkpoint.frontmatter.estimate));
    }
  });
});

describe('the whole lesson set', () => {
  it('distributes minutes for all 60 study lessons and all of them add up (3 foundations have none)', () => {
    expect(lessons).toHaveLength(60);
    for (const { page } of lessons) {
      const minutes = lessonUnitMinutes(page.frontmatter, page.body);
      expect(sum(minutes), page.frontmatter.slug).toBe(totalMinutes(page.frontmatter.estimate));
    }
    const foundations = bundle.modules
      .flatMap((m) => m.lessons)
      .filter((p) => !('estimate' in p.frontmatter) || !p.frontmatter.estimate);
    expect(foundations).toHaveLength(3);
  });

  it('keeps the derived unit ids out of the body: surveyUnits never lists them', () => {
    for (const { page } of lessons) {
      for (const unit of surveyUnits(page.body)) expect(Object.values(DERIVED_UNITS)).not.toContain(unit.id);
    }
  });
});

describe('shareMinutes', () => {
  it('splits by weight with the remainder to the fractional leftovers', () => {
    expect(shareMinutes(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(shareMinutes(7, [1, 2])).toEqual([2, 5]);
    expect(shareMinutes(5, [3, 1, 1])).toEqual([3, 1, 1]);
    expect(shareMinutes(0, [2, 2])).toEqual([0, 0]);
    expect(shareMinutes(9, [])).toEqual([]);
  });

  it('splits equally over all-zero weights and never loses a minute', () => {
    expect(shareMinutes(5, [0, 0, 0])).toEqual([2, 2, 1]);
    expect(shareMinutes(13, [0, 0])).toEqual([7, 6]);
  });

  it('always returns whole minutes that add up', () => {
    for (let total = 0; total <= 30; total++) {
      for (const weights of [[1], [2, 3], [1, 1, 1, 1], [7, 0], [1, 1, 2, 3, 5]]) {
        const shares = shareMinutes(total, weights);
        expect(shares.reduce((a, b) => a + b, 0)).toBe(total);
        for (const s of shares) expect(Number.isInteger(s)).toBe(true);
      }
    }
  });
});
