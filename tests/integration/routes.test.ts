import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST as syncPost } from '@/app/api/sync/route';
import { GET as exercisesGet } from '@/app/api/exercises/[...slug]/route';
import { GET as gateGet } from '@/app/api/gates/[gateId]/route';
import { POST as checkpointStart } from '@/app/api/checkpoints/[slug]/start/route';
import { POST as mockPool } from '@/app/api/mocks/[slug]/pool/route';
import { GET as noteGet } from '@/app/api/problems/[num]/note/route';
import { GET as searchGet } from '@/app/api/search/route';
import { GET as meExport } from '@/app/api/me/export/route';
import { POST as meImport } from '@/app/api/me/import/route';
import { DELETE as meDelete } from '@/app/api/me/route';
import { getAuth, getSessionUser } from '@/lib/server/auth';
import { closeDatabase } from '@/lib/db/connection';
import {
  buildRuntimeData,
  readExerciseKeys,
  readReserved,
  writeRuntimeData,
} from '@/lib/server/runtime-data';
import { EMPTY_SNAPSHOT, settingsOp, type Snapshot } from '@/lib/domain/ops';
import { loadContent } from '@/lib/content/load';
import { syncContent } from '@/lib/content/sync';
import { CONTENT_COLLECTIONS, registerContentModels } from '@/lib/db/content-models';
import { CONTENT_DIR } from '@/scripts/import/paths';

// The generated-data and reserved-content route endpoints (D-011, D-012, D-027, D-017) against a real MongoDB,
// plus the account-data endpoints (export, import, erase). The runtime data is written here, exactly as
// predev/prebuild do, so the route handlers read the files the app will really serve.

const BASE_URL = 'http://localhost:3000';
const emailDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dpl-routes-mail-'));
let replSet: MongoMemoryReplSet;
let cookie = '';

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  Object.assign(process.env, {
    MONGODB_URI: replSet.getUri('dpl-routes'),
    BETTER_AUTH_SECRET: 'b'.repeat(32),
    BETTER_AUTH_URL: BASE_URL,
    APP_ENV: 'test',
    EMAIL_TRANSPORT: 'file',
    EMAIL_DIR: emailDir,
  });
  writeRuntimeData(buildRuntimeData(loadContent(CONTENT_DIR)));
  const conn = await mongoose.createConnection(replSet.getUri('dpl-routes')).asPromise();
  const models = registerContentModels(conn);
  await Promise.all(CONTENT_COLLECTIONS.map((c) => models.items[c].createIndexes()));
  await syncContent(models, loadContent(CONTENT_DIR), new Date());
  await conn.close();
  cookie = await signIn();
});

afterAll(async () => {
  fs.rmSync(emailDir, { recursive: true, force: true });
  await closeDatabase();
  await replSet?.stop();
});

async function signIn(): Promise<string> {
  const email = 'routes@example.test';
  const auth = await getAuth();
  const res = await auth.handler(
    new Request(`${BASE_URL}/api/auth/sign-in/magic-link`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE_URL },
      body: JSON.stringify({ email, callbackURL: '/' }),
    }),
  );
  expect(res.status).toBe(200);
  const links = fs.readdirSync(emailDir);
  const message = JSON.parse(fs.readFileSync(path.join(emailDir, links[links.length - 1]!), 'utf8')) as {
    text: string;
  };
  const link = /https?:\/\/\S+/.exec(message.text)![0];
  const accepted = await auth.handler(new Request(link, { headers: { origin: BASE_URL } }));
  expect(accepted.status).toBe(302);
  const jar = (accepted.headers.get('set-cookie') ?? '')
    .split(/,(?=\s*[^;,]+=)/)
    .map((c) => c.split(';')[0]!.trim())
    .join('; ');
  expect((await getSessionUser(new Headers({ cookie: jar })))?.email).toBe(email);
  return jar;
}

const get = (url: string, headers: Record<string, string> = {}) =>
  new Request(`${BASE_URL}${url}`, { headers });
const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE_URL, ...headers },
    body: JSON.stringify(body),
  });
const ctx = (params: Promise<unknown>) => ({ params }) as never;

describe('GET /api/exercises/[...slug]', () => {
  it('serves one key, shaped exactly like the generated entry (D-011)', async () => {
    const [slug, served] = Object.entries(readExerciseKeys())[0]!;
    const parts = [...slug.split('/'), 'key'];
    const res = await exercisesGet(
      get(`/api/exercises/${parts.join('/')}`),
      ctx(Promise.resolve({ slug: parts })),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { slug: string; type: string; key: Record<string, unknown> };
    expect(body.slug).toBe(slug);
    expect(body.type).toBe(served.type);
    expect(body.key).toEqual(served.key);

    const wrong = [...slug.split('/').slice(0, 2), 'unknown-id', 'key'];
    expect(
      (await exercisesGet(get('/api/exercises/a/b/key'), ctx(Promise.resolve({ slug: ['a', 'b', 'key'] }))))
        .status,
    ).toBe(404);
    expect(
      (await exercisesGet(get(`/api/exercises/${wrong.join('/')}`), ctx(Promise.resolve({ slug: wrong }))))
        .status,
    ).toBe(404);
    expect(
      (
        await exercisesGet(
          get(`/api/exercises/${slug}/nope`),
          ctx(Promise.resolve({ slug: [...slug.split('/'), 'nope'] })),
        )
      ).status,
    ).toBe(404);
  });
});

describe('GET /api/gates/[gateId]', () => {
  it('serves the gate texts and the public part of gated exercises (D-027)', async () => {
    const reserved = readReserved().gates['assessment-1']!;
    const res = await gateGet(
      get('/api/gates/assessment-1'),
      ctx(Promise.resolve({ gateId: 'assessment-1' })),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      gate: string;
      texts: Record<string, string>;
      exercises: Record<string, { type: string; public: Record<string, unknown> }>;
    };
    expect(body.gate).toBe('assessment-1');
    expect(body.texts).toEqual(reserved.texts);
    expect(Object.keys(body.exercises)).toHaveLength(6);
    expect(body.exercises).toEqual(reserved.exercises);
    for (const entry of Object.values(body.exercises)) {
      expect(JSON.stringify(entry.public)).not.toContain('"explain"');
      expect(JSON.stringify(entry.public)).not.toContain('"solution"');
    }
  });

  it('404s a gate id that nothing defines', async () => {
    expect((await gateGet(get('/api/gates/nope'), ctx(Promise.resolve({ gateId: 'nope' })))).status).toBe(
      404,
    );
  });
});

describe('POST /api/checkpoints/[slug]/start', () => {
  it('serves the reserved problem list, and only from our own pages (D-012)', async () => {
    const reserved = readReserved().assessments['assessment-1']!;
    const res = await checkpointStart(
      post('/api/checkpoints/assessment-1/start', {}),
      ctx(Promise.resolve({ slug: 'assessment-1' })),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { assessment: { id: string; slug: string; problems: unknown[] } };
    expect(body.assessment.id).toBe('A1');
    expect(body.assessment.problems).toEqual(reserved.problems);
    expect(
      (await checkpointStart(post('/api/checkpoints/nope/start', {}), ctx(Promise.resolve({ slug: 'nope' }))))
        .status,
    ).toBe(404);
    expect(
      (
        await checkpointStart(
          post('/api/checkpoints/assessment-1/start', {}, { origin: 'https://evil.example' }),
          ctx(Promise.resolve({ slug: 'assessment-1' })),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await checkpointStart(
          new Request(`${BASE_URL}/api/checkpoints/assessment-1/start`, {
            method: 'POST',
            headers: { origin: BASE_URL },
          }),
          ctx(Promise.resolve({ slug: 'assessment-1' })),
        )
      ).status,
    ).toBe(415);
  });
});

describe('POST /api/mocks/[slug]/pool', () => {
  it('serves the pool after the page gate', async () => {
    const reserved = readReserved().mocks['mock-1']!;
    const res = await mockPool(post('/api/mocks/mock-1/pool', {}), ctx(Promise.resolve({ slug: 'mock-1' })));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { mock: { id: number; slug: string; pool: { num: number }[] } };
    expect(body.mock.id).toBe(reserved.id);
    expect(body.mock.pool).toEqual(reserved.pool);
    expect(body.mock.pool.length).toBeGreaterThan(0);
    expect(
      (await mockPool(post('/api/mocks/mock-99/pool', {}), ctx(Promise.resolve({ slug: 'mock-99' })))).status,
    ).toBe(404);
  });
});

describe('GET /api/problems/[num]/note', () => {
  it('serves the held-back pattern note of a hidden problem (D-012)', async () => {
    const res = await noteGet(get('/api/problems/438/note'), ctx(Promise.resolve({ num: '438' })));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      num: number;
      pattern: string;
      prereq: string;
      why: string;
      hint: string;
    };
    expect(body).toEqual({ num: 438, ...readReserved().problems['438'] });
  });

  it('404s non-hidden, non-numeric and unknown numbers', async () => {
    expect((await noteGet(get('/api/problems/1/note'), ctx(Promise.resolve({ num: '1' })))).status).toBe(404);
    expect((await noteGet(get('/api/problems/abc/note'), ctx(Promise.resolve({ num: 'abc' })))).status).toBe(
      404,
    );
    expect(
      (await noteGet(get('/api/problems/9999/note'), ctx(Promise.resolve({ num: '9999' })))).status,
    ).toBe(404);
  });
});

describe('GET /api/search', () => {
  it('finds public content by its words', async () => {
    const res = await searchGet(get('/api/search?q=floyd'));
    expect(res.status).toBe(200);
    const { results } = (await res.json()) as {
      results: { collection: string; slug: string; title: string }[];
    };
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(CONTENT_COLLECTIONS).toContain(r.collection);
      expect(r.title.length).toBeGreaterThan(0);
    }
  });

  it('rejects short queries and accepts empty results', async () => {
    expect((await searchGet(get('/api/search?q=a'))).status).toBe(400);
    const none = await searchGet(get('/api/search?q=zzqqxxqqzz'));
    expect(none.status).toBe(200);
    expect(((await none.json()) as { results: unknown[] }).results).toEqual([]);
  });
});

describe('the account data endpoints', () => {
  const appliedOp = settingsOp('theme', 'light', Date.now(), 'device-0001', crypto.randomUUID());
  const imported: Snapshot = {
    ...EMPTY_SNAPSHOT,
    settings: {
      values: { theme: 'dark', depthProfile: 'foundations' },
      at: { theme: 500, depthProfile: 500 },
    },
    lessons: { 'foundations/00-legacy-roadmap': { at: 700, startedAt: 700, units: { u1: 700 }, ready: {} } },
  };
  const headers = () => ({ cookie, origin: BASE_URL, 'content-type': 'application/json' });

  it('export, import and erase the signed-in learner (plan §11)', async () => {
    // Put something on the account first, through the normal sync.
    const queued = await syncPost(
      new Request(`${BASE_URL}/api/sync`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ops: [appliedOp] }),
      }),
    );
    const queuedBody = (await queued.json()) as { results: { status: string }[] };
    expect(queued.status).toBe(200);
    expect(queuedBody.results[0]!.status).toBe('applied');
    expect((await meExport(get('/api/me/export'))).status).toBe(401);

    const exported = await meExport(get('/api/me/export', { cookie }));
    expect(exported.status).toBe(200);
    const file = (await exported.json()) as { version: number; snapshot: Snapshot };
    expect(file.version).toBe(1);
    expect(file.snapshot.settings.values.theme).toBe('light');
    expect(file.snapshot.lessons).toEqual({});
    Object.assign(file.snapshot, imported);

    expect(
      (await meImport(post('/api/me/import', { snapshot: { nonsense: true } }, { cookie }))).status,
    ).toBe(400);
    expect((await meImport(post('/api/me/import', { snapshot: imported }, { cookie }))).status).toBe(200);
    const after = (await (await meExport(get('/api/me/export', { cookie }))).json()) as {
      snapshot: Snapshot;
    };
    expect(after.snapshot.settings.values.theme).toBe('dark');
    expect(Object.keys(after.snapshot.lessons)).toEqual(['foundations/00-legacy-roadmap']);

    expect(
      (await meDelete(new Request(`${BASE_URL}/api/me`, { method: 'DELETE', headers: { ...headers() } })))
        .status,
    ).toBe(200);
    const erased = (await (await meExport(get('/api/me/export', { cookie }))).json()) as {
      snapshot: Snapshot;
    };
    expect(erased.snapshot).toEqual(EMPTY_SNAPSHOT);
    // A replay of an op that pre-dates the erase cannot resurrect anything else: the ledger went with the data.
    const replay = await syncPost(
      new Request(`${BASE_URL}/api/sync`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ops: [appliedOp] }),
      }),
    );
    expect(((await replay.json()) as { results: { status: string }[] }).results[0]!.status).toBe('applied');
    const resurrected = (await (await meExport(get('/api/me/export', { cookie }))).json()) as {
      snapshot: Snapshot;
    };
    expect(resurrected.snapshot.lessons).toEqual({});
  });
});
