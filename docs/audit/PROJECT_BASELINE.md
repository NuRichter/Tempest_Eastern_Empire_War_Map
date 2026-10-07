# Project baseline — before the final audit (2026-10-08)

Recorded at commit `7ce00c9` before any change in this pass. Earlier baselines: `docs/audit/baseline-audit.md` (pre-2.0).

## Repository

| Area | State |
|---|---|
| Stack | Next.js 15.5 (static), React 19, MapLibre GL 5, Zustand 5, Tailwind 3, TypeScript strict; Python offline tools (cartography, photocards) |
| Source of truth pipeline | `data-source/` (campaign events with effects, forces, movements, casualties, gazetteer, territory control, characters, terminology, front rules) → `scripts/compile-data.ts` → `scripts/compile-front.ts` (held ground) → `public/data/` (98 files) → validate-data / validate-assets / test-runtime → app |
| Generated (committed) | `public/data/**` (deterministic), `data-source/territories.geo.source.json` (traced) |
| Runtime assets | `public/maps/` (Base Map 2641×2035 PNG 222 KB, Myth Map JPG 1.0 MB), `public/assets/characters/*.jpg` (41 photocards, 360×556), `public/assets/nation-flags/` |
| QA tooling | `qa` (Puppeteer, 40 checks), `qa:visual` (10 checkpoints), `qa:playwright` (CLI smoke), `qa:front`, `qa:playback`, `qa:perf` (new: device matrix) |
| Transient (git-ignored) | `.next/`, `qa-artifacts/`, `.playwright-cli/`, `Sources of Truth/Sources/` (novel PDFs, local only) |
| i18n | None: all UI copy is English, hard-coded in components |
| Themes | Chrome always dark; the map has two looks (Documentary light, War room dark) |
| Docs | README (Indonesian), DESIGN, ARCHITECTURE, DATA-MODEL, CARTOGRAPHY, TIMELINE-METHODOLOGY, TERRITORIAL-ANIMATION, QA, RESEARCH-PROVENANCE, UI-DESIGN, DEPENDENCY-MAP, CONTRIBUTING; research and audit folders |

## Sources of Truth (workspace, 769 files)

| Category | Files | Size | Notes |
|---|---|---|---|
| NOVEL | 5 | 30 MB | Tensura vols 12–16 PDF: 316 / 430 / 448 / 575 / 332 pages (2,101). Text layer complete; the 2–42 pages without text per volume are illustrations. Vols 12–15 Indonesian fan translation, vol 16 Yen Press English. Local only (not in the public repository). |
| CHARACTER | 704 | 198 MB | 351 photocards 2200×3400 JPG (11:17) + `_work/` sources (WebP/PNG); manifest with per-image source URL and tier |
| MAP | 7 | 12 MB | Base Map - Blue / Base Map / Central World Tensura (2641×2035), labelled reference (1080×790), pin map (1920×1080); `Pilihan Map/` duplicates two of them |
| TIMELINE | 8 | 4 MB | Step 1 generators and workbook (archived, pre-audit) |
| DATASET | 8 | 11 MB | Photocard metadata and scraper caches |
| IMAGE | 21 | 34 MB | Nation flags; `GIF Assets/` Header (540×304, 134 frames), Footer (480×480, 60 frames), Contents (480×470, 14 frames) — third-party, used in the README |
| VIDEO | 4 | 1.32 GB | The four reference war maps (AV1): 753 / 521 / 894 / 361 s |
| MANGA / ANIME | 0 | — | No manga or anime material in the Sources of Truth |

## Runtime baseline (production build, software GL, `npm run qa:perf -- baseline`)

| Device | Ready | Transfer | Requests | JS heap after load → after play + seeks | Seek | Long tasks |
|---|---|---|---|---|---|---|
| Desktop 1440 | 1.85 s | 2,057 KB | 124 | 10.9 → 26.3 MB | 67 ms | 5 (max 248 ms) |
| Laptop 1280 | 1.66 s | 2,057 KB | 125 | 15.6 → 25.6 MB | 56 ms | 6 (max 78 ms) |
| iPad 820 | 1.63 s | 2,057 KB | 125 | 11.0 → 28.7 MB | 45 ms | 6 (max 97 ms) |
| iPhone 390 | 1.58 s | 2,057 KB | 124 | 13.9 → 26.9 MB | 26 ms | 4 (max 92 ms) |
| Android 360 | 1.62 s | 2,057 KB | 125 | 11.4 → 28.7 MB | 26 ms | 5 (max 92 ms) |
| Phone landscape 844×390 | 1.70 s | 2,057 KB | 124 | 11.7 → 27.2 MB | 31 ms | 5 (max 96 ms) |

Observations: 75 of the ~124 requests are state checkpoints all fetched at load; no horizontal overflow at any width.

## UI baseline (screenshots in `qa-artifacts/perf/baseline/`)

| Issue | Where |
|---|---|
| No who-vs-who summary; the Situation panel opens on "Now" with theatres, fronts and strength all expanded | Right panel |
| Minimap and map-style switcher stack in the top-left of the map and cover most of it | Phone landscape |
| Navigation controls collide with the "Intelligence" toggle | Phone landscape |
| Title truncated | Phone portrait |
| Chrome has no light theme | All |
| No language selection | All |
| No About / references panel | All |

## Existing territorial engine

Held ground compiled into `front.json` (21 transitions, 2,071 cells, propagation timing, pale band, white seam); political roles crossfade over one simulated hour. See `docs/TERRITORIAL-ANIMATION.md`.
