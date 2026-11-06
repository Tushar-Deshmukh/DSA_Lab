import 'server-only';
// Unit minutes (plan 5.3): every study lesson's legacy Time cell spreads over its units, and the page shows
// "about N min" per lesson and per unit. A unit is one legacy `##` section (the `<Unit>` wrappers in lesson
// bodies) plus the units built from lesson metadata and the schedule row: the warm-up, the practice step, the
// review step, the mock, and the summary, revision prompt and self-check. The letters map like this:
//
//   T theory → theory and reference units, split by text length
//   I implement / dry run → worked-example, visual, dry-run and the other implement-family units, split by
//     text length; a lesson whose worked examples sit inside includes without their own units folds I into
//     the practice step, because that hands-on work happens at the editor with the practice problems
//   P practice (includes the 10-minute warm-up) → warm-up 10 min; guided units and the practice unit share
//     the rest by number of problems (a guided unit is one interview problem); when neither has one, the
//     practice unit takes the rest
//   R review of solutions and complexity → the review step after practice
//   N notes → summary, revision prompt and self-check, equal shares
//   Mock → the lesson's mock (a checkpoint's mock attempt gets it from the checkpoint's own rule)
//   Repair → the practice step: the cold re-solves of the weak patterns are the repair session
//   drill → on study lessons, the unit whose material is the drill (module 12 lesson 4); a checkpoint's
//     drill unit is its attempt unit by kind
//   verbal → on study lessons, the explanation drill's unit (module 12 lesson 5)
//
// A test checks that each lesson's unit estimates add up to its legacy total, and pins the special formats.
// Checkpoint estimates come from their own formats (for example "90 test · R25 · N5"): the attempt letters
// (test, Mock, P) sum to the attempt's minutes, and R with N belongs to the phase after the attempt.
// Units whose family letter is absent get no minutes; the page then shows no estimate for them.
import { parseMdx, jsxProps } from './mdx';
import type { CheckpointFrontmatter, LessonFrontmatter } from './schema';

/** The unit ids the lesson page builds from the lesson metadata and the schedule row (plan 5.2). The review
 * step sorts before the notes units, right after practice. */
export const DERIVED_UNITS = {
  warmUp: 'warm-up',
  practice: 'practice',
  review: 'practice-review',
  mock: 'mock',
  summary: 'summary',
  revision: 'revision',
  selfCheck: 'self-check',
} as const;

/** The checkpoint page's own two phase cards (plan 5.4); before units come from the body itself. */
export const CHECKPOINT_UNITS = {
  attempt: 'attempt',
  after: 'after',
} as const;

/** The unit kinds that carry the I letter (plan 5.2): worked example, visual dry run, dry run, complexity,
 * trade-offs, pattern. The one `:::stages` lesson keeps its stages inside a theory unit, so there is no
 * stages kind. `{reference}` sits with theory. */
const IMPLEMENT_KINDS = new Set(['code', 'visual', 'dryrun', 'complexity', 'tradeoffs', 'pattern']);
const THEORY_KINDS = new Set(['theory', 'reference']);

/** The derived ids a lesson build must know, the derived checkpoint ids, in one set for focus mode. */
export const DERIVED_UNIT_IDS: ReadonlySet<string> = new Set([...Object.values(DERIVED_UNITS), ...Object.values(CHECKPOINT_UNITS)]);

export interface BodyUnit {
  id: string;
  kind: string;
  title: string;
  /** The characters a learner reads or types in the unit: prose, headings, tables, code. Include bodies are
   * not expanded — an include's minutes belong to the unit that embeds it. */
  textLength: number;
  exerciseCount: number;
}

/** One `<Unit>` per lesson body, in document order. */
export function surveyUnits(body: string): BodyUnit[] {
  const out: BodyUnit[] = [];
  for (const node of parseMdx(body).children) {
    if (node.type !== 'mdxJsxFlowElement' || node.name !== 'Unit') continue;
    const props = jsxProps(node);
    const children = (node.children ?? []) as { type: string; name?: string | null }[];
    out.push({
      id: String(props.id),
      kind: String(props.kind),
      title: String(props.title),
      textLength: bodyTextLength(node),
      exerciseCount: children.filter((c) => c.type === 'mdxJsxFlowElement' && c.name === 'Exercise').length,
    });
  }
  return out;
}

/** Adds up the text a learner reads or types: plain text, block code and inline code. */
function bodyTextLength(node: unknown): number {
  const n = node as { type?: string; value?: string; children?: unknown[] };
  if (n.type === 'text' || n.type === 'code' || n.type === 'inlineCode') return (n.value ?? '').length;
  return (n.children ?? []).reduce((sum: number, child) => sum + bodyTextLength(child), 0);
}

/** Splits whole minutes across weights, remainder to the fractional leftovers, earlier entries first.
 * All-zero weights split equally. */
export function shareMinutes(total: number, weights: readonly number[]): number[] {
  const zeros = weights.map(() => 0);
  if (total <= 0 || weights.length === 0) return zeros;
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    const base = Math.floor(total / weights.length);
    let extra = total - base * weights.length;
    return weights.map(() => (extra-- > 0 ? base + 1 : base));
  }
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  const order = raw
    .map((r, i) => ({ i, frac: r - out[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const rest = total - out.reduce((a, b) => a + b, 0);
  for (let k = 0; k < rest; k++) out[order[k].i]++;
  return out;
}

function addShares(out: Record<string, number>, total: number, ids: readonly string[], weights: readonly number[]): void {
  const shares = shareMinutes(total, weights);
  ids.forEach((id, i) => {
    if (shares[i] > 0) out[id] = (out[id] ?? 0) + shares[i];
  });
}

/** What the lesson rule reads from the frontmatter. */
export type LessonEstimateFrontmatter = Pick<LessonFrontmatter, 'estimate' | 'problems' | 'warmup' | 'mock'>;

/** The unit minutes of one study lesson: its body's units plus the derived ids, keyed by unit id. */
export function lessonUnitMinutes(frontmatter: LessonEstimateFrontmatter, body: string): Record<string, number> {
  const est = frontmatter.estimate;
  const out: Record<string, number> = {};
  const units = surveyUnits(body);
  const theoryUnits = units.filter((u) => THEORY_KINDS.has(u.kind));
  const implementUnits = units.filter((u) => IMPLEMENT_KINDS.has(u.kind));
  const guidedUnits = units.filter((u) => u.kind === 'guided');
  // The leftover place when a letter's natural recipients are missing: the practice step first when this
  // lesson has one (it is where the timed work happens), then the notes units.
  const fold = (amount: number): void => {
    if (amount <= 0) return;
    if (est.P !== undefined) out[DERIVED_UNITS.practice] = (out[DERIVED_UNITS.practice] ?? 0) + amount;
    else addShares(out, amount, [DERIVED_UNITS.summary, DERIVED_UNITS.revision, DERIVED_UNITS.selfCheck], [1, 1, 1]);
  };
  const byTitleWord = (word: RegExp): { id: string } | undefined =>
    units.find((u) => word.test(u.id) || word.test(u.title));

  if (est.T) {
    if (theoryUnits.length === 0) fold(est.T);
    else addShares(out, est.T, theoryUnits.map((u) => u.id), theoryUnits.map((u) => u.textLength));
  }
  if (est.I) {
    if (implementUnits.length === 0) fold(est.I);
    else addShares(out, est.I, implementUnits.map((u) => u.id), implementUnits.map((u) => u.textLength));
  }
  if (est.P) {
    const warm = frontmatter.warmup ? Math.min(10, est.P) : 0;
    if (warm) out[DERIVED_UNITS.warmUp] = warm;
    const weights = [...guidedUnits.map(() => 1), frontmatter.problems.length];
    if (weights.reduce((a, b) => a + b, 0) === 0) {
      if (est.P - warm > 0) out[DERIVED_UNITS.practice] = (out[DERIVED_UNITS.practice] ?? 0) + (est.P - warm);
    } else {
      addShares(out, est.P - warm, [...guidedUnits.map((u) => u.id), DERIVED_UNITS.practice], weights);
    }
  }
  if (est.R) out[DERIVED_UNITS.review] = est.R;
  if (est.N) addShares(out, est.N, [DERIVED_UNITS.summary, DERIVED_UNITS.revision, DERIVED_UNITS.selfCheck], [1, 1, 1]);
  if (est.Mock) {
    if (frontmatter.mock) out[DERIVED_UNITS.mock] = est.Mock;
    else fold(est.Mock);
  }
  if (est.Repair) fold(est.Repair);
  if (est.drill) {
    const unit = byTitleWord(/drill/i);
    if (unit) out[unit.id] = (out[unit.id] ?? 0) + est.drill;
    else fold(est.drill);
  }
  if (est.verbal) {
    const unit = byTitleWord(/explanation/i);
    if (unit) out[unit.id] = (out[unit.id] ?? 0) + est.verbal;
    else fold(est.verbal);
  }
  return out;
}

/** The minutes rule of a checkpoint page (plan 5.3): the attempt letters (test, Mock, P) are the attempt's
 * minutes, R with N is the phase after the attempt. The body's drill and mock units carry the attempt when
 * they exist; an assessment checkpoint's attempt is the page's own card, and a drill checkpoint's after
 * phase has no body units, so the derived ids receive what is left. */
export function checkpointUnitMinutes(frontmatter: CheckpointFrontmatter, body: string): Record<string, number> {
  const est = frontmatter.estimate;
  const attempt = (est.test ?? 0) + (est.Mock ?? 0) + (est.P ?? 0);
  const after = (est.R ?? 0) + (est.N ?? 0);
  const out: Record<string, number> = {};
  let hasAttemptUnit = false;
  let hasAfterUnit = false;
  for (const unit of surveyUnits(body)) {
    if (unit.kind === 'drill' || unit.kind === 'mock') {
      hasAttemptUnit = true;
      if (attempt > 0) out[unit.id] = attempt;
    } else if (unit.kind === 'after') {
      hasAfterUnit = true;
      if (after > 0) out[unit.id] = after;
    }
  }
  if (attempt > 0 && !hasAttemptUnit) out[CHECKPOINT_UNITS.attempt] = attempt;
  if (after > 0 && !hasAfterUnit) out[CHECKPOINT_UNITS.after] = after;
  return out;
}
