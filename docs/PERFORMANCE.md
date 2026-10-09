# Performance architecture

How the atlas stays smooth in the film, in 2D and in 3D. Measured, not assumed:
`scripts/profile-cinematic.mts` plays cinematic mode on a local production build
and records a V8 CPU profile plus frame timings.

```bash
PROFILE_BUILD=1 npx next build && npx tsx scripts/security/harden-build.mts   # keeps function names
PROFILE_GPU=1 npx tsx scripts/profile-cinematic.mts 2d 12                     # or 3d, on the real GPU
```

## Where the time went

On a real GPU (RTX 5070 Ti Laptop, D3D11), cinematic mode at 8x through the first
battles, before this change:

| Mode | fps | p50 frame | p99 frame | Main thread |
|---|---|---|---|---|
| 2D | 19.7 | 50.5 ms | 82.4 ms | never idle |
| 3D | 25.1 | 17.1 ms | 120.8 ms (stutter) | half idle, periodic hitches |

About 72% of the main thread in 2D was one pipeline: the held ground (territory
held by each side, the transition belt, the front) painted pixel by pixel on the
CPU (`paintField` 30.6%), uploaded as a 4.9 MB canvas every frame
(`texSubImage2D` 27.5%), smoothed and traced (`smooth`, `frontSeams`). In 3D the
same work plus a 2048 x 1578 overlay with blurred strokes was redrawn and
uploaded (13 MB) every 110 ms, and the hidden 2D map kept rendering behind it.

## What changed

```
clock T ──► field worker (thread) ──► packed RGBA32F + RGBA8 (transferred, recycled)
                 evaluate, smooth,             │
                 seams, shares, pack           ├─► 2D: MapLibre custom layer (FIELD_GLSL)
                                               └─► 3D: three.js war skin (FIELD_GLSL)
```

- **The GPU paints the held ground.** `src/map/field/gpuField.ts` holds the
  painting rule as GLSL (`FIELD_GLSL`): the same bilinear time fields, isochrone
  front, transition belt and land clip as the old CPU painter, with 4-sample
  anti-aliasing (1 sample on software renderers). Uploads are the coarse grid
  only (352 x 272, 1.5 MB), and the land mask once.
- **2D:** a MapLibre custom layer, projected with MapLibre's own `projectTile`,
  so it follows the flat map and the globe. Drawn only over the cells that ever
  change hands. Falls back to the canvas path without WebGL2.
- **3D:** `src/map/three/warSkin.ts`, a three.js shader on the terrain using the
  same GLSL. Fronts are the zero contour of the empire and allied fields traced
  in the shader at constant screen width, lifted by the bloom pass. The
  territory canvas is repainted only when a territory's role changes.
- **A worker evaluates the field** (`field.worker.ts`): time fields, smoothing,
  seams, held shares, and the GPU packing. Arrays travel as transferables and are
  recycled, so steady playback allocates nothing. Only one evaluation is in
  flight, so a fast clock never builds a queue. Without workers it runs on the main
  thread with the same results.
- **Nothing hidden is drawn.** While the 3D view covers the map, the 2D layer, the
  2D director and the 2D overlay stand still (`src/state/view3d.ts`).
- **Panels that show held shares** re-render at most 5 times a second and only
  when a share moves by half a percent (`onShare` in `fieldStore.ts`).

## After

| Mode | fps | p50 frame | p99 frame | Main thread |
|---|---|---|---|---|
| 2D | 144 | 8.3 ms | 16.6 ms | field work gone from it |
| 3D | 217.5 | 4.2 ms | 8.4 ms | 24% idle |

A random seek costs 1.7 ms of script (one frame, about 17 ms, on a GPU). The
browser QA measures script time per seek (Long Animation Frames), because the
headless browser renders with software GL, where a frame takes about 110 ms of
emulated drawing that says nothing about the app.

## Visual parity

`npm run qa:visual` compares ten checkpoint frames with the images made by the
CPU painter: all within tolerance. The 2D seams are still drawn by the overlay
from the worker's contour. The 3D front glow is now traced in the shader.
