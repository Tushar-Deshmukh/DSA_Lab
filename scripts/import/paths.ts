import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const LEGACY_DIR = path.join(ROOT, 'legacy');
export const CONTENT_DIR = path.join(ROOT, 'content');
export const DOCS_DIR = path.join(ROOT, 'docs');
/** The machine-readable change log that the fidelity tests replay over the legacy files. */
export const CHANGE_LOG = path.join(DOCS_DIR, 'import', 'changes.json');
