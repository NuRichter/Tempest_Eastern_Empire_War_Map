# Performance architecture

How the atlas stays smooth in the film, in 2D and in 3D. Measured, not assumed:
`scripts/profile-cinematic.mts` plays cinematic mode on a local production build
and records a V8 CPU profile plus frame timings.

```bash
PROFILE_BUILD=1 npx next build --webpack && npx tsx scripts/security/harden-build.mts   # keeps function names
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

## Phase 2: weaker machines

Measured with the CPU slowed down (`PROFILE_CPU_SLOWDOWN=2` is close to a
mid-range laptop, `4` to an old low-end one) and a Chrome trace of the
renderer main thread (`npm run qa:trace -- 2d 6 4`).

- **Timeline:** the canvas (stages, lanes, battles, event ticks, marks) was
  redrawn on every frame, with `getComputedStyle` and `clientWidth` forcing
  style and layout each time. It is now drawn only when what it shows changes;
  the width comes from a `ResizeObserver`; the playhead is its own element,
  moved by a transform (compositor only).
- **Overlay:** fonts and size are read once (refreshed on font load and
  resize) instead of per frame, and text widths are cached (`textWidth` in
  `src/map/overlay/context.ts`).
- **Adaptive graphics quality** (`src/perf/quality.ts`): the frame times the
  browser achieves pick the level. High: device pixel ratio up to 2, 4-sample
  edges, 3D bloom. Medium: pixel ratio up to 1.5. Low: pixel ratio 1, 1 sample,
  no bloom. Down after 2 s of slow frames, up after 8 s of fast ones, a failed
  level is not retried for a minute, the first 6 s of loading are not judged.
  The reader can pin a level (Layers, Graphics quality). `npm run qa:governor`
  checks that it steps down under load, that a pinned level is kept, and that
  the low level is measurably faster (67% in its software-GL test).

| Cinematic, real GPU, CPU slowed | Before phase 2 | After |
|---|---|---|
| 2D, CPU 4x slower | 9.5 fps | 10.5 to 11 fps |
| 2D, CPU 2x slower | | 38.4 fps |
| 3D, CPU 2x slower | | 57.5 fps |
| 3D, CPU 4x slower | | 18.5 fps |

What remains in 2D on slow CPUs is MapLibre's own per-frame work while the
camera moves (draw calls per layer and tile) and the overlay canvas. The next
step there would be fewer, merged map layers in cinematic mode and the overlay
on the GPU.

## Phase 3: fewer React renders, cheaper overlay

- The map view computed two keys (territory control, theatre state) from the
  clock in its render, so the whole map subtree (overlay, controls, minimap)
  re-rendered on every frame. The keys are now computed inside the store
  selectors: it re-renders only when one of them changes.
- Settlement badges are pre-rendered once per kind, size and pixel ratio and
  stamped with `drawImage`; their order and anchors are worked out once per
  dataset (no per-frame sort or array spread).
- Text widths: a two-level cache (font, then text), no string building per call.

2D cinematic with the CPU 2x slower: 38.4 to 40.6 to 42.7 fps (p50 29 to
21 to 25 ms). The remaining cost in 2D on slow CPUs is the canvas overlay as an
architecture (shapes and text drawn on the CPU every frame while the camera
moves) and MapLibre's fixed per-frame work. Moving the overlay to the GPU is
the next large step.

## Next 16 and how to measure fairly

The upgrade to Next 16 (Turbopack builds, about 21 s instead of about 2 min)
was first judged a regression and then measured again: the first browser run
after a build is slow (cold JIT, shader and disk caches), and a busy machine
(other browser windows) shifts absolute numbers a lot. Compare builds back to
back in one session and judge warm runs only. Under equal conditions, with the
CPU 2x slower: 2D 118 to 119 fps on Next 15 and 121 to 127 fps on Next 16, 3D
170 and 219 to 220 fps. QA, visual, security and governor results are the same.
Profiling builds now need `next build --webpack` (the function-name hook is a
webpack setting).
