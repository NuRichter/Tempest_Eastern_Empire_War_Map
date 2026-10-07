'use client';

import { create } from 'zustand';

import type { Dataset } from '@/data/loader';
import type { FrameState, Provenance } from '@/types/dataset';
import type { EventCategory } from '@/lib/taxonomy';
import { SimulationClock, SPEEDS } from '@/simulation/clock';
import { StateResolver } from '@/simulation/resolver';
import { usePreferences } from '@/state/preferences';

export type Selection =
  | { kind: 'none' }
  | { kind: 'force'; id: string }
  | { kind: 'event'; id: string }
  | { kind: 'battle'; id: string }
  | { kind: 'character'; id: string }
  | { kind: 'territory'; id: string }
  | { kind: 'theatre'; id: string }
  | { kind: 'nation'; id: string }
  | { kind: 'movement'; id: string };

export type ViewMode = 'standard' | 'cinematic';
export type RailTab = 'layers' | 'filters' | 'feed' | 'story';

/** A camera request in simulation space. The map eases to it; it never jumps. */
export type CameraRequest =
  | { kind: 'point'; x: number; y: number; zoom?: number; nonce: number }
  | { kind: 'bounds'; bounds: [number, number, number, number]; maxZoom?: number; nonce: number }
  | { kind: 'campaign'; nonce: number };

export interface Filters {
  hiddenFactions: string[];
  /** Nations whose territory fill and formations are hidden. */
  hiddenNations: string[];
  /** Formations hidden, with everything they contain. */
  hiddenForces: string[];
  hiddenBattles: string[];
  hiddenTerritories: string[];
  hiddenTheatres: string[];
  hiddenCategories: EventCategory[];
  hiddenProvenance: Provenance[];
  /** Only show items at or above this confidence. */
  minConfidence: 'ANY' | 'MEDIUM' | 'HIGH';
}

export const EMPTY_FILTERS: Filters = {
  hiddenFactions: [],
  hiddenNations: [],
  hiddenForces: [],
  hiddenBattles: [],
  hiddenTerritories: [],
  hiddenTheatres: [],
  hiddenCategories: [],
  hiddenProvenance: [],
  minConfidence: 'ANY',
};

export function activeFilterCount(f: Filters): number {
  return f.hiddenFactions.length + f.hiddenNations.length + f.hiddenForces.length + f.hiddenBattles.length + f.hiddenTerritories.length + f.hiddenTheatres.length + f.hiddenCategories.length + f.hiddenProvenance.length + (f.minConfidence === 'ANY' ? 0 : 1);
}

interface SimulationState {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  data: Dataset | null;
  clock: SimulationClock | null;
  resolver: StateResolver | null;

  frame: number;
  playing: boolean;
  state: FrameState | null;

  selection: Selection;
  hovered: Selection;
  viewMode: ViewMode;
  railTab: RailTab;
  paletteOpen: boolean;
  legendOpen: boolean;
  helpOpen: boolean;
  debug: boolean;
  filters: Filters;
  commanderFocus: string | null;
  camera: CameraRequest | null;
  /** True while auto-slow holds playback at 1x after a turning point. */
  autoSlowed: boolean;

  init: (data: Dataset) => void;
  failed: (message: string) => void;
  seek: (frame: number) => void;
  toggle: () => void;
  pause: () => void;
  setSpeedIndex: (index: number) => void;
  stepEvent: (direction: 1 | -1) => void;
  select: (selection: Selection) => void;
  hover: (selection: Selection) => void;
  setViewMode: (mode: ViewMode) => void;
  setRailTab: (tab: RailTab) => void;
  setPaletteOpen: (open: boolean) => void;
  setLegendOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  setDebug: (on: boolean) => void;
  setFilters: (update: Partial<Filters>) => void;
  resetFilters: () => void;
  setCommanderFocus: (id: string | null) => void;
  focusPoint: (x: number, y: number, zoom?: number) => void;
  focusBounds: (bounds: [number, number, number, number], maxZoom?: number) => void;
  focusCampaign: () => void;
  jumpToEvent: (id: string, opts?: { seek?: boolean }) => void;
  jumpToBattle: (id: string) => void;
  jumpToForce: (id: string) => void;
  jumpToCharacter: (id: string) => void;
  jumpToTerritory: (id: string) => void;
  jumpToTheatre: (id: string) => void;
  jumpToNation: (id: string) => void;
  jumpToMovement: (id: string) => void;
}

let cameraNonce = 0;
const nextNonce = () => (cameraNonce += 1);

function trackBounds(data: Dataset, forceId: string): [number, number, number, number] | null {
  const keys = data.positionByForce.get(forceId)?.keys ?? [];
  if (!keys.length) return null;
  const xs = keys.map((k) => k.x);
  const ys = keys.map((k) => k.y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export const useSimulation = create<SimulationState>((set, get) => ({
  status: 'loading',
  error: null,
  data: null,
  clock: null,
  resolver: null,

  frame: 0,
  playing: false,
  state: null,

  selection: { kind: 'none' },
  hovered: { kind: 'none' },
  viewMode: 'standard',
  railTab: 'layers',
  paletteOpen: false,
  legendOpen: false,
  autoSlowed: false,
  helpOpen: false,
  debug: false,
  filters: EMPTY_FILTERS,
  commanderFocus: null,
  camera: null,

  init: (data) => {
    get().clock?.destroy();
    const resolver = new StateResolver(data);
    const clock = new SimulationClock({
      frameCount: data.manifest.clock.frameCount,
      onIntegerFrame: (frame) => set({ frame, state: resolver.at(frame) }),
    });
    clock.setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, usePreferences.getState().speedIndex)] ?? 1);
    // Exposed for browser QA (exact fractional seeks), like window.__atlasMap.
    if (typeof window !== 'undefined') (window as unknown as { __atlasClock?: SimulationClock }).__atlasClock = clock;
    clock.subscribe((_, playing) => {
      if (get().playing !== playing) set({ playing });
    });
    set({ status: 'ready', error: null, data, clock, resolver, frame: 0, state: resolver.at(0) });
  },

  failed: (message) => set({ status: 'error', error: message }),

  seek: (frame) => {
    const { clock, resolver } = get();
    clock?.seek(frame);
    const target = clock ? clock.integerFrame : Math.max(0, Math.floor(frame));
    set({ frame: target, state: resolver ? resolver.at(target) : null });
  },

  toggle: () => get().clock?.toggle(),
  pause: () => get().clock?.pause(),

  setSpeedIndex: (index) => {
    const i = Math.max(0, Math.min(SPEEDS.length - 1, index));
    get().clock?.setSpeed(SPEEDS[i]);
    usePreferences.getState().set('speedIndex', i);
    // A speed the reader chooses overrides a pending auto-slow restore.
    set({ autoSlowed: false });
  },

  stepEvent: (direction) => {
    const { data, frame, jumpToEvent } = get();
    if (!data) return;
    const list = data.events;
    const target = direction > 0 ? list.find((e) => e.frame > frame) : [...list].reverse().find((e) => e.frame < frame);
    if (target) jumpToEvent(target.id);
  },

  select: (selection) => set({ selection }),
  hover: (hovered) => set({ hovered }),
  setViewMode: (viewMode) => set({ viewMode }),
  setRailTab: (railTab) => {
    set({ railTab });
    usePreferences.getState().set('railOpen', true);
  },
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setLegendOpen: (legendOpen) => set({ legendOpen }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setDebug: (debug) => set({ debug }),
  setFilters: (update) => set((s) => ({ filters: { ...s.filters, ...update } })),
  resetFilters: () => set({ filters: EMPTY_FILTERS }),
  setCommanderFocus: (commanderFocus) => set({ commanderFocus }),

  focusPoint: (x, y, zoom) => set({ camera: { kind: 'point', x, y, zoom, nonce: nextNonce() } }),
  focusBounds: (bounds, maxZoom) => set({ camera: { kind: 'bounds', bounds, maxZoom, nonce: nextNonce() } }),
  focusCampaign: () => set({ camera: { kind: 'campaign', nonce: nextNonce() } }),

  jumpToEvent: (id, opts) => {
    const { data, seek, focusPoint } = get();
    const event = data?.eventById.get(id);
    if (!data || !event) return;
    if (opts?.seek !== false) seek(event.frame);
    set({ selection: { kind: 'event', id } });
    const place = event.placeId ? data.placeById.get(event.placeId) ?? data.nationById.get(event.placeId) : undefined;
    if (place?.x != null && place.y != null) focusPoint(place.x, place.y, 4.5);
    else {
      const theatre = data.theatreById.get(event.theatreId);
      if (theatre?.anchor) focusPoint(theatre.anchor.x, theatre.anchor.y, 4.2);
    }
  },

  jumpToBattle: (id) => {
    const { data, seek, focusPoint } = get();
    const battle = data?.battleById.get(id);
    if (!data || !battle) return;
    seek(battle.startFrame);
    set({ selection: { kind: 'battle', id } });
    const place = battle.placeId ? data.placeById.get(battle.placeId) : undefined;
    if (place?.x != null && place.y != null) focusPoint(place.x, place.y, 4.7);
  },

  jumpToForce: (id) => {
    const { data, frame, focusPoint, focusBounds, seek } = get();
    const force = data?.forceById.get(id);
    if (!data || !force) return;
    set({ selection: { kind: 'force', id } });
    const track = data.positionByForce.get(id);
    if (!track || !track.keys.length) return;
    // If the force is not on the map at this moment, move to when it first is.
    if (frame < track.keys[0].f) seek(track.keys[0].f);
    const b = trackBounds(data, id);
    if (b && (b[2] - b[0] > 0.02 || b[3] - b[1] > 0.02)) focusBounds(b, 4.8);
    else {
      const key = track.keys.find((k) => k.f >= get().frame) ?? track.keys[track.keys.length - 1];
      focusPoint(key.x, key.y, 4.8);
    }
  },

  jumpToCharacter: (id) => {
    const { data, frame, focusPoint } = get();
    const character = data?.characterById.get(id);
    if (!data || !character) return;
    set({ selection: { kind: 'character', id } });
    // Focus on the character's most recent appearance at or before now.
    const evs = character.eventIds.map((e) => data.eventById.get(e)).filter((e): e is NonNullable<typeof e> => Boolean(e));
    // Before the character's first appearance, go to it rather than to an empty map.
    if (evs.length && !evs.some((e) => e.frame <= frame)) get().seek(evs[0].frame);
    const current = [...evs].reverse().find((e) => e.frame <= get().frame) ?? evs[0];
    const place = current?.placeId ? data.placeById.get(current.placeId) ?? data.nationById.get(current.placeId) : undefined;
    if (place?.x != null && place.y != null) focusPoint(place.x, place.y, 4.5);
  },

  jumpToTerritory: (id) => {
    const { data, focusBounds } = get();
    const t = data?.territoryById.get(id);
    if (!t) return;
    set({ selection: { kind: 'territory', id } });
    focusBounds(t.bounds, 5);
  },

  jumpToTheatre: (id) => {
    const { data, focusBounds, focusPoint } = get();
    const theatre = data?.theatreById.get(id);
    if (!theatre) return;
    set({ selection: { kind: 'theatre', id } });
    if (theatre.bounds) focusBounds(theatre.bounds, 5);
    else if (theatre.anchor) focusPoint(theatre.anchor.x, theatre.anchor.y, 5);
  },

  jumpToNation: (id) => {
    const { data, jumpToTerritory, focusPoint } = get();
    const nation = data?.nationById.get(id);
    if (!nation) return;
    if (nation.territoryId) {
      jumpToTerritory(nation.territoryId);
      set({ selection: { kind: 'nation', id } });
    } else {
      set({ selection: { kind: 'nation', id } });
      if (nation.x != null && nation.y != null) focusPoint(nation.x, nation.y, 4);
    }
  },

  jumpToMovement: (id) => {
    const { data, seek, focusBounds } = get();
    const m = data?.movements.find((x) => x.id === id);
    if (!data || !m) return;
    if (m.startFrame !== null) seek(m.startFrame);
    set({ selection: { kind: 'movement', id } });
    const a = m.fromPlaceId ? data.placeById.get(m.fromPlaceId) ?? data.nationById.get(m.fromPlaceId) : null;
    const b = m.toPlaceId ? data.placeById.get(m.toPlaceId) ?? data.nationById.get(m.toPlaceId) : null;
    const pts = [a, b].filter((p): p is NonNullable<typeof p> => p?.x != null && p?.y != null);
    if (pts.length) {
      const xs = pts.map((p) => p.x!);
      const ys = pts.map((p) => p.y!);
      focusBounds([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], 4.8);
    }
  },
}));
