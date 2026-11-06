import 'server-only';
// What a prerendered page carries in its payload (D-005, D-011): each exercise's public part, the annotated
// code blocks, the public facts of the bank problems the page links, and which gate each `<Gated>` text waits
// for. Answer keys and gated content are never in here — the key and gate endpoints serve those, one exercise
// at a time. Pages read content/ directly at prerender; nothing here touches the reserved text itself.
import type { ContentBundle, PageContent } from './load';
import { splitExercise } from './split';
import type { Exercise } from './schema';
import { parseMdx } from './mdx';

/** A bank problem's public facts. Module 12 problems keep their pattern, prerequisite, reason and hint back
 * until an attempt (D-012): the page then carries only the number and the link. */
export interface ProblemFacts {
  num: number;
  title: string;
  url: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tier?: 'C' | 'S' | 'O';
  role?: string;
  module?: string;
  lesson?: string;
  pattern?: string;
  hint?: string;
  /** The pattern note and hint are behind the problem-note endpoint until the learner has attempted it. */
  hidden?: true;
}

export interface PageExercise {
  /** The exercise's full slug: `<module>/<lesson>/<id>`, as the key endpoint and user data reference it. */
  slug: string;
  id: string;
  type: Exercise['type'];
  /** The public half of the split (D-011); it may not say what is correct or give away the solution. */
  public: Record<string, unknown>;
}

export type AnnotatedBlock = { title: string; code: string; notes: Record<string, string> };

export interface PageData {
  /** By exercise id, for `<Exercise id>`. */
  exercises: Record<string, PageExercise>;
  annotated: Record<string, AnnotatedBlock>;
  /** By problem number, for `<Problem num>`. */
  problems: Record<string, ProblemFacts>;
  /** By `<Gated id>` id: the gate whose opening brings the text (D-027). The text itself comes from the gate endpoint. */
  gated: Record<string, string>;
  /** By exercise id: the gate the exercise waits for (D-027). A locked exercise's public part is not on the page. */
  locked: Record<string, string>;
}

export function problemFacts(bundle: ContentBundle, num: number): ProblemFacts {
  const found = bundle.bank.find((p) => p.num === num);
  if (!found) return { num, title: `Problem ${num}`, url: '', difficulty: 'Medium', hidden: true };
  // A tiered problem the learner has not attempted yet keeps its pattern and hint back (D-012); an extension
  // problem has no tier and shows its title, which is no secret.
  const known = 'tier' in found ? found : null;
  if (known && known.hiddenUntilAttempted === true) {
    return { num, title: `Problem ${num}`, url: known.url, difficulty: known.difficulty, hidden: true };
  }
  return {
    num,
    title: found.title,
    url: found.url,
    difficulty: found.difficulty,
    ...(known
      ? {
          tier: known.tier,
          role: known.role,
          module: known.module,
          lesson: known.lesson,
          pattern: known.pattern,
          hint: known.hint,
        }
      : {}),
  };
}

/** Every `<Gated id>` on a page, mapped to the gate that opens it. Gated exercises are included too. */
export function gatedUses(bundle: ContentBundle, body: string): Map<string, string> {
  const gateOf = new Map(bundle.reserved.gated.gated.map((g) => [g.id, g.by]));
  const out = new Map<string, string>();
  const visit = (node: unknown) => {
    const n = node as { type: string; name?: string; children?: unknown[]; attributes?: unknown[] };
    if (n.type === 'mdxJsxFlowElement' || n.type === 'mdxJsxTextElement') {
      if (n.name === 'Gated') {
        const id = n.attributes?.find((a) => (a as { name?: string }).name === 'id');
        const value = id && typeof (id as { value?: unknown }).value === 'string' ? (id as { value: string }).value : null;
        const gate = value !== null ? gateOf.get(value) ?? bundle.reserved.gated.gated.find((g) => g.id === value)?.by : undefined;
        if (value !== null && gate) out.set(value, gate);
      }
      for (const child of n.children ?? []) visit(child);
      return;
    }
    for (const child of (n as { children?: unknown[] }).children ?? []) visit(child);
  };
  visit(parseMdx(body));
  return out;
}

/** The frontmatter facts a page body's problem cards need; a lesson or checkpoint's frontmatter satisfies it. */
type ProblemFrontmatter = { problems?: { num: number }[]; warmup?: { problem: number } };

/**
 * The page's own data: the exercises and annotated blocks from its YAML, the facts of the problems it links,
 * and the `<Gated>` ids in its body. Gated exercises are skipped — their public part only ships through the
 * gate endpoint once it opens; the page renderer shows them as locked cards.
 */
export function buildPageData(
  bundle: ContentBundle,
  moduleSlug: string,
  pageSlug: string,
  page: PageContent<ProblemFrontmatter>,
): PageData {
  const data: PageData = { exercises: {}, annotated: {}, problems: {}, gated: {}, locked: {} };
  const scope = `${moduleSlug}/${pageSlug}`;
  for (const exercise of page.exercises) {
    if (exercise.gatedBy) {
      // Gated: the public part ships through the gate endpoint once the gate opens (D-027); the page carries
      // only which gate holds it, so the renderer can show a locked card.
      data.locked[exercise.id] = exercise.gatedBy;
      continue;
    }
    const slug = `${scope}/${exercise.id}`;
    data.exercises[exercise.id] = {
      slug,
      id: exercise.id,
      type: exercise.type,
      public: splitExercise(exercise).public,
    };
  }
  for (const anno of page.annotated) {
    data.annotated[anno.id] = { title: anno.title, code: anno.code, notes: anno.notes };
  }
  const nums = new Set<number>();
  for (const problem of page.frontmatter.problems ?? []) nums.add(problem.num);
  if (page.frontmatter.warmup) nums.add((page.frontmatter.warmup as { problem: number }).problem);
  for (const num of nums) data.problems[String(num)] = problemFacts(bundle, num);
  for (const [id, gate] of gatedUses(bundle, page.body)) data.gated[id] = gate;
  return data;
}
