# Cartography

## Map styles

| Style | Asset | Source | Use |
|---|---|---|---|
| **Base Map** (default) | `public/maps/base-map.png` | `Sources of Truth/Source Map/Base Map - Blue.png` | Operational analysis: clean drawn borders, rendered in a dark "war room" tone (or the original colours) |
| **Myth Map** | `public/maps/myth-map.jpg` | `Sources of Truth/Source Map/Central World Tensura.png` | Geographic and lore context; the painted world map |

Both images share one 2641 × 2035 frame (verified by `validate-assets`), so a single geometry fits both. Switching style crossfades the rasters and keeps the campaign moment, selection and filters.

## Coordinate system

`SIM_NORMALISED`: x and y in [0, 1] across the 2641 × 2035 frame, x to the right, y downwards. Tensura is a fictional world: these are **not** latitude and longitude, and the interface says so wherever it shows a coordinate. To place the image on MapLibre's globe, `src/lib/coords.ts` defines one explicit, reversible synthetic projection (x → 260° of longitude; y → Web Mercator's vertical axis so the image is undistorted). The angles are an internal rendering device only.

## Territories — traced, not drawn

The Base Map is a line drawing: white land, blue sea, thin black border lines. Every political region is therefore a connected white area bounded by drawn lines. `scripts/cartography/extract_territories.py`:

1. classifies pixels into land, ink (border lines) and sea;
2. labels connected land regions (4-connectivity, so a 1-px border separates regions);
3. picks each region by a **seed point** from `regions.config.json` (never by component number);
4. grows each region 2 px into the border ink (never into the sea) so neighbours meet on the drawn line with no gap;
5. traces the outline and simplifies it with Douglas–Peucker at 1.25 px;
6. writes SIM_NORMALISED MultiPolygons with `boundaryGrade: MEASURED`.

Twenty regions are traced. Names come from the labelled reference map *Central World All Territories Nation and Capital.png* and the pin map. Where the Base Map draws one region but the reference subdivides it (the Western minor states, the Various Western States), the region keeps a grouping name and `identification: PARTIAL`. One small northern isle shares Lubelius's colour but carries no label and is left unassigned (`UNLABELLED`).

An overlay of the traced polygons on the Myth Map coincides with its dashed borders and coastlines (see `docs/audit/baseline-audit.md` for the check).

## Operational areas — schematic, but clipped

The supplied maps draw no theatre boundaries. Theatre areas therefore remain **schematic** rings from the gazetteer, but the extractor clips each to the land of the territories it is fought in, so an area never spills into the sea or across a drawn border it should not cross.

## Time-aware political state

`data-source/territory-control.source.json` gives every territory a sequence of states anchored to **events** (not frames): controller, status (`CONTROLLED` / `UNKNOWN` …) and role (`BELLIGERENT`, `CO_BELLIGERENT`, `CONTRIBUTOR`, `UNINVOLVED`, `ARMISTICE`), each with provenance and basis. No national border changed hands in this war; what changes is involvement, and the fighting inside Jura and at Dwargon's eastern gate, shown by the operational areas whose control (`CONTESTED`, `TEMPEST_CONTROLLED` …) comes from the campaign state. Unknown control is drawn grey and hatched, never as a faction colour. A change of role is a linear crossfade over one simulated hour.

## Held ground and fronts (reconstructed)

The references show war as ground taken and lost through space (`docs/research/REFERENCE_VIDEO_FORENSICS.md`). The novels state where formations are and what happens at each place, not a line of control, so the atlas **reconstructs** held ground from the formations, with memory: ground an army takes stays taken until it is retaken, cut off, or returned at the end of hostilities.

- The history is compiled once (`scripts/compile-front.ts` → `public/data/front.json`) on a 352 × 272 grid; flips spread from the front, pockets collapse from the rim inward, landings grow outward.
- An army takes ground only in the territory it stands in, and only after the canon event that opens that front (`data-source/campaign/front-rules.json`).
- The map draws the moving boundary, a pale band of ground about to change hands (the loser's colour lightened) and a white seam on the front; the canvas follows the view, so the edge is crisp at any zoom; coastlines come from the Base Map's own pixels.
- Borders never move. Whole-territory political changes are short crossfades.

Full method, transition modes, tests and limits: `docs/TERRITORIAL-ANIMATION.md`. The layer is labelled RECONSTRUCTED everywhere it is explained and can be switched off (Layers → *Fronts & occupation*). It never changes a territory's political state, which stays event-anchored (below).

## Places

`data-source/gazetteer.source.json` is the only place a name gets a position, with a placement grade:

| Grade | Meaning |
|---|---|
| `MEASURED` | Read from the supplied annotated map (homography-registered pin tips) |
| `RECONSTRUCTED` | Positioned by stated relation to measured anchors; the `basis` says how |
| `SCHEMATIC` | Theatre areas |
| `ABSTRACT` | Deliberately no position (a sealed space, a negotiation, a worldwide posture) — not drawn |

`validate-data` warns when a ground position falls in the sea and records which traced territory each place lies in.

## Capitals, cities and the Labyrinth

**Layer.** The *Capitals, cities and the Labyrinth* layer can be switched in Layers. It draws 23 settlements as polygons, each with an icon at its centre: a gold crown for a capital, a violet maze for the Labyrinth and a grey tower for a city.

**Positions.** Every capital and the marked cities are measured from *Central World All Territories Nation and Capital.png*. That map is registered to the Base Map by aligning the two land masks with an ECC homography (correlation 0.992, land overlap 96 %). The Labyrinth and the Dwargon eastern metropolis come from the campaign gazetteer.

**Shapes.** The novels give no city plans, so every outline is labelled RECONSTRUCTED. Shapes follow what the text describes:
- **Rimuru** is a planned city on straight streets, drawn as a rounded grid square.
- **Dwargon** is carved into a cavern of the Kanaat Mountains, drawn as a long lens along the range.
- **Nasca** is the walled, largest capital, drawn as an octagon with bastions.
- **The Labyrinth** sits just south of Rimuru, as a dashed octagon because it lies underground.
- **The other capitals and cities** get organic outlines at indicative sizes.

**Cities hold.** No settlement falls in this war, so held ground never covers a city outline (`docs/TERRITORIAL-ANIMATION.md`).
