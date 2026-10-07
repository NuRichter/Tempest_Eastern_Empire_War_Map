import type {
  Ambiguity,
  Battle,
  CampaignStage,
  CampaignTotals,
  CasualtyRecord,
  Character,
  Combatant,
  Commander,
  Contradiction,
  Faction,
  Force,
  ForcePositionTrack,
  ForceTrack,
  FrameState,
  Manifest,
  Movement,
  Nation,
  NationFlagManifest,
  Place,
  TermEntry,
  Territory,
  TerritoryChange,
  Theatre,
  TimelineIndex,
  WarEvent,
} from '@/types/dataset';

export interface KeyframeIndex {
  interval: number;
  frames: number[];
  files: string[];
}

export interface DeltaStream {
  interval: number;
  frameCount: number;
  deltaFrames: number[];
  deltas: Record<string, Partial<FrameState>>;
}

export interface Dataset {
  manifest: Manifest;
  timeline: TimelineIndex;
  keyframeIndex: KeyframeIndex;
  checkpoints: FrameState[];
  deltas: DeltaStream;
  events: WarEvent[];
  battles: Battle[];
  forces: Force[];
  forceTracks: ForceTrack[];
  positions: ForcePositionTrack[];
  movements: Movement[];
  casualties: CasualtyRecord[];
  campaignTotals: CampaignTotals;
  commanders: Commander[];
  combatants: Combatant[];
  characters: Character[];
  territoryChanges: TerritoryChange[];
  territories: Territory[];
  theatres: Theatre[];
  places: Place[];
  nations: Nation[];
  factions: Faction[];
  stages: CampaignStage[];
  terms: TermEntry[];
  flags: NationFlagManifest;
  /* derived indexes, built once */
  eventById: Map<string, WarEvent>;
  eventsByFrame: Map<number, WarEvent[]>;
  forceById: Map<string, Force>;
  trackByForce: Map<string, ForceTrack>;
  positionByForce: Map<string, ForcePositionTrack>;
  theatreById: Map<string, Theatre>;
  placeById: Map<string, Place>;
  nationById: Map<string, Nation>;
  commanderById: Map<string, Commander>;
  characterById: Map<string, Character>;
  territoryById: Map<string, Territory>;
  battleById: Map<string, Battle>;
  factionById: Map<string, Faction>;
  movementsByForce: Map<string, Movement[]>;
  casualtiesByEvent: Map<string, CasualtyRecord[]>;
  turningPoints: WarEvent[];
}

export interface ReferenceRegister {
  contradictions: Contradiction[];
  ambiguities: Ambiguity[];
}

const BASE = '/data';

async function json<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE}/${path}`, { signal, cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Could not load ${path} (${response.status}). Run "npm run compile-data" and rebuild.`);
  }
  return (await response.json()) as T;
}

function groupBy<T, K>(items: T[], key: (item: T) => K | null): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    if (k === null) continue;
    const list = out.get(k);
    if (list) list.push(item);
    else out.set(k, [item]);
  }
  return out;
}

/**
 * Loads the runtime dataset.
 *
 * Required data failing to load is fatal and surfaces as an error screen: a war
 * map missing its campaign is not a degraded experience, it is a wrong one.
 */
/** The files the runtime dataset is made of, as loaded. */
export interface DatasetParts {
  manifest: Manifest;
  timeline: TimelineIndex;
  keyframeIndex: KeyframeIndex;
  deltas: DeltaStream;
  checkpoints: FrameState[];
  events: WarEvent[];
  battles: Battle[];
  forces: Force[];
  forceTracks: ForceTrack[];
  movementFile: { movements: Movement[]; positions: ForcePositionTrack[] };
  casualtyFile: { records: CasualtyRecord[]; campaignTotals: CampaignTotals };
  commanders: Commander[];
  combatants: Combatant[];
  characters: Character[];
  territoryChanges: TerritoryChange[];
  geo: { territories: Territory[] };
  theatres: Theatre[];
  places: Place[];
  nations: Nation[];
  factions: Faction[];
  stages: CampaignStage[];
  terms: TermEntry[];
  flags: NationFlagManifest;
}

/** Builds the dataset and its derived indexes. Pure: the browser and the tests share it. */
export function assembleDataset(p: DatasetParts): Dataset {
  return {
    manifest: p.manifest,
    timeline: p.timeline,
    keyframeIndex: p.keyframeIndex,
    checkpoints: p.checkpoints,
    deltas: p.deltas,
    events: p.events,
    battles: p.battles,
    forces: p.forces,
    forceTracks: p.forceTracks,
    positions: p.movementFile.positions,
    movements: p.movementFile.movements,
    casualties: p.casualtyFile.records,
    campaignTotals: p.casualtyFile.campaignTotals,
    commanders: p.commanders,
    combatants: p.combatants,
    characters: p.characters,
    territoryChanges: p.territoryChanges,
    territories: p.geo.territories,
    theatres: p.theatres,
    places: p.places,
    nations: p.nations,
    factions: p.factions,
    stages: p.stages,
    terms: p.terms,
    flags: p.flags,
    eventById: new Map(p.events.map((e) => [e.id, e])),
    eventsByFrame: groupBy(p.events, (e) => e.frame),
    forceById: new Map(p.forces.map((f) => [f.id, f])),
    trackByForce: new Map(p.forceTracks.map((t) => [t.forceId, t])),
    positionByForce: new Map(p.movementFile.positions.map((x) => [x.forceId, x])),
    theatreById: new Map(p.theatres.map((t) => [t.id, t])),
    placeById: new Map(p.places.map((x) => [x.id, x])),
    nationById: new Map(p.nations.map((n) => [n.id, n])),
    commanderById: new Map(p.commanders.map((c) => [c.id, c])),
    characterById: new Map(p.characters.map((c) => [c.id, c])),
    territoryById: new Map(p.geo.territories.map((t) => [t.id, t])),
    battleById: new Map(p.battles.map((b) => [b.id, b])),
    factionById: new Map(p.factions.map((f) => [f.id, f])),
    movementsByForce: groupBy(p.movementFile.movements, (m) => m.forceId),
    casualtiesByEvent: groupBy(p.casualtyFile.records, (c) => c.eventId),
    turningPoints: p.events.filter((e) => e.turningPoint).sort((a, b) => (a.turningPointRank ?? 0) - (b.turningPointRank ?? 0)),
  };
}

/** The file each part is read from, relative to /data. */
export const PART_FILES: Record<Exclude<keyof DatasetParts, 'checkpoints'>, string> = {
  manifest: 'manifest.json',
  timeline: 'timeline.index.json',
  keyframeIndex: 'keyframes.index.json',
  deltas: 'state.deltas.json',
  events: 'events.json',
  battles: 'battles.json',
  forces: 'forces.json',
  forceTracks: 'force-tracks.json',
  movementFile: 'movement.json',
  casualtyFile: 'casualties.json',
  commanders: 'commanders.json',
  combatants: 'combatants.json',
  characters: 'characters.json',
  territoryChanges: 'territories.json',
  geo: 'territories.geo.json',
  theatres: 'theatres.json',
  places: 'places.json',
  nations: 'nations.json',
  factions: 'factions.json',
  stages: 'stages.json',
  terms: 'terms.json',
  flags: 'nation-flags.json',
};

/**
 * Loads the runtime dataset.
 *
 * Required data failing to load is fatal and surfaces as an error screen: a war
 * map missing its campaign is not a degraded experience, it is a wrong one.
 */
export async function loadDataset(signal?: AbortSignal): Promise<Dataset> {
  const entries = await Promise.all(
    (Object.entries(PART_FILES) as [keyof typeof PART_FILES, string][]).map(async ([k, f]) => [k, await json<unknown>(f, signal)] as const),
  );
  const parts = Object.fromEntries(entries) as unknown as Omit<DatasetParts, 'checkpoints'>;
  const checkpoints = await Promise.all(parts.keyframeIndex.files.map((file) => json<FrameState>(file, signal)));
  return assembleDataset({ ...parts, checkpoints });
}

/** The uncertainty register is only read when someone opens it. */
export function loadReference(signal?: AbortSignal): Promise<ReferenceRegister> {
  return json<ReferenceRegister>('reference.json', signal);
}

/** Reads a dictionary-encoded timeline column at one frame. */
export function columnAt(column: { dict: string[]; idx: number[] }, frame: number): string {
  const i = column.idx[frame];
  return i === undefined ? '' : column.dict[i] ?? '';
}
