// Open the shipped legacy HTML and capture what it looks like (read-only).
import { createRequire } from 'node:module'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const ROOT = process.argv[2], OUT = process.argv[3];
const { chromium } = createRequire(path.join(ROOT, 'x.js'))('playwright');
const file = pathToFileURL(path.join('C:/DSA/dsa-pattern-lab', 'dsa-pattern-lab.html')).href;
const b = await chromium.launch(); const errs = [];
for (const [name, hash, w, h] of [['home', 'home', 1280, 900], ['lesson', 'w2d1', 1280, 900], ['viz', 'w2d1', 1280, 900], ['phone', 'w2d1', 375, 800], ['problems', 'problems', 1280, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => errs.push(name + ': ' + e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto(file + '#' + hash); await p.waitForTimeout(400);
  if (name === 'viz') { const v = p.locator('section.viz').first(); await v.scrollIntoViewIfNeeded(); await v.locator('input[type=range]').evaluate((el) => { el.value = 3; el.dispatchEvent(new Event('input')); }); await v.screenshot({ path: `${OUT}/legacy-${name}.png` }); }
  else await p.screenshot({ path: `${OUT}/legacy-${name}.png` });
  await p.close();
}
console.log('page errors:', errs.length ? errs : 'none'); await b.close();
