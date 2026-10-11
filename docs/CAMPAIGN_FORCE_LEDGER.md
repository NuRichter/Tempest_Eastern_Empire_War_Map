# Campaign force ledger

Revision R6-SCENARIO-LEDGER (2026-10-11). The atlas follows the owner's scenario brief for the Eastern Empire's invasion of Tempest and Dwargon. Where the brief and the novels differ, the brief is authoritative for this atlas, and the difference is recorded in the reference register (`DISC-R6-01` to `DISC-R6-09`, shown in the About panel) rather than hidden.

Every figure on this page is **derived by the compiler** from forces, events and casualty records (`public/data/ledger.json`). None is typed into the interface, and `scripts/test-scenario.ts` checks that the derivation lands on the brief's numbers.

## 1. The operation's formations

| Force id | Formation | Strength | Ledger role | Parent / origin | Provenance |
|---|---|---:|---|---|---|
| F-EMP-010 | Main invasion formation | 1,005,000 | MAIN | under F-EMP-001 (deployable ceiling) | SCENARIO |
| F-EMP-011 | Formation A (Restructured Armor Corps) | 700,000 | ALLOCATION | split from F-EMP-010 | canon size, scenario allocation |
| F-EMP-012 | Formation B (Magitank Force) | 200,000 | ALLOCATION | split from F-EMP-010 | canon size, scenario axis |
| F-EMP-013 | Northern reinforcement (Flying Combat Corps) | 40,000 | ALLOCATION | split from F-EMP-010 | canon size, scenario role |
| F-EMP-017 | Dwargon Gate reinforcement, Phase 1 | 30,000 | ALLOCATION | split from F-EMP-010, merged into F-EMP-031 | SCENARIO |
| F-EMP-018 | Southern Dwargon formation | 35,000 | ALLOCATION | split from F-EMP-010 | SCENARIO |
| F-EMP-019 | Initial Dwargon detachment | 5,000 | DETACHMENT | under F-EMP-040, never in the main formation | SCENARIO |
| F-EMP-080 | Imperial capital emergency reserve | 100,000 → 70,000 | RESERVE (outside the operation) | under F-EMP-030 (Composite Division) | SCENARIO |
| F-EMP-081 | Dwargon Gate reinforcement, Phase 2 | 30,000 | TRANSFER | transferred from F-EMP-080, merged into F-EMP-031 | SCENARIO |
| F-EMP-031 | Dwargon Gate force | 0 → 30,000 → 60,000 | GATE_FORCE | composed of F-EMP-017 and F-EMP-081 | SCENARIO |
| F-EMP-090 | Revived soldiers (held in Tempest) | 700,000 | REVIVED_COHORT | the revived subset of the dead | CANONICAL |
| F-EMP-020 | Magic Beast Division | 30,000 | OUTSIDE_OPERATION | separate airborne operation | CANONICAL |

Subordinates of an operation formation (Formation A's labyrinth echelon and outer camp, the advance squads) belong to the operation through their parent and are inside its strength. Tiers are never added together.

## 2. Equations

Main-force allocation, at the split (EVT-0503, D-3 15:00):

    700,000 + 200,000 + 40,000 + 30,000 + 35,000 = 1,005,000

Initial forward deployment (EVT-0003 and EVT-0502, D-39):

    1,005,000 + 5,000 = 1,010,000

Phase 2 transfer (EVT-0516, D+1 08:00), the only addition to the operation:

    capital reserve   100,000 − 30,000 = 70,000
    committed         1,010,000 + 30,000 = 1,040,000

Dwargon Gate force:

    before Phase 1           0
    Phase 1 merged (D+5)     30,000
    Phase 2 merged (D+8)     30,000 + 30,000 = 60,000

The 5,000 detachment and the 35,000 southern formation are never in the Gate total.

Casualties of the operation (additive records only):

| Record | Event | Killed | Revived |
|---|---|---:|---:|
| CAS-002 Northern reinforcement (air) | EVT-0115, D+0 13:00 | 40,000 | |
| CAS-001 Formation B | EVT-0119, D+0 13:20 | 200,000 | |
| CAS-004 Formation A, labyrinth echelon | EVT-0207, D+9 18:00 | 530,000 | |
| CAS-017 Formation A, camp outside | EVT-0219, D+10 11:30 | 170,000 | |
| CAS-021 Restoration | EVT-0220, D+11 10:00 | | 700,000 |
| CAS-012 Dwargon Gate force | EVT-0325, D+15 21:00 | 60,000 | |
| CAS-S01 Detachment and southern formation, combined (derived) | EVT-0519, D+16 06:00 | 10,000 | |
| **Total** | | **1,010,000** | **700,000** |

Aggregate reconciliation at the end of the war:

    dead not revived       1,010,000 − 700,000 = 310,000
    never recorded killed  1,040,000 − 1,010,000 = 30,000
    active or revived      700,000 + 30,000 = 730,000
    identity               1,040,000 − 1,010,000 + 700,000 = 730,000

The 30,000 never recorded killed are the survivors of the detachment and the southern formation (40,000 − 10,000). Their split between the two formations is not established, so from EVT-0519 both formations show their strength as unknown. The ledger keeps the combined figure.

## 3. Ledger over time

| When | Event | Committed | Reserve | Gate force | Killed | Revived | Active |
|---|---|---:|---:|---:|---:|---:|---:|
| D-40 09:10 | Reserve held back | 0 | 100,000 | 0 | 0 | 0 | 0 |
| D-39 08:00 | Main formation departs | 1,005,000 | 100,000 | 0 | 0 | 0 | 1,005,000 |
| D-39 08:10 | Detachment departs | 1,010,000 | 100,000 | 0 | 0 | 0 | 1,010,000 |
| D+0 13:00 | Flying Combat Corps destroyed | 1,010,000 | 100,000 | 0 | 40,000 | 0 | 970,000 |
| D+0 13:20 | Formation B destroyed | 1,010,000 | 100,000 | 0 | 240,000 | 0 | 770,000 |
| D+1 08:00 | Phase 2 transfer | 1,040,000 | 70,000 | 0 | 240,000 | 0 | 800,000 |
| D+5 08:10 | Phase 1 joins the Gate force | 1,040,000 | 70,000 | 30,000 | 240,000 | 0 | 800,000 |
| D+8 14:10 | Phase 2 joins the Gate force | 1,040,000 | 70,000 | 60,000 | 240,000 | 0 | 800,000 |
| D+9 18:00 | Labyrinth battle over | 1,040,000 | 70,000 | 60,000 | 770,000 | 0 | 270,000 |
| D+10 11:30 | Jura invasion army annihilated | 1,040,000 | 70,000 | 60,000 | 940,000 | 0 | 100,000 |
| D+11 10:00 | Resurrection | 1,040,000 | 70,000 | 60,000 | 940,000 | 700,000 | 800,000 |
| D+15 21:00 | Gate force killed by Velgrynd | 1,040,000 | 70,000 | 0 | 1,000,000 | 700,000 | 740,000 |
| D+16 06:00 | Ledger closure | 1,040,000 | 70,000 | 0 | 1,010,000 | 700,000 | 730,000 |

`Active = committed − killed + revived` holds at every point. A revival changes the state of personnel already counted: `committed` does not move at D+11 and the 940,000 dead stay on the record.

## 4. Rules the data obeys

- The 700,000 and 200,000 (and the other allocations) have no position before the split. Only the single main formation is drawn on the approach.
- After the split the main formation is not drawn. Its strength becomes the sum of the allocations still under it, computed by the compiler (`aggregateFromEvent`).
- A merged formation drops to 0, is no longer drawn, and its personnel are counted in the force it joined. A transferred formation's origin decreases by the same amount at the same event.
- The capital reserve is never counted in the operation. Only the transferred 30,000 are.
- The Magic Beast Division (DISC-R6-05) and the Composite Division's other personnel are outside the ledger. Empire-wide dead (all imperial records) are 1,020,002. The operation's are 1,010,000.

## 5. Discrepancies with the novels

| Id | Subject | Treatment |
|---|---|---|
| DISC-R6-01 | Invasion army 940,000 (700k + 200k + 40k) in the novels | Scenario main formation 1,005,000 with two extra allocations, plus a 5,000 detachment |
| DISC-R6-02 | The 60,000 before the Isthmus are the Composite Division in the novels | Scenario: 30,000 from the main formation + 30,000 from the capital reserve |
| DISC-R6-03 | Deployable ceiling "at most one million" | Exceeded by 5,000. Accepted, reported once by the validator |
| DISC-R6-04 | Formation B's axis and who defeated it | Scenario axis adopted. "Ultima's group" verified only for the air battle, UNVERIFIED for the ground battle (Testarossa, Gobta, Ranga, Gabiru, Hakuro in the novels) |
| DISC-R6-05 | Magic Beast Division | Outside the operation's ledger |
| DISC-R6-06 | The brief lists the dead before the revival | Canonical order kept (revival D+11, Gate force dies D+15). Same end state, intermediate active 800,000 |
| DISC-R6-07 | The last 10,000 dead | Derived. One combined record, no per-formation split, no invented battle |
| DISC-R6-08 | Opening timetable | Border crossing D-24, halt D-3 14:00, camp D+0 04:00 (measured routes, stated speeds) |
| DISC-R6-09 | Map scale vs. the novels' distances | See GEOGRAPHIC_MODEL.md §2 |

## 6. Where it is checked

- `scripts/compile-data.ts` builds the ledger and refuses to compile if any of its eight identities fails (split preserves the parent, committed = initial + transfers, reserve arithmetic, Gate total = merged reinforcements, revived ⊆ dead, the three reconciliation identities).
- `scripts/test-scenario.ts` checks every figure on this page against the compiled data, plus formation integrity (no allocation drawn before the split, no double counting, merges, transfers, a single Formation B through its whole route, revival adds no personnel) and determinism.
- `scripts/validate-data.ts` checks the hierarchy and quantities and accepts only documented discrepancies.
