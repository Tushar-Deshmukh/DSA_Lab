# Phase 0 scripts and spikes

One-off code used to measure the legacy course and to try the riskiest parts of the plan. None of it is part of the app; Phase 2's importer and tests replace the measurement scripts. It is kept so every number in [../inventory.md](../inventory.md) and every "spike" result in [../decisions.md](../decisions.md) can be reproduced.

## Running the legacy suite on Windows

The legacy tools build paths with `new URL(import.meta.url).pathname`, which gives `C:\C:\…` on Windows, and the browser tests build `file://` URLs by string concatenation. Run them on a copy, never on the originals:

```sh
cp -r <repository> "$TMP/legacy-run" && cd "$TMP/legacy-run"   # from Phase 1 on, copy legacy/ instead
sed -i "s#path.dirname(new URL(import.meta.url).pathname)#path.dirname((await import('node:url')).fileURLToPath(import.meta.url))#" tools/build.mjs tools/pdf.mjs tests/content.mjs tests/templates.mjs
sed -i "s#new URL('../source/roadmap.md', import.meta.url).pathname#(await import('node:url')).fileURLToPath(new URL('../source/roadmap.md', import.meta.url))#" tools/curriculum.mjs
sed -i "s#'file://' + path.resolve('dist/dsa-pattern-lab.html')#(await import('node:url')).pathToFileURL(path.resolve('dist/dsa-pattern-lab.html')).href#" tests/ui-exercises.mjs tests/behaviour.mjs tests/smoke.mjs tests/vizshot.mjs
npm ci
npm install --no-save playwright@1.64.1
npx playwright install chromium
node tools/build.mjs            # creates dist/, which every test reads
node tests/content.mjs
node tests/templates.mjs
node tests/ui-exercises.mjs     # no arguments = every page with exercises
node tests/behaviour.mjs
node tests/smoke.mjs <page ids> # no arguments = only "home"; Phase 0 passed all 100 page ids
```

`tools/pdf.mjs` needs the same `file://` fix for `dist/print.html`; it was not run in Phase 0.

## Measurement scripts (`scripts/`)

Each takes the patched copy's path (after `node tools/build.mjs`) as its first argument.

| Script | Measures |
| --- | --- |
| `inventory.mjs` | the main counts: pages, sections, syntax, exercises, bank, reserved problems, date words. Writes `inventory.json` next to itself |
| `scan2.mjs` | paraphrased reserved problems, Week 12 numbers, trace exercises without `verify`, visualizer structure |
| `scan3.mjs` | theory fragments, time formats, warm-ups, pattern placement, date words in visualizers, the `mastered()` counter-examples |
| `scan4.mjs` | characters MDX would misread, the visualizer baseline (runs, steps, acceptance of random inputs), sizes |
| `scan5.mjs` | line endings (reads the original folder; path set in the file), module table, roadmap sections, leak lines, `explain` coverage |
| `scan6.mjs` | where `##` sections sit, Saturday page headings |
| `shots.mjs` | screenshots of the shipped HTML (`node shots.mjs <copy> <output dir>`; needs Playwright in the copy; reads the original folder) |

## Spikes (`spikes/`)

- **`mdx/`**: `npm install`, then `node mdx-spike.mjs <copy>`. It compiles all legacy prose as MDX and compares the rendered text with the legacy renderer (D-008).
- **`web/`**: a minimal Next.js 16.4.5 app plus drivers.
  - `npm install`, then `npx playwright install chromium firefox webkit`.
  - Policy and runner (D-006, D-007): `BROWSERS=chromium,firefox,webkit VARIANTS=A,B,C,D,E,F node run-csp.mjs`. For each variant it writes `next.config.ts` (and `proxy.ts`, `app/layout.tsx` where needed), runs a production build, starts `next start`, and probes the pages in each browser. Variant F runs `hash-html.mjs` after the build.
  - Authentication (D-002, D-004): install `mongodb-memory-server@11.3.0` in a **separate** folder (it brings its own `mongodb` driver, which would spoil the single-driver check). Start a replica set with `node mongo-start.mjs <that folder> uri.txt` and leave it running, then run `node auth-spike.mjs uri.txt`.
