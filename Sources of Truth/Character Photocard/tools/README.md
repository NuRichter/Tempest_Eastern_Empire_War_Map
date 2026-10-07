# Character Photocard pipeline

Run from the `Character Photocard` folder:

```
python tools/collect.py          # refresh roster + source records (cached in metadata/cache/)
python tools/build.py            # resume: keeps existing valid cards, fills gaps, rewrites manifest + CSV
python tools/build.py --force    # reprocess every card from the cached raw downloads
python tools/report.py           # research_notes.md + missing_characters.md
python tools/validate.py         # validation_report.md (exit code 1 on any hard error)
```

Requirements: Python 3.12, `requests`, `Pillow`, `opencv-python-headless<5` (5.x has no CascadeClassifier).

- IDs are permanent. New characters get the next free ID, and missing characters keep theirs.
- Editorial decisions live at the top of `build.py`: `OFFICIAL_MAP`, `FORM_PREF`, `PREFER_FILE`, `CROP_CENTRE`,
  `MANUAL_FLAGS`, `FACTION_OVERRIDE`. When you replace a card, record its previous source under *Replacement history*
  in `research_notes.md`.
- `_work/raw/` keeps the untouched downloaded originals, which reprocessing and provenance checks use.
- `lbpcascade_animeface.xml` is © nagadomi, MIT licence.
