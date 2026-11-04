// `npm run content:sync` (plan 6.8): copies the public part of content/ into MongoDB.
// Reads MONGODB_URI from the environment, or from .env.local on a development machine.
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { z } from 'zod';
import { loadContent } from '../lib/content/load';
import { syncContent } from '../lib/content/sync';
import { CONTENT_COLLECTIONS, registerContentModels } from '../lib/db/content-models';
import { CONTENT_DIR, ROOT } from './import/paths';

async function main(): Promise<void> {
  const envFile = path.join(ROOT, '.env.local');
  if (!process.env.MONGODB_URI && fs.existsSync(envFile)) process.loadEnvFile(envFile);

  const env = z.object({ MONGODB_URI: z.string().min(1) }).safeParse(process.env);
  if (!env.success) {
    console.error('content:sync needs MONGODB_URI. Set it, or copy .env.example to .env.local.');
    process.exitCode = 1;
    return;
  }

  const conn = await mongoose.createConnection(env.data.MONGODB_URI).asPromise();
  try {
    const models = registerContentModels(conn);
    await Promise.all(CONTENT_COLLECTIONS.map((c) => models.items[c].createIndexes()));
    const result = await syncContent(models, loadContent(CONTENT_DIR), new Date());
    console.log(
      `content:sync: ${result.written} written, ${result.deleted} deleted, ${result.unchanged} unchanged.`,
    );
  } finally {
    await conn.close();
  }
}

void main();
