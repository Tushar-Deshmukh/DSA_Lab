import { expect, test, type Page } from '@playwright/test';
import { appReady } from './support';

// JavaScript budget per route type (plan §3.5), measured as gzip bytes over the network. Phase 1 baseline: the
// shell loads about 165 KB; the budget leaves room for the command palette's idle prefetch (about 19 KB) and
// small growth, and fails on regressions such as a validation library or an auth client leaking into every page.
const SHELL_BUDGET_KB = 200;
// A playground adds the player and one visualizer's own chunk to the shell (Phase 3). The budget keeps the player
// lean and catches visualizers that stop being separate chunks.
const PLAYGROUND_BUDGET_KB = 240;

test.skip(({ browserName }) => browserName !== 'chromium', 'transfer sizes are measured in Chromium');

async function scriptKb(page: Page): Promise<number> {
  return page.evaluate(() => {
    const scripts = performance
      .getEntriesByType('resource')
      .filter((e) => (e as PerformanceResourceTiming).initiatorType === 'script' || e.name.endsWith('.js'));
    return scripts.reduce((sum, e) => sum + (e as PerformanceResourceTiming).transferSize, 0) / 1024;
  });
}

for (const route of ['/', '/sign-in', '/settings', '/learn', '/visualizers']) {
  test(`${route} stays within the ${SHELL_BUDGET_KB} KB JavaScript budget`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'load' });
    await appReady(page);
    const kb = await scriptKb(page);
    console.log(`${route}: ${kb.toFixed(1)} KB of JavaScript`);
    expect(kb).toBeGreaterThan(0);
    expect(kb).toBeLessThanOrEqual(SHELL_BUDGET_KB);
  });
}

for (const id of ['two-sum-sorted', 'dijkstra', 'tree-construct']) {
  test(`the ${id} playground stays within the ${PLAYGROUND_BUDGET_KB} KB budget, with one visualizer chunk`, async ({
    page,
  }) => {
    await page.goto(`/visualizers/${id}`, { waitUntil: 'load' });
    await appReady(page);
    await expect(page.locator(`section[data-viz="${id}"]`)).toBeVisible();
    const kb = await scriptKb(page);
    console.log(`/visualizers/${id}: ${kb.toFixed(1)} KB of JavaScript`);
    expect(kb).toBeLessThanOrEqual(PLAYGROUND_BUDGET_KB);
  });
}
