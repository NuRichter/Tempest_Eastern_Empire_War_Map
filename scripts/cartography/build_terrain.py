"""
Continental terrain: the relief and the physical basemap.

    public/maps/base-map.png   (2641 x 2035, the line map: land and sea)
    public/maps/myth-map.jpg   (2641 x 2035, the painted map: vegetation zones, drawn ranges)
    data-source/geography.source.json  (Dwargon massif, forests, lakes, rivers)
        ->  public/maps/3d/height.png           stylised relief, 16-bit, 1024 wide (routing)
        ->  public/maps/3d/height-3d.png        the same, 8-bit, for the 3D view
        ->  public/tiles/terrain/{z}/{x}/{y}.webp  physical basemap tiles, z0..6
        ->  public/maps/3d/terrain-4k.webp      the same basemap as the 3D texture
        ->  public/maps/terrain-biomes.json     land cover statistics (km2) for the docs

The atlas is a 1:1 world in kilometres (src/lib/world.ts: 2.0 km per atlas
pixel, 5,282 x 4,070 km). The basemap reads like a physical web map: sea
shaded by depth, lowland green, forest, steppe and barren ground, rock and
snow on high ground, lakes and rivers, and hillshade from the relief.

Every layer is a STYLISED reconstruction. The painted map gives the broad
zones (its green and tan washes, its drawn ranges and tree clusters); the
novels give a handful of named features (geography.source.json). Detail
below about 10 km (field patches, single tree stipples, small ridges) is
deterministic noise in world coordinates, so tiles join without seams and
every build is identical.

The Kanaat massif (Dwargon) is a compact range: an impassable core about
44 x 40 km around the capital, foothills to about 66 x 60 km, summit near
2,900 synthetic metres. The painted map draws the range several hundred
kilometres across as a pictorial symbol; the relief keeps only the core
and turns the rest of that symbol into upland.

    python scripts/cartography/build_terrain.py [--zmax 6]
"""
import argparse
import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent.parent
MAPS = ROOT / 'public' / 'maps'
W, H = 2641, 2035
KM_X, KM_Y = 5282.0, 4070.0
LNG_SPAN = 260.0
MH = (LNG_SPAN / 360.0) * (H / W) * 0.5
MX0 = (180.0 - LNG_SPAN / 2) / 360.0
MX_SPAN = LNG_SPAN / 360.0
MY0 = 0.5 - MH

# Dwargon: the capital and the massif around it (SIM_NORMALISED).
CITY = (0.6649, 0.40564)
MASSIF_C = (CITY[0], CITY[1] - 14.0 / KM_Y)   # summit 14 km north of the city
MASSIF_A, MASSIF_B = 22.0, 20.0               # core semi-axes, km (E-W, N-S)
FOOT = 1.5                                    # foothills reach 1.5 x the core


def sea_mask(img: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(int)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    return ((h >= 80) & (h <= 110) & (s > 60) & (v > 100)).astype(np.uint8)


def massif_r(x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Elliptic radius from the summit, 1.0 on the core edge."""
    dx = (x - MASSIF_C[0]) * KM_X / MASSIF_A
    dy = (y - MASSIF_C[1]) * KM_Y / MASSIF_B
    return np.sqrt(dx * dx + dy * dy)


def value_noise(seed: int, size: int = 512, cell: int = 8) -> np.ndarray:
    """Tileable smooth noise, 0..1."""
    rng = np.random.default_rng(seed)
    g = rng.random((size // cell, size // cell)).astype(np.float32)
    g = np.tile(g, (3, 3))
    up = cv2.resize(g, (size * 3, size * 3), interpolation=cv2.INTER_CUBIC)
    return np.clip(up[size:size * 2, size:size * 2], 0, 1)


NOISE = [value_noise(11 + k) for k in range(6)]


def wrap_sample(tex: np.ndarray, u: np.ndarray, v: np.ndarray) -> np.ndarray:
    n = tex.shape[0]
    return cv2.remap(tex, (np.mod(u, 1.0) * n).astype(np.float32), (np.mod(v, 1.0) * n).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)


def fbm(x: np.ndarray, y: np.ndarray, km: float, octaves: int, seed: int = 0, ridged: bool = False) -> np.ndarray:
    """Fractal noise in world kilometres; `km` is the largest wavelength."""
    xs, ys = x * KM_X, y * KM_Y
    tot, amp, norm = np.zeros_like(x, np.float32), 1.0, 0.0
    for o in range(octaves):
        wl = km / (2 ** o) * 64  # one noise texture spans 64 cells
        n = wrap_sample(NOISE[(seed + o) % len(NOISE)], xs / wl + 0.37 * o, ys / wl + 0.61 * o)
        if ridged:
            n = 1 - np.abs(n * 2 - 1)
        tot += amp * n
        norm += amp
        amp *= 0.5
    return tot / norm


# --------------------------------------------------------------------------- fields

def ring_mask(ring: list, w: int, h: int, blur: float = 0) -> np.ndarray:
    m = np.zeros((h, w), np.uint8)
    pts = np.array([[p[0] * w, p[1] * h] for p in ring], np.int32)
    cv2.fillPoly(m, [pts], 1)
    m = m.astype(np.float32)
    return cv2.GaussianBlur(m, (0, 0), blur) if blur else m


def build_fields(geo: dict) -> dict:
    base = cv2.imread(str(MAPS / 'base-map.png'))
    myth = cv2.imread(str(MAPS / 'myth-map.jpg'))
    land = 1 - sea_mask(base)
    land = cv2.morphologyEx(land, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    xn, yn = (xx + 0.5) / W, (yy + 0.5) / H

    # Painted lakes: small grey-blue pools inside the land, grown from seeds.
    lab = cv2.cvtColor(cv2.GaussianBlur(myth, (0, 0), 1.2), cv2.COLOR_BGR2LAB).astype(np.float32)
    lakes = np.zeros((H, W), np.uint8)
    for (lx, ly, tol) in [(0.700, 0.554, 16), (0.487, 0.585, 16), (0.804, 0.624, 16), (0.838, 0.373, 16)]:
        cx, cy = int(lx * W), int(ly * H)
        r = 70
        win = lab[cy - r:cy + r, cx - r:cx + r]
        proto = np.median(lab[cy - 3:cy + 4, cx - 3:cx + 4].reshape(-1, 3), axis=0)
        d = np.sqrt(((win - proto) ** 2).sum(-1))
        cand = (d < tol).astype(np.uint8)
        cand = cv2.morphologyEx(cand, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        n, lbl = cv2.connectedComponents(cand)
        k = lbl[r, r]
        if k:
            lakes[cy - r:cy + r, cx - r:cx + r] |= (lbl == k).astype(np.uint8)
    for lk in geo['lakes']:
        lakes |= ring_mask(lk['ring'], W, H).astype(np.uint8)
    # The line map draws one inland lake in solid black (the southern island).
    blk = (base.max(axis=2) < 60).astype(np.uint8)
    blk = cv2.morphologyEx(blk, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))  # drops the border lines
    lakes |= blk
    lakes = cv2.morphologyEx(lakes, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)) & land
    water = np.maximum(1 - land, lakes)

    # Vegetation from the painted washes: green (low a*) is grassland, tan is steppe.
    labb = cv2.cvtColor(myth, cv2.COLOR_BGR2LAB).astype(np.float32)
    a = cv2.GaussianBlur(labb[..., 1], (0, 0), 9)
    veg = np.clip((133.5 - a) / 9.0, 0, 1)
    sat = cv2.GaussianBlur(labb[..., 2], (0, 0), 9)
    arid = np.clip((sat - 155) / 8.0, 0, 1) * (1 - veg)

    # Interior ground far from the sea is drier.
    din0 = cv2.distanceTransform(land, cv2.DIST_L2, 5) * 2.0
    arid = np.clip(arid + np.clip((din0 - 350) / 300, 0, 0.2) * (1 - veg), 0, 1)

    # Drawn ranges: local contrast of the painting's luminance.
    # Measured on a 1024-wide copy: the drawn ranges are broad shading; single strokes
    # (borders, grid) blur away, and the coast strokes are masked below.
    g = labb[..., 0] / 255
    RW, RH = 1024, round(1024 * H / W)
    g = cv2.resize(g, (RW, RH), interpolation=cv2.INTER_AREA)
    mean = cv2.GaussianBlur(g, (0, 0), 4)
    rug = np.sqrt(cv2.GaussianBlur((g - mean) ** 2, (0, 0), 6))
    rug = np.clip((rug - 0.04) / 0.10, 0, 1)
    rug = cv2.GaussianBlur(rug, (0, 0), 12)
    rug = np.clip((rug - 0.25) / 0.45, 0, 1)
    rug = cv2.resize(rug, (W, H), interpolation=cv2.INTER_CUBIC)
    rug *= np.clip((cv2.distanceTransform(land, cv2.DIST_L2, 5) - 6) / 14, 0, 1)

    # Tree clusters drawn on the painting: dark, finely textured and greenish.
    Lf = labb[..., 0]
    tex = cv2.GaussianBlur(np.abs(Lf - cv2.GaussianBlur(Lf, (0, 0), 2.5)), (0, 0), 5)
    dark = np.clip((120 - cv2.GaussianBlur(Lf, (0, 0), 5)) / 50, 0, 1)
    clusters = np.clip((tex - 9) / 8, 0, 1) * dark * np.clip((136 - a) / 6, 0, 1)
    clusters = cv2.GaussianBlur(clusters, (0, 0), 4)

    # The painted Dwargon symbol (several hundred km across) is not a range here.
    sym = ring_mask(geo['mountains'][0].get('paintedSymbol', geo['mountains'][0]['ring']), W, H, 30)
    rug *= 1 - sym
    clusters *= 1 - sym * 0.6
    # Under the symbol the painting has no wash; borrow the surroundings' vegetation.
    for f in (veg, arid):
        known = (1 - np.clip(sym * 1.4, 0, 1)) * land
        num = cv2.GaussianBlur(f * known, (0, 0), 40)
        den = cv2.GaussianBlur(known, (0, 0), 40) + 1e-4
        f[:] = f * (1 - sym) + (num / den) * sym

    # Named forests (the route model's forests) are forest on the basemap too.
    forest = np.zeros((H, W), np.float32)
    deep = np.zeros((H, W), np.float32)
    for fo in geo['forests']:
        m = ring_mask(fo['ring'], W, H, 14)
        if fo.get('kind') == 'deepForest':
            deep = np.maximum(deep, m)
        forest = np.maximum(forest, m * 0.85)
    forest = np.maximum(forest, np.clip(clusters * 1.6, 0, 1))
    deep = np.maximum(deep, np.clip((clusters - 0.45) * 2, 0, 1))

    # Ice Continent: the northern land mass (its own island); the far north elsewhere is cold.
    n, lbl = cv2.connectedComponents(land)
    ice = (lbl == lbl[int(0.15 * H), int(0.48 * W)]).astype(np.float32)
    north = np.maximum(ice, np.clip((0.33 - yn) / 0.06, 0, 1) * 0.5) * land

    # Coast distances (km): inland for relief, offshore for sea depth.
    din = cv2.distanceTransform(land, cv2.DIST_L2, 5) * 2.0
    dout = cv2.distanceTransform(1 - land, cv2.DIST_L2, 5) * 2.0
    return {'land': land.astype(np.float32), 'water': water.astype(np.float32), 'lakes': lakes.astype(np.float32), 'veg': veg, 'arid': arid,
            'rug': rug, 'forest': forest, 'deep': deep, 'north': north.astype(np.float32), 'din': din, 'dout': dout, 'xn': xn, 'yn': yn}


def build_height(F: dict) -> np.ndarray:
    """Relief at atlas resolution, in synthetic metres (sea floor negative)."""
    xn, yn = F['xn'], F['yn']
    plateau = np.clip(F['din'] / 160.0, 0, 1) ** 0.6
    rolling = fbm(xn, yn, 600, 3, seed=1)
    ridge = fbm(xn, yn, 260, 4, seed=2, ridged=True)
    ranges = F['rug'] * (0.55 + 0.45 * ridge ** 1.3)
    # Ice Continent: glaciated ranges along its spine.
    ranges = np.maximum(ranges, F['north'] * (0.45 + 0.4 * ridge))
    m = 40 + 260 * plateau + 220 * rolling * plateau + 3900 * ranges * plateau
    # Kanaat massif: a compact cone with radial ridges, foothills to FOOT x core.
    r = massif_r(xn, yn)
    ang = np.arctan2((yn - MASSIF_C[1]) * KM_Y, (xn - MASSIF_C[0]) * KM_X)
    spokes = 0.8 + 0.2 * np.cos(ang * 7 + 1.3) * np.clip(r * 1.4, 0, 1)
    rr = fbm(xn, yn, 30, 3, seed=8, ridged=True)
    core = np.exp(-(r ** 2) / (2 * 0.5 ** 2)) * spokes * (0.75 + 0.25 * rr) + 0.35 * np.exp(-(r ** 2) / (2 * 0.8 ** 2)) * rr
    foot = np.clip(1 - (r - 1.0) / (FOOT - 1.0), 0, 1) ** 2 * (r > 1.0) + (r <= 1.0)
    m = m + 2300 * core + 420 * foot * (1 - np.clip(core, 0, 1))
    # Uplands under the painted symbol: rolling hills, nothing impassable.
    m = m + 260 * F.get('sym', 0) if isinstance(F.get('sym'), np.ndarray) else m
    m = np.where(F['land'] > 0, m, -np.clip(F['dout'] / 120.0, 0, 1) * 4200 - 40)
    m = np.where(F['lakes'] > 0, np.minimum(m, 0) - 30, m)
    return cv2.GaussianBlur(m.astype(np.float32), (0, 0), 0.8)


# --------------------------------------------------------------------------- rendering

def hexc(s: str) -> np.ndarray:
    return np.array([int(s[5:7], 16), int(s[3:5], 16), int(s[1:3], 16)], np.float32)  # BGR


PAL = {
    'shallow': hexc('#b3dbee'), 'deep': hexc('#93c5e2'), 'abyss': hexc('#7fb3d6'), 'lake': hexc('#9fd0ea'),
    'grass': hexc('#cde4ad'), 'meadow': hexc('#d9eabb'), 'steppe': hexc('#dfe6bf'), 'barren': hexc('#e8dcb6'),
    'forest': hexc('#a9cf8e'), 'deep_forest': hexc('#8dbf78'), 'tree': hexc('#6e9f5c'),
    'upland': hexc('#ddd8c4'), 'rock': hexc('#cbc3b4'), 'snow': hexc('#f7f9fb'), 'tundra': hexc('#e3e8e2'),
    'river': hexc('#8ec3e2'),
}


def smooth(e0: float, e1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def render(F: dict, M: np.ndarray, x: np.ndarray, y: np.ndarray, km_px: float, geo: dict, ox: float, oy: float, sx: float, sy: float) -> np.ndarray:
    """Colour for sample points (x, y in SIM_NORMALISED, a regular grid).
    (ox, oy, sx, sy) map SIM_NORMALISED to this grid's pixels for vector overlays."""
    def at(f: np.ndarray) -> np.ndarray:
        return cv2.remap(f, (x * W - 0.5).astype(np.float32), (y * H - 0.5).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    land, lakes = at(F['land']), at(F['lakes'])
    veg, arid, forest, deep, north = at(F['veg']), at(F['arid']), at(F['forest']), at(F['deep']), at(F['north'])
    dout = at(F['dout'])
    h = at(M)
    # Fine relief: small ridges where the ground is already high.
    hi = smooth(300, 1600, h)
    det = fbm(x, y, 16, 4, seed=3, ridged=True)
    h = h + hi * (det - 0.5) * 520 + (fbm(x, y, 12, 3, seed=4) - 0.5) * 60 * (land > 0.5)
    # Coastline with a little wobble below the 2 km source resolution.
    wob = (fbm(x, y, 18, 3, seed=5) - 0.5) * 0.35
    is_land = (land + wob) > 0.5
    is_lake = ((lakes + wob * 0.6) > 0.5) & is_land
    # Land cover.
    pn = fbm(x, y, 90, 4, seed=6)
    patch = fbm(x, y, 22, 3, seed=7)
    col = PAL['steppe'][None, None] * np.ones_like(h)[..., None]
    v = np.clip(veg + (pn - 0.5) * 0.35, 0, 1)[..., None]
    col = col * (1 - v) + (PAL['grass'] * 0.7 + PAL['meadow'] * 0.3) * v
    ar = np.clip(arid + (pn - 0.5) * 0.3, 0, 1)[..., None] * (1 - v)
    col = col * (1 - ar) + PAL['barren'] * ar
    # Woodland: named forests, painted clusters, and patches across green ground.
    edge = fbm(x, y, 70, 4, seed=9)
    wood = np.clip(forest * (0.75 + 0.5 * edge) + smooth(0.58, 0.72, patch) * smooth(0.45, 0.8, veg) * 0.9, 0, 1)
    clear = smooth(0.66, 0.74, fbm(x, y, 35, 3, seed=10)) * 0.8
    wood = smooth(0.4, 0.62, wood + (patch - 0.5) * 0.45 - clear * (1 - deep))
    dpf = smooth(0.3, 0.7, deep + (patch - 0.5) * 0.3)
    fc = PAL['forest'] * (1 - dpf[..., None]) + PAL['deep_forest'] * dpf[..., None]
    col = col * (1 - wood[..., None]) + fc * wood[..., None]
    # High ground: upland tint, then rock, then snow (lower snow line in the north).
    up = smooth(700, 1500, h)[..., None]
    col = col * (1 - up * 0.6) + PAL['upland'] * up * 0.6
    rk = smooth(1500, 2300, h)[..., None]
    col = col * (1 - rk) + PAL['rock'] * rk
    snow_line = 2500 - 2100 * north
    sn = smooth(0, 300, h - snow_line + (det - 0.5) * 500)
    tundra = smooth(0.2, 0.8, north) * (1 - sn)
    rockice = smooth(0.06, 0.16, np.hypot(*np.gradient(h, km_px * 1000))) * smooth(0.7, 1, north) * sn * 0.6
    col = col * (1 - tundra[..., None]) + PAL['tundra'] * tundra[..., None]
    col = col * (1 - sn[..., None]) + PAL['snow'] * sn[..., None]
    col = col * (1 - rockice[..., None]) + PAL['rock'] * rockice[..., None]
    # Hillshade (light from the north-west), stronger on steep ground.
    gy, gx = np.gradient(h, km_px * 1000)
    ex = 9.0
    nx, ny = -gx * ex, -gy * ex
    nz = 1.0
    norm = np.sqrt(nx * nx + ny * ny + nz * nz)
    lx, ly, lz = -0.55, -0.55, 0.63
    shade = (nx * lx + ny * ly + nz * lz) / norm
    shade = np.clip(shade / lz, 0.2, 1.35)
    col = col * (0.58 + 0.42 * shade)[..., None]
    # Tree stipple when zoomed in far enough to read single crowns.
    if km_px < 1.2:
        st = wrap_sample(NOISE[5], x * KM_X / (km_px * 5.5), y * KM_Y / (km_px * 5.5))
        st2 = wrap_sample(NOISE[4], x * KM_X / (km_px * 3.1), y * KM_Y / (km_px * 3.1))
        dots = smooth(0.62, 0.78, st * 0.6 + st2 * 0.4) * wood * (0.55 + 0.45 * dpf)
        col = col * (1 - dots[..., None] * 0.55) + PAL['tree'] * dots[..., None] * 0.55
    # Water.
    depth = smooth(0, 1, (dout + (fbm(x, y, 120, 3, seed=11) - 0.5) * 60) / 420)
    deepc = PAL['deep'] * (1 - smooth(0.5, 1, depth)[..., None]) + PAL['abyss'] * smooth(0.5, 1, depth)[..., None]
    sea = PAL['shallow'] * (1 - smooth(0, 0.22, depth)[..., None]) + deepc * smooth(0, 0.22, depth)[..., None]
    col = np.where(is_land[..., None], col, sea)
    col = np.where(is_lake[..., None], PAL['lake'], col)
    out = np.clip(col, 0, 255).astype(np.uint8)
    # Rivers from the route model.
    wpx = max(1, int(round(1.4 / km_px)))
    for rv in geo['rivers']:
        pts = np.array([[(p[0] - ox) * sx, (p[1] - oy) * sy] for p in rv['line']], np.float32)
        pts = chaikin(pts, 3)
        cv2.polylines(out, [np.round(pts * 16).astype(np.int32)], False, tuple(int(c) for c in PAL['river']), wpx, cv2.LINE_AA, 4)
    return out


def chaikin(pts: np.ndarray, it: int) -> np.ndarray:
    for _ in range(it):
        q = 0.75 * pts[:-1] + 0.25 * pts[1:]
        r = 0.25 * pts[:-1] + 0.75 * pts[1:]
        mid = np.empty((len(q) * 2, 2), np.float32)
        mid[0::2], mid[1::2] = q, r
        pts = np.vstack([pts[:1], mid, pts[-1:]])
    return pts


def write_height(M: np.ndarray, world: dict) -> None:
    """height.png: 1024 wide, 16-bit; encoding (enc) is metres mapped linearly."""
    R = world['terrain']['relief']
    RW = 1024
    RH = round(RW * H / W)
    m = cv2.resize(M, (RW, RH), interpolation=cv2.INTER_AREA)
    enc = R['seaLevel'] + m / R['metresPerLevel']
    enc = np.clip(enc, 0, 65535).astype(np.uint16)
    Image.fromarray(enc).save(MAPS / '3d' / 'height.png')
    # The browser reads a PNG through an 8-bit canvas anyway: ship the 3D view the high byte only.
    Image.fromarray((enc >> 8).astype(np.uint8)).save(MAPS / '3d' / 'height-3d.png', optimize=True)
    print('height', enc.min(), enc.max())


def tiles(F: dict, M: np.ndarray, geo: dict, zmax: int) -> int:
    out = ROOT / 'public' / 'tiles' / 'terrain'
    count = 0
    for z in range(0, zmax + 1):
        n = 2 ** z
        world = 256 * n
        km_px = KM_X / (world * MX_SPAN)
        tx0, tx1 = int(MX0 * n), int(math.ceil((MX0 + MX_SPAN) * n))
        ty0, ty1 = int(MY0 * n), int(math.ceil((MY0 + 2 * MH) * n))
        for ty in range(max(0, ty0), min(n, ty1)):
            for tx in range(max(0, tx0), min(n, tx1)):
                px = (np.arange(256) + 0.5 + tx * 256) / world
                py = (np.arange(256) + 0.5 + ty * 256) / world
                sxn = (px - MX0) / MX_SPAN
                syn = (py - MY0) / (2 * MH)
                gx, gy = np.meshgrid(sxn.astype(np.float32), syn.astype(np.float32))
                ox, oy = (tx * 256 / world - MX0) / MX_SPAN, (ty * 256 / world - MY0) / (2 * MH)
                s = world * MX_SPAN
                img = render(F, M, gx, gy, km_px, geo, ox, oy, s, world * 2 * MH)
                outside = (gx < 0) | (gx > 1) | (gy < 0) | (gy > 1)
                img[outside] = (199, 160, 127)
                d = out / str(z) / str(tx)
                d.mkdir(parents=True, exist_ok=True)
                Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB)).save(d / f'{ty}.webp', quality=78, method=5)
                count += 1
        print('z', z, 'done', count)
    return count


def texture(F: dict, M: np.ndarray, geo: dict) -> None:
    TW = 4096
    TH = round(TW * H / W)
    out = np.zeros((TH, TW, 3), np.uint8)
    km_px = KM_X / TW
    for y0 in range(0, TH, 512):
        y1 = min(TH, y0 + 512)
        gx, gy = np.meshgrid(((np.arange(TW) + 0.5) / TW).astype(np.float32), ((np.arange(y0, y1) + 0.5) / TH).astype(np.float32))
        out[y0:y1] = render(F, M, gx, gy, km_px, geo, 0, y0 / TH, TW, TH)
    Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB)).save(MAPS / '3d' / 'terrain-4k.webp', quality=82, method=6)
    Image.fromarray(cv2.cvtColor(cv2.resize(out, (320, round(320 * H / W)), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)).save(MAPS / 'thumb' / 'terrain-320.webp', quality=80)


def stats(F: dict, M: np.ndarray) -> None:
    """Land cover in km2 (one atlas pixel is 2 x 2 km)."""
    px = 4.0
    land = F['land'] > 0.5
    lakes = (F['lakes'] > 0.5) & land
    dry = land & ~lakes
    wood = (F['forest'] > 0.45) & dry
    snow = dry & ((M > 2500 - 1500 * F['north']))
    high = dry & (M > 1500)
    r = massif_r(F['xn'], F['yn'])
    res = {
        'about': 'Areas measured on the basemap by scripts/cartography/build_terrain.py. One atlas pixel is 2 x 2 km. STYLISED land cover, not a survey.',
        'frameKm2': round(KM_X * KM_Y),
        'landKm2': int(dry.sum() * px),
        'lakeKm2': int(lakes.sum() * px),
        'seaKm2': int((~land).sum() * px),
        'namedForestKm2': int(wood.sum() * px),
        'highGroundOver1500mKm2': int(high.sum() * px),
        'snowKm2': int(snow.sum() * px),
        'kanaat': {
            'coreKm': [MASSIF_A * 2, MASSIF_B * 2],
            'footKm': [MASSIF_A * 2 * FOOT, MASSIF_B * 2 * FOOT],
            'coreKm2': int(((r <= 1) & land).sum() * px),
            'summitMetres': int(M[r < 0.3].max()),
            'cityMetres': int(M[int(CITY[1] * H), int(CITY[0] * W)]),
        },
    }
    (MAPS / 'terrain-biomes.json').write_text(json.dumps(res, indent=1) + '\n', encoding='utf8')
    print(json.dumps(res))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--zmax', type=int, default=6)
    ap.add_argument('--only', default='all')
    a = ap.parse_args()
    geo = json.loads((ROOT / 'data-source' / 'geography.source.json').read_text(encoding='utf8'))
    world = json.loads((ROOT / 'data-source' / 'world.source.json').read_text(encoding='utf8'))
    F = build_fields(geo)
    F['sym'] = ring_mask(geo['mountains'][0].get('paintedSymbol', geo['mountains'][0]['ring']), W, H, 30)
    M = build_height(F)
    stats(F, M)
    if a.only in ('all', 'height'):
        write_height(M, world)
    if a.only in ('all', 'texture'):
        texture(F, M, geo)
    if a.only in ('all', 'tiles'):
        print('tiles', tiles(F, M, geo, a.zmax))


if __name__ == '__main__':
    main()
