import { FACTION_COLOR, FACTION_DEEP, FACTION_PALE, factionKey, INK, ROUTE_STYLE } from '@/lib/palette';
import { type DrawContext, factionVisible, forceHidden, haloText, isSelected, textWidth } from '@/map/overlay/context';
import { drawArrowHead } from '@/map/overlay/glyphs';
import { formatStrength } from '@/map/overlay/layers/forces';
import { msg, translate } from '@/i18n';
import type { RouteConfidence } from '@/types/dataset';
import { alongPolyline, formatKm } from '@/lib/world';

/** Tooltip wording for each route grade. */
const ROUTE_DETAIL: Record<RouteConfidence, string> = {
  SOLID: msg('route solid'),
  RECONSTRUCTED: msg('route reconstructed'),
  SCHEMATIC: msg('route schematic'),
  UNKNOWN: msg('route unknown'),
};

/** How long, in frames, a completed movement stays legible before it fades out. */
const LINGER = 216;

/**
 * Recorded movements as directional routes. Line treatment encodes how well
 * the route is known; an UNKNOWN route is not drawn at all, because a line on a
 * map is a claim. A movement with a measured route (routes.json) is drawn on
 * that ground geometry, the same path the formation's marker follows; only a
 * move inside one battlefield is drawn straight. Reinforcements, withdrawals
 * and failed offensives are told apart by their marks, not by colour alone.
 * The label states strength at departure, not an assumed constant, and says
 * when the count at arrival differs.
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
    const kind = /WITHDRAW|RETREAT|REPATRIAT/.test(m.type) ? 'withdrawal' : /REINFORCE/.test(m.type) ? 'reinforcement' : 'advance';
    // An offensive recorded as failed at this movement's objective.
    const failed = data.events.some((e) => e.type === 'OFFENSIVE_FAILED' && e.frame <= intFrame && e.placeId === m.toPlaceId);

    // Ground geometry: the measured route, else a straight tactical line.
    const route = m.routeId ? data.routeById.get(m.routeId) : undefined;
    const pointAt = (t: number) => {
      if (route) {
        const at = alongPolyline(route.points, route.cumKm, t);
        const q = dc.project(at.x, at.y);
        return { x: q.sx, y: q.sy };
      }
      return { x: a.sx + (b.sx - a.sx) * t, y: a.sy + (b.sy - a.sy) * t };
    };
    const samples = route ? Math.min(160, Math.max(24, route.points.length * 3)) : 2;
    const point = pointAt;

    // Planned remainder, faint.
    ctx.globalAlpha = 0.22 * fade * opacity;
    ctx.strokeStyle = FACTION_PALE[key];
    ctx.lineWidth = Math.max(1, width * 0.6);
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    for (let i = 0; i <= samples; i += 1) {
      const p = point(i / samples);
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();

    // Travelled part, with a dark casing for contrast on either base map.
    const done = Math.max(1, Math.round(samples * progress));
    const pts = Array.from({ length: done + 1 }, (_, i) => point((i / done) * progress));
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
    // Marks along the travelled line: + for a reinforcement, reversed ticks for a withdrawal.
    if (kind !== 'advance' && pts.length > 4) {
      ctx.save();
      ctx.globalAlpha = style.alpha * fade * opacity;
      ctx.strokeStyle = selected ? INK.accent : FACTION_PALE[key];
      ctx.lineWidth = 1.6;
      for (let i = 2; i < pts.length - 1; i += Math.max(3, Math.floor(pts.length / 5))) {
        const p = pts[i];
        const q = pts[i - 1];
        const ang = Math.atan2(p.y - q.y, p.x - q.x);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(ang);
        ctx.beginPath();
        if (kind === 'reinforcement') { ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.moveTo(0, -4); ctx.lineTo(0, 4); }
        else { ctx.moveTo(4, -4); ctx.lineTo(-1, 0); ctx.lineTo(4, 4); }
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
    // A failed offensive ends in a cross at its objective.
    if (failed && progress >= 0.999) {
      const e = pts[pts.length - 1];
      ctx.save();
      ctx.strokeStyle = INK.alert;
      ctx.lineWidth = 3;
      ctx.globalAlpha = fade * opacity;
      ctx.beginPath();
      ctx.moveTo(e.x - 8, e.y - 8); ctx.lineTo(e.x + 8, e.y + 8); ctx.moveTo(e.x + 8, e.y - 8); ctx.lineTo(e.x - 8, e.y + 8);
      ctx.stroke();
      ctx.restore();
    }

    dc.hits.push({
      selection: { kind: 'movement', id: m.id },
      x: point(0.5).x, y: point(0.5).y, r: 12,
      title: `${force.displayName}: ${m.from} → ${m.to}`,
      detail: `${m.type.toLowerCase()} · ${translate(ROUTE_DETAIL[m.route])}${m.lengthKm !== null ? ` · ${formatKm(m.lengthKm)}` : ''} · ${translate('{strength} at departure', { strength: formatStrength(m.strengthAtStart, force.sizeStatus) })}${failed ? ` · ${translate('offensive failed')}` : ''}`,
      priority: 4,
    });

    if ((dc.zoom >= 4.2 || selected) && dc.prefs.layers.labels && !dc.cinematic) {
      const mid = point(0.5);
      const size = Math.round(10.5 * dc.labelScale);
      const line1 = `${force.displayName}`;
      const atStart = formatStrength(m.strengthAtStart, force.sizeStatus);
      const atEnd = m.strengthAtEnd !== 'UNKNOWN' && m.strengthAtEnd !== m.strengthAtStart ? ` → ${formatStrength(m.strengthAtEnd, force.sizeStatus)}` : '';
      const line2 = `${atStart}${atEnd} · ${m.route === 'SOLID' ? translate('route stated') : m.route === 'RECONSTRUCTED' ? translate('route reconstructed') : translate('schematic')}${m.arrivesAfterClock ? ` · ${translate('arrives after the clock')}` : ''}`;
      ctx.font = `500 ${size}px ${dc.fonts.mono}`;
      const w2 = textWidth(ctx, line2);
      ctx.font = `600 ${size}px ${dc.fonts.ui}`;
      const w = Math.max(textWidth(ctx, line1), w2);
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
