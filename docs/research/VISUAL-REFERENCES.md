# Visual references — what we learned and what we adopted

Four war-documentary videos (kept locally in `Sources of Truth/Contoh Referensi Tujuan Proyek/`, not in the repository) and two live war-map sites were studied for **design principles only**. No asset, colour scheme or layout was copied. Measurements came from 60–72 sampled frames per video, motion strips, enlarged crops and OCR of the on-screen dates.

| Reference | Type | Length | Pace |
|---|---|---|---|
| Russia–Ukraine war, "Christopher style" | real war, day by day | 753 s | 2.0 → 1.3 in-world days / s (two fixed eras) |
| Korean War on Google Earth | real war, 3D look | 521 s | 1.0–7.2 days / s in steps, never announced |
| World War II, every front, army sizes | real war, many fronts | 894 s | constant 2.5 days / s |
| World War III, Operation Unthinkable | **hypothetical** war | 361 s | constant 3.04 days / s |
| deepstatemap.live, liveuamap.com | interactive maps | — | — |

## Findings shared by all four videos

1. **The camera does not move while time plays.** Change is carried by the front, the numbers and the date; every visible change therefore means something.
2. **Army size is a number on the front, not a symbol.** One figure per side per front, inside that side's ground, rotated with the front, white bold type with an outline in the side's dark colour.
3. **Territory is solid colour with three involvement levels**: core belligerent, aligned (paler), neutral (grey with terrain). Allies "entering the war" fade in over ~3 s.
4. **The front is just the edge between two fills**, with a thin light seam; old borders stay as hairlines on top.
5. **The date is the strongest readout**, fixed in a corner, tabular digits.
6. **Captions are the weak point**: too short to read (median 1.5 s in one video), stacked, unbacked, clipped at the frame edge.
7. **None shows sources, uncertainty or a legend.** The hypothetical-war video makes an invented campaign credible with a disclaimer card, a premise tied to real history, a mechanical clock and dry procedural wording — but still offers no evidence trail.

## What the atlas adopts

| Principle | Implementation |
|---|---|
| Still camera during playback | Camera moves only on request; cinematic mode moves it only when the action changes theatre |
| Front strength per side | `drawFrontStrength`: one figure per side per active theatre, rotated ±35°, never upside down, summed over the most specific formations only, `+?` when a component is unknown |
| Number styling | Bold white with faction-deep outline; size grows with value (`(n/1000)^0.18`, clamped 11–28px) |
| Involvement levels | Territory role weights: belligerent / co-belligerent / contributor / uninvolved |
| Two-step control change | Old state recedes to a pale trace, then the new arrives (from the Ukraine video), over 3 simulated hours |
| States the videos lack | Contested (hatch), unknown (grey hatch), reconstructed (dashed) |
| Date as the strongest readout | Large `D±NN` + `HH:MM` with an explicit *SIMULATION* tag (the novels give no clock times) |
| Speeds | 0.25× (7.5 sim-min/s) to 48× (one simulated day per second, the documentaries' pace) |
| Captions done right | Cinematic mode: one caption at a time on a backing panel, with provenance; history goes to the Events feed |
| Leader inset | Photocard leader card (local assets) for the character of the current event |
| Casualty ledger | Killed / revived / captured, never inventing wounded or missing |
| Legend and evidence | Legend, provenance badges, source references and the research register |
| Credibility for a reconstructed war | Opening disclaimer in cinematic mode; closing summary card; dry wording; every reconstruction labelled |

## What we deliberately did not adopt

- Unannounced speed changes; flickering hour digits at high speed.
- Labels below ~11px; captions without backing; more than a handful of event labels at once.
- Satellite imagery, real flags, archival footage.
- A single icon for every kind of event (battles here have six type icons; events are filtered by category).

## Interactive map patterns (deepstatemap, liveuamap)

Map-first layout, persistent compact controls, a layer selector, an event feed linked to the map, deep links that restore the exact view, and hatching for contested ground. Adopted: Events tab synced with the playhead, URL state (`?frame=…&event=…`), layer selector with Base/Myth styles, filter chip that announces active filters.
