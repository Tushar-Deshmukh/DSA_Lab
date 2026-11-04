// Makes legacy Markdown safe to compile as MDX without changing what it renders to, or any other byte of the source.
//
// MDX reads `{` as the start of a JavaScript expression and `<` as the start of a tag, and `{3:0}` compiles and quietly
// evaluates, so a compile pass alone would not notice. Only characters inside Markdown text nodes need a backslash;
// code spans and code blocks must stay untouched, which is why this walks the syntax tree instead of using a regex.
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

const parser = unified().use(remarkParse).use(remarkGfm);

export function escapeForMdx(md: string): string {
  const tree = parser.parse(md);
  const inserts: number[] = [];
  visit(tree, (node) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) return;
    if (node.type === 'html') throw new Error(`raw HTML is not allowed in MDX: ${md.slice(start, end)}`);
    if (node.type === 'code' && !md.slice(start, end).startsWith('```')) {
      // MDX has no indented code blocks: this would silently become a paragraph.
      throw new Error(`indented code block: ${md.slice(start, end).slice(0, 80)}`);
    }
    if (node.type === 'link' && md[start] === '<') throw new Error(`autolink: ${md.slice(start, end)}`);
    if (node.type !== 'text') return;
    for (let i = start; i < end; i++) {
      const c = md[i];
      if (c !== '{' && c !== '}' && c !== '<') continue;
      let backslashes = 0;
      for (let j = i - 1; j >= start && md[j] === '\\'; j--) backslashes++;
      if (backslashes % 2 === 0) inserts.push(i);
    }
  });
  let out = md;
  for (const at of inserts.sort((a, b) => b - a)) out = out.slice(0, at) + '\\' + out.slice(at);
  return out;
}

/** A JSX attribute string: quotes, ampersands and angle brackets become character references. */
export function jsxAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
