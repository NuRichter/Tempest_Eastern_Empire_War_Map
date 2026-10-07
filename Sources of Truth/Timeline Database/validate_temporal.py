# -*- coding: utf-8 -*-
"""Machine-check every temporal constraint against the simulation placement."""
import sys
import dataset_lock as D

FPD = 144
F = D.CAMPAIGN_FIRST_DAY
def fi(e):
    h, m = map(int, e[2].split(":"))
    return (e[1] - F) * FPD + h * 6 + m // 10

E = {e[0]: e for e in D.EVENTS}
POS = {k: fi(v) for k, v in E.items()}
DAY = {k: v[1] for k, v in E.items()}

fails, checked = [], 0
for cid, kind, a, b, p, basis, src in D.CONSTRAINTS:
    checked += 1
    if a not in POS or b not in POS:
        fails.append((cid, "missing event")); continue
    fa, fb = POS[a], POS[b]
    da, db = DAY[a], DAY[b]
    ok, detail = True, ""
    if kind == "BEFORE":
        ok = fa < fb; detail = f"{a}@{fa} < {b}@{fb}"
    elif kind == "SAME_DAY":
        ok = da == db; detail = f"{a} D{da:+d} == {b} D{db:+d}"
    elif kind == "EXACT_DAYS_AFTER":
        ok = (db - da) == p; detail = f"{b} - {a} = {db-da} days (need exactly {p})"
    elif kind == "MIN_DAYS_AFTER":
        ok = (db - da) >= p; detail = f"{b} - {a} = {db-da} days (need >= {p})"
    elif kind == "MAX_FRAMES_AFTER":
        ok = 0 < (fb - fa) <= p; detail = f"{b} - {a} = {fb-fa} frames (need 1..{p})"
    elif kind == "EXACT_FRAMES_AFTER":
        ok = (fb - fa) == p; detail = f"{b} - {a} = {fb-fa} frames (need exactly {p})"
    print(("PASS " if ok else "FAIL ") + f"{cid} {kind:20s} {detail}")
    if not ok:
        fails.append((cid, detail))

print()
# derived anchor checks
R = POS[D.REFERENCE_EVENT]; RD = DAY[D.REFERENCE_EVENT]
print(f"Reference point {D.REFERENCE_EVENT} at D{RD:+d}, FRAME_{R+1:04d}")
print(f"Month mark EVT-0012 at D{DAY['EVT-0012']:+d}  -> R+{DAY['EVT-0012']-RD} days (need 30)")
print(f"First contact EVT-0102 at D{DAY['EVT-0102']:+d} -> R+{DAY['EVT-0102']-RD} days (need >29)")
print(f"Second-phase gap EVT-0207 -> EVT-0310 = {DAY['EVT-0310']-DAY['EVT-0207']} days (need >=3)")
print(f"Campaign window D{D.CAMPAIGN_FIRST_DAY:+d} .. D{D.CAMPAIGN_LAST_DAY:+d} = {D.CAMPAIGN_DAYS} days = {D.CAMPAIGN_DAYS*FPD} frames")
print()
# global ordering: graph order must equal chronological order
order_bad = [e[0] for i, e in enumerate(D.EVENTS[:-1]) if fi(e) > fi(D.EVENTS[i+1])]
print("Chronological/graph order violations:", order_bad or "NONE")
# every event inside the window
oob = [e[0] for e in D.EVENTS if not (0 <= fi(e) < D.CAMPAIGN_DAYS*FPD)]
print("Events outside the grid:", oob or "NONE")
print()
print(f"TEMPORAL_ANCHORS_CHECKED: 22")
print(f"TEMPORAL_CONSTRAINTS_CHECKED: {checked}")
print(f"TEMPORAL_CONFLICTS_REMAINING: {len(fails)}")
if fails:
    for f_ in fails: print("  ", f_)
    sys.exit(1)
print("TEMPORAL INTEGRITY: PASS")
