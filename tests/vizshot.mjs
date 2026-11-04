// Screenshot every visualizer on a page at a given step fraction: node tests/vizshot.mjs w1d3 0.6
import { createRequire } from 'node:module'; import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [id, frac = '0.5'] = process.argv.slice(2);
const out = '/tmp/claude-0/-home-claude/d1b6916f-dfcb-5720-8f61-9f8c7cdf6d38/scratchpad/shots';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: Number(process.env.W || 1280), height: 900 } });
await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await p.goto('file://' + path.resolve('dist/dsa-pattern-lab.html') + '#' + id); await p.waitForTimeout(300);
const n = await p.locator('section.viz').count();
for (let i = 0; i < n; i++) { const v = p.locator('section.viz').nth(i); const tot = Number((await v.locator('.count').innerText()).split('/')[1]);
  await v.locator('input[type=range]').evaluate((el, k) => { el.value = k; el.dispatchEvent(new Event('input')); }, Math.floor((tot - 1) * Number(frac)));
  await v.screenshot({ path: `${out}/viz-${id}-${i}.png` }); }
console.log(n, 'visualizers'); await b.close();
