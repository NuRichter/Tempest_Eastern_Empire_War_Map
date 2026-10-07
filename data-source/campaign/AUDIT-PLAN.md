# R5 canon-audit plan for the event files

Revision `R5-CANON-AUDIT (2026-10-07)`. This plan is the brief for the five phase editors. The non-event files (`revision.json`, `forces.json`, `movements.json`, `casualties.json`, `commanders.json`, `combatants.json`, `territory-changes.json`, `stages.json`, `reference.json`, `transit.json`) and the gazetteer and character files have already been revised to match it. The compiler passes with the event files as they are now: the events still sit at their old times until the phase editors move them.

Evidence for every item comes from the audit files `events-A.json`, `events-B.json`, `events-C.json` and `forces-casualties.json`, checked against `ln/v12.txt`..`v16.txt`. Locators below are `vNN.txt:line`.

## 0. Rules for all phase editors

- **Clock.** The clock runs from `firstDay -43` to `lastDay 31`, with 144 frames a day on a 10-minute grid. D+0 is the day of Testarossa's ultimatum and the surface battle. `calendarStart 01/01/9001` is the artificial date of D-43.
- **Times are simulation placements.** The novels give no clock times, so every `HH:MM` is reconstructed. Keep the times on the 10-minute grid and in strict narrative order. When two events share a frame, the array order inside the file decides which comes first, and files are read in name order (01 before 02, and so on).
- **`timePrecision`.** Set it on every event:
  - `CANONICAL_RELATIVE` when the text states the interval ("the next day", "seven days", "less than two hours").
  - `DAY_LEVEL` when the day is canonical but the time is not.
  - `SEQUENTIAL` when only the order is canonical.
  - `RECONSTRUCTED` when the day itself is our placement.
- **`provenance`.** Every event currently has `provenance: null`. Copy the provenance from the audit (`CANONICAL`, `CANONICAL_WITH_VISUAL_RECONSTRUCTION`, `UNRESOLVED`, …). New events use the audit's `suggestedProvenance`.
- **`audit` block.** Set `status` to `CORRECTED` or `ADDED` and list each change in `changes` as a short line with its locator.
- **Names.** Use the canonical forms: Gaster (not Geist), Farraga, Minitz, Gobwa, Caligulio, Gradim, Vaughn (not Ben), Gadora, Adalmann, Hakuro, Soei, Armored Division, Restructured Armor Corps, Magitank Force, Flying Combat Corps, Magic Beast Division, Composite Division, Imperial Guardians, Imperial Intelligence Bureau, Pegasus Knights, Hiryuu, Green Numbers, Yomigaeri and Elemental Colossus. Samuel and Zamdo are the same officer; write "Samuel (Zamdo)".
- **Quotes.** Paraphrase. Never quote more than about 15 words. Unknown numbers stay `"UNKNOWN"` and are never written as 0.
- **Forces.** Use the force ids listed per event. New ids from this revision:
  - Empire: F-EMP-011A (labyrinth echelon, 530,000), F-EMP-011B (camp outside, 170,000), F-EMP-015 (Imperial Guardians), F-EMP-051 (Cerberus), F-EMP-061 (imperial flagship).
  - Tempest: F-TEM-020 and F-TEM-021 (right and left wings), F-TEM-001A (~100 wolf riders), F-TEM-003C (~300 Blue Numbers dragon riders), F-TEM-006 (Volunteer Corps), F-TEM-010A (Adalmann's undead), F-TEM-030 (Rimuru's party).
  - Primordials and Dwargon: F-DEM-003 (Carrera), F-DEM-004 (Diablo), F-DEM-005 (Black Numbers), F-DWA-000 (Dwargon command).
  - Others: F-ALL-002 (Western Army, 150,000, reserve), F-ALL-003 (Albis's 20,000).
  - F-TEM-003B now means the ~100 Hiryuu.
- **New places.** `imperial-infantry-camp`, `imperial-siege-camp`, `magitank-hq`, `dream-fortress` (abstract) and `imperial-flagship-jura` (air).
- **New characters.** `zero`, `albis` and `carillon`. `samuel` now has the aliases Zamdo and Major General Zamdo.

## 1. Clock skeleton

| # | Segment | Battle days | Basis | Provenance of the placement |
|---|---|---|---|---|
| 1 | V12 Ch2: Benimaru's order of battle (52,000) and the reorganisation into wings (52,000 + 50,000; Western Army 150,000 kept in the West) | D-43 | Narrative order only: before the V12 Ch4 council (v12.txt:3505, 4612-4636) | RECONSTRUCTED |
| 2 | V12 Ch4 imperial council: Bureau assessment, the Marshal's assignments, war decree "on this day" | D-40 | Must precede Gadora's audience, which follows two "several days" passages on the Tempest side (v12.txt:11582, 11817) | RECONSTRUCTED |
| 3 | Gadora's audience, assassination and return to Tempest; Argos: "no movement today either"; V13 Prologue call to Yuuki and the rainy-day talk with Kagali | D-34 | The audience was "less than ten minutes" before his reappearance (v12.txt:11929-11931); the Prologue follows directly (v13.txt:83-115) | RECONSTRUCTED (day); same-day linkage CANONICAL_RELATIVE |
| 4 | V12 Ch5 Control Room war council: **the "subordinates' gathering"**. 2,000 chariots seen; "millions"; ~20-day forecast; corps taskings | D-33 (reference R0) | Opens "today, in this control room, our subordinates gathered" (v12.txt:12108). It is the anchor of V13's "a month has passed" (v13.txt:248) | RECONSTRUCTED placement; it is the anchor |
| 5 | V12 Epilogue: Rudra and Velgrynd resolve; the army leaves the Empire "the next day" | D-33 night; departure D-32 | "The next day" after the Rudra-Velgrynd scene (v12.txt:13120). That scene is undated, so it is placed on the council night: at the council the army was still massed at the border (v12.txt:12444) | Departure CANONICAL_RELATIVE to the Epilogue scene; the day is RECONSTRUCTED |
| 6 | Approach march; border crossed | D-32 .. D-3 (crossing D-5) | Slower than the ~20-day (v12.txt:12444-12449) and 29+-day (v13.txt:302-305) forecasts. The crossing is stated as already done at the month mark (v13.txt:313-315) | RECONSTRUCTED; transit.json is a linear interpolation |
| 7 | Month mark (V13 Ch1 opening) | D-3 | "A month has passed since the gathering" = R0 + 30 (v13.txt:248) | CANONICAL_RELATIVE |
| 8 | Halt and deployment; 700,000 march into the forest | D-2 | "Soon after that" (v13.txt:341-349) | RECONSTRUCTED |
| 9 | Infantry camped ~30 km from capital Rimuru with command posts | D-1 | Reported by Soei on D+0 (v13.txt:383-389); it needs time to form | RECONSTRUCTED |
| 10 | Control-room scene and the single Gazel call (blockade report, Argos imagery, task split). Simultaneously, 15,000 at the gate and the dwarf walls. Testarossa chosen as envoy | D+0 morning (08:00-09:00) | One continuous call (v13.txt:571-891). The gate scene is "at the time Rimuru spoke to Gazel" (v13.txt:944). Envoy: "please go now" (v13.txt:1700-1712) | Day CANONICAL_RELATIVE (same day as the battle); times RECONSTRUCTED |
| 11 | Gaster's camp is pitched; ~100 sensed; ultimatum rejected; Ramiris isolates the capital | D+0 11:00-11:10 | Same continuous scene (v13.txt:1620-2064). Gaster's troops are pitching tents, so not before dawn | CANONICAL_RELATIVE (same day) |
| 12 | **Surface battle**, under two hours | D+0 11:30-13:20 | "Less than two hours after the battle began it was completely over" (v13.txt:7475-7476) | CANONICAL_RELATIVE |
| 13 | Labyrinth Raider operation | D+1 .. D+10 | Day 1 = D+1 is RECONSTRUCTED (the corps advanced on the capital during the surface battle, v13.txt:6687-6691). Day counts are canonical: 350k / 150k / 30k on days 1-3 (v13.txt:9489-9493); raiders join on day 4 (v13.txt:10042); "seven days since the operation began" = D+8 (v13.txt:10599); Minitz enters "the next day" = D+9 (v13.txt:11917) | Start RECONSTRUCTED; the rest CANONICAL_RELATIVE |
| 14 | Labyrinth battle over: >530,000 dead, none on Tempest's side; <200,000 remain outside | D+10 | Between Minitz's raid (D+9) and Caligulio's dawn scene, at which Krishna, "sent two days ago", has come back (v13.txt:16289) | RECONSTRUCTED within a canonical bracket |
| 15 | **Annihilation of the outside camp**: Carrera's Gravity Collapse, Geld vs >20,000, Diablo takes the camp's souls, Caligulio killed. Jura total: 940,000 killed | D+11 | "After dawn broke" (v13.txt:16004). Krishna was sent two days earlier, with Minitz on D+9. It is daylight outside the tent (v13.txt:17752-17755) | CANONICAL_RELATIVE |
| 16 | **Resurrection** of ~700,000 (V13 Epilogue); ~240,000 surface dead not revivable | D+12 | "We played around all day" while the spell ran (v13.txt:18484-18492). One day after the annihilation | RECONSTRUCTED |
| 17 | V14 Ch1 "the day after the resurrection": rewards and evolution. V14 Prologue: clowns' conference | D+13 | v14.txt:875. The Prologue is undated ("news had not yet reached the Empire") but must follow Miranda's escape on D+11 | Ch1 CANONICAL_RELATIVE; Prologue RECONSTRUCTED |
| 18 | Banquet (Intermission: Tempest losses zero, 940,000 imperial killed) | D+14 | "The banquet had to wait for the next day" (v14.txt:4081) | CANONICAL_RELATIVE |
| 19 | Prisoners calm "three days after the revival"; military conference; rations for 700,000 | D+15 | v14.txt:5010-5016, 5208 | CANONICAL_RELATIVE |
| 20 | Guy and Velzard visit; "the next day"; all-night drink with Elmesia | D+16 .. D+17 | v14.txt:7140-9267. Minimum chain of stated day changes | RECONSTRUCTED |
| 21 | Day after the Elmesia night: the Yuuki meeting is set for "noon tomorrow"; the meeting ends at dusk | D+18 day | v14.txt:12725-12920, 13636-13645 | CANONICAL_RELATIVE to row 20 |
| 22 | **The single LONG NIGHT** (V14 Ch3-Ch4, V14 Epilogue, the whole of V15). Miranda killed; coup crushed and purge; red sky; Velgrynd at the Isthmus camp; Gravity Collapse on 60,000; Tempest alarm after dinner; Rimuru's party to the Dream Fortress; Dwargon eastern front; dragon battle and Veldora dominated; Space-Time Connection; break-out; Magic Beast Division destroyed; flagship battles; Michael and Feldway withdraw | D+18 18:00 → D+19 ~02:30 | Miranda's errand and Yuuki's meeting both point to the same "tomorrow" (v14.txt:9906-9908, 10116). "A very long night began" (v14.txt:14542). V15 has no dawn or day-change marker | Night CANONICAL_RELATIVE; clock times RECONSTRUCTED (see AMB-018) |
| 23 | Return home and victory party | D+19 evening | v16.txt:512-533, 4872-4878 | CANONICAL_RELATIVE |
| 24 | Officers' day off; interviews (from the evening of D+20 to D+22) | D+20 .. D+22 | "All my officers took the next day off" (v16.txt:4880); "tomorrow" chain (v16.txt:6054-6067, 6866, 7155, 7510) | CANONICAL_RELATIVE |
| 25 | **V16 summit** "several days later": morning session, lunch-break restoration of Zamdo, afternoon session from 15:00 | D+23 | "I had our meeting with Masayuki the next day" (v16.txt:7510); last saw Velgrynd "several days ago" (v16.txt:7956); "three in the afternoon" (v16.txt:9232) | CANONICAL_RELATIVE |
| 26 | Gazel leaves "the next morning" | D+24 | v16.txt:9767 | CANONICAL_RELATIVE |
| 27 | Repatriation march under Caligulio | D+31 | "Preparations done within a week, the big departure soon after" (v16.txt:9773) | RECONSTRUCTED |

### Phase marks (`revision.json`)

| Frame | Phase | Stage |
|---|---|---|
| D-43 00:00 | STRATEGIC_PREPARATION | PRE_WAR_PREPARATION |
| D-40 00:00 | — | IMPERIAL_DECISION_AND_MOBILIZATION |
| D-32 00:00 | OPERATIONAL_APPROACH | APPROACH_MARCH |
| D-2 00:00 | DEPLOYMENT | HALT_AND_DEPLOYMENT |
| D+0 00:00 | — | FIRST_CONTACT_AND_SURFACE_BATTLE |
| D+0 11:10 | FIRST_CONTACT (the ultimatum is rejected) | — |
| D+0 11:30 | ACTIVE_COMBAT (first volley) | — |
| D+1 00:00 | LABYRINTH_CAMPAIGN | LABYRINTH_RAID |
| D+11 00:00 | JURA_ANNIHILATION | ANNIHILATION_OF_THE_OUTSIDE_CAMP |
| D+12 00:00 | OPERATIONAL_PAUSE | RESURRECTION_AND_CONSOLIDATION |
| D+18 00:00 | — | LONG_NIGHT |
| D+18 18:00 | LONG_NIGHT | — |
| D+19 03:00 | TERMINATION_AND_SETTLEMENT | — |
| D+20 / D+23 / D+25 | — | POST_WAR_INTERVAL / SUMMIT_AND_SETTLEMENT / REPATRIATION_PREPARATION |

The Empire's second offensive (Velgrynd, the Composite Division's sacrifice and the Magic Beast Division) is the LONG_NIGHT phase. It has no separate SECOND_OFFENSIVE phase because the novel runs the coup, the purge and the offensive as one continuous night.

### Campaign-level effects to set (`effects.campaign`)

The `initial` state now carries no strengths (all UNKNOWN). Set these values on the named events:

| Event | Field | Value |
|---|---|---|
| EVT-0022 | `tempestTotal` | 102000 (DERIVED: 52,000 + 50,000; the text says "more than 100,000") |
| EVT-0003 | `empireTotal` / `empireEffective` | 940000 / 940000 |
| EVT-0006 | `tempestEffective` | 15000 (at the gate) |
| EVT-0115 | `empireEffective` | 900000 |
| EVT-0119 | `empireEffective` | 700000 |
| EVT-0207 | `empireEffective` | 170000 |
| EVT-0219 | `empireEffective` | 0 |
| EVT-0323 | `empireTotal` / `empireEffective` | `"UNKNOWN"` (no canonical aggregate exists for the long night) |

Nothing may set `phase` or `stage` in `effects.campaign`; the phase marks own those.

## 2. File 01 — `01-preparation-and-approach.json` (D-43 .. D+0 morning)

Free ids: EVT-0022..0099.

### Existing events: placement and corrections

| Event | New day / time | Corrections |
|---|---|---|
| EVT-0004 | D-43 10:00 (RECONSTRUCTED) | Location: Rimuru's office (`jura-tempest-federation`). Strength 52,000 standing, not 150,000. Strategic result: a field force of >100,000 with a 150,000 Western reserve; Rimuru guesses the total is not under 200,000 (v12.txt:4623-4635). Order: before EVT-0001. Remove the "subordinates' gathering" anchor claim. Effects: F-TEM-000 strength `"UNKNOWN"` (not 150000); F-TEM-001 and F-TEM-003 at `jura-tempest-federation` (they reach the gate only via MOV-002/MOV-021); add F-TEM-020 52000; F-TEM-005 `"UNKNOWN"` (V12 guesses ≤1,000). |
| EVT-0002 | D-40 08:00 (SEQUENTIAL) | Bureau assessment: the West is under 1M, at most 400,000 mobilisable; the Empire has "more than one million" elite (lower bound, v12.txt:10200-10208). Narrated before the Marshal's decision. |
| EVT-0001 | D-40 09:00 (RECONSTRUCTED day) | Actor: the imperial council; the masked Marshal fixes the plan; the decree is issued in the Emperor's name while Rudra stays silent (v12.txt:10785-10796, 10978-10980). Effects: move the 2,000,000 from F-EMP-000 to F-EMP-040; F-EMP-001 = 1,000,000 (Armored Division ceiling); F-EMP-000 strength `"UNKNOWN"`. Sources: v12.txt:9861, 10785, 10978. |
| EVT-0024 *(new)* | D-34 09:00 | See the additions table. |
| EVT-0025 *(new)* | D-34 13:00 | See the additions table. |
| EVT-0009 | D-34 14:00 (same day as EVT-0025) | Gadora calls from Tempest (he reappeared in the labyrinth) to Yuuki. Opponent: Yuuki. Delete the "imperial minister / ministry source" results (mistranslation, v13.txt:96-99). Location `ramiris-labyrinth` (Gadora), with Yuuki remote. |
| EVT-0010 | D-34 14:30 | Same day and scene as EVT-0009 (v13.txt:104). Add: Yuuki judges sending the Composite Division against Dwargon unwise (v13.txt:186-189). |
| EVT-0011 | D-33 09:00 | Integrated HQ set up in the Control Room (v12.txt:12035). Source V12 Ch5, plus V13 Ch1 for the shift system. Attendance (Soei, Shion, Diablo, Geld) belongs to EVT-0012, not here. |
| EVT-0008 | D-33 10:00 (**reference R0**) | The V12 Ch5 war council, i.e. the "gathering". Argos shows 2,000 chariots and Raphael estimates "millions" (v12.txt:12108-12234). Location: Control Room. Empire strength: "millions" (estimate), not 940,000. Move from D-1. |
| EVT-0026, EVT-0027, EVT-0028 *(new)* | D-33 | See the additions table. |
| EVT-0003 | D-32 08:00 | Source: V12 **Epilogue** (v12.txt:13120), with the forecast at v13.txt:302-305. canonicalTime: "the next day the army left the Empire". Drop the "slower than forecast" text (that is EVT-0013). Strength 940,000 (now EXPLICIT, v13.txt:16208). Effects: F-EMP-010, F-EMP-011, F-EMP-012 and F-EMP-013 at `imperial-interior`. The current effects put F-EMP-011 in `ramiris-labyrinth` and F-EMP-010 at `jura-forest-edge`, which is wrong. |
| EVT-0015 | D-5 08:00 (RECONSTRUCTED) | The border is stated as already crossed at the month mark (v13.txt:313-317). Tempest could use the crossing as a pretext but opts for an open declaration (v13.txt:323-335). Strength: not stated here. |
| EVT-0012 | D-3 12:00 (CANONICAL_RELATIVE: R0 + a month) | "A month without an engagement", not "no imperial movement". Veldora and Ramiris go back to their institute out of boredom; there is no formal stand-down. Anchor = V12 Ch5 war council. Effect: F-EMP-010 `movement` should stay ADVANCE (the army was advancing), not STATIONARY. |
| EVT-0013 | D-3 12:10 | Retrospective at the month mark: slower than the ~29-day expectation, deliberately, to hold Tempest's eyes while the infantry assembled (v13.txt:302-305, 362-366). Actor: the Magitank Force. Strength: 200,000 (stated) / 940,000 (whole). |
| EVT-0014 | D-3 12:20 | A habitual observation summarised at the month mark. Opponent: none (wildlife). No figures. |
| EVT-0019 | D-2 08:00 (RECONSTRUCTED: "soon after") | Halt and deploy (v13.txt:341-346). Precedes the Gazel call. |
| EVT-0020 | D-2 09:00 | 700,000, "about 70% of all imperial strength" (v13.txt:347-349). Command: General Caligulio, **not** "Marshal". Effects: F-EMP-011 moves toward `imperial-infantry-camp` (MOV-020). |
| EVT-0029 *(new)* | D-1 18:00 | See the additions table. |
| EVT-0030 *(new)* | D+0 08:00 | See the additions table. |
| EVT-0016 | D+0 08:10 | Reported during the call, after the halt (v13.txt:697-703). Actor: the Imperial Army (Yuuki's legion suspected, INFERRED). Strength UNKNOWN at this point; 60,000 is first stated in V13 Ch3 (mark it back-projected). Effects: delete the F-EMP-030 effect (the whole 200,000-strong division is not at Isthmus); keep F-EMP-031 at 60,000 at `dwargon-eastern-metropolis`. |
| EVT-0006 | D+0 08:10 | Simultaneous with the call (v13.txt:944). About 15,000 on the plaza outside the gate (v13.txt:944-953). |
| EVT-0007 | D+0 08:10 | Actor: the Dwarven Knights (seven units), not Gazel (v13.txt:956-969). Move the F-DWA-001 effect here from EVT-0018. |
| EVT-0017 | D+0 08:20 | Same call: Argos imagery blurred by distance and a barrier (v13.txt:705-716). |
| EVT-0018 | D+0 08:30 | Same call: Dwargon defends only; Tempest negotiates and attacks (v13.txt:788-825, 890). |
| EVT-0031 *(new)* | D+0 08:50 | See the additions table. |
| EVT-0005 | D+0 09:00 | Testarossa sent as envoy to the invading Magitank Force, escorted by Gobta and Ranga (v13.txt:928, 1229, 1351, 1700-1712). Theatre TH-DWG (not TH-CAP). Move from D-24. |
| EVT-0021 | D+0 11:00 | This is Gaster's belief, not a fact: he thinks the demon lord's army is at the inn town (v13.txt:1723-1727). The real position is the gate plaza (EVT-0006). Gaster's camp ~30 km from Dwargon. No Tempest strength figure. |

### New events (file 01)

| Id | Day / time | Title | Source | Forces / casualties |
|---|---|---|---|---|
| EVT-0022 | D-43 11:00 | Order of battle reorganised into two wings under Benimaru; Volunteer Corps under Masayuki; Western Army kept in the West | v12.txt:4016-4024, 4348-4354, 4612-4636 | F-TEM-020, F-TEM-021, F-TEM-004, F-TEM-006, F-ALL-002 (place: `various-western-states`); campaign `tempestTotal` 102000 |
| EVT-0023 | D-40 09:10 | Council assigns the legions: Armored Division (Caligulio) to invade Jura; Composite Division (Yuuki) to press Dwargon and guard the capital; Magic Beast Division (Gradim) to strike the West by airship, with 300 of the 400 airships reserved | v12.txt:10785-10837, 10863-10871 | F-EMP-040, F-EMP-030, F-EMP-020, F-EMP-060; start of MOV-008 |
| EVT-0024 | D-34 09:00 | Argos shows a large imperial army massed at the border base: "no movement today either" | v12.txt:11827-11836 | F-EMP-010 at `imperial-interior` |
| EVT-0025 | D-34 13:00 | Gadora's audience: killed from behind in the Emperor's chambers, he revives through a resurrection bracelet in Tempest and reports the council | v12.txt:11179-11185, 11890-11935 | — |
| EVT-0026 | D-33 10:30 | War-council taskings: evacuate the inn town; First Corps to defend Dwargon; Gabil escorts the evacuees, then joins Gobta; Geld recalls the Second Corps; Moss watches the eastern forest; Testarossa, Ultima and Carrera attached to Gobta, Gabil and Geld | v12.txt:12309, 12421, 12481-12504, 12588 | F-TEM-001, F-TEM-002, F-TEM-003, F-DEM-001, F-DEM-002, F-DEM-003; start of MOV-002, MOV-021, MOV-023 |
| EVT-0027 | D-33 10:40 | Tempest forecast: enemy ~1,500 km away at ~80 km/day, arrival in about twenty days | v12.txt:12440-12449 | — (see CON-012) |
| EVT-0028 | D-33 22:00 | Rudra and Velgrynd resolve on conquest; the army is to leave "the next day" | v12.txt:13088-13120 | F-EMP-070 (`imperial-capital`) |
| EVT-0029 | D-1 18:00 | Imperial infantry camped ~30 km from capital Rimuru with command posts; Soei rates them ~B average with ~35,000 A-rank equivalents | v13.txt:383-389, 427-460 | F-EMP-011 at `imperial-infantry-camp`; end of MOV-020 |
| EVT-0030 | D+0 08:00 | 2,000 magitanks arrayed on a plain ~30 km from Dwargon's centre, muzzles toward the gate | v13.txt:511-515, 1644 | F-EMP-012 at `dwargon-gate-front`; end of MOV-001 |
| EVT-0031 | D+0 08:50 | Plans for the first strike: recall Ramiris and isolate the city into the labyrinth if war comes; Benimaru opens with only the ~100 wolf riders | v13.txt:1476, 1505-1510, 1564 | F-TEM-001A |

No deletions in file 01.

## 3. File 02 — `02-surface-battle.json` (D+0 11:00 .. 14:00)

Free ids: EVT-0121..0199. The battle starts with the first volley at 11:30 and ends at 13:20, which keeps it under two hours. In every event below that carries 12,000, the force in contact is **F-TEM-001A (~100 wolf riders)**. The 12,000 Green Numbers appear only in Hakuro's raid (EVT-0112). Gabil's air element is **~400** (100 Hiryuu, F-TEM-003B, plus 300 Blue Numbers riders, F-TEM-003C), not 3,000.

| Event | New day / time | Corrections |
|---|---|---|
| EVT-0100 | D+0 11:00 | Location `dwargon-gate-front` (Gaster's camp). Clock time unknown in the text; tents are being pitched. Remove "first-fire advantage": this is an envoy meeting. Strength 200,000 is the division total (derived). Effect: F-TEM-001A, not F-TEM-001. |
| EVT-0121 *(new)* | D+0 11:10 | Ultimatum: Testarossa burns a warning line; Gaster has a sniper fire a magic bullet, which she flicks away; she declares war; the left chariot group crosses her line (v13.txt:1848-1995). F-DEM-001, F-EMP-012. This is the FIRST_CONTACT frame. |
| EVT-0122 *(new)* | D+0 11:10 | Ramiris isolates the capital into the labyrinth (floor-101 equivalent behind Veldora) as the warning is ignored (v13.txt:2016-2064). TH-LAB, `ramiris-labyrinth`. |
| EVT-0101 | D+0 11:20 | The left column (≤500) lifts off toward the forest; 500 watch Gobta; 1,500 face Dwargon (v13.txt:1770, 2171, 2476). Empire strength 200,000, **not** 240,000 (the airships have not arrived yet). Tempest: ~100 riders. |
| EVT-0123 *(new)* | D+0 11:30 | First volley: 21 rounds, including the experimental shell, on the riders' hiding place; they escape by Shadow Motion without injury (v13.txt:2208-2278). F-EMP-012, F-TEM-001A. This is the ACTIVE_COMBAT frame. |
| EVT-0105 | D+0 11:40 (**before** EVT-0102 in the array) | Gabil's air attack hits the **Magitank Force** (opponent was wrongly the air corps). Tempest ~400 (F-TEM-003B and F-TEM-003C). Empire: the 200,000 Magitank Force. Move the F-EMP-013 effect to EVT-0106. |
| EVT-0102 | D+0 11:40 | Gobta attacks "a few minutes later", after Gabil (v13.txt:2440-2474). Tempest ~100. Delete "Empire never regains the initiative": Gaster regains composure and encircles (v13.txt:2762-2764). |
| EVT-0103 | D+0 11:40 | ~100 riders cover 100 m in under six seconds. |
| EVT-0104 | D+0 11:40 | Same moment as EVT-0103. ~100 riders. |
| EVT-0124 *(new)* | D+0 11:50 | Gobchi's Flaming Jade destroys a magitank from inside (3,000 jades issued, 10 each) (v13.txt:2508-2637). F-TEM-001A. |
| EVT-0107 | D+0 11:50 | Nearly 1,000 magitanks link into a fortress around ~100 riders (v13.txt:2703-2747). MOV-004. |
| EVT-0106 | D+0 12:00 (**after** EVT-0107) | Farraga's Flying Combat Corps arrives: **100 airships**. Its radiation and barrier block Shadow Motion (v13.txt:2766-2822, 2905-2911). F-EMP-013 ENGAGED here. |
| EVT-0109 | D+0 12:00 | Benimaru's standing "fight and lose" order explains the encirclement; it is concurrent framing. KIA `"UNKNOWN"` (not 0): wounds stated, deaths not (v13.txt:3143-3145, 3457-3500). MOV-005 (feint in place). |
| EVT-0108 | D+0 12:10 | Gaster's last special round sets the forest ablaze; all vehicles fire point-blank (v13.txt:2841-2900). Source Ch1 only. |
| EVT-0110 | D+0 12:10 | Gabil feigns too: Ultima leads the 300 Flying Dragons away while ~100 Hiryuu soak up fire and are badly wounded. KIA `"UNKNOWN"` (v13.txt:3745-3862). |
| EVT-0125 *(new)* | D+0 12:20 | Rimuru, seeing casualties, is restrained by Benimaru, then orders "no restraint, no mercy", ending the camouflage (v13.txt:3143, 3365-3397). |
| EVT-0111 | D+0 12:30 | Gobta fused with Ranga: Black Lightning on ~1,000 chariots, then Blizzard Wolf Dance; "a corner of the battlefield collapses" (not "battle decided") (v13.txt:3600-3735). Tempest strength UNKNOWN. |
| EVT-0112 | D+0 12:40 | Actor: **Hakuro** with the 12,000 Green Numbers after a 40+ km covert detour, against the Magitank supply unit (v13.txt:4078-4120). |
| EVT-0113 | D+0 12:40 | The fleet totals 100 airships; fewer than 10 downed and ~20 disrupted at Farraga's count (v13.txt:4049, 4559-4563). The air situation turns, but the fleet is largely intact. |
| EVT-0114 | D+0 12:50 | Ultima kills Farraga's staff and leaves the Abyss Core aboard (v13.txt:5078-5341). |
| EVT-0115 | D+0 13:00 | Actor: **Ultima** (Nuclear Flame / Flame of Destruction). Veldora was absent; Gabil was mistaken for him (v13.txt:4658-4715, 5298-5404). KIA 40,000 (corps total, CAS-002). Delete the F-DRG-001 effect. Add: Flying Dragon losses zero (v13.txt:5390-5392). |
| EVT-0116 | D+0 13:00 | Location `magitank-hq` (Gaster's main camp, far behind, v13.txt:5620). |
| EVT-0117 | D+0 13:10 | Retreat ordered twice: verbally, then through "The Player" (v13.txt:5744-5753, 6103-6108). MOV-006 (destination UNKNOWN). |
| EVT-0118 | D+0 13:10 | Testarossa appears at Gaster's HQ (`magitank-hq`). Opponent: Gaster and the HQ, not retreating remnants. F-DEM-001 location `magitank-hq`. |
| EVT-0126 *(new)* | D+0 13:20 | Tibbs, Balder and Gordon bind Testarossa with the Imperial Sealing Array; she breaks free, kills Gaster and the trio, and casts Death Blessing (500 m) (v13.txt:5934-6200, 6560-6585, 6664-6670). |
| EVT-0119 | D+0 13:20 | Completely over in under two hours (v13.txt:7475-7476). 200,000 + 40,000 killed, no prisoners, ~240,000 (CAS-001, CAS-002, CAS-003, CAS-008), **never revived** (v13.txt:18364-18395). Tempest strength UNKNOWN (15,000 is not stated in Ch2-3). Source Ch2 end + Ch3. |
| EVT-0120 | D+0 13:30 | Intermission "Melancholy" (between Ch2 and Ch3): Gazel watches a live broadcast; he says 240,000 lost and Rimuru will win (v13.txt:6694-6720, 7055-7058). 940,000 is now explicit (v13.txt:16208). |
| EVT-0127 *(new)* | D+0 14:00 | The Restructured Armor Corps advances on capital Rimuru, Caligulio still unaware of the defeat (v13.txt:6684-6691). F-EMP-011; start of MOV-025. |

No deletions in file 02.

## 4. File 03 — `03-labyrinth.json` (D+1 .. D+12)

Free ids: EVT-0210..0299.

| Event | New day / time | Corrections |
|---|---|---|
| EVT-0201 | D+1 08:00 (start RECONSTRUCTED) | Op begins; roped teams; **350,000 on day 1**, not 700,000 committed (v13.txt:9180-9195, 9324-9327, 9489-9490). Effects: F-EMP-011A (350,000, `ramiris-labyrinth`); F-EMP-011B at `imperial-siege-camp`; F-TEM-010. Remove the F-EMP-011 location (the corps splits). |
| EVT-0210 *(new)* | D+2 08:00 | Day 2: 150,000 more enter (v13.txt:9491). F-EMP-011A strength 500,000. |
| EVT-0203 | D+3 07:00 | Floor 70 gate: Adalmann's undead sally against >10,000; 10,000 fall in under an hour (CAS-005). Location: Floor 70, not "upper floors / rear". Source Ch3 (v13.txt:9907-10012). Effects: delete `strength 690000` (a COMPONENT row must not reduce the corps). |
| EVT-0211 *(new)* | D+3 08:00 | Day 3: 30,000 enter; 170,000 remain outside (v13.txt:9491-9493, 9520-9521). F-EMP-011A 530,000; F-EMP-011B 170,000. End of MOV-007. |
| EVT-0202 | D+3 21:00 | Slime floors 49-50; units cut off; not cleared until day 3 was nearly over (v13.txt:9619-9653). Source Ch3. DAY_LEVEL range D+1..D+3. |
| EVT-0204 | D+4 09:00 (CANONICAL_RELATIVE: day four) | Raiders from the upper floors join: 70,000 against Adalmann's under 40,000 (v13.txt:10042, 10059-10062). Source Ch3 + Ch4. F-TEM-010A. |
| EVT-0206 | D+4 12:00 | The three-hour revival mechanic; it applies throughout (v13.txt:9707-9711, 11599-11611). |
| EVT-0205 | D+8 09:00 (CANONICAL_RELATIVE: "seven days") | Contact with the troops inside lost; Caligulio fears for 530,000; seven days left before the deadline (v13.txt:10599-10606, 10662-10674). **Location `imperial-siege-camp`** (not the imperial capital). Add the canonicalTime "seven days after the Labyrinth Raider operation began". |
| EVT-0212 *(new)* | D+9 09:00 (CANONICAL_RELATIVE: "the next day") | Minitz's elite raid reaches floor 79; Minitz is killed with Krishna watching (v13.txt:10724-10726, 11914-11920, 16268-16272). F-EMP-011A. |
| EVT-0207 | D+10 18:00 | Labyrinth battle over: no Tempest losses; >530,000 of 700,000 defeated; **fewer than 200,000 remain outside, so the ground war goes on** (v13.txt:13700-13719). CAS-004, CAS-007. Effects: F-EMP-011A strength 0, kia 530000, DESTROYED; F-EMP-011 strength 170000. `empireEffective` 170000. |
| EVT-0209 | D+10 18:10 | >700,000 souls; seven can evolve, deferred (V14: twelve qualify, nine evolve, v14.txt:1294-1297). Location: Control Room. CAS-006 (interim). |
| EVT-0214 *(new, recommended)* | D+10 19:00 | Milim sends Albis's 20,000 straight into the labyrinth (v13.txt:14242-14250). F-ALL-003; MOV-037. |
| EVT-0208 | D+11 07:00 (CANONICAL_RELATIVE: after dawn; Krishna sent two days earlier) | Krishna returns through a genuine bracelet; Caligulio infers the imitations fail and believes the labyrinth troops are dead (v13.txt:16000-16010, 16262-16300). Source **Ch4** (V13 has no Ch5). Delete "no prospect of recovery": ~700,000 are resurrected on D+12. Location `imperial-siege-camp`. |
| EVT-0216 *(new)* | D+11 10:00 | Carrera's Gravity Collapse traps over 80% of the nearly 200,000 outside the labyrinth (v13.txt:16980-17132). F-DEM-003, F-EMP-011B; CAS-018. |
| EVT-0217 *(new)* | D+11 10:20 | Geld's 17,000 (Yellow + Orange) hold against more than 20,000 fleeing survivors; Benimaru's corps and Shion's Yomigaeri (10,000) are engaged (v13.txt:13955-13973, 16756, 17160-17170). F-TEM-002, F-TEM-002A, F-TEM-002B, F-TEM-004, F-TEM-005; end of MOV-024. |
| EVT-0218 *(new)* | D+11 11:00 | Diablo infiltrates the HQ: kills the staff, Krishna (End World) and Bonnie; spares Miranda; the souls of the camp are taken (v13.txt:17620-17815). F-DEM-004, F-EMP-015; CAS-019. |
| EVT-0219 *(new)* | D+11 11:30 | Diablo defeats Caligulio and takes his soul; the Jura army is annihilated except Miranda, Michel and Raymond (v13.txt:18008-18015, 18344-18349). CAS-017, CAS-020; LOC-015. Effects: F-EMP-011B 0 / kia 170000; F-EMP-011 0 / kia 700000; F-EMP-010 0 / kia 940000; `empireEffective` 0. |
| EVT-0220 *(new)* | D+12 10:00 (RECONSTRUCTED) | Rimuru resurrects ~700,000 on floor 70, Caligulio first as a test; ~240,000 surface dead cannot be revived (v13.txt:18328-18395, 18484-18492). CAS-021 (RESTORATION), CAS-014 (pow 700,000), CAS-022. Effects: F-EMP-010 pow 700000, status "RESURRECTED - PRISONERS", location `ramiris-labyrinth`. |

No deletions in file 03.

## 5. File 04 — `04-long-night.json` (D+13 .. D+19 ~02:30)

Free ids: 0322..0329, 0336..0339, 0352..0359, 0364..0369, 0374..0379, 0386..0389 and 0400..0449.

V14 Ch1 and Ch2, the consolidation days, also live in this file. Every V15 event belongs to the one night. EVT-0370..0373 are V15 **Ch1**, not Ch3. EVT-0382, EVT-0383 and EVT-0385 are V15 **Ch5**, not the Epilogue. EVT-0360 is V14 **Ch4**.

### Consolidation (D+13 .. D+18 day)

| Event | New day / time | Corrections |
|---|---|---|
| EVT-0400 *(new)* | D+13 10:00 | V14 Ch1, "the day after the resurrection of nearly 700,000": rewards ceremony and harvest festival; twelve qualify, nine evolve; Testarossa's group stays on guard (v14.txt:873-881, 1109-1116, 1292-1297). TH-LAB. |
| EVT-0401 *(new)* | D+13 14:00 | Caligulio's investigation: the Armored Division can no longer fight; 940,000 killed (v14.txt:1120-1126). F-EMP-040. |
| EVT-0310 | D+13 15:00 (RECONSTRUCTED) | Clowns' conference in the quarters of a **Composite Division fortress** (location not stated: use `position-unknown` with locationText). Damrada attends; Vega is away; Miranda proposes dropping the coup; Yuuki proceeds (v14.txt:71-80, 636-664, 840-861). Delete the "several days after" canonicalTime. Effects: F-EMP-050 location `position-unknown`. |
| EVT-0405 *(new, optional)* | D+13 16:00 | Kagali's orders; within days ~30 sworn subordinates gather at Yuuki's mansion (v14.txt:10080-10090). F-EMP-050. |
| EVT-0402 *(new)* | D+14 19:00 | Banquet: Federation casualties zero; 940,000 imperial soldiers killed (v14.txt:4644-4651). CAS-009, CAS-020. |
| EVT-0403 *(new)* | D+15 10:00 | Three days after the revival the prisoners calm; military conference; Rimuru addresses the officers; rations for 700,000 (v14.txt:5010-5016, 5208, 5662, 5757-5795). F-EMP-010. |
| EVT-0404 *(new)* | D+18 12:00 | The day after drinking with Elmesia: the Yuuki meeting is set for noon tomorrow; Rimuru picks Benimaru, Shion, Soei and Diablo; the meeting ends at dusk (v14.txt:12725-12920, 13636-13645, 14514-14517). F-TEM-030. |

### The long night (D+18 18:00 → D+19 02:30)

| Event | Time | Corrections |
|---|---|---|
| EVT-0311 | D+18 18:00 | Miranda in hiding "several days after Yuuki's report" (v14.txt:9811-9822). Not the same day as EVT-0310. |
| EVT-0317 | D+18 18:30 | ~30 leaders at Yuuki's mansion; "only a few will come tomorrow". Actor faction: Gadora (Tempest) relays the encrypted call (v14.txt:10083-10117, 10274-10281). |
| EVT-0318 | D+18 18:40 | Tolneod: Rimuru will bring ≤10 elite (v14.txt:10283-10304). |
| EVT-0312 | D+18 19:00 | "Middle of the night" in Tidu (local wording, AMB-018). Purpose: Damrada's rendezvous about tomorrow's talks (v14.txt:9900-9908). |
| EVT-0313 | D+18 19:10 | Kondo intercepts Miranda (v14.txt:9844-9857). |
| EVT-0314 | D+18 19:20 | Charm attempt (v14.txt:9946-9993). |
| EVT-0315 | D+18 19:30 | Kondo shoots Miranda (CAS-011). Effects: **F-EMP-051** kia 1, not F-EMP-050 (delete the F-EMP-050 "DESTROYED"). |
| EVT-0316 | D+18 19:30 | Reader, in under a second. Opponent: Miranda. |
| EVT-0322 *(new)* | D+18 19:40 | Damrada, who set the rendezvous, appears; he is loyal to Rudra; the Bureau disposes of the body (v14.txt:10023-10077). F-EMP-051, F-EMP-014. |
| EVT-0323 *(new)* | D+18 20:00 | Coup crushed in Tidu: Kondo strikes Yuuki's leadership; Damrada fights Yuuki; Rudra and Velgrynd appear; Rudra dominates Yuuki; the purge begins (v14.txt:10973-11555, 11930-12342). F-EMP-014, F-EMP-050, F-EMP-032, F-EMP-070. Campaign `empireTotal` / `empireEffective` → `"UNKNOWN"`. Start of MOV-009. |
| EVT-0319 | D+18 20:30 | Blockade camp at **night**: 60,000 (60% of the division); a camouflage alliance; final conference (v14.txt:640-641, 12352-12366). |
| EVT-0320 | D+18 20:30 | Red sky and rain over Tidu, caused by the purge (v14.txt:12336-12342, 12370-12376). |
| EVT-0321 | D+18 20:40 | **Inverted.** Zero, the deputy army commander, quells the dispute and orders the legion to hold for Yuuki; it is uneasy but not leaderless (v14.txt:12380-12411). Type COMMAND. Campaign activeCommanders: blockade under Zero. |
| EVT-0324 *(new)* | D+18 20:50 | Velgrynd walks into the camp and confronts Zero (v14.txt:12415-12480). F-EMP-070; end of MOV-026. |
| EVT-0325 *(new)* | D+18 21:00 | Velgrynd's Gravity Collapse hurls the 60,000 into the sky (v14.txt:13851-13884). **CAS-012**. Effects: F-EMP-031 0 / kia 60000 / DESTROYED (move here from EVT-0343). |
| EVT-0341 | D+18 21:00 | Dwargon's commander had already witnessed the end, waiting for Gazel (v15.txt:587-593). Destroyer: Velgrynd. It is the observation of EVT-0325, not a second destruction. |
| EVT-0326 *(new)* | D+18 21:00 | Gazel gets the report and decides to fight in person (v14.txt:12531-12559, 12720-12722). F-DWA-000. |
| EVT-0343 | D+18 21:10 | Kagali (controlled through Kondo) uses the corpses for the forbidden undead ritual; ~60,000 (v14.txt:13914-13931, 14152-14156, 14212). Actor: Kagali. Source V14 Ch4 + V15 Ch1. Delete the F-EMP-031 effect here. |
| EVT-0327 *(new)* | D+18 21:10 | After dinner Laplace and Vesta raise the alarm; Argos shows the Gravity Collapse and the ritual (v14.txt:13778-13789, 13847-13884). |
| EVT-0328 *(new)* | D+18 21:30 | Rimuru sends Gabil (100 Hiryuu), Gobwa (300 Kurenai), Hakuro, Testarossa, Ultima, Carrera and the Colossus to Gazel; the ritual began less than an hour earlier (v14.txt:14386-14540, 14407-14412). Start of MOV-010, MOV-011, MOV-029, MOV-033..035. |
| EVT-0340 | D+18 21:30 | Gazel on a hopeless field "as Rimuru was preparing to infiltrate" (v15.txt:577; v14.txt:12720). |
| EVT-0360 | D+18 21:40 | Rimuru, Benimaru, Shion, Soei and Diablo are teleported by Laplace toward the capital and land in a distorted-space hall (v14.txt:14541-14559). Source V14 Ch4. Effects: F-TEM-030 → `dream-fortress`. **Move** the F-TEM-012 and F-ALL-001 effects out of this event (to EVT-0336 / EVT-0350). |
| EVT-0361 | D+18 21:40 | The Dream Fortress (another dimension), `dream-fortress`; Rimuru watches the dragon battle from inside (v14.txt:15754-15770; v15.txt:4687-4693, 4747-4750). |
| EVT-0342 | D+18 21:40 | Anrietta reports the ritual (v15.txt:645-650). |
| EVT-0344 | D+18 21:40 | Gazel will not move the heavy force (v15.txt:663-670). |
| EVT-0345 | D+18 21:50 | Decision for the Pegasus Knights' special attack. The sortie comes after the reinforcement and council; the aim is to stall so Gazel can duel Kondo (v15.txt:672-689, 1425-1458). F-DWA-002 (Dorf). |
| EVT-0336 *(new)* | D+18 21:50 | Spatial transfer: 100 Hiryuu, 300 Kurenai, the Colossus, the three Primordials and Hakuro arrive at Gazel's command post; joint council: the trio to Velgrynd, the rest to the ritual (v15.txt:759-882). F-TEM-003B, F-TEM-012, F-TEM-011, F-DEM-001..003, F-ALL-001; end of MOV-010, MOV-011, MOV-029, MOV-033..035. |
| EVT-0330 | D+18 22:00 | Velgrynd engages Veldora; Rimuru authorises full power (v14.txt:15020-15053). |
| EVT-0337 *(new)* | D+18 22:00 | Testarossa, Ultima and Carrera fight Velgrynd's other body until she withdraws it to focus on Veldora (v15.txt:899-1307, 3758-3923). F-DEM-001..003, F-EMP-070. |
| EVT-0331 | D+18 22:10 | The forest burns; the battle, not Velgrynd alone, is to blame (v14.txt:15480-15482). |
| EVT-0338 *(new)* | D+18 22:10 | The strike force reaches Kagali's ritual ground: ~100 defenders, including Kondo, Footman, Tear, 30+ of Yuuki's comrades and ~50 Guardian knights (v15.txt:1352-1377). F-EMP-014, F-EMP-015, F-EMP-050, F-DWA-002; end of MOV-013. |
| EVT-0332 | D+18 22:20 | Labyrinth gate destroyed; upper floors *possibly* destroyed (Rimuru's guess). |
| EVT-0333 | D+18 22:20 | Capital unharmed inside the labyrinth. Type OUTCOME (not EVACUATION). |
| EVT-0346 | D+18 22:30 | Only the second arrival: Gabil "a little late" at the ritual ground with the Colossus under 100 Hiryuu (v15.txt:1463-1476). Strength 100 (not 3,000). Effects: F-TEM-003B (not F-TEM-003), F-TEM-011 → `ritual-caster-position`; end of MOV-027/028. |
| EVT-0334 | D+18 22:30 | Parallel Existence: Velgrynd is only partly committed. |
| EVT-0347 | D+18 22:40 | Gadora launches the Colossus, then **stalls Velgrynd by talk**; she leaves on her own (v15.txt:1489-1511, 3155-3175, 3350-3407). |
| EVT-0335 | D+18 22:40 | The dragons compared (v14.txt:15497-15517). |
| EVT-0348 | D+18 22:50 | Gabil-Dorf scheme; the Hiryuu are the main body. Strength 100. |
| EVT-0349 | D+18 22:50 | Gabil attacks **Malcolm** (single-digit No. 8) alone and is defeated (v15.txt:2272-2343, 2496-2526). The "rear turned" line belongs to Gobwa's unit. Strength 1. |
| EVT-0350 | D+18 23:00 | Gobwa's 300 Kurenai arrive last on foot; Phobio and Hakuro are with them (v15.txt:1550-1572). Effects: F-TEM-012 (300), F-ALL-001 → `ritual-caster-position`; end of MOV-012. |
| EVT-0352 *(new)* | D+18 23:00 | Gazel duels Kondo; Hakuro intervenes and is crippled; Gazel is shot down by a spell-breaking bullet (v15.txt:1393-1410, 1669-2104, 2183-2260). |
| EVT-0353 *(new)* | D+18 23:10 | Gabil falls to Malcolm; Souka and his men hold Malcolm, several fall and none die; Malcolm is recalled (v15.txt:2496-2649, 2768-2777). |
| EVT-0354 *(new)* | D+18 23:10 | Vaughn and Phobio hold the berserk Footman; Anrietta and Gobwa go after Tear (v15.txt:2779-2984). |
| EVT-0351 | D+18 23:20 | Veyron and Zonda, at an "unknown time", save Gabil from Malcolm (v15.txt:2648-2665). It follows EVT-0353. |
| EVT-0355 *(new)* | D+18 23:30 | Agera faces Kondo; Esprit treats Gazel and Hakuro; Kondo leaves when Velgrynd moves (v15.txt:2986-3150). |
| EVT-0370 | D+18 23:30 | V15 **Ch1** (concurrent flashback): Samuel's 300 airships with 30,000 of the Magic Beast Division bound for the central continent, then "more than a few days" away (v15.txt:3452-3463). Theatre: en route, not TH-CAP. Effects: add F-EMP-061. |
| EVT-0371 | D+18 23:30 | Velgrynd revealed aboard as the Marshal; **Rudra on the same ship** (v15.txt:3469-3570). |
| EVT-0372 | D+18 23:40 | New mission: suppress Dwargon and take strong enemies alive (v15.txt:3586-3691). |
| EVT-0373 | D+18 23:40 | Space-Time Connection: the fleet emerges **at the Dwargon eastern front** before Gadora (v15.txt:3404-3435, 3696-3757). Theatre TH-DWE. Effects: F-EMP-020 and F-EMP-060 → `dwargon-eastern-front` (not `position-unknown`); F-EMP-061 → `imperial-flagship-jura`. MOV-015/030/031. |
| EVT-0339 *(new)* | D+18 23:50 | Veldora's Harvest Storm; Kondo shoots Veldora from the flagship; Rudra dominates Veldora; Veldora cuts the soul corridor (v14.txt:15630-15734; v15.txt:4561-4667). F-DRG-001, F-EMP-061, F-EMP-014; end of MOV-031. |
| EVT-0363 | D+18 23:50 | Rimuru realises the aim was Veldora's capture, which happens **after** the domination (v15.txt:4691-4693). |
| EVT-0364 *(new)* | D+19 00:00 | Rimuru breaks out by Space Shift and summons the Black Numbers; the three Primordials become true demon lords; ~600 demons evolve (v15.txt:4715-4762, 4866-4885, 5207-5249). F-TEM-030, F-DEM-005; MOV-032. |
| EVT-0365 *(new)* | D+19 00:10 | Benimaru's tasking: Testarossa to clear the flagship; strike team Benimaru, Shion, Soei, Ultima, Carrera and four demon nobles; 100 demons blockade the flagship; Cien takes ~500 to Gabil against 30,000+ (v15.txt:5126-5141, 5305-5380). |
| EVT-0374 *(new)* | D+19 00:20 | Magic Beast Division at the Dwargon front: Gradim targets the downed Gazel and the awakened Gabil intercepts; the fusion drug kills 10,000 (5,500 fully transformed, ~5,000 berserk) (v15.txt:8215-8237, 9276-9311). F-EMP-020, F-TEM-003B, F-DEM-005; **CAS-024**. |
| EVT-0366 *(new)* | D+19 00:30 | Rimuru fights Velgrynd and the dominated Veldora, and recovers Veldora by taking him in (v15.txt:6804-6868, 7253, 7345). F-DRG-001, F-TEM-030, F-EMP-070. |
| EVT-0375 *(new)* | D+19 01:00 | Carillon kills Gradim in his awakening sleep; Vega devours the remains; the division is destroyed with the Black Numbers' help (v15.txt:9404-9502, 10250-10256, 10509-10526). **CAS-025**. F-EMP-020 → 0, DESTROYED. |
| EVT-0380 | D+19 01:10 | Diablo stays by Rimuru to let the others grow; Rimuru's "no one may die" order stands (v15.txt:10936-11007). Location: above the Jura forest (`jura-airspace`), not the imperial capital. |
| EVT-0376 *(new)* | D+19 01:10 | Benimaru demands Rudra halt and surrender unconditionally; refused (v15.txt:11173-11198). |
| EVT-0377 *(new)* | D+19 01:20 | Testarossa's Death Streak over the flagship kills nearly everyone aboard, including Guardian knights; Zamdo's group's souls are kept (v15.txt:11073-11165; v16.txt:9187-9191). **CAS-023**. F-EMP-061, F-EMP-015. |
| EVT-0378 *(new)* | D+19 01:40 | Benimaru defeats Graneet; Carrera kills Kondo (v15.txt:15015-15054, 16022-16074; v16.txt:7364-7376, 7984-7988). **CAS-027**. |
| EVT-0382 | D+19 01:50 | V15 **Ch5**: Testarossa faces a Velgrynd body aboard the flagship and only has to buy time: a **delaying** tactical victory (v15.txt:16590-16781). Location `imperial-flagship-jura`. |
| EVT-0383 | D+19 02:00 | V15 **Ch5**: Actor **Kagali**, not Adalmann. The taboo spell seems long over: she lost control without Velgrynd's help (v15.txt:16787-16797). Theatre TH-DWE, `ritual-caster-position`. Delete the labyrinth wording. |
| EVT-0385 | D+19 02:10 | V15 **Ch5**: Feldway withdraws Kagali, Yuuki, Vega, Footman, Tear and the undead elves; care for the wounded after confirming that all subordinates live (v15.txt:17080-17104). Theatre TH-DWE. **CAS-026** (Tempest kia 0). |
| EVT-0381 | D+19 02:20 | Epilogue: Rudra's soul is gone; Michael in his body stabs Velgrynd and is named by Feldway (v15.txt:17482-17675). Location `imperial-flagship-jura`. |
| EVT-0386 *(new)* | D+19 02:30 | Rimuru takes in Velgrynd; Michael and Feldway withdraw; Benimaru: "we are all safe"; combat over (v15.txt:17114, 18045-18092; v16.txt:516-533). Final force statuses (moved from the deleted EVT-0384) go here. |

### Deletions in file 04

- **EVT-0362 "Shion and others are killed"**: DELETE. It is a misread flashback (v15.txt:4672-4679); Shion fights right after (v15.txt:4988, 5030-5034). See CON-003. CAS-013 is already deleted and ACT-011 corrected.
- **EVT-0384 "The Empire proposes an armistice"**: DELETE. No such proposal exists: Benimaru demanded surrender (EVT-0376), combat ends with the withdrawal (EVT-0386), and the surrender comes at the summit (EVT-0392). Move its 13 "DEPLOYED" force statuses to EVT-0386, dropping F-DRG-001 (dominated, then recovered) and F-EMP-014 (Kondo dead).

## 6. File 05 — `05-settlement.json` (D+19 evening .. D+31)

Free ids: EVT-0450..0499.

| Event | New day / time | Corrections |
|---|---|---|
| EVT-0450 *(new)* | D+19 18:00 | Home and a victory party; Carillon, Frey and others left with Testarossa in evolution sleep; the officers take the next day off (v16.txt:512-533, 4872-4880). |
| EVT-0451 *(new, optional)* | D+20 09:00 | Day off; the capital is back on the surface; infrastructure checks before evacuees return (v16.txt:4880-4890). |
| EVT-0390 | D+23 09:00 (morning session) | Summit "the next day" after the interviews (v16.txt:7510, 7956-7974). Add **Dwargon** (Gazel, Jaine) as the third party (v16.txt:8465, 9236-9243). |
| EVT-0391 | D+23 09:20 | Agreement to end the war and a new pact (v16.txt:8424-8430). |
| EVT-0393 | D+23 09:40 | No war-crimes pursuit of leaders who were under Michael (v16.txt:8721-8723, 9012-9015). |
| EVT-0392 | D+23 10:00 | Minitz: over two-thirds of war power lost; ready for an unconditional-surrender treaty (v16.txt:8752-8759). CAS-016 (qualitative). Remove the 770,000 + 60,000 cross-check. |
| EVT-0394 | D+23 10:30 | Velgrynd will name Masayuki as Emperor (Ludora) under court law; **coronation pending** (v16.txt:8884-9016). |
| EVT-0395 | D+23 11:00 | Retitle: "Early release of the prisoners promised" (v16.txt:9012-9014). The march itself is EVT-0455. POW count ≈700,000 (v16.txt:7992). Do not move CAS-014 here. |
| EVT-0399 | D+23 12:30 (lunch break) | Zamdo's group (several dozen), killed by the Death Streak, is restored in homunculi (v16.txt:9176-9199). CAS-015 (RESTORATION). Delete the "does not offset 770,000" note. |
| EVT-0453 *(new)* | D+23 15:00 | Afternoon session at three: Tempest and Dwargon co-sign recognition of the new emperor; under Masayuki all three declare the war over and form an alliance apart from the Council of the West (v16.txt:9232-9245). |
| EVT-0398 | D+23 15:20 | Reconstruction plan agreed, not executed: Dwargon leads (highways, border zone, a rail line along the Magitank route through the Canaat Mountains) with Tempest foremen (v16.txt:9241-9259). Actor: Dwargon. |
| EVT-0396 | D+23 15:40 | Testarossa **designated** to set up an embassy (with Moss); Venom guards Masayuki (v16.txt:9262-9296). Location `jura-tempest-federation` (the decision); the posting is MOV-017. Delete the F-DEM-001 `embassy` location effect. |
| EVT-0397 | D+23 15:50 | **Replace**: there is no memory alteration. Rimuru judges that imperial citizens, who have never lost a war, may resist Masayuki's anti-war line (v16.txt:9267-9276). Actor: none (Rimuru's assessment). Remove Veldora. |
| EVT-0454 *(new, optional)* | D+24 08:00 | Gazel's party leaves (v16.txt:9767). |
| EVT-0455 *(new)* | D+31 08:00 (RECONSTRUCTED) | Caligulio marches the prisoners home; some wished to stay; Adalmann's troops build the roads (v16.txt:9767-9773). F-EMP-010; MOV-036. |

No deletions in file 05.

## 7. References waiting on new events

Each row below points at an existing event for now and carries a `TODO(phase editor NN)` note. Retarget it once the event exists, then run `npx tsx scripts/compile-data.ts`.

| Record | Field | Now | Target |
|---|---|---|---|
| MOV-001 | endEvent | EVT-0101 | EVT-0030 |
| MOV-002, MOV-021, MOV-023 | startEvent | EVT-0008 | EVT-0026 |
| MOV-008 | startEvent | EVT-0001 | EVT-0023 |
| MOV-020 | endEvent | EVT-0020 | EVT-0029 |
| MOV-025 | startEvent | EVT-0119 | EVT-0127 |
| MOV-007 | endEvent | EVT-0202 | EVT-0211 |
| MOV-024 | endEvent | EVT-0208 | EVT-0217 |
| MOV-037 | start/end | EVT-0207 | EVT-0214 |
| MOV-009 | startEvent | EVT-0321 | EVT-0323 |
| MOV-026 | endEvent | EVT-0341 | EVT-0324 |
| MOV-010, MOV-011, MOV-029, MOV-033, MOV-034, MOV-035 | start / end | EVT-0335 / EVT-0346 | EVT-0328 / EVT-0336 |
| MOV-012, MOV-027, MOV-028 | startEvent | EVT-0345 | EVT-0336 |
| MOV-013 | endEvent | EVT-0345 | EVT-0338 |
| MOV-015, MOV-030 | endEvent | EVT-0373 | EVT-0374 (only if the emergence is split from the casting) |
| MOV-031 | endEvent | EVT-0381 | EVT-0339 |
| MOV-032 | start / end | EVT-0363 / EVT-0380 | EVT-0364 / EVT-0364 |
| MOV-036 | start / end | EVT-0395 | EVT-0455 |
| CAS-017 | eventId | EVT-0208 | EVT-0219 |
| CAS-018 | eventId | EVT-0208 | EVT-0216 |
| CAS-019 | eventId | EVT-0208 | EVT-0218 |
| CAS-020, CAS-009 | eventId | EVT-0209 | EVT-0402 |
| CAS-021, CAS-014, CAS-022 | eventId | EVT-0209 | EVT-0220 |
| CAS-012 | eventId | EVT-0341 | EVT-0325 |
| CAS-024 | eventId | EVT-0373 | EVT-0374 |
| CAS-025 | eventId | EVT-0373 | EVT-0375 |
| CAS-023 | eventId | EVT-0380 | EVT-0377 |
| CAS-027 | eventId | EVT-0382 | EVT-0378 |
| CMD-004 (Geld) | endEvent | EVT-0208 | EVT-0217 |
| CMD-005 (Gabil), CMD-035 (Gradim), ACT-004, ACT-035, ACT-043 | end / last | EVT-0373 | EVT-0375 |
| CMD-011 (Carrera), CMD-037 (Kondo), ACT-016, ACT-036 | end / last | EVT-0382 | EVT-0378 |
| CMD-041 (Zero), ACT-042 | end / last | EVT-0321 | EVT-0324 |
| ACT-010 (Diablo) | firstEvent | EVT-0012 | keep, or EVT-0218 for first combat |
| ACT-005 (Veldora) | lastEvent | EVT-0335 | EVT-0366 |
| LOC-015 | changeEventId | EVT-0208 | EVT-0219 |

### Stage anchors to add once the events exist

`stages.json` anchors only on events that exist now. After the additions, append:

- S01: EVT-0022.
- S02: EVT-0023, EVT-0025, EVT-0026.
- S03: EVT-0028.
- S04: EVT-0029.
- S05: EVT-0030, EVT-0121, EVT-0122, EVT-0123, EVT-0126.
- S06: EVT-0210, EVT-0211, EVT-0212.
- S07: EVT-0216, EVT-0217, EVT-0218, EVT-0219.
- S08: EVT-0220, EVT-0400, EVT-0402, EVT-0403.
- S09: EVT-0323, EVT-0325, EVT-0328, EVT-0336, EVT-0339, EVT-0364, EVT-0374, EVT-0375, EVT-0377, EVT-0386.
- S10: EVT-0450.
- S11: EVT-0453.
- S12: EVT-0455.

Then remove EVT-0362 and EVT-0384 from any list that names them. Neither is used as an anchor now.

## 8. Summary of removed and changed rows in the non-event files

- **Casualties.**
  - Removed: CAS-013 (misread flashback; CON-003).
  - Re-scoped: CAS-006 (interim aggregate), CAS-008 (restatement), CAS-009 (Tempest zero, campaign total), CAS-014 (pow ≈700,000 at the resurrection), CAS-015 (RESTORATION).
  - Added: CAS-017..CAS-027.
- **Forces.** None removed. F-EMP-000 is now the whole Imperial Army, with size UNKNOWN; the 2,000,000 / 1,000,000 figures now sit on the Armored Division (F-EMP-040 / F-EMP-001). F-TEM-000 is now the whole Federation, with size UNKNOWN; the 150,000 is the Western Army (F-ALL-002). Warcraft (Magic Beast) and Hybrid (Composite) are separate legions under F-EMP-000.
- **Movements.** None removed. MOV-001 no longer duplicates MOV-018/019; MOV-021 is re-expressed as the Third Corps' move to the gate.
- **Commanders.** CMD-041 is now Zero; the blockade command did not collapse.
