/**
 * Unit classes: one vocabulary for what kind of formation a force is, read
 * from its recorded unit type. The renderer picks a symbol from it, the route
 * compiler picks a travel mode and a march rate. A force whose composition is
 * not recorded gets the neutral 'formation' class, never an invented one.
 */
import type { Force } from '@/types/dataset';

export type UnitClass =
  | 'command'
  | 'infantry'
  | 'armor'
  | 'air'
  | 'cavalry'
  | 'elite'
  | 'mage'
  | 'undead'
  | 'construct'
  | 'reserve'
  | 'formation';

/** Speed classes in data-source/world.source.json (speeds.units). */
export type SpeedClass = 'infantry' | 'armor' | 'air' | 'mixed' | 'elite' | 'dragon';

export function unitClass(force: Pick<Force, 'unitType' | 'role' | 'id'> & { ledgerRole?: string | null }): UnitClass {
  const t = `${force.unitType} `.toLowerCase();
  if (force.ledgerRole === 'RESERVE') return 'reserve';
  if (/strength ceiling|^command/.test(t)) return 'command';
  if (/combined arms|^mixed/.test(t)) return 'formation';
  if (/\bair\b|airship|flying|fleet|pegasus|dragon rider|dragonewt|air cavalry|air assault|air transport/.test(t)) return 'air';
  if (/armou?r|magitank|chariot/.test(t)) return 'armor';
  if (/cavalry|wolf|monster/.test(t)) return 'cavalry';
  if (/undead/.test(t)) return 'undead';
  if (/construct|colossus/.test(t)) return 'construct';
  if (/mage|magic support/.test(t)) return 'mage';
  if (/special combatant|elite|primordial|true dragon|demons?\b/.test(t)) return 'elite';
  if (/infantry|garrison|engineer|beastmen|volunteer/.test(t)) return 'infantry';
  return 'formation';
}

export function speedClass(c: UnitClass, force?: Pick<Force, 'unitType'>, movementType?: string): SpeedClass {
  if (movementType && /AIRLIFT/.test(movementType)) return 'air';
  if (force && /true dragon|primordial/i.test(force.unitType)) return 'dragon';
  switch (c) {
    case 'air':
      return 'air';
    case 'armor':
      return 'armor';
    case 'cavalry':
    case 'elite':
    case 'mage':
    case 'construct':
      return 'elite';
    case 'infantry':
    case 'undead':
      return 'infantry';
    default:
      return 'mixed';
  }
}
