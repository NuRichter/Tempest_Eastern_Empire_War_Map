import type { Map as MapLibreMap } from 'maplibre-gl';
import { create } from 'zustand';

import type { Dataset } from '@/data/loader';
import { msg } from '@/i18n';
import { simToLngLat } from '@/lib/coords';
import { forcePositionAt } from '@/simulation/resolver';
import type { FrontEpisode } from '@/map/field/front';

/**
 * The cinematic director: a camera that reads the war.
 *
 * Every quarter second it looks at the ACTION around the current moment:
 *   recent events      weighted by significance, fading over four hours
 *   live battles       the heaviest weight
 *   moving fronts      held-ground transitions under way, by size
 *   marching armies    formations travelling between recorded positions
 * It clusters the action in space and chooses a SHOT:
 *   CLOSE        one focus, pushed in, tilted, orbiting slowly
 *   BATTLE       a live battle: closer, steeper, a slow swing around it
 *   MULTI-FRONT  several fronts at once: pulled out to frame them all, steady
 *   TRACKING     armies on the march: follows them with a little lead
 *   AFTERMATH    a battle just ended: a slow pull-out
 *   ESTABLISHING nothing happening: wide, high, drifting
 * The camera never jumps. Centre, zoom, pitch and bearing each follow a
 * critically damped spring toward the shot, so moves start and stop softly.
 * Reduced motion keeps it flat, unrotated and slower. Touching the map hands
 * control to the reader for a few seconds.
 */

export type Shot = 'CLOSE' | 'BATTLE' | 'MULTI_FRONT' | 'TRACKING' | 'AFTERMATH' | 'ESTABLISHING';

export const SHOT_LABEL: Record<Shot, string> = {
  CLOSE: msg('Close'),
  BATTLE: msg('Battle'),
  MULTI_FRONT: msg('Wide · several fronts'),
  TRACKING: msg('Tracking the march'),
  AFTERMATH: msg('Aftermath'),
  ESTABLISHING: msg('Establishing'),
};

export const useDirector = create<{ shot: Shot; fronts: number }>(() => ({ shot: 'ESTABLISHING', fronts: 0 }));

interface Pt { x: number; y: number; w: number; kind: 'event' | 'battle' | 'front' | 'march' }
interface Cluster { x0: number; y0: number; x1: number; y1: number; w: number; cx: number; cy: number; kinds: Set<Pt['kind']> }

const SIG: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1.2 };
const CLUSTER_RADIUS = 0.07; // simulation units

function placeXY(data: Dataset, id: string | null): { x: number; y: number } | null {
  if (!id) return null;
  const p = data.placeById.get(id) ?? data.nationById.get(id);
  return p && p.x != null && p.y != null ? { x: p.x, y: p.y } : null;
}

/** Everything that is happening around frame T, as weighted points. */
function gatherAction(data: Dataset, episodes: FrontEpisode[], T: number): { pts: Pt[]; battleLive: boolean; battleEnded: boolean } {
  const pts: Pt[] = [];
  let battleLive = false;
  let battleEnded = false;
  for (const e of data.events) {
    if (e.frame > T) break;
    const age = T - e.frame;
    if (age > 24) continue;
    const xy = placeXY(data, e.placeId);
    if (xy) pts.push({ ...xy, w: (SIG[e.significance] ?? 1) * (1 - age / 30), kind: 'event' });
  }
  for (const b of data.battles) {
    const xy = placeXY(data, b.placeId);
    if (!xy) continue;
    // An operation that runs for days (the labyrinth) is a front, not a battle shot.
    if (b.endFrame - b.startFrame > 144) { if (T >= b.startFrame && T <= b.endFrame) pts.push({ ...xy, w: 2.5, kind: 'front' }); continue; }
    if (T >= b.startFrame - 2 && T <= b.endFrame) { pts.push({ ...xy, w: 6, kind: 'battle' }); battleLive = true; }
    else if (T > b.endFrame && T - b.endFrame <= 12) { pts.push({ ...xy, w: 2.5, kind: 'battle' }); battleEnded = true; }
  }
  for (const ep of episodes) {
    if (T < ep.startFrame - 4 || T > ep.endFrame + 4) continue;
    const [x, y] = ep.centroid;
    pts.push({ x, y, w: 1.5 + Math.min(4, Math.sqrt(ep.cells / 60)), kind: 'front' });
  }
  let marching = 0;
  for (const f of data.forces) {
    if (marching > 24) break;
    const pos = forcePositionAt(data, f.id, T);
    if (!pos || !pos.moving) continue;
    // Lead the march: frame a little ahead of where the army is going.
    const lead = pos.heading ? 0.012 : 0;
    pts.push({ x: pos.x + (pos.heading?.dx ?? 0) * lead, y: pos.y + (pos.heading?.dy ?? 0) * lead, w: 0.8, kind: 'march' });
    marching += 1;
  }
  return { pts, battleLive, battleEnded };
}

function cluster(pts: Pt[]): Cluster[] {
  const out: Cluster[] = [];
  for (const p of [...pts].sort((a, b) => b.w - a.w)) {
    const c = out.find((k) => Math.hypot(k.cx - p.x, k.cy - p.y) < CLUSTER_RADIUS);
    if (c) {
      c.x0 = Math.min(c.x0, p.x); c.y0 = Math.min(c.y0, p.y); c.x1 = Math.max(c.x1, p.x); c.y1 = Math.max(c.y1, p.y);
      c.cx = (c.cx * c.w + p.x * p.w) / (c.w + p.w);
      c.cy = (c.cy * c.w + p.y * p.w) / (c.w + p.w);
      c.w += p.w;
      c.kinds.add(p.kind);
    } else out.push({ x0: p.x, y0: p.y, x1: p.x, y1: p.y, w: p.w, cx: p.x, cy: p.y, kinds: new Set([p.kind]) });
  }
  return out.sort((a, b) => b.w - a.w);
}

interface Target { cx: number; cy: number; zoom: number; pitch: number; bearing: number; tau: number; shot: Shot; fronts: number }

/**
 * Critically damped spring, solved exactly for each step, so the camera
 * arrives at the same moment whatever the frame rate (a slow device gets
 * fewer, larger steps, never a slower camera).
 */
class Spring {
  v = 0;
  constructor(public x: number) {}
  step(target: number, tau: number, dt: number): number {
    const w = 1 / tau;
    const d = this.x - target;
    const c2 = this.v + w * d;
    const e = Math.exp(-w * dt);
    this.x = target + (d + c2 * dt) * e;
    this.v = (c2 - w * (d + c2 * dt)) * e;
    return this.x;
  }
}

export interface DirectorOptions {
  data: Dataset;
  episodes: () => FrontEpisode[];
  frame: () => number;
  reducedMotion: () => boolean;
  /** Screen area kept clear for the overlay (letterbox, HUD), in px. */
  padding: () => { top: number; bottom: number; left: number; right: number };
}

/** Starts the director on a map; returns a stop function. */
export function startDirector(map: MapLibreMap, o: DirectorOptions): () => void {
  const c0 = map.getCenter();
  const sx = new Spring(c0.lng);
  const sy = new Spring(c0.lat);
  const sz = new Spring(map.getZoom());
  const sp = new Spring(map.getPitch());
  const sb = new Spring(map.getBearing());
  let target: Target | null = null;
  let lastPlan = 0;
  let lastT = performance.now();
  let handsOffUntil = 0;
  let raf = 0;
  let previous: Target | null = null;
  const t0 = performance.now();

  const userTook = () => { handsOffUntil = performance.now() + 6000; };
  map.on('dragstart', userTook);
  map.on('wheel', userTook);
  map.on('touchstart', userTook);

  const plan = (): Target => {
    const T = Math.round(o.frame());
    const { pts, battleLive, battleEnded } = gatherAction(o.data, o.episodes(), T);
    const reduce = o.reducedMotion();
    const pad = o.padding();
    const clusters = cluster(pts);
    const main = clusters[0];
    // Calm: hold the last place, pulled out and high.
    if (!main) {
      const base = previous ?? { cx: 0.66, cy: 0.46, zoom: 3.2, pitch: 0, bearing: 0, tau: 2.6, shot: 'ESTABLISHING' as Shot, fronts: 0 };
      return { ...base, zoom: Math.max(2.5, base.zoom - 0.7), pitch: reduce ? 0 : 22, tau: 3.2, shot: 'ESTABLISHING', fronts: 0 };
    }
    const strong = clusters.filter((k) => k.w >= main.w * 0.3 && k.w >= 2.5);
    const frame = strong.length > 1 ? strong : [main];
    let x0 = Math.min(...frame.map((k) => k.x0));
    let y0 = Math.min(...frame.map((k) => k.y0));
    let x1 = Math.max(...frame.map((k) => k.x1));
    let y1 = Math.max(...frame.map((k) => k.y1));
    // Never tighter than a theatre's worth of ground.
    const minSpan = strong.length > 1 ? 0.06 : 0.04;
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const half = Math.max(minSpan / 2, (x1 - x0) / 2 + 0.012, ((y1 - y0) / 2 + 0.012) * 1.3);
    x0 = mx - half; x1 = mx + half; y0 = my - half / 1.3; y1 = my + half / 1.3;
    const nw = simToLngLat(x0, y0);
    const se = simToLngLat(x1, y1);
    const cam = map.cameraForBounds([[nw.lng, se.lat], [se.lng, nw.lat]], { padding: pad, bearing: 0, pitch: 0 });
    let zoom = cam?.zoom ?? map.getZoom();
    let shot: Shot;
    let pitch: number;
    let tau: number;
    if (strong.length > 1) { shot = 'MULTI_FRONT'; pitch = 18; tau = 2.4; zoom -= 0.15; }
    else if (battleLive && main.kinds.has('battle')) { shot = 'BATTLE'; pitch = 50; tau = 1.5; zoom += 0.35; }
    else if (battleEnded && main.kinds.has('battle')) { shot = 'AFTERMATH'; pitch = 30; tau = 2.8; zoom -= 0.35; }
    else if (main.kinds.has('march') && !main.kinds.has('front')) { shot = 'TRACKING'; pitch = 38; tau = 1.6; }
    else { shot = 'CLOSE'; pitch = 42; tau = 1.8; zoom += 0.1; }
    zoom = Math.max(2.3, Math.min(6.2, zoom));
    const orbit = (performance.now() - t0) / 1000;
    const swing = shot === 'BATTLE' ? 16 : shot === 'MULTI_FRONT' ? 4 : 9;
    const bearing = reduce ? 0 : Math.sin(orbit / 14) * swing;
    const ll = simToLngLat(mx, my);
    return { cx: ll.lng, cy: ll.lat, zoom, pitch: reduce ? 0 : pitch, bearing, tau: reduce ? tau * 1.6 : tau, shot, fronts: strong.length };
  };

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.5, (now - lastT) / 1000);
    lastT = now;
    if (now < handsOffUntil) {
      // The reader is driving: follow the map so the springs pick up from here.
      const c = map.getCenter();
      sx.x = c.lng; sy.x = c.lat; sz.x = map.getZoom(); sp.x = map.getPitch(); sb.x = map.getBearing();
      sx.v = sy.v = sz.v = sp.v = sb.v = 0;
      return;
    }
    if (now - lastPlan > 250 || !target) {
      lastPlan = now;
      target = plan();
      previous = target;
      const d = useDirector.getState();
      if (d.shot !== target.shot || d.fronts !== target.fronts) useDirector.setState({ shot: target.shot, fronts: target.fronts });
    }
    // Big reframes travel faster than small corrections, so a new front is
    // reached in a couple of seconds while small drifts stay calm.
    const far = Math.min(1, Math.abs(target.zoom - sz.x) / 1.5);
    const tau = target.tau * (1 - 0.45 * far);
    map.jumpTo({
      center: [sx.step(target.cx, tau, dt), sy.step(target.cy, tau, dt)],
      zoom: sz.step(target.zoom, tau, dt),
      pitch: Math.max(0, Math.min(58, sp.step(target.pitch, tau * 1.4, dt))),
      bearing: sb.step(target.bearing, 3.2, dt),
    });
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    map.off('dragstart', userTook);
    map.off('wheel', userTook);
    map.off('touchstart', userTook);
  };
}
