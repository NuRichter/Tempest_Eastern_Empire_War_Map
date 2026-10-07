# -*- coding: utf-8 -*-
"""
Tempest-Eastern Empire War - MASTER DATASET v2 (deep revision).

Revision of v1, not a rebuild. Every v1 EVENT_ID, FORCE_ID, CAS_ID, phase name
and source reference is preserved by importing the v1 module and extending it.
The only v1 records removed are the three placeholder phase-level events
EVT-0301/0302/0303, which are superseded by 40 atomic V14-V16 events.

EVIDENCE fields carry source pointers (volume/chapter), not novel text.
Calendar year 9001 is an artificial marker, NOT canonical.
"""
import dataset_v1_backup as v1

CAMPAIGN_START_DATE = (9001, 1, 1)
CAMPAIGN_DAYS = 8                      # v1 covered 4

THEATERS = {
 "TH-DWG": ("Dwargon Gate Front", "Great Jura Forest"),
 "TH-LAB": ("Ramiris Labyrinth Front", "Ramiris Labyrinth"),
 "TH-CAP": ("Imperial Capital", "Eastern Empire"),
 "TH-DWE": ("Dwargon Eastern Metropolis", "Armed Nation of Dwargon"),
 "TH-DRG": ("Dragon Theatre (Jura airspace)", "Great Jura Forest"),
 "TH-DIP": ("Diplomatic / Settlement", "Inter-state"),
}

JTF = "Jura-Tempest Federation"; EE = "Eastern Empire"; DWG = "Armed Nation of Dwargon"
P0 = "PHASE_0_STRATEGIC_PREPARATION"; P1 = "PHASE_1_SURFACE_ENGAGEMENT"
P2 = "PHASE_2_LABYRINTH_ATTRITION";   P3 = "PHASE_3_SECOND_PHASE"
P4 = "PHASE_4_TERMINATION";           P5 = "PHASE_5_POSTWAR_SETTLEMENT"

# ============================================================================
# FORCES  = v1 records (preserved verbatim, three status corrections) + new
# ============================================================================
_FORCE_PATCH = {   # FORCE_ID -> {field_index: new_value}
 "F-EMP-010": {12: 940000-170000, 18: "DESTROYED"},
 "F-EMP-011": {11: 170000, 12: 530000},
 "F-EMP-012": {11: 0,      12: 200000},
 "F-EMP-013": {11: 0,      12: 40000},
 "F-EMP-020": {16: "Airborne, en route to the central continent", 17: "IN_TRANSIT",
               18: "DEPLOYED", 20: "V12 Ch4; V15 Ch3",
               22: "Mounts rated above A-. Committed in the second phase under Gladim, not the Jura invasion."},
 "F-EMP-030": {16: "Eastern Empire / Dwargon eastern approach", 17: "DEPLOYING",
               18: "DESTROYED", 20: "V12 Ch4; V14 Ch4; V15 Ch1",
               22: "Half are intelligence or general-service personnel. Field element destroyed in the second phase."},
 "F-TEM-003": {16: "Dwargon Gate Front; later Dwargon eastern relief", 20: "V12 Ch2; V13 Ch1; V15 Ch1"},
 "F-TEM-003B": {20: "V12 Ch2; V15 Ch1",
                22: "Individual ability around A-. One hundred of them airlifted the Floor Guardian Colossus."},
 "F-TEM-004": {16: "Tempest / command post; advance element to Dwargon east",
               17: "DEPLOYING", 20: "V12 Ch2; V15 Ch1"},
 "F-DEM-001": {16: "Dwargon Gate Front; later imperial theatre and embassy",
               20: "V13 Ch1-2; V15 Epilogue; V16 Ch3",
               22: "Also diplomatic representative; later ambassador to the Empire."},
 "F-DRG-001": {16: "Dwargon Gate Front airspace; later Jura airspace",
               20: "V13 Ch2; V14 Epilogue; V15",
               22: "Primary target of the Air Combat Flying Corps; later Velgrynd's opponent."},
}
_FORCE_REPLACE = {   # rows with an arity defect in v1, restated correctly here
 "F-TEM-003B": ("F-TEM-003B","Jura-Tempest Federation","Tempest Army","Flying Dragon element","F-TEM-003",
  "Gabil","Air strike / heavy air lift",
  "hundreds of Flying Dragons; only about three hundred currently developed",
  300,None,300,300,0,None,None,None,
  "Airspace, Dwargon fronts","ADVANCING","ENGAGED","CANONICAL","V12 Ch2; V15 Ch1","MEDIUM",
  "Individual ability around A-. One hundred of them airlifted the Floor Guardian Colossus."),
}
FORCES = []
for _f in v1.FORCES:
    _r = list(_FORCE_REPLACE.get(_f[0], _f))
    for _i, _v in _FORCE_PATCH.get(_r[0], {}).items():
        _r[_i] = _v
    FORCES.append(tuple(_r))

FORCES += [
 ("F-EMP-014",EE,"Imperial Intelligence","Imperial Intelligence Service / Near Guard","F-EMP-001",
  "Lieutenant Tatsuya Kondo","Counter-intelligence, internal security","no headcount stated",
  None,None,None,None,None,None,None,None,"Imperial Capital","STATIONARY","DEPLOYED",
  "CANONICAL","V14 Ch3","HIGH",
  "Kondo holds the unique skill Reader. Damrada suspected as head of the Near Guard."),
 ("F-EMP-031",EE,"Hybrid Legion","Hybrid Legion field element (Dwargon east)","F-EMP-030",
  "Yuuki Kagurazaka (nominal)","Blockade / camouflage force",
  "sixty thousand troops blockading the eastern metropolis of Dwargon",
  60000,60000,60000,0,60000,None,None,None,"Dwargon eastern metropolis","DEPLOYED","DESTROYED",
  "CANONICAL","V14 Ch4; V15 Ch1","HIGH",
  "Blockade was camouflage for a secret alliance with Dwargon. Later expended as the ritual sacrifice."),
 ("F-EMP-032",EE,"Hybrid Legion","Hybrid Legion staff element","F-EMP-030","Yuuki Kagurazaka","Command staff",
  "named staff only: Tolneod, Aria, Olca",None,None,None,None,None,None,None,None,
  "Imperial Capital","STATIONARY","DEPLOYED","CANONICAL","V14 Ch3","MEDIUM",
  "Aria is a disciple of Gadra. Tolneod serves as staff to the hybrid corps."),
 ("F-EMP-050",EE,"Clown faction","Yuuki's clown group","F-EMP-030","Yuuki Kagurazaka","Coup conspiracy",
  "named members: Kagali, Laplace, Tia, Footman, Miranda, Vega",None,None,None,None,1,None,None,None,
  "Imperial Capital","STATIONARY","DAMAGED","CANONICAL","V14 Prologue; V14 Ch3","HIGH",
  "Miranda counted among the Three Greats. Vega absent from the initial meeting."),
 ("F-EMP-060",EE,"Air Transport Command","Airship transport flotilla (second phase)","F-EMP-001",
  "Samuel","Strategic air lift","three hundred flying airships",300,300,300,300,None,None,None,None,
  "Airborne over northern Ingracia, bound for the central continent","IN_TRANSIT","DEPLOYED",
  "CANONICAL","V15 Ch3","HIGH","Carrying the Warcraft Legion. Velgrynd aboard, disguised as Marshal."),
 ("F-EMP-070",EE,"Dragon","Velgrynd (Scorch Dragon)","-","Velgrynd",
  "Strategic-tier combatant / imperial guardian","single entity",1,1,1,1,None,None,None,None,
  "Jura airspace; later imperial theatre","ENGAGED","ENGAGED","CANONICAL","V14 Epilogue; V15; V16 Ch3","HIGH",
  "Uses Parallel Existence and Space Domination. Guardian dragon of the Empire under imperial court law."),
 ("F-DWA-002",DWG,"Dwargon Armed Forces","Sky Knights","F-DWA-001","King Gazel Dwargo",
  "Special attack / air assault","five hundred Sky Knights",500,500,500,500,None,None,None,None,
  "Dwargon eastern front","DEPLOYED","ENGAGED","CANONICAL","V15 Ch1","HIGH",
  "Committed as the only viable strike option against the ritual casters."),
 ("F-DWA-003",DWG,"Dwargon Armed Forces","Heavy armed assault force","F-DWA-001","Dorf","Heavy infantry",
  "no headcount stated",None,None,None,None,None,None,None,None,
  "Dwargon eastern front","STATIONARY","DEPLOYED","CANONICAL","V15 Ch1","MEDIUM",
  "Held back: poor mobility made it a magic target. Ben and Anrietta also present."),
 ("F-TEM-011",JTF,"Labyrinth defence","Floor Guardian Colossus","F-TEM-010","Gadra (rider)",
  "Heavy assault construct","single construct, airlifted by one hundred Flying Dragons",
  1,1,1,1,None,None,None,None,"Dwargon eastern front","IN_TRANSIT","ENGAGED","CANONICAL","V15 Ch1","HIGH",
  "Excellent in close combat, very slow to move. Committed as reinforcement to Dwargon."),
 ("F-TEM-012",JTF,"Tempest Army","Kurenai advance force","F-TEM-004","Gobya (Hakurou advising)",
  "Advance ground element","no headcount stated",None,None,None,None,None,None,None,None,
  "Dwargon eastern front","ADVANCING","ENGAGED","CANONICAL","V15 Ch1","MEDIUM",
  "Moved overland at A-rank speed; arrived last. Phobio of the Three Beastmen attached."),
 ("F-TEM-013",JTF,"Primordial demons","Ultima's subordinates (Veyron, Zonda)","F-DEM-002","Ultima",
  "Independent reinforcement","two named subordinates",2,2,2,2,None,None,None,None,
  "Dwargon eastern front","REPOSITIONING","ENGAGED","CANONICAL","V15 Ch1","MEDIUM",
  "Arrival time not stated in the source."),
 ("F-ALL-001","Beast Kingdom Eurazania","Allied contingent","Phobio the Panthertooth","F-TEM-012","Phobio",
  "Attached individual combatant","single combatant",1,1,1,1,None,None,None,None,
  "Dwargon eastern front","ADVANCING","ENGAGED","CANONICAL","V15 Ch1","HIGH",
  "One of Carrion's Three Beastmen; had not returned home and joined Gobya."),
]

# ============================================================================
# EVENTS
# v2 schema (35 fields) = v1 schema (32) + STRATEGIC_RESULT at 17 + PREV/NEXT
# v1 events are migrated field-by-field; the three placeholders are dropped.
# ============================================================================
_THEATER_OF = {  # v1 EVENT_ID -> theater id
 "EVT-0001":"TH-CAP","EVT-0002":"TH-CAP","EVT-0003":"TH-DWG","EVT-0004":"TH-DWG",
 "EVT-0005":"TH-CAP","EVT-0006":"TH-DWG","EVT-0007":"TH-DWG","EVT-0008":"TH-DWG",
 "EVT-0201":"TH-LAB","EVT-0202":"TH-LAB","EVT-0203":"TH-LAB","EVT-0204":"TH-LAB",
 "EVT-0205":"TH-LAB","EVT-0206":"TH-LAB","EVT-0207":"TH-LAB","EVT-0208":"TH-LAB",
 "EVT-0209":"TH-LAB",
}
_STRATEGIC = {
 "EVT-0001":"Empire commits to war with Tempest",
 "EVT-0002":"Imperial confidence set for the campaign",
 "EVT-0003":"Strategic surprise forfeited by the Empire",
 "EVT-0004":"Tempest able to field 150,000 at national potential",
 "EVT-0005":"War begins on a declared footing",
 "EVT-0006":"Tempest accepts battle at the gate rather than in depth",
 "EVT-0007":"Dwargon commits to the alliance",
 "EVT-0008":"Tempest plans the trap with full information",
 "EVT-0101":"Imperial main effort fixed at the gate",
 "EVT-0102":"Empire never regains the initiative",
 "EVT-0103":"Imperial standoff advantage nullified",
 "EVT-0104":"Imperial armour left unscreened",
 "EVT-0105":"Two simultaneous fronts imposed on the Empire",
 "EVT-0106":"Imperial secret weapon revealed and committed",
 "EVT-0107":"Peak imperial battlefield position",
 "EVT-0108":"Empire commits its full armoured reserve forward",
 "EVT-0109":"Imperial armour fixed in an unrecoverable position",
 "EVT-0110":"Both imperial arms committed simultaneously",
 "EVT-0111":"Ground battle decided",
 "EVT-0112":"Imperial sustainment on the front degraded",
 "EVT-0113":"Empire loses its air transport capability on this front",
 "EVT-0114":"Air corps left leaderless before annihilation",
 "EVT-0115":"Air battle decided; 40,000 lost",
 "EVT-0116":"Imperial confidence collapses",
 "EVT-0117":"Empire concedes the Dwargon gate",
 "EVT-0118":"No imperial survivors from the surface phase",
 "EVT-0119":"Empire loses a quarter of its invasion force in one day",
 "EVT-0120":"Allied confidence consolidated",
 "EVT-0201":"Decisive operational error of the campaign",
 "EVT-0202":"Imperial mass advantage neutralised",
 "EVT-0203":"Attrition becomes self-reinforcing",
 "EVT-0204":"Empire's best troops absorbed without effect",
 "EVT-0205":"Empire begins to contemplate defeat",
 "EVT-0206":"Defence becomes indefinitely sustainable",
 "EVT-0207":"Jura front decided",
 "EVT-0208":"No prospect of recovering the losses",
 "EVT-0209":"Tempest's top tier grows markedly stronger",
}
_V1_ORDER = [e[0] for e in v1.EVENTS if e[0] not in ("EVT-0301","EVT-0302","EVT-0303")]

EVENTS = []
for _i, _e in enumerate([e for e in v1.EVENTS if e[0] in _V1_ORDER]):
    _r = list(_e)
    _eid = _r[0]
    _prev = _V1_ORDER[_i-1] if _i > 0 else None
    _next = _V1_ORDER[_i+1] if _i < len(_V1_ORDER)-1 else "EVT-0310"
    EVENTS.append(tuple(
        _r[0:5] + [_THEATER_OF.get(_eid, "TH-DWG")] + _r[6:17] +
        [_STRATEGIC.get(_eid, "UNKNOWN")] + _r[17:31] + [_prev, _next, _r[31]]
    ))

E = EVENTS
def ev(*a):
    assert len(a) == 35, (a[0], len(a))
    E.append(a)

# ---------------- PHASE 3: V14 IMPERIAL CAPITAL (NEW) -----------------------
BC = "Imperial Capital Coup Attempt"
ev("EVT-0310",4,"09:00","several days after Yuuki's report",P3,"TH-CAP","Imperial Capital",BC,"Yuuki's chamber",
   "Yuuki Kagurazaka",EE,"Imperial government",EE,"STRATEGIC_PREPARATION","Clown faction conference convened",
   "Kagali, Laplace, Tia, Footman and Miranda attend; Vega absent",
   "Coup planning formalised against the imperial government","A second, internal front opens inside the Empire",
   None,None,None,None,"Yuuki chairing; Miranda of the Three Greats present","NONE","HIGH",
   "EXPLICIT_RELATIVE","MEDIUM","LOW","HIGH","V14","Prologue/Ch3","V14 Prologue and Ch3 - the clown group meeting",
   "EVT-0209","EVT-0311","Yuuki adjusts strategy after hearing the reports.")
ev("EVT-0311",4,"11:00","-",P3,"TH-CAP","Imperial Capital",BC,"Imperial Capital",
   "Miranda",EE,"Imperial Intelligence Service",EE,"STRATEGIC_PREPARATION","Miranda goes to ground and prepares the coup",
   "Coup preparation conducted covertly while the field army is on expedition",
   "Imperial internal security not yet alerted","Coup timed to the army's absence",
   None,None,None,None,"Miranda operating independently","LOW","HIGH",
   "DAY_LEVEL_CANON","LOW","LOW","HIGH","V14","Ch3","V14 Ch3 - Miranda hidden and busy preparing the coup",
   "EVT-0310","EVT-0312","Desertion would carry a death sentence if detected.")
ev("EVT-0312",4,"21:00","late at night",P3,"TH-CAP","Imperial Capital",BC,"Back streets of the Imperial Capital",
   "Miranda",EE,"Lieutenant Tatsuya Kondo",EE,"MOVEMENT","Miranda moves through the capital's back streets",
   "Movement believed undetected by the Imperial Intelligence Agency",
   "Coup preparation approaches execution","Internal plot reaches its critical night",
   None,None,None,None,"Miranda operating independently","LOW","MEDIUM",
   "DAY_LEVEL_CANON","MEDIUM","LOW","HIGH","V14","Ch3","V14 Ch3 - Miranda walking soundlessly in the darkness",
   "EVT-0311","EVT-0313","She had previously outwitted Dwargon's Ministry of Darkness and Blumund's spies.")
ev("EVT-0313",4,"21:20","-",P3,"TH-CAP","Imperial Capital",BC,"Back streets of the Imperial Capital",
   "Lieutenant Tatsuya Kondo",EE,"Miranda",EE,"INTERCEPTION","Kondo intercepts Miranda in an isolated spot",
   "Miranda cornered; no guards available and no prospect of winning a fight",
   "Coup leadership compromised","Imperial counter-intelligence pre-empts the plot",
   None,None,None,None,"Kondo of the Imperial Intelligence Service","MEDIUM","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V14","Ch3","V14 Ch3 - Kondo blocks Miranda's path",
   "EVT-0312","EVT-0314","Kondo known as the one opponent Miranda could never beat.")
ev("EVT-0314",4,"21:30","-",P3,"TH-CAP","Imperial Capital",BC,"Back streets of the Imperial Capital",
   "Miranda",EE,"Lieutenant Tatsuya Kondo",EE,"SPECIAL_ABILITY","Miranda attempts her charm technique",
   "Perfume spell and fascination illusion applied; Kondo appears to succumb",
   "Miranda believes she has taken control","Her strongest asset is committed and fails",
   None,None,None,None,"Miranda acting","MEDIUM","HIGH",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V14","Ch3","V14 Ch3 - Miranda's charm technique described",
   "EVT-0313","EVT-0315","The same technique had previously worked on Calgurio.")
ev("EVT-0315",4,"21:40","-",P3,"TH-CAP","Imperial Capital",BC,"Back streets of the Imperial Capital",
   "Lieutenant Tatsuya Kondo",EE,"Miranda",EE,"ASSASSINATION","Kondo kills Miranda with a single pistol shot",
   "Miranda shot through the temple with a large Southern-style automatic pistol",
   "Coup leadership eliminated","Yuuki's internal plan compromised",
   None,None,1,0,"Miranda killed","EXTREME","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","HIGH","HIGH","V14","Ch3","V14 Ch3 - the shot through the temple",
   "EVT-0314","EVT-0316","See CAS-011.")
ev("EVT-0316",4,"21:50","not a second was needed",P3,"TH-CAP","Imperial Capital",BC,"Back streets of the Imperial Capital",
   "Lieutenant Tatsuya Kondo",EE,"Yuuki Kagurazaka",EE,"INTELLIGENCE","Kondo extracts Miranda's knowledge with the skill Reader",
   "Miranda's intent, Yuuki's scheme and the end of the expedition all read instantly",
   "Empire obtains full knowledge of the conspiracy","Imperial counter-move becomes possible",
   None,None,None,None,"Kondo","LOW","CRITICAL",
   "EXPLICIT_RELATIVE","MEDIUM","LOW","HIGH","V14","Ch3","V14 Ch3 - the unique skill Reader used on contact",
   "EVT-0315","EVT-0317","")
ev("EVT-0317",5,"09:00","only a few will come tomorrow",P3,"TH-CAP","Imperial Capital",BC,"Yuuki's staff room",
   "Gadra",EE,JTF,JTF,"INTELLIGENCE","Encrypted contact established between Rimuru and Yuuki via Gadra",
   "Contact made through a concealed magic call; intercepted by Imperial Intelligence but not decrypted",
   "Tempest and Yuuki's faction coordinate","Tempest gains an internal foothold in the Empire",
   None,None,None,None,"Gadra relaying","NONE","HIGH",
   "EXPLICIT_RELATIVE","MEDIUM","LOW","HIGH","V14","Ch3","V14 Ch3 - Gadra's encrypted magic call",
   "EVT-0316","EVT-0318","")
ev("EVT-0318",5,"10:00","-",P3,"TH-CAP","Imperial Capital",BC,"Yuuki's staff room",
   "Yuuki Kagurazaka",EE,JTF,JTF,"COMMAND","Assessment that Tempest will send a small elite party",
   "Yuuki estimates at most about ten people; quality over quantity",
   "No mass Tempest deployment expected in the capital","Capital operation to be decided by elite action",
   None,None,None,None,"Yuuki with staff Tolneod, Aria and Olca","NONE","MEDIUM",
   "SEQUENTIAL_CANON","LOW","MEDIUM","HIGH","V14","Ch3","V14 Ch3 - Yuuki's estimate of about ten",
   "EVT-0317","EVT-0319","Large formations would be spotted by the capital's reconnaissance net.")
ev("EVT-0319",5,"12:00","-",P3,"TH-DWE","Dwargon eastern approach","Blockade of the Eastern Metropolis",
   "Eastern metropolis of Dwargon","Hybrid Legion field element",EE,DWG,DWG,"DEPLOYMENT",
   "Sixty thousand blockade the eastern metropolis of Dwargon",
   "Blockade established; camp pitched; morale high",
   "The blockade is camouflage for a secret alliance","A concealed second front prepared against the Empire",
   None,60000,None,None,"Senior officers holding a final battle conference","LOW","CRITICAL",
   "DAY_LEVEL_CANON","LOW","HIGH","HIGH","V14","Ch4","V14 Ch4 - eastern metropolis blockaded by 60,000",
   "EVT-0318","EVT-0320","Both camps had quietly formed an alliance.")
ev("EVT-0320",5,"14:00","on that important day",P3,"TH-DWE","Dwargon eastern approach","Blockade of the Eastern Metropolis",
   "Blockade camp","Hybrid Legion field element",EE,EE,EE,"INTELLIGENCE",
   "Fire observed over the Imperial Capital from the blockade camp",
   "Troops observe a red glow over Tidu; the plan is suspected to have failed",
   "Blockade force loses confidence in the plan","Coordination between the plot and the field force breaks",
   None,60000,None,None,"No authorised commander present","MEDIUM","HIGH",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V14","Ch4","V14 Ch4 - the red glow over the capital observed",
   "EVT-0319","EVT-0321","")
ev("EVT-0321",5,"14:30","-",P3,"TH-DWE","Dwargon eastern approach","Blockade of the Eastern Metropolis",
   "Blockade camp","Hybrid Legion field element",EE,EE,EE,"COMMAND_CHANGE",
   "Command authority collapses in the blockade force",
   "Absence of an authorised officer leaves no one able to give orders; the legion becomes unmanageable",
   "Blockade force paralysed and leaderless","Formation left exposed for the second phase",
   None,60000,None,None,"Command vacuum","HIGH","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V14","Ch4","V14 Ch4 - no one responsible for orders; patchwork legion unmanageable",
   "EVT-0320","EVT-0330","Disagreement over sending scouts versus acting as one body.")

# ---------------- PHASE 3: DRAGON THEATRE (V14 Epilogue) --------------------
BD = "Dragon Engagement over the Great Jura Forest"
ev("EVT-0330",5,"22:00","although it was late at night",P3,"TH-DRG","Jura airspace",BD,"Airspace over the Great Jura Forest",
   "Velgrynd (Scorch Dragon)",EE,"Veldora Tempest (Storm Dragon)",JTF,"ENGAGEMENT",
   "Velgrynd engages Veldora over the Great Jura Forest",
   "Two dragons in combat; the sky bright despite the hour",
   "Strategic-tier engagement opens the second phase","The war escalates beyond conventional forces",
   1,1,None,None,"Velgrynd and Veldora in single combat","EXTREME","CRITICAL",
   "DAY_LEVEL_CANON","MEDIUM","LOW","HIGH","V14","Epilogue","V14 Epilogue - the two dragons in battle at night",
   "EVT-0321","EVT-0331","")
ev("EVT-0331",5,"22:10","-",P3,"TH-DRG","Jura airspace",BD,"Great Jura Forest",
   "Velgrynd (Scorch Dragon)",EE,"Great Jura Forest",JTF,"UNIT_DESTRUCTION",
   "The Great Jura Forest is set ablaze by the engagement",
   "The forest burns; the night sky reflects the flames",
   "Tempest's home theatre suffers major terrain damage","Territorial damage to Tempest without troop losses",
   None,None,None,None,"-","EXTREME","HIGH",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V14","Epilogue","V14 Epilogue - the forest burning with flame",
   "EVT-0330","EVT-0332","")
ev("EVT-0332",5,"22:20","-",P3,"TH-LAB","Ramiris Labyrinth Front",BD,"Labyrinth gate and upper floors",
   "Velgrynd (Scorch Dragon)",EE,"Ramiris Labyrinth",JTF,"UNIT_DESTRUCTION",
   "The gate connecting the labyrinth to the outside world is destroyed",
   "Labyrinth gate destroyed; the upper floors assessed as likely destroyed as well",
   "Labyrinth access severed","Tempest's principal defensive asset partially disabled",
   None,None,None,None,"-","EXTREME","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V14","Epilogue","V14 Epilogue - destruction of the gate; upper floors likely destroyed",
   "EVT-0331","EVT-0333","")
ev("EVT-0333",5,"22:30","-",P3,"TH-LAB","Ramiris Labyrinth Front",BD,"Rimuru city, inside the labyrinth",
   "Ramiris",JTF,"Velgrynd (Scorch Dragon)",EE,"EVACUATION",
   "The capital city Rimuru survives, having been concealed inside the labyrinth",
   "The city takes no damage; on the surface it would have been wiped out",
   "Tempest's civilian centre preserved","Pre-war concealment decision validated",
   None,None,0,None,"Ramiris maintaining the labyrinth","LOW","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V14","Epilogue","V14 Epilogue - the city hidden in the labyrinth took no damage",
   "EVT-0332","EVT-0334","")
ev("EVT-0334",5,"22:40","-",P3,"TH-DRG","Jura airspace",BD,"Airspace over the Great Jura Forest",
   "Velgrynd (Scorch Dragon)",EE,"Veldora Tempest (Storm Dragon)",JTF,"SPECIAL_ABILITY",
   "Velgrynd deploys Parallel Existence",
   "The engagement enters stasis; neither dragon can force a decision",
   "Dragon theatre becomes a fixed attritional stalemate","Both strategic assets pinned against each other",
   1,1,None,None,"Velgrynd and Veldora","EXTREME","HIGH",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V14","Epilogue","V14 Epilogue - Parallel Existence; the fight in stasis",
   "EVT-0333","EVT-0335","")
ev("EVT-0335",5,"22:50","-",P3,"TH-DRG","Jura airspace",BD,"Airspace over the Great Jura Forest",
   "Veldora Tempest",JTF,"Velgrynd (Scorch Dragon)",EE,"ENGAGEMENT",
   "Relative assessment of the two dragons",
   "Veldora holds a slight edge in raw magicule volume and speed; Velgrynd holds the advantage in magic operation",
   "Neither side can convert the duel into a decision","The real fight is judged to be only beginning",
   1,1,None,None,"Veldora and Velgrynd","EXTREME","HIGH",
   "SEQUENTIAL_CANON","MEDIUM","LOW","MEDIUM","V14","Epilogue","V14 Epilogue - comparative assessment of the two dragons",
   "EVT-0334","EVT-0340","Veldora had trained secretly while sealed.")

# ---------------- PHASE 3: V15 DWARGON EASTERN FRONT (NEW) ------------------
BE = "Battle of the Dwargon Eastern Front"
ev("EVT-0340",6,"06:00","at the same time as Rimuru's infiltration",P3,"TH-DWE","Dwargon eastern front",BE,
   "Dwargon eastern battlefield","King Gazel Dwargo",DWG,"Velgrynd (Scorch Dragon)",EE,"DEFENSE",
   "Gazel takes position on a desperate battlefield",
   "Dwargon forces formed up to await Gazel; the situation assessed as unwinnable by conventional means",
   "Dwargon commits to fighting rather than submitting","Dwargon accepts heavy loss to avoid capitulation",
   None,None,None,None,"Gazel commanding; Ben, Dorf and Anrietta present","HIGH","CRITICAL",
   "EXPLICIT_RELATIVE","MEDIUM","LOW","HIGH","V15","Ch1","V15 Ch1 - Gazel on a desperate battlefield",
   "EVT-0335","EVT-0341","Parallel to Rimuru's infiltration of the Imperial Capital.")
ev("EVT-0341",6,"06:20","-",P3,"TH-DWE","Dwargon eastern front",BE,"Dwargon eastern battlefield",
   "Dwargon Supreme Commander",DWG,"Hybrid Legion field element",EE,"INTELLIGENCE",
   "Dwargon witnesses the destruction of the Imperial Hybrid Legion",
   "The Hybrid Legion's end observed from the Dwargon formation; the troops left speechless",
   "The Empire's own formation is consumed on this front","An imperial legion is destroyed by imperial action",
   None,60000,None,None,"Supreme Commander of the Military Ministry reporting","EXTREME","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V15","Ch1","V15 Ch1 - witnessing the end of the Imperial Hybrid Legion",
   "EVT-0340","EVT-0342","")
ev("EVT-0342",6,"06:40","-",P3,"TH-DWE","Dwargon eastern front",BE,"Behind the Scorch Dragon's position",
   "Anrietta",DWG,"Ritual casters",EE,"RECONNAISSANCE",
   "Reconnaissance detects a ritual behind the Scorch Dragon",
   "Multiple beings detected conducting a ritual; Lady Jane assesses grand magic as part of it",
   "The true enemy centre of gravity is identified","Dwargon's target shifts from the dragon to the casters",
   None,None,None,None,"Anrietta reporting to Gazel","MEDIUM","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V15","Ch1","V15 Ch1 - Anrietta's report on the ritual",
   "EVT-0341","EVT-0343","")
ev("EVT-0343",6,"07:00","-",P3,"TH-DWE","Dwargon eastern front",BE,"Behind the Scorch Dragon's position",
   "Ritual casters",EE,"Hybrid Legion field element",EE,"CASUALTY_EVENT",
   "Sixty thousand troops expended as the ritual's sacrifice",
   "The great magic ritual is performed at the cost of 60,000 imperial troops",
   "The Hybrid Legion field element is destroyed by its own side",
   "Empire sacrifices an entire legion for a magical objective",
   None,60000,60000,0,"No imperial field commander accountable","EXTREME","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","HIGH","HIGH","V15","Ch1","V15 Ch1 - great magic performed at the cost of 60,000 troops",
   "EVT-0342","EVT-0344","See CAS-012. Same formation as EVT-0319.")
ev("EVT-0344",6,"07:20","-",P3,"TH-DWE","Dwargon eastern front",BE,"Dwargon eastern battlefield",
   "King Gazel Dwargo",DWG,"Ritual casters",EE,"COMMAND",
   "Gazel decides against committing the heavy assault force",
   "Heavy armed assault force held back: poor mobility would make it a magic target",
   "Dwargon preserves its heavy formation","Only a special attack remains viable",
   None,None,None,None,"Gazel deciding; Dorf's proposal declined","MEDIUM","HIGH",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V15","Ch1","V15 Ch1 - Gazel shakes his head at Dorf's question",
   "EVT-0343","EVT-0345","")
ev("EVT-0345",6,"07:40","-",P3,"TH-DWE","Dwargon eastern front",BE,"Dwargon eastern battlefield",
   "Sky Knights",DWG,"Ritual casters",EE,"ATTACK",
   "Five hundred Sky Knights committed to a special attack",
   "The only remaining course: a special attack by the 500 Sky Knights against the ritual casters",
   "Dwargon reduces its own defensive strength to strike","Dwargon takes the offensive at high risk",
   None,None,None,None,"Gazel commanding; Ben and Dorf concurring","EXTREME","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","HIGH","HIGH","V15","Ch1","V15 Ch1 - the 500 Sky Knights launch a special attack",
   "EVT-0344","EVT-0346","Reducing the defensive force here was acknowledged as a bad idea.")
ev("EVT-0346",6,"08:00","a little late",P3,"TH-DWE","Dwargon eastern front",BE,"Dwargon eastern battlefield",
   "Third Corps (Flying Dragons)",JTF,EE,EE,"REINFORCEMENT",
   "Gabil arrives with the Floor Guardian Colossus",
   "One hundred Flying Dragons airlift the Colossus onto the battlefield by chain",
   "Tempest heavy assault capability arrives at Dwargon","Dwargon is no longer fighting alone",
   3000,None,None,None,"Gabil commanding","MEDIUM","CRITICAL",
   "EXPLICIT_RELATIVE","MEDIUM","HIGH","HIGH","V15","Ch1","V15 Ch1 - Gabil arrives late; the Colossus carried by one hundred",
   "EVT-0345","EVT-0347","The Colossus is slow to move but excellent in close combat.")
ev("EVT-0347",6,"08:20","-",P3,"TH-DWE","Dwargon eastern front",BE,"Dwargon eastern battlefield",
   "Gadra",JTF,"Velgrynd (Scorch Dragon)",EE,"ATTACK",
   "Gadra rides the Colossus and fires it at Velgrynd",
   "Gadra takes position on the Colossus and launches it at Velgrynd",
   "Velgrynd is engaged by a dedicated element","The Scorch Dragon is fixed away from the main battle",
   None,None,None,None,"Gadra acting on his own initiative","EXTREME","HIGH",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V15","Ch1","V15 Ch1 - Gadra fires the Colossus toward Velgrynd",
   "EVT-0346","EVT-0348","Gadra defers to Gazel regarding Kondo.")
ev("EVT-0348",6,"08:30","-",P3,"TH-DWE","Dwargon eastern front",BE,"Dwargon eastern battlefield",
   "Gabil / Dorf",JTF,"Kondo's associates",EE,"COMMAND",
   "Gabil and Dorf agree a joint scheme of manoeuvre",
   "Flying Dragons to lead as the main force with Dorf's troops as reinforcement; command passed to Dorf",
   "Allied command unified on the eastern front","Tempest and Dwargon fight as one formation",
   3000,None,None,None,"Command delegated by Gabil to Dorf","MEDIUM","HIGH",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V15","Ch1","V15 Ch1 - Gabil and Dorf nod to one another",
   "EVT-0347","EVT-0349","Flying Dragons act as a flesh shield, sustained by full-recovery potions.")
ev("EVT-0349",6,"08:40","-",P3,"TH-DWE","Dwargon eastern front",BE,"Dwargon eastern battlefield",
   "Gabil",JTF,"Kondo's associates",EE,"ATTACK",
   "Gabil launches a solo lightning attack",
   "Gabil strikes directly at a group of Kondo's associates, circling behind the enemy force",
   "Enemy rear is turned","Allied attack develops from two directions",
   3000,None,None,None,"Gabil acting ahead of Dorf's order","HIGH","MEDIUM",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V15","Ch1","V15 Ch1 - Gabil attacks and circles to the enemy rear",
   "EVT-0348","EVT-0350","Dorf surprised by the unilateral action.")
ev("EVT-0350",6,"09:00","hardly arrived before the war began",P3,"TH-DWE","Dwargon eastern front",BE,
   "Dwargon eastern battlefield","Kurenai advance force",JTF,EE,EE,"REINFORCEMENT",
   "Gobya's Kurenai advance force reaches the battlefield on foot",
   "Arrived last, having moved overland at A-rank speed; Hakurou advising, Phobio attached",
   "Tempest ground element joins the eastern front","Full allied concentration achieved",
   None,None,None,None,"Gobya leading Kurenai; Hakurou advising","MEDIUM","HIGH",
   "EXPLICIT_RELATIVE","MEDIUM","LOW","HIGH","V15","Ch1","V15 Ch1 - Gobya's force arrives last, Hakurou as advisor",
   "EVT-0349","EVT-0351","Phobio the Panthertooth of Carrion's Three Beastmen present.")
ev("EVT-0351",6,"09:20","arrived at an unstated time",P3,"TH-DWE","Dwargon eastern front",BE,
   "Dwargon eastern battlefield","Ultima's subordinates (Veyron, Zonda)",JTF,EE,EE,"REINFORCEMENT",
   "Veyron and Zonda arrive on the eastern front",
   "Ultima's subordinates join the battlefield","Demon-tier reinforcement added to the eastern front",
   "Allied qualitative superiority increased",None,None,None,None,"Under Ultima","MEDIUM","MEDIUM",
   "SIMULATION_RECONSTRUCTED","LOW","LOW","MEDIUM","V15","Ch1","V15 Ch1 - Ultima's forces Veyron and Zonda arrive",
   "EVT-0350","EVT-0360","Arrival time explicitly unstated in the source.")

# ---------------- PHASE 3: V15 CAPITAL / RIMURU (NEW) -----------------------
BF = "Imperial Capital Confrontation"
ev("EVT-0360",6,"09:00","-",P3,"TH-CAP","Imperial Capital",BF,"Imperial Capital",
   "Rimuru Tempest",JTF,EE,EE,"MOVEMENT","Rimuru infiltrates the Imperial Capital",
   "Rimuru's party enters the capital with a small elite escort",
   "Tempest command element operating inside the Empire","Decision sought at the imperial centre",
   None,None,None,None,"Rimuru leading personally","MEDIUM","CRITICAL",
   "EXPLICIT_RELATIVE","MEDIUM","LOW","HIGH","V15","Ch1","V15 Ch1 - Rimuru preparing to infiltrate the Imperial Capital",
   "EVT-0351","EVT-0361","Concurrent with Gazel's battle. Parallel theatre.")
ev("EVT-0361",6,"10:00","-",P3,"TH-CAP","Imperial Capital",BF,"Sealed space, Imperial Capital",
   EE,EE,"Rimuru Tempest",JTF,"ENCIRCLEMENT","Rimuru's party isolated into a sealed space",
   "The party is confined; forcible exit considered",
   "Tempest command element trapped and cut off","Tempest leadership neutralised at the critical moment",
   None,None,None,None,"Benimaru with Rimuru","EXTREME","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V15","Ch2","V15 Ch2 - the party isolated into a special space",
   "EVT-0360","EVT-0362","Raphael also thrown into confusion.")
ev("EVT-0362",6,"10:20","-",P3,"TH-CAP","Imperial Capital",BF,"Sealed space, Imperial Capital",
   EE,EE,"Shion and others",JTF,"CASUALTY_EVENT","Shion and others are killed",
   "Tempest personnel killed inside the sealed space",
   "First confirmed Tempest deaths of the campaign","Tempest suffers its first losses of the war",
   None,None,None,None,"Rimuru losing composure","EXTREME","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V15","Ch2","V15 Ch2 - the killing of Shion and the others",
   "EVT-0361","EVT-0363","Number not stated. See CAS-013 and AMB-010.")
ev("EVT-0363",6,"10:40","-",P3,"TH-CAP","Imperial Capital",BF,"Sealed space, Imperial Capital",
   EE,EE,"Veldora Tempest",JTF,"COMMAND","Imperial objective identified as the capture of Veldora",
   "The enemy aim is established as capturing Veldora, with measures taken to prevent interference",
   "Tempest understands the true imperial objective","The war's objective is revealed as the Storm Dragon",
   None,None,None,None,"Rimuru and Benimaru","HIGH","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V15","Ch2","V15 Ch2 - the enemy's goal is to capture Veldora",
   "EVT-0362","EVT-0370","")

# ---------------- PHASE 3: V15 WARCRAFT LEGION AIR MOVEMENT (NEW) ----------
BG = "Warcraft Legion Air Movement"
ev("EVT-0370",6,"11:00","-",P3,"TH-CAP","Strategic air movement",BG,"Airspace over northern Ingracia",
   "Airship transport flotilla",EE,JTF,JTF,"MOVEMENT",
   "Three hundred airships fly the Warcraft Legion toward the central continent",
   "Samuel commands 300 airships carrying 30,000 Warcraft Legion under Grand Admiral Gladim",
   "Empire's elite legion redeployed by air","A fresh imperial elite formation enters the war",
   None,30000,None,None,"Samuel commanding transport; Gladim commanding troops","LOW","CRITICAL",
   "SEQUENTIAL_CANON","LOW","HIGH","HIGH","V15","Ch3","V15 Ch3 - Samuel leads 300 airships with 30,000 Warcraft Legion",
   "EVT-0363","EVT-0371","Air route chosen as safer than the sea route.")
ev("EVT-0371",6,"11:20","-",P3,"TH-CAP","Strategic air movement",BG,"Aboard Samuel's flagship",
   "Velgrynd (Scorch Dragon)",EE,JTF,JTF,"INTELLIGENCE","Velgrynd revealed aboard as the Marshal",
   "A very noble presence aboard, unknown even to Calgurio; identified as Velgrynd in the role of Marshal",
   "Imperial command structure revealed as fronted by a True Dragon",
   "The Empire's guardian dragon is directing operations",
   None,None,None,None,"Velgrynd as Marshal; Samuel and Gladim subordinate","MEDIUM","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V15","Ch3","V15 Ch3 - the noble presence aboard; Velgrynd as Marshal",
   "EVT-0370","EVT-0372","Gladim, on a different warship, could not sense her dominance through the screen.")
ev("EVT-0372",6,"11:40","-",P3,"TH-CAP","Strategic air movement",BG,"Aboard Samuel's flagship",
   "Velgrynd (Scorch Dragon)",EE,"Grand Admiral Gladim",EE,"COMMAND","Velgrynd issues orders to Gladim by screen",
   "Gladim ordered to fight on the Emperor's authority; Gladim boastful, Samuel nervous",
   "Warcraft Legion committed on imperial order","Gladim's ambitions tied to the operation",
   None,30000,None,None,"Velgrynd commanding; Gladim complying","LOW","HIGH",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V15","Ch3","V15 Ch3 - Velgrynd contacts Gladim's ship and gives orders",
   "EVT-0371","EVT-0373","Gladim expected Calgurio's and Yuuki's discredit to leave him pre-eminent.")
ev("EVT-0373",6,"12:00","-",P3,"TH-CAP","Strategic air movement",BG,"Airspace over northern Ingracia",
   "Velgrynd (Scorch Dragon)",EE,JTF,JTF,"SPECIAL_ABILITY","Velgrynd opens a space-time connection to move the fleet",
   "Velgrynd flies out of the bridge door and opens a large spatial distortion; Space Domination shields the ship",
   "The airborne legion is repositioned instantaneously",
   "Imperial strategic mobility becomes effectively unlimited",
   None,30000,None,None,"Velgrynd acting; Samuel alarmed","EXTREME","CRITICAL",
   "SEQUENTIAL_CANON","MEDIUM","LOW","HIGH","V15","Ch3","V15 Ch3 - time, space, connection; the spatial distortion opens",
   "EVT-0372","EVT-0380","Destination not stated. See MOV-015 and AMB-009.")

# ---------------- PHASE 4: TERMINATION (V15 Ch4-5, Epilogue) ---------------
ev("EVT-0380",7,"08:00","-",P4,"TH-CAP","Imperial Capital","Eight Gates","Imperial Capital",
   "Diablo",JTF,EE,EE,"COMMAND","Diablo deliberately withholds himself from the battle",
   "Diablo stays close to Rimuru rather than fighting, judging only Velgrynd would offer a real contest",
   "Tempest's strongest reserve held uncommitted","Growth of Benimaru and others prioritised over quick victory",
   None,None,None,None,"Diablo acting on his own judgement","LOW","MEDIUM",
   "SEQUENTIAL_CANON","LOW","LOW","MEDIUM","V15","Ch4","V15 Ch4 - Diablo's reason for not joining the war",
   "EVT-0373","EVT-0381","")
ev("EVT-0381",7,"10:00","-",P4,"TH-CAP","Imperial Capital","Eight Gates","Imperial Capital",
   "Rimuru Tempest",JTF,"Emperor Rudra",EE,"INTELLIGENCE","The truth of the Emperor is established",
   "The nature of the imperial throne is uncovered","Imperial legitimacy is called into question",
   "Basis for a negotiated settlement created",None,None,None,None,"Rimuru","HIGH","CRITICAL",
   "SEQUENTIAL_CANON","LOW","LOW","MEDIUM","V15","Ch5","V15 Ch5 - The Truth of the Emperor",
   "EVT-0380","EVT-0382","Chapter-level. Further breakdown deferred. See AMB-008.")
ev("EVT-0382",7,"12:00","-",P4,"TH-CAP","Imperial theatre","-","Imperial theatre",
   "Testarossa",JTF,EE,EE,"ENGAGEMENT","Testarossa secures a decisive tactical victory",
   "The engagement ends in a clear victory for Testarossa","Imperial resistance in her sector ends",
   "Tempest holds the field in the imperial theatre",1,None,None,None,"Testarossa","EXTREME","HIGH",
   "SEQUENTIAL_CANON","LOW","LOW","MEDIUM","V15","Epilogue","V15 Epilogue - a decisive victory for Testarossa",
   "EVT-0381","EVT-0383","")
ev("EVT-0383",7,"13:00","-",P4,"TH-CAP","Imperial theatre","-","Imperial theatre",
   "Adalman",JTF,EE,EE,"AFTERMATH","The undead taboo spell lapses",
   "The taboo spell sustaining the undead is assessed as long since ended",
   "Undead formations stand down","Labyrinth attrition mechanism concludes",
   None,None,None,None,"-","LOW","MEDIUM",
   "SEQUENTIAL_CANON","LOW","LOW","MEDIUM","V15","Epilogue","V15 Epilogue - the undead taboo spell has ended",
   "EVT-0382","EVT-0384","")
ev("EVT-0384",7,"14:00","-",P4,"TH-CAP","Imperial theatre","-","Imperial theatre",
   EE,EE,JTF,JTF,"NEGOTIATION","The Empire proposes an armistice",
   "An armistice is raised once the imperial position becomes untenable",
   "Active hostilities move toward suspension","The Tempest-Eastern Empire War ends",
   None,None,None,None,"Imperial representatives","NONE","CRITICAL",
   "SEQUENTIAL_CANON","LOW","LOW","MEDIUM","V15","Epilogue","V15 Epilogue - an armistice is raised",
   "EVT-0383","EVT-0385","")
ev("EVT-0385",7,"15:00","-",P4,"TH-CAP","Imperial theatre","-","Imperial theatre",
   "Diablo",JTF,EE,EE,"AFTERMATH","Care instructions issued and the field cleared",
   "The fighting concludes and instructions are given for the care of the wounded; Diablo reaches the ship",
   "Battlefield administration begins","Transition from combat to settlement",
   None,None,None,None,"Diablo","LOW","MEDIUM",
   "SEQUENTIAL_CANON","LOW","LOW","MEDIUM","V15","Epilogue","V15 Epilogue - the work here has ended; care instructions given",
   "EVT-0384","EVT-0390","")

# ---------------- PHASE 5: POST-WAR SETTLEMENT (V16, NEW) ------------------
ev("EVT-0390",7,"18:00","-",P5,"TH-DIP","Settlement","-","Tempest",
   "Rimuru Tempest",JTF,EE,EE,"POLITICAL","Summit convened between Tempest and the Empire",
   "Rimuru attends with Benimaru, Rigurd, Shion, Diablo and Testarossa; the Empire brings Masayuki, Velgrynd, Caligulio, Minitz, Bernie and Jiwu",
   "Two heads of state meet","Formal settlement process begins",
   None,None,None,None,"Rimuru and Masayuki as principals","NONE","CRITICAL",
   "SEQUENTIAL_CANON","LOW","LOW","HIGH","V16","Ch3","V16 Ch3 - the summit attendee list",
   "EVT-0385","EVT-0391","Caligulio and Minitz are the surviving imperial commanders (Calgurio, Minute).")
ev("EVT-0391",7,"18:20","-",P5,"TH-DIP","Settlement","-","Tempest",
   EE,EE,JTF,JTF,"NEGOTIATION","The Empire seeks an end-of-hostilities treaty and a new pact",
   "The Empire requests a treaty closing hostilities and ratification of a pact on future direction",
   "War formally terminated by agreement","Alliance framework replaces the war",
   None,None,None,None,"Imperial delegation","NONE","CRITICAL",
   "SEQUENTIAL_CANON","LOW","LOW","HIGH","V16","Ch3","V16 Ch3 - the Empire wishes to forge an end-of-hostilities agreement",
   "EVT-0390","EVT-0392","")
ev("EVT-0392",7,"18:40","-",P5,"TH-DIP","Settlement","-","Tempest",
   EE,EE,EE,EE,"AFTERMATH","The Empire declares its loss of war power",
   "The Empire states it has lost more than two-thirds of its war power",
   "Imperial military capability assessed as broken","Empire cannot resume the war",
   None,None,None,None,"Imperial delegation","NONE","CRITICAL",
   "SEQUENTIAL_CANON","LOW","HIGH","HIGH","V16","Ch3","V16 Ch3 - more than two-thirds of war power lost",
   "EVT-0391","EVT-0393","Cross-check: 770,000 + 60,000 against a ~1,000,000 deployable pool.")
ev("EVT-0393",7,"19:00","-",P5,"TH-DIP","Settlement","-","Tempest",
   JTF,JTF,EE,EE,"POLITICAL","No war-crimes prosecution of imperial higher-ups",
   "Tempest declines to pursue the imperial leadership for war crimes",
   "Imperial command cadre preserved","Continuity of imperial administration secured",
   None,None,None,None,"Rimuru","NONE","HIGH",
   "SEQUENTIAL_CANON","LOW","LOW","HIGH","V16","Ch3","V16 Ch3 - not pursuing the imperial higher-ups for war crimes",
   "EVT-0392","EVT-0394","")
ev("EVT-0394",7,"19:20","-",P5,"TH-DIP","Settlement","-","Tempest",
   "Velgrynd",EE,EE,EE,"COMMAND_CHANGE","Masayuki installed as the new emperor",
   "Under imperial court law, the person named by Velgrynd, protector dragon of the Empire, becomes emperor",
   "Imperial succession resolved","Tempest backs the new emperor and the Empire's rebuilding",
   None,None,None,None,"Velgrynd naming; Masayuki acceding","NONE","CRITICAL",
   "SEQUENTIAL_CANON","LOW","LOW","HIGH","V16","Ch3","V16 Ch3 - imperial court law on the person named by Velgrynd",
   "EVT-0393","EVT-0395","Framed not as an alliance of equals but as Tempest backing the new emperor.")
ev("EVT-0395",7,"19:40","-",P5,"TH-DIP","Settlement","-","Tempest",
   JTF,JTF,EE,EE,"CAPTURE","Captured imperial forces repatriated",
   "Prisoners returned to the Empire; some wished to remain but were sent home first to help stabilise it",
   "Prisoner question settled","Imperial manpower partially restored",
   None,None,None,None,"Tempest administration","NONE","HIGH",
   "SEQUENTIAL_CANON","LOW","LOW","HIGH","V16","Ch3","V16 Ch3 - captured imperial forces returned to the Empire",
   "EVT-0394","EVT-0396","Immigration permitted after repatriation. See CAS-014.")
ev("EVT-0396",7,"20:00","-",P5,"TH-DIP","Settlement","-","Imperial Capital",
   "Testarossa",JTF,EE,EE,"DEPLOYMENT","Testarossa despatched to establish an embassy in the Empire",
   "Embassy to be established with a mission to sweep away the Empire's old lines of thought",
   "Permanent Tempest presence in the Empire","Long-term political influence secured",
   1,None,None,None,"Testarossa as ambassador","NONE","HIGH",
   "SEQUENTIAL_CANON","LOW","LOW","HIGH","V16","Ch3","V16 Ch3 - Testarossa sent to establish an embassy",
   "EVT-0395","EVT-0397","")
ev("EVT-0397",7,"20:20","-",P5,"TH-DIP","Settlement","-","Eastern Empire",
   "Veldora Tempest",JTF,"Imperial population",EE,"AFTERMATH","Imperial citizens left without memory of the defeat",
   "The Empire's citizens have no memory of losing a war, Veldora having acted upon them",
   "Domestic imperial stability preserved","Risk of revanchist sentiment removed",
   None,None,None,None,"Veldora","NONE","HIGH",
   "SEQUENTIAL_CANON","LOW","LOW","HIGH","V16","Ch3","V16 Ch3 - the Empire's citizens had no memory of losing a war",
   "EVT-0396","EVT-0398","")
ev("EVT-0398",7,"20:40","-",P5,"TH-DIP","Settlement","-","Between Tempest and the Empire",
   JTF,JTF,EE,EE,"AFTERMATH","Reconstruction programme agreed",
   "Highways and nearby buildings repaired; a rail line toward the imperial capital planned along the Magitank route",
   "Physical reconstruction begins","Economic integration of the two states starts",
   None,None,None,None,"Joint administration","NONE","HIGH",
   "SEQUENTIAL_CANON","LOW","LOW","HIGH","V16","Ch3","V16 Ch3 - highways repaired; train line toward the imperial capital planned",
   "EVT-0397","EVT-0399","")
ev("EVT-0399",7,"21:00","-",P5,"TH-DIP","Settlement","-","Tempest",
   JTF,JTF,EE,EE,"AFTERMATH","Imperial flagship dead restored",
   "Men killed aboard the imperial flagship are recorded as having died once and returned",
   "A portion of imperial losses reversed","Selected imperial personnel recovered",
   None,None,None,None,"-","NONE","MEDIUM",
   "SEQUENTIAL_CANON","LOW","LOW","MEDIUM","V16","Ch3","V16 Ch3 - these men had died once, aboard the imperial flagship",
   "EVT-0398",None,"Number not stated. Does not offset the 770,000 campaign total.")

# ============================================================================
# MOVEMENT DATABASE
# ============================================================================
MOVEMENTS = [
 ("MOV-001","F-EMP-010","Eastern Empire","Great Jura Forest / Dwargon approach","EVT-0003","EVT-0101",
  "ADVANCE","SIMULATION_RECONSTRUCTED","MEDIUM","About twenty-nine days of march; no route detail in source."),
 ("MOV-002","F-TEM-001","Tempest","Dwargon outer gate","EVT-0004","EVT-0006",
  "DEPLOYMENT","SIMULATION_RECONSTRUCTED","HIGH","Concentration at the gate."),
 ("MOV-003","F-TEM-001","Green Legion start line","Imperial chariot line","EVT-0102","EVT-0103",
  "BREAKTHROUGH","EXPLICIT_RELATIVE","HIGH","About 100 m in under six seconds."),
 ("MOV-004","F-EMP-012","Chariot line","Linked fortress position","EVT-0107","EVT-0108",
  "ENCIRCLEMENT","SIMULATION_RECONSTRUCTED","HIGH","Nearly 1,000 chariots interlink."),
 ("MOV-005","F-TEM-001","Encircled position","Feigned withdrawal line","EVT-0109","EVT-0111",
  "RETREAT","SIMULATION_RECONSTRUCTED","HIGH","Feigned; not an actual withdrawal."),
 ("MOV-006","F-EMP-012","Dwargon Gate Front","Attempted rally point","EVT-0117","EVT-0118",
  "WITHDRAWAL","SIMULATION_RECONSTRUCTED","HIGH","Route closed by Testarossa; withdrawal never completed."),
 ("MOV-007","F-EMP-011","Great Jura Forest","Ramiris Labyrinth interior","EVT-0201","EVT-0202",
  "ADVANCE","DAY_LEVEL_CANON","HIGH","700,000 committed underground."),
 ("MOV-008","F-EMP-031","Eastern Empire","Dwargon eastern metropolis","EVT-0318","EVT-0319",
  "DEPLOYMENT","SIMULATION_RECONSTRUCTED","MEDIUM","Blockade position; camouflage for an alliance."),
 ("MOV-009","F-EMP-070","Imperial theatre","Airspace over the Great Jura Forest","EVT-0321","EVT-0330",
  "REPOSITION","SIMULATION_RECONSTRUCTED","LOW","Arrival route and timing not stated."),
 ("MOV-010","F-TEM-011","Ramiris Labyrinth","Dwargon eastern front","EVT-0335","EVT-0346",
  "REINFORCEMENT","SIMULATION_RECONSTRUCTED","HIGH","Airlifted by chain beneath 100 Flying Dragons."),
 ("MOV-011","F-TEM-003","Dwargon Gate Front","Dwargon eastern front","EVT-0335","EVT-0346",
  "REINFORCEMENT","SIMULATION_RECONSTRUCTED","HIGH","Arrived 'a little late'."),
 ("MOV-012","F-TEM-012","Tempest","Dwargon eastern front","EVT-0340","EVT-0350",
  "REINFORCEMENT","EXPLICIT_RELATIVE","MEDIUM","Overland at A-rank speed; arrived last."),
 ("MOV-013","F-DWA-002","Dwargon defensive line","Ritual caster position","EVT-0345","EVT-0345",
  "ADVANCE","SIMULATION_RECONSTRUCTED","HIGH","Special attack; reduced the defensive line."),
 ("MOV-014","F-EMP-020","Eastern Empire","Central continent (via northern Ingracia)","EVT-0370","EVT-0373",
  "IN_TRANSIT","SEQUENTIAL_CANON","MEDIUM","300 airships; terminated by a space-time jump."),
 ("MOV-015","F-EMP-060","Airspace over northern Ingracia","UNKNOWN","EVT-0373","EVT-0373",
  "IN_TRANSIT","SIMULATION_RECONSTRUCTED","LOW","Space-time connection; destination not stated. No route may be inferred."),
 ("MOV-016","F-TEM-000","Tempest","Imperial Capital","EVT-0351","EVT-0360",
  "IN_TRANSIT","SIMULATION_RECONSTRUCTED","MEDIUM","Rimuru's infiltration party; route not stated."),
 ("MOV-017","F-DEM-001","Imperial theatre","Embassy in the Empire","EVT-0396","EVT-0396",
  "DEPLOYMENT","SEQUENTIAL_CANON","HIGH","Post-war posting."),
]

# ============================================================================
# MAJOR COMBATANT TRACKING
# ============================================================================
COMBATANTS = [
 ("ACT-001","Rimuru Tempest",JTF,"EVT-0004","EVT-0398","ACTIVE","Head of state; aerial reconnaissance; infiltration of the Imperial Capital; settlement","V12-V16"),
 ("ACT-002","Benimaru",JTF,"EVT-0004","EVT-0390","ACTIVE","Supreme General; directed the double feigned defeat; present at the sealed space and the summit","V12-V16"),
 ("ACT-003","Gobta",JTF,"EVT-0006","EVT-0119","ACTIVE","First Corps; wolf-rider charge; Blizzard Wolf Dance","V12-V13"),
 ("ACT-004","Gabil",JTF,"EVT-0006","EVT-0349","ACTIVE","Third Corps; airship boarding actions; Colossus airlift; solo attack on the eastern front","V12-V15"),
 ("ACT-005","Veldora Tempest",JTF,"EVT-0115","EVT-0397","ACTIVE","Flame of Destruction; duel with Velgrynd; erasure of the defeat from imperial memory","V13-V16"),
 ("ACT-006","Testarossa",JTF,"EVT-0005","EVT-0396","ACTIVE","Envoy; closed the imperial retreat; decisive victory; ambassador to the Empire","V13-V16"),
 ("ACT-007","Ultima",JTF,"EVT-0114","EVT-0351","ACTIVE","Engaged Faraga's flagship; despatched Veyron and Zonda","V13-V15"),
 ("ACT-008","Adalman",JTF,"EVT-0203","EVT-0383","ACTIVE","Labyrinth attrition; Floor 70 defence; the undead taboo spell","V13-V15"),
 ("ACT-009","Ramiris",JTF,"EVT-0202","EVT-0333","ACTIVE","Labyrinth structure, severing and revival; preserved the capital city","V13-V14"),
 ("ACT-010","Diablo",JTF,"EVT-0380","EVT-0390","ACTIVE","Withheld from battle by choice; battlefield administration; summit attendee","V15-V16"),
 ("ACT-011","Shion",JTF,"EVT-0362","EVT-0390","KILLED, LATER PRESENT AT SUMMIT","Killed in the sealed space; present at the V16 summit","V15-V16"),
 ("ACT-012","Gobya",JTF,"EVT-0350","EVT-0350","ACTIVE","Led the Kurenai advance force onto the eastern front","V15"),
 ("ACT-013","Hakurou",JTF,"EVT-0350","EVT-0350","ACTIVE","Advisor to the Kurenai advance force","V15"),
 ("ACT-014","Gadra",JTF,"EVT-0317","EVT-0347","DEFECTED TO TEMPEST","Relayed encrypted contact; rode and fired the Floor Guardian Colossus at Velgrynd","V14-V15"),
 ("ACT-015","Phobio the Panthertooth","Beast Kingdom Eurazania","EVT-0350","EVT-0350","ACTIVE","Attached to Gobya's force on the eastern front","V15"),
 ("ACT-020","King Gazel Dwargo",DWG,"EVT-0007","EVT-0345","ACTIVE","Fortified the gate; assessed the campaign; committed the Sky Knights","V13-V15"),
 ("ACT-021","Dorf",DWG,"EVT-0344","EVT-0348","ACTIVE","Heavy assault force; took joint command with Gabil","V15"),
 ("ACT-022","Ben",DWG,"EVT-0340","EVT-0345","ACTIVE","Counsel to Gazel on the eastern front","V15"),
 ("ACT-023","Anrietta",DWG,"EVT-0342","EVT-0342","ACTIVE","Detected the ritual behind the Scorch Dragon","V15"),
 ("ACT-030","Emperor Rudra Nam Ul Nasca",EE,"EVT-0001","EVT-0381","SUPERSEDED","Ordered mobilisation; the truth of the throne uncovered","V12-V15"),
 ("ACT-031","Marshal Calgurio / Caligulio",EE,"EVT-0201","EVT-0390","SURVIVED","Supreme field command; confronted operational failure; imperial summit delegate","V13-V16"),
 ("ACT-032","Lieutenant General Geist",EE,"EVT-0101","EVT-0119","KILLED","Chariot fortress; ordered the withdrawal; lost with his division","V13"),
 ("ACT-033","Major General Faraga",EE,"EVT-0106","EVT-0115","KILLED","Deployed the Mana Disruptor Radiation; lost with the air corps","V13"),
 ("ACT-034","Major General Minute / Minitz",EE,"EVT-0001","EVT-0390","SURVIVED","Named commander; imperial summit delegate","V12-V16"),
 ("ACT-035","Grand Admiral Gladim",EE,"EVT-0370","EVT-0372","ACTIVE","Commanded the 30,000 Warcraft Legion; ambitions for pre-eminence","V12-V15"),
 ("ACT-036","Lieutenant Tatsuya Kondo",EE,"EVT-0313","EVT-0348","ACTIVE","Intercepted and killed Miranda; used the skill Reader; ritual on the eastern front","V14-V15"),
 ("ACT-037","Miranda",EE,"EVT-0310","EVT-0315","KILLED","Coup preparation in the Imperial Capital; killed by Kondo","V14"),
 ("ACT-038","Yuuki Kagurazaka",EE,"EVT-0310","EVT-0318","ACTIVE","Hybrid Legion; led the coup conspiracy; coordinated with Tempest via Gadra","V12-V15"),
 ("ACT-039","Velgrynd (Scorch Dragon)",EE,"EVT-0330","EVT-0394","SURVIVED","Duel with Veldora; destroyed the labyrinth gate; Marshal aboard the flotilla; named the new emperor","V14-V16"),
 ("ACT-040","Samuel",EE,"EVT-0370","EVT-0373","ACTIVE","Commanded the 300-airship transport flotilla","V15"),
 ("ACT-041","Masayuki",EE,"EVT-0390","EVT-0394","NEW EMPEROR","Imperial principal at the summit; installed as emperor by Velgrynd","V16"),
]

# ============================================================================
# CASUALTIES = v1 rows (extended with SCOPE / AGGREGATE_OF / DERIVATION) + new
# ============================================================================
# v2 schema: ID, EVENT_ID, FACTION, FORMATION, FORCE_ID, RAW, TYPE, BEST, MIN,
#            MAX, WIA, POW, LOCATION, REL_TIME, SCOPE, AGGREGATE_OF,
#            DERIVATION, BASIS, SOURCE, CONF, NOTES
_CAS_META = {  # v1 id -> (scope, aggregate_of, derivation, note override or None)
 "CAS-001":("EVENT_CASUALTY","-","DIRECTLY_STATED",None),
 "CAS-002":("EVENT_CASUALTY","-","DIRECTLY_STATED",None),
 "CAS-003":("AGGREGATE_CASUALTY","CAS-001 + CAS-002","ROLL_UP",
            "EXCLUDED from campaign totals to avoid double counting."),
 "CAS-004":("EVENT_CASUALTY","-","DIRECTLY_STATED",None),
 "CAS-005":("EVENT_CASUALTY","-","COMPONENT_OF_CAS-004",
            "EXCLUDED from campaign totals: subsumed within CAS-004."),
 "CAS-006":("CAMPAIGN_TOTAL","CAS-001 + CAS-002 + CAS-004","ROLL_UP",
            "EXCLUDED from arithmetic totals; used as a cross-check. 240,000 + 530,000 = 770,000."),
 "CAS-007":("EVENT_CASUALTY","-","DIRECTLY_STATED",None),
 "CAS-008":("EVENT_CASUALTY","-","DIRECTLY_STATED",
            "Explicit zero POW for the SURFACE PHASE ONLY. Later phases produced prisoners (CAS-014)."),
 "CAS-009":("UNKNOWN","-","NOT_STATED",None),
 "CAS-010":("UNKNOWN","-","NOT_STATED",None),
}
CASUALTIES = []
for _c in v1.CASUALTIES:
    _r = list(_c)
    _scope, _agg, _der, _note = _CAS_META[_r[0]]
    CASUALTIES.append(tuple(
        _r[0:14] + [_scope, _agg, _der] + _r[14:17] + [_note or _r[17]]
    ))
CASUALTIES += [
 ("CAS-011","EVT-0315",EE,"Clown faction (Miranda)","F-EMP-050",
  "one named individual killed by a single shot","KIA",1,1,1,0,0,
  "Imperial Capital","T+04:21:40","EVENT_CASUALTY","-","DIRECTLY_STATED","CANONICAL","V14 Ch3","HIGH",
  "Individual casualty. Not part of the field-army totals."),
 ("CAS-012","EVT-0343",EE,"Hybrid Legion field element","F-EMP-031",
  "60,000 troops expended as the ritual's sacrifice","KIA",60000,60000,60000,None,0,
  "Dwargon eastern front","T+06:07:00","EVENT_CASUALTY","-","DIRECTLY_STATED","CANONICAL","V15 Ch1","HIGH",
  "Inflicted by the Empire on its own formation. Separate from the 940,000 Jura invasion force. See AMB-011."),
 ("CAS-013","EVT-0362",JTF,"Rimuru's escort party","F-TEM-000",
  "Shion and others killed","KIA",None,1,None,None,0,
  "Sealed space, Imperial Capital","T+06:10:20","EVENT_CASUALTY","-","NUMBER_NOT_STATED","CANONICAL","V15 Ch2","MEDIUM",
  "First Tempest deaths of the campaign. Count not stated; minimum one. See AMB-010."),
 ("CAS-014","EVT-0395",EE,"Captured imperial forces","F-EMP-010",
  "captured imperial forces returned to the Empire","POW",None,1,None,None,None,
  "Tempest","T+07:19:40","EVENT_CASUALTY","-","NUMBER_NOT_STATED","CANONICAL","V16 Ch3","HIGH",
  "Confirms prisoners existed in the later phases, unlike the surface phase. See AMB-012."),
 ("CAS-015","EVT-0399",EE,"Imperial flagship personnel","F-EMP-010",
  "men who had died once, aboard the imperial flagship","OTHER_LOSS_REVERSED",None,1,None,None,None,
  "Imperial flagship","T+07:21:00","EVENT_CASUALTY","-","NUMBER_NOT_STATED","CANONICAL","V16 Ch3","MEDIUM",
  "Losses reversed. Does not offset the 770,000 campaign total."),
 ("CAS-016","EVT-0392",EE,"Imperial war power (qualitative)","F-EMP-001",
  "more than two-thirds of our war power","OTHER_LOSS",None,None,None,None,None,
  "Eastern Empire","T+07:18:40","CAMPAIGN_TOTAL","-","QUALITATIVE_STATEMENT","CANONICAL","V16 Ch3","HIGH",
  "Qualitative. Cross-check: 770,000 + 60,000 = 830,000 against a ~1,000,000 deployable pool."),
]

# ============================================================================
# AMBIGUITIES = v1 (AMB-001..005, 007 preserved; 006 rewritten) + new
# ============================================================================
AMBIGUITIES = [a for a in v1.AMBIGUITIES if a[0] not in ("AMB-006",)]
AMBIGUITIES += [
 ("AMB-006","Elapsed time between the Jura phase and the second phase","EVT-0209 to EVT-0310",
  "The corpus does not state how long passes between the destruction of the invasion army and the Imperial Capital events of V14. (This entry supersedes the v1 AMB-006, which recorded the V14-V16 coverage gap that this revision has closed.)",
  "Modelled as a same-day continuation at D+4 to keep the grid continuous. This is the weakest temporal join in the dataset.","LOW"),
 ("AMB-008","V15 Chapters 4 and 5 internal structure","EVT-0380 to EVT-0381",
  "Eight Gates and The Truth of the Emperor concern the nature of the imperial throne and skill-level conflict rather than force-on-force battle. Little of it maps onto conventional battlefield state.",
  "Recorded as chapter-level events at MEDIUM/LOW confidence. Further atomic breakdown would require modelling non-military developments.","MEDIUM"),
 ("AMB-009","Destination of the Warcraft Legion after the space-time jump","EVT-0373, MOV-015",
  "Velgrynd opens a space-time connection to move the flotilla; the destination is not stated in the extracted passage.",
  "MOV-015 records the jump with destination UNKNOWN. No route or arrival point is inferred.","HIGH"),
 ("AMB-010","Tempest casualties in the sealed space","EVT-0362, CAS-013",
  "Shion 'and others' are killed; no count is given. Shion appears alive at the V16 summit.",
  "Recorded as minimum one, best estimate UNKNOWN. Not converted to a number, and not offset against the later appearance.","MEDIUM"),
 ("AMB-011","Whether the 60,000 ritual sacrifice is part of the 940,000","F-EMP-031, CAS-012",
  "The Hybrid Legion is a separate legion from the Jura invasion force in V12 Ch4, and the 60,000 blockade the eastern metropolis rather than the Jura front.",
  "Treated as SEPARATE from the 940,000. Campaign totals report the two figures distinctly.","MEDIUM"),
 ("AMB-012","Number of imperial prisoners repatriated","EVT-0395, CAS-014",
  "V16 Ch3 confirms captured imperial forces were returned but gives no figure. This differs in kind, not in fact, from the surface phase where no prisoners were taken.",
  "CAS-008 scoped explicitly to the surface phase; CAS-014 records later-phase prisoners as UNKNOWN.","MEDIUM"),
 ("AMB-013","V16 scope boundary","V16 Prologue, Ch1, Ch2",
  "Most of V16 concerns the Feldway and Michael conflict, which is a separate later war rather than part of the Tempest-Eastern Empire War.",
  "Only V16 Ch3 (post-war settlement and rebuilding) is extracted. The later conflict is deliberately excluded per scope.","HIGH"),
]
