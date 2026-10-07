# Tensura Character Photocard Validation Report

Audit date: 2026-10-07 · manifest research revision 1 · script `tools/validate.py` (re-derives everything from disk)

**Technical integrity: PASS** (0 hard errors). Content-quality follow-ups are listed in `missing_characters.md`.

## Archive Summary

- Total characters: **437**
- Total final cards: **351**
- Valid cards: **351**
- Invalid cards: **0**
- Missing cards: **86** (no usable source image; see missing_characters.md)
- Duplicate cards: **0** (identical files) · shared-source images flagged in manifest: **0**
- Failed downloads: **0**
- Cards with a backup source recorded: **204/351**

## Source Distribution

- Anime: 102
- Official promotional: 116
- Movie: 14
- OVA: 0
- Manga: 41
- Light Novel: 37
- Secondary: 17
- Other: 24

_Official promotional = official portal character art (ten-sura.com). Anime = anime frames/designs hosted on the wiki. Secondary = wiki images with an unverified medium. Other = game and kids-edition art._

## Faction Distribution

- Tempest: 85
- Demon Lords: 15
- Primordials: 7
- True Dragons: 6
- Humans: 73
- Otherworlders: 21
- Holy Empire: 25
- Eastern Empire: 42
- Other: 163

_All characters (including those without a card), grouped by primary faction. Humans and Otherworlders cover characters whose faction is not one of the listed powers._

## Image Quality

- Target resolution: 2200 × 3400
- Target aspect ratio: 11:17
- Lowest resolution: 194 px native-equivalent height (270_Melbaba.jpg, source 222×194)
- Highest resolution: 3700 px native-equivalent height (035_Bayashi.jpg, source 3076×3717)
- Average resolution: 953 px native-equivalent height (mean upscale ×4.13)
- Average quality score: 68.4 / 100
- Every final file is exactly 2200 × 3400. *Native-equivalent height* is how tall the card would be at the source image's own resolution. Every card is upscaled from a smaller source; see research_notes.md.

## Technical Validation

| Check | Result | Failures |
|---|---|---|
| file exists | PASS | 0 (all 351 manifest files present: yes) |
| image opens / no corruption | PASS | 0 |
| correct extension | PASS | 0 |
| valid dimensions (2200×3400) | PASS | 0 |
| correct aspect ratio (11:17) | PASS | 0 |
| correct orientation (portrait) | PASS | 0 |
| no accidental HTML downloads | PASS | 0 |
| duplicate check (identical files) | PASS | 0 |
| character identity verified | PASS | 0 unverified; 6 flagged identity_ambiguous |
| source verified (URL recorded, medium known) | REVIEW | 17 with unverified medium |
| provenance complete (source URL, image URL, original size, reason, date) | PASS | 0 |
| JSON valid | PASS | |
| CSV valid (28 columns every row) | PASS | |

Cards whose medium is unverified (still sourced and traceable): 050_Carbuncle (Isekai Memories).jpg, 071_Cockle.jpg, 102_Elizabeth.jpg, 104_Ellory.jpg, 202_Jax.jpg, 267_Mark Lauren.jpg, 287_Mokshan.jpg, 305_Oloy.jpg, 313_Pain.jpg, 329_Rahan.jpg, 364_Shin Ryusei.jpg, 365_Shinji Tanimura.jpg, 375_Stella.jpg, 388_Thegis.jpg, 398_Ukya.jpg, 404_Veldanava.jpg, 425_Zachariah.jpg

Cards flagged identity_ambiguous: 140_Gazat.jpg, 222_Kazhil.jpg, 262_Maria.jpg, 301_Notos.jpg, 348_Rommel.jpg, 351_Rugurd.jpg

## Filename Validation

Pattern: `^[0-9]{3}_.+\.(jpg|jpeg|png)$`

Violations: **0**

Non-card files in archive root: none

## Numbering Validation

- starts at 001: PASS
- no duplicate IDs: PASS
- no duplicate filenames: PASS
- no missing numeric sequence (manifest 001–437): PASS
- IDs match manifest (filename prefix = id): PASS
- IDs match CSV: PASS
- Card files skip the 86 IDs without a card. This is intentional: missing characters keep their number and are listed in missing_characters.md.

## Metadata Synchronization

- filesystem ↔ manifest: PASS (351 files, 351 manifest filenames)
- manifest ↔ CSV: PASS (437 records, 437 CSV rows)
- archive.total_characters = 437 (PASS)

### Inconsistencies / errors
None.
