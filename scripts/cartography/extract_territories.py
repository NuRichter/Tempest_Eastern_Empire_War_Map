"""
Territory geometry extractor.

    Base Map - Blue.png  ->  land mask  ->  connected regions  ->  polygons
                                                   |
    gazetteer theatre zones  ->  rasterise  ->  clip to land  ->  operational areas

The Blue base map is a line drawing: white land, blue sea, thin black border
lines. Every political region is therefore a connected white area bounded by
drawn lines, and its outline can be traced exactly instead of being authored by
hand. Regions are picked by seed points (scripts/cartography/regions.config.json)
so that nothing here depends on component numbering.

Theatre operational areas remain SCHEMATIC (the supplied maps draw no theatre
boundaries), but they are clipped to the land and to the regions they claim to
lie in, so they never spill into the sea or across a drawn border.

Output: data-source/territories.geo.source.json (SIM_NORMALISED coordinates,
x and y in [0,1] against the 2641 x 2035 atlas frame shared by every map).

Requires Python 3 with numpy, opencv-python and Pillow. Re-run after changing
the config or the gazetteer zones:

    python scripts/cartography/extract_territories.py
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CONFIG = HERE / 'regions.config.json'
GAZETTEER = ROOT / 'data-source' / 'gazetteer.source.json'
OUT = ROOT / 'data-source' / 'territories.geo.source.json'

# The Blue base map ships inside the repository as the default map style.
SOURCE = ROOT / 'public' / 'maps' / 'base-map.png'

# Douglas-Peucker tolerance in source pixels. Border lines are ~2px wide, so a
# 1.25px tolerance keeps the drawn shape while dropping pixel staircase noise.
SIMPLIFY_PX = 1.25
# Each region is grown by this many pixels into the border-line pixels (never
# into the sea), so neighbouring polygons meet on the drawn line with no gap.
CLOSE_GAP_PX = 2


def load_masks(path: Path) -> tuple[np.ndarray, np.ndarray]:
    im = np.array(Image.open(path).convert('RGBA')).astype(np.int16)
    r, g, b, a = im[..., 0], im[..., 1], im[..., 2], im[..., 3]
    land = (r > 200) & (g > 200) & (b > 200) & (a > 200)
    # Border ink: dark, opaque pixels. Sea is the saturated blue (153,217,234).
    ink = (r < 140) & (g < 140) & (b < 140) & (a > 120)
    return land, ink


def to_rings(mask: np.ndarray, width: int, height: int, min_area_px: float) -> list[list[list[float]]]:
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    rings: list[list[list[float]]] = []
    for contour in sorted(contours, key=cv2.contourArea, reverse=True):
        if cv2.contourArea(contour) < min_area_px:
            continue
        approx = cv2.approxPolyDP(contour, SIMPLIFY_PX, True).reshape(-1, 2)
        if len(approx) < 4:
            continue
        ring = [[round((float(x) + 0.5) / width, 5), round((float(y) + 0.5) / height, 5)] for x, y in approx]
        ring.append(ring[0])
        rings.append(ring)
    return rings


def main() -> None:
    config = json.loads(CONFIG.read_text(encoding='utf8'))
    gazetteer = json.loads(GAZETTEER.read_text(encoding='utf8'))
    land, ink = load_masks(SOURCE)
    height, width = land.shape

    count, labels = cv2.connectedComponents(land.astype(np.uint8), connectivity=4)
    grow_into = land | ink
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * CLOSE_GAP_PX + 1, 2 * CLOSE_GAP_PX + 1))

    region_masks: dict[str, np.ndarray] = {}
    territories = []
    used: dict[int, str] = {}
    for region in config['regions']:
        sx, sy = region['seed']
        px, py = int(sx * width), int(sy * height)
        label = int(labels[py, px])
        if label == 0:
            raise SystemExit(f"Seed for {region['id']} at ({sx}, {sy}) is not on land.")
        if label in used:
            raise SystemExit(f"Seeds for {region['id']} and {used[label]} fall in the same drawn region.")
        used[label] = region['id']

        mask = labels == label
        grown = cv2.dilate(mask.astype(np.uint8), kernel).astype(bool) & grow_into
        region_masks[region['id']] = grown
        rings = to_rings(grown, width, height, min_area_px=60)
        area = float(mask.sum()) / (width * height)
        ys, xs = np.nonzero(mask)
        territories.append(
            {
                'id': region['id'],
                'name': region['name'],
                'display': region['display'],
                'nationId': region['nationId'],
                'identification': region['identification'],
                'boundarySource': f"{config['sourceImage']} (drawn border lines, traced)",
                'boundaryGrade': 'MEASURED',
                'areaFraction': round(area, 6),
                'labelPoint': [round(float(np.median(xs)) / width, 4), round(float(np.median(ys)) / height, 4)],
                'notes': region['notes'],
                'geometry': {'type': 'MultiPolygon', 'coordinates': [[ring] for ring in rings]},
            }
        )

    # Theatre operational areas: schematic rings, clipped to land and to the
    # regions the theatre is fought in.
    zone_regions = {
        'TH-DWG': ['T-JTF', 'T-DWG'],
        'TH-LAB': ['T-JTF'],
        'TH-CAP': ['T-EMP'],
        'TH-DWE': ['T-DWG', 'T-EMP'],
        'TH-DRG': ['T-JTF', 'T-DWG'],
    }
    areas = []
    for theatre_id, ring in gazetteer['theatreZones']['zones'].items():
        canvas = np.zeros((height, width), np.uint8)
        pts = np.array([[x * width, y * height] for x, y in ring], np.int32)
        cv2.fillPoly(canvas, [pts], 1)
        allowed = np.zeros((height, width), bool)
        for rid in zone_regions.get(theatre_id, []):
            allowed |= region_masks[rid]
        clipped = canvas.astype(bool) & allowed
        areas.append(
            {
                'theatreId': theatre_id,
                'regions': zone_regions.get(theatre_id, []),
                'boundaryGrade': 'SCHEMATIC',
                'notes': 'Schematic area of operations from the gazetteer, clipped to the drawn land and national borders. The supplied maps contain no theatre boundaries.',
                'geometry': {'type': 'MultiPolygon', 'coordinates': [[r] for r in to_rings(clipped, width, height, 200)]},
            }
        )

    digest = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    out = {
        '$schema': 'internal://territories.geo.source',
        'about': {
            'purpose': 'Political region geometry traced from the drawn border lines of the Blue base map, plus schematic theatre areas clipped to it. Generated; edit regions.config.json or the gazetteer and re-run scripts/cartography/extract_territories.py.',
            'coordinateSystem': 'SIM_NORMALISED',
            'sourceImage': config['sourceImage'],
            'sourceSha256': digest,
            'sourcePixels': [width, height],
            'simplifyTolerancePx': SIMPLIFY_PX,
            'boundaryGrades': {
                'MEASURED': 'Traced from lines drawn on the supplied base map. The border is exactly where the map draws it, which is a fan-made map and not an official survey.',
                'SCHEMATIC': 'A rendering convenience with no drawn source; clipped to MEASURED borders.',
            },
        },
        'territories': territories,
        'operationalAreas': areas,
    }
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n', encoding='utf8')
    vertices = sum(len(r[0]) for t in territories for r in t['geometry']['coordinates'])
    print(f'{len(territories)} territories, {vertices} vertices, {len(areas)} operational areas -> {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
