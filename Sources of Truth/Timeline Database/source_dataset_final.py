# -*- coding: utf-8 -*-
"""
Tempest-Eastern Empire War - PRODUCTION LOCK LAYER (Step 1 final).

Audit corrections applied to Revision 3. No new extraction; no renumbering.
All Event_IDs, Force_IDs and Casualty_IDs are preserved unchanged.

CORRECTIONS IN THIS PASS
------------------------
T-01  "A month has passed since the subordinates' gathering met" (V13 Ch1) is
      measured from the SUBORDINATES' GATHERING, not from the invasion launch.
      R3 placed the gathering (EVT-0004) at D-28 and the month mark (EVT-0012)
      at D-20 - an interval of 8 days, not a month. RE-ANCHORED.
T-02  "The chariot force was expected in about twenty-nine days or more, but
      the invasion was slower than expected" (V13 Ch1). The interval from the
      reference point to first contact must therefore EXCEED 29 days. R3 gave
      28 days. RE-ANCHORED to 38 days.
T-03  The second phase opens "several days" after the Jura campaign. R3 joined
      them same-day (D+3 -> D+4). Widened to a 3-day gap.
F-01  F-EMP-010 carried CURRENT_STRENGTH 940,000 alongside KIA 770,000 - a
      formation cannot retain full strength after losing 770,000. Corrected to
      170,000 survivors.
C-01  Death -> revival -> status chains are now explicit records rather than
      being implied by a status string.
"""
import dataset_final as r3

# ---------------------------------------------------------------------------
# RE-ANCHORED CAMPAIGN CLOCK
# ---------------------------------------------------------------------------
# Reference point R = EVT-0004, the subordinates' gathering at which the corps
# order of battle was fixed. Both surviving canonical duration anchors in the
# approach period are measured from it.
#
#   R  + 30 days  = "a month has passed"        -> EVT-0012
#   R  + 29 days  = the expected arrival        -> not an event; a forecast
#   R  + 38 days  = FIRST CONTACT               -> "slower than expected"
#
REFERENCE_EVENT = "EVT-0004"
REFERENCE_DAY = -38                 # R, relative to first contact
MONTH_MARK_DAY = -8                 # R + 30
EXPECTED_ARRIVAL_DAY = -9           # R + 29, the forecast that was overshot

CAMPAIGN_FIRST_DAY = -40            # imperial mobilization
CAMPAIGN_LAST_DAY = 9               # settlement
CAMPAIGN_DAYS = CAMPAIGN_LAST_DAY - CAMPAIGN_FIRST_DAY + 1     # 50
CAMPAIGN_START_DATE = (9001, 1, 1)
FIRST_CONTACT_DAY = 0

# explicit re-placement of every approach-period event
_REPLACE = {
 "EVT-0001": (-40, "08:00"), "EVT-0002": (-40, "09:00"),
 "EVT-0009": (-39, "14:00"),
 "EVT-0004": (-38, "10:00"),          # REFERENCE POINT
 "EVT-0010": (-38, "16:00"),
 "EVT-0003": (-37, "08:00"),          # invasion column begins the advance
 "EVT-0011": (-36, "08:00"),
 "EVT-0005": (-24, "10:00"),
 "EVT-0012": ( -8, "12:00"),          # R+30, "a month has passed"
 "EVT-0013": ( -7, "10:00"),
 "EVT-0014": ( -6, "09:00"),
 "EVT-0015": ( -5, "08:00"),
 "EVT-0016": ( -4, "11:00"), "EVT-0017": (-4, "12:00"),
 "EVT-0018": ( -3, "14:00"),
 "EVT-0019": ( -2, "09:00"), "EVT-0020": (-2, "11:00"),
 "EVT-0006": ( -2, "12:00"), "EVT-0007": (-2, "14:00"),
 "EVT-0008": ( -1, "09:00"), "EVT-0021": (-1, "16:00"),
}
# second phase pushed out to honour "several days later"
_SHIFT = {4: 6, 5: 7, 6: 8, 7: 9}

EVENTS = []
for e in r3.EVENTS:
    r = list(e)
    if r[0] in _REPLACE:
        r[1], r[2] = _REPLACE[r[0]]
    elif r[1] in _SHIFT:
        r[1] = _SHIFT[r[1]]
    EVENTS.append(tuple(r))
EVENTS.sort(key=lambda e: (e[1], e[2], e[0]))
_O = [e[0] for e in EVENTS]
_P = {x: i for i, x in enumerate(_O)}
EVENTS = [tuple(list(e[:32]) +
                [_O[_P[e[0]] - 1] if _P[e[0]] > 0 else None,
                 _O[_P[e[0]] + 1] if _P[e[0]] < len(_O) - 1 else None,
                 e[34]]) for e in EVENTS]

# corrected canonical-time strings where the re-anchoring changed the referent
_CANON_FIX = {
 "EVT-0012": "a month has passed since the subordinates' gathering met",
 "EVT-0003": "the chariot force was expected in about twenty-nine days or more",
 "EVT-0013": "the invasion was slower than expected",
 "EVT-0310": "several days after the Jura campaign concluded",
}
EVENTS = [tuple(list(e[:3]) + [_CANON_FIX.get(e[0], e[3])] + list(e[4:])) for e in EVENTS]

CAMPAIGN_STAGES = [
 ("A","STRATEGIC_CAMPAIGN_START",-40,-40,"Imperial mobilization ordered","EVT-0001","V12 Ch4"),
 ("A2","INVASION_PREPARATION",-39,-38,"Subordinates' gathering; corps order of battle fixed (REFERENCE POINT)","EVT-0004","V12 Ch2"),
 ("B","OPERATIONAL_INVASION_START",-37,-9,"Invasion column begins the approach march","EVT-0003","V13 Prologue"),
 ("B2","OPERATIONAL_APPROACH",-8,-6,"A month elapsed; advance slower than forecast","EVT-0012","V13 Ch1"),
 ("B3","BORDER_CROSSING",-5,-4,"Imperial army forces the Tempest border","EVT-0015","V13 Ch1"),
 ("B4","DEPLOYMENT",-3,-1,"Column halts and deploys; 700,000 enter the forest","EVT-0019","V13 Ch1"),
 ("C","FIRST_CONTACT",0,0,"Green Legion surprise attack at the Dwargon gate","EVT-0102","V13 Ch1"),
 ("D","MAJOR_COMBAT_PERIOD",1,3,"Labyrinth attrition","EVT-0201","V13 Ch3-4"),
 ("E","SECOND_PHASE",4,8,"Imperial Capital, Dwargon east, dragon theatre","EVT-0310","V14-V15"),
 ("F","ARMISTICE",9,9,"The Empire proposes an armistice","EVT-0384","V15 Epilogue"),
 ("G","POST_WAR_SETTLEMENT",9,9,"Treaty, succession, repatriation, reconstruction","EVT-0390","V16 Ch3"),
]

THEATERS = r3.THEATERS
MOVEMENTS = r3.MOVEMENTS
COMBATANTS = r3.COMBATANTS
COMMANDERS = r3.COMMANDERS
TERRITORY = r3.TERRITORY
CASUALTIES = r3.CASUALTIES

# ---------------------------------------------------------------------------
# F-01: force-strength correction
# ---------------------------------------------------------------------------
FORCES = []
for f in r3.FORCES:
    r = list(f)
    if r[0] == "F-EMP-010":
        r[11] = 170000        # survivors, not the initial 940,000
        r[22] = ("940,000 = 700,000 + 200,000 + 40,000. See AMB-001 / CON-001. "
                 "Current strength is the unaccounted residual after 770,000 KIA; "
                 "their disposition is not stated by the corpus.")
    FORCES.append(tuple(r))

# ---------------------------------------------------------------------------
# C-01: DEATH -> REVIVAL -> STATUS REGISTER
# A casualty event is never erased by a later reappearance.
# ---------------------------------------------------------------------------
# REV_ID, SUBJECT, FACTION, DEATH_EVENT, DEATH_RECORD, REVIVAL_EVENT,
# FINAL_STATUS, TREATMENT, SOURCE, CONFIDENCE
REVIVALS = [
 ("REV-001","Imperial flagship personnel","Eastern Empire","UNKNOWN (not narrated)","CAS-015",
  "EVT-0399","REVIVED, LIVING",
  "The death is retained as CAS-015 with scope EVENT_CASUALTY and loss type OTHER_LOSS_REVERSED. "
  "The revival is a separate event (EVT-0399). The original loss is not deleted and does not "
  "offset the 830,001 campaign total.","V16 Ch3","MEDIUM"),
 ("REV-002","Shion and others of Rimuru's escort","Jura-Tempest Federation","EVT-0362","CAS-013",
  "NOT NARRATED","PRESENT AT THE SUMMIT",
  "The corpus narrates the death (V15 Ch2) and later shows Shion at the summit (V16 Ch3) but never "
  "narrates a revival. CAS-013 is retained with count UNKNOWN. No revival event is invented. "
  "See CON-003.","V15 Ch2; V16 Ch3","MEDIUM"),
 ("REV-003","Labyrinth defenders","Jura-Tempest Federation","EVT-0206 (cyclical)","CAS-007",
  "EVT-0206","REVIVED ON A THREE-HOUR CYCLE",
  "Fallen defenders return after three hours. This is why CAS-007 records an explicit zero: the "
  "corpus states the labyrinth battle ended with no losses on the Tempest side. Cyclical, not a "
  "one-off revival.","V13 Ch4","HIGH"),
 ("REV-004","Captured imperial personnel","Eastern Empire","N/A - captured, not killed","CAS-014",
  "EVT-0395","REPATRIATED, LIVING",
  "Prisoners are never converted to dead. Count not stated; recorded as UNKNOWN.","V16 Ch3","HIGH"),
]

# ---------------------------------------------------------------------------
# TEMPORAL CONSTRAINT GRAPH (machine-checked by the validator)
# ---------------------------------------------------------------------------
# CONSTRAINT_ID, TYPE, EVENT_A, EVENT_B, PARAM, CANONICAL_BASIS, SOURCE
CONSTRAINTS = [
 ("TC-01","BEFORE","EVT-0001","EVT-0003",None,"Mobilization precedes the advance","V12 Ch4; V13 Prologue"),
 ("TC-02","BEFORE","EVT-0004","EVT-0012",None,"The gathering precedes the month mark","V13 Ch1"),
 ("TC-03","EXACT_DAYS_AFTER","EVT-0004","EVT-0012",30,"A month has passed since the gathering","V13 Ch1"),
 ("TC-04","MIN_DAYS_AFTER","EVT-0004","EVT-0102",30,"Arrival was slower than the ~29 day forecast","V13 Ch1"),
 ("TC-05","BEFORE","EVT-0012","EVT-0015",None,"The month mark precedes the border crossing","V13 Ch1"),
 ("TC-06","BEFORE","EVT-0015","EVT-0019",None,"Border crossing precedes halt-and-deploy","V13 Ch1"),
 ("TC-07","BEFORE","EVT-0019","EVT-0020",None,"Deployment precedes entry into the forest","V13 Ch1"),
 ("TC-08","BEFORE","EVT-0020","EVT-0102",None,"Forest entry precedes first contact","V13 Ch1"),
 ("TC-09","MAX_FRAMES_AFTER","EVT-0102","EVT-0103",2,"Under six seconds to close 100 m","V13 Ch1"),
 ("TC-10","EXACT_FRAMES_AFTER","EVT-0111","EVT-0112",3,"Ten minutes passed (one frame per 10 min)","V13 Ch2"),
 ("TC-11","BEFORE","EVT-0115","EVT-0116",None,"Annihilation precedes loss of contact with the fleet","V13 Ch2"),
 ("TC-12","BEFORE","EVT-0117","EVT-0118",None,"Retreat order precedes the interception","V13 Ch2"),
 ("TC-13","BEFORE","EVT-0119","EVT-0201",None,"Surface phase concludes before labyrinth entry","V13 Ch3-4"),
 ("TC-14","MAX_FRAMES_AFTER","EVT-0203","EVT-0204",144,"Ten thousand destroyed in under an hour","V13 Ch4"),
 ("TC-15","MIN_DAYS_AFTER","EVT-0207","EVT-0310",3,"Second phase opens several days later","V14 Ch3"),
 ("TC-16","BEFORE","EVT-0313","EVT-0315",None,"Interception precedes the killing","V14 Ch3"),
 ("TC-17","BEFORE","EVT-0315","EVT-0316",None,"Death precedes the Reader extraction","V14 Ch3"),
 ("TC-18","BEFORE","EVT-0016","EVT-0319",None,"Blockade begins in V13, before the V14 camp scene","V13 Ch1; V14 Ch4"),
 ("TC-19","BEFORE","EVT-0330","EVT-0332",None,"Dragon engagement precedes the labyrinth gate's destruction","V14 Epilogue"),
 ("TC-20","BEFORE","EVT-0332","EVT-0333",None,"Gate destruction precedes confirmation the city survived","V14 Epilogue"),
 ("TC-21","SAME_DAY","EVT-0340","EVT-0360",None,"Gazel's battle is concurrent with Rimuru's infiltration","V15 Ch1"),
 ("TC-22","BEFORE","EVT-0343","EVT-0345",None,"The ritual sacrifice precedes the Sky Knight attack","V15 Ch1"),
 ("TC-23","BEFORE","EVT-0346","EVT-0347",None,"The Colossus arrives before Gadra fires it","V15 Ch1"),
 ("TC-24","BEFORE","EVT-0350","EVT-0351",None,"Gobya arrives last among the ground reinforcements","V15 Ch1"),
 ("TC-25","BEFORE","EVT-0361","EVT-0362",None,"Isolation precedes the deaths","V15 Ch2"),
 ("TC-26","BEFORE","EVT-0371","EVT-0373",None,"Velgrynd is revealed before she opens the jump","V15 Ch3"),
 ("TC-27","BEFORE","EVT-0382","EVT-0384",None,"Testarossa's victory precedes the armistice","V15 Epilogue"),
 ("TC-28","BEFORE","EVT-0384","EVT-0390",None,"Armistice precedes the summit","V15 Epilogue; V16 Ch3"),
 ("TC-29","BEFORE","EVT-0391","EVT-0394",None,"Treaty request precedes the succession","V16 Ch3"),
 ("TC-30","BEFORE","EVT-0394","EVT-0395",None,"Succession precedes repatriation","V16 Ch3"),
]

# ---------------------------------------------------------------------------
# REGISTERS
# ---------------------------------------------------------------------------
CONTRADICTIONS = list(r3.CONTRADICTIONS) + [
 ("CON-007","What the 'month' and 'twenty-nine day' anchors are measured from",
  "A month has passed since the subordinates' gathering met (V13 Ch1 opening line)",
  "The chariot force was expected in about twenty-nine days or more, but the invasion was slower than expected",
  "V13 Ch1","V13 Ch1",
  "Both are measured from the same reference point - the subordinates' gathering at which the corps "
  "order of battle was fixed (EVT-0004) - not from the invasion launch. Revision 3 measured them "
  "from the advance and produced an 8-day 'month' and a 28-day interval to a contact the source "
  "says took longer than 29 days.",
  "Re-anchored. EVT-0004 = D-38. EVT-0012 (month mark) = D-8, exactly R+30. First contact = R+38, "
  "satisfying 'slower than about twenty-nine days'. See AMB-016.","MEDIUM"),
]

AMBIGUITIES = [a for a in r3.AMBIGUITIES if a[0] not in ("AMB-006", "AMB-014", "AMB-015")] + [
 ("AMB-006","Interval between the Jura campaign and the second phase","EVT-0207 to EVT-0310",
  "The corpus places the second phase 'several days' after the Jura campaign but gives no figure. "
  "Revision 3 joined them same-day, which is not 'several days'.",
  "Widened to a 3-day gap: EVT-0207 at D+3, EVT-0310 at D+6. Three days is the minimum defensible "
  "reading of 'several'. The gap itself is SIMULATION_RECONSTRUCTED and remains the weakest join "
  "in the dataset.","LOW"),
 ("AMB-014","Distribution of the approach march across the interval","EVT-0003 to EVT-0021",
  "The corpus fixes the start of the advance, a ~29-day forecast that was overshot, an explicit "
  "month mark, a border crossing, a halt-and-deploy and forest entry - but no intermediate "
  "positions, distances or dates.",
  "Approach events spread across D-37 to D-1 by simulation placement. Column position is exposed as "
  "Approach_Progress_Pct, a linear interpolation between two source-supported endpoints. The "
  "percentage is NOT a measured distance and no distance is claimed.","MEDIUM"),
 ("AMB-015","Interval between mobilization and the subordinates' gathering","EVT-0001, EVT-0004",
  "The corpus gives no interval between the imperial mobilization order (V12 Ch4) and the "
  "subordinates' gathering (V12 Ch2) that serves as the temporal reference point.",
  "Set to 2 days (D-40 to D-38) by simulation placement. Nothing in the corpus constrains it; the "
  "campaign window would shift with any other reading.","LOW"),
 ("AMB-016","What the reference point for the month and 29-day anchors actually is","EVT-0004, EVT-0012, EVT-0003",
  "V13 Ch1 opens 'a month has passed since the subordinates' gathering met'. Candidate referents: "
  "(a) the V12 Ch2 meeting at which the corps order of battle was fixed; (b) a separate unnarrated "
  "gathering; (c) a translation artefact for a different assembly.",
  "Reading (a) adopted: it is the only gathering of Rimuru's subordinates the corpus narrates in the "
  "relevant window, and it makes both surviving duration anchors mutually consistent. Recorded as "
  "REFERENCE_EVENT = EVT-0004 at D-38. If (b) or (c) were correct the whole approach window would "
  "shift, though its internal order would not.","MEDIUM"),
 ("AMB-017","The 50-day campaign window is a simulation window, not a canonical duration","All frames",
  "No passage states how long the war lasted. The window is assembled from: mobilization to "
  "gathering (unconstrained, AMB-015), gathering to contact (R+38, constrained by two anchors), "
  "contact to labyrinth conclusion (D+0 to D+3, AMB-005), the 'several days' gap (AMB-006), and the "
  "second phase and settlement (sequence only).",
  "50 days is the SIMULATION CAMPAIGN WINDOW. It must never be quoted as a canonical war duration.","HIGH"),
]

# ---------------------------------------------------------------------------
# CASUALTY SCOPE AND POW CORRECTIONS (lock pass)
# X-01 CAS-005 was scoped EVENT_CASUALTY while its derivation says it is a
#      component of CAS-004. Summing EVENT_CASUALTY rows therefore double
#      counted 10,000. Rescoped to COMPONENT_CASUALTY.
# X-02 POW carried an explicit 0 on rows where the corpus states nothing about
#      prisoners. Explicit zeros are retained ONLY where V13 Ch3 states that no
#      prisoners were taken (surface phase) and where Tempest losses are stated
#      as zero. Everything else becomes UNKNOWN.
# ---------------------------------------------------------------------------
_POW_EXPLICIT_ZERO = {"CAS-001", "CAS-002", "CAS-003", "CAS-006", "CAS-007", "CAS-008"}
_c = []
for c in CASUALTIES:
    r = list(c)
    if r[0] == "CAS-005":
        r[14] = "COMPONENT_CASUALTY"
        r[20] = ("EXCLUDED from campaign totals: this 10,000 is a component of the 530,000 "
                 "recorded at CAS-004, not an additional loss.")
    if r[0] not in _POW_EXPLICIT_ZERO:
        r[11] = None            # UNKNOWN, not an unstated zero
    _c.append(tuple(r))
CASUALTIES = _c
