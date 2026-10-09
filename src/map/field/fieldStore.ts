import type { FieldResult } from '@/map/field/occupation';

/**
 * The latest synthesised occupation field, shared by the MapLibre layer (fill)
 * and the overlay canvas (front seams) without going through React.
 */
let current: FieldResult | null = null;
const listeners = new Set<() => void>();

const shareListeners = new Set<() => void>();
let shareKey = '';
let shareTimer: ReturnType<typeof setTimeout> | null = null;
let lastShareAt = 0;

/** Rounded to half a percent: what the panels can show. */
function keyOf(field: FieldResult | null): string {
  if (!field) return '';
  return Object.entries(field.occupiedShare).map(([k, v]) => `${k}:${Math.round(v * 200)}`).sort().join(',');
}

function flushShare() {
  shareTimer = null;
  const key = keyOf(current);
  if (key === shareKey) return;
  shareKey = key;
  lastShareAt = Date.now();
  for (const l of shareListeners) l();
}

export function setField(field: FieldResult | null): void {
  current = field;
  for (const l of listeners) l();
  // Panels that show held shares re-render at most 5 times a second, and only when a share moves.
  if (!shareTimer) shareTimer = setTimeout(flushShare, Math.max(0, 200 - (Date.now() - lastShareAt)));
}

/** Notified when a territory's held share changes visibly (throttled). */
export function onShare(listener: () => void): () => void {
  shareListeners.add(listener);
  return () => shareListeners.delete(listener);
}

export function getField(): FieldResult | null {
  return current;
}

export function onField(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
