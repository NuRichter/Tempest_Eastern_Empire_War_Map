# Territorial animation — how ground is taken and lost on the map

The atlas shows the war the way the reference war maps do (`docs/research/REFERENCE_VIDEO_FORENSICS.md`): ground changes hands through space, the front moves with the clock, pockets close from the rim, and nothing simply fades. Everything on this layer is **RECONSTRUCTED** — the novels give formations, places and times, never a line of control.

## Temporal territory

Two layers carry territory:

| Layer | What changes | How it animates |
|---|---|---|
| Political territory (`territory-control.source.json`) | A whole territory's part in the war (mobilisation, entering, armistice). Borders never move. | Short linear **crossfade**, one simulated hour — the only crossfade, as in the references when a country joins a side |
| **Held ground** (`public/data/front.json`) | Ground taken and lost by armies inside territories | **Front propagation**: a moving boundary, pale lead band, white seam |

Held ground is a function of time: `heldGround(T)` and `front(T)` for any continuous `T`, the same for playback, scrubbing and scrubbing backwards.

## How the history is built (`scripts/compile-front.ts`)

The compiler steps through the campaign every 3 frames (30 simulated minutes) on a 352 × 272 grid over the atlas (one cell ≈ 7.5 Base Map pixels).

1. **Influence** of every ground formation (`src/map/field/sources.ts`): weight ∛strength, reach 0.012–0.055 of the map, kernel (1 − t²)². Airborne and subterranean formations, the destroyed, and aggregates already divided into positioned subordinates hold no ground; tiers are never counted twice.
2. **Capture** — owner ground of a belligerent territory goes to the other side where that side's net influence exceeds the home baseline (18). An army only takes ground **in the territory it stands in**, and only after the canon event that opens that front (`data-source/campaign/front-rules.json`, e.g. the Empire may take Jura ground only from EVT-0015, the border crossing).
3. **Memory** — captured ground **stays held** after the army moves on.
4. **Recapture** — it returns to its owner where the owner side's net influence exceeds the hold margin (6).
5. **Collapse** — captured ground returns when it is no longer connected to a formation of its side in the same territory, or when the formation that took it is **destroyed** and nothing else supports it.
6. **Settlement** — when a territory leaves the war (armistice), held ground in it returns to its owner.
7. **Propagation timing** — the cells that change in a step get flip times from a distance through the changed cells (8 neighbours, weights 1 and √2) starting at the gaining side's existing ground: `t = t_step + d / speed` (1 cell per frame). A landing with no contact grows from its formation. So advances spread from the front, pockets shrink from the rim inward, interior last.
8. **Episodes** — changes of one kind that touch in space within 3 steps are merged into transitions (`ADVANCE`, `RECAPTURE`, `COLLAPSE`, `SETTLEMENT`) with their territories, formations and nearest event: the **territory delta** (gained / lost cells) and the inspector's "latest transition".

The result is deterministic (byte-identical output for the same data) and checked by `validate-data` (ordered, finite flips inside the clock; valid holders; no sea cell changes hands; episodes reference real events, forces and territories).

## How it is drawn (`src/map/field/front.ts`, `occupation.ts`)

For time `T`, each cell gets signed **time fields**:

- `E`, `A` — the Empire / the allies hold the cell when > 0; the magnitude is the time to the nearest change of that holding. Losses are advanced by the lead `L = 3` frames, so the loser recedes first.
- `P`, `Q` — the pale band: `P = T − (t* − L)`, `Q = t* − T` for the flip nearest in time; the band is where both are positive.

Because these are times, **interpolating between cells and thresholding at zero gives a boundary that moves continuously** — the front is the isochrone `t_flip = T`. This is polygon interpolation without polygons: it handles pockets splitting off and islands closing, which vertex morphing does badly.

- **Fill**: Empire red / allied green at the theme's held alpha.
- **Pale band**: the loser's colour lightened (a white wash over owner land).
- **Seam**: the zero contour (marching squares, exactly the interpolated boundary), drawn white with a dark casing in the overlay.
- **Canvas**: 1280 × 960 pixels spread over the visible window of the map (plus a margin), so the edge stays crisp at any zoom; on the globe the whole map is painted. Coastlines come from a land mask at the Base Map's own resolution.
- **Army sizes**: one number per side per front, on its own side of the seam, rotated along it, at a fixed size, counting linearly to each new recorded value over one simulated hour.

## Transition modes

| Mode | Used for | Why |
|---|---|---|
| Front propagation + pale band + seam | Ground taken, lost, retaken | Observed in all four references |
| Rim-inward collapse | Ground cut off or whose army is destroyed | Pockets in all four references |
| Outward growth from a blob | A landing or a force appearing without contact | Inchon in the Korea reference |
| Linear crossfade (1 simulated hour) | A whole territory's political role | Countries joining a side in three references |
| Instant | Never for territory | — |

Not used, because no reference uses them: mask or track-matte wipes, border "draw-on", glow or flash on captured land, hatching for held ground, camera following the action.

## Timeline coupling

The layer re-evaluates on animation frames whenever the clock time changes (≤ 30 times a second) or the view moves, and is idle otherwise. Pause freezes it; scrubbing in either direction shows exactly the state for that time (`npm run qa:playback` checks all three).

## Performance

All simulation, boolean deltas and timing happen at compile time (≈ 2–4 s). At runtime one update is an evaluation over the ≈ 2,500 cells that ever change hands, a 3 × 3 smoothing, and one paint limited to the part of the window where ground ever changes hands. No GeoJSON is rebuilt per frame. Measured in software GL: random seek 86 ms (was 112 ms), 48× playback ≈ 146 frames per second of wall time.

## Fallbacks

- `front.json` missing or invalid → the layer hides itself; the rest of the atlas is unaffected.
- The history is campaign-wide: force filters do not change it (stated in the Layers note).

## Tests

`scripts/test-runtime.ts`: half-way state at 25/50/75 % of every major transition; advance (grows after the border crossing and moves west); retreat (ground lost when the Magitank Force is destroyed); recapture (Jura clear after D+11); pocket collapse (interior falls after the rim); scrubbing equals playing; continuity (≥ 6 distinct states and no single step carrying more than half a transition). Browser: `npm run qa:front` (0/25/50/75/100 % captures of every major transition), `npm run qa:playback` (moving while playing, frozen when paused, identical after scrubbing back).
