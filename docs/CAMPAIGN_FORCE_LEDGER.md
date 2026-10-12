# Campaign force ledger

Revision R7-CAMPAIGN-RECONSTRUCTION (2026-10-12). The atlas follows the owner's campaign scenario (*Alur Timeline secara kasarannya*, phases A to N; docs/CAMPAIGN_TIMELINE.md). Where the scenario and the novels differ, the scenario is authoritative for this atlas, and the difference is recorded in the reference register (`DISC-R7-01` to `DISC-R7-13`, shown in the About panel) rather than hidden.

Every figure on this page is **derived by the compiler** from forces, events and casualty records (`public/data/ledger.json`). None is typed into the interface, and `scripts/test-scenario.ts` checks that the derivation lands on the scenario's numbers.

## 1. The operation's formations

| Force id | Formation | Strength | Ledger role | Parent / origin | Provenance |
|---|---|---:|---|---|---|
| F-EMP-010 | Main invasion formation | 900,000 | MAIN | under F-EMP-001 (deployable ceiling, 1,000,000) | SCENARIO |
| F-EMP-011 | Formation A (Restructured Armor Corps) | 700,000 | ALLOCATION | split from F-EMP-010 | canon size, scenario axis |
| F-EMP-011A | Labyrinth Raider force | 350,000 → 550,000 | (subordinate) | under F-EMP-011 | scenario (DISC-R7-04) |
| F-EMP-011B | Imperial camp outside the labyrinth | 150,000 | (subordinate) | under F-EMP-011 | scenario (DISC-R7-04) |
| F-EMP-012 | Formation B (Magitank Force) | 200,000 | ALLOCATION | split from F-EMP-010 | canon size, scenario axis |
| F-EMP-017 | Reinforcement cohort | 70,000 | DETACHMENT | under F-EMP-001; rides in the main column until the halt (`convoy`) | SCENARIO |
| F-EMP-013 | Flying Combat Corps | 40,000 | ALLOCATION | split from F-EMP-017 | canon size, scenario origin |
| F-EMP-018 | Eastern reinforcement | 30,000 | ALLOCATION | split from F-EMP-017, merged into F-EMP-031 | SCENARIO |
| F-EMP-019 | Eastern cohort | 30,000 | DETACHMENT | under F-EMP-001, merged into F-EMP-031 | SCENARIO |
| F-EMP-031 | Eastern Gate force | 30,000 → 60,000 | GATE_FORCE | composed of F-EMP-019 and F-EMP-018 | SCENARIO (canon 60,000) |
| F-EMP-080 | Capital reserve | 110,100 → 100,000 | RESERVE (outside the operation) | under F-EMP-030 | SCENARIO |
| F-EMP-081 | Third Strike | 10,100 | TRANSFER | transferred from F-EMP-080 | SCENARIO |
| F-EMP-081E | Third Strike, eastern group | 8,000 (parameter) | ALLOCATION | split from F-EMP-081 | SCENARIO |
| F-EMP-081T | Third Strike, Tempest group | 2,100 (parameter) | ALLOCATION | split from F-EMP-081 | SCENARIO |
| F-EMP-090 | Revived soldiers (held in Tempest) | 700,000 | REVIVED_COHORT | the revived subset of the dead | CANONICAL |
| F-EMP-020 | Magic Beast Division | 30,000 | OUTSIDE_OPERATION | separate airborne operation | CANONICAL |

Subordinates of an operation formation belong to the operation through their parent and are inside its strength. Tiers are never added together.

## 2. Equations

Main formation, at the halt (EVT-0503, D-3 15:00):

    700,000 + 200,000 = 900,000

The column that crosses the Tempest border (EVT-0015, D-24), drawn as one marker:

    900,000 + 70,000 = 970,000

Initial forward deployment (EVT-0003, EVT-0530, EVT-0502), equal to the stated ceiling "at most one million at once":

    900,000 + 70,000 + 30,000 = 1,000,000

The cohort, after the ultimatum is rejected (EVT-0531, D+0 11:20):

    40,000 + 30,000 = 70,000

Main Gate, once the airships arrive (EVT-0106, D+0 12:40):

    200,000 + 40,000 = 240,000

Eastern Gate force:

    eastern cohort arrives (D-3 14:10)           30,000
    eastern reinforcement arrives (D+7 12:10)    30,000 + 30,000 = 60,000

The Tempest capital:

    350,000 (day one) + 200,000 (day two) + 150,000 (outside) = 700,000

Third Strike (EVT-0540, EVT-0541, D+15 21:50 and 22:00), the only addition after the initial deployment:

    capital reserve    110,100 - 10,100 = 100,000
    groups             8,000 + 2,100 = 10,100        (data-source/campaign/scenario-params.json)
    committed          1,000,000 + 10,100 = 1,010,100

Casualties of the operation (additive records only):

| Record | Event | Killed | Revived |
|---|---|---:|---:|
| CAS-002 Flying Combat Corps | EVT-0115, D+0 13:00 | 40,000 | |
| CAS-001 Formation B | EVT-0119, D+0 13:20 | 200,000 | |
| CAS-004 Formation A, inside the labyrinth | EVT-0207, D+9 18:00 | 550,000 | |
| CAS-017 Formation A, camp outside | EVT-0219, D+10 11:30 | 150,000 | |
| CAS-021 Restoration | EVT-0220, D+11 10:00 | | 700,000 |
| CAS-012 Eastern Gate force | EVT-0325, D+15 21:00 | 60,000 | |
| CAS-T01 Third Strike, eastern group | EVT-0546, D+16 01:40 | 8,000 | |
| CAS-T02 Third Strike, Tempest group | EVT-0547, D+16 02:30 | 2,100 | |
| **Total** | | **1,010,100** | **700,000** |

Reconciliation at the end of the war:

    dead not revived      1,010,100 - 700,000 = 310,100
    never killed          1,010,100 - 1,010,100 = 0
    active or revived     700,000

**About 1,020,000 dead.** The scenario's note gives about 1,020,000 dead. The operation's dead are 1,010,100: every soldier it deployed. The Empire-wide toll in the record is **1,020,102**: the operation, plus the Magic Beast Division's 10,000 killed by the fusion drug on the Long Night (canon, CAS-024) and two individuals (Miranda, Kondo). No soldiers are invented to close the gap (DISC-R7-10).

## 3. Ledger over time

| When | Event | Committed | Reserve | Gate force | Killed | Revived | Active |
|---|---|---:|---:|---:|---:|---:|---:|
| D-40 09:10 | Reserve set aside | 0 | 110,100 | 0 | 0 | 0 | 0 |
| D-39 08:00 | Main column and cohort leave | 970,000 | 110,100 | 0 | 0 | 0 | 970,000 |
| D-11 06:00 | Eastern cohort leaves | 1,000,000 | 110,100 | 0 | 0 | 0 | 1,000,000 |
| D-3 14:10 | Eastern Gate force formed | 1,000,000 | 110,100 | 30,000 | 0 | 0 | 1,000,000 |
| D+0 13:00 | Flying Combat Corps destroyed | 1,000,000 | 110,100 | 30,000 | 40,000 | 0 | 960,000 |
| D+0 13:20 | Formation B destroyed | 1,000,000 | 110,100 | 30,000 | 240,000 | 0 | 760,000 |
| D+7 12:10 | Eastern Gate force 60,000 | 1,000,000 | 110,100 | 60,000 | 240,000 | 0 | 760,000 |
| D+9 18:00 | Labyrinth battle over | 1,000,000 | 110,100 | 60,000 | 790,000 | 0 | 210,000 |
| D+10 11:30 | Camp outside destroyed | 1,000,000 | 110,100 | 60,000 | 940,000 | 0 | 60,000 |
| D+11 10:00 | Resurrection | 1,000,000 | 110,100 | 60,000 | 940,000 | 700,000 | 760,000 |
| D+15 21:00 | Eastern Gate force killed by Velgrynd | 1,000,000 | 110,100 | 0 | 1,000,000 | 700,000 | 700,000 |
| D+15 21:50 | Third Strike leaves the reserve | 1,010,100 | 100,000 | 0 | 1,000,000 | 700,000 | 710,100 |
| D+16 01:40 | Eastern group destroyed | 1,010,100 | 100,000 | 0 | 1,008,000 | 700,000 | 702,100 |
| D+16 02:30 | Tempest group destroyed | 1,010,100 | 100,000 | 0 | 1,010,100 | 700,000 | 700,000 |

`Active = committed - killed + revived` holds at every point. A revival changes the state of personnel already counted: `committed` does not move at D+11 and the 940,000 dead stay on the record.

## 4. Rules the data obeys

- Allocations have no position before their split. Only their parent is drawn on the approach.
- The cohort rides in the main column: one marker labelled 970,000 with both names, two formations in the ledger and in the dossiers, until the halt (`Force.convoy`, `src/simulation/resolver.ts`).
- After a split the parent is not drawn; its strength is the sum of its allocations (`aggregateFromEvent`).
- A merged formation drops to 0, is no longer drawn, and its personnel are counted in the force it joined.
- The capital reserve is never counted in the operation. Only the transferred 10,100 are.
- The Third Strike's split is a parameter: change `groups` in `data-source/campaign/scenario-params.json` and the compiler writes the strengths into the split event and the casualty records, refusing to build unless they sum to 10,100.

## 5. Where it is checked

- `scripts/compile-data.ts` builds the ledger and refuses to compile if any identity fails: every split preserves its parent (main formation, cohort, Third Strike), committed = initial + transfers, reserve arithmetic, Gate force = merged reinforcements, revived ⊆ dead, and the three reconciliation identities.
- `scripts/test-scenario.ts` checks every figure on this page, the 970,000 column, the 240,000 at the Main Gate only after the airships arrive, the 1,010,100 dead against the 1,020,000 note, that no 9,900 is invented, and determinism.
- `scripts/validate-data.ts` checks the hierarchy and quantities.
