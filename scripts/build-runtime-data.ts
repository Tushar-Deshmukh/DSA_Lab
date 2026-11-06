// `predev` and `prebuild`: writes the generated runtime data (lib/server/runtime-data.ts). Pure filesystem work,
// no database: the app builds and runs without Mongo; content:sync (search) is a separate, later step.
import path from 'node:path';
import { ContentLoadError, loadContent } from '../lib/content/load';
import { buildRuntimeData, writeRuntimeData } from '../lib/server/runtime-data';
import { CONTENT_DIR } from './import/paths';

async function main(): Promise<void> {
  let counts;
  try {
    counts = writeRuntimeData(buildRuntimeData(loadContent(CONTENT_DIR)));
  } catch (err) {
    if (!(err instanceof ContentLoadError)) throw err;
    for (const p of err.problems) console.error(p);
    console.error(`\nbuild:runtime-data found ${err.problems.length} content problems.`);
    process.exit(1);
  }
  console.log(
    `build:runtime-data: ${counts.keys} keys, ${counts.assessments} assessments, ${counts.mocks} mock pools, ` +
      `${counts.problemDetails} hidden problem notes, ${counts.gateExercises} gated exercises in ${counts.gates} gates, ` +
      `${counts.patterns} patterns, ${counts.searchEntries} search entries.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join('scripts', 'build-runtime-data.ts')))
  void main();
