import type {
  Battle,
  CampaignStage,
  CampaignTotals,
  CasualtyRecord,
  Combatant,
  Commander,
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
  territories: TerritoryChange[];
  theatres: Theatre[];
  places: Place[];
  nations: Nation[];
  factions: Faction[];
  stages: CampaignStage[];
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
  battleById: Map<string, Battle>;
  casualtiesByFrame: Map<number, CasualtyRecord[]>;
  movementsByForce: Map<string, Movement[]>;
  turningPoints: WarEvent[];
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
 * Optional presentation assets degrade separately, at the component that uses
 * them.
 */
export async function loadDataset(signal?: AbortSignal): Promise<Dataset> {
  const [manifest, timeline, keyframeIndex, deltas] = await Promise.all([
    json<Manifest>('manifest.json', signal),
    json<TimelineIndex>('timeline.index.json', signal),
    json<KeyframeIndex>('keyframes.index.json', signal),
    json<DeltaStream>('state.deltas.json', signal),
  ]);

  const [
    checkpoints,
    events,
    battles,
    forces,
    forceTracks,
    movementFile,
    casualtyFile,
    commanders,
    combatants,
    territories,
    theatres,
    places,
    nations,
    factions,
    stages,
    flags,
  ] = await Promise.all([
    Promise.all(keyframeIndex.files.map((file) => json<FrameState>(file, signal))),
    json<WarEvent[]>('events.json', signal),
    json<Battle[]>('battles.json', signal),
    json<Force[]>('forces.json', signal),
    json<ForceTrack[]>('force-tracks.json', signal),
    json<{ movements: Movement[]; positions: ForcePositionTrack[] }>('movement.json', signal),
    json<{ records: CasualtyRecord[]; campaignTotals: CampaignTotals }>('casualties.json', signal),
    json<Commander[]>('commanders.json', signal),
    json<Combatant[]>('combatants.json', signal),
    json<TerritoryChange[]>('territories.json', signal),
    json<Theatre[]>('theatres.json', signal),
    json<Place[]>('places.json', signal),
    json<Nation[]>('nations.json', signal),
    json<Faction[]>('factions.json', signal),
    json<CampaignStage[]>('stages.json', signal),
    json<NationFlagManifest>('nation-flags.json', signal),
  ]);

  return {
    manifest,
    timeline,
    keyframeIndex,
    checkpoints,
    deltas,
    events,
    battles,
    forces,
    forceTracks,
    positions: movementFile.positions,
    movements: movementFile.movements,
    casualties: casualtyFile.records,
    campaignTotals: casualtyFile.campaignTotals,
    commanders,
    combatants,
    territories,
    theatres,
    places,
    nations,
    factions,
    stages,
    flags,
    eventById: new Map(events.map((e) => [e.id, e])),
    eventsByFrame: groupBy(events, (e) => e.frame),
    forceById: new Map(forces.map((f) => [f.id, f])),
    trackByForce: new Map(forceTracks.map((t) => [t.forceId, t])),
    positionByForce: new Map(movementFile.positions.map((p) => [p.forceId, p])),
    theatreById: new Map(theatres.map((t) => [t.id, t])),
    placeById: new Map(places.map((p) => [p.id, p])),
    nationById: new Map(nations.map((n) => [n.id, n])),
    commanderById: new Map(commanders.map((c) => [c.id, c])),
    battleById: new Map(battles.map((b) => [b.id, b])),
    casualtiesByFrame: groupBy(casualtyFile.records, (c) => c.frame),
    movementsByForce: groupBy(movementFile.movements, (m) => m.forceId),
    turningPoints: events
      .filter((e) => e.turningPoint)
      .sort((a, b) => (a.turningPointRank ?? 0) - (b.turningPointRank ?? 0)),
  };
}

/** Reads a dictionary-encoded timeline column at one frame. */
export function columnAt(column: { dict: string[]; idx: number[] }, frame: number): string {
  const i = column.idx[frame];
  return i === undefined ? '' : column.dict[i] ?? '';
}
