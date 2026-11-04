import { expect, test } from '@playwright/test';
import { appReady } from './support';

// JavaScript budget per route type (plan §3.5), measured as gzip bytes over the network. Phase 1 baseline: the
// shell loads about 165 KB; the budget leaves room for the command palette's idle prefetch (about 19 KB) and
// small growth, and fails on regressions such as a validation library or an auth client leaking into every page.
const SHELL_BUDGET_KB = 200;

test.skip(({ browserName }) => browserName !== 'chromium', 'transfer sizes are measured in Chromium');

for (const route of ['/', '/sign-in', '/settings', '/learn']) {
  test(`${route} stays within the ${SHELL_BUDGET_KB} KB JavaScript budget`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'load' });
    await appReady(page);
    const kb = await page.evaluate(() => {
      const scripts = performance
        .getEntriesByType('resource')
        .filter((e) => (e as PerformanceResourceTiming).initiatorType === 'script' || e.name.endsWith('.js'));
      return scripts.reduce((sum, e) => sum + (e as PerformanceResourceTiming).transferSize, 0) / 1024;
    });
    console.log(`${route}: ${kb.toFixed(1)} KB of JavaScript`);
    expect(kb).toBeGreaterThan(0);
    expect(kb).toBeLessThanOrEqual(SHELL_BUDGET_KB);
  });
}
