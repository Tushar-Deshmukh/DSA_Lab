// `npm run content:lock`: adds new ids to content/ids.lock.json. It only ever adds: a released id stays in the lock,
// so removing or renaming one fails content:check until an alias says where it went (D-010).
import fs from 'node:fs';
import path from 'node:path';
import { loadContent } from '../lib/content/load';
import { currentIds } from '../lib/content/validate';
import { CONTENT_DIR } from './import/paths';

const bundle = loadContent(CONTENT_DIR);
const locked = new Set(bundle.idsLock.ids);
const added = [...currentIds(bundle)].filter((id) => !locked.has(id));
for (const id of added) locked.add(id);
fs.writeFileSync(
  path.join(CONTENT_DIR, 'ids.lock.json'),
  JSON.stringify({ aliases: bundle.idsLock.aliases, ids: [...locked].sort() }, null, 1) + '\n',
);
console.log(added.length ? `Locked ${added.length} new ids:\n${added.join('\n')}` : 'No new ids.');
