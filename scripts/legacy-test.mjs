// Runs the legacy test suite, unchanged, on a temporary copy of legacy/ (decision D-001).
// The legacy tools build file paths with new URL(import.meta.url).pathname (C:\C:\… on Windows) and file:// URLs
// by string concatenation, so a handful of lines are rewritten in the copy. legacy/ itself is never touched.
//
//   npm run legacy:test                      build + every legacy test
//   npm run legacy:test -- --only=content,templates
//   npm run legacy:test -- --keep            keep the temporary copy for inspection
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = path.join(ROOT, 'legacy');

export const PATCHES = [
  {
    files: ['tools/build.mjs', 'tools/pdf.mjs', 'tests/content.mjs', 'tests/templates.mjs'],
    from: 'path.dirname(new URL(import.meta.url).pathname)',
    to: "path.dirname((await import('node:url')).fileURLToPath(import.meta.url))",
  },
  {
    files: ['tools/curriculum.mjs'],
    from: "new URL('../source/roadmap.md', import.meta.url).pathname",
    to: "(await import('node:url')).fileURLToPath(new URL('../source/roadmap.md', import.meta.url))",
  },
  {
    files: ['tests/ui-exercises.mjs', 'tests/behaviour.mjs', 'tests/smoke.mjs', 'tests/vizshot.mjs'],
    from: "'file://' + path.resolve('dist/dsa-pattern-lab.html')",
    to: "(await import('node:url')).pathToFileURL(path.resolve('dist/dsa-pattern-lab.html')).href",
  },
  {
    files: ['tools/pdf.mjs'],
    from: "'file://' + path.join(ROOT, 'dist/print.html')",
    to: "(await import('node:url')).pathToFileURL(path.join(ROOT, 'dist/print.html')).href",
  },
];

/** Applies every patch meant for `file`. Each must match exactly once, so a changed legacy file fails loudly. */
export function patchSource(file, text) {
  let out = text;
  for (const patch of PATCHES.filter((p) => p.files.includes(file))) {
    const count = out.split(patch.from).length - 1;
    if (count !== 1) throw new Error(`${file}: expected one occurrence of ${patch.from}, found ${count}`);
    out = out.replace(patch.from, () => patch.to);
  }
  return out;
}

/** Page ids for the layout smoke test: 73 lesson pages, 12 week pages and 15 tool pages, as in Phase 0. */
export function smokePages(course) {
  const tools = [
    'home',
    'today',
    'problems',
    'revision',
    'diagnostic',
    'overview',
    'reference',
    'method',
    'revision-system',
    'after',
    'assessments',
    'mocks',
    'scorecard',
    'checklist',
    'preferences',
  ];
  return [...Object.keys(course.lessons), ...course.weeks.map((w) => `week-${w.n}`), ...tools];
}

/** Reads the smoke test's output: every page must report overflowX <= 0, and the only console error allowed
 *  is the Google Fonts request the test blocks on purpose. */
export function judgeSmoke(output, expectedPages) {
  const rows = [...output.matchAll(/^(\S+) height \d+ overflowX (-?\d+)$/gm)].map((m) => ({
    id: m[1],
    overflow: Number(m[2]),
  }));
  const overflowing = rows.filter((r) => r.overflow > 0).map((r) => r.id);
  const errorBlock = output.includes('ERRORS:')
    ? output
        .slice(output.indexOf('ERRORS:') + 7)
        .trim()
        .split('\n')
    : [];
  const unexpected = errorBlock.filter(
    (line) => line.trim() && !/fonts\.(googleapis|gstatic)\.com|ERR_FAILED/.test(line),
  );
  const problems = [];
  if (rows.length !== expectedPages) problems.push(`checked ${rows.length} pages, expected ${expectedPages}`);
  if (overflowing.length) problems.push(`horizontal overflow on: ${overflowing.join(', ')}`);
  if (unexpected.length) problems.push(`console errors: ${unexpected.join(' | ')}`);
  return { pages: rows.length, problems };
}

function run(cmd, args, cwd, env) {
  const npmLike = process.platform === 'win32' && cmd === 'npm';
  const res = spawnSync(npmLike ? 'npm.cmd' : cmd, args, {
    cwd,
    env,
    encoding: 'utf8',
    shell: npmLike,
    maxBuffer: 256 * 1024 * 1024,
  });
  return { code: res.status ?? 1, output: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

function tail(text, lines) {
  return text.trimEnd().split('\n').slice(-lines).join('\n');
}

function main() {
  const only = process.argv
    .find((a) => a.startsWith('--only='))
    ?.slice('--only='.length)
    .split(',');
  const keep = process.argv.includes('--keep');
  const want = (name) => !only || only.includes(name);

  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'dpl-legacy-'));
  fs.cpSync(LEGACY, work, {
    recursive: true,
    filter: (src) => !/[\\/](node_modules|dist)([\\/]|$)/.test(src.slice(LEGACY.length)),
  });
  for (const file of new Set(PATCHES.flatMap((p) => p.files))) {
    const full = path.join(work, file);
    fs.writeFileSync(full, patchSource(file, fs.readFileSync(full, 'utf8')));
  }
  console.log(`legacy:test: working copy in ${work}`);

  // The browser tests load `playwright` with require(); NODE_PATH lets them use this repository's copy.
  const env = {
    ...process.env,
    NODE_PATH: path.join(ROOT, 'node_modules'),
    SHOTS: path.join(work, 'shots'),
    W: '375',
  };
  const results = [];
  const step = (name, cmd, args, judge) => {
    const started = Date.now();
    const res = run(cmd, args, work, env);
    const verdict = judge ? judge(res) : { ok: res.code === 0, note: tail(res.output, 3) };
    results.push({
      name,
      ok: verdict.ok,
      seconds: Math.round((Date.now() - started) / 1000),
      note: verdict.note,
    });
    console.log(
      `\n== ${name}: ${verdict.ok ? 'passed' : 'FAILED'} ==\n${verdict.ok ? verdict.note : tail(res.output, 40)}`,
    );
    return verdict.ok;
  };

  const ok =
    step('npm ci', 'npm', ['ci', '--no-audit', '--no-fund']) &&
    step('build', process.execPath, ['tools/build.mjs']);
  if (ok) {
    if (want('content')) step('content', process.execPath, ['tests/content.mjs']);
    if (want('templates')) step('templates', process.execPath, ['tests/templates.mjs']);
    if (want('ui')) step('ui-exercises', process.execPath, ['tests/ui-exercises.mjs', 'all']);
    if (want('behaviour')) step('behaviour', process.execPath, ['tests/behaviour.mjs']);
    if (want('smoke')) {
      const pages = smokePages(JSON.parse(fs.readFileSync(path.join(work, 'dist', 'course.json'), 'utf8')));
      step('smoke (375 px)', process.execPath, ['tests/smoke.mjs', ...pages], (res) => {
        const judged = judgeSmoke(res.output, pages.length);
        return {
          ok: res.code === 0 && judged.problems.length === 0,
          note: judged.problems.length ? judged.problems.join('; ') : `${judged.pages} pages, none overflow`,
        };
      });
    }
  }

  console.log('\nlegacy:test summary');
  for (const r of results)
    console.log(`  ${r.ok ? 'pass' : 'FAIL'}  ${r.name.padEnd(16)} ${String(r.seconds).padStart(4)} s`);
  if (!keep) fs.rmSync(work, { recursive: true, force: true });
  process.exit(results.every((r) => r.ok) && ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
