import path from 'node:path';
import { expect, test } from '@playwright/test';
import { VIZ_CATALOG } from '@/lib/viz/registry';

// One screenshot per visualizer (plan 7.6), at the middle step as legacy/tests/vizshot.mjs took them, for the review
// sheet that scripts/viz-review.ts builds. Each also has to draw without a console error.

const OUT = path.join(process.cwd(), '.viz-review', 'port');

test.skip(({ browserName }) => browserName !== 'chromium', 'one browser makes the review sheet');
test.use({ viewport: { width: 1280, height: 900 } });

for (const { id } of VIZ_CATALOG) {
  test(`${id} draws its middle step`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/visualizers/${id}`);
    const player = page.locator(`section[data-viz="${id}"]`);
    await expect(player).toBeVisible();
    const slider = player.getByRole('slider', { name: 'Step' });
    const last = Number(await slider.getAttribute('max'));
    await slider.fill(String(Math.floor(last * 0.5)));
    await expect(slider).toHaveAttribute(
      'aria-valuetext',
      `Step ${Math.floor(last * 0.5) + 1} of ${last + 1}`,
    );
    await player.screenshot({ path: path.join(OUT, `${id}.png`), animations: 'disabled' });
    expect(errors).toEqual([]);
  });
}
