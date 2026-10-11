import type { Force } from '@/types/dataset';

/**
 * Whether a drawn subordinate stands in for its parent on the map. A parent
 * and its subordinates are the same soldiers, so normally only the most
 * specific is drawn. A formation with a recorded split is replaced only by the
 * formations split from it: a small party sent ahead of a column does not make
 * the column disappear.
 */
export function replacesParent(child: Force, parent: Force, forces: readonly Force[]): boolean {
  if (child.origin?.kind === 'SPLIT' && child.origin.fromForceId === parent.id) return true;
  return !forces.some((f) => f.origin?.kind === 'SPLIT' && f.origin.fromForceId === parent.id);
}
