// Drives every exercise on the given lesson pages in a real browser:
// 1) a wrong answer must produce "not yet" feedback and leave the exercise unsolved,
// 2) the reference answer must produce success feedback,
// 3) state must survive a reload (browser storage).
// Usage: node tests/ui-exercises.mjs w2d1 w2d2 ...   (or "all")
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const file = 'file://' + path.resolve('dist/dsa-pattern-lab.html');
const EX = JSON.parse(fs.readFileSync('dist/exercises.json', 'utf8'));
const COURSE = JSON.parse(fs.readFileSync('dist/course.json', 'utf8'));
let ids = process.argv.slice(2);
if (!ids.length || ids[0] === 'all') ids = [...new Set(EX.map((e) => e.lesson))];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const page = await ctx.newPage(); page.setDefaultTimeout(6000);
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) errs.push('console: ' + m.text()); });
let pass = 0, fail = 0; const failures = [];
const ok = (cond, msg) => { if (cond) pass++; else { fail++; failures.push(msg); } };

async function fb(box) { const f = box.locator('.ex-body > .stack > .fb').last(); return (await f.count()) ? { cls: await f.getAttribute('class'), text: (await f.innerText()).slice(0, 160) } : { cls: '', text: '' }; }
const click = async (box, name) => box.locator('.ex-actions button', { hasText: name }).first().click();

async function answer(ex, box, right) {
  const t = ex.type;
  const statusBefore = await box.locator('.ex-head .status').textContent();
  if (t === 'mcq' || t === 'pattern' || t === 'recall') {
    const opts = box.locator('.opt');
    const okIdx = ex.options.map((o, i) => (o.ok ? i : -1)).filter((i) => i >= 0);
    const wrongIdx = ex.options.findIndex((o) => !o.ok);
    if (right) { for (const i of okIdx) await opts.nth(i).click(); }
    else { if (wrongIdx < 0) return false; await opts.nth(wrongIdx).click(); }
    await click(box, 'Check');
  } else if (t === 'complexity') {
    for (let k = 0; k < ex.fields.length; k++) {
      const f = ex.fields[k]; const ans = Array.isArray(f.answer) ? f.answer[0] : f.answer;
      const opts = f.options || ['O(1)', 'O(log n)', 'O(√n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)', 'O(2ⁿ)', 'O(n!)'];
      const wrong = opts.find((o) => !(Array.isArray(f.answer) ? f.answer : [f.answer]).includes(o));
      await box.locator('select').nth(k).selectOption(right ? ans : wrong);
    }
    await click(box, 'Check');
  } else if (t === 'predict') {
    const a = Array.isArray(ex.answer) ? ex.answer[0] : ex.answer;
    await box.locator('.ex-input').fill(right ? String(a) : String(a) + 'x9');
    await click(box, 'Check');
  } else if (t === 'bug') {
    const lines = box.locator('.codepick button');
    const n = await lines.count();
    let idx = ex.bug[0];
    if (!right) { idx = [...Array(n).keys()].find((i) => !ex.bug.includes(i)); }
    await lines.nth(idx).click();
    await click(box, 'Check');
  } else if (t === 'fill') {
    for (let k = 0; k < ex.blanks.length; k++) await box.locator('.fillcode input').nth(k).fill(right ? ex.blanks[k].accept[0] : 'zz_' + k);
    await click(box, 'Check');
  } else if (t === 'trace') {
    for (let k = 0; k < ex.rows.length; k++) { const a = ex.rows[k].answer; await box.locator('.tracegrid input').nth(k).fill(right ? String(Array.isArray(a) ? a[0] : a) : 'nope'); }
    await click(box, 'Check');
  } else if (t === 'code' || (t === 'interview' && ex.fn)) {
    await box.locator('textarea.editor').fill(right ? ex.solution : (ex.starter || 'function x(){}'));
    await click(box, 'Submit');
  } else if (t === 'interview') {
    return null; // written-only interview: checked separately
  }
  await page.waitForFunction(([el, before]) => el.querySelector('.ex-head .status').textContent !== before, [await box.elementHandle(), statusBefore], { timeout: 10000 }).catch(() => {});
  return true;
}

for (const id of ids) {
  await page.goto(file + '#' + id);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload();
  await page.waitForTimeout(250);
  const exs = EX.filter((e) => e.lesson === id);
  for (const ex of exs) {
    const box = page.locator(`[data-ex="${ex.id}"]`).first();
    if (!(await box.count())) { ok(false, `${ex.id}: not rendered on #${id}`); continue; }
    await box.scrollIntoViewIfNeeded();
    // written interview: compare-with-model needs text first
    if (ex.type === 'interview') {
      const ta = box.locator('.steps-ivw textarea').first();
      await box.locator('.steps-ivw button', { hasText: 'Compare' }).first().click();
      ok(await box.locator('.steps-ivw .fb.info').first().isHidden(), `${ex.id}: model answer shown before writing`);
      await ta.fill('my approach');
      await box.locator('.steps-ivw button', { hasText: 'Compare' }).first().click();
      ok(await box.locator('.steps-ivw .fb.info').first().isVisible(), `${ex.id}: model answer not shown after writing`);
      if (!ex.fn) continue;
    }
    try {
    const r1 = await answer(ex, box, false);
    if (r1) {
      const f = await fb(box);
      ok(/\bbad\b|\binfo\b/.test(f.cls) && !/\bok\b/.test(f.cls), `${ex.id} (${ex.type}): wrong answer gave "${f.cls}" ${f.text}`);
      ok(!(await box.getAttribute('class')).includes('right'), `${ex.id}: marked solved after a wrong answer`);
    }
    if (ex.hints && ex.hints.length) {
      await click(box, 'Hint');
      ok(await box.locator('.hintbox .fb.hint').count() === 1, `${ex.id}: hint did not appear`);
    }
    await click(box, 'Reset');
    const r2 = await answer(ex, box, true);
    if (r2) {
      const f = await fb(box);
      ok(/\bok\b/.test(f.cls), `${ex.id} (${ex.type}): reference answer gave "${f.cls}" ${f.text}`);
      ok((await box.getAttribute('class')).includes('right'), `${ex.id}: not marked solved after the right answer`);
    }
    } catch (e) { ok(false, `${ex.id}: test error ${e.message.split('\n')[0]}`); }
  }
  // persistence: solved state survives a reload
  await page.reload(); await page.waitForTimeout(250);
  const solvedAfter = await page.evaluate(() => [...document.querySelectorAll('section.ex.right')].length);
  const expectSolved = exs.filter((e) => !(e.type === 'interview' && !e.fn)).length;
  ok(solvedAfter === expectSolved, `${id}: ${solvedAfter} solved after reload, expected ${expectSolved}`);
  // every visualizer steps to the end without a render error
  const vizCount = await page.locator('section.viz').count();
  for (let v = 0; v < vizCount; v++) {
    const viz = page.locator('section.viz').nth(v);
    const total = Number((await viz.locator('.count').innerText()).split('/')[1]);
    await viz.locator('input[type=range]').evaluate((el, n) => { el.value = n; el.dispatchEvent(new Event('input')); }, total - 1);
    ok(!(await viz.locator('.viz-stage .fb.bad').count()), `${id}: visualizer ${v} render error at last step`);
    const presets = viz.locator('.viz-inputs select').last();
    if (await presets.count()) {
      const n = await presets.locator('option').count();
      for (let p = 1; p < n; p++) {
        await presets.selectOption({ index: p });
        ok(await viz.locator('.viz-inputs .err').isHidden(), `${id}: visualizer ${v} preset ${p} rejected: ${await viz.locator('.viz-inputs .err').innerText()}`);
        const tot = Number((await viz.locator('.count').innerText()).split('/')[1]);
        for (const k of [Math.floor(tot / 2), tot - 1]) {
          await viz.locator('input[type=range]').evaluate((el, n) => { el.value = n; el.dispatchEvent(new Event('input')); }, k);
          ok(!(await viz.locator('.viz-stage .fb.bad').count()), `${id}: visualizer ${v} preset ${p} render error at step ${k}`);
        }
      }
    }
  }
  console.log(`${id}: ${exs.length} exercises, ${vizCount} visualizers checked`);
}
console.log(`\n${pass} checks passed, ${fail} failed`);
failures.slice(0, 60).forEach((f) => console.log(' ✗ ' + f));
if (errs.length) { console.log('\nPage errors:'); [...new Set(errs)].slice(0, 30).forEach((e) => console.log(' ' + e)); }
await browser.close();
process.exit(fail || errs.length ? 1 : 0);
