# Geographic model

Revision R6 (2026-10-11). One world model drives the map, the 3D view, the minimap, unit movement, the held-ground front and every distance shown in the interface. Nothing in it is an official Tensura measurement: the author has never published a world scale. Everything below is either read off the supplied maps, stated by the novels, or a documented synthesis.

## 1. Coordinate systems

| System | Definition | Where it lives | Used for |
|---|---|---|---|
| `SIM_NORMALISED` | `x`, `y` in [0, 1] across the 2641 × 2035 atlas image, origin at the north-west corner, `+x` east, `+y` south | `data-source/gazetteer.source.json` (every position, stored once) | storage of all positions |
| `WORLD_KM` | kilometres east and south of the same corner: `e = x · 5,282`, `s = y · 4,070` | `data-source/world.source.json`, `src/lib/world.ts` | distances, route lengths, speeds |
| Synthetic projection | longitude/latitude-shaped angles for the renderer only (`src/lib/coords.ts`) | runtime | MapLibre flat and globe views |
| Screen | CSS pixels | each frame | drawing only, never stored |

The scale is isotropic: 1 atlas pixel = **2.0 km** in both directions, so the whole atlas is 5,282 × 4,070 km. `WORLD_KM` is a pure function of the stored point. Zoom, pan, flat or globe projection, the 3D view and marker size never feed back into a position. `scripts/test-scenario.ts` checks the round trip through the renderer's projection and that distances survive it unchanged.

Places carry a placement grade: `MEASURED` (read off the annotated map by a SIFT/RANSAC registration), `RECONSTRUCTED` (placed by stated relations and the constraints below) or `ABSTRACT` (no position at all). Each place has a `basis` that says why it is where it is; the place dossier shows it.

## 2. Calibration

`world.source.json` lists every distance the novels state between two points the atlas can place:

| Id | Statement | Locator | Stated | Atlas at 2.0 km/px | Residual |
|---|---|---|---:|---:|---:|
| CAL-01 | Tempest-Dwargon rail line, overall | v12.txt:3279-3281 | ~1,000 km (path) | 622 km straight | path/straight 1.6 |
| CAL-02 | Imperial army at its border, from the intended battlefield | v12.txt:12443-12450 | ~1,500 km | 1,081 km | −28 % |
| CAL-03 | Imperial capital to the Composite Division's camp near the Dwargon border | v14.txt:10863-10866 | 500 km | 575 km | +15 % |
| CAL-04 | Tempest-Ingracia line | v12.txt:3283 | ~300 km | 914 km | ×3 (map discrepancy) |
| CAL-05 | Magitanks arrayed from Dwargon's centre | v13.txt:513-515 | ~30 km | 31 km | placement |
| CAL-06 | Imperial infantry camp from capital Rimuru | v13.txt:386-389 | ~30 km | 30 km | placement |

No single scale reconciles all four long distances: the fan map is not drawn to the novels' numbers. CAL-01 and CAL-02 favour 2.6 to 3.2 km/px, CAL-03 favours 1.5, and CAL-04 fits nothing. The opening marches decide between them. The novels give the reconstructed infantry about 80 km a day (v12.txt:12443-12446) and the chariots about 10 km an hour (v12.txt:12456-12457). The halt, the infantry camp 30 km from Rimuru and the magitank array 30 km from Dwargon must all fall between the month mark (D-3) and the morning of D+0. That is only possible below about 2.2 km/px. **2.0 km/px** is the round scale that keeps every war-theatre statement within about 40 % and every opening march inside the stated speeds. CAL-05 and CAL-06 were then used to place the two battlefields at their stated 30 km. The calibration is graded `SYNTHETIC`, confidence `LOW`, and distances are shown rounded to 10 km (5 km below 50 km) with a `~`. Reference entry DISC-R6-09 records the residuals.

## 3. Control points

| Anchor | Id | Grade | Basis |
|---|---|---|---|
| Tempest capital Rimuru | `jura-tempest-federation` | MEASURED | Map pin (the Ramiris Labyrinth `ramiris-labyrinth` takes the same position, RECONSTRUCTED) |
| Dwargon (city) | `dwargon` | MEASURED | Map pin |
| Imperial capital | `imperial-capital` | MEASURED | Map pin |
| Blumund, Englassia (Ingracia), Farmenas, other nations | nation ids | MEASURED | Map pins |
| Imperial border base | `imperial-interior` | RECONSTRUCTED | On the bearing from the capital to the forest |
| Tempest border crossing | `tempest-border` | RECONSTRUCTED | Where the line of march meets the traced Empire-Jura border |
| **Imperial halt point** | `jura-forest-edge` | RECONSTRUCTED | Travel-time constraints, §5 |
| **Dwargon Gate** (eastern metropolis, Isthmus) | `dwargon-eastern-metropolis` | RECONSTRUCTED | East of the city at the Isthmus, facing the Empire (v13.txt:697-699), 575 km from the imperial capital |
| Dwargon southern gate (front door) | `dwargon-outer-gate` | RECONSTRUCTED | On the southern road about 18 km from the city |
| Southwestern Dwargon front | `sw-dwargon-front` | RECONSTRUCTED | 30 km SSW of the city (CAL-05), head of the south-western valley |
| Northern Tempest front | `northern-tempest-front` | RECONSTRUCTED | On the Tempest-Dwargon road at the massif's southern foot |
| Dwargon south-western border crossing | `dwargon-sw-border` | RECONSTRUCTED | On the traced Dwargon-Jura border |
| Southern approach to Dwargon | `dwargon-south-approach` | RECONSTRUCTED | Foothills south of the massif, outside the border |
| Isthmus road (Empire side) | `isthmus-approach` | RECONSTRUCTED | The detachment's holding position |
| Imperial infantry camp | `imperial-infantry-camp` | RECONSTRUCTED | 30 km from Rimuru (CAL-06) |

Each strategic location exists once, with one coordinate, for the whole campaign. In R6 the D+0 magitank battlefield and its tactical positions (chariot line, linked fortress, Gaster's camp, the magitank rear) moved from the old forest-side "Dwargon Gate Front" to the south-western front. The old id `dwargon-gate-front` became `sw-dwargon-front`, so that the single **Dwargon Gate** of the scenario is the Isthmus gate. The Isthmus cluster (gate, battle line, Gazel's defensive line, the ritual ground, the Legion's landing ground) moved east with the gate, keeping its relative layout.

## 4. Terrain reconstruction

The painted map (`public/maps/myth-map.jpg`) is the only supplied image that shows relief, forest and water. The theatre (x 0.50 to 0.90, y 0.28 to 0.70) was traced by eye on a 0.01 grid into `data-source/geography.source.json`:

| Feature | Ids | Grade |
|---|---|---|
| Kanaat massif (Dwargon's mountains) | `kanaat-massif` | TRACED |
| Passes: southern road pass, south-western valley, Isthmus road | `dwargon-south-pass`, `dwargon-sw-pass`, `isthmus-pass` | CANON_RECONSTRUCTED / SYNTHETIC |
| Lake east of Rimuru | `jura-central-lake` | TRACED |
| Eastern Jura river, lake outflows east and west | `eastern-jura-river`, `lake-outflow-east`, `lake-outflow-west` | TRACED |
| Fords and bridges | `ford-upper-eastern`, `ford-lower-eastern`, `outflow-east-ford`, `rimuru-bridge` | SYNTHETIC / CANON_RECONSTRUCTED |
| Great Jura Forest, eastern deep forest | `great-jura-forest-cover`, `eastern-deep-forest` | TRACED |
| Roads: Tempest-Dwargon (logistics), Tempest-Blumund (logistics), imperial highway, Isthmus road | ids as named | CANON_RECONSTRUCTED / SYNTHETIC |

The sea and the coast come from `public/maps/coast.json` (traced from the line map). Relief comes from `public/maps/3d/height.png`, the stylised relief of the 3D view, sampled by `scripts/cartography/build_relief_grid.py` into `data-source/relief.grid.source.json` (201 × 211 cells, 0.002 atlas units, about 5 km). Elevations are shown as synthetic metres (a linear mapping of the stylised relief, peak 4,500 m) and are not a survey.

## 5. Routes and distance

`scripts/lib/routing.ts` rasterises the theatre on the relief lattice and finds every ground route by A* (8-connected, no corner-cutting next to a barrier or a river):

| Terrain | Cost per km |
|---|---:|
| Road | 0.55 |
| Open ground | 1.0 |
| Ford or bridge | 1.6 |
| Forest | 1.45 |
| Mountain pass | 1.9 |
| Deep forest | 2.3 |
| River without a ford | 9.0 |
| Kanaat massif outside a pass, water | impassable |

Relief above the plain adds a slope penalty off roads. The path is smoothed and simplified without ever cutting across a barrier, then measured in kilometres. Air routes (airships, dragon-tier movers) are straight lines. Moves under 15 km inside one battlefield are drawn straight. Every route records its length, the straight-line distance, kilometres per terrain class, passes, crossings, roads used, highest ground and an elevation profile (`public/data/routes.json`).

Every leg of every formation's position track carries the route it travels (`PositionKey.path`). The resolver interpolates along that route by distance, so the marker, its trail, the movement line, the held-ground front, the cinematic camera, the minimap and the 3D overlay all follow the same road, pass and ford. A movement's implied pace is checked against its unit's stated rate (`world.source.json` speeds: infantry 80/120, armour 160/240, air 2,400/9,600, elite 120/1,200, mixed 60/100, dragon-tier 20,000/200,000 km a day, usual/maximum). The compiler lists any movement that would exceed the maximum. R6 has none.

**Halt point.** The novels do not place the halt. It was placed where the constraints of §2 can all be met. The 700,000 must reach a camp 30 km from Rimuru (about 280 km by the road, 113 km a day). The 200,000 must go by northern Tempest and the south-western valley to 30 km from Dwargon by D+0 08:00 (about 555 km, about 220 km a day). Both fit only if the halt lies west of the upper ford, south-east of the northern Tempest front, and the halt falls at D-3 14:00 rather than R5's D-2.

## 6. Territory and the front

National borders are the traced Base Map regions (unchanged in R6). The held-ground front (`scripts/compile-front.ts`) is a reconstruction from force positions and strengths. In R6:

- a formation becomes an aggregate only when it is split (a party sent ahead does not divide it);
- formations withdrawing, merged or returned hold no ground;
- imperial formations never hold Dwargon ground: Dwargon is never taken (front-rules gate with `fromEvent: null`). The fighting there is shown by the theatre's `CONTESTED` state and its operational area.

## 7. Validation (actually run)

`npm run test` runs `scripts/test-scenario.ts` (27 tests) after the engine tests (25). The geographic tests:

- essential places have coordinates inside the atlas;
- km round-trip and invariance through the renderer projection; manifest scale equals the module scale;
- the two canonical 30 km placements hold within 5 km;
- every route has at least two points, a length that matches its geometry, and no exception; every movement references real places and routes;
- every ground route segment stays on land, crosses the massif only inside a pass, and crosses rivers only at a ford or bridge; Formation B uses the south-western valley;
- no movement exceeds its unit's maximum rate;
- every drawn leg longer than 15 km has a route (or an UNKNOWN discontinuity);
- no formation moves further in one 10-minute frame than its top speed allows;
- the Dwargon Gate has one coordinate everywhere and there is one place of that name.

## 8. Known uncertainties

- The scale is a compromise. The Tempest-Ingracia distance is off by a factor of three, and the Tempest-Dwargon straight line is 622 km against a stated 1,000 km rail path.
- Terrain outlines are accurate to about one grid step (10 to 13 km). Roads, passes and fords are the project's.
- The relief is stylised. Its metres are synthetic.
- Outside the traced theatre, ground routes would be drawn straight and flagged. No R6 movement needs that.
