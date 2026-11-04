// Runs the real legacy build on a temporary copy and keeps its output in .generated/legacy-dist/, so the fidelity tests
// can compare against what the legacy course actually produced. legacy/ itself is never touched. The legacy build needs
// js-yaml 4.1.0 and marked 15.0.12, which this repository pins for the same reason, so no network is needed.
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PATCHES, patchSource } from '../legacy-test.mjs';
import { LEGACY_DIR, ROOT } from './paths';

const CACHE = path.join(ROOT, '.generated', 'legacy-dist');

const skipCopy = (rel: string) => /(^|[\\/])(node_modules|dist)([\\/]|$)/.test(rel);

function fingerprint(): string {
  const hash = crypto.createHash('sha256');
  const entries = fs
    .readdirSync(LEGACY_DIR, { recursive: true, encoding: 'utf8' })
    .filter((rel) => !skipCopy(rel))
    .sort();
  for (const rel of entries) {
    const full = path.join(LEGACY_DIR, rel);
    if (fs.statSync(full).isFile()) hash.update(rel).update(fs.readFileSync(full));
  }
  return hash.digest('hex');
}

export interface LegacyDist {
  exercises: Record<string, unknown>[];
  course: LegacyCourse;
}

export interface LegacyCourse {
  lessons: Record<string, LegacyPage>;
  extra: Record<string, LegacyPage>;
  weeks: { n: number; overview: LegacyPage | null; objectives: string; fallBehind: string; notes: string }[];
  sections: Record<string, { title: string; lead: string; subs: { title: string; html: string }[] }>;
  bank: Record<string, unknown>[];
}

export interface LegacyPage {
  id: string;
  title: string;
  blocks: LegacyBlock[];
  [meta: string]: unknown;
}

export type LegacyBlock = {
  t: string;
  text?: string;
  tag?: string;
  html?: string;
  id?: string;
  props?: Record<string, unknown>;
  kind?: string;
  title?: string;
  stages?: { name: string; label: string; blocks: LegacyBlock[] }[];
  code?: string;
  notes?: Record<string, string>;
  ex?: Record<string, unknown>;
};

export function buildLegacyDist(): LegacyDist {
  const stamp = path.join(CACHE, 'fingerprint.txt');
  const current = fingerprint();
  if (!fs.existsSync(stamp) || fs.readFileSync(stamp, 'utf8') !== current) {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'dpl-legacy-build-'));
    try {
      fs.cpSync(LEGACY_DIR, work, {
        recursive: true,
        filter: (src) => !skipCopy(path.relative(LEGACY_DIR, src)),
      });
      for (const file of new Set(PATCHES.flatMap((p) => p.files))) {
        const full = path.join(work, file);
        fs.writeFileSync(full, patchSource(file, fs.readFileSync(full, 'utf8')));
      }
      fs.cpSync(path.join(ROOT, 'node_modules/js-yaml-legacy'), path.join(work, 'node_modules/js-yaml'), {
        recursive: true,
      });
      fs.cpSync(path.join(ROOT, 'node_modules/marked'), path.join(work, 'node_modules/marked'), {
        recursive: true,
      });
      const res = spawnSync(process.execPath, ['tools/build.mjs'], { cwd: work, encoding: 'utf8' });
      if (res.status !== 0) throw new Error(`legacy build failed:\n${res.stdout}\n${res.stderr}`);
      fs.mkdirSync(CACHE, { recursive: true });
      for (const name of ['exercises.json', 'course.json', 'build-report.json']) {
        fs.copyFileSync(path.join(work, 'dist', name), path.join(CACHE, name));
      }
      fs.writeFileSync(stamp, current);
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  }
  return {
    exercises: JSON.parse(fs.readFileSync(path.join(CACHE, 'exercises.json'), 'utf8')) as Record<
      string,
      unknown
    >[],
    course: JSON.parse(fs.readFileSync(path.join(CACHE, 'course.json'), 'utf8')) as LegacyCourse,
  };
}
