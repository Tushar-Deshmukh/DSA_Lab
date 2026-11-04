import { expect, test } from '@playwright/test';
import { accountButton, appReady, saveChip, signIn, uniqueEmail, waitForLink } from './support';

test.use({ viewport: { width: 1280, height: 800 } });

test('a magic link signs in, the session survives a reload, and sign-out works', async ({
  page,
  context,
  browserName,
}) => {
  const email = uniqueEmail('auth');
  await signIn(page, email);
  const session = (await context.cookies()).find((c) => c.name.includes('session_token'));
  expect(session?.httpOnly).toBe(true);
  // Playwright's WebKit on Windows reports every cookie as SameSite=None; the server's Set-Cookie header
  // (SameSite=Lax) is checked in tests/integration/server.test.ts.
  if (browserName !== 'webkit') expect(session?.sameSite).toBe('Lax');
  await page.reload();
  await appReady(page);
  await expect(accountButton(page, email)).toBeVisible();
  await expect(saveChip(page)).toHaveAttribute('data-save-state', 'saved');
  await accountButton(page, email).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(accountButton(page, email)).toHaveCount(0);
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(saveChip(page)).toHaveAttribute('data-save-state', 'device');
  expect((await page.request.get('/api/sync')).status()).toBe(401);
});

test('a used link does not sign anyone in again', async ({ browser }) => {
  const email = uniqueEmail('reuse');
  const first = await browser.newContext();
  await signIn(await first.newPage(), email);
  const link = await waitForLink(email);
  const second = await browser.newContext();
  const page = await second.newPage();
  await page.goto(link);
  await expect(page).toHaveURL(/\/sign-in\?error=/);
  await expect(page.getByText('That sign-in link has expired or was already used.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await first.close();
  await second.close();
});

test('the GitHub button only appears when GitHub sign-in is configured', async ({ page }) => {
  await page.goto('/sign-in');
  await appReady(page);
  await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toHaveCount(0);
});

test('guest settings stay on this device across reloads', async ({ page }) => {
  await page.goto('/settings');
  await appReady(page);
  await expect(saveChip(page)).toHaveAttribute('data-save-state', 'device');
  await page.getByLabel('Dark').check();
  await expect(saveChip(page)).toHaveAttribute('data-save-state', 'device');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await appReady(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByLabel('Dark')).toBeChecked();
});

test('guest progress merges into the account, and offline changes are sent later', async ({
  page,
  context,
}) => {
  const email = uniqueEmail('sync');
  await page.goto('/settings');
  await appReady(page);
  await page.getByLabel('Dark').check();
  await expect(saveChip(page)).toHaveAttribute('data-save-state', 'device');

  const firstLink = await signIn(page, email);
  const prompt = page.getByRole('dialog', { name: "Add this device's progress to your account?" });
  await expect(prompt).toBeVisible();
  await prompt.getByRole('button', { name: 'Add to my account' }).click();
  await expect(prompt).toBeHidden();
  await expect(saveChip(page)).toHaveAttribute('data-save-state', 'saved');
  const server = async () =>
    (
      (await (await page.request.get('/api/sync')).json()) as {
        snapshot: { settings: { values: { theme?: string } } };
      }
    ).snapshot.settings.values;
  expect((await server()).theme).toBe('dark');

  await page.goto('/settings');
  await appReady(page);
  await context.setOffline(true);
  await page.getByLabel('Light').check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(saveChip(page)).toHaveAttribute('data-save-state', 'waiting');
  await expect(saveChip(page)).toContainText('1 change waiting');
  await context.setOffline(false);
  await expect(saveChip(page)).toHaveAttribute('data-save-state', 'saved', { timeout: 20_000 });
  expect((await server()).theme).toBe('light');

  // A second device signing in gets the account's settings, and has no guest data to merge.
  const other = await context.browser()!.newContext();
  const otherPage = await other.newPage();
  await signIn(otherPage, email, firstLink);
  await expect(otherPage.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(saveChip(otherPage)).toHaveAttribute('data-save-state', 'saved');
  await expect(otherPage.getByRole('dialog')).toHaveCount(0);
  await other.close();
});
