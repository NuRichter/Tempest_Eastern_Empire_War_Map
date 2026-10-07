# Reference match requirements

What the atlas must do to read like the four reference war maps, written as checkable requirements. The measurements come from the second forensic pass (`REFERENCE_VIDEO_FORENSICS.md` § Pass 2); sizes are at 4K unless stated.

| # | Requirement | Measured in the references | Atlas implementation | Check |
|---|---|---|---|---|
| R1 | Area moves, not only colour | Area moves in all 12 exemplars at 2–4 px per frame. The only colour-only change is a faction appearing (China in ref-02) | Held ground is a time field; the boundary is the isochrone `t_flip = T` | `qa:front` 25/50/75 % captures differ |
| R2 | A transition belt between old and new colour, moving with the front | ref-01: a flat pale band of the loser's colour, median 17–76 px, ahead of a 3–4 px white seam. ref-03: a pale band of 4–8 px with a hard edge. ref-04: a soft blend of 5–12 px with no stroke. ref-02: almost hard (2–6 px) with a faint light rim | **Gradient** (default): the loser's pale tone blends into the winner's colour across the band. **Pale band**: flat pale tone (ref-01/03). Both use a white seam. Chosen in Layers → Front change | Visual: belt visible at 50 %, gone at 100 % |
| R3 | Never neon, never map-wide | No glow, no flash, no full-map tint in any reference | Belt only where `P > 0 && Q > 0`; tones are mixes of the faction colours with white | Code review of `occupation.ts` |
| R4 | Mostly small changes | ref-01: 130 small, 3 medium, 0 large (10 s windows). ref-02: 129 / 9 / 1 | 22 transitions; 17 under 250 cells; one large (the D+10 collapse, 1,773 cells) | `validate-data` episode list |
| R5 | Long holds, short bursts | Change in 21–28 % of seconds. ref-01 Kharkiv: 1–1.5 s bursts between 0.25–2.75 s holds. ref-02: 6–28 s runs, then up to 286 s still | The front only moves inside episodes; the map holds through quiet days (see `TERRITORIAL_RECONSTRUCTION.md`) | `qa:playback` |
| R6 | Fronts move in irregular directions | All 8 compass sectors in refs 1 and 2 | Propagation by 8-neighbour distance from the gaining side's ground | `qa:front` |
| R7 | Pockets close from the rim | Mariupol (ref-01), Inchon (ref-02), Stalingrad (ref-03), E1 (ref-04) | Collapse episodes propagate from connected friendly ground inward | Runtime test "pocket collapse" |
| R8 | Retreat is the same motion reversed | All references | One engine; recapture and collapse use the same propagation | Runtime test "retreat", "recapture" |
| R9 | Army numbers at the front, constant size | ref-01 and ref-03/04: fixed size, no highlight. ref-02 scales with army size (not reproduced) | One number per side per front, fixed size, rolling to new values | Visual |
| R10 | Scrubbing equals playing | Implied by video, required by an interactive map | The field is a pure function of `T` | `qa:playback`, runtime test |
| R11 | Region-by-region change only for political status | Not observed for captures in refs 1 and 2. ref-03 crossfades whole regions for joining a side | Political role crossfades over one simulated hour; never for held ground | Runtime test |
| R12 | Camera does not chase the action | All references use a still camera with occasional cuts | Camera is the reader's; cinematic mode frames each act once | Manual |

## Deliberately not reproduced

- Label size scaled by army size (ref-02). It is hard to read when several fronts are active, and the other three references do not do it.
- Flag icons crowding the front (ref-02 after 100 s). These hide small changes, as the forensic pass itself found.
- Region-by-region capture animation. Not observed for captures in the second pass.
