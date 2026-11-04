import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PATCHES, judgeSmoke, patchSource, smokePages } from '@/scripts/legacy-test.mjs';

const LEGACY = path.resolve(import.meta.dirname, '../../legacy');
const files: string[] = [...new Set((PATCHES as { files: string[] }[]).flatMap((p) => p.files))];

describe('legacy:test patches', () => {
  it.each(files)('match the real legacy file %s exactly once each', (file) => {
    const original = fs.readFileSync(path.join(LEGACY, file), 'utf8');
    const patched: string = patchSource(file, original);
    expect(patched).not.toContain('new URL(import.meta.url).pathname');
    expect(patched).not.toMatch(/'file:\/\/' \+ path/);
  });

  it('fail loudly when a pattern is missing', () => {
    expect(() => patchSource('tools/build.mjs', 'nothing to patch here')).toThrow(/expected one occurrence/);
  });
});

describe('legacy smoke parsing', () => {
  it('lists lesson, week and tool pages', () => {
    const pages: string[] = smokePages({ lessons: { w1d1: {}, w1sat: {} }, weeks: [{ n: 1 }, { n: 2 }] });
    expect(pages.slice(0, 4)).toEqual(['w1d1', 'w1sat', 'week-1', 'week-2']);
    expect(pages).toHaveLength(4 + 15);
  });

  it('passes clean output and flags overflow, missing pages and real console errors', () => {
    const clean =
      'home height 900 overflowX 0\nw1d1 height 2000 overflowX 0\nERRORS:\nerror: Failed to load resource: net::ERR_FAILED\n';
    expect(judgeSmoke(clean, 2).problems).toEqual([]);
    expect(judgeSmoke('home height 900 overflowX 12\n', 1).problems[0]).toMatch(/overflow on: home/);
    expect(judgeSmoke('home height 900 overflowX 0\n', 2).problems[0]).toMatch(/checked 1 pages/);
    expect(judgeSmoke('home height 900 overflowX 0\nERRORS:\npageerror: boom\n', 1).problems[0]).toMatch(
      /boom/,
    );
  });
});
