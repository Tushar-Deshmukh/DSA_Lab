// content:check on the real content, and proof that each rule fails when its rule is broken.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadContent, type ContentBundle, type MdxDoc } from '@/lib/content/load';
import { inspectMdx } from '@/lib/content/mdx';
import { AnnotatedCodeSchema, ExerciseSchema, HandbookFrontmatterSchema } from '@/lib/content/schema';
import {
  checkCounts,
  checkCoverage,
  checkDates,
  checkMdxRules,
  checkReferences,
  checkReserved,
  checkSlugs,
  contentCounts,
  learnerTexts,
  validateContent,
} from '@/lib/content/validate';
import { EXPECTED_COUNTS } from '@/lib/content/expected';
import { CONTENT_DIR } from '@/scripts/import/paths';
import { legacyVisualizerIds } from '@/scripts/validate-content';

let bundle: ContentBundle;
const known = legacyVisualizerIds();

/** A private copy to break. Maps and nested objects are copied, so tests cannot affect each other. */
const copy = (): ContentBundle => structuredClone(bundle);

const LESSON = 'two-pointers-windows-prefix-sums/opposite-end-two-pointers';

function lessonOf(b: ContentBundle) {
  const m = b.modules.find((x) => x.module.frontmatter.slug === 'two-pointers-windows-prefix-sums');
  const lesson = m?.lessons.find((l) => l.frontmatter.slug === 'opposite-end-two-pointers');
  if (!m || !lesson) throw new Error('fixture lesson is missing');
  return { module: m, lesson };
}

const appendToLesson = (b: ContentBundle, text: string) => {
  const { lesson } = lessonOf(b);
  lesson.body += `\n\n${text}\n`;
};

const firstMcq = (b: ContentBundle) => {
  const { lesson } = lessonOf(b);
  const e = lesson.exercises[0];
  if (!e) throw new Error('fixture exercise is missing');
  return e;
};

beforeAll(() => {
  bundle = loadContent(CONTENT_DIR);
});

describe('the imported content', () => {
  it('passes every check', () => {
    expect(validateContent(bundle, known)).toEqual([]);
  });

  it('has the counts in docs/inventory.md', () => {
    expect(contentCounts(bundle)).toEqual(EXPECTED_COUNTS);
    expect(known.size).toBe(129);
  });
});

describe('the date check', () => {
  const cases: [string, string][] = [
    ['a calendar date', 'Finish this by 14 Nov.'],
    ['a month first date', 'Finish this by Nov 14.'],
    ['a weekday', 'Do this on Monday.'],
    ['a short weekday', 'Do this on Sat.'],
    ['a plural weekday', 'Practise on Sundays.'],
    ['a schedule code', 'This was taught in W3D2.'],
    ['a week code', 'This was taught in W3.'],
    ['Week N', 'This returns in Week 7.'],
    ['Day N', 'This returns on Day 2.'],
    ['this week', 'Everything this week builds on it.'],
    ['12 weeks', 'A realistic result after 12 weeks.'],
    ['today', 'Do this today.'],
    ['tomorrow', 'You will see this tomorrow.'],
    ['a holiday', 'Skip it on the holiday.'],
    ['overdue', 'Five problems are overdue.'],
    ['a deadline', 'The deadline is close.'],
    ['a streak', 'Keep your streak going.'],
    ['fall behind', 'If you fall behind, drop Stretch.'],
    ['catch up', 'Use the time to catch up.'],
    ['a year', 'Checked in 2026.'],
    ['an ISO date', 'Checked on 2026-11-04.'],
    ['the old name', 'The roadmap explains this.'],
    ['Claude', 'Ask Claude in a new chat.'],
  ];
  it.each(cases)('finds %s in lesson text', (_name, sentence) => {
    const b = copy();
    appendToLesson(b, sentence);
    expect(checkDates(b).join('\n')).toContain(`lesson:${LESSON}`);
  });

  it('reads frontmatter', () => {
    const b = copy();
    (lessonOf(b).lesson.frontmatter as { goal: string }).goal = 'Finish this by Friday.';
    expect(checkDates(b).join('\n')).toContain(`lesson:${LESSON}#goal`);
  });

  it('reads exercise text, including the text of options and hints', () => {
    const b = copy();
    const e = firstMcq(b);
    e.hints[0] = 'Think about what you did yesterday.';
    expect(checkDates(b).join('\n')).toContain('#hints[0]');
  });

  it('reads comments inside code a learner sees, but not identifiers', () => {
    const b = copy();
    const code = bundle.modules
      .flatMap((m) => m.lessons)
      .flatMap((l) => l.exercises)
      .find((e) => e.type === 'code');
    expect(code).toBeDefined();
    const target = b.modules
      .flatMap((m) => m.lessons)
      .flatMap((l) => l.exercises)
      .find((e) => e.id === code?.id && e.legacyId === code?.legacyId);
    if (target?.type !== 'code') throw new Error('no code exercise');
    target.starter = 'let days = 1; // from Monday';
    const found = checkDates(b).filter((p) => p.includes('#starter'));
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('Monday');
  });

  it('reads string props such as a visualizer title', () => {
    const b = copy();
    appendToLesson(b, '<Viz id="pair-brute" title="See this on Wednesday" />');
    expect(checkDates(b).join('\n')).toContain('Wednesday');
  });

  it('reads table cells and headings', () => {
    const b = copy();
    appendToLesson(b, '### Heading for Tuesday\n\n| A | B |\n| --- | --- |\n| 1 | Thursday |');
    const found = checkDates(b).join('\n');
    expect(found).toContain('Tuesday');
    expect(found).toContain('Thursday');
  });

  it('reads the title of a handbook page', () => {
    const b = copy();
    const page = b.handbook.get('handbook/how-this-course-works/explicit-assumptions') as MdxDoc<{ title: string }>;
    page.frontmatter.title = 'Assumptions for this week';
    expect(checkDates(b).join('\n')).toContain('week');
  });

  it('fails on an allowlist entry that matches nothing', () => {
    const b = copy();
    b.allowlists.dates.entries.push({ match: 'a phrase nobody wrote', reason: 'none' });
    expect(checkDates(b).join('\n')).toContain('matches nothing');
  });

  it('applies a scoped allowlist entry in its scope only', () => {
    const b = copy();
    // "Daily Temperatures" is allowed for the title of problem 739, not in this lesson.
    appendToLesson(b, 'Compare with Daily Temperatures.');
    expect(checkDates(b).join('\n')).toContain(`lesson:${LESSON}`);
  });

  it('keeps every allowlist entry explained', () => {
    for (const entry of [...bundle.allowlists.dates.entries, ...bundle.allowlists.reserved.entries]) {
      expect(entry.reason.length, entry.match).toBeGreaterThan(10);
    }
  });
});

describe('the reserved-problem check', () => {
  const cases: [string, string][] = [
    ['an assessment title', 'Compare with Subarray Sums Divisible by K.'],
    ['a mock title', 'This is the idea behind Asteroid Collision.'],
    ['a URL slug', 'See [this](https://leetcode.com/problems/online-stock-span/).'],
    ['LeetCode and a number', 'Try LeetCode 1456 next.'],
    ['problem and a number', 'Problem 1026 uses the same idea.'],
    ['a number in brackets', 'Monotonic stacks also solve this one (901).'],
    ['a bare number', 'Keep 216 and 23 for later.'],
    ['a paraphrase', 'The stock span question uses this.'],
    ['a paraphrase of 974', 'Count subarrays divisible by k.'],
    ['a Module 12 name', 'Design problems such as Time Map combine a map and a list.'],
  ];
  it.each(cases)('finds %s in a lesson', (_name, sentence) => {
    const b = copy();
    appendToLesson(b, sentence);
    expect(checkReserved(b).join('\n')).toContain(`lesson:${LESSON}`);
  });

  it('finds the number of a Module 12 problem next to theory', () => {
    const b = copy();
    const doc = b.patterns.get('patterns/sliding-window');
    if (!doc) throw new Error('fixture pattern is missing');
    doc.body += '\n\nVariation: 438 uses a fixed window.\n';
    expect(checkReserved(b).join('\n')).toContain('Module 12 problem 438');
  });

  it('finds a reserved statement in an exercise that is not gated', () => {
    const b = copy();
    firstMcq(b).q = 'Count subarrays divisible by k.';
    expect(checkReserved(b).join('\n')).toContain('clue');
  });

  it('skips an exercise that never ships before its gate', () => {
    const b = copy();
    const e = firstMcq(b);
    e.q = 'Count subarrays divisible by k.';
    e.gatedBy = 'assessment-1';
    expect(checkReserved(b).join('\n')).not.toContain(e.id + '#q');
  });

  it('finds a reserved problem in the bank', () => {
    const b = copy();
    const entry = b.bank[0];
    if (!entry || !('why' in entry)) throw new Error('fixture problem is missing');
    entry.why = 'Sets up Online Stock Span.';
    expect(checkReserved(b).join('\n')).toContain('bank:');
  });

  it('never treats gated or reserved text as public', () => {
    const gatedTexts = learnerTexts(bundle).filter((t) => t.location.startsWith('gated:'));
    expect(gatedTexts.length).toBeGreaterThan(0);
    for (const t of gatedTexts) expect(t.gated).toBe(true);
  });
});

describe('the MDX rules', () => {
  const cases: [string, string, string][] = [
    ['an import', "import x from 'y'", 'import or export'],
    ['an export', 'export const a = 1', 'import or export'],
    ['an expression', 'The answer is {1 + 1}.', 'expression'],
    ['an unknown component', '<Script src="x" />', 'not registered'],
    ['a lowercase element', '<div>hello</div>', 'not registered'],
    ['a prop that is code', '<Viz id="pair-brute" input={fetchInput()} />', 'not a literal'],
    ['a prop that is a variable', '<Viz id="pair-brute" input={{ a: b }} />', 'not a literal'],
    ['a spread prop', '<Viz id="pair-brute" {...props} />', 'spread'],
    ['an unknown prop', '<Exercise id="ex-01" onClick="x" />', 'unknown prop'],
    ['a missing prop', '<Exercise />', 'missing prop'],
  ];
  it.each(cases)('reject %s', (_name, source, message) => {
    const b = copy();
    appendToLesson(b, source);
    expect(checkMdxRules(b).join('\n')).toContain(message);
  });

  it('accept literal props, nested objects and negative numbers', () => {
    const { problems, components } = inspectMdx('<Viz id="x" title="t" input={{ a: [1, -2, null], b: "c", d: { e: true } }} />');
    expect(problems).toEqual([]);
    expect(components[0]?.props.input).toEqual({ a: [1, -2, null], b: 'c', d: { e: true } });
  });

  it('report text that does not parse', () => {
    expect(inspectMdx('<Unit id="x"').problems[0]).toContain('does not parse');
  });
});

describe('the reference check', () => {
  const cases: [string, string, string][] = [
    ['an include', '<Include id="theory/nope/nope" />', 'no include target'],
    ['a visualizer', '<Viz id="not-a-visualizer" />', 'no visualizer'],
    ['an exercise', '<Exercise id="ex-99" />', 'no exercise ex-99'],
    ['annotated code', '<AnnotatedCode id="anno-99" />', 'no annotated code'],
    ['gated text', '<Gated id="nope" />', 'no gated text'],
    ['a problem', '<Problem num={99999} />', 'no problem 99999'],
    ['a pattern link', '<PatternLink slug="nope" />', 'no pattern nope'],
    ['a lesson link', '<LessonLink slug="nope/nope" />', 'no lesson nope/nope'],
    ['a glossary term', '<Term id="heap" />', 'no glossary'],
  ];
  it.each(cases)('finds a broken link to %s', (_name, source, message) => {
    const b = copy();
    appendToLesson(b, source);
    expect(checkReferences(b, known).join('\n')).toContain(message);
  });

  it('finds an exercise that is on no page', () => {
    const b = copy();
    const { lesson } = lessonOf(b);
    lesson.body = lesson.body.replace('<Exercise id="ex-01" />', '');
    expect(checkReferences(b, known).join('\n')).toContain('exercise ex-01 is on no page');
  });

  it('finds a warm-up, a scheduled problem and a re-solve that are not in the bank', () => {
    const b = copy();
    const fm = lessonOf(b).lesson.frontmatter as Record<string, unknown>;
    fm.warmup = { problem: 99991 };
    fm.problems = [{ num: 99992, tier: 'C' }];
    fm.resolves = [{ problems: [99993] }];
    const found = checkReferences(b, known).join('\n');
    expect(found).toContain('no warm-up problem 99991');
    expect(found).toContain('no problem 99992');
    expect(found).toContain('no re-solve 99993');
  });

  it('finds a bad prerequisite in the track and a bad lesson in the bank', () => {
    const b = copy();
    b.track.modules[1]?.prerequisites.push('nope');
    const entry = b.bank[0];
    if (!entry || !('lesson' in entry)) throw new Error('fixture problem is missing');
    entry.lesson = 'nope';
    const found = checkReferences(b, known).join('\n');
    expect(found).toContain('no prerequisite nope');
    expect(found).toContain('no lesson');
  });

  it('finds a gate that does not exist', () => {
    const b = copy();
    firstMcq(b).gatedBy = 'assessment-99';
    expect(checkReferences(b, known).join('\n')).toContain('no gate assessment-99');
  });
});

describe('the slug check', () => {
  it('fails when a released slug disappears', () => {
    const b = copy();
    const { module } = lessonOf(b);
    module.lessons = module.lessons.filter((l) => l.frontmatter.slug !== 'opposite-end-two-pointers');
    expect(checkSlugs(b).join('\n')).toContain(`lesson:${LESSON} was released and is gone`);
  });

  it('accepts a rename when an alias says where it went', () => {
    const b = copy();
    const { lesson } = lessonOf(b);
    lesson.frontmatter.slug = 'opposite-ends';
    const renamed = 'lesson:two-pointers-windows-prefix-sums/opposite-ends';
    b.idsLock.aliases[`lesson:${LESSON}`] = renamed;
    b.idsLock.ids.push(renamed);
    expect(checkSlugs(b).join('\n')).not.toContain(`lesson:${LESSON} was released`);
  });

  it('fails when an alias points nowhere', () => {
    const b = copy();
    const { module } = lessonOf(b);
    module.lessons = module.lessons.filter((l) => l.frontmatter.slug !== 'opposite-end-two-pointers');
    b.idsLock.aliases[`lesson:${LESSON}`] = 'lesson:nowhere';
    expect(checkSlugs(b).join('\n')).toContain('points at lesson:nowhere');
  });

  it('fails on a new id that is not locked', () => {
    const b = copy();
    b.idsLock.ids = b.idsLock.ids.filter((id) => id !== `lesson:${LESSON}`);
    expect(checkSlugs(b).join('\n')).toContain(`lesson:${LESSON} is new`);
  });

  it('fails on a duplicate unit id, a duplicate exercise id and a duplicate problem', () => {
    const b = copy();
    const { lesson } = lessonOf(b);
    appendToLesson(b, '<Unit id="dup" kind="theory" title="a">\n\ntext\n\n</Unit>');
    appendToLesson(b, '<Unit id="dup" kind="theory" title="b">\n\ntext\n\n</Unit>');
    const first = lesson.exercises[0];
    if (!first) throw new Error('fixture exercise is missing');
    lesson.exercises.push({ ...first });
    const entry = b.bank[0];
    if (!entry) throw new Error('fixture problem is missing');
    b.bank.push({ ...entry });
    const found = checkSlugs(b).join('\n');
    expect(found).toContain('duplicate unit id dup');
    expect(found).toContain('duplicate exercise id');
    expect(found).toContain('duplicate problem');
  });
});

describe('the coverage check', () => {
  it('fails when a fragment is included by no lesson', () => {
    const b = copy();
    const { lesson } = lessonOf(b);
    const id = 'theory/two-pointers-windows-prefix-sums/subarray-vs-substring-vs-subsequence';
    lesson.body = lesson.body.replace(`<Include id="${id}" />`, '');
    expect(checkCoverage(b).join('\n')).toContain(id);
  });

  it('fails when a module has no learning objectives', () => {
    const b = copy();
    delete lessonOf(b).module.module.frontmatter.objectives;
    expect(checkCoverage(b).join('\n')).toContain('no learning objectives');
  });
});

describe('the count check', () => {
  it('fails when an exercise is lost', () => {
    const b = copy();
    lessonOf(b).lesson.exercises.pop();
    const found = checkCounts(b).join('\n');
    expect(found).toContain('exercises: expected 421, found 420');
    expect(found).toContain('exercisesByModule');
  });

  it('fails when a problem or a reserved problem is lost', () => {
    const b = copy();
    b.bank.shift();
    b.reserved.mocks.mocks[0]?.pool.pop();
    const found = checkCounts(b).join('\n');
    expect(found).toContain('bank: expected 173, found 172');
    expect(found).toContain('reservedProblems: expected 31, found 30');
  });
});

describe('the schemas', () => {
  const mcq = {
    id: 'ex-01',
    legacyId: 'w1d1-1',
    type: 'mcq',
    tag: 'Concept',
    q: 'Question?',
    options: [{ t: 'A', ok: true }, { t: 'B', why: 'No.', kind: 'concept' }],
    explain: 'Because.',
    hints: ['Think.'],
  };

  it('accept a valid exercise', () => {
    expect(ExerciseSchema.safeParse(mcq).success).toBe(true);
  });

  it('catch YAML text that parsed as an object, the legacy pitfall', () => {
    expect(ExerciseSchema.safeParse({ ...mcq, q: { 'Note': 'text after a colon' } }).success).toBe(false);
    expect(ExerciseSchema.safeParse({ ...mcq, explain: { a: 'b' } }).success).toBe(false);
    expect(ExerciseSchema.safeParse({ ...mcq, hints: [{ a: 'b' }] }).success).toBe(false);
    expect(ExerciseSchema.safeParse({ ...mcq, options: [{ t: { a: 'b' } }, { t: 'B' }] }).success).toBe(false);
  });

  it('catch unknown fields and types', () => {
    expect(ExerciseSchema.safeParse({ ...mcq, answer: 'A' }).success).toBe(false);
    expect(ExerciseSchema.safeParse({ ...mcq, type: 'essay' }).success).toBe(false);
    expect(ExerciseSchema.safeParse({ ...mcq, hints: [] }).success).toBe(false);
  });

  it('catch annotated notes keyed by anything but a line number', () => {
    expect(AnnotatedCodeSchema.safeParse({ id: 'anno-01', code: 'x', title: '', notes: { 1: 'ok' } }).success).toBe(true);
    expect(AnnotatedCodeSchema.safeParse({ id: 'anno-01', code: 'x', title: '', notes: { one: 'no' } }).success).toBe(false);
  });

  it('catch a page without its source reference', () => {
    expect(HandbookFrontmatterSchema.safeParse({ slug: 'a', section: 1, title: 'A' }).success).toBe(false);
  });
});
