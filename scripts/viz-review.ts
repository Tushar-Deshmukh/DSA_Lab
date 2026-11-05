// The Phase 3 screenshot review (plan 7.1): every visualizer as the legacy app drew it, next to the port, at the same
// step. Writes .viz-review/legacy/<id>.png and .viz-review/index.html.
//
//   npm run legacy:test -- --only=none --keep              builds the legacy app and prints its working copy
//   npx playwright test tests/e2e/viz-visual.spec.ts --project=chromium      the port's screenshots
//   npx tsx scripts/viz-review.ts <working copy>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { VIZ_CATALOG } from '../lib/viz/registry';
import { ROOT } from './import/paths';

const OUT = path.join(ROOT, '.viz-review');

async function legacyShots(work: string): Promise<Set<string>> {
  const course = JSON.parse(fs.readFileSync(path.join(work, 'dist', 'course.json'), 'utf8')) as {
    lessons: Record<string, unknown>;
    weeks: { n: number }[];
  };
  const routes = [
    'overview',
    'home',
    ...Object.keys(course.lessons),
    ...course.weeks.map((w) => `week-${w.n}`),
  ];
  const page = await (await chromium.launch()).newPage({ viewport: { width: 1280, height: 900 } });
  // The legacy app asks Google for fonts; the review needs no network.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const url = pathToFileURL(path.join(work, 'dist', 'dsa-pattern-lab.html')).href;
  const done = new Set<string>();
  fs.mkdirSync(path.join(OUT, 'legacy'), { recursive: true });
  for (const route of routes) {
    await page.goto(`${url}#${route}`);
    await page.waitForTimeout(300);
    const sections = page.locator('section.viz');
    for (let i = 0; i < (await sections.count()); i++) {
      const v = sections.nth(i);
      const id = await v.getAttribute('data-viz');
      if (!id || done.has(id)) continue;
      const total = Number((await v.locator('.count').innerText()).split('/')[1]);
      await v.locator('input[type=range]').evaluate(
        (el, k) => {
          (el as HTMLInputElement).value = String(k);
          el.dispatchEvent(new Event('input'));
        },
        Math.floor((total - 1) * 0.5),
      );
      await v.screenshot({ path: path.join(OUT, 'legacy', `${id}.png`) });
      done.add(id);
    }
  }
  await page.context().browser()?.close();
  return done;
}

function sheet(legacy: Set<string>): string {
  const rows = VIZ_CATALOG.map(({ id, title, module }) => {
    const port = fs.existsSync(path.join(OUT, 'port', `${id}.png`));
    const cell = (dir: string, ok: boolean) =>
      ok
        ? `<img src="${dir}/${id}.png" alt="${dir} ${id}" loading="lazy">`
        : `<p class="missing">no ${dir} screenshot</p>`;
    return `<section id="${id}"><h2>${id}</h2><p>${title} · ${module}</p><div class="pair"><figure><figcaption>Legacy</figcaption>${cell('legacy', legacy.has(id))}</figure><figure><figcaption>Port</figcaption>${cell('port', port)}</figure></div></section>`;
  });
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Visualizer review</title>
<style>body{font:14px system-ui,sans-serif;margin:16px;background:#fafafa}section{margin:24px 0;border-top:1px solid #ccc}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}img{max-width:100%;border:1px solid #ddd;background:#fff}
.missing{color:#b00}h2{font-size:16px;margin:12px 0 0}</style>
<h1>Visualizer review: legacy and port at the middle step</h1><p>${VIZ_CATALOG.length} visualizers. Same default input on both sides, except where a lesson embeds the legacy one with its own input.</p>
${rows.join('\n')}</html>`;
}

async function main(): Promise<void> {
  const work = process.argv[2];
  if (!work || !fs.existsSync(path.join(work, 'dist', 'dsa-pattern-lab.html'))) {
    console.error('Give the legacy working copy: run `npm run legacy:test -- --only=none --keep` first.');
    process.exit(1);
  }
  const legacy = await legacyShots(work);
  fs.writeFileSync(path.join(OUT, 'index.html'), sheet(legacy));
  console.log(`${legacy.size} legacy screenshots; sheet at ${path.join(OUT, 'index.html')}`);
}

void main();
