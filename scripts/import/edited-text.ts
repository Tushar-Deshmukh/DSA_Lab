// A text plus a list of insertions and replacements, with a way back from a position in the edited text to the
// original. The visualizer port edits the legacy code in several passes, and each pass reads positions from the
// TypeScript compiler, which only sees the edited text.

interface Edit {
  start: number;
  end: number;
  text: string;
  seq: number;
  /** At one position, lower goes first. */
  priority: number;
}

export interface Rendered {
  text: string;
  /** The position in the original text that a position in the edited text came from. */
  toBase: (pos: number) => number;
  /** True when the edited text from `start` to `end` all comes from the original. */
  isBase: (start: number, end: number) => boolean;
}

export class EditedText {
  private edits: Edit[] = [];
  private seq = 0;

  constructor(readonly base: string) {}

  insert(at: number, text: string, priority = 0): void {
    this.edits.push({ start: at, end: at, text, seq: this.seq++, priority });
  }

  replace(start: number, end: number, text: string): void {
    for (const e of this.edits) {
      if (e.end > e.start && start < e.end && e.start < end) {
        throw new Error(`overlapping replacements at ${start}–${end} and ${e.start}–${e.end}`);
      }
    }
    this.edits.push({ start, end, text, seq: this.seq++, priority: 0 });
  }

  /** True when a replacement already covers this position, so nothing can be inserted there. */
  covers(at: number): boolean {
    return this.edits.some((e) => e.end > e.start && at > e.start && at < e.end);
  }

  /** True when an insertion of exactly this text already sits at this position. */
  hasInsertion(at: number, text: string): boolean {
    return this.edits.some((e) => e.start === at && e.end === at && e.text === text);
  }

  render(): Rendered {
    // At one position, insertions come before a replacement, in the order they were made.
    const edits = [...this.edits].sort(
      (a, b) =>
        a.start - b.start || a.priority - b.priority || a.end - a.start - (b.end - b.start) || a.seq - b.seq,
    );
    const segments: { from: number; to: number; base: number; inserted: boolean }[] = [];
    let out = '';
    let cursor = 0;
    const push = (text: string, base: number, inserted: boolean) => {
      segments.push({ from: out.length, to: out.length + text.length, base, inserted });
      out += text;
    };
    for (const e of edits) {
      if (e.start < cursor) {
        const near = JSON.stringify(this.base.slice(Math.max(0, e.start - 40), e.start + 40));
        throw new Error(
          `edit ${JSON.stringify(e.text)} at ${e.start} falls inside an earlier replacement, near ${near}`,
        );
      }
      push(this.base.slice(cursor, e.start), cursor, false);
      push(e.text, e.start, true);
      cursor = Math.max(cursor, e.end);
    }
    push(this.base.slice(cursor), cursor, false);
    const toBase = (pos: number): number => {
      let lo = 0;
      let hi = segments.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if ((segments[mid] as { from: number }).from <= pos) lo = mid;
        else hi = mid - 1;
      }
      // An empty segment at the same position must not hide the real one after it.
      let k = lo;
      while (k + 1 < segments.length && (segments[k + 1] as { from: number }).from === pos) k++;
      const s = segments[k] as { from: number; base: number; inserted: boolean };
      return s.inserted ? s.base : s.base + (pos - s.from);
    };
    const isBase = (start: number, end: number): boolean =>
      segments.every((s) => !s.inserted || s.to <= start || s.from >= end || s.from === s.to);
    return { text: out, toBase, isBase };
  }
}
