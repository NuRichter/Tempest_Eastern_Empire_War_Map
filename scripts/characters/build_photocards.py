"""
Photocard assets.

    data-source/characters.source.json  +  Sources of Truth/Character Photocard/*.jpg
        ->  public/assets/characters/<character-id>.webp        (360 x 556, the cards' 11:17 ratio; dossiers)
        ->  public/assets/characters/thumb/<character-id>.webp  (120 x 185; map portraits, event cards, lists)

The source cards are 2200 x 3400 upscales of much smaller originals, so a
360px-wide derivative loses no real detail and keeps the page light. Only
characters named by the campaign are exported. Re-run after editing the
character source:

    python scripts/characters/build_photocards.py
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent.parent
SOURCE = ROOT / 'data-source' / 'characters.source.json'
OUT = ROOT / 'public' / 'assets' / 'characters'
SIZE = (360, 556)
THUMB = (120, 185)


def main() -> None:
    doc = json.loads(SOURCE.read_text(encoding='utf8'))
    card_root = ROOT / doc['about']['photocardRoot']
    (OUT / 'thumb').mkdir(parents=True, exist_ok=True)
    wanted = set()
    for c in doc['characters']:
        card = c.get('photocard')
        if not card:
            continue
        src = card_root / card['file']
        if not src.exists():
            raise SystemExit(f"Photocard for {c['id']} not found: {src}")
        wanted.add(c['id'])
        im = Image.open(src).convert('RGB')
        im.resize(SIZE, Image.LANCZOS).save(OUT / f"{c['id']}.webp", 'WEBP', quality=80, method=6)
        im.resize(THUMB, Image.LANCZOS).save(OUT / 'thumb' / f"{c['id']}.webp", 'WEBP', quality=78, method=6)
    for folder, pattern in ((OUT, '*'), (OUT / 'thumb', '*')):
        for stale in folder.glob(pattern):
            if stale.is_file() and (stale.suffix != '.webp' or stale.stem not in wanted):
                stale.unlink()
    total = sum(p.stat().st_size for p in OUT.rglob('*.webp'))
    print(f'{len(wanted)} photocards (+ thumbnails) -> {OUT.relative_to(ROOT)} ({total / 1024:.0f} KB)')


if __name__ == '__main__':
    main()
