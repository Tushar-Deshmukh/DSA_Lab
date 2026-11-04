// `npm run content:check` (plan 6.7). Runs before every build; any problem fails it.
import fs from 'node:fs';
import path from 'node:path';
import { ContentLoadError, loadContent } from '../lib/content/load';
import { validateContent } from '../lib/content/validate';
import { CONTENT_DIR, LEGACY_DIR } from './import/paths';

/** Until the engine is ported (Phase 3), the known visualizers are the ones the legacy course defines. */
export function legacyVisualizerIds(): Set<string> {
  const dir = path.join(LEGACY_DIR, 'src/viz');
  const ids = new Set<string>();
  for (const file of fs.readdirSync(dir)) {
    if (!/^(w\d+|algo).*\.js$/.test(file)) continue;
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const m of text.matchAll(/(?:\.define|[a-z]Def)\('([\w-]+)'/g)) ids.add(m[1] as string);
  }
  return ids;
}

function main(): void {
  let problems: string[];
  try {
    problems = validateContent(loadContent(CONTENT_DIR), legacyVisualizerIds());
  } catch (err) {
    if (!(err instanceof ContentLoadError)) throw err;
    problems = err.problems;
  }
  if (problems.length) {
    for (const p of problems) console.error(p);
    console.error(`\ncontent:check found ${problems.length} problems.`);
    process.exit(1);
  }
  console.log('content:check passed.');
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join('scripts', 'validate-content.ts')))
  main();
