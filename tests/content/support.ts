// Shared helpers for the fidelity tests: both renderers reduced to comparable text.
import { compile, run } from '@mdx-js/mdx';
import { createElement, type ReactNode } from 'react';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import remarkGfm from 'remark-gfm';
import { Marked } from 'marked';
import type { Block } from '../../scripts/import/blocks';

const marked = new Marked({ gfm: true });

/** The legacy renderer, without its cosmetic overrides: `\~` is unescaped first, as legacy/tools/build.mjs does. */
export function legacyHtml(md: string): string {
  return marked.parse(md.replace(/\\~/g, '~'), { async: false });
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

const decode = (text: string): string =>
  text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] !== '#') return ENTITIES[code.toLowerCase()] ?? whole;
    const n = code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return String.fromCodePoint(n);
  });

/** Text a reader sees. Block ends become spaces, inline tags vanish, and runs of whitespace collapse to one space. */
export function htmlToText(html: string): string {
  const spaced = html.replace(/<\/(p|li|td|th|tr|h[1-6]|pre|div|blockquote|ul|ol|table|thead|tbody|section)>|<(br|hr|li|td|th|tr)\b[^>]*>/gi, '$& ');
  return decode(spaced.replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Code blocks, whitespace included, which `htmlToText` would blur. */
export function htmlCodeBlocks(html: string): string[] {
  return [...html.matchAll(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)].map((m) =>
    decode((m[1] as string).replace(/<[^>]+>/g, '')).replace(/\n$/, ''),
  );
}

interface StubProps {
  id?: string;
  kind?: string;
  title?: string;
  phase?: string;
  name?: string;
  label?: string;
  input?: unknown;
  children?: ReactNode;
}

const marker = (text: string, children?: ReactNode) =>
  createElement('div', null, `[[${text}]] `, children ?? null, children ? ' [[/]] ' : null);

/** Stand-ins that render each component as a visible marker, so structure is compared along with the text. */
const STUBS = {
  Unit: ({ title, children }: StubProps) => marker(`unit|${title}`, children),
  Include: ({ id }: StubProps) => marker(`include|${id}`),
  Viz: ({ id, title, input }: StubProps) => marker(`viz|${id}|${title ?? ''}|${input ? JSON.stringify(input) : ''}`),
  Exercise: ({ id }: StubProps) => marker(`exercise|${id}`),
  AnnotatedCode: ({ id }: StubProps) => marker(`anno|${id}`),
  Callout: ({ kind, title, children }: StubProps) => marker(`callout|${kind}|${title ?? ''}`, children),
  Stages: ({ title, children }: StubProps) => marker(`stages|${title}`, children),
  Stage: ({ name, label, children }: StubProps) => marker(`stage|${name}|${label}`, children),
  Gated: ({ id }: StubProps) => marker(`gated|${id}`),
};

/** Compiles and renders an MDX body with the stand-in components. */
export async function renderMdx(body: string): Promise<string> {
  const code = String(await compile(body, { outputFormat: 'function-body', remarkPlugins: [remarkGfm] }));
  const { default: Content } = await run(code, { ...runtime, baseUrl: import.meta.url });
  return renderToStaticMarkup(createElement(Content, { components: STUBS }));
}

export interface LegacyRenderOptions {
  includeId: (block: Extract<Block, { t: 'pull' | 'pullSection' }>) => string;
  exerciseId: (legacyId: string) => string;
  annoId: (n: number) => string;
}

/** Renders parsed legacy blocks into the same marker form as `renderMdx`, using the legacy renderer for Markdown. */
export function renderLegacyBlocks(blocks: Block[], options: LegacyRenderOptions): string {
  let annoN = 0;
  const gate = (md: string) => md.replace(/GATED\(([a-z0-9-]+)\)/g, (_, id: string) => `[[gated|${id}]]`);
  const render = (list: Block[]): string => {
    const out: string[] = [];
    let open = false;
    for (const b of list) {
      switch (b.t) {
        case 'h':
          if (open) out.push('[[/]]');
          out.push(`<div>[[unit|${escapeHtml(b.text)}]]</div>`);
          open = true;
          break;
        case 'md':
          out.push(legacyHtml(gate(b.md)));
          break;
        case 'pull':
        case 'pullSection':
          out.push(`[[include|${options.includeId(b)}]]`);
          break;
        case 'viz':
          out.push(
            `[[viz|${b.id}|${escapeHtml(String(b.props.title ?? ''))}|${b.props.input ? JSON.stringify(b.props.input) : ''}]]`,
          );
          break;
        case 'note':
          out.push(`<div>[[callout|${b.kind}|${escapeHtml(b.title)}]]</div>`, legacyHtml(gate(b.md)), '[[/]]');
          break;
        case 'stages':
          out.push(`<div>[[stages|${escapeHtml(b.title)}]]</div>`);
          for (const s of b.stages) {
            out.push(`<div>[[stage|${s.name}|${escapeHtml(s.label)}]]</div>`, render(s.blocks), '[[/]]');
          }
          out.push('[[/]]');
          break;
        case 'ex':
          out.push(`[[exercise|${options.exerciseId(b.ex.id as string)}]]`);
          break;
        case 'anno':
          annoN++;
          out.push(`[[anno|${options.annoId(annoN)}]]`);
          break;
      }
    }
    if (open) out.push('[[/]]');
    return out.join('\n');
  };
  return render(blocks);
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
