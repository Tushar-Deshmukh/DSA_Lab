# CLAUDE.md: DSA Pattern Lab

Conventions for everyone working in this repository, human or Claude. Read `BUILD_PROMPT.md` (the brief) and `docs/plan.md` before changing anything.

## Where things stand

- Phase 0 (read and plan) was approved on 2026-11-04. Phase 1 (foundation) is built and tested on branch `phase-1-foundation`, waiting for review.
- The legacy course lives in `legacy/` and is never edited. `npm run legacy:test` runs its tests on a temporary copy.
- Where to look:
  - `docs/progress.md`: what each phase built and tested.
  - `docs/decisions.md`: choices, with the alternatives rejected.
  - `docs/inventory.md`: exact legacy counts.
  - `docs/phase-0/`: how to reproduce them.

## Rules that are never bent (from the brief)

1. **Curriculum content.**
   - Never regenerate or paraphrase imported curriculum content.
   - The only allowed edits: removing dates and timetable wording, renaming Week → Module, fixing a verified error.
   - Log every edit in `docs/date-rewrites.md` or `docs/content-changes.md`, and add a test for every error fixed.
2. **No dates.** No calendar dates, weekdays, deadlines, streaks or "overdue" in anything a learner sees. Show relative time ("ready now", "3 days ago"). ISO dates appear only in exports.
3. **Unseen stays unseen.**
   - Assessment and mock problems (roadmap section 9) never reach lessons, search, the problem bank, sitemaps or any client bundle before the learner starts that checkpoint or mock.
   - Module 12 problems keep their pattern hidden until attempted.
4. **No answers in pages.** Answers, explanations, hidden tests and solutions never ship in page payloads, or in any collection that search or the client can read before the learner has answered. The key endpoint serves them, one exercise at a time.
5. **Learner code runs only in the browser,** in the runner Worker (3 s limit, no network, no storage). Never on the server.
6. **Everything is tested.** Every visualizer result, exercise answer, reference solution and runnable template has an automated test. A feature is done only when its test passes. Never claim something works without having tested it.
7. **Ask the user first** before adding paid services, AI features, analytics, or anything that sends learner data to a third party.
8. **Versions.** Before installing a package, check `npm view <pkg> version`. Pin exact versions: no `^` or `~`.

## Code conventions (from Phase 1)

- **Types.** TypeScript strict, ESM. No `any`: take `unknown` and parse it with Zod.
- **Validation.** Zod checks every boundary: route handlers, content files, environment variables, IndexedDB reads, imported files.
  - Schemas that reach the browser use `zod/mini`. Write `import './zod'; import * as z from 'zod/mini';` in the module that defines them (`lib/domain/zod.ts` turns off Zod's eval probe). Never re-export the `z` namespace: it defeats tree-shaking.
  - Full Zod only in server-only code.
- **Browser weight (D-026).** No library that weighs tens of KB on every page without a reason. Rarely used UI loads on demand. `tests/e2e/budget.spec.ts` holds shell pages to 200 KB gzip.
- **Domain logic.** `lib/domain/` holds pure rules shared by client and server: scheduling, mastery, journal, checkers, planner, merge reducers.
  - No I/O.
  - No `Date.now()` inside a rule: pass `now` in.
  - Every rule has unit tests.
- **Server code.** Modules in `lib/server/` start with `import 'server-only'`. Every repository function takes `userId` first and filters by it; no query reads another user's data.
- **Writes** go through Route Handlers (`/api/...`), not Server Actions. Queued offline writes must survive a deploy (D-014).
- **References.** User data points at content by stable slug, never by array position or title.
- **Styling.** Colours, spacing and fonts come from the design tokens, with no raw hex values in components. Every visual state also has a cue that works without colour.
- **Accessibility.** Every control has an accessible name and works from the keyboard. Respect `prefers-reduced-motion` and the reduced-motion setting.
- **Names.**

  | Kind | Style |
  | --- | --- |
  | files | `kebab-case.ts(x)` |
  | components | `PascalCase` |
  | hooks | `useThing` |
  | Zod schemas | `ThingSchema` |
  | Mongoose models | `ThingModel` |
- **Comments** say why, not what.

## Content conventions (from Phase 2)

- `content/` (MDX and YAML) is the source of truth. MongoDB holds read-optimised copies made by `npm run content:sync`.
- Each roadmap theory fragment is stored once, with its `source` reference, and included elsewhere by id.
- Slugs are frozen in `content/ids.lock.json` once released. `legacy-id-map.json` maps every legacy id.
- MDX may use only the registered components, with literal props: no `import`, `export` or JavaScript expressions.
- Every exception to the date check or the reserved-problem check needs a reason in its allowlist file.

## Git

- One branch per phase (`phase-1-foundation`, …). Small commits with imperative subject lines. Merge into `main` only after the user approves the phase.
- Every commit message written by Claude ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Line endings.** Files use LF, set by `.gitattributes`. This machine's system git config sets `core.autocrlf=true`, and `.gitattributes` overrides it. Keep it: the legacy parsers split on `\n`.
- Never commit `.env*` (except `.env.example`), `node_modules/`, `.next/`, `dist/` or `.generated/`.

## Working on this machine (Windows)

- **Paths.** Use `fileURLToPath(import.meta.url)`, never `new URL(import.meta.url).pathname`. The second one gives `C:\C:\…`, which is why the legacy build fails on Windows.
- **Legacy tests** do not run on Windows as shipped. Use `npm run legacy:test`, which patches a temporary copy.
- **Docker Desktop** must be running for `docker compose up`. The unit, integration and end-to-end tests do not need Docker: they start an in-memory MongoDB.
- **npm scripts on Windows** run in `cmd.exe`, where `VAR=x command` does not work. Set variables in a small Node script instead, as `scripts/build-for-e2e.mjs` does.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | development server; needs `.env.local` (copy `.env.example`) and MongoDB (`docker compose up -d`) |
| `npm run build` / `npm start` | production build (with the script-hash step) and server |
| `npm run lint` · `typecheck` · `format:check` · `format` | static checks; `format` rewrites files |
| `npm test` | Vitest unit and integration tests (in-memory MongoDB 8.0.34; the first run downloads it) |
| `npm run build:e2e` then `npm run test:e2e` | Playwright against a production build made with test settings; `npx playwright install` once |
| `npm run legacy:test` | the legacy suite on a patched copy (`-- --only=content,templates` for a quick run) |
| `npm run check:deps` | fails if the production dependency tree holds two MongoDB drivers |

Sign-in methods are fixed at build time, because `/sign-in` is static. Set `EMAIL_TRANSPORT` and `GITHUB_*` before `npm run build`.

## End of every phase

1. Run the gates.
2. Commit.
3. Update `docs/progress.md`: what was built, what was tested and how, and what is not done.
4. Stop for review.
