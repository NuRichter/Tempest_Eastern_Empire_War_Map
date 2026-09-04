import type { Dataset } from '@/data/loader';
import type { ForceSnapshot, FrameState, PlacementGrade } from '@/types/dataset';

/**
 * Resolves battlefield state at any frame without replaying the campaign.
 *
 * The dataset is 7,200 keyframes of which 5.6% carry any change at all. Full
 * state is stored once every 144 frames; everything between is a sparse delta.
 * Seeking to frame N therefore costs one checkpoint plus, at worst, the deltas
 * inside a single simulation day.
 *
 * The resolver caches the last resolution so that forward playback — the common
 * case — applies one delta per frame rather than rebuilding from a checkpoint.
 */
export class StateResolver {
  private readonly data: Dataset;
  private readonly interval: number;
  private cachedFrame = -1;
  private cached: FrameState | null = null;

  constructor(data: Dataset) {
    this.data = data;
    this.interval = data.keyframeIndex.interval;
  }

  /** Battlefield state at `frame`. Never returns null for a valid frame. */
  at(frame: number): FrameState {
    const target = this.clamp(frame);

    // Forward playback inside the same checkpoint block: step the cache.
    if (this.cached && target >= this.cachedFrame && target - this.cachedFrame <= this.interval) {
      let state = this.cached;
      for (let f = this.cachedFrame + 1; f <= target; f += 1) {
        const delta = this.data.deltas.deltas[String(f)];
        if (delta) state = { ...state, ...delta };
      }
      state = { ...state, frame: target };
      this.cachedFrame = target;
      this.cached = state;
      return state;
    }

    // Arbitrary seek: nearest checkpoint at or before the target, then forward.
    const block = Math.floor(target / this.interval);
    let state: FrameState = { ...this.data.checkpoints[block] };
    for (let f = this.data.keyframeIndex.frames[block] + 1; f <= target; f += 1) {
      const delta = this.data.deltas.deltas[String(f)];
      if (delta) state = { ...state, ...delta };
    }
    state = { ...state, frame: target };
    this.cachedFrame = target;
    this.cached = state;
    return state;
  }

  private clamp(frame: number): number {
    const max = this.data.manifest.clock.frameCount - 1;
    if (!Number.isFinite(frame)) return 0;
    return Math.min(max, Math.max(0, Math.floor(frame)));
  }
}

/**
 * The force's recorded state at `frame`: the most recent snapshot at or before
 * it. Returns null before the force first appears in the record, so that a
 * force is not drawn into a period the dataset does not place it in.
 */
export function forceSnapshotAt(data: Dataset, forceId: string, frame: number): ForceSnapshot | null {
  const track = data.trackByForce.get(forceId);
  if (!track || track.snapshots.length === 0) return null;
  const snapshots = track.snapshots;
  if (frame < snapshots[0].f) return null;

  let lo = 0;
  let hi = snapshots.length - 1;
  let found = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (snapshots[mid].f <= frame) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return snapshots[found];
}

export interface ResolvedPosition {
  x: number;
  y: number;
  /** True while the force is between two recorded positions. */
  moving: boolean;
  /** Direction of travel in simulation space, or null when stationary. */
  heading: { dx: number; dy: number } | null;
  /** Fraction of the current leg completed, 0..1. */
  progress: number;
  placement: PlacementGrade;
  placeId: string | null;
}

/** Smoothstep. Movement eases out of and into a halt; it never snaps. */
function ease(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/**
 * The force's position at a continuous frame value.
 *
 * Positions are recorded only where the dataset states a location. Between two
 * recorded positions the force travels continuously: no force is ever moved
 * without a recorded origin and destination, and no force ever teleports
 * between them. Where the dataset gives no position at all, this returns null
 * and the force is simply not drawn.
 */
export function forcePositionAt(data: Dataset, forceId: string, frame: number): ResolvedPosition | null {
  const track = data.positionByForce.get(forceId);
  if (!track || track.keys.length === 0) return null;

  const keys = track.keys;
  if (frame < keys[0].f) return null;

  // Off-map runs: the force is recorded, but at no defensible position.
  for (const [start, end] of track.offMap) {
    if (frame >= start && frame <= end) return null;
  }

  let lo = 0;
  let hi = keys.length - 1;
  let i = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (keys[mid].f <= frame) {
      i = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const current = keys[i];
  const next = keys[i + 1];

  if (!next) {
    return {
      x: current.x,
      y: current.y,
      moving: false,
      heading: null,
      progress: 1,
      placement: current.placement,
      placeId: current.placeId,
    };
  }

  const span = next.f - current.f;
  const raw = span <= 0 ? 1 : (frame - current.f) / span;
  const t = ease(raw);

  const x = current.x + (next.x - current.x) * t;
  const y = current.y + (next.y - current.y) * t;
  const dx = next.x - current.x;
  const dy = next.y - current.y;
  const stationary = Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9;

  return {
    x,
    y,
    moving: !stationary && raw > 0 && raw < 1,
    heading: stationary ? null : { dx, dy },
    progress: raw,
    placement: raw > 0 && raw < 1 ? 'RECONSTRUCTED' : next.placement,
    placeId: raw >= 1 ? next.placeId : current.placeId,
  };
}

/** Recent trail behind a force, for the movement-trail layer. */
export function forceTrail(
  data: Dataset,
  forceId: string,
  frame: number,
  lookbackFrames: number,
): { x: number; y: number }[] {
  const track = data.positionByForce.get(forceId);
  if (!track || track.keys.length < 2) return [];
  const from = Math.max(track.keys[0].f, frame - lookbackFrames);
  const points: { x: number; y: number }[] = [];
  const step = Math.max(1, Math.floor((frame - from) / 48));
  for (let f = from; f <= frame; f += step) {
    const p = forcePositionAt(data, forceId, f);
    if (p) points.push({ x: p.x, y: p.y });
  }
  const head = forcePositionAt(data, forceId, frame);
  if (head) points.push({ x: head.x, y: head.y });
  return points;
}

/**
 * Forces that should be drawn at this frame.
 *
 * A force is drawn when the dataset has placed it and has not recorded it as
 * gone. Parent formations whose children are separately drawn are suppressed at
 * operational zoom so that the same soldiers are not shown twice.
 */
export function visibleForces(
  data: Dataset,
  frame: number,
  options: { includeParents: boolean },
): { forceId: string; snapshot: ForceSnapshot; position: ResolvedPosition }[] {
  const out: { forceId: string; snapshot: ForceSnapshot; position: ResolvedPosition }[] = [];
  const drawn = new Set<string>();

  for (const force of data.forces) {
    const snapshot = forceSnapshotAt(data, force.id, frame);
    if (!snapshot) continue;
    const position = forcePositionAt(data, force.id, frame);
    if (!position) continue;
    out.push({ forceId: force.id, snapshot, position });
    drawn.add(force.id);
  }

  if (options.includeParents) return out;

  // Suppress any force at least one of whose children is already on the map.
  return out.filter(({ forceId }) => {
    const force = data.forceById.get(forceId);
    if (!force) return true;
    return !force.childIds.some((child) => drawn.has(child));
  });
}

/** Theatre control at a frame, read from resolved battlefield state. */
export function theatreControl(state: FrameState, theatreId: string): string | null {
  return state.theatres[theatreId]?.control ?? null;
}

/** Battles live at this frame, derived from event spans rather than assumed. */
export function activeBattles(data: Dataset, frame: number): string[] {
  return data.battles.filter((b) => frame >= b.startFrame && frame <= b.endFrame).map((b) => b.id);
}

/** The most recent event at or before a frame, for the "current event" readout. */
export function currentEvent(data: Dataset, frame: number) {
  let found = null;
  for (const event of data.events) {
    if (event.frame > frame) break;
    found = event;
  }
  return found;
}
