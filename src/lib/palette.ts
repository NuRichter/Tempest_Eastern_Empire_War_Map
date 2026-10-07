/**
 * Palette — the single source of colour for canvas and MapLibre.
 *
 * Tailwind mirrors these values in tailwind.config.ts (see DESIGN.md). Faction
 * colours are chosen to stay distinguishable on the dark base map and are never
 * the only signal: every faction also has a marker shape and a label.
 */

import type { Provenance, RouteConfidence } from '@/types/dataset';

export type ColorKey = 'empire' | 'tempest' | 'dwargon' | 'neutral' | 'unknown';

export const FACTION_COLOR: Record<ColorKey, string> = {
  empire: '#c9473d',
  tempest: '#2f9e7e',
  dwargon: '#5b8fd8',
  neutral: '#c29a45',
  unknown: '#878f93',
};

export const FACTION_DEEP: Record<ColorKey, string> = {
  empire: '#5c1914',
  tempest: '#0f4636',
  dwargon: '#1c365e',
  neutral: '#57421a',
  unknown: '#363c40',
};

export const FACTION_PALE: Record<ColorKey, string> = {
  empire: '#ee9086',
  tempest: '#86d8bd',
  dwargon: '#a9c8f2',
  neutral: '#e6cc91',
  unknown: '#c3c9cc',
};

/** Marker shape per faction, so identity never rests on colour alone. */
export const FACTION_SHAPE: Record<ColorKey, 'square' | 'circle' | 'diamond' | 'triangle' | 'hex'> = {
  empire: 'square',
  tempest: 'circle',
  dwargon: 'diamond',
  neutral: 'triangle',
  unknown: 'hex',
};

export const INK = {
  bg: '#090d10',
  surface: '#0f1519',
  surface2: '#151d22',
  surface3: '#1c262c',
  line: '#26323a',
  lineStrong: '#3a4a54',
  text: '#e3e7e8',
  text2: '#a7b1b5',
  text3: '#7d898e',
  accent: '#d4ab57',
  alert: '#e0614f',
  halo: 'rgba(6, 9, 11, 0.92)',
};

export const PROVENANCE_COLOR: Record<Provenance, string> = {
  CANONICAL: '#cfe5dc',
  CANONICAL_WITH_VISUAL_RECONSTRUCTION: '#8fc9b6',
  INFERRED: '#d9b56a',
  RECONSTRUCTED: '#c79a4e',
  UNRESOLVED: '#e0614f',
};

/** Route confidence is shown by line treatment, not by hue. */
export const ROUTE_STYLE: Record<RouteConfidence, { dash: number[]; alpha: number; width: number }> = {
  SOLID: { dash: [], alpha: 1, width: 1 },
  RECONSTRUCTED: { dash: [10, 6], alpha: 0.85, width: 1 },
  SCHEMATIC: { dash: [2, 6], alpha: 0.6, width: 0.8 },
  UNKNOWN: { dash: [], alpha: 0, width: 0 },
};

/** Fill treatment of a territory by its role in the war at this moment. */
export const ROLE_FILL_WEIGHT: Record<string, number> = {
  BELLIGERENT: 1,
  CO_BELLIGERENT: 0.75,
  CONTRIBUTOR: 0.45,
  ARMISTICE: 0.55,
  UNINVOLVED: 0.12,
};

export function factionKey(faction: string | null | undefined): ColorKey {
  if (!faction) return 'unknown';
  if (/eastern empire/i.test(faction)) return 'empire';
  if (/tempest/i.test(faction)) return 'tempest';
  if (/dwargon/i.test(faction)) return 'dwargon';
  if (/eurazania|western|blumund|farmenas|englassia/i.test(faction)) return 'neutral';
  return 'unknown';
}

export const factionColor = (faction: string | null | undefined) => FACTION_COLOR[factionKey(faction)];

/** Theatre control strings from the dataset -> colour key, UNKNOWN stays unknown. */
export function controlKey(control: string | null | undefined): ColorKey | 'contested' | null {
  if (!control) return null;
  const c = control.toUpperCase();
  if (c.startsWith('CONTESTED')) return 'contested';
  if (c.startsWith('EMPIRE')) return 'empire';
  if (c.startsWith('TEMPEST')) return 'tempest';
  if (c.startsWith('DWARGON')) return 'dwargon';
  if (c.startsWith('NEUTRAL')) return 'neutral';
  return 'unknown';
}

export function hexToRgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function mix(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16);
  const pb = Number.parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Map-surface tokens per theme. Documentary follows the reference films: light
 * ground and pale sea, solid faction fills, thin rose borders, white fronts and
 * dark type. War room is the dark analytic surface.
 */
export interface MapThemeTokens {
  void: string;
  label: string;
  labelDim: string;
  halo: string;
  border: string;
  uninvolvedFill: string;
  uninvolvedOpacity: number;
  seam: string;
  seamCasing: string;
  place: string;
  accent: string;
  battle: string;
  occupiedAlpha: number;
}

export const MAP_THEME: Record<'documentary' | 'warroom', MapThemeTokens> = {
  documentary: {
    void: '#d8e3ea',
    label: '#1c252b',
    labelDim: '#4f5b62',
    halo: 'rgba(250, 251, 249, 0.92)',
    border: '#9b6b74',
    uninvolvedFill: '#c8ccc4',
    uninvolvedOpacity: 0.32,
    seam: '#ffffff',
    seamCasing: 'rgba(20, 24, 26, 0.45)',
    place: '#26323a',
    accent: '#8a6420',
    battle: '#8f1d16',
    occupiedAlpha: 0.86,
  },
  warroom: {
    void: '#0b1419',
    label: '#c3c9cc',
    labelDim: '#8b979c',
    halo: 'rgba(6, 9, 11, 0.92)',
    border: '#55626a',
    uninvolvedFill: '#6b757a',
    uninvolvedOpacity: 0.12,
    seam: '#f1efe8',
    seamCasing: 'rgba(0, 0, 0, 0.55)',
    place: '#e3e7e8',
    accent: '#d4ab57',
    battle: '#f6d4cd',
    occupiedAlpha: 0.62,
  },
};
