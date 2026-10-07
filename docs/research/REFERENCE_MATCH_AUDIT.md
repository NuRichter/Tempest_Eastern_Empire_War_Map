# Reference match audit

The question is not whether the code is elegant but whether the map now **behaves** like the four reference war maps. Each score (1–10) is judged against the measured behaviour in `REFERENCE_VIDEO_FORENSICS.md`, from real-browser captures (`npm run qa:front`, `npm run qa:playback`, kept in `qa-artifacts/front/`) and the engine tests.

## Evidence used

- 0 / 25 / 50 / 75 / 100 % captures of every major transition: the D−5 → D−1 advance into Jura (EP-001…EP-011), the Isthmus blockade landing (EP-014), the D+11 collapse of the imperial pocket (EP-017), the Dwargon eastern front advance and collapse (EP-019, EP-020).
- Playback at 1×: captures inside the D+11 collapse all differ (the front moves while playing); paused: 0.00 % pixels change in 1.5 s; after scrubbing forward and backward and returning: 0.00 % differ.
- Engine tests: half-way, advance, retreat, recapture, rim-inward collapse, continuity, determinism.

## Scores

| Behaviour | Before (2.0) | Now | Why |
|---|---|---|---|
| Territory advance | 4 | **8** | Ground is taken from the border crossing (EVT-0015) along the line of march and stays taken; at 50 % the held area is strictly between the 0 % and 100 % states. Held areas are broad and rounded (sum of reaches), not the jagged lines of V1 |
| Territory retreat | 2 | **6** | Ground is lost when its army is destroyed or cut off. Canon has few true retreats; the D+0 loss at the Dwargon gate is small because the infantry's ground still covers it |
| Recapture | 3 | **8** | The D+11 collapse and the D+18–19 Dwargon east front show the loser receding, the pale band, and the owner's colour returning, rim first |
| Frontline movement | 4 | **8** | The front is the isochrone `t_flip = T`, moving continuously with the clock, frozen when paused, reversible |
| Border behaviour | 8 | **9** | Borders never move; only control does (all four references) |
| Territorial propagation | 2 | **8** | Flip times spread from the gaining side's ground (8-neighbour distance); landings grow outward |
| Pale lead band | 0 | **8** | Loser recedes 3 frames (30 simulated minutes) ahead of the winner, as in V1 (25–27 video frames) and V3 |
| Political change (crossfade) | 5 | **8** | Now a one-hour linear crossfade (was a 6-hour two-step blend), the references' only crossfade |
| Army movement | 7 | **7** | Formations move on recorded routes; held ground follows them because it is derived from them |
| Army-size presentation | 6 | **7** | One number per side per front, on its side of the seam, rotated along it, fixed size, counting smoothly — but counts tween over one simulated hour only, at recorded changes (no invented intermediate figures) |
| Timeline | 8 | **8** | Continuous clock, date top-left, captions, markers already matched |
| Camera | 7 | **7** | Still while playing; cinematic mode still moves between theatres (no reference does) |
| Visual density | 7 | **7** | The atlas carries more apparatus (panels, legend) than the films, by design |

## What still differs, honestly

- **Scale of the war.** The references show fronts thousands of kilometres long moving for years; this campaign has a handful of ground transitions over a month. The mechanism matches; the amount of motion is what canon supports.
- **Shape of held ground.** Reconstructed from formation reach, so held areas are rounded and broad; the references' fronts follow terrain and roads.
- **No flag-icon front** (V2) and no full-screen flash (V3); both are stylistic choices of single references.
- **Counters** tween only over the hour after a recorded change; the references count continuously because their data are dense.
- **Force filters** do not change the precomputed held ground.

## Final acceptance questions (Phase 38)

| Question | Answer |
|---|---|
| Paused mid-advance, does the frontline look physically mid-way? | Yes — e.g. EP-011 at 50 %: the red edge is part-way between its 0 % and 100 % positions, with the seam on it |
| Does retreat look like territory being lost? | Yes — the loser's colour recedes first, leaving the pale band, then the owner's colour returns |
| Can I see the territory move back on recapture? | Yes — EP-017 and EP-020 sweep back from the rim |
| Does a major change propagate spatially rather than change colour? | Yes — 2,548 cells change hands over 23 transitions, every one by a moving boundary; the only crossfade is a whole territory's political role |
