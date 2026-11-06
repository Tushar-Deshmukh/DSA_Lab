// buildPageData (lib/content/page-data.ts) against the real content: a lesson's page data and an assessment's
// locked one. This is what a page payload may carry (D-005, D-011, D-012) — and what it may not.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadContent, type ContentBundle, type LoadedModule, type PageContent } from '@/lib/content/load';
import type { LessonFrontmatter, CheckpointFrontmatter } from '@/lib/content/schema';
import { buildPageData, gatedUses, problemFacts, type PageData } from '@/lib/content/page-data';
import { splitExercise } from '@/lib/content/split';
import { CONTENT_DIR } from '@/scripts/import/paths';

let bundle: ContentBundle;
let module2: LoadedModule;
let lesson: PageContent<LessonFrontmatter>;
let lessonData: PageData;
let checkpoint: PageContent<CheckpointFrontmatter>;
let checkpointData: PageData;

beforeAll(() => {
  bundle = loadContent(CONTENT_DIR);
  module2 = bundle.modules.find(({ module: m }) => m.frontmatter.slug === 'two-pointers-windows-prefix-sums') ?? (() => { throw new Error('module 2 is missing'); })();
  lesson =
    module2.lessons.find(
      (p): p is PageContent<LessonFrontmatter> =>
        p.frontmatter.slug === 'opposite-end-two-pointers' && 'topic' in p.frontmatter,
    ) ?? (() => { throw new Error('the lesson is missing'); })();
  checkpoint = module2.checkpoint ?? (() => { throw new Error('the checkpoint is missing'); })();
  lessonData = buildPageData(bundle, module2.module.frontmatter.slug, lesson.frontmatter.slug, lesson);
  checkpointData = buildPageData(bundle, module2.module.frontmatter.slug, checkpoint.frontmatter.slug, checkpoint);
});

describe('buildPageData on a lesson page', () => {
  it('carries every ungated exercise by its full slug, with the public half of the split (D-011)', () => {
    expect(lesson.exercises.filter((ex) => ex.gatedBy), 'this lesson has no gated exercises to distract the test').toEqual([]);
    for (const ex of lesson.exercises) {
      const slug = `${module2.module.frontmatter.slug}/${lesson.frontmatter.slug}/${ex.id}`;
      expect(lessonData.exercises[ex.id]).toEqual({ slug, id: ex.id, type: ex.type, public: splitExercise(ex).public });
    }
    expect(Object.keys(lessonData.exercises)).toHaveLength(lesson.exercises.length);
  });

  it('carries the annotated blocks by id', () => {
    expect(Object.keys(lessonData.annotated)).toEqual(lesson.annotated.map((a) => a.id));
    for (const anno of lesson.annotated) expect(lessonData.annotated[anno.id]).toEqual({ title: anno.title, code: anno.code, notes: anno.notes });
  });

  it('carries the facts of every problem the frontmatter names, warm-up included', () => {
    expect(lesson.frontmatter.warmup).toBeDefined();
    const nums = [...new Set([...lesson.frontmatter.problems.map((p) => p.num), lesson.frontmatter.warmup?.problem ?? 0])].sort((a, b) => a - b);
    // Integer-like keys come back in numeric order, whoever inserted them first.
    expect(Object.keys(lessonData.problems)).toEqual(nums.map(String));
    for (const num of nums) expect(lessonData.problems[String(num)]).toEqual(problemFacts(bundle, num));
  });

  it('maps the `<Gated>` ids in the body; this lesson body has none', () => {
    expect(lessonData.gated).toEqual({});
  });
});

describe('buildPageData on the module 2 checkpoint (Assessment 1)', () => {
  it('leaves all four gated exercises off the page and names their gate (D-027)', () => {
    expect(Object.keys(checkpointData.exercises)).toEqual([]);
    expect(checkpointData.locked).toEqual({
      'ex-01': 'assessment-1',
      'ex-02': 'assessment-1',
      'ex-03': 'assessment-1',
      'ex-04': 'assessment-1',
    });
  });

  it('carries no annotated blocks: the checkpoint defines none', () => {
    expect(Object.keys(checkpointData.annotated)).toEqual([]);
  });
});

describe('problemFacts', () => {
  it('shows a normal bank problem with its tier facts', () => {
    const num = lesson.frontmatter.problems[0].num;
    expect(problemFacts(bundle, num)).toMatchObject({ num, tier: 'C' });
  });

  it('keeps a hidden module 12 problem to its number and link (D-012)', () => {
    const hidden = bundle.bank.find((p) => 'tier' in p && p.hiddenUntilAttempted === true);
    if (!hidden) throw new Error('no hidden problem in the bank');
    const facts = problemFacts(bundle, hidden.num);
    expect(facts).toEqual({ num: hidden.num, title: `Problem ${hidden.num}`, url: hidden.url, difficulty: hidden.difficulty, hidden: true });
  });

  it('does not invent an unknown problem', () => {
    expect(problemFacts(bundle, 999999)).toMatchObject({ title: 'Problem 999999', url: '', hidden: true });
  });
});

describe('gatedUses', () => {
  it('maps the classification drill passages to their gates, wherever they sit (D-027)', () => {
    const drill = bundle.handbook.get('handbook/method-and-recognition/classification-drill');
    if (!drill) throw new Error('the drill page is missing');
    const uses = [...gatedUses(bundle, drill.body)];
    expect(uses).toEqual(
      expect.arrayContaining([
        ['classification-drill-6', 'assessment-1'],
        ['classification-drill-answers', 'classification-drill'],
      ]),
    );
  });
});
