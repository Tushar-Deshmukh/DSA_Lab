// Prints dist/print.html to dist/dsa-pattern-lab-companion.pdf in two passes.
// Pass 1 prints, then pdftotext finds the page of each hidden TOC marker; pass 2 prints again
// with those page numbers filled in, and the markers are re-checked so the numbers are verified.
// Run: node tools/build.mjs && node tools/pdf.mjs
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = 'file://' + path.join(ROOT, 'dist/print.html');
const out = path.join(ROOT, 'dist/dsa-pattern-lab-companion.pdf');
const tmp = path.join(ROOT, 'dist/.pass1.pdf');

const pdfOpts = {
  format: 'A4', printBackground: true, outline: true, tagged: true,
  margin: { top: '16mm', bottom: '18mm', left: '15mm', right: '15mm' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: '<div style="font-family:Helvetica,Arial,sans-serif;font-size:8px;color:#777;width:100%;padding:0 15mm;display:flex;justify-content:space-between"><span>DSA Pattern Lab · PDF companion</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
};

async function render(pages) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (pages) await page.addInitScript((p) => { window.TOC_PAGES = p; }, pages);
  await page.goto(src, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.PRINT_READY === true, null, { timeout: 120000 });
  const toc = await page.evaluate(() => window.PRINT_TOC);
  await page.emulateMedia({ media: 'print' });
  const file = pages ? out : tmp;
  await page.pdf({ path: file, ...pdfOpts });
  await browser.close();
  return { toc, errs, file };
}
function locate(file, toc) {
  const text = execFileSync('pdftotext', ['-enc', 'UTF-8', file, '-'], { maxBuffer: 1 << 28 }).toString('utf8');
  const pages = text.split('\f'); const found = {};
  pages.forEach((t, i) => { for (const m of t.matchAll(/⟦(t\d+)⟧/g)) if (!(m[1] in found)) found[m[1]] = i + 1; });
  const missing = toc.filter((t) => !(t.id in found)).map((t) => t.text);
  return { found, missing, total: pages.length - (pages[pages.length - 1].trim() ? 0 : 1) };
}

const p1 = await render(null);
const l1 = locate(p1.file, p1.toc);
console.log(`pass 1: ${l1.total} pages, ${p1.toc.length} TOC entries, ${l1.missing.length} not located`);
const p2 = await render(l1.found);
const l2 = locate(p2.file, p2.toc);
const moved = p2.toc.filter((t) => l1.found[t.id] !== l2.found[t.id]).map((t) => t.text);
fs.rmSync(tmp, { force: true });
try { execFileSync('qpdf', ['--object-streams=generate', '--recompress-flate', '--compression-level=9', out, out + '.z']); fs.renameSync(out + '.z', out); } catch (e) { console.log('qpdf not available: PDF left uncompressed'); }
console.log(`pass 2: ${l2.total} pages; TOC page numbers ${moved.length ? 'CHANGED for ' + moved.length + ' entries: ' + moved.slice(0, 5).join('; ') : 'verified (unchanged between passes)'}`);
if (l2.missing.length) console.log('not located:', l2.missing.slice(0, 10).join('; '));
console.log(p1.errs.length + p2.errs.length ? 'page errors:\n' + [...new Set([...p1.errs, ...p2.errs])].slice(0, 20).join('\n') : 'no page errors');
console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + ' KB');
