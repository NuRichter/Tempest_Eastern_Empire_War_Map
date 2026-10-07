"""Stage 2: select, download, process and catalogue every character card.

Reads   metadata/cache/*.json (from collect.py)
Writes  NNN_<Name>.jpg cards (2200x3400, 11:17)
        metadata/character_manifest.json, character_sources.csv,
        research_notes.md, missing_characters.md
Resume: IDs, filenames and finished cards from an existing manifest are kept.
        A card is only re-processed when its file is missing/invalid or --force is given.
"""
import csv, hashlib, html, io, json, math, re, sys, time
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
META = ROOT / "metadata"
CACHE = META / "cache"
RAW = ROOT / "_work" / "raw"
RAW.mkdir(parents=True, exist_ok=True)
TIMELINE_MD = ROOT.parent / "Timeline Database" / "Tempest_Eastern_Empire_War_Timeline.md"

W, H = 2200, 3400
TODAY = date.today().isoformat()
FORCE = "--force" in sys.argv
S = requests.Session()
S.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TensuraPhotocardArchive/1.0 (personal research)"

# ------------------------------------------------------------------ editorial decisions
# official slug -> wiki title (verified by Japanese name / official bio, see research_notes.md)
OFFICIAL_MAP = {
    "daggrull": "Dagruel", "deeno": "Dino", "gail": "Gale Gibson", "gazel": "Gazel Dwargo",
    "geld": "Geld Junior", "gobuemon": "Gob'emon", "granville": "Granbell Rosso", "hakuro": "Hakurou",
    "luminus": "Luminous Twilight Valentine", "maribel": "Mariabell Rosso", "mizeri": "Misery",
    "mjollmile": "Gard Mjöllmile", "raine": "Rain", "renard": "Leonard Jester", "ritus": "Litus",
    "soei": "Souei", "soka": "Souka", "veldora": "Veldora Tempest", "veryon": "Veyron", "gaia": "Velgaia",
    "eren": "Elyun Grimwald", "maria": "Maria Rosso", "mjurran": "Mjur Farmenas", "ifrit": "Ifrit",
    "seven_days_clergy": "Clerics of the Seven Luminaries",
}
# official entries showing several characters / an earlier identity: used only as backup sources
OFFICIAL_BACKUP_ONLY = {
    "bovix_equix": ["Gozul", "Mezul"], "daggra_liura_chonkra": ["Dagura", "Liura", "Debura"],
    "greatsage": ["Ciel"], "raphael": ["Ciel"],
}
# preferred form (infobox section label regex) for characters with several forms
FORM_PREF = {"Rimuru Tempest": r"human"}
BROADCAST_SIZES = {(1920, 1080), (1280, 720), (1366, 768), (1600, 900), (1024, 576), (854, 480)}
# manual crop centres (fraction of width for wide images, of height for tall ones) from visual review
CROP_CENTRE = {"Gobzo": 0.72, "Nikolaus Spertus": 0.78, "Queen of Blumund": 0.70}
# visual-review findings that automation cannot detect
MANUAL_FLAGS = {
    "Kazhil": ("identity_ambiguous", "Source frame shows several people; the cropped figure could not be confirmed as Kazhil."),
    "Rommel": ("identity_ambiguous", "Source frame shows several people; the cropped figure could not be confirmed as Rommel."),
    "Rugurd": ("identity_ambiguous", "Source frame shows three goblin elders; subject not isolated."),
    "Gazat": ("identity_ambiguous", "Manga crowd panel (lizardmen naming scene); subject not isolated."),
    "Notos": ("identity_ambiguous", "Light-novel group illustration of several Dragon Lords."),
    "Ogre chieftain": ("needs_review", "Manga panel shows the character from behind."),
}
# wiki image forced ahead of the medium order (reason recorded in research_notes.md)
PREFER_FILE = {"Velgrynd": "Velgrynd LN.png"}
PLACEHOLDER = re.compile(r"no[ _]?image|placeholder", re.I)
SECONDARY_FORM = re.compile(r"true form|dragon|stampede|beast|slime|serpent|original form|initial|unnamed|"
                            r"revenge|monster|kids|mokshan|evolved form|before|past|young", re.I)
FACTION_ORDER = [
    ("Primordials", "Primordials"), ("True Dragons", "True Dragons"), ("Demon Lords", "Demon Lords (Octagram / Ten Great)"),
    ("Eastern Empire", "Eastern Empire"), ("Imperial Guardians", "Eastern Empire"),
    ("Holy Empire of Lubelius", "Holy Empire of Lubelius"), ("Western Holy Church", "Holy Empire of Lubelius"),
    ("Tempest", "Jura Tempest Federation"), ("Moderate Harlequin Alliance", "Moderate Harlequin Alliance"),
    ("Rosso Family", "Rosso Family"), ("Falmuth Kingdom", "Falmuth Kingdom"), ("Dwargon", "Armed Nation of Dwargon"),
    ("Blumund", "Kingdom of Blumund"), ("Eurazania", "Beast Kingdom Eurazania"), ("Sarion", "Sorcerous Dynasty of Sarion"),
    ("Farmenas Kingdom", "Farmenas Kingdom"), ("Free Guild", "Free Guild"), ("Freedom Academy", "Freedom Academy"),
    ("Mirror World", "Mirror World"), ("Visions of Coleus", "Visions of Coleus (movie)"), ("Kaien", "Kaien (movie)"),
    ("Ice Continent", "Ice Continent"), ("Angels", "Angels"), ("Dwelling of the Spirit", "Dwelling of the Spirits"),
]
# characters whose category-priority faction is misleading
FACTION_OVERRIDE = {"Rimuru Tempest": "Jura Tempest Federation"}
NAME_STOPWORDS = {"great", "king", "queen", "count", "demon", "holy", "elemental", "insect", "direwolf", "ogre",
                  "margrave", "clerics", "seven", "aqua", "lord", "lady", "black", "white", "red", "blue", "green",
                  "dark", "light", "fire", "water", "wind", "earth", "beast", "dragon", "chief", "captain"}
RACE_ORDER = ["True Dragons", "Primordials", "Daemons", "Angels", "Dragons", "Vampires", "Elves", "Dwarves", "Giants",
              "Beastmen", "Lycanthropes", "Oni", "Kijin", "Ogres", "Goblins", "Hobgoblins", "Lizardmen", "Dragonewts",
              "Harpies", "Insectoids", "Dryads", "Slimes", "Golems", "Undead", "Elementals", "Fairies", "Humans",
              "Majin", "Monsters", "Spiritual life-forms"]
REPORT_GROUP = {
    "Jura Tempest Federation": "Tempest", "Demon Lords (Octagram / Ten Great)": "Demon Lords",
    "Primordials": "Primordials", "True Dragons": "True Dragons", "Eastern Empire": "Eastern Empire",
    "Holy Empire of Lubelius": "Holy Empire",
}
MEDIUM_RANK = {"anime": 1, "promotional": 2, "movie": 3, "manga": 4, "light_novel": 5, "game": 6, "unknown": 6,
               "kids": 7}
SOURCE_TYPE = {"anime": "anime_screenshot_or_design", "movie": "movie_screenshot_or_design", "manga": "manga_panel_or_art",
               "light_novel": "light_novel_illustration", "game": "official_game_art", "kids": "kids_edition_illustration",
               "unknown": "unclassified_wiki_image"}


# ------------------------------------------------------------------ helpers
def load(name):
    return json.loads((CACHE / name).read_text("utf-8"))


def text(v):
    if v is None:
        return None
    v = re.sub(r"<small[^>]*>.*?</small>", "", v, flags=re.S)
    v = re.sub(r"<sup.*?</sup>|<rp>.*?</rp>|<rt>.*?</rt>", "", v, flags=re.S)
    v = re.sub(r"<br\s*/?>", "\n", v)
    v = html.unescape(re.sub(r"<[^>]+>", "", v))
    return v.strip() or None


def lines(v):
    t = text(v)
    return [x.strip() for x in t.split("\n") if x.strip()] if t else []


def fields(ib):
    out = {}
    def walk(n):
        if isinstance(n, list):
            for x in n:
                walk(x)
        elif isinstance(n, dict):
            d = n.get("data")
            if n.get("type") == "data":
                out.setdefault(d.get("source"), d.get("value"))
            elif isinstance(d, dict):
                walk(d.get("value"))
            elif isinstance(d, list):
                walk(d)
    walk(ib or [])
    return out


def infobox_images(ib):
    out = []
    def walk(n, ctx):
        if isinstance(n, list):
            for x in n:
                walk(x, ctx)
        elif isinstance(n, dict):
            t, d = n.get("type"), n.get("data")
            if t == "image":
                for im in d or []:
                    if not im.get("isVideo"):
                        out.append({"name": im.get("name"), "caption": (im.get("caption") or im.get("alt") or "").strip(),
                                    "section": ctx})
            elif isinstance(d, dict):
                walk(d.get("value"), (d.get("label") or ctx) if t == "section" else ctx)
            elif isinstance(d, list):
                walk(d, ctx)
    walk(ib or [], "")
    return out


def medium_of(caption, name):
    c = caption.lower()
    if "kids" in c:
        return "kids"
    if c.startswith("anime"):
        return "anime"
    if c.startswith("manga"):
        return "manga"
    if "light novel" in c or c == "ln" or "travel guide" in c:
        return "light_novel"
    if c.startswith("game"):
        return "game"
    n = name.lower()
    if re.search(r"\bkln\b|kids", n):
        return "kids"
    if re.search(r"anime|episode|\bep\.? ?\d", n):
        return "anime"
    if re.search(r"movie|scarlet bond|guren|kizuna|coleus", n):
        return "movie"
    if re.search(r"manga|chapter|revenge|clayman ?\d|trinity|nikki|gourmet|vacation|shachiku|bangaihen|\bch\.? ?\d", n):
        return "manga"
    if re.search(r"\bln\b|light novel|novel|vol(ume)? ?\d|^ln", n):
        return "light_novel"
    if re.search(r"isekai|game|tempest stories|maou|memories|chronicles", n):
        return "game"
    return "unknown"


def safe_name(name):
    return re.sub(r'[<>:"/\\|?*]', "", name).strip().rstrip(".")


def jnorm(s):
    return re.sub(r"[\s・＝=（）()\-ー]", "", s or "")


# ------------------------------------------------------------------ download / process
def download(url, dest_stem):
    for ext in (".png", ".jpg", ".webp", ".gif"):
        p = RAW / (dest_stem + ext)
        if p.exists() and p.stat().st_size > 0:
            return p, None
    last = None
    for attempt in range(3):
        try:
            r = S.get(url, timeout=60)
            ctype = r.headers.get("content-type", "")
            if r.status_code != 200:
                last = f"HTTP {r.status_code}"
            elif not ctype.startswith("image/") or r.content[:15].lower().lstrip().startswith((b"<!doctype", b"<html")):
                return None, f"not an image ({ctype})"
            else:
                im = Image.open(io.BytesIO(r.content)); im.verify()
                ext = {"PNG": ".png", "JPEG": ".jpg", "WEBP": ".webp", "GIF": ".gif"}.get(im.format, ".img")
                p = RAW / (dest_stem + ext)
                p.write_bytes(r.content)
                return p, None
        except Exception as e:  # noqa: BLE001
            last = f"{type(e).__name__}: {e}"
        time.sleep(2 * (attempt + 1))
    return None, last


_CASCADE = None


def detect_face(im):
    """Largest anime-style face (nagadomi/lbpcascade_animeface, MIT) as (x, y, w, h) or None."""
    global _CASCADE
    import cv2, numpy as np
    if _CASCADE is None:
        _CASCADE = cv2.CascadeClassifier(str(Path(__file__).parent / "lbpcascade_animeface.xml"))
    g = cv2.equalizeHist(cv2.cvtColor(np.asarray(im.convert("RGB")), cv2.COLOR_RGB2GRAY))
    m = max(24, int(min(im.size) * 0.06))
    faces, _, weights = _CASCADE.detectMultiScale3(g, scaleFactor=1.1, minNeighbors=5, minSize=(m, m),
                                                   outputRejectLevels=True)
    min_side = 0.12 * im.height     # small faces are usually background extras, not the subject
    good = [(f, float(w)) for f, w in zip(faces, weights) if float(w) >= 1.0 and f[3] >= min_side]
    return tuple(int(v) for v in max(good, key=lambda fw: fw[0][2] * fw[0][3])[0]) if good else None


def edge_centre(im, win):
    """x-centre of the crop window with the most edge detail (fallback when no face is found)."""
    from PIL import ImageFilter
    small = im.convert("L").resize((max(1, im.width // 4), max(1, im.height // 4)))
    e = small.filter(ImageFilter.FIND_EDGES)
    cols = [sum(e.crop((x, 0, x + 1, e.height)).getdata()) for x in range(e.width)]
    w = max(1, win // 4)
    mid = (len(cols) - w) / 2 or 1
    # edge detail weighted by a centre prior: anime frames usually centre the subject
    best = max(range(0, max(1, len(cols) - w + 1)),
               key=lambda x: sum(cols[x:x + w]) * math.exp(-((x - mid) / (0.35 * max(mid, 1))) ** 2))
    return (best + w / 2) * 4


def make_card(src, dest, centre=None):
    """Returns processing info dict. Cut-outs (transparent art) are fitted onto a white card;
    opaque images are cropped to fill 11:17 (top-biased so faces survive)."""
    im = Image.open(src)
    im.seek(0)
    im = ImageOps.exif_transpose(im)
    ow, oh = im.size
    rgba = im.convert("RGBA")
    alpha = rgba.getchannel("A")
    transparent = sum(alpha.histogram()[:16]) / (ow * oh)
    if transparent > 0.05:
        bbox = alpha.point(lambda a: 255 if a > 16 else 0).getbbox() or (0, 0, ow, oh)
        cut = rgba.crop(bbox)
        cw, ch = cut.size
        margin = 0.05
        s = min(W * (1 - 2 * margin) / cw, H * (1 - 2 * margin) / ch)
        nw, nh = max(1, round(cw * s)), max(1, round(ch * s))
        cut = cut.resize((nw, nh), Image.LANCZOS)
        card = Image.new("RGBA", (W, H), (255, 255, 255, 255))
        card.alpha_composite(cut, ((W - nw) // 2, H - nh - round(H * margin)))
        card = card.convert("RGB")
        method = "cutout_fit_on_white"
        retained = 1.0
        native_equiv_h = ch / (nh / H)          # how tall the card would be at native resolution
    else:
        crop_box = None
        flat = Image.new("RGB", (ow, oh), (255, 255, 255))
        flat.paste(rgba, mask=alpha)
        target = W / H
        face = detect_face(flat)
        if ow / oh > target:                     # too wide -> crop sides around face / visual mass
            cw, ch = round(oh * target), oh
            y0 = 0
            if centre is not None:
                cx, anchor = centre * ow, "manual_review"
            elif face:
                cx, anchor = face[0] + face[2] / 2, "face"
            else:
                cx, anchor = edge_centre(flat, cw), "centre_weighted_edges"
            x0 = int(min(max(cx - cw / 2, 0), ow - cw))
        else:                                     # too tall -> crop height, keep face in upper third
            cw, ch = ow, round(ow / target)
            x0 = 0
            if centre is not None:
                y0, anchor = centre * oh - ch / 2, "manual_review"
            elif face:
                y0, anchor = face[1] + face[3] / 2 - ch * 0.3, "face"
            else:
                y0, anchor = (oh - ch) * 0.15, "upper_bias"
            y0 = int(min(max(y0, 0), oh - ch))
        card = flat.crop((x0, y0, x0 + cw, y0 + ch)).resize((W, H), Image.LANCZOS)
        method = f"crop_to_fill_11x17 ({anchor})"
        crop_box = [x0, y0, x0 + cw, y0 + ch]
        retained = (cw * ch) / (ow * oh)
        native_equiv_h = ch
    card.save(dest, "JPEG", quality=92, optimize=True, progressive=True)
    return {"original_width": ow, "original_height": oh, "method": method, "retained_fraction": round(retained, 3),
            "native_equivalent_height": round(native_equiv_h), "upscale_factor": round(H / native_equiv_h, 2),
            "crop_box": crop_box if method.startswith("crop") else None}


def quality_score(proc, tier):
    q_res = min(1.0, proc["native_equivalent_height"] / H) ** 0.5
    q_src = {1: 1.0, 2: 0.9, 3: 0.85, 4: 0.75, 5: 0.65, 6: 0.5}.get(tier, 0.4)
    q_fit = proc["retained_fraction"] if proc["retained_fraction"] < 0.8 else 1.0
    return round(100 * (0.5 * q_res + 0.3 * q_src + 0.2 * q_fit))


def ahash(path, n=16):
    im = Image.open(path).convert("L").resize((n, n), Image.LANCZOS)
    px = list(im.getdata()); avg = sum(px) / len(px)
    return "".join("1" if p > avg else "0" for p in px)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


# ------------------------------------------------------------------ main
def main():
    official = load("official.json")
    pages = load("wiki_pages.json")
    files = load("wiki_files.json")
    collect_mod = __import__("collect")
    roster = [t for t in pages if not collect_mod.LIST_PAGE.search(t)]

    # ---- official mapping
    def n(s): return re.sub(r"[^a-z]", "", s.lower())
    by_norm = {n(t): t for t in roster}
    first_tok = defaultdict(list)
    for t in roster:
        first_tok[n(t.split()[0])].append(t)
    off_primary, off_backup, off_map_log = {}, defaultdict(list), []
    for slug, o in sorted(official.items()):
        if slug in OFFICIAL_BACKUP_ONLY:
            for t in OFFICIAL_BACKUP_ONLY[slug]:
                off_backup[t].append(o)
            off_map_log.append((slug, o.get("japanese_name"), ", ".join(OFFICIAL_BACKUP_ONLY[slug]), "backup-only"))
            continue
        en = o.get("english_name") or slug.replace("_", " ")
        t = OFFICIAL_MAP.get(slug) or by_norm.get(n(en))
        how = "manual" if slug in OFFICIAL_MAP else "exact"
        if not t and len(first_tok.get(n(en.split()[0]), [])) == 1:
            t, how = first_tok[n(en.split()[0])][0], "first-name"
        if t:
            off_primary[t] = o
        off_map_log.append((slug, o.get("japanese_name"), t or "UNMAPPED", how))

    # ---- war relevance from project timeline (LN vols 12-16 derived)
    tl = TIMELINE_MD.read_text("utf-8") if TIMELINE_MD.exists() else ""
    first_count = Counter(n(t.split()[0]) for t in roster)

    def mentions(title, f):
        names = {title}
        tok = title.split()[0]
        if len(tok) >= 4 and first_count[n(tok)] == 1 and tok.lower() not in NAME_STOPWORDS:
            names.add(tok)
        names |= {a for a in lines(f.get("alter")) if len(a) >= 4}
        return max((len(re.findall(r"\b" + re.escape(x) + r"\b", tl)) for x in names), default=0)

    # ---- previous manifest (resume)
    man_path = META / "character_manifest.json"
    prev = json.loads(man_path.read_text("utf-8")) if man_path.exists() else None
    prev_by_name = {c["identity"]["canonical_name"]: c for c in (prev or {}).get("characters", [])}
    order = sorted(roster, key=lambda t: (t != "Rimuru Tempest", t.lower()))
    next_id = max([c["id"] for c in prev_by_name.values()], default=0) + 1
    ids = {}
    for t in order:
        if t in prev_by_name:
            ids[t] = prev_by_name[t]["id"]
    for t in order:
        if t not in ids:
            ids[t] = next_id; next_id += 1

    image_users = defaultdict(set)
    for tt in roster:
        for im in infobox_images(pages[tt]["infobox"]):
            image_users[im["name"]].add(tt)
    jp_mismatch = []
    for slug, jpn, tt, how in off_map_log:
        if tt in pages and how != "backup-only":
            wk = jnorm(text(re.sub(r"<rt>(.*?)</rt>", r"|\1|", fields(pages[tt]["infobox"]).get("kanji") or "")) or "")
            if not jnorm(jpn).split("(")[0] or jnorm(jpn)[:3] not in wk:
                jp_mismatch.append((slug, jpn, tt, wk))
    print("JP-name mismatches:", jp_mismatch)

    characters, sources_rows, decisions, missing = [], [], [], []
    reprocessed = 0
    for t in sorted(roster, key=lambda x: ids[x]):
        pg = pages[t]; f = fields(pg["infobox"]); cats = set(pg["categories"])
        cid = ids[t]
        fname = f"{cid:03d}_{safe_name(t)}.jpg"
        if t in prev_by_name and prev_by_name[t]["filename"]:
            fname = prev_by_name[t]["filename"]

        # ---- candidates
        cands = []
        o = off_primary.get(t)
        if o and o.get("image_url"):
            cands.append({"medium": "anime", "tier": 1, "source_type": "official_anime_character_art",
                          "source_name": "Official TenSura portal (ten-sura.com) character database",
                          "source_url": o["page_url"], "image_url": o["image_url"], "section": "", "caption": "Official",
                          "width": None, "height": None, "file": None, "rank": (0, 0, 0, 0, 0)})
        pref = FORM_PREF.get(t)
        placeholder_seen = False
        group_skipped = []
        for idx, im in enumerate(infobox_images(pg["infobox"])):
            fi = files.get(im["name"]) or {}
            if fi.get("url") and len(image_users[im["name"]]) >= 3 and not PLACEHOLDER.search(im["name"]):
                group_skipped.append(fi["url"])          # group frame shared by 3+ articles: not an individual card
                continue
            if not fi.get("url") or PLACEHOLDER.search(im["name"]):
                if fi.get("url"):
                    placeholder_seen = True
                continue
            med = medium_of(im["caption"], im["name"])
            inferred = False
            if "Movie Characters" in cats and med == "unknown":
                med, inferred = "movie", True
            elif med == "unknown" and (fi.get("width"), fi.get("height")) in BROADCAST_SIZES:
                med, inferred = "anime", True      # 16:9 broadcast-frame screenshot
            sec = im["section"] or ""
            form_pen = 0 if (pref and re.search(pref, sec, re.I)) else (2 if pref else (1 if SECONDARY_FORM.search(sec) else 0))
            tier = {"anime": 1, "movie": 3, "manga": 4, "light_novel": 5}.get(med, 6)
            cands.append({"medium": med, "tier": tier,
                          "source_type": SOURCE_TYPE[med] + "_via_wiki",
                          "source_name": "Tensura Fandom wiki (tensura.fandom.com) — infobox image",
                          "source_url": pg["url"], "image_url": fi["url"], "file_page": fi.get("file_page"),
                          "section": sec, "caption": im["caption"], "width": fi.get("width"),
                          "height": fi.get("height"), "file": im["name"],
                          "medium_inferred": inferred,
                          "rank": (1, form_pen, len(image_users[im["name"]]) > 1,
                                   MEDIUM_RANK[med] + (0.5 if inferred else 0), idx)})
        for ob in off_backup.get(t, []):
            if ob.get("image_url"):
                cands.append({"medium": "anime", "tier": 1, "source_type": "official_anime_character_art (group/earlier identity)",
                              "source_name": "Official TenSura portal (ten-sura.com) character database",
                              "source_url": ob["page_url"], "image_url": ob["image_url"], "section": "", "caption": "Official (backup only)",
                              "width": None, "height": None, "file": None, "rank": (9, 0, 0, 0, 0)})
        if t in PREFER_FILE:
            for c in cands:
                if c.get("file") == PREFER_FILE[t]:
                    c["rank"] = (0.5,) + tuple(c["rank"][1:])
                    c["forced"] = True
        cands.sort(key=lambda c: c["rank"])

        # ---- produce card
        dest = ROOT / fname
        prev_rec = prev_by_name.get(t)
        chosen, proc, fail_log = None, None, []
        if prev_rec and dest.exists() and not FORCE and prev_rec.get("image", {}).get("quality_score"):
            chosen = next((c for c in cands if c["image_url"] == prev_rec["visual_reference"]["image_url"]), None)
            proc = prev_rec.get("_processing")
        if not chosen or not proc:
            for i, c in enumerate([c for c in cands if c["rank"][0] < 9] + [c for c in cands if c["rank"][0] == 9]):
                stem = f"{cid:03d}_{i}_" + hashlib.md5(c["image_url"].encode()).hexdigest()[:8]
                raw, err = download(c["image_url"], stem)
                if not raw:
                    fail_log.append({"image_url": c["image_url"], "error": err}); continue
                try:
                    proc = make_card(raw, dest, CROP_CENTRE.get(t))
                except Exception as e:  # noqa: BLE001
                    fail_log.append({"image_url": c["image_url"], "error": f"processing_failed: {e}"}); continue
                reprocessed += 1
                proc["raw_file"] = raw.name
                proc["raw_sha256"] = sha256(raw)
                chosen = c
                break
        backup = next((c for c in cands if chosen and c["image_url"] != chosen["image_url"]
                       and (c["source_url"] != chosen["source_url"] or c["rank"][0] != chosen["rank"][0])), None) \
            or next((c for c in cands if chosen and c["image_url"] != chosen["image_url"]), None)

        mcount = mentions(t, f)
        rel = ("critical" if mcount >= 25 else "high" if mcount >= 8 else "medium" if mcount >= 3
               else "low" if mcount >= 1 or "Eastern Empire" in cats else "none")
        faction = FACTION_OVERRIDE.get(t) or next((label for cat, label in FACTION_ORDER if cat in cats), None)
        affil = lines(f.get("affiliation"))
        if not faction:
            faction = affil[0] if affil else "unknown"
        subfaction = next((a for a in affil if a != faction), None)
        race = next((r for r in RACE_ORDER if r in cats), "unknown")
        importance = ("main" if t == "Rimuru Tempest" else "major" if t in off_primary else
                      "supporting" if f.get("anime") or f.get("manga") else "minor")
        jp_official = o.get("japanese_name") if o else None
        jp_wiki = text(re.sub(r"<rt>(.*?)</rt>", r"（\1）", f.get("kanji") or "")) if f.get("kanji") else None
        occ = lines(f.get("occupations")); titles = lines(f.get("titles"))
        canon = {"anime": bool(f.get("anime")) or any(c["medium"] == "anime" and c["rank"][0] == 1 for c in cands) or bool(o),
                 "manga": bool(f.get("manga")), "light_novel": bool(f.get("light")),
                 "web_novel": bool(f.get("web")),
                 "movie": True if "Movie Characters" in cats else None, "ova": None, "special": None,
                 "game": True if (f.get("game") or "Game Original Characters" in cats) else None}
        first_app = {k: text(f.get(k)) for k in ("web", "light", "manga", "anime", "game") if f.get(k)}
        first_app = {k: v.split("\n")[0] for k, v in first_app.items()}

        status_flags = []
        if not chosen:
            if group_skipped:
                status_flags.append("identity_ambiguous")
                fail_log += [{"image_url": u, "error": "group image shared by 3+ wiki articles; not usable as an individual card"}
                             for u in group_skipped]
            elif not fail_log:
                status_flags.append("no_usable_image")
            elif all(str(x["error"]).startswith("processing_failed") for x in fail_log):
                status_flags.append("processing_failed")
            else:
                status_flags.append("download_failed")
            if placeholder_seen:
                fail_log.append({"image_url": None, "error": "wiki infobox only contains the 'No Image' placeholder"})
        else:
            if proc["native_equivalent_height"] < 500:
                status_flags.append("low_resolution")
            if chosen["medium"] in ("unknown",):
                status_flags.append("source_unverified")
            if chosen["medium"] == "kids":
                status_flags.append("needs_review")
            if chosen.get("file") and len(image_users[chosen["file"]]) > 1:
                status_flags.append("identity_ambiguous")
            if t in MANUAL_FLAGS and MANUAL_FLAGS[t][0] not in status_flags:
                status_flags.append(MANUAL_FLAGS[t][0])
        q = quality_score(proc, chosen["tier"]) if chosen else 0

        rec = {
            "id": cid, "filename": fname if chosen else None,
            "identity": {"canonical_name": t, "japanese_name": jp_official or jp_wiki,
                         "japanese_name_wiki": jp_wiki, "romanized_name": text(f.get("romaji")),
                         "aliases": lines(f.get("alias")),
                         "alternative_spellings": lines(f.get("alter")) + (
                             [o["english_name"]] if o and o.get("english_name") and o["english_name"] != t
                             and o["english_name"] not in lines(f.get("alter")) else []),
                         "former_names": lines(f.get("fnames")), "titles": titles},
            "classification": {"species": (lines(f.get("species")) or ["unknown"])[0], "race": race,
                               "gender": text(f.get("gender")) or "unknown", "faction": faction,
                               "subfaction": subfaction, "role": (occ or titles or ["unknown"])[0],
                               "importance": importance, "status": text(f.get("status")),
                               "wiki_categories": sorted(cats - {"Characters"})},
            "canon_status": canon,
            "visual_reference": {
                "preferred_medium": chosen["medium"] if chosen else None, "source_tier": chosen["tier"] if chosen else None,
                "source_type": chosen["source_type"] if chosen else None,
                "source_name": chosen["source_name"] if chosen else None,
                "source_url": chosen["source_url"] if chosen else None,
                "image_url": chosen["image_url"] if chosen else None,
                "file_page_url": chosen.get("file_page") if chosen else None,
                "form_or_section": (chosen["section"] or None) if chosen else None,
                "wiki_caption": (chosen["caption"] or None) if chosen else None,
                "backup_source_name": backup["source_name"] if backup else None,
                "backup_source_url": backup["source_url"] if backup else None,
                "backup_image_url": backup["image_url"] if backup else None,
                "confidence": ("high" if chosen and chosen["tier"] == 1 and chosen["rank"][0] == 0 else
                               "medium" if chosen and chosen["medium"] != "unknown" and not chosen.get("medium_inferred") else "low") if chosen else None,
                "medium_inferred": bool(chosen and chosen.get("medium_inferred"))},
            "image": {"original_filename": (chosen.get("file") or Path(chosen["image_url"].split("?")[0]).name) if chosen else None,
                      "original_width": proc["original_width"] if chosen else None,
                      "original_height": proc["original_height"] if chosen else None,
                      "final_filename": fname if chosen else None, "final_width": W if chosen else None,
                      "final_height": H if chosen else None, "aspect_ratio": "11:17" if chosen else None,
                      "format": "JPEG" if chosen else None, "quality_score": q,
                      "processing": proc["method"] if chosen else None,
                      "upscale_factor": proc["upscale_factor"] if chosen else None},
            "character_context": {"first_major_appearance": first_app or None, "major_arcs": [],
                                  "organizations": affil, "relationships": lines(f.get("family"))[:12],
                                  "eastern_empire_relevance": rel, "timeline_mentions": mcount},
            "research": {"search_queries": [f"ten-sura.com/character (official index)",
                                            f"tensura.fandom.com Category:Characters -> '{t}'"],
                         "sources_checked": sorted({c["source_url"] for c in cands} | {pg["url"]}),
                         "selection_reason": None, "alternative_images_considered": [
                             {"image_url": c["image_url"], "medium": c["medium"], "form": c["section"] or None,
                              "width": c["width"], "height": c["height"]}
                             for c in cands if not chosen or c["image_url"] != chosen["image_url"]][:10],
                         "download_failures": fail_log, "date_collected": (prev_rec or {}).get("research", {}).get("date_collected") or TODAY},
            "verification": {"identity_verified": bool(chosen), "source_verified": bool(chosen) and chosen["medium"] != "unknown",
                             "image_verified": bool(chosen), "duplicate_checked": False, "last_verified": TODAY},
            "status": "complete" if chosen and not status_flags else ("incomplete" if chosen else "missing"),
            "status_flags": status_flags,
            "notes": "",
            "_processing": proc if chosen else None,
        }
        if chosen:
            if chosen["rank"][0] == 0:
                why = "Official anime character art from the official TenSura portal (tier 1, clean full-body design)."
            else:
                why = (f"No official-portal entry; best wiki infobox image by preference order "
                       f"(primary form, then anime > movie > manga > light novel > game > unclassified). "
                       f"Selected {chosen['medium'].replace('_', ' ')} image"
                       + (f" of form '{chosen['section']}'" if chosen['section'] else "") + ".")
                if chosen["rank"][0] == 9:
                    why = "Only available image was an official group/earlier-identity artwork; needs review."
                    rec["status_flags"].append("needs_review"); rec["status"] = "incomplete"
            if t in MANUAL_FLAGS:
                rec["notes"] += MANUAL_FLAGS[t][1] + " "
            if chosen.get("forced"):
                why = (f"Manually preferred {chosen['medium'].replace('_', ' ')} image '{chosen['file']}': the anime "
                       f"image available is a back/partial view unsuitable for a portrait card.")
            if chosen.get("medium_inferred"):
                rec["notes"] += (f"Medium not labelled on the wiki; inferred as {chosen['medium']} from "
                                 + ("16:9 broadcast frame size. " if chosen["medium"] == "anime" else "movie-only character category. "))
            rec["research"]["selection_reason"] = why
            if len({c["section"] for c in cands if c["section"]}) > 1:
                decisions.append((t, chosen, cands))
        characters.append(rec)
        print(f"{cid:03d} {t[:34]:34} {(chosen or {}).get('medium', '-'):12} q={q:3} {rec['status']} {rec['status_flags']}")

    # ---- duplicate check (raw + final SHA-256; perceptual hash stored for future near-duplicate review)
    dupes = []
    seen_sha, seen_hash = {}, {}
    for c in characters:
        c["verification"]["duplicate_checked"] = True
        if not c["filename"]:
            continue
        p = c["_processing"]
        h = ahash(ROOT / c["filename"])
        p["ahash"] = h
        p["final_sha256"] = sha256(ROOT / c["filename"])
        other = seen_sha.get(p["raw_sha256"]) or seen_hash.get(p["final_sha256"])
        if other:
            dupes.append((c["id"], other))
            (ROOT / c["filename"]).unlink()
            c["research"]["download_failures"].append({"image_url": c["visual_reference"]["image_url"],
                                                       "error": f"identical to the image already used for ID {other:03d}; card withdrawn"})
            c["notes"] += f"Only available image is identical to ID {other:03d}'s; card withdrawn to avoid a duplicate. "
            c["filename"] = None; c["image"]["final_filename"] = None
            c["status"] = "missing"; c["status_flags"] = sorted(set(c["status_flags"]) | {"identity_ambiguous"})
            c["verification"]["image_verified"] = False
            continue
        seen_sha.setdefault(p["raw_sha256"], c["id"]); seen_hash.setdefault(p["final_sha256"], c["id"])

    prev_rev = (prev or {}).get("archive", {}).get("research_revision", 0)
    manifest = {"archive": {"title": "Tensura Character Photocard Archive", "version": "1.0",
                            "research_revision": prev_rev + 1 if (FORCE or reprocessed or not prev) else prev_rev,
                            "last_updated": TODAY if (FORCE or reprocessed or not prev) else prev["archive"]["last_updated"],
                            "total_characters": len(characters),
                            "total_final_cards": sum(1 for c in characters if c["filename"]),
                            "card_spec": {"width": W, "height": H, "aspect_ratio": "11:17", "format": "JPEG",
                                          "filename_pattern": "^[0-9]{3}_.+\\.(jpg|jpeg|png)$"},
                            "roster_source": "tensura.fandom.com Category:Characters + official portal additions"},
                "characters": characters}
    man_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), "utf-8")
    write_csv(characters)
    (META / "cache" / "official_mapping.json").write_text(json.dumps(off_map_log, ensure_ascii=False, indent=1), "utf-8")
    (META / "cache" / "decisions.json").write_text(json.dumps(
        [{"name": t, "chosen": {k: c[k] for k in ("medium", "section", "image_url")},
          "forms": sorted({x["section"] for x in cs if x["section"]})} for t, c, cs in decisions], ensure_ascii=False, indent=1), "utf-8")
    (META / "cache" / "dupes.json").write_text(json.dumps(dupes), "utf-8")
    print("done", len(characters), "reprocessed", reprocessed, "dupes", dupes)


CSV_COLS = ["ID", "Filename", "Canonical Name", "Japanese Name", "Faction", "Role", "Importance", "Preferred Medium",
            "Source Tier", "Source Type", "Source Name", "Source URL", "Image URL", "Backup Source Name",
            "Backup Source URL", "Original Width", "Original Height", "Original Aspect Ratio", "Final Width",
            "Final Height", "Final Aspect Ratio", "Quality Score", "Identity Confidence", "Source Confidence",
            "Selection Reason", "Date Collected", "Date Verified", "Notes"]


def write_csv(characters):
    with open(META / "character_sources.csv", "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        w.writerow(CSV_COLS)
        for c in characters:
            v, im = c["visual_reference"], c["image"]
            ar = (f"{im['original_width'] / im['original_height']:.4f}" if im["original_width"] else "")
            w.writerow([f"{c['id']:03d}", c["filename"] or "", c["identity"]["canonical_name"],
                        c["identity"]["japanese_name"] or "", c["classification"]["faction"],
                        c["classification"]["role"], c["classification"]["importance"], v["preferred_medium"] or "",
                        v["source_tier"] or "", v["source_type"] or "", v["source_name"] or "", v["source_url"] or "",
                        v["image_url"] or "", v["backup_source_name"] or "", v["backup_source_url"] or "",
                        im["original_width"] or "", im["original_height"] or "", ar, im["final_width"] or "",
                        im["final_height"] or "", im["aspect_ratio"] or "", im["quality_score"],
                        "high" if c["verification"]["identity_verified"] else "unverified",
                        v["confidence"] or "", c["research"]["selection_reason"] or "",
                        c["research"]["date_collected"], c["verification"]["last_verified"],
                        "; ".join(filter(None, [c["status"], ",".join(c["status_flags"]), c["notes"].strip()]))])


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent))
    main()
