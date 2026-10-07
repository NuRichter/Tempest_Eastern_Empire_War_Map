# Current implementation vs the references

Baseline: commit `aab08ad` (Campaign Atlas 2.0 + canon resolutions). Reference rules: `REFERENCE_ANIMATION_DNA.md`.

## What exists

| Area | Current implementation | File |
|---|---|---|
| Clock | Deterministic continuous clock; scrubbing equals playing (validated per frame) | `src/simulation/clock.ts`, `resolver.ts` |
| Political territory | 20 traced regions; role/controller segments anchored to events | `territory-control.source.json`, `resolver.territoryControlAt` |
| Held ground | Influence field computed **from the forces present at time T**: Σ ∛strength × kernel, home baseline, contested margin; painted on a canvas source; seams by marching squares | `src/map/field/occupation.ts`, `MapView.tsx` |
| Front seam | White line with dark casing on the field contour | `overlay/layers/fronts.ts` |
| Army sizes | Per-formation numbers (font ∝ n^0.18); front totals per side, centroid-placed, rotation clamped ±35° | `overlay/layers/forces.ts` |
| Event markers | Ring pop 110 ms, text in 140 ms, hold 2.2 s, out 160 ms | `overlay/layers/incidents.ts` |
| Camera | Still while playing; moves on request | `MapView.tsx` |

## What is partially implemented

- **Held ground moves with the armies** — the right subject, but it has **no memory**. Ground is "held" only while a formation's influence covers it; when the formation moves on, the ground snaps back to its owner. The references show ground that **stays taken until someone retakes it** (rules 1–4).
- **Seam** — present and moving with the fill (rule 6), but its motion is only as continuous as the forces' positions.
- **Front totals** — one per side per theatre (rule 10), but placed at the formations' centroid rather than on each side of the actual front, rotated by the centroid axis (clamped ±35°) rather than along the front, and scaled by value (the references do not scale).

## What is wrong (against the references)

| Gap | Effect on screen | Rule |
|---|---|---|
| Held ground is memoryless | An army's march leaves no taken corridor; the "held" blob travels with the army like a bubble | 1, 3 |
| Collapse is instantaneous | When a formation is destroyed (D+0 magitanks, D+11 camp) its ground vanishes in one step | 4 |
| No pale lead band | Captured ground goes straight from owner colour to held colour | 5 |
| Political role changes use a two-step weight blend over 36 frames (6 simulated hours) | A long fade; at 1× it lasts ~12 s, while the references' region crossfades last 0.2–0.8 s | 8 |
| Field recomputed at ≈8 Hz from the live forces | Edge advances in visible jumps at high speed | 2 |
| Front totals scale with value; tied to centroids | Labels sit away from the front and change size | 10 |
| Strength changes jump | References count smoothly to each value | 10 |

## What is missing

- A **temporal model of control**: territory(T) as a function of the whole history up to T, with captures, losses and recaptures as events in space and time.
- **Propagation timing**: when each piece of ground changes hands, so that change spreads from the front (isochrone bands), and pockets shrink from the rim.
- **Frontline as data**: a reproducible front geometry for any T, testable at 0/25/50/75/100 % of a transition.
- **Tests** for advance, retreat, recapture and pocket collapse, including the half-way state.

## Not a gap

Static borders and coastlines (only control changes), the static camera, the event-marker lifecycle, the continuous date readout and bottom-left captions already follow the references.

## Status after the territorial-motion overhaul

| Gap | Resolution |
|---|---|
| Memoryless held ground | Compiled history with memory (`scripts/compile-front.ts` → `front.json`) |
| Instantaneous collapse | Rim-inward collapse timed by distance from the owner's ground |
| No pale lead band | Loser recedes 30 simulated minutes ahead of the winner |
| Long two-step political fade | One-hour linear crossfade |
| Field updated at ≈8 Hz from live forces | Time-field evaluated per animation frame (≤ 30 Hz) for the exact clock time |
| Front totals at centroids, scaled by value | On each side of the seam, rotated along it, fixed size, counting smoothly |
| Strength changes jump | Map figures count to each recorded value over one simulated hour |

Remaining differences are listed in `REFERENCE_MATCH_AUDIT.md`.
