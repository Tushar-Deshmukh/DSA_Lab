// Post-build step: give every prerendered page a meta CSP listing the SHA-256 of exactly its own inline scripts.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const root = process.argv[2] || '.next/server/app';
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []));
let pages = 0, maxHashes = 0, maxMeta = 0;
for (const f of walk(root)) {
  const html = fs.readFileSync(f, 'utf8');
  const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  const meta = `<meta http-equiv="Content-Security-Policy" content="script-src 'self' ${[...new Set(hashes)].join(' ')}"/>`;
  if (!/<head[^>]*>/.test(html)) throw new Error('no head in ' + f);
  fs.writeFileSync(f, html.replace(/<head[^>]*>/, (h) => h + meta));
  pages++; maxHashes = Math.max(maxHashes, hashes.length); maxMeta = Math.max(maxMeta, meta.length);
}
console.log(JSON.stringify({ pages, maxHashes, maxMetaBytes: maxMeta }));
