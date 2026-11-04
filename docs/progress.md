# Progress

One entry per phase, newest first: what was built, what was tested and how, and what is not done. Nothing is marked done without a test.

## Phase 2: Content pipeline (2026-11-04) — waiting for your review

Branch `phase-2-content`. What I need from you is at the end of this entry.

### Built

- **Importer** (`scripts/import-legacy.ts`, `scripts/import/`). TypeScript ports of the legacy roadmap and block parsers, the rewrite tables and engine, MDX escaping, slugs, the writer, and the reports. Running it again without `--force` refuses to touch `content/`.
- **`content/`, 444 files.**

  | Item | Count |
  | --- | --- |
  | Modules | 13 (Foundations and Modules 1–12) |
  | Lessons | 63 (60 study, 3 Foundations) |
  | Checkpoints | 12, each with before, attempt and after phases |
  | Theory fragments | 150, plus 47 pattern write-ups and 12 learning-objective blocks: all 209 |
  | Handbook pages | 75 |
  | Exercises | 421 |
  | Units | 290 (the 278 legacy sections, plus 12 Foundations assembles) |
  | Visualizer embeds | 132 of 129 ids |
  | Problems | 173, plus 6 extension entries (239, 297, 1480, 349, 14, 2) |
  | Reserved problems | 31, in `content/reserved/` |

- **Rewrites.** 665 changed lines and fields, every one logged with its rule: 578 lines and 87 exercise fields. `docs/date-rewrites.md` and `docs/content-changes.md` list them by rule, and `docs/import/changes.json` is the machine-readable log.
- **Stable ids.** `content/ids.lock.json` holds every id, and `content/legacy-id-map.json` maps legacy ids for backup import. Modules and lessons have hand-written slugs (`docs/slug-review.md`).
- **`npm run content:check`.** Schemas, MDX rules, references, slugs, coverage, dates, reserved problems and counts (`lib/content/`). It now runs before every build and in CI.
- **`npm run content:sync`.** Writes `modules`, `lessons`, `patterns`, `exercises_public`, `problems`, `handbook` and `content_meta`, with a per-item version and a text index.
- **Public and key split** of every exercise (`lib/content/split.ts`, D-011).
- **Gated text** (D-027, new). Text that restates a reserved problem or gives an answer away is held back until an event. That is 29 exercises and 3 passages.
- **Docs.** `docs/content-format.md`, `docs/import-report.md`, decisions D-027 to D-029.

### Tested, and how

| Gate | How | Result |
| --- | --- | --- |
| Every count matches the inventory | `lib/content/expected.ts`, typed by hand from `docs/inventory.md`; types, modules, tiers, tests, hidden tests, trace rows and fill alternatives included | passes |
| The ported parsers match the legacy code | Against `legacy/tools/curriculum.mjs` directly, and against the output of the real legacy build run on a temporary copy: every exercise deep-equal to `dist/exercises.json`, and the rendered text and code blocks of all 72 lesson and Saturday pages, 12 week pages, 4 extra pages and the 10 roadmap sections the app shows equal to `dist/course.json` | passes |
| Exercises deep-equal the legacy ones | Log replayed over the legacy exercises, compared with `content/`, all 421 | passes |
| Rendered text equals the legacy text plus logged changes | Log replayed over the legacy files, parsed with the ports, rendered with marked 15.0.12, compared with the compiled and rendered MDX: lessons, checkpoints, overviews, fragments, patterns and handbook pages, with code blocks compared exactly | passes |
| Frontmatter, bank and reserved files equal the legacy data | Same replay; exact strings | passes |
| The fidelity tests catch a change | Changed on purpose, one at a time, then restored: a word in a lesson, a hint in an exercise, a code block in a fragment, and one entry removed from the log. Each made the tests fail | passes |
| Content checks, including dates and reserved problems | `npm run content:check` on the real content, plus 88 tests, nearly all of which break one rule and confirm the check fails | passes |
| Sync is idempotent | Real MongoDB (in-memory): the second run writes nothing, and every document and `syncedAt` stay the same. A changed item gets a new version, a removed item is deleted. The real `npm run content:sync` command is run too: 781 written, then 0 written | passes |
| Nothing secret reaches the database | Every reserved title, URL and gated text absent; no gated exercise; no answer field; no explanation or solution as text; no hidden test; no Module 12 pattern, hint, prerequisite or reason; "after" units out of search | passes |
| Lint, types, format | `npm run lint`, `typecheck`, `format:check` | clean |
| Vitest | `npm test`: unit, integration and content | 282 passed in 16 files |
| Playwright | `npm run build:e2e`, then `npx playwright test` in Chromium, Firefox and WebKit | 115 passed, 8 skipped (the budget test measures in Chromium only) |
| Legacy suite | `npm run legacy:test` on Windows | 119,205, 62,397, 3,644 and 13 checks passed; 100 pages without overflow |
| CI on GitHub | Ubuntu 24.04: lint, types, format, content check and Vitest; end-to-end in Chromium; the legacy suite | all three jobs passed on the branch |

### Found and fixed in this phase

Each of these is covered by a test.

- **Unseen leaks** (inventory 13): reserved numbers in schedule cells, the §9.2 problem list, and exact statements in "after" units and in drill item 6 are out of public text. The number-only legacy test is replaced by a check on titles, URL slugs, numbers and paraphrases.
- **Module 12 problems named next to their pattern** in four theory lines, as you agreed (question 5c).
- **Answers in public pages**: the §1 answer key and the §7.3 drill answers moved behind a gate (D-027).
- **My own inventory** said some unused exercise fields were in use, and that `kind` is `implementation` where the data says `impl`. Both corrected in `docs/inventory.md`.
- **`npm run content:sync` crashed on its first real run**: tsx does not allow top-level await in this project's module format, and the tests had only called the function behind it. All the content commands now have tests that run the real command.
- **Links were not scanned.** The first reserved-problem check read text only, so a link to a reserved problem's URL got through. One of its own tests caught this, and it now reads links as well.
- **A deprecated Mongoose option** from Phase 1 in the rate limiter (`new: true`) is replaced.

No factual error in the course text turned up during the import. One oddity, unchanged: a hidden test in `w01.md:307` is written as `[0, -0]`, and the legacy parser reads it as `[0, 0]`. Its answer is the same either way (D-008).

### Changes against the plan

- **Gated text is new.** See D-027 and the decision below.
- **No MDX serialiser.** The importer adds a backslash where one is needed and changes nothing else, so MDX stays byte-for-byte the legacy Markdown otherwise (D-028).
- **Unit time estimates are not split yet.** Each lesson has its legacy estimate, and every study lesson totals 120 minutes. Dividing those minutes among units (plan 5.3) moves to Phase 5, which is what first shows them.
- **`content:lock` is added**, so a new id is one command to lock.

### Not done or not tested

- **Visualizer text.** The 104 strings with date words in 53 visualizers are rewritten in Phase 3, when visualizers are ported. Until then the date check cannot read them.
- **Nothing shows this content yet.** Lessons, the handbook and exercises render from Phase 4 and 5 on.
- **Nothing reveals gated text yet.** The key endpoint arrives in Phase 4, and gates in Phase 6. The build-output scan for reserved problems (D-012) arrives in Phase 6, when there is output to scan.
- **`content:sync` has run only against in-memory MongoDB**, not against Atlas or `docker compose`.
- **Legacy backup import** needs ids for ready checks and the readiness checklist. They are added with that feature in Phase 7.
- **New material** (glossary, confused-with links, the problem-to-pattern table) waits for question 7. `<Term>` fails the check until there is a glossary.
- **`--force`** replaces all of `content/`, so it will need changing once hand-written material lives there.

### What I need from you

1. **Slugs:** read `docs/slug-review.md` and say if any should change. They freeze when you approve.
2. **Rewrites:** skim `docs/date-rewrites.md` and `docs/content-changes.md`.
3. **Four choices I made that you may want to overrule:**
   - **Gating drill item 6.** Your answers did not cover it (D-027). It restates a problem of Assessment 1, so it is held back until that assessment is finished.
   - **Line 941.** Removing only the number 287 would leave "find the duplicate", which names the problem, so the whole clause went.
   - **After-course durations stay.** "4–6 more weeks", "about 6 hours a week", "two mocks a week" are in the handbook's after-the-course pages, allowlisted with a reason. They are advice about practice after the course, not a timetable. If you want them gone too, say so.
   - **§0 assumptions table.** The "Start date" and "Holidays" rows are removed, and "Study days" became "About 2 h per lesson".

## Phase 1: Foundation (2026-11-04) — merged (PR #1)

Branch `phase-1-foundation`.

### Built

- **Legacy course.** Moved into `legacy/` (a pure rename: 50 files, no content change). `npm run legacy:test` runs the legacy suite unchanged on a temporary copy, with the Windows path fixes applied only to that copy.
- **App foundation.**
  - Next.js 16.4.5 App Router, React 19.3.1, TypeScript 6.0.3 strict, ESLint 9 with Next's rules plus type-aware checks, Prettier.
  - Design tokens from the legacy stylesheet, with light and dark themes (system preference or manual choice) and fonts self-hosted through `next/font`.
  - Reduced-motion handling and focus mode.
- **App shell.**
  - Header with navigation, save status, focus-mode button and account menu; a menu button below 1024 px.
  - Command palette (Ctrl/Cmd + K, loaded on first use), shortcuts dialog (`?`), skip link.
  - Placeholder pages for later sections, each naming its phase.
- **Settings page.** Theme, motion, focus mode, default session length, editor font size, depth profile.
- **Database.** MongoDB through Mongoose on one shared driver. Indexes are created on start-up, for the auth collections too. The environment is validated with Zod (`lib/env.ts`).
- **Accounts.**
  - Better Auth magic links: single use, 5 minutes, tokens stored hashed.
  - GitHub sign-in, shown only when it is configured.
  - Origin and callback checks forced on; per-IP sign-in limits stored in MongoDB.
  - The browser talks to four auth endpoints through a small client (`lib/client/auth.ts`).
- **Guest mode and sync.**
  - One IndexedDB store per owner (guest or account), with a memory fallback that says "Not saved".
  - An operations outbox, sent to `/api/sync`: validated, scoped to the user, rate-limited, idempotent per operation, one transaction per operation.
  - Guest settings merge into the account on first sign-in.
  - Offline start uses the last confirmed account.
  - Sign-out removes the account's copy from the device only after the server confirms.
  - The save status follows the rules in `lib/client/save-status.ts`.
- **Security.**
  - Policy header plus a per-page script-hash policy (17 prerendered pages).
  - Runner Worker with its own policy and the network, storage and messaging lockdown.
  - Security headers, and a same-origin and JSON check on writes.
- **Tooling.** Docker Compose (MongoDB 8.0.34 as a replica set, Mailpit v1.33.0), `.env.example`, `README.md`, and a GitHub Actions workflow with actions pinned to commit SHAs.

### Tested, and how

| Gate | How | Result |
| --- | --- | --- |
| Static checks | `npm run lint`, `npm run typecheck`, `npm run format:check` | clean |
| Unit and integration tests | `npm test` (Vitest 5.1.0); integration tests run against MongoDB 8.0.34 as an in-memory replica set, plus an in-process SMTP server | 61 passed in 9 files; details below |
| End-to-end | `npm run build:e2e` then `npm run test:e2e` (Playwright 1.64.1) against the production build; Chromium, Firefox and WebKit on Windows | 111 passed in all three browsers. A full run repeated twice: 222 passed. JavaScript budget: 4 passed (Chromium only) |
| Legacy suite | `npm run legacy:test` (Chromium) | identical to Phase 0: content 119,205, templates 62,397, UI 3,644, behaviour 13 passed; 100 pages without overflow. Run twice |
| Single driver | `npm run check:deps` | mongodb 7.7.0, bson 7.3.3 |
| JavaScript per page | Chromium resource timing on the production build | 165–167 KB gzip on the shell pages (budget 200 KB, tested) |
| Development server | throwaway script: `next dev` with an in-memory MongoDB, driven by Chromium | pages load; the development policy allows eval as intended; no policy violations or page errors; sign-in and saving to the account work. Once, on the first start after code changes, the page reloaded in a loop; two later runs did not repeat it |
| Compose file | `docker compose config` | valid |
| CI on GitHub (Linux, Ubuntu 24.04) | GitHub Actions, the push run and the pull-request run of PR #1 | all three jobs passed in both runs: checks (9 test files), legacy suite (same numbers as on Windows), end-to-end (41 Chromium tests). About 5½ minutes per run |

The unit and integration tests cover:
- Settings merging: commutative, associative and idempotent, checked on 500 random cases.
- Operation validation and rebase.
- Environment rules.
- Policy builders and the script-hash step.
- The legacy patches, against the real legacy files.
- Device store and sync engine, with a fake server (offline retry, 401, rejected operations).
- Save-status rules.
- Against the database:
  - shared driver and indexes;
  - sync service: applied, duplicate and rejected operations, out-of-order changes, clock skew, isolation between learners;
  - rate limiter;
  - magic link: hashed token, single use, cookie flags;
  - cross-site cookie request refused (403); foreign callback URL refused (403);
  - Better Auth's limiter returns 429;
  - `/api/sync` returns 200, 400 and 401 where it should.
- SMTP delivery of the sign-in email.

The end-to-end tests cover:
- Shell, palette, shortcuts, focus mode surviving a reload.
- Script policy on five route types: no violations; injected script and inline handler blocked; page eval blocked; blob workers blocked.
- Runner: eval works inside it; network, storage and messaging globals are gone; logs and errors come back; a runaway run is stopped.
- Sign-in and sign-out; a used link is refused.
- Guest persistence, merge on sign-in, offline queue and resend, a second device.
- axe with WCAG 2.2 AA tags: five routes in both themes, plus the open dialogs.
- No horizontal scrolling at 360 px; the small-screen menu.

### Found and fixed in this phase (each now has a test)

1. **Better Auth 1.7.16 switches its origin and callback checks off when `NODE_ENV=test`** (`create-context.mjs`, line 211). Set on explicitly; integration tests prove the 403s.
2. **Better Auth stores magic-link tokens in plain text by default.** Now `storeToken: 'hashed'`; a test checks the raw token is not in the database.
3. **Zod 4 probes for eval.** Under the strict policy, browsers reported this as a violation on every page. Shared schemas now set `jitless` before any schema is built; end-to-end tests assert zero violations.
4. **Sign-out could delete the device copy** even when the server refused the sign-out, for example when rate-limited. It now checks the response, and an end-to-end test checks the session really ended.
5. **The save status was not always true.** It could say "Saved" while a write was still in flight, or "waiting, account unreachable" during the normal pause before sending. The rules now live in a pure function with unit tests, and "Saving…" renders before the change handler returns.
6. **Every page shipped about 100 KB of extra JavaScript**: the Better Auth browser client and full Zod. Replaced by the thin auth client and `zod/mini` (D-026): 263 → 165 KB gzip.
7. **A CI expression mixed `&&` and `||`** without parentheses. Fixed before it ever ran.
8. **Design: the `ink-3` token** (#7b8792) reached only 3.4:1 on the page background. Darkened to #64707b (4.7:1); axe passes in both themes.

### Changes against the plan

- **D-014.** Raw IndexedDB instead of idb-keyval: the document and the outbox must change in one transaction, which needs two object stores.
- **D-022.** CI uses `mongodb-memory-server`, because GitHub's service containers cannot start a replica set.
- **D-002.** Better Auth's browser client is not used (D-026). New setting `AUTH_RATE_LIMIT`: off only on the end-to-end server, where all test browsers share one IP. Production refuses it.
- **Sign-in options.** The sign-in methods are fixed at build time, because the sign-in page is static. Tests use `npm run build:e2e`; production must set `EMAIL_TRANSPORT` and `GITHUB_*` before building.
- **Runner client.** The client helper for the runner moves to Phase 4. Phase 1 has the isolated Worker and its tests.

### Not done or not tested

- `docker compose up`: not run, because the Docker daemon is not running on this machine (the file validates). Mailpit is not exercised; the SMTP path is tested against an in-process server instead.
- GitHub sign-in: needs an OAuth app under the `Tushar-Deshmukh` account; untested.
- CI: runs on GitHub (above). Firefox and WebKit run only in the nightly job, which has not run yet.
- Vercel: not deployed. The per-page hash policy (D-006 risk) and the `Secure` cookie flag (HTTPS only) are unverified there. `vercel.json` and `docs/deployment.md` are ready for the first deployment.
- Production email provider: not chosen. Production builds have email sign-in switched off until one is set.
- Guest data meeting account data: "add to my account" or "not now" only. Settings merge safely by design; the full three-way choice comes with richer data in Phase 7.
- Multiple tabs: a change in one tab reaches other open tabs only after they reload.
- Real-device performance (LCP, time to interactive on a mid-range phone): not measured; only the JavaScript weight is.

## Phase 0: Read and plan (2026-11-04) — approved

Your answers (2026-11-04):
- Q1: Better Auth.
- Q4: a free Vercel account and the free MongoDB Atlas tier.
- Q17: the `Tushar-Deshmukh` git identity and GitHub account.

Every other open question takes its default. Still open: the production email provider (D-025).

### Built

- **Repository.** Created the git repository. The root commit on `main` holds the course exactly as received, plus `.gitattributes` (LF line endings) and `.gitignore`. Everything else is on branch `phase-0-plan`.
- **Documents:** `CLAUDE.md`, [plan.md](plan.md), [decisions.md](decisions.md), [inventory.md](inventory.md) and this file.
- **Reproduction.** The measurement scripts and spike sources are in [phase-0/](phase-0/README.md).
- **No application code.**

### Tested, and how

| What | How | Result |
| --- | --- | --- |
| Legacy build | `node tools/build.mjs` on a path-patched copy (Windows) | 73 lesson pages, 421 exercises, 129 visualizers, 0 warnings; output identical to the shipped HTML apart from `builtAt` |
| Legacy content tests | `node tests/content.mjs` | 119,205 passed, 0 failed, 62 warnings (explained in inventory §3) |
| Legacy template tests | `node tests/templates.mjs` | 62,397 passed, 0 failed |
| Legacy UI tests | `node tests/ui-exercises.mjs`, Chromium | 3,644 passed, 0 failed |
| Legacy behaviour tests | `node tests/behaviour.mjs`, Chromium | 13 passed, 0 failed |
| Legacy layout smoke | `node tests/smoke.mjs` with all 100 page ids, 375 px | 0 pages overflow |
| Legacy app opened | Playwright, Chromium, screenshots | no page errors |
| Inventory | scripts in `docs/phase-0/scripts/` | all counts in [inventory.md](inventory.md) |
| Proposed dependencies resolve | `npm install --package-lock-only` | TypeScript 6.0.3 with ESLint 9.39.5: no peer conflicts, one `mongodb`; the newer majors conflict (D-003) |
| MDX on legacy prose | `docs/phase-0/spikes/mdx` | 471 of 471 chunks compile after escaping; text matches the legacy renderer in 470 (D-008) |
| Script policy | `docs/phase-0/spikes/web/run-csp.mjs`; Next 16.4.5 production build; Chromium, Firefox, WebKit | per-page hashes work and stay static; experimental SRI and plain nonces fail (D-006) |
| Runner isolation | same spike, all three browsers | eval allowed only in the Worker; network blocked; IndexedDB removed; page stays responsive during an infinite loop and can terminate the Worker (D-007) |
| Better Auth with Mongoose on one driver | `docs/phase-0/spikes/web/auth-spike.mjs` against MongoDB 8.2.6 (replica set, mongodb-memory-server) | magic-link round trip, single-use token, cookie flags, collection names, GitHub authorize URL, cross-collection transaction (D-002) |

### Defects found in the legacy course

Details are in [inventory §15](inventory.md#15-defects-found-in-the-legacy-course). Phase 0 changes nothing, so each defect is fixed, with a test that would have caught it, in the phase shown.

| Defect | Fix in |
| --- | --- |
| `mastered()` rejects valid evidence (counter-examples verified) | Phase 6 |
| Reserved problems visible before their assessment (974, 901, 1026), and Module 12 patterns named in the theory | Phases 2 and 6 |
| The reserved-problem test checks numbers only | Phase 2 |
| Build and browser tests fail on Windows; Playwright is not declared | Phase 1 (`legacy:test`) |
| 3 trace exercises lack `verify` | Phase 4 |
| 7 weak visualizer references | Phase 3 |
| Random inputs skipped silently on matching error messages | Phase 3 |
| The PDF companion's default time split disagrees with the roadmap | not ported (open question 19) |
| README inaccuracies | noted only |

### Not done or not tested

- `tools/pdf.mjs` and `tests/vizshot.mjs` were not run. The legacy browser tests ran in Chromium only.
- The spikes are throwaway code, outside the app:
  - The script-policy approach has not been tried on Vercel or any host other than `next start` on this machine.
  - The GitHub OAuth callback was not tested, because it needs a real OAuth app.
  - Email was captured in a callback, not sent.
- Docker Compose was not tried: the Docker daemon is not running here.
- No CI was run: there is no remote, and `gh` is not installed.
- The commits use this machine's global git identity, `Tushar-Deshmukh`. This needs your confirmation (plan, question 17).
- All the open questions in [plan.md §16](plan.md#16-open-questions) still need answers.
