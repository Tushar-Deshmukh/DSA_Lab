// renderBody (lib/content/render.tsx) against the real content, inspected as a React element tree. No static
// rendering: the tree's client components (ExerciseRunner, UnitShell) call useLearnerState() when they run, so
// the tests assert the elements as the server passes them, not their eventual HTML.
import { beforeAll, describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { loadContent, type ContentBundle, type MdxDoc, type PageContent } from '@/lib/content/load';
import type { CheckpointFrontmatter, LessonFrontmatter, TheoryFrontmatter } from '@/lib/content/schema';
import { inspectMdx } from '@/lib/content/mdx';
import { buildPageData, gatedUses, type PageData } from '@/lib/content/page-data';
import { renderBody, type RenderArgs } from '@/lib/content/render';
import { AnnotatedCodeView } from '@/components/content/annotated-code';
import { ExerciseRunner, LockedExercise } from '@/components/exercise/exercise';
import { GatedText } from '@/components/exercise/gate-text';
import { UnitShell } from '@/components/content/unit-shell';
import { VizEmbed } from '@/components/viz/viz-embed';
import { CONTENT_DIR } from '@/scripts/import/paths';

const MODULE = 'two-pointers-windows-prefix-sums';
const PAGE = 'opposite-end-two-pointers';
const KADANE_PAGE = 'partitioning-and-kadane';
const LESSON_KEY = `${MODULE}/${PAGE}`;

const emptyData: PageData = { exercises: {}, annotated: {}, problems: {}, gated: {}, locked: {} };

let bundle: ContentBundle;
let lesson: PageContent<LessonFrontmatter>;
let data: PageData;
let checkpoint: PageContent<CheckpointFrontmatter>;
let checkpointData: PageData;
let drill: MdxDoc<{ slug: string; title: string }> | undefined;
let drillData: PageData;
let kadane: PageContent<LessonFrontmatter>;

beforeAll(() => {
  bundle = loadContent(CONTENT_DIR);
  const module2 =
    bundle.modules.find(({ module: m }) => m.frontmatter.slug === MODULE) ?? (() => { throw new Error('module 2 is missing'); })();
  lesson =
    module2.lessons.find((p): p is PageContent<LessonFrontmatter> => p.frontmatter.slug === PAGE && 'topic' in p.frontmatter) ??
    (() => { throw new Error('the lesson is missing'); })();
  checkpoint = module2.checkpoint ?? (() => { throw new Error('the checkpoint is missing'); })();
  kadane =
    module2.lessons.find((p): p is PageContent<LessonFrontmatter> => p.frontmatter.slug === KADANE_PAGE && 'topic' in p.frontmatter) ??
    (() => { throw new Error('the Kadane lesson is missing'); })();
  data = buildPageData(bundle, MODULE, PAGE, lesson);
  checkpointData = buildPageData(bundle, MODULE, 'checkpoint', checkpoint);
  drill = bundle.handbook.get('handbook/method-and-recognition/classification-drill');
  if (!drill) throw new Error('the drill page is missing');
  drillData = { ...emptyData, gated: Object.fromEntries(gatedUses(bundle, drill.body)) };
});

const args = (overrides?: Partial<RenderArgs>): RenderArgs => ({ bundle, data, scope: LESSON_KEY, lesson: LESSON_KEY, ...overrides });

/** Every element in the tree, parents before children. React 19 types read `props` as unknown; this test only
 * walks plain props, so the casts stay local to these helpers. */
const elements = (node: unknown, out: ReactElement[] = []): ReactElement[] => {
  if (Array.isArray(node)) {
    for (const child of node) elements(child, out);
    return out;
  }
  if (node !== null && typeof node === 'object' && 'type' in node && 'props' in node) {
    const el = node as ReactElement;
    out.push(el);
    elements((el.props as { children?: unknown }).children, out);
  }
  return out;
};

const of = (tree: unknown, type: unknown): ReactElement[] => elements(tree).filter((el) => el.type === type);

/** The tree as a learner reads it: strings and numbers flattened, through client components as far as the tree goes. */
const text = (node: unknown): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map((c) => text(c)).join('');
  if (node !== null && typeof node === 'object' && 'props' in node)
    return text((node as { props: { children?: unknown } }).props.children);
  return '';
};

/** The first child element with the given intrinsic tag. */
const firstOf = (el: ReactElement, type: string): ReactElement | undefined => {
  const children = (el.props as { children?: unknown }).children;
  if (!Array.isArray(children)) return undefined;
  return (children as unknown[]).find(
    (c) => typeof c === 'object' && c !== null && (c as ReactElement).type === type,
  ) as ReactElement | undefined;
};

const alerts = (tree: unknown): string[] =>
  elements(tree).filter((el) => el.type === 'p' && (el.props as { role?: string }).role === 'alert').map((el) => text(el));

const cls = (el: ReactElement): string => String((el.props as { className?: string }).className ?? '');

describe('the lesson body (opposite-end-two-pointers)', () => {
  const tree = () => renderBody(args(), lesson.body);

  it('maps every `<Unit>` to a UnitShell with its props and the lesson key', () => {
    const units = of(tree(), UnitShell);
    const said = inspectMdx(lesson.body).components.filter((c) => c.name === 'Unit');
    expect(units).toHaveLength(said.length);
    units.forEach((unit, i) => {
      const p = unit.props as Record<string, unknown>;
      expect(p.id, `unit ${i}`).toBe(String(said[i]?.props.id));
      expect(p.kind, `unit ${i}`).toBe(String(said[i]?.props.kind));
      expect(p.title, `unit ${i}`).toBe(String(said[i]?.props.title));
      // Every unit writes its mark-done op against this lesson (plan 5.2).
      expect(p.lesson, `unit ${i}`).toBe(LESSON_KEY);
    });
    const kinds = units.map((u) => String((u.props as Record<string, unknown>).kind));
    expect(kinds).toContain('visual');
    expect(kinds).toContain('code');
  });

  it('inlines an `<Include>` in place, from any of the three sources', () => {
    const rendered = text(tree());
    expect(rendered.includes('Contiguous problems invite windows and prefix sums')).toBe(true);
    expect(rendered.includes('Pattern 2.1: Opposite-end two pointers')).toBe(true);
  });

  it('maps every `<Viz>` to a VizEmbed at heading level three', () => {
    const viz = of(tree(), VizEmbed).map((v) => v.props as Record<string, unknown>);
    expect(viz.map((v) => v.id).sort()).toEqual(['palindrome', 'two-sum-sorted']);
    for (const v of viz) expect(v.headingLevel).toBe(3);
  });

  it('maps every `<Exercise>` to an ExerciseRunner with its full slug and public part', () => {
    const runners = of(tree(), ExerciseRunner).map((r) => r.props as Record<string, unknown>);
    expect(runners).toHaveLength(lesson.exercises.length);
    for (const ex of lesson.exercises) {
      const slug = `${MODULE}/${PAGE}/${ex.id}`;
      const runner = runners.find((r) => r.slug === slug);
      expect(runner, slug).toBeDefined();
      expect(runner?.type, slug).toBe(ex.type);
      expect(runner?.public, slug).toEqual(data.exercises[ex.id]?.public);
    }
  });

  it('maps `<AnnotatedCode>` to the view with the block from the page data', () => {
    const views = of(tree(), AnnotatedCodeView).map((v) => v.props as Record<string, unknown>);
    expect(views).toHaveLength(1);
    expect(views[0]?.title).toBe('Two Sum II (problem 167), returning 1-based indices');
    expect(Object.keys(views[0]?.notes as Record<string, string>)).toEqual(['2', '3', '4', '5', '6', '7', '9']);
    expect(String(views[0]?.code).startsWith('function twoSumSorted(numbers, target) {')).toBe(true);
  });

  it('maps `<Callout>` to an aside per kind with the author title', () => {
    const asides = elements(tree()).filter((el) => el.type === 'aside' && (el.props as { 'data-callout'?: string })['data-callout']);
    const said = inspectMdx(lesson.body).components.filter((c) => c.name === 'Callout');
    expect(asides.map((a) => (a.props as { 'data-callout'?: string })['data-callout'])).toEqual(said.map((c) => c.props.kind));
    asides.forEach((a, i) => {
      const label = firstOf(a as ReactElement, 'span');
      expect(label, `callout ${i}`).toBeDefined();
      expect(text(label), `callout ${i}`).toBe(String(said[i]?.props.title));
      expect(text(a as ReactElement)).toContain(String(said[i]?.props.title));
    });
  });

  it('renders markdown as the page typography: lists, tables, emphasis and inline code', () => {
    const treeNow = tree();
    const els = elements(treeNow);
    expect(els.filter((el) => el.type === 'ul' || el.type === 'ol').length, 'the lesson has lists').toBeGreaterThan(3);
    expect(els.filter((el) => el.type === 'table').length).toBeGreaterThan(1);
    expect(of(treeNow, 'strong').length).toBeGreaterThan(3);
    expect(of(treeNow, 'em').length).toBeGreaterThan(3);
    const codes = of(treeNow, 'code').map((c) => text(c));
    expect(codes.some((c) => c.startsWith('[3, 1, 2]'))).toBe(true);
  });
});

describe('the checkpoint body and the handbook drill', () => {
  it('maps a gated exercise to a LockedExercise with its gate (D-027)', () => {
    const locked = of(
      renderBody({ bundle, data: checkpointData, scope: `${MODULE}/checkpoint`, lesson: `${MODULE}/checkpoint` }, checkpoint.body),
      LockedExercise,
    ).map((l) => l.props as Record<string, unknown>);
    expect(locked.map((l) => l.id)).toEqual(['ex-01', 'ex-02', 'ex-03', 'ex-04']);
    for (const l of locked) {
      expect(l.slug).toBe(`${MODULE}/checkpoint/${l.id}`);
      expect(l.gateId).toBe('assessment-1');
    }
  });

  it('renders a `<Gated>` in a list item in place and a body-level one as a card (D-027)', () => {
    if (!drill) throw new Error('the drill page is missing');
    const gated = of(
      renderBody({ bundle, data: drillData, scope: 'method-and-recognition/classification-drill' }, drill.body),
      GatedText,
    ).map((g) => g.props as Record<string, unknown>);
    expect(gated.map((g) => g.id)).toEqual(['classification-drill-6', 'classification-drill-answers']);
    expect(gated.map((g) => g.gateId)).toEqual(['assessment-1', 'classification-drill']);
    expect(gated[0]?.inline).toBe(true);
    expect(gated[1]?.inline).toBe(false);
  });
});

describe('the Kadane lesson: Stages', () => {
  const tree = () =>
    renderBody(
      {
        bundle,
        data: buildPageData(bundle, MODULE, KADANE_PAGE, kadane),
        scope: `${MODULE}/${KADANE_PAGE}`,
        lesson: `${MODULE}/${KADANE_PAGE}`,
      },
      kadane.body,
    );

  it('renders the worked problem as a numbered stages block, labels per stage', () => {
    const stages = elements(tree()).filter((el) => el.type === 'section' && (el.props as { 'data-stages'?: string })['data-stages'] === '');
    expect(stages).toHaveLength(1);
    const section = stages[0] as ReactElement;
    expect(text(of(section, 'h3')[0])).toBe('Maximum Subarray (problem 53), from brute force to one pass');
    const labels = of(section, 'h4').map((h) => text(h));
    expect(labels).toEqual([
      'Understand the problem',
      'Naive approach',
      'Discover the optimisation',
      'Visual dry run',
      'JavaScript implementation',
      'Complexity derivation',
      'Independent practice',
    ]);
  });

  it('numbers the stages one to seven and keeps the nested pieces working', () => {
    const treeNow = tree();
    const section = elements(treeNow).find(
      (el) => el.type === 'section' && (el.props as { 'data-stages'?: string })['data-stages'] === '',
    ) as ReactElement;
    // React keeps a JSX-mapped child array nested: walk rather than filter the direct children.
    const rows = elements(section).filter((el) => el.type === 'div' && cls(el).startsWith('grid'));
    expect(rows).toHaveLength(7);
    expect(rows.map((row) => text(firstOf(row, 'div')))).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(of(section, VizEmbed).map((v) => (v.props as Record<string, unknown>).id)).toEqual(['kadane']);
    expect(of(section, ExerciseRunner).map((r) => (r.props as Record<string, unknown>).slug)).toEqual([
      `${MODULE}/${KADANE_PAGE}/ex-05`,
      `${MODULE}/${KADANE_PAGE}/ex-06`,
      `${MODULE}/${KADANE_PAGE}/ex-07`,
    ]);
    // The code inside a stage's include and the page's own annotated block both render.
    expect(text(section).includes('bestEnding')).toBe(true);
  });
});

describe('what cannot render becomes a visible alert, not silence', () => {
  it('says so for a missing exercise, annotated block, problem and include', () => {
    const tree = renderBody(
      { bundle, data: emptyData, scope: 'x/y' },
      ['<Exercise id="ex-99" />', '<AnnotatedCode id="anno-99" />', '<Problem num={999999} />', '<Include id="theory/nowhere/none" />'].join('\n\n'),
    );
    const messages = alerts(tree);
    expect(messages.some((m) => m.includes('Exercise ex-99 is missing from the page data'))).toBe(true);
    expect(messages.some((m) => m.includes('The annotated block anno-99 is missing from the page data'))).toBe(true);
    expect(messages.some((m) => m.includes('Problem 999999 is missing from the problem data'))).toBe(true);
    expect(messages.some((m) => m.includes('The include theory/nowhere/none is missing from content/'))).toBe(true);
  });

  it('stops an `<Include>` chain at depth three', () => {
    const doc = (id: string, body: string): MdxDoc<TheoryFrontmatter> =>
      ({ path: `${id}.mdx`, frontmatter: { slug: id, title: id, module: MODULE }, body }) as unknown as MdxDoc<TheoryFrontmatter>;
    const synth = { ...bundle, theory: new Map(bundle.theory) } as ContentBundle;
    for (const [id, body] of [
      ['theory/x/y', '<Include id="theory/x/z" />'],
      ['theory/x/z', '<Include id="theory/x/w" />'],
      ['theory/x/w', '<Include id="theory/x/v" />'],
    ] as const) {
      synth.theory.set(id, doc(id, body));
    }
    const tree = renderBody({ bundle: synth, data: emptyData, scope: 'x/y' }, '<Include id="theory/x/y" />');
    const messages = alerts(tree);
    expect(messages.some((m) => m.includes('The include theory/x/v is nested too deep.'))).toBe(true);
    // The three outer includes still rendered; only the too-deep one alerted.
    expect(messages.some((m) => m.includes('theory/x/y'))).toBe(false);
    expect(messages.some((m) => m.includes('theory/x/z'))).toBe(false);
    expect(messages.some((m) => m.includes('theory/x/w'))).toBe(false);
  });

  it('says a Stage outside Stages and unknown or unregistered components have no rendering', () => {
    const tree = renderBody(
      { bundle, data: emptyData, scope: 'x/y' },
      ['<Stage name="problem" />', '<LessonLink slug="somewhere" />', '<Nope id="n" />'].join('\n\n'),
    );
    const messages = alerts(tree);
    expect(messages.some((m) => m.includes('A Stage belongs inside Stages.'))).toBe(true);
    expect(messages.some((m) => m.includes('<LessonLink somewhere> has no rendering yet.'))).toBe(true);
    expect(messages.some((m) => m.includes('The component <Nope> has no rendering.'))).toBe(true);
  });

  it('renders a task list as disabled checkboxes, unticked and ticked', () => {
    const tree = renderBody({ bundle, data: emptyData, scope: 'x/y' }, ['- [ ] item one', '- [x] item two'].join('\n'));
    const boxes = elements(tree).filter((el) => el.type === 'input' && (el.props as { type?: string }).type === 'checkbox');
    expect(boxes.map((b) => (b.props as { checked?: boolean }).checked)).toEqual([false, true]);
    for (const b of boxes) {
      expect((b.props as { disabled?: boolean }).disabled).toBe(true);
      expect((b.props as { readOnly?: boolean }).readOnly).toBe(true);
    }
  });

  it('falls back to the default callout title when the author left it off', () => {
    const tree = renderBody({ bundle, data: emptyData, scope: 'x/y' }, '<Callout kind="tip">\n\nJust a note.\n\n</Callout>');
    const aside = elements(tree).find((el) => el.type === 'aside') as ReactElement | undefined;
    expect(aside).toBeDefined();
    expect(text(aside)).toContain('Tip');
    expect(text(aside)).toContain('Just a note.');
  });
});
