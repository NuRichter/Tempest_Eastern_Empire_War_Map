import { translate } from '@/i18n';
import { type DrawContext, haloText, textWidth } from '@/map/overlay/context';
import type { Settlement } from '@/types/dataset';

/**
 * Icons and names for the capitals, major cities and Ramiris Labyrinth. Their
 * outlines are MapLibre polygons (MapView); this draws the badge at the centre:
 *   capital    gold badge with a crown
 *   labyrinth  violet badge with a maze
 *   city       grey badge with a tower
 * Capitals show from the opening view; cities and names when zoomed in.
 */

const BADGE = {
  capital: { fill: '#d4ab57', ring: '#5a3f0e', glyph: '#2a1d05' },
  labyrinth: { fill: '#8f72e0', ring: '#2f1d6b', glyph: '#f4efff' },
  city: { fill: '#c9c3b8', ring: '#4a443b', glyph: '#2a2620' },
} as const;

function crown(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x - s, y + s * 0.55);
  ctx.lineTo(x - s, y - s * 0.35);
  ctx.lineTo(x - s * 0.5, y + s * 0.1);
  ctx.lineTo(x, y - s * 0.6);
  ctx.lineTo(x + s * 0.5, y + s * 0.1);
  ctx.lineTo(x + s, y - s * 0.35);
  ctx.lineTo(x + s, y + s * 0.55);
  ctx.closePath();
  ctx.fill();
}

function maze(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  // Three nested square rings with staggered gaps: a labyrinth in miniature.
  ctx.lineWidth = Math.max(1, s * 0.22);
  ctx.lineCap = 'square';
  for (let k = 0; k < 3; k += 1) {
    const r = s * (1 - k * 0.34);
    const gap = r * 0.55;
    ctx.beginPath();
    if (k % 2 === 0) {
      ctx.moveTo(x - r + gap, y - r);
      ctx.lineTo(x + r, y - r);
      ctx.lineTo(x + r, y + r);
      ctx.lineTo(x - r, y + r);
      ctx.lineTo(x - r, y - r);
    } else {
      ctx.moveTo(x + r - gap, y + r);
      ctx.lineTo(x - r, y + r);
      ctx.lineTo(x - r, y - r);
      ctx.lineTo(x + r, y - r);
      ctx.lineTo(x + r, y + r);
    }
    ctx.stroke();
  }
}

function tower(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const w = s * 0.75;
  ctx.fillRect(x - w / 2, y - s * 0.35, w, s * 0.95);
  for (const dx of [-w / 2, -w / 12, w / 3]) ctx.fillRect(x + dx, y - s * 0.7, w / 6, s * 0.4);
}

export function drawSettlements(dc: DrawContext): void {
  if (!dc.prefs.layers.settlements) return;
  const { ctx, zoom, labels, labelScale, markerScale } = dc;
  const order: Settlement['kind'][] = ['labyrinth', 'capital', 'city'];
  const items = [...dc.data.settlements].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  for (const s of items) {
    if (s.kind === 'city' && zoom < 3) continue;
    // The Labyrinth's door is where the D+10 battle is fought: its badge sits
    // at the top of the outline so the battle marker does not cover it.
    const top = Math.min(...s.ring.map((q) => q[1]));
    const p = dc.project(s.x, s.kind === 'labyrinth' ? s.y - (s.y - top) * 0.62 : s.y);
    if (!dc.onScreen(p, 20)) continue;
    const r = Math.round((s.kind === 'city' ? 7 : 9) * markerScale * Math.min(1.25, 0.8 + zoom * 0.08));
    if (!labels.place(p.sx - r, p.sy - r, r * 2, r * 2)) continue;
    const c = BADGE[s.kind];
    ctx.save();
    ctx.beginPath();
    if (s.kind === 'labyrinth') {
      for (let k = 0; k < 8; k += 1) {
        const a = Math.PI / 8 + (k * Math.PI) / 4;
        const px = p.sx + Math.cos(a) * r * 1.08;
        const py = p.sy + Math.sin(a) * r * 1.08;
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
    } else ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
    ctx.fillStyle = c.fill;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = c.ring;
    ctx.stroke();
    ctx.fillStyle = c.glyph;
    ctx.strokeStyle = c.glyph;
    if (s.kind === 'capital') crown(ctx, p.sx, p.sy + r * 0.05, r * 0.55);
    else if (s.kind === 'labyrinth') maze(ctx, p.sx, p.sy, r * 0.55);
    else tower(ctx, p.sx, p.sy + r * 0.1, r * 0.6);
    ctx.restore();

    // Names: capitals and the Labyrinth from mid zoom, cities when close.
    if (dc.prefs.layers.labels && (zoom >= (s.kind === 'city' ? 4 : 3.1))) {
      const size = Math.round((s.kind === 'city' ? 10 : 11) * labelScale);
      ctx.font = `${s.kind === 'city' ? 500 : 600} ${size}px ${dc.fonts.ui}`;
      const w = textWidth(ctx, s.name);
      const x = p.sx - w / 2;
      const y = p.sy + r + size + 2;
      if (labels.place(x - 3, y - size, w + 6, size + 4)) haloText(ctx, s.name, x, y, s.kind === 'city' ? dc.theme.labelDim : dc.theme.label, dc.theme.halo, 3);
    }

    const kindLabel = s.kind === 'capital' ? translate('Capital') : s.kind === 'labyrinth' ? translate('Labyrinth') : translate('City');
    dc.hits.push({
      selection: s.kind === 'labyrinth' ? { kind: 'theatre', id: 'TH-LAB' } : { kind: 'nation', id: s.nationId },
      x: p.sx,
      y: p.sy,
      r: r + 3,
      title: s.name,
      detail: `${kindLabel} · ${translate('outline reconstructed')}`,
      provenance: 'RECONSTRUCTED',
      priority: 7,
    });
  }
}
