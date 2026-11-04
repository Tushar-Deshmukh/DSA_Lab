// Quick smoke run: open pages, collect console errors, take screenshots.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import path from 'node:path';
const file = 'file://' + path.resolve('dist/dsa-pattern-lab.html');
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['home'];
const out = process.env.SHOTS || '/tmp/claude-0/-home-claude/d1b6916f-dfcb-5720-8f61-9f8c7cdf6d38/scratchpad/shots';
const fs = await import('node:fs'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const width = Number(process.env.W || 1280);
const ctx = await browser.newContext({ viewport: { width, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
for (const p of pages) {
  await page.goto(file + '#' + p);
  await page.waitForTimeout(400);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const h = await page.evaluate(() => document.body.scrollHeight);
  console.log(p, 'height', h, 'overflowX', ov);
  await page.screenshot({ path: `${out}/${p}-${width}.png`, fullPage: !!process.env.FULL });
}
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors');
await browser.close();
