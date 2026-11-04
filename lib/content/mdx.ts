// The MDX rules of D-008: only registered components, only literal props, no `import`, `export` or expressions.
// Also the shared parse used to read the text and references out of a page. Build time and scripts only.
import type { Root, RootContent } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { codeComments } from './exercise-text';

interface ComponentRule {
  required: string[];
  optional?: string[];
  children?: boolean;
}

export const MDX_COMPONENTS: Record<string, ComponentRule> = {
  Unit: { required: ['id', 'kind', 'title'], optional: ['core', 'phase'], children: true },
  Include: { required: ['id'] },
  Viz: { required: ['id'], optional: ['title', 'input'] },
  Exercise: { required: ['id'] },
  Callout: { required: ['kind'], optional: ['title'], children: true },
  Stages: { required: ['title'], children: true },
  Stage: { required: ['name', 'label'], children: true },
  AnnotatedCode: { required: ['id'] },
  Problem: { required: ['num'] },
  PatternLink: { required: ['slug'] },
  LessonLink: { required: ['slug'] },
  Term: { required: ['id'] },
  /** Reserved text a page may show only after the learner has done something (D-012, rule 4). */
  Gated: { required: ['id'] },
};

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMdx);

/** Parsing every page is the slow part of a check, and the result depends on the text alone. */
const inspected = new Map<string, MdxFacts>();

export const parseMdx = (body: string): Root => parser.parse(body);

/** A props value is literal when it holds only literals, arrays and plain objects. */
function isLiteralEstree(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const n = node as Record<string, unknown>;
  switch (n.type) {
    case 'Literal':
      return true;
    case 'UnaryExpression':
      return n.operator === '-' && (n.argument as { type?: string })?.type === 'Literal';
    case 'ArrayExpression':
      return (n.elements as unknown[]).every(isLiteralEstree);
    case 'ObjectExpression':
      return (n.properties as Record<string, unknown>[]).every(
        (p) =>
          p.type === 'Property' &&
          !p.computed &&
          !p.method &&
          !p.shorthand &&
          ((p.key as { type?: string }).type === 'Literal' || (p.key as { type?: string }).type === 'Identifier') &&
          isLiteralEstree(p.value),
      );
    default:
      return false;
  }
}

export interface MdxAttributes {
  [name: string]: unknown;
}

interface JsxNode {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement';
  name: string | null;
  attributes: {
    type: string;
    name?: string;
    value?: string | { value: string; data?: { estree?: { body: { expression: unknown }[] } } } | null;
  }[];
  children: unknown[];
}

const isJsx = (node: { type: string }): boolean => node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';

/** Reads a literal estree into a value. Call after `isLiteralEstree`. */
function estreeValue(node: unknown): unknown {
  const n = node as Record<string, unknown>;
  switch (n.type) {
    case 'Literal':
      return n.value;
    case 'UnaryExpression':
      return -(estreeValue(n.argument) as number);
    case 'ArrayExpression':
      return (n.elements as unknown[]).map(estreeValue);
    default:
      return Object.fromEntries(
        (n.properties as { key: Record<string, unknown>; value: unknown }[]).map((p) => [
          (p.key.type === 'Identifier' ? p.key.name : p.key.value) as string,
          estreeValue(p.value),
        ]),
      );
  }
}

export interface ComponentUse {
  name: string;
  props: MdxAttributes;
}

export interface MdxFacts {
  /** Rule violations: a non-empty list fails content:check. */
  problems: string[];
  /** Every component used, with its literal props, in document order. */
  components: ComponentUse[];
  /** Text a learner reads: paragraphs, headings, table cells, string props and comments in code. */
  text: string[];
  /** Link targets. The reserved-problem check reads them; they are not wording, so the date check does not. */
  urls: string[];
}

/** Text of a block with inline code left out, so that wording in prose is matched across emphasis and links. */
function inlineText(node: RootContent | { type: string; value?: string; children?: unknown[] }): string {
  const n = node as { type: string; value?: string; children?: (typeof node)[] };
  if (n.type === 'text') return n.value ?? '';
  if (n.type === 'inlineCode') return ' ⟦code⟧ ';
  if (isJsx(n)) return ' ';
  return (n.children ?? []).map(inlineText).join('');
}

/** Checks one MDX body against the rules of D-008, and reads out what later checks need. */
export function inspectMdx(body: string): MdxFacts {
  const cached = inspected.get(body);
  if (cached) return cached;
  const facts = inspectUncached(body);
  inspected.set(body, facts);
  return facts;
}

function inspectUncached(body: string): MdxFacts {
  const problems: string[] = [];
  const components: ComponentUse[] = [];
  const text: string[] = [];
  const urls: string[] = [];
  let tree: Root;
  try {
    tree = parseMdx(body);
  } catch (err) {
    return { problems: [`does not parse as MDX: ${(err as Error).message}`], components, text, urls };
  }

  visit(tree, (node) => {
    const type = node.type as string;
    if (type === 'mdxjsEsm') problems.push('import or export statement');
    else if (type === 'mdxFlowExpression' || type === 'mdxTextExpression') problems.push('JavaScript expression');
    else if (type === 'html') problems.push('raw HTML');
    else if (isJsx(node)) {
      const jsx = node as unknown as JsxNode;
      const rule = jsx.name ? MDX_COMPONENTS[jsx.name] : undefined;
      if (!jsx.name || !rule) {
        problems.push(`component <${jsx.name ?? ''}> is not registered`);
        return;
      }
      const props: MdxAttributes = {};
      for (const attr of jsx.attributes) {
        if (attr.type !== 'mdxJsxAttribute' || !attr.name) {
          problems.push(`<${jsx.name}>: spread attributes are not allowed`);
          continue;
        }
        if (![...rule.required, ...(rule.optional ?? [])].includes(attr.name)) {
          problems.push(`<${jsx.name}>: unknown prop ${attr.name}`);
        }
        if (attr.value === null || attr.value === undefined) props[attr.name] = true;
        else if (typeof attr.value === 'string') {
          props[attr.name] = attr.value;
          if (attr.name === 'title' || attr.name === 'label') text.push(attr.value);
        } else {
          const expression = attr.value.data?.estree?.body[0]?.expression;
          if (!isLiteralEstree(expression)) problems.push(`<${jsx.name}>: prop ${attr.name} is not a literal`);
          else props[attr.name] = estreeValue(expression);
        }
      }
      for (const required of rule.required) {
        if (!(required in props)) problems.push(`<${jsx.name}>: missing prop ${required}`);
      }
      if (!rule.children && jsx.children.length) problems.push(`<${jsx.name}> takes no children`);
      components.push({ name: jsx.name, props });
    } else if (type === 'paragraph' || type === 'heading' || type === 'tableCell') {
      const t = inlineText(node as RootContent).trim();
      if (t) text.push(t);
    } else if (type === 'link' || type === 'image') {
      urls.push((node as unknown as { url: string }).url);
    } else if (type === 'code') {
      const code = node as unknown as { lang?: string | null; value: string };
      if (code.lang === 'text') text.push(code.value);
      else text.push(...codeComments(code.value));
    }
  });
  return { problems, components, text, urls };
}
