import type { Dataset } from '@/data/loader';
import type { Filters, Selection } from '@/simulation/store';
import type { Preferences } from '@/state/preferences';
import type { Confidence, FrameState, Provenance } from '@/types/dataset';
import { eventCategory } from '@/lib/taxonomy';
import type { MapThemeTokens } from '@/lib/palette';

export interface Projected {
  sx: number;
  sy: number;
  occluded: boolean;
}

/** Something on the canvas the reader can point at. */
export interface Hit {
  selection: Exclude<Selection, { kind: 'none' }>;
  x: number;
  y: number;
  r: number;
  title: string;
  detail: string;
  provenance?: Provenance;
  /** Lower draws later and wins ties: forces beat battles beat events. */
  priority: number;
}

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  data: Dataset;
  /** Continuous frame position from the clock. */
  frame: number;
  intFrame: number;
  state: FrameState | null;
  zoom: number;
  width: number;
  height: number;
  prefs: Preferences;
  filters: Filters;
  selection: Selection;
  hovered: Selection;
  commanderFocus: string | null;
  cinematic: boolean;
  reducedMotion: boolean;
  theme: MapThemeTokens;
  globe: boolean;
  playing: boolean;
  now: number;
  fonts: { ui: string; mono: string };
  labelScale: number;
  markerScale: number;
  eventScale: number;
  project: (x: number, y: number) => Projected;
  onScreen: (p: Projected, pad?: number) => boolean;
  labels: LabelLayout;
  hits: Hit[];
}

/** Greedy collision avoidance: first come, first placed. Callers go in priority order. */
export class LabelLayout {
  private boxes: { x: number; y: number; w: number; h: number }[] = [];

  fits(x: number, y: number, w: number, h: number): boolean {
    return !this.boxes.some((b) => !(x + w < b.x || b.x + b.w < x || y + h < b.y || b.y + b.h < y));
  }

  place(x: number, y: number, w: number, h: number, force = false): boolean {
    if (!force && !this.fits(x, y, w, h)) return false;
    this.boxes.push({ x, y, w, h });
    return true;
  }

  reserve(x: number, y: number, w: number, h: number): void {
    this.boxes.push({ x, y, w, h });
  }
}

const CONFIDENCE_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };

export function meetsConfidence(filters: Filters, c: Confidence): boolean {
  if (filters.minConfidence === 'ANY') return true;
  return (CONFIDENCE_RANK[c] ?? 0) >= CONFIDENCE_RANK[filters.minConfidence];
}

export function factionVisible(filters: Filters, faction: string): boolean {
  return !filters.hiddenFactions.includes(faction);
}

export function eventVisible(filters: Filters, e: { theatreId: string; type: string; provenance: Provenance; confidence: Confidence; actorFaction: string; battleId?: string | null }): boolean {
  return (
    !(e.battleId && filters.hiddenBattles.includes(e.battleId)) &&
    !filters.hiddenTheatres.includes(e.theatreId) &&
    !filters.hiddenCategories.includes(eventCategory(e.type)) &&
    !filters.hiddenProvenance.includes(e.provenance) &&
    meetsConfidence(filters, e.confidence) &&
    factionVisible(filters, e.actorFaction)
  );
}

/** A formation is hidden if it, or any formation containing it, is filtered out, or its nation is. */
export function forceHidden(data: Dataset, filters: Filters, forceId: string): boolean {
  if (!filters.hiddenForces.length && !filters.hiddenNations.length) return false;
  let f = data.forceById.get(forceId);
  const nation = f ? data.factionById.get(f.faction)?.nationId : null;
  if (nation && filters.hiddenNations.includes(nation)) return true;
  while (f) {
    if (filters.hiddenForces.includes(f.id)) return true;
    f = f.parentId ? data.forceById.get(f.parentId) : undefined;
  }
  return false;
}

export function isSelected(sel: Selection, kind: Selection['kind'], id: string): boolean {
  return sel.kind === kind && 'id' in sel && sel.id === id;
}

/** Text with a dark halo, legible over any part of either base map. */
export function haloText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string, halo: string, width = 3): void {
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = halo;
  ctx.lineWidth = width;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export function trimTo(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (textWidth(ctx, text) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && textWidth(ctx, `${t}…`) > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/**
 * Width of a text in the context's current font, cached: the overlay draws the
 * same labels every frame, and measuring text is not free.
 */
const widthCache = new Map<string, number>();
export function textWidth(ctx: CanvasRenderingContext2D, text: string): number {
  const key = `${ctx.font}\u0000${(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing ?? ''}\u0000${text}`;
  let w = widthCache.get(key);
  if (w === undefined) {
    if (widthCache.size > 4000) widthCache.clear();
    w = ctx.measureText(text).width;
    widthCache.set(key, w);
  }
  return w;
}
