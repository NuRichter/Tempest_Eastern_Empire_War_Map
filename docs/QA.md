# Quality assurance

```bash
npm run verify     # compile → validate-data → validate-assets → lint → typecheck → test → build
npm run qa         # browser QA against the production build (run after build)
```

## Layers of checking

| Check | What it guarantees |
|---|---|
| `compile-data` | Every reference resolves, every time is on the 10-minute grid inside the clock, every place id exists. Throws instead of guessing. |
| `validate-data` | Unique ids; no NaN/Infinity; non-negative integer headcounts; events in chronological order with consistent prev/next; provenance classes valid; movements end after they start and unknown destinations are never drawn; casualty totals recomputed independently; revived ≤ killed; casualties never decrease; position keys in time order and inside the atlas; territory rings closed; **dual-path replay** (sequential vs. seek) identical for every frame. |
| `validate-assets` | Both map styles exist at 2641 × 2035; all flags present; every photocard local (no hotlinks) and sourced. |
| `test` (`scripts/test-runtime.ts`) | Projection round-trip; clock clamping; scrubbing equals playing; determinism; **no force teleports** (≤ 4% of the atlas per keyframe); forces hold position until their movement departs; nothing drawn before the record places it; territory transitions animate then settle; unknown strength renders `?`, never `0`; search aliases and fuzzy matching; no build timestamp. |
| `qa` (`scripts/browser-qa.ts`) | Real Chromium via Puppeteer: load and map init, default style, play / pause / 48×, deep links, `]` stepping, timeline click-seek, seek latency, every dossier kind, local photocard rendering, search by alias, Base ↔ Myth, flat ↔ globe, layer toggle, filter announcement, legend, cinematic enter/exit, refresh restoring the URL state, seven viewport widths (320–1920) without horizontal scroll, console and network cleanliness. Screenshots go to `qa-artifacts/` (git-ignored). |

The QA script spawns `node node_modules/next/dist/bin/next start` directly (no shell, no `npx`), so it runs the same on Windows and Linux. Point it at a running server with `QA_ORIGIN=http://127.0.0.1:3000`.

## Visual regression checkpoints

`npm run qa` captures: default view, event dossier, force dossier, character dossier, search, Myth Map, globe, layers, legend, cinematic, and the 390 / 768 / 1920 viewports. Compare them against the previous run when changing the renderer. Large binaries are not committed.

## Playwright CLI

`@playwright/cli` (microsoft/playwright-cli) is a good interactive companion for exploratory checks (`playwright-cli open`, `screenshot`, `console`). It needs a global install and browser downloads, so it is not a project dependency; the scripted QA uses Puppeteer, which is already a dev dependency.
