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
/**
 * Documentary: light ground, solid faction fills, white fronts — the register
 * of the reference war documentaries. War room: the dark analytic register.
 */
export type MapTheme = 'documentary' | 'warroom';

export interface Bookmark {
  id: string;
  frame: number;
  eventId: string | null;
  label: string;
}
export type Scale = 'S' | 'M' | 'L';
export type Density = 'compact' | 'comfortable';

export type WarLayer =
  | 'territories'
  | 'operationalAreas'
  | 'frontlines'
  | 'occupation'
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
  { id: 'occupation', name: 'Fronts & occupation', note: 'Ground taken and lost as the armies move: it stays held until retaken, cut off or returned, and the front moves with the clock. RECONSTRUCTED from recorded positions and strengths (the novels draw no front line); campaign-wide, so force filters do not change it.' },
  { id: 'frontlines', name: 'Contact marks', note: 'Schematic contact between opposed forces in a live theatre.' },
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
  operationalAreas: false,
  occupation: true,
  frontlines: false,
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
  theme: MapTheme;
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
  /** Slow to 1x for a moment when playback reaches a turning point. */
  autoSlow: boolean;
  showMinimap: boolean;
  bookmarks: Bookmark[];
}

interface PreferenceActions {
  set: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  toggleLayer: (id: WarLayer) => void;
  setLayer: (id: WarLayer, on: boolean) => void;
  reset: () => void;
  setTheme: (theme: MapTheme) => void;
  addBookmark: (b: Omit<Bookmark, 'id'>) => void;
  removeBookmark: (id: string) => void;
}

export const DEFAULT_PREFERENCES: Preferences = {
  mapStyle: 'base',
  theme: 'documentary',
  globe: false,
  layers: DEFAULT_LAYERS,
  territoryOpacity: 0.7,
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
  autoSlow: true,
  showMinimap: true,
  bookmarks: [],
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
      reset: () => set((s) => ({ ...DEFAULT_PREFERENCES, bookmarks: s.bookmarks })),
      // Each theme has its own sensible fill strength; switching restores it.
      setTheme: (theme) => set({ theme, territoryOpacity: theme === 'documentary' ? 0.7 : 0.35 }),
      addBookmark: (b) => set((s) => ({ bookmarks: [...s.bookmarks, { ...b, id: `bm-${b.frame}-${s.bookmarks.length}` }].sort((x, y) => x.frame - y.frame) })),
      removeBookmark: (id) => set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) })),
    }),
    {
      name: 'tempest-atlas.preferences.v3',
      storage: createJSONStorage(() => safeStorage),
      version: 3,
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
