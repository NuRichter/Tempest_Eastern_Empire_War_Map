import { FACTION_COLOR, FACTION_DEEP, FACTION_PALE, factionKey, INK, ROUTE_STYLE } from '@/lib/palette';
import { factionVisible, forceHidden, haloText, isSelected, type DrawContext } from '@/map/overlay/context';
import { drawArrowHead } from '@/map/overlay/glyphs';
import { formatStrength } from '@/map/overlay/layers/forces';

/** How long, in frames, a completed movement stays legible before it fades out. */
const LINGER = 216;

/**
 * Recorded movements as directional routes. Line treatment encodes how well
 * the route is known; an UNKNOWN route is not drawn at all, because a line on a
 * map is a claim. The label states strength at departure, not an assumed
 * constant, and says when the count at arrival differs.
 */
export function drawMovements(dc: DrawContext): void {
  if (!dc.prefs.layers.movement) return;
  const { ctx, data, intFrame, frame } = dc;
  const opacity = dc.prefs.movementOpacity;
  ctx.save();
  ctx.lineCap = 'round';
  for (const m of data.movements) {
    if (m.startFrame === null || intFrame < m.startFrame) continue;
    const end = m.endFrame ?? m.startFrame;
    const age = intFrame - end;
    const selected = isSelected(dc.selection, 'movement', m.id) || isSelected(dc.selection, 'force', m.forceId);
    if (age > LINGER && !selected) continue;
    if (m.route === 'UNKNOWN' || !m.fromPlaceId || !m.toPlaceId) continue;
    const force = data.forceById.get(m.forceId);
    if (!force || !factionVisible(dc.filters, force.faction) || forceHidden(data, dc.filters, force.id)) continue;
    const from = data.placeById.get(m.fromPlaceId) ?? data.nationById.get(m.fromPlaceId);
    const to = data.placeById.get(m.toPlaceId) ?? data.nationById.get(m.toPlaceId);
    if (from?.x == null || to?.x == null || from.y == null || to.y == null) continue;
    const a = dc.project(from.x, from.y);
    const b = dc.project(to.x, to.y);
    if (a.occluded || b.occluded || (!dc.onScreen(a) && !dc.onScreen(b))) continue;
    if (Math.hypot(b.sx - a.sx, b.sy - a.sy) < 6) continue;

    const span = Math.max(1, end - m.startFrame);
    // An open-ended march only gets as far as its recorded pace allows.
    const progress = Math.min(1, Math.max(0, (frame - m.startFrame) / span)) * (m.reach ?? 1);
    const key = factionKey(force.faction);
    const style = ROUTE_STYLE[m.route];
    const fade = age > 0 ? Math.max(0.2, 1 - age / LINGER) : 1;
    const width = (2.2 + (selected ? 1.2 : 0)) * style.width * dc.markerScale;

    // A slight bow keeps parallel movements apart and reads as a route, not a measurement.
    const mx = (a.sx + b.sx) / 2;
    const my = (a.sy + b.sy) / 2;
    const nx = -(b.sy - a.sy) * 0.12;
    const ny = (b.sx - a.sx) * 0.12;
    const cx = mx + nx;
    const cy = my + ny;
    const point = (t: number) => ({
      x: (1 - t) * (1 - t) * a.sx + 2 * (1 - t) * t * cx + t * t * b.sx,
      y: (1 - t) * (1 - t) * a.sy + 2 * (1 - t) * t * cy + t * t * b.sy,
    });

    // Planned remainder, faint.
    ctx.globalAlpha = 0.22 * fade * opacity;
    ctx.strokeStyle = FACTION_PALE[key];
    ctx.lineWidth = Math.max(1, width * 0.6);
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.quadraticCurveTo(cx, cy, b.sx, b.sy);
    ctx.stroke();

    // Travelled part, with a dark casing for contrast on either base map.
    const steps = 24;
    const pts = Array.from({ length: Math.max(2, Math.round(steps * progress) + 1) }, (_, i) => point((i / Math.max(1, Math.round(steps * progress))) * progress));
    const path = () => {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    };
    ctx.setLineDash(style.dash);
    ctx.globalAlpha = style.alpha * fade * opacity * 0.9;
    ctx.strokeStyle = FACTION_DEEP[key];
    ctx.lineWidth = width + 2.5;
    path();
    ctx.stroke();
    ctx.globalAlpha = style.alpha * fade * opacity;
    ctx.strokeStyle = selected ? INK.accent : FACTION_COLOR[key];
    ctx.lineWidth = width;
    path();
    ctx.stroke();
    ctx.setLineDash([]);
    const head = pts[pts.length - 1];
    const prev = pts[Math.max(0, pts.length - 2)];
    if (progress > 0.03) drawArrowHead(ctx, prev.x, prev.y, head.x, head.y, 9 + width * 1.6, selected ? INK.accent : FACTION_COLOR[key]);

    dc.hits.push({
      selection: { kind: 'movement', id: m.id },
      x: point(0.5).x, y: point(0.5).y, r: 12,
      title: `${force.displayName}: ${m.from} → ${m.to}`,
      detail: `${m.type.toLowerCase()} · route ${m.route.toLowerCase()} · ${formatStrength(m.strengthAtStart, force.sizeStatus)} at departure`,
      priority: 4,
    });

    if ((dc.zoom >= 4.2 || selected) && dc.prefs.layers.labels && !dc.cinematic) {
      const mid = point(0.5);
      const size = Math.round(10.5 * dc.labelScale);
      const line1 = `${force.displayName}`;
      const atStart = formatStrength(m.strengthAtStart, force.sizeStatus);
      const atEnd = m.strengthAtEnd !== 'UNKNOWN' && m.strengthAtEnd !== m.strengthAtStart ? ` → ${formatStrength(m.strengthAtEnd, force.sizeStatus)}` : '';
      const line2 = `${atStart}${atEnd} · ${m.route === 'SOLID' ? 'route stated' : m.route === 'RECONSTRUCTED' ? 'route reconstructed' : 'schematic'}${m.arrivesAfterClock ? ' · arrives after the clock' : ''}`;
      ctx.font = `500 ${size}px ${dc.fonts.mono}`;
      const w2 = ctx.measureText(line2).width;
      ctx.font = `600 ${size}px ${dc.fonts.ui}`;
      const w = Math.max(ctx.measureText(line1).width, w2);
      if (dc.labels.place(mid.x + 8, mid.y - size - 2, w + 4, size * 2 + 6, selected)) {
        ctx.globalAlpha = fade;
        haloText(ctx, line1, mid.x + 8, mid.y - 2, dc.theme.label, dc.theme.halo, 3);
        ctx.font = `500 ${size}px ${dc.fonts.mono}`;
        haloText(ctx, line2, mid.x + 8, mid.y + size + 1, dc.theme.labelDim, dc.theme.halo, 3);
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
