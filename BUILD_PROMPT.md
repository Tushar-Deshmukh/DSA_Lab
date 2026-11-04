# Build "DSA Pattern Lab" as a self-paced Next.js + MongoDB learning platform

You are the lead engineer and instructional designer for a small institute that teaches developers data structures and algorithms in JavaScript. Your job is to turn an existing, fully tested single-file course (in `legacy/`) into a production-quality Next.js application backed by MongoDB. It must become the one resource a developer uses to learn DSA properly, at their own pace, from first principles to interview readiness.

Read this whole document before writing any code. Then follow the phases in section 13. Stop at the end of Phase 0 and show me the plan before building.

---

## 1. The outcome

A learner opens the app on any day, with any amount of time, and the app tells them the single best thing to do next. They learn each pattern through:

1. complete theory (nothing from the legacy roadmap is dropped);
2. visualizers they can step through, predict, and run on their own input;
3. exercises that check answers, give hints before revealing, and explain mistakes;
4. real code they write and run in the browser against tests;
5. LeetCode practice tracked in a journal;
6. spaced review that brings back what they are about to forget.

There are no calendar dates anywhere. The learner moves forward by mastery, not by a timetable.

---

## 2. What already exists (`legacy/`)

The legacy course is a working, tested product. **Do not regenerate its content.** Import it, restructure it, and improve the experience around it. Its correctness was verified by automated tests, and those tests must be ported, not discarded.

Inventory (verify these counts yourself in Phase 0 and report any difference):

| Asset | Where | Count |
| --- | --- | --- |
| Audited roadmap (source of truth for theory, problem bank, method, reference, assessments, mocks) | `legacy/source/roadmap.md` (≈3,600 lines) | 13 sections (0–12) |
| Lesson content | `legacy/content/w01.md … w12.md`, `legacy/content/extra.md` | 60 study lessons, 12 review/checkpoint pages, 4 extra pages |
| Pattern write-ups (8-part: recognise, clues, from brute force, why it works, template, complexity, variations, inappropriate when) | inside the roadmap, `**Pattern N.M: …**` | 47 |
| Visualizers | `legacy/src/viz/w01.js … w12.js`, `algo-map.js`, engine in `player.js`, renderers in `render.js` | 129 |
| Exercises | inside `content/*.md` as ` ```ex ` YAML blocks | 421 (mcq 74, pattern 69, interview 57, trace 50, code 48, complexity 42, bug 34, fill 27, predict 20) |
| Problem bank | roadmap section 5 | 173 problems (Core / Stretch / Optional) |
| Assessments and mocks | roadmap section 9 | 6 assessments, 6 mocks with rubrics and reserved problem pools |
| Tests | `legacy/tests/` | `content.mjs` (≈119k checks), `refs.mjs` (brute-force references for every visualizer), `templates.mjs` (≈62k checks), `ui-exercises.mjs`, `behaviour.mjs`, `smoke.mjs` |
| Build tooling | `legacy/tools/build.mjs`, `legacy/tools/curriculum.mjs` (roadmap parser), `legacy/tools/pdf.mjs` | |
| Working app for reference | `legacy/dsa-pattern-lab.html` (open it in a browser to see current behaviour) | |

### Legacy content syntax (your importer must understand all of it)

- Headings: `# Week`, `# Lesson N: title`, `# Saturday`. In `extra.md`: `# Page <id>: <title>`.
- Lesson metadata lines: `@goal:`, `@why:`, `@prereqs:`, `@outcomes:`, `@ready:`, `@summary:`, `@revision:` (lists use `- `).
- `## Heading {tag}` starts a section (`theory`, `code`, `guided`).
- `@pull Key` inserts a roadmap theory fragment from the current week, `@pull wN:Key` from another week, `@pull sN:N.M` a roadmap section subsection.
- `@viz <id> {json props}` embeds a visualizer (props may include `input` and `title`).
- Callouts: `:::tip|warn|key|mistake|interview Title … :::`. `:::stages Title` with `@stage name label` lines.
- Annotated code: ` ```anno ` YAML `{title, code, notes: {line: md}}`.
- Exercises: ` ```ex ` YAML. Schema by type:
  - `mcq` / `pattern` / `recall`: `q, options: [{t, ok, why, kind: concept|impl}], explain, hints, clues?`
  - `complexity`: `q?, code?, fields: [{label, answer, options?, why: {option: msg}}]`
  - `predict`: `q, code, answer, normalize: exact, traps: {wrongAnswer: msg}` (multi-line answers use a textarea)
  - `bug`: `q, code, bug: [0-based line indexes], kind, explain, fix, fine: {lineIndex: msg}`
  - `fill`: `q, template` with `[[k]]` placeholders, `blanks: [{accept: [...]}], fn, tests, adapt?, compare?`
  - `trace`: `q, rows: [{prompt, answer (string or list of accepted strings), why}], verify?` (JS that prints the answers one per line)
  - `code` / `interview`: `q, fn, starter, solution, tests: [{args, expect, hidden} | {ops: [["Class", ...ctor], ["method", ...args]], expect}]`, optional `compare: unordered|sorted|float`, `checker` (JS `(got, args, expect) => bool`), `adapt: {args: [list|tree|badfn|cycle], ret: list|tree|arg0|arg0prefix|nodeIndex}`. `interview` adds `title` and `model: {clarify, brute, optimize, edges, complexity}`.
- Visualizer definition shape (`V.define(id, def)`): `{title, inputs: [{key, label, type, def, options, wide}], presets, legend, code (with //@tag line markers), validate(input) → error|null, run(input) → steps[{line, note, why, result?, ...state}], render(step, stage, input)}`. Steps are deterministic. The final step carries `result`, which `tests/refs.mjs` compares with a brute-force reference on 300 random inputs.

Reuse `legacy/tools/curriculum.mjs` and the parsing logic in `legacy/tools/build.mjs` as the starting point for the importer.

---

## 3. Product principles (non-negotiable)

1. **Self-paced, never dated.** No calendar dates, weekdays, "Day 5 moves to Sunday", holiday notes or deadlines anywhere in the UI or the content. Order is a recommendation based on prerequisites. The learner can open any lesson at any time; the app only advises.
2. **Mastery over completion.** Reading a page never marks it mastered. Viewing a solution never counts as solved. A problem is mastered only after clean re-solves spread over time (keep the legacy rule: three clean re-solves at least 7 days apart, measured from the learner's actual solve dates).
3. **No guilt mechanics.** No streaks that reset, no "overdue" shaming, no red badges counting missed days. Show what is *ready to review*, not what is late. Consistency can be shown as "active days" that never punish a gap.
4. **One clear next step.** Every screen offers one primary action. Secondary options exist but stay quiet.
5. **Focus.** Lessons open in a distraction-free mode: no sidebar, no notifications, one unit at a time, a thin progress line, keyboard navigation, and "resume exactly where I left off" (unit, scroll position, visualizer step, editor contents).
6. **Correctness is tested.** Every visualizer result, every stored exercise answer, every reference solution and every runnable template is checked by an automated test, as in the legacy suite.
7. **Honest state.** Always show whether progress is saved to the account, pending sync, or local only. Never claim a feature works if it has not been tested.
8. **Unseen stays unseen.** Assessment and mock problems (roadmap section 9) never appear in lessons, search results or the problem bank. The final mixed-practice problems keep their pattern hidden until attempted. Port the legacy test that enforces this.

---

## 4. From calendar to curriculum: the new structure

Replace the 12-week timetable with this hierarchy (rename everywhere, including inside imported text):

```
Track (one for now: "DSA in JavaScript")
└─ Module  (was a Week; 12 modules + "Foundations" placement module)
   └─ Lesson  (was a study day; 60)
      └─ Unit  (was a "##" section: theory, worked example, visual dry run, concept check, guided problem, practice)
└─ Checkpoint (was a Saturday review / assessment page; one at the end of each module)
```

Rules for the conversion:

- **Module names come from the topic**, e.g. "Module 7: Heaps, intervals and tries". Keep the recommended order and the prerequisite graph (legacy "Dependency chain", roadmap section 2, and `algo-map.js`).
- **Time becomes an estimate, not a slot.** Convert the legacy time splits (`T30 · I25 · P45 · R15 · N5`) into an estimated duration per unit and per lesson, shown as "about 25 min".
- **Session planner replaces the daily schedule.** The learner says "I have 15 / 30 / 60 / 90 minutes" and the app assembles a session: ready reviews first (capped at about a third of the time), then the next units of the current lesson, then one practice problem if time remains. Sessions can stop at any unit boundary without losing anything.
- **Warm-ups become review items.** The legacy "warm-up: re-solve problem X" becomes an entry in the review queue for that problem.
- **"If you fall behind" becomes "If you are short on time":** which units and problems are Core and which can be skipped or deferred.
- **Saturday pages become module checkpoints:** a mixed review quiz, the cold re-solves, and (where the legacy schedule had one) the assessment or mock. Checkpoints are recommended once the module's core patterns reach "Proficient" (section 5.10), never locked by date.
- **Diagnostic (roadmap section 1) becomes a placement check.** Its result suggests a starting module and a depth profile (Foundations / Standard / Accelerated, from legacy tracks C / B / A), never a schedule.
- **Strip every date reference.** The importer must flag every date, weekday and timetable phrase it finds in the roadmap and content (for example "Sat 2 Jan", "Mon 2 Nov 2026", "Week 3 Saturday", "Holiday note", "12 weeks"). Rewrite each into self-paced wording, keep a reviewable list in `docs/date-rewrites.md`, and add a test that fails if a date or weekday appears in learner-facing content.
- **Keep stable IDs.** Give every module, lesson, unit, exercise, visualizer, pattern and problem a stable slug. User data references these slugs, never array positions. Keep a `legacy-id-map.json` (for example `w2d1-q3 → two-pointers/opposite-ends/ex-03`) so a legacy progress backup can be imported (section 5.13).

---

## 5. Feature specification

### 5.1 Home and learning path

- **Home:** one "Continue" card (the exact unit to resume), the session planner, "ready to review" count, and a small mastery summary. Nothing else above the fold.
- **Path map (`/learn`):** the modules as a prerequisite graph, each node showing mastery level per pattern. Clicking a module opens its overview: why it matters, what you will be able to do, its lessons with estimated times, Core vs Stretch, and its checkpoint.

### 5.2 Lesson experience

- Focus mode by default (toggle to show navigation).
- One unit per screen on mobile; on desktop, a reading column of about 65–75 characters with the visualizer or editor alongside when a unit needs one.
- Lesson header: goal, why it matters, prerequisites (linked), outcomes, estimated time.
- Unit types, in the legacy order: warm-up review, theory, worked problem in stages (problem → naive approach → the observation → visual dry run → code → complexity), concept checks, guided interview problem, practice, summary, revision prompt, and the "ready to move on" self-check. Ticking the self-check is required to mark a lesson complete, alongside its Core exercises.
- Inline glossary: technical terms show a short definition on hover or tap.
- Notes and highlights on any block (section 5.12).
- Next and previous units with keyboard shortcuts (`j`/`k` or arrow keys), and `?` showing all shortcuts.

### 5.3 Theory library (`/handbook`)

All theory must exist in the app as first-class, searchable pages, not only inside lessons:

- every roadmap section (strategy and how to use the course, placement, path overview and dependency chain, per-module theory and learning objectives, JavaScript reference and code templates, the problem-solving method and pattern recognition guide, the revision and mistake-tracking system, checkpoints and mocks rules, progress metrics, the interview-readiness checklist, after-the-course practice strategy);
- per-module theory pages that contain every theory fragment of that module in reading order, with links to the lessons that teach each one;
- cheat sheets per module (summaries, templates and complexity tables), printable through a print stylesheet.

Lessons and the handbook render from the same content source, so they never diverge. Port the legacy coverage check: the build fails if any roadmap theory fragment is used nowhere.

### 5.4 Pattern atlas (`/patterns`)

Each of the 47 patterns gets its own page: the 8-part write-up, the visualizers that demonstrate it, its template code (runnable), the exercises and problems that use it, the learner's mastery for it, and "confused with" links to look-alike patterns. Include an interactive "which pattern?" drill (the legacy classification drill, plus all pattern-type exercises) that mixes patterns the learner has unlocked.

### 5.5 Visualizer engine v2

Port all 129 visualizers. Keep each legacy `run()` step generator as pure TypeScript (it is already tested); rewrite `render()` as React components built from shared primitives.

- **Primitives:** array cells with pointers and windows, variables panel, key-value map, stack, queue/deque, call-stack frames, recursion tree, binary tree, general graph (directed/undirected, weighted, box or circle nodes), grid, DP table (1-D and 2-D with dependency highlighting), heap (array + tree view), linked list, intervals, bars, bit strings.
- **Semantic colour system** (from the legacy legend): current, compare, done, frontier, error, dim, window, wall. Every state is also distinguishable without colour (outline style, icon or label).
- **Controls:** play/pause, step back and forward, scrubber, speed, jump to the next decision step, reset; keyboard (`←` `→` `space`); click a code line to set a breakpoint.
- **Panels:** code with the active line highlighted, variables with changed values marked, narration ("what happened" and "why it is correct"), and an operation counter.
- **Modes:**
  - *Watch* (default).
  - *Predict:* at decision steps the visualizer pauses and asks what happens next (which pointer moves, which cell is filled, which node is popped). Answers are scored and feed mastery.
  - *Compare:* brute force and the optimal approach on the same input side by side, with operation counts, so the complexity difference is visible.
  - *Your input:* validated custom input, presets, a random-input button and edge-case buttons (empty, single element, duplicates, all equal, sorted, reversed).
  - *Complexity explorer* (where meaningful): run the step generator on growing n and plot operations against n with O(n), O(n log n) and O(n²) reference curves.
- **Shareable state:** the input and current step are kept in the URL hash so a visualizer can be bookmarked or embedded in a note.
- **Motion:** smooth transitions between steps, with a reduced-motion setting that switches to instant updates.
- **Accessibility:** a text narration log and an ARIA live region announce each step.
- **Gallery (`/visualizers`):** every visualizer, filterable by module and pattern, each usable as a standalone playground.
- Lazy-load visualizer code per module; nothing from other modules ships with a lesson page.

### 5.6 Exercises v2

Port all 421 exercises with their exact content and checking rules. Then improve the interaction:

- **Hint ladder before reveal:** hints appear one at a time; the answer can be revealed only after at least one hint or two wrong attempts. A revealed exercise is marked "answer viewed" and goes into the review queue, even if later solved.
- **Mistake feedback:** each wrong option explains why, tagged as a *concept* mistake or an *implementation* mistake. Keep a per-learner tally of both kinds by pattern.
- **Retry and reset** on every exercise; drafts are saved.
- **New exercise types** (add a small number per module where they teach better than the existing types, and test them the same way):
  - *Parsons problems:* reorder shuffled lines of a template into a working solution.
  - *Matching:* clues to patterns, operations to complexities.
  - *Invariant check:* pick the invariant a loop maintains.
  - *Flashcards:* generated from summaries, pattern clues and complexity tables, reviewed with spaced repetition.
- **Interview problems** keep the guided structure: clarify → brute force → optimise → edge cases → complexity, each revealed step by step, then code against tests.

### 5.7 Code editor and runner

- CodeMirror 6 (or Monaco if you can justify the bundle size) with JavaScript syntax highlighting, auto-indent, and the starter code.
- Run code **only in the browser**, in a Web Worker with a time limit (legacy: 3 s), never on the server. Port the legacy runner and its test harness: positional args, class/ops tests, the list/tree/function/cycle adapters, the unordered/sorted/float comparison modes and custom checkers.
- Show per-test results with input, expected and actual values, a readable diff, captured `console.log` output, and hidden-test counts. Let learners add their own test cases.
- "Submit" runs hidden tests too; passing marks the exercise solved unless the solution was revealed first.
- Optional, after the core phases: "Trace my code" for selected exercises, which instruments the learner's code to drive the matching visualizer.

### 5.8 Practice: problem bank and journal (`/practice`)

- All 173 bank problems with filters (module, pattern, difficulty, tier, status) and LeetCode links.
- Journal per problem, keeping the five legacy statuses: Not started, Attempted, Solved with hints, Solved independently, Needs revision. A viewed editorial or hint is recorded as "with hints", never as independent.
- Each attempt records: time taken, hint rung used (legacy hint ladder, roadmap section 8), outcome, mistake category (the legacy P/A/D/L/E/C/R codes with their remedies), approach, complexity, key insight and notes.
- Re-solve scheduling from actual attempt dates (legacy intervals 1, 3, 7, 14, 30 days), shown as "ready to re-solve", never as overdue.

### 5.9 Review system (`/review`)

- One queue mixing due flashcards, missed or revealed exercises, re-solves and pattern drills, ordered by due date and capped to the time the learner chose.
- Use FSRS or SM-2 for flashcards and exercises; use the legacy interval rule for LeetCode re-solves. Document the choice in `docs/decisions.md`.
- "Review this module" generates a quiz from the module's exercises the learner has not answered cleanly.

### 5.10 Mastery, checkpoints and mocks

- **Mastery per pattern**, computed from evidence: first-try correct concept checks, code exercises solved without revealing, problems solved independently, and clean re-solves. Levels: Not started → Introduced → Practising → Proficient → Mastered. Show the evidence behind each level.
- **Checkpoints** (the six legacy assessments): rules, timer, rubric scoring, pass rule (70% of points and at least one unseen problem fully accepted), and the remediation advice. Problems are shown only once the learner starts the checkpoint.
- **Mocks** (the six legacy mocks): the 45 + 15 minute format, the 5-dimension rubric, the copyable interviewer prompt, and the interviewer-only problem pool behind an explicit "I am the interviewer" confirmation.
- **Interview readiness** (legacy Week 12 and section 11): the recognition checklist, the 45-minute structure, abandon-and-switch, the 90-second explanation drill, the complexity drill and the final readiness checklist with its verdict.

### 5.11 Progress and insights (`/progress`)

- Mastery heat map by pattern; time studied; active days (no streak).
- Weakest patterns from evidence, with a one-click "repair session" (two re-solves per weak pattern plus its drills), replacing the legacy weak-pattern repair day.
- Mistake trends (concept vs implementation, P/A/D/L/E/C/R) with the matching remedies.
- Weekly reflection prompts (optional, never required).

### 5.12 Notes, bookmarks, search, command palette

- Notes in Markdown attached to any lesson block, pattern, problem or visualizer state; highlights on theory text; a notes page that groups them by module.
- Bookmarks for any lesson, unit, pattern, problem or visualizer.
- Full-text search across theory, patterns, lessons, exercises (question text only, never answers) and problems, excluding reserved assessment and mock problems.
- Command palette (`Ctrl/Cmd + K`) for search and navigation.

### 5.13 Accounts, settings and data

- Sign-in with Auth.js (GitHub OAuth plus email magic link). Also support guest mode: progress is kept in the browser and merged into the account on first sign-in, with a clear choice when both sides have data.
- Settings: theme (system, light, dark), reduced motion, editor font size and key bindings, default session length, depth profile.
- Export all user data as JSON; import it; erase everything (with an in-page confirmation, not a browser dialog).
- **Import a legacy backup:** accept the JSON exported by `legacy/dsa-pattern-lab.html` (storage key `dsa-course-v1`), map it through `legacy-id-map.json`, and report what was imported and what could not be mapped.

---

## 6. Architecture and stack

Check the current stable versions with `npm view <package> version` before installing, and pin exact versions. Do not rely on versions remembered from training.

- **Framework:** latest stable Next.js with the App Router, React Server Components, and TypeScript in strict mode.
- **Styling:** Tailwind CSS with design tokens as CSS variables (section 10), or CSS Modules if you find Tailwind fights the token system. Decide in Phase 0.
- **Database:** MongoDB (Atlas in production, a Docker container locally) through Mongoose, with Zod validation at every server boundary.
- **Auth:** Auth.js with the MongoDB adapter.
- **Writes:** Server Actions or Route Handlers, validated with Zod, scoped to the signed-in user. Use optimistic UI and a small client-side queue so progress is never lost on a flaky connection; show sync status.
- **Content:** stays in the git repository as the source of truth (section 7). A sync step copies a read-optimised version into MongoDB for search, aggregation and stable references.
- **Code execution:** browser Web Workers only.
- **Testing:** Vitest (unit, content, visualizer references, templates), Playwright (end to end), axe-core (accessibility).
- **CI:** GitHub Actions running lint, type check, unit tests, content validation and end-to-end tests against a test database.
- **Deployment:** document Vercel + MongoDB Atlas, with an `.env.example`. The app must also run fully locally with `docker compose up` and `npm run dev`.

Suggested repository layout (adjust and justify in Phase 0):

```
app/                    routes (section 9)
components/             UI components; components/viz/ primitives; components/exercises/
lib/viz/                step generators (ported run() functions) and the engine
lib/exercises/          checkers, runner, worker, adapters
lib/content/            content loaders and types
lib/db/                 Mongoose models and repositories
lib/srs/                scheduling
content/                modules/<slug>/lessons/*.mdx, exercises/*.yaml, patterns/*.mdx, handbook/*.mdx
scripts/                import-legacy.ts, validate-content.ts, sync-content.ts, seed-dev.ts
tests/                  unit/, content/, viz/, e2e/
legacy/                 the original course, untouched
docs/                   decisions.md, date-rewrites.md, content-format.md, progress.md
```

---

## 7. Content pipeline

1. **Import once** (`scripts/import-legacy.ts`): parse `legacy/source/roadmap.md` and `legacy/content/*.md`, resolve every `@pull` into real content in the new files (keeping a source reference to the roadmap fragment so future edits can be traced), convert exercises and annotated code to the new format, assign stable slugs, write `legacy-id-map.json`, and produce an import report (counts per type, anything unparsed).
2. **Author format:** MDX for lessons, handbook pages and patterns, with components such as `<Viz id="…" input={…} />`, `<Exercise id="…" />`, `<Callout kind="tip">`, `<Stages>`, `<AnnotatedCode>`, `<Term>`. Exercises live in YAML (or typed TS) files next to their lesson, using the legacy schema plus the new types.
3. **Validate** (`npm run content:check`), failing the build on: broken references, unknown visualizer IDs, duplicate slugs, YAML values that parsed as objects instead of strings (a legacy pitfall: unquoted `key: value` text), dates or weekdays in learner-facing text, reserved problems mentioned anywhere, and roadmap theory fragments used nowhere.
4. **Sync** (`npm run content:sync`): upsert modules, lessons, patterns, exercises (without answers in searchable fields), problems and handbook pages into MongoDB collections with a content version, so user data can detect when content changed.

---

## 8. MongoDB data model

Define each collection with a Mongoose schema, a Zod schema and indexes. All user collections are keyed by `userId` plus a stable content slug.

| Collection | Key fields | Indexes |
| --- | --- | --- |
| `users`, `accounts`, `sessions`, `verification_tokens` | Auth.js adapter | adapter defaults |
| `settings` | `userId`, theme, reducedMotion, editor prefs, defaultSessionMinutes, depthProfile, placementResult | unique `userId` |
| `lesson_progress` | `userId`, `lessonSlug`, status, unitsCompleted[], readyChecks[], resume {unitSlug, scrollY, vizStep, editorDrafts}, timeSpentSec, startedAt, completedAt, contentVersion | unique `{userId, lessonSlug}` |
| `exercise_attempts` | `userId`, `exerciseSlug`, attempts, solved, firstTry, hintsUsed, revealed, revealedBeforeSolve, wrongCount, lastMistakeKind, lastAnswer, codeDraft, history[] | unique `{userId, exerciseSlug}`; `{userId, solved}` |
| `problem_journal` | `userId`, `problemNum`, status, attempts[{at, minutes, outcome, hintRung, mistakeCode, approach, complexity, insight, notes}], cleanResolves, nextResolveAt, mastered | unique `{userId, problemNum}`; `{userId, nextResolveAt}` |
| `review_items` | `userId`, itemType (flashcard, exercise, problem, drill), itemSlug, due, scheduler state (stability/difficulty or interval/ease), reps, lapses, lastReviewedAt | `{userId, due}`; unique `{userId, itemType, itemSlug}` |
| `pattern_mastery` | `userId`, `patternSlug`, level, evidence counts, updatedAt (derived, recomputable) | unique `{userId, patternSlug}` |
| `study_sessions` | `userId`, startedAt, endedAt, plannedMinutes, items[] | `{userId, startedAt}` |
| `checkpoint_results`, `mock_results` | `userId`, slug, startedAt, scores per problem or rubric dimension, passed, notes | `{userId, slug}` |
| `notes`, `bookmarks`, `highlights` | `userId`, target {type, slug, blockId}, body, createdAt | `{userId, "target.slug"}`; text index on note body |
| `reflections` | `userId`, moduleSlug, answers, createdAt | `{userId, moduleSlug}` |
| Content copies: `modules`, `lessons`, `patterns`, `exercises_public`, `problems`, `handbook` | slug, title, text for search, contentVersion | unique `slug`; text index |

Never store answers or solutions in a collection that search or the client can read before the learner has answered.

---

## 9. Routes

```
/                         home: continue, session planner, ready reviews
/placement                placement check (legacy diagnostic)
/learn                    path map
/learn/[module]           module overview
/learn/[module]/[lesson]  lesson (focus mode); ?unit=<slug>
/learn/[module]/checkpoint
/handbook, /handbook/[...slug]
/patterns, /patterns/[slug], /patterns/drill
/visualizers, /visualizers/[id]
/practice, /practice/[num]
/review
/checkpoints, /mocks, /mocks/[slug]
/progress
/notes, /bookmarks
/settings, /settings/data (export, import, legacy import, erase)
/sign-in
```

---

## 10. Design system

Keep the legacy identity as the starting point and refine it; it is in `legacy/src/styles.css`.

- **Type:** Literata for reading text, IBM Plex Sans for interface text, JetBrains Mono for code, loaded with `next/font` and real fallback stacks.
- **Colour:** the legacy tokens (paper, sheet, ink 1–3, rule, accent) and the semantic visualizer states (current, compare, done, frontier, error, dim, window, wall), defined once as CSS variables, with designed light and dark themes that follow the system setting and a manual override.
- **Reading comfort:** a body text column of about 65–75 characters, generous line height, clear heading scale, `tabular-nums` in tables and counters.
- **Restraint:** celebrate completions briefly (a short, calm confirmation), never with confetti or sounds by default. No gamified noise.
- **Responsive:** fully usable at 360 px wide; visualizers stack their panels; the editor switches to a full-screen sheet on phones. No page scrolls horizontally; wide tables, code and diagrams scroll inside their own containers.

---

## 11. Accessibility, performance and security

- WCAG 2.2 AA: keyboard access to everything including visualizers and exercises, visible focus, labels on every control, colour never the only signal, `prefers-reduced-motion` respected. Run axe in end-to-end tests on every route type.
- Performance budgets on a mid-range phone: lesson page interactive in under 3 s, Largest Contentful Paint under 2.5 s, initial JavaScript per route kept small by lazy-loading visualizers, the editor and the runner.
- Security: all writes validated and scoped to the session user; rate-limit write endpoints; no secrets in the client; Content Security Policy headers; the code runner isolated in a Worker with a timeout and no network access.

---

## 12. Testing and quality gates

Port the legacy tests and keep their strength. A phase is not done until its gates pass.

- **Visualizer references:** every visualizer runs on its defaults, its presets and 300 random inputs; its final result must match the brute-force reference ported from `legacy/tests/refs.mjs`. Every step must have a narration and point at a valid code line.
- **Exercise integrity:** predict answers are produced by running the code; every accepted fill-in alternative and every reference solution passes all tests; no starter code passes all tests; trace answers match their `verify` scripts; MCQs have a correct option with explanations; complexity answers are among the offered choices; bug line indexes exist.
- **Templates:** every runnable reference template is executed against random inputs (port `legacy/tests/templates.mjs`).
- **Content checks:** coverage of every roadmap fragment, no dates or weekdays, no reserved problems, no object-typed text fields, all references resolve.
- **End to end (Playwright):** for every exercise on every page: a wrong answer gets "wrong" feedback, a hint appears, reset works, the right answer is accepted, and the solved state persists after a reload (stored in a test MongoDB). Also: guest-to-account merge, export → erase → import, legacy backup import, revealed-solution labelling, focus-mode resume, and the session planner.
- **Accessibility and layout:** axe on every route type; no horizontal overflow at 360 px on every lesson page.
- **Counts:** after import, report modules, lessons, units, visualizers, exercises by type, patterns and problems, and confirm they match the legacy inventory (or explain every difference).

---

## 13. Phases

Work in this order. At the end of each phase: run the gates, commit, update `docs/progress.md` with what was built, what was tested and how, and what is not done yet. Never mark something done that has not been tested.

**Phase 0: Read and plan (stop for my approval).**
Read `legacy/` fully, open `legacy/dsa-pattern-lab.html`, and run the legacy tests to confirm they pass. Write `CLAUDE.md` (conventions for this repo), `docs/plan.md` (architecture, content format, data model, route list, risks), `docs/decisions.md`, and an inventory report with exact counts. List every open question. Then stop and wait for me.

**Phase 1: Foundation.**
Scaffold Next.js with TypeScript strict, linting, formatting, the design tokens and both themes, fonts, MongoDB connection, Auth.js with guest mode, the app shell (header, focus mode, command palette skeleton), CI and Docker Compose.

**Phase 2: Content pipeline.**
Importer, new content format, validation, the date-rewrite list, stable IDs and `legacy-id-map.json`, content sync to MongoDB. Gate: all counts match; content checks pass.

**Phase 3: Visualizer engine and ports.**
Engine, primitives, controls and modes (Watch first; Predict, Compare, Your input and the complexity explorer after). Port visualizers module by module with their reference tests. Gate: all 129 visualizers pass references.

**Phase 4: Exercises and runner.**
All exercise types, hint ladder, reveal rules, mistake feedback, the editor and the Worker runner with adapters and comparison modes. Gate: all exercise integrity tests pass.

**Phase 5: Lessons, handbook and patterns.**
Lesson experience with resume, the handbook with every roadmap section, cheat sheets, the pattern atlas and the drill.

**Phase 6: Practice, review and mastery.**
Problem bank and journal, re-solve scheduling, the review queue, mastery computation, the session planner, checkpoints, mocks, placement and interview readiness.

**Phase 7: Notes, search, insights and data.**
Notes, highlights, bookmarks, search, the progress page, reflections, export/import, erase and legacy backup import.

**Phase 8: New exercise types and polish.**
Parsons, matching, invariant checks and flashcards; "Trace my code" if time allows; accessibility and performance passes; full end-to-end run; deployment guide; final report.

---

## 14. Working rules

- Never regenerate or paraphrase curriculum content that was imported correctly. Change content only to remove dates and timetable wording, to rename Week → Module, or to fix a verified error; record every such change.
- If you find an error in the legacy content, fix it, add a test that would have caught it, and list it in `docs/progress.md`.
- Prefer small, reviewable commits with clear messages.
- When a decision is hard to reverse (data model, content format, auth provider), write it in `docs/decisions.md` with the alternatives you rejected.
- Ask me before adding paid services, AI features, analytics or anything that sends learner data to a third party.
- Report honestly: what was tested, how, with what result, and what was not tested.

## 15. Out of scope for now

- AI tutoring or chat inside the app (may come later; design so it could be added).
- Server-side code execution.
- Multi-user classrooms, instructor dashboards and payments.
- Languages other than JavaScript.
