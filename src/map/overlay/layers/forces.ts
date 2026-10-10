import { FACTION_COLOR, FACTION_DEEP, FACTION_PALE, FACTION_SHAPE, factionKey, INK, type ColorKey } from '@/lib/palette';
import { SIZE_STATUS_LABEL } from '@/lib/taxonomy';
import { displayStrengthAt, forcePositionAt, forceSnapshotAt, forceTrail } from '@/simulation/resolver';
import { getField } from '@/map/field/fieldStore';
import { type DrawContext, factionVisible, forceHidden, haloText, isSelected, meetsConfidence, textWidth, trimTo } from '@/map/overlay/context';
import { tracePath } from '@/map/overlay/glyphs';
import type { Force, ForceSnapshot, Quantity, SizeStatus } from '@/types/dataset';
import { translate } from '@/i18n';

export interface PlacedForce {
  force: Force;
  snapshot: ForceSnapshot;
  key: ColorKey;
  x: number;
  y: number;
  sx: number;
  sy: number;
  r: number;
  moving: boolean;
  heading: { dx: number; dy: number } | null;
  theatreId: string | null;
}

const GROUP = new Intl.NumberFormat('en-GB');

/** Marker radius steps through echelons; the number, not the disc, carries magnitude. */
function echelonRadius(strength: Quantity, zoom: number, scale: number): number {
  const z = 0.8 + Math.min(1.2, zoom / 6);
  const base = strength === 'UNKNOWN' ? 6 : strength >= 500_000 ? 13 : strength >= 100_000 ? 11.5 : strength >= 20_000 ? 10 : strength >= 2_000 ? 8.5 : strength >= 50 ? 7 : 6;
  return base * z * scale;
}

/** Army-size label height: grows with the square root of the cube root of size, clamped (reference analysis). */
export function strengthFontSize(value: number, scale: number): number {
  const v = Math.max(1000, value);
  return Math.round(Math.min(28, Math.max(11, 10 * Math.pow(v / 1000, 0.18))) * scale);
}

export function formatStrength(q: Quantity, status: SizeStatus): string {
  if (q === 'UNKNOWN' || status === 'UNKNOWN') return '?';
  const mark = SIZE_STATUS_LABEL[status]?.mark ?? '';
  return `${mark}${GROUP.format(q)}`;
}

const isSingle = (f: Force, s: ForceSnapshot) => s.strength === 1 || /single|special combatant|construct|entity/i.test(f.unitType + ' ' + f.initialStrengthRaw);

export function placeForces(dc: DrawContext): PlacedForce[] {
  const { data, zoom } = dc;
  const commander = dc.commanderFocus ? data.commanderById.get(dc.commanderFocus) : null;
  const focusSet = commander ? new Set(commander.forceIds) : null;
  const placed: PlacedForce[] = [];
  const drawn = new Set<string>();
  for (const force of data.forces) {
    if (!factionVisible(dc.filters, force.faction) || forceHidden(data, dc.filters, force.id)) continue;
    const snapshot = forceSnapshotAt(data, force.id, dc.intFrame);
    if (!snapshot || !meetsConfidence(dc.filters, snapshot.confidence)) continue;
    if (/DESTROYED|ANNIHILATED/i.test(snapshot.status) && dc.intFrame - snapshot.f > 432) continue; // a destroyed formation lingers three days, struck through
    const pos = forcePositionAt(data, force.id, dc.frame);
    if (!pos) continue;
    if (focusSet && !focusSet.has(force.id)) continue;
    const p = dc.project(pos.x, pos.y);
    if (p.occluded) continue;
    const key = factionKey(force.faction);
    const place = pos.placeId ? data.placeById.get(pos.placeId) : null;
    placed.push({
      force, snapshot, key, x: pos.x, y: pos.y, sx: p.sx, sy: p.sy,
      r: echelonRadius(snapshot.strength, zoom, dc.markerScale),
      moving: pos.moving, heading: pos.heading, theatreId: place?.theatre ?? null,
    });
    drawn.add(force.id);
  }

  // A parent and its subordinates describe the same soldiers. At operational
  // zoom only the most specific drawn formations remain, so nobody is shown twice.
  const keep = placed.filter((p) => !p.force.childIds.some((c) => drawn.has(c)) || zoom >= 6.5 || isSelected(dc.selection, 'force', p.force.id));

  // Formations sharing one anchor fan out around it in a fixed order. The fan
  // is a drawing device; the dossier reports the shared position.
  const groups = new Map<string, PlacedForce[]>();
  for (const p of keep) {
    const k = `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    g.sort((a, b) => a.force.id.localeCompare(b.force.id));
    const spread = Math.max(...g.map((p) => p.r)) * 2.1 + 4;
    g.forEach((p, i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / g.length;
      p.sx += Math.cos(a) * spread;
      p.sy += Math.sin(a) * spread;
    });
  }
  return keep;
}

export function drawTrails(dc: DrawContext, placed: PlacedForce[]): void {
  if (!dc.prefs.layers.trails) return;
  const { ctx } = dc;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const p of placed) {
    const trail = forceTrail(dc.data, p.force.id, dc.frame, 1200);
    if (trail.length < 2) continue;
    ctx.beginPath();
    let started = false;
    for (const pt of trail) {
      const q = dc.project(pt.x, pt.y);
      if (q.occluded) continue;
      if (started) ctx.lineTo(q.sx, q.sy);
      else {
        ctx.moveTo(q.sx, q.sy);
        started = true;
      }
    }
    ctx.strokeStyle = FACTION_COLOR[p.key];
    ctx.globalAlpha = 0.35 * dc.prefs.movementOpacity;
    ctx.lineWidth = dc.prefs.trailWidth;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawForces(dc: DrawContext, placed: PlacedForce[]): void {
  const { ctx, zoom } = dc;
  const showSizes = dc.prefs.layers.armySizes;
  const showLabels = dc.prefs.layers.labels && !dc.cinematic;
  const ordered = [...placed].sort((a, b) => b.r - a.r || a.force.id.localeCompare(b.force.id));

  // Markers first so labels never sit underneath another marker.
  for (const p of ordered) {
    if (!dc.onScreen({ sx: p.sx, sy: p.sy, occluded: false })) continue;
    const selected = isSelected(dc.selection, 'force', p.force.id);
    const hovered = isSelected(dc.hovered, 'force', p.force.id);
    const destroyed = /DESTROYED|ANNIHILATED/i.test(p.snapshot.status);
    const color = FACTION_COLOR[p.key];
    const shape = FACTION_SHAPE[p.key];
    ctx.save();
    ctx.globalAlpha = destroyed ? 0.45 : 1;
    if (selected) {
      tracePath(ctx, shape, p.sx, p.sy, p.r + 5);
      ctx.strokeStyle = INK.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    tracePath(ctx, shape, p.sx, p.sy, p.r);
    ctx.fillStyle = FACTION_DEEP[p.key];
    ctx.fill();
    ctx.lineWidth = selected || hovered ? 2.2 : 1.5;
    ctx.strokeStyle = selected || hovered ? FACTION_PALE[p.key] : color;
    if (p.snapshot.sizeStatus === 'UNKNOWN' || p.snapshot.strength === 'UNKNOWN') ctx.setLineDash([3, 2.5]);
    ctx.stroke();
    ctx.setLineDash([]);
    // Inner pip in the faction colour.
    tracePath(ctx, shape, p.sx, p.sy, p.r * 0.42);
    ctx.fillStyle = color;
    ctx.fill();
    if (destroyed) {
      ctx.beginPath();
      ctx.moveTo(p.sx - p.r, p.sy - p.r);
      ctx.lineTo(p.sx + p.r, p.sy + p.r);
      ctx.strokeStyle = INK.alert;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (p.moving && p.heading) {
      const len = Math.hypot(p.heading.dx, p.heading.dy) || 1;
      const ux = p.heading.dx / len;
      const uy = p.heading.dy / len;
      ctx.beginPath();
      ctx.moveTo(p.sx + ux * (p.r + 3), p.sy + uy * (p.r + 3));
      ctx.lineTo(p.sx + ux * (p.r + 11), p.sy + uy * (p.r + 11));
      ctx.strokeStyle = FACTION_PALE[p.key];
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    dc.labels.reserve(p.sx - p.r, p.sy - p.r, p.r * 2, p.r * 2);
    dc.hits.push({
      selection: { kind: 'force', id: p.force.id },
      x: p.sx, y: p.sy, r: p.r + 5,
      title: p.force.displayName,
      detail: `${p.force.faction} · ${formatStrength(p.snapshot.strength, p.snapshot.sizeStatus)} · ${p.snapshot.status.toLowerCase().replace(/_/g, ' ')}`,
      priority: 1,
    });
  }

  if (!showSizes && !showLabels) return;
  for (const p of ordered) {
    if (!dc.onScreen({ sx: p.sx, sy: p.sy, occluded: false })) continue;
    const selected = isSelected(dc.selection, 'force', p.force.id) || isSelected(dc.hovered, 'force', p.force.id);
    const big = typeof p.snapshot.strength === 'number' && p.snapshot.strength >= 20_000;
    if (!selected && zoom < 4.2 && !big) continue;
    const single = isSingle(p.force, p.snapshot);
    const value = typeof p.snapshot.strength === 'number' ? p.snapshot.strength : 0;
    const numSize = single ? Math.round(11 * dc.labelScale) : strengthFontSize(value, dc.labelScale);
    const nameSize = Math.round(11 * dc.labelScale);
    const name = trimTo(ctx, p.force.displayName, 200);
    const number = single ? '' : formatStrength(displayStrengthAt(dc.data, p.force.id, dc.frame), p.snapshot.sizeStatus);
    ctx.font = `700 ${numSize}px ${dc.fonts.ui}`;
    const nw = number ? textWidth(ctx, number) : 0;
    ctx.font = `500 ${nameSize}px ${dc.fonts.ui}`;
    const showName = showLabels && (selected || zoom >= 4.8 || single);
    const tw = showName ? textWidth(ctx, name) : 0;
    const x = p.sx + p.r + 6;
    const h = (number && showSizes ? numSize : 0) + (showName ? nameSize + 2 : 0);
    if (h === 0) continue;
    const top = p.sy - h / 2;
    if (!dc.labels.place(x - 2, top - 2, Math.max(nw, tw) + 6, h + 4, selected)) continue;
    let y = top;
    if (number && showSizes) {
      y += numSize * 0.9;
      ctx.font = `700 ${numSize}px ${dc.fonts.ui}`;
      haloText(ctx, number, x, y, p.snapshot.sizeStatus === 'EXPLICIT' ? '#ffffff' : '#e8e2d2', FACTION_DEEP[p.key], Math.max(3, numSize * 0.22));
      y += 2;
    }
    if (showName) {
      y += nameSize;
      ctx.font = `500 ${nameSize}px ${dc.fonts.ui}`;
      haloText(ctx, name, x, y, dc.theme.labelDim, dc.theme.halo, 3);
    }
  }
}

/**
 * Where a theatre's front runs between two groups of formations: the nearest
 * point of the held-ground seam to the midpoint between them, and the seam's
 * local direction there (simulation coordinates). Null when no seam is near.
 */
function seamAnchor(mx: number, my: number): { x: number; y: number; tx: number; ty: number } | null {
  const seams = getField()?.seams;
  if (!seams || seams.length === 0) return null;
  let best = -1;
  let bestD = 0.08;
  for (let i = 0; i < seams.length; i += 4) {
    const cx = (seams[i] + seams[i + 2]) / 2;
    const cy = (seams[i + 1] + seams[i + 3]) / 2;
    const d = Math.hypot(cx - mx, cy - my);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best < 0) return null;
  const ax = (seams[best] + seams[best + 2]) / 2;
  const ay = (seams[best + 1] + seams[best + 3]) / 2;
  // Local direction: segments near the anchor, oriented consistently and summed.
  let tx = 0;
  let ty = 0;
  for (let i = 0; i < seams.length; i += 4) {
    const cx = (seams[i] + seams[i + 2]) / 2;
    const cy = (seams[i + 1] + seams[i + 3]) / 2;
    if (Math.hypot(cx - ax, cy - ay) > 0.03) continue;
    let dx = seams[i + 2] - seams[i];
    let dy = seams[i + 3] - seams[i + 1];
    if (dx * tx + dy * ty < 0) {
      dx = -dx;
      dy = -dy;
    }
    tx += dx;
    ty += dy;
  }
  const len = Math.hypot(tx, ty);
  if (len < 1e-9) return null;
  return { x: ax, y: ay, tx: tx / len, ty: ty / len };
}

/**
 * Front strength, after the reference maps: one figure per side per active
 * front, white, bold, at a fixed size, placed on its own side of the front seam
 * and rotated along it, counting smoothly to each recorded value. Summed only
 * over the most specific formations on the map so no soldier is counted twice;
 * any unknown component is admitted with "+?".
 */
export function drawFrontStrength(dc: DrawContext, placed: PlacedForce[]): void {
  if (!dc.prefs.layers.armySizes || !dc.state || dc.zoom < 2.6) return;
  const { ctx } = dc;
  const size = Math.round(22 * dc.labelScale);
  for (const th of dc.data.theatres) {
    const live = dc.state.theatres[th.id];
    if (!live || live.status !== 'ACTIVE') continue;
    const here = placed.filter((p) => p.theatreId === th.id && !/DESTROYED|ANNIHILATED/i.test(p.snapshot.status));
    const sides = { empire: here.filter((p) => p.key === 'empire'), allied: here.filter((p) => p.key !== 'empire') };
    if (sides.empire.length === 0 || sides.allied.length === 0) continue;
    const centroid = (list: PlacedForce[]) => ({
      x: list.reduce((n, p) => n + p.sx, 0) / list.length,
      y: list.reduce((n, p) => n + p.sy, 0) / list.length,
      simX: list.reduce((n, p) => n + p.x, 0) / list.length,
      simY: list.reduce((n, p) => n + p.y, 0) / list.length,
    });
    const ce = centroid(sides.empire);
    const ca = centroid(sides.allied);
    // Anchor and direction: along the seam when there is one, else across the groups.
    const anchor = seamAnchor((ce.simX + ca.simX) / 2, (ce.simY + ca.simY) / 2);
    let ax = (ce.x + ca.x) / 2;
    let ay = (ce.y + ca.y) / 2;
    let angle = Math.atan2(ca.y - ce.y, ca.x - ce.x) + Math.PI / 2;
    if (anchor) {
      const a = dc.project(anchor.x, anchor.y);
      const b = dc.project(anchor.x + anchor.tx * 0.01, anchor.y + anchor.ty * 0.01);
      if (!a.occluded && !b.occluded) {
        ax = a.sx;
        ay = a.sy;
        angle = Math.atan2(b.sy - a.sy, b.sx - a.sx);
      }
    }
    while (angle > Math.PI / 2) angle -= Math.PI;
    while (angle < -Math.PI / 2) angle += Math.PI; // never upside down
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    for (const [sideKey, list, c] of [['empire', sides.empire, ce], ['allied', sides.allied, ca]] as const) {
      // A single formation already carries its own number; a total would repeat it.
      if (list.length < 2) continue;
      let total = 0;
      let unknown = false;
      let estimated = false;
      for (const p of list) {
        const shown = displayStrengthAt(dc.data, p.force.id, dc.frame);
        if (typeof shown === 'number' && p.snapshot.sizeStatus !== 'UNKNOWN') {
          total += shown;
          if (p.snapshot.sizeStatus !== 'EXPLICIT') estimated = true;
        } else unknown = true;
      }
      if (total === 0 && unknown) continue;
      const text = `${estimated ? '≈' : ''}${GROUP.format(total)}${unknown ? ' +?' : ''}`;
      // The side of the seam this group stands on.
      const sgn = (c.x - ax) * nx + (c.y - ay) * ny >= 0 ? 1 : -1;
      ctx.font = `700 ${size}px ${dc.fonts.ui}`;
      const w = textWidth(ctx, text);
      let ox = 0;
      let oy = 0;
      let ok = false;
      for (const k of [1.1, 1.8, 2.6]) {
        ox = ax + nx * sgn * size * k;
        oy = ay + ny * sgn * size * k;
        if (dc.labels.fits(ox - w / 2, oy - size, w, size * 1.7)) {
          ok = true;
          break;
        }
      }
      if (!ok) continue;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(angle);
      const key: ColorKey = sideKey === 'empire' ? 'empire' : list[0].key;
      ctx.globalAlpha = 0.95;
      haloText(ctx, text, -w / 2, size * 0.35, '#ffffff', FACTION_DEEP[key], Math.max(4, size * 0.2));
      ctx.font = `600 ${Math.round(9.5 * dc.labelScale)}px ${dc.fonts.mono}`;
      const cap = sideKey === 'empire' ? translate('{code} FRONT · EMPIRE', { code: th.code }) : translate('{code} FRONT · ALLIED', { code: th.code });
      const cw = textWidth(ctx, cap);
      haloText(ctx, cap, -cw / 2, size * 0.35 + 13, dc.theme.labelDim, dc.theme.halo, 3);
      ctx.restore();
      dc.labels.reserve(ox - w / 2, oy - size, w, size * 1.7);
    }
  }
}
