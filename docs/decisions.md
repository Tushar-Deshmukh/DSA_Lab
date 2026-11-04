# Decisions

Hard-to-reverse choices, each with the alternatives rejected and the evidence behind it. The Phase 0 plan was approved on 2026-11-04: you answered questions 1, 4 and 17 and accepted the defaults for the rest, so every entry is **accepted** unless it says otherwise.

Evidence labelled "spike" comes from throwaway experiments whose sources are in [phase-0/spikes/](phase-0/README.md). Counts come from [inventory.md](inventory.md).

---

## D-001 Repository setup and the legacy folder

**Context.** The folder was not a git repository, and the legacy course sits at the root, not in `legacy/`. Every legacy file uses LF line endings, but this machine's system git config sets `core.autocrlf=true`, and the legacy parsers split text on `\n`.

**Decision.**
- `git init` with `main`. The root commit holds the folder exactly as received plus `.gitattributes` (`* text=auto eol=lf`) and `.gitignore`. Phase 0 documents go on branch `phase-0-plan`.
- The first commit of Phase 1 moves the legacy files into `legacy/` with `git mv` (`BUILD_PROMPT.md` stays at the root). After that, `legacy/` is never edited.
- `npm run legacy:test` (Phase 1) copies `legacy/` to a temporary directory, applies the path fixes listed in [phase-0/README.md](phase-0/README.md), builds, and runs the legacy suite. The legacy files stay untouched.

**Rejected.** Moving files during Phase 0, which is read-and-plan only. Patching the legacy files in place so they run on Windows, because the brief says to keep them untouched. Relying on `core.autocrlf`, because CRLF checkouts would put `\r` into every parsed line.

**Reversal cost.** Low.

---

## D-002 Authentication library — **Better Auth, approved 2026-11-04**

**Context.** The brief says "Auth.js with the MongoDB adapter". The current state, checked on 2026-11-04:
- `next-auth` v5 is still beta (`5.0.0-beta.32`). The July 2026 security post says "`next-auth` v5 is still in beta and ships on the `beta` tag". That post fixed four advisories, in `5.0.0-beta.32`, `4.24.15` and `@auth/core` 0.41.3.
- `next-auth` v4 (`4.24.15`) is in "maintenance mode" per the Auth.js integrations page.
- Auth.js is now part of Better Auth. Its migration page says: "if you're starting a new project or facing challenges with your current setup, we strongly recommend using Better Auth."
- `@auth/mongodb-adapter` 3.11.3 requires `mongodb` ^6, but Mongoose 9.11.4 depends on `mongodb` ~7.7. A test resolve installed two drivers (6.22.0 and 7.7.0), so the app would run two connection pools with two incompatible `ObjectId` classes.

**Decision (proposed).** Use Better Auth 1.7.16 with `@better-auth/mongo-adapter` 1.7.16, the magic-link plugin and the GitHub provider. It runs on the same `MongoClient` as Mongoose. Collections are renamed to the brief's names: `users`, `sessions`, `accounts`, `verification_tokens`. Guests are not accounts: guest progress stays in the browser until first sign-in (D-014).

**Evidence (spike, against MongoDB 8.2.6 as a single-node replica set).**
- One driver: Mongoose's client is an instance of the top-level `MongoClient` (7.7.0). No nested driver was installed.
- Magic link: the request returned 200 and our `sendMagicLink` callback received the link, so no email service was needed for the test. Verification returned a 302 to `/` and set a session cookie with `HttpOnly` and `SameSite=Lax` (`Secure` is off on `http://localhost`). The session resolved to the user. Reusing the link failed with `INVALID_TOKEN`.
- The collections were created as `users`, `sessions` and `verification_tokens`. `accounts` appears on the first OAuth link, which was not tested. User ids are `ObjectId`s, exposed as 24-character hex strings.
- GitHub: the sign-in start returned a `github.com` authorize URL. The callback was not tested, because it needs a real OAuth app.
- A Mongoose transaction that wrote to a Mongoose model and to the auth `users` collection committed, and a failing one rolled back.

**Rejected.**
- `next-auth` 5.0.0-beta.32: beta software, and it brings the second driver.
- `next-auth` 4.24.15: maintenance mode, and the same driver split.
- Writing our own auth: avoidable security risk.

**If you prefer Auth.js**, the stable option is v4.24.15. Either accept the second driver or write a small adapter on our driver.

**Reversal cost.** High once real users exist, because the session and account schemas differ. Decide before Phase 1.

**Phase 1 notes.**
- Better Auth turns its origin and callback-URL checks off when `NODE_ENV=test`. The config sets `advanced.disableOriginCheck: false`, and integration tests prove the 403s.
- Magic-link tokens are stored hashed (`storeToken: 'hashed'`).
- Per-IP limits are stored in MongoDB (`auth_rate_limits`); the 429 is tested. `AUTH_RATE_LIMIT=off` is allowed only outside production, for the end-to-end server.
- The browser does not load Better Auth's client library. It calls the four endpoints it needs (D-026).

---

## D-003 TypeScript 6.0.3 and ESLint 9.39.5, not the newest majors

**Context.** The newest versions are TypeScript 7.0.2 and ESLint 10.14.0, but:
- `typescript-eslint` 8.72.1 requires `typescript >=4.8.4 <6.1.0`, and its issue #12518 tracks TypeScript 7 support.
- `eslint-config-next` 16.4.5 bundles `eslint-plugin-import`, `eslint-plugin-jsx-a11y` and `eslint-plugin-react`, whose peer ranges stop at ESLint 9.

**Evidence (lockfile-only resolves of the proposed stack).**

| Combination | Peer-dependency overrides |
| --- | --- |
| TypeScript 7.0.2 (first resolve, newest version of everything) | 11 |
| TypeScript 6.0.3 + ESLint 10.14.0 | 3 |
| TypeScript 6.0.3 + ESLint 9.39.5 | none (717 packages) |

**Decision.** Pin TypeScript 6.0.3 and ESLint 9.39.5. Revisit when `typescript-eslint` and `eslint-config-next` support the new majors.

**Phase 1 note.** npm now marks ESLint 9.39.5 as "no longer supported". It runs only on developer machines and in CI, never in the app. Accepted until Next's lint plugins support ESLint 10.

**Rejected.** TypeScript 7, because type-aware linting breaks. ESLint 10, because Next's lint plugins don't support it yet. Dropping type-aware linting.

**Reversal cost.** Low.

---

## D-004 One MongoDB driver for Mongoose and auth

**Decision.** Pin `mongodb` 7.7.0 at the top level, the version Mongoose 9.11.4 depends on. Pass `mongoose.connection.getClient()` and `mongoose.connection.db` to the auth adapter, giving one pool and one `bson`. CI fails if `npm ls mongodb` shows more than one version. When Mongoose is upgraded, the pinned driver moves with it.

**Evidence.** The spike in D-002, and a full-stack resolve with one `mongodb` (7.7.0) and one `bson` (7.3.3).

**Rejected.** Two drivers: two pools, and `instanceof ObjectId` checks failing across them.

---

## D-005 Static content pages; user state in the browser

**Context.** Content is the same for everyone. User state exists both for guests (browser only) and for accounts. The brief asks for writes that survive flaky connections, honest sync status, LCP under 2.5 s on a mid-range phone, and a Content Security Policy.

**Decision.** Every content route is prerendered at build time. HTML never contains user data. Client components read user state from a local store and sync it through Route Handlers (D-014). Only the API routes and the auth handler render on the server per request.

**Consequences.**
- Guests and accounts share one code path.
- Pages can be cached by a CDN.
- The strict script policy in D-006 becomes possible.
- Progress widgets show a placeholder until local state loads. It is read from the device, not the network; the delay will be measured in Phase 1.

**Rejected.** Server-rendering user data into pages: no static caching, and separate guest and account paths. A client-only single-page app: it gives up server components, which render prose with zero JavaScript.

---

## D-006 Content Security Policy: static pages with per-page script hashes

**Context.** The brief requires CSP headers. Next.js documents two strict options:
- Nonces: "When you use nonces in your CSP, all pages must be dynamically rendered."
- Experimental Subresource Integrity, which it says "allows you to maintain static generation while still having a strict CSP".

**Evidence (spike).** A Next.js 16.4.5 production build, served by `next start` and driven by Playwright 1.64.1.

| Variant | Result |
| --- | --- |
| A. `experimental.sri` (Turbopack) + `script-src 'self'` | Broken: the 3 inline scripts were blocked, the page never hydrated, client navigation failed |
| B. Same with webpack | Broken the same way |
| C. Static pages + `'unsafe-inline'` | Works, but an injected inline script and an injected `onerror` handler both ran |
| D. Nonce from proxy, pages left static | Broken: cached pages carry no nonce (11 violations, no hydration) |
| E. Nonce + every route dynamic (`await connection()`) | Works in Chromium, Firefox and WebKit; no route is static |
| **F. Static pages; header `'unsafe-inline'` plus a per-page `<meta>` policy listing the SHA-256 of that page's inline scripts, added after the build** | **Works in Chromium, Firefox and WebKit.** Pages hydrate, client navigation works, 0 violations. Injected inline scripts and injected inline handlers are blocked. Pages stay static (`x-nextjs-cache: HIT`), and `next start` serves the rewritten file byte for byte. A lesson-sized page (71 KB of HTML) has 4 inline scripts, so its meta policy has 4 hashes |

**Decision.** Variant F.
- Header on every page: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`.
- A post-build step adds a meta policy `script-src 'self' 'sha256-…'` to every prerendered HTML file. Browsers enforce both policies, so only the hashed inline scripts run.
- The runner Worker has its own policy (D-007).
- The development server uses a separate policy that allows `'unsafe-eval'`, which React needs in development only.

**Gates.**
- A build test: every page route is prerendered and carries the meta policy.
- A Playwright test on every route type in all three browsers: 0 violations, hydration works, and injected scripts and handlers are blocked.

**Risk.** Variant F depends on Next writing prerendered pages to `.next/server/app` and serving those files. That is true for `next start` in 16.4.5 but has not been tested on Vercel. If it fails on the chosen host, fall back to variant E, which is verified and documented by Next. Making that switch only changes configuration, because D-005 keeps user data out of the HTML either way.

**Rejected.** A and B: they don't cover inline scripts. C: no protection from injected scripts. D: broken.

**Phase 1 notes.**
- `npm run build` runs `scripts/csp-hashes.mjs` after `next build`. It covers 17 prerendered pages, Next's own 404 and 500 pages included, with at most 4 hashes per page.
- Every page route is static; only `/api/*` renders per request.
- Zod's eval probe had to be switched off for zero violations (D-026).
- End-to-end tests in three browsers check:
  - no violations;
  - injected scripts and inline handlers blocked;
  - page eval blocked;
  - `blob:` workers blocked;
  - the runner's own policy.

---

## D-007 Code runner: a dedicated Worker with its own policy

**Decision.**
- The runner is a static file, `public/runner/worker.js` (with an ES-module harness beside it). It is served with its own header: `default-src 'none'; script-src 'self' 'unsafe-eval'; connect-src 'none'`.
- Pages never allow eval. Their `worker-src 'self'` rules out `blob:` workers.
- On start, the worker keeps a private reference to `postMessage`. It then removes `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`, `indexedDB`, `caches` and `BroadcastChannel` from the global object and its prototype chain.
- A run gets 3 s; then the worker is terminated and a new one is started. `console` output is captured, with size caps.
- The harness is ported from the legacy `WORKER_SRC`: positional arguments, class/ops tests, the list/tree/function/cycle adapters, the unordered/sorted/float comparisons and custom checkers.

**Evidence (spike, Chromium, Firefox and WebKit).**
- `new Function` ran inside the worker, while a page script was refused eval.
- `fetch` from the worker was blocked, so the worker's own `connect-src 'none'` applied rather than the page's policy.
- Cross-origin `importScripts` and `blob:` workers were blocked.
- `indexedDB` and `caches` are reachable from learner code by default. After the lockdown, `indexedDB` was `undefined`, including through `new Function('return this')()`. The other removed globals use the same code but were not checked one by one; Phase 4 tests each of them.
- During a `while (true) {}` run the page stayed responsive and could call `terminate()`. Phase 4 adds a test that the worker really stops.

**Honest limit.** Hidden tests have to reach the browser to run there. A determined learner can read them in developer tools. Withholding them is a deterrent, not a secret.

**Rejected.** `blob:` workers, which need a weaker `worker-src`. Eval on the page. A WebAssembly JavaScript engine (QuickJS), which is heavier and slower; worth it only if a real threat appears. Server-side execution, which is out of scope.

---

## D-008 Content format and MDX compilation

**Decision.**
- Lessons, handbook pages, pattern pages and module overviews are MDX. Exercises are YAML files next to their lesson.
- MDX is compiled with `@mdx-js/mdx` 3.1.1 and `remark-gfm` 4.0.1 inside server components at build time. Pages are static, so compiling costs nothing at run time.
- Content may use only registered components, with literal props. The validator rejects `import`, `export` and JavaScript expressions in content.
- The importer converts legacy Markdown through a syntax tree (remark): it parses the Markdown and writes MDX with the MDX serialiser, which escapes `{`, `}` and `<` correctly. Legacy directives become components.
- The importer reads legacy YAML with js-yaml 4.1.0, the parser the legacy build used. The new pipeline uses js-yaml 5.5.0, once a test shows both parse every exercise file identically.

**Evidence (spike).** All legacy prose was split at headings into 471 chunks.
- 7 chunks fail to compile as MDX unescaped, and 0 after escaping.
- Rendered text matches the legacy renderer (marked 15.0.12) in 470 of 471 chunks. The single difference came from the spike's crude regex escaper reaching into an inline code span, and the syntax-tree importer avoids that.
- Tables 83 of 83 and code blocks 63 of 63 survive.
- Compiling and rendering everything took 852 ms.

**Phase 2 result.** js-yaml 5.5.0 and 4.1.0 parse all 424 legacy YAML blocks identically, except one value: `args: [[0, -0]]` in `w01.md:307`, where 5.5.0 reads -0 and 4.1.0 reads 0. The importer reads with 4.1.0, so `content/` holds the 0 that the legacy course ran with. A test records this exception. How the escaping is done changed: see D-028.

**Fidelity gate (Phase 2).** Every lesson's rendered text equals the legacy renderer's text, apart from logged rewrites. Imported exercises deep-equal the legacy `dist/exercises.json`, apart from logged rewrites.

**Rejected.**
- `@next/mdx`: content becomes bundler-imported modules, and validation and sync would need a second parse.
- `next-mdx-remote` 6.0.0: an extra layer over the same compiler.
- Keeping legacy Markdown with custom directives: the brief asks for MDX.

---

## D-009 Theory fragments are stored once and included by id

**Context.** Section 7.1 of the brief asks to "resolve every `@pull` into real content in the new files (keeping a source reference)". Section 5.3 asks that "lessons and the handbook render from the same content source, so they never diverge."

**Decision.**
- Each of the 209 theory fragments, and each roadmap subsection, becomes one MDX file. Its `source` field records the roadmap section, the fragment key and the line range.
- Lessons, module theory pages, pattern pages and cheat sheets include a fragment with `<Include id="…"/>`, resolved at build. There are no copies.
- The 12 learning-objective fragments become module frontmatter.
- Coverage check: every fragment is included by at least one learner-facing page, and each of the 197 pulled fragments by the lesson the legacy pulled it into.

**Rejected.** Pasting fragment text into lesson files and assembling the handbook from the lessons. The JavaScript reference and pattern pages would then be stitched together from lesson files, and a fragment's text would have no single obvious home.

---

## D-010 Stable ids and the legacy id map

**Decision.**
- Everything gets a stable slug: modules, lessons, units, exercises, visualizers, patterns, problems (the LeetCode number) and handbook pages.
- Visualizers keep their legacy ids, which are already slugs (for example `pair-brute`, `house-robber`).
- Slugs are recorded in `content/ids.lock.json`. A test fails if a released slug disappears or changes without an alias.
- `legacy-id-map.json` maps every legacy id to its new slug: weeks, lessons (`w2d1`), Saturday pages (`w2sat`), extra pages, exercises (`w2d1-3`), patterns (`2.1`), reflection keys (`w1`), assessments (`A1`) and mocks (`m1`).
- User data stores slugs only.

**Example.** `w2d1-3` → `two-pointers-windows-prefix-sums/opposite-end-two-pointers/ex-03`.

**Reversal cost.** High after release. Lesson slugs are reviewed once in Phase 2, then frozen.

---

## D-011 Exercise answers are fetched one exercise at a time

**Decision.**
- The build splits each exercise into a **public** part and a **key** part.
- The public part ships with the page and is synced to `exercises_public`. It holds the question, option texts, code, the starter, visible tests and hints.
- The key part goes into a server-only bundle. It holds the correct options, each option's `why` and `kind`, `explain`, accepted answers, traps, bug lines, `fine` and `fix`, complexity answers, trace answers, hidden tests, solutions and model answers.
- When the learner checks an answer or asks for a reveal, the client fetches that one exercise's key from `GET /api/exercises/{slug}/key`. The endpoint is public, because guests check answers too, and it is rate-limited.
- Checkers are pure functions shared by client and server. They run in the browser on the fetched key, so a key already fetched still works offline.
- The reveal rule (at least one hint or two wrong attempts) is enforced in the interface. The endpoint cannot enforce it for guests, who have no server-side state.

**Rejected.**
- Shipping keys with the page: this breaks the brief's rule.
- Checking every answer on the server: every check would need the network.
- Fetching one lesson's keys at once: a single request would expose every answer on the page.

---

## D-012 Reserved problems are server-only

**Decision.**
- The problem lists of section 9.2 and the mock pools of 9.5 live in `content/reserved/` and compile into a server-only module.
- They appear only in the response of `POST /api/checkpoints/{slug}/start`, or of the mock pool endpoint after the explicit "I am the interviewer" confirmation.
- Checkpoint pages ship the rules, timer, rubric and the cold re-solve choices, which are bank problems.
- A checkpoint's "after" units stay locked until its attempt is finished (D-020).
- Module 12 problems' patterns live in the key bundle and are shown after the learner logs an attempt.

**Tests.**
- A content scan for reserved titles, numbers in context, LeetCode URL slugs and the paraphrases listed in inventory §13. It replaces the legacy number-only test.
- A build-output scan for every reserved title and URL slug: `.next/static`, prerendered HTML and RSC payloads, the search index and the `exercises_public` payload.
- End-to-end: before start the page contains no reserved problem; after start it does.

**Honest limit.** The start endpoint is public, because guests take checkpoints too. "Unseen" means never shown until the learner starts; it is not a secret.

---

## D-013 Visualizer port: `run()` unchanged, `render()` becomes a pure view of shared primitives

**Decision.**
- Each legacy definition becomes a TypeScript module.
- `run()` and `validate()` are ported verbatim, with types and no logic change.
- `render(step, stage, input)` becomes `view(step, input)`: a pure function returning JSX built only from shared primitives, with no hooks and no DOM access.
- Primitives animate between steps through keyed reconciliation. Reduced motion turns transitions off.
- A codemod does most of the work (`R.cells(a, opts)` → `<Cells values={a} … />`). Each visualizer is then reviewed against a screenshot of its legacy rendering.
- Each visualizer is its own lazily loaded chunk, so a lesson loads only what it embeds.

**Tests.**
- Ported references, strengthened for the 7 weak ones.
- Every step of every input has a note and a valid code line, and `view()` returns a tree whose primitive props pass each primitive's schema. All of this runs in Node, without a browser.
- One screenshot per visualizer.

**Rejected.** Hand-writing 129 stateful React components, which can't be tested without a browser and would drift. Wrapping the legacy DOM code in client islands, which shares no primitives and fights the React lifecycle.

---

## D-014 Client state, sync and guest mode

**Decision.**
- One local store per browser profile in IndexedDB (idb-keyval 6.3.0). If IndexedDB is unavailable, a memory store with a visible warning.
- Every change is an operation `{opId, type, slug, payload, at, deviceId}`. Pure reducers in `lib/domain` apply it locally, and the same IndexedDB transaction adds it to an outbox.
- A sync loop posts batches to `POST /api/sync`, a Route Handler that is Zod-validated, scoped to the session user, rate-limited and idempotent by `opId`. The server applies the same reducers and returns the updated documents.
- Status chip: "Saved to your account", "Saving…", "N changes waiting", "Saved on this device only" (guests), or "Not saved: browser storage unavailable".
- Merge rules: counters add; flags such as `solved` and `revealed` never revert; sets are united; first-seen and last-seen timestamps take the minimum and maximum; free text keeps the latest edit.
- First sign-in after guest use: if the account is empty, the guest's operations are replayed into it. If both sides have data, the learner chooses "Merge (recommended)", "Keep account data" or "Keep this device's data".
- Progress is self-reported by design, because code runs in the browser. The server checks shape and ownership, not truth.

**Rejected.** Server Actions for queued writes: action ids change with every deploy, so writes queued before a deploy would fail on replay. Writing straight to the server: data loss on flaky connections. A CRDT library: too much for single-user data.

**Phase 1 notes.**
- **Raw IndexedDB, not idb-keyval.** Each owner's database has three object stores (`docs`, `outbox`, `meta`). idb-keyval keeps one store per database, so it cannot change a document and the outbox in one transaction.
- **Status rules** live in `lib/client/save-status.ts`, with unit tests:
  - "Saving…" until the device has stored a change and, when signed in, until it is queued;
  - "waiting" only after a failed send;
  - "saved" only when nothing is queued.
- **Offline start.** A signed-in learner who opens the app offline keeps their own account's copy; the last confirmed session is remembered.
- **Sign-out** waits for the server's confirmation before removing the account's copy from the device.

---

## D-015 Data model changes against the brief

Full table in [plan.md §10](plan.md#10-data-model).
- **Auth collections** come from Better Auth (D-002), under the brief's names.
- **`problem_journal`** keeps the legacy per-problem notes (intuition, brute, optimized, observation, complexity, edges, mistakes, learned) as `notes`, so a legacy backup imports without loss. `attempts[]` follows the brief.
- **`exercise_attempts`** gains `notes`, `stageNotes` (the learner's text for the five interview stages), `customTests` and `contentVersion`.
- **New collections:**
  - `readiness`: the 26-item checklist, evidence and verdict
  - `mistakes`: manual mistake-log entries (trends also use attempts)
  - `sync_ops`: idempotency, with a TTL
  - `rate_limits`: with a TTL
- **`reflections`** gains `scorecard`, the legacy weekly self-ratings.
- **`settings`** gains the full `placementResult`.
- **`userId`** is stored as an `ObjectId`, as Better Auth stores it.
- Every content copy carries a per-item `contentVersion` hash.

**Rejected.** One document per user holding everything: the 16 MB limit, a single hot document, and poor indexing.

---

## D-016 Scheduling and mastery rules

**Decision.**
- **Flashcards and exercises use FSRS** through ts-fsrs 6.0.0 (MIT). Exercise outcomes become ratings:

  | Outcome | Rating |
  | --- | --- |
  | Answer viewed | Again |
  | Solved after hints or wrong attempts | Hard |
  | First try | Good |

  Easy exists only for flashcards, chosen by the learner.
- **LeetCode re-solves keep the legacy interval rule exactly** ([plan.md §9](plan.md#9-learning-logic)).
- **A problem is mastered** after at least three clean re-solves, each at least 7 days after the previous counted one. They are chosen greedily from the learner's actual re-solve dates. This fixes legacy defect 1, and the two counter-examples become tests.

**Rejected.** SM-2: simpler, but its intervals come from a fixed formula and a per-item ease factor rather than a model of forgetting. FSRS fits each item's memory state from its review history and has a maintained TypeScript implementation.

---

## D-017 Search

**Decision.**
- Full-text search uses MongoDB `$text` over the content copies through `GET /api/search`. It covers theory, patterns, lessons, exercise question text and problems. Reserved problems and Module 12 patterns are excluded.
- The command palette uses a small static index of titles and headings (minisearch 7.2.0). It gives prefix matching and works offline.
- Notes are searched with `$text` on a compound index `{userId, body: "text"}`, so every query is scoped to its owner.

**Rejected.** Atlas Search: Atlas-only, so not available locally. A full search index in the browser: megabytes on a phone. Hosted search services: a third party.

---

## D-018 Styling: Tailwind CSS 4 with tokens as CSS variables

**Decision.**
- Tailwind 4.3.4. The legacy tokens become CSS variables, mapped into Tailwind with `@theme`.
- Themes switch with `[data-theme]` and follow `prefers-color-scheme` unless the learner overrides it.
- Visualizer primitives may use small CSS files where utilities get noisy.

**Why.** Tailwind 4 is configured in CSS and reads variables natively, so it does not fight a token system.

**Rejected.** CSS Modules only: workable, but more code for the same result. CSS-in-JS: run-time cost, friction with server components, and style nonces.

---

## D-019 Editor: CodeMirror 6

**Decision.** `codemirror` 6.0.2 and `@codemirror/lang-javascript` 6.2.5 behind a small wrapper. It loads only on exercises that need an editor and becomes a full-screen sheet on phones.

**Rejected.** Monaco: several megabytes, weak on phones, and it needs its own workers.

---

## D-020 Checkpoint phases and lesson order

**Decision.**
- **Phases.** Each Saturday page becomes a module checkpoint in three phases:
  1. **Before:** review units.
  2. **Attempt:** the assessment, the mock, or the drill on non-assessment modules.
  3. **After:** review units, locked until the attempt is finished or explicitly skipped.

  This removes the 974, 901 and 1026 leaks without changing any text.
- **Lesson order.** In Modules 8 and 9, lesson 5 comes before the checkpoint; the legacy calendar placed it after the Saturday. The few sentences that depend on the calendar order are rewritten and logged.

**Rejected.** Keeping the calendar order: the brief puts the checkpoint at the end of each module.

---

## D-021 Time in the interface

**Decision.**
- The interface shows relative time only ("ready now", "3 days ago"). ISO 8601 dates appear only in exports.
- Scheduling stores UTC timestamps.
- Reviews are "ready", never "overdue".
- Durations come from the legacy time splits ([plan.md §5.3](plan.md#53-time-estimates)).

---

## D-022 Local development, email and test databases

**Decision.**
- **Docker Compose** runs MongoDB as a single-node replica set (transactions need one) and Mailpit, an SMTP server that catches mail locally and has a web inbox. Image tags are pinned in Phase 1.
- **Vitest integration tests and Playwright** use `mongodb-memory-server`'s replica set, so they run without Docker. CI uses a MongoDB service container.
- **Email** goes out through nodemailer 10.3.1 over SMTP: Mailpit locally, and in production a provider **you choose**, since it receives learners' email addresses.

**Rejected.** Requiring Docker for unit tests: Docker isn't always running on this machine.

**Phase 1 notes.**
- **Pinned versions.** MongoDB 8.0.34, both in Docker and in the tests (`package.json` → `config.mongodbMemoryServer`); Mailpit v1.33.0.
- **CI** uses `mongodb-memory-server` too, because GitHub's service containers cannot run the command that starts a replica set.
- **Email tests.** The SMTP path is tested against a small SMTP server inside the test. The end-to-end server writes emails to files (`EMAIL_TRANSPORT=file`, allowed only when `APP_ENV` is not `production`).

---

## D-023 Rate limiting without a third party

**Decision.**
- Fixed-window counters live in MongoDB (`rate_limits`, with a TTL index). They are keyed by user id, or by a salted hash of the IP address for anonymous requests.
- Auth routes use Better Auth's own limiter with database storage.

**Rejected.** In-memory limits, which only count per server instance. Hosted Redis, which is a paid third party.

---

## D-024 Versions

Checked with `npm view` on 2026-11-04. They will be checked again at install time and pinned exactly.

| Package | Version | | Package | Version |
| --- | --- | --- | --- | --- |
| next | 16.4.5 | | @mdx-js/mdx | 3.1.1 |
| react, react-dom | 19.3.1 | | remark-gfm | 4.0.1 |
| typescript | 6.0.3 (D-003) | | shiki | 4.6.0 |
| eslint | 9.39.5 (D-003) | | js-yaml | 5.5.0 (4.1.0 in the importer) |
| eslint-config-next | 16.4.5 | | marked | 15.0.12 (importer fidelity checks only) |
| typescript-eslint | 8.72.1 | | ts-fsrs | 6.0.0 |
| prettier | 3.9.10 | | codemirror | 6.0.2 |
| better-auth | 1.7.16 | | @codemirror/lang-javascript | 6.2.5 |
| @better-auth/mongo-adapter | 1.7.16 | | cmdk | 1.1.1 |
| mongoose | 9.11.4 | | minisearch | 7.2.0 |
| mongodb | 7.7.0 (D-004) | | server-only | 0.0.1 |
| zod | 4.6.7 | | lucide-react | 1.68.0 |
| nodemailer | 10.3.1 | | tailwindcss, @tailwindcss/postcss | 4.3.4 |
| vitest, @vitest/coverage-v8 | 5.1.0 | | @playwright/test | 1.64.1 |
| mongodb-memory-server | 11.3.0 | | @axe-core/playwright | 4.14.0 |

All are open source: MIT, ISC, MIT-0 or Apache-2.0, except `@axe-core/playwright`, which is MPL-2.0 (a test-only dependency). Nothing on this list is a paid service.

Installed in Phase 1:
- Everything in the first column, plus `cmdk`, `lucide-react`, Tailwind, `@playwright/test` and `@axe-core/playwright`.
- `@types/react` and `@types/react-dom` 19.3.0, `@types/node` 24.19.2.
- `playwright` 1.64.1, which the legacy browser tests require.

idb-keyval was dropped (D-014). The rest of the second column is added in the phase that first needs it, after checking its version again.

---

## D-025 Hosting: Vercel Hobby and MongoDB Atlas M0 (your choice, 2026-11-04)

**Decision.** Deploy on a free Vercel account (Hobby plan) with a free MongoDB Atlas cluster (M0). Git hosting: GitHub, account `Tushar-Deshmukh`.

**Constraints this brings, to be checked at deployment (Phase 8), plus one early check in Phase 1:**
- **Terms of use:** Vercel describes Hobby as being for personal, non-commercial use. An institute should read the current terms before going live.
- **Storage:** M0 has 512 MB, shared resources, a connection cap and no automated backups. Content copies are a few megabytes. Learner data is small per person, but export is the only backup.
- **Connections:** serverless functions open connections per instance, so the MongoDB client is cached per instance with a small pool (`maxPoolSize` about 10) to stay well under the M0 connection cap.
- **Network access:** Vercel functions have no fixed IP addresses, so Atlas network access must allow them. Either open access with a strong database password, or the Vercel–Atlas integration.
- **Script policy:** D-006's per-page script hashes have to be verified on a Vercel deployment. That needs the repository on GitHub and connected to Vercel, which only you can do.
- **Email:** magic links in production need an email provider. That is **still open**, because it receives learners' email addresses.

---

## D-026 A lean browser bundle: no heavy client libraries on every page (Phase 1)

**Context.** The first Phase 1 build sent 263 KB of compressed JavaScript to every page. About 100 KB of that was Better Auth's browser client together with full Zod; another 20 KB was the command palette. The brief asks for small initial JavaScript per route and an interactive lesson in under 3 s on a mid-range phone.

**Decision.**
- **Auth in the browser.** The browser calls the four Better Auth endpoints it needs through `lib/client/auth.ts`: get the session, request a magic link, start GitHub sign-in, sign out. Better Auth itself still runs on the server.
- **Shared schemas.** Schemas used in the browser are written with `zod/mini`, imported directly in the module that defines them so unused parts can be dropped. Full Zod stays on the server (`lib/env.ts`).
- **Zod setting.** `lib/domain/zod.ts` sets `jitless` before any schema is built, so Zod does not probe for eval (D-006).
- **Rarely used UI loads on demand.** The command palette loads on first use, or while the browser is idle.
- **Budget.** `tests/e2e/budget.spec.ts` fails if a shell page loads more than 200 KB (gzip). Today they load 165–167 KB, of which React DOM and the Next.js runtime are about 155 KB.

**Rejected.**
- Better Auth's React client: about 100 KB on every page for four requests.
- Full Zod in the browser: about 90 KB.
- Hand-written validators instead of `zod/mini`: they would drift from the schemas the server uses.

**Reversal cost.** Low. These are imports, and the budget test shows the effect of any change.

---

## D-027 Gated text: reserved statements and answers stay out of page payloads (Phase 2)

**Context.** Plan question 5 settled the "after" units of checkpoints and the clue words, but three things were left that rule 3 or rule 4 still forbids on a public page:
- Drill item 6 restates a problem of Assessment 1 exactly, in three places: the Module 3 checkpoint, the Foundations method lesson, and handbook section 7.3. Learners can open any of them before Assessment 1.
- Section 1 ends with the answer key to the placement check.
- Section 7.3 has the answers to the classification drill, which is also an exercise set.

**Decision.** Gated text is held back until an event. No wording changes: the text only moves.
- **An exercise** carries `gatedBy: <event>`. It is never synced and never ships in a page before the event. This covers the 27 exercises in checkpoint "after" units (`gatedBy` is that checkpoint's `gateId`), plus drill item 6 in both copies (`gatedBy: assessment-1`).
- **A sentence in a page** moves to `content/reserved/gated.yaml`, and the page holds `<Gated id="…" />`. There are three: drill item 6, the drill answers, and the placement answer key.
- **Events** are `assessment-N`, `mock-N`, `placement` and `classification-drill`.

Phase 2 stores the data and enforces it in the checks and in sync. The endpoint and the component that reveal gated text come with checkpoints in Phase 6.

**Rejected.**
- Rewording drill item 6 so it no longer matches the problem: the content rules allow only dates, the rename and verified errors, and the drill would then differ from section 7.3.
- Leaving it visible: it breaks "unseen stays unseen".
- Dropping item 6: learners who have finished Assessment 1 lose nothing by seeing it, and the drill is meant to have 15 items.

**Honest limit.** As in D-012, the gate is not a secret. Guests have no server-side state, so the event is reported by the browser.

**Reversal cost.** Low. The exercises keep their text, and removing `gatedBy` or inlining a sentence restores the legacy page.

---

## D-028 Imported text is changed by reviewed edits, and proven by replaying a log (Phase 2)

**Decision.**
- Hand-reviewed edits name a line and the exact text they replace, and the importer stops if that text is not there. Regular-expression rules cover wording with one meaning everywhere ("Week 3", "Yesterday's"). Exercises are rewritten as parsed objects, and only in their text fields.
- Every change goes to `docs/import/changes.json`, with its rule. `docs/date-rewrites.md` and `docs/content-changes.md` are generated from it.
- The fidelity tests do not use the rewrite code. They replay the log over the untouched legacy files, parse with the ported legacy parsers, render with the legacy renderer, and compare with `content/`. Separate tests prove the ported parsers match the legacy build on the original files. Whatever is left is judged by the date check.
- MDX stays byte-for-byte the legacy Markdown, except for a backslash before `{`, `}` and `<` in text. The syntax tree finds those; nothing is re-serialised (a refinement of D-008, which assumed the MDX serialiser). Re-serialising would have changed list markers, table padding and escapes across every file, and the files would no longer read like their source.

**Rejected.**
- Rewrite rules alone: many sentences depend on context, so a rule would have produced wrong text with nothing to catch it.
- Writing the new text directly into `content/` without a log: nothing could prove what else changed.
- Comparing the new MDX only with the importer's own output: that proves nothing.

**Reversal cost.** Low. This is tooling, and `content/` stays plain MDX and YAML without it.

---

## D-029 The repository is public (your choice, 2026-11-04)

**Decision.** You chose to keep the GitHub repository public, after a warning about what that exposes.

**Consequences.**
- Everything in the repository can be read by anyone: answers, solutions, hidden tests, `content/reserved/` and the brief. A learner can read the reserved problems on GitHub.
- "Unseen stays unseen" therefore means that the product never shows them early: they stay out of pages, bundles, search and sitemaps. It does not mean they are secret.
- No secrets go in the repository. The Atlas connection string and other credentials stay in Vercel's settings.

**Reversal cost.** Low. The repository can be made private in its settings at any time, although GitHub limits CI minutes on private repositories and anything already public may have been copied.
