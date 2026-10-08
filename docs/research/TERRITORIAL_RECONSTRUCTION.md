# Territorial reconstruction (R6)

The novels never draw a line of control. They say where armies are, how big they are, what they do, and what happens to them. Everything on the held-ground layer is therefore **RECONSTRUCTED** from those facts by `scripts/compile-front.ts`, using the rules in `docs/TERRITORIAL-ANIMATION.md`. This page lists what the reconstruction produces and why each change is there.

## The ground that changes hands

Compiled from the R6 dataset (`public/data/front.json`): 48 transitions, 3,953 cell changes, grouped by phase. Times are simulation placements on the 10-minute grid. The rules behind them:
- **Battle gate:** losses wait for the battle to end.
- **Retreat:** lost ground falls back toward the loser's home.
- **Lost ground stays lost:** a side never retakes ground it was driven from.
- **Cities hold:** no settlement falls.
- **Anchored Dwargon front:** the Empire's ground in Dwargon is a band from its own border.
- **Ragged lines:** fronts follow a fixed, warped noise (see `docs/TERRITORIAL-ANIMATION.md` 6a–6d).

| When | Phase | Transitions | Cells | Span | Why the text supports it |
|---|---|---|---|---|---|
| D−5 → D+0 | Empire advance into Jura | 41 | 1,262 | D-5 07:30 → D+0 07:30 | The border crossing (EVT-0015) opens the front. The columns spread along the forest roads and up to 700,000 infantry enter the forest (EVT-0020) |
| D+0 | Siege band at Dwargon | 1 | 482 | D+0 08:00 → D+0 14:30 | The Isthmus blockade and Composite Division press on Dwargon from the imperial border (anchored rule). The eastern metropolis never falls |
| D+0 13:50 | Magitank loss | 3 | 72 | D+0 13:50 → D+1 07:40 | Released when the Battle of the Dwargon Gate ends. Recedes toward the Empire and is never retaken |
| D+1 | Armour push on the capital | 1 | 91 | D+1 07:30 → D+1 08:10 | The restructured Armor Corps advances (EVT-0127), on new ground only |
| D+10 11:30 | Retreat from Jura | 1 | 1,564 | D+10 12:00 → D+10 16:30 | Released when the Annihilation of the Imperial Camp ends. The whole imperial ground in Jura falls back east to the border |
| D+15 21:00 | Dwargon siege lifted | 1 | 482 | D+15 21:30 → D+16 00:50 | Released when the Destruction of the Composite Division ends. The band falls back to the imperial border by about D+16 00:50. The Legion's landing afterwards takes no ground: none can be retaken once lost |

Many small steps between the large ones are deliberate. The reference videos show mostly small changes: refs 1 and 2 have 129–130 small changes in 10-second windows against 3–10 medium ones.

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
