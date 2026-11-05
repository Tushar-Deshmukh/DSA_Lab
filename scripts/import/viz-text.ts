// The legacy visualizer files and the two kinds of change made to their text: VIEW_PATCHES, and the logged rewrites of
// date wording. Kept apart from the converter so the parity test can rebuild the reference without the compiler.
import fs from 'node:fs';
import path from 'node:path';
import { DOCS_DIR, LEGACY_DIR } from './paths';
import type { RuleId } from './rewrite-engine';
import { MODULES } from './slugs';
import { VIEW_PATCHES } from './viz-patches';

export const VIZ_DIR = path.join(LEGACY_DIR, 'src/viz');
export const VIZ_CHANGE_LOG = path.join(DOCS_DIR, 'import', 'viz-changes.json');

export const VIZ_FILES = fs
  .readdirSync(VIZ_DIR)
  .filter((f) => /^(w\d+|algo).*\.js$/.test(f))
  .sort();

export const moduleOf = (file: string): string => {
  if (file === 'algo-map.js') return 'foundations';
  const m = MODULES[Number(file.match(/^w(\d+)/)?.[1])];
  if (!m) throw new Error(`no module for ${file}`);
  return m.slug;
};

export const legacyVizText = (file: string): string => fs.readFileSync(path.join(VIZ_DIR, file), 'utf8');

export function applyViewPatches(file: string, text: string): string {
  let out = text;
  for (const [from, to] of VIEW_PATCHES[file] ?? []) {
    if (out.split(from).length !== 2) {
      throw new Error(`${file}: a view patch does not match once: ${from.slice(0, 80)}`);
    }
    out = out.replace(from, () => to);
  }
  return out;
}

export interface VizChange {
  file: string;
  /** The visualizer the text belongs to. */
  item: string;
  line: number;
  /** Offset in the legacy file after VIEW_PATCHES. */
  start: number;
  before: string;
  after: string;
  rules: RuleId[];
}

/** Applies logged changes by offset; each must find its `before` text where the log says. */
export function replayVizChanges(text: string, changes: VizChange[]): string {
  let out = text;
  for (const c of [...changes].sort((a, b) => b.start - a.start)) {
    if (out.slice(c.start, c.start + c.before.length) !== c.before) {
      throw new Error(`${c.file}:${c.line}: the log does not match the legacy text`);
    }
    out = out.slice(0, c.start) + c.after + out.slice(c.start + c.before.length);
  }
  return out;
}

export const readVizChanges = (): VizChange[] =>
  fs.existsSync(VIZ_CHANGE_LOG) ? (JSON.parse(fs.readFileSync(VIZ_CHANGE_LOG, 'utf8')) as VizChange[]) : [];
