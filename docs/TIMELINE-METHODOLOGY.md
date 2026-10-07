# Timeline methodology

## The problem

The novels tell the war as narrative. They give order ("then", "soon after"), stated intervals ("a month after the gathering", "the next day", "seven days since the operation began", "less than two hours") and occasionally a time of day ("ten in the morning", "late at night") — but never a calendar date and almost never a clock time. A map that plays the war needs every event on one clock.

## The approach

1. **Order first.** Every event is placed in the novel's narrative order. Where two strands run in parallel (the coup in the capital and the dragon battle over Jura), their order comes from the text's cross-references.
2. **Anchor on stated intervals.** The clock skeleton (`data-source/campaign/AUDIT-PLAN.md`, section 1) is built from intervals the novel states. Battle day D+0 is the day of Testarossa's ultimatum and the surface battle.
3. **Fill the gaps honestly.** Where the novel gives no interval ("several days later"), the gap gets a placement marked `RECONSTRUCTED`, with the reasoning in the event's notes. A reconstructed gap may stretch or shrink; it is never presented as stated.
4. **Times are a grid, not a claim.** Every event sits on a 10-minute grid (144 frames per day) so the map can be played. Each `HH:MM` is a simulation placement, labelled *simulation* in the interface, with the novel's own time wording (if any) shown beside it.
5. **Effects, not frames.** Each event lists the state that takes effect at it (forces, theatres, campaign). The compiler applies the effects in time order to produce every frame, so re-timing an event re-times everything attached to it.

## Time precision

| Value | Meaning | Count (R5) |
|---|---|---|
| `CANONICAL_RELATIVE` | The interval to an anchor is stated | 33 |
| `DAY_LEVEL` | The day is canonical; the hour is placed | 66 |
| `SEQUENTIAL` | Only the order is canonical | 39 |
| `RECONSTRUCTED` | The day itself is our placement | 27 |

## Interpolation rules

The renderer may interpolate; it must not invent.

- Between two recorded positions a force moves along a route whose confidence is shown (solid, reconstructed, schematic). An `UNKNOWN` route is not drawn; the force appears at its destination when the record puts it there (for example Velgrynd's space-time transfer).
- A force holds its position until its recorded movement departs. A relocation without a recorded movement travels at a slow schematic pace proportional to the distance; if there is not enough time for a plausible journey, it is treated as an untraced transfer, never as a high-speed line.
- The imperial approach march is interpolated linearly in two legs (departure → border crossing on D−5 → halt at the forest edge on D−2) and labelled `RECONSTRUCTED`.
- Territory changes animate over three simulated hours. Unknown control is shown as unknown.
- Strengths change only at events. The strength at departure is not assumed to hold through a march; intermediate strength is unknown unless recorded.

## Time semantics in the interface

| Shown as | Example | Status |
|---|---|---|
| Battle day | `D+00` | Placement; precision on every event |
| Simulation time | `11:30` + *SIMULATION* tag | Never canon |
| Canonical time | "less than two hours after it began" | The novel's wording, in the event dossier |
| Calendar | `sim. calendar 15/02/9001` | An artificial marker, shown faintly, never as a date |

## Verification

`validate-data` checks chronological order, prev/next consistency, movement start ≤ end, monotonic casualties and the dual-path replay. `test-runtime` checks that no force teleports along a drawn route, that forces hold before departure, and that scrubbing equals playing.
