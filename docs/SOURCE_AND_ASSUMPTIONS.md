# Sources and assumptions

Revision R7 (2026-10-12). What the atlas takes from where, in order of authority, and every assumption it makes where the sources are silent.

## Sources, in order of authority

| Rank | Source | Where | What it decides |
|---:|---|---|---|
| 1 | **The owner's campaign scenario**, *Alur Timeline secara kasarannya* (Word) | `Sources of Truth/` (never modified) | Force sizes, the order of the phases A to N, which front each formation goes to, the simultaneities, the Third Strike, the ending's shape, the compact Dwargon range, the 1:1 map |
| 2 | **The light novels**, volumes 12 to 16 (English text, line-numbered) | locators `v12.txt:…` to `v16.txt:…` on every event, force and casualty | Everything the scenario does not fix: who is where, what happens in each scene, the cast, canonical figures and order, the Long Night, the summit, the Walpurgis summons |
| 3 | **The supplied maps**: the line Base Map, the painted Myth Map, the annotated capitals map | `public/maps/`, `Sources of Truth/Source Map` | Coasts, borders, capitals (MEASURED), the broad land cover and drawn ranges (TRACED) |
| 4 | **Character photocards** and their manifest | `Sources of Truth/Character Photocard` | Portraits, with source and licence per card |
| 5 | **Project reconstruction** | `data-source/`, `scripts/` | Positions of unstated places, routes, clock times, relief, land cover, the held-ground front |

Where rank 1 and rank 2 disagree, the atlas follows rank 1 and records the difference in the reference register (`DISC-R7-01` to `DISC-R7-13`, in the About panel under *Scenario and novels*). Where rank 1 is silent, rank 2 decides. Where both are silent, the reconstruction is labelled as such on the map and in the dossiers (`SCENARIO`, `RECONSTRUCTED`, `SYNTHETIC`, confidence levels).

## Scenario numbers kept exactly

900,000 · 70,000 · 970,000 · 30,000 · 1,000,000 · 700,000 · 200,000 · 40,000 · 240,000 · 60,000 · 350,000 · 150,000 · 110,100 · 10,100 · 100,000 · 700,000 revived. Every one is derived by the compiler from the records and checked by `scripts/test-scenario.ts`.

## Corrections of the scenario document

| Item | Document | Atlas | Why |
|---|---|---|---|
| Destination of the cohort's 30,000 (F) | "Pintu Utama" (Main Gate) | Eastern Gate | The document's own totals (240,000 and 60,000) require it (DISC-R7-02) |
| About 1,020,000 dead (notes) | one total | 1,010,100 operation dead; 1,020,102 Empire-wide with the Magic Beast Division and two individuals | Nothing invented for the gap (DISC-R7-10) |
| Puppet state (N) | "diambil alih Tempest sebagai Puppet State sementara (sesuaikan canon)" | A Tempest-aligned empire: Masayuki emperor, alliance, embassy, bodyguard | The document asks for canon; the novels reject vassalage (DISC-R7-08) |

## Assumptions (where neither source decides)

| Subject | Assumption | Grade |
|---|---|---|
| Clock times | On a 10-minute grid, chosen so the scenario's simultaneities hold and every march fits its stated rate | RECONSTRUCTED |
| Eastern cohort's departure | D-11 06:00, timed back from its arrival with the halt | SCENARIO (derived) |
| Eastern cohort's border crossing | D-5 12:00 at the Empire-Dwargon border on the isthmus road | SCENARIO (derived) |
| Testarossa's group's departure | D-1 06:00 from the capital Rimuru, Testarossa and Ultima | RECONSTRUCTED |
| The 30,000 from the cohort | Through the eastern forest, across the eastern river, north to the isthmus (not through Dwargon's heartland) | RECONSTRUCTED |
| The allied eastern push | Tempest's First Corps marches from the Main Gate to the Eastern Gate (D+11 to D+15) and attacks with Dwargon's army at D+15 18:00 | SCENARIO |
| Who kills the 60,000 | Velgrynd, as in the novels; the allied push is engaged at the time | canon kept (DISC-R7-06) |
| Third Strike's split | 8,000 east, 2,100 to Tempest (the document: "most" and "the rest") | SCENARIO parameter, `scenario-params.json` |
| Third Strike's travel | By airship (400 km an hour); the eastern group lands before the Eastern Gate, the Tempest group east of the capital | RECONSTRUCTED |
| Who destroys the Third Strike | The allied general attack at the Eastern Gate; Geld's Second Corps before the capital | SCENARIO |
| Meeting with the West | D+23 at the Council of the West, Testarossa and Cien | SCENARIO (no canon scene) |
| Walpurgis summons | D+27, "days later", after the prisoners leave | canon, time RECONSTRUCTED |
| Dwargon range | Core 44 × 40 km, summit about 2,600 m, gate 22 km from the city | SCENARIO + RECONSTRUCTED |
| Land cover, relief, lakes outside the route model | Inferred from the painted map; detail is deterministic noise | STYLISED |
| Held ground in Dwargon | Formations there reach at most about 60 km | RECONSTRUCTED rule |
| Held ground of the Third Strike's Tempest group | Counted with the weight of a formation able to hold a bridgehead | RECONSTRUCTED rule (the document asks for a territorial advance) |

## What is verified, what is not

Verified by running code (`npm run verify`, `npm run test`, the browser QA): every scenario number, every ledger identity, the nineteen timeline checkpoints, the geographic constraints, the movement rates, the territorial rise and fall on both Dwargon fronts and in Tempest, and the cast rules at the border crossing.

Not verifiable from the sources: every clock time, the position of every RECONSTRUCTED place, the land cover, the relief, and the scenario's own additions (marked SCENARIO wherever they appear).
