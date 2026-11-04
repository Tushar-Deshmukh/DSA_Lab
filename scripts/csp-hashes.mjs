// Post-build step (decision D-006). Gives every prerendered page a <meta> Content Security Policy listing the
// SHA-256 of exactly that page's inline scripts. The header policy keeps 'unsafe-inline' only as a floor; browsers
// enforce both policies, so injected scripts and inline event handlers are blocked while Next's own run.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const INLINE_SCRIPT = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
const EXISTING_META = /<meta http-equiv="Content-Security-Policy"[^>]*>/gi;

/** Distinct CSP source expressions for the inline scripts in `html`. */
export function scriptHashes(html) {
  const hashes = [...html.matchAll(INLINE_SCRIPT)].map(
    (m) => `'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`,
  );
  return [...new Set(hashes)];
}

/** Returns the page with exactly one meta policy, placed before any script. Safe to run twice. */
export function addScriptHashes(html) {
  const page = html.replace(EXISTING_META, '');
  const hashes = scriptHashes(page);
  const meta = `<meta http-equiv="Content-Security-Policy" content="${['script-src', "'self'", ...hashes].join(' ')}"/>`;
  const head = /<head\b[^>]*>/i.exec(page);
  if (!head) throw new Error('page has no <head>');
  let at = head.index + head[0].length;
  const charset = /^\s*<meta charSet="utf-8"\s*\/?>/i.exec(page.slice(at));
  if (charset) at += charset[0].length;
  const firstScript = page.search(/<script\b/i);
  if (firstScript !== -1 && firstScript < at)
    throw new Error('a script comes before the place for the policy');
  return { html: page.slice(0, at) + meta + page.slice(at), hashes: hashes.length };
}

function htmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(p);
    return e.name.endsWith('.html') ? [p] : [];
  });
}

export function processBuild(serverDir) {
  const files = htmlFiles(serverDir);
  if (files.length === 0) throw new Error(`no prerendered pages under ${serverDir}; run next build first`);
  let maxHashes = 0;
  for (const file of files) {
    const out = addScriptHashes(fs.readFileSync(file, 'utf8'));
    fs.writeFileSync(file, out.html);
    maxHashes = Math.max(maxHashes, out.hashes);
  }
  return { pages: files.length, maxHashes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { pages, maxHashes } = processBuild(path.join(root, '.next', 'server'));
  console.log(
    `csp-hashes: ${pages} prerendered pages now carry a script-hash policy (at most ${maxHashes} hashes)`,
  );
}
