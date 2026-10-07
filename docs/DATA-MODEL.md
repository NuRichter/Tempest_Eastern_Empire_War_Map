# Data model

Source shapes: `scripts/lib/source-types.ts`. Runtime shapes: `src/types/dataset.ts`. This page explains the concepts both share.

## Campaign source (`data-source/campaign/`)

| File | Content |
|---|---|
| `revision.json` | Revision name, clock (`firstDay`, `lastDay` as battle days; 144 ten-minute frames per day; artificial calendar start), `initial` state, `phaseMarks` (campaign phase/stage boundaries placed like events) |
| `events/NN-*.json` | Events, one file per campaign phase, read in name order |
| `forces.json` | Force register: hierarchy, commander, size and its status |
| `movements.json` | Recorded movements with route confidence |
| `casualties.json` | Casualty records by scope |
| `transit.json` | Reconstructed march-progress keys along the imperial approach axis |
| `commanders.json`, `combatants.json` | Command appointments; individual combatants |
| `stages.json` | Campaign stages for the story view and the timeline bands |
| `territory-changes.json` | Local control changes (gates, airspace, the labyrinth) |
| `reference.json` | Contradictions and temporal ambiguities, carried as written |
| `AUDIT-PLAN.md` | The audit revision plan: clock skeleton and per-file corrections |

### Events

An event is placed by **battle day** (`day`, relative to first contact D+0) and a simulation **time** on the 10-minute grid. Frames are derived, never authored. Each event carries:

- identity and narrative: `title`, actor/opponent and their factions, `location` (a gazetteer id), `theatreId`, `battle`, `type`, results;
- evidence: `provenance` (below), `confidence` (time / numbers / overall), `sources` (`volume`, `chapter`, `locator` such as `v13.txt:7475`), `evidence` (paraphrase), `reconstructionNote`, `canonicalTime` (the novel's own time wording), `timePrecision`;
- audit: `audit.status` (`UNCHANGED`, `CORRECTED`, `ADDED`) and the list of `audit.changes`;
- **effects**: the state that takes effect at this event — `forces` (strength, sizeStatus, kia/wia/pow/mia, status, movement, location …), `theatres` (status, frontline, battleStatus, control), `campaign` (side totals, commanders). The compiler applies effects in time order to produce every frame.

### Provenance classes

| Class | Meaning |
|---|---|
| `CANONICAL` | Explicitly supported by the source |
| `CANONICAL_WITH_VISUAL_RECONSTRUCTION` | Canonical event; exact position, path or timing reconstructed for the map |
| `INFERRED` | Follows from several clues but is not stated |
| `RECONSTRUCTED` | A bridging sequence made by the project between known points |
| `UNRESOLVED` | Evidence insufficient; kept visible |

### Time semantics

| Layer | Example | Canon? |
|---|---|---|
| Canonical time | "seven days after the operation began" | Yes — the novel's wording, stored in `canonicalTime` |
| Battle time | `D+07` | Day placement; precision recorded in `timePrecision` |
| Campaign time | days since mobilization | Derived |
| Simulation time | `06:20` | **No** — a placement on the 10-minute grid; the novels give no clock times |
| Calendar date | `10/02/9001` | **No** — an artificial marker, never shown as a real date |

The renderer may interpolate between recorded states; it never creates an event.

### Forces and sizes

`sizeStatus`: `EXPLICIT` (stated), `DERIVED` (arithmetic from stated numbers, shown `≈`), `RECONSTRUCTED` (project estimate, `~`), `UNKNOWN` (`?`, never 0). `parentId` builds the order of battle; `hierarchyProvenance` says whether the relation is stated. A child's strength is inside its parent's: **tiers are never summed**. Map totals and front strengths are summed only over the most specific formations drawn.

### Movements

`route`: `SOLID` (route stated), `RECONSTRUCTED` (canonical endpoints, line drawn by the project), `SCHEMATIC` (direction only), `UNKNOWN` (never drawn). The runtime adds `strengthAtStart` and `strengthAtEnd` read from the force track; an intermediate strength is not assumed.

A force with no recorded movement that changes location is drawn travelling at a slow schematic pace proportional to the distance, never jumping; between records it holds its position until its movement departs.

### Casualties

Killed, wounded, missing, captured and **revived** are separate fields. Scopes: `EVENT_CASUALTY` and `RESTORATION` rows are summed; `AGGREGATE_CASUALTY`, `COMPONENT_CASUALTY` and `CAMPAIGN_TOTAL` restate other rows and are excluded. A field is `UNKNOWN` until some record states a number for it. Permanent dead = killed − revived. `validate-data` recomputes every total independently.

## Derived on the client (not in the data)

- **Held ground (occupation field)** — `src/map/field/occupation.ts`. RECONSTRUCTED. For each frame, every ground formation with a position projects signed influence ∝ ∛strength with a smooth `(1 − t²)²` kernel; a belligerent's own land carries a home baseline the other side must exceed; cells near the threshold are contested. The field is a pure function of the frame state, so it is deterministic and never stored. It shows *where armies stand*, not a stated line of control; the legend and the Situation panel say so. Details: `docs/CARTOGRAPHY.md`.
- **Front seams** — the contour where the held side changes, traced by marching squares on the same field.
- **Front strength** — the sum of the most specific drawn formations of each side within a front, never summing tiers.

## Runtime additions

- `FrameState` per frame: phase, stage, side strengths, cumulative casualties by side, theatre states, commanders, event ids.
- `Territory`: traced geometry + `control` segments (from `territory-control.source.json`), `faction` (holder at the start of the campaign), `sourceGrade: 'MEASURED'` (the border is traced from the Base Map) and `uncertainty` (`LOW` labelled, `MEDIUM` partial grouping, `HIGH` unlabelled) of the region's identity.
- `TimelineGap` (`gaps.json`): every stretch of more than 36 frames (6 simulated hours) between consecutive events, with the bounding event ids, frames, hours, the later event's canonical time wording and time precision, the reconstruction basis, a confidence (from the time precision) and its source references. Gaps are drawn as hatched bands on the timeline and shown in an event's dossier as *Before this event*; nothing is invented to fill them.
- `Character`: photocard (`/assets/characters/<id>.jpg`, source and URL), and the commands, forces, events, battles and theatres linked to it.
- `TermEntry`: canonical names with aliases and Japanese, for search.
