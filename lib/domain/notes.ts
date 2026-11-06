import './zod';
import * as z from 'zod/mini';
import { MISTAKE_CODES, type MistakeCode } from './journal';

// Notes, bookmarks, highlights, reflections and mistake log entries (plan §10). Each is a document keyed by
// a stable client-generated id, so two devices merge by the same rule everywhere: the later change wins per
// field group, creates are idempotent, deletes win over any older edit.
//
// - A note attaches to a target ({type, slug, blockId?, vizState?}) and holds Markdown.
// - A highlight is a quote wrapped again at render time {exact, prefix, suffix}; the prefix/suffix let the
//   same sentence match after an edit upstream.
// - A reflection is once per module: the four prompts plus the legacy scorecard.
// - A mistake log entry is the P/A/D/L/E/C/R tally with its source, added by the journal or by hand.

export const NOTE_TARGET_TYPES = ['lesson', 'unit', 'pattern', 'problem', 'visualizer', 'handbook'] as const;
export type NoteTargetType = (typeof NOTE_TARGET_TYPES)[number];

const MistakeCodeSchema = z.enum(MISTAKE_CODES);

export interface NoteDoc {
  id: string;
  at: number;
  createdAt: number;
  target: { type: NoteTargetType; slug: string; blockId?: string; vizState?: string };
  body: string;
}

export const NoteTargetSchema = z.object({
  type: z.enum(NOTE_TARGET_TYPES),
  slug: z.string().check(z.minLength(1), z.maxLength(200)),
  blockId: z.optional(z.string().check(z.minLength(1), z.maxLength(120))),
  vizState: z.optional(z.string().check(z.maxLength(400))),
});

export const NoteDocSchema = z.object({
  id: z.string().check(z.minLength(8), z.maxLength(64)),
  at: z.int().check(z.nonnegative()),
  createdAt: z.int().check(z.positive()),
  target: NoteTargetSchema,
  body: z.string().check(z.maxLength(8000)),
});

export type NoteDocs = Record<string, NoteDoc>;
export const NoteDocsSchema = z.record(z.string(), NoteDocSchema);

export const BOOKMARK_TARGET_TYPES = [
  'lesson',
  'unit',
  'pattern',
  'problem',
  'visualizer',
  'handbook',
] as const;
export type BookmarkTargetType = (typeof BOOKMARK_TARGET_TYPES)[number];

export interface BookmarkDoc {
  at: number;
  target: { type: BookmarkTargetType; slug: string; blockId?: string };
}

export const BookmarkDocSchema = z.object({
  at: z.int().check(z.nonnegative()),
  target: z.object({
    type: z.enum(BOOKMARK_TARGET_TYPES),
    slug: z.string().check(z.minLength(1), z.maxLength(200)),
    blockId: z.optional(z.string().check(z.minLength(1), z.maxLength(120))),
  }),
});

export const bookmarkKey = (t: { type: BookmarkTargetType; slug: string; blockId?: string }): string =>
  `${t.type}:${t.slug}${t.blockId ? `:${t.blockId}` : ''}`;

export type BookmarkDocs = Record<string, BookmarkDoc>;
export const BookmarkDocsSchema = z.record(z.string(), BookmarkDocSchema);

export interface HighlightDoc {
  at: number;
  target: { type: NoteTargetType; slug: string; blockId: string; vizState?: string };
  quote: { exact: string; prefix?: string; suffix?: string };
}

const QUOTE_MAX = 400;

export const HighlightDocSchema = z.object({
  at: z.int().check(z.nonnegative()),
  target: z.object({
    type: z.enum(NOTE_TARGET_TYPES),
    slug: z.string().check(z.minLength(1), z.maxLength(200)),
    blockId: z.string().check(z.minLength(1), z.maxLength(140)),
  }),
  quote: z.object({
    exact: z.string().check(z.minLength(1)).check(z.maxLength(QUOTE_MAX)),
    prefix: z.optional(z.string().check(z.maxLength(80))),
    suffix: z.optional(z.string().check(z.maxLength(80))),
  }),
});

export const highlightKey = (h: Pick<HighlightDoc, 'target' | 'quote'>): string => {
  const prefix = h.quote.prefix ? '|p:' + h.quote.prefix.slice(-16) : '';
  const suffix = h.quote.suffix ? '|s:' + h.quote.suffix.slice(0, 16) : '';
  return `${h.target.slug}|${h.target.blockId}|${h.quote.exact.slice(0, 64)}${prefix}${suffix}`;
};

export type HighlightDocs = Record<string, HighlightDoc>;
export const HighlightDocsSchema = z.record(z.string(), HighlightDocSchema);

export interface ReflectionDoc {
  at: number;
  module: string;
  createdAt: number;
  answers: { went?: string; hard?: string; change?: string; confidence?: string };
  /** The legacy scorecard: three hand-entered numbers per week (plan §10). */
  scorecard: { patterns?: string; approach?: string; complexityAccuracy?: string };
}

export const ReflectionDocSchema = z.object({
  at: z.int().check(z.nonnegative()),
  module: z.string().check(z.minLength(1), z.maxLength(80)),
  createdAt: z.int().check(z.positive()),
  answers: z.object({
    went: z.optional(z.string().check(z.maxLength(4000))),
    hard: z.optional(z.string().check(z.maxLength(4000))),
    change: z.optional(z.string().check(z.maxLength(4000))),
    confidence: z.optional(z.string().check(z.maxLength(200))),
  }),
  scorecard: z.object({
    patterns: z.optional(z.string().check(z.maxLength(40))),
    approach: z.optional(z.string().check(z.maxLength(40))),
    complexityAccuracy: z.optional(z.string().check(z.maxLength(40))),
  }),
});

export type ReflectionDocs = Record<string, ReflectionDoc>;
export const ReflectionDocsSchema = z.record(z.string(), ReflectionDocSchema);

export interface MistakeDoc {
  id: string;
  at: number;
  code: MistakeCode;
  source: { type: string; slug: string };
  note?: string;
}

export const MistakeDocSchema = z.object({
  id: z.string().check(z.minLength(8), z.maxLength(64)),
  at: z.int().check(z.positive()),
  code: MistakeCodeSchema,
  source: z.object({ type: z.string().check(z.maxLength(40)), slug: z.string().check(z.maxLength(200)) }),
  note: z.optional(z.string().check(z.maxLength(2000))),
});

export type MistakeDocs = Record<string, MistakeDoc>;
export const MistakeDocsSchema = z.record(z.string(), MistakeDocSchema);

// ---- note reducer-level helpers (used by the ops layer)

export function noteChanged(prev: NoteDoc | undefined, next: NoteDoc): boolean {
  if (!prev) return true;
  return (
    prev.body !== next.body ||
    prev.target.type !== next.target.type ||
    prev.target.slug !== next.target.slug ||
    prev.target.blockId !== next.target.blockId ||
    prev.target.vizState !== next.target.vizState
  );
}
