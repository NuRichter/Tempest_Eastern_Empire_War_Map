"""
Relief grid for the route compiler.

    public/maps/3d/height.png  (stylised relief, 16-bit, built by build_hd_maps.py)
        ->  data-source/relief.grid.source.json

Samples the relief over the war theatre (the bounds in geography.source.json)
on a regular grid in SIM_NORMALISED coordinates and stores it as base64 of
little-endian uint16, row by row from the north-west corner. The compiler
(scripts/lib/routing.ts) reads it for terrain cost and route elevation
profiles, so building the site needs Node only.

    python scripts/cartography/build_relief_grid.py
"""
import base64
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent.parent
STEP = 0.002


def main() -> None:
    geo = json.loads((ROOT / 'data-source' / 'geography.source.json').read_text(encoding='utf8'))
    b = geo['bounds']
    src = ROOT / 'public' / 'maps' / '3d' / 'height.png'
    h = np.array(Image.open(src)).astype(np.float64)
    hh, ww = h.shape
    cols = int(round((b['x1'] - b['x0']) / STEP)) + 1
    rows = int(round((b['y1'] - b['y0']) / STEP)) + 1
    out = np.zeros((rows, cols), np.uint16)
    for r in range(rows):
        y = b['y0'] + r * STEP
        for c in range(cols):
            x = b['x0'] + c * STEP
            # Bilinear sample at the pixel centre grid of the relief image.
            px = min(ww - 1.001, max(0.0, x * ww - 0.5))
            py = min(hh - 1.001, max(0.0, y * hh - 0.5))
            x0, y0 = int(px), int(py)
            fx, fy = px - x0, py - y0
            v = (h[y0, x0] * (1 - fx) * (1 - fy) + h[y0, x0 + 1] * fx * (1 - fy)
                 + h[y0 + 1, x0] * (1 - fx) * fy + h[y0 + 1, x0 + 1] * fx * fy)
            out[r, c] = int(round(v))
    payload = {
        'about': 'Stylised relief sampled from public/maps/3d/height.png by scripts/cartography/build_relief_grid.py. Relative heights for route cost and profiles, not a survey.',
        'source': 'public/maps/3d/height.png',
        'sourceSha256': hashlib.sha256(src.read_bytes()).hexdigest(),
        'x0': b['x0'], 'y0': b['y0'], 'step': STEP, 'cols': cols, 'rows': rows,
        'encoding': 'base64 uint16 little-endian, row-major from the north-west corner',
        'data': base64.b64encode(out.astype('<u2').tobytes()).decode('ascii'),
    }
    (ROOT / 'data-source' / 'relief.grid.source.json').write_text(json.dumps(payload, indent=1) + '\n', encoding='utf8')
    print(f'relief grid {cols} x {rows}, min {out.min()} max {out.max()}')


if __name__ == '__main__':
    main()
