import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GET as syncGet, POST as syncPost } from '@/app/api/sync/route';
import { closeDatabase, getDatabase } from '@/lib/db/connection';
import { settingsOp } from '@/lib/domain/ops';
import { getAuth, getSessionUser } from '@/lib/server/auth';
import { checkWriteRequest } from '@/lib/server/http';
import { hitRateLimit } from '@/lib/server/rate-limit';
import { applyOps, snapshotFor } from '@/lib/server/sync';

// Server code against a real MongoDB (an in-memory single-node replica set, as transactions need one).

const BASE_URL = 'http://localhost:3000';
const DEVICE = 'device-0001';
const emailDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dpl-mail-'));
let replSet: MongoMemoryReplSet;
let n = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  Object.assign(process.env, {
    MONGODB_URI: replSet.getUri('dpl-integration'),
    BETTER_AUTH_SECRET: 'b'.repeat(32),
    BETTER_AUTH_URL: BASE_URL,
    APP_ENV: 'test',
    EMAIL_TRANSPORT: 'file',
    EMAIL_DIR: emailDir,
  });
});

afterAll(async () => {
  await closeDatabase();
  await replSet?.stop();
  fs.rmSync(emailDir, { recursive: true, force: true });
});

describe('database', () => {
  it('shares one driver client between Mongoose and auth (D-004)', async () => {
    const { client, conn } = await getDatabase();
    expect(client).toBeInstanceOf(MongoClient);
    expect(conn.getClient()).toBe(client);
  });

  it('creates the indexes the app relies on', async () => {
    const { db } = await getDatabase();
    const names = async (c: string) =>
      (await db.collection(c).indexes()).map(
        (i) =>
          JSON.stringify(i.key) +
          (i.unique ? ' unique' : '') +
          (i.expireAfterSeconds !== undefined ? ' ttl' : ''),
      );
    expect(await names('users')).toContain('{"email":1} unique');
    expect(await names('sessions')).toEqual(
      expect.arrayContaining(['{"token":1} unique', '{"expiresAt":1} ttl']),
    );
    expect(await names('settings')).toContain('{"userId":1} unique');
    expect(await names('sync_ops')).toEqual(
      expect.arrayContaining(['{"userId":1,"opId":1} unique', '{"appliedAt":1} ttl']),
    );
    expect(await names('rate_limits')).toContain('{"expiresAt":1} ttl');
  });
});

describe('sync service', () => {
  const alice = new ObjectId().toHexString();
  const bob = new ObjectId().toHexString();

  it('applies, deduplicates and rejects operations one by one', async () => {
    const good = settingsOp('theme', 'dark', 1000, DEVICE, uuid());
    const badValue = {
      ...settingsOp('theme', 'dark', 1000, DEVICE, uuid()),
      payload: { key: 'theme', value: 'blue' },
    };
    const res = await applyOps(alice, [good, good, badValue, { nonsense: true }]);
    expect(res.results.map((r) => r.status)).toEqual(['applied', 'duplicate', 'rejected', 'rejected']);
    expect(res.snapshot.settings.values).toEqual({ theme: 'dark' });
  });

  it('keeps the later change when changes arrive out of order', async () => {
    await applyOps(alice, [settingsOp('editorFontSize', 20, 3000, DEVICE, uuid())]);
    await applyOps(alice, [settingsOp('editorFontSize', 13, 2000, DEVICE, uuid())]);
    expect((await snapshotFor(alice)).settings.values.editorFontSize).toBe(20);
  });

  it('treats a change stamped far in the future as made now', async () => {
    const now = Date.now();
    await applyOps(alice, [settingsOp('focusMode', true, now + 86_400_000, DEVICE, uuid())], now);
    expect((await snapshotFor(alice)).settings.at.focusMode).toBeLessThanOrEqual(now + 5 * 60_000);
  });

  it("never touches another learner's documents", async () => {
    expect(await snapshotFor(bob)).toEqual({ settings: { values: {}, at: {} } });
  });
});

describe('rate limit', () => {
  it('counts per fixed window', async () => {
    const rule = { limit: 2, windowSeconds: 60 };
    const t = Date.UTC(2030, 0, 1, 12, 0, 10);
    expect((await hitRateLimit('test:a', rule, t)).ok).toBe(true);
    expect((await hitRateLimit('test:a', rule, t)).ok).toBe(true);
    const third = await hitRateLimit('test:a', rule, t);
    expect(third.ok).toBe(false);
    expect(third.retryAfterSeconds).toBe(50);
    expect((await hitRateLimit('test:a', rule, t + 60_000)).ok).toBe(true);
    expect((await hitRateLimit('test:b', rule, t)).ok).toBe(true);
  });
});

describe('write-request guard', () => {
  const req = (headers: Record<string, string>) =>
    new Request(`${BASE_URL}/api/sync`, { method: 'POST', headers });
  it('refuses other origins and non-JSON bodies', () => {
    expect(
      checkWriteRequest(req({ origin: 'https://evil.example', 'content-type': 'application/json' }))?.status,
    ).toBe(403);
    expect(checkWriteRequest(req({ 'content-type': 'application/json' }))?.status).toBe(403);
    expect(checkWriteRequest(req({ origin: BASE_URL, 'content-type': 'text/plain' }))?.status).toBe(415);
    expect(checkWriteRequest(req({ origin: BASE_URL, 'content-type': 'application/json' }))).toBeNull();
  });
});

describe('magic-link sign-in and the sync route', () => {
  const email = 'learner@example.test';
  let link = '';
  let cookie = '';

  const authRequest = (p: string, body: unknown, headers: Record<string, string> = {}) =>
    new Request(`${BASE_URL}/api/auth${p}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE_URL, ...headers },
      body: JSON.stringify(body),
    });

  it('emails a link and stores only a hash of its token', async () => {
    const auth = await getAuth();
    const res = await auth.handler(authRequest('/sign-in/magic-link', { email, callbackURL: '/' }));
    expect(res.status).toBe(200);
    const files = fs.readdirSync(emailDir);
    expect(files).toHaveLength(1);
    const message = JSON.parse(fs.readFileSync(path.join(emailDir, files[0]!), 'utf8')) as {
      to: string;
      text: string;
    };
    expect(message.to).toBe(email);
    link = /https?:\/\/\S+/.exec(message.text)![0];
    const token = new URL(link).searchParams.get('token')!;
    expect(token.length).toBeGreaterThan(16);
    const { db } = await getDatabase();
    const stored = JSON.stringify(await db.collection('verification_tokens').find().toArray());
    expect(stored).not.toContain(token);
  });

  it('signs in once with the link, with an HttpOnly SameSite=Lax cookie', async () => {
    const auth = await getAuth();
    const res = await auth.handler(new Request(link, { headers: { origin: BASE_URL } }));
    expect(res.status).toBe(302);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    cookie = setCookie
      .split(/,(?=\s*[^;,]+=)/)
      .map((c) => c.split(';')[0]!.trim())
      .join('; ');
    expect((await getSessionUser(new Headers({ cookie })))?.email).toBe(email);
    const again = await auth.handler(new Request(link, { headers: { origin: BASE_URL } }));
    expect(again.headers.get('location')).toMatch(/error=/);
  });

  it('refuses to send the learner to another site after sign-in', async () => {
    const auth = await getAuth();
    const res = await auth.handler(
      authRequest('/sign-in/magic-link', { email, callbackURL: 'https://evil.example/steal' }),
    );
    expect(res.status).toBe(403);
  });

  it('serves and updates the signed-in learner through /api/sync', async () => {
    const headers = { cookie, origin: BASE_URL, 'content-type': 'application/json' };
    const op = settingsOp('theme', 'light', Date.now(), DEVICE, uuid());
    const post = await syncPost(
      new Request(`${BASE_URL}/api/sync`, { method: 'POST', headers, body: JSON.stringify({ ops: [op] }) }),
    );
    expect(post.status).toBe(200);
    expect(((await post.json()) as { results: { status: string }[] }).results[0]!.status).toBe('applied');
    const get = await syncGet(new Request(`${BASE_URL}/api/sync`, { headers: { cookie } }));
    expect(
      ((await get.json()) as { snapshot: { settings: { values: object } } }).snapshot.settings.values,
    ).toEqual({ theme: 'light' });
    expect((await syncGet(new Request(`${BASE_URL}/api/sync`))).status).toBe(401);
    const bad = await syncPost(
      new Request(`${BASE_URL}/api/sync`, { method: 'POST', headers, body: '{"ops":"nope"}' }),
    );
    expect(bad.status).toBe(400);
  });

  // Runs after the route test: if the request were accepted it would end the session used above.
  it('refuses a cross-site request that carries the session cookie', async () => {
    const auth = await getAuth();
    const res = await auth.handler(authRequest('/sign-out', {}, { cookie, origin: 'https://evil.example' }));
    expect(res.status).toBe(403);
    expect((await getSessionUser(new Headers({ cookie })))?.email).toBe(email);
  });

  it('limits repeated sign-in requests from one address', async () => {
    const auth = await getAuth();
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      const res = await auth.handler(
        authRequest(
          '/sign-in/magic-link',
          { email: `limit-${i}@example.test` },
          { 'x-forwarded-for': '203.0.113.9' },
        ),
      );
      statuses.push(res.status);
    }
    expect(statuses[0]).toBe(200);
    expect(statuses).toContain(429);
  });
});
