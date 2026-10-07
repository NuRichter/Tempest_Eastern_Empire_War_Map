# Quality assurance

```bash
npm run verify     # compile → validate-data → validate-assets → lint → typecheck → test → build
npm run qa         # browser QA against the production build (run after build)
npm run qa:visual  # visual regression: 10 checkpoints vs docs/qa/checkpoints (run after build)
npm run qa:playwright  # Playwright CLI smoke run against a running server (QA_ORIGIN)
npm run qa:front       # 0/25/50/75/100 % captures of every major held-ground transition
npm run qa:playback    # held ground moves while playing, freezes when paused, restores after scrubbing
```

## Layers of checking

| Check | What it guarantees |
|---|---|
| `compile-data` | Every reference resolves, every time is on the 10-minute grid inside the clock, every place id exists. Throws instead of guessing. |
| `validate-data` | Unique ids; no NaN/Infinity; non-negative integer headcounts; events in chronological order with consistent prev/next; provenance classes valid; movements end after they start and unknown destinations are never drawn; casualty totals recomputed independently; revived ≤ killed; casualties never decrease; position keys in time order and inside the atlas; territory rings closed; **dual-path replay** (sequential vs. seek) identical for every frame. |
| `validate-assets` | Both map styles exist at 2641 × 2035; all flags present; every photocard local (no hotlinks) and sourced. |
| `test` (`scripts/test-runtime.ts`) | Projection round-trip; clock clamping; scrubbing equals playing; determinism; **no force teleports** (≤ 4% of the atlas per keyframe); forces hold position until their movement departs; nothing drawn before the record places it; territory transitions animate then settle; unknown strength renders `?`, never `0`; search aliases and fuzzy matching; timeline gaps match the event record exactly; force filters cascade to subordinates (not parents); battle filters hide exactly their events; held ground: a real intermediate state at 25/50/75 % of every major transition, advance after the border crossing and westward, ground lost when the Magitank Force is destroyed, Jura clear after D+11, pockets collapse rim first, continuity (≥ 6 states, no step carrying half a transition), scrubbing equals playing; no build timestamp. |
| `qa` (`scripts/browser-qa.ts`) | Real Chromium via Puppeteer: load and map init, default style, the reconstructed occupation layer, timeline data ready < 8 s, play / pause / 48×, deep links, `]` stepping, timeline click-seek, seek latency (< 120 ms), dossier open time (< 1.5 s), every dossier kind, local photocard rendering, search by alias, Base ↔ Myth, flat ↔ globe, layer toggle, filter announcement, legend, cinematic enter/exit, refresh restoring the URL state, auto-slow at a turning point, eight viewport widths (320–1920) without horizontal scroll, console and network cleanliness. Screenshots go to `qa-artifacts/` (git-ignored). |

The QA script spawns `node node_modules/next/dist/bin/next start` directly (no shell, no `npx`), so it runs the same on Windows and Linux. Point it at a running server with `QA_ORIGIN=http://127.0.0.1:3000`.

## Visual regression checkpoints

`npm run qa:visual` (`scripts/visual-regression.ts`) starts the production server, opens ten checkpoints at 1280 × 800 with clean preferences, and compares each screenshot with the committed reference in `docs/qa/checkpoints/`:

| Checkpoint | View |
|---|---|
| `initial` | First load |
| `mid-campaign` | `?frame=7300` |
| `major-battle` | `?frame=6266` (first day of the fighting) |
| `end-campaign` | `?frame=10799` |
| `flat` / `globe` | `?frame=8930`, flat and after `G` |
| `territory-heavy` | territory opacity 100% |
| `movement-heavy` | `?frame=6240` with trails |
| `selected-force` | Magic Chariot Division dossier |
| `selected-character` | Testarossa dossier |

The comparison runs in the browser on a canvas (480 px wide, a pixel differs when any channel moves by more than 40/255); a checkpoint fails above 8% differing pixels, which absorbs software-GL antialiasing but catches a moved panel, a missing layer or a theme change. After an intended visual change, run `npm run qa:visual -- --update`, look at the new references, and commit them. Screenshots of every run and `report.json` go to `qa-artifacts/visual/` (git-ignored).

`npm run qa` also keeps its own screenshots (dossiers, search, Myth Map, globe, layers, legend, cinematic, 390 / 768 / 1920) in `qa-artifacts/`.

## Playwright CLI

`npm run qa:playwright` (`scripts/qa-playwright.mjs`) drives `@playwright/cli` through `npx -y @playwright/cli@latest` with the installed Chrome: it opens the first day of the fighting, switches to the Myth Map and back, to the globe and back, enters and leaves cinematic mode, searches for a character and opens the result, captures screenshots and the console, and fails on any console error. It is not a project dependency (it is fetched on demand); output lands in `qa-artifacts/playwright/`. Start a server first (`npm run start` or `npm run dev`) and set `QA_ORIGIN` (or pass `-- --origin …`) if it is not `http://127.0.0.1:3000`. A page that fails to load fails the run.

## Browser and viewport matrix

| Engine | How it is exercised |
|---|---|
| Chromium (Puppeteer, software GL) | `qa`, `qa:visual` |
| Chrome (installed, via Playwright CLI) | `qa:playwright` |
| Firefox / Safari | Not automated here; MapLibre 5 and the canvas overlay use no engine-specific API. Check by hand before a release. |

Viewports checked by `qa`: 320, 375, 390, 768, 1024, 1280, 1440, 1920 px wide — no horizontal scroll and a map at least half the viewport tall.
