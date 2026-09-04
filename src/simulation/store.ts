'use client';

import { create } from 'zustand';

import type { Dataset } from '@/data/loader';
import type { FrameState } from '@/types/dataset';
import { SimulationClock, type Speed } from '@/simulation/clock';
import { StateResolver } from '@/simulation/resolver';

export type LayerId =
  | 'base'
  | 'political'
  | 'frontlines'
  | 'armies'
  | 'movement'
  | 'trails'
  | 'battles'
  | 'events'
  | 'commanders'
  | 'casualties'
  | 'labels'
  | 'grid'
  | 'theatres'
  | 'markers';

export const LAYERS: { id: LayerId; name: string; note: string }[] = [
  { id: 'base', name: 'Base map', note: 'The supplied atlas.' },
  { id: 'political', name: 'Political nations', note: 'Nation markers measured from the supplied map.' },
  { id: 'theatres', name: 'Theatre boundaries', note: 'Schematic areas of operations. Not borders.' },
  { id: 'frontlines', name: 'Frontlines', note: 'Contact between opposed forces in a live theatre.' },
  { id: 'armies', name: 'Armies', note: 'Formations placed by the dataset.' },
  { id: 'movement', name: 'Movement', note: 'Recorded movements with an origin and a destination.' },
  { id: 'trails', name: 'Movement trails', note: 'Where a formation has been.' },
  { id: 'battles', name: 'Battles', note: 'Combat engagements.' },
  { id: 'events', name: 'Events', note: 'Changes recorded in the campaign.' },
  { id: 'commanders', name: 'Commanders', note: 'Command posts of active commanders.' },
  { id: 'casualties', name: 'Casualties', note: 'Losses at the place they were recorded.' },
  { id: 'labels', name: 'Labels', note: 'Zoom-dependent place and formation names.' },
  { id: 'markers', name: 'Strategic markers', note: 'Turning points and campaign anchors.' },
  { id: 'grid', name: 'Graticule', note: 'Simulation grid. Not a geographic graticule.' },
];

export type Selection =
  | { kind: 'none' }
  | { kind: 'force'; id: string }
  | { kind: 'event'; id: string }
  | { kind: 'battle'; id: string }
  | { kind: 'commander'; id: string }
  | { kind: 'nation'; id: string }
  | { kind: 'theatre'; id: string }
  | { kind: 'combatant'; id: string };

export type PanelId = 'calendar' | 'events' | 'highlights' | 'layers' | 'casualties' | 'intelligence';

export type ViewMode = 'standard' | 'cinematic' | 'presentation';

export interface CameraRequest {
  x: number;
  y: number;
  zoom?: number;
  /** Increments on every request so repeated focus on one place still fires. */
  nonce: number;
}

interface SimulationState {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  data: Dataset | null;
  clock: SimulationClock | null;
  resolver: StateResolver | null;

  frame: number;
  playing: boolean;
  speed: Speed;
  reversed: boolean;
  state: FrameState | null;

  layers: Record<LayerId, boolean>;
  openPanels: Record<PanelId, boolean>;
  selection: Selection;
  hovered: Selection;
  viewMode: ViewMode;
  globe: boolean;
  showParentFormations: boolean;
  commanderMode: string | null;
  combatantFocus: string | null;
  debug: boolean;
  searchOpen: boolean;
  camera: CameraRequest | null;

  init: (data: Dataset) => void;
  failed: (message: string) => void;
  setFrame: (frame: number) => void;
  seek: (frame: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (speed: Speed) => void;
  setReversed: (reversed: boolean) => void;
  toggleLayer: (id: LayerId) => void;
  setLayer: (id: LayerId, on: boolean) => void;
  togglePanel: (id: PanelId) => void;
  select: (selection: Selection) => void;
  hover: (selection: Selection) => void;
  setViewMode: (mode: ViewMode) => void;
  setGlobe: (on: boolean) => void;
  setShowParentFormations: (on: boolean) => void;
  setCommanderMode: (id: string | null) => void;
  setCombatantFocus: (id: string | null) => void;
  setDebug: (on: boolean) => void;
  setSearchOpen: (on: boolean) => void;
  focusOn: (x: number, y: number, zoom?: number) => void;
  jumpToEvent: (eventId: string) => void;
  jumpToBattle: (battleId: string) => void;
  jumpToForce: (forceId: string) => void;
  jumpToTheatre: (theatreId: string) => void;
}

const DEFAULT_LAYERS: Record<LayerId, boolean> = {
  base: true,
  political: true,
  theatres: true,
  frontlines: true,
  armies: true,
  movement: true,
  trails: false,
  battles: true,
  events: true,
  commanders: false,
  casualties: false,
  labels: true,
  markers: true,
  grid: false,
};

const DEFAULT_PANELS: Record<PanelId, boolean> = {
  calendar: true,
  events: true,
  highlights: false,
  layers: false,
  casualties: false,
  intelligence: false,
};

let cameraNonce = 0;

export const useSimulation = create<SimulationState>((set, get) => ({
  status: 'loading',
  error: null,
  data: null,
  clock: null,
  resolver: null,

  frame: 0,
  playing: false,
  speed: 1,
  reversed: false,
  state: null,

  layers: { ...DEFAULT_LAYERS },
  openPanels: { ...DEFAULT_PANELS },
  selection: { kind: 'none' },
  hovered: { kind: 'none' },
  viewMode: 'standard',
  globe: true,
  showParentFormations: false,
  commanderMode: null,
  combatantFocus: null,
  debug: false,
  searchOpen: false,
  camera: null,

  init: (data) => {
    get().clock?.destroy();
    const resolver = new StateResolver(data);
    const clock = new SimulationClock({
      frameCount: data.manifest.clock.frameCount,
      onIntegerFrame: (frame) => {
        set({ frame, state: resolver.at(frame) });
      },
    });
    clock.subscribe((_, playing) => {
      if (get().playing !== playing) set({ playing });
    });
    set({
      status: 'ready',
      error: null,
      data,
      clock,
      resolver,
      frame: 0,
      state: resolver.at(0),
    });
  },

  failed: (message) => set({ status: 'error', error: message }),

  setFrame: (frame) => {
    const { resolver } = get();
    set({ frame, state: resolver ? resolver.at(frame) : null });
  },

  seek: (frame) => {
    const { clock, resolver } = get();
    clock?.seek(frame);
    const target = clock ? clock.integerFrame : frame;
    set({ frame: target, state: resolver ? resolver.at(target) : null });
  },

  play: () => get().clock?.play(),
  pause: () => get().clock?.pause(),
  toggle: () => get().clock?.toggle(),

  setSpeed: (speed) => {
    get().clock?.setSpeed(speed);
    set({ speed });
  },

  setReversed: (reversed) => {
    get().clock?.setDirection(reversed ? -1 : 1);
    set({ reversed });
  },

  toggleLayer: (id) => set((s) => ({ layers: { ...s.layers, [id]: !s.layers[id] } })),
  setLayer: (id, on) => set((s) => ({ layers: { ...s.layers, [id]: on } })),
  togglePanel: (id) => set((s) => ({ openPanels: { ...s.openPanels, [id]: !s.openPanels[id] } })),

  select: (selection) => set({ selection }),
  hover: (hovered) => set({ hovered }),

  setViewMode: (viewMode) => set({ viewMode }),
  setGlobe: (globe) => set({ globe }),
  setShowParentFormations: (showParentFormations) => set({ showParentFormations }),
  setCommanderMode: (commanderMode) => set({ commanderMode }),
  setCombatantFocus: (combatantFocus) => set({ combatantFocus }),
  setDebug: (debug) => set({ debug }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),

  focusOn: (x, y, zoom) => {
    cameraNonce += 1;
    set({ camera: { x, y, zoom, nonce: cameraNonce } });
  },

  jumpToEvent: (eventId) => {
    const { data, seek, focusOn, select } = get();
    const event = data?.eventById.get(eventId);
    if (!event) return;
    seek(event.frame);
    select({ kind: 'event', id: eventId });
    const place = event.placeId ? data!.placeById.get(event.placeId) : undefined;
    if (place?.x != null && place.y != null) focusOn(place.x, place.y, 4.2);
    else {
      const theatre = data!.theatreById.get(event.theatreId);
      if (theatre?.anchor) focusOn(theatre.anchor.x, theatre.anchor.y, 3.8);
    }
  },

  jumpToBattle: (battleId) => {
    const { data, seek, focusOn, select } = get();
    const battle = data?.battleById.get(battleId);
    if (!battle) return;
    seek(battle.startFrame);
    select({ kind: 'battle', id: battleId });
    const place = battle.placeId ? data!.placeById.get(battle.placeId) : undefined;
    if (place?.x != null && place.y != null) focusOn(place.x, place.y, 4.6);
  },

  jumpToForce: (forceId) => {
    const { data, select, focusOn, frame } = get();
    if (!data) return;
    select({ kind: 'force', id: forceId });
    const track = data.positionByForce.get(forceId);
    if (!track || track.keys.length === 0) return;
    const key = track.keys.find((k) => k.f >= frame) ?? track.keys[track.keys.length - 1];
    focusOn(key.x, key.y, 4.2);
  },

  jumpToTheatre: (theatreId) => {
    const { data, select, focusOn } = get();
    const theatre = data?.theatreById.get(theatreId);
    if (!theatre) return;
    select({ kind: 'theatre', id: theatreId });
    if (theatre.anchor) focusOn(theatre.anchor.x, theatre.anchor.y, 3.6);
  },
}));
