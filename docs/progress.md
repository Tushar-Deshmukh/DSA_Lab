# Progress

One entry per phase: what was built, what was tested and how, and what is not done. Nothing is marked done without a test.

## Phase 0: Read and plan (2026-11-04) — waiting for approval

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
| Runner isolation | same spike, all three browsers | eval allowed only in the Worker; network blocked; storage removed; infinite loop terminated (D-007) |
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
