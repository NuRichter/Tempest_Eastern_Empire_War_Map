/**
 * The formations that can hold ground at a moment, as weighted influence
 * sources. Pure (no DOM): shared by the front compiler and the tests, so the
 * precomputed held-ground history and its checks use one rule set.
 *
 *   weight = strength^(1/3)       (unknown strength: a nominal 2,000)
 *   reach  = 0.0011 · weight, clamped to 0.012–0.055 of the atlas width
 *
 * Formations in the air or under ground (airships, the labyrinth), destroyed or
 * captured formations and single combatants hold no ground. A parent and its
 * subordinates are the same soldiers: only the most specific one counts, and
 * once a formation has been divided into subordinates with their own positions
 * it never holds ground as a whole again (an aggregate such as a division's
 * paper ceiling is not an army in the field).
 */

import type { Dataset } from '@/data/loader';
import { factionKey } from '@/lib/palette';
import { forcePositionAt, forceSnapshotAt } from '@/simulation/resolver';

export type Side = 'empire' | 'allied';

export interface Source {
  forceId: string;
  side: Side;
  x: number;
  y: number;
  w: number;
  r: number;
}

export const NOMINAL_UNKNOWN_STRENGTH = 2000;
export const MIN_HOLDING_STRENGTH = 50;

export function sideOf(faction: string | null | undefined): Side | null {
  const k = factionKey(faction);
  if (k === 'empire') return 'empire';
  if (k === 'tempest' || k === 'dwargon' || k === 'neutral') return 'allied';
  return null;
}

const aggregateCache = new WeakMap<Dataset, Map<string, number>>();

/** Frame from which each formation is only an aggregate of positioned subordinates. */
function aggregateFrom(data: Dataset): Map<string, number> {
  const cached = aggregateCache.get(data);
  if (cached) return cached;
  const first = new Map<string, number>();
  for (const f of data.forces) {
    const keys = data.positionByForce.get(f.id)?.keys;
    if (keys?.length) first.set(f.id, keys[0].f);
  }
  const out = new Map<string, number>();
  const earliestDescendant = (id: string, seen = new Set<string>()): number => {
    let best = Infinity;
    for (const c of data.forceById.get(id)?.childIds ?? []) {
      if (seen.has(c)) continue;
      seen.add(c);
      best = Math.min(best, first.get(c) ?? Infinity, earliestDescendant(c, seen));
    }
    return best;
  };
  for (const f of data.forces) {
    const d = earliestDescendant(f.id);
    if (d < Infinity) out.set(f.id, d);
  }
  aggregateCache.set(data, out);
  return out;
}

export function fieldSources(data: Dataset, frame: number, hidden: ReadonlySet<string> = new Set()): Source[] {
  const drawn = new Map<string, Source>();
  const aggregates = aggregateFrom(data);
  for (const force of data.forces) {
    if (hidden.has(force.id)) continue;
    if (frame >= (aggregates.get(force.id) ?? Infinity)) continue;
    const snap = forceSnapshotAt(data, force.id, Math.floor(frame));
    if (!snap || /DESTROY|ANNIHILAT|CAPTURED|PRISONER|RESURRECTED|REJOINED/i.test(snap.status)) continue;
    const pos = forcePositionAt(data, force.id, frame);
    if (!pos) continue;
    const place = pos.placeId ? data.placeById.get(pos.placeId) : null;
    if (place && (place.altitude === 'AIR' || place.altitude === 'SUBSURFACE')) continue;
    if (/air|airship|flying|fleet/i.test(force.unitType)) continue;
    const side = sideOf(force.faction);
    if (!side) continue;
    const strength = typeof snap.strength === 'number' ? snap.strength : NOMINAL_UNKNOWN_STRENGTH;
    if (strength < MIN_HOLDING_STRENGTH) continue;
    const w = Math.cbrt(strength);
    const r = Math.min(0.055, Math.max(0.012, 0.0011 * w));
    drawn.set(force.id, { forceId: force.id, side, x: pos.x, y: pos.y, w, r });
  }
  for (const force of data.forces) {
    if (drawn.has(force.id) && force.childIds.some((c) => drawn.has(c))) drawn.delete(force.id);
  }
  return [...drawn.values()].sort((a, b) => (a.forceId < b.forceId ? -1 : 1));
}
