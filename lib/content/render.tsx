import 'server-only';
// Renders one page body into the prerendered tree (plan 5.2): the markdown becomes the page's typography, and the
// registered components (D-008) become the interactive pieces. This runs at build time only — the page payload is
// lib/content/page-data.ts, and nothing reserved can reach it from here. Anything that cannot render becomes a
// visible alert rather than a silent gap.
import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { parseMdx, jsxProps } from './mdx';
import type { ContentBundle, MdxDoc } from './load';
import type { PageData } from './page-data';
import { CodeBlock } from '@/components/exercise/code-block';
import { AnnotatedCodeView } from '@/components/content/annotated-code';
import { UnitShell } from '@/components/content/unit-shell';
import { ExerciseRunner, LockedExercise } from '@/components/exercise/exercise';
import { GatedText } from '@/components/exercise/gate-text';
import { VizEmbed } from '@/components/viz/viz-embed';

/** What a page body needs alongside itself: the bundle (to resolve `<Include>`), the page's own exercise and
 * annotated data, and the facts of the problems it links. The renderer is pure: same args, same tree. */
export interface RenderArgs {
  bundle: ContentBundle;
  data: PageData;
  /** The exercise-slug prefix for the page's own exercises: `<module>/<page>`. */
  scope: string;
  /** The lesson key when the page records unit progress (lesson and checkpoint pages): each Unit's mark-done
   * control writes `lesson.unit-done` against it (plan 5.2, 10). Omitted on pages that record nothing. */
  lesson?: string;
}

export function renderBody(args: RenderArgs, body: string): ReactNode {
  const tree = parseMdx(body);
  return <>{flow(args, tree.children as unknown as AnyNode[], 0)}</>;
}

// ---- the mdast shapes this renderer reads (remark-parse + remark-mdx, validated by content:check)
interface AnyNode {
  type: string;
  value?: string;
  url?: string;
  title?: string | null;
  alt?: string;
  depth?: number;
  /** A fence's language, or null for none (none is JavaScript here, as in the legacy app). */
  lang?: string | null;
  ordered?: boolean;
  start?: number | null;
  checked?: boolean | null;
  name?: string | null;
  children?: AnyNode[];
}

/** The page's block flow, one React node per meaningful child. `depth` counts `<Include>` recursion; `inList`
 * says a `<Gated>` belongs inside a list item, so it renders as a span rather than a card. */
function flow(args: RenderArgs, nodes: AnyNode[], depth: number, inList = false): ReactNode[] {
  const out: ReactNode[] = [];
  nodes.forEach((n, i) => {
    switch (jsxNodeType(n)) {
      case 'whitespace':
        break;
      case 'flow:Unit':
        {
          const p = jsxProps(n);
          out.push(
            <UnitShell
              key={i}
              id={str(p.id)}
              kind={str(p.kind)}
              title={str(p.title)}
              phase={optStr(p.phase)}
              lesson={args.lesson}
            >
              {flow(args, n.children ?? [], depth, inList)}
            </UnitShell>,
          );
        }
        break;
      case 'flow:Include':
        out.push(includeNode(args, n, depth, i));
        break;
      case 'flow:Viz':
        {
          const p = jsxProps(n);
          out.push(
            <VizEmbed
              key={i}
              id={str(p.id)}
              title={optStr(p.title)}
              headingLevel={3}
              input={p.input as Record<string, unknown> | undefined}
            />,
          );
        }
        break;
      case 'flow:Exercise':
        out.push(exerciseNode(args, n, i));
        break;
      case 'flow:Callout':
        out.push(calloutNode(args, n, depth, inList, i));
        break;
      case 'flow:Stages':
        out.push(stagesNode(args, n, depth, inList, i));
        break;
      case 'flow:Stage':
        out.push(alertKey(i, `A Stage belongs inside Stages.`));
        break;
      case 'flow:AnnotatedCode':
        out.push(annotatedNode(args, n, i));
        break;
      case 'flow:Problem':
        out.push(problemNode(args, n, i));
        break;
      case 'flow:PatternLink':
        out.push(
          <p key={i}>
            <Link href={`/patterns/${str(jsxProps(n).slug)}`} className={LINK}>
              Pattern {str(jsxProps(n).slug)}
            </Link>
          </p>,
        );
        break;
      case 'flow:LessonLink':
        out.push(alertKey(i, `<LessonLink ${str(jsxProps(n).slug)}> has no rendering yet.`));
        break;
      case 'flow:Term':
        out.push(alertKey(i, `<Term ${str(jsxProps(n).id)}> has no rendering yet.`));
        break;
      case 'flow:Gated':
        out.push(
          <GatedText key={i} id={str(jsxProps(n).id)} gateId={args.data.gated[str(jsxProps(n).id)]} inline={inList} />,
        );
        break;
      case 'flow:jsx':
        out.push(alertKey(i, `The component <${n.name}> has no rendering.`));
        break;
      case 'inline:text':
        out.push(n.value ?? '');
        break;
      case 'paragraph':
        out.push(<p key={i}>{inline(args, n.children ?? [], depth, inList)}</p>);
        break;
      case 'heading':
        out.push(headingNode(n.depth ?? 2, i, inline(args, n.children ?? [], depth, inList)));
        break;
      case 'list': {
        const Tag = n.ordered ? 'ol' : 'ul';
        const start = typeof n.start === 'number' ? n.start : undefined;
        out.push(
          <Tag key={i} start={start} className={`pl-6 ${n.ordered ? 'list-decimal' : 'list-disc'} space-y-1.5`}>
            {(n.children ?? []).map((li, j) => (
              <li key={j}>
                {typeof li.checked === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={li.checked}
                    disabled
                    readOnly
                    aria-hidden="true"
                    className="mr-2 align-middle accent-[var(--accent)]"
                  />
                ) : null}
                {flow(args, li.children ?? [], depth, true)}
              </li>
            ))}
          </Tag>,
        );
        break;
      }
      case 'code':
        out.push(<CodeBlock key={i} code={n.value ?? ''} lang={n.lang ?? undefined} />);
        break;
      case 'table':
        out.push(tableNode(args, n, i));
        break;
      case 'blockquote':
        out.push(
          <blockquote key={i} className="border-l-4 border-rule pl-3 text-ink-2">
            {flow(args, n.children ?? [], depth, inList)}
          </blockquote>,
        );
        break;
      case 'thematicBreak':
        out.push(<hr key={i} className="border-rule-2" />);
        break;
      case 'image':
        // No page body has ever contained an image (content:check lists every one); this case exists so a
        // future one cannot silently vanish. The raw tag is deliberate: next/image is not part of a page body.
        // eslint-disable-next-line @next/next/no-img-element
        out.push(<img key={i} src={n.url ?? ''} alt={n.alt ?? ''} title={n.title ?? undefined} className="max-w-full" />);
        break;
      case 'definition':
        break;
      case 'unrenderable':
        out.push(
          alertKey(
            i,
            n.type === 'html'
              ? 'Raw HTML cannot render here.'
              : `A ${n.type} cannot appear in a page body.`,
          ),
        );
        break;
      default: {
        // Unknown components arrive namespaced (`flow:Nope`); unknown mdast shapes keep their type.
        const key = jsxNodeType(n);
        out.push(
          alertKey(
            i,
            key.startsWith('flow:') ? `The component <${key.slice(5)}> has no rendering.` : `A ${n.type} has no rendering.`,
          ),
        );
      }
    }
  });
  return out;
}

const jsxNodeType = (n: AnyNode): string => {
  if (n.type === 'mdxJsxFlowElement') return n.name ? `flow:${n.name}` : 'flow:jsx';
  if (n.type === 'text' && !(n.value ?? '').trim()) return 'whitespace';
  if (n.type === 'html' || n.type === 'mdxjsEsm' || n.type === 'mdxFlowExpression' || n.type === 'mdxTextExpression') {
    return 'unrenderable';
  }
  return n.type;
};

// ---- the pieces, one function each

function includeNode(args: RenderArgs, n: AnyNode, depth: number, i: number): ReactNode {
  const id = str(jsxProps(n).id);
  if (depth >= 3) return alertKey(i, `The include ${id} is nested too deep.`);
  const doc = includeDoc(args.bundle, id);
  if (!doc) return alertKey(i, `The include ${id} is missing from content/.`);
  return <Fragment key={i}>{flow(args, parseMdx(doc.body).children as unknown as AnyNode[], depth + 1)}</Fragment>;
}

/** An include may pull from the theory appendix, the pattern guide or the handbook, by its own id. */
function includeDoc(bundle: ContentBundle, id: string): MdxDoc<{ slug: string; title: string }> | undefined {
  return bundle.theory.get(id) ?? bundle.patterns.get(id) ?? bundle.handbook.get(id);
}

function exerciseNode(args: RenderArgs, n: AnyNode, i: number): ReactNode {
  const id = str(jsxProps(n).id);
  const gate = args.data.locked[id];
  if (gate) return <LockedExercise key={i} id={id} slug={`${args.scope}/${id}`} gateId={gate} />;
  const ex = args.data.exercises[id];
  if (!ex) return alertKey(i, `Exercise ${id} is missing from the page data.`);
  return <ExerciseRunner key={i} slug={ex.slug} type={ex.type} public={ex.public} />;
}

function annotatedNode(args: RenderArgs, n: AnyNode, i: number): ReactNode {
  const id = str(jsxProps(n).id);
  const anno = args.data.annotated[id];
  if (!anno) return alertKey(i, `The annotated block ${id} is missing from the page data.`);
  return <AnnotatedCodeView key={i} title={anno.title} code={anno.code} notes={anno.notes} />;
}

function problemNode(args: RenderArgs, n: AnyNode, i: number): ReactNode {
  const num = Number(jsxProps(n).num);
  const facts = args.data.problems[String(num)];
  if (!facts || !facts.url) return alertKey(i, `Problem ${num} is missing from the problem data.`);
  return (
    <p key={i} data-problem={num}>
      <a href={facts.url} target="_blank" rel="noopener" className={LINK}>
        {facts.num}. {facts.title}
      </a>{' '}
      <span className="font-ui text-xs text-ink-3">{facts.difficulty}</span>
    </p>
  );
}

function headingNode(depth: number, i: number, children: ReactNode): ReactNode {
  const levels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
  const Tag = levels[Math.max(0, Math.min(5, depth - 1))];
  const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm'];
  return (
    <Tag key={i} className={`font-semibold text-ink ${sizes[depth - 1] ?? 'text-base'}`}>
      {children}
    </Tag>
  );
}

function tableNode(args: RenderArgs, n: AnyNode, i: number): ReactNode {
  const [head, ...rows] = n.children ?? [];
  return (
    <div key={i} className="overflow-x-auto" data-table="">
      <table className="w-full text-sm">
        {head && (
          <thead>
            <tr className="border-b border-rule-2">
              {(head.children ?? []).map((cell, j) => (
                <th
                  key={j}
                  className="px-2.5 py-1.5 text-left font-ui text-[11px] font-bold tracking-[0.08em] text-ink-2 uppercase"
                >
                  {inline(args, cell.children ?? [], 0, false)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, k) => (
            <tr key={k} className="border-b border-rule-2 last:border-b-0">
              {(row.children ?? []).map((cell, j) => (
                <td key={j} className="px-2.5 py-1.5 align-top">
                  {inline(args, cell.children ?? [], 0, false)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function calloutNode(args: RenderArgs, n: AnyNode, depth: number, inList: boolean, i: number): ReactNode {
  const p = jsxProps(n);
  const kind = str(p.kind, 'tip');
  const rule = CALLOUTS[kind] ?? { tone: 'border-ink-3 bg-paper', accent: 'text-ink-2', title: kind };
  return (
    <aside key={i} data-callout={kind} className={`rounded-control border-l-4 px-3.5 py-2.5 ${rule.tone}`}>
      <span className={`mb-1 block font-ui text-[11px] font-bold tracking-[0.08em] uppercase ${rule.accent}`}>
        {optStr(p.title) ?? rule.title}
      </span>
      <div className="space-y-2 text-sm text-ink">{flow(args, n.children ?? [], depth, inList)}</div>
    </aside>
  );
}

const CALLOUTS: Record<string, { tone: string; accent: string; title: string }> = {
  tip: { tone: 'border-tip bg-tip-soft', accent: 'text-tip', title: 'Tip' },
  warn: { tone: 'border-warn bg-warn-soft', accent: 'text-warn', title: 'Watch out' },
  key: { tone: 'border-key bg-key-soft', accent: 'text-key', title: 'Key idea' },
  mistake: { tone: 'border-mistake bg-mistake-soft', accent: 'text-mistake', title: 'Common mistake' },
  interview: { tone: 'border-interview bg-interview-soft', accent: 'text-interview', title: 'In the interview' },
};

const STAGE_LABELS: Record<string, string> = {
  problem: 'Understand the problem',
  naive: 'Naive approach',
  insight: 'Discover the optimisation',
  dryrun: 'Visual dry run',
  code: 'JavaScript implementation',
  complexity: 'Complexity derivation',
  practice: 'Independent practice',
};

function stagesNode(args: RenderArgs, n: AnyNode, depth: number, inList: boolean, i: number): ReactNode {
  let stage = 0;
  return (
    <section key={i} data-stages="" className="overflow-hidden rounded-card border border-rule bg-sheet">
      <header className="border-b border-rule-2 px-4 py-3">
        <span className="block font-ui text-[11px] font-bold tracking-[0.08em] text-accent uppercase">
          Worked problem, step by step
        </span>
        <h3 className="mt-0.5 text-xl font-semibold text-ink">{str(jsxProps(n).title)}</h3>
      </header>
      {(n.children ?? []).map((child, j) => {
        if (jsxNodeType(child) === 'whitespace') return null;
        if (child.type === 'mdxJsxFlowElement' && child.name === 'Stage') {
          const p = jsxProps(child);
          const name = str(p.name);
          const number = ++stage;
          return (
            <div key={j} className="grid grid-cols-[2.75rem_minmax(0,1fr)] border-b border-rule-2 last:border-b-0">
              <div className="border-r border-rule-2 bg-paper pt-3 text-center font-ui font-bold text-accent tabular">
                {number}
              </div>
              <div className="min-w-0 space-y-2 px-4 py-3 text-sm">
                <h4 className="font-ui text-xs font-bold tracking-[0.08em] text-ink-3 uppercase">
                  {optStr(p.label) ?? STAGE_LABELS[name] ?? name}
                </h4>
                {flow(args, child.children ?? [], depth, inList)}
              </div>
            </div>
          );
        }
        return flow(args, [child], depth, inList);
      })}
    </section>
  );
}

// ---- inline content: what paragraphs, headings and cells read as

function inline(args: RenderArgs, nodes: AnyNode[], depth: number, inlineJsx: boolean): ReactNode[] {
  const out: ReactNode[] = [];
  nodes.forEach((n, i) => {
    switch (n.type) {
      case 'text':
        out.push(n.value ?? '');
        break;
      case 'inlineCode':
        out.push(
          <code key={i} className="font-code text-[0.9em]">
            {n.value}
          </code>,
        );
        break;
      case 'strong':
        out.push(<strong key={i}>{inline(args, n.children ?? [], depth, inlineJsx)}</strong>);
        break;
      case 'emphasis':
        out.push(<em key={i}>{inline(args, n.children ?? [], depth, inlineJsx)}</em>);
        break;
      case 'delete':
        out.push(<del key={i}>{inline(args, n.children ?? [], depth, inlineJsx)}</del>);
        break;
      case 'link':
        out.push(
          <a key={i} href={n.url} target="_blank" rel="noopener" className={LINK}>
            {inline(args, n.children ?? [], depth, inlineJsx)}
          </a>,
        );
        break;
      case 'break':
        out.push(<br key={i} />);
        break;
      case 'mdxJsxTextElement':
        out.push(textNode(args, n, i));
        break;
      default:
        out.push(<span key={i} role="alert" className={ALERT}>{`A ${n.type} has no inline rendering.`}</span>);
    }
  });
  return out;
}

/** The only inline component authors may use: `<Gated id>` inside a sentence or list item (D-027). */
function textNode(args: RenderArgs, n: AnyNode, i: number): ReactNode {
  const name = n.name ?? '';
  if (name === 'Gated') {
    const p = jsxProps(n);
    return <GatedText key={i} id={str(p.id)} gateId={args.data.gated[str(p.id)]} inline />;
  }
  return <span key={i} role="alert" className={ALERT}>{`The element <${name}> has no inline rendering.`}</span>;
}

// ---- small shared pieces

const ALERT = 'rounded-card border border-st-error/50 bg-st-error-soft px-3 py-2 text-sm text-ink';
const LINK = 'text-accent underline underline-offset-2';

function alertKey(key: number, text: string): ReactNode {
  return (
    <p key={key} role="alert" className={ALERT}>
      {text}
    </p>
  );
}

/** A literal prop arrives as a string; a missing one may fall back. Anything else is a content bug content:check
 * did not catch, and the renderer narrows it instead of trusting it. */
function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function optStr(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}
