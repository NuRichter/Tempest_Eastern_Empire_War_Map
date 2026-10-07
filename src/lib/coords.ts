/**
 * Coordinate transform layer.
 *
 *   SIMULATION COORDINATES  ->  MAP COORDINATES  ->  SCREEN / CAMERA
 *
 * The Tensura world is fictional. Its map has no latitude and no longitude, and
 * nothing in this project may imply otherwise. Every military position in the
 * dataset is stored in SIM_NORMALISED coordinates: x and y in [0,1] measured
 * against the base atlas image.
 *
 * A globe renderer nevertheless needs angular coordinates. This module defines
 * a single, explicit, reversible SYNTHETIC PROJECTION from simulation space to
 * the angular space the renderer consumes. The angles it produces are an
 * internal rendering device. They are never shown to the reader as coordinates,
 * never labelled latitude or longitude in the interface, and never exported as
 * geographic data.
 *
 * The projection is defined so that the atlas image is undistorted: simulation
 * y maps linearly onto Web Mercator's vertical axis, which is exactly the space
 * the renderer draws the image in. The atlas therefore reads as a normal world
 * map, and the globe view curves it the way a globe curves any flat map.
 */

/** Longitudinal width the atlas occupies in the synthetic projection. */
export const LNG_SPAN_DEG = 260;

/** Native pixel dimensions shared by public/maps/base-map.png and myth-map.jpg. */
export const ATLAS_WIDTH = 2641;
export const ATLAS_HEIGHT = 2035;

const LNG_MIN = -LNG_SPAN_DEG / 2;

/**
 * Mercator half-height that preserves the atlas aspect ratio.
 * Mercator x spans LNG_SPAN/360 of the world; y must span the same fraction
 * scaled by the image's height-to-width ratio.
 */
const MERC_HALF_HEIGHT = (LNG_SPAN_DEG / 360) * (ATLAS_HEIGHT / ATLAS_WIDTH) * 0.5;

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Web Mercator normalised y (0 at the north edge, 1 at the south edge). */
function latToMercatorY(latDeg: number): number {
  const phi = latDeg * RAD;
  return 0.5 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / (2 * Math.PI);
}

function mercatorYToLat(y: number): number {
  return (2 * (Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - Math.PI / 4)) * DEG;
}

/** Latitude reached by the top edge of the atlas. Reported in the manifest. */
export const LAT_EXTENT_DEG = mercatorYToLat(0.5 - MERC_HALF_HEIGHT);

export interface LngLat {
  lng: number;
  lat: number;
}

/** Simulation point -> synthetic projection angles. */
export function simToLngLat(x: number, y: number): LngLat {
  const lng = LNG_MIN + x * LNG_SPAN_DEG;
  const mercY = 0.5 - MERC_HALF_HEIGHT + y * (MERC_HALF_HEIGHT * 2);
  return { lng, lat: mercatorYToLat(mercY) };
}

/** Synthetic projection angles -> simulation point. Exact inverse. */
export function lngLatToSim(lng: number, lat: number): { x: number; y: number } {
  const x = (lng - LNG_MIN) / LNG_SPAN_DEG;
  const mercY = latToMercatorY(lat);
  const y = (mercY - (0.5 - MERC_HALF_HEIGHT)) / (MERC_HALF_HEIGHT * 2);
  return { x, y };
}

/** Tuple form, which is what MapLibre expects. */
export function simToLngLatTuple(x: number, y: number): [number, number] {
  const { lng, lat } = simToLngLat(x, y);
  return [lng, lat];
}

/** The four corners of the atlas, north-west first, clockwise. */
export function atlasCorners(): [[number, number], [number, number], [number, number], [number, number]] {
  return [
    simToLngLatTuple(0, 0),
    simToLngLatTuple(1, 0),
    simToLngLatTuple(1, 1),
    simToLngLatTuple(0, 1),
  ];
}

/** Bounds of the atlas in the synthetic projection, for camera fitting. */
export function atlasBounds(): [[number, number], [number, number]] {
  const nw = simToLngLat(0, 0);
  const se = simToLngLat(1, 1);
  return [
    [nw.lng, se.lat],
    [se.lng, nw.lat],
  ];
}

/**
 * The sector the campaign is fought in: the eastern half of the central
 * continent, from the western approaches to the imperial capital. Used for the
 * opening view and for the camera reset, so the application opens on the war
 * rather than on an empty ocean.
 */
export const CAMPAIGN_EXTENT = { x0: 0.44, y0: 0.28, x1: 0.92, y1: 0.66 };

export function campaignBounds(): [[number, number], [number, number]] {
  const nw = simToLngLat(CAMPAIGN_EXTENT.x0, CAMPAIGN_EXTENT.y0);
  const se = simToLngLat(CAMPAIGN_EXTENT.x1, CAMPAIGN_EXTENT.y1);
  return [
    [nw.lng, se.lat],
    [se.lng, nw.lat],
  ];
}

/** Simulation-space distance. Unitless: the world has no stated scale. */
export function simDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * The one sentence the interface shows whenever it exposes a coordinate.
 * Kept here so the disclaimer cannot drift away from the transform.
 */
export const COORDINATE_DISCLAIMER =
  'Simulation coordinates on a fictional map. Not latitude and longitude, and not a claim about any real place.';

/** Simulation-space bounds [x0, y0, x1, y1] -> renderer bounds, for fitBounds. */
export function simBoundsToLngLat(b: [number, number, number, number]): [[number, number], [number, number]] {
  const nw = simToLngLat(b[0], b[1]);
  const se = simToLngLat(b[2], b[3]);
  return [
    [nw.lng, se.lat],
    [se.lng, nw.lat],
  ];
}

/** GeoJSON ring in simulation space -> renderer space. */
export function ringToLngLat(ring: [number, number][]): [number, number][] {
  return ring.map(([x, y]) => simToLngLatTuple(x, y));
}
