import { useSimulation } from '@/simulation/store';
import { usePreferences } from '@/state/preferences';

/**
 * Whether the three.js view covers the map right now (cinematic mode films in
 * 3D when cinema3d is on; otherwise the reader's 3D toggle). While it does, the
 * 2D map, its director and its overlay stand still: nothing hidden is drawn.
 */
export function is3DActive(): boolean {
  const p = usePreferences.getState();
  return useSimulation.getState().viewMode === 'cinematic' ? p.cinema3d : p.view3d;
}

export function use3DActive(): boolean {
  const cinematic = useSimulation((s) => s.viewMode === 'cinematic');
  const view3d = usePreferences((s) => s.view3d);
  const cinema3d = usePreferences((s) => s.cinema3d);
  return cinematic ? cinema3d : view3d;
}
