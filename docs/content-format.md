# Content format

How the course content is stored, for anyone who edits or adds to it. `content/` is the source of truth. MongoDB holds read-optimised copies made by `npm run content:sync`. Pages are built from `content/` at build time.

The rules that are never bent are in [CLAUDE.md](../CLAUDE.md). The reasons behind this format are in [decisions.md](decisions.md): D-008 to D-012 and D-027.

## Files

```
content/
  track.yaml                         module order, titles, prerequisites, and the path-map visualizer
  modules/<NN-slug>/
    module.mdx                       overview units; frontmatter holds objectives and the short-on-time note
    lessons/<NN-slug>.mdx            lesson frontmatter and units
    lessons/<NN-slug>.yaml           that lesson's exercises and annotated code
    checkpoint.mdx, checkpoint.yaml  before, attempt and after units; not in Foundations
  theory/<module-slug>/<slug>.mdx    150 theory fragments
  patterns/<slug>.mdx                47 pattern write-ups
  handbook/<section>/index.mdx       a section's opening text
  handbook/<section>/<slug>.mdx      one subsection
  problems/bank.yaml                 173 problems and 6 extension entries
  reserved/assessments.yaml          unseen assessment problems; server-only
  reserved/mocks.yaml                mock problem pools; server-only
  reserved/gated.yaml                text a page may show only after an event; server-only
  allowlists/dates.yaml              exceptions to the date check, each with a reason
  allowlists/reserved.yaml           exceptions to the reserved-problem check, each with a reason
  ids.lock.json                      every released id, and aliases for renamed ones
  legacy-id-map.json                 legacy id → new id, for importing legacy backups
```

Nothing that reaches a page, the client or search may read `reserved/`.

## MDX

Files start with YAML frontmatter between `---` lines. The body is Markdown (with GitHub tables) plus these components. Anything else fails `npm run content:check`: other components, `import`, `export`, `{expressions}` and raw HTML.

| Component | Props | What it is |
| --- | --- | --- |
| `<Unit>` | `id`, `kind`, `title`; `phase` on checkpoints | One unit of a lesson. It wraps its content |
| `<Include>` | `id` | A theory fragment, pattern or handbook page |
| `<Viz>` | `id`; optional `title`, `input` | A visualizer. `input` is a literal object |
| `<Exercise>` | `id` | An exercise from this page's YAML file |
| `<AnnotatedCode>` | `id` | Annotated code from this page's YAML file |
| `<Callout>` | `kind` (tip, warn, key, mistake, interview); optional `title` | A note. It wraps its content |
| `<Stages>`, `<Stage>` | `title`; `name`, `label` | A worked problem in stages |
| `<Gated>` | `id` | Text from `reserved/gated.yaml`, shown only after its event |
| `<Problem>` | `num` | A bank problem |
| `<PatternLink>`, `<LessonLink>` | `slug` | Checked cross-links |
| `<Term>` | `id` | A glossary term. It always fails today, because there is no glossary until open question 7 is settled |

**Props must be literals.** Strings, numbers, booleans, arrays and plain objects are allowed. Variables, calls and spreads are not.

**Escape `{`, `}` and `<` in prose** with a backslash: `\{`, `\}`, `\<`. An unescaped `{3:0}` is valid JavaScript, so it compiles and quietly renders nothing. Inside `` `code` `` and fenced code they need no escape.

**A block component goes on its own line, with blank lines around it:**

```mdx
<Unit id="sliding-window" kind="theory" title="Sliding window">

Markdown here.

<Include id="theory/two-pointers-windows-prefix-sums/sliding-window" />

<Exercise id="ex-01" />

</Unit>
```

### Unit kinds

| Kind | Use |
| --- | --- |
| `theory`, `reference`, `complexity`, `tradeoffs`, `pattern` | Explanation |
| `code`, `visual`, `dryrun` | Worked example, visual walk-through, dry run |
| `guided` | A guided interview problem |
| `stretch` | Optional practice |
| `practice` | Exercises assembled in a Foundations lesson |
| `overview` | A module's "How this module fits together" |
| `before`, `drill`, `mock`, `after` | Checkpoint units, with `phase` set to `before`, `attempt`, `attempt` and `after` |

The warm-up, practice, summary, revision and self-check units of a lesson are not in the body. Phase 5 builds them from the frontmatter.

### Lesson frontmatter

```yaml
slug: opposite-end-two-pointers     # frozen once released
legacyId: w2d1
title: Opposite-end two pointers
goal: …                             # goal, why and revision are inline Markdown
why: …
prereqs: [ … ]                      # prereqs, outcomes, ready and summary are lists of inline Markdown
outcomes: [ … ]
ready: [ … ]
summary: [ … ]
revision: …
warmup: { problem: 48 }             # optional; or { problem: 347, note: rewritten with a heap }
topic: …
implement: …
problemsText: 'C: 125, 167 · S: 15' # the row as the learner reads it
problems:                           # the same, parsed
  - { num: 125, tier: C }
doneWhen: …
estimate: { T: 25, I: 15, P: 60, R: 15, N: 5 }
resolves: [ { problems: [322] } ]   # optional cold re-solves; several numbers mean "pick one"
mock: { id: 5, slug: mock-5, topics: … } # optional; a lesson that contains a mock
```

`estimate` keys are minutes: **T**heory, **I**mplementation, **P**ractice, **R**eview, **N**otes, and the special formats `Repair`, `Mock`, `drill`, `verbal` and `test`. Every study lesson totals 120.

### Other frontmatter

- **Checkpoint:** `slug: checkpoint`, `kind` (`drill`, `assessment` or `mock`), `gateId` (`assessment-1`, `mock-1`, … when there is an attempt to finish), the schedule fields above, and `assessment` or `mock` with the public facts. The reserved problems are never here.
- **Module:** `number`, `slug`, `title`, `legacyId`, `objectives`, `shortOnTime`, optional `notes`, and `final` in Module 12.
- **Theory, patterns and handbook:** `slug`, `title`, and `source`, which records the legacy file, section, key and line range. Patterns also have `number` and `module`.

## Exercises and annotated code

A page's YAML file has two lists:

```yaml
exercises:
  - id: ex-01                       # stable: the slug is <module>/<lesson>/ex-01
    legacyId: w2d1-1
    gatedBy: assessment-1           # optional: see Gating
    type: mcq
    tag: Concept
    q: Which statement is true?
    options:
      - { t: First option, ok: true, why: Because. }
      - { t: Second option, why: Why it is wrong., kind: concept }
    explain: The explanation.
    hints: [ The first hint. ]
annotated:
  - id: anno-01
    title: Two Sum II
    code: |
      function twoSum() {}
    notes: { 1: A note on line 1. }   # annotated notes count lines from 1
```

Every exercise has `id`, `legacyId`, `type`, `explain` and at least one hint. All but `interview` have a `tag`.

| Type | Fields |
| --- | --- |
| `mcq` | `q`, `options` (`t`, `ok`, `why`, `kind`), optional `code`, `multi` |
| `pattern` | `q`, `options`, optional `clues` |
| `complexity` | `fields` (`label`, `answer`, optional `options`, `why`), optional `q`, `code`. Without `options`, the standard list of complexities applies |
| `bug` | `q`, `code`, `bug` (line numbers **from 0**), `fine` (why other lines are fine, also from 0), `fix`, `kind` |
| `predict` | `q`, `code`, `answer`, optional `normalize: exact`, `placeholder`, `traps` |
| `fill` | `q`, `template`, `blanks` (`accept`, optional `w`), `fn`, `tests` |
| `trace` | `q`, `rows` (`prompt`, `answer`, optional `why`, `w`), optional `code`, `verify` |
| `code` | `q`, `fn`, `starter`, `solution`, `tests` |
| `interview` | `title`, `q`, `fn`, `starter`, `solution`, `tests`, `model` (`clarify`, `brute`, `optimize`, `edges`, `complexity`) |

`fill`, `code` and `interview` may also have `compare` (`sorted`, `float` or `unordered`), `adapt` and `checker`. A test has `expect` and either `args` or `ops`, and may be `hidden`. `kind` is `concept` or `impl`.

Text fields must be strings. Quote any YAML text that contains `: `, otherwise it parses as an object and the schema rejects it.

### Public and key parts

`splitExercise` in `lib/content/split.ts` divides an exercise (D-011). The public part ships with the page and is synced: question, option texts, code, starter, visible tests, hints. The key part is served one exercise at a time: correct flags, every `why` and `kind`, `explain`, `clues`, accepted answers, traps, bug lines, `fine`, `fix`, complexity and trace answers, `verify`, hidden tests, solutions and model answers.

## Gating

Some text restates a reserved problem, or is the answer to an exercise. It may be shown only after an event (D-012, D-027), and it must not be in any page payload before that.

- **An exercise** has `gatedBy: <event>`. Exercises in a checkpoint's `after` units are gated by that checkpoint's `gateId`.
- **A sentence in a page** goes in `reserved/gated.yaml`, and the page holds `<Gated id="…" />`.

Events are `assessment-1` … `assessment-6`, `mock-1` … `mock-6`, `placement` and `classification-drill`. The reserved-problem check skips gated text, and `content:sync` never writes it.

## Problems

`problems/bank.yaml` holds `num`, `title`, `url`, `difficulty`, `tier` (C, S or O), `role`, `module`, `lesson`, `pattern`, `prereq`, `why` and `hint`. Module 12 problems also have `hiddenUntilAttempted: true`, and their `pattern`, `prereq`, `why` and `hint` are not synced. An extension entry (239, 297, and diagnostic B1–B4) has `extension: true` and `usedIn` instead, and it is not one of the 173.

## Ids

Everything has a stable id, and user data refers to ids, never to array positions or titles.

| Kind | Id |
| --- | --- |
| Module | `complexity-arrays-hashing` |
| Lesson | `<module>/<lesson>`; a checkpoint is `<module>/checkpoint` |
| Unit | `<module>/<lesson>/<unit>` |
| Exercise | `<module>/<lesson>/ex-03` |
| Theory | `theory/<module>/<slug>` as an include; `theory:<module>/<slug>` in the lock |
| Pattern | `<slug>` (`patterns/<slug>` as an include) |
| Handbook | `<section>/<slug>` (`handbook/<section>/<slug>` as an include) |
| Problem | the LeetCode number |
| Visualizer | the legacy id |

Once released, an id stays. `content:check` fails in three cases:

- An id in the lock no longer exists and has no alias. **To rename:** add `"old id": "new id"` to `aliases` in `ids.lock.json`.
- An id exists that is not in the lock. **To add:** run `npm run content:lock`.
- An alias points at something that does not exist.

## The checks

`npm run content:check` runs before every build. It fails on:

| Check | What fails |
| --- | --- |
| Schema | A file does not match its Zod schema (`lib/content/schema.ts`), including an unknown field |
| MDX | A component, prop or construct outside the rules above |
| References | An include, visualizer, exercise, annotated block, gated text, problem, pattern, lesson, gate or prerequisite that does not exist; an exercise in YAML that no page shows |
| Slugs | See [Ids](#ids), and duplicates |
| Coverage | A theory fragment or pattern that no lesson includes; a module without objectives |
| Dates | Weekdays, calendar dates, years, `W3D2` codes, week, day, today, tomorrow, yesterday, month, holiday, overdue, deadline, streak, falling behind, catch up, and the old names (roadmap, Claude, Track A) in any learner-visible text, including titles, frontmatter, string props, comments in code, and gated text |
| Reserved | The title, URL slug or number of a reserved problem, or a listed paraphrase, anywhere public. Module 12 numbers in theory and patterns |
| Counts | A count differs from `lib/content/expected.ts`, which is typed by hand from [inventory.md](inventory.md). If a change is deliberate, update that file and say why |

### Allowlists

An entry in `allowlists/dates.yaml` or `allowlists/reserved.yaml` has `match` (literal text), `reason`, and optional `in`, which limits it to locations starting with that text. An entry that matches nothing fails the check, so stale ones cannot pile up.

```yaml
entries:
  - match: Daily Temperatures
    in: 'bank:739#title'
    reason: Problem 739 counts days until a warmer temperature.
```

The failure message gives the location to use in `in`.

Allowlist domain wording only: a problem about days, or a review interval such as "+7 days". Timetable wording gets rewritten.

## Changing imported text

The rule: imported text changes only to remove dates and timetable wording, to rename Week → Module, or to fix a verified error. Every change is logged, and every fixed error gets a test. `tests/content/fidelity.test.ts` replays `docs/import/changes.json` over `legacy/` and compares the result with `content/`, so an unlogged change fails.

To change imported text:

1. Add the edit to `scripts/import/rewrites-roadmap.ts` or `rewrites-content.ts`. An edit names a line and the exact text it replaces, and the importer stops if that text is not there.
2. Run `npm run content:import -- --force`. It rewrites `content/`, `docs/date-rewrites.md`, `docs/content-changes.md`, `docs/import-report.md` and `docs/import/changes.json`.
3. For a fixed error, add a test that would have caught it, and list the error in `docs/progress.md`.

`--force` replaces all of `content/`, so it can be used only while everything there comes from the importer. New material (Phase 8, open question 7) will need the importer to leave hand-written files alone, and this section will change when that arrives.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run content:check` | Run all the checks above |
| `npm run content:lock` | Add new ids to the lock |
| `npm run content:sync` | Copy the public part into MongoDB. Needs `MONGODB_URI` or `.env.local`. Running it twice changes nothing |
| `npm run content:import` | Rebuild `content/` from `legacy/`. Refuses to overwrite without `-- --force` |
