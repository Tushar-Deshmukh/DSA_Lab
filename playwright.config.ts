import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the production build (`npm run build:e2e` first), served by scripts/e2e-server.mjs
// with an in-memory MongoDB. Chromium on every push; all three browsers nightly and at each phase gate.

const PORT = Number(process.env.E2E_PORT ?? 3100);
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !CI,
    timeout: 300_000,
    stdout: 'pipe',
  },
});
