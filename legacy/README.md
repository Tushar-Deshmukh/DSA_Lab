# DSA Pattern Lab

A 12-week, JavaScript-first data structures and algorithms course built from the audited roadmap (rev 103). It ships as:

- **`dsa-pattern-lab.html`**: the whole course in one self-contained file. Open it in any modern browser; no server, no install, no backend. It needs an internet connection only for the Google web fonts, and falls back to system fonts without one.
- **`dsa-pattern-lab-companion.pdf`**: the PDF companion, built from the same curriculum data (405 A4 pages, bookmarks, clickable contents, answer keys).
- **`source/`, `content/`, `src/`, `tools/`, `tests/`**: everything needed to rebuild and re-test both.

## Using the course

Start at **Home** or **Today**. Each study day has the same plan: a warm-up re-solve, theory with step-through visualizers, concept checks, a guided interview problem with a hint ladder, LeetCode practice logged in the problem journal, then a summary and a "ready to move on" check. Saturdays are reviews, assessments or mocks. **Preferences** sets your start date (a Monday), track, theme and backup.

### Where your progress is saved

- **Opened as the published Claude artifact, signed in:** saved to your own private space in the artifact, so it follows you across devices. A copy is kept in the browser too.
- **Opened as the local HTML file:** saved in that browser only (localStorage). It does not sync, and clearing site data erases it.
- **Storage blocked (for example a private window):** progress lasts only until the page closes. The chip in the top bar says "Not saving".

Use **Preferences → Export backup** to move progress between browsers or files, and **Import** to restore it.

## Rebuilding

```
npm install                 # marked and js-yaml, pinned in package.json
node tools/build.mjs        # writes dist/ (index.html, dsa-pattern-lab.html, print.html, course.json, exercises.json)
node tools/pdf.mjs          # prints dist/print.html to the PDF in two passes (needs Playwright, pdftotext; qpdf optional)
```

`source/roadmap.md` is the single source of truth for theory, schedule, problem bank, assessments and reference sections. Lessons in `content/wNN.md` pull roadmap text with `@pull` rather than copying it, so the two cannot drift apart. The build warns about any roadmap theory section that no lesson uses (currently none) and about any study day without a lesson (currently none).

## What was tested, and how

All of these were run on the final build. Every command exits non-zero on any failure.

| Command | What it checks | Last result |
| --- | --- | --- |
| `node tests/content.mjs` | Every one of the 129 visualizers runs on its default input, every preset and 300 random inputs, and its final result matches an independent brute-force reference (`tests/refs.mjs`). Every predict answer is produced by running its code. Every fill-in alternative and every reference solution passes its tests, and no starter code passes them. Trace answers match a `verify` script. No lesson mentions a problem reserved for the assessments or mocks. Every text field is a string. | 119,205 checks passed, 0 failed |
| `node tests/ui-exercises.mjs all` | In a real browser (Chromium via Playwright), on all 75 pages with exercises: each of the 421 exercises gives "wrong" feedback for a wrong answer, shows a hint, resets, accepts the right answer, and keeps its solved state after a reload. Every visualizer preset is stepped through. | 3,644 checks passed, 0 failed |
| `node tests/templates.mjs` | Every JavaScript template in the reference section (roadmap section 6) parses. Every runnable one is executed against random inputs (Queue, Deque, quicksort, binary search bounds, MinHeap, LCS, bit helpers, next-greater, BFS and others). The three skeleton outlines with placeholders are parse-checked only. | 62,397 checks passed, 0 failed |
| `node tests/behaviour.mjs` | With storage blocked, the site loads without errors and says it is not saving. Journal statuses survive a reload. Week 12 problems hide their pattern until attempted. Export → erase → import restores progress. A solution viewed before solving is labelled as such and listed for retry. | 13 checks passed, 0 failed |
| `W=375 node tests/smoke.mjs <every page>` | No horizontal overflow at phone width on all 85 lesson and week pages, plus the tool pages. | 0 pages overflow |
| `node tools/pdf.mjs` | All 112 contents entries are located in the printed PDF, and their page numbers are identical across both passes. | 405 pages, verified |

### Not tested, or tested only partly

- **Cloud saving** inside the published artifact was checked once: a probe document was written to, read from and deleted from the per-user store. The page's own save and load path through it has not been exercised end to end. It runs the first time the artifact is opened while signed in.
- **Browsers:** only Chromium was automated. Firefox and Safari were not tested.
- **Fonts:** the sandbox blocks Google Fonts, so every automated check ran with fallback fonts. The PDF embeds locally available fonts (Lora, Inter, DejaVu Sans Mono) for that reason.
- **Dark theme:** the theme tokens exist and the toggle works, but dark mode was not reviewed page by page.
- **PDF visuals:** a sample of pages was inspected by eye, not all 405.
- **Content quality:** the tests prove that answers, solutions and visualizer results are correct. They cannot prove that every explanation is as clear as it could be.

## Layout

```
source/roadmap.md        audited roadmap (rev 103), the source of truth
content/w01.md … w12.md  lessons: prose, @pull of roadmap text, @viz, exercises (```ex YAML)
content/extra.md         diagnostic Session A, dependency map, reference pitfalls, classification drill
src/                     app.js (pages, journal, revision), core.js (storage), exercises.js, shared.js, styles.css
src/viz/                 player.js + render.js, then one visualizer file per week (w01.js … w12.js, algo-map.js)
src/print.js, print.css  the PDF companion's layout
tools/                   build.mjs, curriculum.mjs (roadmap parser), pdf.mjs
tests/                   see the table above
```
