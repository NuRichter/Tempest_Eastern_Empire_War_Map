/**
 * Shapes of the hand-maintained campaign source (data-source/campaign/*.json).
 * Only the compiler reads these; the browser sees src/types/dataset.ts.
 */
import type { Confidence, Provenance, Quantity, RouteConfidence, SizeStatus, TimePrecision, BattleType } from '../../src/types/dataset';

export interface SourceRefSrc {
  volume: string;
  chapter: string | null;
  locator: string | null;
}

export interface ForceEffect {
  strength?: Quantity;
  effective?: Quantity;
  sizeStatus?: SizeStatus;
  kia?: Quantity;
  wia?: Quantity;
  pow?: Quantity;
  mia?: Quantity;
  status?: string;
  movement?: string;
  direction?: string;
  confidence?: Confidence;
  /** Gazetteer place id; null means the force has no defensible position. */
  location?: string | null;
  locationText?: string;
}

export interface TheatreEffect {
  status?: string;
  frontline?: string;
  battleStatus?: string | null;
  control?: string | null;
}

export interface CampaignEffect {
  phase?: string;
  stage?: string;
  tempestTotal?: Quantity;
  tempestEffective?: Quantity;
  empireTotal?: Quantity;
  empireEffective?: Quantity;
  activeCommanders?: string;
  majorCombatants?: string;
}

export interface EventSrc {
  id: string;
  day: number;
  time: string;
  timeBasis?: string;
  timePrecision?: TimePrecision;
  canonicalTime: string;
  theatreId: string;
  front?: string;
  battle: string | null;
  battleType?: BattleType | null;
  location: string | null;
  locationText: string;
  actor: string;
  actorFaction: string;
  opponent: string;
  opponentFaction: string;
  characters?: string[];
  forces?: string[];
  type: string;
  title: string;
  immediateResult: string;
  operationalResult: string;
  strategicResult: string;
  strength: { tempest: Quantity; empire: Quantity; note?: string };
  kia?: Quantity;
  pow?: Quantity;
  commandStatus?: string;
  intensity?: string;
  significance: string;
  turningPoint: { rank: number; summary: string } | null;
  provenance: Provenance | null;
  confidence: { time: Confidence; numbers: Confidence; overall: Confidence };
  sources: SourceRefSrc[];
  evidence: string;
  reconstructionNote?: string;
  notes: string;
  audit: { status: 'UNCHANGED' | 'CORRECTED' | 'ADDED' | 'PRE_AUDIT'; changes: string[] };
  effects: { forces: Record<string, ForceEffect>; theatres: Record<string, TheatreEffect>; campaign: CampaignEffect };
}

export interface ForceSrc {
  id: string;
  faction: string;
  army: string;
  formation: string;
  displayName?: string;
  parentId: string | null;
  commander: string;
  commanderIds?: string[];
  role: string;
  unitType?: string;
  initialStrengthRaw: string;
  initialBest: Quantity;
  sizeStatus?: SizeStatus;
  sizeEvidence?: string;
  finalStrength: Quantity;
  finalStatus: string;
  strengthBasis?: string;
  source: string;
  sourceRefs?: SourceRefSrc[];
  confidence: Confidence;
  hierarchyProvenance?: Provenance;
  notes: string;
}

export interface TransitKeySrc {
  forceId: string;
  day: number;
  time: string;
  pct: number;
}

export interface MovementSrc {
  id: string;
  forceId: string;
  from: string;
  to: string;
  fromPlace: string | null;
  toPlace: string | null;
  startEvent: string | null;
  endEvent: string | null;
  type: string;
  route?: RouteConfidence;
  basis: string;
  confidence: Confidence;
  notes: string;
  destinationUnknown: boolean;
  /**
   * 'AFTER_CLOCK': the movement departs inside the clock but its arrival is not
   * dated and falls after the clock ends. It is drawn only as far as `pace`
   * carries it, never as arriving.
   */
  arrival?: 'AFTER_CLOCK';
  /** A recorded march whose average speed this movement is drawn at. */
  pace?: { fromPlace: string; toPlace: string; startEvent: string; endEvent: string };
}

export interface CasualtySrc {
  id: string;
  eventId: string | null;
  faction: string;
  forceId: string | null;
  formation: string;
  cause: string;
  kia: Quantity;
  wia: Quantity;
  pow: Quantity;
  mia: Quantity;
  revived?: Quantity;
  scope: string;
  aggregateOf: string;
  basis: string;
  confidence: Confidence;
  sourceRefs?: SourceRefSrc[];
  source?: string;
  evidence: string;
  notes: string;
}

export interface BattleSrc {
  name: string;
  type: BattleType;
  result?: string;
  provenance?: Provenance;
}

export interface StageSrc {
  id: string;
  name: string;
  startEvent?: string;
  endEvent?: string;
  startWarDay?: string;
  endWarDay?: string;
  definition: string;
  anchorEvents: string[];
  source: string;
}

export interface RevisionSrc {
  revision: string;
  clock: { minutesPerFrame: number; framesPerDay: number; firstDay: number; lastDay: number; calendarStart: string };
  note: string;
  /** State before the first event: everything the campaign starts with. */
  /** Campaign phase and stage boundaries, placed on the clock like events. */
  phaseMarks: { day: number; time: string; phase?: string; stage?: string }[];
  initial: { theatres: Record<string, TheatreEffect>; campaign: CampaignEffect };
}
