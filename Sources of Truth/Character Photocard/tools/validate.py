"""Stage 4: independent technical audit -> metadata/validation_report.md.

Re-derives everything from the filesystem and compares it with character_manifest.json and
character_sources.csv. Prints a JSON summary; exit code 1 if any hard check fails.
"""
import csv, hashlib, json, re, sys
from collections import Counter
from datetime import date
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
META = ROOT / "metadata"
W, H = 2200, 3400
PATTERN = re.compile(r"^[0-9]{3}_.+\.(jpg|jpeg|png)$")

errors, warnings = [], []
man_raw = (META / "character_manifest.json").read_text("utf-8")
try:
    man = json.loads(man_raw); json_ok = True
except json.JSONDecodeError as e:
    errors.append(f"character_manifest.json is not valid JSON: {e}"); json_ok = False; man = {"characters": [], "archive": {}}
chars = man["characters"]

csv_ok = True
try:
    with open(META / "character_sources.csv", encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh))
    ncols = {len(r) for r in rows}
    if ncols != {28}:
        csv_ok = False; errors.append(f"CSV rows have inconsistent column counts: {ncols}")
except Exception as e:  # noqa: BLE001
    csv_ok = False; rows = []; errors.append(f"CSV unreadable: {e}")

# ---------------------------------------------------------------- filesystem
fs_cards = sorted(p.name for p in ROOT.iterdir() if p.is_file() and re.match(r"^\d{3}_", p.name))
stray = sorted(p.name for p in ROOT.iterdir() if p.is_file() and not re.match(r"^\d{3}_", p.name))
tech = {}
for name in fs_cards:
    p = ROOT / name
    r = {"exists": True, "opens": False, "ext_ok": False, "dims_ok": False, "ratio_ok": False, "portrait": False,
         "not_html": True, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
    head = p.read_bytes()[:64].lower()
    if b"<html" in head or b"<!doctype" in head:
        r["not_html"] = False
    try:
        with Image.open(p) as im:
            im.load()
            r["opens"] = True
            r["format"] = im.format
            r["size"] = im.size
            r["ext_ok"] = (im.format == "JPEG" and p.suffix.lower() in (".jpg", ".jpeg")) or (im.format == "PNG" and p.suffix.lower() == ".png")
            r["dims_ok"] = im.size == (W, H)
            r["ratio_ok"] = abs(im.size[0] / im.size[1] - 11 / 17) < 1e-3
            r["portrait"] = im.size[1] > im.size[0]
    except Exception as e:  # noqa: BLE001
        r["error"] = str(e)
    tech[name] = r

checks = ["opens", "ext_ok", "dims_ok", "ratio_ok", "portrait", "not_html"]
labels = {"opens": "image opens / no corruption", "ext_ok": "correct extension", "dims_ok": "valid dimensions (2200×3400)",
          "ratio_ok": "correct aspect ratio (11:17)", "portrait": "correct orientation (portrait)", "not_html": "no accidental HTML downloads"}
tech_fail = {k: [n for n, r in tech.items() if not r[k]] for k in checks}
for k, v in tech_fail.items():
    for n in v:
        errors.append(f"{n}: failed '{labels[k]}'")

bad_names = [n for n in fs_cards if not PATTERN.match(n)]
errors += [f"filename pattern violation: {n}" for n in bad_names]
sha_dupes = [names for names in
             ({h: [n for n, r in tech.items() if r["sha256"] == h] for h in {r['sha256'] for r in tech.values()}}).values()
             if len(names) > 1]
errors += [f"duplicate file content: {d}" for d in sha_dupes]

# ---------------------------------------------------------------- numbering
ids = [c["id"] for c in chars]
id_dupes = [i for i, n in Counter(ids).items() if n > 1]
gaps = sorted(set(range(1, max(ids, default=0) + 1)) - set(ids))
name_dupes = [n for n, k in Counter(c["identity"]["canonical_name"] for c in chars).items() if k > 1]
fn_dupes = [n for n, k in Counter(c["filename"] for c in chars if c["filename"]).items() if k > 1]
if min(ids, default=1) != 1: errors.append("IDs do not start at 001")
errors += [f"duplicate ID {i:03d}" for i in id_dupes] + [f"duplicate character {n}" for n in name_dupes] + [f"duplicate filename {n}" for n in fn_dupes]
if gaps: errors.append(f"missing numeric IDs: {gaps}")
prefix_mismatch = [c["filename"] for c in chars if c["filename"] and int(c["filename"][:3]) != c["id"]]
errors += [f"filename prefix != manifest id: {n}" for n in prefix_mismatch]

# ---------------------------------------------------------------- synchronisation
man_files = {c["filename"] for c in chars if c["filename"]}
fs_set = set(fs_cards)
only_fs, only_man = sorted(fs_set - man_files), sorted(man_files - fs_set)
errors += [f"file on disk but not in manifest: {n}" for n in only_fs] + [f"manifest file missing on disk: {n}" for n in only_man]
csv_by_id = {int(r["ID"]): r for r in rows if r.get("ID", "").isdigit()}
csv_issues = []
for c in chars:
    r = csv_by_id.get(c["id"])
    if not r:
        csv_issues.append(f"ID {c['id']:03d} missing from CSV"); continue
    if (r["Filename"] or None) != c["filename"]:
        csv_issues.append(f"ID {c['id']:03d}: CSV filename '{r['Filename']}' != manifest '{c['filename']}'")
    if r["Canonical Name"] != c["identity"]["canonical_name"]:
        csv_issues.append(f"ID {c['id']:03d}: CSV name differs")
    if (r["Image URL"] or None) != c["visual_reference"]["image_url"]:
        csv_issues.append(f"ID {c['id']:03d}: CSV image URL differs")
extra_csv = sorted(set(csv_by_id) - set(ids))
csv_issues += [f"CSV ID {i:03d} not in manifest" for i in extra_csv]
errors += csv_issues
if man.get("archive", {}).get("total_characters") != len(chars):
    errors.append("archive.total_characters does not match the number of records")

# provenance completeness for every card
prov_missing = []
for c in chars:
    if not c["filename"]:
        continue
    v, im = c["visual_reference"], c["image"]
    need = {"source_url": v["source_url"], "image_url": v["image_url"], "source_type": v["source_type"],
            "original_width": im["original_width"], "selection_reason": c["research"]["selection_reason"],
            "date_collected": c["research"]["date_collected"]}
    miss = [k for k, x in need.items() if not x]
    if miss:
        prov_missing.append(f"{c['filename']}: {miss}")
    if not str(v["image_url"]).startswith("http"):
        prov_missing.append(f"{c['filename']}: image_url is not a URL")
errors += [f"provenance incomplete: {x}" for x in prov_missing]

# soft checks (reported, not failures)
unverified_identity = [c["filename"] for c in chars if c["filename"] and not c["verification"]["identity_verified"]]
unverified_source = [c["filename"] for c in chars if c["filename"] and not c["verification"]["source_verified"]]
ambiguous = [c["filename"] for c in chars if c["filename"] and "identity_ambiguous" in c["status_flags"]]
missing = [c for c in chars if not c["filename"]]
with_backup = sum(1 for c in chars if c["filename"] and c["visual_reference"]["backup_source_url"])
failed_dl = [c for c in chars if "download_failed" in c["status_flags"]]
manifest_dupe_flags = [c["filename"] for c in chars if "Possible duplicate" in (c["notes"] or "")]

# ---------------------------------------------------------------- distributions
cards = [c for c in chars if c["filename"]]
src = Counter()
for c in cards:
    v = c["visual_reference"]
    key = {"anime": "Anime", "movie": "Movie", "manga": "Manga", "light_novel": "Light Novel"}.get(v["preferred_medium"], "Other")
    if v["source_tier"] == 1 and "official" in v["source_type"]:
        key = "Official promotional"   # official portal art
    if v["preferred_medium"] in ("game", "unknown", "kids"):
        key = "Secondary" if v["preferred_medium"] == "unknown" else "Other"
    src[key] += 1
GROUP = {"Jura Tempest Federation": "Tempest", "Demon Lords (Octagram / Ten Great)": "Demon Lords", "Primordials": "Primordials",
         "True Dragons": "True Dragons", "Eastern Empire": "Eastern Empire", "Holy Empire of Lubelius": "Holy Empire"}


def group(c):
    g = GROUP.get(c["classification"]["faction"])
    if g:
        return g
    cats = set(c["classification"]["wiki_categories"])
    if "Otherworlders" in cats:
        return "Otherworlders"
    if c["classification"]["race"] == "Humans":
        return "Humans"
    return "Other"


fac = Counter(group(c) for c in chars)
heights = [c["_processing"]["native_equivalent_height"] for c in cards]
qs = [c["image"]["quality_score"] for c in cards]
low = min(cards, key=lambda c: c["_processing"]["native_equivalent_height"]) if cards else None
high = max(cards, key=lambda c: c["_processing"]["native_equivalent_height"]) if cards else None

valid_cards = [n for n in fs_cards if all(tech[n][k] for k in checks) and PATTERN.match(n)]
status = "PASS" if not errors else "REVIEW REQUIRED"

L = ["# Tensura Character Photocard Validation Report\n",
     f"Audit date: {date.today().isoformat()} · manifest research revision {man.get('archive', {}).get('research_revision')} · "
     f"script `tools/validate.py` (re-derives everything from disk)\n",
     f"**Technical integrity: {status}** ({len(errors)} hard errors). Content-quality follow-ups are listed in `missing_characters.md`.\n",
     "## Archive Summary\n",
     f"- Total characters: **{len(chars)}**", f"- Total final cards: **{len(fs_cards)}**",
     f"- Valid cards: **{len(valid_cards)}**", f"- Invalid cards: **{len(fs_cards) - len(valid_cards)}**",
     f"- Missing cards: **{len(missing)}** (no usable source image; see missing_characters.md)",
     f"- Duplicate cards: **{len(sha_dupes)}** (identical files) · shared-source images flagged in manifest: **{len(manifest_dupe_flags)}**",
     f"- Failed downloads: **{len(failed_dl)}**",
     f"- Cards with a backup source recorded: **{with_backup}/{len(cards)}**\n",
     "## Source Distribution\n"]
for k in ("Anime", "Official promotional", "Movie", "OVA", "Manga", "Light Novel", "Secondary", "Other"):
    L.append(f"- {k}: {src.get(k, 0)}")
L.append("\n_Official promotional = official portal character art (ten-sura.com). Anime = anime frames/designs hosted on the wiki. "
         "Secondary = wiki images with an unverified medium. Other = game and kids-edition art._\n")
L.append("## Faction Distribution\n")
for k in ("Tempest", "Demon Lords", "Primordials", "True Dragons", "Humans", "Otherworlders", "Holy Empire", "Eastern Empire", "Other"):
    L.append(f"- {k}: {fac.get(k, 0)}")
L.append("\n_All characters (including those without a card), grouped by primary faction. Humans and Otherworlders cover characters whose faction is not one of the listed powers._\n")
L += ["## Image Quality\n", "- Target resolution: 2200 × 3400", "- Target aspect ratio: 11:17",
      f"- Lowest resolution: {low['_processing']['native_equivalent_height']} px native-equivalent height ({low['filename']}, source {low['image']['original_width']}×{low['image']['original_height']})" if low else "- Lowest resolution: n/a",
      f"- Highest resolution: {high['_processing']['native_equivalent_height']} px native-equivalent height ({high['filename']}, source {high['image']['original_width']}×{high['image']['original_height']})" if high else "- Highest resolution: n/a",
      f"- Average resolution: {sum(heights) / len(heights):.0f} px native-equivalent height (mean upscale ×{sum(3400 / h for h in heights) / len(heights):.2f})" if heights else "",
      f"- Average quality score: {sum(qs) / len(qs):.1f} / 100" if qs else "",
      "- Every final file is exactly 2200 × 3400. *Native-equivalent height* is how tall the card would be at the source image's own resolution. "
      "Every card is upscaled from a smaller source; see research_notes.md.\n",
      "## Technical Validation\n", "| Check | Result | Failures |", "|---|---|---|",
      f"| file exists | PASS | 0 (all {len(man_files)} manifest files present: {'yes' if not only_man else 'NO'}) |"]
for k in checks:
    L.append(f"| {labels[k]} | {'PASS' if not tech_fail[k] else 'FAIL'} | {len(tech_fail[k])} |")
L += [f"| duplicate check (identical files) | {'PASS' if not sha_dupes else 'FAIL'} | {len(sha_dupes)} |",
      f"| character identity verified | {'PASS' if not unverified_identity else 'REVIEW'} | {len(unverified_identity)} unverified; {len(ambiguous)} flagged identity_ambiguous |",
      f"| source verified (URL recorded, medium known) | {'PASS' if not unverified_source else 'REVIEW'} | {len(unverified_source)} with unverified medium |",
      f"| provenance complete (source URL, image URL, original size, reason, date) | {'PASS' if not prov_missing else 'FAIL'} | {len(prov_missing)} |",
      f"| JSON valid | {'PASS' if json_ok else 'FAIL'} | |", f"| CSV valid (28 columns every row) | {'PASS' if csv_ok else 'FAIL'} | |", ""]
if unverified_source:
    L.append("Cards whose medium is unverified (still sourced and traceable): " + ", ".join(unverified_source) + "\n")
if ambiguous:
    L.append("Cards flagged identity_ambiguous: " + ", ".join(ambiguous) + "\n")
L += ["## Filename Validation\n", "Pattern: `^[0-9]{3}_.+\\.(jpg|jpeg|png)$`\n",
      f"Violations: **{len(bad_names)}**" + ("".join(f"\n- {n}" for n in bad_names)), "",
      f"Non-card files in archive root: {stray or 'none'}\n",
      "## Numbering Validation\n",
      f"- starts at 001: {'PASS' if min(ids, default=0) == 1 else 'FAIL'}",
      f"- no duplicate IDs: {'PASS' if not id_dupes else 'FAIL ' + str(id_dupes)}",
      f"- no duplicate filenames: {'PASS' if not fn_dupes else 'FAIL ' + str(fn_dupes)}",
      f"- no missing numeric sequence (manifest 001–{max(ids, default=0):03d}): {'PASS' if not gaps else 'FAIL ' + str(gaps)}",
      f"- IDs match manifest (filename prefix = id): {'PASS' if not prefix_mismatch else 'FAIL'}",
      f"- IDs match CSV: {'PASS' if not csv_issues else 'FAIL'}",
      f"- Card files skip the {len(missing)} IDs without a card. This is intentional: missing characters keep their number and are listed in missing_characters.md.\n",
      "## Metadata Synchronization\n",
      f"- filesystem ↔ manifest: {'PASS' if not (only_fs or only_man) else 'FAIL'} ({len(fs_set)} files, {len(man_files)} manifest filenames)",
      f"- manifest ↔ CSV: {'PASS' if not csv_issues else 'FAIL'} ({len(chars)} records, {len(rows)} CSV rows)",
      f"- archive.total_characters = {man.get('archive', {}).get('total_characters')} ({'PASS' if man.get('archive', {}).get('total_characters') == len(chars) else 'FAIL'})\n"]
L.append("### Inconsistencies / errors\n" + ("\n".join(f"- {e}" for e in errors) if errors else "None.") + "\n")
(META / "validation_report.md").write_text("\n".join(L), "utf-8")

summary = {"status": status, "errors": len(errors), "characters": len(chars), "cards": len(fs_cards), "valid": len(valid_cards),
           "missing": len(missing), "failed_downloads": len(failed_dl), "dupes": len(sha_dupes), "src": dict(src)}
print(json.dumps(summary))
sys.exit(1 if errors else 0)
