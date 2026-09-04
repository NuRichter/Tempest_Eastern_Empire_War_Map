# Tempest–Eastern Empire War

**FINAL Step 1 master battlefield timeline.** Reconstructed from the supplied source corpus:
Tensura Volumes 12–16.

> Generated from the same master dataset as `Tempest_Eastern_Empire_War_Timeline.xlsx`. The
> workbook is the machine-readable master; this file is a derived view. They cannot diverge.

## Executive Summary

The Eastern Empire mobilised more than two million subjects, of whom about one million were
immediately deployable, and committed 940,000 to the invasion of the Great Jura Forest. It lost
770,000 of them in four days: 240,000 annihilated on the surface at the Dwargon gate, 530,000
destroyed underground in the Ramiris Labyrinth. A further 60,000 of the Hybrid Legion were expended
by the Empire on its own magical ritual at the Dwargon eastern front. The campaign total is
**830,001 imperial dead**, against a deployable pool of roughly a million — consistent with the
Empire's own post-war admission that it had lost more than two-thirds of its war power.

Tempest's confirmed numeric losses are **zero**. Its only deaths occurred inside a sealed space in
the Imperial Capital, and the corpus gives no figure for them.

The decisive feature of the war is that almost none of it was a contest. The Empire's advantage was
mass; every phase was engineered to make mass irrelevant — a feigned defeat that drew the armour
into a killing ground, a labyrinth that severed formations and revived its own defenders on a
three-hour cycle, and an air corps annihilated in a single action. The war ended not by conquest
but by armistice, followed by a settlement in which Tempest declined to prosecute the imperial
leadership, backed a new emperor, and repatriated its prisoners.

## Campaign Scope

This dataset covers the Tempest–Eastern Empire War as a **continuous military campaign**, not only
its days of combat. The campaign window opens at imperial mobilisation and closes at the post-war
settlement. The month-long imperial approach march is campaign data and is represented frame by
frame in the grid.

Deliberately **excluded**: the Feldway and Michael conflict that occupies most of Volume 16. It is
a separate later war and is not absorbed into this one. See AMB-013.

## Source Corpus

| Volume | Language of the supplied text | Role |
|---|---|---|
| Volume 12 | Indonesian translation | Orders of battle, mobilisation, pre-war reconnaissance |
| Volume 13 | Indonesian translation | Approach march, first contact, surface battle, labyrinth |
| Volume 14 | Indonesian translation | Imperial Capital coup, blockade, dragon engagement |
| Volume 15 | Indonesian translation | Dwargon eastern front, capital confrontation, armistice |
| Volume 16 | English edition | Post-war settlement (Chapter 3 only) |

Evidence fields carry volume and chapter pointers. Novel text is not reproduced anywhere in this
dataset. The supplied PDFs are not reliably paginated, so page numbers read `not paginated`.

## Reconstruction Methodology

The hierarchy runs strictly one way:

```
SOURCE EVIDENCE → ATOMIC EVENTS → EVENT GRAPH → 10-MINUTE KEYFRAMES
                                                      → BATTLEFIELD STATE → EXCEL → MARKDOWN
```

Events are changes. Keyframes are snapshots. An event says *what changed*; a keyframe says *what
the battlefield looks like*. Every keyframe carries full state whether or not an event occurs in it.

Where nothing changes, the previous state is carried forward and the frame reads `INHERITED_STATE`.
`UNKNOWN` is reserved for state that genuinely cannot be established from the corpus, and is never
used for unchanged state, never converted to zero, and never replaced by an estimate.

## Canonical vs Reconstructed Time

The corpus contains **no clock times and no calendar dates** for any campaign event. It gives event
order, force compositions, casualty figures, and a small set of relative durations. Every `HH:MM`
and every date here is therefore `SIMULATION_RECONSTRUCTED`.

| Canonical statement | Event | Simulation placement | Basis |
|---|---|---|---|
| Under six seconds to close 100 m | EVT-0103 | One frame | EXPLICIT_RELATIVE |
| Ten minutes elapsed | EVT-0112 | Exactly one frame after EVT-0111 | EXPLICIT_RELATIVE |
| Less than an hour | EVT-0203 | Six frames maximum | EXPLICIT_RELATIVE |
| Three hours before the dead revive | EVT-0206 | 18-frame cycle | EXPLICIT_RELATIVE |
| A month since the subordinates' gathering | EVT-0012 | D−8 (= R+30 exactly) | EXPLICIT_RELATIVE |
| About twenty-nine days or more until arrival, but slower | EVT-0003 | contact at R+38 | EXPLICIT_RELATIVE |
| Late at night | EVT-0312, EVT-0330 | Evening block | DAY_LEVEL_CANON |
| Several days after Yuuki's report | EVT-0310 | D+4 | SIMULATION_RECONSTRUCTED |

Never read a timestamp in this dataset as canon. The novel does not say D+4; D+4 is a simulation
placement at MEDIUM confidence.

## Campaign Clock

Five clocks are maintained separately and must not be conflated:

| Clock | Meaning | Example |
|---|---|---|
| `Campaign_Time` | Measured from campaign start (mobilisation) | `C+30:06:20` |
| `Battle_Time` | Measured from first contact | `B+00:06:20` |
| `Canonical_Time` | What the corpus actually says, verbatim in field | `a month has passed` |
| `Simulation_Time` | The reconstructed HH:MM placement | `06:20` |
| `Calendar_Date` | Artificial marker calendar | `31/01/9001` |

| Parameter | Value |
|---|---|
| Resolution | 10 minutes = 1 keyframe |
| Frames per hour | 6 |
| Frames per day | 144 |
| Final daily bucket | 23:50–23:59 (never 23:50–24:00) |
| Total keyframes | 7,200 |
| Rendering | The engine interpolates *between* keyframes at 18–24 FPS. No sub-frame rows exist. |

## Campaign Duration

| Boundary | War day | Date | Frame | Source |
|---|---|---|---|---|
| A. STRATEGIC_CAMPAIGN_START | D-40 | 01/01/9001 | FRAME_0001 | V12 Ch4 |
| A2. INVASION_PREPARATION | D-39 | 02/01/9001 | FRAME_0145 | V12 Ch2 |
| B. OPERATIONAL_INVASION_START | D-37 | 04/01/9001 | FRAME_0433 | V13 Prologue |
| B2. OPERATIONAL_APPROACH | D-8 | 02/02/9001 | FRAME_4609 | V13 Ch1 |
| B3. BORDER_CROSSING | D-5 | 05/02/9001 | FRAME_5041 | V13 Ch1 |
| B4. DEPLOYMENT | D-3 | 07/02/9001 | FRAME_5329 | V13 Ch1 |
| C. FIRST_CONTACT | D+0 | 10/02/9001 | FRAME_5761 | V13 Ch1 |
| D. MAJOR_COMBAT_PERIOD | D+1 | 11/02/9001 | FRAME_5905 | V13 Ch3-4 |
| E. SECOND_PHASE | D+4 | 14/02/9001 | FRAME_6337 | V14-V15 |
| F. ARMISTICE | D+9 | 19/02/9001 | FRAME_7057 | V15 Epilogue |
| G. POST_WAR_SETTLEMENT | D+9 | 19/02/9001 | FRAME_7057 | V16 Ch3 |

**Total campaign duration: 50 days** — 7,200 keyframes, continuous, no gaps.

## War Start

The campaign begins at **imperial mobilisation** (EVT-0001, V12 Ch4), not at first contact. This is
the earliest defensible operational point: it is where the Empire commits to war and releases its
field army. The advance itself begins the following day (EVT-0003, V13 Prologue), against an
expected arrival of about twenty-nine days.

The approach is not empty. The corpus establishes a month with no movement, a deliberate slowing to
display imperial power, forest fauna fleeing the column, a forced border crossing contrary to
Western international law, the blockade of Dwargon's eastern gate, allied command negotiations,
a halt-and-deploy, and 700,000 troops marching into the forest — all before a shot is fired.

`Approach_Progress_Pct` runs 0→100 across this window so a renderer can animate the column moving
west. The endpoints are canonical; the intermediate positions are linear interpolation and are
labelled simulation. See AMB-014.

## First Contact

**FRAME_5799** — EVT-0102, the Green Legion surprise attack at the Dwargon Gate Front,
with Gobta assuming direct command. This is the `Battle_Time` zero point.

The preceding frame records EVT-0100: a Tempest element of about one hundred closing to ten
kilometres, inside the effective envelope of the Magic Guided Cannon (maximum range thirty
kilometres, effective about three). The Empire holds the first-fire advantage at the moment of
contact and loses the battle anyway.

## War Phases

| Phase | Span | Theatres | Outcome |
|---|---|---|---|
| STRATEGIC_PREPARATION | D−30 | Imperial Capital | Mobilisation ordered |
| OPERATIONAL_APPROACH | D−29 to D−4 | Dwargon Gate, Dwargon East | Border forced; eastern gate blockaded |
| DEPLOYMENT | D−3 to D−1 | Dwargon Gate | Column halts; 700,000 enter the forest |
| FIRST_CONTACT | D+0 06:20 | Dwargon Gate | Tempest opens the battle |
| ACTIVE_COMBAT | D+0 to D+3 | Dwargon Gate, Labyrinth | 770,000 imperial dead |
| SECOND_OFFENSIVE | D+4 to D+6 | Capital, Dwargon East, Dragon Theatre | Coup pre-empted; Hybrid Legion consumed; dragon duel in stasis |
| TERMINATION_AND_SETTLEMENT | D+7 | Capital, Settlement | Armistice, treaty, succession, repatriation |

## Theatres

Six theatres carry independent state. Two or more are frequently live in the same keyframe, and one
never overwrites another. At the settlement, all six are simultaneously live.

| ID | Theatre | Region | First event | Peak battle status |
|---|---|---|---|---|
| TH-DWG | Dwargon Gate Front | Great Jura Forest | EVT-0004 | CONCLUDED |
| TH-LAB | Ramiris Labyrinth Front | Ramiris Labyrinth | EVT-0201 | CONCLUDED |
| TH-CAP | Imperial Capital | Eastern Empire | EVT-0001 | CONCLUDED |
| TH-DWE | Dwargon Eastern Metropolis | Armed Nation of Dwargon | EVT-0016 | CONCLUDED |
| TH-DRG | Dragon Theatre (Jura airspace) | Great Jura Forest | EVT-0330 | CONCLUDED |
| TH-DIP | Diplomatic / Settlement | Inter-state | EVT-0390 | CONCLUDED |

Maximum concurrent live theatres: **6**.

## Army Strength Summary

### Eastern Empire

| Force ID | Formation | Parent | Commander | Strength as stated | Final | Status |
|---|---|---|---|---|---|---|
| F-EMP-000 | Total mobilizable strength | - | Emperor Rudra Nam Ul Nasca | more than two million (includes garrisons across the Reich) | 2,000,000 | RESERVE |
| F-EMP-001 | Immediately deployable field strength | F-EMP-000 | Emperor Rudra Nam Ul Nasca | at most about one million for immediate operations | 1,000,000 | RESERVE |
| F-EMP-010 | Total invasion force | F-EMP-001 | Marshal Calgurio | the imperial army invading the Great Jura Forest (translation garbled: reads 'ninety-four thousand'; reconciles to 940,000) | 170,000 | DESTROYED |
| F-EMP-011 | Mecha Modification Corps (ground main body) | F-EMP-010 | Marshal Calgurio | seven hundred thousand in the regiment | 170,000 | DESTROYED |
| F-EMP-012 | Magic Chariot Division | F-EMP-010 | Lieutenant General Geist | 200,000 personnel including maintenance teams; 2,000 Magic Guiding Chariots | 0 | DESTROYED |
| F-EMP-013 | Air Combat Flying Corps | F-EMP-010 | Major General Faraga | 40,000 personnel; four hundred airships, each carrying up to four hundred | 0 | DESTROYED |
| F-EMP-020 | Warcraft Legion | F-EMP-001 | Gladim | only 30,000 | 30,000 | DEPLOYED |
| F-EMP-030 | Hybrid Legion | F-EMP-001 | Yuuki Kagurazaka | total 200,000, of whom about 100,000 are actual available fighting troops | UNKNOWN | DESTROYED |
| F-EMP-040 | Mechs Legion | F-EMP-001 | Marshal Calgurio | the largest legion of the Empire (no separate headcount given) | UNKNOWN | DEPLOYED |
| F-EMP-014 | Imperial Intelligence Service / Near Guard | F-EMP-001 | Lieutenant Tatsuya Kondo | no headcount stated | UNKNOWN | DEPLOYED |
| F-EMP-031 | Hybrid Legion field element (Dwargon east) | F-EMP-030 | Yuuki Kagurazaka (nominal) | sixty thousand troops blockading the eastern metropolis of Dwargon | 0 | DESTROYED |
| F-EMP-032 | Hybrid Legion staff element | F-EMP-030 | Yuuki Kagurazaka | named staff only: Tolneod, Aria, Olca | UNKNOWN | DEPLOYED |
| F-EMP-050 | Yuuki's clown group | F-EMP-030 | Yuuki Kagurazaka | named members: Kagali, Laplace, Tia, Footman, Miranda, Vega | UNKNOWN | DAMAGED |
| F-EMP-060 | Airship transport flotilla (second phase) | F-EMP-001 | Samuel | three hundred flying airships | 300 | DEPLOYED |
| F-EMP-070 | Velgrynd (Scorch Dragon) | - | Velgrynd | single entity | 1 | ENGAGED |

**Hierarchy — never sum across tiers.**

```
F-EMP-000  mobilisable, >2,000,000 (garrisons included)
  └ F-EMP-001  immediately deployable, ~1,000,000
      └ F-EMP-010  Jura invasion force, 940,000
          ├ F-EMP-011  Mecha Modification Corps      700,000
          ├ F-EMP-012  Magic Chariot Division        200,000
          └ F-EMP-013  Air Combat Flying Corps        40,000
      ├ F-EMP-020  Warcraft Legion, 30,000      (outside the 940,000)
      └ F-EMP-030  Hybrid Legion, 200,000/100,000
          └ F-EMP-031  field element, 60,000    (outside the 940,000)
```

### Jura-Tempest Federation and allies

| Force ID | Formation | Parent | Commander | Strength as stated | Final | Status |
|---|---|---|---|---|---|---|
| F-TEM-000 | Total national military potential | - | Rimuru Tempest | one hundred fifty thousand | 150,000 | RESERVE |
| F-TEM-001 | First Corps / Green Legion | F-TEM-000 | Gobta | about 12,000 | 12,000 | ENGAGED |
| F-TEM-002 | Second Corps | F-TEM-000 | Geld | about 37,000 | 37,000 | RESERVE |
| F-TEM-002A | Yellow Legion | F-TEM-002 | Geld | two thousand in the Yellow Legion | 2,000 | RESERVE |
| F-TEM-002B | Orange Legion | F-TEM-002 | Geld | 35,000 people, of whom only fifteen thousand veterans can take the field | 35,000 | RESERVE |
| F-TEM-003 | Third Corps | F-TEM-000 | Gabil | about 3,000 | 3,000 | ENGAGED |
| F-TEM-003A | Blue Legion | F-TEM-003 | Gabil | three thousand in the Blue Legion | 3,000 | ENGAGED |
| F-TEM-003B | Flying Dragon element | F-TEM-003 | Gabil | hundreds of Flying Dragons; only about three hundred currently developed | 300 | ENGAGED |
| F-TEM-004 | Fourth Corps / Kurenai (Red Army) | F-TEM-000 | Benimaru | thirty thousand; one thousand leaders selected from among the Kurenai | 30,000 | DEPLOYED |
| F-TEM-005 | Shion's undocumented unit | F-TEM-000 | Shion | number of people unknown; assessed as not more than a thousand | UNKNOWN | RESERVE |
| F-TEM-010 | Ramiris Labyrinth garrison | F-TEM-000 | Ramiris / Adalman | no numerical strength stated | UNKNOWN | DEPLOYED |
| F-DWA-001 | Dwarf Knights | - | King Gazel Dwargo | seven units of Dwarf Knights, two of them magic support units | UNKNOWN | DEPLOYED |
| F-DEM-001 | Testarossa (White Primordial) | F-TEM-000 | Testarossa | single combatant | 1 | ENGAGED |
| F-DEM-002 | Ultima | F-TEM-000 | Ultima | single combatant | 1 | ENGAGED |
| F-DRG-001 | Veldora Tempest (Storm Dragon) | F-TEM-000 | Veldora | single entity | 1 | ENGAGED |
| F-DWA-002 | Sky Knights | F-DWA-001 | King Gazel Dwargo | five hundred Sky Knights | 500 | ENGAGED |
| F-DWA-003 | Heavy armed assault force | F-DWA-001 | Dorf | no headcount stated | UNKNOWN | DEPLOYED |
| F-TEM-011 | Floor Guardian Colossus | F-TEM-010 | Gadra (rider) | single construct, airlifted by one hundred Flying Dragons | 1 | ENGAGED |
| F-TEM-012 | Kurenai advance force | F-TEM-004 | Gobya (Hakurou advising) | no headcount stated | UNKNOWN | ENGAGED |
| F-TEM-013 | Ultima's subordinates (Veyron, Zonda) | F-DEM-002 | Ultima | two named subordinates | 2 | ENGAGED |
| F-ALL-001 | Phobio the Panthertooth | F-TEM-012 | Phobio | single combatant | 1 | ENGAGED |

First Corps 12,000 + Second Corps 37,000 + Third Corps 3,000 = about 52,000 standing troops against
a national potential of 150,000. The Yellow and Orange Legions are components of the Second Corps;
the Blue Legion and the Flying Dragon element are components of the Third Corps.

## Casualty Summary

| ID | Faction | Formation | Statement | Type | Estimate | Scope |
|---|---|---|---|---|---|---|
| CAS-001 | Eastern Empire | Magic Chariot Division | 200,000 under Lieutenant General Geist | EVENT | 200,000 | EVENT_CASUALTY |
| CAS-002 | Eastern Empire | Air Combat Flying Corps | 40,000 under Major General Faraga | EVENT | 40,000 | EVENT_CASUALTY |
| CAS-003 | Eastern Empire | Surface phase combined | about 240,000 people | AGGREGATE | 240,000 | AGGREGATE_CASUALTY |
| CAS-004 | Eastern Empire | Mecha Modification Corps | more than 530,000 of the 700,000 who came by land | EVENT | 530,000 | EVENT_CASUALTY |
| CAS-005 | Eastern Empire | Imperial rear elements | ten thousand destroyed in less than an hour | COMPONENT | 10,000 | COMPONENT_CASUALTY |
| CAS-006 | Eastern Empire | Campaign total (Jura front) | a total of more than seven hundred thousand | CAMPAIGN | 770,000 | CAMPAIGN_TOTAL |
| CAS-007 | Jura-Tempest Federation | All committed formations | the battle inside the labyrinth ended without losses on our side | EVENT | 0 | EVENT_CASUALTY |
| CAS-008 | Eastern Empire | Prisoners of war | no prisoners were taken | EVENT | 0 | EVENT_CASUALTY |
| CAS-009 | Jura-Tempest Federation | All formations | not stated | UNKNOWN | UNKNOWN | UNKNOWN |
| CAS-010 | Eastern Empire | All formations | not stated | UNKNOWN | UNKNOWN | UNKNOWN |
| CAS-011 | Eastern Empire | Clown faction (Miranda) | one named individual killed by a single shot | EVENT | 1 | EVENT_CASUALTY |
| CAS-012 | Eastern Empire | Hybrid Legion field element | 60,000 troops expended as the ritual's sacrifice | EVENT | 60,000 | EVENT_CASUALTY |
| CAS-013 | Jura-Tempest Federation | Rimuru's escort party | Shion and others killed | EVENT | UNKNOWN | EVENT_CASUALTY |
| CAS-014 | Eastern Empire | Captured imperial forces | captured imperial forces returned to the Empire | EVENT | UNKNOWN | EVENT_CASUALTY |
| CAS-015 | Eastern Empire | Imperial flagship personnel | men who had died once, aboard the imperial flagship | EVENT | UNKNOWN | EVENT_CASUALTY |
| CAS-016 | Eastern Empire | Imperial war power (qualitative) | more than two-thirds of our war power | CAMPAIGN | UNKNOWN | CAMPAIGN_TOTAL |
| CAS-003 (240,000), CAS-005 (10,000) and CAS-006 (770,000) are AGGREGATE or COMPONENT rows and are EXCLUDED from the totals above. | None | None | None | UNKNOWN | UNKNOWN | UNKNOWN |
| CAS-013 (Tempest deaths in the sealed space) has no stated number; it is not converted to a figure. | None | None | None | UNKNOWN | UNKNOWN | UNKNOWN |
| CAS-008 zero POW is scoped to the Jura surface phase only; CAS-014 confirms prisoners in later phases. | None | None | None | UNKNOWN | UNKNOWN | UNKNOWN |

**Reconciled campaign totals** — EVENT_CASUALTY rows only, aggregates excluded:

| Line | Figure |
|---|---|
| Empire KIA, Jura surface phase | 240,000 |
| Empire KIA, Jura labyrinth phase | 530,000 |
| **Empire KIA, Jura front total** | **770,000** |
| Empire KIA, other theatres (Miranda + ritual sacrifice) | 60,001 |
| **Empire KIA, campaign total** | **830,001** |
| Tempest KIA, confirmed numeric | 0 |
| Tempest KIA, not numerically stated | Shion and others (CAS-013), minimum 1 |
| Empire POW, Jura surface phase | 0 (explicit) |
| Empire POW, later phases | UNKNOWN (CAS-014) |
| WIA, both sides, all phases | UNKNOWN |
| MIA, both sides, all phases | UNKNOWN |

CAS-003 (240,000), CAS-005 (10,000) and CAS-006 (770,000) are aggregates or components of other
rows and are excluded from the arithmetic. Of the 940,000 committed to the Jura front, roughly
**170,000 remain unaccounted for** and are carried as unknown rather than assumed dead.

A correction made in this revision: nine casualty rows previously carried `WIA = 0`. The corpus
never states zero wounded anywhere, so those were `UNKNOWN` silently converted to zero. All WIA
fields now read `UNKNOWN`. The POW zeros are retained, because V13 Ch3 does explicitly state that
no prisoners were taken in the surface phase.

## Command Structure

| ID | Commander | Faction | Role | Command scope | Status |
|---|---|---|---|---|---|
| CMD-001 | Rimuru Tempest | Jura-Tempest Federation | Head of state | National command | IN COMMAND |
| CMD-002 | Benimaru | Jura-Tempest Federation | Supreme General | All Tempest field forces | IN COMMAND |
| CMD-003 | Gobta | Jura-Tempest Federation | Corps commander | First Corps / Green Legion (12,000) | IN COMMAND |
| CMD-004 | Geld | Jura-Tempest Federation | Corps commander | Second Corps (37,000) | IN COMMAND |
| CMD-005 | Gabil | Jura-Tempest Federation | Corps commander | Third Corps (3,000) + Flying Dragons | COMMAND DELEGATED TO DORF |
| CMD-006 | Gobya | Jura-Tempest Federation | Detachment commander | Kurenai advance force | IN COMMAND |
| CMD-007 | Hakurou | Jura-Tempest Federation | Advisor | Kurenai advance force | ADVISORY |
| CMD-008 | Ramiris | Jura-Tempest Federation | Theatre commander | Ramiris Labyrinth | IN COMMAND |
| CMD-009 | Adalman | Jura-Tempest Federation | Sector commander | Labyrinth undead formations | IN COMMAND |
| CMD-010 | Testarossa | Jura-Tempest Federation | Independent element, later ambassador | Own element; embassy to the Empire | REASSIGNED TO EMBASSY |
| CMD-020 | King Gazel Dwargo | Armed Nation of Dwargon | Head of state and field commander | All Dwargon forces | IN COMMAND |
| CMD-021 | Dorf | Armed Nation of Dwargon | Formation commander | Heavy assault force; later joint eastern-front command | ASSUMED JOINT COMMAND |
| CMD-030 | Emperor Rudra Nam Ul Nasca | Eastern Empire | Head of state | Imperial mobilization authority | SUPERSEDED |
| CMD-031 | Marshal Calgurio / Caligulio | Eastern Empire | Marshal | Mechs Legion; supreme field command of the invasion | SURVIVED, IMPERIAL DELEGATE |
| CMD-032 | Lieutenant General Geist | Eastern Empire | Lieutenant General | Magic Chariot Division (200,000) | KILLED IN ACTION |
| CMD-033 | Major General Faraga | Eastern Empire | Major General | Air Combat Flying Corps (40,000, 400 airships) | KILLED IN ACTION |
| CMD-034 | Major General Minute / Minitz | Eastern Empire | Major General | Not specified in the corpus | SURVIVED, IMPERIAL DELEGATE |
| CMD-035 | Grand Admiral Gladim | Eastern Empire | Grand Admiral | Warcraft Legion (30,000) | IN COMMAND |
| CMD-036 | Yuuki Kagurazaka | Eastern Empire | Legion commander | Hybrid Legion (200,000 / 100,000 effective) | IN COMMAND, CONSPIRACY COMPROMISED |
| CMD-037 | Lieutenant Tatsuya Kondo | Eastern Empire | Intelligence officer | Imperial Intelligence Service / Near Guard | IN COMMAND |
| CMD-038 | Velgrynd (Scorch Dragon) | Eastern Empire | Marshal and guardian dragon | Imperial strategic direction | SURVIVED, KINGMAKER |
| CMD-039 | Samuel | Eastern Empire | Flotilla commander | 300-airship transport flotilla | IN COMMAND |
| CMD-040 | Masayuki | Eastern Empire | Emperor | Imperial head of state | ACCEDED |
| CMD-041 | Hybrid Legion blockade force | Eastern Empire | (command vacuum) | Blockade of the Dwargon eastern metropolis | COMMAND COLLAPSED |

### Command changes

| Event | Frame | Change |
|---|---|---|
| EVT-0117 | FRAME_5829 | General retreat ordered |
| EVT-0119 | FRAME_5839 | Surface phase concluded - both imperial formations annihilated |
| EVT-0207 | FRAME_6253 | Labyrinth phase concluded |
| EVT-0315 | FRAME_6755 | Kondo kills Miranda with a single pistol shot |
| EVT-0316 | FRAME_6756 | Kondo extracts Miranda's knowledge with the skill Reader |
| EVT-0321 | FRAME_6856 | Command authority collapses in the blockade force |
| EVT-0348 | FRAME_6964 | Gabil and Dorf agree a joint scheme of manoeuvre |
| EVT-0361 | FRAME_6973 | Rimuru's party isolated into a sealed space |
| EVT-0394 | FRAME_7173 | Masayuki installed as the new emperor |

## Major Battles

| Battle | Theatre | Phase | Empire committed | Empire lost | Tempest lost |
|---|---|---|---|---|---|
| Blockade of the Eastern Metropolis | TH-DWE | APPROACH → SECOND | 60,000 | 60,000 (own ritual) | 0 |
| Battle of the Dwargon Gate | TH-DWG | ACTIVE_COMBAT | 240,000 | 240,000 | 0 |
| Battle of the Labyrinth | TH-LAB | ACTIVE_COMBAT | 700,000 | 530,000+ | 0 |
| Imperial Capital Coup Attempt | TH-CAP | SECOND_OFFENSIVE | — | 1 (Miranda) | 0 |
| Dragon Engagement over the Great Jura Forest | TH-DRG | SECOND_OFFENSIVE | 1 | 0 | 0 |
| Battle of the Dwargon Eastern Front | TH-DWE | SECOND_OFFENSIVE | UNKNOWN | UNKNOWN | UNKNOWN |
| Imperial Capital Confrontation | TH-CAP | SECOND_OFFENSIVE | UNKNOWN | UNKNOWN | UNKNOWN (min 1) |
| Warcraft Legion Air Movement | TH-CAP | SECOND_OFFENSIVE | 30,000 | 0 | 0 |

## Major Individual Combatants

| Actor | Faction | First | Last | Final status | Battlefield effect |
|---|---|---|---|---|---|
| Rimuru Tempest | Jura-Tempest Federation | EVT-0004 | EVT-0398 | ACTIVE | Head of state; aerial reconnaissance; infiltration of the Imperial Capital; settlement |
| Benimaru | Jura-Tempest Federation | EVT-0004 | EVT-0390 | ACTIVE | Supreme General; directed the double feigned defeat; present at the sealed space and the summit |
| Gobta | Jura-Tempest Federation | EVT-0006 | EVT-0119 | ACTIVE | First Corps; wolf-rider charge; Blizzard Wolf Dance |
| Gabil | Jura-Tempest Federation | EVT-0006 | EVT-0349 | ACTIVE | Third Corps; airship boarding actions; Colossus airlift; solo attack on the eastern front |
| Veldora Tempest | Jura-Tempest Federation | EVT-0115 | EVT-0397 | ACTIVE | Flame of Destruction; duel with Velgrynd; erasure of the defeat from imperial memory |
| Testarossa | Jura-Tempest Federation | EVT-0005 | EVT-0396 | ACTIVE | Envoy; closed the imperial retreat; decisive victory; ambassador to the Empire |
| Ultima | Jura-Tempest Federation | EVT-0114 | EVT-0351 | ACTIVE | Engaged Faraga's flagship; despatched Veyron and Zonda |
| Adalman | Jura-Tempest Federation | EVT-0203 | EVT-0383 | ACTIVE | Labyrinth attrition; Floor 70 defence; the undead taboo spell |
| Ramiris | Jura-Tempest Federation | EVT-0202 | EVT-0333 | ACTIVE | Labyrinth structure, severing and revival; preserved the capital city |
| Diablo | Jura-Tempest Federation | EVT-0380 | EVT-0390 | ACTIVE | Withheld from battle by choice; battlefield administration; summit attendee |
| Shion | Jura-Tempest Federation | EVT-0362 | EVT-0390 | KILLED, LATER PRESENT AT SUMMIT | Killed in the sealed space; present at the V16 summit |
| Gobya | Jura-Tempest Federation | EVT-0350 | EVT-0350 | ACTIVE | Led the Kurenai advance force onto the eastern front |
| Hakurou | Jura-Tempest Federation | EVT-0350 | EVT-0350 | ACTIVE | Advisor to the Kurenai advance force |
| Gadra | Jura-Tempest Federation | EVT-0317 | EVT-0347 | DEFECTED TO TEMPEST | Relayed encrypted contact; rode and fired the Floor Guardian Colossus at Velgrynd |
| Phobio the Panthertooth | Beast Kingdom Eurazania | EVT-0350 | EVT-0350 | ACTIVE | Attached to Gobya's force on the eastern front |
| King Gazel Dwargo | Armed Nation of Dwargon | EVT-0007 | EVT-0345 | ACTIVE | Fortified the gate; assessed the campaign; committed the Sky Knights |
| Dorf | Armed Nation of Dwargon | EVT-0344 | EVT-0348 | ACTIVE | Heavy assault force; took joint command with Gabil |
| Ben | Armed Nation of Dwargon | EVT-0340 | EVT-0345 | ACTIVE | Counsel to Gazel on the eastern front |
| Anrietta | Armed Nation of Dwargon | EVT-0342 | EVT-0342 | ACTIVE | Detected the ritual behind the Scorch Dragon |
| Emperor Rudra Nam Ul Nasca | Eastern Empire | EVT-0001 | EVT-0381 | SUPERSEDED | Ordered mobilisation; the truth of the throne uncovered |
| Marshal Calgurio / Caligulio | Eastern Empire | EVT-0201 | EVT-0390 | SURVIVED | Supreme field command; confronted operational failure; imperial summit delegate |
| Lieutenant General Geist | Eastern Empire | EVT-0101 | EVT-0119 | KILLED | Chariot fortress; ordered the withdrawal; lost with his division |
| Major General Faraga | Eastern Empire | EVT-0106 | EVT-0115 | KILLED | Deployed the Mana Disruptor Radiation; lost with the air corps |
| Major General Minute / Minitz | Eastern Empire | EVT-0001 | EVT-0390 | SURVIVED | Named commander; imperial summit delegate |
| Grand Admiral Gladim | Eastern Empire | EVT-0370 | EVT-0372 | ACTIVE | Commanded the 30,000 Warcraft Legion; ambitions for pre-eminence |
| Lieutenant Tatsuya Kondo | Eastern Empire | EVT-0313 | EVT-0348 | ACTIVE | Intercepted and killed Miranda; used the skill Reader; ritual on the eastern front |
| Miranda | Eastern Empire | EVT-0310 | EVT-0315 | KILLED | Coup preparation in the Imperial Capital; killed by Kondo |
| Yuuki Kagurazaka | Eastern Empire | EVT-0310 | EVT-0318 | ACTIVE | Hybrid Legion; led the coup conspiracy; coordinated with Tempest via Gadra |
| Velgrynd (Scorch Dragon) | Eastern Empire | EVT-0330 | EVT-0394 | SURVIVED | Duel with Veldora; destroyed the labyrinth gate; Marshal aboard the flotilla; named the new emperor |
| Samuel | Eastern Empire | EVT-0370 | EVT-0373 | ACTIVE | Commanded the 300-airship transport flotilla |
| Masayuki | Eastern Empire | EVT-0390 | EVT-0394 | NEW EMPEROR | Imperial principal at the summit; installed as emperor by Velgrynd |

## Movement Summary

| ID | Force | From | To | Type | Basis | Confidence |
|---|---|---|---|---|---|---|
| MOV-001 | F-EMP-010 | Eastern Empire | Great Jura Forest / Dwargon approach | ADVANCE | SIMULATION_RECONSTRUCTED | MEDIUM |
| MOV-002 | F-TEM-001 | Tempest | Dwargon outer gate | DEPLOYMENT | SIMULATION_RECONSTRUCTED | HIGH |
| MOV-003 | F-TEM-001 | Green Legion start line | Imperial chariot line | BREAKTHROUGH | EXPLICIT_RELATIVE | HIGH |
| MOV-004 | F-EMP-012 | Chariot line | Linked fortress position | ENCIRCLEMENT | SIMULATION_RECONSTRUCTED | HIGH |
| MOV-005 | F-TEM-001 | Encircled position | Feigned withdrawal line | RETREAT | SIMULATION_RECONSTRUCTED | HIGH |
| MOV-006 | F-EMP-012 | Dwargon Gate Front | Attempted rally point | WITHDRAWAL | SIMULATION_RECONSTRUCTED | HIGH |
| MOV-007 | F-EMP-011 | Great Jura Forest | Ramiris Labyrinth interior | ADVANCE | DAY_LEVEL_CANON | HIGH |
| MOV-008 | F-EMP-031 | Eastern Empire | Dwargon eastern metropolis | DEPLOYMENT | SIMULATION_RECONSTRUCTED | MEDIUM |
| MOV-009 | F-EMP-070 | Imperial theatre | Airspace over the Great Jura Forest | REPOSITION | SIMULATION_RECONSTRUCTED | LOW |
| MOV-010 | F-TEM-011 | Ramiris Labyrinth | Dwargon eastern front | REINFORCEMENT | SIMULATION_RECONSTRUCTED | HIGH |
| MOV-011 | F-TEM-003 | Dwargon Gate Front | Dwargon eastern front | REINFORCEMENT | SIMULATION_RECONSTRUCTED | HIGH |
| MOV-012 | F-TEM-012 | Tempest | Dwargon eastern front | REINFORCEMENT | EXPLICIT_RELATIVE | MEDIUM |
| MOV-013 | F-DWA-002 | Dwargon defensive line | Ritual caster position | ADVANCE | SIMULATION_RECONSTRUCTED | HIGH |
| MOV-014 | F-EMP-020 | Eastern Empire | Central continent (via northern Ingracia) | IN_TRANSIT | SEQUENTIAL_CANON | MEDIUM |
| MOV-015 | F-EMP-060 | Airspace over northern Ingracia | UNKNOWN | IN_TRANSIT | SIMULATION_RECONSTRUCTED | LOW |
| MOV-016 | F-TEM-000 | Tempest | Imperial Capital | IN_TRANSIT | SIMULATION_RECONSTRUCTED | MEDIUM |
| MOV-017 | F-DEM-001 | Imperial theatre | Embassy in the Empire | DEPLOYMENT | SEQUENTIAL_CANON | HIGH |
| MOV-018 | F-EMP-010 | Eastern Empire interior | Tempest border | ADVANCE | SIMULATION_RECONSTRUCTED | MEDIUM |
| MOV-019 | F-EMP-010 | Tempest border | Edge of the Great Jura Forest | ADVANCE | SEQUENTIAL_CANON | MEDIUM |
| MOV-020 | F-EMP-011 | Edge of the Great Jura Forest | Great Jura Forest interior | DEPLOYMENT | SEQUENTIAL_CANON | HIGH |
| MOV-021 | F-TEM-001 | Tempest | Inn town on the imperial line of march | DEPLOYMENT | SIMULATION_RECONSTRUCTED | MEDIUM |
| MOV-022 | F-TEM-001 | Inn town | Ten kilometres from the imperial line | ADVANCE | SEQUENTIAL_CANON | HIGH |

No force teleports. Where only origin and destination are known, the transition is carried as
`IN_TRANSIT` across intermediate frames and marked `SIMULATION_RECONSTRUCTED`. The one exception is
MOV-015, Velgrynd's space-time jump, which the corpus establishes as instantaneous and whose
destination is not stated — recorded as `UNKNOWN` rather than guessed. See AMB-009.

## Territorial State

| Location | Theatre | Before | After | Change event |
|---|---|---|---|---|
| Eastern approaches to the Great Jura Forest | TH-DWG | EMPIRE_CONTROLLED | CONTESTED | EVT-0015 |
| Great Jura Forest (eastern reaches) | TH-DWG | TEMPEST_CONTROLLED | CONTESTED | EVT-0020 |
| Dwargon Gate Front | TH-DWG | CONTESTED | TEMPEST_CONTROLLED | EVT-0119 |
| Airspace over the Dwargon Gate Front | TH-DWG | CONTESTED | TEMPEST_CONTROLLED | EVT-0115 |
| Ramiris Labyrinth interior | TH-LAB | TEMPEST_CONTROLLED | TEMPEST_CONTROLLED | EVT-0207 |
| Labyrinth gate and upper floors | TH-LAB | TEMPEST_CONTROLLED | DESTROYED | EVT-0332 |
| Rimuru, the Tempest capital | TH-LAB | TEMPEST_CONTROLLED | TEMPEST_CONTROLLED | EVT-0333 |
| Great Jura Forest (surface) | TH-DRG | TEMPEST_CONTROLLED | DESTROYED | EVT-0331 |
| Dwargon eastern metropolis (Isthmus gate) | TH-DWE | DWARGON_CONTROLLED | CONTESTED | EVT-0016 |
| Ritual position behind the Scorch Dragon | TH-DWE | EMPIRE_CONTROLLED | CONTESTED | EVT-0345 |
| Imperial Capital (Tidu) | TH-CAP | EMPIRE_CONTROLLED | EMPIRE_CONTROLLED | EVT-0315 |
| Sealed space, Imperial Capital | TH-CAP | EMPIRE_CONTROLLED | CONTESTED | EVT-0361 |
| Airspace over northern Ingracia | TH-CAP | NEUTRAL | EMPIRE_CONTROLLED | EVT-0370 |
| Eastern Empire (post-war) | TH-DIP | EMPIRE_CONTROLLED | EMPIRE_CONTROLLED | EVT-0394 |

Troop presence is not treated as ownership. The Dwargon eastern metropolis was blockaded but never
fell; the Great Jura Forest was burned but never changed hands; and no territory at all changed
owner in the settlement.

## Major Turning Points

1. **FRAME_5089 (EVT-0015)** — The Imperial Army forces the Tempest border. The invasion becomes fact.
2. **FRAME_5539 (EVT-0020)** — Seven hundred thousand enter the forest — about seventy percent of imperial strength committed to one theatre.
3. **FRAME_5799 (EVT-0102)** — Tempest opens the battle. The Empire never regains the initiative.
4. **FRAME_5807 (EVT-0107)** — The chariot fortress encircles the Green Legion. Peak imperial position of the war.
5. **FRAME_5811 (EVT-0109)** — The feigned defeat. The Empire commits deeper into the trap.
6. **FRAME_5815 (EVT-0111)** — Blizzard Wolf Dance shatters the chariot mass. Ground battle decided.
7. **FRAME_5825 (EVT-0115)** — The Air Combat Flying Corps is annihilated entire. Air battle decided.
8. **FRAME_5831 (EVT-0118)** — Testarossa closes the retreat. Withdrawal becomes annihilation.
9. **FRAME_5953 (EVT-0201)** — The ground army enters the labyrinth. The decisive operational error of the campaign.
10. **FRAME_6755 (EVT-0315)** — Kondo kills Miranda. The internal coup collapses before it begins.
11. **FRAME_6903 (EVT-0332)** — Velgrynd destroys the labyrinth gate. Tempest's principal defensive asset is disabled.
12. **FRAME_6955 (EVT-0343)** — The Empire consumes 60,000 of its own troops in a ritual.
13. **FRAME_6977 (EVT-0363)** — The imperial objective is revealed as the capture of Veldora, not territory.
14. **FRAME_7141 (EVT-0384)** — The Empire proposes an armistice. The war ends.
15. **FRAME_7173 (EVT-0394)** — Masayuki is installed as emperor by Velgrynd. Tempest backs the successor state.

---

# Full Campaign Timeline

All 7,200 keyframes exist in the `Timeline` sheet of the workbook. This narrative compresses
purely inherited frames for readability and presents the hours in which the campaign state
meaningfully changes.

## 01/01/9001  ·  Campaign day C+00  ·  Battle day D-40

### 08:00–08:59  ·  C+00:08:00  ·  B-40:08:00

**Phase:** STRATEGIC_PREPARATION · **Stage:** STRATEGIC_CAMPAIGN_START

**What happened.** Imperial mobilization ordered.

**Where.** Imperial Capital. **Battles:** No active battle (Imperial Capital:FORMING).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire STATIONARY (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Rimuru (Tempest head of state); Emperor Rudra ordering mobilization
- **Territorial state** — Imperial Capital: EMPIRE_CONTROLLED
- **Frontline** — Imperial Capital: Imperial mobilization under way

**Significance and frame detail**

#### FRAME_0049 — 08:00-08:10 01/01/9001

**EVT-0001 · MOBILIZATION — Imperial mobilization ordered**

- Theatre: Imperial Capital (TH-CAP) · Front: Strategic rear · Battle: -
- Actor: Emperor Rudra Nam Ul Nasca (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Imperial Capital
- Immediate result: Field army released for deployment
- Operational consequence: Invasion of the Great Jura Forest set in motion
- Strategic significance: Empire commits to war with Tempest
- Graph: CAMPAIGN START → **EVT-0001** → EVT-0002
- Canonical time: before the invasion · Time basis: `DAY_LEVEL_CANON` · Time confidence: LOW · Overall: MEDIUM
- Source: V12 Ch4 — V12 Ch4 - imperial legion overview and mobilization order
- Note: Exact date not given in source.

State change: commanders: Rimuru (Tempest head of state); Emperor Rudra (Empire) -> Rimuru (Tempest head of state); Emperor Rudra ordering mobilization | Imperial Capital theatre status: INACTIVE -> ACTIVE | Imperial Capital frontline changed | Imperial Capital battle status: NOT_STARTED -> FORMING

### 09:00–09:59  ·  C+00:09:00  ·  B-40:09:00

**Phase:** STRATEGIC_PREPARATION · **Stage:** STRATEGIC_CAMPAIGN_START

**What happened.** Assessment of Western war potential.

**Where.** Imperial Capital. **Battles:** No active battle (Imperial Capital:FORMING).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire STATIONARY (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Rimuru (Tempest head of state); Emperor Rudra ordering mobilization
- **Territorial state** — Imperial Capital: EMPIRE_CONTROLLED
- **Frontline** — Imperial Capital: Imperial mobilization under way

**Significance and frame detail**

#### FRAME_0055 — 09:00-09:10 01/01/9001

**EVT-0002 · INTELLIGENCE — Assessment of Western war potential**

- Theatre: Imperial Capital (TH-CAP) · Front: Strategic rear · Battle: -
- Actor: Imperial Intelligence Bureau (Eastern Empire) vs Western Nations (Western Nations) at Imperial Capital
- Immediate result: Western states assessed at under one million, realistically 400,000
- Operational consequence: Empire concludes overwhelming superiority
- Strategic significance: Imperial confidence set for the campaign
- Graph: EVT-0001 → **EVT-0002** → EVT-0009
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: MEDIUM
- Source: V12 Ch4 — V12 Ch4 - intelligence estimate of Western strength
- Note: Basis of imperial confidence.

State change: INHERITED_STATE

## 02/01/9001  ·  Campaign day C+01  ·  Battle day D-39

### 14:00–14:59  ·  C+01:14:00  ·  B-39:14:00

**Phase:** STRATEGIC_PREPARATION · **Stage:** INVASION_PREPARATION

**What happened.** Gadra warns Yuuki and reports to Rimuru.

**Where.** Imperial Capital. **Battles:** No active battle (Imperial Capital:FORMING).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire STATIONARY (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Rimuru (Tempest head of state); Emperor Rudra ordering mobilization
- **Territorial state** — Imperial Capital: EMPIRE_CONTROLLED
- **Frontline** — Imperial Capital: Imperial mobilization under way

**Significance and frame detail**

#### FRAME_0229 — 14:00-14:10 02/01/9001

**EVT-0009 · INTELLIGENCE — Gadra warns Yuuki and reports to Rimuru**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial rear · Battle: -
- Actor: Gadra (Eastern Empire) vs Imperial government (Eastern Empire) at Yuuki's office, Imperial Capital
- Immediate result: Gadra ends the magic call with Yuuki, then reports and liaises with Rimuru
- Operational consequence: An imperial minister begins working to Tempest's benefit
- Strategic significance: Tempest gains a source inside the imperial ministry
- Graph: EVT-0002 → **EVT-0009** → EVT-0004
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V13 Prologue — V13 Prologue - Gadra's magic call and report
- Note: Yuuki notes Gadra appears to be defecting to Rimuru's side.

State change: INHERITED_STATE

## 03/01/9001  ·  Campaign day C+02  ·  Battle day D-38

### 10:00–10:59  ·  C+02:10:00  ·  B-38:10:00

**Phase:** INVASION_PREPARATION · **Stage:** INVASION_PREPARATION

**What happened.** Four-corps order of battle confirmed.

**Where.** Dwargon Gate Front; Imperial Capital. **Battles:** No active battle (Dwargon Gate:NOT_STARTED; Imperial Capital:FORMING).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire STATIONARY (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Emperor Rudra (Empire)
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED
- **Frontline** — Dwargon Gate: No imperial force in the theatre || Imperial Capital: Imperial mobilization under way

**Significance and frame detail**

#### FRAME_0349 — 10:00-10:10 03/01/9001

**EVT-0004 · STRATEGIC_PREPARATION — Four-corps order of battle confirmed**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Command · Battle: -
- Actor: Rimuru Tempest / Benimaru (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Tempest control room
- Immediate result: First, Second, Third and Fourth Corps established
- Operational consequence: Command structure fixed for the campaign
- Strategic significance: Tempest able to field 150,000 at national potential
- Graph: EVT-0009 → **EVT-0004** → EVT-0010
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V12 Ch2 — V12 Ch2 - corps organisation and troop registry
- Note: Standing force about 52,000; national potential 150,000.

State change: commanders: Rimuru (Tempest head of state); Emperor Rudra ordering mobilization -> Benimaru Supreme General (Tempest); Emperor Rudra (Empire) | Dwargon Gate theatre status: INACTIVE -> ACTIVE

### 16:00–16:59  ·  C+02:16:00  ·  B-38:16:00

**Phase:** INVASION_PREPARATION · **Stage:** INVASION_PREPARATION

**What happened.** Yuuki assesses Gadra's intelligence with Kagali.

**Where.** Dwargon Gate Front; Imperial Capital. **Battles:** No active battle (Dwargon Gate:NOT_STARTED; Imperial Capital:FORMING).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire STATIONARY (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Emperor Rudra (Empire)
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED
- **Frontline** — Dwargon Gate: No imperial force in the theatre || Imperial Capital: Imperial mobilization under way

**Significance and frame detail**

#### FRAME_0385 — 16:00-16:10 03/01/9001

**EVT-0010 · INTELLIGENCE — Yuuki assesses Gadra's intelligence with Kagali**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial rear · Battle: -
- Actor: Yuuki Kagurazaka (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Yuuki's office, Imperial Capital
- Immediate result: Gadra assessed as too cunning to be trusted wholly but useful; a watcher observes Yuuki in the rain
- Operational consequence: Imperial internal factions begin manoeuvring against one another
- Strategic significance: The Empire is divided before the campaign opens
- Graph: EVT-0004 → **EVT-0010** → EVT-0003
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: MEDIUM
- Source: V13 Prologue — V13 Prologue - Yuuki and Kagali discuss Gadra
- Note: Gadra's message concerned Masayuki and Emperor Rudra.

State change: INHERITED_STATE

## 04/01/9001  ·  Campaign day C+03  ·  Battle day D-37

### 08:00–08:59  ·  C+03:08:00  ·  B-37:08:00

**Phase:** OPERATIONAL_APPROACH · **Stage:** OPERATIONAL_INVASION_START

**What happened.** Invasion column begins its advance.

**Where.** Dwargon Gate Front; Imperial Capital. **Battles:** No active battle (Dwargon Gate:FORMING; Imperial Capital:FORMING).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire ADVANCING (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Emperor Rudra (Empire)
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED
- **Frontline** — Dwargon Gate: Imperial invasion column on the march || Imperial Capital: Imperial mobilization under way

**Significance and frame detail**

#### FRAME_0481 — 08:00-08:10 04/01/9001

**EVT-0003 · DEPLOYMENT — Invasion column begins its advance**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon approach · Battle: -
- Actor: Magic Chariot Division (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Eastern approaches
- Immediate result: Advance begins, deliberately slower than forecast
- Operational consequence: Tempest gains additional preparation time
- Strategic significance: Strategic surprise forfeited by the Empire
- Graph: EVT-0010 → **EVT-0003** → EVT-0011
- Canonical time: the chariot force was expected in about twenty-nine days or more · Time basis: `EXPLICIT_RELATIVE` · Time confidence: MEDIUM · Overall: MEDIUM
- Source: V13 Prologue — V13 Prologue - advance slower than the twenty-nine day estimate
- Note: Empire slowed deliberately for display of power.

State change: Empire movement: STATIONARY -> ADVANCING | imperial column location: Eastern Empire interior -> Eastern Empire interior, marching west | Dwargon Gate frontline changed | Dwargon Gate battle status: NOT_STARTED -> FORMING

## 05/01/9001  ·  Campaign day C+04  ·  Battle day D-36

### 08:00–08:59  ·  C+04:08:00  ·  B-36:08:00

**Phase:** OPERATIONAL_APPROACH · **Stage:** OPERATIONAL_INVASION_START

**What happened.** Control Room placed on a war footing.

**Where.** Dwargon Gate Front; Imperial Capital. **Battles:** No active battle (Dwargon Gate:FORMING; Imperial Capital:FORMING).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire ADVANCING (retreating: NO)
- **Approach** — imperial column at 3% of the march (simulation interpolation); In transit, 3% of the way from the imperial interior to the forest edge
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Emperor Rudra (Empire)
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED
- **Frontline** — Dwargon Gate: Imperial invasion column on the march || Imperial Capital: Imperial mobilization under way

**Significance and frame detail**

#### FRAME_0625 — 08:00-08:10 05/01/9001

**EVT-0011 · STRATEGIC_PREPARATION — Control Room placed on a war footing**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Tempest rear · Battle: -
- Actor: Rimuru Tempest / Benimaru (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Tempest Control Room
- Immediate result: Staff watch established on three shifts, day and night, to track imperial movement
- Operational consequence: Tempest maintains continuous surveillance of the approach
- Strategic significance: Tempest will not be surprised by the invasion
- Graph: EVT-0003 → **EVT-0011** → EVT-0005
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - the Control Room and its three-shift watch
- Note: Souei, Shion, Diablo and Geld also present.

State change: INHERITED_STATE

## 17/01/9001  ·  Campaign day C+16  ·  Battle day D-24

### 10:00–10:59  ·  C+16:10:00  ·  B-24:10:00

**Phase:** OPERATIONAL_APPROACH · **Stage:** OPERATIONAL_INVASION_START

**What happened.** Testarossa despatched as envoy to the Empire.

**Where.** Dwargon Gate Front; Imperial Capital. **Battles:** No active battle (Dwargon Gate:FORMING; Imperial Capital:FORMING).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire ADVANCING (retreating: NO)
- **Approach** — imperial column at 37% of the march (simulation interpolation); In transit, 37% of the way from the imperial interior to the forest edge
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Emperor Rudra (Empire)
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED
- **Frontline** — Dwargon Gate: Imperial invasion column on the march || Imperial Capital: Imperial mobilization under way

**Significance and frame detail**

#### FRAME_2365 — 10:00-10:10 17/01/9001

**EVT-0005 · COMMAND — Testarossa despatched as envoy to the Empire**

- Theatre: Imperial Capital (TH-CAP) · Front: Command · Battle: -
- Actor: Rimuru Tempest (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Tempest
- Immediate result: Diplomatic contact opened before hostilities
- Operational consequence: Formal casus belli established
- Strategic significance: War begins on a declared footing
- Graph: EVT-0011 → **EVT-0005** → EVT-0012
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: MEDIUM
- Source: V13 Ch1 — V13 Ch1 - Testarossa selected as envoy

State change: INHERITED_STATE

## 02/02/9001  ·  Campaign day C+32  ·  Battle day D-8

### 12:00–12:59  ·  C+32:12:00  ·  B-08:12:00

**Phase:** OPERATIONAL_APPROACH · **Stage:** OPERATIONAL_APPROACH

**What happened.** A month passes with no imperial movement.

**Where.** Dwargon Gate Front; Imperial Capital. **Battles:** No active battle (Dwargon Gate:FORMING; Imperial Capital:FORMING).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire STATIONARY (retreating: NO)
- **Approach** — imperial column at 83% of the march (simulation interpolation); In transit, 83% of the way from the imperial interior to the forest edge
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Emperor Rudra (Empire)
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED
- **Frontline** — Dwargon Gate: Imperial column halted; no movement for a month || Imperial Capital: Imperial mobilization under way

**Significance and frame detail**

#### FRAME_4681 — 12:00-12:10 02/02/9001

**EVT-0012 · INTELLIGENCE — A month passes with no imperial movement**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Tempest rear · Battle: -
- Actor: Rimuru Tempest (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Tempest
- Immediate result: No enemy movement after a month; Veldora and Ramiris stand down to their institute out of boredom
- Operational consequence: Tempest strategic reserve released from readiness
- Strategic significance: Waiting imposes a cost on Tempest readiness
- Graph: EVT-0005 → **EVT-0012** → EVT-0013
- Canonical time: a month has passed since the subordinates' gathering met · Time basis: `EXPLICIT_RELATIVE` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - a month elapsed, no movement
- Note: Explicit month-scale anchor for the approach period.

State change: Empire movement: ADVANCING -> STATIONARY | Dwargon Gate frontline changed

## 03/02/9001  ·  Campaign day C+33  ·  Battle day D-7

### 10:00–10:59  ·  C+33:10:00  ·  B-07:10:00

**Phase:** OPERATIONAL_APPROACH · **Stage:** OPERATIONAL_APPROACH

**What happened.** Column advances deliberately slowly as a display of power.

**Where.** Dwargon Gate Front; Imperial Capital. **Battles:** No active battle (Dwargon Gate:FORMING; Imperial Capital:FORMING).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire ADVANCING (retreating: NO)
- **Approach** — imperial column at 86% of the march (simulation interpolation); In transit, 86% of the way from the imperial interior to the forest edge
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Emperor Rudra (Empire)
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED
- **Frontline** — Dwargon Gate: Imperial column advancing deliberately slowly as a display of power || Imperial Capital: Imperial mobilization under way

**Significance and frame detail**

#### FRAME_4813 — 10:00-10:10 03/02/9001

**EVT-0013 · MOVEMENT — Column advances deliberately slowly as a display of power**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Imperial approach · Battle: -
- Actor: Invasion Army (Eastern Empire) vs Great Jura Forest (Jura-Tempest Federation) at Great Jura Forest, eastern reaches
- Immediate result: The advance is slower than the twenty-nine day estimate; the Empire slows deliberately to display its might
- Operational consequence: The approach becomes psychological as much as military
- Strategic significance: Tempest gains further preparation time it did not expect
- Graph: EVT-0012 → **EVT-0013** → EVT-0014
- Canonical time: the invasion was slower than expected · Time basis: `EXPLICIT_RELATIVE` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - the invasion slower than expected, deliberately so

State change: Empire movement: STATIONARY -> ADVANCING | Dwargon Gate frontline changed

## 04/02/9001  ·  Campaign day C+34  ·  Battle day D-6

### 09:00–09:59  ·  C+34:09:00  ·  B-06:09:00

**Phase:** OPERATIONAL_APPROACH · **Stage:** OPERATIONAL_APPROACH

**What happened.** The column's advance drives the forest fauna out.

**Where.** Dwargon Gate Front; Imperial Capital. **Battles:** No active battle (Dwargon Gate:FORMING; Imperial Capital:FORMING).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire ADVANCING (retreating: NO)
- **Approach** — imperial column at 88% of the march (simulation interpolation); In transit, 88% of the way from the imperial interior to the forest edge
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Emperor Rudra (Empire)
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED
- **Frontline** — Dwargon Gate: Imperial column advancing deliberately slowly as a display of power || Imperial Capital: Imperial mobilization under way

**Significance and frame detail**

#### FRAME_4951 — 09:00-09:10 04/02/9001

**EVT-0014 · MOVEMENT — The column's advance drives the forest fauna out**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Imperial approach · Battle: -
- Actor: Invasion Army (Eastern Empire) vs Forest fauna (Jura-Tempest Federation) at Great Jura Forest, eastern reaches
- Immediate result: Even sub-A rank beasts living in the forest flee the imperial line of march
- Operational consequence: The forest empties ahead of the imperial advance
- Strategic significance: The approach is observable at long range without contact
- Graph: EVT-0013 → **EVT-0014** → EVT-0015
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - sub-A beasts fleeing the imperial column
- Note: Observed by Rimuru through Argos.

State change: INHERITED_STATE

## 05/02/9001  ·  Campaign day C+35  ·  Battle day D-5

### 08:00–08:59  ·  C+35:08:00  ·  B-05:08:00

**Phase:** BORDER_CROSSING · **Stage:** BORDER_CROSSING

**What happened.** The Imperial Army crosses the Tempest border.

**Where.** Dwargon Gate Front; Imperial Capital. **Battles:** No active battle (Dwargon Gate:FORMING; Imperial Capital:FORMING).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire ADVANCING (retreating: NO)
- **Approach** — imperial column at 91% of the march (simulation interpolation); In transit, 91% of the way from the imperial interior to the forest edge
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Emperor Rudra (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED
- **Frontline** — Dwargon Gate: Imperial Army has forced the Tempest border || Imperial Capital: Imperial mobilization under way

**Significance and frame detail**

#### FRAME_5089 — 08:00-08:10 05/02/9001

**EVT-0015 · MOVEMENT — The Imperial Army crosses the Tempest border**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Imperial approach · Battle: -
- Actor: Invasion Army (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Tempest border
- Immediate result: The border is forced, contrary to international law as set by the Western council
- Operational consequence: The invasion becomes a fact rather than a threat
- Strategic significance: Tempest acquires a lawful casus belli for a pre-emptive strike
- Graph: EVT-0014 → **EVT-0015** → EVT-0016
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - the Imperial Army has crossed the border
- Note: Tempest declines to use it for a surprise attack.

State change: Dwargon Gate frontline changed | Dwargon Gate territorial control: TEMPEST_CONTROLLED -> CONTESTED

## 06/02/9001  ·  Campaign day C+36  ·  Battle day D-4

### 11:00–11:59  ·  C+36:11:00  ·  B-04:11:00

**Phase:** BORDER_CROSSING · **Stage:** BORDER_CROSSING

**What happened.** Dwargon's eastern gate is blockaded.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Blockade of the Eastern Metropolis (Dwargon Gate:FORMING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire ADVANCING (retreating: NO)
- **Approach** — imperial column at 94% of the march (simulation interpolation); In transit, 94% of the way from the imperial interior to the forest edge
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Emperor Rudra (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Imperial Army has forced the Tempest border || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5251 — 11:00-11:10 06/02/9001

**EVT-0016 · SIEGE — Dwargon's eastern gate is blockaded**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern approach · Battle: -
- Actor: Hybrid Legion field element (Eastern Empire) vs Armed Nation of Dwargon (Armed Nation of Dwargon) at Dwargon eastern gate (Isthmus)
- Immediate result: Gazel reports the eastern gate of Dwargon blocked by the Imperial Army; Rimuru suspects Yuuki's legion
- Operational consequence: A second front is opened against Dwargon before first contact
- Strategic significance: The Empire commits forces on two axes simultaneously
- Graph: EVT-0015 → **EVT-0016** → EVT-0017
- Canonical time: - · Time basis: `DAY_LEVEL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - Gazel reports the eastern gate blocked
- Note: Confirms the blockade begins in V13, earlier than the V14 Ch4 camp scene.

State change: Dwargon East theatre status: INACTIVE -> ACTIVE | Dwargon East battle: Blockade of the Eastern Metropolis | Dwargon East frontline changed | Dwargon East territorial control: DWARGON_CONTROLLED -> CONTESTED | Dwargon East battle status: NOT_STARTED -> ACTIVE

### 12:00–12:59  ·  C+36:12:00  ·  B-04:12:00

**Phase:** BORDER_CROSSING · **Stage:** BORDER_CROSSING

**What happened.** Argos imagery of the blockade obtained and shared.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Blockade of the Eastern Metropolis (Dwargon Gate:FORMING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire ADVANCING (retreating: NO)
- **Approach** — imperial column at 94% of the march (simulation interpolation); In transit, 94% of the way from the imperial interior to the forest edge
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Emperor Rudra (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Imperial Army has forced the Tempest border || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5257 — 12:00-12:10 06/02/9001

**EVT-0017 · RECONNAISSANCE — Argos imagery of the blockade obtained and shared**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern approach · Battle: -
- Actor: Rimuru Tempest (Argos observation) (Jura-Tempest Federation) vs Hybrid Legion field element (Eastern Empire) at Imperial territory
- Immediate result: Distance and a magical barrier degrade the imagery, but a group blocking the eastern road is visible
- Operational consequence: Allied command shares a common intelligence picture
- Strategic significance: Dwargon's suspicion of a trap is partly allayed
- Graph: EVT-0016 → **EVT-0017** → EVT-0018
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - Argos imagery, barrier interference
- Note: Gadra's reliability explicitly not assumed at one hundred percent.

State change: INHERITED_STATE

## 07/02/9001  ·  Campaign day C+37  ·  Battle day D-3

### 14:00–14:59  ·  C+37:14:00  ·  B-03:14:00

**Phase:** DEPLOYMENT · **Stage:** DEPLOYMENT

**What happened.** Allied division of tasks confirmed between Tempest and Dwargon.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Blockade of the Eastern Metropolis (Dwargon Gate:FORMING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire ADVANCING (retreating: NO)
- **Approach** — imperial column at 98% of the march (simulation interpolation); In transit, 98% of the way from the imperial interior to the forest edge
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Imperial Army has forced the Tempest border || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5413 — 14:00-14:10 07/02/9001

**EVT-0018 · COMMAND — Allied division of tasks confirmed between Tempest and Dwargon**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Allied command · Battle: -
- Actor: Rimuru Tempest / King Gazel Dwargo (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Tempest Control Room
- Immediate result: Final confirmation of the joint division of tasks; Dwargon will legally wait to be attacked before striking
- Operational consequence: Allied command arrangements fixed before contact
- Strategic significance: Dwargon's legal constraint shapes the opening of the war
- Graph: EVT-0017 → **EVT-0018** → EVT-0019
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - final confirmation of the joint task division
- Note: Dwargon envoys to the Empire had already been rebuffed.

State change: commanders: Benimaru Supreme General (Tempest); Emperor Rudra (Empire) -> Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire) | imperial column location: In transit, 97% of the way from the imperial interior to the forest edge -> In transit, 98% of the way from the imperial interior to the forest edge

## 08/02/9001  ·  Campaign day C+38  ·  Battle day D-2

### 09:00–09:59  ·  C+38:09:00  ·  B-02:09:00

**Phase:** DEPLOYMENT · **Stage:** DEPLOYMENT

**What happened.** The column halts and begins deploying its formations.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Blockade of the Eastern Metropolis (Dwargon Gate:FORMING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire DEPLOYING (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Imperial column halted and deploying its formations || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5527 — 09:00-09:10 08/02/9001

**EVT-0019 · DEPLOYMENT — The column halts and begins deploying its formations**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Imperial approach · Battle: -
- Actor: Invasion Army (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Edge of the Great Jura Forest
- Immediate result: The imperial side stops and forms up; infantry march into the forest one formation after another
- Operational consequence: The Empire transitions from approach march to attack posture
- Strategic significance: The point of no return for the invasion
- Graph: EVT-0018 → **EVT-0019** → EVT-0020
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - the imperial side halts and deploys

State change: Empire movement: ADVANCING -> DEPLOYING | Dwargon Gate frontline changed

### 11:00–11:59  ·  C+38:11:00  ·  B-02:11:00

**Phase:** DEPLOYMENT · **Stage:** DEPLOYMENT

**What happened.** Seven hundred thousand enter the forest.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Blockade of the Eastern Metropolis (Dwargon Gate:FORMING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** None engaged.

- **Force state** — Tempest effective 0 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire DEPLOYING (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Seven hundred thousand imperial troops entering the Great Jura Forest || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5539 — 11:00-11:10 08/02/9001

**EVT-0020 · MOVEMENT — Seven hundred thousand enter the forest**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Imperial approach · Battle: -
- Actor: Mecha Modification Corps (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Great Jura Forest
- Immediate result: The force entering the forest totals about seventy percent of the whole imperial strength, up to 700,000
- Operational consequence: The imperial main body is committed to the forest
- Strategic significance: Roughly seventy percent of imperial strength is placed at risk in one theatre
- Graph: EVT-0019 → **EVT-0020** → EVT-0006
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - about 70 percent of imperial strength, up to 700,000
- Note: The 70 percent figure is the basis of CON-005.

State change: Dwargon Gate frontline changed

### 12:00–12:59  ·  C+38:12:00  ·  B-02:12:00

**Phase:** DEPLOYMENT · **Stage:** DEPLOYMENT

**What happened.** Tempest field army concentrates at the Dwargon gate.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Blockade of the Eastern Metropolis (Dwargon Gate:FORMING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** None engaged.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire DEPLOYING (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Seven hundred thousand imperial troops entering the Great Jura Forest || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5545 — 12:00-12:10 08/02/9001

**EVT-0006 · DEPLOYMENT — Tempest field army concentrates at the Dwargon gate**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon approach · Battle: -
- Actor: Gobta / Gabil (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Dwargon outer gate
- Immediate result: About fifteen thousand assembled outside the gate
- Operational consequence: Forward defensive position established
- Strategic significance: Tempest accepts battle at the gate rather than in depth
- Graph: EVT-0020 → **EVT-0006** → EVT-0007
- Canonical time: - · Time basis: `DAY_LEVEL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - about fifteen thousand assembled at the gate
- Note: First Corps 12,000 + Third Corps 3,000.

State change: Tempest effective: 0 -> 15000

### 14:00–14:59  ·  C+38:14:00  ·  B-02:14:00

**Phase:** DEPLOYMENT · **Stage:** DEPLOYMENT

**What happened.** Dwargon raises temporary defensive walls.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Blockade of the Eastern Metropolis (Dwargon Gate:FORMING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** None engaged.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire DEPLOYING (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Seven hundred thousand imperial troops entering the Great Jura Forest || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5557 — 14:00-14:10 08/02/9001

**EVT-0007 · FORTIFICATION — Dwargon raises temporary defensive walls**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon approach · Battle: -
- Actor: King Gazel Dwargo (Armed Nation of Dwargon) vs Eastern Empire (Eastern Empire) at Dwargon gate
- Immediate result: Earth walls reinforced by fire magic to brick-and-iron hardness
- Operational consequence: Gate position hardened
- Strategic significance: Dwargon commits to the alliance
- Graph: EVT-0006 → **EVT-0007** → EVT-0008
- Canonical time: - · Time basis: `DAY_LEVEL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - seven Dwarf Knight units, two magic support
- Note: Civilians already evacuated to shelters.

State change: INHERITED_STATE

## 09/02/9001  ·  Campaign day C+39  ·  Battle day D-1

### 09:00–09:59  ·  C+39:09:00  ·  B-01:09:00

**Phase:** DEPLOYMENT · **Stage:** DEPLOYMENT

**What happened.** Aerial observation of the imperial column.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Blockade of the Eastern Metropolis (Dwargon Gate:FORMING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** None engaged.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire DEPLOYING (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Seven hundred thousand imperial troops entering the Great Jura Forest || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5671 — 09:00-09:10 09/02/9001

**EVT-0008 · RECONNAISSANCE — Aerial observation of the imperial column**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon approach · Battle: -
- Actor: Rimuru Tempest (Argos observation) (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Above the imperial column
- Immediate result: Two thousand war chariots counted; total invaders assessed in the millions
- Operational consequence: Tempest obtains accurate order of battle before contact
- Strategic significance: Tempest plans the trap with full information
- Graph: EVT-0007 → **EVT-0008** → EVT-0021
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V12 Ch5 — V12 Ch5 - two thousand vehicles counted from above
- Note: Initial verbal estimate exceeded the later reconciled 940,000.

State change: INHERITED_STATE

### 16:00–16:59  ·  C+39:16:00  ·  B-01:16:00

**Phase:** DEPLOYMENT · **Stage:** DEPLOYMENT

**What happened.** Tempest forces stage at the inn town on the imperial route.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Blockade of the Eastern Metropolis (Dwargon Gate:FORMING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** None engaged.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire DEPLOYING (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Seven hundred thousand imperial troops entering the Great Jura Forest || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5713 — 16:00-16:10 09/02/9001

**EVT-0021 · DEPLOYMENT — Tempest forces stage at the inn town on the imperial route**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon approach · Battle: -
- Actor: First Corps / Green Legion (Jura-Tempest Federation) vs Magic Chariot Division (Eastern Empire) at Inn town on the imperial line of march
- Immediate result: Demon lord forces stationed at the inn town along the imperial line of march
- Operational consequence: Tempest is positioned astride the imperial advance
- Strategic significance: Geist believes his own plan is succeeding
- Graph: EVT-0008 → **EVT-0021** → EVT-0100
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: MEDIUM
- Source: V13 Ch1 — V13 Ch1 - demon lord forces at the inn town
- Note: Geist reads the staging as evidence his plan is working.

State change: INHERITED_STATE

## 10/02/9001  ·  Campaign day C+40  ·  Battle day D+0

### 05:00–05:59  ·  C+40:05:00  ·  B+00:05:00

**Phase:** DEPLOYMENT · **Stage:** FIRST_CONTACT

**What happened.** Tempest scouting element closes to ten kilometres.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate; Blockade of the Eastern Metropolis (Dwargon Gate:INTENSIFYING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** None engaged.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire DEPLOYING (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Tempest scouting element within ten kilometres of the imperial line || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5791 — 05:00-05:10 10/02/9001

**EVT-0100 · MOVEMENT — Tempest scouting element closes to ten kilometres**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: First Corps / Green Legion (Jura-Tempest Federation) vs Magic Chariot Division (Eastern Empire) at Ten kilometres from the imperial line
- Immediate result: About one hundred approach; the sound closes to ten kilometres, inside the Magic Guided Cannon envelope
- Operational consequence: Tempest enters the imperial weapon envelope before contact
- Strategic significance: The Empire holds the first-fire advantage at the moment of contact
- Graph: EVT-0021 → **EVT-0100** → EVT-0101
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - about one hundred closing; ten kilometres; cannon max thirty km, effective about three km
- Note: Magic Guided Cannon: maximum 30 km, effective about 3 km. Two experimental explosive rounds available.

State change: Dwargon Gate battle: Battle of the Dwargon Gate | Dwargon Gate frontline changed | Dwargon Gate battle status: FORMING -> INTENSIFYING

### 06:00–06:59  ·  C+40:06:40  ·  B+00:06:40

**Phase:** ACTIVE_COMBAT · **Stage:** FIRST_CONTACT

**What happened.** Chariot division deploys for battle; First contact - Green Legion surprise attack; Wolf-rider charge closes the last hundred metres; Infantry screen attempts to block the wolf-riders.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate; Blockade of the Eastern Metropolis (Dwargon Gate:ACTIVE; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Gobta; Gabil; Benimaru; Geist; Faraga.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire ENGAGED (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Contact established; Green Legion inside the imperial chariot screen || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5797 — 06:00-06:10 10/02/9001

**EVT-0101 · DEPLOYMENT — Chariot division deploys for battle**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Magic Chariot Division (Eastern Empire) vs First Corps / Green Legion (Jura-Tempest Federation) at Dwargon Gate Front
- Immediate result: 500 chariots face the Green Legion; 1,500 more arrayed toward Dwargon
- Operational consequence: Imperial armour commits to a frontal posture
- Strategic significance: Imperial main effort fixed at the gate
- Graph: EVT-0100 → **EVT-0101** → EVT-0102
- Canonical time: - · Time basis: `SIMULATION_RECONSTRUCTED` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - five hundred chariots opposite the Green Legion
- Note: Clock time is simulation placement only.

State change: combatants: None engaged -> Gobta; Gabil; Benimaru; Geist; Faraga

#### FRAME_5799 — 06:20-06:30 10/02/9001

**EVT-0102 · ENGAGEMENT — First contact - Green Legion surprise attack**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: First Corps / Green Legion (Jura-Tempest Federation) vs Magic Chariot Division (Eastern Empire) at Dwargon Gate Front
- Immediate result: Gobta assumes direct command and strikes the imperial group
- Operational consequence: Battle opens on Tempest initiative
- Strategic significance: Empire never regains the initiative
- Graph: EVT-0101 → **EVT-0102** → EVT-0103
- Canonical time: - · Time basis: `SIMULATION_RECONSTRUCTED` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - Gobta takes command and launches a surprise attack
- Note: D-Day / H-Hour anchor for the campaign.

State change: Tempest movement: STATIONARY -> ADVANCING | Empire movement: DEPLOYING -> ENGAGED | Dwargon Gate frontline changed | Dwargon Gate battle status: INTENSIFYING -> ACTIVE

#### FRAME_5800 — 06:30-06:40 10/02/9001

**EVT-0103 · ATTACK — Wolf-rider charge closes the last hundred metres**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: First Corps / Green Legion (Jura-Tempest Federation) vs Magic Chariot Division (Eastern Empire) at Dwargon Gate Front
- Immediate result: Green Legion crosses about one hundred metres in under six seconds under fire
- Operational consequence: Chariot line contacted at close quarters
- Strategic significance: Imperial standoff advantage nullified
- Graph: EVT-0102 → **EVT-0103** → EVT-0104
- Canonical time: less than six seconds to close · Time basis: `EXPLICIT_RELATIVE` · Time confidence: HIGH · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - roughly one hundred metres crossed in under six seconds
- Note: Imperial fire recorded as inaccurate and rattled.

State change: INHERITED_STATE

#### FRAME_5801 — 06:40-06:50 10/02/9001

**EVT-0104 · DEFENSE — Infantry screen attempts to block the wolf-riders**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Imperial infantry screen (Eastern Empire) vs First Corps / Green Legion (Jura-Tempest Federation) at Dwargon Gate Front
- Immediate result: Screen overrun by the wolf mounts
- Operational consequence: Chariot escort fails
- Strategic significance: Imperial armour left unscreened
- Graph: EVT-0103 → **EVT-0104** → EVT-0105
- Canonical time: - · Time basis: `SIMULATION_RECONSTRUCTED` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - protective infantry unit overrun

State change: INHERITED_STATE

### 07:00–07:59  ·  C+40:07:40  ·  B+00:07:40

**Phase:** ACTIVE_COMBAT · **Stage:** FIRST_CONTACT

**What happened.** Gabil opens the air battle in support of Gobta; Mana Disruptor Radiation deployed from the airships; Chariots link into a mobile fortress.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate; Blockade of the Eastern Metropolis (Dwargon Gate:INTENSIFYING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Gobta; Gabil; Benimaru; Geist; Faraga.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest ENCIRCLED (retreating: NO); Empire ENGAGED (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Green Legion encircled by a linked chariot fortress || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5803 — 07:00-07:10 10/02/9001

**EVT-0105 · AIRBORNE — Gabil opens the air battle in support of Gobta**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Airspace over Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Third Corps (Flying Dragons) (Jura-Tempest Federation) vs Air Combat Flying Corps (Eastern Empire) at Airspace over the front
- Immediate result: Flying dragons deliver fireball attacks; effective against infantry, not chariot barriers
- Operational consequence: Imperial attention divided between ground and air
- Strategic significance: Two simultaneous fronts imposed on the Empire
- Graph: EVT-0104 → **EVT-0105** → EVT-0106
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - Gabil tasked with drawing enemy focus
- Note: Fireball power compared to a B+ elemental spell.

State change: INHERITED_STATE

#### FRAME_5805 — 07:20-07:30 10/02/9001

**EVT-0106 · SPECIAL_ABILITY — Mana Disruptor Radiation deployed from the airships**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Airspace over Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Air Combat Flying Corps (Eastern Empire) vs Third Corps (Jura-Tempest Federation) at Airspace over the front
- Immediate result: Tempest air and ground elements weighed down near the airships
- Operational consequence: Tempest tempo checked
- Strategic significance: Imperial secret weapon revealed and committed
- Graph: EVT-0105 → **EVT-0106** → EVT-0107
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch1-2 — V13 Ch1-2 - Mana Disruptor Radiation described as a secret weapon
- Note: Affected both Gobta's and Gabil's formations.

State change: INHERITED_STATE

#### FRAME_5807 — 07:40-07:50 10/02/9001

**EVT-0107 · FORTIFICATION — Chariots link into a mobile fortress**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Magic Chariot Division (Eastern Empire) vs First Corps / Green Legion (Jura-Tempest Federation) at Dwargon Gate Front
- Immediate result: Nearly one thousand chariots interlink; the left brigade encircles Gobta
- Operational consequence: Green Legion movement pinned
- Strategic significance: Peak imperial battlefield position
- Graph: EVT-0106 → **EVT-0107** → EVT-0108
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch1 — V13 Ch1 - nearly one thousand chariots form a fortress
- Note: Encirclement of the Green Legion achieved.

State change: Tempest movement: ADVANCING -> ENCIRCLED | Dwargon Gate frontline changed | Dwargon Gate battle status: ACTIVE -> INTENSIFYING

### 08:00–08:59  ·  C+40:08:30  ·  B+00:08:30

**Phase:** ACTIVE_COMBAT · **Stage:** FIRST_CONTACT

**What happened.** Remaining thousand chariots take up firing positions; Feigned defeat executed on Benimaru's order; Gabil's corps mirrors the feigned defeat.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate; Blockade of the Eastern Metropolis (Dwargon Gate:INTENSIFYING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Gobta; Gabil; Benimaru; Geist; Faraga.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest RETREATING (feigned) (retreating: YES (feigned)); Empire ENGAGED (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Tempest simulating collapse; imperial armour committed forward || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5809 — 08:00-08:10 10/02/9001

**EVT-0108 · ATTACK — Remaining thousand chariots take up firing positions**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Magic Chariot Division (Eastern Empire) vs First Corps / Green Legion (Jura-Tempest Federation) at Dwargon Gate Front
- Immediate result: Point-blank massed fire prepared against the pinned Green Legion
- Operational consequence: Maximum imperial pressure on the encirclement
- Strategic significance: Empire commits its full armoured reserve forward
- Graph: EVT-0107 → **EVT-0108** → EVT-0109
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch1-2 — V13 Ch1-2 - the remaining thousand chariots aim at close range
- Note: Order given disregarding own unit safety.

State change: INHERITED_STATE

#### FRAME_5811 — 08:20-08:30 10/02/9001

**EVT-0109 · DEFENSE — Feigned defeat executed on Benimaru's order**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: First Corps / Green Legion (Jura-Tempest Federation) vs Magic Chariot Division (Eastern Empire) at Dwargon Gate Front
- Immediate result: Green Legion simulates collapse while avoiding direct hits
- Operational consequence: Empire commits deeper into the trap
- Strategic significance: Imperial armour fixed in an unrecoverable position
- Graph: EVT-0108 → **EVT-0109** → EVT-0110
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch2 — V13 Ch2 - the 'pretend to lose' instruction
- Note: Personnel rated A-; damage recoverable by restorative medicine.

State change: Tempest movement: ENCIRCLED -> RETREATING (feigned) | Tempest retreating: NO -> YES (feigned) | Dwargon Gate frontline changed

#### FRAME_5812 — 08:30-08:40 10/02/9001

**EVT-0110 · DEFENSE — Gabil's corps mirrors the feigned defeat**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Airspace over Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Third Corps (Jura-Tempest Federation) vs Air Combat Flying Corps (Eastern Empire) at Airspace over the front
- Immediate result: Third Corps also feigns collapse while screening Gobta
- Operational consequence: Imperial air arm drawn in
- Strategic significance: Both imperial arms committed simultaneously
- Graph: EVT-0109 → **EVT-0110** → EVT-0111
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch2 — V13 Ch2 - the same feint used by the Third Corps
- Note: Withdrawal authorised only in genuine danger.

State change: INHERITED_STATE

### 09:00–09:59  ·  C+40:09:30  ·  B+00:09:30

**Phase:** ACTIVE_COMBAT · **Stage:** FIRST_CONTACT

**What happened.** Blizzard Wolf Dance unleashed; Green Legion strikes the supply echelon.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate; Blockade of the Eastern Metropolis (Dwargon Gate:INTENSIFYING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Gobta; Gabil; Benimaru; Geist; Faraga.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 940,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DISORGANISED (retreating: NO)
- **Casualties** — Empire KIA 0 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Imperial chariot mass broken by tornado effect; Tempest counterattacking || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5815 — 09:00-09:10 10/02/9001

**EVT-0111 · SPECIAL_ABILITY — Blizzard Wolf Dance unleashed**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Gobta (Jura-Tempest Federation) vs Magic Chariot Division (Eastern Empire) at Dwargon Gate Front
- Immediate result: Supersonic shockwave with a storm-breaking effect grows into a destructive tornado across the chariot force
- Operational consequence: The corner of the battlefield collapses; imperial armour shattered
- Strategic significance: Ground battle decided
- Graph: EVT-0110 → **EVT-0111** → EVT-0112
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch2 — V13 Ch2 - Blizzard Wolf Dance and the resulting tornado
- Note: Turning point of the ground action.

State change: Tempest movement: RETREATING (feigned) -> ADVANCING | Tempest retreating: YES (feigned) -> NO | Empire movement: ENGAGED -> DISORGANISED | Dwargon Gate frontline changed

#### FRAME_5818 — 09:30-09:40 10/02/9001

**EVT-0112 · ATTACK — Green Legion strikes the supply echelon**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: First Corps / Green Legion (Jura-Tempest Federation) vs Imperial supply guard infantry (Eastern Empire) at Imperial supply echelon
- Immediate result: Supply guards initially scattered, then re-form using armoured vehicles as shields
- Operational consequence: Imperial rear services contested
- Strategic significance: Imperial sustainment on the front degraded
- Graph: EVT-0111 → **EVT-0112** → EVT-0113
- Canonical time: after that, ten minutes passed · Time basis: `EXPLICIT_RELATIVE` · Time confidence: HIGH · Overall: MEDIUM
- Source: V13 Ch2 — V13 Ch2 - ten minutes elapse, supply guards engaged
- Note: One of the few explicit short-duration anchors in the corpus.

State change: INHERITED_STATE

### 10:00–10:59  ·  C+40:10:40  ·  B+00:10:40

**Phase:** ACTIVE_COMBAT · **Stage:** FIRST_CONTACT

**What happened.** Boarding actions against the airships; Ultima engages the flagship; Flame of Destruction annihilates the Air Combat Flying Corps.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate; Blockade of the Eastern Metropolis (Dwargon Gate:INTENSIFYING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Gobta; Gabil; Ultima; Veldora; Benimaru; Geist.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 900,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DISORGANISED (retreating: NO)
- **Casualties** — Empire KIA 40,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire)
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Imperial air arm eliminated; Tempest holds the airspace || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5821 — 10:00-10:10 10/02/9001

**EVT-0113 · AIRBORNE — Boarding actions against the airships**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Airspace over Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Third Corps (Dragon Warriors) (Jura-Tempest Federation) vs Air Combat Flying Corps (Eastern Empire) at Airspace over the front
- Immediate result: Five-man teams penetrate hulls; ships sink one by one; about one hundred airships remain
- Operational consequence: Imperial air superiority broken
- Strategic significance: Empire loses its air transport capability on this front
- Graph: EVT-0112 → **EVT-0113** → EVT-0114
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch2 — V13 Ch2 - boarding parties of five; roughly one hundred ships left
- Note: Magic ineffective against the boarders' barrier.

State change: INHERITED_STATE

#### FRAME_5824 — 10:30-10:40 10/02/9001

**EVT-0114 · ENGAGEMENT — Ultima engages the flagship**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Airspace over Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Ultima (Jura-Tempest Federation) vs Major General Faraga (Eastern Empire) at Airspace over the front
- Immediate result: Faraga's command element neutralised
- Operational consequence: Imperial air command decapitated
- Strategic significance: Air corps left leaderless before annihilation
- Graph: EVT-0113 → **EVT-0114** → EVT-0115
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch2 — V13 Ch2 - Ultima departs the ship before the detonation

State change: combatants: Gobta; Gabil; Benimaru; Geist; Faraga -> Gobta; Gabil; Ultima; Benimaru; Geist

#### FRAME_5825 — 10:40-10:50 10/02/9001

**EVT-0115 · SPECIAL_ABILITY — Flame of Destruction annihilates the Air Combat Flying Corps**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Airspace over Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Veldora Tempest (Jura-Tempest Federation) vs Air Combat Flying Corps (Eastern Empire) at Airspace over the front
- Immediate result: Superheated first wave then blast shockwave; command ship vaporised; chain detonations sink every airborne vessel
- Operational consequence: The entire Air Combat Flying Corps is destroyed with no trace
- Strategic significance: Air battle decided; 40,000 lost
- Losses booked here: 40,000 KIA
- Graph: EVT-0114 → **EVT-0115** → EVT-0116
- Canonical time: in the blink of an eye · Time basis: `EXPLICIT_RELATIVE` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch2 — V13 Ch2 - all airships destroyed by the Flame of Destruction
- Note: Only ships already downed remained intact. See CAS-002.

State change: Empire effective: 940000 -> 900000 | Empire KIA: 0 -> 40000 | combatants: Gobta; Gabil; Ultima; Benimaru; Geist -> Gobta; Gabil; Ultima; Veldora; Benimaru; Geist | Dwargon Gate frontline changed

### 11:00–11:59  ·  C+40:11:40  ·  B+00:11:40

**Phase:** ACTIVE_COMBAT · **Stage:** FIRST_CONTACT

**What happened.** Contact lost with the entire airship fleet; General retreat ordered; Testarossa intercepts the retreating force.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate; Blockade of the Eastern Metropolis (Dwargon Gate:WITHDRAWAL; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Gobta; Gabil; Ultima; Veldora; Testarossa; Geist.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 900,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire RETREATING (retreating: YES (route closed))
- **Casualties** — Empire KIA 40,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Geist ordering general withdrawal
- **Territorial state** — Dwargon Gate: CONTESTED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Imperial withdrawal intercepted from the rear; force encircled || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5827 — 11:00-11:10 10/02/9001

**EVT-0116 · COMMAND — Contact lost with the entire airship fleet**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Lieutenant General Geist (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Imperial command post
- Immediate result: Imperial staff confirm losses worse than imagined
- Operational consequence: Imperial command paralysis
- Strategic significance: Imperial confidence collapses
- Graph: EVT-0115 → **EVT-0116** → EVT-0117
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch2 — V13 Ch2 - every airship unreachable, not merely one

State change: INHERITED_STATE

#### FRAME_5829 — 11:20-11:30 10/02/9001

**EVT-0117 · RETREAT — General retreat ordered**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Lieutenant General Geist (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Dwargon Gate Front
- Immediate result: Geist orders the whole force to withdraw and regroup elsewhere
- Operational consequence: Imperial offensive abandoned on this front
- Strategic significance: Empire concedes the Dwargon gate
- Graph: EVT-0116 → **EVT-0117** → EVT-0118
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch2 — V13 Ch2 - Geist finally calls the retreat
- Note: Source states the order came too late.

State change: Empire movement: DISORGANISED -> RETREATING | Empire retreating: NO -> YES | commanders: Benimaru Supreme General (Tempest); Gazel commanding Dwargon; Calgurio supreme field command (Empire) -> Benimaru Supreme General (Tempest); Geist ordering general withdrawal | Dwargon Gate battle status: INTENSIFYING -> WITHDRAWAL

#### FRAME_5831 — 11:40-11:50 10/02/9001

**EVT-0118 · ENCIRCLEMENT — Testarossa intercepts the retreating force**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Testarossa (Jura-Tempest Federation) vs Magic Chariot Division (remnants) (Eastern Empire) at Imperial line of retreat
- Immediate result: Withdrawal route closed; all hope of escape ends
- Operational consequence: Retreat converted into annihilation
- Strategic significance: No imperial survivors from the surface phase
- Graph: EVT-0117 → **EVT-0118** → EVT-0119
- Canonical time: already too late · Time basis: `EXPLICIT_RELATIVE` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch2 — V13 Ch2 - hope collapses on meeting Testarossa

State change: Empire retreating: YES -> YES (route closed) | combatants: Gobta; Gabil; Ultima; Veldora; Benimaru; Geist -> Gobta; Gabil; Ultima; Veldora; Testarossa; Geist | Dwargon Gate frontline changed

### 13:00–13:59  ·  C+40:13:00  ·  B+00:13:00

**Phase:** ACTIVE_COMBAT · **Stage:** FIRST_CONTACT

**What happened.** Surface phase concluded - both imperial formations annihilated.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Gobta; Gabil; Benimaru; Calgurio.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 700,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 240,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Geist and Faraga lost; Calgurio in overall imperial command
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5839 — 13:00-13:10 10/02/9001

**EVT-0119 · UNIT_DESTRUCTION — Surface phase concluded - both imperial formations annihilated**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Dwargon Gate Front · Battle: Battle of the Dwargon Gate
- Actor: Jura-Tempest Federation (Jura-Tempest Federation) vs Magic Chariot Division + Air Combat Flying Corps (Eastern Empire) at Dwargon Gate Front
- Immediate result: About 240,000 imperial personnel killed; no prisoners taken
- Operational consequence: The Dwargon Gate front is cleared; Tempest holds the field
- Strategic significance: Empire loses a quarter of its invasion force in one day
- Losses booked here: 240,000 KIA
- Graph: EVT-0118 → **EVT-0119** → EVT-0120
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch3 — V13 Ch3 - 200,000 under Geist plus 40,000 under Faraga; no prisoners, all killed in action
- Note: 240,000 = 200,000 + 40,000. See CAS-001/002/003.

State change: Empire effective: 900000 -> 700000 | Empire KIA: 40000 -> 240000 | Empire movement: RETREATING -> DESTROYED | Empire retreating: YES (route closed) -> N/A | commanders: Benimaru Supreme General (Tempest); Geist ordering general withdrawal -> Benimaru Supreme General (Tempest); Geist and Faraga lost; Calgurio in overall imperial command | combatants: Gobta; Gabil; Ultima; Veldora; Testarossa; Geist -> Gobta; Gabil; Benimaru; Calgurio | Dwargon Gate theatre status: ACTIVE -> CLEARED | Dwargon Gate battle: Battle of the Dwargon Gate (concluded) | Dwargon Gate frontline changed | Dwargon Gate territorial control: CONTESTED -> TEMPEST_CONTROLLED | Dwargon Gate battle status: WITHDRAWAL -> CONCLUDED

### 14:00–14:59  ·  C+40:14:00  ·  B+00:14:00

**Phase:** ACTIVE_COMBAT · **Stage:** FIRST_CONTACT

**What happened.** Dwargon assesses the campaign as decided.

**Where.** Dwargon Gate Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Gobta; Gabil; Benimaru; Calgurio.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 700,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 240,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Geist and Faraga lost; Calgurio in overall imperial command
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5845 — 14:00-14:10 10/02/9001

**EVT-0120 · INTELLIGENCE — Dwargon assesses the campaign as decided**

- Theatre: Dwargon Gate Front (TH-DWG) · Front: Strategic assessment · Battle: -
- Actor: King Gazel Dwargo (Armed Nation of Dwargon) vs Eastern Empire (Eastern Empire) at Dwargon
- Immediate result: Of the invading army, 240,000 assessed destroyed; Rimuru judged near-certain to win
- Operational consequence: Strategic initiative passes wholly to Tempest
- Strategic significance: Allied confidence consolidated
- Graph: EVT-0119 → **EVT-0120** → EVT-0201
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: MEDIUM
- Source: V13 Ch3 — V13 Ch3 - Gazel's assessment of the invading army and losses
- Note: Source figure for the invading army is garbled. See AMB-001.

State change: INHERITED_STATE

## 11/02/9001  ·  Campaign day C+41  ·  Battle day D+1

### 08:00–08:59  ·  C+41:08:00  ·  B+01:08:00

**Phase:** ACTIVE_COMBAT · **Stage:** MAJOR_COMBAT_PERIOD

**What happened.** Imperial ground army enters the labyrinth.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth; Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:ACTIVE; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Ramiris; Adalman; Calgurio.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 700,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire ADVANCING (retreating: NO)
- **Casualties** — Empire KIA 240,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Geist and Faraga lost; Calgurio in overall imperial command
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial ground army committed into the labyrinth || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5953 — 08:00-08:10 11/02/9001

**EVT-0201 · MOVEMENT — Imperial ground army enters the labyrinth**

- Theatre: Ramiris Labyrinth Front (TH-LAB) · Front: Ramiris Labyrinth Front · Battle: Battle of the Labyrinth
- Actor: Mecha Modification Corps (Eastern Empire) vs Labyrinth garrison (Jura-Tempest Federation) at Labyrinth entrance
- Immediate result: 700,000 ground troops committed to the underground complex
- Operational consequence: Empire loses freedom of manoeuvre
- Strategic significance: Decisive operational error of the campaign
- Graph: EVT-0120 → **EVT-0201** → EVT-0202
- Canonical time: - · Time basis: `DAY_LEVEL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch3-4 — V13 Ch4 - 700,000 imperial troops came by land
- Note: Entry is the decisive operational error of the campaign.

State change: Empire movement: DESTROYED -> ADVANCING | Empire retreating: N/A -> NO | combatants: Gobta; Gabil; Benimaru; Calgurio -> Ramiris; Adalman; Calgurio | Labyrinth theatre status: INACTIVE -> ACTIVE | Labyrinth battle: Battle of the Labyrinth | Labyrinth frontline changed | Labyrinth battle status: NOT_STARTED -> ACTIVE

### 10:00–10:59  ·  C+41:10:00  ·  B+01:10:00

**Phase:** ACTIVE_COMBAT · **Stage:** MAJOR_COMBAT_PERIOD

**What happened.** Formations severed and isolated by slime walls.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth; Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:INTENSIFYING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Ramiris; Adalman; Calgurio.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 700,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire ADVANCING (retreating: NO)
- **Casualties** — Empire KIA 240,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Geist and Faraga lost; Calgurio in overall imperial command
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial formations severed and isolated inside the labyrinth || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5965 — 10:00-10:10 11/02/9001

**EVT-0202 · ENCIRCLEMENT — Formations severed and isolated by slime walls**

- Theatre: Ramiris Labyrinth Front (TH-LAB) · Front: Ramiris Labyrinth Front · Battle: Battle of the Labyrinth
- Actor: Labyrinth garrison (Jura-Tempest Federation) vs Mecha Modification Corps (Eastern Empire) at Labyrinth interior
- Immediate result: Imperial units cut off from one another and destroyed piecemeal
- Operational consequence: Cohesion of the imperial army breaks down
- Strategic significance: Imperial mass advantage neutralised
- Graph: EVT-0201 → **EVT-0202** → EVT-0203
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch4 — V13 Ch4 - units severed and wiped out; walls made of slime

State change: Labyrinth frontline changed | Labyrinth battle status: ACTIVE -> INTENSIFYING

### 12:00–12:59  ·  C+41:12:00  ·  B+01:12:00

**Phase:** ACTIVE_COMBAT · **Stage:** MAJOR_COMBAT_PERIOD

**What happened.** Necromancer assault on the imperial rear.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth; Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:INTENSIFYING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Ramiris; Adalman; Calgurio.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 690,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire ADVANCING (retreating: NO)
- **Casualties** — Empire KIA 250,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Geist and Faraga lost; Calgurio in overall imperial command
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial formations severed and isolated inside the labyrinth || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_5977 — 12:00-12:10 11/02/9001

**EVT-0203 · ATTACK — Necromancer assault on the imperial rear**

- Theatre: Ramiris Labyrinth Front (TH-LAB) · Front: Ramiris Labyrinth Front · Battle: Battle of the Labyrinth
- Actor: Adalman's undead (Jura-Tempest Federation) vs Mecha Modification Corps (Eastern Empire) at Labyrinth - upper floors
- Immediate result: Ten thousand destroyed in less than an hour; imperial losses convert directly into Adalman's strength
- Operational consequence: Imperial numbers plunge; survivors' reports demoralise following waves
- Strategic significance: Attrition becomes self-reinforcing
- Losses booked here: 10,000 KIA
- Graph: EVT-0202 → **EVT-0203** → EVT-0204
- Canonical time: less than an hour · Time basis: `EXPLICIT_RELATIVE` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch4 — V13 Ch4 - ten thousand destroyed in under an hour
- Note: Spirit contamination turned casualties into undead.

State change: Empire effective: 700000 -> 690000 | Empire KIA: 240000 -> 250000

## 12/02/9001  ·  Campaign day C+42  ·  Battle day D+2

### 09:00–09:59  ·  C+42:09:00  ·  B+02:09:00

**Phase:** ACTIVE_COMBAT · **Stage:** MAJOR_COMBAT_PERIOD

**What happened.** Floor 70 raider battle reaches white heat.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth; Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:INTENSIFYING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Ramiris; Adalman; Calgurio.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 690,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire ADVANCING (retreating: NO)
- **Casualties** — Empire KIA 250,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Geist and Faraga lost; Calgurio in overall imperial command
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial formations severed and isolated inside the labyrinth || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_6103 — 09:00-09:10 12/02/9001

**EVT-0204 · ENGAGEMENT — Floor 70 raider battle reaches white heat**

- Theatre: Ramiris Labyrinth Front (TH-LAB) · Front: Ramiris Labyrinth Front · Battle: Battle of the Labyrinth
- Actor: Imperial raiding elite (Eastern Empire) vs Adalman (Immortal King) (Jura-Tempest Federation) at Labyrinth - Floor 70
- Immediate result: Elite raiders identified as struggling against the Immortal King
- Operational consequence: Imperial elite committed and pinned
- Strategic significance: Empire's best troops absorbed without effect
- Graph: EVT-0203 → **EVT-0204** → EVT-0205
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch4 — V13 Ch4 - the Floor 70 raider battle
- Note: Adalman identified as one of the Ten Masters.

State change: INHERITED_STATE

### 14:00–14:59  ·  C+42:14:00  ·  B+02:14:00

**Phase:** ACTIVE_COMBAT · **Stage:** MAJOR_COMBAT_PERIOD

**What happened.** Calgurio recognises the operation may fail.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth; Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:INTENSIFYING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Ramiris; Adalman; Calgurio.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 690,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire ADVANCING (retreating: NO)
- **Casualties** — Empire KIA 250,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Geist and Faraga lost; Calgurio in overall imperial command
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial formations severed and isolated inside the labyrinth || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_6133 — 14:00-14:10 12/02/9001

**EVT-0205 · COMMAND — Calgurio recognises the operation may fail**

- Theatre: Ramiris Labyrinth Front (TH-LAB) · Front: Imperial command · Battle: -
- Actor: Marshal Calgurio (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Imperial command post
- Immediate result: Failure would mean the death of 530,000 imperial soldiers
- Operational consequence: Imperial high command confronts catastrophe
- Strategic significance: Empire begins to contemplate defeat
- Graph: EVT-0204 → **EVT-0205** → EVT-0206
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch4 — V13 Ch4 - operation failure would represent 530,000 deaths

State change: INHERITED_STATE

### 16:00–16:59  ·  C+42:16:00  ·  B+02:16:00

**Phase:** ACTIVE_COMBAT · **Stage:** MAJOR_COMBAT_PERIOD

**What happened.** Labyrinth revival cycle sustains the defence.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth; Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:INTENSIFYING; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Ramiris; Adalman; Calgurio.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 690,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire ADVANCING (retreating: NO)
- **Casualties** — Empire KIA 250,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Geist and Faraga lost; Calgurio in overall imperial command
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial formations severed and isolated inside the labyrinth || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_6145 — 16:00-16:10 12/02/9001

**EVT-0206 · REINFORCEMENT — Labyrinth revival cycle sustains the defence**

- Theatre: Ramiris Labyrinth Front (TH-LAB) · Front: Ramiris Labyrinth Front · Battle: Battle of the Labyrinth
- Actor: Labyrinth garrison (Jura-Tempest Federation) vs Mecha Modification Corps (Eastern Empire) at Labyrinth interior
- Immediate result: Fallen defenders return after a three-hour interval
- Operational consequence: Tempest sustains zero net attrition
- Strategic significance: Defence becomes indefinitely sustainable
- Graph: EVT-0205 → **EVT-0206** → EVT-0207
- Canonical time: wait three hours before the dead army revives · Time basis: `EXPLICIT_RELATIVE` · Time confidence: HIGH · Overall: HIGH
- Source: V13 Ch4 — V13 Ch4 - three hours before the fallen revive
- Note: Explicit duration anchor.

State change: INHERITED_STATE

## 13/02/9001  ·  Campaign day C+43  ·  Battle day D+3

### 10:00–10:59  ·  C+43:10:00  ·  B+03:10:00

**Phase:** ACTIVE_COMBAT · **Stage:** MAJOR_COMBAT_PERIOD

**What happened.** Labyrinth phase concluded.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth (concluded); Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Ramiris; Adalman; Calgurio.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 770,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); imperial field command destroyed
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial ground army destroyed; no coherent imperial force remains on the Jura front || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_6253 — 10:00-10:10 13/02/9001

**EVT-0207 · UNIT_DESTRUCTION — Labyrinth phase concluded**

- Theatre: Ramiris Labyrinth Front (TH-LAB) · Front: Ramiris Labyrinth Front · Battle: Battle of the Labyrinth
- Actor: Jura-Tempest Federation (Jura-Tempest Federation) vs Mecha Modification Corps (Eastern Empire) at Labyrinth interior
- Immediate result: Of 700,000 who came by land, more than 530,000 defeated; battle ends with no losses on the Tempest side
- Operational consequence: The imperial ground army ceases to exist as a fighting force
- Strategic significance: Jura front decided
- Losses booked here: 530,000 KIA
- Graph: EVT-0206 → **EVT-0207** → EVT-0208
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V13 Ch4 — V13 Ch4 - more than 530,000 of 700,000 defeated; no losses on the Tempest side
- Note: Cumulative souls stated as more than 700,000. See CAS-004.

State change: Empire effective: 690000 -> 170000 | Empire KIA: 250000 -> 770000 | Empire movement: ADVANCING -> DESTROYED | Empire retreating: NO -> N/A | commanders: Benimaru Supreme General (Tempest); Geist and Faraga lost; Calgurio in overall imperial command -> Benimaru Supreme General (Tempest); imperial field command destroyed | Labyrinth theatre status: ACTIVE -> CLEARED | Labyrinth battle: Battle of the Labyrinth (concluded) | Labyrinth frontline changed | Labyrinth battle status: INTENSIFYING -> CONCLUDED

### 12:00–12:59  ·  C+43:12:00  ·  B+03:12:00

**Phase:** ACTIVE_COMBAT · **Stage:** MAJOR_COMBAT_PERIOD

**What happened.** Resurrection bracelet test confirms the deaths are permanent.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth (concluded); Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Ramiris; Adalman; Calgurio.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 770,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); imperial field command destroyed
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial ground army destroyed; no coherent imperial force remains on the Jura front || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_6265 — 12:00-12:10 13/02/9001

**EVT-0208 · INTELLIGENCE — Resurrection bracelet test confirms the deaths are permanent**

- Theatre: Ramiris Labyrinth Front (TH-LAB) · Front: Imperial command · Battle: -
- Actor: Marshal Calgurio (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Imperial command post
- Immediate result: Imitation bracelets confirmed ineffective; only the genuine article revives the bearer
- Operational consequence: More than half a million confirmed permanently dead
- Strategic significance: No prospect of recovering the losses
- Graph: EVT-0207 → **EVT-0208** → EVT-0209
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch5/Epilogue — V13 - two genuine bracelets existed; imitations ineffective
- Note: Removes any prospect of imperial recovery of losses.

State change: INHERITED_STATE

### 18:00–18:59  ·  C+43:18:00  ·  B+03:18:00

**Phase:** ACTIVE_COMBAT · **Stage:** MAJOR_COMBAT_PERIOD

**What happened.** Soul harvest totalled; subordinate evolution enabled.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth (concluded); Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Ramiris; Adalman; Calgurio.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 770,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); imperial field command destroyed
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial ground army destroyed; no coherent imperial force remains on the Jura front || Imperial Capital: Imperial mobilization under way || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_6301 — 18:00-18:10 13/02/9001

**EVT-0209 · AFTERMATH — Soul harvest totalled; subordinate evolution enabled**

- Theatre: Ramiris Labyrinth Front (TH-LAB) · Front: Strategic · Battle: -
- Actor: Rimuru Tempest (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Tempest
- Immediate result: More than seven hundred thousand souls accumulated; seven subordinates may evolve
- Operational consequence: Tempest emerges from the campaign strategically strengthened
- Strategic significance: Tempest's top tier grows markedly stronger
- Graph: EVT-0208 → **EVT-0209** → EVT-0310
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V13 Ch4 — V13 Ch4 - more than seven hundred thousand in total; seven subordinates
- Note: 240,000 + 530,000 = 770,000. Consistent.

State change: INHERITED_STATE

## 16/02/9001  ·  Campaign day C+46  ·  Battle day D+6

### 09:00–09:59  ·  C+46:09:00  ·  B+06:09:00

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Clown faction conference convened.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth (concluded); Imperial Capital Coup Attempt; Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:FORMING; Dwargon East:ACTIVE).

**Who.** Yuuki; Miranda; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 770,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); imperial field command destroyed
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: CONTESTED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial ground army destroyed; no coherent imperial force remains on the Jura front || Imperial Capital: Internal conspiracy forming inside the imperial capital || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_6679 — 09:00-09:10 16/02/9001

**EVT-0310 · STRATEGIC_PREPARATION — Clown faction conference convened**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Imperial Capital Coup Attempt
- Actor: Yuuki Kagurazaka (Eastern Empire) vs Imperial government (Eastern Empire) at Yuuki's chamber
- Immediate result: Kagali, Laplace, Tia, Footman and Miranda attend; Vega absent
- Operational consequence: Coup planning formalised against the imperial government
- Strategic significance: A second, internal front opens inside the Empire
- Graph: EVT-0209 → **EVT-0310** → EVT-0311
- Canonical time: several days after the Jura campaign concluded · Time basis: `EXPLICIT_RELATIVE` · Time confidence: MEDIUM · Overall: HIGH
- Source: V14 Prologue/Ch3 — V14 Prologue and Ch3 - the clown group meeting
- Note: Yuuki adjusts strategy after hearing the reports.

State change: combatants: None engaged -> Yuuki; Miranda; Kondo | Imperial Capital battle: Imperial Capital Coup Attempt | Imperial Capital frontline changed | Imperial Capital territorial control: EMPIRE_CONTROLLED -> CONTESTED

### 11:00–11:59  ·  C+46:11:00  ·  B+06:11:00

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Miranda goes to ground and prepares the coup.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth (concluded); Imperial Capital Coup Attempt; Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:ACTIVE; Dwargon East:ACTIVE).

**Who.** Yuuki; Miranda; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 770,000 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); imperial field command destroyed
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: CONTESTED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial ground army destroyed; no coherent imperial force remains on the Jura front || Imperial Capital: Internal conspiracy forming inside the imperial capital || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_6691 — 11:00-11:10 16/02/9001

**EVT-0311 · STRATEGIC_PREPARATION — Miranda goes to ground and prepares the coup**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Imperial Capital Coup Attempt
- Actor: Miranda (Eastern Empire) vs Imperial Intelligence Service (Eastern Empire) at Imperial Capital
- Immediate result: Coup preparation conducted covertly while the field army is on expedition
- Operational consequence: Imperial internal security not yet alerted
- Strategic significance: Coup timed to the army's absence
- Graph: EVT-0310 → **EVT-0311** → EVT-0312
- Canonical time: - · Time basis: `DAY_LEVEL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V14 Ch3 — V14 Ch3 - Miranda hidden and busy preparing the coup
- Note: Desertion would carry a death sentence if detected.

State change: Imperial Capital battle status: FORMING -> ACTIVE

### 21:00–21:59  ·  C+46:21:50  ·  B+06:21:50

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Miranda moves through the capital's back streets; Kondo intercepts Miranda in an isolated spot; Miranda attempts her charm technique; Kondo kills Miranda with a single pistol shot; Kondo extracts Miranda's knowledge with the skill Reader.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth (concluded); Imperial Capital Coup Attempt; Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:ACTIVE).

**Who.** Yuuki; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 770,001 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Calgurio imperial field command; Kondo holds the conspiracy in full
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial ground army destroyed; no coherent imperial force remains on the Jura front || Imperial Capital: Coup leadership eliminated; imperial capital secure || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_6751 — 21:00-21:10 16/02/9001

**EVT-0312 · MOVEMENT — Miranda moves through the capital's back streets**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Imperial Capital Coup Attempt
- Actor: Miranda (Eastern Empire) vs Lieutenant Tatsuya Kondo (Eastern Empire) at Back streets of the Imperial Capital
- Immediate result: Movement believed undetected by the Imperial Intelligence Agency
- Operational consequence: Coup preparation approaches execution
- Strategic significance: Internal plot reaches its critical night
- Graph: EVT-0311 → **EVT-0312** → EVT-0313
- Canonical time: late at night · Time basis: `DAY_LEVEL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V14 Ch3 — V14 Ch3 - Miranda walking soundlessly in the darkness
- Note: She had previously outwitted Dwargon's Ministry of Darkness and Blumund's spies.

State change: INHERITED_STATE

#### FRAME_6753 — 21:20-21:30 16/02/9001

**EVT-0313 · INTERCEPTION — Kondo intercepts Miranda in an isolated spot**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Imperial Capital Coup Attempt
- Actor: Lieutenant Tatsuya Kondo (Eastern Empire) vs Miranda (Eastern Empire) at Back streets of the Imperial Capital
- Immediate result: Miranda cornered; no guards available and no prospect of winning a fight
- Operational consequence: Coup leadership compromised
- Strategic significance: Imperial counter-intelligence pre-empts the plot
- Graph: EVT-0312 → **EVT-0313** → EVT-0314
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V14 Ch3 — V14 Ch3 - Kondo blocks Miranda's path
- Note: Kondo known as the one opponent Miranda could never beat.

State change: Imperial Capital frontline changed

#### FRAME_6754 — 21:30-21:40 16/02/9001

**EVT-0314 · SPECIAL_ABILITY — Miranda attempts her charm technique**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Imperial Capital Coup Attempt
- Actor: Miranda (Eastern Empire) vs Lieutenant Tatsuya Kondo (Eastern Empire) at Back streets of the Imperial Capital
- Immediate result: Perfume spell and fascination illusion applied; Kondo appears to succumb
- Operational consequence: Miranda believes she has taken control
- Strategic significance: Her strongest asset is committed and fails
- Graph: EVT-0313 → **EVT-0314** → EVT-0315
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V14 Ch3 — V14 Ch3 - Miranda's charm technique described
- Note: The same technique had previously worked on Calgurio.

State change: INHERITED_STATE

#### FRAME_6755 — 21:40-21:50 16/02/9001

**EVT-0315 · ASSASSINATION — Kondo kills Miranda with a single pistol shot**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Imperial Capital Coup Attempt
- Actor: Lieutenant Tatsuya Kondo (Eastern Empire) vs Miranda (Eastern Empire) at Back streets of the Imperial Capital
- Immediate result: Miranda shot through the temple with a large Southern-style automatic pistol
- Operational consequence: Coup leadership eliminated
- Strategic significance: Yuuki's internal plan compromised
- Losses booked here: 1 KIA
- Graph: EVT-0314 → **EVT-0315** → EVT-0316
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V14 Ch3 — V14 Ch3 - the shot through the temple
- Note: See CAS-011.

State change: Empire KIA: 770000 -> 770001 | combatants: Yuuki; Miranda; Kondo -> Yuuki; Kondo | Imperial Capital frontline changed | Imperial Capital territorial control: CONTESTED -> EMPIRE_CONTROLLED | Imperial Capital battle status: ACTIVE -> CONCLUDED

#### FRAME_6756 — 21:50-22:00 16/02/9001

**EVT-0316 · INTELLIGENCE — Kondo extracts Miranda's knowledge with the skill Reader**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Imperial Capital Coup Attempt
- Actor: Lieutenant Tatsuya Kondo (Eastern Empire) vs Yuuki Kagurazaka (Eastern Empire) at Back streets of the Imperial Capital
- Immediate result: Miranda's intent, Yuuki's scheme and the end of the expedition all read instantly
- Operational consequence: Empire obtains full knowledge of the conspiracy
- Strategic significance: Imperial counter-move becomes possible
- Graph: EVT-0315 → **EVT-0316** → EVT-0317
- Canonical time: not a second was needed · Time basis: `EXPLICIT_RELATIVE` · Time confidence: MEDIUM · Overall: HIGH
- Source: V14 Ch3 — V14 Ch3 - the unique skill Reader used on contact

State change: commanders: Benimaru Supreme General (Tempest); imperial field command destroyed -> Benimaru Supreme General (Tempest); Calgurio imperial field command; Kondo holds the conspiracy in full

## 17/02/9001  ·  Campaign day C+47  ·  Battle day D+7

### 09:00–09:59  ·  C+47:09:00  ·  B+07:09:00

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Encrypted contact established between Rimuru and Yuuki via Gadra.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth (concluded); Imperial Capital Coup Attempt; Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:ACTIVE).

**Who.** Yuuki; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 770,001 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Calgurio imperial field command; Kondo holds the conspiracy in full
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial ground army destroyed; no coherent imperial force remains on the Jura front || Imperial Capital: Coup leadership eliminated; imperial capital secure || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_6823 — 09:00-09:10 17/02/9001

**EVT-0317 · INTELLIGENCE — Encrypted contact established between Rimuru and Yuuki via Gadra**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Imperial Capital Coup Attempt
- Actor: Gadra (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Yuuki's staff room
- Immediate result: Contact made through a concealed magic call; intercepted by Imperial Intelligence but not decrypted
- Operational consequence: Tempest and Yuuki's faction coordinate
- Strategic significance: Tempest gains an internal foothold in the Empire
- Graph: EVT-0316 → **EVT-0317** → EVT-0318
- Canonical time: only a few will come tomorrow · Time basis: `EXPLICIT_RELATIVE` · Time confidence: MEDIUM · Overall: HIGH
- Source: V14 Ch3 — V14 Ch3 - Gadra's encrypted magic call

State change: INHERITED_STATE

### 10:00–10:59  ·  C+47:10:00  ·  B+07:10:00

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Assessment that Tempest will send a small elite party.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth (concluded); Imperial Capital Coup Attempt; Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:ACTIVE).

**Who.** Yuuki; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 770,001 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Calgurio imperial field command; Kondo holds the conspiracy in full
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial ground army destroyed; no coherent imperial force remains on the Jura front || Imperial Capital: Coup leadership eliminated; imperial capital secure || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_6829 — 10:00-10:10 17/02/9001

**EVT-0318 · COMMAND — Assessment that Tempest will send a small elite party**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Imperial Capital Coup Attempt
- Actor: Yuuki Kagurazaka (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Yuuki's staff room
- Immediate result: Yuuki estimates at most about ten people; quality over quantity
- Operational consequence: No mass Tempest deployment expected in the capital
- Strategic significance: Capital operation to be decided by elite action
- Graph: EVT-0317 → **EVT-0318** → EVT-0319
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V14 Ch3 — V14 Ch3 - Yuuki's estimate of about ten
- Note: Large formations would be spotted by the capital's reconnaissance net.

State change: INHERITED_STATE

### 12:00–12:59  ·  C+47:12:00  ·  B+07:12:00

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Sixty thousand blockade the eastern metropolis of Dwargon.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth (concluded); Imperial Capital Coup Attempt; Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:ACTIVE).

**Who.** Yuuki; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 770,001 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Calgurio imperial field command; Kondo holds the conspiracy in full
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial ground army destroyed; no coherent imperial force remains on the Jura front || Imperial Capital: Coup leadership eliminated; imperial capital secure || Dwargon East: Sixty thousand imperial troops blockading the Isthmus gate

**Significance and frame detail**

#### FRAME_6841 — 12:00-12:10 17/02/9001

**EVT-0319 · DEPLOYMENT — Sixty thousand blockade the eastern metropolis of Dwargon**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern approach · Battle: Blockade of the Eastern Metropolis
- Actor: Hybrid Legion field element (Eastern Empire) vs Armed Nation of Dwargon (Armed Nation of Dwargon) at Eastern metropolis of Dwargon
- Immediate result: Blockade established; camp pitched; morale high
- Operational consequence: The blockade is camouflage for a secret alliance
- Strategic significance: A concealed second front prepared against the Empire
- Graph: EVT-0318 → **EVT-0319** → EVT-0320
- Canonical time: - · Time basis: `DAY_LEVEL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V14 Ch4 — V14 Ch4 - eastern metropolis blockaded by 60,000
- Note: Both camps had quietly formed an alliance.

State change: INHERITED_STATE

### 14:00–14:59  ·  C+47:14:30  ·  B+07:14:30

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Fire observed over the Imperial Capital from the blockade camp; Command authority collapses in the blockade force.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis. **Battles:** Battle of the Dwargon Gate (concluded); Battle of the Labyrinth (concluded); Imperial Capital Coup Attempt; Blockade of the Eastern Metropolis (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:ACTIVE).

**Who.** Yuuki; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 770,001 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); imperial blockade force has no authorised commander
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED || Labyrinth: TEMPEST_CONTROLLED || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Imperial ground army destroyed; no coherent imperial force remains on the Jura front || Imperial Capital: Coup leadership eliminated; imperial capital secure || Dwargon East: Blockade force leaderless and paralysed

**Significance and frame detail**

#### FRAME_6853 — 14:00-14:10 17/02/9001

**EVT-0320 · INTELLIGENCE — Fire observed over the Imperial Capital from the blockade camp**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern approach · Battle: Blockade of the Eastern Metropolis
- Actor: Hybrid Legion field element (Eastern Empire) vs Eastern Empire (Eastern Empire) at Blockade camp
- Immediate result: Troops observe a red glow over Tidu; the plan is suspected to have failed
- Operational consequence: Blockade force loses confidence in the plan
- Strategic significance: Coordination between the plot and the field force breaks
- Graph: EVT-0319 → **EVT-0320** → EVT-0321
- Canonical time: on that important day · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V14 Ch4 — V14 Ch4 - the red glow over the capital observed

State change: INHERITED_STATE

#### FRAME_6856 — 14:30-14:40 17/02/9001

**EVT-0321 · COMMAND_CHANGE — Command authority collapses in the blockade force**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern approach · Battle: Blockade of the Eastern Metropolis
- Actor: Hybrid Legion field element (Eastern Empire) vs Eastern Empire (Eastern Empire) at Blockade camp
- Immediate result: Absence of an authorised officer leaves no one able to give orders; the legion becomes unmanageable
- Operational consequence: Blockade force paralysed and leaderless
- Strategic significance: Formation left exposed for the second phase
- Graph: EVT-0320 → **EVT-0321** → EVT-0330
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V14 Ch4 — V14 Ch4 - no one responsible for orders; patchwork legion unmanageable
- Note: Disagreement over sending scouts versus acting as one body.

State change: commanders: Benimaru Supreme General (Tempest); Calgurio imperial field command; Kondo holds the conspiracy in full -> Benimaru Supreme General (Tempest); imperial blockade force has no authorised commander | Dwargon East frontline changed

### 22:00–22:59  ·  C+47:22:50  ·  B+07:22:50

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Velgrynd engages Veldora over the Great Jura Forest; The Great Jura Forest is set ablaze by the engagement; The gate connecting the labyrinth to the outside world is destroyed; The capital city Rimuru survives, having been concealed inside the labyrinth; Velgrynd deploys Parallel Existence; Relative assessment of the two dragons.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace). **Battles:** Battle of the Dwargon Gate (concluded); Dragon Engagement over the Great Jura Forest; Imperial Capital Coup Attempt; Blockade of the Eastern Metropolis; Dragon Engagement over the Great Jura Forest (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:ACTIVE; Dragon Theatre:ACTIVE).

**Who.** Veldora; Velgrynd; Gazel; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 770,001 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); imperial blockade force has no authorised commander
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Coup leadership eliminated; imperial capital secure || Dwargon East: Blockade force leaderless and paralysed || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision

**Significance and frame detail**

#### FRAME_6901 — 22:00-22:10 17/02/9001

**EVT-0330 · ENGAGEMENT — Velgrynd engages Veldora over the Great Jura Forest**

- Theatre: Dragon Theatre (Jura airspace) (TH-DRG) · Front: Jura airspace · Battle: Dragon Engagement over the Great Jura Forest
- Actor: Velgrynd (Scorch Dragon) (Eastern Empire) vs Veldora Tempest (Storm Dragon) (Jura-Tempest Federation) at Airspace over the Great Jura Forest
- Immediate result: Two dragons in combat; the sky bright despite the hour
- Operational consequence: Strategic-tier engagement opens the second phase
- Strategic significance: The war escalates beyond conventional forces
- Graph: EVT-0321 → **EVT-0330** → EVT-0331
- Canonical time: although it was late at night · Time basis: `DAY_LEVEL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V14 Epilogue — V14 Epilogue - the two dragons in battle at night

State change: combatants: Yuuki; Kondo -> Veldora; Velgrynd; Gazel; Kondo | Dragon Theatre theatre status: INACTIVE -> ACTIVE | Dragon Theatre battle: Dragon Engagement over the Great Jura Forest | Dragon Theatre frontline changed | Dragon Theatre territorial control: NEUTRAL -> CONTESTED | Dragon Theatre battle status: NOT_STARTED -> ACTIVE

#### FRAME_6902 — 22:10-22:20 17/02/9001

**EVT-0331 · UNIT_DESTRUCTION — The Great Jura Forest is set ablaze by the engagement**

- Theatre: Dragon Theatre (Jura airspace) (TH-DRG) · Front: Jura airspace · Battle: Dragon Engagement over the Great Jura Forest
- Actor: Velgrynd (Scorch Dragon) (Eastern Empire) vs Great Jura Forest (Jura-Tempest Federation) at Great Jura Forest
- Immediate result: The forest burns; the night sky reflects the flames
- Operational consequence: Tempest's home theatre suffers major terrain damage
- Strategic significance: Territorial damage to Tempest without troop losses
- Graph: EVT-0330 → **EVT-0331** → EVT-0332
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V14 Epilogue — V14 Epilogue - the forest burning with flame

State change: Dwargon Gate territorial control: TEMPEST_CONTROLLED -> TEMPEST_CONTROLLED (terrain destroyed)

#### FRAME_6903 — 22:20-22:30 17/02/9001

**EVT-0332 · UNIT_DESTRUCTION — The gate connecting the labyrinth to the outside world is destroyed**

- Theatre: Ramiris Labyrinth Front (TH-LAB) · Front: Ramiris Labyrinth Front · Battle: Dragon Engagement over the Great Jura Forest
- Actor: Velgrynd (Scorch Dragon) (Eastern Empire) vs Ramiris Labyrinth (Jura-Tempest Federation) at Labyrinth gate and upper floors
- Immediate result: Labyrinth gate destroyed; the upper floors assessed as likely destroyed as well
- Operational consequence: Labyrinth access severed
- Strategic significance: Tempest's principal defensive asset partially disabled
- Graph: EVT-0331 → **EVT-0332** → EVT-0333
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V14 Epilogue — V14 Epilogue - destruction of the gate; upper floors likely destroyed

State change: Labyrinth theatre status: CLEARED -> DAMAGED | Labyrinth battle: Dragon Engagement over the Great Jura Forest | Labyrinth frontline changed | Labyrinth territorial control: TEMPEST_CONTROLLED -> TEMPEST_CONTROLLED (access severed)

#### FRAME_6904 — 22:30-22:40 17/02/9001

**EVT-0333 · EVACUATION — The capital city Rimuru survives, having been concealed inside the labyrinth**

- Theatre: Ramiris Labyrinth Front (TH-LAB) · Front: Ramiris Labyrinth Front · Battle: Dragon Engagement over the Great Jura Forest
- Actor: Ramiris (Jura-Tempest Federation) vs Velgrynd (Scorch Dragon) (Eastern Empire) at Rimuru city, inside the labyrinth
- Immediate result: The city takes no damage; on the surface it would have been wiped out
- Operational consequence: Tempest's civilian centre preserved
- Strategic significance: Pre-war concealment decision validated
- Graph: EVT-0332 → **EVT-0333** → EVT-0334
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V14 Epilogue — V14 Epilogue - the city hidden in the labyrinth took no damage

State change: INHERITED_STATE

#### FRAME_6905 — 22:40-22:50 17/02/9001

**EVT-0334 · SPECIAL_ABILITY — Velgrynd deploys Parallel Existence**

- Theatre: Dragon Theatre (Jura airspace) (TH-DRG) · Front: Jura airspace · Battle: Dragon Engagement over the Great Jura Forest
- Actor: Velgrynd (Scorch Dragon) (Eastern Empire) vs Veldora Tempest (Storm Dragon) (Jura-Tempest Federation) at Airspace over the Great Jura Forest
- Immediate result: The engagement enters stasis; neither dragon can force a decision
- Operational consequence: Dragon theatre becomes a fixed attritional stalemate
- Strategic significance: Both strategic assets pinned against each other
- Graph: EVT-0333 → **EVT-0334** → EVT-0335
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V14 Epilogue — V14 Epilogue - Parallel Existence; the fight in stasis

State change: Dragon Theatre frontline changed

#### FRAME_6906 — 22:50-23:00 17/02/9001

**EVT-0335 · ENGAGEMENT — Relative assessment of the two dragons**

- Theatre: Dragon Theatre (Jura airspace) (TH-DRG) · Front: Jura airspace · Battle: Dragon Engagement over the Great Jura Forest
- Actor: Veldora Tempest (Jura-Tempest Federation) vs Velgrynd (Scorch Dragon) (Eastern Empire) at Airspace over the Great Jura Forest
- Immediate result: Veldora holds a slight edge in raw magicule volume and speed; Velgrynd holds the advantage in magic operation
- Operational consequence: Neither side can convert the duel into a decision
- Strategic significance: The real fight is judged to be only beginning
- Graph: EVT-0334 → **EVT-0335** → EVT-0340
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: MEDIUM
- Source: V14 Epilogue — V14 Epilogue - comparative assessment of the two dragons
- Note: Veldora had trained secretly while sealed.

State change: INHERITED_STATE

## 18/02/9001  ·  Campaign day C+48  ·  Battle day D+8

### 06:00–06:59  ·  C+48:06:40  ·  B+08:06:40

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Gazel takes position on a desperate battlefield; Dwargon witnesses the destruction of the Imperial Hybrid Legion; Reconnaissance detects a ritual behind the Scorch Dragon.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace). **Battles:** Battle of the Dwargon Gate (concluded); Dragon Engagement over the Great Jura Forest; Imperial Capital Coup Attempt; Battle of the Dwargon Eastern Front; Dragon Engagement over the Great Jura Forest (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:INTENSIFYING; Dragon Theatre:ACTIVE).

**Who.** Veldora; Velgrynd; Gazel; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 770,001 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); imperial blockade force has no authorised commander
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Coup leadership eliminated; imperial capital secure || Dwargon East: Dwargon formed up against Velgrynd on a position assessed as unwinnable || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision

**Significance and frame detail**

#### FRAME_6949 — 06:00-06:10 18/02/9001

**EVT-0340 · DEFENSE — Gazel takes position on a desperate battlefield**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern front · Battle: Battle of the Dwargon Eastern Front
- Actor: King Gazel Dwargo (Armed Nation of Dwargon) vs Velgrynd (Scorch Dragon) (Eastern Empire) at Dwargon eastern battlefield
- Immediate result: Dwargon forces formed up to await Gazel; the situation assessed as unwinnable by conventional means
- Operational consequence: Dwargon commits to fighting rather than submitting
- Strategic significance: Dwargon accepts heavy loss to avoid capitulation
- Graph: EVT-0335 → **EVT-0340** → EVT-0341
- Canonical time: at the same time as Rimuru's infiltration · Time basis: `EXPLICIT_RELATIVE` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch1 — V15 Ch1 - Gazel on a desperate battlefield
- Note: Parallel to Rimuru's infiltration of the Imperial Capital.

State change: Dwargon East battle: Battle of the Dwargon Eastern Front | Dwargon East frontline changed | Dwargon East battle status: ACTIVE -> INTENSIFYING

#### FRAME_6951 — 06:20-06:30 18/02/9001

**EVT-0341 · INTELLIGENCE — Dwargon witnesses the destruction of the Imperial Hybrid Legion**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern front · Battle: Battle of the Dwargon Eastern Front
- Actor: Dwargon Supreme Commander (Armed Nation of Dwargon) vs Hybrid Legion field element (Eastern Empire) at Dwargon eastern battlefield
- Immediate result: The Hybrid Legion's end observed from the Dwargon formation; the troops left speechless
- Operational consequence: The Empire's own formation is consumed on this front
- Strategic significance: An imperial legion is destroyed by imperial action
- Graph: EVT-0340 → **EVT-0341** → EVT-0342
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch1 — V15 Ch1 - witnessing the end of the Imperial Hybrid Legion

State change: INHERITED_STATE

#### FRAME_6953 — 06:40-06:50 18/02/9001

**EVT-0342 · RECONNAISSANCE — Reconnaissance detects a ritual behind the Scorch Dragon**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern front · Battle: Battle of the Dwargon Eastern Front
- Actor: Anrietta (Armed Nation of Dwargon) vs Ritual casters (Eastern Empire) at Behind the Scorch Dragon's position
- Immediate result: Multiple beings detected conducting a ritual; Lady Jane assesses grand magic as part of it
- Operational consequence: The true enemy centre of gravity is identified
- Strategic significance: Dwargon's target shifts from the dragon to the casters
- Graph: EVT-0341 → **EVT-0342** → EVT-0343
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch1 — V15 Ch1 - Anrietta's report on the ritual

State change: INHERITED_STATE

### 07:00–07:59  ·  C+48:07:40  ·  B+08:07:40

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Sixty thousand troops expended as the ritual's sacrifice; Gazel decides against committing the heavy assault force; Five hundred Sky Knights committed to a special attack.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace). **Battles:** Battle of the Dwargon Gate (concluded); Dragon Engagement over the Great Jura Forest; Imperial Capital Coup Attempt; Battle of the Dwargon Eastern Front; Dragon Engagement over the Great Jura Forest (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:INTENSIFYING; Dragon Theatre:ACTIVE).

**Who.** Veldora; Velgrynd; Gazel; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); imperial blockade force has no authorised commander
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Coup leadership eliminated; imperial capital secure || Dwargon East: Five hundred Sky Knights attacking the ritual casters || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision

**Significance and frame detail**

#### FRAME_6955 — 07:00-07:10 18/02/9001

**EVT-0343 · CASUALTY_EVENT — Sixty thousand troops expended as the ritual's sacrifice**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern front · Battle: Battle of the Dwargon Eastern Front
- Actor: Ritual casters (Eastern Empire) vs Hybrid Legion field element (Eastern Empire) at Behind the Scorch Dragon's position
- Immediate result: The great magic ritual is performed at the cost of 60,000 imperial troops
- Operational consequence: The Hybrid Legion field element is destroyed by its own side
- Strategic significance: Empire sacrifices an entire legion for a magical objective
- Losses booked here: 60,000 KIA
- Graph: EVT-0342 → **EVT-0343** → EVT-0344
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch1 — V15 Ch1 - great magic performed at the cost of 60,000 troops
- Note: See CAS-012. Same formation as EVT-0319.

State change: Empire KIA: 770001 -> 830001 | Dwargon East frontline changed

#### FRAME_6957 — 07:20-07:30 18/02/9001

**EVT-0344 · COMMAND — Gazel decides against committing the heavy assault force**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern front · Battle: Battle of the Dwargon Eastern Front
- Actor: King Gazel Dwargo (Armed Nation of Dwargon) vs Ritual casters (Eastern Empire) at Dwargon eastern battlefield
- Immediate result: Heavy armed assault force held back: poor mobility would make it a magic target
- Operational consequence: Dwargon preserves its heavy formation
- Strategic significance: Only a special attack remains viable
- Graph: EVT-0343 → **EVT-0344** → EVT-0345
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch1 — V15 Ch1 - Gazel shakes his head at Dorf's question

State change: INHERITED_STATE

#### FRAME_6959 — 07:40-07:50 18/02/9001

**EVT-0345 · ATTACK — Five hundred Sky Knights committed to a special attack**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern front · Battle: Battle of the Dwargon Eastern Front
- Actor: Sky Knights (Armed Nation of Dwargon) vs Ritual casters (Eastern Empire) at Dwargon eastern battlefield
- Immediate result: The only remaining course: a special attack by the 500 Sky Knights against the ritual casters
- Operational consequence: Dwargon reduces its own defensive strength to strike
- Strategic significance: Dwargon takes the offensive at high risk
- Graph: EVT-0344 → **EVT-0345** → EVT-0346
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch1 — V15 Ch1 - the 500 Sky Knights launch a special attack
- Note: Reducing the defensive force here was acknowledged as a bad idea.

State change: Dwargon East frontline changed

### 08:00–08:59  ·  C+48:08:40  ·  B+08:08:40

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Gabil arrives with the Floor Guardian Colossus; Gadra rides the Colossus and fires it at Velgrynd; Gabil and Dorf agree a joint scheme of manoeuvre; Gabil launches a solo lightning attack.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace). **Battles:** Battle of the Dwargon Gate (concluded); Dragon Engagement over the Great Jura Forest; Imperial Capital Coup Attempt; Battle of the Dwargon Eastern Front; Dragon Engagement over the Great Jura Forest (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:INTENSIFYING; Dragon Theatre:ACTIVE).

**Who.** Gabil; Gadra; Gazel; Dorf; Velgrynd; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Dorf holding joint command on the eastern front; Calgurio imperial field command
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: EMPIRE_CONTROLLED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Coup leadership eliminated; imperial capital secure || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision

**Significance and frame detail**

#### FRAME_6961 — 08:00-08:10 18/02/9001

**EVT-0346 · REINFORCEMENT — Gabil arrives with the Floor Guardian Colossus**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern front · Battle: Battle of the Dwargon Eastern Front
- Actor: Third Corps (Flying Dragons) (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Dwargon eastern battlefield
- Immediate result: One hundred Flying Dragons airlift the Colossus onto the battlefield by chain
- Operational consequence: Tempest heavy assault capability arrives at Dwargon
- Strategic significance: Dwargon is no longer fighting alone
- Graph: EVT-0345 → **EVT-0346** → EVT-0347
- Canonical time: a little late · Time basis: `EXPLICIT_RELATIVE` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch1 — V15 Ch1 - Gabil arrives late; the Colossus carried by one hundred
- Note: The Colossus is slow to move but excellent in close combat.

State change: combatants: Veldora; Velgrynd; Gazel; Kondo -> Gabil; Gadra; Gazel; Dorf; Velgrynd; Kondo | Dwargon East frontline changed

#### FRAME_6963 — 08:20-08:30 18/02/9001

**EVT-0347 · ATTACK — Gadra rides the Colossus and fires it at Velgrynd**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern front · Battle: Battle of the Dwargon Eastern Front
- Actor: Gadra (Jura-Tempest Federation) vs Velgrynd (Scorch Dragon) (Eastern Empire) at Dwargon eastern battlefield
- Immediate result: Gadra takes position on the Colossus and launches it at Velgrynd
- Operational consequence: Velgrynd is engaged by a dedicated element
- Strategic significance: The Scorch Dragon is fixed away from the main battle
- Graph: EVT-0346 → **EVT-0347** → EVT-0348
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch1 — V15 Ch1 - Gadra fires the Colossus toward Velgrynd
- Note: Gadra defers to Gazel regarding Kondo.

State change: INHERITED_STATE

#### FRAME_6964 — 08:30-08:40 18/02/9001

**EVT-0348 · COMMAND — Gabil and Dorf agree a joint scheme of manoeuvre**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern front · Battle: Battle of the Dwargon Eastern Front
- Actor: Gabil / Dorf (Jura-Tempest Federation) vs Kondo's associates (Eastern Empire) at Dwargon eastern battlefield
- Immediate result: Flying Dragons to lead as the main force with Dorf's troops as reinforcement; command passed to Dorf
- Operational consequence: Allied command unified on the eastern front
- Strategic significance: Tempest and Dwargon fight as one formation
- Graph: EVT-0347 → **EVT-0348** → EVT-0349
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch1 — V15 Ch1 - Gabil and Dorf nod to one another
- Note: Flying Dragons act as a flesh shield, sustained by full-recovery potions.

State change: commanders: Benimaru Supreme General (Tempest); imperial blockade force has no authorised commander -> Benimaru Supreme General (Tempest); Dorf holding joint command on the eastern front; Calgurio imperial field command

#### FRAME_6965 — 08:40-08:50 18/02/9001

**EVT-0349 · ATTACK — Gabil launches a solo lightning attack**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern front · Battle: Battle of the Dwargon Eastern Front
- Actor: Gabil (Jura-Tempest Federation) vs Kondo's associates (Eastern Empire) at Dwargon eastern battlefield
- Immediate result: Gabil strikes directly at a group of Kondo's associates, circling behind the enemy force
- Operational consequence: Enemy rear is turned
- Strategic significance: Allied attack develops from two directions
- Graph: EVT-0348 → **EVT-0349** → EVT-0350
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch1 — V15 Ch1 - Gabil attacks and circles to the enemy rear
- Note: Dorf surprised by the unilateral action.

State change: INHERITED_STATE

### 09:00–09:59  ·  C+48:09:20  ·  B+08:09:20

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Gobya's Kurenai advance force reaches the battlefield on foot; Rimuru infiltrates the Imperial Capital; Veyron and Zonda arrive on the eastern front.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace). **Battles:** Battle of the Dwargon Gate (concluded); Dragon Engagement over the Great Jura Forest; Imperial Capital Confrontation; Battle of the Dwargon Eastern Front; Dragon Engagement over the Great Jura Forest (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:ACTIVE; Dwargon East:INTENSIFYING; Dragon Theatre:ACTIVE).

**Who.** Gabil; Gadra; Gobya; Hakurou; Phobio; Gazel; Dorf; Velgrynd; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA 0; Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Benimaru Supreme General (Tempest); Dorf holding joint command on the eastern front; Calgurio imperial field command
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: CONTESTED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Tempest command element operating covertly inside the imperial capital || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision

**Significance and frame detail**

#### FRAME_6967 — 09:00-09:10 18/02/9001

**EVT-0350 · REINFORCEMENT — Gobya's Kurenai advance force reaches the battlefield on foot**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern front · Battle: Battle of the Dwargon Eastern Front
- Actor: Kurenai advance force (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Dwargon eastern battlefield
- Immediate result: Arrived last, having moved overland at A-rank speed; Hakurou advising, Phobio attached
- Operational consequence: Tempest ground element joins the eastern front
- Strategic significance: Full allied concentration achieved
- Graph: EVT-0349 → **EVT-0350** → EVT-0360
- Canonical time: hardly arrived before the war began · Time basis: `EXPLICIT_RELATIVE` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch1 — V15 Ch1 - Gobya's force arrives last, Hakurou as advisor
- Note: Phobio the Panthertooth of Carrion's Three Beastmen present.

State change: combatants: Gabil; Gadra; Gazel; Dorf; Velgrynd; Kondo -> Gabil; Gadra; Gobya; Hakurou; Phobio; Gazel; Dorf; Velgrynd; Kondo | Imperial Capital battle: Imperial Capital Confrontation | Imperial Capital frontline changed | Imperial Capital territorial control: EMPIRE_CONTROLLED -> CONTESTED | Imperial Capital battle status: CONCLUDED -> ACTIVE

#### FRAME_6967 — 09:00-09:10 18/02/9001

**EVT-0360 · MOVEMENT — Rimuru infiltrates the Imperial Capital**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Imperial Capital Confrontation
- Actor: Rimuru Tempest (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Imperial Capital
- Immediate result: Rimuru's party enters the capital with a small elite escort
- Operational consequence: Tempest command element operating inside the Empire
- Strategic significance: Decision sought at the imperial centre
- Graph: EVT-0350 → **EVT-0360** → EVT-0351
- Canonical time: - · Time basis: `EXPLICIT_RELATIVE` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch1 — V15 Ch1 - Rimuru preparing to infiltrate the Imperial Capital
- Note: Concurrent with Gazel's battle. Parallel theatre.

State change: combatants: Gabil; Gadra; Gazel; Dorf; Velgrynd; Kondo -> Gabil; Gadra; Gobya; Hakurou; Phobio; Gazel; Dorf; Velgrynd; Kondo | Imperial Capital battle: Imperial Capital Confrontation | Imperial Capital frontline changed | Imperial Capital territorial control: EMPIRE_CONTROLLED -> CONTESTED | Imperial Capital battle status: CONCLUDED -> ACTIVE

#### FRAME_6969 — 09:20-09:30 18/02/9001

**EVT-0351 · REINFORCEMENT — Veyron and Zonda arrive on the eastern front**

- Theatre: Dwargon Eastern Metropolis (TH-DWE) · Front: Dwargon eastern front · Battle: Battle of the Dwargon Eastern Front
- Actor: Ultima's subordinates (Veyron, Zonda) (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Dwargon eastern battlefield
- Immediate result: Ultima's subordinates join the battlefield
- Operational consequence: Demon-tier reinforcement added to the eastern front
- Strategic significance: Allied qualitative superiority increased
- Graph: EVT-0360 → **EVT-0351** → EVT-0361
- Canonical time: arrived at an unstated time · Time basis: `SIMULATION_RECONSTRUCTED` · Time confidence: LOW · Overall: MEDIUM
- Source: V15 Ch1 — V15 Ch1 - Ultima's forces Veyron and Zonda arrive
- Note: Arrival time explicitly unstated in the source.

State change: INHERITED_STATE

### 10:00–10:59  ·  C+48:10:40  ·  B+08:10:40

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Rimuru's party isolated into a sealed space; Shion and others are killed; Imperial objective identified as the capture of Veldora.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace). **Battles:** Battle of the Dwargon Gate (concluded); Dragon Engagement over the Great Jura Forest; Imperial Capital Confrontation; Battle of the Dwargon Eastern Front; Dragon Engagement over the Great Jura Forest (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:INTENSIFYING; Dwargon East:INTENSIFYING; Dragon Theatre:ACTIVE).

**Who.** Gabil; Gadra; Gobya; Hakurou; Phobio; Gazel; Dorf; Velgrynd; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA UNKNOWN (min 1); Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Rimuru and Benimaru cut off; Tempest field command decentralised
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: CONTESTED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Tempest personnel killed inside the sealed space || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision

**Significance and frame detail**

#### FRAME_6973 — 10:00-10:10 18/02/9001

**EVT-0361 · ENCIRCLEMENT — Rimuru's party isolated into a sealed space**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Imperial Capital Confrontation
- Actor: Eastern Empire (Eastern Empire) vs Rimuru Tempest (Jura-Tempest Federation) at Sealed space, Imperial Capital
- Immediate result: The party is confined; forcible exit considered
- Operational consequence: Tempest command element trapped and cut off
- Strategic significance: Tempest leadership neutralised at the critical moment
- Graph: EVT-0351 → **EVT-0361** → EVT-0362
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch2 — V15 Ch2 - the party isolated into a special space
- Note: Raphael also thrown into confusion.

State change: commanders: Benimaru Supreme General (Tempest); Dorf holding joint command on the eastern front; Calgurio imperial field command -> Rimuru and Benimaru cut off; Tempest field command decentralised | Imperial Capital frontline changed | Imperial Capital battle status: ACTIVE -> INTENSIFYING

#### FRAME_6975 — 10:20-10:30 18/02/9001

**EVT-0362 · CASUALTY_EVENT — Shion and others are killed**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Imperial Capital Confrontation
- Actor: Eastern Empire (Eastern Empire) vs Shion and others (Jura-Tempest Federation) at Sealed space, Imperial Capital
- Immediate result: Tempest personnel killed inside the sealed space
- Operational consequence: First confirmed Tempest deaths of the campaign
- Strategic significance: Tempest suffers its first losses of the war
- Graph: EVT-0361 → **EVT-0362** → EVT-0363
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch2 — V15 Ch2 - the killing of Shion and the others
- Note: Number not stated. See CAS-013 and AMB-010.

State change: Tempest KIA: 0 -> UNKNOWN (min 1) | Imperial Capital frontline changed

#### FRAME_6977 — 10:40-10:50 18/02/9001

**EVT-0363 · COMMAND — Imperial objective identified as the capture of Veldora**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Imperial Capital Confrontation
- Actor: Eastern Empire (Eastern Empire) vs Veldora Tempest (Jura-Tempest Federation) at Sealed space, Imperial Capital
- Immediate result: The enemy aim is established as capturing Veldora, with measures taken to prevent interference
- Operational consequence: Tempest understands the true imperial objective
- Strategic significance: The war's objective is revealed as the Storm Dragon
- Graph: EVT-0362 → **EVT-0363** → EVT-0370
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch2 — V15 Ch2 - the enemy's goal is to capture Veldora

State change: INHERITED_STATE

### 11:00–11:59  ·  C+48:11:40  ·  B+08:11:40

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Three hundred airships fly the Warcraft Legion toward the central continent; Velgrynd revealed aboard as the Marshal; Velgrynd issues orders to Gladim by screen.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace). **Battles:** Battle of the Dwargon Gate (concluded); Dragon Engagement over the Great Jura Forest; Warcraft Legion Air Movement; Battle of the Dwargon Eastern Front; Dragon Engagement over the Great Jura Forest (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:INTENSIFYING; Dwargon East:INTENSIFYING; Dragon Theatre:ACTIVE).

**Who.** Gabil; Gadra; Gobya; Hakurou; Phobio; Gazel; Dorf; Velgrynd; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA UNKNOWN (min 1); Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Rimuru and Benimaru cut off; Tempest field command decentralised
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: CONTESTED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Tempest personnel killed inside the sealed space || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision

**Significance and frame detail**

#### FRAME_6979 — 11:00-11:10 18/02/9001

**EVT-0370 · MOVEMENT — Three hundred airships fly the Warcraft Legion toward the central continent**

- Theatre: Imperial Capital (TH-CAP) · Front: Strategic air movement · Battle: Warcraft Legion Air Movement
- Actor: Airship transport flotilla (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Airspace over northern Ingracia
- Immediate result: Samuel commands 300 airships carrying 30,000 Warcraft Legion under Grand Admiral Gladim
- Operational consequence: Empire's elite legion redeployed by air
- Strategic significance: A fresh imperial elite formation enters the war
- Graph: EVT-0363 → **EVT-0370** → EVT-0371
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V15 Ch3 — V15 Ch3 - Samuel leads 300 airships with 30,000 Warcraft Legion
- Note: Air route chosen as safer than the sea route.

State change: Imperial Capital battle: Warcraft Legion Air Movement

#### FRAME_6981 — 11:20-11:30 18/02/9001

**EVT-0371 · INTELLIGENCE — Velgrynd revealed aboard as the Marshal**

- Theatre: Imperial Capital (TH-CAP) · Front: Strategic air movement · Battle: Warcraft Legion Air Movement
- Actor: Velgrynd (Scorch Dragon) (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Aboard Samuel's flagship
- Immediate result: A very noble presence aboard, unknown even to Calgurio; identified as Velgrynd in the role of Marshal
- Operational consequence: Imperial command structure revealed as fronted by a True Dragon
- Strategic significance: The Empire's guardian dragon is directing operations
- Graph: EVT-0370 → **EVT-0371** → EVT-0372
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch3 — V15 Ch3 - the noble presence aboard; Velgrynd as Marshal
- Note: Gladim, on a different warship, could not sense her dominance through the screen.

State change: INHERITED_STATE

#### FRAME_6983 — 11:40-11:50 18/02/9001

**EVT-0372 · COMMAND — Velgrynd issues orders to Gladim by screen**

- Theatre: Imperial Capital (TH-CAP) · Front: Strategic air movement · Battle: Warcraft Legion Air Movement
- Actor: Velgrynd (Scorch Dragon) (Eastern Empire) vs Grand Admiral Gladim (Eastern Empire) at Aboard Samuel's flagship
- Immediate result: Gladim ordered to fight on the Emperor's authority; Gladim boastful, Samuel nervous
- Operational consequence: Warcraft Legion committed on imperial order
- Strategic significance: Gladim's ambitions tied to the operation
- Graph: EVT-0371 → **EVT-0372** → EVT-0373
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch3 — V15 Ch3 - Velgrynd contacts Gladim's ship and gives orders
- Note: Gladim expected Calgurio's and Yuuki's discredit to leave him pre-eminent.

State change: INHERITED_STATE

### 12:00–12:59  ·  C+48:12:00  ·  B+08:12:00

**Phase:** SECOND_OFFENSIVE · **Stage:** SECOND_PHASE

**What happened.** Velgrynd opens a space-time connection to move the fleet.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace). **Battles:** Battle of the Dwargon Gate (concluded); Dragon Engagement over the Great Jura Forest; Warcraft Legion Air Movement; Battle of the Dwargon Eastern Front; Dragon Engagement over the Great Jura Forest (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:INTENSIFYING; Dwargon East:INTENSIFYING; Dragon Theatre:ACTIVE).

**Who.** Gabil; Gadra; Gobya; Hakurou; Phobio; Gazel; Dorf; Velgrynd; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA UNKNOWN (min 1); Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Rimuru and Benimaru cut off; Tempest field command decentralised
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: CONTESTED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Tempest personnel killed inside the sealed space || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision

**Significance and frame detail**

#### FRAME_6985 — 12:00-12:10 18/02/9001

**EVT-0373 · SPECIAL_ABILITY — Velgrynd opens a space-time connection to move the fleet**

- Theatre: Imperial Capital (TH-CAP) · Front: Strategic air movement · Battle: Warcraft Legion Air Movement
- Actor: Velgrynd (Scorch Dragon) (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Airspace over northern Ingracia
- Immediate result: Velgrynd flies out of the bridge door and opens a large spatial distortion; Space Domination shields the ship
- Operational consequence: The airborne legion is repositioned instantaneously
- Strategic significance: Imperial strategic mobility becomes effectively unlimited
- Graph: EVT-0372 → **EVT-0373** → EVT-0380
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: MEDIUM · Overall: HIGH
- Source: V15 Ch3 — V15 Ch3 - time, space, connection; the spatial distortion opens
- Note: Destination not stated. See MOV-015 and AMB-009.

State change: INHERITED_STATE

## 19/02/9001  ·  Campaign day C+49  ·  Battle day D+9

### 08:00–08:59  ·  C+49:08:00  ·  B+09:08:00

**Phase:** TERMINATION_AND_SETTLEMENT · **Stage:** ARMISTICE

**What happened.** Diablo deliberately withholds himself from the battle.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace). **Battles:** Battle of the Dwargon Gate (concluded); Dragon Engagement over the Great Jura Forest; Eight Gates; Battle of the Dwargon Eastern Front; Dragon Engagement over the Great Jura Forest (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:INTENSIFYING; Dwargon East:INTENSIFYING; Dragon Theatre:ACTIVE).

**Who.** Gabil; Gadra; Gobya; Hakurou; Phobio; Gazel; Dorf; Velgrynd; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA UNKNOWN (min 1); Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Rimuru and Benimaru cut off; Tempest field command decentralised
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: CONTESTED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Tempest personnel killed inside the sealed space || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision

**Significance and frame detail**

#### FRAME_7105 — 08:00-08:10 19/02/9001

**EVT-0380 · COMMAND — Diablo deliberately withholds himself from the battle**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Eight Gates
- Actor: Diablo (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Imperial Capital
- Immediate result: Diablo stays close to Rimuru rather than fighting, judging only Velgrynd would offer a real contest
- Operational consequence: Tempest's strongest reserve held uncommitted
- Strategic significance: Growth of Benimaru and others prioritised over quick victory
- Graph: EVT-0373 → **EVT-0380** → EVT-0381
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: MEDIUM
- Source: V15 Ch4 — V15 Ch4 - Diablo's reason for not joining the war

State change: Imperial Capital battle: Eight Gates

### 10:00–10:59  ·  C+49:10:00  ·  B+09:10:00

**Phase:** TERMINATION_AND_SETTLEMENT · **Stage:** ARMISTICE

**What happened.** The truth of the Emperor is established.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace). **Battles:** Battle of the Dwargon Gate (concluded); Dragon Engagement over the Great Jura Forest; Eight Gates; Battle of the Dwargon Eastern Front; Dragon Engagement over the Great Jura Forest (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:INTENSIFYING; Dwargon East:INTENSIFYING; Dragon Theatre:ACTIVE).

**Who.** Gabil; Gadra; Gobya; Hakurou; Phobio; Gazel; Dorf; Velgrynd; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA UNKNOWN (min 1); Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Rimuru and Benimaru cut off; Tempest field command decentralised
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: CONTESTED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Tempest personnel killed inside the sealed space || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision

**Significance and frame detail**

#### FRAME_7117 — 10:00-10:10 19/02/9001

**EVT-0381 · INTELLIGENCE — The truth of the Emperor is established**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial Capital · Battle: Eight Gates
- Actor: Rimuru Tempest (Jura-Tempest Federation) vs Emperor Rudra (Eastern Empire) at Imperial Capital
- Immediate result: The nature of the imperial throne is uncovered
- Operational consequence: Imperial legitimacy is called into question
- Strategic significance: Basis for a negotiated settlement created
- Graph: EVT-0380 → **EVT-0381** → EVT-0382
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: MEDIUM
- Source: V15 Ch5 — V15 Ch5 - The Truth of the Emperor
- Note: Chapter-level. Further breakdown deferred. See AMB-008.

State change: INHERITED_STATE

### 12:00–12:59  ·  C+49:12:00  ·  B+09:12:00

**Phase:** TERMINATION_AND_SETTLEMENT · **Stage:** ARMISTICE

**What happened.** Testarossa secures a decisive tactical victory.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace). **Battles:** Battle of the Dwargon Gate (concluded); Dragon Engagement over the Great Jura Forest; Eight Gates; Battle of the Dwargon Eastern Front; Dragon Engagement over the Great Jura Forest (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:INTENSIFYING; Dwargon East:INTENSIFYING; Dragon Theatre:ACTIVE).

**Who.** Gabil; Gadra; Gobya; Hakurou; Phobio; Gazel; Dorf; Velgrynd; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA UNKNOWN (min 1); Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Rimuru and Benimaru cut off; Tempest field command decentralised
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: CONTESTED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Imperial resistance broken in Testarossa's sector || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision

**Significance and frame detail**

#### FRAME_7129 — 12:00-12:10 19/02/9001

**EVT-0382 · ENGAGEMENT — Testarossa secures a decisive tactical victory**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial theatre · Battle: -
- Actor: Testarossa (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Imperial theatre
- Immediate result: The engagement ends in a clear victory for Testarossa
- Operational consequence: Imperial resistance in her sector ends
- Strategic significance: Tempest holds the field in the imperial theatre
- Graph: EVT-0381 → **EVT-0382** → EVT-0383
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: MEDIUM
- Source: V15 Epilogue — V15 Epilogue - a decisive victory for Testarossa

State change: Imperial Capital frontline changed

### 13:00–13:59  ·  C+49:13:00  ·  B+09:13:00

**Phase:** TERMINATION_AND_SETTLEMENT · **Stage:** ARMISTICE

**What happened.** The undead taboo spell lapses.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace). **Battles:** Battle of the Dwargon Gate (concluded); Dragon Engagement over the Great Jura Forest; Eight Gates; Battle of the Dwargon Eastern Front; Dragon Engagement over the Great Jura Forest (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:INTENSIFYING; Dwargon East:INTENSIFYING; Dragon Theatre:ACTIVE).

**Who.** Gabil; Gadra; Gobya; Hakurou; Phobio; Gazel; Dorf; Velgrynd; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest ADVANCING (retreating: NO); Empire DESTROYED (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA UNKNOWN (min 1); Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Rimuru and Benimaru cut off; Tempest field command decentralised
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: CONTESTED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Imperial resistance broken in Testarossa's sector || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision

**Significance and frame detail**

#### FRAME_7135 — 13:00-13:10 19/02/9001

**EVT-0383 · AFTERMATH — The undead taboo spell lapses**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial theatre · Battle: -
- Actor: Adalman (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Imperial theatre
- Immediate result: The taboo spell sustaining the undead is assessed as long since ended
- Operational consequence: Undead formations stand down
- Strategic significance: Labyrinth attrition mechanism concludes
- Graph: EVT-0382 → **EVT-0383** → EVT-0384
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: MEDIUM
- Source: V15 Epilogue — V15 Epilogue - the undead taboo spell has ended

State change: INHERITED_STATE

### 14:00–14:59  ·  C+49:14:00  ·  B+09:14:00

**Phase:** TERMINATION_AND_SETTLEMENT · **Stage:** ARMISTICE

**What happened.** The Empire proposes an armistice.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace). **Battles:** Battle of the Dwargon Gate (concluded); Dragon Engagement over the Great Jura Forest; Eight Gates; Battle of the Dwargon Eastern Front; Dragon Engagement over the Great Jura Forest (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:CONCLUDED; Dragon Theatre:CONCLUDED).

**Who.** Gabil; Gadra; Gobya; Hakurou; Phobio; Gazel; Dorf; Velgrynd; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire N/A (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA UNKNOWN (min 1); Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Rimuru and Benimaru cut off; Tempest field command decentralised
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: CONTESTED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Armistice proposed; active hostilities suspended || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision

**Significance and frame detail**

#### FRAME_7141 — 14:00-14:10 19/02/9001

**EVT-0384 · NEGOTIATION — The Empire proposes an armistice**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial theatre · Battle: -
- Actor: Eastern Empire (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Imperial theatre
- Immediate result: An armistice is raised once the imperial position becomes untenable
- Operational consequence: Active hostilities move toward suspension
- Strategic significance: The Tempest-Eastern Empire War ends
- Graph: EVT-0383 → **EVT-0384** → EVT-0385
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: MEDIUM
- Source: V15 Epilogue — V15 Epilogue - an armistice is raised

State change: Tempest movement: ADVANCING -> STATIONARY | Empire movement: DESTROYED -> N/A | Dwargon Gate theatre status: CLEARED -> HOSTILITIES_SUSPENDED | Labyrinth theatre status: DAMAGED -> HOSTILITIES_SUSPENDED | Imperial Capital theatre status: ACTIVE -> HOSTILITIES_SUSPENDED | Imperial Capital frontline changed | Imperial Capital battle status: INTENSIFYING -> CONCLUDED | Dwargon East theatre status: ACTIVE -> HOSTILITIES_SUSPENDED | Dwargon East battle status: INTENSIFYING -> CONCLUDED | Dragon Theatre theatre status: ACTIVE -> HOSTILITIES_SUSPENDED | Dragon Theatre battle status: ACTIVE -> CONCLUDED

### 15:00–15:59  ·  C+49:15:00  ·  B+09:15:00

**Phase:** TERMINATION_AND_SETTLEMENT · **Stage:** ARMISTICE

**What happened.** Care instructions issued and the field cleared.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace). **Battles:** No active battle (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:CONCLUDED; Dragon Theatre:CONCLUDED).

**Who.** Gabil; Gadra; Gobya; Hakurou; Phobio; Gazel; Dorf; Velgrynd; Kondo.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire N/A (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA UNKNOWN (min 1); Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Rimuru and Benimaru cut off; Tempest field command decentralised
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: CONTESTED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Armistice proposed; active hostilities suspended || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision

**Significance and frame detail**

#### FRAME_7147 — 15:00-15:10 19/02/9001

**EVT-0385 · AFTERMATH — Care instructions issued and the field cleared**

- Theatre: Imperial Capital (TH-CAP) · Front: Imperial theatre · Battle: -
- Actor: Diablo (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Imperial theatre
- Immediate result: The fighting concludes and instructions are given for the care of the wounded; Diablo reaches the ship
- Operational consequence: Battlefield administration begins
- Strategic significance: Transition from combat to settlement
- Graph: EVT-0384 → **EVT-0385** → EVT-0390
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: MEDIUM
- Source: V15 Epilogue — V15 Epilogue - the work here has ended; care instructions given

State change: Dwargon Gate battle: - | Labyrinth battle: - | Imperial Capital battle: - | Dwargon East battle: - | Dragon Theatre battle: -

### 18:00–18:59  ·  C+49:18:40  ·  B+09:18:40

**Phase:** TERMINATION_AND_SETTLEMENT · **Stage:** ARMISTICE

**What happened.** Summit convened between Tempest and the Empire; The Empire seeks an end-of-hostilities treaty and a new pact; The Empire declares its loss of war power.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace); Diplomatic / Settlement. **Battles:** Post-war summit (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:CONCLUDED; Dragon Theatre:CONCLUDED; Settlement:ACTIVE).

**Who.** Rimuru; Masayuki; Velgrynd; Caligulio; Minitz; Testarossa.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire N/A (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA UNKNOWN (min 1); Empire POW 0; WIA and MIA UNKNOWN both sides
- **Command** — Rimuru and Benimaru cut off; Tempest field command decentralised
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: CONTESTED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED || Settlement: NEUTRAL
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Armistice proposed; active hostilities suspended || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision || Settlement: End-of-hostilities treaty and new pact under negotiation

**Significance and frame detail**

#### FRAME_7165 — 18:00-18:10 19/02/9001

**EVT-0390 · POLITICAL — Summit convened between Tempest and the Empire**

- Theatre: Diplomatic / Settlement (TH-DIP) · Front: Settlement · Battle: -
- Actor: Rimuru Tempest (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Tempest
- Immediate result: Rimuru attends with Benimaru, Rigurd, Shion, Diablo and Testarossa; the Empire brings Masayuki, Velgrynd, Caligulio, Minitz, Bernie and Jiwu
- Operational consequence: Two heads of state meet
- Strategic significance: Formal settlement process begins
- Graph: EVT-0385 → **EVT-0390** → EVT-0391
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V16 Ch3 — V16 Ch3 - the summit attendee list
- Note: Caligulio and Minitz are the surviving imperial commanders (Calgurio, Minute).

State change: combatants: Gabil; Gadra; Gobya; Hakurou; Phobio; Gazel; Dorf; Velgrynd; Kondo -> Rimuru; Masayuki; Velgrynd; Caligulio; Minitz; Testarossa | Settlement theatre status: INACTIVE -> ACTIVE | Settlement battle: Post-war summit | Settlement frontline changed | Settlement battle status: NOT_STARTED -> ACTIVE

#### FRAME_7167 — 18:20-18:30 19/02/9001

**EVT-0391 · NEGOTIATION — The Empire seeks an end-of-hostilities treaty and a new pact**

- Theatre: Diplomatic / Settlement (TH-DIP) · Front: Settlement · Battle: -
- Actor: Eastern Empire (Eastern Empire) vs Jura-Tempest Federation (Jura-Tempest Federation) at Tempest
- Immediate result: The Empire requests a treaty closing hostilities and ratification of a pact on future direction
- Operational consequence: War formally terminated by agreement
- Strategic significance: Alliance framework replaces the war
- Graph: EVT-0390 → **EVT-0391** → EVT-0392
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V16 Ch3 — V16 Ch3 - the Empire wishes to forge an end-of-hostilities agreement

State change: Settlement frontline changed

#### FRAME_7169 — 18:40-18:50 19/02/9001

**EVT-0392 · AFTERMATH — The Empire declares its loss of war power**

- Theatre: Diplomatic / Settlement (TH-DIP) · Front: Settlement · Battle: -
- Actor: Eastern Empire (Eastern Empire) vs Eastern Empire (Eastern Empire) at Tempest
- Immediate result: The Empire states it has lost more than two-thirds of its war power
- Operational consequence: Imperial military capability assessed as broken
- Strategic significance: Empire cannot resume the war
- Graph: EVT-0391 → **EVT-0392** → EVT-0393
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V16 Ch3 — V16 Ch3 - more than two-thirds of war power lost
- Note: Cross-check: 770,000 + 60,000 against a ~1,000,000 deployable pool.

State change: INHERITED_STATE

### 19:00–19:59  ·  C+49:19:40  ·  B+09:19:40

**Phase:** TERMINATION_AND_SETTLEMENT · **Stage:** ARMISTICE

**What happened.** No war-crimes prosecution of imperial higher-ups; Masayuki installed as the new emperor; Captured imperial forces repatriated.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace); Diplomatic / Settlement. **Battles:** Post-war summit (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:CONCLUDED; Dragon Theatre:CONCLUDED; Settlement:ACTIVE).

**Who.** Rimuru; Masayuki; Velgrynd; Caligulio; Minitz; Testarossa.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire N/A (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA UNKNOWN (min 1); Empire POW UNKNOWN (repatriated); WIA and MIA UNKNOWN both sides
- **Command** — Rimuru head of state (Tempest); Masayuki emperor (Empire), named by Velgrynd under imperial court law
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: CONTESTED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED || Settlement: NEUTRAL
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Armistice proposed; active hostilities suspended || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision || Settlement: Prisoners repatriated; settlement terms being implemented

**Significance and frame detail**

#### FRAME_7171 — 19:00-19:10 19/02/9001

**EVT-0393 · POLITICAL — No war-crimes prosecution of imperial higher-ups**

- Theatre: Diplomatic / Settlement (TH-DIP) · Front: Settlement · Battle: -
- Actor: Jura-Tempest Federation (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Tempest
- Immediate result: Tempest declines to pursue the imperial leadership for war crimes
- Operational consequence: Imperial command cadre preserved
- Strategic significance: Continuity of imperial administration secured
- Graph: EVT-0392 → **EVT-0393** → EVT-0394
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V16 Ch3 — V16 Ch3 - not pursuing the imperial higher-ups for war crimes

State change: INHERITED_STATE

#### FRAME_7173 — 19:20-19:30 19/02/9001

**EVT-0394 · COMMAND_CHANGE — Masayuki installed as the new emperor**

- Theatre: Diplomatic / Settlement (TH-DIP) · Front: Settlement · Battle: -
- Actor: Velgrynd (Eastern Empire) vs Eastern Empire (Eastern Empire) at Tempest
- Immediate result: Under imperial court law, the person named by Velgrynd, protector dragon of the Empire, becomes emperor
- Operational consequence: Imperial succession resolved
- Strategic significance: Tempest backs the new emperor and the Empire's rebuilding
- Graph: EVT-0393 → **EVT-0394** → EVT-0395
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V16 Ch3 — V16 Ch3 - imperial court law on the person named by Velgrynd
- Note: Framed not as an alliance of equals but as Tempest backing the new emperor.

State change: commanders: Rimuru and Benimaru cut off; Tempest field command decentralised -> Rimuru head of state (Tempest); Masayuki emperor (Empire), named by Velgrynd under imperial court law

#### FRAME_7175 — 19:40-19:50 19/02/9001

**EVT-0395 · CAPTURE — Captured imperial forces repatriated**

- Theatre: Diplomatic / Settlement (TH-DIP) · Front: Settlement · Battle: -
- Actor: Jura-Tempest Federation (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Tempest
- Immediate result: Prisoners returned to the Empire; some wished to remain but were sent home first to help stabilise it
- Operational consequence: Prisoner question settled
- Strategic significance: Imperial manpower partially restored
- Graph: EVT-0394 → **EVT-0395** → EVT-0396
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V16 Ch3 — V16 Ch3 - captured imperial forces returned to the Empire
- Note: Immigration permitted after repatriation. See CAS-014.

State change: Empire POW: 0 -> UNKNOWN (repatriated) | Settlement frontline changed

### 20:00–20:59  ·  C+49:20:40  ·  B+09:20:40

**Phase:** TERMINATION_AND_SETTLEMENT · **Stage:** ARMISTICE

**What happened.** Testarossa despatched to establish an embassy in the Empire; Imperial citizens left without memory of the defeat; Reconstruction programme agreed.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace); Diplomatic / Settlement. **Battles:** Post-war summit (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:CONCLUDED; Dragon Theatre:CONCLUDED; Settlement:CONCLUDED).

**Who.** Rimuru; Masayuki; Velgrynd; Caligulio; Minitz; Testarossa.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire N/A (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA UNKNOWN (min 1); Empire POW UNKNOWN (repatriated); WIA and MIA UNKNOWN both sides
- **Command** — Rimuru head of state (Tempest); Masayuki emperor (Empire), named by Velgrynd under imperial court law
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: CONTESTED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED || Settlement: NEUTRAL
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Armistice proposed; active hostilities suspended || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision || Settlement: Reconstruction programme under way

**Significance and frame detail**

#### FRAME_7177 — 20:00-20:10 19/02/9001

**EVT-0396 · DEPLOYMENT — Testarossa despatched to establish an embassy in the Empire**

- Theatre: Diplomatic / Settlement (TH-DIP) · Front: Settlement · Battle: -
- Actor: Testarossa (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Imperial Capital
- Immediate result: Embassy to be established with a mission to sweep away the Empire's old lines of thought
- Operational consequence: Permanent Tempest presence in the Empire
- Strategic significance: Long-term political influence secured
- Graph: EVT-0395 → **EVT-0396** → EVT-0397
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V16 Ch3 — V16 Ch3 - Testarossa sent to establish an embassy

State change: INHERITED_STATE

#### FRAME_7179 — 20:20-20:30 19/02/9001

**EVT-0397 · AFTERMATH — Imperial citizens left without memory of the defeat**

- Theatre: Diplomatic / Settlement (TH-DIP) · Front: Settlement · Battle: -
- Actor: Veldora Tempest (Jura-Tempest Federation) vs Imperial population (Eastern Empire) at Eastern Empire
- Immediate result: The Empire's citizens have no memory of losing a war, Veldora having acted upon them
- Operational consequence: Domestic imperial stability preserved
- Strategic significance: Risk of revanchist sentiment removed
- Graph: EVT-0396 → **EVT-0397** → EVT-0398
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V16 Ch3 — V16 Ch3 - the Empire's citizens had no memory of losing a war

State change: INHERITED_STATE

#### FRAME_7181 — 20:40-20:50 19/02/9001

**EVT-0398 · AFTERMATH — Reconstruction programme agreed**

- Theatre: Diplomatic / Settlement (TH-DIP) · Front: Settlement · Battle: -
- Actor: Jura-Tempest Federation (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Between Tempest and the Empire
- Immediate result: Highways and nearby buildings repaired; a rail line toward the imperial capital planned along the Magitank route
- Operational consequence: Physical reconstruction begins
- Strategic significance: Economic integration of the two states starts
- Graph: EVT-0397 → **EVT-0398** → EVT-0399
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: HIGH
- Source: V16 Ch3 — V16 Ch3 - highways repaired; train line toward the imperial capital planned

State change: Settlement frontline changed | Settlement battle status: ACTIVE -> CONCLUDED

### 21:00–21:59  ·  C+49:21:00  ·  B+09:21:00

**Phase:** TERMINATION_AND_SETTLEMENT · **Stage:** ARMISTICE

**What happened.** Imperial flagship dead restored.

**Where.** Dwargon Gate Front; Ramiris Labyrinth Front; Imperial Capital; Dwargon Eastern Metropolis; Dragon Theatre (Jura airspace); Diplomatic / Settlement. **Battles:** Post-war summit (Dwargon Gate:CONCLUDED; Labyrinth:CONCLUDED; Imperial Capital:CONCLUDED; Dwargon East:CONCLUDED; Dragon Theatre:CONCLUDED; Settlement:CONCLUDED).

**Who.** Rimuru; Masayuki; Velgrynd; Caligulio; Minitz; Testarossa.

- **Force state** — Tempest effective 15,000 of 150,000; Empire effective 170,000 of 940,000
- **Movement** — Tempest STATIONARY (retreating: NO); Empire N/A (retreating: N/A)
- **Casualties** — Empire KIA 830,001 cumulative; Tempest KIA UNKNOWN (min 1); Empire POW UNKNOWN (repatriated); WIA and MIA UNKNOWN both sides
- **Command** — Rimuru head of state (Tempest); Masayuki emperor (Empire), named by Velgrynd under imperial court law
- **Territorial state** — Dwargon Gate: TEMPEST_CONTROLLED (terrain destroyed) || Labyrinth: TEMPEST_CONTROLLED (access severed) || Imperial Capital: CONTESTED || Dwargon East: CONTESTED || Dragon Theatre: CONTESTED || Settlement: NEUTRAL
- **Frontline** — Dwargon Gate: Dwargon Gate Front cleared; Tempest in possession of the field || Labyrinth: Labyrinth gate destroyed; upper floors assessed as likely destroyed || Imperial Capital: Armistice proposed; active hostilities suspended || Dwargon East: Tempest reinforcement arrives; Colossus committed to the eastern front || Dragon Theatre: Dragon engagement in stasis; neither side able to force a decision || Settlement: Reconstruction programme under way

**Significance and frame detail**

#### FRAME_7183 — 21:00-21:10 19/02/9001

**EVT-0399 · AFTERMATH — Imperial flagship dead restored**

- Theatre: Diplomatic / Settlement (TH-DIP) · Front: Settlement · Battle: -
- Actor: Jura-Tempest Federation (Jura-Tempest Federation) vs Eastern Empire (Eastern Empire) at Tempest
- Immediate result: Men killed aboard the imperial flagship are recorded as having died once and returned
- Operational consequence: A portion of imperial losses reversed
- Strategic significance: Selected imperial personnel recovered
- Graph: EVT-0398 → **EVT-0399** → CAMPAIGN END
- Canonical time: - · Time basis: `SEQUENTIAL_CANON` · Time confidence: LOW · Overall: MEDIUM
- Source: V16 Ch3 — V16 Ch3 - these men had died once, aboard the imperial flagship
- Note: Number not stated. Does not offset the 770,000 campaign total.

State change: INHERITED_STATE

---

# Source Coverage Audit

### Volume 12 — COVERAGE: FULL

- **Relevant chapters:** Ch2 (Tempest order of battle), Ch4 (imperial legions, mobilisation, intelligence estimate), Ch5 (aerial reconnaissance)
- **Atomic events extracted:** 4 — EVT-0001, EVT-0002, EVT-0004, EVT-0008
- **Keyframes affected:** 4 (FRAME_0049 to FRAME_5671)
- **Army-size facts:** Complete OOB both sides: >2,000,000 mobilisable, ~1,000,000 deployable, 700,000 / 200,000 (2,000 chariots) / 40,000 (400 airships), 30,000 Warcraft, 200,000-100,000 Hybrid, 150,000 Tempest potential, 52,000 standing, full corps and legion breakdown
- **Casualty facts:** None stated in V12
- **Movement facts:** MOV-001, MOV-002
- **Command facts:** Benimaru appointed Supreme General; corps commanders assigned; Calgurio, Gladim, Yuuki, Geist, Faraga, Minute identified
- **Geographic facts:** Imperial Capital; Great Jura Forest; Dwargon approaches
- **Temporal facts:** About twenty-nine days to arrival
- **Unresolved issues:** AMB-002 / CON-004 (the 113,000 figure)
- **Excluded material:** Non-military domestic content not extracted

### Volume 13 — COVERAGE: FULL

- **Relevant chapters:** Prologue, Ch1, Ch2, Ch3, Ch4, Ch5/Epilogue
- **Atomic events extracted:** 47 — EVT-0009, EVT-0010, EVT-0003, EVT-0011, EVT-0005, EVT-0012, EVT-0013, EVT-0014, EVT-0015, EVT-0016, EVT-0017, EVT-0018, EVT-0019, EVT-0020, EVT-0006, EVT-0007, EVT-0021, EVT-0100, EVT-0101, EVT-0102, EVT-0103, EVT-0104, EVT-0105, EVT-0106, EVT-0107, EVT-0108, EVT-0109, EVT-0110, EVT-0111, EVT-0112, EVT-0113, EVT-0114, EVT-0115, EVT-0116, EVT-0117, EVT-0118, EVT-0119, EVT-0120, EVT-0201, EVT-0202, EVT-0203, EVT-0204, EVT-0205, EVT-0206, EVT-0207, EVT-0208, EVT-0209
- **Keyframes affected:** 47 (FRAME_0229 to FRAME_6301)
- **Army-size facts:** 500/1,500/1,000 chariot dispositions; ~1,000 chariots in the fortress; ~100 airships remaining mid-battle; 700,000 committed; 700,000 = ~70% of imperial strength; Magic Guided Cannon 30 km max / ~3 km effective
- **Casualty facts:** 240,000 surface KIA (200,000 + 40,000); 530,000+ labyrinth KIA; 10,000 in under an hour; 0 POW; 0 Tempest losses; 770,000 total
- **Movement facts:** MOV-003 to MOV-007, MOV-018 to MOV-022
- **Command facts:** Faraga killed; Geist orders withdrawal and is lost; Calgurio confronts failure; Gadra defects
- **Geographic facts:** Tempest border; inn town; ten-kilometre line; Dwargon Gate; airspace; supply echelon; labyrinth incl. Floor 70; Dwargon Isthmus gate
- **Temporal facts:** Under six seconds; ten minutes; less than an hour; three hours; a month elapsed; twenty-nine days
- **Unresolved issues:** AMB-001 / CON-001 (garbled invasion total), AMB-003, AMB-005, AMB-014, CON-005, CON-006
- **Excluded material:** Domestic and interpersonal scenes not extracted

### Volume 14 — COVERAGE: FULL WITH EXCLUSIONS

- **Relevant chapters:** Prologue (clown faction), Ch3 (Imperial Capital Chaos), Ch4 (blockade camp), Epilogue (dragon engagement)
- **Atomic events extracted:** 18 — EVT-0310, EVT-0311, EVT-0312, EVT-0313, EVT-0314, EVT-0315, EVT-0316, EVT-0317, EVT-0318, EVT-0319, EVT-0320, EVT-0321, EVT-0330, EVT-0331, EVT-0332, EVT-0333, EVT-0334, EVT-0335
- **Keyframes affected:** 18 (FRAME_6679 to FRAME_6906)
- **Army-size facts:** 60,000 blockading the eastern metropolis; clown faction membership enumerated; Hybrid Legion staff named
- **Casualty facts:** Miranda killed (CAS-011)
- **Movement facts:** MOV-008, MOV-009
- **Command facts:** Miranda eliminated; Kondo obtains the conspiracy via Reader; blockade force loses all authorised command
- **Geographic facts:** Imperial Capital back streets; Dwargon eastern metropolis; Jura airspace; labyrinth gate and upper floors; Rimuru city
- **Temporal facts:** Several days after Yuuki's report; late at night; on that important day; not a second was needed
- **Unresolved issues:** AMB-006 (join between the Jura phase and the second phase)
- **Excluded material:** Reward and evolution ceremonies (Ch1) and future-policy discussion (Ch2) are non-military and excluded

### Volume 15 — COVERAGE: FULL WITH EXCLUSIONS

- **Relevant chapters:** Prologue, Ch1 (Time of Despair), Ch2 (The Power of Liberation), Ch3 (The Intensified Battlefield), Ch4 (Eight Gates), Ch5 (The Truth of the Emperor), Epilogue
- **Atomic events extracted:** 26 — EVT-0340, EVT-0341, EVT-0342, EVT-0343, EVT-0344, EVT-0345, EVT-0346, EVT-0347, EVT-0348, EVT-0349, EVT-0350, EVT-0360, EVT-0351, EVT-0361, EVT-0362, EVT-0363, EVT-0370, EVT-0371, EVT-0372, EVT-0373, EVT-0380, EVT-0381, EVT-0382, EVT-0383, EVT-0384, EVT-0385
- **Keyframes affected:** 25 (FRAME_6949 to FRAME_7147)
- **Army-size facts:** 60,000 expended in the ritual; 500 Dwargon Sky Knights; 100 Flying Dragons lifting the Colossus; 300 airships carrying 30,000 Warcraft Legion
- **Casualty facts:** 60,000 ritual sacrifice (CAS-012); Shion and others killed, number not stated (CAS-013)
- **Movement facts:** MOV-010 to MOV-016
- **Command facts:** Gazel withholds the heavy assault force and commits the Sky Knights; Gabil delegates command to Dorf; Velgrynd revealed as Marshal and orders Gladim
- **Geographic facts:** Dwargon eastern front; ritual position; sealed space in the Imperial Capital; airspace over northern Ingracia
- **Temporal facts:** At the same time as Rimuru's infiltration; a little late; hardly arrived before the war began
- **Unresolved issues:** AMB-008 (Ch4-5 structure), AMB-009 (jump destination), AMB-010, AMB-011, CON-003
- **Excluded material:** Skill-level and metaphysical content in Ch4-Ch5 does not map to battlefield state; recorded at chapter level

### Volume 16 — COVERAGE: PARTIAL BY DESIGN

- **Relevant chapters:** Ch3 (Toward Rebuilding) only
- **Atomic events extracted:** 10 — EVT-0390, EVT-0391, EVT-0392, EVT-0393, EVT-0394, EVT-0395, EVT-0396, EVT-0397, EVT-0398, EVT-0399
- **Keyframes affected:** 10 (FRAME_7165 to FRAME_7183)
- **Army-size facts:** More than two-thirds of imperial war power lost (qualitative)
- **Casualty facts:** Captured imperial forces repatriated, number not stated (CAS-014); imperial flagship dead restored (CAS-015); two-thirds war power (CAS-016)
- **Movement facts:** MOV-017
- **Command facts:** Masayuki installed as emperor by Velgrynd; Caligulio and Minitz confirmed surviving; Testarossa appointed ambassador
- **Geographic facts:** Imperial Capital; highways and the Magitank route; embassy
- **Temporal facts:** None stated
- **Unresolved issues:** AMB-012 (prisoner numbers), AMB-013 (scope boundary), CON-002, CON-003
- **Excluded material:** DELIBERATELY EXCLUDED: the Prologue, Ch1 and Ch2 Feldway/Michael conflict is a separate later war

---

# Contradiction Register

### CON-001 — Size of the invading army

- **Claim A** (V13 Ch3): The invading army numbered ninety-four thousand (as rendered in the Indonesian text)
- **Claim B** (V12 Ch4; V13 Ch1, Ch3): 700,000 + 200,000 + 40,000 = 940,000 across the component formations
- **Resolution:** The stated total is smaller than the 240,000 the same sentence says were destroyed, so it cannot stand.
- **Final treatment:** Adopted 940,000. Recorded in F-EMP-010 as INFERRED_RECONCILED. See AMB-001.
- **Confidence:** MEDIUM

### CON-002 — Whether prisoners were taken

- **Claim A** (V13 Ch3): No prisoners were taken; all were killed in action
- **Claim B** (V16 Ch3): Captured imperial forces were returned to the Empire
- **Resolution:** Not a true contradiction once scoped: the zero applies to the Jura surface phase, the prisoners to later phases.
- **Final treatment:** CAS-008 scoped to the surface phase; CAS-014 records later-phase prisoners as UNKNOWN. See AMB-012.
- **Confidence:** HIGH

### CON-003 — Whether Shion died

- **Claim A** (V15 Ch2): Shion and others are killed in the sealed space
- **Claim B** (V16 Ch3): Shion attends the post-war summit
- **Resolution:** The corpus establishes revival mechanics elsewhere but does not explicitly narrate her restoration.
- **Final treatment:** Both recorded. CAS-013 keeps the death with count UNKNOWN; ACT-011 status reads KILLED, LATER PRESENT AT SUMMIT. No revival event is invented.
- **Confidence:** MEDIUM

### CON-004 — The figure 'one hundred thirteen thousand'

- **Claim A** (V12 Ch4): A force of one hundred thirteen thousand could be sent on the emperor's order
- **Claim B** (V12 Ch4): The legions described immediately before total far more than 113,000
- **Resolution:** Internally inconsistent within a single passage. Possibly 1,130,000 mis-rendered, or a first-wave echelon.
- **Final treatment:** Excluded from the force database. Recorded here and in AMB-002 only.
- **Confidence:** LOW

### CON-005 — Total imperial strength implied by the 70 percent figure

- **Claim A** (V13 Ch1): The 700,000 entering the forest is about seventy percent of the whole imperial strength, implying roughly 1,000,000 total
- **Claim B** (V12 Ch4): The Empire can mobilise more than two million including garrisons
- **Resolution:** Reconcilable: the 70 percent is measured against deployable field strength (about one million), not the full mobilisable pool.
- **Final treatment:** Both retained. F-EMP-001 deployable ceiling of about 1,000,000 is treated as the denominator for the 70 percent.
- **Confidence:** MEDIUM

### CON-006 — When the Dwargon eastern blockade begins

- **Claim A** (V13 Ch1): Gazel reports the eastern gate already blockaded, before first contact
- **Claim B** (V14 Ch4): The blockade camp scene is narrated in V14, after the Jura campaign
- **Resolution:** Not contradictory: the blockade begins before first contact and persists; V14 narrates a later moment in the same siege.
- **Final treatment:** Blockade start placed at EVT-0016 (D-6); the camp scene remains at EVT-0319. F-EMP-031 spans both.
- **Confidence:** HIGH

### CON-007 — What the 'month' and 'twenty-nine day' anchors are measured from

- **Claim A** (V13 Ch1): A month has passed since the subordinates' gathering met (V13 Ch1 opening line)
- **Claim B** (V13 Ch1): The chariot force was expected in about twenty-nine days or more, but the invasion was slower than expected
- **Resolution:** Both are measured from the same reference point - the subordinates' gathering at which the corps order of battle was fixed (EVT-0004) - not from the invasion launch. Revision 3 measured them from the advance and produced an 8-day 'month' and a 28-day interval to a contact the source says took longer than 29 days.
- **Final treatment:** Re-anchored. EVT-0004 = D-38. EVT-0012 (month mark) = D-8, exactly R+30. First contact = R+38, satisfying 'slower than about twenty-nine days'. See AMB-016.
- **Confidence:** MEDIUM

---

# Temporal Ambiguity Register

### AMB-001 — Total size of the invasion army

- **Events:** EVT-0120, F-EMP-010
- **Ambiguity / possible order:** The Indonesian text of V13 Ch3 renders the invading army as 'ninety-four thousand', which is smaller than the 240,000 it says were destroyed in the same sentence. Readings: (a) 940,000; (b) a corrupted number; (c) 94,000 with a separate error in the loss figure.
- **Chosen simulation placement:** Adopted 940,000. It is internally consistent with the component figures 700,000 + 200,000 + 40,000 = 940,000 given elsewhere in V12 Ch4 and V13.
- **Confidence:** MEDIUM

### AMB-002 — The figure 'one hundred thirteen thousand' in V12 Ch4

- **Events:** EVT-0001
- **Ambiguity / possible order:** V12 Ch4 says a force of 'one hundred thirteen thousand' could be sent once the emperor gave the order, immediately after describing legions totalling far more. Readings: (a) 1,130,000 mis-rendered; (b) a first-wave echelon; (c) translation corruption.
- **Chosen simulation placement:** Excluded from the force database rather than guessed at. Recorded here only.
- **Confidence:** LOW

### AMB-003 — Clock times across the whole campaign

- **Events:** All events
- **Ambiguity / possible order:** The corpus contains essentially no clock times. Only relative durations appear (under six seconds, ten minutes, less than an hour, three hours).
- **Chosen simulation placement:** All hour-and-minute placements are SIMULATION_RECONSTRUCTED. Only the relative durations are carried as EXPLICIT_RELATIVE.
- **Confidence:** HIGH

### AMB-004 — Calendar dates

- **Events:** All events
- **Ambiguity / possible order:** No in-world calendar date is given for any campaign event.
- **Chosen simulation placement:** Artificial marker year 9001 used. DATE_BASIS = SIMULATION_RECONSTRUCTED throughout.
- **Confidence:** HIGH

### AMB-005 — Duration of the labyrinth phase

- **Events:** EVT-0201 to EVT-0207
- **Ambiguity / possible order:** The corpus establishes sequence and a three-hour revival cycle but never states how many days the labyrinth battle lasted.
- **Chosen simulation placement:** Modelled as three days (D+1 to D+3) to accommodate the multi-wave structure and the revival cycle. Purely reconstructive.
- **Confidence:** MEDIUM

### AMB-007 — Strength of Shion's undocumented unit

- **Events:** F-TEM-005
- **Ambiguity / possible order:** The corpus explicitly says the number of people is unknown, with a personal assessment of not more than a thousand.
- **Chosen simulation placement:** Kept as MAX = 1,000 with no best estimate. Not counted in any total.
- **Confidence:** HIGH

### AMB-008 — V15 Chapters 4 and 5 internal structure

- **Events:** EVT-0380 to EVT-0381
- **Ambiguity / possible order:** Eight Gates and The Truth of the Emperor concern the nature of the imperial throne and skill-level conflict rather than force-on-force battle. Little of it maps onto conventional battlefield state.
- **Chosen simulation placement:** Recorded as chapter-level events at MEDIUM/LOW confidence. Further atomic breakdown would require modelling non-military developments.
- **Confidence:** MEDIUM

### AMB-009 — Destination of the Warcraft Legion after the space-time jump

- **Events:** EVT-0373, MOV-015
- **Ambiguity / possible order:** Velgrynd opens a space-time connection to move the flotilla; the destination is not stated in the extracted passage.
- **Chosen simulation placement:** MOV-015 records the jump with destination UNKNOWN. No route or arrival point is inferred.
- **Confidence:** HIGH

### AMB-010 — Tempest casualties in the sealed space

- **Events:** EVT-0362, CAS-013
- **Ambiguity / possible order:** Shion 'and others' are killed; no count is given. Shion appears alive at the V16 summit.
- **Chosen simulation placement:** Recorded as minimum one, best estimate UNKNOWN. Not converted to a number, and not offset against the later appearance.
- **Confidence:** MEDIUM

### AMB-011 — Whether the 60,000 ritual sacrifice is part of the 940,000

- **Events:** F-EMP-031, CAS-012
- **Ambiguity / possible order:** The Hybrid Legion is a separate legion from the Jura invasion force in V12 Ch4, and the 60,000 blockade the eastern metropolis rather than the Jura front.
- **Chosen simulation placement:** Treated as SEPARATE from the 940,000. Campaign totals report the two figures distinctly.
- **Confidence:** MEDIUM

### AMB-012 — Number of imperial prisoners repatriated

- **Events:** EVT-0395, CAS-014
- **Ambiguity / possible order:** V16 Ch3 confirms captured imperial forces were returned but gives no figure. This differs in kind, not in fact, from the surface phase where no prisoners were taken.
- **Chosen simulation placement:** CAS-008 scoped explicitly to the surface phase; CAS-014 records later-phase prisoners as UNKNOWN.
- **Confidence:** MEDIUM

### AMB-013 — V16 scope boundary

- **Events:** V16 Prologue, Ch1, Ch2
- **Ambiguity / possible order:** Most of V16 concerns the Feldway and Michael conflict, which is a separate later war rather than part of the Tempest-Eastern Empire War.
- **Chosen simulation placement:** Only V16 Ch3 (post-war settlement and rebuilding) is extracted. The later conflict is deliberately excluded per scope.
- **Confidence:** HIGH

### AMB-006 — Interval between the Jura campaign and the second phase

- **Events:** EVT-0207 to EVT-0310
- **Ambiguity / possible order:** The corpus places the second phase 'several days' after the Jura campaign but gives no figure. Revision 3 joined them same-day, which is not 'several days'.
- **Chosen simulation placement:** Widened to a 3-day gap: EVT-0207 at D+3, EVT-0310 at D+6. Three days is the minimum defensible reading of 'several'. The gap itself is SIMULATION_RECONSTRUCTED and remains the weakest join in the dataset.
- **Confidence:** LOW

### AMB-014 — Distribution of the approach march across the interval

- **Events:** EVT-0003 to EVT-0021
- **Ambiguity / possible order:** The corpus fixes the start of the advance, a ~29-day forecast that was overshot, an explicit month mark, a border crossing, a halt-and-deploy and forest entry - but no intermediate positions, distances or dates.
- **Chosen simulation placement:** Approach events spread across D-37 to D-1 by simulation placement. Column position is exposed as Approach_Progress_Pct, a linear interpolation between two source-supported endpoints. The percentage is NOT a measured distance and no distance is claimed.
- **Confidence:** MEDIUM

### AMB-015 — Interval between mobilization and the subordinates' gathering

- **Events:** EVT-0001, EVT-0004
- **Ambiguity / possible order:** The corpus gives no interval between the imperial mobilization order (V12 Ch4) and the subordinates' gathering (V12 Ch2) that serves as the temporal reference point.
- **Chosen simulation placement:** Set to 2 days (D-40 to D-38) by simulation placement. Nothing in the corpus constrains it; the campaign window would shift with any other reading.
- **Confidence:** LOW

### AMB-016 — What the reference point for the month and 29-day anchors actually is

- **Events:** EVT-0004, EVT-0012, EVT-0003
- **Ambiguity / possible order:** V13 Ch1 opens 'a month has passed since the subordinates' gathering met'. Candidate referents: (a) the V12 Ch2 meeting at which the corps order of battle was fixed; (b) a separate unnarrated gathering; (c) a translation artefact for a different assembly.
- **Chosen simulation placement:** Reading (a) adopted: it is the only gathering of Rimuru's subordinates the corpus narrates in the relevant window, and it makes both surviving duration anchors mutually consistent. Recorded as REFERENCE_EVENT = EVT-0004 at D-38. If (b) or (c) were correct the whole approach window would shift, though its internal order would not.
- **Confidence:** MEDIUM

### AMB-017 — The 50-day campaign window is a simulation window, not a canonical duration

- **Events:** All frames
- **Ambiguity / possible order:** No passage states how long the war lasted. The window is assembled from: mobilization to gathering (unconstrained, AMB-015), gathering to contact (R+38, constrained by two anchors), contact to labyrinth conclusion (D+0 to D+3, AMB-005), the 'several days' gap (AMB-006), and the second phase and settlement (sequence only).
- **Chosen simulation placement:** 50 days is the SIMULATION CAMPAIGN WINDOW. It must never be quoted as a canonical war duration.
- **Confidence:** HIGH

---

# Canonical vs Simulation Audit

| Information type | Classification |
|---|---|
| Force compositions and troop figures | `CANONICAL` |
| Casualty figures (240,000 / 530,000 / 10,000 / 60,000 / 770,000 / zeros) | `CANONICAL` |
| Order of events within each phase and theatre | `CANONICAL` |
| Commander names, ranks, appointments, deaths | `CANONICAL` |
| Locations and their relationships | `CANONICAL` |
| Tactical detail (dispositions, feint, boarding, Colossus, Sky Knights, space-time jump) | `CANONICAL` |
| Settlement terms (treaty, succession, repatriation, embassy, reconstruction) | `CANONICAL` |
| Weapon envelopes (30 km max, ~3 km effective) | `CANONICAL` |
| Six relative durations (six seconds, ten minutes, an hour, three hours, a month, twenty-nine days) | `EXPLICIT_RELATIVE` |
| Mobilisation, border crossing, blockade start, labyrinth entry, dragon engagement | `DAY_LEVEL_CANON` |
| Ordering of events with no stated interval | `SEQUENTIAL_CANON` |
| Every HH:MM placement in the dataset | `SIMULATION_RECONSTRUCTED` |
| Every calendar date, including the campaign anchor | `SIMULATION_RECONSTRUCTED` |
| The 38-day campaign span and its internal stage boundaries | `SIMULATION_RECONSTRUCTED` |
| Approach_Progress_Pct intermediate positions | `SIMULATION_RECONSTRUCTED` |
| Three-day labyrinth duration (AMB-005) | `SIMULATION_RECONSTRUCTED` |
| Same-day join between Jura phase and second phase (AMB-006) | `SIMULATION_RECONSTRUCTED` |
| Arrival time of Veyron and Zonda | `SIMULATION_RECONSTRUCTED` |
| The 940,000 invasion total, reconciled from components | `INFERRED` |
| The 170,000 residual carried as unaccounted | `INFERRED` |
| That the 60,000 ritual sacrifice sits outside the 940,000 | `INFERRED` |
| That the 70% figure is measured against deployable, not mobilisable, strength | `INFERRED` |
| WIA and MIA, both sides, all phases | `UNKNOWN` |
| Tempest deaths in the sealed space | `UNKNOWN` |
| Imperial prisoners repatriated; flagship personnel restored | `UNKNOWN` |
| Warcraft Legion destination after the jump | `UNKNOWN` |
| Headcounts: Shion's unit, Dwarf Knights, Mechs Legion, labyrinth garrison, Kurenai advance force | `UNKNOWN` |
| Fate of ~170,000 imperial personnel on the Jura front | `UNKNOWN` |

---

# Death, Revival and Prisoner Status Register

A casualty event is never erased by a later reappearance. Where the corpus shows personnel alive
after a recorded death, the death record is retained and the reappearance is carried as a separate
status, so the historical sequence survives in the animation model.

| ID | Subject | Death event | Death record | Revival event | Final status |
|---|---|---|---|---|---|
| REV-001 | Imperial flagship personnel | UNKNOWN (not narrated) | CAS-015 | EVT-0399 | REVIVED, LIVING |
| REV-002 | Shion and others of Rimuru's escort | EVT-0362 | CAS-013 | NOT NARRATED | PRESENT AT THE SUMMIT |
| REV-003 | Labyrinth defenders | EVT-0206 (cyclical) | CAS-007 | EVT-0206 | REVIVED ON A THREE-HOUR CYCLE |
| REV-004 | Captured imperial personnel | N/A - captured, not killed | CAS-014 | EVT-0395 | REPATRIATED, LIVING |

- **REV-001** — The death is retained as CAS-015 with scope EVENT_CASUALTY and loss type OTHER_LOSS_REVERSED. The revival is a separate event (EVT-0399). The original loss is not deleted and does not offset the 830,001 campaign total. (V16 Ch3, confidence MEDIUM)
- **REV-002** — The corpus narrates the death (V15 Ch2) and later shows Shion at the summit (V16 Ch3) but never narrates a revival. CAS-013 is retained with count UNKNOWN. No revival event is invented. See CON-003. (V15 Ch2; V16 Ch3, confidence MEDIUM)
- **REV-003** — Fallen defenders return after three hours. This is why CAS-007 records an explicit zero: the corpus states the labyrinth battle ended with no losses on the Tempest side. Cyclical, not a one-off revival. (V13 Ch4, confidence HIGH)
- **REV-004** — Prisoners are never converted to dead. Count not stated; recorded as UNKNOWN. (V16 Ch3, confidence HIGH)

---

# Temporal Constraint Graph

All 30 machine-checked constraints pass against the final simulation placement.

| ID | Type | A | B | Requirement | Canonical basis |
|---|---|---|---|---|---|
| TC-01 | BEFORE | EVT-0001 | EVT-0003 | — | Mobilization precedes the advance |
| TC-02 | BEFORE | EVT-0004 | EVT-0012 | — | The gathering precedes the month mark |
| TC-03 | EXACT_DAYS_AFTER | EVT-0004 | EVT-0012 | 30 | A month has passed since the gathering |
| TC-04 | MIN_DAYS_AFTER | EVT-0004 | EVT-0102 | 30 | Arrival was slower than the ~29 day forecast |
| TC-05 | BEFORE | EVT-0012 | EVT-0015 | — | The month mark precedes the border crossing |
| TC-06 | BEFORE | EVT-0015 | EVT-0019 | — | Border crossing precedes halt-and-deploy |
| TC-07 | BEFORE | EVT-0019 | EVT-0020 | — | Deployment precedes entry into the forest |
| TC-08 | BEFORE | EVT-0020 | EVT-0102 | — | Forest entry precedes first contact |
| TC-09 | MAX_FRAMES_AFTER | EVT-0102 | EVT-0103 | 2 | Under six seconds to close 100 m |
| TC-10 | EXACT_FRAMES_AFTER | EVT-0111 | EVT-0112 | 3 | Ten minutes passed (one frame per 10 min) |
| TC-11 | BEFORE | EVT-0115 | EVT-0116 | — | Annihilation precedes loss of contact with the fleet |
| TC-12 | BEFORE | EVT-0117 | EVT-0118 | — | Retreat order precedes the interception |
| TC-13 | BEFORE | EVT-0119 | EVT-0201 | — | Surface phase concludes before labyrinth entry |
| TC-14 | MAX_FRAMES_AFTER | EVT-0203 | EVT-0204 | 144 | Ten thousand destroyed in under an hour |
| TC-15 | MIN_DAYS_AFTER | EVT-0207 | EVT-0310 | 3 | Second phase opens several days later |
| TC-16 | BEFORE | EVT-0313 | EVT-0315 | — | Interception precedes the killing |
| TC-17 | BEFORE | EVT-0315 | EVT-0316 | — | Death precedes the Reader extraction |
| TC-18 | BEFORE | EVT-0016 | EVT-0319 | — | Blockade begins in V13, before the V14 camp scene |
| TC-19 | BEFORE | EVT-0330 | EVT-0332 | — | Dragon engagement precedes the labyrinth gate's destruction |
| TC-20 | BEFORE | EVT-0332 | EVT-0333 | — | Gate destruction precedes confirmation the city survived |
| TC-21 | SAME_DAY | EVT-0340 | EVT-0360 | — | Gazel's battle is concurrent with Rimuru's infiltration |
| TC-22 | BEFORE | EVT-0343 | EVT-0345 | — | The ritual sacrifice precedes the Sky Knight attack |
| TC-23 | BEFORE | EVT-0346 | EVT-0347 | — | The Colossus arrives before Gadra fires it |
| TC-24 | BEFORE | EVT-0350 | EVT-0351 | — | Gobya arrives last among the ground reinforcements |
| TC-25 | BEFORE | EVT-0361 | EVT-0362 | — | Isolation precedes the deaths |
| TC-26 | BEFORE | EVT-0371 | EVT-0373 | — | Velgrynd is revealed before she opens the jump |
| TC-27 | BEFORE | EVT-0382 | EVT-0384 | — | Testarossa's victory precedes the armistice |
| TC-28 | BEFORE | EVT-0384 | EVT-0390 | — | Armistice precedes the summit |
| TC-29 | BEFORE | EVT-0391 | EVT-0394 | — | Treaty request precedes the succession |
| TC-30 | BEFORE | EVT-0394 | EVT-0395 | — | Succession precedes repatriation |

---

# Limitations

1. **The 50-day campaign window is a simulation window, not a canonical duration.** No passage
   states how long the war lasted. Only two intervals inside it are canonically constrained: the
   month from the subordinates' gathering, and the fact that arrival exceeded the ~29-day forecast.
   Everything else is sequence plus reconstruction. See AMB-017.
2. **No clock time in this dataset is canonical.** Not one. Every HH:MM is simulation placement.
3. **The reference point is an interpretation.** The month and 29-day anchors are read as measured
   from the V12 Ch2 subordinates' gathering. If that reading is wrong the entire approach window
   shifts, though its internal order would not. See AMB-016.
4. **The second-phase gap is the weakest join.** "Several days" is modelled as exactly three. See AMB-006.
5. **Wounded and missing are unknown for both sides in every phase.** The corpus gives no figure
   anywhere, and none has been invented.
6. **Roughly 170,000 imperial personnel are unaccounted for** on the Jura front. Their disposition
   is not stated and they are not assumed dead.
7. **Approach_Progress_Pct is not a measured distance.** It is linear interpolation between two
   source-supported endpoints, exposed for animation only.
8. **Source pages are not cited.** The supplied PDFs are not reliably paginated; the field reads
   `not paginated` rather than carrying invented page numbers.

---

# Final Disclosure

**1. What the novels directly support.** Every force composition and troop figure; every casualty
number; the order of events within each phase; all commanders, their appointments and their deaths;
all locations; the tactical conduct of both battles; the weapon envelopes; and the entire post-war
settlement. This is the majority of the dataset's substance.

**2. What is reconstructed for simulation.** All timing precision below the day level. Every clock
time, every calendar date, the campaign span, the internal stage boundaries, the three-day labyrinth
duration, the distribution of approach events across the month, and the interpolated position of the
imperial column. None of this is canon and all of it is labelled.

**3. What is inferred.** The 940,000 invasion total, reconciled from three stated components against
a garbled sum. That the 60,000 ritual sacrifice sits outside that total. That the "seventy percent"
figure is measured against deployable rather than mobilisable strength. The 170,000 residual.

**4. What remains unknown.** Wounded and missing on both sides throughout — the corpus gives no
figure anywhere. Tempest deaths in the sealed space. Prisoner counts. The Warcraft Legion's
destination. Six formation headcounts. The fate of roughly 170,000 imperial personnel.

**5. Strongest periods.** D+0 to D+3, the Jura campaign, is the best-supported stretch in the
dataset: 47 atomic events from Volume 13 with named commanders, exact dispositions, reconciling
casualty figures and four explicit duration anchors. The post-war settlement at D+7 is also strong,
drawn from the official English edition with an unambiguous attendee list and terms.

**6. Weakest periods.** Three, in order of concern. The join between the Jura phase and the second
phase (AMB-006) is the single weakest link — the corpus gives no interval at all, and D+4 is pure
placement. The month-long approach (AMB-014) has canonical endpoints and a canonical "a month has
passed", but every intermediate position is interpolation. And Volume 15 Chapters 4–5 (AMB-008)
concern the metaphysics of the imperial throne rather than force-on-force battle, so they resist
atomic military decomposition in a way the rest of the corpus does not.

Nothing in this dataset is fabricated. Where the corpus is silent, the field reads `UNKNOWN`.
