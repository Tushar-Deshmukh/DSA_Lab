import 'server-only';
import mongoose, { type Connection } from 'mongoose';
import type { Db, MongoClient } from 'mongodb';
import { serverEnv } from '@/lib/env';
import { AUTH_INDEXES, registerModels, type Models } from './models';

// One MongoDB client for the whole app (decision D-004): Mongoose and Better Auth share it, so there is one
// connection pool and one copy of the driver. Cached on globalThis so development reloads and warm serverless
// invocations reuse it.

export interface Database {
  conn: Connection;
  client: MongoClient;
  db: Db;
  models: Models;
}

const g = globalThis as typeof globalThis & { __dplDatabase?: Promise<Database> };

async function ensureIndexes(db: Db, models: Models): Promise<void> {
  await Promise.all(Object.values(models).map((m) => m.createIndexes()));
  for (const [collection, specs] of Object.entries(AUTH_INDEXES)) {
    for (const spec of specs) {
      try {
        await db.collection(collection).createIndex(spec.key, spec.options ?? {});
      } catch (err) {
        // 85/86: an equivalent index exists under another name or with other options; keep the existing one.
        const code = (err as { code?: number }).code;
        if (code !== 85 && code !== 86) throw err;
      }
    }
  }
}

async function open(): Promise<Database> {
  const env = serverEnv();
  const conn = mongoose.createConnection(env.MONGODB_URI, {
    maxPoolSize: env.MONGODB_MAX_POOL,
    serverSelectionTimeoutMS: 5000,
    autoIndex: false,
  });
  await conn.asPromise();
  const db = conn.db;
  if (!db) throw new Error('MongoDB connection opened without a database handle');
  const models = registerModels(conn);
  await ensureIndexes(db, models);
  return { conn, client: conn.getClient(), db, models };
}

export function getDatabase(): Promise<Database> {
  g.__dplDatabase ??= open().catch((err: unknown) => {
    g.__dplDatabase = undefined;
    throw err;
  });
  return g.__dplDatabase;
}

/** For tests: close the shared connection so the next call opens a new one. */
export async function closeDatabase(): Promise<void> {
  const pending = g.__dplDatabase;
  g.__dplDatabase = undefined;
  if (pending) await (await pending).conn.close();
}
