# Territorial reconstruction (R6)

The novels never draw a line of control. They say where armies are, how big they are, what they do, and what happens to them. Everything on the held-ground layer is therefore **RECONSTRUCTED** from those facts by `scripts/compile-front.ts`, using the rules in `docs/TERRITORIAL-ANIMATION.md`. This page lists what the reconstruction produces and why each change is there.

## The ground that changes hands

Compiled from the R6 dataset (`public/data/front.json`, 22 transitions). Times are simulation placements on the 10-minute grid.

| Id | Kind | Gainer | When | Cells | Territory | Anchoring event | Why the text supports it |
|---|---|---|---|---|---|---|---|
| EP-001 | Advance | Empire | D−5 07:30 → 18:30 | 472 | Jura | EVT-0456 advance squads already in the eastern forest | Scouts and the chariot screen are in the forest before the main body (v12) |
| EP-002…007 | Advance | Empire | D−5 17:30 → D−3 07:00 | 383 | Jura | EVT-0015 the border crossing | The army crosses into Jura and spreads along the forest roads |
| EP-008…010 | Advance | Empire | D−3 06:30 → D−2 08:30 | 308 | Jura | EVT-0456 / EVT-0014 | The columns push on; forest beasts flee ahead of them (v13) |
| EP-011…013 | Advance | Empire | D−2 12:00 → D−1 17:00 | 427 | Jura | EVT-0020 up to 700,000 infantry enter the forest | The largest single advance of the war |
| EP-014 | Advance | Empire | D+0 08:00 → 09:30 | 228 | Dwargon | EVT-0007 the Dwarven Knights fortify the gate | The Magitank Force reaches the Dwargon front; ground in front of the gate is taken |
| EP-015 | Collapse | Allies | D+0 13:00 → 13:20 | 26 | Jura | EVT-0118 Testarossa at Gaster's HQ | The magitank group is destroyed; the ground it took has nothing left to hold it |
| EP-016 | Advance | Empire | D+1 07:30 → 08:20 | 106 | Jura | EVT-0127 the restructured Armor Corps advances | The remaining armour pushes towards the capital |
| EP-017 | Collapse | Allies | D+10 09:30 → 12:10 | 1,773 | Jura | EVT-0214 / the final battle | The camp is annihilated; the whole imperial pocket in Jura collapses from the rim inward |
| EP-018 | Recapture | Allies | D+10 09:30 → 10:00 | 17 | Jura | EVT-0214 | Allied units retake the ground they stand on |
| EP-019 | Collapse | Allies | D+15 20:30 → 21:50 | 228 | Dwargon | EVT-0321 the Legion ordered to hold | Imperial ground in front of the gate, left without its army after the magitank defeat, returns |
| EP-020 | Advance | Empire | D+15 21:00 → D+16 00:30 | 82 | Dwargon | EVT-0343 Kagali's ritual | The ritual ground and the Legion's landing ground are taken during the long night |
| EP-021 | Collapse | Allies | D+16 01:00 → 01:40 | 59 | Dwargon | EVT-0462 the Black Numbers drop | The Legion is broken; its ground collapses |
| EP-022 | Settlement | Allies | D+16 02:00 → 02:20 | 23 | Dwargon | EVT-0385 Feldway withdraws the survivors | The field is cleared; what is left returns to Dwargon |

## Where the map holds still on purpose

- **Before D−5.** The imperial council (D−40), the march to the border base (D−39 → D−34) and the waiting days happen inside the Empire's own territory. Nothing changes hands.
- **D+2 → D+9.** The labyrinth fighting is underground, and the field armies are camped. The text gives no ground taken or lost, so the front stays where D+1 left it.
- **D+11 → D+15.** Revival, ceremonies and the prisoners' conference. There are no armies in the field.
- **After D+16.** Victory, the summit and the repatriation are political, not territorial. Borders never moved in this war (see `docs/CARTOGRAPHY.md`).

The second front of the long night (EVT-0464…0469: the Mystic raid on the labyrinth) is fought inside the labyrinth and the capital, so it adds no territory.

## What the layer does *not* claim

- That any national border changed. Political territory never changes hands in this arc.
- That the exact outline of any held area is known. Shapes come from influence radii around recorded positions.
- That ground was "held" in an administrative sense. The layer shows where an army's presence dominates, nothing more.

## How to check it

`npm run qa:front` captures every major transition at 0, 25, 50, 75 and 100 %. `scripts/test-runtime.ts` asserts the half-way states, the retreat at D+0, the D+10 collapse and the recapture.
