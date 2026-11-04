# DSA Pattern Lab: build plan

**Status: approved 2026-11-04. Phase 1 is merged; Phase 2 is waiting for review.** Answers: question 1 Better Auth; question 4 a free Vercel account and the free MongoDB Atlas tier, with the production email provider still open; question 17 the `Tushar-Deshmukh` git identity and GitHub account. All other questions take their defaults. Phase 1 (foundation) is built and tested and waiting for review; see [progress.md](progress.md). Decision numbers (D-0xx) refer to [decisions.md](decisions.md); counts come from [inventory.md](inventory.md). Open questions are in [section 16](#16-open-questions); each has the default I will follow if you agree.

## Contents

1. [Summary](#1-summary)
2. [What Phase 0 found](#2-what-phase-0-found)
3. [Architecture](#3-architecture)
4. [Repository layout](#4-repository-layout)
5. [Curriculum structure](#5-curriculum-structure)
6. [Content format and pipeline](#6-content-format-and-pipeline)
7. [Visualizer engine v2](#7-visualizer-engine-v2)
8. [Exercises, editor and runner](#8-exercises-editor-and-runner)
9. [Learning logic](#9-learning-logic)
10. [Data model](#10-data-model)
11. [Routes](#11-routes)
12. [Design system](#12-design-system)
13. [Testing and quality gates](#13-testing-and-quality-gates)
14. [Phases](#14-phases)
15. [Risks](#15-risks)
16. [Open questions](#16-open-questions)

---

## 1. Summary

- **Content first, imported once.** The importer turns the roadmap and the 13 lesson files into MDX and YAML in `content/`, with stable slugs and a `legacy-id-map.json`. Content changes are limited to removing dates, renaming Week → Module, and fixing verified errors, and every change is logged. Fidelity tests compare the result with the legacy build (D-008).
- **Static pages, user state on the device.** Every content page is prerendered. Progress lives in the browser and syncs to MongoDB through an outbox, so guests and signed-in learners share one code path and a flaky connection loses nothing (D-005, D-014).
- **Answers are not in the page.** Keys are fetched one exercise at a time after the learner answers. Reserved assessment and mock problems exist only on the server until the learner starts that checkpoint (D-011, D-012).
- **Learner code runs only in a locked-down Worker** with its own security policy: eval allowed, network and storage removed, 3 s limit (D-007).
- **Visualizers keep their tested step generators.** `run()` is ported verbatim. `render()` becomes a pure view built from shared primitives, which can be tested in Node on all 454,179 baseline steps (D-013).
- **Strict script policy without giving up static pages,** through per-page script hashes (D-006). This was tested in Chromium, Firefox and WebKit.
- **Stack:** Next.js 16.4.5, React 19.3.1, TypeScript 6.0.3, Tailwind 4.3.4, Mongoose 9.11.4 on one `mongodb` 7.7.0 driver, Zod 4.6.7, Vitest 5.1.0, Playwright 1.64.1 with axe. Authentication: **Better Auth 1.7.16 is proposed instead of Auth.js** (D-002, your choice).

## 2. What Phase 0 found

- **The inventory matches the brief.** 60 lessons, 47 patterns, 129 visualizers, 421 exercises with the stated per-type counts, 173 bank problems, and 6 assessments plus 6 mocks. The differences are listed in [inventory §2](inventory.md#2-the-briefs-table-against-what-is-there). The main ones: the files sit at the root, not in `legacy/`; there is a 13th review page (`w12final`); the content uses ten section tags, not three.
- **The legacy suite passes** in Chromium: 119,205 content checks, 62,397 template checks, 3,644 UI checks, 13 behaviour checks, and 100 pages without overflow at 375 px. It does not run on Windows as shipped.
- **The stack named in the brief needs three adjustments:**
  - Auth.js v5 is still beta, and its maintainers now recommend Better Auth for new projects.
  - TypeScript 7 and ESLint 10 break the lint toolchain.
  - The Auth.js MongoDB adapter pulls in a second MongoDB driver.
- **Next's documented static-friendly option for a strict policy doesn't work for App Router pages.** Experimental SRI leaves inline scripts blocked and pages unhydrated. Nonces force every page to render dynamically. Per-page hashes work.
- **"Unseen stays unseen" is broken today**, in ways the legacy test cannot see. The exact statements of three reserved problems sit on Saturday pages that learners see before the assessment, and five Module 12 problems are named next to their patterns in the theory or the overview ([inventory §13](inventory.md#13-unseen-leaks-missed-by-the-legacy-test)).
- **Removing dates is a real job:** 1,256 occurrences in the text plus 104 strings in visualizers, with domain phrases such as "days until warmer" that a word ban would break.
- **Some things the brief asks for have no legacy data:**
  - a mapping from problems to patterns (the bank's pattern column is free text with 164 distinct values)
  - a glossary
  - "confused with" links
  - Predict questions, Compare pairs and size parameters for the visualizers
  - `why` narration on most steps (present on 27% of them)
- **One logic bug:** the legacy `mastered()` rejects valid evidence ([inventory §15](inventory.md#15-defects-found-in-the-legacy-course)).

## 3. Architecture

### 3.1 Overview

```
BUILD TIME
content/ (MDX + YAML) ─► scripts/build-content ─► .generated/  (manifests, public exercise data,
        │                (validate, compile,       server-only answer keys and reserved problems,
        │                 split answer keys)       palette search index)
        │                                                 │
        │                                                 ▼
        │                                           next build ─► prerendered pages ─► add per-page script hashes
        └─► scripts/sync-content ─► MongoDB content copies (search, aggregation; never answers)

RUN TIME (browser)                                     RUN TIME (server)
static page (HTML + RSC) ─┐                             /api/auth/*                  Better Auth
client islands: Viz,      │  ops (outbox, IndexedDB)    /api/sync                    validated, user-scoped, idempotent
Exercise, Editor (lazy),  ├────────────────────────────► /api/exercises/{slug}/key   one answer key at a time
local store, palette      │                             /api/search                  MongoDB $text over content copies
                          │                             /api/checkpoints/{slug}/start  reserved problems on start
learner code ─► /runner/worker.js  (own policy: eval yes, network no, storage no, 3 s)
```

### 3.2 Data flow

- **Content pages** are generated at build time from `content/` and served as static files. Lesson prose renders on the server, so it ships as HTML with no JavaScript. Visualizers, exercises and the editor are client components, loaded per page.
- **User state** lives in IndexedDB as documents shaped like the server's. Every change is an operation, applied locally by the pure reducers in `lib/domain` and queued in the outbox in the same transaction. `/api/sync` applies the same reducers on the server. On sign-in, the device pulls a full snapshot (D-014).
- **Answer keys** are fetched per exercise on first check or reveal, then cached on the device (D-011).
- **Reserved problems** are returned only by the start endpoints (D-012).

### 3.3 Security

- All writes go through Route Handlers. Each one validates its input with Zod, scopes every query to the session user (repository functions take `userId` first), is rate-limited (D-023), and is idempotent by operation id.
- No secrets in client code. Environment variables are validated with Zod at start-up, and server-only modules import `server-only`.
- Content Security Policy: a header plus per-page hash policies (D-006). The runner has its own policy (D-007). Also `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, and a `Permissions-Policy` that turns off camera, microphone and geolocation.
- Session cookies are `HttpOnly` and `SameSite=Lax` (seen in the spike). `Secure` in production and the rejection of auth requests from other origins are configured and tested in Phase 1; neither was tested in Phase 0.
- Learner text (notes, journal entries) is rendered as Markdown with HTML disabled and links sanitised.
- Progress is self-reported by design (D-014). The server protects other learners' data, not the honesty of one learner's own record.

### 3.4 Accounts and guest mode

- Guests get everything, saved on the device. The status chip says "Saved on this device only".
- Sign-in: email magic link and GitHub OAuth (D-002). The first sign-in on a device with guest data merges it into the account; if both sides have data, the learner chooses how (D-014).
- Export, import and erase work for guests (locally) and for accounts (locally and on the server). Erase uses an in-page confirmation step.

### 3.5 Performance budgets and how they are met

| Budget | Approach |
| --- | --- |
| LCP < 2.5 s on a mid-range phone | Static HTML from a CDN. Prose renders on the server. Fonts are self-hosted through `next/font` with real fallback stacks |
| Lesson interactive < 3 s | Visualizers: one lazy chunk each. The editor and runner load only on code exercises. No user data is needed for first paint |
| Small initial JavaScript per route | Budget per route type, checked by `tests/e2e/budget.spec.ts`: shell pages 200 KB gzip (Phase 1 baseline 165–167 KB; D-026). Lesson pages get their own budget in Phase 5 |

## 4. Repository layout

The brief's suggested layout, with four additions marked ★.

```
app/                       routes (section 11); route handlers under app/api/
components/                shell, focus mode, palette; components/viz/ primitives; components/exercises/
lib/domain/ ★              pure, isomorphic rules: journal, scheduling, mastery, planner, checkers, merge reducers
lib/viz/                   ported step generators, view functions, references, engine
lib/exercises/             schemas, checkers, runner client, adapters
lib/content/               loaders, MDX compile, component registry, types
lib/db/                    Mongoose models, Zod schemas, repositories (all take userId)
lib/server/ ★              server-only: auth, answer keys, reserved problems, rate limits
lib/client/ ★              local store, outbox, sync loop, status chip state
lib/srs/                   FSRS wrapper and the legacy re-solve rule
public/runner/ ★           the Worker and its harness (served with their own policy)
content/                   section 6
scripts/                   import-legacy.ts, build-content.ts, validate-content.ts, sync-content.ts,
                           seed-dev.ts, csp-hashes.ts, legacy-test.mjs
tests/                     unit/, content/, viz/, e2e/
legacy/                    the original course, untouched (moved here at the start of Phase 1)
docs/                      plan, decisions, inventory, progress, content-format, date-rewrites, content-changes
.generated/                build output of scripts/build-content (gitignored)
```

The four additions:
- `lib/domain` lets the client and the server run the same rules, which the outbox design depends on.
- `lib/server` and `lib/client` make the server-only boundary visible in import paths.
- `public/runner` gives the Worker a fixed URL, which it needs for its own policy header.

## 5. Curriculum structure

### 5.1 Modules

Module titles are the legacy week titles, which already name topics (the brief's example "Module 7: Heaps, intervals and tries" is the Week 7 title). Slugs are proposed here and frozen in Phase 2.

| # | Slug | Title | Exercises | Bank | Patterns | Checkpoint |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | `foundations` | Foundations | 29 | (B1–B4) | – | Placement check (5.5) |
| 1 | `complexity-arrays-hashing` | Complexity, arrays and hashing | 48 | 14 | 4 | Review: complexity drill |
| 2 | `two-pointers-windows-prefix-sums` | Two pointers, sliding window, prefix sums, strings | 41 | 17 | 5 | Assessment 1 |
| 3 | `binary-search-sorting` | Binary search and sorting | 45 | 14 | 3 | Review: classification drill |
| 4 | `linked-lists-stacks-queues` | Linked lists, stacks, queues and monotonic stacks | 33 | 17 | 4 | Assessment 2 |
| 5 | `recursion-backtracking` | Recursion and backtracking | 29 | 15 | 4 | Mock 1 + review |
| 6 | `binary-trees-bst` | Binary trees and binary search trees | 27 | 19 | 4 | Assessment 3 |
| 7 | `heaps-intervals-tries` | Heaps, intervals and tries | 25 | 15 | 5 | Mock 2 + review |
| 8 | `graphs-traversal` | Graphs I: traversal, components, BFS shortest paths, topological sort | 24 | 16 | 5 | Assessment 4 |
| 9 | `graphs-weighted-greedy` | Graphs II (Dijkstra, Union-Find, MST) and greedy algorithms | 35 | 12 | 4 | Mock 3 + review |
| 10 | `dynamic-programming-1` | Dynamic programming I | 31 | 14 | 4 | Assessment 5 |
| 11 | `dynamic-programming-2-bits` | Dynamic programming II and bit manipulation | 31 | 14 | 5 | Mock 4 + review |
| 12 | `interview-readiness` | Mixed practice and interview readiness | 23 | 6 (+239, 297) | – | Assessment 6 + readiness checklist; Mocks 5 and 6 sit in lessons 3 and 5 |

Each module 1–12 has 5 lessons. The recommended order and the prerequisite graph come from roadmap §2 ("Dependency chain") and `algo-map.js`. They are stored in `content/track.yaml` and drawn on `/learn`. The order is advice: every lesson can be opened at any time.

### 5.2 Lessons and units

A unit is one legacy `##` section (242 in study lessons), plus units built from lesson metadata and the schedule row. The legacy order is kept.

| Legacy source | Unit kind |
| --- | --- |
| schedule "warm-up" (56 lessons) | warm-up review: re-solve problem X from a blank editor; also creates a review-queue item |
| `## … {theory}` (138), `{reference}` (3) | theory (fragments included by id, D-009) |
| `{code}` (30), `{visual}`, `{dryrun}`, `{complexity}`, `{tradeoffs}`, `{pattern}` (1 each, W2 lesson 1) | worked example, visual dry run, complexity, trade-offs, pattern (tag kept as the kind) |
| `:::stages` (1, W2 lesson 2) | worked problem in stages |
| exercises inside sections | concept checks, kept inside their unit |
| `{guided}` (57) | guided interview problem |
| `{stretch}` (9) | stretch practice, marked optional |
| schedule "Implement / dry run", "Problems", "Done when" | practice: LeetCode problems with the journal, the implementation task, and the done-when criterion |
| `@summary`, `@revision`, `@ready` | summary, revision prompt, ready-to-move-on self-check |

A lesson is **complete** when its Core exercises are solved and its self-check is ticked. Reading never marks anything mastered.

### 5.3 Time estimates

Every study lesson's legacy split totals 120 minutes. Each lesson shows "about N min", and so does each unit.

| Letter | Goes to |
| --- | --- |
| T (theory) | theory units, split by text length |
| I (implement / dry run) | worked-example, visual, dry-run and stages units, split by text length |
| P (practice, includes the 10-minute warm-up) | warm-up 10 min; guided units and the practice unit share the rest by number of problems |
| R (review of solutions and complexity) | a "review your solutions" step at the end of the practice unit |
| N (notes) | summary, revision prompt and self-check |

`default` means T25 · I15 · P60 · R15 · N5 (roadmap §4). Special formats map one-to-one: Repair → repair session, Mock → mock unit, drill → drill unit, verbal → explanation drill. A test checks that each lesson's unit estimates add up to its legacy total. Checkpoint estimates come from their own formats (for example "90 test · R25 · N5").

### 5.4 Checkpoints

Each Saturday page becomes the module's checkpoint, in three phases (D-020):

1. **Before:** the "Before you start" units.
2. **Attempt:** the assessment (Modules 2, 4, 6, 8, 10, 12), the mock (5, 7, 9, 11), or the drill (1, 3). This phase has rules, a timer, rubric scoring, the pass rule and remediation advice. Reserved problems appear only after "Start".
3. **After:** "After the assessment" and "Quick review" units, locked until the attempt is finished or explicitly skipped.

The cold re-solves become review-queue items, scheduled from the learner's own first-solve dates rather than the legacy `+N` days. The mixed review quiz is the checkpoint's own exercises (52 on Saturday pages), plus "Review this module" (§9).

A checkpoint is **recommended**, never locked, once the module's Core patterns reach Proficient.

**Modules 8 and 9:** lesson 5 comes before the checkpoint. The sentences tied to the holiday calendar are rewritten and logged.

### 5.5 Foundations module (proposal, open question 10)

Built only from existing content:

1. **Placement check** (`/placement`): diagnostic Sessions A and B, scoring, routing and targeted fixes (roadmap §1, the 12 diagnostic exercises). The answer key is shown after the learner submits. The result suggests a starting module and a depth profile, never a schedule.
2. **JavaScript for DSA:** the cost model, `Map`/`Set`, arrays and sorting, strings and numbers (roadmap 6.1–6.4, the 2 reference exercises). This is the legacy Track C pre-work.
3. **The problem-solving method:** the 14-step method, what to do when stuck, and brute force → bottleneck → optimisation (roadmap 7.1, 7.4, 7.5, the 15 method exercises).

The dependency map (`depmap` visualizer) moves to `/learn`.

### 5.6 Where every roadmap section goes

| § | New home |
| --- | --- |
| 0 | Handbook "How this course works" (wording about days rewritten) |
| 1 | Foundations: placement check; handbook copy |
| 2 | `/learn` (phases, dependency chain, prioritisation, problem budget); milestones go to the progress page and the handbook |
| 3 | 150 theory fragments and 47 patterns (D-009), included in lessons, module theory pages and the atlas. The 12 learning-objective blocks become module overviews |
| 4 | Lesson metadata (topic, warm-up, implementation task, problems, done-when, estimate) and module overviews. "If you fall behind" becomes "If you are short on time". The 11 rest-day rows ("Rest or Stretch catch-up", 2 holiday notes) hold nothing but timetable and are dropped |
| 5 | `content/problems/bank.yaml` and `/practice` |
| 6 | Handbook "JavaScript reference and templates" (19 pages, 14 also included in lessons); templates runnable |
| 7 | Handbook "Method and pattern recognition"; the 7.3 drill feeds `/patterns/drill` |
| 8 | Handbook "Revision and mistakes"; the rules run the journal and review queue; the 8.4 tracker becomes the journal form; the 8.5 notes format becomes the notes template |
| 9 | 9.1, 9.3 and 9.4 go to checkpoint and mock pages. 9.2 keeps its public metadata, and its problem lists go to `content/reserved/`. 9.5 (interviewer copy) goes to `content/reserved/` |
| 10 | Progress page (metric definitions), module reflections (weekly scorecard), handbook |
| 11 | `/readiness` (checklist and verdict) and handbook |
| 12 | Handbook "After the course" (dates rewritten) |

## 6. Content format and pipeline

### 6.1 Files

```
content/
  track.yaml                         module order, titles, slugs, prerequisite edges
  modules/<NN-slug>/
    module.mdx                       frontmatter: number, slug, title, objectives, shortOnTime, legacyId (w2);
                                     body: overview units ("How this module fits together", rewritten table)
    lessons/<NN-slug>.mdx            frontmatter (6.3) + units
    lessons/<NN-slug>.yaml           exercises and annotated code for that lesson
    checkpoint.mdx, checkpoint.yaml  before / attempt / after units and their exercises
  theory/<module-slug>/<slug>.mdx    150 fragments, each with `source` (roadmap section, fragment key, line range)
  patterns/<slug>.mdx                47 eight-part write-ups, each with `source`
  handbook/<section>/<sub>.mdx       roadmap sections 0–2, 6–8, 9 (public parts) and 10–12
  problems/bank.yaml                 173 problems plus extension entries (239, 297, B1–B4), each flagged
  reserved/assessments.yaml          server-only (D-012)
  reserved/mocks.yaml                server-only
  reserved/gated.yaml                server-only: text a page shows only after an event (D-027)
  allowlists/dates.yaml              exceptions to the date check, each with a reason
  allowlists/reserved.yaml           exceptions to the reserved check (clue words), each with a reason
  ids.lock.json                      frozen slugs and aliases (D-010)
  legacy-id-map.json                 legacy id → slug
```

### 6.2 MDX components

Only these components are allowed, with literal props. The validator rejects anything else (D-008).

| Component | Purpose |
| --- | --- |
| `<Unit id kind title core?>` | one unit (was a `##` section) |
| `<Include id>` | a theory fragment, a pattern write-up or a handbook subsection |
| `<Viz id input? title?>` | a visualizer; `input` is a literal object |
| `<Exercise id>` | an exercise from the lesson's YAML |
| `<Callout kind title?>` | tip, warn, key, mistake, interview |
| `<Stages title>` / `<Stage name label>` | worked problem in stages |
| `<AnnotatedCode id>` | annotated code from the lesson's YAML (notes keep 1-based line keys) |
| `<Problem num>` | a bank problem link with the learner's status |
| `<PatternLink slug>`, `<LessonLink slug>` | cross-links that the validator checks |
| `<Term id>` | glossary term (new content, open question 7) |
| `<Gated id>` | text from `reserved/gated.yaml`, shown after its event (added in Phase 2, D-027) |

### 6.3 Lesson frontmatter

```yaml
slug: opposite-end-two-pointers      # frozen after Phase 2 review
legacyId: w2d1
title: Opposite-end two pointers
goal: …                              # Markdown strings, imported verbatim apart from logged rewrites
why: …
prereqs: [ … ]
outcomes: [ … ]
ready: [ … ]
summary: [ … ]
revision: …
topic: …                             # schedule "Topic" cell
warmup: { problem: 1 }               # or { problem: 347, note: "rewritten with a heap" }
implement: …                         # schedule "Implement / dry run" cell
problems: [ { num: 167, tier: C } ]
doneWhen: …
estimate: { T: 25, I: 15, P: 60, R: 15, N: 5 }
```

### 6.4 Exercises

The YAML keeps the legacy schema exactly ([inventory §7](inventory.md#7-exercises-421) lists the fields beyond the brief's) and adds `id` and `legacyId`. The build splits each exercise into a public part and a key part (D-011). New types arrive in Phase 8, with schemas and integrity tests in the same style:

- **Parsons:** lines, distractors, the accepted order(s), and tests that run the assembled code.
- **Matching:** pairs, with feedback for each wrong pair.
- **Invariant:** code plus options, like an MCQ.
- **Flashcard:** front, back and source, generated from summaries, pattern clues and complexity tables, then reviewed.

### 6.5 Problems and reserved files

- `bank.yaml` holds the 173 problems: number, title, URL, difficulty, tier, role, module, lesson, the free-text pattern note and the hint.
- Each problem will also carry a `patterns:` list linking it to the 47 patterns (open question 7).
- For Module 12 problems, the pattern note and the links move to the key bundle until attempted.
- The reserved files hold §9.2 problem lists and §9.5 pools. They are compiled into a server-only module.

### 6.6 Import (`scripts/import-legacy.ts`, run once)

1. Port `tools/curriculum.mjs` and the block parser in `tools/build.mjs` to TypeScript. A test shows the port's output deep-equals the legacy parser's.
2. Write the theory, pattern and handbook files with their source references.
3. Convert each lesson to MDX through the Markdown syntax tree, and each exercise or annotated block to YAML.
4. Apply the date-rewrite rules, the Week → Module rename and the reference renames (roadmap → handbook, week page → module overview). Log every change (6.9).
5. Assign slugs, using an override table for readability. Write `ids.lock.json` and `legacy-id-map.json`.
6. Write the bank and reserved files. Reserved numbers are removed from schedule cells.
7. Produce the import report: counts per type, unparsed items (must be 0), rewrite counts, and fidelity differences (must all be logged rewrites).

Afterwards `content/` is the source of truth. The importer refuses to overwrite an existing `content/` without `--force`, and it stays in the repository to prove fidelity.

### 6.7 Validation (`npm run content:check`)

The build fails on any of these:

- **Schema errors:** frontmatter and YAML fail their Zod schemas. Text fields must be strings, which catches YAML values that parse as objects.
- **Broken references:** includes, visualizer ids, exercise ids, problems, patterns, terms, prerequisite links.
- **Slug errors:** duplicate slugs, or a slug removed or renamed without an alias in `ids.lock.json`.
- **Disallowed MDX:** components outside the registry, non-literal props, `import`, `export` or expressions.
- **Coverage:** any of the 209 fragments unused; any of the 197 missing from its legacy lesson.
- **Dates:** calendar dates, weekdays, `WnDn` codes or timetable phrases anywhere a learner sees text, including MDX, YAML text fields and visualizer titles, presets, legends and notes. Allowlist entries need a reason.
- **Reserved problems:** numbers in context, titles, URL slugs or the listed paraphrases anywhere outside `content/reserved/`. Allowlist entries need a reason.
- **Count drift:** counts differ from the expected inventory, unless the change is explained.

### 6.8 Sync (`npm run content:sync`)

Sync upserts `modules`, `lessons`, `patterns`, `exercises_public`, `problems` and `handbook`, with searchable text and a per-item `contentVersion` (a hash of the source). It deletes items that no longer exist and records the run in `content_meta`. It never writes key fields, reserved data or Module 12 patterns, and a test checks this. Running it twice changes nothing.

### 6.9 Content changes are logged

- `docs/date-rewrites.md`: every date and timetable rewrite, as rule plus occurrence: file, line, before, after.
- `docs/content-changes.md`: everything else, such as fixed errors, leak removals, the rename, personal wording and the M8/M9 order sentences. Each entry has a reason and the test that covers it.
- A test checks that the imported text equals the legacy text with exactly the logged changes applied. An unlogged change fails the build.

## 7. Visualizer engine v2

### 7.1 Port

Each visualizer becomes `lib/viz/defs/<module>/<id>.ts` (D-013):
- `run()` and `validate()` verbatim, with types;
- `view(step, input)` built from primitives;
- `inputs`, `presets`, `legend` and `code` unchanged, except logged date rewrites in preset labels and notes.

A codemod produces a first draft of every `view()`. Each is then reviewed against a screenshot of the legacy rendering. The order is module by module, references first.

### 7.2 Primitives

From the brief: array cells with pointers and windows, variables, key-value map, stack, queue/deque, call-stack frames, recursion tree, binary tree, graph (directed or undirected, weighted, box or circle nodes), grid, DP table (1-D and 2-D, with dependency highlighting), heap (array and tree), linked list, intervals, bars, bit strings.

Added because legacy visualizers use them: group rows and panel labels, chips, marks, a log-scale bar chart (`growth`), a small grid variant, and problem text. Each primitive has a typed props schema, keyboard-reachable content where it matters, and a non-colour cue for every state (§12).

### 7.3 Controls, panels and shareable state

- **Controls:** play and pause, step back and forward, a scrubber, speed, "next decision", reset. Keys: `←` `→` `space`. Clicking a code line sets a breakpoint.
- **Panels:** code with the active line highlighted; variables, with changed values marked by diffing consecutive steps; narration ("what happened" from `note`, and "why it is correct" from `why` where present); a counter.
- **Accessibility:** an ARIA live region announces each step, and a text narration log is available.
- **Shareable state:** the URL hash holds `id`, the input (base64url JSON) and the step index. Steps are recomputed, never serialised, because they can contain `Set`s.
- **Motion:** smooth transitions between steps; reduced motion switches to instant updates.

### 7.4 Modes and their scope (open question 13)

| Mode | Scope | New material needed |
| --- | --- | --- |
| Watch | all 129 | none |
| Your input, presets, random | all with inputs; random for the 126 with generators | none |
| Edge-case buttons | any visualizer whose input type has generic cases (empty, single, duplicates, all equal, sorted, reversed); a button appears only if `validate()` accepts its case | none |
| Predict | generic questions from consecutive steps (which pointer moves, which cell changes state, which item is popped) where the state has that shape; hand-written decision points for one main visualizer per pattern (47) | questions, reviewed |
| Compare | about 12 brute-force versus optimal pairs, one or two per module (`pair-brute` exists) | brute-force step generators, tested against references |
| Complexity explorer | visualizers given a size generator; plots steps against n with O(n), O(n log n) and O(n²) curves | size generators |
| Counter | counts steps and says so; a visualizer may define a real operation counter | optional |
| "Why it is correct" | shown where `why` exists (418 of 1,539 default-input steps) | none by default |

### 7.5 Gallery and loading

`/visualizers` lists all 129, filterable by module and pattern, each usable as a playground. Every visualizer is its own dynamically imported chunk. A lesson page loads only the ones it embeds, at most 5 today.

### 7.6 Tests

- References: defaults, presets and 300 random inputs. The port skips a random input only when `validate()` rejects it, and requires at least 250 of 300 accepted.
- Every step has a note and a valid code line, and `view()` produces valid primitive props. This runs in Node over all baseline runs (38,333 runs, 454,179 steps).
- Predict answers equal the actual next step. Compare pairs agree with each other and with the references.
- One screenshot per visualizer.
- axe on the gallery and on lesson pages.

## 8. Exercises, editor and runner

### 8.1 Interaction

- **Hints** come one at a time.
- **Reveal** is available after at least one hint or two wrong attempts. A revealed exercise is labelled "answer viewed" and enters the review queue, even if it is solved later.
- **Wrong answers** show the option's explanation and whether it is a concept mistake or an implementation mistake. A per-pattern tally of both kinds feeds the progress page.
- **Retry and reset** are on every exercise. Drafts are saved: choices, text and code.
- **Interview problems:** clarify → brute force → optimise → edge cases → complexity, revealed step by step. The learner writes their own text for a stage before comparing it with the model answer (legacy rule), then codes against tests.

### 8.2 Checking rules, ported exactly

- **fill:** an exact match after code normalisation, otherwise the code runs against the tests.
- **predict:** outputs normalised line by line. `exact` trims each line; the default also strips whitespace, maps `'` to `"` and lowercases. Known wrong answers get their trap message.
- **trace:** row answers, each accepting one string or a list of strings.
- **complexity:** answers must be among the offered options.
- **bug:** the line indexes (0-based); `fine` gives messages for other lines.
- **code and interview:**
  - tests: positional arguments, or `ops` for classes
  - comparison: `unordered`, `sorted` or `float` (1e-6), or a custom checker
  - adapters: arguments `list`, `tree`, `badfn`, `cycle`; return values `list`, `tree`, `nodeIndex`, `arg0`, `arg0prefix`
  - a test's `expect` may be a description when a checker decides, and the result view shows it as a description, not a value

### 8.3 Runner and editor

- The Worker from D-007, with a 3 s limit.
- Results per test: input, expected, actual, a readable diff, captured `console.log` and time. Hidden tests show as a count.
- Learners can add their own test cases. **Run** uses visible and custom tests; **Submit** adds the hidden ones, fetched with the key. Passing on Submit marks the exercise solved, unless it was revealed first.
- Editor: CodeMirror 6 (D-019), with font size and key-binding settings. Vim or Emacs bindings would add one small extension each; tell me if you want them.
- Optional after the core phases: "Trace my code" for selected exercises.

### 8.4 Tests

- Predict answers are produced by running the code.
- Every accepted fill alternative passes all tests.
- Every reference solution passes, and no starter passes.
- Trace answers match `verify`; the three missing `verify` scripts are added.
- MCQs have a correct option and explanations. Complexity answers are among the options. Bug indexes exist.
- End-to-end on every exercise: a wrong answer gets feedback, a hint appears, reset works, the right answer is accepted, and the solved state survives a reload.

## 9. Learning logic

All rules are pure functions in `lib/domain`, unit-tested, and run identically on the client and the server.

### 9.1 Problem journal and re-solves (legacy rule, D-016)

| Event | Next "ready to re-solve" |
| --- | --- |
| Attempted, not solved | after 1 day |
| First solve (with hints or independently) | after 1 day (first interval) |
| Marked "Needs revision" | after 2 days |
| Clean re-solve | next interval: 1 → 3 → 7 → 14 → 30 days |
| Re-solve with a hint | same interval again |
| Failed re-solve | after 2 days; status becomes "Needs revision" |

- **Statuses:** Not started, Attempted, Solved with hints, Solved independently, Needs revision. A viewed editorial or hint means "with hints", never independent.
- **Each attempt records** time, hint rung (§8.2 of the roadmap), outcome, mistake code (P/A/D/L/E/C/R, with its remedy from §8.3), approach, complexity, insight and notes.
- **Mastered problem:** at least three clean re-solves, each at least 7 days after the previous counted one, chosen greedily from actual dates. This fixes the legacy bug, and parity tests cover all the other legacy rules.

### 9.2 Review queue

- One queue holds flashcards and exercises (FSRS), re-solves (the rule above) and pattern drills. It is ordered by due time and capped to the time chosen.
- Warm-ups and checkpoint cold re-solves create problem items.
- Exercise outcomes become ratings: answer viewed → Again, solved after hints or wrong attempts → Hard, first try → Good.
- "Review this module" builds a quiz from the module's exercises that the learner has not answered cleanly.
- Items show as "ready", never "overdue".

### 9.3 Mastery per pattern (proposal, tuned in Phase 6)

| Level | Evidence |
| --- | --- |
| Not started | none |
| Introduced | the unit holding the pattern's write-up is completed |
| Practising | at least one concept check on the pattern right first time, or one code exercise solved |
| Proficient | the Core exercises of the pattern's lesson solved without viewing answers, and at least one bank problem of the pattern solved independently |
| Mastered | at least one bank problem of the pattern mastered (9.1), and no revealed exercise of the pattern still waiting for review |

The evidence behind each level is shown. Exercises map to patterns through the lesson that teaches the pattern (inventory §9). **Problems need the new problem-to-pattern table** (open question 7).

### 9.4 Session planner

1. The learner picks 15, 30, 60 or 90 minutes.
2. Ready reviews come first, in due order, up to about a third of the time. Estimates: flashcard 0.5 min; exercise 2–5 min by type; re-solve its legacy time box.
3. Then the next units of the current lesson, while they fit.
4. Then one practice problem, if its time box still fits.

The session can stop at any unit boundary without losing anything. Planned and actual items are saved in `study_sessions`.

### 9.5 Checkpoints, mocks, placement, readiness (legacy rules)

- **Assessment:** 10 points per problem (correct 4, with 2 if late and 1 if buggy; complexity 2; complexity stated 1; edge cases 2; brute force 1). A pass needs at least 70% of the points and at least one unseen problem fully accepted. A1–A5 pass at 21/30 and A6 at 28/40. Remediation advice comes from §9.1 and the mistake codes.
- **Mock:** the 45 + 15 minute format, 5 dimensions scored 1–4, and a pass at 14/20 with no dimension at 1 (target 15/20 in Module 12). The interviewer prompt is copyable, and the problem pool sits behind "I am the interviewer".
- **Placement:** Session A scores first-try correct answers out of 12; Session B is 5 self-scored tasks. First matching rule wins:
  1. A ≤ 5 or B ≤ 1 → Foundations profile
  2. A ≥ 10 and B ≥ 4 → Accelerated
  3. otherwise Standard

  The roadmap's targeted fixes become suggested units.
- **Depth profile:** affects Modules 1–3 as the legacy tracks did. Foundations adds the pre-work and marks Stretch optional; Accelerated skims Module 1 theory except the cost model and treats Stretch as Core. Nothing is hidden.
- **Readiness:** the 26-item checklist plus evidence. The verdict follows §11's three rows (at least 23/26 with 3 evidence items; at least 18/26 with 2; otherwise "not yet"). Also part of readiness: the 45-minute structure, abandon-and-switch, the 90-second explanation drill and the complexity drill.

### 9.6 Progress

- A mastery heat map by pattern, time studied, and **active days** (a count; nothing resets).
- The weakest patterns from evidence, with a one-click repair session: two re-solves per weak pattern plus its drills.
- Mistake trends: concept versus implementation, and the P/A/D/L/E/C/R codes with their remedies.
- Optional module reflections, which include the legacy scorecard.

## 10. Data model

Every collection has a Mongoose schema, a Zod schema and the indexes below. User collections key on `userId` (an `ObjectId`) plus a content slug, never an array position. ★ marks a change from the brief (D-015).

| Collection | Key fields | Indexes |
| --- | --- | --- |
| `users`, `sessions`, `accounts`, `verification_tokens` | Better Auth schema ★ | adapter defaults; unique `email` |
| `settings` | userId, theme, reducedMotion, editor {fontSize, keymap}, defaultSessionMinutes, depthProfile, placementResult {scoreA, scoreB, rule, profile, takenAt} ★ | unique `userId` |
| `lesson_progress` | userId, lessonSlug, status, unitsCompleted[], readyChecks[], resume {unitSlug, scrollY, viz {id, input, step}, editorDrafts}, timeSpentSec, startedAt, completedAt, contentVersion | unique `{userId, lessonSlug}` |
| `exercise_attempts` | userId, exerciseSlug, attempts, solved, firstTry, hintsUsed, revealed, revealedBeforeSolve, wrongCount, lastMistakeKind, lastAnswer, codeDraft, history[], notes ★, stageNotes ★, customTests[] ★, contentVersion ★ | unique `{userId, exerciseSlug}`; `{userId, solved}` |
| `problem_journal` | userId, problemNum, status, attempts[{at, minutes, outcome, hintRung, mistakeCode, approach, complexity, insight, notes}], notes {intuition, brute, optimized, observation, complexity, edges, mistakes, learned} ★, interval ★, cleanResolves, nextResolveAt, mastered | unique `{userId, problemNum}`; `{userId, nextResolveAt}` |
| `review_items` | userId, itemType (flashcard, exercise, problem, drill), itemSlug, due, scheduler (FSRS card or legacy interval), reps, lapses, lastReviewedAt, source ★ | `{userId, due}`; unique `{userId, itemType, itemSlug}` |
| `pattern_mastery` | userId, patternSlug, level, evidence, updatedAt (derived, recomputable) | unique `{userId, patternSlug}` |
| `study_sessions` | userId, startedAt, endedAt, plannedMinutes, items[] | `{userId, startedAt}` |
| `checkpoint_results` | userId, slug, startedAt, finishedAt, problems[{num, unseen, scores {correct, complexity, stated, edges, brute}, mistakeCodes}] ★, total, passed, notes | `{userId, slug}` |
| `mock_results` | userId, slug, startedAt, scores [5], total, passed, feedback | `{userId, slug}` |
| `notes` | userId, target {type, slug, blockId, vizState?}, body (Markdown), createdAt, updatedAt | `{userId, "target.slug"}`; text `{userId, body}` ★ (scoped) |
| `bookmarks` | userId, target {type, slug, blockId?}, createdAt | unique `{userId, target.type, target.slug, target.blockId}` |
| `highlights` | userId, target {slug, blockId}, quote {exact, prefix, suffix} ★, createdAt | `{userId, "target.slug"}` |
| `reflections` | userId, moduleSlug, answers {went, hard, change, confidence}, scorecard {patterns, approach, complexityAccuracy} ★, createdAt | `{userId, moduleSlug}` |
| `readiness` ★ | userId, items {id: boolean}, evidence[], verdict, updatedAt | unique `userId` |
| `mistakes` ★ | userId, at, code, source {type, slug}, note | `{userId, at}` |
| `sync_ops` ★ | userId, opId, appliedAt (TTL 30 days) | unique `{userId, opId}`; TTL |
| `rate_limits` ★ | key, windowStart, count (TTL) | unique `{key, windowStart}`; TTL |
| `modules`, `lessons`, `patterns`, `exercises_public`, `problems`, `handbook` | slug, title, searchable text, contentVersion ★; never answers, reserved problems or Module 12 patterns | unique `slug`; text |
| `content_meta` ★ | version, syncedAt, counts | – |

**Legacy backup import** (`dsa-course-v1`), mapped through `legacy-id-map.json`. Unmapped items are listed for the learner.

| Legacy key | Goes to |
| --- | --- |
| `lessons` | `lesson_progress` |
| `ex` | `exercise_attempts` (drafts and notes included; the `-rq` review-quiz records are reported, not imported) |
| `journal` | `problem_journal` (each `resolves[]` entry becomes an attempt; the 8 text fields go to `notes`) |
| `mistakes` | `mistakes` |
| `reflections`, `scorecards` | `reflections` |
| `diag` | `settings.placementResult` |
| `assess` | `checkpoint_results` |
| `mocks` | `mock_results` |
| `checklist` | `readiness` |
| `settings` | theme and depth profile kept; `startDate` dropped (no dates) |

## 11. Routes

All page routes are prerendered (D-005). "Local" means the route reads user state from the device store.

| Route | Content | User data |
| --- | --- | --- |
| `/` | Continue card, session planner, ready-to-review count, mastery summary | local |
| `/placement` | Foundations placement check | local |
| `/learn` | path map (prerequisite graph, mastery per pattern) | local |
| `/learn/[module]` | module overview: why it matters, outcomes, lessons with estimates, Core and Stretch, short-on-time guidance, checkpoint | local |
| `/learn/[module]/[lesson]` | lesson in focus mode; `?unit=` read on the client | local (resume) |
| `/learn/[module]/checkpoint` | rules, timer, rubric; problems after Start (`/api/checkpoints/[slug]/start`) | local |
| `/handbook`, `/handbook/[...slug]` | roadmap sections, module theory pages, cheat sheets (print stylesheet) | – |
| `/patterns`, `/patterns/[slug]`, `/patterns/drill` | atlas, write-up, visualizers, template, exercises, problems, mastery, confused-with; the drill | local |
| `/visualizers`, `/visualizers/[id]` | gallery and playgrounds; state in the URL hash | – |
| `/practice`, `/practice/[num]` | bank with filters; problem page with journal | local |
| `/review` | review queue; `?module=` for "Review this module" | local |
| `/checkpoints`, `/mocks`, `/mocks/[slug]` | lists; mock page with the interviewer confirmation | local |
| `/progress` | heat map, time, active days, weakest patterns, mistake trends, reflections | local |
| `/readiness` ★ | interview-readiness checklist and verdict (brief 5.10, which lists no route) | local |
| `/notes`, `/bookmarks` | grouped by module | local |
| `/settings`, `/settings/data` | preferences; export, import, legacy import, erase | local |
| `/sign-in` | magic link and GitHub | – |
| `/api/auth/[...all]` | Better Auth | server |
| `/api/sync` (GET snapshot, POST ops) | sync (D-014) | server |
| `/api/exercises/[slug]/key` | answer key for one exercise (D-011) | server |
| `/api/search` | full-text search (D-017) | server |
| `/api/checkpoints/[slug]/start`, `/api/mocks/[slug]/pool` | reserved problems (D-012) | server |
| `/api/me/export`, `/api/me/import`, `DELETE /api/me` | account data | server |
| `/api/health` | readiness probe for deploys and tests | server |
| `/runner/*` | the Worker, with its own policy (D-007) | – |

## 12. Design system

- **Tokens:** start from the legacy values. Light: paper `#f5f6f2`, sheet `#fff`, ink `#18222b` / `#4a5763` / `#7b8792`, rule `#d9ded8` / `#e8ebe6`, accent `#0d6670`. Dark: the legacy dark set from `src/styles.css`. They are defined once as CSS variables and used through Tailwind (D-018). The theme follows the system setting unless the learner overrides it.
- **Visualizer states:** each has a colour and a cue that works without colour.

  | State | Colour | Cue without colour |
  | --- | --- | --- |
  | current | `#2f5bd3` | thick solid outline |
  | compare | `#c97a00` | dashed outline |
  | done | `#2e8a4e` | check mark |
  | frontier | `#8a4fc7` | dotted outline |
  | error | `#c2362f` | cross mark |
  | dim | `#a7b0b8` | lowered contrast |
  | window | `#e7b416` | bracket under the range |
  | wall | ink-2 | hatching |

  The legend names each state, and screen readers get the state as text. Contrast is checked for both themes in Phase 1.
- **Type:** Literata for reading, IBM Plex Sans for the interface, JetBrains Mono for code, through `next/font`. The files are downloaded at build time and served from our own origin, so learners' browsers never contact Google.
- **Layout:**
  - a reading column of about 72 characters (legacy `--read: 72ch`), generous line height, `tabular-nums` in tables and counters;
  - on desktop, the visualizer or editor sits beside the column when a unit needs one;
  - on phones, one unit per screen, the editor opens as a full-screen sheet, and visualizer panels stack;
  - usable at 360 px; wide tables, code and diagrams scroll inside their own containers, never the page.
- **Restraint:** completions get a short, calm confirmation; no confetti and no sounds. Transitions last 150–250 ms and drop to instant with reduced motion.
- **Focus mode:** no sidebar, a thin progress line, keyboard navigation (`j`/`k` or arrow keys, `?` for all shortcuts), and resume.

## 13. Testing and quality gates

### 13.1 Legacy tests and where they go

| Legacy | What it checks | New test |
| --- | --- | --- |
| `tests/content.mjs`, visualizer part | defaults, presets and 300 random inputs against references; every step has a note and a valid line | `tests/viz/references.test.ts` (Vitest), plus `view()` prop validation, explicit `validate()` skips and at least 250/300 accepted |
| `tests/content.mjs`, exercise part | text types, MCQ correctness, complexity options, bug indexes, predict by running, fill alternatives, solutions pass, starters fail, trace `verify`, reserved numbers, fragment coverage | `tests/content/*.test.ts`, plus the stronger reserved scan, dates with allowlist, slug lock and the fidelity checks |
| `tests/refs.mjs` | brute-force references | `lib/viz/refs/*.ts` (7 strengthened) |
| `tests/templates.mjs` | 16 template blocks on random inputs (62,397 checks) | `tests/templates/*.test.ts` |
| `tests/ui-exercises.mjs` | every exercise in the browser (3,644 checks) | `tests/e2e/exercises.spec.ts`, plus persistence through a test database, sharded in CI |
| `tests/behaviour.mjs` | 13 app behaviours | `tests/e2e/behaviour.spec.ts`; each legacy check mapped or retired with a reason in `docs/progress.md` |
| `tests/smoke.mjs` | no overflow at 375 px | `tests/e2e/layout.spec.ts` at 360 px on every lesson page, plus axe on every route type |
| `tests/vizshot.mjs` | screenshot helper | `tests/e2e/viz-visual.spec.ts` |

The legacy suite itself keeps running unchanged through `npm run legacy:test`, until the ported suite covers everything it covers.

### 13.2 New checks

- Policy tests in three browsers (D-006).
- Runner isolation (D-007).
- Reserved problems absent from the build output (D-012).
- Sync idempotency, merge rules, and guest-to-account merge.
- Export → erase → import round trip.
- Legacy backup import, using a fixture produced by driving the legacy app with Playwright.
- Revealed-solution labelling, focus-mode resume, and the session planner.
- A single `mongodb` version in the install.
- Route-size budgets.

### 13.3 CI (GitHub Actions)

Lint, type check, unit tests, content check, build (with the policy step and the build-output scans), and end-to-end tests against a MongoDB service container. Browsers: Chromium on every push; Firefox and WebKit nightly and before each phase ends.

## 14. Phases

Each phase ends the same way: run the gates, commit on its branch, update `docs/progress.md`, then stop for your review.

**Phase 1: Foundation.**
- **Build:** `git mv` legacy files into `legacy/`, and add `npm run legacy:test`. Scaffold Next.js with TypeScript strict, ESLint, Prettier, tokens, both themes and fonts. Add the MongoDB connection (single driver), Zod-checked environment variables, and Better Auth (or your choice in D-002) with the magic link to Mailpit and GitHub. Add the guest local store, the outbox skeleton and the status chip. Build the app shell: header, focus-mode frame, command-palette skeleton, shortcuts dialog. Add the policy headers and the hash step, the runner placeholder with its policy, Docker Compose (MongoDB replica set and Mailpit), the CI workflow and `.env.example`.
- **Gates:** lint, type check and unit tests pass; the legacy suite passes through `legacy:test`; magic-link sign-in works end to end, with the email caught by Mailpit; guest state persists and its status chip is honest; no policy violations and working hydration in three browsers; axe passes on the shell; `docker compose up` followed by `npm run dev` works.
- **I need from you:** D-002 and the other "default" answers in section 16. Docker Desktop running. Optionally, a GitHub repository so CI can run.

**Phase 2: Content pipeline.**
- **Build:** importer, content format, validation, the date-rewrite list, slugs, `ids.lock.json`, `legacy-id-map.json`, sync, import report, `docs/content-format.md`.
- **Gates:** every count matches inventory; fidelity tests pass (exercises deep-equal the legacy ones; rendered text equals the legacy text plus logged changes); content checks pass, including dates and reserved problems; sync is idempotent.
- **I need from you:** a review of the module and lesson slugs before they are frozen, and a skim of `docs/date-rewrites.md`. It will be long, but grouped by rule.

**Phase 3: Visualizer engine and ports.**
- **Build:** the engine, primitives, controls and Watch mode, then module-by-module ports with references, then Your input, edge cases, Predict, Compare and the explorer, at the scope agreed in question 13.
- **Gates:** all 129 pass their references, with at least 250 of 300 random inputs accepted each; every step validates; screenshots are reviewed; keyboard and screen reader checks pass on the gallery.

**Phase 4: Exercises and runner.**
- **Build:** the nine types, hint ladder, reveal rules, mistake feedback, the key endpoint, the editor and the runner with adapters and comparison modes.
- **Gates:** every exercise integrity test passes (§8.4), including the three new `verify` scripts; the end-to-end test on every exercise passes, with persistence; the runner isolation tests pass.

**Phase 5: Lessons, handbook and patterns.**
- **Build:** lesson focus mode with resume, the handbook with every roadmap section, cheat sheets with print styles, the atlas and the drill.
- **Gates:** resume works end to end (unit, scroll, visualizer step, editor contents); fragment coverage holds; no overflow at 360 px on every lesson; axe passes on every route type.

**Phase 6: Practice, review and mastery.**
- **Build:** bank and journal, re-solve scheduling, the review queue, mastery, the session planner, checkpoints with phases, mocks, placement and readiness.
- **Gates:** parity tests for every legacy rule, plus the `mastered()` fix; the planner end-to-end test; the reserved-problem build scan and the before/after start test.

**Phase 7: Notes, search, insights and data.**
- **Build:** notes, highlights, bookmarks, search and the palette, the progress page, reflections, export, import, erase and legacy backup import.
- **Gates:** the export → erase → import round trip; legacy import of a fixture produced by the legacy app, with a report of anything not imported; search never returns answers or reserved problems.

**Phase 8: New exercise types and polish.**
- **Build:** Parsons, matching, invariant and flashcards; "Trace my code" if time allows; accessibility and performance passes; the full end-to-end run in three browsers; the deployment guide (Vercel and Atlas); the final report.

## 15. Risks

| Risk | Mitigation |
| --- | --- |
| The per-page hash policy (D-006) depends on how Next stores prerendered pages, and has not been tried on Vercel | Test on the real host early in Phase 1. Fallback (nonces, dynamic rendering) is verified, and switching is configuration only |
| The brief names Auth.js; Better Auth is a deviation | Your decision before Phase 1 (D-002); both paths are described |
| Removing 1,256 date and timetable phrases without changing meaning | Rules plus per-occurrence review, a logged diff, a fidelity test, an allowlist for domain phrases |
| The visualizer port (129) drifts visually or behaviourally | `run()` verbatim; references and step checks on every baseline run; one screenshot comparison per visualizer |
| The end-to-end exercise suite gets slow (legacy: 3,644 checks on 75 pages) | Shard in CI; run the full suite at phase gates |
| New material the brief requires (glossary, confused-with, problem-to-pattern map, Predict, Compare, new exercise types, flashcards) is real authoring and must stay correct | Question 7: drafts are marked, reviewed by you or an instructor, and tested where testable; nothing appears to learners unreviewed |
| Data loss during sync or merge | Pure reducers with property tests; idempotent ops; export before erase; merge choice shown to the learner |
| Windows-specific breakage (paths, line endings) | `fileURLToPath` rule, `.gitattributes`, CI on Linux plus local runs on this machine |
| Hosting, email and OAuth involve third parties or cost | Nothing is set up until you choose (questions 4 and 17); everything runs locally |
| Copyright on LeetCode problem paraphrases | Question 16 |

## 16. Open questions

Each has a default I will follow if you approve the plan without changing it.

**Stack and services**

1. **Authentication:** Better Auth 1.7.16 instead of the Auth.js named in the brief (D-002)? *Default: yes.* If you want Auth.js: v4.24.15 (stable, maintenance mode) plus a second MongoDB driver.
2. **Versions:** TypeScript 6.0.3 and ESLint 9.39.5 rather than the newest majors (D-003)? *Default: yes.*
3. **Content Security Policy:** static pages with per-page hashes, with nonces plus dynamic rendering as the fallback (D-006)? *Default: yes.*
4. **Paid services and services that receive learner data** (the brief says to ask first):
   - Vercel: its Hobby plan is for non-commercial use, so an institute likely needs Pro.
   - MongoDB Atlas: which tier?
   - An email provider for magic links: it receives learners' email addresses.
   - The GitHub OAuth app: under whose GitHub account?

   *Default: none set up; everything runs locally (Mailpit, local MongoDB) until you choose.*

**Content changes the "dates, rename, errors only" rule does not clearly cover**

5. **Unseen leaks** ([inventory §13](inventory.md#13-unseen-leaks-missed-by-the-legacy-test)):
   - (a) Lock "after" units until the attempt is finished? This needs no text change.
   - (b) Keep clue words such as "divisible by k", "stock span" and "max difference between node and ancestor" in the theory, with an allowlist entry that gives the reason?
   - (c) Remove the numbers 438, 287 and 678, and the names "Time Map, GetRandom O(1)", from four theory lines, logged as fixes?

   *Default: yes to all three.*
6. **Personal wording:** "@rohit", "Corrected edition (26 Oct 2026)", "3.5-year MERN developer", "for 3.5 years of experience", "with a full-time job". *Default: the byline and edition date go (dates rule); the rest becomes neutral ("an experienced web developer"), each change logged.*
7. **New material the brief needs but legacy lacks:**
   - glossary terms
   - "confused with" links
   - a problem-to-pattern table for the 173 problems
   - Predict questions and Compare pairs
   - Parsons, matching and invariant items, and flashcards

   *Default: I draft them and mark them as drafts. You, or an instructor you name, approve them before learners see any. Mappings that can be derived (pattern → lessons, exercises, visualizers) are computed, not written. Who reviews?*
8. **The mock-interviewer prompt names Claude** (§9.3 and 4 lesson mentions). It is text the learner copies into a chat; it is not an in-app AI feature. *Default: keep it, and change "Claude" to "an AI assistant" (logged).*

**Structure**

9. **Modules 8 and 9:** lesson 5 before the checkpoint, rewriting the few sentences tied to the holiday calendar? *Default: yes.*
10. **Foundations module** built from existing content: placement check, JavaScript for DSA (6.1–6.4), the method (7.1, 7.4, 7.5) (§5.5)? *Default: yes.*
11. **Depth profiles** act on Modules 1–3 only, as the legacy tracks did, changing Core/optional marks and pre-work and never hiding content? *Default: yes.*
12. **Problems outside the bank:** 239 and 297 (Module 12 Hard options) and diagnostic B1–B4 (1480, 349, 14, 2) become journal-able "extension" entries, and the bank stays at 173. *Default: yes.*
13. **Visualizer modes:** the scope in §7.4 (Predict hand-written for the 47 main visualizers, about 12 Compare pairs, the explorer only where a size generator makes sense, the counter labelled "steps")? *Default: yes.*

**Other**

14. **Data model additions** (D-015): journal notes, interview stage notes, custom tests, `readiness`, `mistakes`, scorecards in reflections? *Default: yes.*
15. **Relative time only** in the interface (journal history included); ISO dates only in exports? *Default: yes.*
16. **Copyright:** exercises paraphrase LeetCode problem statements and link to LeetCode, as the legacy course does. For an institute's product, someone should check LeetCode's terms. *Default: keep as legacy; you check.*
17. **This machine and the repository:**
    - Git commits here use the global identity `Tushar-Deshmukh <tushardeshmukh57985@gmail.com>`. Is that right, or should this repository use another one?
    - Docker Desktop is not running; it needs to be for the Phase 1 gate.
    - `gh` is not installed and there is no remote, so CI cannot run on GitHub yet. Do you want a GitHub repository?
18. **Legacy files move into `legacy/`** as the first commit of Phase 1? *Default: yes.*
19. **The PDF companion** (`tools/pdf.mjs`, `src/print.*`) is not ported. The brief asks for printable cheat sheets, which come from a print stylesheet, and the legacy tool stays runnable in `legacy/`. *Default: yes.*

Out of scope, as the brief says: AI tutoring, server-side execution, classrooms and payments, other languages. Nothing in this plan blocks adding an AI tutor later.
