# Legacy inventory (Phase 0)

Exact counts for the legacy course as received, measured on 2026-11-04. Every number below was produced by running code, not estimated. Scripts that reproduce them are in [phase-0/](phase-0/README.md).

## 1. How the numbers were produced

- The legacy build and its browser tests do not run on Windows as shipped (see section 15, item 4). They were run on a **copy** of the folder in a temporary directory, with path handling patched in 9 files (`tools/build.mjs`, `tools/curriculum.mjs`, `tools/pdf.mjs`, `tests/content.mjs`, `tests/templates.mjs`, `tests/ui-exercises.mjs`, `tests/behaviour.mjs`, `tests/smoke.mjs`, `tests/vizshot.mjs`). No other change. The files in this repository are untouched.
- Counts come from four sources: the built `dist/course.json` and `dist/exercises.json`, the legacy roadmap parser (`tools/curriculum.mjs`), the visualizer engine loaded in Node's `vm` exactly as `tests/content.mjs` loads it (same random seeds), and direct scans of the Markdown.
- The rebuilt `dsa-pattern-lab.html` is identical to the shipped one apart from the `builtAt` timestamp, so the build output describes the shipped course.

## 2. The brief's table against what is there

| Asset | Brief says | Measured | Match |
| --- | --- | --- | --- |
| Roadmap | ≈3,600 lines, 13 sections | 3,627 lines, 13 sections (0–12) | yes |
| Study lessons | 60 | 60 (5 per week) | yes |
| Review / checkpoint pages | 12 | 12 Saturday pages, plus 1 final page (`w12final`) that the build synthesises from the schedule and that has no content file | +1 |
| Extra pages | 4 | 4: `diagnostic`, `depmap`, `reference`, `method` | yes |
| Pattern write-ups | 47 | 47, every one with all 8 parts | yes |
| Visualizers | 129 | 129 defined, 129 used, 132 embeds | yes |
| Exercises | 421 (mcq 74, pattern 69, interview 57, trace 50, code 48, complexity 42, bug 34, fill 27, predict 20) | identical per type; `recall` is supported but used 0 times | yes |
| Problem bank | 173 (Core / Stretch / Optional) | 173: Core 114, Stretch 39, Optional 20 | yes |
| Assessments and mocks | 6 + 6 | 6 + 6, with 31 reserved problems | yes |
| `tests/content.mjs` | ≈119k checks | 119,205 | yes |
| `tests/templates.mjs` | ≈62k checks | 62,397 | yes |
| Location | `legacy/` | the repository root | **no** |

Other differences between the brief and the files:

- The folder is not a git repository, and `dist/` is absent. The tests read `dist/build-report.json` and `dist/exercises.json`, so the build must run before any test.
- Four tests and `tools/pdf.mjs` load `playwright`, which `package.json` does not declare. `package.json` declares `js-yaml ^4.1.0` and `marked ^15.0.12` (the lockfile pins 4.1.0 and 15.0.12) and has no build or test scripts; the README lists the commands.
- `@pull wN:Key` is documented in the brief but used 0 times.
- The brief names three section tags (`theory`, `code`, `guided`). The content uses ten, plus 36 untagged headings (section 5).
- Exercise fields that the brief's schema does not list: `tag` (on every exercise), `title` (interview), `clues`, `code` on mcq and trace, `w` (width) on fill blanks and trace rows, `placeholder` (predict), `multi` (mcq). A test's `expect` can be a description rather than a value when a checker decides (for example "any balanced BST", "any valid order").
- Line numbers: `bug` and `fine` are 0-based; `anno` notes are 1-based.
- 3 visualizers have no random-input generator (`depmap`, `recognise`, `interview-clock`), so "300 random inputs" applies to 126.
- Legacy exercise ids are `<lessonId>-<n>` (for example `w2d1-3`), not `w2d1-q3` as in the brief's example.
- The README's "85 lesson and week pages" is 73 lesson pages plus 12 week overviews. It also mentions `dsa-pattern-lab-companion.pdf`, which is not in the folder.

## 3. Legacy test results

All on Windows 11, Node 24.21.0, in the patched copy. Browser tests use Chromium through Playwright 1.64.1, installed for the run without saving it to `package.json`.

| Check | Result |
| --- | --- |
| `node tools/build.mjs` | 73 lesson pages, 421 exercises, 129 visualizers used (129 defined), index.html 1,907 KB, 0 warnings |
| Rebuilt HTML against the shipped HTML | identical apart from `builtAt` |
| `node tests/content.mjs` | 119,205 passed, 0 failed, 62 warnings. Every warning is a correct option without its own `why`; each of those 62 exercises has an exercise-level `explain`, and no wrong option lacks a `why` |
| `node tests/templates.mjs` | 16 template blocks, 62,397 passed, 0 failed |
| `node tests/ui-exercises.mjs` (all pages) | 3,644 passed, 0 failed, on the 75 pages that have exercises |
| `node tests/behaviour.mjs` | 13 passed, 0 failed |
| `node tests/smoke.mjs` at 375 px, every page | 100 pages, 0 with horizontal overflow. The only console error is Google Fonts, which the test blocks on purpose |
| Opened `dsa-pattern-lab.html` | no page errors; home, a lesson, a visualizer, phone width and the problems page inspected by screenshot |
| **Not run** | `tools/pdf.mjs` (PDF companion), `tests/vizshot.mjs` (screenshot helper), any browser other than Chromium |

Baseline for the visualizer port, measured with the same engine and seeds as `tests/content.mjs`:

- 38,333 runs (129 default inputs + 404 presets + 37,800 random inputs) generate 454,179 steps.
- 0 random inputs were rejected by `validate`: all 126 visualizers with a generator accepted 300 of 300.
- On default inputs: 1,539 steps, median 8 per visualizer, maximum 121 (`loop-triangle`). Every step has a `note` (the content test checks it). 418 of the 1,539 steps (27%) have a `why`.

## 4. Roadmap structure

| § | Legacy title (shortened) | Subsections | Notes |
| --- | --- | --- | --- |
| 0 | Strategy, assumptions and how to use this document | 4 | |
| 1 | Starting-point assessment (diagnostic) | 5 | sessions A and B, scoring and routing, answer key |
| 2 | The 12-week roadmap overview | 6 | phases, week overview, dependency chain, topic prioritisation, problem budget, milestones |
| 3 | Weekly theory | 12 (one per week) | 209 theory fragments |
| 4 | Day-by-day schedule | 12 | 84 rows (section 5) |
| 5 | Problem bank | 4 | 173 problems |
| 6 | JavaScript DSA reference and code templates | 19 | 14 of them pulled into lessons |
| 7 | Problem-solving method and pattern recognition | 5 | 14-step method, recognition table, 15-statement drill |
| 8 | Revision and mistake tracking | 5 | intervals, hint ladder, mistake codes P/A/D/L/E/C/R, tracker, notes format |
| 9 | Assessments and mock interviews | 5 | 9.2 and 9.5 hold the reserved problems |
| 10 | Progress scorecards and milestones | 4 | |
| 11 | Final interview-readiness checklist | 6 | 26 items and a verdict |
| 12 | Post-roadmap practice strategy | 4 | |

Theory fragments in section 3: **209** (W1 16, W2 17, W3 17, W4 18, W5 18, W6 18, W7 18, W8 19, W9 16, W10 18, W11 22, W12 12). Of these, 197 are pulled into lessons, each exactly once; 47 of the 197 are the pattern write-ups. The other 12 are the per-week "A. Learning objectives", shown on the week pages.

Section 6 subsections pulled into lessons (14): 6.1 W1L1, 6.3 W1L2, 6.2 W1L3, 6.9 W3L1, 6.8 W3L5, 6.6 W4L1, 6.5 W4L4, 6.11 W5L2, 6.12 W6L1, 6.13 W7L1, 6.14 W7L5, 6.15 W8L1, 6.16 W9L2, 6.18 W11L5. Never pulled: 6.4, 6.7, 6.10, 6.17, 6.19.

## 5. Pages, sections and time

- **Lesson pages: 73** = 60 study + 12 Saturday + 1 final. Also 12 week overviews and 4 extra pages.
- **`##` sections: 278** = 242 in study lessons (2 to 12 per lesson), 24 on Saturday pages, 12 in week overviews.
  - By tag: theory 138, guided 57, code 30, stretch 9, reference 3, visual 1, dryrun 1, complexity 1, tradeoffs 1, pattern 1, untagged 36.
  - Untagged titles: "How this week fits together" ×12, "Before you start" ×8, "Quick review" ×8, "Complexity drill", "Classification drill (reference 7.3)", "After the assessment: Week 2 pattern check", "After the assessment: quick review", "Mock 1" … "Mock 4".
  - No study lesson has content before its first `##`.
- **Lesson metadata** (study lessons): `@goal` 72 (60 study + 12 Saturday); `@why`, `@prereqs`, `@outcomes`, `@ready`, `@summary`, `@revision` 60 each. List items: summary 287, ready 180, outcomes 242, prereqs 107.
- **Week-level text:** all 12 weeks have an "If you fall behind" note; 3 have extra notes.
- **Saturday pages:**

  | Week | Sections |
  | --- | --- |
  | 1 | Complexity drill |
  | 2 | Before you start / After the assessment: Week 2 pattern check |
  | 3 | Classification drill |
  | 4 | Before you start / After the assessment: quick review |
  | 5 | Mock 1 / Quick review |
  | 6 | Before you start / Quick review |
  | 7 | Mock 2 / Quick review |
  | 8 | Before you start / Quick review |
  | 9 | Before you start / Mock 3 / Quick review |
  | 10 | Before you start / Quick review |
  | 11 | Before you start / Mock 4 / Quick review |
  | 12 | Before you start / Quick review |

  Mocks 5 and 6 are prose units inside W12 lessons 3 and 5. Assessment 6 is on the W12 Saturday.
- **Schedule rows: 84** = 60 study + 12 Saturday + 11 rest days + 1 final.
- **Time per study lesson:** every one of the 60 totals exactly 120 minutes (7,200 in all). Formats: `T·I·P·R·N` with numbers 25, `default` 30 (T25 · I15 · P60 · R15 · N5, per roadmap §4 and `src/app.js`), `T·P·R·N` 1, `Repair·P·R·N` 1, `Mock·P·R·N` 1, `P·drill·R·N` 1, `Mock·verbal·R·N` 1. Saturday formats: `P·R·N` 2, `<n> test·R·N` 5, `Mock·P·N` 4, `<n> test·R` 1.
- **Warm-ups:** 56 lessons name one (50 plain problem numbers; 6 special: "Diagnostic B2 (349)", "206 (recursive)", "347 rewritten with a heap", "200 (BFS)", "547 rewritten with DSU", "509 rewritten as memo, then table"); 4 have none.
- **Saturday cold re-solves** (the `+N` is days since the first solve): W1 54 (+1), 242 (+3), 1 (+5), 128 or 217; W3 33 or 153 (+4), 34 (+5), 3 (+10), 49 (+17), 560 (+8); W5 90 (+4), 146 (+10), 34 (+19); W7 23 (+4), 236 (+9), 39 (+16); W9 743 (+5), 210 (+9), 215 (+19); W11 416 (+5), 139 (+8), 743 (+19), 200 (+26). W11 lesson 4 adds cold re-solves of 322 (+8) and 62 (+7).

## 6. Content syntax in use

| Syntax | Uses |
| --- | --- |
| `@pull Key` (same week) | 197 |
| `@pull sN:N.M` (roadmap subsection) | 14 (all section 6) |
| `@pull wN:Key` | 0 |
| `@viz` | 132 embeds of 129 ids; 5 with props, 2 of those with `input`. Embedded twice: `rec-fib` (W5L1, W10L1), `tree-inorder-iter` (W6L1, W6L5), `house-robber` (W10L2, W12L2). 60 pages have visualizers, at most 5 on one page |
| Callouts | tip 23, key 6, mistake 6, warn 4, interview 4 |
| `:::stages` | 1 (W2L2, Kadane), with exercises, a visualizer and annotated code nested inside |
| ` ```anno ` | 3 |
| plain ` ```js ` fences | 6 |
| Prose that MDX would misread | 247 lines contain `{` or `}` and 13 contain `<` outside code (none look like a JSX tag); 207 backslash escapes (`\~`, `\[`, `\]`, `\|`) |

## 7. Exercises (421)

| Type | Count | | Group | Count |
| --- | --- | --- | --- | --- |
| mcq | 74 | | Week 1 | 48 |
| pattern | 69 | | Week 2 | 41 |
| interview | 57 | | Week 3 | 45 |
| trace | 50 | | Week 4 | 33 |
| code | 48 | | Week 5 | 29 |
| complexity | 42 | | Week 6 | 27 |
| bug | 34 | | Week 7 | 25 |
| fill | 27 | | Week 8 | 24 |
| predict | 20 | | Week 9 | 35 |
| recall | 0 | | Week 10 | 31 |
| | | | Week 11 | 31 |
| | | | Week 12 | 23 |
| | | | diagnostic / reference / method | 12 / 2 / 15 |

- By page kind: study lessons 340, Saturday pages 52, extra pages 29.
- Runnable tests: 655, of which 233 hidden (fill tests are never hidden). Custom checkers: 5. Class-style `ops` tests: 6 exercises. Compare modes: unordered 7, float 3, sorted 2.
- Adapters: arguments `tree` 9, `list` 6, `badfn` 1, `cycle` 1; return `list` 3, `tree` 2, `arg0prefix` 2. Supported but unused: `nodeIndex`, `arg0`.
- Every exercise has an `explain` and at least one hint (300 with 1, 76 with 2, 45 with 3). Every wrong option has a `why` and a `kind` (concept or implementation). Multi-answer MCQs: 15. All 57 interview exercises have `fn` and a model answer with all five stages (clarify, brute, optimize, edges, complexity).
- Fill: 147 accepted alternatives over 27 exercises. Trace: 186 rows over 50 exercises; 47 have a `verify` script. **No `verify`: `w2d1-4`, `w9d3-1`, `w12d1-2`** (answers checked by hand and correct).
- Reference solutions total 41,769 characters; `dist/exercises.json` is 562,366 bytes.
- The 15-statement classification drill appears twice, identically: `w3sat-1…15` and `method-1…15`.

## 8. Visualizers (129)

| File | Count | | File | Count |
| --- | --- | --- | --- | --- |
| algo-map.js | 1 | | w07.js | 11 |
| w01.js | 18 | | w08.js | 10 |
| w02.js | 15 | | w09.js | 9 |
| w03.js | 11 | | w10.js | 8 |
| w04.js | 14 | | w11.js | 8 |
| w05.js | 12 | | w12.js | 2 |
| w06.js | 10 | | | |

- References in `tests/refs.mjs`: all 129 (112 compare with a brute-force `ref`, 10 with `ref` plus a custom `cmp`, 7 with a `check` function); 126 have a random generator.
- Input fields (208): numbers 62, int 48, json 42, string 19, select 18, number 16, array 3. `depmap` has no inputs and no presets.
- Step state: 214 distinct keys. Some steps hold `Set` objects, so steps are not JSON-serialisable (shareable URLs must store input and step index, then re-run).
- `MAX_STEPS` is 600.
- Rendering helpers used by `render()`: cells 83, vars 67, grid 12, kv 11, graph 11, row1d 10, tree 8, stack 8, bars 7, queue 6, list 6, bits 5, intervals 4, svg 4 (only `growth`), table 2, heap 2, frames 2, binTree 1 (through the `T` helper in w06). Median `render()` is 491 characters. Only `growth` draws its own SVG.
- Pieces beyond the brief's primitive list: row containers and panel labels, chips (`hash-buckets`, `group-anagrams`), marks (`loopDef`), adjacency text (w08), a results list (`renderBT` in w05), problem text (`recognise`), log-scale bars (`growth`), a `small` grid variant (`pairGrid`).
- Factories and helpers: `loopDef`, `boundDef`, `componentsDef`, `tracer`, `heapSteps`, `parseTree`/`T`, `circle`/`layered`, a seeded generator in `quicksort3`.
- For the new modes: only `pair-brute` is a brute-force visualizer; no visualizer marks decision steps, counts operations or takes a size parameter.
- References that check little (a constant, an echo of the input, or a count instead of the structure): `amortized-push`, `tree-build`, `tree-construct`, `growth`, `depmap`, `interview-clock`, `recognise`.
- Date and timetable words in visualizer text (titles, preset labels, legends, notes): 104 strings in 53 visualizers, for example presets "Day 2 trace", "Roadmap dry run", and the note "Week 7 redoes this". Some are domain text, such as "Day 0, price 7".

## 9. Patterns (47) and where they are taught

Per week: W1 4, W2 5, W3 3, W4 4, W5 4, W6 4, W7 5, W8 5, W9 4, W10 4, W11 5, W12 0. Each is pulled into exactly one lesson:

| Week | Pattern → lesson |
| --- | --- |
| 1 | 1.1 L1 · 1.3 L2 · 1.2 L3 · 1.4 L5 |
| 2 | 2.1 L1 · 2.2 and 2.5 L2 · 2.3 L3 · 2.4 L5 |
| 3 | 3.1 L1 · 3.2 L3 · 3.3 L5 |
| 4 | 4.1 L1 · 4.2 L2 · 4.3 L4 · 4.4 L5 |
| 5 | 5.1 L2 · 5.3 L3 · 5.2 L4 · 5.4 L5 |
| 6 | 6.3 L2 · 6.1 L3 · 6.2 L4 · 6.4 L5 |
| 7 | 7.1 and 7.2 L2 · 7.3 L3 · 7.4 L4 · 7.5 L5 |
| 8 | 8.1 L1 · 8.2 L3 · 8.3 L4 · 8.4 and 8.5 L5 |
| 9 | 9.1 L1 · 9.2 L2 · 9.3 L4 · 9.4 L5 |
| 10 | 10.1 L2 · 10.2 L3 · 10.3 L4 · 10.4 L5 |
| 11 | 11.1 L1 · 11.2 L2 · 11.3 L3 · 11.4 L4 · 11.5 L5 |

## 10. Problem bank (173)

- Tier: Core 114, Stretch 39, Optional 20. Difficulty: Easy 44, Medium 119, Hard 10. Role: Intro 29, Core 80, Transfer 49, Challenge 15.
- Per week: W1 14, W2 17, W3 14, W4 17, W5 15, W6 19, W7 15, W8 16, W9 12, W10 14, W11 14, W12 6.
- The bank's pattern column is free text with **164 distinct values**. There is no mapping from problems to the 47 patterns.
- Schedule against bank: 0 week or day mismatches. The 6 Week 12 problems (438, 287, 853, 981, 380, 678) appear in the schedule only as text.
- Referenced but not in the bank: **239 and 297** (Week 12 Hard options); **1480, 349, 14, 2** (diagnostic B1–B4; the W1 lesson 1 warm-up re-solves 349).

## 11. Reserved problems (31)

None of them is in the bank.

| Set | Reserved problems | Cold re-solve choices | Time | Pass |
| --- | --- | --- | --- | --- |
| A1 | 1456, 974 | 49, 3, 560, 11 | 80 + 10 min | 21/30 |
| A2 | 82, 901 | 34, 153, 146, 143 | 80 + 10 | 21/30 |
| A3 | 216, 1026 | 739, 39, 79, 236 | 75 + 15 | 21/30 |
| A4 | 1642, 1376 | 23, 56, 200, 207 | 85 + 5 | 21/30 |
| A5 | 1319, 343 | 743, 684, 55, 198 | 80 + 10 | 21/30 |
| A6 | 909, 1049, 1268 | one from the weakest pattern (10 min) | 100 | 28/40 |
| Mock pools | M1 525, 1679, 735 · M2 1161, 437, 692 · M3 1926, 1466, 1306 · M4 931, 1048, 120 · M5 1834, 2101, 1352 · M6 863, 1162, 2024 | | | 14/20, no dimension at 1 |

The assessment rubric (§9.1) gives 10 points per problem: correct, accepted solution 4 (2 if accepted late, 1 if the approach is right but buggy); optimal or acceptable complexity 2; complexity stated correctly 1; edge cases 2; brute force articulated 1. A pass needs at least 70% of the points and at least one unseen problem fully accepted.

## 12. Date and timetable wording

Occurrences outside section 9 (r = in the roadmap):

| Kind | Count |
| --- | --- |
| Calendar dates | 177 (all r) |
| Weekday names | 302 (r 195) |
| "Week N" | 272 (r 133) |
| Schedule codes `WnDn` | 222 (all r) |
| "Day N" | 115 (r 25) |
| "12 weeks" | 8 |
| today / tomorrow / yesterday | 116 (r 11) |
| holiday | 10 |
| fall behind / catch up | 26 |
| hours-per-day budgets | 8 |
| **Total** | **1,256** |

Also: the word "roadmap" appears 13 times in lesson content, and "section N" references 7 times.

Domain text that a word ban would wrongly flag (needs an allowlist): "days until warmer", "price ≤ today's", "today's 190", "calendar day" in an explanation of problem 983, "Day 0, price 7".

Rewrites that need care: holiday rows in W8 and W9; W9 lesson 5's `@why` ("the day after a holiday and a mock"); W9 Saturday "moves to tomorrow"; W8 Saturday "except Sunday's bipartite topic"; §8.4 tracker example rows with dates; §12.1 maintenance table keyed by weekday; §10.3 milestone headings; §10.4 "ends on 31 Jan"; the heading "Topic prioritisation (Module 14)", which collides with the Week → Module rename; exercise tags such as "Day 2 dry run"; "Tuesday's Stretch (33)"; "next Saturday"; "Yesterday's …"; names of legacy app pages ("Mock interviews page", "Scorecards", "Revision", "Problems and journal", "Assessments"); "top of the week page"; "reference 6.x".

## 13. Unseen leaks (missed by the legacy test)

The legacy test only looks for "LeetCode N", "problem N" or "(N)" in `content/*.md`. These slip through:

| Reserved | Where | What |
| --- | --- | --- |
| 974 (A1) | `content/w02.md:1685` | exact statement, in "After the assessment" on the W2 Saturday page |
| | `content/w03.md:1198`, `content/extra.md:361`, `source/roadmap.md:3272` | exact statement, drill item 6 (W3 Saturday, method page, §7.3) |
| | `source/roadmap.md:564`, `:3238`, `content/w02.md:1438` | clue words "divisible by k" (Pattern 2.4, §7.2 table, W2L5 `@why`) |
| 901 (A2) | `content/w04.md:1185` | statement plus the name "(stock span)", in "After the assessment" on the W4 Saturday page |
| | `source/roadmap.md:963` | clue "stock span" (Pattern 4.4) |
| 1026 (A3) | `content/w06.md:996` | exact statement, in "Quick review" on the W6 Saturday page |
| | `source/roadmap.md:1179` | "max difference between node and ancestor" as an example in W6 theory |
| All A1–A6 | schedule rows in §4 | e.g. "A1 set: 1 cold re-solve + 1456 + 974"; the legacy Saturday page shows this cell |

Week 12 problems whose pattern is named before they are attempted: 438 (`roadmap.md:558`, "567/438" in Pattern 2.3), 287 (`:941`, Pattern 4.2 clues), 678 (`:1872`, "678 in Week 12" in Pattern 9.4), and 981 and 380 by name in §2 ("Design problems (LRU, Time Map, GetRandom O(1))", placed "W12 Day 2").

The legacy app renders a whole Saturday page at once, so a learner sees the "after" exercises before the assessment.

## 14. Learner-specific wording

- `roadmap.md:3` byline "Oct 26, 2026 · @rohit"; `:5` "Corrected edition (26 Oct 2026)".
- `:47` "What a 3.5-year MERN developer usually looks like on day one"; `:3588` "for 3.5 years of experience"; `:3623` "for a 3.5-year engineer"; `:3533` "about 2 hours a day with a full-time job".
- "Claude" appears 4 times in lesson content ("Claude in a new chat", W5, W9, W11, W12) and in the copyable mock-interviewer prompt in §9.3.

## 15. Defects found in the legacy course

No factual error was found in the theory while reading it. The tests prove answers and results, not prose.

1. **`mastered()` misses valid evidence** (`src/app.js`, lines 70–76). It counts consecutive pairs of clean re-solves at least 7 days apart, so clean re-solves on days 0, 6, 7, 13, 14 and days 0, 3, 6, …, 21 both return false, although each contains three solves 7 days apart (0, 7, 14). A greedy count gets both right. Verified by running the legacy logic. Fix and test in Phase 6.
2. **Reserved problems leak** onto pages seen before the assessment (section 13). Fix and test in Phases 2 and 6.
3. **The reserved-problem test is too weak**: it checks numbers in `content/*.md` only. Replace in Phase 2.
4. **Build and browser tests fail on Windows**: `new URL(import.meta.url).pathname` becomes `C:\C:\…` and `'file://' + path` is not a valid file URL. Phase 1 adds a runner that copies and patches without editing legacy files.
5. **`playwright` is not declared** in `package.json`.
6. **3 trace exercises have no `verify`** (`w2d1-4`, `w9d3-1`, `w12d1-2`). Add in Phase 4.
7. **7 weak visualizer references** (section 8). Strengthen in Phase 3.
8. **Random inputs are skipped silently** when an error message matches `/Keep|Use|must|Need|at most|fits/`. Nothing is skipped today, but a broken generator would go unnoticed. The port skips only on a `validate` error and requires at least 250 of 300 accepted.
9. **The PDF companion's default time split** (`src/print.js`: T25 · I20 · P50 · R20 · N5) differs from the roadmap and the app (T25 · I15 · P60 · R15 · N5).
10. **README inaccuracies**: the companion PDF is missing; "85 pages" counts week overviews.

## 16. This machine

- Windows 11 Pro, Node 24.21.0, npm 11.19.0, git 2.55.0.windows.5, Docker CLI 29.8.0 (**daemon not running**). `gh` and `mongod` are not installed.
- All 51 legacy files use LF line endings. Git's system config (`C:/Program Files/Git/etc/gitconfig`) sets `core.autocrlf=true`, so `.gitattributes` pins LF.
- Global git identity: `Tushar-Deshmukh <tushardeshmukh57985@gmail.com>`.
