import {
  EMPTY_SNAPSHOT,
  OpSchema,
  SnapshotSchema,
  applyOp,
  rebase,
  type Op,
  type Snapshot,
} from '@/lib/domain/ops';

// The device copy of a learner's documents plus the outbox of operations not yet acknowledged by the server
// (decision D-014). One IndexedDB database per owner ('guest' or 'user-<id>'), so two people on one browser never
// mix data. Documents and outbox change in the same transaction. When IndexedDB is unavailable the store falls
// back to memory and says so (durable = false), and the interface reports "not saved".

export interface LocalStore {
  readonly durable: boolean;
  readSnapshot(): Promise<Snapshot>;
  readOutbox(): Promise<Op[]>;
  /** Applies `op` to the stored documents and, when `queue` is true, adds it to the outbox. */
  commitOp(op: Op, queue: boolean): Promise<Snapshot>;
  /** Drops acknowledged operations and stores the server's documents with the remaining ones re-applied. */
  acknowledge(opIds: readonly string[], server: Snapshot): Promise<Snapshot>;
  deviceId(): Promise<string>;
  destroy(): Promise<void>;
  close(): void;
}

const DOC_KEY = 'snapshot';

function parseSnapshot(value: unknown): Snapshot {
  const parsed = SnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : EMPTY_SNAPSHOT;
}

function parseOps(values: unknown[]): Op[] {
  return values.flatMap((v) => {
    const parsed = OpSchema.safeParse(v);
    return parsed.success ? [parsed.data] : [];
  });
}

function newDeviceId(): string {
  return crypto.randomUUID();
}

export class MemoryStore implements LocalStore {
  readonly durable = false;
  private snapshot: Snapshot = EMPTY_SNAPSHOT;
  private outbox: Op[] = [];
  private id = newDeviceId();

  async readSnapshot(): Promise<Snapshot> {
    return this.snapshot;
  }
  async readOutbox(): Promise<Op[]> {
    return [...this.outbox];
  }
  async commitOp(op: Op, queue: boolean): Promise<Snapshot> {
    this.snapshot = applyOp(this.snapshot, op) ?? this.snapshot;
    if (queue && !this.outbox.some((o) => o.opId === op.opId)) this.outbox.push(op);
    return this.snapshot;
  }
  async acknowledge(opIds: readonly string[], server: Snapshot): Promise<Snapshot> {
    const done = new Set(opIds);
    this.outbox = this.outbox.filter((o) => !done.has(o.opId));
    this.snapshot = rebase(server, this.outbox);
    return this.snapshot;
  }
  async deviceId(): Promise<string> {
    return this.id;
  }
  async destroy(): Promise<void> {
    this.snapshot = EMPTY_SNAPSHOT;
    this.outbox = [];
  }
  close(): void {}
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

class IndexedDbStore implements LocalStore {
  readonly durable = true;
  constructor(
    private readonly db: IDBDatabase,
    private readonly name: string,
  ) {}

  async readSnapshot(): Promise<Snapshot> {
    const tx = this.db.transaction('docs', 'readonly');
    return parseSnapshot(await request(tx.objectStore('docs').get(DOC_KEY)));
  }

  async readOutbox(): Promise<Op[]> {
    const tx = this.db.transaction('outbox', 'readonly');
    return parseOps(await request(tx.objectStore('outbox').getAll()));
  }

  async commitOp(op: Op, queue: boolean): Promise<Snapshot> {
    const tx = this.db.transaction(['docs', 'outbox'], 'readwrite');
    const docs = tx.objectStore('docs');
    const current = parseSnapshot(await request(docs.get(DOC_KEY)));
    const next = applyOp(current, op) ?? current;
    docs.put(next, DOC_KEY);
    if (queue) {
      const outbox = tx.objectStore('outbox');
      const existing = await request(outbox.index('opId').getKey(op.opId));
      if (existing === undefined) outbox.add(op);
    }
    await finished(tx);
    return next;
  }

  async acknowledge(opIds: readonly string[], server: Snapshot): Promise<Snapshot> {
    const tx = this.db.transaction(['docs', 'outbox'], 'readwrite');
    const outbox = tx.objectStore('outbox');
    for (const opId of opIds) {
      const key = await request(outbox.index('opId').getKey(opId));
      if (key !== undefined) outbox.delete(key);
    }
    const remaining = parseOps(await request(outbox.getAll()));
    const next = rebase(server, remaining);
    tx.objectStore('docs').put(next, DOC_KEY);
    await finished(tx);
    return next;
  }

  async deviceId(): Promise<string> {
    const tx = this.db.transaction('meta', 'readwrite');
    const meta = tx.objectStore('meta');
    let id = (await request(meta.get('deviceId'))) as string | undefined;
    if (typeof id !== 'string') {
      id = newDeviceId();
      meta.put(id, 'deviceId');
    }
    await finished(tx);
    return id;
  }

  async destroy(): Promise<void> {
    this.db.close();
    await request(indexedDB.deleteDatabase(this.name));
  }

  close(): void {
    this.db.close();
  }
}

export function storeName(owner: string): string {
  return `dsa-pattern-lab/${owner}`;
}

/** Opens the store for `owner`; falls back to memory when the browser blocks IndexedDB. */
export async function openStore(owner: string): Promise<LocalStore> {
  if (typeof indexedDB === 'undefined') return new MemoryStore();
  const name = storeName(owner);
  try {
    const open = indexedDB.open(name, 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      db.createObjectStore('docs');
      db.createObjectStore('meta');
      const outbox = db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
      outbox.createIndex('opId', 'opId', { unique: true });
    };
    return new IndexedDbStore(await request(open), name);
  } catch {
    return new MemoryStore();
  }
}
