'use client';

import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/**
 * Reader preferences: how the map is drawn, never what it shows.
 *
 * Persisted locally so a returning reader finds the atlas as they left it.
 * Campaign position and selection are deliberately NOT persisted (they live in
 * the URL instead), so a shared link always shows the same thing to everyone.
 */

export type MapStyle = 'base' | 'myth';
export type Scale = 'S' | 'M' | 'L';
export type Density = 'compact' | 'comfortable';

export type WarLayer =
  | 'territories'
  | 'operationalAreas'
  | 'frontlines'
  | 'movement'
  | 'trails'
  | 'forces'
  | 'armySizes'
  | 'battles'
  | 'events'
  | 'commanders'
  | 'characters'
  | 'labels'
  | 'grid';

export const WAR_LAYERS: { id: WarLayer; name: string; note: string }[] = [
  { id: 'territories', name: 'Territories', note: 'National regions traced from the drawn borders of the base map, coloured by their part in the war.' },
  { id: 'operationalAreas', name: 'Operational areas', note: 'Schematic theatre areas, clipped to the drawn borders. Not borders themselves.' },
  { id: 'frontlines', name: 'Frontlines', note: 'Contact between opposed forces in a live theatre. Schematic.' },
  { id: 'movement', name: 'Army movement', note: 'Recorded movements. Solid, reconstructed and schematic routes are drawn differently; unknown routes are not drawn.' },
  { id: 'trails', name: 'Movement trails', note: 'Where a formation has been.' },
  { id: 'forces', name: 'Forces', note: 'Formations at their recorded positions.' },
  { id: 'armySizes', name: 'Army sizes', note: 'Strength labels. Explicit, derived, reconstructed and unknown sizes are marked.' },
  { id: 'battles', name: 'Battles', note: 'Engagements, sieges, interceptions and special combat.' },
  { id: 'events', name: 'Events', note: 'Recorded changes in the campaign, fading with age.' },
  { id: 'commanders', name: 'Commanders', note: 'Command posts of commanders in command at this moment.' },
  { id: 'characters', name: 'Character markers', note: 'Photocards of characters active in the current event.' },
  { id: 'labels', name: 'Labels', note: 'Nation, place and formation names, by zoom.' },
  { id: 'grid', name: 'Simulation grid', note: 'A 10% grid in simulation space. Not a geographic graticule.' },
];

export const DEFAULT_LAYERS: Record<WarLayer, boolean> = {
  territories: true,
  operationalAreas: true,
  frontlines: true,
  movement: true,
  trails: false,
  forces: true,
  armySizes: true,
  battles: true,
  events: true,
  commanders: false,
  characters: true,
  labels: true,
  grid: false,
};

export interface Preferences {
  mapStyle: MapStyle;
  /** Base map rendering: the war-room dark treatment, or the source colours. */
  baseTone: 'dark' | 'original';
  globe: boolean;
  layers: Record<WarLayer, boolean>;
  territoryOpacity: number;
  borderOpacity: number;
  movementOpacity: number;
  trailWidth: number;
  labelScale: Scale;
  markerScale: Scale;
  eventMarkerScale: Scale;
  density: Density;
  speedIndex: number;
  railOpen: boolean;
  panelOpen: boolean;
  reducedMotion: 'system' | 'reduce' | 'full';
}

interface PreferenceActions {
  set: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  toggleLayer: (id: WarLayer) => void;
  setLayer: (id: WarLayer, on: boolean) => void;
  reset: () => void;
}

export const DEFAULT_PREFERENCES: Preferences = {
  mapStyle: 'base',
  baseTone: 'dark',
  globe: false,
  layers: DEFAULT_LAYERS,
  territoryOpacity: 0.35,
  borderOpacity: 0.8,
  movementOpacity: 0.9,
  trailWidth: 1.5,
  labelScale: 'M',
  markerScale: 'M',
  eventMarkerScale: 'M',
  density: 'comfortable',
  speedIndex: 2,
  railOpen: false,
  panelOpen: true,
  reducedMotion: 'system',
};

/** localStorage can throw (private mode, blocked storage); preferences then simply don't persist. */
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* not persisted */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* nothing to remove */
    }
  },
};

export const usePreferences = create<Preferences & PreferenceActions>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      set: (key, value) => set({ [key]: value } as Partial<Preferences>),
      toggleLayer: (id) => set((s) => ({ layers: { ...s.layers, [id]: !s.layers[id] } })),
      setLayer: (id, on) => set((s) => ({ layers: { ...s.layers, [id]: on } })),
      reset: () => set({ ...DEFAULT_PREFERENCES }),
    }),
    {
      name: 'tempest-atlas.preferences.v2',
      storage: createJSONStorage(() => safeStorage),
      version: 2,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Preferences>;
        return { ...current, ...p, layers: { ...DEFAULT_LAYERS, ...(p.layers ?? {}) } };
      },
    },
  ),
);

export const SCALE_FACTOR: Record<Scale, number> = { S: 0.85, M: 1, L: 1.25 };

/** True when motion should be minimised, by system setting or explicit choice. */
export function prefersReducedMotion(): boolean {
  const choice = usePreferences.getState().reducedMotion;
  if (choice === 'reduce') return true;
  if (choice === 'full') return false;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
