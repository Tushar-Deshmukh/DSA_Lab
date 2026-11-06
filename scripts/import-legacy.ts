// Converts the legacy course into content/ (plan 6.6). Run once; afterwards content/ is the source of truth, and this
// script stays in the repository so that tests/content/fidelity.test.ts can keep proving the import was faithful.
//
//   npm run content:import              refuses to overwrite an existing content/
//   npm run content:import -- --force   rebuilds content/ and the generated docs
import fs from 'node:fs';
import path from 'node:path';
import { dump } from 'js-yaml';
import { buildContent } from './import/build-content';
import { CONTENT_DIR, ROOT } from './import/paths';
import { writeImportDocs } from './import/report';

const force = process.argv.includes('--force');
if (fs.existsSync(CONTENT_DIR) && !force) {
  console.error(
    'content/ already exists and is the source of truth. Pass --force to rebuild it from legacy/.',
  );
  process.exit(1);
}

const result = buildContent();
if (result.warnings.length) {
  console.error('Import failed:');
  for (const w of result.warnings) console.error(' - ' + w);
  process.exit(1);
}

// Allowlists grow by hand after the import: scripts/import/allowlists.ts only seeds them, and the grown YAML files
// are the source of truth. A --force rebuild keeps what grew instead of undoing it.
const GROWN_ALLOWLISTS = ['allowlists/dates.yaml', 'allowlists/reserved.yaml'];
const grown = force
  ? Object.fromEntries(
      GROWN_ALLOWLISTS.map((rel) => [
        rel,
        fs.existsSync(path.join(CONTENT_DIR, rel))
          ? fs.readFileSync(path.join(CONTENT_DIR, rel), 'utf8')
          : undefined,
      ]),
    )
  : {};

fs.rmSync(CONTENT_DIR, { recursive: true, force: true });
for (const [rel, text] of result.files) {
  const file = path.join(CONTENT_DIR, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, grown[rel] ?? text);
}
writeImportDocs(result);

console.log(`Wrote ${result.files.size} files to ${path.relative(ROOT, CONTENT_DIR)}/`);
console.log(dump(result.counts, { lineWidth: -1 }));
