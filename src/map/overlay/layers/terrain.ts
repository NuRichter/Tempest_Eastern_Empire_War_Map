import { INK } from '@/lib/palette';
import { formatKm } from '@/lib/world';
import { type DrawContext, haloText, isSelected, textWidth } from '@/map/overlay/context';
import { msg, translate } from '@/i18n';
import type { Place, SupplyState } from '@/types/dataset';

/**
 * Physical geography and strategic points of the war theatre, from the same
 * world model the routes are found on (geography.json, places.json): rivers
 * and the lake, the Kanaat massif and its passes, roads with the state of each
 * supply route, fords and bridges, and the halt point, gates, crossings,
 * staging areas and objectives. Every feature is a hit target whose dossier
 * gives its grade and basis.
 */

const WATER = '#5e93b8';
const WATER_FILL = 'rgba(94, 147, 184, 0.32)';
const RIDGE = '#8b6a4b';
const ROAD = '#e2d3b0';
const ROAD_CASING = 'rgba(20, 16, 10, 0.72)';

export const SUPPLY_LABEL: Record<SupplyState, string> = {
  OPEN: msg('Open'),
  THREATENED: msg('Threatened'),
  CUT: msg('Cut'),
  SECURE: msg('Secure'),
};
const SUPPLY_COLOR: Record<SupplyState, string> = { OPEN: ROAD, THREATENED: '#e0a53f', CUT: '#e0614f', SECURE: '#8fc9b6' };

export const SYMBOL_LABEL: Record<NonNullable<Place['symbol']>, string> = {
  halt: msg('Halt point'),
  gate: msg('Gate'),
  crossing: msg('Border crossing'),
  objective: msg('Objective'),
  staging: msg('Staging area'),
  camp: msg('Camp'),
};

function polyline(dc: DrawContext, pts: readonly (readonly [number, number])[], close = false): boolean {
  const { ctx } = dc;
  let started = false;
  let visible = false;
  ctx.beginPath();
  for (const [x, y] of pts) {
    const p = dc.project(x, y);
    if (p.occluded) {
      started = false;
      continue;
    }
    if (dc.onScreen(p, 200)) visible = true;
    if (started) ctx.lineTo(p.sx, p.sy);
    else {
      ctx.moveTo(p.sx, p.sy);
      started = true;
    }
  }
  if (close) ctx.closePath();
  return visible;
}

/** Point a fraction of the way along a polyline in screen space, with its direction. */
function midOf(dc: DrawContext, pts: readonly (readonly [number, number])[], t = 0.5): { x: number; y: number; a: number } | null {
  const s = pts.map(([x, y]) => dc.project(x, y)).filter((p) => !p.occluded);
  if (s.length < 2) return null;
  let total = 0;
  for (let i = 1; i < s.length; i += 1) total += Math.hypot(s[i].sx - s[i - 1].sx, s[i].sy - s[i - 1].sy);
  let want = total * t;
  for (let i = 1; i < s.length; i += 1) {
    const d = Math.hypot(s[i].sx - s[i - 1].sx, s[i].sy - s[i - 1].sy);
    if (want <= d && d > 0) {
      const u = want / d;
      return { x: s[i - 1].sx + (s[i].sx - s[i - 1].sx) * u, y: s[i - 1].sy + (s[i].sy - s[i - 1].sy) * u, a: Math.atan2(s[i].sy - s[i - 1].sy, s[i].sx - s[i - 1].sx) };
    }
    want -= d;
  }
  return null;
}

function featureHit(dc: DrawContext, id: string, at: { x: number; y: number } | null, title: string, detail: string, priority = 10): void {
  if (!at) return;
  dc.hits.push({ selection: { kind: 'feature', id }, x: at.x, y: at.y, r: 10, title, detail, priority });
}

export function drawTerrain(dc: DrawContext): void {
  const { ctx, data, zoom } = dc;
  const geo = data.geography;
  const L = dc.prefs.layers;
  const s = dc.markerScale;
  if (zoom < 1.6) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  /* -- relief: the massif outline and its passes ------------------- */
  if (L.relief) {
    for (const m of geo.mountains) {
      if (!polyline(dc, m.ring, true)) continue;
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = RIDGE;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.4 * s;
      ctx.stroke();
      ctx.setLineDash([]);
      const top = midOf(dc, m.ring, 0.12);
      if (top && zoom >= 3 && L.labels) {
        const size = Math.round(10 * dc.labelScale);
        ctx.font = `italic 500 ${size}px ${dc.fonts.ui}`;
        const w = textWidth(ctx, m.name);
        if (dc.labels.place(top.x - w / 2, top.y - size - 4, w, size + 4)) {
          ctx.globalAlpha = 0.85;
          haloText(ctx, m.name, top.x - w / 2, top.y - 4, RIDGE, dc.theme.halo, 3);
        }
      }
      featureHit(dc, m.id, top, m.name, translate('Mountains, impassable outside a pass'));
    }
    for (const p of geo.passes) {
      if (!polyline(dc, p.line)) continue;
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = RIDGE;
      ctx.lineWidth = 3.2 * s;
      ctx.setLineDash([1, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      const mid = midOf(dc, p.line);
      if (mid && zoom >= 3.4) {
        // A pass symbol: two facing arcs across the line.
        ctx.save();
        ctx.translate(mid.x, mid.y);
        ctx.rotate(mid.a);
        ctx.strokeStyle = RIDGE;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(0, -9, 6, Math.PI * 0.2, Math.PI * 0.8);
        ctx.moveTo(6 * Math.cos(-Math.PI * 0.2), 9 + 6 * Math.sin(-Math.PI * 0.2));
        ctx.arc(0, 9, 6, -Math.PI * 0.2, -Math.PI * 0.8, true);
        ctx.stroke();
        ctx.restore();
      }
      featureHit(dc, p.id, mid, p.name, translate('Mountain pass'), 9);
    }
  }

  /* -- water ----------------------------------------------------- */
  if (L.rivers) {
    for (const l of geo.lakes) {
      if (!polyline(dc, l.ring, true)) continue;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = WATER_FILL;
      ctx.fill();
      ctx.strokeStyle = WATER;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      const c = midOf(dc, l.ring, 0.5);
      featureHit(dc, l.id, c, l.name, translate('Lake'));
    }
    for (const r of geo.rivers) {
      if (!polyline(dc, r.line)) continue;
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = WATER;
      ctx.lineWidth = Math.max(1.2, 2 * s * Math.min(1.4, zoom / 4));
      ctx.stroke();
      featureHit(dc, r.id, midOf(dc, r.line), r.name, translate('River'));
    }
  }

  /* -- roads and supply routes ----------------------------------- */
  if (L.roads) {
    const supply = dc.state?.logistics ?? {};
    for (const r of geo.roads) {
      if (!polyline(dc, r.line)) continue;
      const st = (supply[r.id] ?? null) as SupplyState | null;
      const selected = isSelected(dc.selection, 'feature', r.id);
      const w = (r.role === 'LOGISTICS' ? 2.6 : 1.8) * s;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = ROAD_CASING;
      ctx.lineWidth = w + 2.4;
      ctx.stroke();
      ctx.strokeStyle = selected ? INK.accent : st ? SUPPLY_COLOR[st] : ROAD;
      ctx.lineWidth = w;
      // State is carried by pattern and glyph as well as colour.
      ctx.setLineDash(st === 'THREATENED' ? [7, 4] : st === 'CUT' ? [3, 6] : r.role === 'LOGISTICS' ? [] : [10, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      const mid = midOf(dc, r.line, 0.42);
      if (mid && st && st !== 'OPEN' && zoom >= 2.4) {
        ctx.save();
        ctx.translate(mid.x, mid.y);
        ctx.globalAlpha = 1;
        ctx.fillStyle = SUPPLY_COLOR[st];
        ctx.strokeStyle = ROAD_CASING;
        ctx.lineWidth = 2;
        if (st === 'CUT') {
          ctx.beginPath();
          ctx.moveTo(-6, -6); ctx.lineTo(6, 6); ctx.moveTo(6, -6); ctx.lineTo(-6, 6);
          ctx.lineWidth = 4; ctx.stroke();
          ctx.strokeStyle = SUPPLY_COLOR[st]; ctx.lineWidth = 2; ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -8); ctx.lineTo(7, 5); ctx.lineTo(-7, 5); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = ROAD_CASING;
          ctx.font = `700 8px ${dc.fonts.ui}`;
          ctx.fillText(st === 'THREATENED' ? '!' : '✓', -2.2, 3.5);
        }
        ctx.restore();
      }
      if (mid && L.labels && (zoom >= 3.6 || selected || (st && st !== 'OPEN'))) {
        const size = Math.round(9.5 * dc.labelScale);
        ctx.font = `600 ${size}px ${dc.fonts.mono}`;
        const text = st && st !== 'OPEN' ? `${r.name} · ${translate(SUPPLY_LABEL[st]).toUpperCase()}` : r.name;
        const tw = textWidth(ctx, text);
        if (dc.labels.place(mid.x + 10, mid.y - size, tw + 4, size + 4, selected)) {
          ctx.globalAlpha = 0.95;
          haloText(ctx, text, mid.x + 10, mid.y, st && st !== 'OPEN' ? SUPPLY_COLOR[st] : dc.theme.labelDim, dc.theme.halo, 3);
        }
      }
      featureHit(dc, r.id, mid, r.name, `${translate('Road')} · ${formatKm(r.lengthKm)}${st ? ` · ${translate('supply')} ${translate(SUPPLY_LABEL[st]).toLowerCase()}` : ''}`, 7);
    }
  }

  /* -- fords, bridges and strategic points ------------------------ */
  if (L.strategic) {
    if (zoom >= 3.2) {
      for (const c of geo.crossings) {
        const p = dc.project(c.x, c.y);
        if (p.occluded || !dc.onScreen(p)) continue;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = c.kind === 'BRIDGE' ? ROAD : WATER;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (c.kind === 'BRIDGE') {
          ctx.moveTo(p.sx - 6, p.sy - 3); ctx.lineTo(p.sx + 6, p.sy - 3);
          ctx.moveTo(p.sx - 6, p.sy + 3); ctx.lineTo(p.sx + 6, p.sy + 3);
        } else {
          for (const dx of [-4, 0, 4]) { ctx.moveTo(p.sx + dx, p.sy - 5); ctx.lineTo(p.sx + dx, p.sy + 5); }
        }
        ctx.stroke();
        featureHit(dc, c.id, { x: p.sx, y: p.sy }, c.name, c.kind === 'BRIDGE' ? translate('Bridge') : translate('Ford'), 8);
      }
    }
    for (const place of data.places) {
      if (!place.symbol || place.x === null || place.y === null) continue;
      if (place.symbol === 'camp' && zoom < 4.2) continue;
      if ((place.symbol === 'staging' || place.symbol === 'objective') && zoom < 2.6) continue;
      const p = dc.project(place.x, place.y);
      if (p.occluded || !dc.onScreen(p)) continue;
      const selected = isSelected(dc.selection, 'place', place.id);
      drawSymbol(dc, place.symbol, p.sx, p.sy, selected);
      dc.hits.push({ selection: { kind: 'place', id: place.id }, x: p.sx, y: p.sy, r: 11, title: place.name, detail: `${translate(SYMBOL_LABEL[place.symbol])} · ${place.placement.toLowerCase()}`, priority: 6 });
      if (L.labels && (zoom >= 3.4 || selected || place.symbol === 'halt' || place.symbol === 'gate')) {
        const size = Math.round(10.5 * dc.labelScale);
        ctx.font = `600 ${size}px ${dc.fonts.ui}`;
        const w = textWidth(ctx, place.name);
        if (dc.labels.place(p.sx + 12, p.sy - size + 2, w + 4, size + 4, selected)) {
          ctx.globalAlpha = 1;
          haloText(ctx, place.name, p.sx + 12, p.sy + 2, selected ? dc.theme.accent : dc.theme.label, dc.theme.halo, 3);
        }
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Strategic symbols: distinct shapes, readable without colour. */
function drawSymbol(dc: DrawContext, kind: NonNullable<Place['symbol']>, x: number, y: number, selected: boolean): void {
  const { ctx } = dc;
  const r = 7 * dc.markerScale;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = selected ? INK.accent : '#f2ead6';
  ctx.fillStyle = 'rgba(18, 14, 10, 0.82)';
  ctx.beginPath();
  switch (kind) {
    case 'halt': // a flag on a staff
      ctx.moveTo(-r * 0.6, r); ctx.lineTo(-r * 0.6, -r);
      ctx.lineTo(r * 0.9, -r * 0.55); ctx.lineTo(-r * 0.6, -r * 0.1);
      ctx.fill(); ctx.stroke();
      break;
    case 'gate': // a gatehouse: two towers and an arch
      ctx.rect(-r, -r * 0.7, r * 0.6, r * 1.6);
      ctx.rect(r * 0.4, -r * 0.7, r * 0.6, r * 1.6);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, r * 0.9); ctx.lineTo(-r * 0.4, 0); ctx.arc(0, 0, r * 0.4, Math.PI, 0); ctx.lineTo(r * 0.4, r * 0.9);
      ctx.stroke();
      break;
    case 'crossing': // a chevron across a line
      ctx.moveTo(-r, r * 0.6); ctx.lineTo(0, -r * 0.6); ctx.lineTo(r, r * 0.6);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r, r); ctx.lineTo(r, r); ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
      break;
    case 'objective': // a target
      ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'staging': // a square with a dot
      ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fillStyle = '#f2ead6'; ctx.fill();
      break;
    case 'camp': // a tent
      ctx.moveTo(-r, r * 0.7); ctx.lineTo(0, -r * 0.8); ctx.lineTo(r, r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
  }
  ctx.restore();
}
