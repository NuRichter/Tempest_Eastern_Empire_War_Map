# Territorial animation — implementation design

Derived from `REFERENCE_ANIMATION_DNA.md` (rules 1–12) and `CURRENT_VS_REFERENCE_GAP.md`.

## 1. Data model

**Held ground** is a temporal raster: a grid of 352 × 272 cells over the atlas frame (one cell ≈ 7.5 map pixels). For every cell, the compiler records the list of moments its holder changes:

```
cell c: owner territory index, then flips [(t₁, h₁), (t₂, h₂), …]   t in frames (fractional), h ∈ {0 owner, 1 Empire, 2 allies}
```

Stored in `public/data/front.json` as base64 typed arrays (CSR layout: `offsets`, `times`, `holders`) plus:

- `episodes`: flips clustered into transitions — kind (`ADVANCE`, `RETREAT`, `RECAPTURE`, `COLLAPSE`, `SETTLEMENT`), side, start/end frame, cell count, territory, theatre, forces involved, the event nearest its start. These are the **frontline states as first-class data**: each episode is a front moving between two geometries, testable at any fraction.
- grid, step, lead and speed parameters, so the runtime and the tests use the same numbers.

All of it is `RECONSTRUCTED`: canon gives formations, places and times, never a line of control.

## 2. Territory transition model (compiler, `scripts/compile-front.ts`)

Deterministic simulation over the clock in steps of 3 frames (30 simulated minutes):

1. **Sources** — every ground formation with a position at the step (same rules as before: ∛strength weight, reach 0.012–0.055 of the frame, unknown strength = nominal 2,000, no airborne/subterranean/destroyed formations, a parent dropped when its subordinates are drawn). Shared with the runtime in `src/map/field/sources.ts`.
2. **Influence** `v = Σ empire − Σ allies` with the `(1 − t²)²` kernel.
3. **Hysteresis (memory):**
   - owner-held cell of a belligerent territory → captured when the other side's net influence exceeds the **home baseline** (18);
   - captured cell → retaken when the owner side's net influence exceeds the **hold margin** (6) — otherwise it **stays held** after the army moves on;
   - a captured area **not connected** to any formation of its side (destroyed, withdrawn, gone underground) **collapses**;
   - territories that are uninvolved, under armistice or of unknown control are never held: anything held there returns to the owner.
4. **Propagation timing** — cells that change in a step get their flip time from a breadth-first distance through the changed cells, starting at the gaining side's existing ground (or at its formations for a landing): `t_flip = t_step + d / SPEED` with SPEED = 1 cell per frame. Consequences:
   - continuous advance → bands that follow the army (rule 3);
   - a collapse → the pocket shrinks **from the rim inward, interior last** (rule 4);
   - a landing → a blob that grows outward (rule 4).
   Flip times are kept strictly increasing per cell.
5. **Episodes** — flips of the same direction and side, connected in space and overlapping in time, become one episode.

## 3. Geometry model (runtime, `src/map/field/front.ts`, pure TypeScript)

For any continuous time `T`, each coarse cell gets three **signed time fields** (frames, clamped to ±24):

- `E(T)` > 0 where the Empire holds the cell, `A(T)` > 0 where the allies hold it — the distance in time to the nearest change of that membership, with **losses advanced by the lead `L`** (the loser recedes first);
- `P(T)` > 0 inside the **pale band**: a cell whose next flip is within `L` frames.

Because these are times, bilinear interpolation between cells moves the zero contour continuously as `T` changes — the front is the isochrone `t_flip = T` (rules 1–2). The same function serves playback, scrubbing in both directions, and tests (rule 12).

## 4. Frontline model

The front at `T` is the zero contour of `E` and `A` on land, extracted by marching squares on the coarse fields (exactly the bilinear contour) and drawn as a white seam with a dark casing in the overlay (rule 6). Borders are untouched (rule 7).

## 5. Territory delta model

Per episode the compiler knows the **gained** and **lost** cells and their flip times; **retained** cells have no flip in the episode. The inspector reports the latest episode touching a territory and the share held.

## 6. Interpolation and propagation strategy

No polygon morphing: the references show topology changes (pockets splitting off, islands closing) that vertex morphs handle badly, and their behaviour is reproduced exactly by thresholding an interpolated time field. Propagation comes from the flip times, not from easing.

## 7. Mask strategy

None. The references use no masks or wipes; the "reveal" is the propagating boundary.

## 8. Border / pale-band strategy

- Fill: Empire red / allied green at the theme's occupied alpha where `E` or `A` > 0, antialiased over ±0.5 frame of the field.
- Pale band: where `P` > 0, a lightened version of the **loser's** colour (owner land → white wash; Empire-held → pale red; allied-held → pale green) (rule 5).
- Seam: white stroke on the contour (rule 6).

## 9. Political role changes

Role changes of whole territories (mobilisation, entering the war, armistice) remain **crossfades**, as in the references (rule 8), but short and linear: 6 frames (one simulated hour) instead of the former two-step blend over 36 frames.

## 10. Army sizes

Front totals become one number per side placed **on its own side of the nearest front seam**, rotated along the seam (kept upright), at a **fixed size** (rule 10). Displayed strengths count linearly to each recorded value over 6 frames (one simulated hour) after it changes; dossiers keep the exact recorded figures.

## 11. Timeline coupling

The field is a pure function of `T` (continuous clock). Pause freezes it; scrubbing recomputes it for the new `T`; backward scrubbing shows the reverse. The canvas update runs on the overlay's animation frame while the clock moves (≈20–30 Hz), skipping frames with the same `T`.

## 12. Performance strategy

- All simulation, boolean deltas and timing are precomputed in the compiler (≈1–3 s); the runtime only evaluates three fields on 96 k coarse cells and resamples to 1056 × 814 for the canvas (no geometry operations, no GeoJSON updates per frame).
- Flip lists are short (most cells have 0–4 flips); evaluation is O(cells + flips).
- The fine pass is skipped when `T` has not changed.

## 13. Fallback strategy

- If `front.json` is missing or fails validation, the layer is hidden and the rest of the atlas works (the territory layer and markers do not depend on it).
- Reduced motion: no change to the field (it follows the clock), but the pale band is drawn without antialiasing animation.
- Force filters do not alter the precomputed field (it is campaign-wide); this is stated in the Layers note.

## 14. Tests

`scripts/test-runtime.ts`:
- **half-way**: for every major episode, the held area at 50 % lies strictly between 0 % and 100 % (and similarly 25/75 %);
- **advance**: Empire-held ground in Jura grows D−5 → D−1 and its centroid moves west;
- **retreat**: Empire-held ground near the Dwargon gate shrinks after the magitank force is destroyed on D+0;
- **recapture**: ground held on D+5 is back with its owner after D+11;
- **pocket collapse**: in collapse episodes, flip time increases with distance from the rim;
- **determinism / scrubbing**: evaluating `T` directly equals evaluating it after visiting other times.

`scripts/validate-data.ts`: grid sizes, finite and ordered flip times within the clock, valid holders, episodes referencing real events, forces and territories.
