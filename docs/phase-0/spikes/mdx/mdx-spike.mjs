// Spike: can every line of legacy prose compile as MDX, and does MDX render the same text as the legacy Markdown renderer?
// Same input goes to marked 15.0.12 (legacy) and @mdx-js/mdx 3.1.1 + remark-gfm. Compares plain text per heading-delimited chunk.
import fs from 'node:fs'; import path from 'node:path';
import { compile, run } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { marked } from 'marked';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

const ROOT = process.argv[2];
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const files = ['source/roadmap.md', ...fs.readdirSync(path.join(ROOT, 'content')).filter((f) => f.endsWith('.md')).sort().map((f) => 'content/' + f)];

// Drop ```ex and ```anno YAML fences (they become YAML, not MDX). Keep every other fence.
function dropYamlFences(text) {
  const out = []; let skip = false;
  for (const l of text.split('\n')) {
    if (!skip && /^```(ex|anno)\s*$/.test(l)) { skip = true; continue; }
    if (skip) { if (/^```\s*$/.test(l)) skip = false; continue; }
    out.push(l);
  }
  return out.join('\n');
}
// Escape `{`, `}` and `<` in prose only: outside fences and outside inline code spans.
function escapeProse(text) {
  let fence = false;
  return text.split('\n').map((l) => {
    if (/^\s*```/.test(l)) { fence = !fence; return l; }
    if (fence) return l;
    return l.split(/(`+[^`]*`+)/g).map((part, i) => (i % 2 ? part : part.replace(/\\?[{}<]/g, (m) => (m.length === 2 ? m : '\\' + m)))).join('');
  }).join('\n');
}
const chunksOf = (text) => { const out = []; let cur = [], fence = false; for (const l of text.split('\n')) { if (/^\s*```/.test(l)) fence = !fence; if (!fence && /^#{1,3} /.test(l) && cur.length) { out.push(cur.join('\n')); cur = []; } cur.push(l); } if (cur.length) out.push(cur.join('\n')); return out; };
const decode = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const plain = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

async function mdxHtml(src) {
  const code = String(await compile(src, { outputFormat: 'function-body', remarkPlugins: [remarkGfm] }));
  const { default: C } = await run(code, { ...runtime, baseUrl: 'file:///x.js' });
  return renderToStaticMarkup(React.createElement(C));
}

let chunks = 0, rawFail = 0, escFail = 0, textDiff = 0, tablesMdx = 0, tablesMarked = 0, codeMdx = 0, codeMarked = 0; const failures = [], diffs = []; let ms = 0;
for (const f of files) {
  const body = dropYamlFences(rd(f));
  for (const c of chunksOf(body)) {
    chunks++;
    try { await compile(c, { remarkPlugins: [remarkGfm] }); } catch { rawFail++; }
    const esc = escapeProse(c); let html;
    const t0 = performance.now();
    try { html = await mdxHtml(esc); } catch (e) { escFail++; failures.push(f + ': ' + String(e.message).slice(0, 140) + ' :: ' + c.split('\n')[0].slice(0, 70)); continue; }
    ms += performance.now() - t0;
    const ref = marked.parse(c, { async: false });
    tablesMdx += (html.match(/<table/g) || []).length; tablesMarked += (ref.match(/<table/g) || []).length;
    codeMdx += (html.match(/<pre/g) || []).length; codeMarked += (ref.match(/<pre/g) || []).length;
    const a = plain(html), b = plain(ref);
    if (a !== b) { textDiff++; let i = 0; while (i < a.length && a[i] === b[i]) i++; if (diffs.length < 40) diffs.push({ f, head: c.split('\n')[0].slice(0, 60), mdx: a.slice(Math.max(0, i - 40), i + 70), marked: b.slice(Math.max(0, i - 40), i + 70) }); }
  }
}
console.log({ files: files.length, chunks, rawCompileFailures: rawFail, compileFailuresAfterEscaping: escFail, chunksWithTextDifference: textDiff, tablesMdx, tablesMarked, preMdx: codeMdx, preMarked: codeMarked, mdxMsTotal: Math.round(ms) });
failures.slice(0, 15).forEach((x) => console.log('FAIL', x));
diffs.forEach((d) => console.log('DIFF', d.f, '|', d.head, '\n   mdx   :', d.mdx, '\n   marked:', d.marked));
