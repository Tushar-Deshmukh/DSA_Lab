import { expect, test } from '@playwright/test';
import { appReady, saveChip } from './support';

test.use({ viewport: { width: 1280, height: 800 } });

test('the home page loads with the shell and a skip link', async ({ page, browserName }) => {
  await page.goto('/');
  await appReady(page);
  await expect(page.getByRole('heading', { level: 1, name: 'DSA Pattern Lab' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(page.locator('a').first()).toHaveAttribute('href', '#main');
  // Safari's default Tab only visits form controls (links need its "Press Tab to highlight each item" setting),
  // and Playwright's WebKit behaves the same, so the keyboard check runs in Chromium and Firefox.
  if (browserName === 'webkit') return;
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
});

test('the command palette opens from the keyboard and navigates', async ({ page }) => {
  await page.goto('/');
  await appReady(page);
  await page.keyboard.press('ControlOrMeta+k');
  const input = page.getByPlaceholder('Type a command or a page…');
  await expect(input).toBeVisible();
  await input.fill('settings');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
});

test('? lists the shortcuts and Escape closes the list', async ({ page }) => {
  await page.goto('/');
  await appReady(page);
  await page.keyboard.press('?');
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('focus mode hides the navigation and survives a reload', async ({ page }) => {
  await page.goto('/');
  await appReady(page);
  const nav = page.getByRole('navigation', { name: 'Main' });
  await page.keyboard.press('f');
  await expect(saveChip(page)).toHaveAttribute('data-save-state', 'device');
  await expect(page.locator('html')).toHaveAttribute('data-focus', 'on');
  await expect(nav).toBeHidden();
  await page.reload();
  await appReady(page);
  await expect(page.locator('html')).toHaveAttribute('data-focus', 'on');
  await page.getByRole('button', { name: 'Exit focus' }).click();
  await expect(nav).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-focus', 'on');
});

test('sections not built yet say so', async ({ page }) => {
  await page.goto('/practice');
  await expect(page.getByText('Not built yet.')).toBeVisible();
});
