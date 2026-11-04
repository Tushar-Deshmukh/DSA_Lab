# DSA Pattern Lab

A self-paced course in data structures and algorithms in JavaScript, built with Next.js and MongoDB from the tested single-file course in [`legacy/`](legacy/README.md). The build brief is [BUILD_PROMPT.md](BUILD_PROMPT.md); the plan, decisions and progress are in [`docs/`](docs/).

**Status:** Phase 1 (foundation). The app shell, accounts, guest mode and saving work; the course content arrives from Phase 2 on. See [docs/progress.md](docs/progress.md).

## Run it locally

Requirements: Node 24, and Docker for the local database and mail catcher.

```sh
npm ci
cp .env.example .env.local        # then set BETTER_AUTH_SECRET (the file says how)
docker compose up -d              # MongoDB replica set + Mailpit (inbox: http://localhost:8025)
npm run dev                       # http://localhost:3000
```

Without Docker, point `MONGODB_URI` at any MongoDB replica set. With the default `EMAIL_TRANSPORT=console`, sign-in links are printed in the terminal.

## Checks

| Command | What it does |
| --- | --- |
| `npm run lint` · `npm run typecheck` · `npm run format:check` | static checks |
| `npm test` | unit and integration tests (Vitest; integration tests start an in-memory MongoDB) |
| `npx playwright install` | once: browsers for the end-to-end tests |
| `npm run build:e2e` then `npm run test:e2e` | end-to-end tests (Playwright, Chromium, Firefox and WebKit) |
| `npm run legacy:test` | the legacy course's own test suite, run unchanged on a temporary copy |
| `npm run check:deps` | exactly one MongoDB driver in the production dependencies |

## Deploying

Planned: Vercel and MongoDB Atlas (decision D-025 in [docs/decisions.md](docs/decisions.md)). The deployment guide comes in Phase 8.
