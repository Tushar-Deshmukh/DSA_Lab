// Builds the app with the settings the end-to-end server runs with. The sign-in page is static, so the sign-in
// methods it offers are fixed at build time; the test server sends sign-in emails to files (EMAIL_TRANSPORT=file).
import { spawnSync } from 'node:child_process';

const windows = process.platform === 'win32';
const res = spawnSync(windows ? 'npm.cmd' : 'npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: windows,
  env: { ...process.env, APP_ENV: 'test', EMAIL_TRANSPORT: 'file', NEXT_TELEMETRY_DISABLED: '1' },
});
process.exit(res.status ?? 1);
