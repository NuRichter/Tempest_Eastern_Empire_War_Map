# Campaign timeline (R6 scenario)

The clock runs from D-43 to D+27 in 10-minute frames. D+0 is first contact (Testarossa's ultimatum and the surface battle). Day placements are canonical only where the event's `timePrecision` says so. **Every clock time is a simulation placement: the novels give no clock times and no calendar dates.** The calendar shown in the interface (year 9001) is an artificial marker. Events are placed by battle day and time in `data-source/campaign/events/*.json`. The compiler applies their effects in order, so replaying, seeking and scrubbing always give the same state (`npm run test` checks seeking against replay at every checkpoint).

Provenance: **C** canonical, **CV** canonical with a visually reconstructed position or time, **S** scenario (set by the brief), **R** reconstructed.

## Phase 1: one column (D-40 to D-3)

| When | Event | What changes | Prov. |
|---|---|---|---|
| D-40 09:10 | EVT-0023 Council assigns the legions | Capital reserve set aside, 100,000 at the imperial capital | C / S |
| D-39 07:50 | EVT-0501 The reserve stays at the capital | Reserve 100,000 (outside the operation) | S |
| D-39 08:00 | EVT-0003 Main formation leaves as one column | **1,005,000** advance as a single formation | CV / S |
| D-39 08:10 | EVT-0502 Separate detachment sets out towards Dwargon | **5,000**. Forward deployment 1,010,000 | S |
| D-33 12:00 | EVT-0521 Detachment halts on the isthmus road | | S |
| D-24 08:00 | EVT-0015 The army crosses the Tempest border | Where the measured route reaches the border | CV |
| D-3 14:00 | EVT-0019 Main formation halts at the halt point | Halt point `jura-forest-edge` | C (time R) |

## Phase 2: the split and the opening moves (D-3 to D+0)

| When | Event | What changes | Prov. |
|---|---|---|---|
| D-3 15:00 | EVT-0503 **Split into five allocations** | 700,000 + 200,000 + 40,000 + 30,000 + 35,000 = 1,005,000 at the halt point | S |
| D-3 16:00 | EVT-0020 Formation A marches into the forest | Towards the camp 30 km from Rimuru (282 km) | C |
| D-3 16:00 | EVT-0504 Formation B sets out for northern Tempest | 177 km | S |
| D-3 16:30 | EVT-0506 Northern reinforcement takes off | 40,000 by airship | S |
| D-3 17:00 | EVT-0508 Gate reinforcement Phase 1 sets out | 30,000 towards the Dwargon Gate (563 km by the upper ford and the Isthmus road) | S |
| D-3 17:30 | EVT-0510 Southern formation sets out | 35,000 towards the southern approach (147 km) | S |
| D-3 18:30 | EVT-0507 Northern reinforcement reaches the northern front | | S |
| D-2 10:00 | EVT-0505 **Formation B threatens the Tempest-Dwargon road** | Supply route THREATENED, theatre CONTESTED | S |
| D-2 12:00 | EVT-0512 Formation B turns for the south-western border | | S |
| D-1 02:00 | EVT-0513 Formation B crosses Dwargon's south-western border | Dwargon contested, never taken | S |
| D-1 04:00 | EVT-0514 Formation B pushes up the south-western valley | 252 km through the valley | S |
| D-1 06:00 | EVT-0522 Detachment closes on the Dwargon Gate | | S |
| D-1 12:00 | EVT-0511 Southern formation halts in the foothills south of Dwargon | | S |
| D+0 04:00 | EVT-0029 Imperial infantry camps 30 km from Rimuru | | C (time R) |
| D+0 08:00 | EVT-0030 2,000 magitanks arrayed 30 km from Dwargon's centre | South-western Dwargon front | C |
| D+0 08:10 | EVT-0016 Gazel reports the eastern gate (Isthmus) blockaded | By the 5,000 detachment | C / S |

## Phase 3: the failed south-western offensive (D+0)

| When | Event | What changes | Prov. |
|---|---|---|---|
| D+0 11:10 | EVT-0121 Testarossa's ultimatum rejected | Northern reinforcement flies to the battle (295 km) | C |
| D+0 12:00 | EVT-0106 The 100 airships arrive over the front | | C |
| D+0 13:00 | EVT-0115 Ultima's Nuclear Flame annihilates the Flying Combat Corps | 40,000 dead | C |
| D+0 13:20 | EVT-0119 Magitank Force and Flying Combat Corps annihilated | 200,000 dead (240,000 cumulative) | C |
| D+0 13:30 | EVT-0515 **Formation B's offensive into Dwargon has failed** | Dwargon not taken. Road SECURE. Defence attributed to Ultima's group: verified for the air battle, UNVERIFIED for the ground battle | CV / S |

## Phase 4: labyrinth, reinforcements, revival (D+1 to D+11)

| When | Event | What changes | Prov. |
|---|---|---|---|
| D+1 08:00 | EVT-0516 **Phase 2 transfer** | Reserve 100,000 → 70,000. 30,000 march for the gate (588 km). Committed 1,040,000 | S |
| D+1 to D+3 | EVT-0201, 0210, 0211 Labyrinth entries | 350,000, 150,000, 30,000 enter. 170,000 stay outside | C |
| D+5 08:00 / 08:10 | EVT-0509 / EVT-0525 **Phase 1 arrives and joins the Gate force** | Gate force **30,000** | S |
| D+8 14:00 / 14:10 | EVT-0517 / EVT-0526 **Phase 2 arrives and joins the Gate force** | Gate force **60,000** | S |
| D+9 14:00 | EVT-0518 Detachment falls back to hold the isthmus road | | S |
| D+9 18:00 | EVT-0207 Labyrinth battle over | 530,000 dead (770,000 cumulative) | CV |
| D+10 11:30 | EVT-0219 The Jura invasion army annihilated | 170,000 dead (940,000 cumulative) | C |
| D+10 14:00 | EVT-0520 Southern formation abandons its approach and withdraws | Holds no ground from here | S |
| D+11 10:00 | EVT-0220 **Rimuru revives about 700,000** | Revived 700,000, committed unchanged, active 800,000 | C |

## Phase 5: the Long Night and after (D+15 to D+27)

| When | Event | What changes | Prov. |
|---|---|---|---|
| D+15 21:00 | EVT-0325 Velgrynd's Gravity Collapse kills the 60,000 | The Dwargon Gate force. 1,000,000 cumulative | C |
| D+16 00:20 to 01:30 | EVT-0374 to EVT-0463 Magic Beast Division at the Dwargon front | Outside the operation's ledger | C |
| D+16 02:30 | EVT-0386 Combat over | Armistice | C |
| D+16 06:00 | EVT-0519 **Ledger closure** | 10,000 dead among the detachment and the southern formation. **1,010,000** cumulative, 730,000 active | S (derived) |
| D+17 08:00 | EVT-0527 Detachment withdraws | | S |
| D+19 18:00 | EVT-0524 Southern formation's survivors back at the border base | | S |
| D+21 18:00 | EVT-0523 Detachment's survivors back at the border base | | S |
| D+26 08:00 | EVT-0455 Caligulio marches the revived prisoners home | Arrival after the clock | C |

## Dependencies the order respects

- No allocation exists before the split. The split follows the halt.
- Formation B reaches northern Tempest before it turns for the south-western border, and crosses that border before it arrays 30 km from Dwargon.
- The Phase 2 departure is later than the Phase 1 departure. Each merge follows its arrival by ten minutes. The 60,000 exist from D+8 and die on D+15 (canon).
- The revival follows the Jura dead and precedes the Long Night. The brief lists the dead before the revival. The canonical order is kept and the end state is the same (DISC-R6-06).

## Synthetic chronology assumptions

The halt time and the opening departures are placed by measured route length and the novels' stated march rates (DISC-R6-08). The Phase 1 and Phase 2 arrival days follow from route length at the infantry rate. The southern formation's withdrawal on D+10, the detachment's movements and the place and time of the last 10,000 dead are the project's assumptions where the brief is silent. Each is an event with provenance `SCENARIO` and can be re-timed in the source files without touching the interface.
