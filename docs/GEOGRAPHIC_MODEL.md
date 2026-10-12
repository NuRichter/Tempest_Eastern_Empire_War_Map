# Geographic model

Revision R7 (2026-10-12). One world model drives the map, the 3D view, the minimap, unit movement, the held-ground front, the scale bar, the measuring tool and every distance shown in the interface. Nothing in it is an official Tensura measurement: the author has never published a world scale. Everything below is either read off the supplied maps, stated by the novels, or a documented synthesis.

## 1. A 1:1 world

| System | Definition | Where it lives | Used for |
|---|---|---|---|
| `SIM_NORMALISED` | `x`, `y` in [0, 1] across the 2641 × 2035 atlas image, origin at the north-west corner, `+x` east, `+y` south | `data-source/gazetteer.source.json` (every position, stored once) | storage of all positions |
| `WORLD_KM` | kilometres east and south of the same corner: `e = x · 5,282`, `s = y · 4,070` | `data-source/world.source.json`, `src/lib/world.ts` | distances, route lengths, speeds, the scale bar and the measuring tool |
| Synthetic projection | longitude/latitude-shaped angles for the renderer only (`src/lib/coords.ts`) | runtime | MapLibre flat and globe views |
| Screen | CSS pixels | each frame | drawing only, never stored |

The scale is isotropic: 1 atlas pixel = **2.0 km** in both directions. The world frame is 5,282 × 4,070 km, **21.5 million km²**; the basemap measures **7.59 million km² of land**, 13.8 million km² of sea and 58,500 km² of lakes (`public/maps/terrain-biomes.json`), a continent the size of Australia. `WORLD_KM` is a pure function of the stored point: zoom, pan, projection, the 3D view and marker size never feed back into a position.

On the map the reader sees the same kilometres:

- a **scale bar** (bottom left), the ground length under 100 screen pixels at the centre of the view, rounded to a 1-2-5 step;
- the **pointer read-out** in kilometres east and south of the atlas corner (the simulation coordinates are in its tooltip);
- a **measuring tool** (ruler button): click points on the map, read the straight-line length in kilometres; Backspace removes the last point, Esc stops.

## 2. Calibration

`world.source.json` lists every distance the novels state between two points the atlas can place:

| Id | Statement | Locator | Stated | Atlas at 2.0 km/px | Residual |
|---|---|---|---:|---:|---:|
| CAL-01 | Tempest-Dwargon rail line, overall | v12.txt:3279-3281 | ~1,000 km (path) | 654 km straight | path/straight 1.5 |
| CAL-02 | Imperial army at its border, from the intended battlefield | v12.txt:12443-12450 | ~1,500 km | 1,081 km | −28 % |
| CAL-03 | Imperial capital to the camp near the Dwargon border | v14.txt:10863-10866 | 500 km | 575 km | +15 % |
| CAL-04 | Tempest-Ingracia line | v12.txt:3283 | ~300 km | 914 km | ×3 (map discrepancy) |
| CAL-05 | Magitanks arrayed from Dwargon's centre | v13.txt:513-515 | ~30 km | 30 km | placement |
| CAL-06 | Imperial infantry camp from capital Rimuru | v13.txt:386-389 | ~30 km | 30 km | placement |

No single scale reconciles all four long distances: the fan map is not drawn to the novels' numbers. **2.0 km/px** is the round scale that keeps every war-theatre statement within about 40 % and every opening march inside the stated speeds. The calibration is graded `SYNTHETIC`, confidence `LOW`, and distances are shown rounded (DISC-R7-13).

## 3. Control points

| Anchor | Id | Grade | Basis |
|---|---|---|---|
| Tempest capital Rimuru | `jura-tempest-federation` | MEASURED | Map pin |
| Dwargon (city) | `dwargon`, settlement `city-dwargon` | MEASURED | Map pin; the city sits on the southern flank of the range |
| Imperial capital | `imperial-capital` | MEASURED | Map pin |
| Imperial border base | `imperial-interior` | RECONSTRUCTED | On the bearing from the capital to the forest |
| Tempest border crossing | `tempest-border` | RECONSTRUCTED | Where the line of march meets the traced Empire-Jura border |
| **Empire-Dwargon border crossing** | `empire-dwargon-border` | RECONSTRUCTED | Where the isthmus road meets the traced Empire-Dwargon border |
| **Imperial halt point** | `jura-forest-edge` | RECONSTRUCTED | Travel-time constraints, §5 |
| **Dwargon Main Gate** | `dwargon-main-gate` | RECONSTRUCTED | At the south-western **foot** of the range, about 22 km from the city centre |
| Main Gate front (magitank array) | `sw-dwargon-front` | RECONSTRUCTED | About 8 km beyond the gate, 30 km from the city (CAL-05) |
| Dwargon south-western border crossing | `dwargon-sw-border` | RECONSTRUCTED | On the traced Dwargon-Jura border, south of the gate |
| **Dwargon Eastern Gate** | `dwargon-eastern-gate` | RECONSTRUCTED | At the Isthmus facing the Empire (v13.txt:697-699), 575 km from the imperial capital |
| Eastern front (imperial camp) | `dwargon-eastern-front` | RECONSTRUCTED | Between the gate and the border on the isthmus plain |
| Imperial infantry camp | `imperial-infantry-camp` | RECONSTRUCTED | 30 km from Rimuru (CAL-06) |
| Third Strike landing ground, eastern approaches of the capital | `third-strike-landing`, `tempest-eastern-outskirts` | RECONSTRUCTED | East of the capital, beyond its garrison's immediate reach |
| Council of the West, Walpurgis Council | `council-of-the-west`, `walpurgis-council` | RECONSTRUCTED / ABSTRACT | Ingracia; a spatial rift with no map position |

Each strategic location exists once, with one coordinate, for the whole campaign. The two Dwargon gates are different places 300 km apart; tests check both.

## 4. The Kanaat massif

The painted map draws Dwargon's mountains as a pictorial symbol several hundred kilometres across. The atlas keeps a **compact range** (DISC-R7-11):

| | |
|---|---|
| Impassable core | an ellipse about **44 × 40 km** (`geography.source.json`, `kanaat-massif.ring`) |
| Foothills | to about 66 × 60 km |
| Summit | about **2,600 synthetic metres**, 14 km north of the city; the city at about 1,900 m |
| Passes | the southern road pass (Tempest-Dwargon road and rail), the main-gate valley (south-west), the eastern road pass |

The painted symbol is kept as `paintedSymbol` for reference only: under it the relief is rolling upland and the land cover is borrowed from the surroundings. The Main Gate is outside the impassable core, at its south-western foot; the 200,000 reach it from the south-western border without entering the mountains.

## 5. Terrain and the basemap

`scripts/cartography/build_terrain.py` builds the relief and the physical basemap:

- **Relief** (`public/maps/3d/height.png`, 16-bit; sampled into `data-source/relief.grid.source.json` for routing): land rises from the coast; broad shaded ranges on the painted map become mountains (thin drawn lines, coasts and borders are ignored); the Ice Continent carries glaciated ranges; the Kanaat massif is the compact cone of §4. Synthetic metres = (level − 5,243) × 0.1.
- **Land cover**: the painted map's green washes become grassland and meadow, its tan washes steppe, its strongly saturated washes barren ground; interior ground far from the sea is drier. The named forests of the route model (Great Jura Forest, eastern deep forest) and the painted tree clusters are forest, with clearings and woodland patches across green ground. Rock above about 1,500 m, snow above about 2,500 m (lower in the far north), the Ice Continent under snow with rock on steep ground.
- **Water**: sea shaded by distance from the coast (shelf to deep water), the painted lakes and the lakes of the route model, the rivers of the route model.
- **Hillshade** from the north-west, with fine ridges where the ground is high, and single tree crowns stippled into forest when zoomed in.

The output is a Web-Mercator tile pyramid, zoom 0 to 6 (`public/tiles/terrain/`, WebP, about 7 MB), the **Terrain Map** style (the default), and a 4,096-pixel texture for the 3D relief (`public/maps/3d/terrain-4k.jpg`). Detail below the 2 km source resolution is deterministic noise in world coordinates, so tiles join without seams and every build is identical. Every layer is a stylised reconstruction, not a survey.

## 6. Routes and distance

`scripts/lib/routing.ts` rasterises the theatre on the relief lattice (0.002 atlas units, about 5 km) and finds every ground route by A*:

| Terrain | Cost per km |
|---|---:|
| Road | 0.55 |
| Open ground | 1.0 |
| Ford or bridge | 1.6 |
| Forest | 1.45 |
| Mountain pass | 1.9 |
| Deep forest | 2.3 |
| River without a ford | 9.0 |
| Kanaat core outside a pass, water | impassable |

Relief above the plain adds a slope penalty off roads. Air routes (airships, airlifts, dragon-tier movers) are straight lines; a movement typed `AIRLIFT` flies even when its unit marches on the ground. Moves under 15 km inside one battlefield are drawn straight. A movement's implied pace is checked against its unit's stated rate (infantry 80/120, armour 160/240, air 2,400/9,600, elite 120/1,200, mixed 60/100, dragon-tier 20,000/200,000 km a day, usual/maximum). R7 has no movement over its maximum.

The scenario's simultaneities fix the opening: the 970,000 halt and the eastern cohort reach the Eastern Gate at D-3 14:00; the 700,000 (288 km) and the 200,000 (222 km to the south-western border, 294 km up to the gate) arrive together at D+0 08:00; the 40,000 airships fly 448 km from the halt in 70 minutes after the ultimatum is rejected.

## 7. Territory and the front

National borders are the traced Base Map regions. The held-ground front (`scripts/compile-front.ts`) is a reconstruction from force positions and strengths. The rules (`data-source/campaign/front-rules.json`):

- **Dwargon is at war from the eastern crossing** (EVT-0521): from then imperial formations in Dwargon hold ground. A formation standing in Dwargon reaches at most about 60 km (mountain and isthmus country), so the south-western thrust shows as a corridor to the Main Gate and the Eastern Gate front as a bridgehead from the border to the coast, not as the whole kingdom.
- The south-western ground is given back when the 240,000 are destroyed; the eastern ground holds until the Eastern Gate force dies, changes hands during the allied push, and goes when the Third Strike's eastern group is destroyed.
- Ground a side lost stays lost, except that from the Third Strike (EVT-0541) the Empire may take ground again: its Tempest group, given the weight of a formation able to hold a bridgehead, advances east of the capital until it is destroyed.
- Formations flying a leg hold no ground on the way. Formations withdrawing, merged or returned hold none. Cities are never taken.
- At the end both fronts are back on the pre-war line.

## 8. Validation (actually run)

`npm run test` runs `scripts/test-scenario.ts` (27 tests) after the engine tests (25). The geographic and territorial tests:

- the impassable core is under 80 km across and the summit under 3,200 m;
- the Main Gate is 15 to 30 km from the city, outside the core and reachable from the south-west; the Eastern Gate is a different place more than 200 km away;
- km round-trip and invariance through the renderer projection; the two canonical 30 km placements hold;
- every route has a length that matches its geometry and no exception; every ground segment stays on land, crosses the core only inside a pass and rivers only at a ford or bridge; the 200,000 pass the south-western border on the way to the gate;
- no movement exceeds its unit's maximum rate; no formation moves further in one 10-minute frame than its top speed allows;
- imperial ground in Dwargon appears only after the eastern crossing, grows with the south-western thrust, shrinks after the Main Gate battle while the eastern occupation remains, and is gone at the end; the Third Strike takes ground in Tempest; Tempest is clear at the end.

## 9. Known uncertainties

- The scale is a compromise (CAL-01 to CAL-04).
- Terrain outlines are accurate to about one grid step (10 to 13 km). Roads, passes and fords are the project's. Land cover is inferred from a painting.
- The relief is stylised and its metres are synthetic. The compact Kanaat range is a decision of the scenario, not a measurement.
