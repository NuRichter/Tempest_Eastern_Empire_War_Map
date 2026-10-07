# -*- coding: utf-8 -*-
"""FINAL builder. Produces the full-campaign 10-minute keyframe grid,
temporal force states, and the production workbook."""
import datetime as dt
from collections import defaultdict
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
import dataset_lock as D

FPD = 144
FIRST_DAY = D.CAMPAIGN_FIRST_DAY
NFRAMES = D.CAMPAIGN_DAYS * FPD
C0 = dt.date(*D.CAMPAIGN_START_DATE)          # calendar date of campaign day 0

def fidx(day, hhmm):
    h, m = map(int, hhmm.split(":"))
    return (day - FIRST_DAY) * FPD + h * 6 + m // 10

CONTACT_FRAME = fidx(0, "06:20")               # EVT-0102

def clock(i):
    cday, rem = divmod(i, FPD)
    h, mm = divmod(rem * 10, 60)
    eh, em = divmod(rem * 10 + 10, 60)
    end = "23:59" if (eh, em) == (24, 0) else f"{eh:02d}:{em:02d}"
    date = C0 + dt.timedelta(days=cday)
    war_day = cday + FIRST_DAY
    return dict(
        cday=cday, war_day=war_day, hour=h, in_day=rem,
        date=date.strftime("%d/%m/%Y"),
        ts=f"{h:02d}:{mm:02d}", te=end,
        dt_start=f"{h:02d}:{mm:02d} {date.strftime('%d/%m/%Y')}",
        dt_end=f"{end} {date.strftime('%d/%m/%Y')}",
        disp=f"{h:02d}:{mm:02d}-{end} {date.strftime('%d/%m/%Y')}",
        campaign=f"C+{cday:02d}:{h:02d}:{mm:02d}",
        battle=("B{}{:02d}:{:02d}:{:02d}".format("+" if war_day >= 0 else "-", abs(war_day), h, mm)),
    )

EV_AT = defaultdict(list)
for e in D.EVENTS:
    EV_AT[fidx(e[1], e[2])].append(e)

# ---------------------------------------------------------------------------
# CAMPAIGN PHASE BANDS (by war day, relative to first contact)
# ---------------------------------------------------------------------------
def campaign_phase(war_day, frame):
    if war_day <= -39: return "STRATEGIC_PREPARATION"
    if war_day <= -38: return "INVASION_PREPARATION"
    if war_day <= -6:  return "OPERATIONAL_APPROACH"
    if war_day <= -4:  return "BORDER_CROSSING"
    if war_day <= -1:  return "DEPLOYMENT"
    if frame < CONTACT_FRAME: return "DEPLOYMENT"
    if war_day == 0:   return "FIRST_CONTACT" if frame == CONTACT_FRAME else "ACTIVE_COMBAT"
    if war_day <= 3:   return "ACTIVE_COMBAT"
    if war_day <= 8:   return "SECOND_OFFENSIVE"
    return "TERMINATION_AND_SETTLEMENT"

APPROACH_START = fidx(-37, "08:00")
APPROACH_END = fidx(-2, "11:00")               # 700,000 in the forest

# ---------------------------------------------------------------------------
# STATE
# ---------------------------------------------------------------------------
TH = {
 "TH-DWG": dict(status="INACTIVE", battle="-", objective="Await the imperial advance",
   frontline="No imperial force in the theatre", control="TEMPEST_CONTROLLED", bstatus="NOT_STARTED"),
 "TH-LAB": dict(status="INACTIVE", battle="-", objective="Hold the labyrinth",
   frontline="Labyrinth sealed and held by the garrison", control="TEMPEST_CONTROLLED", bstatus="NOT_STARTED"),
 "TH-CAP": dict(status="INACTIVE", battle="-", objective="Direct the war",
   frontline="Imperial capital secure", control="EMPIRE_CONTROLLED", bstatus="NOT_STARTED"),
 "TH-DWE": dict(status="INACTIVE", battle="-", objective="Hold the eastern gate",
   frontline="No imperial presence at the eastern metropolis", control="DWARGON_CONTROLLED", bstatus="NOT_STARTED"),
 "TH-DRG": dict(status="INACTIVE", battle="-", objective="-",
   frontline="No dragon-tier engagement in progress", control="NEUTRAL", bstatus="NOT_STARTED"),
 "TH-DIP": dict(status="INACTIVE", battle="-", objective="-",
   frontline="No negotiations in progress", control="NEUTRAL", bstatus="NOT_STARTED"),
}
ST = dict(t_total=150000, t_eff=0, e_total=940000, e_eff=940000,
    t_kia=0, t_wia="UNKNOWN", t_pow=0, t_mia="UNKNOWN",
    e_kia=0, e_wia="UNKNOWN", e_pow=0, e_mia="UNKNOWN",
    t_adv="STATIONARY", t_ret="NO", e_adv="STATIONARY", e_ret="NO",
    commanders="Rimuru (Tempest head of state); Emperor Rudra (Empire)",
    combatants="None engaged",
    e_loc="Eastern Empire interior", t_loc="Tempest")

# force-level live state
FST = {}
for f in D.FORCES:
    _init = f[10] if f[10] is not None else f[11]
    FST[f[0]] = dict(loc=f[16], mstat="STATIONARY", mdir="-", status="RESERVE",
                     cur=_init, kia=0, reinf=0, live=False)

def act(fid, **kw):
    if fid in FST:
        FST[fid].update(kw); FST[fid]["live"] = True

def apply_event(e):
    eid, th = e[0], e[5]
    if TH[th]["status"] in ("INACTIVE",):
        TH[th]["status"] = "ACTIVE"
    if e[7] not in ("-", None):
        TH[th]["battle"] = e[7]
        if TH[th]["bstatus"] in ("NOT_STARTED", "FORMING"):
            TH[th]["bstatus"] = "ACTIVE"

    # ---- approach phase ---------------------------------------------------
    if eid == "EVT-0001":
        ST["commanders"] = "Rimuru (Tempest head of state); Emperor Rudra ordering mobilization"
        act("F-EMP-000", status="ACTIVE"); act("F-EMP-001", status="ACTIVE")
        TH["TH-CAP"].update(status="ACTIVE", objective="Mobilise and launch the invasion",
                            frontline="Imperial mobilization under way", bstatus="FORMING")
    elif eid == "EVT-0003":
        ST.update(e_adv="ADVANCING", e_loc="Eastern Empire interior, marching west")
        act("F-EMP-010", status="IN_TRANSIT", mstat="ADVANCE", mdir="West toward the Great Jura Forest")
        act("F-EMP-012", status="IN_TRANSIT", mstat="ADVANCE", mdir="West")
        act("F-EMP-013", status="IN_TRANSIT", mstat="ADVANCE", mdir="West")
        act("F-EMP-011", status="IN_TRANSIT", mstat="ADVANCE", mdir="West")
        TH["TH-DWG"].update(status="ACTIVE", objective="Advance on the Great Jura Forest",
            frontline="Imperial invasion column on the march", bstatus="FORMING")
    elif eid == "EVT-0004":
        ST["commanders"] = "Benimaru Supreme General (Tempest); Emperor Rudra (Empire)"
        for fid in ("F-TEM-000","F-TEM-001","F-TEM-002","F-TEM-003","F-TEM-004"):
            act(fid, status="DEPLOYED")
    elif eid == "EVT-0011":
        TH["TH-DWG"]["objective"] = "Track the imperial approach; prepare the defence"
    elif eid == "EVT-0012":
        TH["TH-DWG"]["frontline"] = "Imperial column halted; no movement for a month"
        ST["e_adv"] = "STATIONARY"
        act("F-EMP-010", mstat="STATIONARY", status="IN_TRANSIT")
    elif eid == "EVT-0013":
        ST["e_adv"] = "ADVANCING"
        act("F-EMP-010", mstat="ADVANCE", status="IN_TRANSIT")
        TH["TH-DWG"]["frontline"] = "Imperial column advancing deliberately slowly as a display of power"
    elif eid == "EVT-0015":
        ST["e_loc"] = "Across the Tempest border"
        act("F-EMP-010", loc="Across the Tempest border", mstat="ADVANCE")
        TH["TH-DWG"].update(control="CONTESTED",
            frontline="Imperial Army has forced the Tempest border")
    elif eid == "EVT-0016":
        TH["TH-DWE"].update(status="ACTIVE", battle="Blockade of the Eastern Metropolis",
            bstatus="ACTIVE", objective="Hold the eastern gate against the blockade",
            frontline="Sixty thousand imperial troops blockading the Isthmus gate", control="CONTESTED")
        act("F-EMP-031", status="DEPLOYED", loc="Dwargon eastern metropolis", mstat="STATIONARY")
        act("F-EMP-030", status="DEPLOYED")
    elif eid == "EVT-0018":
        ST["commanders"] = ("Benimaru Supreme General (Tempest); Gazel commanding Dwargon; "
                            "Calgurio supreme field command (Empire)")
        act("F-DWA-001", status="DEPLOYED", loc="Dwargon Gate")
    elif eid == "EVT-0019":
        ST["e_adv"] = "DEPLOYING"
        act("F-EMP-010", mstat="DEPLOYMENT", loc="Edge of the Great Jura Forest")
        TH["TH-DWG"]["frontline"] = "Imperial column halted and deploying its formations"
    elif eid == "EVT-0020":
        act("F-EMP-011", loc="Great Jura Forest interior", mstat="DEPLOYMENT", status="DEPLOYED")
        TH["TH-DWG"].update(control="CONTESTED",
            frontline="Seven hundred thousand imperial troops entering the Great Jura Forest")
    elif eid == "EVT-0006" or eid == "EVT-0021":
        ST.update(t_eff=15000, t_loc="Dwargon outer gate / inn town")
        act("F-TEM-001", status="DEPLOYED", loc="Dwargon outer gate", mstat="DEPLOYMENT")
        act("F-TEM-003", status="DEPLOYED", loc="Dwargon outer gate", mstat="DEPLOYMENT")
    elif eid == "EVT-0100":
        TH["TH-DWG"].update(bstatus="INTENSIFYING",
            frontline="Tempest scouting element within ten kilometres of the imperial line")
        act("F-TEM-001", mstat="ADVANCE", mdir="Toward the imperial line")

    # ---- Phase 1 ----------------------------------------------------------
    elif eid == "EVT-0101":
        act("F-EMP-012", status="DEPLOYED", loc="Dwargon Gate Front", mstat="DEPLOYMENT")
        ST["combatants"] = "Gobta; Gabil; Benimaru; Geist; Faraga"
    elif eid == "EVT-0102":
        ST.update(t_adv="ADVANCING", e_adv="ENGAGED")
        act("F-TEM-001", status="ENGAGED", mstat="ADVANCE"); act("F-EMP-012", status="ENGAGED")
        TH["TH-DWG"].update(bstatus="ACTIVE",
            frontline="Contact established; Green Legion inside the imperial chariot screen")
    elif eid == "EVT-0105":
        act("F-TEM-003", status="ENGAGED"); act("F-EMP-013", status="ENGAGED", loc="Airspace over the front")
    elif eid == "EVT-0107":
        ST["t_adv"] = "ENCIRCLED"; act("F-TEM-001", mstat="ENCIRCLEMENT")
        TH["TH-DWG"].update(bstatus="INTENSIFYING",
            frontline="Green Legion encircled by a linked chariot fortress")
    elif eid == "EVT-0109":
        ST.update(t_adv="RETREATING (feigned)", t_ret="YES (feigned)")
        act("F-TEM-001", mstat="RETREAT", status="ENGAGED")
        TH["TH-DWG"]["frontline"] = "Tempest simulating collapse; imperial armour committed forward"
    elif eid == "EVT-0111":
        ST.update(t_adv="ADVANCING", t_ret="NO", e_adv="DISORGANISED")
        act("F-TEM-001", mstat="BREAKTHROUGH")
        TH["TH-DWG"]["frontline"] = "Imperial chariot mass broken by tornado effect; Tempest counterattacking"
    elif eid == "EVT-0114":
        ST["combatants"] = "Gobta; Gabil; Ultima; Benimaru; Geist"; act("F-DEM-002", status="ENGAGED")
    elif eid == "EVT-0115":
        ST["e_kia"] += 40000; ST["e_eff"] -= 40000
        ST["combatants"] = "Gobta; Gabil; Ultima; Veldora; Benimaru; Geist"
        act("F-DRG-001", status="ENGAGED")
        act("F-EMP-013", status="DESTROYED", cur=0, kia=40000, mstat="STATIONARY")
        TH["TH-DWG"].update(control="CONTESTED",
            frontline="Imperial air arm eliminated; Tempest holds the airspace")
    elif eid == "EVT-0117":
        ST.update(e_adv="RETREATING", e_ret="YES",
                  commanders="Benimaru Supreme General (Tempest); Geist ordering general withdrawal")
        act("F-EMP-012", status="RETREATING", mstat="WITHDRAWAL", mdir="East, away from the gate")
        TH["TH-DWG"]["bstatus"] = "WITHDRAWAL"
    elif eid == "EVT-0118":
        ST["e_ret"] = "YES (route closed)"
        ST["combatants"] = "Gobta; Gabil; Ultima; Veldora; Testarossa; Geist"
        act("F-DEM-001", status="ENGAGED"); act("F-EMP-012", mstat="ENCIRCLEMENT")
        TH["TH-DWG"]["frontline"] = "Imperial withdrawal intercepted from the rear; force encircled"
    elif eid == "EVT-0119":
        ST["e_kia"] += 200000; ST["e_eff"] -= 200000
        ST.update(e_adv="DESTROYED", e_ret="N/A",
            commanders="Benimaru Supreme General (Tempest); Geist and Faraga lost; Calgurio in overall imperial command")
        ST["combatants"] = "Gobta; Gabil; Benimaru; Calgurio"
        act("F-EMP-012", status="DESTROYED", cur=0, kia=200000, mstat="STATIONARY")
        TH["TH-DWG"].update(status="CLEARED", bstatus="CONCLUDED",
            battle="Battle of the Dwargon Gate (concluded)", control="TEMPEST_CONTROLLED",
            frontline="Dwargon Gate Front cleared; Tempest in possession of the field")
    # ---- Phase 2 ----------------------------------------------------------
    elif eid == "EVT-0201":
        ST.update(e_adv="ADVANCING", e_ret="NO", combatants="Ramiris; Adalman; Calgurio")
        act("F-EMP-011", loc="Ramiris Labyrinth", mstat="ADVANCE", status="ENGAGED")
        act("F-TEM-010", status="ENGAGED", loc="Ramiris Labyrinth")
        TH["TH-LAB"].update(status="ACTIVE", bstatus="ACTIVE", objective="Destroy the imperial ground army",
            frontline="Imperial ground army committed into the labyrinth")
    elif eid == "EVT-0202":
        TH["TH-LAB"].update(bstatus="INTENSIFYING",
            frontline="Imperial formations severed and isolated inside the labyrinth")
        act("F-EMP-011", mstat="STATIONARY")
    elif eid == "EVT-0203":
        ST["e_kia"] += 10000; ST["e_eff"] -= 10000
        act("F-EMP-011", cur=690000, kia=10000)
    elif eid == "EVT-0207":
        ST["e_kia"] += 520000; ST["e_eff"] -= 520000
        ST.update(e_adv="DESTROYED", e_ret="N/A",
            commanders="Benimaru Supreme General (Tempest); imperial field command destroyed")
        act("F-EMP-011", status="DESTROYED", cur=170000, kia=530000, mstat="STATIONARY")
        TH["TH-LAB"].update(status="CLEARED", bstatus="CONCLUDED",
            battle="Battle of the Labyrinth (concluded)",
            frontline="Imperial ground army destroyed; no coherent imperial force remains on the Jura front")
    # ---- Phase 3 ----------------------------------------------------------
    elif eid == "EVT-0310":
        TH["TH-CAP"].update(status="ACTIVE", bstatus="FORMING", control="CONTESTED",
            objective="Overthrow the imperial government",
            frontline="Internal conspiracy forming inside the imperial capital")
        ST["combatants"] = "Yuuki; Miranda; Kondo"; act("F-EMP-050", status="ACTIVE")
    elif eid == "EVT-0313":
        TH["TH-CAP"].update(bstatus="ACTIVE",
            frontline="Imperial counter-intelligence has cornered the coup leadership")
        act("F-EMP-014", status="ENGAGED")
    elif eid == "EVT-0315":
        ST["e_kia"] += 1
        act("F-EMP-050", status="DESTROYED", kia=1)
        TH["TH-CAP"].update(bstatus="CONCLUDED", control="EMPIRE_CONTROLLED",
            frontline="Coup leadership eliminated; imperial capital secure")
        ST["combatants"] = "Yuuki; Kondo"
    elif eid == "EVT-0316":
        ST["commanders"] = ("Benimaru Supreme General (Tempest); Calgurio imperial field command; "
                            "Kondo holds the conspiracy in full")
    elif eid == "EVT-0321":
        ST["commanders"] = ("Benimaru Supreme General (Tempest); imperial blockade force has no "
                            "authorised commander")
        TH["TH-DWE"]["frontline"] = "Blockade force leaderless and paralysed"
        act("F-EMP-031", status="DEPLOYED", mstat="STATIONARY")
    elif eid == "EVT-0330":
        TH["TH-DRG"].update(status="ACTIVE", bstatus="ACTIVE", control="CONTESTED",
            objective="Capture Veldora / prevent his capture",
            frontline="Velgrynd and Veldora engaged over the Great Jura Forest")
        ST["combatants"] = "Veldora; Velgrynd; Gazel; Kondo"
        act("F-EMP-070", status="ENGAGED", loc="Jura airspace")
        act("F-DRG-001", status="ENGAGED", loc="Jura airspace")
    elif eid == "EVT-0331":
        TH["TH-DWG"]["control"] = "TEMPEST_CONTROLLED (terrain destroyed)"
    elif eid == "EVT-0332":
        TH["TH-LAB"].update(status="DAMAGED", control="TEMPEST_CONTROLLED (access severed)",
            frontline="Labyrinth gate destroyed; upper floors assessed as likely destroyed")
    elif eid == "EVT-0334":
        TH["TH-DRG"]["frontline"] = "Dragon engagement in stasis; neither side able to force a decision"
    elif eid == "EVT-0340":
        TH["TH-DWE"].update(battle="Battle of the Dwargon Eastern Front", bstatus="INTENSIFYING",
            objective="Break the imperial ritual",
            frontline="Dwargon formed up against Velgrynd on a position assessed as unwinnable")
        act("F-DWA-003", status="DEPLOYED", loc="Dwargon eastern front")
    elif eid == "EVT-0343":
        ST["e_kia"] += 60000
        act("F-EMP-031", status="DESTROYED", cur=0, kia=60000)
        TH["TH-DWE"]["frontline"] = ("Hybrid Legion field element consumed by the imperial ritual; "
                                     "ritual casters exposed behind the Scorch Dragon")
    elif eid == "EVT-0345":
        act("F-DWA-002", status="ENGAGED", mstat="ADVANCE", mdir="Toward the ritual position")
        TH["TH-DWE"]["frontline"] = "Five hundred Sky Knights attacking the ritual casters"
    elif eid == "EVT-0346":
        ST["combatants"] = "Gabil; Gadra; Gazel; Dorf; Velgrynd; Kondo"
        act("F-TEM-003", loc="Dwargon eastern front", mstat="REINFORCEMENT", status="ENGAGED")
        act("F-TEM-011", loc="Dwargon eastern front", mstat="REINFORCEMENT", status="ENGAGED")
        TH["TH-DWE"]["frontline"] = "Tempest reinforcement arrives; Colossus committed to the eastern front"
    elif eid == "EVT-0348":
        ST["commanders"] = ("Benimaru Supreme General (Tempest); Dorf holding joint command on the "
                            "eastern front; Calgurio imperial field command")
    elif eid == "EVT-0350":
        ST["combatants"] = "Gabil; Gadra; Gobya; Hakurou; Phobio; Gazel; Dorf; Velgrynd; Kondo"
        act("F-TEM-012", loc="Dwargon eastern front", mstat="REINFORCEMENT", status="ENGAGED")
        act("F-ALL-001", loc="Dwargon eastern front", status="ENGAGED")
    elif eid == "EVT-0351":
        act("F-TEM-013", loc="Dwargon eastern front", mstat="REPOSITION", status="ENGAGED")
    elif eid == "EVT-0360":
        TH["TH-CAP"].update(battle="Imperial Capital Confrontation", bstatus="ACTIVE", control="CONTESTED",
            objective="Force a decision at the imperial centre",
            frontline="Tempest command element operating covertly inside the imperial capital")
    elif eid == "EVT-0361":
        TH["TH-CAP"].update(bstatus="INTENSIFYING",
            frontline="Tempest command element sealed into an isolated space")
        ST["commanders"] = "Rimuru and Benimaru cut off; Tempest field command decentralised"
    elif eid == "EVT-0362":
        ST["t_kia"] = "UNKNOWN (min 1)"
        TH["TH-CAP"]["frontline"] = "Tempest personnel killed inside the sealed space"
    elif eid == "EVT-0370":
        act("F-EMP-020", status="IN_TRANSIT", loc="Airspace over northern Ingracia",
            mstat="IN_TRANSIT", mdir="Toward the central continent")
        act("F-EMP-060", status="IN_TRANSIT", loc="Airspace over northern Ingracia", mstat="IN_TRANSIT")
    elif eid == "EVT-0373":
        act("F-EMP-020", loc="UNKNOWN (space-time jump)", mstat="IN_TRANSIT", mdir="UNKNOWN")
        act("F-EMP-060", loc="UNKNOWN (space-time jump)", mstat="IN_TRANSIT", mdir="UNKNOWN")
    elif eid == "EVT-0382":
        TH["TH-CAP"]["frontline"] = "Imperial resistance broken in Testarossa's sector"
    elif eid == "EVT-0384":
        ST.update(e_adv="N/A", e_ret="N/A", t_adv="STATIONARY", t_ret="NO")
        for t in ("TH-DWG","TH-LAB","TH-CAP","TH-DWE","TH-DRG"):
            TH[t].update(status="HOSTILITIES_SUSPENDED", bstatus="CONCLUDED")
        for fid, s in FST.items():
            if s["live"] and s["status"] in ("ENGAGED","ADVANCING","RETREATING"):
                s["status"] = "DEPLOYED"; s["mstat"] = "STATIONARY"
        TH["TH-CAP"]["frontline"] = "Armistice proposed; active hostilities suspended"
    elif eid == "EVT-0385":
        for t in ("TH-DWG","TH-LAB","TH-CAP","TH-DWE","TH-DRG"):
            TH[t]["battle"] = "-"
    elif eid == "EVT-0390":
        TH["TH-DIP"].update(status="ACTIVE", battle="Post-war summit", bstatus="ACTIVE",
            objective="Settle the war", frontline="Heads of state in session", control="NEUTRAL")
        ST["combatants"] = "Rimuru; Masayuki; Velgrynd; Caligulio; Minitz; Testarossa"
    elif eid == "EVT-0391":
        TH["TH-DIP"]["frontline"] = "End-of-hostilities treaty and new pact under negotiation"
    elif eid == "EVT-0394":
        ST["commanders"] = ("Rimuru head of state (Tempest); Masayuki emperor (Empire), "
                            "named by Velgrynd under imperial court law")
    elif eid == "EVT-0395":
        ST["e_pow"] = "UNKNOWN (repatriated)"
        TH["TH-DIP"]["frontline"] = "Prisoners repatriated; settlement terms being implemented"
    elif eid == "EVT-0396":
        act("F-DEM-001", loc="Embassy in the Empire", mstat="DEPLOYMENT", status="DEPLOYED")
    elif eid == "EVT-0398":
        TH["TH-DIP"].update(bstatus="CONCLUDED", frontline="Reconstruction programme under way")

# ---------------------------------------------------------------------------
LABELS = {"TH-DWG":"Dwargon Gate","TH-LAB":"Labyrinth","TH-CAP":"Imperial Capital",
          "TH-DWE":"Dwargon East","TH-DRG":"Dragon Theatre","TH-DIP":"Settlement"}
LIVE = ("ACTIVE","DAMAGED","HOSTILITIES_SUSPENDED","CLEARED")

TL_HEADERS = ["Frame_ID","Date","Time_Start","Time_End","Datetime_Start","Datetime_End","Datetime_Display",
 "Campaign_Time","Battle_Time","Relative_War_Time_Start","Relative_War_Time_End",
 "Campaign_Day","Battle_Day","Hour_Number","Frame_Number_In_Day","Campaign_Phase","Campaign_Stage",
 "Approach_Progress_Pct_SIMULATED","Empire_Column_Location",
 "Active_Theaters","Active_Fronts","Active_Battles","Battle_Status",
 "Tempest_Total_Force","Tempest_Effective_Force","Empire_Total_Force","Empire_Effective_Force",
 "Tempest_Advancing","Tempest_Retreating","Empire_Advancing","Empire_Retreating",
 "Frontline_State","Territorial_Control",
 "Tempest_KIA_Cumulative","Tempest_WIA_Cumulative","Tempest_POW_Cumulative","Tempest_MIA_Cumulative",
 "Empire_KIA_Cumulative","Empire_WIA_Cumulative","Empire_POW_Cumulative","Empire_MIA_Cumulative",
 "Active_Commanders","Major_Combatants_Active",
 "TH_DWG_Status","TH_DWG_Frontline","TH_LAB_Status","TH_LAB_Frontline",
 "TH_CAP_Status","TH_CAP_Frontline","TH_DWE_Status","TH_DWE_Frontline",
 "TH_DRG_Status","TH_DRG_Frontline","TH_DIP_Status","TH_DIP_Frontline",
 "Major_Events","Event_IDs","State_Change_From_Previous_Frame","Frame_Status","Event_Status","State_Status","Information_Status",
 "Date_Basis","Date_Confidence","Time_Basis","Time_Confidence",
 "Numerical_Confidence","Overall_Confidence","Source_References","Evidence","Notes"]

def snapshot():
    return (ST["t_eff"], ST["e_eff"], str(ST["t_kia"]), ST["e_kia"], str(ST["e_pow"]),
            ST["t_adv"], ST["t_ret"], ST["e_adv"], ST["e_ret"],
            ST["commanders"], ST["combatants"], ST["e_loc"],
            tuple((k, v["status"], v["battle"], v["frontline"], v["control"], v["bstatus"])
                  for k, v in TH.items()))
NAMES = ["Tempest effective","Empire effective","Tempest KIA","Empire KIA","Empire POW",
         "Tempest movement","Tempest retreating","Empire movement","Empire retreating",
         "commanders","combatants","imperial column location"]

def diff(a, b):
    if a is None: return "Initial campaign state"
    out = []
    for i, n in enumerate(NAMES):
        if a[i] != b[i]:
            out.append(f"{n}: {a[i]} -> {b[i]}")
    for x, y in zip(a[12], b[12]):
        k = x[0]
        if x[1] != y[1]: out.append(f"{LABELS[k]} theatre status: {x[1]} -> {y[1]}")
        if x[2] != y[2]: out.append(f"{LABELS[k]} battle: {y[2]}")
        if x[3] != y[3]: out.append(f"{LABELS[k]} frontline changed")
        if x[4] != y[4]: out.append(f"{LABELS[k]} territorial control: {x[4]} -> {y[4]}")
        if x[5] != y[5]: out.append(f"{LABELS[k]} battle status: {x[5]} -> {y[5]}")
    return " | ".join(out) if out else "INHERITED_STATE"

FSRC = {f[0]: f for f in D.FORCES}
keyframes, force_states = [], []
LAST_EV = [0]
DEAD_AT = {}
prev = None

for i in range(NFRAMES):
    evs = EV_AT.get(i, [])
    for e in evs:
        apply_event(e)
    # approach-march interpolation (simulation only)
    if i < APPROACH_START:
        pct = 0
    elif i >= APPROACH_END:
        pct = 100
    else:
        pct = round(100 * (i - APPROACH_START) / (APPROACH_END - APPROACH_START))
    if 0 < pct < 100:
        ST["e_loc"] = f"In transit, {pct}% of the way from the imperial interior to the forest edge"
        if FST["F-EMP-010"]["live"] and FST["F-EMP-010"]["mstat"] == "ADVANCE":
            FST["F-EMP-010"]["loc"] = ST["e_loc"]

    # combatant decay: clear the active list a day after the last event
    if evs:
        LAST_EV[0] = i
    elif i - LAST_EV[0] > FPD and ST["combatants"] != "None engaged":
        ST["combatants"] = "None engaged"
    snap = snapshot()
    changed = (snap != prev)
    c = clock(i)
    phase = campaign_phase(c["war_day"], i)
    stage = next((s[1] for s in D.CAMPAIGN_STAGES if s[2] <= c["war_day"] <= s[3]), "MAJOR_COMBAT_PERIOD")
    active = [k for k, v in TH.items() if v["status"] in LIVE]
    keyframes.append([
        f"FRAME_{i+1:04d}", c["date"], c["ts"], c["te"], c["dt_start"], c["dt_end"], c["disp"],
        c["campaign"], c["battle"], c["campaign"], f"C+{c['cday']:02d}:{c['te']}",
        c["cday"], c["war_day"], c["hour"], c["in_day"] + 1, phase, stage,
        pct, ST["e_loc"],
        "; ".join(LABELS[k] for k in active) or "None active",
        "; ".join(D.THEATERS[k][0] for k in active) or "None active",
        "; ".join(TH[k]["battle"] for k in active if TH[k]["battle"] != "-") or "No active battle",
        "; ".join(f"{LABELS[k]}:{TH[k]['bstatus']}" for k in active) or "NOT_STARTED",
        ST["t_total"], ST["t_eff"], ST["e_total"], ST["e_eff"],
        ST["t_adv"], ST["t_ret"], ST["e_adv"], ST["e_ret"],
        " || ".join(f"{LABELS[k]}: {TH[k]['frontline']}" for k in active) or "No active front",
        " || ".join(f"{LABELS[k]}: {TH[k]['control']}" for k in active) or "No contested territory",
        ST["t_kia"], ST["t_wia"], ST["t_pow"], ST["t_mia"],
        ST["e_kia"], ST["e_wia"], ST["e_pow"], ST["e_mia"],
        ST["commanders"], ST["combatants"],
        TH["TH-DWG"]["status"], TH["TH-DWG"]["frontline"],
        TH["TH-LAB"]["status"], TH["TH-LAB"]["frontline"],
        TH["TH-CAP"]["status"], TH["TH-CAP"]["frontline"],
        TH["TH-DWE"]["status"], TH["TH-DWE"]["frontline"],
        TH["TH-DRG"]["status"], TH["TH-DRG"]["frontline"],
        TH["TH-DIP"]["status"], TH["TH-DIP"]["frontline"],
        " | ".join(e[14] for e in evs) if evs else "No major new event",
        ", ".join(e[0] for e in evs) if evs else "",
        diff(prev, snap) if changed else "INHERITED_STATE",
        "EVENT_FRAME" if evs else "INHERITED_FRAME",
        "NEW_EVENT" if evs else "NO_MAJOR_NEW_EVENT",
        "STATE_CHANGED" if changed else "INHERITED_STATE",
        "EVENT_DRIVEN" if evs else "INHERITED_STATE",
        "SIMULATION_RECONSTRUCTED", "LOW",
        (evs[0][25] if evs else "SIMULATION_RECONSTRUCTED"),
        (evs[0][26] if evs else "LOW"),
        (evs[0][27] if evs else "LOW"),
        (evs[0][28] if evs else "LOW"),
        ", ".join(f"{e[29]} {e[30]}" for e in evs) if evs else "inherited from previous frame",
        " | ".join(e[31] for e in evs) if evs else "inherited",
        " | ".join(e[34] for e in evs if e[34]) if evs else "",
    ])
    # force states: on every event frame, plus hourly for live forces
    if evs or i % 6 == 0:
        for fid, s in FST.items():
            if not s["live"]:
                continue
            if s["status"] in ("DESTROYED",):
                DEAD_AT.setdefault(fid, i)
                if i - DEAD_AT[fid] > FPD:
                    continue
            f = FSRC[fid]
            force_states.append([
                f"FRAME_{i+1:04d}", c["disp"], fid, f[1], f[2], f[2], f[3], f[3], f[4],
                f[5], f[6], s["loc"], f[7],
                f[8] if f[8] is not None else "UNKNOWN",
                f[9] if f[9] is not None else "UNKNOWN",
                f[10] if f[10] is not None else "UNKNOWN",
                s["reinf"],
                s["cur"] if s["cur"] is not None else "UNKNOWN",
                s["cur"] if s["cur"] is not None else "UNKNOWN",
                s["kia"], "UNKNOWN", "UNKNOWN", "UNKNOWN", "UNKNOWN",
                s["mstat"], s["mdir"], s["status"],
                f[19], "INHERITED_STATE" if not evs else "EVENT_DRIVEN", f[21],
                f[20].split()[0] if f[20] != "-" else "-",
                " ".join(f[20].split()[1:]) if f[20] != "-" and len(f[20].split()) > 1 else "-",
                "not paginated", f[20], f[22],
            ])
    prev = snap

# ---------------------------------------------------------------------------
wb = openpyxl.Workbook()
HF = PatternFill("solid", fgColor="1F3864")
HFONT = Font(name="Arial", bold=True, color="FFFFFF", size=10)
BODY = Font(name="Arial", size=10)

def sheet(ws, headers, rows, widths=None):
    ws.append(headers)
    for cc in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=cc)
        cell.fill, cell.font = HF, HFONT
        cell.alignment = Alignment(vertical="center", wrap_text=True)
    for r in rows:
        ws.append(["UNKNOWN" if v is None else v for v in r])
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.font = BODY
            cell.alignment = Alignment(vertical="top")
    for k in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(k)].width = (widths or {}).get(k, 20)
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{ws.max_row}"

ws = wb.active; ws.title = "Timeline"
sheet(ws, TL_HEADERS, keyframes, widths={1:13,5:22,6:22,7:26,8:18,9:18,10:18,11:20,15:26,16:28,
    18:56,19:40,20:44,21:44,22:44,31:90,32:80,41:70,42:60,44:60,46:60,48:60,50:60,52:60,54:60,
    55:60,57:90,68:40,69:60,70:60})

AS_HEADERS = ["Frame_ID","Datetime_Display","Force_ID","Faction","Army","Legion","Formation","Unit",
 "Parent_Formation","Commander","Role","Location","Initial_Strength_Raw","Initial_Min","Initial_Max",
 "Initial_Best_Estimate","Reinforcements","Current_Strength","Current_Effective_Strength",
 "KIA_Cumulative","WIA_Cumulative","POW_Cumulative","MIA_Cumulative","Other_Loss_Cumulative",
 "Movement_Status","Movement_Direction","Status","Strength_Basis","Information_Status","Confidence",
 "Source_Volume","Source_Chapter","Source_Page","Evidence","Notes"]
ws2 = wb.create_sheet("Army Sizes")
sheet(ws2, AS_HEADERS, force_states, widths={1:13,2:26,3:13,5:30,7:38,8:38,9:14,10:26,11:32,12:56,13:66,34:34,35:80})

CS_HEADERS = ["Casualty_Event_ID","Event_ID","Frame_ID","Date","Time","Datetime","Faction","Force_ID",
 "Formation","Location","Battle","Cause","KIA_Event","WIA_Event","POW_Event","MIA_Event","Other_Loss",
 "Total_Loss","KIA_Cumulative","WIA_Cumulative","POW_Cumulative","MIA_Cumulative",
 "Casualty_Scope","Aggregate_Of","Casualty_Basis","Derivation_Status","Confidence",
 "Source_Volume","Source_Chapter","Source_Page","Evidence","Notes"]
EMAP = {e[0]: e for e in D.EVENTS}
cum = {"Eastern Empire": 0, "Jura-Tempest Federation": 0}
cas_rows = []
for cslot in sorted(D.CASUALTIES, key=lambda c: (c[13] if isinstance(c[13], str) else "")):
    pass
for cr in D.CASUALTIES:
    e = EMAP.get(cr[1])
    if e:
        fi = fidx(e[1], e[2]); cc = clock(fi)
        frame, date, time_, dtm, battle = f"FRAME_{fi+1:04d}", cc["date"], cc["ts"], cc["disp"], e[7]
    else:
        frame = date = time_ = dtm = battle = "N/A (scope-level record)"
    kia = cr[7] if isinstance(cr[7], int) else "UNKNOWN"
    if cr[14] == "EVENT_CASUALTY" and isinstance(kia, int) and cr[6] == "KIA":
        cum[cr[2]] = cum.get(cr[2], 0) + kia
    cas_rows.append([cr[0], cr[1] or "N/A", frame, date, time_, dtm, cr[2], cr[4], cr[3],
        cr[12], battle, cr[5], kia,
        cr[10] if cr[10] is not None else "UNKNOWN",
        cr[11] if cr[11] is not None else "UNKNOWN",
        "UNKNOWN",
        kia if cr[6] not in ("KIA","POW","WIA") else "UNKNOWN",
        kia if isinstance(kia, int) else "UNKNOWN",
        cum.get(cr[2], "UNKNOWN") if cr[14] == "EVENT_CASUALTY" else "N/A (not a running total)",
        "UNKNOWN","UNKNOWN","UNKNOWN",
        cr[14], cr[15], cr[17], cr[16], cr[19],
        cr[18].split()[0] if cr[18] != "-" else "-",
        " ".join(cr[18].split()[1:]) if cr[18] != "-" and len(cr[18].split()) > 1 else "-",
        "not paginated", cr[18], cr[20]])
ws3 = wb.create_sheet("Casualties")
sheet(ws3, CS_HEADERS, cas_rows, widths={1:19,2:12,3:13,6:26,8:13,9:34,10:32,11:30,12:58,23:22,24:28,25:22,26:26,31:26,32:80})
n = ws3.max_row + 2
ws3.cell(row=n, column=1, value="RECONCILED TOTALS - EVENT_CASUALTY rows only").font = Font(name="Arial", bold=True, size=10)
for k, (lab, f) in enumerate([
 ("Empire KIA, Jura surface phase","=SUMIFS(M:M,A:A,\"CAS-001\")+SUMIFS(M:M,A:A,\"CAS-002\")"),
 ("Empire KIA, Jura labyrinth phase","=SUMIFS(M:M,A:A,\"CAS-004\")"),
 ("Empire KIA, Jura front total","=B{}+B{}".format(n+1, n+2)),
 ("Empire KIA, other theatres","=SUMIFS(M:M,A:A,\"CAS-011\")+SUMIFS(M:M,A:A,\"CAS-012\")"),
 ("Empire KIA, campaign total","=B{}+B{}".format(n+3, n+4)),
 ("Tempest KIA, confirmed numeric","=SUMIFS(M:M,A:A,\"CAS-007\")"),
]):
    ws3.cell(row=n+1+k, column=1, value=lab).font = BODY
    ws3.cell(row=n+1+k, column=2, value=f).font = BODY
for j, txt in enumerate([
 "CAS-003 (240,000), CAS-005 (10,000) and CAS-006 (770,000) are AGGREGATE or COMPONENT rows and are EXCLUDED from the totals above.",
 "CAS-013 (Tempest deaths in the sealed space) has no stated number; it is not converted to a figure.",
 "WIA and MIA are UNKNOWN for both sides throughout. UNKNOWN is never converted to zero.",
 "CAS-008 zero POW is scoped to the Jura surface phase only; CAS-014 confirms prisoners in later phases.",
 "Destroyed is never converted into a fabricated death count; only explicitly stated figures are carried.",
]):
    ws3.cell(row=n+8+j, column=1, value=txt).font = BODY

# auxiliary sheets
E_HEADERS = ["Event_ID","Previous_Event_ID","Next_Event_ID","War_Day","Simulation_Time","Frame_ID",
 "Canonical_Time","War_Phase","Theater_ID","Theater","Front","Battle","Location",
 "Actor","Actor_Faction","Opponent","Opponent_Faction","Event_Type","Action",
 "Immediate_Result","Operational_Result","Strategic_Result","Tempest_Strength","Empire_Strength",
 "KIA_Event","POW_Event","Command_Status","Event_Intensity","Battlefield_Significance",
 "Time_Basis","Time_Confidence","Numerical_Confidence","Overall_Confidence",
 "Source_Volume","Source_Chapter","Evidence","Notes"]
ev_rows = []
for e in D.EVENTS:
    i = fidx(e[1], e[2])
    ev_rows.append([e[0], e[32], e[33], f"D{e[1]:+d}", e[2], f"FRAME_{i+1:04d}",
        e[3], e[4], e[5], D.THEATERS[e[5]][0], e[6], e[7], e[8], e[9], e[10], e[11], e[12],
        e[13], e[14], e[15], e[16], e[17], e[18], e[19], e[20], e[21], e[22], e[23], e[24],
        e[25], e[26], e[27], e[28], e[29], e[30], e[31], e[34]])
sheet(wb.create_sheet("Events"), E_HEADERS, ev_rows,
      widths={1:12,2:14,3:14,6:14,7:38,8:32,10:32,12:34,13:36,19:52,20:80,21:56,22:56,27:46,36:60,37:70})

sheet(wb.create_sheet("Force Register"),
 ["Force_ID","Faction","Army","Formation","Parent_Force_ID","Commander","Role","Initial_Strength_Raw",
  "Initial_Min","Initial_Max","Initial_Best_Estimate","Final_Strength","KIA","WIA","POW","MIA",
  "Final_Location","Final_Movement_Status","Final_Status","Strength_Basis","Source","Confidence","Notes"],
 D.FORCES, widths={1:13,4:38,5:14,6:28,7:34,8:70,17:44,23:80})

sheet(wb.create_sheet("Movements"),
 ["Movement_ID","Force_ID","From_Location","To_Location","Start_Event","End_Event","Movement_Type",
  "Movement_Basis","Confidence","Notes"], D.MOVEMENTS,
 widths={1:14,2:13,3:44,4:46,5:20,6:20,7:18,8:30,10:80})

sheet(wb.create_sheet("Commanders"),
 ["Commander_ID","Name","Faction","Role","Command_Scope","Start_Event","End_Event","Status",
  "Subordinates","Source","Confidence"], D.COMMANDERS,
 widths={1:14,2:32,3:26,4:34,5:48,6:14,7:14,8:32,9:60,10:26})

sheet(wb.create_sheet("Combatants"),
 ["Actor_ID","Name","Faction","First_Event","Last_Event","Final_Status","Effect_On_Battlefield",
  "Source_Volumes"], D.COMBATANTS, widths={1:11,2:32,3:26,7:100,8:14})

sheet(wb.create_sheet("Territory"),
 ["Location_ID","Location_Name","Theater","Control_Before","Control_After","Change_Event",
  "Basis","Source","Confidence","Notes"], D.TERRITORY,
 widths={1:13,2:46,3:12,4:28,5:34,6:14,7:24,8:20,10:70})

sheet(wb.create_sheet("Contradictions"),
 ["Contradiction_ID","Description","Claim_A","Claim_B","Source_A","Source_B","Resolution",
  "Final_Treatment","Confidence"], D.CONTRADICTIONS,
 widths={1:17,2:38,3:60,4:60,5:22,6:22,7:70,8:80,9:12})

sheet(wb.create_sheet("Temporal Ambiguities"),
 ["Ambiguity_ID","Events","Ambiguity","Possible_Order","Chosen_Simulation_Placement","Confidence"],
 D.AMBIGUITIES, widths={1:15,2:46,3:26,4:96,5:96,6:12})

stage_rows = [(s[0], s[1], f"D{s[2]:+d}", f"D{s[3]:+d}",
               (C0 + dt.timedelta(days=s[2] - FIRST_DAY)).strftime("%d/%m/%Y"),
               (C0 + dt.timedelta(days=s[3] - FIRST_DAY)).strftime("%d/%m/%Y"),
               f"FRAME_{(s[2]-FIRST_DAY)*FPD+1:04d}", f"FRAME_{(s[3]-FIRST_DAY+1)*FPD:04d}",
               s[4], s[5], s[6]) for s in D.CAMPAIGN_STAGES]
sheet(wb.create_sheet("Campaign Stages"),
 ["Stage","Stage_Name","Start_War_Day","End_War_Day","Start_Date","End_Date","Start_Frame","End_Frame",
  "Definition","Anchor_Events","Source"], stage_rows,
 widths={1:8,2:32,5:14,6:14,7:15,8:15,9:60,10:24,11:18})

readme = [
 ["Deliverable","Tempest-Eastern Empire War - FINAL Step 1 master battlefield timeline (revision 3)"],
 ["Source corpus","Tensura Volumes 12-16 (supplied PDFs) only"],
 ["Simulation campaign window","C+0 (imperial mobilization) to C+49 (settlement) = {} days".format(D.CAMPAIGN_DAYS)],
 ["Keyframes","{} continuous 10-minute frames, no gaps".format(NFRAMES)],
 ["Resolution","10 minutes = 1 keyframe; 6 per hour; 144 per day; final daily bucket 23:50-23:59"],
 ["Rendering","The animation engine interpolates BETWEEN keyframes at 18-24 FPS. No sub-frame rows exist."],
 ["Campaign_Time","C+DD:HH:MM measured from campaign start (mobilization)"],
 ["Battle_Time","B+/-DD:HH:MM measured from first contact (FRAME_{})".format(CONTACT_FRAME + 1)],
 ["First contact","FRAME_{} - EVT-0102, Green Legion surprise attack".format(CONTACT_FRAME + 1)],
 ["Calendar","Campaign day 0 = 01/01/9001. Year 9001 is an ARTIFICIAL MARKER and is NOT canonical."],
 ["Clock times","The corpus contains no clock times. Every HH:MM is SIMULATION_RECONSTRUCTED."],
 ["Approach march","Approach_Progress_Pct is linear interpolation between canonical endpoints, simulation only. See AMB-014."],
 ["Event_Status","NEW_EVENT or NO_MAJOR_NEW_EVENT. State_Status: STATE_CHANGE or INHERITED_STATE."],
 ["UNKNOWN vs INHERITED","UNKNOWN = state cannot be established. INHERITED_STATE = last defensible state still applies."],
 ["Army Sizes","One row = one force state at a keyframe. Emitted at every event frame plus hourly for live forces; carry forward between rows."],
 ["Casualties","One row = one casualty event. Scope tags separate EVENT / AGGREGATE / COMPONENT / CAMPAIGN_TOTAL."],
 ["Evidence","Volume and chapter pointers. Novel text is not reproduced. Pages: the source PDFs are not reliably paginated."],
 ["Revision note","All v1 and v2 IDs preserved. 14 approach-phase events added; grid re-anchored from first contact to campaign start."],
]
sheet(wb.create_sheet("Readme"), ["Field","Value"], readme, widths={1:26,2:140})

wb.save("/home/claude/Tempest_Eastern_Empire_War_Timeline.xlsx")
print("frames", NFRAMES, "| events", len(D.EVENTS), "| force-states", len(force_states),
      "| forces", len(D.FORCES), "| casualties", len(cas_rows),
      "| movements", len(D.MOVEMENTS), "| commanders", len(D.COMMANDERS),
      "| territory", len(D.TERRITORY), "| contradictions", len(D.CONTRADICTIONS))
print("contact frame", CONTACT_FRAME + 1)
