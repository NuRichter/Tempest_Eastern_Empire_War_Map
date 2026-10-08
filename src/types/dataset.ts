/**
 * Runtime dataset contract.
 *
 * These types describe the OUTPUT of scripts/compile-data.ts, i.e. the static
 * JSON the browser consumes. The source shapes (data-source/campaign/*.json)
 * live in scripts/lib/source-types.ts.
 */

/** A value the corpus does not establish. Never coerced to zero. */
export const UNKNOWN = 'UNKNOWN' as const;
export type Unknown = typeof UNKNOWN;

/** A number, or an explicit statement that no number exists. */
export type Quantity = number | Unknown;

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | Unknown;

/**
 * How an event is supported by the source corpus.
 * CANONICAL                            explicitly supported by the novel
 * CANONICAL_WITH_VISUAL_RECONSTRUCTION canonical, but position/path/timing are reconstructed for the map
 * RECONSTRUCTED                        a plausible bridging sequence made by this project
 * INFERRED                             follows from several clues, not stated
 * UNRESOLVED                           evidence insufficient
 */
export type Provenance =
  | 'CANONICAL'
  | 'CANONICAL_WITH_VISUAL_RECONSTRUCTION'
  | 'RECONSTRUCTED'
  | 'INFERRED'
  | 'UNRESOLVED';

export const PROVENANCE_ORDER: Provenance[] = [
  'CANONICAL',
  'CANONICAL_WITH_VISUAL_RECONSTRUCTION',
  'INFERRED',
  'RECONSTRUCTED',
  'UNRESOLVED',
];

/** Display grade for any single value (a coordinate, a time, a number). */
export type SourceGrade = 'CANONICAL' | 'RECONSTRUCTED' | 'SIMULATION' | Unknown;

/** How a coordinate was arrived at. See data-source/gazetteer.source.json. */
export type PlacementGrade = 'MEASURED' | 'RECONSTRUCTED' | 'SCHEMATIC' | 'ABSTRACT';

/** How a force strength is known. UNKNOWN is never rendered as zero. */
export type SizeStatus = 'EXPLICIT' | 'DERIVED' | 'RECONSTRUCTED' | 'UNKNOWN';

/** How a movement route is known. UNKNOWN routes are never drawn. */
export type RouteConfidence = 'SOLID' | 'RECONSTRUCTED' | 'SCHEMATIC' | 'UNKNOWN';

/** How precisely an event's time is known. */
export type TimePrecision =
  | 'CANONICAL_RELATIVE'
  | 'DAY_LEVEL'
  | 'SEQUENTIAL'
  | 'RECONSTRUCTED';

export type BattleType =
  | 'MAJOR_BATTLE'
  | 'ENGAGEMENT'
  | 'SIEGE'
  | 'INTERCEPTION'
  | 'DEFENSIVE_ACTION'
  | 'RETREAT'
  | 'AMBUSH'
  | 'SPECIAL_COMBAT'
  | 'POLITICAL_EVENT';

export type FactionId = string;
export type TheatreId = string;
export type ForceId = string;
export type EventId = string;
export type BattleId = string;
export type CommanderId = string;
export type NationId = string;
export type PlaceId = string;
export type CharacterId = string;
export type TerritoryId = string;

export interface SourceRef {
  volume: string;
  chapter: string | null;
  locator: string | null;
}

/** Simulation coordinates. x,y in [0,1] against the base atlas. Not lat/lng. */
export interface SimPoint {
  x: number;
  y: number;
}

export interface CoordinateSystem {
  id: 'SIM_NORMALISED';
  description: string;
  atlasPixelWidth: number;
  atlasPixelHeight: number;
  lngSpanDeg: number;
  latExtentDeg: number;
  disclaimer: string;
}

export interface Manifest {
  schemaVersion: number;
  revision: string;
  source: Record<string, string>;
  clock: {
    frameCount: number;
    minutesPerFrame: number;
    framesPerHour: number;
    framesPerDay: number;
    checkpointInterval: number;
    firstDay: number;
    lastDay: number;
    calendarNote: string;
  };
  campaign: {
    startDate: string;
    endDate: string;
    firstContactFrame: number;
    battleDayMin: number;
    battleDayMax: number;
  };
  coordinateSystem: CoordinateSystem;
  counts: Record<string, number>;
}

/** Column-oriented, dictionary-encoded per-frame index for the scrubber. */
export interface DictColumn {
  dict: string[];
  idx: number[];
}

export interface TimelineIndex {
  frameCount: number;
  date: DictColumn;
  battleDay: number[];
  phase: DictColumn;
  stage: DictColumn;
  /** Frame indices that carry at least one event. */
  eventFrames: number[];
  /** Frame indices where battlefield state changed. */
  stateChangeFrames: number[];
}

export interface TheatreFrameState {
  status: string;
  frontline: string;
  battleStatus: string | null;
  control: string | null;
}

export interface SideCasualties {
  kia: Quantity;
  wia: Quantity;
  pow: Quantity;
  mia: Quantity;
  /** Killed and later restored to life, counted separately from kia. */
  revived: Quantity;
}

export interface SideStrength {
  total: Quantity;
  effective: Quantity;
}

/** Full battlefield state at one frame. */
export interface FrameState {
  frame: number;
  phase: string;
  stage: string;
  strength: { tempest: SideStrength; empire: SideStrength };
  casualties: { tempest: SideCasualties; empire: SideCasualties };
  theatres: Record<TheatreId, TheatreFrameState>;
  activeCommanders: string;
  majorCombatants: string;
  eventIds: EventId[];
}

export interface Nation {
  id: NationId;
  name: string;
  category: string;
  x: number | null;
  y: number | null;
  placement: PlacementGrade;
  flag: string | null;
  inDataset: boolean;
  territoryId: TerritoryId | null;
}

export interface Theatre {
  id: TheatreId;
  code: string;
  name: string;
  region: string;
  anchor: SimPoint | null;
  placement: PlacementGrade;
  /** Clipped schematic operational area, if the theatre has one on the map. */
  area: GeoMultiPolygon | null;
  bounds: [number, number, number, number] | null;
  firstEvent: EventId | null;
  lastEvent: EventId | null;
  firstFrame: number | null;
  lastFrame: number | null;
  eventCount: number;
  colorKey: string;
}

/** A capital, major city or the Labyrinth, with a RECONSTRUCTED outline. */
export interface Settlement {
  id: string;
  name: string;
  kind: 'capital' | 'city' | 'labyrinth';
  nationId: string;
  x: number;
  y: number;
  placement: string;
  /** Outline in simulation coordinates, closed ring. */
  ring: [number, number][];
  basis: string;
  source: string;
}

export interface Place {
  id: PlaceId;
  name: string;
  theatre: TheatreId | null;
  x: number | null;
  y: number | null;
  placement: PlacementGrade;
  altitude: 'GROUND' | 'AIR' | 'SUBSURFACE' | null;
  basis: string;
  territoryId: TerritoryId | null;
}

export interface Force {
  id: ForceId;
  faction: FactionId;
  army: string;
  formation: string;
  displayName: string;
  parentId: ForceId | null;
  childIds: ForceId[];
  depth: number;
  commander: string;
  commanderIds: CharacterId[];
  role: string;
  unitType: string;
  initialStrengthRaw: string;
  initialBest: Quantity;
  sizeStatus: SizeStatus;
  sizeEvidence: string;
  finalStrength: Quantity;
  finalStatus: string;
  source: string;
  sourceRefs: SourceRef[];
  confidence: Confidence;
  hierarchyProvenance: Provenance;
  notes: string;
  /** True when this force's strength is already counted inside its parent. */
  countedInParent: boolean;
  firstFrame: number;
  lastFrame: number;
}

/** One recorded force snapshot. Consecutive identical snapshots are collapsed. */
export interface ForceSnapshot {
  f: number;
  strength: Quantity;
  effective: Quantity;
  sizeStatus: SizeStatus;
  kia: Quantity;
  wia: Quantity;
  pow: Quantity;
  mia: Quantity;
  status: string;
  movement: string;
  direction: string;
  locationText: string;
  placeId: PlaceId | null;
  transitPct: number | null;
  eventId: EventId | null;
  confidence: Confidence;
}

export interface ForceTrack {
  forceId: ForceId;
  snapshots: ForceSnapshot[];
}

/** Position keyframe used by the movement interpolator. */
export interface PositionKey {
  f: number;
  x: number;
  y: number;
  placeId: PlaceId | null;
  placement: PlacementGrade;
  /** Confidence of the route that ARRIVES at this key. */
  route: RouteConfidence;
}

export interface ForcePositionTrack {
  forceId: ForceId;
  keys: PositionKey[];
  offMap: [number, number][];
}

export interface WarEvent {
  id: EventId;
  prevId: EventId | null;
  nextId: EventId | null;
  frame: number;
  battleDay: number;
  warDay: string;
  simulationTime: string;
  timePrecision: TimePrecision;
  canonicalTime: string;
  phase: string;
  theatreId: TheatreId;
  theatre: string;
  battleId: BattleId | null;
  battle: string | null;
  location: string;
  placeId: PlaceId | null;
  actor: string;
  actorFaction: FactionId;
  opponent: string;
  opponentFaction: FactionId;
  characterIds: CharacterId[];
  forceIds: ForceId[];
  type: string;
  title: string;
  immediateResult: string;
  operationalResult: string;
  strategicResult: string;
  tempestStrength: Quantity;
  empireStrength: Quantity;
  strengthNote: string;
  kia: Quantity;
  pow: Quantity;
  significance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | string;
  provenance: Provenance;
  confidence: Confidence;
  timeConfidence: Confidence;
  numericalConfidence: Confidence;
  sourceRefs: SourceRef[];
  evidence: string;
  reconstructionNote: string;
  notes: string;
  auditStatus: 'UNCHANGED' | 'CORRECTED' | 'ADDED' | 'PRE_AUDIT';
  auditChanges: string[];
  turningPoint: boolean;
  turningPointRank: number | null;
  turningPointSummary: string | null;
}

export interface Battle {
  id: BattleId;
  name: string;
  type: BattleType;
  theatreId: TheatreId;
  placeId: PlaceId | null;
  startFrame: number;
  endFrame: number;
  eventIds: EventId[];
  participants: { faction: FactionId; forces: ForceId[] }[];
  characterIds: CharacterId[];
  empireCommitted: Quantity;
  empireLost: Quantity;
  tempestLost: Quantity;
  result: string;
  significance: string;
  provenance: Provenance;
  confidence: Confidence;
}

export interface CasualtyRecord {
  id: string;
  eventId: EventId | null;
  frame: number | null;
  faction: FactionId;
  forceId: ForceId | null;
  formation: string;
  cause: string;
  kia: Quantity;
  wia: Quantity;
  pow: Quantity;
  mia: Quantity;
  revived: Quantity;
  scope: 'EVENT_CASUALTY' | 'COMPONENT_CASUALTY' | 'AGGREGATE_CASUALTY' | 'CAMPAIGN_TOTAL' | 'RESTORATION' | string;
  aggregateOf: string;
  basis: string;
  confidence: Confidence;
  sourceRefs: SourceRef[];
  evidence: string;
  notes: string;
  /** False for AGGREGATE / COMPONENT / CAMPAIGN rows, which would double count. */
  countsTowardCampaignTotal: boolean;
}

export interface Commander {
  id: CommanderId;
  name: string;
  characterId: CharacterId | null;
  faction: FactionId;
  role: string;
  scope: string;
  startEvent: EventId | null;
  endEvent: EventId | null;
  startFrame: number | null;
  endFrame: number | null;
  status: string;
  subordinates: string[];
  forceIds: ForceId[];
  eventIds: EventId[];
  theatreIds: TheatreId[];
  source: string;
  confidence: Confidence;
}

export interface Combatant {
  id: string;
  name: string;
  characterId: CharacterId | null;
  faction: FactionId;
  firstEvent: EventId | null;
  lastEvent: EventId | null;
  firstFrame: number | null;
  lastFrame: number | null;
  finalStatus: string;
  effect: string;
  sourceVolumes: string;
}

export interface Character {
  id: CharacterId;
  name: string;
  aliases: string[];
  japanese: string | null;
  faction: FactionId;
  role: string;
  photocard: { src: string; thumb: string; source: string; sourceUrl: string | null; licence: string | null } | null;
  commanderIds: CommanderId[];
  combatantIds: string[];
  forceIds: ForceId[];
  eventIds: EventId[];
  battleIds: BattleId[];
  theatreIds: TheatreId[];
  firstFrame: number | null;
  lastFrame: number | null;
}

export interface Movement {
  id: string;
  forceId: ForceId;
  from: string;
  to: string;
  fromPlaceId: PlaceId | null;
  toPlaceId: PlaceId | null;
  startEvent: EventId | null;
  endEvent: EventId | null;
  startFrame: number | null;
  endFrame: number | null;
  type: string;
  route: RouteConfidence;
  basis: string;
  confidence: Confidence;
  /** Strength at departure and at arrival, each only where recorded. */
  strengthAtStart: Quantity;
  strengthAtEnd: Quantity;
  notes: string;
  destinationUnknown: boolean;
  /** Share of the route covered by the end of the movement: 1, or less when the arrival falls after the clock. */
  reach: number;
  /** The arrival is not dated and falls after the end of the campaign clock. */
  arrivesAfterClock: boolean;
}

export interface TerritoryChange {
  id: string;
  name: string;
  theatreId: TheatreId;
  before: string;
  after: string;
  changeEventId: EventId | null;
  changeFrame: number | null;
  basis: string;
  source: string;
  confidence: Confidence;
  notes: string;
}

export type GeoMultiPolygon = { type: 'MultiPolygon'; coordinates: [number, number][][][] };

export type TerritoryRole = 'BELLIGERENT' | 'CO_BELLIGERENT' | 'CONTRIBUTOR' | 'UNINVOLVED' | 'ARMISTICE';
export type ControlStatus = 'CONTROLLED' | 'CONTESTED' | 'OCCUPIED' | 'UNKNOWN' | 'INACTIVE';

export interface TerritoryControlSegment {
  fromFrame: number;
  fromEvent: EventId | null;
  controller: FactionId | null;
  status: ControlStatus;
  role: TerritoryRole;
  provenance: Provenance;
  basis: string;
}

/** A political region traced from the drawn borders of the base map. */
export interface Territory {
  id: TerritoryId;
  name: string;
  display: string;
  nationId: NationId | null;
  /** The faction that holds the territory at the start of the campaign. */
  faction: FactionId | null;
  identification: 'LABELLED' | 'PARTIAL' | 'UNLABELLED';
  sourceGrade: 'MEASURED';
  /** Uncertainty of the region's identity (its border is always measured). */
  uncertainty: 'LOW' | 'MEDIUM' | 'HIGH';
  boundarySource: string;
  boundaryGrade: 'MEASURED';
  labelPoint: [number, number];
  bounds: [number, number, number, number];
  areaFraction: number;
  notes: string;
  geometry: GeoMultiPolygon;
  control: TerritoryControlSegment[];
}

/**
 * A stretch of the clock between two events that the record does not fill
 * minute by minute: how long it is, how the novel words it, and on what basis
 * its length was placed.
 */
export interface TimelineGap {
  id: string;
  fromEvent: EventId;
  toEvent: EventId;
  fromFrame: number;
  toFrame: number;
  hours: number;
  canonicalWording: string;
  timePrecision: TimePrecision;
  reconstructionBasis: string;
  confidence: Confidence;
  sourceRefs: SourceRef[];
}

export interface Faction {
  id: FactionId;
  name: string;
  colorKey: 'empire' | 'tempest' | 'dwargon' | 'neutral' | 'unknown';
  nationId: NationId | null;
  forceIds: ForceId[];
  isMajorCombatant: boolean;
}

export interface CampaignStage {
  id: string;
  name: string;
  startFrame: number;
  endFrame: number;
  definition: string;
  anchorEvents: EventId[];
  source: string;
}

export interface Contradiction {
  id: string;
  description: string;
  claimA: string;
  claimB: string;
  sourceA: string;
  sourceB: string;
  resolution: string;
  treatment: string;
  confidence: Confidence;
}

export interface Ambiguity {
  id: string;
  subject: string;
  ambiguity: string;
  chosenPlacement: string;
  confidence: Confidence;
}

export interface CampaignTotals {
  empireKilled: Quantity;
  empireRevived: Quantity;
  empirePermanentDead: Quantity;
  empireCaptured: Quantity;
  tempestKilled: Quantity;
  wiaBothSides: Quantity;
  miaBothSides: Quantity;
  excludedRows: string[];
  note: string;
}

export interface NationFlagEntry {
  name: string;
  category: string;
  asset: string;
  /** 96 x 64 WebP for interface use (scripts/flags/build_flag_thumbs.py); the PNG is the fallback. */
  thumb: string | null;
}

export type NationFlagManifest = Record<NationId, NationFlagEntry>;

export interface TermEntry {
  id: string;
  kind: string;
  canonical: string;
  display: string;
  japanese: string | null;
  aliases: string[];
}
