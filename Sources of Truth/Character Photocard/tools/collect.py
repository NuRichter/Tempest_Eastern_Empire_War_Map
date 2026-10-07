"""Stage 1: collect roster + source records.

Sources:
  * Official portal character database (ten-sura.com/character)  -> tier 1/2 official art
  * Tensura Fandom wiki (MediaWiki API, Category:Characters)       -> roster, infobox data, per-medium images

Output (lightweight JSON, no HTML archives):
  metadata/cache/official.json
  metadata/cache/wiki_pages.json
  metadata/cache/wiki_files.json
Re-running reuses cached entries (resume behaviour).
"""
import json, re, sys, time, html
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "metadata" / "cache"
CACHE.mkdir(parents=True, exist_ok=True)

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TensuraPhotocardArchive/1.0 (personal research)"}
API = "https://tensura.fandom.com/api.php"
OFFICIAL = "https://www.ten-sura.com"
S = requests.Session(); S.headers.update(UA)


def get(url, **kw):
    for attempt in range(4):
        try:
            r = S.get(url, timeout=40, **kw)
            if r.status_code == 200:
                return r
            print("  HTTP", r.status_code, url, file=sys.stderr)
        except requests.RequestException as e:
            print("  ERR", e, file=sys.stderr)
        time.sleep(2 * (attempt + 1))
    return None


def load(name, default):
    p = CACHE / name
    return json.loads(p.read_text("utf-8")) if p.exists() else default


def save(name, obj):
    (CACHE / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1), "utf-8")


# ---------------------------------------------------------------- official
def strip_tags(s):
    return [html.unescape(x).strip() for x in re.split(r"<[^>]+>", s) if html.unescape(x).strip()]


def collect_official():
    data = load("official.json", {})
    idx = get(f"{OFFICIAL}/character")
    slugs = sorted(set(re.findall(r'href="https://www\.ten-sura\.com/character/([a-z0-9_\-]+)"', idx.text)) - {"feed"})
    print(f"official: {len(slugs)} character pages")
    for slug in slugs:
        if slug in data and data[slug].get("image_url"):
            continue
        url = f"{OFFICIAL}/character/{slug}"
        r = get(url)
        if not r:
            data[slug] = {"slug": slug, "page_url": url, "error": "fetch_failed"}
            continue
        t = r.text
        img = re.search(r'src="([^"]*/assets/images/character/[^"]+\.(?:png|jpg|webp)[^"]*)"', t)
        lines = strip_tags(t)
        jp = en = cv = None
        title = re.search(r"<title>([^|<]+)", t)
        if title:
            jp = title.group(1).strip()
        # name block: JP line followed by romanised line, then "CV"
        for i, ln in enumerate(lines):
            if ln == jp and i + 1 < len(lines) and re.match(r"^[A-Za-z][A-Za-z .'\-=&]+$", lines[i + 1]):
                en = lines[i + 1]
                if i + 3 < len(lines) and lines[i + 2].startswith("CV"):
                    cv = lines[i + 3]
                break
        data[slug] = {"slug": slug, "page_url": url, "japanese_name": jp, "english_name": en,
                      "cv": cv, "image_url": img.group(1) if img else None,
                      "accessed": time.strftime("%Y-%m-%d")}
        print("  ", slug, jp, en, bool(img))
        time.sleep(0.3)
    save("official.json", data)
    return data


# ---------------------------------------------------------------- wiki
def wiki_roster():
    titles, cont = [], {}
    while True:
        r = get(API, params={"action": "query", "list": "categorymembers", "cmtitle": "Category:Characters",
                             "cmlimit": "500", "cmnamespace": "0", "format": "json", **cont}).json()
        titles += [m["title"] for m in r["query"]["categorymembers"]]
        if "continue" not in r:
            return titles
        cont = r["continue"]


# Official-portal characters whose wiki page is not in Category:Characters
EXTRA_TITLES = ["Ifrit", "Clerics of the Seven Luminaries"]
LIST_PAGE = re.compile(r"/Characters$")


def collect_wiki():
    pages = load("wiki_pages.json", {})
    roster = [t for t in wiki_roster() if not LIST_PAGE.search(t)] + EXTRA_TITLES
    print(f"wiki: {len(roster)} pages in Category:Characters")
    todo = [t for t in roster if t not in pages]
    for i in range(0, len(todo), 40):
        chunk = todo[i:i + 40]
        cont = {}
        merged = {}
        while True:
            r = get(API, params={"action": "query", "prop": "pageprops|categories|info", "inprop": "url",
                                 "cllimit": "max", "titles": "|".join(chunk), "format": "json", **cont}).json()
            for p in r["query"]["pages"].values():
                m = merged.setdefault(p["title"], {"title": p["title"], "pageid": p.get("pageid"),
                                                   "url": p.get("fullurl"), "categories": [], "infobox": None,
                                                   "description": None})
                m["categories"] += [c["title"].replace("Category:", "") for c in p.get("categories", [])]
                pp = p.get("pageprops", {})
                if pp.get("infoboxes"):
                    m["infobox"] = json.loads(pp["infoboxes"])
                if pp.get("fandomdescription"):
                    m["description"] = pp["fandomdescription"][:600]
            if "continue" not in r:
                break
            cont = r["continue"]
        pages.update(merged)
        print(f"  wiki pages {len(pages)}/{len(roster)}")
        save("wiki_pages.json", pages)
    pages = {t: pages[t] for t in roster if t in pages}
    save("wiki_pages.json", pages)
    return pages


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
                    out.append({"name": im.get("name"), "url": im.get("url"),
                                "caption": im.get("caption") or im.get("alt") or "", "section": ctx})
            elif isinstance(d, dict):
                walk(d.get("value"), d.get("label") or ctx if t == "section" else ctx)
            elif isinstance(d, list):
                walk(d, ctx)
    walk(ib or [], "")
    return out


def collect_files(pages):
    files = load("wiki_files.json", {})
    names = sorted({im["name"] for p in pages.values() for im in infobox_images(p["infobox"]) if im["name"]})
    todo = [n for n in names if n not in files]
    print(f"wiki files: {len(names)} referenced, {len(todo)} to query")
    for i in range(0, len(todo), 50):
        chunk = todo[i:i + 50]
        r = get(API, params={"action": "query", "prop": "imageinfo", "iiprop": "url|size|mime|timestamp|user",
                             "titles": "|".join("File:" + n for n in chunk), "format": "json"}).json()
        norm = {x["to"]: x["from"] for x in r["query"].get("normalized", [])}
        for p in r["query"]["pages"].values():
            name = p["title"].replace("File:", "", 1)
            ii = (p.get("imageinfo") or [{}])[0]
            files[name] = {"name": name, "file_page": ii.get("descriptionurl"), "url": ii.get("url"),
                           "width": ii.get("width"), "height": ii.get("height"), "mime": ii.get("mime"),
                           "uploaded": ii.get("timestamp"), "missing": "missing" in p}
        save("wiki_files.json", files)
        print(f"  files {len(files)}")
    return files


if __name__ == "__main__":
    what = sys.argv[1:] or ["official", "wiki", "files"]
    if "official" in what:
        collect_official()
    if "wiki" in what or "files" in what:
        pg = collect_wiki()
        if "files" in what:
            collect_files(pg)
