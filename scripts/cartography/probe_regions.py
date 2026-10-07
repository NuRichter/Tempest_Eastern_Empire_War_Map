"""Probe: list land regions of the Blue base map with centroids and draw a numbered preview."""
import sys
import cv2
import numpy as np
from PIL import Image

SRC = sys.argv[1]
OUT = sys.argv[2]
im = np.array(Image.open(SRC).convert('RGBA')).astype(np.int16)
r, g, b, a = im[..., 0], im[..., 1], im[..., 2], im[..., 3]
land = (r > 200) & (g > 200) & (b > 200) & (a > 200)
n, labels, stats, cents = cv2.connectedComponentsWithStats(land.astype(np.uint8), connectivity=4)
H, W = land.shape
preview = np.zeros((H, W, 3), np.uint8)
preview[land] = (230, 230, 230)
rng = np.random.default_rng(1)
rows = []
for i in range(1, n):
    area = stats[i, cv2.CC_STAT_AREA]
    if area < 400:
        continue
    color = rng.integers(60, 220, 3)
    preview[labels == i] = color
    cx, cy = cents[i]
    rows.append((i, area, cx / W, cy / H))
for i, area, x, y in rows:
    cv2.putText(preview, str(i), (int(x * W) - 20, int(y * H) + 10), cv2.FONT_HERSHEY_SIMPLEX, 1.6, (0, 0, 0), 4)
for i, area, x, y in sorted(rows, key=lambda t: -t[1]):
    print(f'{i:4d} area={area:8d} c=({x:.4f},{y:.4f})')
Image.fromarray(preview).resize((1320, int(1320 * H / W))).save(OUT)
