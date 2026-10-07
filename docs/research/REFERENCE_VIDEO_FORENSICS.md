# Reference video forensics

## Objective

Find out, from the frames themselves, **how territory moves** in the four reference war maps the project is modelled on — advance, retreat, recapture, encirclement, frontline motion — so that the atlas reproduces the behaviour rather than an impression of it. Titles and metadata were not used as evidence.

## Method

All four files were present and decoded locally (ffmpeg 8 / dav1d; Python 3 + OpenCV 4.14 + NumPy).

1. **Pass A — full chronology.** Every video was decoded at 1 frame per second (960 px) — 2,528 frames — and laid out as 30-second contact sheets (87 sheets). Every sheet was reviewed in order.
2. **Locating change.** Per-second differences are too small to see territory move (the fronts creep), so changes were found with **long-baseline differences** (t vs t+10 s and t+30 s) on the camera-stable stretches, rendered as heatmaps.
3. **Pass B — dense.** For each exemplar, native-resolution crops of the front at the **full frame rate** (60 / 60 / 25 / 30 fps), several seconds around the change; frame numbers verified against a frame-accurate decode.
4. **Measurements.** For every exemplar:
   - *crossfade vs spatial*: for the pixels that end up changing colour A→B, the share that is at an intermediate colour at 25/50/75 % of the change (an opacity crossfade puts every pixel at the same intermediate colour; spatial propagation keeps pixels fully A or fully B while the B area grows);
   - *flip-time (isochrone) maps*: the frame at which each pixel passes 50 % — bands that move away from the attacker are propagation, a uniform map is a crossfade;
   - *cadence*: frames between visible updates and per-pixel transition length;
   - front stroke, counters, markers, camera, date display.

Research artefacts (sheets, strips, heatmaps, isochrone maps, per-video `FINDINGS.md`, scripts) are kept **outside the repository** in the maintainer's research workspace (`scratchpad/forensics/ref-01 … ref-04`), because they are frames of third-party videos. They are not shipped.

| Ref | File | Codec | Size | fps | Duration | Frames | Audio |
|---|---|---|---|---|---|---|---|
| 1 | Russian Invade Ukraine War Every day to January 12th 2025 using Christopher style [2160p].mp4 | AV1 | 3840×2160 | 60 | 753.2 s | 45,192 | Opus |
| 2 | The Korean War using Google Earth [Extended] [2160p].mp4 | AV1 | 3840×2160 | 60 | 521.0 s | 31,246 | Opus |
| 3 | World War II Every Front with Army Sizes [1776p].mp4 | AV1 | 3840×1776 | 25 | 894.0 s | 22,335 | Opus |
| 4 | World War III Every Day Operation Unthinkable with Army Sizes [2160p].mp4 | AV1 | 3840×2160 | 30 | 361.0 s | 10,822 | Opus |

## Video 1 Analysis — Ukraine, every day ("Christopher style")

**Inspected:** the whole video via 26 sheets; dense 60 fps windows E1 f30–229 (southern advance, Feb 2022), E3 f1000–1199 (Kyiv withdrawal), E4 f5820–6089 (Kharkiv counter-offensive), E6 f8380–8579 (Kherson withdrawal), E7 f37480–37809 (Kursk incursion), E8 f41760–42299 (Donbas creep); markers f174–189 and f940–1160; counters f18000–18010; Mariupol pocket f120–2580.

**Observed:**
- Camera completely static t = 0–≈749 s (scale 1.0000 ± 0.0003); one zoom-out at the very end. No cuts.
- **Spatial change.** At 25/50/75 % of each episode 85–98 % of changing pixels are on a solid colour; only 1–8 % are mid-blend, at the moving edge (E1 at 50 %: 73 % new colour, 20 % pale, 1.9 % blend). A pixel switches in a median 1–2 frames.
- **Two-stage change with a pale lead band.** Ground about to change hands first turns **pale** — pale blue (175,212,250) when Ukraine loses it, pale pink (253,227,227) when Russia loses it — and the winner's colour follows **25–27 frames later** (median; p10–p90 24–27). Seen in every exemplar; e.g. Kharkiv f5944–f6028: the orange recedes, leaving a pale pink band, and the blue fills behind it; southern advance f70–f98: blue turns pale ahead, orange pushes in with a white edge.
- **Front stroke:** white, ≈3–4 px at 4K, on the **winner's leading edge**, moving with the fill every frame; the loser's edge is soft (≈5 px). Country borders: a fixed pink glow.
- **Cadence:** territory layer updates 40×/s; each step starts near a date tick and runs ≈55–85 frames, so consecutive days overlap — the front never stops between days.
- **Pocket:** Mariupol shrinks in stages and is gone by ≈f1680.
- **Counters:** rotated numbers by the front, tweened every frame (≈ −10 and +5–6 per frame); digits jump (no rolling).
- **Markers:** ring of ticks zooms in over ≈15 frames, holds ≈2.3 s, fades over ≈40 frames.
- **Whole-country tint:** Poland's ally tint changes in two instant single-frame steps (f443, f467).

**Techniques:** PRIMARY temporal geometry keyframing + interpolation → frontline propagation (E1 f66–150; E3 f1112–1172; E4 f5970–6025; E6 f8441–8522). SECONDARY two-stage change (loser recedes ≈25 frames ahead of the winner, pale band between); front stroke travels with the fill. SUPPORTING instant whole-region recolour, ebb-and-flow, staged pocket collapse, markers, tweened counters. NOT OBSERVED crossfade of contested ground, wipes/track mattes, glow, hatching, separately redrawn front line, camera moves during the war.

## Video 2 Analysis — The Korean War using Google Earth

**Inspected:** the whole video via 18 sheets plus all 521 one-per-second frames colour-classified; dense windows: advance south f1050–1289, Pusan perimeter f2400–2579, Inchon landing f3120–3659, Inchon breakout f3870–4049, advance north f4710–4949, China entry f4740–5219, Chinese counter-offensive f6420–6659, Seoul falls (Jan 1951) f7800–8039, Seoul retaken (Mar 1951) f10800–11039, stalemate f18000–18179, final 1953 push f30120–30359.

**Observed:**
- Camera **locked** for the whole video (≤ 0.04 px drift). No fly-to, zoom or cut despite the "Google Earth" look.
- Map redraws every 4–5 frames (≈13.7 updates/s) and **territory moves at nearly every update**; the date changes every ≈41.5 frames and date updates show no jump in changed area (210–527 px vs 43–912 px) — the shape is interpolated between dates.
- **Spatial:** mid-transition pixels are near-binary (Inchon f3964: 38 % old, 41 % new); each pixel crosses in 2–3 updates over a ≈7 px soft edge.
- **Direction:** growth from the existing front into the defender; a cut-off pocket shrinks **from every edge, interior last** (f3872–4047; flip-time map); an amphibious beachhead appears as a small blob at Inchon (≈f3575–3590) and **grows outward**, after its army label and flags appear.
- No drawn front stroke — the fills meet at a blurred seam; the visible front is a band of small faction-flag icons gliding with it.
- **Crossfade only once:** China's whole territory fades to red at a uniform opacity (0.25 / 0.42 / 0.64 / 0.84 at t = 81–84 s) when China enters.
- Counters near the front update every redraw in steps of ten; changing digits cross-dissolve.

**Techniques:** PRIMARY keyframed territory interpolated continuously (topology-tolerant; pockets split off) → frontline propagation and ebb-and-flow (f1055–1287, f3872–4047, f4712–4949, f6422–6658). SECONDARY icon-band frontline and interpolated army labels. SUPPORTING crossfade only for a whole faction entering; soft seam. NOT OBSERVED arrows, hatching, glow, province-by-province steps, wipes, border redraw.

## Video 3 Analysis — World War II, every front, with army sizes

**Inspected:** the whole video via 30 sheets and a full 25 fps / 240 px decode of all 22,335 frames for luminance and change events; ≈1,480 native frames in windows 78.3–78.9 s, 112–120 s, 195–207 s, 259–269 s, 374.5–379 s, 466–474 s, 726–738 s.

**Observed:**
- Fixed world camera, no cuts or zoom; one full-frame white flash at Barbarossa (f6600–6603).
- **Spatial:** only 8–38 % of the pixels that will change are mid-colour in any frame; the captured area grows from the old front (France 1940 f2800–2960: ≈1 px per 2–3 frames; Maginot-area pocket left as an island).
- Fronts appear **keyframed every 5 frames** with short (3–4 frame) per-pixel blends between keyframes: transitions end on frame numbers divisible by 5 about half the time vs 20 % by chance; old and new outlines show together at f6701–6703 (medium confidence).
- **Encirclement:** Stalingrad f11770–11820 — a cream band leads, the Soviet colour fills behind it, the pincers meet and leave an island that then disappears.
- **Front stroke:** 2–3 px cream line plus a pale band ≈6–12 px, moving with the fill edge.
- **Whole-region changes are not propagated:** joining or leaving a side is a 5-frame linear crossfade (Italy + Libya f2850–2855: 0.18, 0.37, 0.57, 0.79, 1.0); occupation of a whole region is a 10-frame dip through near-white (Vichy f2966–2975; Borneo f9441–9450). 14 five-frame and 7 ten-frame events found.
- **Army sizes:** one white number per side, inside the side's territory, rotated parallel to the front and moving with it; ticks every frame at a constant rate (France −4,619 per frame for 160 frames); labels appear and disappear in one frame, starting from a round number.
- Date + clock updated every frame (2.5 days/s).

**Techniques:** PRIMARY frontline/territorial propagation (A2, B2, D, E, F) with geometry keyframing and short crossfades between keyframes; whole-region crossfade for political changes. SECONDARY bloc choropleth with lighter tints, ebb-and-flow (North Africa 140–470 s), pocket around an encirclement, running totals. NOT OBSERVED vertex morph, mask/track-matte reveal, animated border drawing, camera moves.

## Video 4 Analysis — World War III (Operation Unthinkable), every day, with army sizes

**Inspected:** the whole video via 13 sheets; every 1 fps frame t = 57–335 s classified; native 4K at 30 fps for eight episodes (seek verified frame-accurate at f1770).

**Observed:**
- War runs 0:57–5:31 with a **completely static camera**; motion only in the intro (0:30–0:43).
- Date/clock advances exactly 2 h 24 min per frame (1 day = 10 frames, 3 days/s), continuous, not stepped.
- **Spatial:** E1 f1770–1889 (Allied advance), E3 f4800–4919 (Soviet counter-offensive), E5 f8100–8219 (second Soviet push): flip-frame isochrones form smooth bands moving away from the attacker; the front edge moves 0.1–1.8 px per frame and changes on nearly every frame; only 14–23 % of changed pixels are ever at a blended colour, confined to a 6–10 px soft edge.
- **Encirclement:** the E1 pocket (f1789–1829) shrinks from its rim inward.
- **Whole-country changes are crossfades:** Syria f2480–2492 (12 frames), Yugoslavia f4672–4677 (5 frames, blend 0.04 → 0.96 with every pixel at the same level), final treaty border f10000–10020 (20 frames).
- **Stabilisation:** E7 f6000–6119 — no territory change while the army numbers keep counting.
- No separate front stroke, glow or pulse; the front is the soft edge of the fill. Country borders: thin pink, never move.
- **Markers:** dashed ring pops in large and shrinks over ≈4 frames; text fades in over 5, holds ≈50, fades out over 5 (≈2 s).
- **Army sizes:** one white bold number per side per front, on the side's own territory, rotated along the front, gliding with it; **glyph size is not scaled by value** (same at 2.4 M and 5.4 M); the whole number is redrawn every frame as a steady linear count (Soviet +1,256.5/frame); labels fade out over 5 frames at the end.

**Techniques:** PRIMARY frontline/territorial propagation driven by a continuous clock (E1, E3, E5, E8). SECONDARY topology-tolerant interpolation (pocket); crossfade only for whole-region political changes; ebb-and-flow (Allied gain t ≈ 57–75 s retaken t ≈ 117–180 s). SUPPORTING geometry keyframing, markers, linear counters. NOT OBSERVED mask/track-matte reveal, border redraw, progressive front drawing, front glow, per-day stepping, camera following the action.

## Territorial Change Mechanisms

In all four videos, contested ground changes hands by **spatial propagation of the fill**: the boundary between the two colours moves through the map, continuously with the clock, and almost every pixel is either fully old or fully new colour (measured: 77–98 % solid at mid-transition). The new area grows **from the existing front into the defender**. Between date keyframes the shape keeps moving (V1 steps overlap days; V2 has no jump on date updates; V3 keyframes every 5 frames with short blends; V4 continuous).

## Frontline Mechanisms

The frontline **is the edge of the fill**, never a separately animated object. V1 rides a white 3–4 px stroke on the winner's leading edge; V3 a 2–3 px cream line with a pale 6–12 px band; V2 and V4 draw no stroke at all (soft seam; V2 adds a band of flag icons). No reference redraws or "draws on" the front line.

## Border Mechanisms

International borders are a **static** thin layer (pink line or glow) under the moving fill in all four; they never animate. Only control moves; geography does not.

## Territory Reveal Mechanisms

No mask, track-matte, wipe or circular reveal was observed anywhere. The "reveal" is the propagating boundary itself. V1 and V3 add a **pale lead band**: the ground about to change hands is lightened just before the winner's colour arrives (V1: 25–27 frames ahead; V3: 6–12 px band).

## Retreat Mechanisms

Retreat is the same mechanism in reverse: the loser's area recedes toward its rear (V1 Kyiv E3, Kherson E6; V2 Chinese counter-offensive; V4 Allied gains retaken). In V1 the loser's colour recedes first and leaves the pale band; the winner follows.

## Recapture Mechanisms

Recapture is a propagation in the opposite direction over the same ground (V1 Kharkiv E4; V2 Seoul lost f7800–8039 and retaken f10800–11039; V3 North Africa; V4 E3). **Pockets** cut off by an advance shrink from every edge inward, interior last (V1 Mariupol, V2 Inchon, V3 Stalingrad, V4 E1). An isolated landing (V2 Inchon) appears as a small blob and grows outward.

## Army Size Presentation

One white, bold number **per side per front**, inside that side's territory, **rotated parallel to the front** and gliding with it (V1, V3, V4; V2 near the front). Numbers count **continuously every frame** (linear tween; V2 in steps of ten with cross-dissolved digits), not rolling digits. V4 does not scale glyph size with the value; V3's sizes vary without a clear rule. Labels appear/disappear in 1–5 frames.

## Camera / Timeline Behavior

**Static camera during the war in all four** (V2 included, despite its Google Earth styling); movement only in intros/outros. Date/clock top-left, advancing **every frame** at a constant rate. Event captions bottom-left; event markers pop in, hold ≈2 s, fade.

## Common Visual Grammar

1. Static camera; the map moves, not the view.
2. Continuous clock; fronts move every frame, not per day.
3. Contested ground changes by a moving boundary; pixels are old or new, not blended.
4. Advance grows from the front; retreat recedes to the rear; pockets shrink from the rim.
5. A light seam (white/cream stroke or soft edge) is the front; it moves with the fill.
6. Whole-region political changes (a country joining a side) are short crossfades — the only crossfades.
7. Static borders under the moving fill.
8. One rotated white number per side per front, counting continuously.
9. Event markers pop, hold ≈2 s, fade; captions bottom-left; date top-left.

## Differences Between References

| | V1 Ukraine | V2 Korea | V3 WWII | V4 WWIII |
|---|---|---|---|---|
| Front stroke | white, winner's edge | none (flag icons) | cream line + pale band | none (soft edge) |
| Pale lead band | yes, 25–27 frames | no | yes (band) | no |
| Update cadence | 40/s | ≈13.7/s | keyframes every 5 frames | every frame |
| Political change | instant tint steps | single crossfade (China) | 5-frame crossfade / 10-frame dip to white | 5–20-frame crossfade |
| Counters | per frame, jump | steps of 10, digit dissolve | per frame, linear | per frame, linear |
| Font scaled by size | — | — | varies, unclear | no |

## Best Techniques To Reproduce

1. **Frontline propagation of held ground**, driven by the clock: territory(T) with a boundary that moves continuously and deterministically.
2. **Pocket collapse from the rim inward** and **landing blobs growing outward**.
3. **Two-stage change with a pale lead band** (V1, V3).
4. **White seam on the front**, moving with the fill (V1, V3).
5. **Short crossfade only for whole-region political changes** (V2, V3, V4).
6. **Per-side front totals**, rotated along the front, not scaled by value, counting smoothly to each recorded value.
7. Static camera during playback (already the atlas's rule).

## Techniques NOT To Reproduce

Mask / track-matte / circular reveals; border "draw-on" animations; glow, flash or pulse on captured ground; hatching for occupied ground; camera that follows the action; opacity crossfade for contested ground; per-day stepping. (V3's full-screen flash at Barbarossa is a one-off editorial effect, not part of the territorial grammar.)

## Exact Implementation Recommendation

- Precompute, deterministically and per campaign, a **capture-time field**: for every cell of a grid over the map, the frames at which its holder changes (advance, retreat, recapture, collapse), with timings produced by **propagation from the front** (distance from the gaining side's ground) so isochrones form moving bands, and by **rim-inward collapse** for pockets.
- At runtime, resolve **held ground(T)** from the field: the boundary is the zero isochrone `T − t_flip`, interpolated between cells so it moves continuously at any T, forwards or backwards, identically when scrubbing or playing.
- Draw the **pale lead band** as the strip between isochrones `T` and `T + L`, the **white seam** on the boundary, and keep **political role changes** as short linear crossfades.
- Keep army sizes as one number per side per front, rotated along the seam, fixed size, counting smoothly to each recorded value.

Details: `docs/research/REFERENCE_ANIMATION_DNA.md`, `docs/research/TERRITORIAL_ANIMATION_IMPLEMENTATION.md`.
