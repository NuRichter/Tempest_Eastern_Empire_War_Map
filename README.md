# Tempest–Eastern Empire War — Campaign Atlas

An interactive reconstruction of the Tempest–Eastern Empire War: fifty campaign days, six
theatres and 7,200 keyframes of battlefield state, rendered on a globe.

The application is a reading instrument for one dataset. It does not simulate the war, generate
outcomes, or fill gaps. Everything on screen is either something the Step 1 dataset states, or
something the interface labels as reconstructed.

---

## 1. Project overview

**Source of truth.** `data-source/Tempest_Eastern_Empire_War_Timeline.xlsx` — the Step 1 master
battlefield timeline. The Markdown alongside it is a derived human-readable view; the compiler
reads it only to recover the fifteen named turning points.

**What the application adds.** Nothing factual. It adds a clock, a camera and a set of drawing
conventions. Where it must add something to draw at all — a position for a place the corpus names
but does not locate — it records how the position was arrived at and shows that grade in the
interface.

**Three commitments, enforced by the build rather than by convention:**

1. *Unknown stays unknown.* No absent figure is ever rendered as zero or replaced by an estimate.
   Wounded and missing are unknown for both sides throughout, because the corpus never states them.
2. *Nothing is counted twice.* A formation's strength is already inside its parent's; aggregate and
   component casualty rows restate other rows. Both are excluded from every total, and the
   validator recomputes the campaign figure to prove it.
3. *No fake geography.* The world is fictional. The coordinate system is explicitly a simulation
   coordinate system, and the interface never presents it as latitude and longitude.

---

## 2. Architecture

```
data-source/*.xlsx                 the Step 1 dataset, unmodified
data-source/gazetteer.source.json  the only place a name is given a position
        |
        |  scripts/compile-data.ts        parse, normalise, validate, encode
        v
public/data/*.json                 optimised static runtime dataset
        |
        |  src/data/loader.ts             fetch once, build derived indexes
        v
src/simulation/                    clock, state resolver, store
        |
        v
src/map/ + src/components/         render engine and interface
```

The browser never parses a spreadsheet. `scripts/compile-data.ts` is the only file in the project
that knows what a workbook is.

**Layer responsibilities**

| Path | Responsibility |
|---|---|
| `scripts/compile-data.ts` | Workbook to runtime dataset. Checkpoint and delta encoding. |
| `scripts/validate-data.ts` | Identity, references, ordering, numerics, casualty arithmetic. |
| `scripts/validate-assets.ts` | Flag manifest against the files on disk. |
| `scripts/browser-qa.ts` | Drives the built application in a real browser. |
| `src/types/dataset.ts` | The runtime data contract, shared by compiler and application. |
| `src/lib/coords.ts` | Simulation coordinates and the synthetic projection. |
| `src/simulation/clock.ts` | One deterministic clock, outside React. |
| `src/simulation/resolver.ts` | State seeking, force snapshots, position interpolation. |
| `src/simulation/store.ts` | Selection, layers, view modes, camera requests. |
| `src/map/MapView.tsx` | MapLibre, atlas image source, theatre polygons. |
| `src/map/ForceOverlay.tsx` | Canvas overlay: armies, movement, battles, events, labels. |
| `src/components/` | Panels, dossiers, timeline, search, shell. |

---

## 3. Installation

Requires Node 20.11 or newer.

```bash
npm install
```

No API key, no database, no backend service, no external map provider.

---

## 4. Development

```bash
npm run compile-data     # regenerate public/data from the workbook
npm run dev              # http://localhost:3000
```

`public/data` is generated. Edit the workbook or the gazetteer, then recompile; never hand-edit the
generated JSON.

**Keyboard**

| Key | Action |
|---|---|
| Space | Play / pause |
| Left / Right | Step one hour |
| Shift + Left / Right | Step one day |
| 1 – 6 | Speed 0.25x through 8x |
| `/` | Search |
| `c` | Cinematic mode |
| `g` | Globe / flat atlas |
| `d` | Developer readout |
| Escape | Close search and dossier |

---

## 5. Build

```bash
npm run build
```

`prebuild` runs the compiler and both validators first, so a build cannot ship a dataset that has
not been checked.

---

## 6. Validation

```bash
npm run validate-data     # runtime dataset integrity
npm run validate-assets   # flag assets
npm run lint
npm run typecheck
npm run verify            # all of the above, then the build
```

`validate-data` fails the build on: duplicate ids, orphan references, frame indices out of range,
non-monotonic campaign or battle days, dictionary indices out of range, NaN or Infinity anywhere,
negative quantities, coordinates outside the unit square, a place with no stated basis, a casualty
scope that disagrees with its own exclusion flag, and a delta stream that does not reproduce the
checkpoints.

Two checks are worth knowing about specifically:

- **Dual-path replay.** Every one of the 7,200 frames is resolved twice — by sequential replay of
  the delta stream from frame zero, and by seeking to the nearest checkpoint and applying deltas
  forward — and the two must produce identical state. If they diverge, scrubbing the timeline would
  show a different campaign from playing it.
- **Casualty reconciliation.** Imperial dead are recomputed from `EVENT_CASUALTY` rows alone and
  must total 830,001, the figure the Step 1 reconstruction reaches. A broken double-counting guard
  fails the build.

**Browser QA.** Puppeteer is deliberately not a dependency; a war map does not need a browser to
run. Install it only when you want to run the checklist:

```bash
npm install --no-save puppeteer
npm run build
npm run qa
```

It starts the production server on a free port and checks: load, map render, dataset present, play,
pause, 8x versus 1x, deep-link seek, search, dossier, layer toggles, globe and flat projection,
cinematic mode, developer readout, narrow layout, refresh, console cleanliness and request
cleanliness.

---

## 7. Runtime dataset generation

`npm run compile-data` produces `public/data`:

| File | Contents |
|---|---|
| `manifest.json` | Clock, campaign bounds, coordinate system, source checksums, counts |
| `timeline.index.json` | Per-frame index, dictionary-encoded, for the scrubber |
| `keyframes.index.json` + `keyframes/checkpoint-NNNN.json` | Full state every 144 frames |
| `state.deltas.json` | Sparse per-frame changes |
| `events.json`, `battles.json`, `forces.json`, `force-tracks.json` | The campaign |
| `movement.json` | Recorded movements and per-force position keys |
| `casualties.json` | Records plus reconciled campaign totals |
| `commanders.json`, `combatants.json`, `territories.json` | Reference |
| `theatres.json`, `places.json`, `nations.json`, `factions.json`, `stages.json` | Geography and actors |
| `nation-flags.json` | Nation id to asset path |
| `reference.json` | Contradictions and temporal ambiguities |

**Compression.** The Timeline sheet is 7,200 rows of largely identical state and the Army Sizes
sheet is 15,075 force rows. The compiler stores full state at 50 checkpoints and sparse deltas
elsewhere — 404 frames, 5.6%, carry any change — and collapses consecutive identical force
snapshots, removing 91% of them as inherited. The whole runtime dataset is about 1.1 MB.

**Seeking.** Resolving frame *N* costs one checkpoint read plus at most one simulation day of
deltas. Jumping from D+9 to D−40 does not replay the campaign.

---

## 8. Flag asset structure

Flags live in the repository, not in the dataset. Place them exactly here, keeping the spaces:

```
public/assets/nation-flags/
├── Eastern Empire/
│   └── Flag - Nasca Namrium Ulmeria.png
├── Former Demon Lord Territories/
│   ├── Flag - Beast Kingdom of Eurazania.png
│   ├── Flag - Harpy Queendom of Fulbrosia.png
│   └── Flag - Puppet Nation of Jistav.png
├── Miscellaneous/
│   ├── Flag - Armed Nation of Dwargon.png
│   ├── Flag - Dynasty of Sarion.png
│   └── Flag - Republic of Ulgracia.png
├── Octagram Nations/
│   ├── Flag - City of the Forgotten Dragon.png
│   ├── Flag - Golden City of El Dorado.png
│   ├── Flag - Holy Empire of Lubelius.png
│   ├── Flag - Holy Void of Damargania.png
│   ├── Flag - Ice Continent.png
│   └── Flag - Jura Tempest Federation.png
├── Western Nations/
│   ├── Flag - Kingdom of Blumund.png
│   ├── Flag - Kingdom of Englassia.png
│   ├── Flag - Kingdom of Farmenas.png
│   └── Flag - Kingdom of Siltrosso.png
└── daftar_file.txt          documentation only, not read at runtime
```

"Various Western States" is a grouping marker on the supplied map, not a state. It carries no flag
and none is expected.

---

## 9. Where to put new flags

1. Add the nation to `data-source/gazetteer.source.json` under `nations`, with a stable id, a
   display name, one of the five categories, and its position.
2. Recompile: `npm run compile-data`. The compiler writes the manifest entry and derives the
   asset path from the category and the display name.
3. Drop the PNG at the path the validator names.
4. `npm run validate-assets`.

Components never reference a filename. They reference a nation id, and the `Flag` component
resolves it through the generated manifest.

**Missing flags fail the build**, naming the nation and the path expected. This is deliberate:
quietly rendering another nation's colours puts a false flag on a historical map. To preview the
application before the assets arrive:

```bash
FLAGS_OPTIONAL=1 npm run build
```

Missing flags then render as a hatched tile naming the nation whose flag is absent. They are never
substituted.

---

## 10. Map coordinate system

The Tensura world is fictional. It has no latitude and no longitude, and nothing in this project
implies otherwise.

**Simulation coordinates (`SIM_NORMALISED`).** Every position is `x` and `y` in `[0,1]`, measured
against `public/maps/base-atlas.png` at its native 2641 × 2035 pixels. `x` runs left to right, `y`
runs top to bottom.

**How positions were obtained.** The Step 1 dataset contains no coordinates at all; it names places
in prose. `data-source/gazetteer.source.json` is the only place a name is given a position, and
each entry carries its grade:

| Grade | Meaning |
|---|---|
| `MEASURED` | Read off the supplied annotated map. The 1920 × 1080 screenshot was registered onto the full atlas with a SIFT + RANSAC homography (385 inliers of 414 matches) and the tip pixel of each marker pin taken. Eighteen nations. |
| `RECONSTRUCTED` | Not marked on any supplied map. Positioned relative to measured anchors, with the reasoning recorded in the entry's `basis` field. |
| `SCHEMATIC` | Theatre areas of operations. The supplied maps contain no theatre boundaries. |
| `ABSTRACT` | Deliberately no coordinate — a sealed space, an inter-state negotiation, a worldwide posture, an unstated destination. These are not drawn on the map. |

Grades are surfaced in the interface, per entity, in the dossier and in Intelligence → Coordinates.

**The synthetic projection.** A globe renderer needs angular coordinates. `src/lib/coords.ts`
defines one explicit, reversible transform from simulation space to the angular space MapLibre
consumes: `x` maps linearly across 260° of longitude, and `y` maps linearly onto the Web Mercator
vertical axis so the atlas is undistorted. Those angles are an internal rendering device. They are
never labelled latitude or longitude in the interface and never exported as geographic data.

---

## 11. Simulation keyframe system

| Parameter | Value |
|---|---|
| Resolution | 10 minutes of in-world time = 1 keyframe |
| Frames per hour | 6 |
| Frames per day | 144 |
| Total keyframes | 7,200 (50 campaign days) |
| Checkpoint interval | 144 frames |
| Speeds | 0.25x, 0.5x, 1x, 2x, 4x, 8x |

**Events are changes; keyframes are state.** The renderer interpolates between keyframes; it never
creates one. Playback at any speed visits the same states in the same order.

**Movement never teleports.** A force's position is recorded only where the dataset states a
location. Between two recorded positions it travels continuously along an eased path. Where the
dataset gives no position — Velgrynd's space-time jump, a worldwide deployment — the force is
simply not drawn, and the dossier says why.

**Five clocks are kept apart** and labelled as such: campaign time, battle time, canonical time,
simulation time and the calendar date. The corpus contains no clock times and no calendar dates.
Every `HH:MM` and every date in this application is a reconstructed placement, and the year 9001 is
an artificial simulation marker. The interface says so wherever it shows one.

---

## 12. Vercel deployment

The application is a static frontend. Import the repository and deploy with the defaults; Vercel
runs `npm install` then `npm run build`, and `prebuild` regenerates and validates the dataset.

Requirements before the first deploy:

- The flag PNGs must be committed, or the build will fail by design. Set `FLAGS_OPTIONAL=1` as an
  environment variable if you want to deploy before they are ready.
- `public/data` may be committed or generated at build time; either works, since the compiler is
  deterministic given the same workbook.

Paths are POSIX throughout and asset URLs are derived from `public/`, so a build on Windows and a
build on Vercel's Linux produce the same output.

---

## 13. Troubleshooting

**The map is blank, or the application reports that the map could not start.**
The renderer needs WebGL 2. Enable hardware acceleration, or open the application in a browser that
supports it. The interface says this explicitly rather than showing an empty frame.

**The campaign dataset did not load.**
`public/data` is missing or stale. Run `npm run compile-data`, then `npm run validate-data`.

**The build fails naming a missing nation flag.**
Working as intended. Add the PNG at the path in the error, or use `FLAGS_OPTIONAL=1` to preview.

**The compiler reports locations with no gazetteer entry.**
A place in the workbook has no position. Add it to `aliases` in
`data-source/gazetteer.source.json`, pointing at an existing place, or add a new place with a
stated `basis`. Leaving it unresolved is a valid choice — the force is then drawn off-map rather
than at a guessed position — but the compiler will keep telling you about it.

**Validation fails on the delta stream.**
Checkpoints and deltas have diverged, which normally means the compiler was changed. Recompile and
revalidate; do not edit `public/data` by hand.

**Formations sit on top of each other.**
They share an anchor because the corpus names no finer position for them. The overlay fans
co-located symbols around the shared anchor; the underlying position is identical, and the dossier
reports the real one.

---

## Source and provenance

The Step 1 dataset was reconstructed from Tensura volumes 12–16. This project reproduces no novel
text. Evidence fields carry volume and chapter pointers only, and the interface shows them as
provenance rather than as content.
