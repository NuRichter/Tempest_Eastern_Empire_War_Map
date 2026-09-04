/**
 * Engine tests.
 *
 * These exercise the three pieces of logic where a silent error would be
 * invisible on screen but wrong in substance: the coordinate transform, the
 * state resolver, and the movement interpolator. Everything else is covered by
 * validate-data (the dataset) and browser-qa (the interface).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ATLAS_HEIGHT,
  ATLAS_WIDTH,
  LAT_EXTENT_DEG,
  LNG_SPAN_DEG,
  atlasCorners,
  campaignBounds,
  lngLatToSim,
  simToLngLat,
} from '../src/lib/coords';
import { forcePositionAt, forceSnapshotAt } from '../src/simulation/resolver';
import { SimulationClock } from '../src/simulation/clock';
import type { Dataset } from '../src/data/loader';
import type { ForcePositionTrack, ForceTrack, FrameState } from '../src/types/dataset';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', 'public', 'data');

let passed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  pass  ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`  FAIL  ${name} — ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function close(a: number, b: number, tolerance: number, message: string): void {
  if (Math.abs(a - b) > tolerance) throw new Error(`${message} (${a} vs ${b})`);
}

function load<T>(name: string): T {
  return JSON.parse(readFileSync(join(DATA, name), 'utf8')) as T;
}

console.log('Engine tests\n');

/* ------------------------------------------------------------------ */
/* Coordinates                                                         */
/* ------------------------------------------------------------------ */

test('simulation coordinates round-trip through the synthetic projection', () => {
  for (const [x, y] of [
    [0, 0],
    [1, 1],
    [0.5, 0.5],
    [0.63833, 0.56247],
    [0.8239, 0.37438],
    [0.001, 0.999],
  ]) {
    const { lng, lat } = simToLngLat(x, y);
    const back = lngLatToSim(lng, lat);
    close(back.x, x, 1e-9, `x did not round-trip at (${x}, ${y})`);
    close(back.y, y, 1e-9, `y did not round-trip at (${x}, ${y})`);
  }
});

test('the projection preserves the atlas aspect ratio', () => {
  // Mercator width and height of the atlas quad must be in the same ratio as
  // the image, or the map is stretched.
  const toMercY = (lat: number) => 0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI);
  const top = simToLngLat(0, 0);
  const bottom = simToLngLat(0, 1);
  const widthFraction = LNG_SPAN_DEG / 360;
  const heightFraction = toMercY(bottom.lat) - toMercY(top.lat);
  close(heightFraction / widthFraction, ATLAS_HEIGHT / ATLAS_WIDTH, 1e-6, 'aspect ratio drifted');
});

test('the projection stays inside legal angular bounds', () => {
  const corners = atlasCorners();
  for (const [lng, lat] of corners) {
    assert(lng >= -180 && lng <= 180, `longitude ${lng} out of range`);
    assert(lat >= -85 && lat <= 85, `latitude ${lat} out of range`);
  }
  close(LAT_EXTENT_DEG, 70.26, 0.01, 'latitude extent drifted from the documented value');
});

test('campaign bounds are well ordered', () => {
  const [[west, south], [east, north]] = campaignBounds();
  assert(east > west, 'east is not east of west');
  assert(north > south, 'north is not north of south');
});

/* ------------------------------------------------------------------ */
/* State resolver                                                      */
/* ------------------------------------------------------------------ */

const manifest = load<{ clock: { frameCount: number } }>('manifest.json');
const keyIndex = load<{ interval: number; frames: number[]; files: string[] }>('keyframes.index.json');
const deltas = load<{ deltaFrames: number[]; deltas: Record<string, Partial<FrameState>> }>('state.deltas.json');
const checkpoints = keyIndex.files.map((f) => load<FrameState>(f));
const forceTracks = load<ForceTrack[]>('force-tracks.json');
const movement = load<{ positions: ForcePositionTrack[] }>('movement.json');

const dataset = {
  manifest,
  keyframeIndex: keyIndex,
  checkpoints,
  deltas,
  trackByForce: new Map(forceTracks.map((t) => [t.forceId, t])),
  positionByForce: new Map(movement.positions.map((p) => [p.forceId, p])),
} as unknown as Dataset;

test('a force snapshot is never returned before the force is first recorded', () => {
  for (const track of forceTracks) {
    const first = track.snapshots[0].f;
    if (first === 0) continue;
    assert(
      forceSnapshotAt(dataset, track.forceId, first - 1) === null,
      `${track.forceId} returned a snapshot before frame ${first}`,
    );
    assert(
      forceSnapshotAt(dataset, track.forceId, first) !== null,
      `${track.forceId} returned no snapshot at its first recorded frame`,
    );
  }
});

test('a force snapshot is the most recent record at or before the frame', () => {
  for (const track of forceTracks.slice(0, 8)) {
    for (const snapshot of track.snapshots) {
      const found = forceSnapshotAt(dataset, track.forceId, snapshot.f);
      assert(found?.f === snapshot.f, `${track.forceId} @${snapshot.f} resolved to frame ${found?.f}`);
      const later = forceSnapshotAt(dataset, track.forceId, snapshot.f + 1);
      assert(
        later !== null && later.f <= snapshot.f + 1,
        `${track.forceId} resolved forward past the requested frame`,
      );
    }
  }
});

/* ------------------------------------------------------------------ */
/* Movement                                                            */
/* ------------------------------------------------------------------ */

test('no force teleports between recorded positions', () => {
  // Sampling every leg finely: the largest single-step jump must be a small
  // fraction of the leg, which is only true if the path is interpolated.
  for (const track of movement.positions) {
    for (let i = 0; i < track.keys.length - 1; i += 1) {
      const from = track.keys[i];
      const to = track.keys[i + 1];
      const legLength = Math.hypot(to.x - from.x, to.y - from.y);
      if (legLength < 1e-6 || to.f - from.f < 2) continue;

      const steps = 24;
      let previous: { x: number; y: number } | null = null;
      let biggest = 0;
      let offMapInLeg = false;
      for (let s = 0; s <= steps; s += 1) {
        const frame = from.f + ((to.f - from.f) * s) / steps;
        const point = forcePositionAt(dataset, track.forceId, frame);
        if (!point) {
          offMapInLeg = true;
          break;
        }
        if (previous) biggest = Math.max(biggest, Math.hypot(point.x - previous.x, point.y - previous.y));
        previous = { x: point.x, y: point.y };
      }
      if (offMapInLeg) continue;
      assert(
        biggest <= legLength * 0.35,
        `${track.forceId} jumped ${biggest.toFixed(4)} of a ${legLength.toFixed(4)} leg in one step`,
      );
    }
  }
});

test('interpolated positions stay on the leg between their endpoints', () => {
  for (const track of movement.positions) {
    for (let i = 0; i < track.keys.length - 1; i += 1) {
      const from = track.keys[i];
      const to = track.keys[i + 1];
      if (to.f - from.f < 2) continue;
      const mid = forcePositionAt(dataset, track.forceId, (from.f + to.f) / 2);
      if (!mid) continue;
      const lo = { x: Math.min(from.x, to.x) - 1e-6, y: Math.min(from.y, to.y) - 1e-6 };
      const hi = { x: Math.max(from.x, to.x) + 1e-6, y: Math.max(from.y, to.y) + 1e-6 };
      assert(
        mid.x >= lo.x && mid.x <= hi.x && mid.y >= lo.y && mid.y <= hi.y,
        `${track.forceId} left the bounding box of its own leg`,
      );
    }
  }
});

test('a force with no recorded position is not placed', () => {
  for (const track of movement.positions) {
    for (const [start, end] of track.offMap) {
      const mid = Math.floor((start + end) / 2);
      assert(
        forcePositionAt(dataset, track.forceId, mid) === null,
        `${track.forceId} was placed at frame ${mid}, which it has no position for`,
      );
    }
  }
});

/* ------------------------------------------------------------------ */
/* Clock                                                               */
/* ------------------------------------------------------------------ */

test('the clock clamps seeks to the campaign', () => {
  const clock = new SimulationClock({ frameCount: manifest.clock.frameCount });
  clock.seek(-500);
  assert(clock.frame === 0, 'a negative seek escaped the campaign start');
  clock.seek(999_999);
  assert(clock.frame === manifest.clock.frameCount - 1, 'a large seek escaped the campaign end');
  clock.seek(3600);
  assert(clock.integerFrame === 3600, 'a valid seek did not land');
  clock.destroy();
});

test('the clock reports speed and direction it was given', () => {
  const clock = new SimulationClock({ frameCount: manifest.clock.frameCount });
  clock.setSpeed(8);
  assert(clock.currentSpeed === 8, 'speed was not retained');
  clock.setDirection(-1);
  assert(clock.isReversed, 'direction was not retained');
  assert(!clock.isPlaying, 'a clock that was never played reports as playing');
  clock.destroy();
});

/* ------------------------------------------------------------------ */

console.log(`\n  ${passed}/${passed + failures.length} tests passed`);
if (failures.length > 0) {
  console.error('\nEngine tests failed.\n');
  process.exit(1);
}
console.log('\nEngine tests passed.\n');
