import { FACTION_COLOR, factionKey, INK } from '@/lib/palette';
import { BATTLE_TYPE_LABEL, PROVENANCE_LABEL } from '@/lib/taxonomy';
import { forcePositionAt } from '@/simulation/resolver';
import { eventVisible, haloText, isSelected, trimTo, type DrawContext } from '@/map/overlay/context';
import { drawBattleIcon } from '@/map/overlay/glyphs';
import type { PlacedForce } from '@/map/overlay/layers/forces';

const EVENT_WINDOW = 144; // an event marker stays a full simulated day, then fades
const BATTLE_LINGER = 72;

function placeXY(dc: DrawContext, id: string | null) {
  if (!id) return null;
  const p = dc.data.placeById.get(id) ?? dc.data.nationById.get(id);
  if (!p || p.x == null || p.y == null) return null;
  return { x: p.x, y: p.y };
}

export function drawBattles(dc: DrawContext): void {
  if (!dc.prefs.layers.battles) return;
  const { ctx, intFrame } = dc;
  for (const b of dc.data.battles) {
    if (dc.filters.hiddenTheatres.includes(b.theatreId) || dc.filters.hiddenProvenance.includes(b.provenance) || dc.filters.hiddenBattles.includes(b.id)) continue;
    const selected = isSelected(dc.selection, 'battle', b.id);
    if (!selected && (intFrame < b.startFrame || intFrame > b.endFrame + BATTLE_LINGER)) continue;
    const xy = placeXY(dc, b.placeId);
    if (!xy) continue;
    const p = dc.project(xy.x, xy.y);
    if (!dc.onScreen(p)) continue;
    const live = intFrame >= b.startFrame && intFrame <= b.endFrame;
    const critical = b.significance === 'CRITICAL';
    const size = (critical ? 22 : 17) * dc.markerScale;
    const pulse = live && !dc.reducedMotion ? 0.5 + 0.5 * Math.sin(dc.now / 520) : 0;
    ctx.save();
    ctx.globalAlpha = live ? 0.95 : 0.45;
    // Contact ring: steady, with a slow breath while the battle is live.
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, size * (1.05 + pulse * 0.18), 0, Math.PI * 2);
    ctx.strokeStyle = selected ? INK.accent : INK.alert;
    ctx.lineWidth = selected ? 2.4 : 1.4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(9,13,16,0.72)';
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, size * 0.78, 0, Math.PI * 2);
    ctx.fill();
    drawBattleIcon(ctx, b.type, p.sx, p.sy, size * 0.9, selected ? INK.accent : '#f2d7d2');
    ctx.restore();
    dc.labels.reserve(p.sx - size, p.sy - size, size * 2, size * 2);
    dc.hits.push({ selection: { kind: 'battle', id: b.id }, x: p.sx, y: p.sy, r: size + 4, title: b.name, detail: `${BATTLE_TYPE_LABEL[b.type]} · ${live ? 'in progress' : 'concluded'}`, provenance: b.provenance, priority: 2 });
    if (dc.prefs.layers.labels && (dc.zoom >= 4 || live || selected)) {
      const fs = Math.round(11.5 * dc.labelScale);
      ctx.font = `600 ${fs}px ${dc.fonts.ui}`;
      const text = trimTo(ctx, b.name, 220);
      const w = ctx.measureText(text).width;
      const x = p.sx - w / 2;
      const y = p.sy + size + fs + 2;
      if (dc.labels.place(x - 3, y - fs, w + 6, fs + 4, selected)) haloText(ctx, text, x, y, live ? dc.theme.battle : dc.theme.labelDim, dc.theme.halo, 3);
    }
  }
}

/* -- event markers: ring lifecycle (after the WWIII reference) -------- */

/** Real time, in ms, at which each event was reached on screen. */
const seenAt = new Map<string, number>();
let lastIntFrame = -1;
const POP = 110;
const TEXT_IN = 140;
const HOLD = 2200;
const TEXT_OUT = 160;
let eventAnimating = false;

/** True while any event marker is mid-animation, so the overlay keeps repainting. */
export function eventsAnimating(): boolean {
  return eventAnimating;
}

export function drawEvents(dc: DrawContext): void {
  if (!dc.prefs.layers.events) return;
  const { ctx, intFrame, now } = dc;
  // A seek backwards forgets what lies ahead, so it replays when reached again.
  if (intFrame < lastIntFrame) for (const e of dc.data.events) if (e.frame > intFrame) seenAt.delete(e.id);
  lastIntFrame = intFrame;
  const playing = Boolean(dc.playing);
  const s = 5.5 * dc.eventScale;
  const labelled: { e: (typeof dc.data.events)[number]; sx: number; sy: number; alpha: number }[] = [];
  eventAnimating = false;

  for (const e of dc.data.events) {
    if (e.frame > intFrame) break;
    if (!eventVisible(dc.filters, e)) continue;
    const age = intFrame - e.frame;
    const selected = isSelected(dc.selection, 'event', e.id);
    if (!seenAt.has(e.id)) seenAt.set(e.id, age <= 12 && playing ? now : now - 60_000);
    if (age > EVENT_WINDOW && !e.turningPoint && !selected) continue;
    const xy = placeXY(dc, e.placeId);
    if (!xy) continue;
    const p = dc.project(xy.x, xy.y);
    if (!dc.onScreen(p)) continue;

    const t = now - seenAt.get(e.id)!;
    const pop = dc.reducedMotion ? 1 : t < POP ? 1.4 - 0.4 * (t / POP) : 1;
    if (t < POP + TEXT_IN + HOLD + TEXT_OUT) eventAnimating = true;
    const fade = selected ? 1 : e.turningPoint && age > EVENT_WINDOW ? 0.6 : Math.max(0.35, 1 - age / EVENT_WINDOW);
    const r = (e.turningPoint ? s * 1.5 : s * 1.25) * (selected ? 1.25 : 1) * pop;

    ctx.save();
    ctx.globalAlpha = fade;
    // Dark centre, ring of short ticks: reads on light and dark ground alike.
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(12, 16, 18, 0.62)';
    ctx.fill();
    const ticks = 16;
    ctx.strokeStyle = selected || e.turningPoint ? '#f3d58d' : '#ffffff';
    ctx.lineWidth = Math.max(1.2, r * 0.16);
    ctx.lineCap = 'round';
    if (e.provenance === 'RECONSTRUCTED' || e.provenance === 'INFERRED') ctx.globalAlpha = fade * 0.75;
    for (let i = 0; i < ticks; i += 1) {
      if ((e.provenance === 'RECONSTRUCTED' || e.provenance === 'INFERRED') && i % 2) continue;
      const a = (i / ticks) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(p.sx + Math.cos(a) * r * 0.8, p.sy + Math.sin(a) * r * 0.8);
      ctx.lineTo(p.sx + Math.cos(a) * r * 1.15, p.sy + Math.sin(a) * r * 1.15);
      ctx.stroke();
    }
    if (e.turningPoint && dc.zoom > 3.2 && e.turningPointRank !== null) {
      ctx.font = `700 ${Math.round(10 * dc.labelScale)}px ${dc.fonts.mono}`;
      haloText(ctx, String(e.turningPointRank), p.sx + r + 3, p.sy - r, dc.theme.accent, dc.theme.halo, 3);
    }
    ctx.restore();
    dc.labels.reserve(p.sx - r, p.sy - r, r * 2, r * 2);
    dc.hits.push({ selection: { kind: 'event', id: e.id }, x: p.sx, y: p.sy, r: r + 5, title: e.title, detail: `${e.warDay} ${e.simulationTime} · ${PROVENANCE_LABEL[e.provenance].short}`, provenance: e.provenance, priority: 3 });

    // Label lifecycle: in after the pop, hold, out. Paused: the moment's events stay labelled.
    let alpha = 0;
    if (selected || (!playing && age <= 3)) alpha = 1;
    else if (t > POP && t < POP + TEXT_IN) alpha = (t - POP) / TEXT_IN;
    else if (t >= POP + TEXT_IN && t < POP + TEXT_IN + HOLD) alpha = 1;
    else if (t >= POP + TEXT_IN + HOLD && t < POP + TEXT_IN + HOLD + TEXT_OUT) alpha = 1 - (t - POP - TEXT_IN - HOLD) / TEXT_OUT;
    if (dc.reducedMotion && alpha > 0) alpha = 1;
    if (alpha > 0 && dc.prefs.layers.labels) labelled.push({ e, sx: p.sx + r + 6, sy: p.sy + 4, alpha });
  }

  // At most four event labels at once, newest first; the rest are in the feed.
  labelled.sort((a, b) => b.e.frame - a.e.frame);
  for (const l of labelled.slice(0, 4)) {
    const size = Math.round(12 * dc.labelScale);
    ctx.font = `600 ${size}px ${dc.fonts.ui}`;
    const text = trimTo(ctx, l.e.title, 260);
    const w = ctx.measureText(text).width;
    if (!dc.labels.place(l.sx - 2, l.sy - size, w + 4, size + 5)) continue;
    ctx.globalAlpha = l.alpha;
    haloText(ctx, text, l.sx, l.sy, dc.theme.label, dc.theme.halo, 3.5);
    ctx.globalAlpha = 1;
  }
}

/* -- character portraits ------------------------------------------- */

const portraitCache = new Map<string, HTMLImageElement>();
let onPortraitLoad: (() => void) | null = null;
export function setPortraitListener(fn: (() => void) | null): void {
  onPortraitLoad = fn;
}
function portrait(src: string): HTMLImageElement | null {
  let img = portraitCache.get(src);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = src;
    img.onload = () => onPortraitLoad?.();
    portraitCache.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** Photocards of the characters in the most recent events, at the event's place. */
export function drawCharacters(dc: DrawContext): void {
  if (!dc.prefs.layers.characters || dc.zoom < 3.4) return;
  const { ctx, intFrame } = dc;
  const size = Math.round(26 * dc.markerScale);
  const shown = new Set<string>();
  const recent = dc.data.events.filter((e) => e.frame <= intFrame && intFrame - e.frame <= 36 && eventVisible(dc.filters, e)).reverse();
  for (const e of recent) {
    const xy = placeXY(dc, e.placeId);
    if (!xy) continue;
    const p = dc.project(xy.x, xy.y);
    if (!dc.onScreen(p)) continue;
    const people = e.characterIds.filter((c) => !shown.has(c)).slice(0, 3);
    people.forEach((cid, i) => {
      const c = dc.data.characterById.get(cid);
      if (!c?.photocard) return;
      const img = portrait(c.photocard.src);
      const x = p.sx - ((people.length - 1) * (size + 4)) / 2 + i * (size + 4);
      const y = p.sy - size - 14;
      if (!dc.labels.place(x - size / 2, y - size / 2, size, size)) return;
      shown.add(cid);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = INK.surface2;
      ctx.fill();
      if (img) {
        ctx.save();
        ctx.clip();
        // Photocards are 11:17 portraits; crop to the head and shoulders.
        const w = size * 1.25;
        ctx.drawImage(img, x - w / 2, y - size * 0.55, w, (w * 17) / 11);
        ctx.restore();
      }
      ctx.lineWidth = isSelected(dc.selection, 'character', cid) ? 2.5 : 1.6;
      ctx.strokeStyle = isSelected(dc.selection, 'character', cid) ? INK.accent : FACTION_COLOR[factionKey(c.faction)];
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      dc.hits.push({ selection: { kind: 'character', id: cid }, x, y, r: size / 2 + 2, title: c.name, detail: `${c.faction} · ${e.title}`, priority: 0 });
    });
  }
}

/** Command posts: a pennant over the first formation of each commander in command. */
export function drawCommanders(dc: DrawContext): void {
  if (!dc.prefs.layers.commanders) return;
  const { ctx } = dc;
  for (const c of dc.data.commanders) {
    if (c.startFrame === null || dc.intFrame < c.startFrame || (c.endFrame !== null && dc.intFrame > c.endFrame)) continue;
    const fid = c.forceIds[0];
    if (!fid) continue;
    const pos = forcePositionAt(dc.data, fid, dc.frame);
    if (!pos) continue;
    const p = dc.project(pos.x, pos.y);
    if (!dc.onScreen(p)) continue;
    const color = FACTION_COLOR[factionKey(c.faction)];
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.sx - 14, p.sy - 8);
    ctx.lineTo(p.sx - 14, p.sy - 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.sx - 14, p.sy - 30);
    ctx.lineTo(p.sx - 2, p.sy - 26);
    ctx.lineTo(p.sx - 14, p.sy - 22);
    ctx.fill();
    if (dc.zoom >= 5 && dc.prefs.layers.labels) {
      ctx.font = `600 ${Math.round(10 * dc.labelScale)}px ${dc.fonts.ui}`;
      haloText(ctx, c.name, p.sx - 12, p.sy - 34, dc.theme.label, dc.theme.halo, 3);
    }
    ctx.restore();
    dc.hits.push({ selection: c.characterId ? { kind: 'character', id: c.characterId } : { kind: 'force', id: fid }, x: p.sx - 10, y: p.sy - 26, r: 9, title: c.name, detail: `${c.role} · ${c.faction}`, priority: 2 });
  }
}

/**
 * Schematic frontline between opposed formations of a live theatre. The source
 * supports theatre-level contact only, so this is drawn as a short dashed
 * contact mark, never as a surveyed line.
 */
export function drawFrontlines(dc: DrawContext, placed: PlacedForce[]): void {
  if (!dc.prefs.layers.frontlines || !dc.state) return;
  const { ctx } = dc;
  for (const th of dc.data.theatres) {
    const live = dc.state.theatres[th.id];
    if (!live || live.status !== 'ACTIVE') continue;
    const here = placed.filter((p) => p.theatreId === th.id);
    const empire = here.filter((p) => p.key === 'empire');
    const other = here.filter((p) => p.key !== 'empire');
    if (!empire.length || !other.length) continue;
    const c = (l: PlacedForce[]) => ({ x: l.reduce((n, p) => n + p.sx, 0) / l.length, y: l.reduce((n, p) => n + p.sy, 0) / l.length });
    const a = c(empire);
    const b = c(other);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const half = Math.max(30, Math.min(140, len * 0.8));
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#f1efe8';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.moveTo(mx - nx * half, my - ny * half);
    ctx.lineTo(mx + nx * half, my + ny * half);
    ctx.stroke();
    ctx.setLineDash([]);
    // Teeth point at the side doing the attacking: the Empire's side.
    for (let t = -half; t <= half; t += 18) {
      const px = mx + nx * t;
      const py = my + ny * t;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - (dx / len) * 5, py - (dy / len) * 5);
      ctx.stroke();
    }
    ctx.restore();
  }
}
