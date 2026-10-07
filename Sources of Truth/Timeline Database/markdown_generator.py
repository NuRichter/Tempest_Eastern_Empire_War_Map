# -*- coding: utf-8 -*-
"""FINAL Markdown generator. Reads the master workbook produced by
build_final.py so Excel and Markdown can never diverge."""
import datetime as dt
from collections import defaultdict
import openpyxl
import dataset_lock as D

WB = openpyxl.load_workbook("Tempest_Eastern_Empire_War_Timeline.xlsx", data_only=True)
T = WB["Timeline"]
H = [c.value for c in T[1]]
X = {h: i for i, h in enumerate(H)}
R = list(T.iter_rows(min_row=2, values_only=True))
CAS = [r for r in WB["Casualties"].iter_rows(min_row=2, values_only=True)
       if r[0] and str(r[0]).startswith("CAS")]
FPD = 144
FIRST_DAY = D.CAMPAIGN_FIRST_DAY

def fidx(day, hhmm):
    h, m = map(int, hhmm.split(":"))
    return (day - FIRST_DAY) * FPD + h * 6 + m // 10

EV_AT = defaultdict(list)
for e in D.EVENTS:
    EV_AT[fidx(e[1], e[2])].append(e)
CONTACT = fidx(0, "06:20")

L = []
w = L.append
def val(r, k): return r[X[k]]

# ============================================================ front matter
w("# Tempest–Eastern Empire War")
w("")
w("**FINAL Step 1 master battlefield timeline.** Reconstructed from the supplied source corpus:")
w("Tensura Volumes 12–16.")
w("")
w("> Generated from the same master dataset as `Tempest_Eastern_Empire_War_Timeline.xlsx`. The")
w("> workbook is the machine-readable master; this file is a derived view. They cannot diverge.")
w("")

w("## Executive Summary")
w("")
w("The Eastern Empire mobilised more than two million subjects, of whom about one million were")
w("immediately deployable, and committed 940,000 to the invasion of the Great Jura Forest. It lost")
w("770,000 of them in four days: 240,000 annihilated on the surface at the Dwargon gate, 530,000")
w("destroyed underground in the Ramiris Labyrinth. A further 60,000 of the Hybrid Legion were expended")
w("by the Empire on its own magical ritual at the Dwargon eastern front. The campaign total is")
w("**830,001 imperial dead**, against a deployable pool of roughly a million — consistent with the")
w("Empire's own post-war admission that it had lost more than two-thirds of its war power.")
w("")
w("Tempest's confirmed numeric losses are **zero**. Its only deaths occurred inside a sealed space in")
w("the Imperial Capital, and the corpus gives no figure for them.")
w("")
w("The decisive feature of the war is that almost none of it was a contest. The Empire's advantage was")
w("mass; every phase was engineered to make mass irrelevant — a feigned defeat that drew the armour")
w("into a killing ground, a labyrinth that severed formations and revived its own defenders on a")
w("three-hour cycle, and an air corps annihilated in a single action. The war ended not by conquest")
w("but by armistice, followed by a settlement in which Tempest declined to prosecute the imperial")
w("leadership, backed a new emperor, and repatriated its prisoners.")
w("")

w("## Campaign Scope")
w("")
w("This dataset covers the Tempest–Eastern Empire War as a **continuous military campaign**, not only")
w("its days of combat. The campaign window opens at imperial mobilisation and closes at the post-war")
w("settlement. The month-long imperial approach march is campaign data and is represented frame by")
w("frame in the grid.")
w("")
w("Deliberately **excluded**: the Feldway and Michael conflict that occupies most of Volume 16. It is")
w("a separate later war and is not absorbed into this one. See AMB-013.")
w("")

w("## Source Corpus")
w("")
w("| Volume | Language of the supplied text | Role |")
w("|---|---|---|")
w("| Volume 12 | Indonesian translation | Orders of battle, mobilisation, pre-war reconnaissance |")
w("| Volume 13 | Indonesian translation | Approach march, first contact, surface battle, labyrinth |")
w("| Volume 14 | Indonesian translation | Imperial Capital coup, blockade, dragon engagement |")
w("| Volume 15 | Indonesian translation | Dwargon eastern front, capital confrontation, armistice |")
w("| Volume 16 | English edition | Post-war settlement (Chapter 3 only) |")
w("")
w("Evidence fields carry volume and chapter pointers. Novel text is not reproduced anywhere in this")
w("dataset. The supplied PDFs are not reliably paginated, so page numbers read `not paginated`.")
w("")

w("## Reconstruction Methodology")
w("")
w("The hierarchy runs strictly one way:")
w("")
w("```")
w("SOURCE EVIDENCE → ATOMIC EVENTS → EVENT GRAPH → 10-MINUTE KEYFRAMES")
w("                                                      → BATTLEFIELD STATE → EXCEL → MARKDOWN")
w("```")
w("")
w("Events are changes. Keyframes are snapshots. An event says *what changed*; a keyframe says *what")
w("the battlefield looks like*. Every keyframe carries full state whether or not an event occurs in it.")
w("")
w("Where nothing changes, the previous state is carried forward and the frame reads `INHERITED_STATE`.")
w("`UNKNOWN` is reserved for state that genuinely cannot be established from the corpus, and is never")
w("used for unchanged state, never converted to zero, and never replaced by an estimate.")
w("")

w("## Canonical vs Reconstructed Time")
w("")
w("The corpus contains **no clock times and no calendar dates** for any campaign event. It gives event")
w("order, force compositions, casualty figures, and a small set of relative durations. Every `HH:MM`")
w("and every date here is therefore `SIMULATION_RECONSTRUCTED`.")
w("")
w("| Canonical statement | Event | Simulation placement | Basis |")
w("|---|---|---|---|")
w("| Under six seconds to close 100 m | EVT-0103 | One frame | EXPLICIT_RELATIVE |")
w("| Ten minutes elapsed | EVT-0112 | Exactly one frame after EVT-0111 | EXPLICIT_RELATIVE |")
w("| Less than an hour | EVT-0203 | Six frames maximum | EXPLICIT_RELATIVE |")
w("| Three hours before the dead revive | EVT-0206 | 18-frame cycle | EXPLICIT_RELATIVE |")
w("| A month since the subordinates' gathering | EVT-0012 | D−8 (= R+30 exactly) | EXPLICIT_RELATIVE |")
w("| About twenty-nine days or more until arrival, but slower | EVT-0003 | contact at R+38 | EXPLICIT_RELATIVE |")
w("| Late at night | EVT-0312, EVT-0330 | Evening block | DAY_LEVEL_CANON |")
w("| Several days after Yuuki's report | EVT-0310 | D+4 | SIMULATION_RECONSTRUCTED |")
w("")
w("Never read a timestamp in this dataset as canon. The novel does not say D+4; D+4 is a simulation")
w("placement at MEDIUM confidence.")
w("")

w("## Campaign Clock")
w("")
w("Five clocks are maintained separately and must not be conflated:")
w("")
w("| Clock | Meaning | Example |")
w("|---|---|---|")
w("| `Campaign_Time` | Measured from campaign start (mobilisation) | `C+30:06:20` |")
w("| `Battle_Time` | Measured from first contact | `B+00:06:20` |")
w("| `Canonical_Time` | What the corpus actually says, verbatim in field | `a month has passed` |")
w("| `Simulation_Time` | The reconstructed HH:MM placement | `06:20` |")
w("| `Calendar_Date` | Artificial marker calendar | `31/01/9001` |")
w("")
w("| Parameter | Value |")
w("|---|---|")
w("| Resolution | 10 minutes = 1 keyframe |")
w("| Frames per hour | 6 |")
w(f"| Frames per day | {FPD} |")
w("| Final daily bucket | 23:50–23:59 (never 23:50–24:00) |")
w(f"| Total keyframes | {len(R):,} |")
w("| Rendering | The engine interpolates *between* keyframes at 18–24 FPS. No sub-frame rows exist. |")
w("")

w("## Campaign Duration")
w("")
w("| Boundary | War day | Date | Frame | Source |")
w("|---|---|---|---|---|")
for s in D.CAMPAIGN_STAGES:
    sf = (s[2] - FIRST_DAY) * FPD + 1
    dd = (dt.date(*D.CAMPAIGN_START_DATE) + dt.timedelta(days=s[2] - FIRST_DAY)).strftime("%d/%m/%Y")
    w(f"| {s[0]}. {s[1]} | D{s[2]:+d} | {dd} | FRAME_{sf:04d} | {s[6]} |")
w("")
w(f"**Total campaign duration: {D.CAMPAIGN_DAYS} days** — {len(R):,} keyframes, continuous, no gaps.")
w("")

w("## War Start")
w("")
w("The campaign begins at **imperial mobilisation** (EVT-0001, V12 Ch4), not at first contact. This is")
w("the earliest defensible operational point: it is where the Empire commits to war and releases its")
w("field army. The advance itself begins the following day (EVT-0003, V13 Prologue), against an")
w("expected arrival of about twenty-nine days.")
w("")
w("The approach is not empty. The corpus establishes a month with no movement, a deliberate slowing to")
w("display imperial power, forest fauna fleeing the column, a forced border crossing contrary to")
w("Western international law, the blockade of Dwargon's eastern gate, allied command negotiations,")
w("a halt-and-deploy, and 700,000 troops marching into the forest — all before a shot is fired.")
w("")
w("`Approach_Progress_Pct` runs 0→100 across this window so a renderer can animate the column moving")
w("west. The endpoints are canonical; the intermediate positions are linear interpolation and are")
w("labelled simulation. See AMB-014.")
w("")

w("## First Contact")
w("")
w(f"**FRAME_{CONTACT+1:04d}** — EVT-0102, the Green Legion surprise attack at the Dwargon Gate Front,")
w("with Gobta assuming direct command. This is the `Battle_Time` zero point.")
w("")
w("The preceding frame records EVT-0100: a Tempest element of about one hundred closing to ten")
w("kilometres, inside the effective envelope of the Magic Guided Cannon (maximum range thirty")
w("kilometres, effective about three). The Empire holds the first-fire advantage at the moment of")
w("contact and loses the battle anyway.")
w("")

w("## War Phases")
w("")
w("| Phase | Span | Theatres | Outcome |")
w("|---|---|---|---|")
w("| STRATEGIC_PREPARATION | D−30 | Imperial Capital | Mobilisation ordered |")
w("| OPERATIONAL_APPROACH | D−29 to D−4 | Dwargon Gate, Dwargon East | Border forced; eastern gate blockaded |")
w("| DEPLOYMENT | D−3 to D−1 | Dwargon Gate | Column halts; 700,000 enter the forest |")
w("| FIRST_CONTACT | D+0 06:20 | Dwargon Gate | Tempest opens the battle |")
w("| ACTIVE_COMBAT | D+0 to D+3 | Dwargon Gate, Labyrinth | 770,000 imperial dead |")
w("| SECOND_OFFENSIVE | D+4 to D+6 | Capital, Dwargon East, Dragon Theatre | Coup pre-empted; Hybrid Legion consumed; dragon duel in stasis |")
w("| TERMINATION_AND_SETTLEMENT | D+7 | Capital, Settlement | Armistice, treaty, succession, repatriation |")
w("")

w("## Theatres")
w("")
w("Six theatres carry independent state. Two or more are frequently live in the same keyframe, and one")
w("never overwrites another. At the settlement, all six are simultaneously live.")
w("")
w("| ID | Theatre | Region | First event | Peak battle status |")
w("|---|---|---|---|---|")
for tid, (name, region) in D.THEATERS.items():
    first = next((e[0] for e in D.EVENTS if e[5] == tid), "—")
    w(f"| {tid} | {name} | {region} | {first} | CONCLUDED |")
w("")
w(f"Maximum concurrent live theatres: **{max(val(r,'Active_Theaters').count(';')+1 for r in R)}**.")
w("")

# ============================================================ summaries
w("## Army Strength Summary")
w("")
w("### Eastern Empire")
w("")
w("| Force ID | Formation | Parent | Commander | Strength as stated | Final | Status |")
w("|---|---|---|---|---|---|---|")
for f in D.FORCES:
    if f[1] == "Eastern Empire":
        cur = f"{f[11]:,}" if isinstance(f[11], int) else "UNKNOWN"
        w(f"| {f[0]} | {f[3]} | {f[4]} | {f[5]} | {f[7]} | {cur} | {f[18]} |")
w("")
w("**Hierarchy — never sum across tiers.**")
w("")
w("```")
w("F-EMP-000  mobilisable, >2,000,000 (garrisons included)")
w("  └ F-EMP-001  immediately deployable, ~1,000,000")
w("      └ F-EMP-010  Jura invasion force, 940,000")
w("          ├ F-EMP-011  Mecha Modification Corps      700,000")
w("          ├ F-EMP-012  Magic Chariot Division        200,000")
w("          └ F-EMP-013  Air Combat Flying Corps        40,000")
w("      ├ F-EMP-020  Warcraft Legion, 30,000      (outside the 940,000)")
w("      └ F-EMP-030  Hybrid Legion, 200,000/100,000")
w("          └ F-EMP-031  field element, 60,000    (outside the 940,000)")
w("```")
w("")
w("### Jura-Tempest Federation and allies")
w("")
w("| Force ID | Formation | Parent | Commander | Strength as stated | Final | Status |")
w("|---|---|---|---|---|---|---|")
for f in D.FORCES:
    if f[1] != "Eastern Empire":
        cur = f"{f[11]:,}" if isinstance(f[11], int) else "UNKNOWN"
        w(f"| {f[0]} | {f[3]} | {f[4]} | {f[5]} | {f[7]} | {cur} | {f[18]} |")
w("")
w("First Corps 12,000 + Second Corps 37,000 + Third Corps 3,000 = about 52,000 standing troops against")
w("a national potential of 150,000. The Yellow and Orange Legions are components of the Second Corps;")
w("the Blue Legion and the Flying Dragon element are components of the Third Corps.")
w("")

w("## Casualty Summary")
w("")
w("| ID | Faction | Formation | Statement | Type | Estimate | Scope |")
w("|---|---|---|---|---|---|---|")
for c in CAS:
    est = f"{c[12]:,}" if isinstance(c[12], int) else "UNKNOWN"
    scope = c[22] or "UNKNOWN"
    w(f"| {c[0]} | {c[6]} | {c[8]} | {c[11]} | {scope.split('_')[0]} | {est} | {scope} |")
w("")
w("**Reconciled campaign totals** — EVENT_CASUALTY rows only, aggregates excluded:")
w("")
w("| Line | Figure |")
w("|---|---|")
w("| Empire KIA, Jura surface phase | 240,000 |")
w("| Empire KIA, Jura labyrinth phase | 530,000 |")
w("| **Empire KIA, Jura front total** | **770,000** |")
w("| Empire KIA, other theatres (Miranda + ritual sacrifice) | 60,001 |")
w("| **Empire KIA, campaign total** | **830,001** |")
w("| Tempest KIA, confirmed numeric | 0 |")
w("| Tempest KIA, not numerically stated | Shion and others (CAS-013), minimum 1 |")
w("| Empire POW, Jura surface phase | 0 (explicit) |")
w("| Empire POW, later phases | UNKNOWN (CAS-014) |")
w("| WIA, both sides, all phases | UNKNOWN |")
w("| MIA, both sides, all phases | UNKNOWN |")
w("")
w("CAS-003 (240,000), CAS-005 (10,000) and CAS-006 (770,000) are aggregates or components of other")
w("rows and are excluded from the arithmetic. Of the 940,000 committed to the Jura front, roughly")
w("**170,000 remain unaccounted for** and are carried as unknown rather than assumed dead.")
w("")
w("A correction made in this revision: nine casualty rows previously carried `WIA = 0`. The corpus")
w("never states zero wounded anywhere, so those were `UNKNOWN` silently converted to zero. All WIA")
w("fields now read `UNKNOWN`. The POW zeros are retained, because V13 Ch3 does explicitly state that")
w("no prisoners were taken in the surface phase.")
w("")

w("## Command Structure")
w("")
w("| ID | Commander | Faction | Role | Command scope | Status |")
w("|---|---|---|---|---|---|")
for c in D.COMMANDERS:
    w(f"| {c[0]} | {c[1]} | {c[2]} | {c[3]} | {c[4]} | {c[7]} |")
w("")
w("### Command changes")
w("")
w("| Event | Frame | Change |")
w("|---|---|---|")
for e in D.EVENTS:
    if e[13] in ("COMMAND_CHANGE", "ASSASSINATION") or e[0] in (
            "EVT-0117","EVT-0119","EVT-0207","EVT-0316","EVT-0348","EVT-0361","EVT-0394"):
        w(f"| {e[0]} | FRAME_{fidx(e[1],e[2])+1:04d} | {e[14]} |")
w("")

w("## Major Battles")
w("")
w("| Battle | Theatre | Phase | Empire committed | Empire lost | Tempest lost |")
w("|---|---|---|---|---|---|")
w("| Blockade of the Eastern Metropolis | TH-DWE | APPROACH → SECOND | 60,000 | 60,000 (own ritual) | 0 |")
w("| Battle of the Dwargon Gate | TH-DWG | ACTIVE_COMBAT | 240,000 | 240,000 | 0 |")
w("| Battle of the Labyrinth | TH-LAB | ACTIVE_COMBAT | 700,000 | 530,000+ | 0 |")
w("| Imperial Capital Coup Attempt | TH-CAP | SECOND_OFFENSIVE | — | 1 (Miranda) | 0 |")
w("| Dragon Engagement over the Great Jura Forest | TH-DRG | SECOND_OFFENSIVE | 1 | 0 | 0 |")
w("| Battle of the Dwargon Eastern Front | TH-DWE | SECOND_OFFENSIVE | UNKNOWN | UNKNOWN | UNKNOWN |")
w("| Imperial Capital Confrontation | TH-CAP | SECOND_OFFENSIVE | UNKNOWN | UNKNOWN | UNKNOWN (min 1) |")
w("| Warcraft Legion Air Movement | TH-CAP | SECOND_OFFENSIVE | 30,000 | 0 | 0 |")
w("")

w("## Major Individual Combatants")
w("")
w("| Actor | Faction | First | Last | Final status | Battlefield effect |")
w("|---|---|---|---|---|---|")
for a in D.COMBATANTS:
    w(f"| {a[1]} | {a[2]} | {a[3]} | {a[4]} | {a[5]} | {a[6]} |")
w("")

w("## Movement Summary")
w("")
w("| ID | Force | From | To | Type | Basis | Confidence |")
w("|---|---|---|---|---|---|---|")
for m in D.MOVEMENTS:
    w(f"| {m[0]} | {m[1]} | {m[2]} | {m[3]} | {m[6]} | {m[7]} | {m[8]} |")
w("")
w("No force teleports. Where only origin and destination are known, the transition is carried as")
w("`IN_TRANSIT` across intermediate frames and marked `SIMULATION_RECONSTRUCTED`. The one exception is")
w("MOV-015, Velgrynd's space-time jump, which the corpus establishes as instantaneous and whose")
w("destination is not stated — recorded as `UNKNOWN` rather than guessed. See AMB-009.")
w("")

w("## Territorial State")
w("")
w("| Location | Theatre | Before | After | Change event |")
w("|---|---|---|---|---|")
for t in D.TERRITORY:
    w(f"| {t[1]} | {t[2]} | {t[3]} | {t[4]} | {t[5]} |")
w("")
w("Troop presence is not treated as ownership. The Dwargon eastern metropolis was blockaded but never")
w("fell; the Great Jura Forest was burned but never changed hands; and no territory at all changed")
w("owner in the settlement.")
w("")

w("## Major Turning Points")
w("")
for n, (eid, txt) in enumerate([
 ("EVT-0015","The Imperial Army forces the Tempest border. The invasion becomes fact."),
 ("EVT-0020","Seven hundred thousand enter the forest — about seventy percent of imperial strength committed to one theatre."),
 ("EVT-0102","Tempest opens the battle. The Empire never regains the initiative."),
 ("EVT-0107","The chariot fortress encircles the Green Legion. Peak imperial position of the war."),
 ("EVT-0109","The feigned defeat. The Empire commits deeper into the trap."),
 ("EVT-0111","Blizzard Wolf Dance shatters the chariot mass. Ground battle decided."),
 ("EVT-0115","The Air Combat Flying Corps is annihilated entire. Air battle decided."),
 ("EVT-0118","Testarossa closes the retreat. Withdrawal becomes annihilation."),
 ("EVT-0201","The ground army enters the labyrinth. The decisive operational error of the campaign."),
 ("EVT-0315","Kondo kills Miranda. The internal coup collapses before it begins."),
 ("EVT-0332","Velgrynd destroys the labyrinth gate. Tempest's principal defensive asset is disabled."),
 ("EVT-0343","The Empire consumes 60,000 of its own troops in a ritual."),
 ("EVT-0363","The imperial objective is revealed as the capture of Veldora, not territory."),
 ("EVT-0384","The Empire proposes an armistice. The war ends."),
 ("EVT-0394","Masayuki is installed as emperor by Velgrynd. Tempest backs the successor state."),
], 1):
    e = next(x for x in D.EVENTS if x[0] == eid)
    w(f"{n}. **FRAME_{fidx(e[1],e[2])+1:04d} ({eid})** — {txt}")
w("")

# ============================================================ timeline
w("---")
w("")
w("# Full Campaign Timeline")
w("")
w(f"All {len(R):,} keyframes exist in the `Timeline` sheet of the workbook. This narrative compresses")
w("purely inherited frames for readability and presents the hours in which the campaign state")
w("meaningfully changes.")
w("")

hours = defaultdict(list)
for i, evs in EV_AT.items():
    hours[i // 6].extend((i, e) for e in evs)

cur_date = None
for hour in sorted(hours):
    frame0 = hour * 6
    r0 = R[frame0]
    date = val(r0, "Date")
    if date != cur_date:
        cur_date = date
        wd = val(r0, "Battle_Day")
        w(f"## {date}  ·  Campaign day C+{frame0//FPD:02d}  ·  Battle day D{wd:+d}")
        w("")
    evs = sorted(hours[hour])
    last = R[evs[-1][0]]
    h = val(r0, "Hour_Number")
    w(f"### {h:02d}:00–{h:02d}:59  ·  {val(last,'Campaign_Time')}  ·  {val(last,'Battle_Time')}")
    w("")
    w(f"**Phase:** {val(last,'Campaign_Phase')} · **Stage:** {val(last,'Campaign_Stage')}")
    w("")
    # hourly narrative
    acts = "; ".join(e[14] for _i, e in evs)
    w(f"**What happened.** {acts}.")
    w("")
    w(f"**Where.** {val(last,'Active_Fronts')}. **Battles:** {val(last,'Active_Battles')} "
      f"({val(last,'Battle_Status')}).")
    w("")
    w(f"**Who.** {val(last,'Major_Combatants_Active')}.")
    w("")
    w(f"- **Force state** — Tempest effective {val(last,'Tempest_Effective_Force'):,} of "
      f"{val(last,'Tempest_Total_Force'):,}; Empire effective {val(last,'Empire_Effective_Force'):,} of "
      f"{val(last,'Empire_Total_Force'):,}")
    w(f"- **Movement** — Tempest {val(last,'Tempest_Advancing')} (retreating: {val(last,'Tempest_Retreating')}); "
      f"Empire {val(last,'Empire_Advancing')} (retreating: {val(last,'Empire_Retreating')})")
    if val(last, "Approach_Progress_Pct_SIMULATED") not in (0, 100):
        w(f"- **Approach** — imperial column at {val(last,'Approach_Progress_Pct_SIMULATED')}% of the march "
          f"(simulation interpolation); {val(last,'Empire_Column_Location')}")
    w(f"- **Casualties** — Empire KIA {val(last,'Empire_KIA_Cumulative'):,} cumulative; "
      f"Tempest KIA {val(last,'Tempest_KIA_Cumulative')}; Empire POW {val(last,'Empire_POW_Cumulative')}; "
      f"WIA and MIA UNKNOWN both sides")
    w(f"- **Command** — {val(last,'Active_Commanders')}")
    w(f"- **Territorial state** — {val(last,'Territorial_Control')}")
    w(f"- **Frontline** — {val(last,'Frontline_State')}")
    w("")
    w("**Significance and frame detail**")
    w("")
    for i, e in evs:
        w(f"#### FRAME_{i+1:04d} — {val(R[i],'Datetime_Display')}")
        w("")
        w(f"**{e[0]} · {e[13]} — {e[14]}**")
        w("")
        w(f"- Theatre: {D.THEATERS[e[5]][0]} ({e[5]}) · Front: {e[6]} · Battle: {e[7]}")
        w(f"- Actor: {e[9]} ({e[10]}) vs {e[11]} ({e[12]}) at {e[8]}")
        w(f"- Immediate result: {e[15]}")
        w(f"- Operational consequence: {e[16]}")
        w(f"- Strategic significance: {e[17]}")
        if isinstance(e[20], int) and e[20]:
            w(f"- Losses booked here: {e[20]:,} KIA")
        w(f"- Graph: {e[32] or 'CAMPAIGN START'} → **{e[0]}** → {e[33] or 'CAMPAIGN END'}")
        w(f"- Canonical time: {e[3]} · Time basis: `{e[25]}` · Time confidence: {e[26]} · Overall: {e[28]}")
        w(f"- Source: {e[29]} {e[30]} — {e[31]}")
        if e[34]:
            w(f"- Note: {e[34]}")
        w("")
        w(f"State change: {val(R[i],'State_Change_From_Previous_Frame')}")
        w("")

# ============================================================ audits
w("---")
w("")
w("# Source Coverage Audit")
w("")
by_vol = defaultdict(list)
for e in D.EVENTS:
    by_vol[e[29]].append(e)

AUDIT = {
 "V12": ("FULL",
  "Ch2 (Tempest order of battle), Ch4 (imperial legions, mobilisation, intelligence estimate), Ch5 (aerial reconnaissance)",
  "Complete OOB both sides: >2,000,000 mobilisable, ~1,000,000 deployable, 700,000 / 200,000 (2,000 chariots) / 40,000 (400 airships), 30,000 Warcraft, 200,000-100,000 Hybrid, 150,000 Tempest potential, 52,000 standing, full corps and legion breakdown",
  "None stated in V12",
  "MOV-001, MOV-002",
  "Benimaru appointed Supreme General; corps commanders assigned; Calgurio, Gladim, Yuuki, Geist, Faraga, Minute identified",
  "Imperial Capital; Great Jura Forest; Dwargon approaches",
  "About twenty-nine days to arrival",
  "AMB-002 / CON-004 (the 113,000 figure)",
  "Non-military domestic content not extracted"),
 "V13": ("FULL",
  "Prologue, Ch1, Ch2, Ch3, Ch4, Ch5/Epilogue",
  "500/1,500/1,000 chariot dispositions; ~1,000 chariots in the fortress; ~100 airships remaining mid-battle; 700,000 committed; 700,000 = ~70% of imperial strength; Magic Guided Cannon 30 km max / ~3 km effective",
  "240,000 surface KIA (200,000 + 40,000); 530,000+ labyrinth KIA; 10,000 in under an hour; 0 POW; 0 Tempest losses; 770,000 total",
  "MOV-003 to MOV-007, MOV-018 to MOV-022",
  "Faraga killed; Geist orders withdrawal and is lost; Calgurio confronts failure; Gadra defects",
  "Tempest border; inn town; ten-kilometre line; Dwargon Gate; airspace; supply echelon; labyrinth incl. Floor 70; Dwargon Isthmus gate",
  "Under six seconds; ten minutes; less than an hour; three hours; a month elapsed; twenty-nine days",
  "AMB-001 / CON-001 (garbled invasion total), AMB-003, AMB-005, AMB-014, CON-005, CON-006",
  "Domestic and interpersonal scenes not extracted"),
 "V14": ("FULL WITH EXCLUSIONS",
  "Prologue (clown faction), Ch3 (Imperial Capital Chaos), Ch4 (blockade camp), Epilogue (dragon engagement)",
  "60,000 blockading the eastern metropolis; clown faction membership enumerated; Hybrid Legion staff named",
  "Miranda killed (CAS-011)",
  "MOV-008, MOV-009",
  "Miranda eliminated; Kondo obtains the conspiracy via Reader; blockade force loses all authorised command",
  "Imperial Capital back streets; Dwargon eastern metropolis; Jura airspace; labyrinth gate and upper floors; Rimuru city",
  "Several days after Yuuki's report; late at night; on that important day; not a second was needed",
  "AMB-006 (join between the Jura phase and the second phase)",
  "Reward and evolution ceremonies (Ch1) and future-policy discussion (Ch2) are non-military and excluded"),
 "V15": ("FULL WITH EXCLUSIONS",
  "Prologue, Ch1 (Time of Despair), Ch2 (The Power of Liberation), Ch3 (The Intensified Battlefield), Ch4 (Eight Gates), Ch5 (The Truth of the Emperor), Epilogue",
  "60,000 expended in the ritual; 500 Dwargon Sky Knights; 100 Flying Dragons lifting the Colossus; 300 airships carrying 30,000 Warcraft Legion",
  "60,000 ritual sacrifice (CAS-012); Shion and others killed, number not stated (CAS-013)",
  "MOV-010 to MOV-016",
  "Gazel withholds the heavy assault force and commits the Sky Knights; Gabil delegates command to Dorf; Velgrynd revealed as Marshal and orders Gladim",
  "Dwargon eastern front; ritual position; sealed space in the Imperial Capital; airspace over northern Ingracia",
  "At the same time as Rimuru's infiltration; a little late; hardly arrived before the war began",
  "AMB-008 (Ch4-5 structure), AMB-009 (jump destination), AMB-010, AMB-011, CON-003",
  "Skill-level and metaphysical content in Ch4-Ch5 does not map to battlefield state; recorded at chapter level"),
 "V16": ("PARTIAL BY DESIGN",
  "Ch3 (Toward Rebuilding) only",
  "More than two-thirds of imperial war power lost (qualitative)",
  "Captured imperial forces repatriated, number not stated (CAS-014); imperial flagship dead restored (CAS-015); two-thirds war power (CAS-016)",
  "MOV-017",
  "Masayuki installed as emperor by Velgrynd; Caligulio and Minitz confirmed surviving; Testarossa appointed ambassador",
  "Imperial Capital; highways and the Magitank route; embassy",
  "None stated",
  "AMB-012 (prisoner numbers), AMB-013 (scope boundary), CON-002, CON-003",
  "DELIBERATELY EXCLUDED: the Prologue, Ch1 and Ch2 Feldway/Michael conflict is a separate later war"),
}
for vol in ["V12","V13","V14","V15","V16"]:
    evs = by_vol.get(vol, [])
    a = AUDIT[vol]
    frames = sorted({fidx(e[1], e[2]) + 1 for e in evs})
    w(f"### Volume {vol[1:]} — COVERAGE: {a[0]}")
    w("")
    w(f"- **Relevant chapters:** {a[1]}")
    w(f"- **Atomic events extracted:** {len(evs)} — {', '.join(e[0] for e in evs)}")
    w(f"- **Keyframes affected:** {len(frames)} (FRAME_{frames[0]:04d} to FRAME_{frames[-1]:04d})")
    w(f"- **Army-size facts:** {a[2]}")
    w(f"- **Casualty facts:** {a[3]}")
    w(f"- **Movement facts:** {a[4]}")
    w(f"- **Command facts:** {a[5]}")
    w(f"- **Geographic facts:** {a[6]}")
    w(f"- **Temporal facts:** {a[7]}")
    w(f"- **Unresolved issues:** {a[8]}")
    w(f"- **Excluded material:** {a[9]}")
    w("")

w("---")
w("")
w("# Contradiction Register")
w("")
for c in D.CONTRADICTIONS:
    w(f"### {c[0]} — {c[1]}")
    w("")
    w(f"- **Claim A** ({c[4]}): {c[2]}")
    w(f"- **Claim B** ({c[5]}): {c[3]}")
    w(f"- **Resolution:** {c[6]}")
    w(f"- **Final treatment:** {c[7]}")
    w(f"- **Confidence:** {c[8]}")
    w("")

w("---")
w("")
w("# Temporal Ambiguity Register")
w("")
for a in D.AMBIGUITIES:
    w(f"### {a[0]} — {a[1]}")
    w("")
    w(f"- **Events:** {a[2]}")
    w(f"- **Ambiguity / possible order:** {a[3]}")
    w(f"- **Chosen simulation placement:** {a[4]}")
    w(f"- **Confidence:** {a[5]}")
    w("")

w("---")
w("")
w("# Canonical vs Simulation Audit")
w("")
w("| Information type | Classification |")
w("|---|---|")
for k, v in [
 ("Force compositions and troop figures","CANONICAL"),
 ("Casualty figures (240,000 / 530,000 / 10,000 / 60,000 / 770,000 / zeros)","CANONICAL"),
 ("Order of events within each phase and theatre","CANONICAL"),
 ("Commander names, ranks, appointments, deaths","CANONICAL"),
 ("Locations and their relationships","CANONICAL"),
 ("Tactical detail (dispositions, feint, boarding, Colossus, Sky Knights, space-time jump)","CANONICAL"),
 ("Settlement terms (treaty, succession, repatriation, embassy, reconstruction)","CANONICAL"),
 ("Weapon envelopes (30 km max, ~3 km effective)","CANONICAL"),
 ("Six relative durations (six seconds, ten minutes, an hour, three hours, a month, twenty-nine days)","EXPLICIT_RELATIVE"),
 ("Mobilisation, border crossing, blockade start, labyrinth entry, dragon engagement","DAY_LEVEL_CANON"),
 ("Ordering of events with no stated interval","SEQUENTIAL_CANON"),
 ("Every HH:MM placement in the dataset","SIMULATION_RECONSTRUCTED"),
 ("Every calendar date, including the campaign anchor","SIMULATION_RECONSTRUCTED"),
 ("The 38-day campaign span and its internal stage boundaries","SIMULATION_RECONSTRUCTED"),
 ("Approach_Progress_Pct intermediate positions","SIMULATION_RECONSTRUCTED"),
 ("Three-day labyrinth duration (AMB-005)","SIMULATION_RECONSTRUCTED"),
 ("Same-day join between Jura phase and second phase (AMB-006)","SIMULATION_RECONSTRUCTED"),
 ("Arrival time of Veyron and Zonda","SIMULATION_RECONSTRUCTED"),
 ("The 940,000 invasion total, reconciled from components","INFERRED"),
 ("The 170,000 residual carried as unaccounted","INFERRED"),
 ("That the 60,000 ritual sacrifice sits outside the 940,000","INFERRED"),
 ("That the 70% figure is measured against deployable, not mobilisable, strength","INFERRED"),
 ("WIA and MIA, both sides, all phases","UNKNOWN"),
 ("Tempest deaths in the sealed space","UNKNOWN"),
 ("Imperial prisoners repatriated; flagship personnel restored","UNKNOWN"),
 ("Warcraft Legion destination after the jump","UNKNOWN"),
 ("Headcounts: Shion's unit, Dwarf Knights, Mechs Legion, labyrinth garrison, Kurenai advance force","UNKNOWN"),
 ("Fate of ~170,000 imperial personnel on the Jura front","UNKNOWN"),
]:
    w(f"| {k} | `{v}` |")
w("")

w("---")
w("")
w("# Death, Revival and Prisoner Status Register")
w("")
w("A casualty event is never erased by a later reappearance. Where the corpus shows personnel alive")
w("after a recorded death, the death record is retained and the reappearance is carried as a separate")
w("status, so the historical sequence survives in the animation model.")
w("")
w("| ID | Subject | Death event | Death record | Revival event | Final status |")
w("|---|---|---|---|---|---|")
for r_ in D.REVIVALS:
    w(f"| {r_[0]} | {r_[1]} | {r_[3]} | {r_[4]} | {r_[5]} | {r_[6]} |")
w("")
for r_ in D.REVIVALS:
    w(f"- **{r_[0]}** — {r_[7]} ({r_[8]}, confidence {r_[9]})")
w("")
w("---")
w("")
w("# Temporal Constraint Graph")
w("")
w(f"All {len(D.CONSTRAINTS)} machine-checked constraints pass against the final simulation placement.")
w("")
w("| ID | Type | A | B | Requirement | Canonical basis |")
w("|---|---|---|---|---|---|")
for c_ in D.CONSTRAINTS:
    w(f"| {c_[0]} | {c_[1]} | {c_[2]} | {c_[3]} | {c_[4] if c_[4] is not None else '—'} | {c_[5]} |")
w("")
w("---")
w("")
w("# Limitations")
w("")
w("1. **The 50-day campaign window is a simulation window, not a canonical duration.** No passage")
w("   states how long the war lasted. Only two intervals inside it are canonically constrained: the")
w("   month from the subordinates' gathering, and the fact that arrival exceeded the ~29-day forecast.")
w("   Everything else is sequence plus reconstruction. See AMB-017.")
w("2. **No clock time in this dataset is canonical.** Not one. Every HH:MM is simulation placement.")
w("3. **The reference point is an interpretation.** The month and 29-day anchors are read as measured")
w("   from the V12 Ch2 subordinates' gathering. If that reading is wrong the entire approach window")
w("   shifts, though its internal order would not. See AMB-016.")
w("4. **The second-phase gap is the weakest join.** \"Several days\" is modelled as exactly three. See AMB-006.")
w("5. **Wounded and missing are unknown for both sides in every phase.** The corpus gives no figure")
w("   anywhere, and none has been invented.")
w("6. **Roughly 170,000 imperial personnel are unaccounted for** on the Jura front. Their disposition")
w("   is not stated and they are not assumed dead.")
w("7. **Approach_Progress_Pct is not a measured distance.** It is linear interpolation between two")
w("   source-supported endpoints, exposed for animation only.")
w("8. **Source pages are not cited.** The supplied PDFs are not reliably paginated; the field reads")
w("   `not paginated` rather than carrying invented page numbers.")
w("")
w("---")
w("")
w("# Final Disclosure")
w("")
w("**1. What the novels directly support.** Every force composition and troop figure; every casualty")
w("number; the order of events within each phase; all commanders, their appointments and their deaths;")
w("all locations; the tactical conduct of both battles; the weapon envelopes; and the entire post-war")
w("settlement. This is the majority of the dataset's substance.")
w("")
w("**2. What is reconstructed for simulation.** All timing precision below the day level. Every clock")
w("time, every calendar date, the campaign span, the internal stage boundaries, the three-day labyrinth")
w("duration, the distribution of approach events across the month, and the interpolated position of the")
w("imperial column. None of this is canon and all of it is labelled.")
w("")
w("**3. What is inferred.** The 940,000 invasion total, reconciled from three stated components against")
w("a garbled sum. That the 60,000 ritual sacrifice sits outside that total. That the \"seventy percent\"")
w("figure is measured against deployable rather than mobilisable strength. The 170,000 residual.")
w("")
w("**4. What remains unknown.** Wounded and missing on both sides throughout — the corpus gives no")
w("figure anywhere. Tempest deaths in the sealed space. Prisoner counts. The Warcraft Legion's")
w("destination. Six formation headcounts. The fate of roughly 170,000 imperial personnel.")
w("")
w("**5. Strongest periods.** D+0 to D+3, the Jura campaign, is the best-supported stretch in the")
w("dataset: 47 atomic events from Volume 13 with named commanders, exact dispositions, reconciling")
w("casualty figures and four explicit duration anchors. The post-war settlement at D+7 is also strong,")
w("drawn from the official English edition with an unambiguous attendee list and terms.")
w("")
w("**6. Weakest periods.** Three, in order of concern. The join between the Jura phase and the second")
w("phase (AMB-006) is the single weakest link — the corpus gives no interval at all, and D+4 is pure")
w("placement. The month-long approach (AMB-014) has canonical endpoints and a canonical \"a month has")
w("passed\", but every intermediate position is interpolation. And Volume 15 Chapters 4–5 (AMB-008)")
w("concern the metaphysics of the imperial throne rather than force-on-force battle, so they resist")
w("atomic military decomposition in a way the rest of the corpus does not.")
w("")
w("Nothing in this dataset is fabricated. Where the corpus is silent, the field reads `UNKNOWN`.")
w("")

open("Tempest_Eastern_Empire_War_Timeline.md", "w").write("\n".join(L))
print("markdown lines:", len(L))
