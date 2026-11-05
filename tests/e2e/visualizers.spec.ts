import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { VIZ_CATALOG } from '@/lib/viz/registry';
import { appReady } from './support';

// The gallery and the playground (plan 7.3–7.5, Phase 3 gates): filters, keyboard control, the live region, Predict,
// breakpoints, shared links, accessibility and layout.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function noViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(
    violations.map(
      (v) =>
        `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}: ${v.nodes[0]?.failureSummary?.replace(/\s+/g, ' ')}`,
    ),
  ).toEqual([]);
}

/** The playground of one visualizer, once its chunk has loaded. */
async function openPlayground(page: Page, id: string, hash = '') {
  await page.goto(`/visualizers/${id}${hash}`);
  await appReady(page);
  const player = page.locator(`section[data-viz="${id}"]`);
  await expect(player).toBeVisible();
  return player;
}

const counter = (page: Page) => page.getByRole('slider', { name: 'Step' });

test.describe('the gallery', () => {
  test('lists every visualizer and filters by module, pattern and title', async ({ page }) => {
    await page.goto('/visualizers');
    await appReady(page);
    await expect(page.getByRole('status').filter({ hasText: 'visualizers' })).toHaveText(
      `${VIZ_CATALOG.length} visualizers`,
    );
    await expect(page.locator('main li a[href^="/visualizers/"]')).toHaveCount(VIZ_CATALOG.length);

    const inModule3 = VIZ_CATALOG.filter((e) => e.module === 'binary-search-sorting').length;
    await page.getByRole('combobox', { name: 'Module' }).selectOption('binary-search-sorting');
    await expect(page.locator('main li a[href^="/visualizers/"]')).toHaveCount(inModule3);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([/Module 3/]);

    await page.getByRole('combobox', { name: 'Module' }).selectOption('');
    await page
      .getByRole('combobox', { name: 'Pattern' })
      .selectOption({ label: '2.1 Opposite-end two pointers' });
    await expect(page.getByRole('link', { name: /Two Sum II/ })).toBeVisible();
    const withPattern = await page.locator('main li a[href^="/visualizers/"]').count();
    expect(withPattern).toBeGreaterThan(0);
    expect(withPattern).toBeLessThan(VIZ_CATALOG.length);

    await page.getByRole('combobox', { name: 'Pattern' }).selectOption('');
    await page.getByRole('searchbox', { name: 'Title contains' }).fill('dijkstra');
    await expect(page.locator('main li a[href^="/visualizers/"]')).toHaveCount(
      VIZ_CATALOG.filter((e) => /dijkstra/i.test(e.title) || e.id.includes('dijkstra')).length,
    );
    await page.getByRole('searchbox', { name: 'Title contains' }).fill('no such visualizer');
    await expect(page.getByText('No visualizer matches these filters.')).toBeVisible();
  });

  test('is reachable from the keyboard: filters first, then each visualizer', async ({
    page,
    browserName,
  }) => {
    await page.goto('/visualizers');
    await appReady(page);
    await page.getByRole('combobox', { name: 'Module' }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('combobox', { name: 'Pattern' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('searchbox', { name: 'Title contains' })).toBeFocused();
    // Safari's default Tab visits form controls only, and Playwright's WebKit does the same (as in shell.spec.ts),
    // so the step to the links runs in Chromium and Firefox.
    if (browserName === 'webkit') return;
    await page.keyboard.press('Tab');
    const first = page.locator('main li a').first();
    await expect(first).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/visualizers\/[a-z0-9-]+$/);
  });

  test('moving from one playground to another shows the new visualizer', async ({ page }) => {
    await page.goto('/visualizers');
    await appReady(page);
    await page.getByRole('link', { name: /^Kadane/ }).click();
    await expect(page.locator('section[data-viz="kadane"]')).toBeVisible();
    await page.goBack();
    await page.getByRole('link', { name: /Two Sum II/ }).click();
    const player = page.locator('section[data-viz="two-sum-sorted"]');
    await expect(player).toBeVisible();
    await expect(player.getByRole('heading', { level: 1 })).toContainText('Two Sum II');
    await expect(player.getByRole('textbox', { name: 'numbers (sorted)' })).toHaveValue('1, 3, 4, 6, 8, 11');
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`axe finds nothing in the ${scheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/visualizers');
      await appReady(page);
      await noViolations(page);
    });
  }
});

test.describe('the playground', () => {
  test('steps with the buttons and the keys, and says each step in the live region', async ({ page }) => {
    const player = await openPlayground(page, 'two-sum-sorted');
    const live = player.locator('[aria-live="polite"]');
    await expect(live).toContainText('Step 1 of');
    await player.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(counter(page)).toHaveAttribute('aria-valuetext', /^Step 2 of \d+$/);
    await expect(live).toContainText('Step 2 of');

    await player.getByRole('group', { name: /Drawing of step/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(counter(page)).toHaveAttribute('aria-valuetext', /^Step 3 of/);
    await page.keyboard.press('ArrowLeft');
    await expect(counter(page)).toHaveAttribute('aria-valuetext', /^Step 2 of/);
    await page.keyboard.press('End');
    const total = Number((await counter(page).getAttribute('max')) ?? '0') + 1;
    await expect(counter(page)).toHaveAttribute('aria-valuetext', `Step ${total} of ${total}`);
    await page.keyboard.press('Home');
    await expect(counter(page)).toHaveAttribute('aria-valuetext', `Step 1 of ${total}`);

    await page.keyboard.press(' ');
    await expect(player.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await expect(counter(page)).not.toHaveAttribute('aria-valuetext', `Step 1 of ${total}`, {
      timeout: 5000,
    });
    await page.keyboard.press(' ');
    await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeVisible();

    await player.getByText('Narration log').click();
    await expect(player.locator('details ol li').first()).toBeVisible();
  });

  test('keeps the step and the input in the address, and opens a shared link where it left off', async ({
    page,
  }) => {
    const player = await openPlayground(page, 'kadane');
    await player.getByRole('textbox', { name: /nums/i }).fill('3, -4, 5, 1');
    await player.getByRole('button', { name: 'Run with this input' }).click();
    await player.getByRole('button', { name: 'Next', exact: true }).click();
    await player.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(/#viz=kadane&in=[A-Za-z0-9_-]+&step=3$/);

    const link = page.url();
    await page.goto('/visualizers');
    await page.goto(link);
    await appReady(page);
    const again = page.locator('section[data-viz="kadane"]');
    await expect(again.getByRole('textbox', { name: /nums/i })).toHaveValue('3, -4, 5, 1');
    await expect(counter(page)).toHaveAttribute('aria-valuetext', /^Step 3 of/);
  });

  test('reports a bad input and keeps the last good run', async ({ page }) => {
    const player = await openPlayground(page, 'kadane');
    const before = await counter(page).getAttribute('aria-valuetext');
    await player.getByRole('textbox', { name: /nums/i }).fill('1, x');
    await player.getByRole('button', { name: 'Run with this input' }).click();
    await expect(player.getByRole('alert')).toContainText('could not read this value');
    expect(await counter(page).getAttribute('aria-valuetext')).toBe(before);
  });

  test('offers presets, a random input and edge cases', async ({ page }) => {
    const player = await openPlayground(page, 'two-sum-sorted');
    const field = player.getByRole('textbox').first();
    const original = await field.inputValue();
    await player.getByRole('button', { name: 'Random input' }).click();
    await expect(player.getByRole('alert')).toHaveCount(0);
    const edge = player.getByRole('group', { name: 'Edge cases' });
    await expect(edge.getByRole('button').first()).toBeVisible();
    await edge.getByRole('button', { name: 'All equal' }).click();
    await expect(player.getByRole('alert')).toHaveCount(0);
    await player.getByLabel('Examples').selectOption({ index: 1 });
    await expect(field).not.toHaveValue('');
    expect(original).not.toBe('');
  });

  test('asks before a step in Predict mode, and scores the answer', async ({ page }) => {
    const player = await openPlayground(page, 'two-sum-sorted');
    await player.getByRole('radio', { name: 'Predict' }).check();
    let asked = false;
    for (let k = 0; k < 10 && !asked; k++) {
      await player.getByRole('button', { name: 'Next', exact: true }).click();
      asked = await player.getByRole('group', { name: /Which pointer moves/ }).isVisible();
    }
    expect(asked).toBe(true);
    const question = player.getByRole('group', { name: /Which pointer moves/ });
    await question.getByRole('radio').first().check();
    await question.getByRole('button', { name: 'Check' }).click();
    await expect(question.getByRole('status')).toHaveText(/^(Right\.|Not this time\. The answer is: .+\.)$/);
    await expect(player.getByText(/Predictions right: [01] of 1/)).toBeVisible();
    await question.getByRole('button', { name: 'Show the step' }).click();
    await expect(question).toHaveCount(0);
  });

  test('stops playing at a breakpoint', async ({ page }) => {
    const player = await openPlayground(page, 'two-sum-sorted');
    const activeLine = async () =>
      Number(await player.locator('.vz-code-line[data-active]').first().getAttribute('data-line'));
    // The line that step 3 runs, which step 1 does not: Play from the start must stop on it.
    const startLine = await activeLine();
    await player.getByRole('button', { name: 'Next', exact: true }).click();
    await player.getByRole('button', { name: 'Next', exact: true }).click();
    const target = await activeLine();
    expect(target).not.toBe(startLine);
    await player.getByRole('button', { name: 'Reset' }).click();

    const gutter = player.getByRole('button', { name: `Breakpoint on line ${target}` });
    await gutter.click();
    await expect(gutter).toHaveAttribute('aria-pressed', 'true');
    await player.getByRole('combobox', { name: 'Speed' }).selectOption('4');
    await player.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeVisible({ timeout: 15_000 });
    expect(await activeLine()).toBe(target);
    await expect(counter(page)).not.toHaveAttribute('aria-valuetext', /^Step 1 of/);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`axe finds nothing on a playground in the ${scheme} theme, in Watch and Predict`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const player = await openPlayground(page, 'two-sum-sorted');
      await noViolations(page);
      await player.getByRole('radio', { name: 'Predict' }).check();
      for (let k = 0; k < 10; k++) {
        await player.getByRole('button', { name: 'Next', exact: true }).click();
        if (await player.getByRole('group', { name: /Which pointer moves/ }).isVisible()) break;
      }
      await noViolations(page);
    });
  }

  test('compares two methods on one input, with their step counts and answers', async ({ page }) => {
    await openPlayground(page, 'rec-fib');
    await page.getByText('Compare: Plain recursion against a cache').click();
    const summary = page.getByRole('status').filter({ hasText: 'Plain recursion:' });
    await expect(summary).toHaveText(
      /^Plain recursion: (\d+) steps\. With a cache: (\d+) steps\. Both answer \d+\.$/,
    );
    const [plain, cached] = ((await summary.textContent()) ?? '').match(/\d+(?= steps)/g)?.map(Number) ?? [];
    expect(cached).toBeLessThan(plain as number);
    await page.getByRole('button', { name: 'Play both' }).click();
    await expect(page.getByRole('region', { name: 'With a cache' })).toContainText(/Finished in \d+ steps/, {
      timeout: 15_000,
    });
    await noViolations(page);
  });

  test('measures how the steps grow, where that is meaningful', async ({ page }) => {
    await openPlayground(page, 'loop-triangle');
    await page.getByText('How the steps grow with n').click();
    await expect(page.getByText(/Closest growth: O\(n²\)/)).toBeVisible();
    await page.getByText('Step counts as a table').click();
    await expect(page.getByRole('table').last().getByRole('row')).not.toHaveCount(1);
    await noViolations(page);
    await page.goto('/visualizers/lis');
    await appReady(page);
    await expect(page.locator('section[data-viz="lis"]')).toBeVisible();
    await expect(page.getByText('How the steps grow with n')).toHaveCount(0);
  });

  test.describe('at 360 px wide', () => {
    test.use({ viewport: { width: 360, height: 740 } });

    for (const id of ['two-sum-sorted', 'dijkstra', 'lis', 'trie']) {
      test(`${id} never makes the page scroll sideways`, async ({ page }) => {
        await openPlayground(page, id);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
        ).toBeLessThanOrEqual(0);
      });
    }
  });
});
