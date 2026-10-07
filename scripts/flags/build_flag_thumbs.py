"""
Small flag derivatives for the interface.

    public/assets/nation-flags/<Category>/Flag - <Name>.png   (originals, kept as supplied)
        ->  public/assets/nation-flags/thumb/<nation-id>.webp  (96 x 64, 3:2; panels, chips, the Situation bar)

The originals are large PNGs (up to ~2 MB); the interface shows flags at
16-24 px. Run after adding or replacing a flag:

    python scripts/flags/build_flag_thumbs.py
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent.parent
FLAGS = ROOT / 'public' / 'assets' / 'nation-flags'
OUT = FLAGS / 'thumb'
SIZE = (96, 64)


def main() -> None:
    gazetteer = json.loads((ROOT / 'data-source' / 'gazetteer.source.json').read_text(encoding='utf8'))
    OUT.mkdir(parents=True, exist_ok=True)
    wanted = set()
    for n in gazetteer['nations']:
        if n.get('hasFlag') is False:
            continue
        src = FLAGS / n['category'] / f"Flag - {n['name']}.png"
        if not src.exists():
            continue
        im = Image.open(src).convert('RGBA')
        im = im.resize(SIZE, Image.LANCZOS)
        im.save(OUT / f"{n['id']}.webp", 'WEBP', quality=86, method=6)
        wanted.add(n['id'])
    for stale in OUT.glob('*'):
        if stale.stem not in wanted:
            stale.unlink()
    total = sum(p.stat().st_size for p in OUT.glob('*.webp'))
    print(f'{len(wanted)} flag thumbnails -> {OUT.relative_to(ROOT)} ({total / 1024:.0f} KB)')


if __name__ == '__main__':
    main()
