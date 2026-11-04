import { MAX_OPS_PER_REQUEST, SnapshotSchema, type OpResult, type Snapshot } from '@/lib/domain/ops';
import type { LocalStore } from './store';

// Sends the outbox to /api/sync and folds the server's answer back into the device copy (decision D-014).
// Network failures leave operations queued; the engine retries with growing pauses and as soon as the browser
// reports it is back online. A 401 means the session ended, so it stops and the interface asks to sign in again.

export type SyncPhase = 'idle' | 'syncing' | 'waiting' | 'signed-out';

export interface SyncStatus {
  phase: SyncPhase;
  pending: number;
}

const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000, 60_000];

export class SyncEngine {
  private phase: SyncPhase = 'idle';
  private pending = 0;
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private rerun = false;
  private stopped = false;
  private needsPull = true;

  constructor(
    private readonly store: LocalStore,
    private readonly onSnapshot: (snapshot: Snapshot) => void,
    private readonly onStatus: (status: SyncStatus) => void,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
  ) {}

  private readonly handleOnline = () => this.kick();

  async start(): Promise<void> {
    if (typeof window !== 'undefined') window.addEventListener('online', this.handleOnline);
    this.pending = (await this.store.readOutbox()).length;
    this.emit();
    await this.flush();
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.timer);
    if (typeof window !== 'undefined') window.removeEventListener('online', this.handleOnline);
  }

  /** Call after queueing an operation. */
  async queued(): Promise<void> {
    this.pending = (await this.store.readOutbox()).length;
    this.emit();
    this.kick(250);
  }

  kick(delayMs = 0): void {
    if (this.stopped || this.phase === 'signed-out') return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), delayMs);
  }

  /** Runs one full sync now; resolves when the outbox is empty or the engine has to wait. */
  async flush(): Promise<void> {
    if (this.stopped) return;
    if (this.running) {
      this.rerun = true;
      return;
    }
    this.running = true;
    try {
      if (this.needsPull && !(await this.pull())) return;
      for (;;) {
        const ops = await this.store.readOutbox();
        this.pending = ops.length;
        if (ops.length === 0) {
          this.setPhase('idle');
          return;
        }
        this.setPhase('syncing');
        const batch = ops.slice(0, MAX_OPS_PER_REQUEST);
        const res = await this.fetchImpl('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ ops: batch }),
        });
        if (res.status === 401) return this.signedOut();
        if (!res.ok) return this.retryLater(Number(res.headers.get('Retry-After')) * 1000 || undefined);
        const body = (await res.json()) as { results: OpResult[]; snapshot: unknown };
        const snapshot = SnapshotSchema.parse(body.snapshot);
        for (const r of body.results.filter((x) => x.status === 'rejected'))
          console.warn(`sync: the server rejected operation ${r.opId} (${r.reason ?? 'no reason'})`);
        const local = await this.store.acknowledge(
          body.results.map((r) => r.opId),
          snapshot,
        );
        this.attempt = 0;
        this.onSnapshot(local);
      }
    } catch {
      this.retryLater();
    } finally {
      this.running = false;
      if (this.rerun) {
        this.rerun = false;
        this.kick();
      }
    }
  }

  /** Fetches the account's documents and re-applies anything still queued on this device. */
  private async pull(): Promise<boolean> {
    const res = await this.fetchImpl('/api/sync', { credentials: 'same-origin' });
    if (res.status === 401) {
      this.signedOut();
      return false;
    }
    if (!res.ok) {
      this.retryLater();
      return false;
    }
    const body = (await res.json()) as { snapshot: unknown };
    const local = await this.store.acknowledge([], SnapshotSchema.parse(body.snapshot));
    this.needsPull = false;
    this.onSnapshot(local);
    return true;
  }

  private retryLater(afterMs?: number): void {
    const delay = afterMs ?? RETRY_DELAYS_MS[Math.min(this.attempt, RETRY_DELAYS_MS.length - 1)]!;
    this.attempt += 1;
    this.setPhase('waiting');
    this.kick(delay);
  }

  private signedOut(): void {
    this.setPhase('signed-out');
  }

  private setPhase(phase: SyncPhase): void {
    this.phase = phase;
    this.emit();
  }

  private emit(): void {
    this.onStatus({ phase: this.phase, pending: this.pending });
  }
}
