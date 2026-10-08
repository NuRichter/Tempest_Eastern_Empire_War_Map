import { msg } from '@/i18n/msg';
import type { BattleType, Provenance, RouteConfidence, SizeStatus } from '@/types/dataset';

/**
 * Shared vocabulary. Every label the interface shows for a dataset category is
 * defined here once, so the legend, filters, dossiers and map all use the same
 * words as the dataset.
 */

export type EventCategory = 'COMBAT' | 'MOVEMENT' | 'COMMAND' | 'INTELLIGENCE' | 'POLITICAL';

export const EVENT_CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: 'COMBAT', label: msg('Combat') },
  { id: 'MOVEMENT', label: msg('Movement & deployment') },
  { id: 'COMMAND', label: msg('Command & preparation') },
  { id: 'INTELLIGENCE', label: msg('Intelligence') },
  { id: 'POLITICAL', label: msg('Political & aftermath') },
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
  CANONICAL: { short: msg('Canon'), long: msg('Canonical'), note: msg('Explicitly supported by the light novel.') },
  CANONICAL_WITH_VISUAL_RECONSTRUCTION: {
    short: msg('Canon · visual recon.'),
    long: msg('Canonical, visually reconstructed'),
    note: msg('The event is canonical. Its exact position, path or timing on this map is reconstructed.'),
  },
  INFERRED: { short: msg('Inferred'), long: msg('Inferred'), note: msg('Follows from several source clues but is not stated.') },
  RECONSTRUCTED: { short: msg('Reconstructed'), long: msg('Reconstructed'), note: msg('A plausible bridging sequence made by this project between known points.') },
  UNRESOLVED: { short: msg('Unresolved'), long: msg('Unresolved'), note: msg('The evidence is insufficient. Shown so the gap stays visible.') },
};

export const SIZE_STATUS_LABEL: Record<SizeStatus, { mark: string; label: string; note: string }> = {
  EXPLICIT: { mark: '', label: msg('Explicit'), note: msg('The number is stated by the source.') },
  DERIVED: { mark: '≈', label: msg('Derived'), note: msg('Arithmetic from stated numbers.') },
  RECONSTRUCTED: { mark: '~', label: msg('Reconstructed'), note: msg('A project estimate between stated numbers.') },
  UNKNOWN: { mark: '?', label: msg('Unknown'), note: msg('No number is established. Never shown as zero.') },
};

export const ROUTE_LABEL: Record<RouteConfidence, { label: string; note: string }> = {
  SOLID: { label: msg('Solid'), note: msg('Origin, destination and route are stated.') },
  RECONSTRUCTED: { label: msg('Reconstructed route'), note: msg('Endpoints are canonical. The line between them is drawn by the project.') },
  SCHEMATIC: { label: msg('Schematic'), note: msg('Only the direction of the movement is known.') },
  UNKNOWN: { label: msg('Unknown route'), note: msg('Not drawn: the source does not establish where the force went.') },
};

export const BATTLE_TYPE_LABEL: Record<BattleType, string> = {
  MAJOR_BATTLE: msg('Major battle'),
  ENGAGEMENT: msg('Engagement'),
  SIEGE: msg('Siege'),
  INTERCEPTION: msg('Interception'),
  DEFENSIVE_ACTION: msg('Defensive action'),
  RETREAT: msg('Retreat'),
  AMBUSH: msg('Ambush'),
  SPECIAL_COMBAT: msg('Special combat'),
  POLITICAL_EVENT: msg('Political event'),
};

export const TIME_PRECISION_LABEL: Record<string, string> = {
  CANONICAL_RELATIVE: msg('Relative time stated by the source'),
  DAY_LEVEL: msg('Day stated. Hour reconstructed'),
  SEQUENTIAL: msg('Order stated. Time reconstructed'),
  RECONSTRUCTED: msg('Time reconstructed'),
};

export const ROLE_LABEL: Record<string, string> = {
  BELLIGERENT: msg('Belligerent'),
  CO_BELLIGERENT: msg('Co-belligerent'),
  CONTRIBUTOR: msg('Contributor'),
  UNINVOLVED: msg('Not involved'),
  ARMISTICE: msg('Hostilities ended'),
};
