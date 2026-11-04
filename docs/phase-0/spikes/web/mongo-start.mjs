// Starts a single-node replica set for the auth spike and keeps it running. Writes the connection string to a file.
import { createRequire } from 'node:module'; import fs from 'node:fs';
const [dir, out] = process.argv.slice(2);
const { MongoMemoryReplSet } = createRequire(dir + '/x.js')('mongodb-memory-server');
const rs = await MongoMemoryReplSet.create({ replSet: { count: 1, dbName: 'spike' }, binary: { downloadDir: dir + '/bin' } });
fs.writeFileSync(out, rs.getUri('spike'));
console.log('mongo up', rs.getUri('spike'));
setInterval(() => {}, 1e6);
