/**
 * World model: the one geographic frame every layer shares.
 *
 *   SIM_NORMALISED (x, y in [0,1] on the atlas)  <->  WORLD_KM (east, south in km)
 *
 * Positions are stored once, in the gazetteer, as SIM_NORMALISED. Distances,
 * route lengths and speeds are measured here in kilometres, through a single
 * isotropic scale read from data-source/world.source.json. Screen pixels,
 * zoom and the rendering mode never enter: the renderers project the same
 * normalised point with their own camera, so a place cannot drift when the
 * view changes. The scale is a synthetic calibration (docs/GEOGRAPHIC_MODEL.md),
 * never the author's.
 */
import world from '../../data-source/world.source.json';

export const KM_PER_ATLAS_PX: number = world.coordinateSystem.kmPerAtlasPixel;
export const ATLAS_PX_W: number = world.coordinateSystem.atlasPixels.width;
export const ATLAS_PX_H: number = world.coordinateSystem.atlasPixels.height;
/** Width and height of the whole atlas in kilometres. */
export const WORLD_W_KM = ATLAS_PX_W * KM_PER_ATLAS_PX;
export const WORLD_H_KM = ATLAS_PX_H * KM_PER_ATLAS_PX;
/** The precision a calibrated distance can honestly be quoted to. */
export const DISTANCE_PRECISION_KM: number = world.coordinateSystem.precisionKm;

export type XY = readonly [number, number];

/** Normalised atlas point -> kilometres east and south of the atlas's north-west corner. */
export function toKm(x: number, y: number): { e: number; s: number } {
  return { e: x * WORLD_W_KM, s: y * WORLD_H_KM };
}

/** Kilometres -> normalised atlas point. Exact inverse of toKm. */
export function fromKm(e: number, s: number): { x: number; y: number } {
  return { x: e / WORLD_W_KM, y: s / WORLD_H_KM };
}

/** Straight-line distance between two normalised points, in kilometres. */
export function distanceKm(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot((bx - ax) * WORLD_W_KM, (by - ay) * WORLD_H_KM);
}

/** Length of a polyline of normalised points, in kilometres. */
export function polylineKm(points: readonly XY[]): number {
  let km = 0;
  for (let i = 1; i < points.length; i += 1) km += distanceKm(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  return km;
}

/** Cumulative kilometres at each vertex of a polyline (first entry 0). */
export function cumulativeKm(points: readonly XY[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i += 1) out.push(out[i - 1] + distanceKm(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]));
  return out;
}

/**
 * The point a fraction `t` (0..1) of the way along a polyline, by distance on
 * the ground, and the local direction of travel there. `cum` is the polyline's
 * cumulativeKm, passed in so callers can cache it.
 */
export function alongPolyline(points: readonly XY[], cum: readonly number[], t: number): { x: number; y: number; dx: number; dy: number } {
  const n = points.length;
  if (n === 1) return { x: points[0][0], y: points[0][1], dx: 0, dy: 0 };
  const total = cum[n - 1];
  const target = Math.min(1, Math.max(0, t)) * total;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= target) lo = mid;
    else hi = mid;
  }
  const seg = cum[hi] - cum[lo];
  const u = seg > 0 ? (target - cum[lo]) / seg : 0;
  const [ax, ay] = points[lo];
  const [bx, by] = points[hi];
  return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u, dx: bx - ax, dy: by - ay };
}

/**
 * A distance for display: rounded to the calibration's precision, because a
 * synthetic scale does not support metre-level figures.
 */
export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return '?';
  const p = km < 50 ? 5 : DISTANCE_PRECISION_KM;
  return `~${(Math.round(km / p) * p).toLocaleString('en-GB')} km`;
}
