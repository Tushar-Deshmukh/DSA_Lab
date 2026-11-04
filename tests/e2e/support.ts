import fs from 'node:fs';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';

// Shared helpers for the end-to-end tests. scripts/e2e-server.mjs writes its state to .e2e-server/.

const SERVER_DIR = path.join(process.cwd(), '.e2e-server');

function emailDir(): string {
  const env = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'env.json'), 'utf8')) as { emailDir: string };
  return env.emailDir;
}

/** The app sets data-app-ready once the learner's store is open; before that, settings are not loaded. */
export async function appReady(page: Page): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', '1');
}

export function saveChip(page: Page): Locator {
  return page.locator('[data-save-state]').first();
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

/** The most recent sign-in link sent to `to`; with `after`, waits for a newer link than that one. */
export async function waitForLink(to: string, after?: string, timeoutMs = 15_000): Promise<string> {
  const dir = emailDir();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const messages = fs
      .readdirSync(dir)
      .sort()
      .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as { to: string; text: string })
      .filter((m) => m.to === to);
    const url = messages.length ? /https?:\/\/\S+/.exec(messages[messages.length - 1]!.text)?.[0] : undefined;
    if (url && url !== after) return url;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no ${after ? 'new ' : ''}sign-in email arrived for ${to}`);
}

export async function requestLink(page: Page, email: string): Promise<void> {
  await page.goto('/sign-in');
  await appReady(page);
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByText('Check your inbox')).toBeVisible();
}

export function accountButton(page: Page, email: string): Locator {
  return page.getByRole('button', { name: `Account: ${email}` });
}

export async function signIn(page: Page, email: string, previousLink?: string): Promise<string> {
  await requestLink(page, email);
  const link = await waitForLink(email, previousLink);
  await page.goto(link);
  await appReady(page);
  await expect(accountButton(page, email)).toBeVisible();
  return link;
}
