/**
 * Distance measurement on the 1:1 atlas plane (src/lib/world.ts).
 *
 * While the tool is on, a click on the map adds a point instead of selecting
 * what is under the pointer (src/map/overlay/Overlay.tsx). Lengths are
 * straight lines between the points in kilometres, on the same synthetic scale
 * the routes and march rates use.
 */
import { create } from 'zustand';

import { polylineKm, type XY } from '@/lib/world';

interface MeasureState {
  active: boolean;
  points: XY[];
  setActive: (on: boolean) => void;
  add: (p: XY) => void;
  undo: () => void;
  clear: () => void;
}

export const useMeasure = create<MeasureState>()((set) => ({
  active: false,
  points: [],
  setActive: (on) => set({ active: on, points: [] }),
  add: (p) => set((s) => ({ points: [...s.points, p].slice(-64) })),
  undo: () => set((s) => ({ points: s.points.slice(0, -1) })),
  clear: () => set({ points: [] }),
}));

export const measuredKm = (points: readonly XY[]): number => polylineKm(points);

/** A scale-bar length: the largest 1-2-5 step that fits in `maxKm`. */
export function niceKm(maxKm: number): number {
  if (!(maxKm > 0)) return 0;
  const p = 10 ** Math.floor(Math.log10(maxKm));
  for (const m of [5, 2, 1]) if (m * p <= maxKm) return m * p;
  return p;
}
