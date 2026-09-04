/**
 * Runtime dataset contract.
 *
 * These types describe the OUTPUT of scripts/compile-data.ts, i.e. the static
 * JSON the browser consumes. They deliberately do not describe the workbook:
 * the workbook shape lives only inside the compiler.
 */

/** A value the corpus does not establish. Never coerced to zero. */
export const UNKNOWN = 'UNKNOWN' as const;
export type Unknown = typeof UNKNOWN;

/** A number, or an explicit statement that no number exists. */
export type Quantity = number | Unknown;

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | Unknown;

/**
 * Where a piece of information comes from. Drives the source badge in the UI.
 * CANONICAL      - stated by the corpus
 * RECONSTRUCTED  - derived by Step 1 from canonical statements
 * SIMULATION     - a placement Step 1 made so the campaign can be rendered
 * UNKNOWN        - not established
 */
export type SourceGrade = 'CANONICAL' | 'RECONSTRUCTED' | 'SIMULATION' | Unknown;

/** How a coordinate was arrived at. See data-source/gazetteer.source.json. */
export type PlacementGrade = 'MEASURED' | 'RECONSTRUCTED' | 'SCHEMATIC' | 'ABSTRACT';

export type FactionId = string;
export type TheatreId = string;
export type ForceId = string;
export type EventId = string;
export type BattleId = string;
export type CommanderId = string;
export type NationId = string;
export type PlaceId = string;

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
  /** Longitude span of the synthetic projection used to place the atlas on a globe. */
  lngSpanDeg: number;
  /** Latitude reached by the top and bottom edges of the atlas. */
  latExtentDeg: number;
  disclaimer: string;
}

export interface Manifest {
  schemaVersion: number;
  generatedAt: string;
  source: {
    workbook: string;
    workbookSha256: string;
    markdown: string;
    markdownSha256: string;
    gazetteer: string;
  };
  clock: {
    frameCount: number;
    minutesPerFrame: number;
    framesPerHour: number;
    framesPerDay: number;
    checkpointInterval: number;
    calendarNote: string;
  };
  campaign: {
    startDate: string;
    endDate: string;
    firstContactFrame: number;
    campaignDayMin: number;
    campaignDayMax: number;
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
  campaignDay: number[];
  battleDay: number[];
  phase: DictColumn;
  stage: DictColumn;
  /** -1 where the sheet gives no approach percentage. */
  approachPct: number[];
  confidence: DictColumn;
  /** Frame indices that carry a new event. */
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

/** Full battlefield state at one frame. */
export interface FrameState {
  frame: number;
  phase: string;
  stage: string;
  columnLocation: string;
  approachPct: number | null;
  tempestTotal: Quantity;
  tempestEffective: Quantity;
  empireTotal: Quantity;
  empireEffective: Quantity;
  tempestMovement: { advancing: string; retreating: string };
  empireMovement: { advancing: string; retreating: string };
  casualties: {
    tempest: { kia: Quantity; wia: Quantity; pow: Quantity; mia: Quantity };
    empire: { kia: Quantity; wia: Quantity; pow: Quantity; mia: Quantity };
  };
  theatres: Record<TheatreId, TheatreFrameState>;
  activeTheatres: string;
  activeFronts: string;
  activeBattles: string;
  activeCommanders: string;
  majorCombatants: string;
  majorEvents: string;
  eventIds: EventId[];
  frameStatus: string;
  eventStatus: string;
  stateStatus: string;
  informationStatus: string;
  confidence: Confidence;
  sourceReferences: string;
  evidence: string;
  notes: string | null;
}

/** Sparse encoding: a checkpoint every `interval` frames, deltas in between. */
export interface StateStream {
  interval: number;
  frameCount: number;
  checkpointFrames: number[];
  checkpoints: Record<string, FrameState>;
  /** Sorted ascending. Frames carrying at least one changed field. */
  deltaFrames: number[];
  /** Keyed by frame index; each value is a partial FrameState. */
  deltas: Record<string, Partial<FrameState>>;
}

export interface Nation {
  id: NationId;
  name: string;
  category: string;
  x: number | null;
  y: number | null;
  placement: PlacementGrade;
  flag: string | null;
  /** Whether the Step 1 dataset actually references this nation. */
  inDataset: boolean;
  role: string | null;
}

export interface Theatre {
  id: TheatreId;
  name: string;
  region: string;
  anchor: SimPoint | null;
  placement: PlacementGrade;
  zone: [number, number][] | null;
  firstEvent: EventId | null;
  lastEvent: EventId | null;
  eventCount: number;
  colorKey: string;
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
}

export interface Force {
  id: ForceId;
  faction: FactionId;
  army: string;
  formation: string;
  parentId: ForceId | null;
  childIds: ForceId[];
  depth: number;
  commander: string;
  role: string;
  initialStrengthRaw: string;
  initialMin: Quantity;
  initialMax: Quantity;
  initialBest: Quantity;
  finalStrength: Quantity;
  kia: Quantity;
  wia: Quantity;
  pow: Quantity;
  mia: Quantity;
  finalLocation: string;
  finalMovementStatus: string;
  finalStatus: string;
  strengthBasis: string;
  source: string;
  confidence: Confidence;
  notes: string;
  /**
   * True when this force's strength is already counted inside its parent.
   * Aggregation must never sum a force with its ancestors.
   */
  countedInParent: boolean;
  firstFrame: number;
  lastFrame: number;
}

/** One recorded force snapshot. Consecutive identical snapshots are collapsed. */
export interface ForceSnapshot {
  f: number;
  strength: Quantity;
  effective: Quantity;
  kia: Quantity;
  wia: Quantity;
  pow: Quantity;
  mia: Quantity;
  status: string;
  movement: string;
  direction: string;
  locationRaw: string;
  placeId: PlaceId | null;
  /** Present only for parametric transit positions along the approach axis. */
  transitPct: number | null;
  info: string;
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
}

export interface ForcePositionTrack {
  forceId: ForceId;
  keys: PositionKey[];
  /** Frames in which the force has no defensible position and is not drawn. */
  offMap: [number, number][];
}

export interface WarEvent {
  id: EventId;
  prevId: EventId | null;
  nextId: EventId | null;
  frame: number;
  warDay: string;
  simulationTime: string;
  canonicalTime: string;
  phase: string;
  theatreId: TheatreId;
  theatre: string;
  front: string;
  battleId: BattleId | null;
  battle: string | null;
  location: string;
  placeId: PlaceId | null;
  actor: string;
  actorFaction: FactionId;
  opponent: string;
  opponentFaction: FactionId;
  type: string;
  action: string;
  immediateResult: string;
  operationalResult: string;
  strategicResult: string;
  tempestStrength: Quantity;
  empireStrength: Quantity;
  kia: Quantity;
  pow: Quantity;
  commandStatus: string;
  intensity: string;
  significance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | string;
  timeBasis: string;
  timeConfidence: Confidence;
  numericalConfidence: Confidence;
  confidence: Confidence;
  sourceVolume: string;
  sourceChapter: string;
  evidence: string;
  notes: string;
  /** True for the fifteen turning points named by the Step 1 markdown. */
  turningPoint: boolean;
  turningPointRank: number | null;
  turningPointSummary: string | null;
}

export interface Battle {
  id: BattleId;
  name: string;
  theatreId: TheatreId;
  placeId: PlaceId | null;
  startFrame: number;
  endFrame: number;
  eventIds: EventId[];
  phases: string[];
  participants: { faction: FactionId; forces: ForceId[] }[];
  empireCommitted: Quantity;
  empireLost: Quantity;
  tempestLost: Quantity;
  result: string;
  significance: string;
  confidence: Confidence;
}

export interface CasualtyRecord {
  id: string;
  eventId: EventId | null;
  frame: number | null;
  faction: FactionId;
  forceId: ForceId | null;
  formation: string;
  location: string;
  battle: string;
  cause: string;
  kia: Quantity;
  wia: Quantity;
  pow: Quantity;
  mia: Quantity;
  other: Quantity;
  total: Quantity;
  scope: 'EVENT_CASUALTY' | 'COMPONENT_CASUALTY' | 'AGGREGATE_CASUALTY' | 'CAMPAIGN_TOTAL' | string;
  aggregateOf: string;
  basis: string;
  derivation: string;
  confidence: Confidence;
  source: string;
  evidence: string;
  notes: string;
  /** False for AGGREGATE / COMPONENT / CAMPAIGN rows, which would double count. */
  countsTowardCampaignTotal: boolean;
}

export interface Commander {
  id: CommanderId;
  name: string;
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
  faction: FactionId;
  firstEvent: EventId | null;
  lastEvent: EventId | null;
  firstFrame: number | null;
  lastFrame: number | null;
  finalStatus: string;
  effect: string;
  sourceVolumes: string;
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
  basis: string;
  confidence: Confidence;
  notes: string;
  /** True when the corpus does not establish a destination (MOV-015). */
  destinationUnknown: boolean;
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
  startWarDay: string;
  endWarDay: string;
  startDate: string;
  endDate: string;
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
  events: string;
  ambiguity: string;
  possibleOrder: string;
  chosenPlacement: string;
  confidence: Confidence;
}

export interface CampaignTotals {
  empireKiaCampaign: Quantity;
  empireKiaJuraFront: Quantity;
  tempestKiaConfirmed: Quantity;
  tempestKiaUnstated: string;
  empirePowSurfacePhase: Quantity;
  empirePowLaterPhases: Quantity;
  wiaBothSides: Quantity;
  miaBothSides: Quantity;
  empireUnaccountedFor: Quantity;
  excludedRows: string[];
  note: string;
}

export interface NationFlagEntry {
  name: string;
  category: string;
  asset: string;
}

export type NationFlagManifest = Record<NationId, NationFlagEntry>;
