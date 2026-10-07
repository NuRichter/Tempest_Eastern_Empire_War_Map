# Baseline audit — before the upgrade

Recorded on 2026-10-07 against commit `cab4ebd` ("Use relative workbook paths in Step 1 generator scripts"), before any change.

## Repository inventory

| Area | State |
|---|---|
| Stack | Next.js 15.5, React 19, MapLibre GL 5, Zustand 5, Tailwind 3, TypeScript 5.7 (strict) |
| Source | `data-source/Tempest_Eastern_Empire_War_Timeline.xlsx` (Step 1 workbook, 7,200 ten-minute frames, 105 events, 36 forces, 22 movements, 16 casualty rows) + `gazetteer.source.json` |
| Pipeline | `compile-data.ts` (xlsx → `public/data`), `validate-data.ts`, `validate-assets.ts`, `test-runtime.ts`, `browser-qa.ts` |
| Maps in use | `base-atlas.png` (= Myth Map / *Central World Tensura*), `base-outline.png` (= *Base Map - Blue*, **unused**), `reference-annotated.png` (unused at runtime, 3.6 MB served) |
| Sources of Truth | Present twice: at the workspace root and mirrored inside the repo (identical except two generator path fixes). Contained the novel PDFs (vols. 12–16; removed from the repository after the audit, kept locally), maps, flags, 351 photocards with manifest, Step 1 generators and revisions r1–r3/final. The four reference videos are git-ignored. |

## Baseline command results

| Command | Result |
|---|---|
| `npm install` | OK (warning: eslint 9.39 deprecated) |
| `npm run compile-data` | OK, 4.6 s; **dirties the tree on every run** (`manifest.generatedAt`) |
| `npm run validate-data` | PASS (imperial KIA 830,001) |
| `npm run validate-assets` | PASS (17/17 flags) |
| `npm run lint` | PASS, but **73 s** (lints the whole `Sources of Truth` tree) |
| `npm run typecheck` | PASS |
| `npm run test` | PASS 11/11 |
| `npm run build` | PASS, first-load JS 128 kB |
| `npm run qa` | **FAIL** on Windows before any check: `spawn npx ENOENT` (spawned `npx` without a shell) |

## Browser inspection (production build, Chromium, software GL)

Screenshots: `docs/audit/baseline/` — `default-globe`, `first-contact`, `battle` (frame 4600), `late-campaign` (frame 7000), `desktop-1440`, `cinematic`, `mobile-390`.

The command results above were reproduced on a clean `git worktree` of `cab4ebd` with a fresh `npm ci`: install, compile, validate, lint, typecheck, test and build all exit 0; `npm run qa` fails with the same `spawn npx ENOENT`. The extra screenshots were taken from that worktree's production build, and the worktree was then removed.

| Observation | Severity |
|---|---|
| Territory layer = hand-drawn convex hexagons ("schematic theatre zones"); national borders not represented at all | High |
| Base Map (Blue) not offered; only the painted map; no map-style switcher | High |
| Left rail of six stacked panels (calendar, events, highlights, casualties, intelligence, layers) permanently consumes ~360 px; the map is secondary | High |
| Forces drawn as faction-coloured circles only; identity relies on colour; army-size labels small and only at high zoom | Medium |
| Movement drawn as straight lines with no route-confidence distinction | Medium |
| A force between two recorded positions drifts slowly across the whole interval (e.g. a corps "walks" from the Dwargon gate to the inn town over a month) | High |
| Search: substring matching only, no aliases, no Japanese names, ungrouped | Medium |
| No filters, no legend, no command palette, no character photocards, no campaign story | Medium |
| Globe default; camera opens on the globe limb | Low |
| `favicon.ico` 404 → console error on every load | Low |
| Frame time (software GL, 1440×900): idle p50 50 ms; playing 8× p50 58 ms / p95 87 ms | — |
| Load to first canvas: 1.75 s | — |

## Data observations at baseline

- Every event's provenance is implicit (`Time_Basis` only); no event is classed canonical / reconstructed / unresolved.
- `MOV-016` ends (EVT-0360, frame 6966) before it starts (EVT-0351, frame 6968) — caught by the new validator.
- `F-TEM-013` (Ultima's two subordinates) is larger than its parent `F-DEM-002` (Ultima, strength 1).
- Gazetteer: the "Tempest border" crossing point lies well inside Jura, not on the drawn Empire–Jura border; the Siltrosso marker falls in the sea; the Dwargon Gate Front battlefield falls on Dwargon's side of the drawn border although its basis says "on the forest side".
- The canon audit (`docs/audit/timeline-canon-audit.md`) found the substantive problems: ordering and timing errors, a misread death, an unsupported armistice, a casualty model that stops before the end of volume 13, and 44 missing canonical events.
