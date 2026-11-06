// What the end-to-end tests run against: an in-memory MongoDB replica set and the production build served by
// `next start`, with sign-in emails written to files the tests can read. Playwright starts this as its web
// server; run `npm run build` first.
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const resolve = createRequire(import.meta.url).resolve;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.E2E_PORT ?? 3100);
const OUT = path.join(ROOT, '.e2e-server');
const EMAIL_DIR = path.join(OUT, 'emails');

const signInPage = path.join(ROOT, '.next', 'server', 'app', 'sign-in.html');
if (!fs.existsSync(signInPage) || !fs.readFileSync(signInPage, 'utf8').includes('Email me a sign-in link')) {
  console.error('e2e-server: no build with email sign-in switched on; run `npm run build:e2e` first');
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(EMAIL_DIR, { recursive: true });

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
const mongoUri = replSet.getUri('dsa-pattern-lab-e2e');
fs.writeFileSync(path.join(OUT, 'env.json'), JSON.stringify({ mongoUri, emailDir: EMAIL_DIR, port: PORT }));

// The content copies back /api/search; the sync is idempotent and needs the live MongoDB, so it runs here.
const sync = spawnSync(process.execPath, [resolve('tsx/cli'), 'scripts/sync-content.ts'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, MONGODB_URI: mongoUri },
});
if (sync.status !== 0) {
  console.error('e2e-server: content sync failed');
  await replSet.stop();
  process.exit(1);
}

const nextBin = resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], {
  cwd: ROOT,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    APP_ENV: 'test',
    NEXT_TELEMETRY_DISABLED: '1',
    MONGODB_URI: mongoUri,
    BETTER_AUTH_SECRET: crypto.randomBytes(32).toString('hex'),
    BETTER_AUTH_URL: `http://localhost:${PORT}`,
    EMAIL_TRANSPORT: 'file',
    EMAIL_DIR,
    // All test browsers share one IP address, so per-IP sign-in limits would trip; integration tests cover them.
    AUTH_RATE_LIMIT: 'off',
  },
});

let stopping = false;
async function stop(code) {
  if (stopping) return;
  stopping = true;
  child.kill();
  await replSet.stop();
  process.exit(code);
}
process.on('SIGINT', () => void stop(0));
process.on('SIGTERM', () => void stop(0));
child.on('exit', (code) => void stop(code ?? 0));
