// Fails if the production dependency tree holds more than one version of the MongoDB driver or of bson
// (decision D-004): two copies would mean two connection pools and ObjectIds that fail instanceof checks.
// Test-only packages (mongodb-memory-server) may bring their own copy; they never run in the app.
import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const res = spawnSync(npm, ['ls', 'mongodb', 'bson', '--omit=dev', '--all', '--json'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
const tree = JSON.parse(res.stdout || '{}');

const versions = { mongodb: new Set(), bson: new Set() };
(function walk(node) {
  for (const [name, dep] of Object.entries(node.dependencies ?? {})) {
    if (name in versions && dep.version) versions[name].add(dep.version);
    walk(dep);
  }
})(tree);

let ok = true;
for (const [name, set] of Object.entries(versions)) {
  const list = [...set];
  if (list.length !== 1) ok = false;
  console.log(
    `${name}: ${list.length ? list.join(', ') : 'not installed'}${list.length === 1 ? '' : '  <- expected exactly one version'}`,
  );
}
process.exit(ok ? 0 : 1);
