import type { FieldResult } from '@/map/field/occupation';

/**
 * The latest synthesised occupation field, shared by the MapLibre layer (fill)
 * and the overlay canvas (front seams) without going through React.
 */
let current: FieldResult | null = null;
const listeners = new Set<() => void>();

export function setField(field: FieldResult | null): void {
  current = field;
  for (const l of listeners) l();
}

export function getField(): FieldResult | null {
  return current;
}

export function onField(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
