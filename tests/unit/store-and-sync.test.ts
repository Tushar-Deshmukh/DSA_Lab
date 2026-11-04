import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_SNAPSHOT,
  applyOp,
  settingsOp,
  type Op,
  type Snapshot,
  type SyncResponse,
} from '@/lib/domain/ops';
import { MemoryStore } from '@/lib/client/store';
import { SyncEngine, type SyncStatus } from '@/lib/client/sync-engine';

const DEVICE = 'device-0001';
let n = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;

/** A fake /api/sync that applies operations like the real one (minus the database). */
function fakeServer() {
  let snapshot: Snapshot = EMPTY_SNAPSHOT;
  const seen = new Set<string>();
  const calls: string[] = [];
  let failNext = 0;
  let status = 200;
  const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push(method);
    if (failNext > 0) {
      failNext -= 1;
      throw new TypeError('Failed to fetch');
    }
    if (status !== 200) return new Response('{}', { status });
    if (method === 'GET') return Response.json({ snapshot });
    const { ops } = JSON.parse(String(init?.body)) as { ops: Op[] };
    const results: SyncResponse['results'] = ops.map((op) => {
      if (seen.has(op.opId)) return { opId: op.opId, status: 'duplicate' };
      const next = applyOp(snapshot, op);
      if (!next) return { opId: op.opId, status: 'rejected', reason: 'invalid value' };
      seen.add(op.opId);
      snapshot = next;
      return { opId: op.opId, status: 'applied' };
    });
    return Response.json({ results, snapshot });
  });
  return {
    fetchImpl: fetchImpl as unknown as typeof fetch,
    calls,
    get snapshot() {
      return snapshot;
    },
    failTimes: (k: number) => (failNext = k),
    respondWith: (s: number) => (status = s),
  };
}

describe('memory store', () => {
  it('queues only when asked and never twice', async () => {
    const store = new MemoryStore();
    const op = settingsOp('theme', 'dark', 1000, DEVICE, uuid());
    await store.commitOp(op, false);
    expect(await store.readOutbox()).toHaveLength(0);
    await store.commitOp(op, true);
    await store.commitOp(op, true);
    expect(await store.readOutbox()).toHaveLength(1);
    expect((await store.readSnapshot()).settings.values.theme).toBe('dark');
  });

  it('rebases what is still queued on top of the server copy', async () => {
    const store = new MemoryStore();
    const a = settingsOp('theme', 'dark', 1000, DEVICE, uuid());
    const b = settingsOp('focusMode', true, 1001, DEVICE, uuid());
    await store.commitOp(a, true);
    await store.commitOp(b, true);
    const server = applyOp(EMPTY_SNAPSHOT, a)!;
    const local = await store.acknowledge([a.opId], server);
    expect(local.settings.values).toEqual({ theme: 'dark', focusMode: true });
    expect((await store.readOutbox()).map((o) => o.opId)).toEqual([b.opId]);
  });
});

describe('sync engine', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('pulls, sends the outbox and ends idle with nothing pending', async () => {
    const server = fakeServer();
    const store = new MemoryStore();
    await store.commitOp(settingsOp('theme', 'dark', 1000, DEVICE, uuid()), true);
    const statuses: SyncStatus[] = [];
    const engine = new SyncEngine(
      store,
      () => {},
      (s) => statuses.push(s),
      server.fetchImpl,
    );
    await engine.start();
    expect(server.calls).toEqual(['GET', 'POST']);
    expect(server.snapshot.settings.values.theme).toBe('dark');
    expect(await store.readOutbox()).toHaveLength(0);
    expect(statuses.at(-1)).toEqual({ phase: 'idle', pending: 0 });
    engine.stop();
  });

  it('keeps changes queued while offline and sends them on retry', async () => {
    const server = fakeServer();
    const store = new MemoryStore();
    const engine = new SyncEngine(
      store,
      () => {},
      () => {},
      server.fetchImpl,
    );
    await engine.start();
    server.failTimes(1);
    await store.commitOp(settingsOp('focusMode', true, 1000, DEVICE, uuid()), true);
    await engine.queued();
    await vi.advanceTimersByTimeAsync(300);
    expect(await store.readOutbox()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2_100);
    expect(await store.readOutbox()).toHaveLength(0);
    expect(server.snapshot.settings.values.focusMode).toBe(true);
    engine.stop();
  });

  it('stops at 401 and reports that the session ended', async () => {
    const server = fakeServer();
    server.respondWith(401);
    const store = new MemoryStore();
    await store.commitOp(settingsOp('theme', 'dark', 1000, DEVICE, uuid()), true);
    const statuses: SyncStatus[] = [];
    const engine = new SyncEngine(
      store,
      () => {},
      (s) => statuses.push(s),
      server.fetchImpl,
    );
    await engine.start();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(statuses.at(-1)?.phase).toBe('signed-out');
    expect(server.calls).toEqual(['GET']);
    expect(await store.readOutbox()).toHaveLength(1);
    engine.stop();
  });

  it('drops rejected operations instead of retrying them forever', async () => {
    const server = fakeServer();
    const store = new MemoryStore();
    const bad: Op = {
      ...settingsOp('theme', 'dark', 1000, DEVICE, uuid()),
      payload: { key: 'theme', value: 'blue' },
    };
    await store.commitOp(bad, true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = new SyncEngine(
      store,
      () => {},
      () => {},
      server.fetchImpl,
    );
    await engine.start();
    expect(await store.readOutbox()).toHaveLength(0);
    expect(warn).toHaveBeenCalledOnce();
    engine.stop();
  });
});
