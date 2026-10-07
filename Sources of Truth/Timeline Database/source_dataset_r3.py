# -*- coding: utf-8 -*-
"""
Tempest-Eastern Empire War - MASTER DATASET v3 (FINAL).

Extends v2. Every v1 and v2 ID is preserved by importing the v2 module.
New in v3:
  * 12 approach-phase atomic events (V12/V13), so the month-long imperial
    approach march is campaign data rather than a gap before the grid.
  * The keyframe grid is re-anchored to CAMPAIGN start, not first contact.
  * Commander, territory and contradiction registers.

EVIDENCE fields carry source pointers (volume/chapter), not novel text.
Year 9001 is an artificial marker, NOT canonical.
"""
import dataset as v2

# ---------------------------------------------------------------------------
# CAMPAIGN CLOCK
# ---------------------------------------------------------------------------
# day_offset in the event tables is relative to FIRST CONTACT (D+0).
# The grid runs from CAMPAIGN_FIRST_DAY to CAMPAIGN_LAST_DAY inclusive.
CAMPAIGN_FIRST_DAY = -30      # imperial mobilization = campaign C+0
CAMPAIGN_LAST_DAY  = 7        # settlement
CAMPAIGN_DAYS = CAMPAIGN_LAST_DAY - CAMPAIGN_FIRST_DAY + 1     # 38
CAMPAIGN_START_DATE = (9001, 1, 1)      # calendar date of CAMPAIGN_FIRST_DAY
FIRST_CONTACT_DAY = 0

CAMPAIGN_STAGES = [
 ("A","STRATEGIC_CAMPAIGN_START",-30,-30,"Imperial mobilization ordered","EVT-0001","V12 Ch4"),
 ("B","OPERATIONAL_INVASION_START",-29,-8,"Invasion column begins the approach march","EVT-0003","V13 Prologue"),
 ("B2","OPERATIONAL_APPROACH",-7,-4,"Imperial army crosses the Tempest border","EVT-0014","V13 Ch1"),
 ("B3","DEPLOYMENT",-3,-1,"Column halts and deploys; 700,000 enter the forest","EVT-0018","V13 Ch1"),
 ("C","FIRST_CONTACT",0,0,"Green Legion surprise attack at the Dwargon gate","EVT-0102","V13 Ch1"),
 ("D","MAJOR_COMBAT_PERIOD",0,3,"Surface engagement and labyrinth attrition","EVT-0102..EVT-0209","V13"),
 ("E","SECOND_PHASE",4,6,"Imperial Capital, Dwargon east, dragon theatre","EVT-0310..EVT-0373","V14-V15"),
 ("F","ARMISTICE",7,7,"The Empire proposes an armistice","EVT-0384","V15 Epilogue"),
 ("G","POST_WAR_SETTLEMENT",7,7,"Treaty, succession, repatriation, reconstruction","EVT-0390..EVT-0399","V16 Ch3"),
]

THEATERS = v2.THEATERS
JTF = "Jura-Tempest Federation"; EE = "Eastern Empire"; DWG = "Armed Nation of Dwargon"
P0 = "PHASE_0_STRATEGIC_PREPARATION"

FORCES = v2.FORCES
MOVEMENTS = list(v2.MOVEMENTS)
COMBATANTS = v2.COMBATANTS
CASUALTIES = v2.CASUALTIES

# ---------------------------------------------------------------------------
# APPROACH-PHASE EVENTS (new in v3)
# ---------------------------------------------------------------------------
_NEW = []
def ev(*a):
    assert len(a) == 35, (a[0], len(a))
    _NEW.append(a)

ev("EVT-0009",-28,"14:00","-",P0,"TH-CAP","Imperial rear","-","Yuuki's office, Imperial Capital",
   "Gadra",EE,"Imperial government",EE,"INTELLIGENCE","Gadra warns Yuuki and reports to Rimuru",
   "Gadra ends the magic call with Yuuki, then reports and liaises with Rimuru",
   "An imperial minister begins working to Tempest's benefit","Tempest gains a source inside the imperial ministry",
   None,None,None,None,"Gadra acting unilaterally","NONE","HIGH",
   "SEQUENTIAL_CANON","LOW","LOW","HIGH","V13","Prologue","V13 Prologue - Gadra's magic call and report",
   "EVT-0004","EVT-0010","Yuuki notes Gadra appears to be defecting to Rimuru's side.")
ev("EVT-0010",-27,"10:00","-",P0,"TH-CAP","Imperial rear","-","Yuuki's office, Imperial Capital",
   "Yuuki Kagurazaka",EE,JTF,JTF,"INTELLIGENCE","Yuuki assesses Gadra's intelligence with Kagali",
   "Gadra assessed as too cunning to be trusted wholly but useful; a watcher observes Yuuki in the rain",
   "Imperial internal factions begin manoeuvring against one another",
   "The Empire is divided before the campaign opens",
   None,None,None,None,"Yuuki with Kagali","NONE","MEDIUM",
   "SEQUENTIAL_CANON","LOW","LOW","MEDIUM","V13","Prologue","V13 Prologue - Yuuki and Kagali discuss Gadra",
   "EVT-0009","EVT-0011","Gadra's message concerned Masayuki and Emperor Rudra.")
ev("EVT-0011",-26,"08:00","-",P0,"TH-DWG","Tempest rear","-","Tempest Control Room",
   "Rimuru Tempest / Benimaru",JTF,EE,EE,"STRATEGIC_PREPARATION","Control Room placed on a war footing",
   "Staff watch established on three shifts, day and night, to track imperial movement",
   "Tempest maintains continuous surveillance of the approach",
   "Tempest will not be surprised by the invasion",
   None,None,None,None,"Rimuru and Benimaru in the Control Room","NONE","MEDIUM",
   "SEQUENTIAL_CANON","LOW","LOW","HIGH","V13","Ch1","V13 Ch1 - the Control Room and its three-shift watch",
   "EVT-0010","EVT-0012","Souei, Shion, Diablo and Geld also present.")
ev("EVT-0012",-20,"12:00","a month has passed",P0,"TH-DWG","Tempest rear","-","Tempest",
   "Rimuru Tempest",JTF,EE,EE,"INTELLIGENCE","A month passes with no imperial movement",
   "No enemy movement after a month; Veldora and Ramiris stand down to their institute out of boredom",
   "Tempest strategic reserve released from readiness","Waiting imposes a cost on Tempest readiness",
   None,None,None,None,"Rimuru observing","NONE","MEDIUM",
   "EXPLICIT_RELATIVE","MEDIUM","LOW","HIGH","V13","Ch1","V13 Ch1 - a month elapsed, no movement",
   "EVT-0011","EVT-0013","Explicit month-scale anchor for the approach period.")
ev("EVT-0013",-14,"10:00","slower than expected",P0,"TH-DWG","Imperial approach","-","Great Jura Forest, eastern reaches",
   "Invasion Army",EE,"Great Jura Forest",JTF,"MOVEMENT","Column advances deliberately slowly as a display of power",
   "The advance is slower than the twenty-nine day estimate; the Empire slows deliberately to display its might",
   "The approach becomes psychological as much as military",
   "Tempest gains further preparation time it did not expect",
   None,940000,None,None,"Imperial field command","NONE","MEDIUM",
   "EXPLICIT_RELATIVE","MEDIUM","LOW","HIGH","V13","Ch1","V13 Ch1 - the invasion slower than expected, deliberately so",
   "EVT-0012","EVT-0014","")
ev("EVT-0014",-12,"09:00","-",P0,"TH-DWG","Imperial approach","-","Great Jura Forest, eastern reaches",
   "Invasion Army",EE,"Forest fauna",JTF,"MOVEMENT","The column's advance drives the forest fauna out",
   "Even sub-A rank beasts living in the forest flee the imperial line of march",
   "The forest empties ahead of the imperial advance",
   "The approach is observable at long range without contact",
   None,940000,None,None,"Imperial field command","LOW","MEDIUM",
   "SEQUENTIAL_CANON","LOW","LOW","HIGH","V13","Ch1","V13 Ch1 - sub-A beasts fleeing the imperial column",
   "EVT-0013","EVT-0015","Observed by Rimuru through Argos.")
ev("EVT-0015",-7,"08:00","-",P0,"TH-DWG","Imperial approach","-","Tempest border",
   "Invasion Army",EE,JTF,JTF,"MOVEMENT","The Imperial Army crosses the Tempest border",
   "The border is forced, contrary to international law as set by the Western council",
   "The invasion becomes a fact rather than a threat",
   "Tempest acquires a lawful casus belli for a pre-emptive strike",
   None,940000,None,None,"Imperial field command","MEDIUM","CRITICAL",
   "SEQUENTIAL_CANON","LOW","LOW","HIGH","V13","Ch1","V13 Ch1 - the Imperial Army has crossed the border",
   "EVT-0014","EVT-0016","Tempest declines to use it for a surprise attack.")
ev("EVT-0016",-6,"11:00","-",P0,"TH-DWE","Dwargon eastern approach","-","Dwargon eastern gate (Isthmus)",
   "Hybrid Legion field element",EE,DWG,DWG,"SIEGE","Dwargon's eastern gate is blockaded",
   "Gazel reports the eastern gate of Dwargon blocked by the Imperial Army; Rimuru suspects Yuuki's legion",
   "A second front is opened against Dwargon before first contact",
   "The Empire commits forces on two axes simultaneously",
   None,60000,None,None,"Gazel reporting; imperial blockade force unnamed","LOW","CRITICAL",
   "DAY_LEVEL_CANON","LOW","MEDIUM","HIGH","V13","Ch1","V13 Ch1 - Gazel reports the eastern gate blocked",
   "EVT-0015","EVT-0017","Confirms the blockade begins in V13, earlier than the V14 Ch4 camp scene.")
ev("EVT-0017",-6,"12:00","-",P0,"TH-DWE","Dwargon eastern approach","-","Imperial territory",
   "Rimuru Tempest (Argos observation)",JTF,"Hybrid Legion field element",EE,"RECONNAISSANCE",
   "Argos imagery of the blockade obtained and shared",
   "Distance and a magical barrier degrade the imagery, but a group blocking the eastern road is visible",
   "Allied command shares a common intelligence picture",
   "Dwargon's suspicion of a trap is partly allayed",
   None,None,None,None,"Rimuru directing Argos","NONE","HIGH",
   "SEQUENTIAL_CANON","LOW","LOW","HIGH","V13","Ch1","V13 Ch1 - Argos imagery, barrier interference",
   "EVT-0016","EVT-0018","Gadra's reliability explicitly not assumed at one hundred percent.")
ev("EVT-0018",-5,"14:00","-",P0,"TH-DWG","Allied command","-","Tempest Control Room",
   "Rimuru Tempest / King Gazel Dwargo",JTF,EE,EE,"COMMAND",
   "Allied division of tasks confirmed between Tempest and Dwargon",
   "Final confirmation of the joint division of tasks; Dwargon will legally wait to be attacked before striking",
   "Allied command arrangements fixed before contact",
   "Dwargon's legal constraint shapes the opening of the war",
   None,None,None,None,"Rimuru and Gazel; Benimaru present","NONE","HIGH",
   "SEQUENTIAL_CANON","LOW","LOW","HIGH","V13","Ch1","V13 Ch1 - final confirmation of the joint task division",
   "EVT-0017","EVT-0019","Dwargon envoys to the Empire had already been rebuffed.")
ev("EVT-0019",-3,"09:00","-",P0,"TH-DWG","Imperial approach","-","Edge of the Great Jura Forest",
   "Invasion Army",EE,JTF,JTF,"DEPLOYMENT","The column halts and begins deploying its formations",
   "The imperial side stops and forms up; infantry march into the forest one formation after another",
   "The Empire transitions from approach march to attack posture",
   "The point of no return for the invasion",
   None,940000,None,None,"Imperial field command","MEDIUM","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","HIGH","HIGH","V13","Ch1","V13 Ch1 - the imperial side halts and deploys",
   "EVT-0018","EVT-0020","")
ev("EVT-0020",-3,"11:00","-",P0,"TH-DWG","Imperial approach","-","Great Jura Forest",
   "Mecha Modification Corps",EE,JTF,JTF,"MOVEMENT","Seven hundred thousand enter the forest",
   "The force entering the forest totals about seventy percent of the whole imperial strength, up to 700,000",
   "The imperial main body is committed to the forest",
   "Roughly seventy percent of imperial strength is placed at risk in one theatre",
   None,700000,None,None,"Marshal Calgurio","MEDIUM","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","HIGH","HIGH","V13","Ch1","V13 Ch1 - about 70 percent of imperial strength, up to 700,000",
   "EVT-0019","EVT-0021","The 70 percent figure is the basis of CON-005.")
ev("EVT-0021",-1,"16:00","-",P0,"TH-DWG","Dwargon approach","-","Inn town on the imperial line of march",
   "First Corps / Green Legion",JTF,"Magic Chariot Division",EE,"DEPLOYMENT",
   "Tempest forces stage at the inn town on the imperial route",
   "Demon lord forces stationed at the inn town along the imperial line of march",
   "Tempest is positioned astride the imperial advance",
   "Geist believes his own plan is succeeding",
   15000,None,None,None,"Benimaru in overall command","LOW","HIGH",
   "SEQUENTIAL_CANON","LOW","LOW","MEDIUM","V13","Ch1","V13 Ch1 - demon lord forces at the inn town",
   "EVT-0020","EVT-0008","Geist reads the staging as evidence his plan is working.")
ev("EVT-0100",0,"05:00","-","PHASE_1_SURFACE_ENGAGEMENT","TH-DWG","Dwargon Gate Front",
   "Battle of the Dwargon Gate","Ten kilometres from the imperial line",
   "First Corps / Green Legion",JTF,"Magic Chariot Division",EE,"MOVEMENT",
   "Tempest scouting element closes to ten kilometres",
   "About one hundred approach; the sound closes to ten kilometres, inside the Magic Guided Cannon envelope",
   "Tempest enters the imperial weapon envelope before contact",
   "The Empire holds the first-fire advantage at the moment of contact",
   100,200000,None,None,"Lt Gen Geist observing","LOW","HIGH",
   "SEQUENTIAL_CANON","MEDIUM","MEDIUM","HIGH","V13","Ch1",
   "V13 Ch1 - about one hundred closing; ten kilometres; cannon max thirty km, effective about three km",
   "EVT-0008","EVT-0101",
   "Magic Guided Cannon: maximum 30 km, effective about 3 km. Two experimental explosive rounds available.")

# splice the new events into the graph in chronological order
EVENTS = sorted(list(v2.EVENTS) + _NEW, key=lambda e: (e[1], e[2], e[0]))
_ORDER = [e[0] for e in EVENTS]
_POS = {eid: i for i, eid in enumerate(_ORDER)}
EVENTS = [tuple(list(e[:32]) +
                [_ORDER[_POS[e[0]] - 1] if _POS[e[0]] > 0 else None,
                 _ORDER[_POS[e[0]] + 1] if _POS[e[0]] < len(_ORDER) - 1 else None,
                 e[34]])
          for e in EVENTS]

MOVEMENTS += [
 ("MOV-018","F-EMP-010","Eastern Empire interior","Tempest border","EVT-0003","EVT-0015",
  "ADVANCE","SIMULATION_RECONSTRUCTED","MEDIUM",
  "The long approach march. Endpoints canonical; intermediate positions are linear interpolation."),
 ("MOV-019","F-EMP-010","Tempest border","Edge of the Great Jura Forest","EVT-0015","EVT-0019",
  "ADVANCE","SEQUENTIAL_CANON","MEDIUM","Border crossing to the halt-and-deploy line."),
 ("MOV-020","F-EMP-011","Edge of the Great Jura Forest","Great Jura Forest interior","EVT-0019","EVT-0020",
  "DEPLOYMENT","SEQUENTIAL_CANON","HIGH","700,000 marching into the forest formation by formation."),
 ("MOV-021","F-TEM-001","Tempest","Inn town on the imperial line of march","EVT-0018","EVT-0021",
  "DEPLOYMENT","SIMULATION_RECONSTRUCTED","MEDIUM","Staging astride the imperial route."),
 ("MOV-022","F-TEM-001","Inn town","Ten kilometres from the imperial line","EVT-0021","EVT-0100",
  "ADVANCE","SEQUENTIAL_CANON","HIGH","About one hundred closing to 10 km."),
]

# ---------------------------------------------------------------------------
# COMMANDER REGISTER
# ---------------------------------------------------------------------------
# CMD_ID, NAME, FACTION, ROLE, COMMAND_SCOPE, START_EVENT, END_EVENT, STATUS,
# SUBORDINATES, SOURCE, CONFIDENCE
COMMANDERS = [
 ("CMD-001","Rimuru Tempest",JTF,"Head of state","National command","EVT-0004","EVT-0398","IN COMMAND",
  "Benimaru; Diablo; Testarossa; Ramiris","V12 Ch2 - V16 Ch3","HIGH"),
 ("CMD-002","Benimaru",JTF,"Supreme General","All Tempest field forces","EVT-0004","EVT-0390","IN COMMAND",
  "Gobta; Geld; Gabil; Gobya","V12 Ch2 - V16 Ch3","HIGH"),
 ("CMD-003","Gobta",JTF,"Corps commander","First Corps / Green Legion (12,000)","EVT-0006","EVT-0119","IN COMMAND",
  "Green Legion wolf-riders","V12 Ch2; V13 Ch1-2","HIGH"),
 ("CMD-004","Geld",JTF,"Corps commander","Second Corps (37,000)","EVT-0004","EVT-0119","IN COMMAND",
  "Yellow Legion; Orange Legion","V12 Ch2","HIGH"),
 ("CMD-005","Gabil",JTF,"Corps commander","Third Corps (3,000) + Flying Dragons","EVT-0006","EVT-0348",
  "COMMAND DELEGATED TO DORF","Blue Legion; Flying Dragon element","V12 Ch2; V15 Ch1","HIGH"),
 ("CMD-006","Gobya",JTF,"Detachment commander","Kurenai advance force","EVT-0350","EVT-0350","IN COMMAND",
  "Kurenai advance element; Phobio attached","V15 Ch1","MEDIUM"),
 ("CMD-007","Hakurou",JTF,"Advisor","Kurenai advance force","EVT-0350","EVT-0350","ADVISORY","-","V15 Ch1","MEDIUM"),
 ("CMD-008","Ramiris",JTF,"Theatre commander","Ramiris Labyrinth","EVT-0202","EVT-0333","IN COMMAND",
  "Adalman; labyrinth garrison","V13 Ch4; V14 Epilogue","HIGH"),
 ("CMD-009","Adalman",JTF,"Sector commander","Labyrinth undead formations","EVT-0203","EVT-0383","IN COMMAND",
  "Undead formations","V13 Ch4; V15 Epilogue","HIGH"),
 ("CMD-010","Testarossa",JTF,"Independent element, later ambassador","Own element; embassy to the Empire",
  "EVT-0005","EVT-0396","REASSIGNED TO EMBASSY","-","V13 Ch1 - V16 Ch3","HIGH"),
 ("CMD-020","King Gazel Dwargo",DWG,"Head of state and field commander","All Dwargon forces","EVT-0007","EVT-0345",
  "IN COMMAND","Dorf; Ben; Anrietta; Sky Knights","V13 Ch1; V15 Ch1","HIGH"),
 ("CMD-021","Dorf",DWG,"Formation commander","Heavy assault force; later joint eastern-front command",
  "EVT-0344","EVT-0348","ASSUMED JOINT COMMAND","Dwargon heavy assault force; Flying Dragons","V15 Ch1","HIGH"),
 ("CMD-030","Emperor Rudra Nam Ul Nasca",EE,"Head of state","Imperial mobilization authority","EVT-0001","EVT-0381",
  "SUPERSEDED","Calgurio; Gladim; Yuuki; Velgrynd","V12 Ch4; V15 Ch5","HIGH"),
 ("CMD-031","Marshal Calgurio / Caligulio",EE,"Marshal","Mechs Legion; supreme field command of the invasion",
  "EVT-0001","EVT-0390","SURVIVED, IMPERIAL DELEGATE","Geist; Faraga; Mecha Modification Corps","V12 Ch4 - V16 Ch3","HIGH"),
 ("CMD-032","Lieutenant General Geist",EE,"Lieutenant General","Magic Chariot Division (200,000)","EVT-0101","EVT-0119",
  "KILLED IN ACTION","2,000 chariot crews; supply guard infantry","V12 Ch4; V13 Ch1-3","HIGH"),
 ("CMD-033","Major General Faraga",EE,"Major General","Air Combat Flying Corps (40,000, 400 airships)",
  "EVT-0106","EVT-0115","KILLED IN ACTION","Airship crews","V12 Ch4; V13 Ch2-3","HIGH"),
 ("CMD-034","Major General Minute / Minitz",EE,"Major General","Not specified in the corpus","EVT-0001","EVT-0390",
  "SURVIVED, IMPERIAL DELEGATE","UNKNOWN","V12 Ch4; V16 Ch3","MEDIUM"),
 ("CMD-035","Grand Admiral Gladim",EE,"Grand Admiral","Warcraft Legion (30,000)","EVT-0370","EVT-0372",
  "IN COMMAND","Warcraft Legion","V12 Ch4; V15 Ch3","HIGH"),
 ("CMD-036","Yuuki Kagurazaka",EE,"Legion commander","Hybrid Legion (200,000 / 100,000 effective)","EVT-0009","EVT-0318",
  "IN COMMAND, CONSPIRACY COMPROMISED","Kagali; Laplace; Tia; Footman; Miranda; Tolneod; Aria; Olca",
  "V12 Ch4; V13 Prologue; V14 Ch3","HIGH"),
 ("CMD-037","Lieutenant Tatsuya Kondo",EE,"Intelligence officer","Imperial Intelligence Service / Near Guard",
  "EVT-0313","EVT-0348","IN COMMAND","Kondo's associates; ritual casters","V14 Ch3; V15 Ch1","HIGH"),
 ("CMD-038","Velgrynd (Scorch Dragon)",EE,"Marshal and guardian dragon","Imperial strategic direction","EVT-0330","EVT-0394",
  "SURVIVED, KINGMAKER","Samuel; Gladim","V14 Epilogue; V15 Ch3; V16 Ch3","HIGH"),
 ("CMD-039","Samuel",EE,"Flotilla commander","300-airship transport flotilla","EVT-0370","EVT-0373","IN COMMAND",
  "Airship crews","V15 Ch3","HIGH"),
 ("CMD-040","Masayuki",EE,"Emperor","Imperial head of state","EVT-0394","EVT-0398","ACCEDED",
  "Caligulio; Minitz; Velgrynd","V16 Ch3","HIGH"),
 ("CMD-041","Hybrid Legion blockade force",EE,"(command vacuum)","Blockade of the Dwargon eastern metropolis",
  "EVT-0321","EVT-0343","COMMAND COLLAPSED","None - no authorised officer present","V14 Ch4","HIGH"),
]

# ---------------------------------------------------------------------------
# TERRITORIAL REGISTER
# ---------------------------------------------------------------------------
# LOC_ID, NAME, THEATER, CONTROL_BEFORE, CONTROL_AFTER, CHANGE_EVENT, BASIS, SOURCE, CONFIDENCE, NOTES
TERRITORY = [
 ("LOC-001","Eastern approaches to the Great Jura Forest","TH-DWG","EMPIRE_CONTROLLED","CONTESTED",
  "EVT-0015","SEQUENTIAL_CANON","V13 Ch1","HIGH","Border forced by the Imperial Army."),
 ("LOC-002","Great Jura Forest (eastern reaches)","TH-DWG","TEMPEST_CONTROLLED","CONTESTED",
  "EVT-0020","SEQUENTIAL_CANON","V13 Ch1","HIGH","700,000 imperial troops enter the forest."),
 ("LOC-003","Dwargon Gate Front","TH-DWG","CONTESTED","TEMPEST_CONTROLLED",
  "EVT-0119","SEQUENTIAL_CANON","V13 Ch3","HIGH","Field held by Tempest after the imperial annihilation."),
 ("LOC-004","Airspace over the Dwargon Gate Front","TH-DWG","CONTESTED","TEMPEST_CONTROLLED",
  "EVT-0115","SEQUENTIAL_CANON","V13 Ch2","HIGH","Air Combat Flying Corps destroyed."),
 ("LOC-005","Ramiris Labyrinth interior","TH-LAB","TEMPEST_CONTROLLED","TEMPEST_CONTROLLED",
  "EVT-0207","SEQUENTIAL_CANON","V13 Ch4","HIGH","Never lost; the imperial army was destroyed inside it."),
 ("LOC-006","Labyrinth gate and upper floors","TH-LAB","TEMPEST_CONTROLLED","DESTROYED",
  "EVT-0332","SEQUENTIAL_CANON","V14 Epilogue","HIGH","Gate destroyed; upper floors assessed as likely destroyed."),
 ("LOC-007","Rimuru, the Tempest capital","TH-LAB","TEMPEST_CONTROLLED","TEMPEST_CONTROLLED",
  "EVT-0333","SEQUENTIAL_CANON","V14 Epilogue","HIGH","Undamaged; concealed inside the labyrinth."),
 ("LOC-008","Great Jura Forest (surface)","TH-DRG","TEMPEST_CONTROLLED","DESTROYED",
  "EVT-0331","SEQUENTIAL_CANON","V14 Epilogue","HIGH","Burned in the dragon engagement. Terrain loss, not a change of owner."),
 ("LOC-009","Dwargon eastern metropolis (Isthmus gate)","TH-DWE","DWARGON_CONTROLLED","CONTESTED",
  "EVT-0016","DAY_LEVEL_CANON","V13 Ch1","HIGH","Blockaded by 60,000. Blockade was camouflage; the city never fell."),
 ("LOC-010","Ritual position behind the Scorch Dragon","TH-DWE","EMPIRE_CONTROLLED","CONTESTED",
  "EVT-0345","SEQUENTIAL_CANON","V15 Ch1","MEDIUM","Attacked by 500 Sky Knights. Final ownership not stated."),
 ("LOC-011","Imperial Capital (Tidu)","TH-CAP","EMPIRE_CONTROLLED","EMPIRE_CONTROLLED",
  "EVT-0315","SEQUENTIAL_CANON","V14 Ch3","HIGH","Internally contested by the coup, never lost. Coup leadership eliminated."),
 ("LOC-012","Sealed space, Imperial Capital","TH-CAP","EMPIRE_CONTROLLED","CONTESTED",
  "EVT-0361","SEQUENTIAL_CANON","V15 Ch2","MEDIUM","Tempest command element confined inside it."),
 ("LOC-013","Airspace over northern Ingracia","TH-CAP","NEUTRAL","EMPIRE_CONTROLLED",
  "EVT-0370","SEQUENTIAL_CANON","V15 Ch3","MEDIUM","Transit corridor for the Warcraft Legion, not occupation."),
 ("LOC-014","Eastern Empire (post-war)","TH-DIP","EMPIRE_CONTROLLED","EMPIRE_CONTROLLED",
  "EVT-0394","SEQUENTIAL_CANON","V16 Ch3","HIGH","No territory transferred. Succession changed, not ownership."),
]

# ---------------------------------------------------------------------------
# CONTRADICTION REGISTER
# ---------------------------------------------------------------------------
CONTRADICTIONS = [
 ("CON-001","Size of the invading army",
  "The invading army numbered ninety-four thousand (as rendered in the Indonesian text)",
  "700,000 + 200,000 + 40,000 = 940,000 across the component formations",
  "V13 Ch3","V12 Ch4; V13 Ch1, Ch3",
  "The stated total is smaller than the 240,000 the same sentence says were destroyed, so it cannot stand.",
  "Adopted 940,000. Recorded in F-EMP-010 as INFERRED_RECONCILED. See AMB-001.","MEDIUM"),
 ("CON-002","Whether prisoners were taken",
  "No prisoners were taken; all were killed in action","Captured imperial forces were returned to the Empire",
  "V13 Ch3","V16 Ch3",
  "Not a true contradiction once scoped: the zero applies to the Jura surface phase, the prisoners to later phases.",
  "CAS-008 scoped to the surface phase; CAS-014 records later-phase prisoners as UNKNOWN. See AMB-012.","HIGH"),
 ("CON-003","Whether Shion died",
  "Shion and others are killed in the sealed space","Shion attends the post-war summit",
  "V15 Ch2","V16 Ch3",
  "The corpus establishes revival mechanics elsewhere but does not explicitly narrate her restoration.",
  "Both recorded. CAS-013 keeps the death with count UNKNOWN; ACT-011 status reads KILLED, LATER PRESENT AT SUMMIT. No revival event is invented.","MEDIUM"),
 ("CON-004","The figure 'one hundred thirteen thousand'",
  "A force of one hundred thirteen thousand could be sent on the emperor's order",
  "The legions described immediately before total far more than 113,000",
  "V12 Ch4","V12 Ch4",
  "Internally inconsistent within a single passage. Possibly 1,130,000 mis-rendered, or a first-wave echelon.",
  "Excluded from the force database. Recorded here and in AMB-002 only.","LOW"),
 ("CON-005","Total imperial strength implied by the 70 percent figure",
  "The 700,000 entering the forest is about seventy percent of the whole imperial strength, implying roughly 1,000,000 total",
  "The Empire can mobilise more than two million including garrisons",
  "V13 Ch1","V12 Ch4",
  "Reconcilable: the 70 percent is measured against deployable field strength (about one million), not the full mobilisable pool.",
  "Both retained. F-EMP-001 deployable ceiling of about 1,000,000 is treated as the denominator for the 70 percent.","MEDIUM"),
 ("CON-006","When the Dwargon eastern blockade begins",
  "Gazel reports the eastern gate already blockaded, before first contact",
  "The blockade camp scene is narrated in V14, after the Jura campaign",
  "V13 Ch1","V14 Ch4",
  "Not contradictory: the blockade begins before first contact and persists; V14 narrates a later moment in the same siege.",
  "Blockade start placed at EVT-0016 (D-6); the camp scene remains at EVT-0319. F-EMP-031 spans both.","HIGH"),
]

AMBIGUITIES = list(v2.AMBIGUITIES) + [
 ("AMB-014","Distribution of the approach march across the month","EVT-0003 to EVT-0021",
  "The corpus gives the start of the advance, an expected twenty-nine day arrival, an explicit 'a month has passed' with no movement, a border crossing and a halt-and-deploy, but no intermediate positions or dates.",
  "Approach events spread across D-29 to D-1 by SIMULATION_RECONSTRUCTED placement. Intermediate column position is linear interpolation, exposed as APPROACH_PROGRESS_PCT and labelled simulation.","MEDIUM"),
 ("AMB-015","Whether the campaign should begin at mobilization or at the advance","EVT-0001, EVT-0003",
  "Mobilization (V12 Ch4) and the start of the advance (V13 Prologue) are separated by an unstated interval.",
  "CAMPAIGN_TIME C+0 set at mobilization (D-30); OPERATIONAL_INVASION_START at D-29. The one-day gap is simulation.","MEDIUM"),
]

# ---------------------------------------------------------------------------
# WIA CORRECTION (v3)
# v1 carried WIA = 0 on nine casualty rows. The corpus never states zero
# wounded anywhere; that was UNKNOWN being silently converted to zero.
# POW zeros are retained: V13 Ch3 explicitly states no prisoners were taken.
# ---------------------------------------------------------------------------
CASUALTIES = [tuple(list(c[:10]) + ["UNKNOWN"] + list(c[11:])) for c in CASUALTIES]
