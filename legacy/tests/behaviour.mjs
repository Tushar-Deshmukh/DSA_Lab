// Behaviour checks the per-exercise UI test does not cover:
//  1. With storage blocked (localStorage throws), the site loads, exercises work, and the store chip says progress is not saved.
//  2. With storage available, journal status and the "viewing a solution is not mastery" rule persist across reloads.
//  3. Week 12 problem cards hide their pattern until attempted.
//  4. Export → erase → import restores progress.
import { createRequire } from 'node:module';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const file = 'file://' + path.resolve('dist/dsa-pattern-lab.html');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log(' x ' + m); } };
const browser = await chromium.launch();

async function open(ctxOpts = {}, init) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, ...ctxOpts });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (init) await page.addInitScript(init);
  return { ctx, page, errs };
}

// 1. storage blocked
{
  const { ctx, page, errs } = await open({}, () => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await page.goto(file + '#w1d1'); await page.waitForTimeout(500);
  ok(errs.length === 0, 'no page errors with storage blocked: ' + errs.join('; '));
  const chip = (await page.locator('.store-chip, [class*=store]').first().innerText().catch(() => '')).toLowerCase();
  ok(/not sav|memory|this tab|session/.test(chip), 'store chip warns that progress is not saved (got "' + chip + '")');
  const ex = page.locator('section.ex').first();
  await ex.locator('label, .opt').first().click().catch(() => {});
  ok((await page.locator('section.ex').count()) > 0, 'exercises render with storage blocked');
  await ctx.close();
}
// 2–3. journal persistence, Week 12 hidden pattern
{
  const { ctx, page, errs } = await open();
  await page.goto(file + '#w12d1'); await page.waitForTimeout(500);
  const card = page.locator('#w12d1-practice details.prob').first();
  await card.locator('summary').click(); await page.waitForTimeout(200);
  const body = await card.innerText();
  ok(/Reveal the pattern/.test(body) && !/Pattern:/.test(body), 'Week 12 card hides its pattern before an attempt');
  await card.locator('.statusbar button', { hasText: 'Attempted' }).click(); await page.waitForTimeout(300);
  await page.reload(); await page.waitForTimeout(500);
  const card2 = page.locator('#w12d1-practice details.prob').first();
  await card2.locator('summary').click(); await page.waitForTimeout(200);
  const body2 = await card2.innerText();
  ok(/Pattern:/.test(body2), 'Week 12 pattern shows after the problem is marked attempted (and the status survived a reload)');
  ok(/Attempted/.test(await card2.locator('summary').innerText()), 'status pill persists after reload');
  ok(errs.length === 0, 'no page errors: ' + errs.join('; '));
  // 4. export → erase → import
  await page.goto(file + '#preferences'); await page.waitForTimeout(400);
  const exportBtn = page.locator('button', { hasText: /Export|Download/ }).first();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), exportBtn.click()]);
  ok(!!dl, 'export produces a download');
  if (dl) {
    const p = await dl.path(); const fs = await import('node:fs'); const json = JSON.parse(fs.readFileSync(p, 'utf8'));
    ok(JSON.stringify(json).includes('attempted'), 'export contains the journal status');
    await page.locator('button', { hasText: 'Erase all progress…' }).click(); await page.waitForTimeout(200);
    await page.locator('button', { hasText: /^Erase all progress$/ }).click(); await page.waitForTimeout(500);
    await page.goto(file + '#w12d1'); await page.waitForTimeout(400);
    ok(!/Attempted/.test(await page.locator('#w12d1-practice details.prob').first().locator('summary').innerText()), 'erase clears the status');
    await page.goto(file + '#preferences'); await page.waitForTimeout(400);
    const input = page.locator('input[type=file]').first();
    await input.setInputFiles(p); await page.waitForTimeout(400);
    await page.locator('button', { hasText: 'Replace with backup' }).click(); await page.waitForTimeout(500);
    await page.goto(file + '#w12d1'); await page.waitForTimeout(400);
    ok(/Attempted/.test(await page.locator('#w12d1-practice details.prob').first().locator('summary').innerText()), 'import restores the status');
  }
  await ctx.close();
}

// 5. A solution viewed before solving is never shown as a clean solve
{
  const { ctx, page } = await open();
  await page.goto(file + '#w1d2'); await page.waitForTimeout(500);
  const ex = page.locator('section.ex', { has: page.locator('button', { hasText: /^Submit/ }) }).first();
  for (let k = 0; k < 4; k++) { const h = ex.locator('button', { hasText: /^Hint/ }); if (await h.count() && await h.first().isEnabled()) await h.first().click(); }
  await ex.locator('button', { hasText: 'Show answer' }).click(); await page.waitForTimeout(200);
  await ex.locator('button', { hasText: /^Submit/ }).click();
  await page.waitForFunction((el) => /viewing the answer/.test(el.querySelector('.ex-head .status')?.textContent || ''), await ex.elementHandle(), { timeout: 15000 }).catch(() => {});
  const st = await ex.locator('.ex-head .status').innerText();
  ok(/viewing the answer/.test(st), 'status after Show answer + Submit says the answer was viewed (got "' + st + '")');
  await page.goto(file + '#revision'); await page.waitForTimeout(500);
  ok(/Questions you missed/.test(await page.content()) && (await page.locator('text=/\\d+ to retry/').first().innerText()).match(/[1-9]/), 'the viewed exercise is listed under questions to retry');
  await ctx.close();
}
await browser.close();
console.log(`${pass} behaviour checks passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
