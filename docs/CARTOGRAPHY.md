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

`data-source/territory-control.source.json` gives every territory a sequence of states anchored to **events** (not frames): controller, status (`CONTROLLED` / `UNKNOWN` …) and role (`BELLIGERENT`, `CO_BELLIGERENT`, `CONTRIBUTOR`, `UNINVOLVED`, `ARMISTICE`), each with provenance and basis. No national border changed hands in this war; what changes is involvement, and the fighting inside Jura and at Dwargon's eastern gate, shown by the operational areas whose control (`CONTESTED`, `TEMPEST_CONTROLLED` …) comes from the campaign state. Unknown control is drawn grey and hatched, never as a faction colour. Changes animate in two steps over six simulated hours.

## Held ground and fronts (reconstructed)

The references show war as solid colour moving across borders. The novels state where formations are and what happens at each place, not a line of control, so the atlas **synthesises** held ground from the formations themselves (`src/map/field/occupation.ts`):

1. a grid of 1056 × 814 cells over the atlas frame (two fifths of the map's pixels), onto which the traced territories are rasterised once;
2. every ground formation with a position contributes signed influence `∛strength × (1 − t²)²` within a reach of `0.0011·∛strength`, clamped to 0.012–0.055 of the frame width (Empire positive, allies negative). Formations whose strength is unknown use a nominal 2,000 so they still hold ground; single combatants (< 50), airborne or subterranean formations (airships, the labyrinth) and destroyed or captured formations hold none; a parent is dropped when its subordinates are drawn, so tiers are never counted twice;
3. a belligerent's own land carries a home baseline of 18: a cell is drawn held by the other side only where that side's net influence exceeds it. Uninvolved, armistice and unknown-control territories are never coloured;
4. within 4 units of the threshold the cell is contested and painted in the leading side's colour at half strength;
5. held ground must be connected to the side's own formations: a detached ring (where a large force's reach outruns a stronger force standing on top of it) holds none of that side's soldiers and is dropped;
6. the result is painted to a canvas, blurred 1.2 px, and drawn by MapLibre as a canvas source beneath the borders; it is recomputed at about 8 Hz while playing, and skipped when nothing moved (a signature of positions, strengths and roles);
7. the front seam is the contour where net influence equals the baseline (marching squares), only between land cells, drawn white with a thin dark casing;
8. the Situation panel reports each defender territory's held share.

The layer is labelled RECONSTRUCTED everywhere it is explained, and it can be switched off (Layers → *Fronts & occupation*). It never changes a territory's political state, which stays event-anchored (below).

## Places

`data-source/gazetteer.source.json` is the only place a name gets a position, with a placement grade:

| Grade | Meaning |
|---|---|
| `MEASURED` | Read from the supplied annotated map (homography-registered pin tips) |
| `RECONSTRUCTED` | Positioned by stated relation to measured anchors; the `basis` says how |
| `SCHEMATIC` | Theatre areas |
| `ABSTRACT` | Deliberately no position (a sealed space, a negotiation, a worldwide posture) — not drawn |

`validate-data` warns when a ground position falls in the sea and records which traced territory each place lies in.
