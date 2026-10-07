import type { BattleType, Provenance, RouteConfidence, SizeStatus } from '@/types/dataset';

/**
 * Shared vocabulary. Every label the interface shows for a dataset category is
 * defined here once, so the legend, filters, dossiers and map all use the same
 * words as the dataset.
 */

export type EventCategory = 'COMBAT' | 'MOVEMENT' | 'COMMAND' | 'INTELLIGENCE' | 'POLITICAL';

export const EVENT_CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: 'COMBAT', label: 'Combat' },
  { id: 'MOVEMENT', label: 'Movement & deployment' },
  { id: 'COMMAND', label: 'Command & preparation' },
  { id: 'INTELLIGENCE', label: 'Intelligence' },
  { id: 'POLITICAL', label: 'Political & aftermath' },
];

const CATEGORY_OF: Record<string, EventCategory> = {
  ENGAGEMENT: 'COMBAT', ATTACK: 'COMBAT', DEFENSE: 'COMBAT', AIRBORNE: 'COMBAT', SPECIAL_ABILITY: 'COMBAT',
  UNIT_DESTRUCTION: 'COMBAT', ENCIRCLEMENT: 'COMBAT', RETREAT: 'COMBAT', SIEGE: 'COMBAT', INTERCEPTION: 'COMBAT',
  ASSASSINATION: 'COMBAT', CASUALTY_EVENT: 'COMBAT', AMBUSH: 'COMBAT', DUEL: 'COMBAT', BATTLE: 'COMBAT',
  MOVEMENT: 'MOVEMENT', DEPLOYMENT: 'MOVEMENT', REINFORCEMENT: 'MOVEMENT', EVACUATION: 'MOVEMENT', WITHDRAWAL: 'MOVEMENT',
  COMMAND: 'COMMAND', COMMAND_CHANGE: 'COMMAND', STRATEGIC_PREPARATION: 'COMMAND', MOBILIZATION: 'COMMAND', FORTIFICATION: 'COMMAND',
  INTELLIGENCE: 'INTELLIGENCE', RECONNAISSANCE: 'INTELLIGENCE',
  POLITICAL: 'POLITICAL', NEGOTIATION: 'POLITICAL', AFTERMATH: 'POLITICAL', CAPTURE: 'POLITICAL', RESURRECTION: 'POLITICAL',
};

export function eventCategory(type: string): EventCategory {
  return CATEGORY_OF[type] ?? 'COMMAND';
}

export const PROVENANCE_LABEL: Record<Provenance, { short: string; long: string; note: string }> = {
  CANONICAL: { short: 'Canon', long: 'Canonical', note: 'Explicitly supported by the light novel.' },
  CANONICAL_WITH_VISUAL_RECONSTRUCTION: {
    short: 'Canon · visual recon.',
    long: 'Canonical, visually reconstructed',
    note: 'The event is canonical; its exact position, path or timing on this map is reconstructed.',
  },
  INFERRED: { short: 'Inferred', long: 'Inferred', note: 'Follows from several source clues but is not stated.' },
  RECONSTRUCTED: { short: 'Reconstructed', long: 'Reconstructed', note: 'A plausible bridging sequence made by this project between known points.' },
  UNRESOLVED: { short: 'Unresolved', long: 'Unresolved', note: 'The evidence is insufficient. Shown so the gap stays visible.' },
};

export const SIZE_STATUS_LABEL: Record<SizeStatus, { mark: string; label: string; note: string }> = {
  EXPLICIT: { mark: '', label: 'Explicit', note: 'The number is stated by the source.' },
  DERIVED: { mark: '≈', label: 'Derived', note: 'Arithmetic from stated numbers.' },
  RECONSTRUCTED: { mark: '~', label: 'Reconstructed', note: 'A project estimate between stated numbers.' },
  UNKNOWN: { mark: '?', label: 'Unknown', note: 'No number is established. Never shown as zero.' },
};

export const ROUTE_LABEL: Record<RouteConfidence, { label: string; note: string }> = {
  SOLID: { label: 'Solid', note: 'Origin, destination and route are stated.' },
  RECONSTRUCTED: { label: 'Reconstructed route', note: 'Endpoints are canonical; the line between them is drawn by the project.' },
  SCHEMATIC: { label: 'Schematic', note: 'Only the direction of the movement is known.' },
  UNKNOWN: { label: 'Unknown route', note: 'Not drawn: the source does not establish where the force went.' },
};

export const BATTLE_TYPE_LABEL: Record<BattleType, string> = {
  MAJOR_BATTLE: 'Major battle',
  ENGAGEMENT: 'Engagement',
  SIEGE: 'Siege',
  INTERCEPTION: 'Interception',
  DEFENSIVE_ACTION: 'Defensive action',
  RETREAT: 'Retreat',
  AMBUSH: 'Ambush',
  SPECIAL_COMBAT: 'Special combat',
  POLITICAL_EVENT: 'Political event',
};

export const TIME_PRECISION_LABEL: Record<string, string> = {
  CANONICAL_RELATIVE: 'Relative time stated by the source',
  DAY_LEVEL: 'Day stated; hour reconstructed',
  SEQUENTIAL: 'Order stated; time reconstructed',
  RECONSTRUCTED: 'Time reconstructed',
};

export const ROLE_LABEL: Record<string, string> = {
  BELLIGERENT: 'Belligerent',
  CO_BELLIGERENT: 'Co-belligerent',
  CONTRIBUTOR: 'Contributor',
  UNINVOLVED: 'Not involved',
  ARMISTICE: 'Hostilities ended',
};
