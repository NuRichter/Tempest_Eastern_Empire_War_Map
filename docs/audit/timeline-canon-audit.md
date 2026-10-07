# Timeline canon audit — revision R5 (2026-10-07)

The Step 1 dataset (workbook `Tempest_Eastern_Empire_War_Timeline.xlsx`, revision "final") was audited event by event against the light novels, volumes 12–16, read from the local copies in `Sources of Truth/Sources/` (v12–15 Indonesian fan translation, v16 Yen Press English). The audit produced revision **R5-CANON-AUDIT**, now the campaign source in `data-source/campaign/`. The Step 1 workbook and its generators are kept unchanged in `Sources of Truth/Timeline Database/` as the archived pre-audit revision.

Method: four parallel audits (three over the events, one over forces, movements, casualties, command and territory), each locating every claim in the text with a line locator; a chief-editor pass that rebuilt the clock and the non-event files; five phase editors that rewrote the event files and challenged the plan where the text disagreed; and an integration pass, with every result compiled and validated. Every corrected event lists its changes and locators in `audit.changes`, visible in the event dossier.

## 1. Current state before the audit

| Item | Step 1 (pre-audit) |
|---|---|
| Events | 105, no explicit provenance class |
| Clock | 50 days, D−40 .. D+9, first contact D+0 |
| Forces | 36 |
| Movements | 22 |
| Casualty records | 16 (campaign imperial dead "830,001") |
| Contradictions / ambiguities | 7 / 17 |

## 2. Problems found

| Category | Count / examples |
|---|---|
| Errors (audit severity "error") | **117** across 105 events; 94 warnings, 72 notes |
| Missing canonical events | **44** (15 before contact, 11 in the labyrinth phase, 18 in the long night) |
| Wrong day or time | 27 events (largest class): the labyrinth phase compressed into 3 days when the novel counts at least 7; the whole late war spread over D+6–D+9 when the novel tells it as one night; the summit placed on the evening of the last fighting day instead of several days later |
| Wrong order | the opening battle (Gabiru's air attack precedes Gobta's charge; the airships arrive after the magitank fortress); Rimuru's infiltration before Velgrynd's attack on Tempest; the 60,000 die before Gazel's sortie |
| Wrong actor | EVT-0115: the airship fleet was destroyed by **Ultima**, not Veldora; EVT-0383: the lapsing taboo spell was **Kagali's**; EVT-0321 inverted (Zero kept command) |
| Misreadings | EVT-0362 "Shion and others are killed" is a remembered earlier death — nobody dies in the sealed space and Tempest's losses are zero; EVT-0384 "the Empire proposes an armistice" has no basis — Benimaru demanded unconditional surrender; EVT-0397 "citizens left without memory" misreads "had never lost a war" |
| Inflated strengths | the force in contact was ~100 wolf riders, not 12,000; Gabiru's air element ~400, not 3,000; 100 Hiryuu and 300 Kurenai on the eastern front, not 3,000; only 100 airships fought at Dwargon |
| Misattributed totals | the 2,000,000 / 1,000,000 figures belong to the Armored Division, not the whole Empire; Tempest's "150,000" is the Western Army held in reserve, not national strength |
| Casualty model | stopped partway through V13 Ch4: the ~170,000 outside the labyrinth were also annihilated (Carrera, Geld, Diablo), V14 states 940,000 killed, ~700,000 were then **revived** and held as prisoners; "830,001" and "170,000 unaccounted for" were not supported |
| Names | Geist → **Gaster**, Faraga → **Farraga**, Minute → **Minitz**, Gobya → **Gobwa**, Ben → **Vaughn**; Caligulio is one of the Three Generals, not "the Marshal" (Velgrynd) |
| Geography | "Tempest border" placed well inside Jura; the Dwargon Gate battlefield placed on Dwargon's side of the drawn border although its basis says "on the forest side" |

## 3. Canon-supported corrections (R5)

- **Clock** rebuilt to D−43 .. D+31 (75 days, 10,800 ten-minute frames), anchored on stated intervals: "a month after the gathering" (the V12 Ch5 war council, v13.txt:248), the surface battle "over in less than two hours" (v13.txt:7475), labyrinth day counts 350k / 150k / 30k (v13.txt:9489–9493) and "seven days since the operation began" (v13.txt:10599), the annihilation "after dawn" two days after the elite were sent (v13.txt:16280), V14 Ch1 "the day after the revival" (v14.txt:875), the single long night (v14.txt:14542 → V15), the summit "at ten in the morning" (v16.txt:8365) with an afternoon session at 15:00.
- **Events**: 166 in total — 104 corrected, 63 added, 2 deleted (EVT-0362, EVT-0384). Every event has a provenance class, time precision, source locators, paraphrased evidence and an audit trail.
- **Forces**: 56 (37 corrected, 20 added) with `sizeStatus` (41 explicit, 1 derived, 1 reconstructed, 13 unknown) and hierarchy provenance.
- **Movements**: 37 (22 corrected, 15 added) with route confidence (3 solid, 8 reconstructed, 11 schematic, 15 unknown — not drawn).
- **Casualties**: 26 records with separate killed / revived / captured. Compiled totals: imperial **killed 1,010,002**, **revived 700,000**, **permanently dead 310,002**, **captured 700,000**; Tempest killed **0**; wounded and missing **unknown** for both sides.
- **Battles**: 10, each typed (major battle, interception, special combat, engagement).
- **Turning points** re-ranked to fit the corrected sequence (e.g. the ultimatum; Gaster's death; Velgrynd's Gravity Collapse; Veldora dominated; the break-out; the withdrawal).

### Where the editors overruled the plan (text wins)

| Point | Plan | Corrected to | Locator |
|---|---|---|---|
| Minitz's death | D+9 | **D+10** (elite sent D+9, rested overnight) | v13.txt:11907–11917, 15990 |
| Albis's arrival | D+10 19:00 | **D+11 07:30** (told on the attack morning) | v13.txt:13723, 14602 |
| The ~240,000 not revivable | surface dead only | also bodies destroyed by Ultima, Testarossa, Carrera's Gravity Collapse, and souls broken by terror | v13.txt:18372–18386 |
| Gradim's killer | Vega | **Carillon**; Vega devours the remains | v15.txt:9404–9502 |
| Envoy vs opening plan | plan order | envoy chosen and sent first | v13.txt:928, 1229, 1351–1354 |
| Summit start | 09:00 | **10:00** | v16.txt:8365 |

## 4. Safe reconstructions (labelled in the data)

- Every `HH:MM` (the novels give none), on a 10-minute grid, in narrative order.
- The day of the pre-war councils (D−43, D−40, D−34), the departure (D−32), the halt (D−2), the resurrection (D+12) and the repatriation (D+31).
- The approach march: linear between the departure, the crossing of the drawn border on D−5 and the halt at the forest edge on D−2.
- Map positions of places the supplied maps do not mark (each with a stated basis), and schematic theatre areas clipped to the traced borders.
- 25 events are `CANONICAL_WITH_VISUAL_RECONSTRUCTION`: the event is canonical, its placement on the map or the clock is ours.

Untraced transfers (Velgrynd's space-time connection, a summoned unit appearing on another front) are drawn as discontinuities — the formation appears at its destination — never as an invented route.

## 5. Resolved issues (canon resolution, R5)

The questions this audit first left open were settled from the text, and by synthesis where the text is silent, as the project brief asks (stay as close to canon, and to the reference documentaries, as possible). Each change carries its locator and audit note in the data.

| Question | Resolution | Basis | Class |
|---|---|---|---|
| **Departure timing**: imperial troops already in the forest at the V12 Ch5 council, yet the Epilogue has the army leave "the next day" | Both hold. The troops in the forest are **advance squads** (new force F-EMP-016, strength unknown, new event EVT-0456 at the council); the main body leaves on D−32 as the Epilogue says, and the squads rejoin it at the D−2 halt (EVT-0019) | "some forces have entered the Great Jura Forest, but the chariot unit has not moved" (v12.txt:12329–12331); Moss's clones track the army "divided into several squads" in the eastern forest (v12.txt:12504–12506) | Presence CANONICAL; position and rejoining RECONSTRUCTED |
| **Shion's unit strength** (10,000 vs about 100) | Not a contradiction: two units. **Shion's Pro-Guard / Shion Fan Club** = 10,000 (F-TEM-005, EXPLICIT); **Yomigaeri** = hundreds, about 100 (F-TEM-005Y, ~100). CON-010 closed | The 10,000 are "Pro-Guard of Shion, commonly known as Shion Fan Club … distinct from the Yomigaeri" (v13.txt:13968–13978); "10,000 mages of every kind" act under the Yomigaeri's lead (v13.txt:17198–17204); Yomigaeri "hundreds of them" (v12.txt:3889) | CANONICAL; Yomigaeri size RECONSTRUCTED |
| **Floor 70 sally**: D+2 or D+3 | **D+2** (EVT-0203 moved) | "On the first day they explored almost all of floors 60–69 … on the first day the gate was still closed … the next morning" (v13.txt:9907–9937): the first day of the operation is D+1 | Day CANONICAL_RELATIVE; hour a simulation placement |
| **Yen Press spellings** (Rudra/Ludora, Caligulio/Calgurio, Gadora/Gadra) | Settled by the project's naming policy: the official katakana reading decides, other forms stay searchable aliases. Rudra (ルドラ), Caligulio (カリギュリオ), Gadora (ガドラ) | `terminology.source.json` policy; conflicts marked RESOLVED | Naming policy |
| **Prisoner arrival** after repatriation | The march home is drawn as a SCHEMATIC movement from Tempest towards the Empire starting D+31 (MOV-036); the arrival lies after the end of the clock and is labelled as such, never dated | v16.txt:9773 (departure soon after the summit); no arrival in the text | Departure CANONICAL_WITH_VISUAL_RECONSTRUCTION; arrival UNKNOWN |
| **Magic Beast Division over Ingracia** (an 'airlift' battle placed in northern Ingracian airspace) | Removed. The fleet was only flying toward northern Ingracia, from where it was to attack, and was pulled to Dwargon by Space-Time Connection before arriving (v15.txt:3431-3435, 3452-3463). Its in-flight position is not stated (ABSTRACT, not drawn); its fight is the Battle of the Dwargon Eastern Front, alongside the Dwargon front. No battle was fought in Ingracia in this war | Text | CANONICAL |
| **Krishna and Bonnie** without records | Added as characters. Krishna: Imperial Guardian, 17th in rank, fought Albert (v13.txt:11736–11787). Bonnie: wizard in Masayuki's party, revealed as an enemy (v13.txt:14491–14689). No photocard exists in the repository; their dossiers say so | Text | CANONICAL |

Still deliberately left as recorded: CON-004 (a "113,000" figure that is inconsistent within one passage) stays out of the force register, because no reading of it is supported.

## 6. Recommended next steps

1. When the Yen Press editions of vols 12–15 are at hand, compare the remaining unverified unit names in `terminology.source.json`.
2. If photocards for Krishna and Bonnie appear in the character repository, add them with `build_photocards.py`.
3. If the Step 1 workbook is to be regenerated for human readers, export it from the R5 campaign source rather than editing the archived generators.
