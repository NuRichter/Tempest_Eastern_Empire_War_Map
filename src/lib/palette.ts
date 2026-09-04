/**
 * Palette. Restrained, cartographic, desaturated (brief §42).
 *
 * Canvas cannot read Tailwind classes, so the pigments live here as plain
 * strings and Tailwind mirrors them in tailwind.config.ts. One source of truth
 * per medium, deliberately kept in step.
 */

export type ColorKey = 'empire' | 'tempest' | 'dwargon' | 'neutral' | 'unknown';

export const FACTION_COLOR: Record<ColorKey, string> = {
  empire: '#8c3a31',
  tempest: '#3f6b5a',
  dwargon: '#4b5f73',
  neutral: '#8a7844',
  unknown: '#6b6b63',
};

export const FACTION_COLOR_PALE: Record<ColorKey, string> = {
  empire: '#b4685c',
  tempest: '#6d9b87',
  dwargon: '#7d95aa',
  neutral: '#b3a06a',
  unknown: '#94948a',
};

export const FACTION_COLOR_DEEP: Record<ColorKey, string> = {
  empire: '#5e2721',
  tempest: '#2a4a3d',
  dwargon: '#33424f',
  neutral: '#5e5230',
  unknown: '#48483f',
};

/** Territorial control shading. Muted enough to keep the atlas legible beneath. */
export const CONTROL_COLOR: Record<string, string> = {
  EMPIRE_CONTROLLED: '#8c3a31',
  TEMPEST_CONTROLLED: '#3f6b5a',
  DWARGON_CONTROLLED: '#4b5f73',
  CONTESTED: '#8a7844',
  NEUTRAL: '#6b6b63',
  DESTROYED: '#4a4038',
  UNKNOWN: '#6b6b63',
};

export const INK = {
  base: '#0a0d0e',
  panel: 'rgba(16, 21, 23, 0.88)',
  panelSolid: '#14191b',
  rule: 'rgba(160, 138, 82, 0.28)',
  ruleStrong: 'rgba(160, 138, 82, 0.55)',
  text: '#cdc4b0',
  textDim: '#8d8676',
  textFaint: '#6a655a',
  brass: '#a08a52',
  alert: '#b4685c',
};

/** Movement categories get distinct line treatments, not distinct hues. */
export const MOVEMENT_STYLE: Record<string, { dash: number[]; width: number; head: 'arrow' | 'bar' | 'none' }> = {
  ADVANCE: { dash: [], width: 2, head: 'arrow' },
  BREAKTHROUGH: { dash: [], width: 3, head: 'arrow' },
  DEPLOYMENT: { dash: [7, 5], width: 2, head: 'arrow' },
  REINFORCEMENT: { dash: [2, 4], width: 2, head: 'arrow' },
  ENCIRCLEMENT: { dash: [10, 4, 2, 4], width: 2, head: 'arrow' },
  RETREAT: { dash: [5, 4], width: 2, head: 'bar' },
  WITHDRAWAL: { dash: [5, 4], width: 2, head: 'bar' },
  IN_TRANSIT: { dash: [3, 6], width: 1.5, head: 'none' },
  REPOSITION: { dash: [3, 6], width: 1.5, head: 'arrow' },
};

export function movementStyle(type: string) {
  return MOVEMENT_STYLE[type] ?? { dash: [4, 4], width: 1.5, head: 'arrow' as const };
}

/** Control state -> pigment, with a safe fallback that reads as unknown. */
export function controlColor(state: string | null | undefined): string {
  if (!state) return CONTROL_COLOR.UNKNOWN;
  const key = state.toUpperCase().replace(/\s*\(.*\)\s*$/, '').trim();
  return CONTROL_COLOR[key] ?? CONTROL_COLOR.UNKNOWN;
}

/** Uncertainty is drawn, not hidden. */
export const CONFIDENCE_ALPHA: Record<string, number> = {
  HIGH: 1,
  MEDIUM: 0.82,
  LOW: 0.62,
  UNKNOWN: 0.5,
};
