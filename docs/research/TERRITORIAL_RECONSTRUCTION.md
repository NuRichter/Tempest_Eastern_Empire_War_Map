# Territorial reconstruction (R6)

The novels never draw a line of control. They say where armies are, how big they are, what they do, and what happens to them. Everything on the held-ground layer is therefore **RECONSTRUCTED** from those facts by `scripts/compile-front.ts`, using the rules in `docs/TERRITORIAL-ANIMATION.md`. This page lists what the reconstruction produces and why each change is there.

## The ground that changes hands

Compiled from the R6 dataset (`public/data/front.json`): 53 transitions, 4,473 cell changes, grouped by phase. Times are simulation placements on the 10-minute grid. Four rules shape them:
- **Battle gate:** losses wait for the battle to end.
- **Retreat:** lost ground falls back toward the loser's home.
- **Anchored Dwargon front:** the Empire's ground in Dwargon is a band from its own border.
- **Ragged lines:** fronts follow a fixed, warped noise (see `docs/TERRITORIAL-ANIMATION.md` 6a–6d).

| When | Phase | Transitions | Cells | Span | Why the text supports it |
|---|---|---|---|---|---|
| D−5 → D+0 | Empire advance into Jura | 41 | 1,280 | D-5 07:30 → D+0 07:30 | The border crossing (EVT-0015) opens the front; the columns spread along the forest roads and up to 700,000 infantry enter the forest (EVT-0020). Many small steps and four large ones |
| D+0 | Siege band at Dwargon | 1 | 495 | D+0 08:00 → D+0 14:30 | The Magitank Force and Composite Division reach the Dwargon front; the held ground is a band from the imperial border (anchored rule) |
| D+0 13:20 | Magitank loss | 3 | 72 | D+0 13:20 → D+1 07:40 | Released when the Battle of the Dwargon Gate ends; recedes toward the Empire |
| D+1 | Armour push on the capital | 1 | 91 | D+1 07:30 → D+1 08:10 | The restructured Armor Corps advances (EVT-0127) |
| D+10 11:30 | Retreat from Jura | 1 | 1,590 | D+10 11:30 → D+10 16:00 | Released when the Annihilation of the Imperial Camp ends; the whole imperial ground in Jura falls back east to the border |
| D+15 21:00 | Dwargon siege lifted | 1 | 495 | D+15 21:00 → D+16 00:20 | Released when the Destruction of the Composite Division ends |
| D+15 22:50 → D+16 00:40 | Legion foothold | 3 | 225 | D+15 22:50 → D+16 00:40 | The ritual ground and the Legion landing (EVT-0343, EVT-0373), anchored to the imperial side |
| D+16 02:10 | Settlement | 2 | 225 | D+16 02:10 → D+16 03:20 | Released when the Battle of the Dwargon Eastern Front ends; Dwargon leaves the war and the rest returns |

Many small steps between the large ones are deliberate: the reference videos show mostly small changes (refs 1 and 2: 129–130 small changes in 10-second windows against 3–10 medium ones).

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
