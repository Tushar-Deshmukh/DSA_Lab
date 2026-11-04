// The importer's own tools: the MDX escaper, the rewrite engine, YAML round trips and the time parser.
import { isDeepStrictEqual } from 'node:util';
import { dump, load } from 'js-yaml';
import legacyYaml from 'js-yaml-legacy';
import { describe, expect, it } from 'vitest';
import { parseTimeCell, totalMinutes } from '@/lib/content/estimates';
import { codeComments, walkTextFields } from '@/lib/content/exercise-text';
import { parseResolves } from '@/scripts/import/build-content';
import { CONTENT_FILES, readLegacyLines } from '@/scripts/import/legacy-source';
import { escapeForMdx, jsxAttribute } from '@/scripts/import/mdx-escape';
import { changedWindow } from '@/scripts/import/report';
import { applyGenericRules, D, E, L, rewriteLines, type RuleId } from '@/scripts/import/rewrite-engine';
import { parseSchedule } from '@/scripts/import/roadmap-parser';
import { fragmentSlug, MODULES, patternSlug, slugify, subsectionSlug } from '@/scripts/import/slugs';
import { htmlToText, legacyHtml, renderMdx } from './support';

describe('escapeForMdx', () => {
  const sameText = async (md: string) => {
    const mdx = escapeForMdx(md);
    expect(htmlToText(await renderMdx(mdx)), md).toBe(htmlToText(legacyHtml(md)));
    return mdx;
  };

  it('escapes braces and angle brackets in text', async () => {
    expect(await sameText('A map {3:0} and a < b, with c > d.')).toBe('A map \\{3:0\\} and a \\< b, with c > d.');
  });

  it('keeps a brace from compiling as an expression, which would quietly change the text', async () => {
    // Unescaped, `{3:0}` is valid JavaScript (a labelled statement) and would render as nothing.
    expect(htmlToText(await renderMdx(escapeForMdx('Use {3:0} here')))).toBe('Use {3:0} here');
  });

  it('leaves inline code alone, including double-backtick spans', async () => {
    expect(await sameText('Call `f({a: 1})` and `` a`b{c} `` now.')).toBe('Call `f({a: 1})` and `` a`b{c} `` now.');
  });

  it('leaves fenced code alone', async () => {
    const md = 'Before {x}\n\n```js\nconst a = {b: 1}; if (a < 2) {}\n```\n';
    expect(await sameText(md)).toBe('Before \\{x\\}\n\n```js\nconst a = {b: 1}; if (a < 2) {}\n```\n');
  });

  it('escapes inside table cells and list items', async () => {
    expect(await sameText('| a | b |\n| --- | --- |\n| {1} | x < y |\n')).toBe(
      '| a | b |\n| --- | --- |\n| \\{1\\} | x \\< y |\n',
    );
    expect(await sameText('- item {1}\n- item < 2\n')).toBe('- item \\{1\\}\n- item \\< 2\n');
  });

  it('does not escape twice', async () => {
    expect(await sameText('Already \\{escaped\\}.')).toBe('Already \\{escaped\\}.');
  });

  it('keeps other Markdown escapes as they are', async () => {
    expect(await sameText('About \\~2 h and \\[not a link\\].')).toBe('About \\~2 h and \\[not a link\\].');
  });

  it('refuses raw HTML, autolinks and indented code, which MDX reads differently', () => {
    expect(() => escapeForMdx('A <b>bold</b> word')).toThrow('raw HTML');
    expect(() => escapeForMdx('See <https://example.com> now')).toThrow('autolink');
    expect(() => escapeForMdx('Text\n\n    indented code\n')).toThrow('indented code');
  });

  it('writes attribute text that survives a round trip', async () => {
    const title = 'The "first" & <only> one';
    const html = await renderMdx(`<Callout kind="tip" title="${jsxAttribute(title)}">\n\nBody\n\n</Callout>`);
    expect(htmlToText(html)).toContain(`[[callout|tip|${title}]]`);
  });
});

describe('generic rules', () => {
  const run = (text: string) => {
    const rules: RuleId[] = [];
    const out = applyGenericRules(text, [{ phrase: "yesterday's values", reason: 'test' }], (r) => rules.push(r));
    return { out, rules };
  };

  it.each([
    ['See Week 7 for this', 'See Module 7 for this'],
    ['Weeks 1–3 and Weeks 4, 8 and 12', 'Modules 1–3 and Modules 4, 8 and 12'],
    ['DP (Week 10–11)', 'DP (Modules 10–11)'],
    ['(Week 1 Day 2)', '(Module 1 lesson 2)'],
    ['W4 Day 3', 'Module 4 lesson 3'],
    ['section 3, Week 6, Example 3', 'the Module 6 theory, Example 3'],
    ['You will do this on Day 5.', 'You will do this in lesson 5.'],
    ['(Days 1–3)', '(lessons 1–3)'],
    ['(Days 1 and 3)', '(lessons 1 and 3)'],
    ['- Day 1\'s four steps', '- Lesson 1\'s four steps'],
    ['Day 2 dry run', 'Lesson 2 dry run'],
    ['Days 2–4', 'Lessons 2–4'],
    ['Yesterday\'s loop', 'The previous lesson\'s loop'],
    ['from yesterday\'s loop', 'from the previous lesson\'s loop'],
    ['(yesterday)', '(previous lesson)'],
    ['Today\'s habits', 'This lesson\'s habits'],
    ['today\'s Stretch', 'this lesson\'s Stretch'],
    ['from today', 'from this lesson'],
    ['the proof tomorrow', 'the proof in the next lesson'],
    ['This week is about', 'This module is about'],
    ['problems this week turn', 'problems in this module turn'],
    ['everything from this week', 'everything from this module'],
    ['How this week fits together', 'How this module fits together'],
    ['This week\'s problems', 'This module\'s problems'],
    ['next week\'s loop', 'the next module\'s loop'],
    ['sorting next week', 'sorting in the next module'],
    ['the week\'s theory', 'the module\'s theory'],
    ['after 12 weeks', 'after 12 modules'],
    ['By Saturday you can:', 'By the end of this module you can:'],
    ['Weekly review: a drill', 'Module review: a drill'],
    ['the roadmap\'s table', 'the handbook\'s table'],
    ['The roadmap says', 'The handbook says'],
    ['or Claude in a new chat', 'or an AI assistant in a new chat'],
    ['on the Mock interviews page', 'on the Mocks page'],
    ['Mistakes to watch for today', 'Mistakes to watch for in this lesson'],
  ])('%s', (before, after) => {
    expect(run(before).out).toBe(after);
    expect(run(before).rules.length).toBeGreaterThan(0);
  });

  it('leaves protected phrases alone', () => {
    expect(run("Compute from yesterday's values and yesterday's loop").out).toBe(
      "Compute from yesterday's values and the previous lesson's loop",
    );
  });

  it('leaves unrelated words alone and reports no rule', () => {
    const text = 'Dayton is a weekly-free word, and a Weekend is not a Week number.';
    expect(run(text)).toEqual({ out: text, rules: [] });
  });
});

describe('rewriteLines', () => {
  const options = { file: 'f.md', domain: [], isExempt: (l: string, _i: number, fence: boolean) => fence || l.startsWith('# ') };

  it('applies edits, then generic rules, and logs each changed line once', () => {
    const { lines, changes } = rewriteLines(['Week 3 on Friday', 'unchanged'], {
      ...options,
      edits: [E(1, 'on Friday', 'in lesson 5', 'weekday')],
    });
    expect(lines).toEqual([
      { text: 'Module 3 in lesson 5', n: 1 },
      { text: 'unchanged', n: 2 },
    ]);
    expect(changes).toEqual([
      { file: 'f.md', line: 1, before: 'Week 3 on Friday', after: 'Module 3 in lesson 5', rules: ['weekday', 'rename-week'] },
    ]);
  });

  it('keeps original line numbers when a line is deleted, and logs the deletion', () => {
    const { lines, changes } = rewriteLines(['a', 'b', 'c'], { ...options, edits: [D(2, 'holiday')] });
    expect(lines).toEqual([
      { text: 'a', n: 1 },
      { text: 'c', n: 3 },
    ]);
    expect(changes[0]).toMatchObject({ line: 2, before: 'b', after: null });
  });

  it('replaces a whole line', () => {
    const { lines } = rewriteLines(['old'], { ...options, edits: [L(1, 'new', 'timetable')] });
    expect(lines[0]?.text).toBe('new');
  });

  it('throws when an edit no longer matches its line, so the table cannot drift', () => {
    expect(() => rewriteLines(['abc'], { ...options, edits: [E(1, 'xyz', 'q', 'weekday')] })).toThrow('occurs 0 times');
    expect(() => rewriteLines(['a a'], { ...options, edits: [E(1, 'a', 'q', 'weekday')] })).toThrow('occurs 2 times');
    expect(() => rewriteLines(['a'], { ...options, edits: [E(9, 'a', 'q', 'weekday')] })).toThrow('no line 9');
  });

  it('skips generic rules on exempt lines and inside fences, but not edits', () => {
    const { lines } = rewriteLines(['# Week 3', '```js', '// Week 3', '```', 'Week 3'], { ...options, edits: [] });
    expect(lines.map((l) => l.text)).toEqual(['# Week 3', '```js', '// Week 3', '```', 'Module 3']);
    const edited = rewriteLines(['```js', '// Week 3', '```'], {
      ...options,
      edits: [E(2, 'Week 3', 'Module 3', 'rename-week')],
    });
    expect(edited.lines[1]?.text).toBe('// Module 3');
  });

  it('respects a protected prefix, which a parser looks for', () => {
    const { lines } = rewriteLines(['**If you fall behind in Week 2:** see Week 3'], {
      ...options,
      edits: [],
      protectedPrefix: (l) => l.match(/^\*\*If you fall behind in Week \d+:\*\* /)?.[0] ?? '',
    });
    expect(lines[0]?.text).toBe('**If you fall behind in Week 2:** see Module 3');
  });
});

describe('parseTimeCell', () => {
  it.each([
    ['T30 · I25 · P45 · R15 · N5', { T: 30, I: 25, P: 45, R: 15, N: 5 }],
    ['default', { T: 25, I: 15, P: 60, R: 15, N: 5 }],
    ['T15 · P80 · R20 · N5', { T: 15, P: 80, R: 20, N: 5 }],
    ['Repair 45 · P50 · R20 · N5', { Repair: 45, P: 50, R: 20, N: 5 }],
    ['Mock 60 · P35 · R20 · N5', { Mock: 60, P: 35, R: 20, N: 5 }],
    ['P60 · drill 20 · R30 · N10', { P: 60, drill: 20, R: 30, N: 10 }],
    ['Mock 60 · verbal 30 · R20 · N10', { Mock: 60, verbal: 30, R: 20, N: 10 }],
    ['90 test · R25 · N5', { test: 90, R: 25, N: 5 }],
    ['100 test · R20', { test: 100, R: 20 }],
  ])('%s', (cell, expected) => {
    expect(parseTimeCell(cell)).toEqual(expected);
  });

  it('rejects anything else', () => {
    expect(() => parseTimeCell('about two hours')).toThrow('unparsed time cell');
  });

  it('parses every row of the legacy schedule, with every study lesson at 120 minutes and 7,200 in all', () => {
    const { weeks } = parseSchedule(readLegacyLines('source/roadmap.md'));
    const days = Object.values(weeks).flatMap((w) => w.days);
    const study = days.filter((d) => d.kind === 'study');
    expect(study).toHaveLength(60);
    for (const d of study) expect(totalMinutes(parseTimeCell(d.time)), d.date).toBe(120);
    for (const d of days.filter((x) => x.kind === 'saturday')) expect(totalMinutes(parseTimeCell(d.time))).toBeGreaterThan(0);
  });
});

describe('parseResolves', () => {
  it('reads each form the schedule uses', () => {
    expect(parseResolves('Re-solve: 54, 242, 1, 128 or 217')).toEqual([
      { problems: [54] },
      { problems: [242] },
      { problems: [1] },
      { problems: [128, 217] },
    ]);
    expect(parseResolves('Mock 1 (45 min + 15 min feedback); re-solve 90, 146, 34')).toEqual([
      { problems: [90] },
      { problems: [146] },
      { problems: [34] },
    ]);
    expect(parseResolves('C: 309 + cold re-solves 322, 62')).toEqual([{ problems: [322] }, { problems: [62] }]);
    expect(parseResolves('C: 1, 217')).toEqual([]);
    expect(parseResolves('A1 set: 1 cold re-solve + 2 unseen problems')).toEqual([]);
  });
});

describe('slugs', () => {
  it('derive from titles', () => {
    expect(slugify('6.2 `Map`, `Set` and objects')).toBe('6-2-map-set-and-objects');
    expect(fragmentSlug('Common mistakes this week')).toBe('common-mistakes');
    expect(fragmentSlug('Fast and slow pointers (Floyd)')).toBe('fast-and-slow-pointers');
    expect(fragmentSlug('Example 3')).toBe('example-3');
    expect(patternSlug('Pattern 1.1: Hash lookup ("have I seen the complement?")')).toBe('hash-lookup');
    expect(subsectionSlug('8.5 Notes format (5 minutes at the end of each lesson)')).toBe('notes-format');
  });

  it('hold no date word', () => {
    for (const m of MODULES) {
      for (const slug of [m.slug, ...m.lessons]) expect(slug).not.toMatch(/week|day|monday|saturday|sunday/);
    }
  });

  it('are valid, unique and complete: 5 lessons in each module, and the example from D-010', () => {
    const all = MODULES.flatMap((m) => m.lessons.map((l) => `${m.slug}/${l}`));
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(63);
    for (const slug of [...MODULES.map((m) => m.slug), ...MODULES.flatMap((m) => m.lessons)]) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
    expect(MODULES.slice(1).every((m) => m.lessons.length === 5)).toBe(true);
    expect(all).toContain('two-pointers-windows-prefix-sums/opposite-end-two-pointers');
  });
});

describe('text helpers', () => {
  it('walk every text field of an exercise and skip code and answers', () => {
    const seen: string[] = [];
    walkTextFields(
      {
        q: 'q',
        code: 'code',
        solution: 'solution',
        answer: 'answer',
        tag: 'tag',
        hints: ['h'],
        options: [{ t: 't', why: 'w', kind: 'concept', ok: true }],
        fields: [{ label: 'l', answer: 'a', options: ['o'], why: { 'O(n)': 'w2' } }],
        rows: [{ prompt: 'p', answer: 'a', why: 'w3' }],
        model: { brute: 'b' },
        traps: { x: 't2' },
        fine: { 1: 'f' },
        notes: { 2: 'n' },
      },
      (text, path) => seen.push(`${path}=${text}`),
    );
    expect(seen.sort()).toEqual(
      [
        'q=q',
        'tag=tag',
        'hints[0]=h',
        'options[0].t=t',
        'options[0].why=w',
        'fields[0].label=l',
        'fields[0].why.O(n)=w2',
        'rows[0].prompt=p',
        'rows[0].why=w3',
        'model.brute=b',
        'traps.x=t2',
        'fine.1=f',
        'notes.2=n',
      ].sort(),
    );
  });

  it('find comments in code, and not a URL or a division', () => {
    expect(codeComments('let a = 1; // one\n/* two */\nconst u = "http://x"; a / 2;\n// three')).toEqual(['one', 'three', 'two']);
  });

  it('trim a long change down to what changed', () => {
    const before = `${'x'.repeat(100)} Week 3 ${'y'.repeat(100)}`;
    const after = `${'x'.repeat(100)} Module 3 ${'y'.repeat(100)}`;
    const w = changedWindow(before, after, 5);
    expect(w.before).toBe('…xxxx Week 3 yy…');
    expect(w.after).toBe('…xxxx Module 3 yy…');
    expect(changedWindow('gone', null).after).toBe('(removed)');
  });
});

describe('YAML', () => {
  const blocks = CONTENT_FILES.flatMap((file) => {
    const lines = readLegacyLines(`content/${file}`);
    const out: { where: string; text: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (!/^```(ex|anno)\s*$/.test(lines[i] as string)) continue;
      const start = i + 1;
      let j = start;
      while (lines[j] !== '```') j++;
      out.push({ where: `${file}:${start}`, text: lines.slice(start, j).join('\n') });
      i = j;
    }
    return out;
  });

  it('js-yaml 5.5.0 parses every legacy block as the legacy parser (4.1.0) does, apart from one -0', () => {
    expect(blocks).toHaveLength(424); // 421 exercises and 3 annotated blocks
    const differ: string[] = [];
    for (const { where, text } of blocks) {
      const next = load(text);
      const legacy = legacyYaml.load(text);
      // JSON treats -0 as 0, so this comparison holds everywhere, and the strict one below finds the exceptions.
      expect(JSON.stringify(next), where).toBe(JSON.stringify(legacy));
      if (!isDeepStrictEqual(next, legacy)) differ.push(where);
    }
    // w01.md:307 has `args: [[0, -0]]`: 5.5.0 reads -0 and 4.1.0 reads 0. The importer reads with 4.1.0, so content/ holds
    // the 0 that the legacy course ran with. See D-008.
    expect(differ).toEqual(['w01.md:283']);
  });

  it('dump and load round-trip every legacy block', () => {
    for (const { where, text } of blocks) {
      const value = legacyYaml.load(text);
      const written = dump(value, { lineWidth: -1, noRefs: true, sortKeys: false });
      expect(load(written), where).toEqual(value);
    }
  });
});
