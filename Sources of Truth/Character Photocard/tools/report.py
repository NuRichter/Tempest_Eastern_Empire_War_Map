"""Stage 3: human-readable research_notes.md and missing_characters.md from the manifest."""
import json, re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
META = ROOT / "metadata"
man = json.loads((META / "character_manifest.json").read_text("utf-8"))
chars = man["characters"]
arc = man["archive"]
official = json.loads((META / "cache" / "official.json").read_text("utf-8"))
mapping = json.loads((META / "cache" / "official_mapping.json").read_text("utf-8"))
decisions = json.loads((META / "cache" / "decisions.json").read_text("utf-8"))
by_name = {c["identity"]["canonical_name"]: c for c in chars}

import build  # noqa: E402  (editorial tables live in build.py)

SEPARATE = [("Veldora Tempest", "Veldora Against"), ("Ranga", "Ranga II"), ("Geld Senior", "Geld Junior"),
            ("Maria", "Maria Rosso", "Maria Rosso (servant)"), ("Cougar", "Cougar II"),
            ("Carbuncle", "Carbuncle (Isekai Memories)")]


def table(rows, head):
    out = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    out += ["| " + " | ".join(str(x).replace("|", "/") for x in r) + " |" for r in rows]
    return "\n".join(out)


def counts(key):
    return Counter(key(c) for c in chars)


# ------------------------------------------------------------------ research notes
cards = [c for c in chars if c["filename"]]
med = Counter(c["visual_reference"]["preferred_medium"] for c in cards)
tier = Counter(c["visual_reference"]["source_tier"] for c in cards)
fac = counts(lambda c: c["classification"]["faction"])
race = counts(lambda c: c["classification"]["race"])
imp = counts(lambda c: c["classification"]["importance"])
gen = counts(lambda c: c["classification"]["gender"])
rel = counts(lambda c: c["character_context"]["eastern_empire_relevance"])
proc = Counter((c["image"]["processing"] or "").split(" (")[0] for c in cards)
anchor = Counter(re.search(r"\((.*)\)", c["image"]["processing"]).group(1) for c in cards
                 if c["image"]["processing"] and "(" in c["image"]["processing"])

L = []
A = L.append
A("# Tensura Character Photocard Research Notes\n")
A(f"Archive version {arc['version']} · research revision {arc['research_revision']} · last updated {arc['last_updated']}\n")
A("## Archive Overview\n")
A("### Objective\nA visual reference archive with one portrait card per character of *That Time I Got Reincarnated as a Slime* "
  "(Tensura), each traceable to the exact image it was made from. It supports the Tempest–Eastern Empire War "
  "timeline project in `Sources of Truth/Timeline Database`.\n")
A("### Scope\n"
  f"- **Full Tensura cast**, as the user confirmed on 2026-10-07. Sections 1–14 of the original brief were not supplied, so the roster "
  "and fit rules were agreed with the user directly.\n"
  f"- Roster = every article in the Tensura Fandom wiki's `Category:Characters` ({len(chars) - 2} pages, "
  "excluding three spin-off list pages), plus 2 characters that appear in the official portal's character database but are not "
  "in that wiki category (Ifrit, Clerics of the Seven Luminaries).\n"
  f"- **{len(chars)} characters** in total. Every one has a manifest record, including those without a usable image (see `missing_characters.md`).\n")
A("### Search methodology\n"
  "1. Read the official portal index at `https://www.ten-sura.com/character` (120 entries). For each entry, record the Japanese name, the romanised name, "
  "the voice actor and the character-art URL.\n"
  "2. List `Category:Characters` with the MediaWiki API (`tensura.fandom.com/api.php`). The HTML pages return 403 to scripts, and the API gives structured data.\n"
  "3. For each article, read the portable-infobox JSON (`pageprops.infoboxes`): images with their medium captions and form tabs, "
  "plus Japanese name, rōmaji, aliases, species, gender, affiliation, occupation and debut chapter or episode in each medium. Also record the wiki categories.\n"
  "4. Get each infobox image's original URL, size and MIME type from `prop=imageinfo`.\n"
  "5. Match official entries to wiki articles by English name, then by unique first name, then by a manual table checked against "
  "Japanese names and official bios. A Japanese-name cross-check runs on every match; see Naming Decisions.\n")
A("### Source priority (as applied)\n"
  "1. Official portal character art (ten-sura.com): tier 1, `official_anime_character_art`.\n"
  "2. Wiki infobox image, choosing the character's **primary form** first, then by medium: anime (tier 1) > movie (tier 3) > manga (tier 4) > "
  "light novel (tier 5) > game / unclassified (tier 6) > kids edition.\n"
  "3. Official group art or art of an earlier identity, used only as a last resort or as the backup source.\n\n"
  "Wiki-hosted anime frames and manga panels keep the tier of their **medium**. Their `source_type` ends in `_via_wiki` so it stays clear "
  "that a secondary site hosts them. Confidence is *high* only for official-portal art.\n")
A("### Image selection methodology\n"
  "- No AI generation, redrawing or upscaling models. Every card comes from one existing image.\n"
  "- The wiki's `No Image (L).png` placeholder is always rejected.\n"
  "- When an infobox has form tabs, form labels such as *true form, dragon, slime, stampede, beast, initial, unnamed* rank below the primary form. "
  "For example, Milim's *Concealed form* and Velgrynd's *Human Form* are preferred.\n"
  "- Raw files are hashed (SHA-256). If two characters resolve to the same source file or final file, both are flagged.\n")
A("### Processing methodology\n"
  f"- Target: **2200 × 3400 px, 11:17 portrait, JPEG quality 92**, filename `NNN_<Canonical Name>.jpg`.\n"
  "- **Cut-out art** (more than 5% transparent pixels, which covers all official portal art and most wiki renders) is trimmed to its alpha bounding box, then scaled to fit "
  "inside a 5% margin and placed at the bottom centre of a white card. Nothing is cropped away.\n"
  "- **Opaque images** are cropped to 11:17 to fill the card, as the user chose. The crop is anchored by, in order: (a) a manual centre from visual review, "
  "(b) an anime-face detector (nagadomi `lbpcascade_animeface`, MIT; detections need weight ≥ 1.0 and height ≥ 12% of the frame), "
  "(c) for wide frames, edge density weighted toward the centre, (d) for tall images, a bias toward the top.\n"
  "- Every heavily cropped image (more than 25% of the area removed, 111 images) was checked by eye against its crop box.\n"
  f"- Results: {dict(proc)}; crop anchors {dict(anchor)}.\n"
  "- **Quality score (0–100)** = 50·√min(1, native-equivalent height / 3400) + 30·tier factor (1.0, 0.9, 0.85, 0.75, 0.65, 0.5) + 20·fit factor "
  "(1.0, or the retained area fraction when less than 80% of the image survives the crop). The available sources are small: official art is 660×920, "
  "so **every card is upscaled**. Cards below 500 px native-equivalent height are flagged `low_resolution`.\n")

A("## Character Census\n")
A(f"- Total characters researched: **{len(chars)}**\n- Cards produced: **{len(cards)}**\n- No usable image: **{len(chars) - len(cards)}**\n")
A("### By faction (primary affiliation)\n" + table(sorted(fac.items(), key=lambda x: -x[1]), ["Faction", "Characters"]) + "\n")
A("Faction comes from the first matching wiki category in a fixed priority list (Primordials > True Dragons > Demon Lords > Eastern Empire > "
  "Holy Empire > Tempest > …). If no category matches, it is the first infobox affiliation; if there is none, it is `unknown`.\n")
A("### By race group\n" + table(sorted(race.items(), key=lambda x: -x[1]), ["Race group", "Characters"]) + "\n")
A("### By importance\n" + table(sorted(imp.items(), key=lambda x: -x[1]), ["Importance", "Characters"]) + "\n")
A("Importance is an editorial grouping, not a canon fact: `main` = Rimuru; `major` = has an entry in the official portal's character database; "
  "`supporting` = has an anime or manga debut on the wiki; `minor` = everything else (light-novel, web-novel or game-only characters).\n")
A("### By gender\n" + table(sorted(gen.items(), key=lambda x: -x[1]), ["Gender", "Characters"]) + "\n")

A("## Source Hierarchy\n")
A(table([(1, "Official anime", "Official portal art + anime frames on wiki", tier.get(1, 0)),
         (2, "Official promotional", "not separately sourced in this revision", tier.get(2, 0)),
         (3, "Movie / OVA / special", "wiki images of movie-only characters", tier.get(3, 0)),
         (4, "Manga", "main series + spin-off manga panels and art", tier.get(4, 0)),
         (5, "Light novel", "Mitz Vah illustrations and renders", tier.get(5, 0)),
         (6, "Secondary / other", "game art, unclassified wiki images", tier.get(6, 0))],
        ["Tier", "Source", "What was used", "Cards"]) + "\n")
A("Cards by medium: " + ", ".join(f"{k}: {v}" for k, v in med.most_common()) + "\n")
A("Where the wiki does not caption an image's medium, it is inferred **only** from a 16:9 broadcast frame size (marked `medium_inferred: true`, "
  "confidence *low*) or from the movie-only category. Otherwise the medium stays `unknown` and the card is flagged `source_unverified`.\n")

A("## Character Selection Decisions\n")
A("### Rimuru Tempest\nSelected source: official portal character art (anime design, human form, with the slime form beside him).\n"
  "Reason: tier-1 official art; it shows both canonical forms. Alternatives: wiki LN, manga, anime and game images of both the slime and human/Demon Lord tabs "
  "(recorded in `alternative_images_considered`).\n")
A("### Velgrynd\nSelected source: light-novel render `Velgrynd LN.png` (wiki).\n"
  "Reason: the only anime image (`Episode 65 - Velgrynd.png`, a cameo) shows her from behind, which does not work as a portrait card. "
  "Velgrynd is a critical Eastern Empire war figure, so a clean full-figure design takes priority over the medium order. The anime frame is kept as the backup source.\n")
A("### Manual crop centres\n" + "\n".join(f"- **{k}**: crop centred at {v:.0%} of the frame width (auto-crop missed the face)."
                                       for k, v in build.CROP_CENTRE.items()) + "\n")
A("### Multi-form characters (form chosen automatically)\n")
rows = []
for d in decisions:
    c = by_name.get(d["name"])
    if not c or c["visual_reference"]["source_tier"] is None:
        continue
    rows.append((f"{c['id']:03d}", d["name"], d["chosen"]["section"] or "(official art)", d["chosen"]["medium"], ", ".join(d["forms"])))
A(table(rows, ["ID", "Character", "Form used", "Medium", "Forms available on wiki"]) + "\n")

A("## Naming Decisions\n")
A("- **Canonical English name** = the wiki article title. The wiki follows the Yen Press translation with community romanisation, "
  "e.g. *Souei, Hakurou, Souka*, where the official portal uses *Soei, Hakuro, Soka*. The portal's spelling is kept in `alternative_spellings`.\n"
  "- **Japanese name** = the official portal's katakana when there is a portal entry; otherwise the wiki's kanji with the reading in full-width parentheses. "
  "The wiki form is always kept in `japanese_name_wiki`.\n"
  "- **Aliases** = wiki *Alias / Epithet / Nickname*; **alternative spellings** = wiki *Alternate Translation(s)*; former names and titles are kept separately.\n"
  "- **Filenames** remove only the characters Windows forbids (`<>:\"/\\|?*`), so apostrophes and diacritics stay (e.g. `Gob'emon`, `Gard Mjöllmile`).\n")
A("### Official portal ↔ wiki matches that needed a decision\n")
rows = [(s, j, t, h) for s, j, t, h in mapping if h != "exact"]
A(table(rows, ["Portal slug", "Japanese name", "Wiki article", "Method"]) + "\n")
A("Notes on specific matches:\n"
  "- `maria` (マリア) is **Maria Rosso**, wife of Granbell, as the portal bio confirms. The wiki article titled *Maria* is a different character "
  "(the manas inside Yuuki), so the name-only match was overridden.\n"
  "- `gail` (ゲイル) is **Gale Gibson**, one of Shizu's five students (the portal bio confirms).\n"
  "- `geld` (ゲルド) is **Geld Junior**, the named orc general who served under the Orc Disaster Geld (*Geld Senior* on the wiki).\n"
  "- `eren` (エレン) is **Elyun Grimwald**. This is the only match where the Japanese names differ (エレン vs エリュン). The wiki article covers Elen's "
  "true identity as Erald's daughter, so the match is kept with *medium* confidence.\n"
  "- `gaia` (ガイア) is **Velgaia**. The wiki redirects *Gaia* to *Velgaia* (per the portal, Milim's close friend, a spirit dragon).\n")

A("## Form / Identity Decisions\n")
A("- **Merged**: *Great Sage* and *Raphael* (portal entries) are earlier identities of **Ciel**. They have no cards of their own; their portal art is "
  "the backup source for Ciel.\n"
  "- **Group portal entries**: *Gozul & Mezul* (`bovix_equix`) and *Daggra / Liura / Debra* (`daggra_liura_chonkra`) each show several characters on one card. "
  "Every individual has their own wiki-sourced card, and the group art is recorded as backup only.\n"
  "- **Group character**: *Clerics of the Seven Luminaries* gets one card from the portal art. The individual clerics (Ars, Dina, Granbell, Meris, "
  "Salun, Vina, …) are separate cards; where the only image is the shared group frame, they are flagged `identity_ambiguous`.\n"
  "- **Kept separate**, because the wiki keeps separate articles: " + "; ".join(
      " / ".join(f"*{n}*" for n in grp if n in by_name) for grp in SEPARATE if sum(n in by_name for n in grp) > 1) + ".\n"
  "- **Primary appearance**: for multi-form characters, see the table above. Evolved forms are not split into extra cards.\n")

A("## Eastern Empire Relevance\n")
A("Relevance is measured from the project's own LN-derived war dataset (`Timeline Database/Tempest_Eastern_Empire_War_Timeline.md`, volumes 12–16). "
  "It counts whole-word mentions of the article title, of the first name (only when no other character shares it) and of each alternate translation. "
  "Thresholds: ≥25 critical, ≥8 high, ≥3 medium, ≥1 low. Wiki *Eastern Empire* category members with no mentions are marked `low`. "
  "This is a measure of presence in the dataset; it does not rank importance.\n")
A(table(sorted(rel.items(), key=lambda x: ["critical", "high", "medium", "low", "none"].index(x[0])), ["Level", "Characters"]) + "\n")
for lvl in ("critical", "high", "medium"):
    rows = sorted(((f"{c['id']:03d}", c["identity"]["canonical_name"], c["classification"]["faction"],
                    c["character_context"]["timeline_mentions"]) for c in chars
                   if c["character_context"]["eastern_empire_relevance"] == lvl), key=lambda r: -r[3])
    A(f"### {lvl.title()}\n" + table(rows, ["ID", "Character", "Faction", "Mentions"]) + "\n")

A("## Research Exceptions\n")
nophoto = sum(1 for c in chars if "no_usable_image" in c["status_flags"])
A(f"- The Fandom HTML pages return HTTP 403 to non-browser clients. The MediaWiki API works and was used for everything.\n"
  f"- {nophoto} wiki articles have only the `No Image (L).png` placeholder. They are listed in `missing_characters.md` with their debut "
  "episode or chapter as a lead.\n"
  "- Official portal art is 660 × 920 px. It is the most authoritative source but needs about 3.7× upscaling to fill 3400 px.\n"
  "- Several wiki images are shared between articles: the Seven Luminaries group frame, Apito/Zegion manga panels, and the Ifrit LN art shared with Charys. "
  "Those cards are flagged `identity_ambiguous`.\n"
  "- Multi-person anime frames where the subject cannot be confirmed (Kazhil, Rommel, Rugurd) were flagged during visual review.\n"
  "- OpenCV 5.x removed `CascadeClassifier`, so the pipeline pins `opencv-python-headless<5`.\n")
A("## Replacement history\n_No cards replaced yet. When a card is replaced, record its previous source URL, image URL and the reason here._\n")
(META / "research_notes.md").write_text("\n".join(L), "utf-8")

# ------------------------------------------------------------------ missing characters
todo = [c for c in chars if c["status"] != "complete"]
miss = [c for c in todo if c["status"] == "missing"]
inc = [c for c in todo if c["status"] == "incomplete"]
flag_count = Counter(f for c in todo for f in c["status_flags"])


def priority(c):
    if c["character_context"]["eastern_empire_relevance"] in ("critical", "high") or c["classification"]["importance"] in ("main", "major"):
        return "high"
    if c["character_context"]["eastern_empire_relevance"] == "medium" or c["classification"]["importance"] == "supporting":
        return "medium"
    return "low"


def next_action(c):
    fa = c["character_context"]["first_major_appearance"] or {}
    f = c["status_flags"]
    if "no_usable_image" in f:
        leads = [f"anime {fa['anime']}" if fa.get("anime") else None, f"manga {fa['manga']}" if fa.get("manga") else None,
                 f"LN {fa['light']}" if fa.get("light") else None]
        leads = [x for x in leads if x]
        return ("Capture a clean frame or panel from " + " or ".join(leads)) if leads else \
            "No published visual design is known (web-novel / text-only). Keep listed; revisit if new art is released."
    if "low_resolution" in f:
        return "Look for a higher-resolution version (official key visual, Blu-ray frame, or a larger manga scan)."
    if "identity_ambiguous" in f:
        return "Find an image showing this character alone, or confirm which figure in the frame is the character."
    if "source_unverified" in f:
        return "Confirm which medium/episode the wiki image comes from (check the file description page)."
    return "Manual review."


L = ["# Missing / Incomplete Characters\n",
     f"_Generated from character_manifest.json, research revision {arc['research_revision']}, {arc['last_updated']}._\n",
     "## Summary\n",
     f"- Total missing (no card): **{len(miss)}**",
     f"- Total incomplete (card exists, needs follow-up): **{len(inc)}**",
     f"- Total low-quality (`low_resolution`): **{flag_count['low_resolution']}**",
     f"- Total source-unverified: **{flag_count['source_unverified']}**",
     f"- Identity ambiguous: **{flag_count['identity_ambiguous']}** · needs review: **{flag_count['needs_review']}** · "
     f"download failed: **{flag_count['download_failed']}** · processing failed: **{flag_count['processing_failed']}**",
     f"- By priority: " + ", ".join(f"{k}: {v}" for k, v in Counter(priority(c) for c in todo).most_common()) + "\n",
     "Nobody is removed from the archive: missing characters keep their ID, so a card can be added later without renumbering.\n"]
for title, group in (("Missing Characters", miss), ("Incomplete Characters", inc)):
    L.append(f"## {title}\n")
    for c in sorted(group, key=lambda c: (["high", "medium", "low"].index(priority(c)), c["id"])):
        v = c["visual_reference"]; r = c["research"]
        rejected = "; ".join(str(x["error"]) for x in r["download_failures"]) or c["notes"].strip() or "—"
        if c["status"] == "incomplete":
            rejected = c["notes"].strip() or ("Card produced but flagged: " + ", ".join(c["status_flags"]))
        L += [f"### {c['id']:03d} · {c['identity']['canonical_name']}\n",
              f"- **Status:** {', '.join(c['status_flags'])}",
              f"- **Reason:** {rejected}",
              f"- **Search queries:** {'; '.join(r['search_queries'])}",
              f"- **Sources checked:** {', '.join(r['sources_checked'])}",
              f"- **Best source discovered:** {v['source_name'] or 'wiki article (no image)'}",
              f"- **Best source URL:** {v['source_url'] or r['sources_checked'][-1]}",
              f"- **Image URL:** {v['image_url'] or 'null'}",
              f"- **Why it was rejected / flagged:** {rejected}",
              f"- **Recommended next action:** {next_action(c)}",
              f"- **Priority:** {priority(c)}\n"]
(META / "missing_characters.md").write_text("\n".join(L), "utf-8")
print("reports written:", len(miss), "missing,", len(inc), "incomplete")
