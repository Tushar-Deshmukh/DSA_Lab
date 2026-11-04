import { spawn } from 'node:child_process';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ROOT } from '@/scripts/import/paths';

// The npm scripts run through tsx, which compiles differently from the test runner, so these run the real commands.
// Asynchronously on purpose: mongod's log pipe is drained by this process, and a blocking call would stall the server.

const TSX = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function run(script: string, args: string[] = [], env: Record<string, string> = {}) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [TSX, script, ...args], {
      cwd: ROOT,
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

describe('content:sync', () => {
  let server: MongoMemoryServer;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
  });

  afterAll(async () => {
    await server?.stop();
  });

  it('writes everything once, and nothing the second time', async () => {
    const env = { MONGODB_URI: server.getUri('dpl-sync-command') };
    const first = await run('scripts/sync-content.ts', [], env);
    expect(first.status, first.stderr).toBe(0);
    expect(first.stdout).toContain('781 written, 0 deleted, 0 unchanged.');
    const second = await run('scripts/sync-content.ts', [], env);
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout).toContain('0 written, 0 deleted, 781 unchanged.');
  }, 120_000);
});

describe('the other content commands', () => {
  it('content:check passes', async () => {
    const res = await run('scripts/validate-content.ts');
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout).toContain('content:check passed.');
  }, 60_000);

  it('content:lock finds nothing new', async () => {
    const res = await run('scripts/lock-ids.ts');
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout).toContain('No new ids.');
  }, 60_000);

  it('content:import refuses to overwrite content/ without --force', async () => {
    const res = await run('scripts/import-legacy.ts');
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('Pass --force');
  }, 60_000);
});
