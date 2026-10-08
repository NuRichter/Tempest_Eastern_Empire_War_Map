"""
High-definition map layers and the 3D relief.

    public/maps/myth-map.jpg   (2641 x 2035, the painted map)
    public/maps/base-map.png   (2641 x 2035, the line map)
        ->  public/tiles/myth/{z}/{x}/{y}.jpg   Web-Mercator raster tiles, z0..5, from a x4
                                                FSRCNN super-resolution of the painted map
        ->  public/maps/coast.json             land and lake polygons in simulation
                                                coordinates (vector, sharp at any zoom)
        ->  public/maps/3d/height.png          stylised relief for the 3D view (1024 wide)
        ->  public/maps/3d/myth-4k.jpg         4096-wide texture for the 3D view
        ->  public/maps/3d/base-4k.jpg         4096-wide texture for the 3D view

The atlas projection (src/lib/coords.ts) maps simulation x linearly onto
Web-Mercator x and simulation y linearly onto Web-Mercator y, so a tile pixel
maps to an image pixel by an affine transform.

The relief is a STYLISED reconstruction for the 3D view: the novels give no
elevations. Land rises away from the coast, and rugged ground in the painted
map (mountains are drawn with strong shading) becomes ridges.

Needs OpenCV with dnn_superres (opencv-contrib) and the FSRCNN_x4 model:

    python scripts/cartography/build_hd_maps.py --model path/to/FSRCNN_x4.pb
"""
import argparse
import json
import math
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent.parent
MAPS = ROOT / 'public' / 'maps'
W, H = 2641, 2035
LNG_SPAN = 260.0
MH = (LNG_SPAN / 360.0) * (H / W) * 0.5  # Mercator half-height of the atlas
MX0 = (180.0 - LNG_SPAN / 2) / 360.0      # Mercator x of the atlas west edge
MX_SPAN = LNG_SPAN / 360.0
MY0 = 0.5 - MH


def sea_mask(img: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(int)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    return ((h >= 80) & (h <= 110) & (s > 60) & (v > 100)).astype(np.uint8)


def super_resolve(img: np.ndarray, model: str) -> np.ndarray:
    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    sr.readModel(model)
    sr.setModel('fsrcnn', 4)
    # Tile the work (with overlap) to keep memory modest.
    T, O = 512, 16
    out = np.zeros((img.shape[0] * 4, img.shape[1] * 4, 3), np.uint8)
    for y in range(0, img.shape[0], T):
        for x in range(0, img.shape[1], T):
            y0, x0 = max(0, y - O), max(0, x - O)
            y1, x1 = min(img.shape[0], y + T + O), min(img.shape[1], x + T + O)
            up = sr.upsample(img[y0:y1, x0:x1])
            oy, ox = (y - y0) * 4, (x - x0) * 4
            th, tw = min(T, img.shape[0] - y) * 4, min(T, img.shape[1] - x) * 4
            out[y * 4:y * 4 + th, x * 4:x * 4 + tw] = up[oy:oy + th, ox:ox + tw]
    # A light unsharp mask restores crispness lost to the network's smoothing.
    blur = cv2.GaussianBlur(out, (0, 0), 1.2)
    return cv2.addWeighted(out, 1.35, blur, -0.35, 0)


def tiles(img: np.ndarray, out: Path, zmax: int) -> int:
    count = 0
    ih, iw = img.shape[:2]
    pyramid = {0: img}
    for z in range(zmax, -1, -1):
        n = 2 ** z
        world = 256 * n
        # Source level whose resolution is closest to (but not below) this zoom's.
        need = world * MX_SPAN  # atlas width in px at this zoom
        level = img
        while level.shape[1] / 2 >= need:
            level = cv2.pyrDown(level)
        lh, lw = level.shape[:2]
        tx0, tx1 = int(MX0 * n), int(math.ceil((MX0 + MX_SPAN) * n))
        ty0, ty1 = int(MY0 * n), int(math.ceil((MY0 + 2 * MH) * n))
        for ty in range(max(0, ty0), min(n, ty1)):
            for tx in range(max(0, tx0), min(n, tx1)):
                px = (np.arange(256) + 0.5 + tx * 256) / world
                py = (np.arange(256) + 0.5 + ty * 256) / world
                sx = (px - MX0) / MX_SPAN * lw - 0.5
                sy = (py - MY0) / (2 * MH) * lh - 0.5
                mapx, mapy = np.meshgrid(sx.astype(np.float32), sy.astype(np.float32))
                tile = cv2.remap(level, mapx, mapy, cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(186, 178, 138))
                d = out / str(z) / str(tx)
                d.mkdir(parents=True, exist_ok=True)
                cv2.imwrite(str(d / f'{ty}.jpg'), tile, [cv2.IMWRITE_JPEG_QUALITY, 80, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
                count += 1
    return count


def chaikin(pts: np.ndarray, it: int = 2) -> np.ndarray:
    for _ in range(it):
        q = 0.75 * pts + 0.25 * np.roll(pts, -1, axis=0)
        r = 0.25 * pts + 0.75 * np.roll(pts, -1, axis=0)
        pts = np.empty((len(pts) * 2, 2))
        pts[0::2], pts[1::2] = q, r
    return pts


def coast(base: np.ndarray) -> dict:
    land = 1 - sea_mask(base)
    land = cv2.morphologyEx(land, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    S = 2
    big = cv2.resize(land * 255, (W * S, H * S), interpolation=cv2.INTER_CUBIC)
    big = cv2.GaussianBlur(big, (0, 0), 1.6)
    _, big = cv2.threshold(big, 127, 255, cv2.THRESH_BINARY)
    contours, hier = cv2.findContours(big, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    polys = []
    for i, c in enumerate(contours):
        if hier[0][i][3] != -1:
            continue  # holes are attached to their parent below
        if cv2.contourArea(c) < 60 * S * S:
            continue
        rings = [c]
        k = hier[0][i][2]
        while k != -1:
            if cv2.contourArea(contours[k]) > 40 * S * S:
                rings.append(contours[k])
            k = hier[0][k][0]
        out = []
        for ring in rings:
            r = cv2.approxPolyDP(ring, 0.8, True).reshape(-1, 2).astype(float)
            if len(r) < 4:
                continue
            r = chaikin(r, 2)
            out.append([[round(p[0] / (W * S), 6), round(p[1] / (H * S), 6)] for p in r] + [[round(r[0][0] / (W * S), 6), round(r[0][1] / (H * S), 6)]])
        if out:
            polys.append(out)
    return {'about': 'Land (with lakes as holes) traced from public/maps/base-map.png by scripts/cartography/build_hd_maps.py. Simulation coordinates. Drawn as vector so coastlines stay sharp at any zoom.', 'polygons': polys}


def relief(base: np.ndarray, myth: np.ndarray) -> np.ndarray:
    RW = 1024
    RH = round(RW * H / W)
    land = 1 - sea_mask(cv2.resize(base, (RW, RH), interpolation=cv2.INTER_AREA))
    land = cv2.morphologyEx(land, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    din = cv2.distanceTransform(land, cv2.DIST_L2, 5)
    dout = cv2.distanceTransform(1 - land, cv2.DIST_L2, 5)
    inland = np.clip(din / 40.0, 0, 1)
    plateau = inland ** 0.6
    # Rugged ground in the painted map: local contrast of its luminance.
    g = cv2.cvtColor(cv2.resize(myth, (RW, RH), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    mean = cv2.GaussianBlur(g, (0, 0), 4)
    var = cv2.GaussianBlur((g - mean) ** 2, (0, 0), 6)
    rug = np.clip((np.sqrt(var) - 0.04) / 0.10, 0, 1)
    # Gather it into ranges: only broad, consistently rugged ground becomes mountains.
    rug = cv2.GaussianBlur(rug, (0, 0), 12)
    rug = np.clip((rug - 0.25) / 0.45, 0, 1)
    # Ridged fractal noise shapes the mountains.
    rng = np.random.default_rng(7)
    ridge = np.zeros((RH, RW), np.float32)
    amp = 1.0
    for octave in range(5):
        cell = 2 ** (octave + 3)
        nz = rng.random((RH // cell + 2, RW // cell + 2)).astype(np.float32)
        nz = cv2.resize(nz, (RW + cell * 2, RH + cell * 2), interpolation=cv2.INTER_CUBIC)[:RH, :RW]
        ridge += amp * (1 - np.abs(nz * 2 - 1))
        amp *= 0.5
    ridge = np.clip(ridge / ridge.max(), 0, 1)
    rug = np.clip(rug, 0, 1)
    # Canon highlands: Dwargon's capital is carved into the Kanaat Mountains.
    yy, xx = np.mgrid[0:RH, 0:RW].astype(np.float32)
    def massif(cx: float, cy: float, sx: float, sy: float, ang: float) -> np.ndarray:
        dx, dy = xx / RW - cx, (yy / RH - cy) * H / W
        ca, sa = math.cos(ang), math.sin(ang)
        u, v = dx * ca + dy * sa, -dx * sa + dy * ca
        return np.exp(-(u * u) / (2 * sx * sx) - (v * v) / (2 * sy * sy)).astype(np.float32)
    kanaat = massif(0.665, 0.405, 0.045, 0.018, -0.5)
    rolling = cv2.GaussianBlur(rng.random((RH, RW)).astype(np.float32), (0, 0), 18)
    rolling = (rolling - rolling.min()) / (rolling.max() - rolling.min() + 1e-6)
    height = 0.10 + 0.18 * plateau + 0.10 * rolling * plateau + 0.75 * np.maximum(rug, kanaat * 0.9) * ridge ** 1.4 * plateau
    height = np.where(land > 0, height, -np.clip(dout / 60.0, 0, 1) * 0.08)
    height = cv2.GaussianBlur(height, (0, 0), 1.0)
    # 0..1, sea level at 0.25 (encoded), saved as 16-bit for smooth terrain.
    enc = np.clip((height + 0.08) / 1.0, 0, 1)
    return (enc * 65535).astype(np.uint16)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True)
    ap.add_argument('--zmax', type=int, default=5)
    a = ap.parse_args()
    base = cv2.imread(str(MAPS / 'base-map.png'))
    myth = cv2.imread(str(MAPS / 'myth-map.jpg'))
    (MAPS / 'coast.json').write_text(json.dumps(coast(base), separators=(',', ':')))
    print('coast written')
    out3d = MAPS / '3d'
    out3d.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out3d / 'height.png'), relief(base, myth))
    print('relief written')
    hd = super_resolve(myth, a.model)
    print('super-resolved', hd.shape)
    cv2.imwrite(str(out3d / 'myth-4k.jpg'), cv2.resize(hd, (4096, round(4096 * H / W)), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 86])
    base4 = cv2.resize(base, (4096, round(4096 * H / W)), interpolation=cv2.INTER_LANCZOS4)
    cv2.imwrite(str(out3d / 'base-4k.jpg'), base4, [cv2.IMWRITE_JPEG_QUALITY, 88])
    n = tiles(hd, ROOT / 'public' / 'tiles' / 'myth', a.zmax)
    print('tiles', n)


if __name__ == '__main__':
    main()
