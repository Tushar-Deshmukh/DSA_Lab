// Applies the date, timetable and rename rewrites to legacy text, and records every changed line or field.
//
// Two kinds of change exist. Hand-reviewed edits name one line and the exact text they replace, and they throw if that
// text is not there, so a table can never drift from the source. Generic rules are regular expressions for wording that
// has one meaning everywhere ("Week 3", "Yesterday's"). Whatever both leave behind is judged by the date check, so a
// phrase neither of them handles fails `npm run content:check` until it is rewritten or allowlisted with a reason.

export type RuleId =
  // docs/date-rewrites.md
  | 'rename-week'
  | 'day-to-lesson'
  | 'relative-day'
  | 'relative-week'
  | 'weekday'
  | 'checkpoint'
  | 'calendar-date'
  | 'timetable'
  | 'short-on-time'
  | 'holiday'
  | 'resolve-offset'
  // docs/content-changes.md
  | 'rename-roadmap'
  | 'section-ref'
  | 'page-name'
  | 'personal'
  | 'ai-assistant'
  | 'm12-leak'
  | 'reserved-cell'
  | 'answers-gated'
  | 'module-order'
  | 'profile-rename'
  | 'trace-verify';

export const RULES: Record<RuleId, { doc: 'date' | 'content'; title: string; reason: string }> = {
  'rename-week': {
    doc: 'date',
    title: 'Week N becomes Module N',
    reason: 'The course is self-paced, and the brief renames weeks to modules.',
  },
  'day-to-lesson': {
    doc: 'date',
    title: 'Day N becomes lesson N',
    reason: 'A study day was one lesson; lessons keep the same numbers.',
  },
  'relative-day': {
    doc: 'date',
    title: 'today, yesterday and tomorrow become this, the previous and the next lesson',
    reason: 'Learners do not take one lesson per day.',
  },
  'relative-week': {
    doc: 'date',
    title: 'this week and next week become this module and the next module',
    reason: 'Learners do not take one module per week.',
  },
  weekday: {
    doc: 'date',
    title: 'Weekday names become lesson numbers',
    reason: 'Monday to Friday were lessons 1 to 5 in every week except the two holiday weeks.',
  },
  checkpoint: {
    doc: 'date',
    title: 'Saturday becomes the module checkpoint',
    reason: 'Each Saturday page becomes the checkpoint of its module (plan 5.4).',
  },
  'calendar-date': {
    doc: 'date',
    title: 'Calendar dates are removed',
    reason: 'No calendar dates appear in anything a learner sees.',
  },
  timetable: {
    doc: 'date',
    title: 'Timetable wording becomes self-paced wording',
    reason: 'The sentence depended on a fixed daily or weekly schedule. Each one was rewritten by hand.',
  },
  'short-on-time': {
    doc: 'date',
    title: 'If you fall behind becomes If you are short on time',
    reason: 'There is no schedule to fall behind. Which problems are kept or dropped is unchanged.',
  },
  holiday: {
    doc: 'date',
    title: 'Holiday notes and rows are removed',
    reason: 'They hold nothing but timetable.',
  },
  'resolve-offset': {
    doc: 'date',
    title: 'Re-solve offsets are removed',
    reason:
      'Cold re-solves are scheduled from the learner\'s own first solve, not a fixed "+N days" (plan 5.4).',
  },
  'rename-roadmap': {
    doc: 'content',
    title: 'The roadmap becomes the handbook or the course',
    reason: 'The roadmap document is now the handbook, and the plan is the course (plan 6.6).',
  },
  'section-ref': {
    doc: 'content',
    title: 'References to roadmap sections 3, 4 and 5',
    reason:
      'Those sections became module theory, lessons and the problem bank. Other section numbers stay, because the handbook keeps them.',
  },
  'page-name': {
    doc: 'content',
    title: 'Names of pages in the legacy app',
    reason: 'The legacy pages do not exist under those names in the new app.',
  },
  personal: {
    doc: 'content',
    title: 'Personal wording',
    reason: 'Plan question 6: the text was written for one person, and the course is for any learner.',
  },
  'ai-assistant': {
    doc: 'content',
    title: 'Claude becomes an AI assistant',
    reason: 'Plan question 8: the prompt is text the learner copies, and it works with any assistant.',
  },
  'm12-leak': {
    doc: 'content',
    title: 'Module 12 problems named in theory',
    reason:
      'Plan question 5c: Module 12 problems keep their pattern hidden until attempted, and these lines named them next to it.',
  },
  'reserved-cell': {
    doc: 'content',
    title: 'Reserved problems removed from public text',
    reason:
      'Assessment and mock problems stay unseen until the learner starts them (D-012). Their numbers move to content/reserved/.',
  },
  'answers-gated': {
    doc: 'content',
    title: 'Answers moved out of public pages',
    reason:
      'Answers never ship in page payloads. The text is unchanged and moves to content/reserved/gated.yaml, shown after the learner has answered.',
  },
  'module-order': {
    doc: 'content',
    title: 'Lesson 5 before the checkpoint in Modules 8 and 9',
    reason: 'Plan question 9: the sentences tied to the holiday calendar no longer match the order.',
  },
  'profile-rename': {
    doc: 'content',
    title: 'Tracks A, B and C become depth profiles',
    reason: 'The brief replaces the tracks with Foundations, Standard and Accelerated profiles.',
  },
  'trace-verify': {
    doc: 'content',
    title: 'The three missing trace-verify scripts',
    reason:
      'A trace exercise shows a reference answer, and its verify script keeps that answer honest by running reference-like code. The legacy course had no verify script for these three trace exercises; scripts written from their own code are added (plan 8.4).',
  },
};

export interface LineEdit {
  line: number;
  /** Text to replace; it must occur in the line exactly once. Null replaces the whole line. */
  from: string | null;
  /** Replacement. Null deletes the line. */
  to: string | null;
  transform?: (text: string) => string;
  rule: RuleId;
}

/** Replaces one exact piece of a line. */
export const E = (line: number, from: string, to: string, rule: RuleId): LineEdit => ({
  line,
  from,
  to,
  rule,
});
/** Replaces a whole line. */
export const L = (line: number, to: string, rule: RuleId): LineEdit => ({ line, from: null, to, rule });
/** Deletes a line. */
export const D = (line: number, rule: RuleId): LineEdit => ({ line, from: null, to: null, rule });
/** Rewrites a line with a function, for table rows whose cells are derived rather than typed. */
export const T = (line: number, transform: (text: string) => string, rule: RuleId): LineEdit => ({
  line,
  from: null,
  to: '',
  transform,
  rule,
});

interface GenericRule {
  rule: RuleId;
  re: RegExp;
  to: string;
}

/** Capitalises at the start of a line, list item or sentence, where "Day 1's steps" must become "Lesson 1's steps". */
const startsSentence = (text: string, index: number): boolean =>
  /^(\s*(?:[-*] |\d+\. )?(?:\*\*)?)$/.test(text.slice(0, index)) || /[.!?:] $/.test(text.slice(0, index));

function lessonWord(text: string, index: number, plural: boolean): string {
  const word = plural ? 'lessons' : 'lesson';
  return startsSentence(text, index) ? word[0]?.toUpperCase() + word.slice(1) : word;
}

export const GENERIC_RULES: GenericRule[] = [
  { rule: 'section-ref', re: /\bsection 3, Week (\d+)\b/g, to: 'the Module $1 theory' },
  { rule: 'rename-week', re: /\bWeek (\d+),? Day (\d+)\b/g, to: 'Module $1 lesson $2' },
  { rule: 'rename-week', re: /\bW(\d+) Day (\d+)\b/g, to: 'Module $1 lesson $2' },
  { rule: 'rename-week', re: /\bWeeks (\d+(?:[–-]\d+)?(?:, \d+)*(?:,? and \d+)?)\b/g, to: 'Modules $1' },
  { rule: 'rename-week', re: /\bWeek (\d+[–-]\d+)\b/g, to: 'Modules $1' },
  { rule: 'rename-week', re: /\bWeek (\d+)\b/g, to: 'Module $1' },
  { rule: 'day-to-lesson', re: /\bon Day (\d+)\b/g, to: 'in lesson $1' },
  { rule: 'day-to-lesson', re: /\bDays (\d+[–-]\d+)\b/g, to: 'LESSONS $1' },
  { rule: 'day-to-lesson', re: /\bDays (\d+) and (\d+)\b/g, to: 'LESSONS $1 and $2' },
  { rule: 'day-to-lesson', re: /\bDay (\d+)\b/g, to: 'LESSON $1' },
  {
    rule: 'relative-day',
    re: /\bMistakes to watch for today\b/g,
    to: 'Mistakes to watch for in this lesson',
  },
  { rule: 'relative-day', re: /\bYesterday's\b/g, to: "The previous lesson's" },
  { rule: 'relative-day', re: /\byesterday's\b/g, to: "the previous lesson's" },
  { rule: 'relative-day', re: /\(yesterday\)/g, to: '(previous lesson)' },
  { rule: 'relative-day', re: /\bToday's\b/g, to: "This lesson's" },
  { rule: 'relative-day', re: /\btoday's\b/g, to: "this lesson's" },
  { rule: 'relative-day', re: /\bfrom today\b/g, to: 'from this lesson' },
  { rule: 'relative-day', re: /\btomorrow\b/g, to: 'in the next lesson' },
  { rule: 'relative-week', re: /\bnext week's\b/g, to: "the next module's" },
  { rule: 'relative-week', re: /\bnext week\b/g, to: 'in the next module' },
  { rule: 'relative-week', re: /\bthis week's\b/g, to: "this module's" },
  { rule: 'relative-week', re: /\bThis week's\b/g, to: "This module's" },
  { rule: 'relative-week', re: /\b(from|How) this week\b/g, to: '$1 this module' },
  { rule: 'relative-week', re: /\bthis week\b/g, to: 'in this module' },
  { rule: 'relative-week', re: /\bThis week\b/g, to: 'This module' },
  { rule: 'relative-week', re: /\bthe week's\b/g, to: "the module's" },
  { rule: 'relative-week', re: /\bthe weekly re-solves\b/g, to: "the module's re-solves" },
  { rule: 'relative-week', re: /\b12 weeks\b/g, to: '12 modules' },
  { rule: 'checkpoint', re: /\bBy Saturday you can:/g, to: 'By the end of this module you can:' },
  { rule: 'checkpoint', re: /\bWeekly review\b/g, to: 'Module review' },
  { rule: 'rename-roadmap', re: /\bthe roadmap's\b/g, to: "the handbook's" },
  { rule: 'rename-roadmap', re: /\bThe roadmap's\b/g, to: "The handbook's" },
  { rule: 'rename-roadmap', re: /\bthe roadmap\b/g, to: 'the handbook' },
  { rule: 'rename-roadmap', re: /\bThe roadmap\b/g, to: 'The handbook' },
  { rule: 'ai-assistant', re: /\bClaude in a new chat\b/g, to: 'an AI assistant in a new chat' },
  { rule: 'page-name', re: /\bMock interviews page\b/g, to: 'Mocks page' },
];

/** Replaces each regular expression's matches, and resolves the LESSON markers with the right capitalisation. */
function applyGeneric(text: string, onRule: (rule: RuleId) => void): string {
  let out = text;
  for (const { rule, re, to } of GENERIC_RULES) {
    const next = out.replace(re, to);
    if (next !== out) onRule(rule);
    out = next;
  }
  // Resolved last, because capitalisation depends on the text before the match after the other rules have run.
  return out.replace(/LESSONS? /g, (marker, index: number) => {
    const plural = marker === 'LESSONS ';
    return lessonWord(out, index, plural) + ' ';
  });
}

export interface DomainPhrase {
  phrase: string;
  reason: string;
}

const MASK_BASE = 0xe000;

/** Hides phrases that are about the problem rather than the timetable, so that no generic rule rewrites them. */
export function applyGenericRules(
  text: string,
  domain: DomainPhrase[],
  onRule: (rule: RuleId) => void,
): string {
  const masked: string[] = [];
  let out = text;
  for (const { phrase } of domain) {
    if (!out.includes(phrase)) continue;
    const token = String.fromCharCode(MASK_BASE + masked.length);
    masked.push(phrase);
    out = out.split(phrase).join(token);
  }
  out = applyGeneric(out, onRule);
  masked.forEach((phrase, i) => {
    out = out.split(String.fromCharCode(MASK_BASE + i)).join(phrase);
  });
  return out;
}

export interface LineChange {
  file: string;
  line: number;
  before: string;
  /** Null when the line was deleted. */
  after: string | null;
  rules: RuleId[];
}

export interface RewriteOptions {
  file: string;
  edits: LineEdit[];
  domain: DomainPhrase[];
  /** Lines that generic rules leave alone: code, structure the parsers rely on. Edits still apply to them. */
  isExempt: (line: string, index: number, inFence: boolean) => boolean;
  /** Text at the start of a line that generic rules must not touch, such as a marker a parser looks for. */
  protectedPrefix?: (line: string) => string;
}

export interface NumberedLine {
  text: string;
  n: number;
}

/** Applies edits, then generic rules, to one file. Returns the surviving lines with their original numbers. */
export function rewriteLines(
  lines: string[],
  options: RewriteOptions,
): { lines: NumberedLine[]; changes: LineChange[] } {
  const byLine = new Map<number, LineEdit[]>();
  for (const edit of options.edits) {
    if (edit.line < 1 || edit.line > lines.length) throw new Error(`${options.file}: no line ${edit.line}`);
    byLine.set(edit.line, [...(byLine.get(edit.line) ?? []), edit]);
  }
  const out: NumberedLine[] = [];
  const changes: LineChange[] = [];
  let fence = false;
  lines.forEach((before, index) => {
    const n = index + 1;
    if (/^```/.test(before)) fence = !fence;
    const rules: RuleId[] = [];
    const note = (rule: RuleId) => {
      if (!rules.includes(rule)) rules.push(rule);
    };
    let text: string | null = before;
    for (const edit of byLine.get(n) ?? []) {
      if (text === null) throw new Error(`${options.file}:${n}: edit after the line was deleted`);
      note(edit.rule);
      if (edit.transform) text = edit.transform(text);
      else if (edit.from === null) text = edit.to;
      else {
        const count = text.split(edit.from).length - 1;
        if (count !== 1)
          throw new Error(`${options.file}:${n}: "${edit.from}" occurs ${count} times in: ${text}`);
        text = text.replace(edit.from, () => edit.to as string);
      }
    }
    if (text !== null && !options.isExempt(before, index, fence)) {
      const prefix = options.protectedPrefix?.(text) ?? '';
      text = prefix + applyGenericRules(text.slice(prefix.length), options.domain, note);
    }
    if (text !== before) changes.push({ file: options.file, line: n, before, after: text, rules });
    if (text !== null) out.push({ text, n });
  });
  return { lines: out, changes };
}

export interface FieldChange {
  file: string;
  /** Legacy exercise id, or `<lessonId>#anno-<n>` for annotated code. */
  item: string;
  path: string;
  before: string;
  after: string;
  rules: RuleId[];
}

export interface FieldEdit {
  item: string;
  path: string;
  from: string;
  to: string;
  rule: RuleId;
}
