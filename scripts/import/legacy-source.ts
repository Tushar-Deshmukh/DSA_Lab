// Reads the legacy files, applies the rewrites and parses the result. tests/content/fidelity.test.ts does not use this
// module's rewriting: it replays the logged changes over the same files, so a change the log does not hold shows up.
import fs from 'node:fs';
import path from 'node:path';
import { walkTextFields } from '../../lib/content/exercise-text';
import type { NumberedLine } from './blocks';
import { LEGACY_DIR } from './paths';
import { FIELD_EDITS, CONTENT_EDITS, PROTECTED_PHRASES } from './rewrites-content';
import { ROADMAP_EDITS } from './rewrites-roadmap';
import {
  applyGenericRules,
  rewriteLines,
  type FieldChange,
  type LineChange,
  type RuleId,
} from './rewrite-engine';

export const ROADMAP_FILE = 'source/roadmap.md';
export const CONTENT_FILES = [
  'w01',
  'w02',
  'w03',
  'w04',
  'w05',
  'w06',
  'w07',
  'w08',
  'w09',
  'w10',
  'w11',
  'w12',
  'extra',
].map((f) => `${f}.md`);

export const readLegacyLines = (file: string): string[] =>
  fs.readFileSync(path.join(LEGACY_DIR, file), 'utf8').split('\n');

/** Roadmap lines the parsers rely on, or that are never emitted. Hand-reviewed edits still apply to them. */
export function isRoadmapExempt(line: string, index: number, inFence: boolean): boolean {
  if (inFence || /^```/.test(line)) return true;
  if (index < 6) return true; // title, byline and edition note: not parsed by any section, never reach a learner
  if (/^### Week \d+ \(/.test(line)) return true;
  if (/^\| \w{3} \d+ \w{3} \| (Rest or|Holiday)/.test(line)) return true; // dropped when the schedule is emitted
  return false;
}

export function roadmapPrefix(line: string): string {
  return line.match(/^\*\*If you fall behind in Week \d+:\*\* /)?.[0] ?? '';
}

export function rewriteRoadmap(): { lines: NumberedLine[]; changes: LineChange[] } {
  return rewriteLines(readLegacyLines(ROADMAP_FILE), {
    file: ROADMAP_FILE,
    edits: ROADMAP_EDITS,
    domain: PROTECTED_PHRASES,
    isExempt: isRoadmapExempt,
    protectedPrefix: roadmapPrefix,
  });
}

export function isContentExempt(line: string, _index: number, inFence: boolean): boolean {
  return inFence || /^```/.test(line) || /^# /.test(line) || /^@pull\s/.test(line);
}

export function rewriteContentFile(file: string): { lines: NumberedLine[]; changes: LineChange[] } {
  const rel = `content/${file}`;
  return rewriteLines(readLegacyLines(rel), {
    file: rel,
    edits: CONTENT_EDITS[file] ?? [],
    domain: PROTECTED_PHRASES,
    isExempt: isContentExempt,
  });
}

// ---- exercises and annotated code: rewritten as parsed objects

export interface FieldRewriter {
  rewrite(file: string, itemId: string, item: Record<string, unknown>): void;
  changes: FieldChange[];
  /** Field edits that did not match the number of fields they were written for. */
  unmatched(): string[];
}

export function createFieldRewriter(): FieldRewriter {
  const changes: FieldChange[] = [];
  const hits = new Map(FIELD_EDITS.map((edit) => [edit, 0]));
  return {
    changes,
    rewrite(file, itemId, item) {
      const edits = FIELD_EDITS.filter((e) => e.file === file);
      const record = (p: string, before: string, after: string, rules: RuleId[]) => {
        if (before !== after)
          changes.push({ file: `content/${file}`, item: itemId, path: p, before, after, rules });
      };
      walkTextFields(item, (text, p, write) => {
        const rules: RuleId[] = [];
        let out = text;
        for (const edit of edits) {
          if (edit.codeField || !out.includes(edit.from)) continue;
          hits.set(edit, (hits.get(edit) ?? 0) + 1);
          out = out.split(edit.from).join(edit.to);
          rules.push(edit.rule);
        }
        out = applyGenericRules(out, PROTECTED_PHRASES, (rule) => {
          if (!rules.includes(rule)) rules.push(rule);
        });
        if (out !== text) write(out);
        record(p, text, out, rules);
      });
      for (const edit of edits) {
        if (!edit.codeField) continue;
        const code = item[edit.codeField];
        if (typeof code === 'string' && code.includes(edit.from)) {
          hits.set(edit, (hits.get(edit) ?? 0) + 1);
          const after = code.split(edit.from).join(edit.to);
          item[edit.codeField] = after;
          record(edit.codeField, code, after, [edit.rule]);
        }
      }
    },
    unmatched() {
      return [...hits]
        .filter(([edit, n]) => n !== (edit.count ?? 1))
        .map(([edit, n]) => `${edit.file}: "${edit.from}" matched ${n} fields, expected ${edit.count ?? 1}`);
    },
  };
}
