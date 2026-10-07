# Reference animation DNA

What the four reference war maps actually do, reduced to rules an implementation can follow. Every rule cites the measured evidence in `REFERENCE_VIDEO_FORENSICS.md`.

## The sequence actually observed

```
CLOCK ADVANCES (every frame, constant rate; camera still)
   ↓
ARMY LABELS / MARKERS ALREADY AT THE FRONT          (V2 Inchon: label and icons before the fill)
   ↓
GROUND AHEAD OF THE ATTACKER TURNS PALE              (V1: 25–27 frames ahead; V3: pale band)
   ↓
WINNER'S COLOUR PROPAGATES FROM THE OLD FRONT        (all four; isochrone bands)
  INTO THE PALE GROUND, WITH A LIGHT SEAM ON ITS EDGE
   ↓
LOSER'S AREA CONTRACTS TOWARD ITS REAR
   ↓
CUT-OFF POCKETS SHRINK FROM THE RIM, INTERIOR LAST   (V1 Mariupol, V2 Inchon, V3 Stalingrad, V4 E1)
   ↓
FRONT KEEPS MOVING THROUGH DATE CHANGES (no per-day stops) UNTIL THE NEXT STATE
   ↓
STABILISATION: FILL STILL, NUMBERS KEEP COUNTING     (V4 E7)
```

Retreat and recapture are the **same** sequence with the roles reversed — there is no separate "retreat animation".

## Rules

| # | Rule | Evidence |
|---|---|---|
| 1 | Contested ground changes by a **moving boundary**; at mid-transition ≥ 77 % of changing pixels are fully old or fully new | V1 85–98 %; V2 near-binary; V3 62–92 %; V4 77–86 % |
| 2 | The boundary moves **continuously with the clock**, not in per-day jumps | V1 steps overlap days; V2 no jump on date ticks; V4 per frame |
| 3 | Growth starts at the **existing front** and moves into the defender | isochrone maps V1 E1/E3, V2 Inchon, V4 E3 |
| 4 | **Pockets shrink from every edge inward**; landings grow outward from a blob | V1 Mariupol ≈f1680; V2 f3872–4047, f3575–3590; V3 f11812–11820; V4 f1789–1829 |
| 5 | A **pale band** precedes the winner (lighter version of the loser's colour) | V1 25–27 frames; V3 6–12 px band |
| 6 | The front is a **light seam on the fill edge** (white/cream, 2–4 px), moving with it — never redrawn separately | V1, V3; V2/V4 soft edge only |
| 7 | **Borders never move**; only control does | all four |
| 8 | **Whole-region political changes** (a country joins or leaves a side) are short **linear crossfades**; this is the only crossfade | V2 China; V3 5-frame events; V4 Syria/Yugoslavia/treaty |
| 9 | **Camera still** while time plays | all four |
| 10 | **One number per side per front**, white, bold, inside its own ground, rotated along the front, gliding with it, **not scaled by value**, **counting smoothly** | V1, V3, V4 (V4 explicit) |
| 11 | Event marker: ring pops (4–15 frames), text holds ≈2 s, fades | V1, V4 |
| 12 | Scrubbing backwards shows the same states in reverse (the maps are pure functions of the date) | implied by 2 |

## What makes them read as "real war maps"

The viewer sees **ground being taken and lost through space**: a colour edge creeping forward, a pale strip of ground about to fall, a pocket closing, numbers that never stop moving — on a still map with fixed borders. Nothing fades, wipes or bounces.

## Mapping to the Tensura campaign

Canon gives the atlas formations, places and times, not lines of control, and states that no national territory changed owner. So the moving ground is **held ground around the armies** (RECONSTRUCTED), driven by the recorded movements and battles:

| Phase | Behaviour to show |
|---|---|
| D−33 → D−2: advance squads, then the column crosses into eastern Jura | advance (rule 3), pale band (5) |
| D−1 → D+0: infantry to the camp near the capital, magitanks to the Dwargon gate | advance on two axes |
| D+0: magitank force annihilated in < 2 h | retreat / collapse of the gate salient (rule 4) |
| D+1 → D+10: labyrinth; the camp holds | stabilisation (V4 E7) |
| D+11: camp annihilated | pocket collapse from the rim inward (rule 4) — recapture |
| Isthmus blockade → D+19 Composite Division defeated | pocket at Dwargon's east gate collapses |
| Political role changes (mobilisation, Dwargon enters, armistice) | short linear crossfade (rule 8) |
