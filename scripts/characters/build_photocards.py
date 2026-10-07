"""
Photocard assets.

    data-source/characters.source.json  +  Sources of Truth/Character Photocard/*.jpg
        ->  public/assets/characters/<character-id>.jpg   (360 x 556, the cards' 11:17 ratio)

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


def main() -> None:
    doc = json.loads(SOURCE.read_text(encoding='utf8'))
    card_root = ROOT / doc['about']['photocardRoot']
    OUT.mkdir(parents=True, exist_ok=True)
    wanted = set()
    for c in doc['characters']:
        card = c.get('photocard')
        if not card:
            continue
        src = card_root / card['file']
        if not src.exists():
            raise SystemExit(f"Photocard for {c['id']} not found: {src}")
        dest = OUT / f"{c['id']}.jpg"
        wanted.add(dest.name)
        im = Image.open(src).convert('RGB')
        im = im.resize(SIZE, Image.LANCZOS)
        im.save(dest, 'JPEG', quality=80, optimize=True, progressive=True)
    for stale in OUT.glob('*.jpg'):
        if stale.name not in wanted:
            stale.unlink()
    total = sum(p.stat().st_size for p in OUT.glob('*.jpg'))
    print(f'{len(wanted)} photocards -> {OUT.relative_to(ROOT)} ({total / 1024:.0f} KB)')


if __name__ == '__main__':
    main()
