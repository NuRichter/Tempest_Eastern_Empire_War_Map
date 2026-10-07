# Reference match audit (R6)

This audit asks whether the map now **behaves** like the four reference war maps; how elegant the code is doesn't count. Each behaviour gets a score from 1 to 10, judged against the measured behaviour in `REFERENCE_VIDEO_FORENSICS.md`, including the second pass, and against the requirements in `REFERENCE_MATCH_REQUIREMENTS.md`. The evidence is real-browser captures (`npm run qa:front`, `qa:playback`, `qa:visual`) and the engine tests.

## Evidence used

- **Transition captures.** Every major transition is captured at 0, 25, 50, 75 and 100 % (R6 dataset, 22 transitions, 4,132 cell changes):
  - the D−5 → D−1 advance into Jura (EP-001…013);
  - the Dwargon gate (EP-014);
  - the D+0 magitank collapse (EP-015);
  - the D+10 collapse of the imperial pocket (EP-017, 1,773 cells, with the EP-018 recapture);
  - the long night at Dwargon: ritual ground taken, then the Legion's ground collapsing and settling (EP-019…022).
- **Playback at 1×.** The captures inside the D+10 collapse all differ (3 of 3). When paused, 0.00 % of pixels change in 1.5 s. After scrubbing back to the same moment, 0.00 % differ.
- **Engine tests.** 25 of 25 pass: half-way states, advance, retreat, recapture, rim-inward collapse, continuity and determinism.
- **Belt A/B.** Gradient and pale band cost the same: 106 ms per seek in software GL for both.

## Scores

| Behaviour | 2.0 | R5 | **R6** | Why |
|---|---|---|---|---|
| Territory advance | 4 | 8 | **8** | Ground is taken from the border crossing along the line of march and stays taken. The held areas are broad and rounded, coming from the sum of army reaches, and are not the jagged lines of ref-01 |
| Territory retreat | 2 | 6 | **7** | The D+0 magitank loss (EP-015) and the Legion's rout (EP-021) now show as their own collapses, timed to the canon events |
| Recapture | 3 | 8 | **8** | The D+10 collapse and the long-night Dwargon front recede rim-first |
| Frontline movement | 4 | 8 | **8** | The front is the isochrone, continuous with the clock, frozen when paused, and reversible |
| Transition belt | 0 | 6 | **8** | The belt is a gradient from the loser's pale tone to the winner's colour, with a white seam, and travels with the front. It matches refs 1, 3 and 4. It isn't measured in pixels: at high zoom it widens because it is defined in time |
| Border behaviour | 8 | 9 | **9** | Borders never move; only control does |
| Territorial propagation | 2 | 8 | **8** | Changes spread over 8-neighbour distance, so fronts move in irregular directions (all 8 sectors, as in refs 1 and 2) |
| Ebb and flow / pacing | 3 | 6 | **7** | Of the 22 transitions, 17 are under 250 cells and one is large. The map holds still through the quiet days, as the references do for 72–79 % of their running time. Some transitions are still bursts of one simulated hour |
| Political change (crossfade) | 5 | 8 | **8** | A one-hour crossfade, used only when a territory joins a side |
| Army movement | 7 | 7 | **8** | The R6 additions: the march from the capital to the border base, Hakuro's detour, the flank attacks, the Legion's landing and the march home from Floor 70 |
| Army-size presentation | 6 | 7 | **7** | One fixed-size number per side per front, rolling to each new recorded value |
| Situation readability | 4 | 5 | **8** | The panel opens with who-vs-who (flags, colours), killed, events, now, the latest event and its people as A vs B photocards. Secondary sections start collapsed |
| Timeline | 8 | 8 | **8** | Continuous clock, with stage bands and event ticks |
| Camera | 7 | 7 | **7** | Still while playing. Cinematic mode still moves between theatres, which no reference does |
| Visual density | 7 | 7 | **7** | The atlas carries more apparatus than the films, by design |

## What still differs, honestly

- **Scale.** The references show long fronts moving for months or years. This campaign has 22 ground transitions in about a month, and most of the war is underground, in the labyrinth, or political. The mechanism matches; the amount of motion is whatever the canon supports.
- **Shape.** Held ground is reconstructed from the reach of each formation. It comes out rounded instead of following roads and rivers.
- **Belt width.** The width is set in simulated time, not in screen pixels. Zoomed far in, the belt can be wider than any reference band, up to about 1/3 of the screen in the EP-017 capture.
- **Label scaling.** Labels don't scale with army size (ref-02), and there is no flag-icon front. Both choices are deliberate.
- **Force filters** do not change the precomputed held ground.

## Final visual acceptance

| Question | Answer |
|---|---|
| Does the frontier move? | Yes. The boundary sweeps continuously inside every transition (e.g. EP-011, EP-017 at 25/50/75 %) |
| Are there small changes as well as big ones? | Yes. 17 of 22 transitions are under 250 cells, and the smallest are 4–8 cells |
| Does it reverse? | Yes. The pockets recede at D+0, D+10 and on the long night. Scrubbing backwards shows exactly the earlier state |
| Does it feel alive without inventing motion? | Mostly. The map moves when the canon has armies acting and holds still when it doesn't; nothing animates without an event behind it |
| Paused mid-advance, is the front physically mid-way? | Yes. At 50 % the edge sits between its 0 % and 100 % positions, with the belt and the seam on it |
| Is any change only a colour swap? | Only a whole territory's political role, as in the references |
