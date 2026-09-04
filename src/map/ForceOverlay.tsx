'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

import { simToLngLat } from '@/lib/coords';
import { compactQuantity, truncate } from '@/lib/format';
import { CONFIDENCE_ALPHA, FACTION_COLOR, FACTION_COLOR_PALE, INK, movementStyle } from '@/lib/palette';
import { useSimulation, type Selection } from '@/simulation/store';
import { forcePositionAt, forceSnapshotAt, forceTrail } from '@/simulation/resolver';
import type { Force, ForceSnapshot, Quantity } from '@/types/dataset';

interface Props {
  map: MapLibreMap | null;
}

interface Placed {
  forceId: string;
  force: Force;
  snapshot: ForceSnapshot;
  sx: number;
  sy: number;
  occluded: boolean;
  x: number;
  y: number;
  moving: boolean;
  heading: { dx: number; dy: number } | null;
  radius: number;
  color: string;
  visible: boolean;
  clustered: boolean;
}

const TRAIL_LOOKBACK = 900;

/**
 * Symbol size communicates scale without pretending to be proportional. A
 * linear radius would make 940,000 men a disc that covers a continent and 300
 * men invisible, so size steps through military echelons and the number itself
 * is written beside the symbol.
 */
function echelonRadius(strength: Quantity, zoom: number): number {
  const zoomScale = 0.75 + Math.min(1.6, zoom / 5);
  if (strength === 'UNKNOWN') return 7 * zoomScale;
  const n = strength;
  if (n >= 500_000) return 20 * zoomScale;
  if (n >= 100_000) return 16.5 * zoomScale;
  if (n >= 30_000) return 13.5 * zoomScale;
  if (n >= 5_000) return 11 * zoomScale;
  if (n >= 500) return 9 * zoomScale;
  return 7 * zoomScale;
}

function factionColor(faction: string): string {
  if (/eastern empire/i.test(faction)) return FACTION_COLOR.empire;
  if (/tempest/i.test(faction)) return FACTION_COLOR.tempest;
  if (/dwargon/i.test(faction)) return FACTION_COLOR.dwargon;
  if (/eurazania|western/i.test(faction)) return FACTION_COLOR.neutral;
  return FACTION_COLOR.unknown;
}

/** NATO-ish echelon ticks above the symbol: one per order of magnitude tier. */
function echelonTicks(strength: Quantity): number {
  if (strength === 'UNKNOWN') return 0;
  if (strength >= 500_000) return 5;
  if (strength >= 100_000) return 4;
  if (strength >= 30_000) return 3;
  if (strength >= 5_000) return 2;
  if (strength >= 500) return 1;
  return 0;
}

export function ForceOverlay({ map }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const placedRef = useRef<Placed[]>([]);
  const rafRef = useRef<number | null>(null);
  // The overlay repaints on demand, not on every animation frame. A paused map
  // with nothing live on it should cost nothing, so that the browser has the
  // main thread for the interface.
  const dirtyRef = useRef(true);
  const animatingRef = useRef(false);

  const data = useSimulation((s) => s.data);
  const clock = useSimulation((s) => s.clock);
  const layers = useSimulation((s) => s.layers);
  const selection = useSimulation((s) => s.selection);
  const hovered = useSimulation((s) => s.hovered);
  const commanderMode = useSimulation((s) => s.commanderMode);
  const showParents = useSimulation((s) => s.showParentFormations);
  const viewMode = useSimulation((s) => s.viewMode);
  const select = useSimulation((s) => s.select);
  const hover = useSimulation((s) => s.hover);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map || !data || !clock) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = map.getContainer().clientWidth;
    const height = map.getContainer().clientHeight;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const frame = clock.frame;
    const intFrame = Math.floor(frame);
    const zoom = map.getZoom();
    // Under globe projection a point on the far side of the sphere still
    // projects to a screen position. Round-tripping the projection tells us
    // whether the point is actually facing the camera; occluded points are not
    // drawn, so no formation appears through the planet.
    const globe = useSimulation.getState().globe;
    const project = (x: number, y: number) => {
      const { lng, lat } = simToLngLat(x, y);
      const p = map.project([lng, lat]);
      if (!globe) return { sx: p.x, sy: p.y, occluded: false };
      const back = map.unproject([p.x, p.y]);
      const drift = Math.abs(back.lng - lng) + Math.abs(back.lat - lat);
      return { sx: p.x, sy: p.y, occluded: drift > 0.75 };
    };
    const onScreen = (p: { sx: number; sy: number; occluded: boolean }, pad = 120) =>
      !p.occluded && p.sx > -pad && p.sy > -pad && p.sx < width + pad && p.sy < height + pad;

    const cinematic = viewMode !== 'standard';

    /* -- commander focus set ------------------------------------- */

    const commander = commanderMode ? data.commanderById.get(commanderMode) : null;
    const commanderForces = commander ? new Set(commander.forceIds) : null;

    /* -- place forces -------------------------------------------- */

    const placed: Placed[] = [];
    const drawnIds = new Set<string>();

    for (const force of data.forces) {
      const snapshot = forceSnapshotAt(data, force.id, intFrame);
      if (!snapshot) continue;
      const position = forcePositionAt(data, force.id, frame);
      if (!position) continue;
      drawnIds.add(force.id);
      const projected = project(position.x, position.y);
      placed.push({
        forceId: force.id,
        force,
        snapshot,
        sx: projected.sx,
        sy: projected.sy,
        occluded: projected.occluded,
        x: position.x,
        y: position.y,
        moving: position.moving,
        heading: position.heading,
        radius: echelonRadius(snapshot.strength, zoom),
        color: factionColor(force.faction),
        visible: true,
        clustered: false,
      });
    }

    // Several formations legitimately share one anchor: the dataset places a
    // whole corps and its divisions at the same named battlefield, because the
    // corpus names no finer position. Stacking them would hide all but one, so
    // co-located symbols are fanned around their shared anchor in a fixed
    // order. The fan is a drawing device: the underlying position is identical
    // for every formation in the cluster, and the dossier reports that.
    const clusters = new Map<string, Placed[]>();
    for (const p of placed) {
      const key = `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
      const list = clusters.get(key);
      if (list) list.push(p);
      else clusters.set(key, [p]);
    }
    for (const group of clusters.values()) {
      if (group.length < 2) continue;
      group.sort((a, b) => a.forceId.localeCompare(b.forceId));
      const spread = Math.max(...group.map((g) => g.radius)) * 1.9 + 6;
      const step = (Math.PI * 2) / group.length;
      group.forEach((p, i) => {
        const angle = -Math.PI / 2 + i * step;
        p.sx += Math.cos(angle) * spread;
        p.sy += Math.sin(angle) * spread;
        p.clustered = true;
      });
    }

    // Level of detail. At strategic zoom only formations whose children are not
    // on the map are drawn, so a parent and its children never both appear and
    // the same soldiers are never counted twice on screen.
    const suppressParents = !showParents && zoom < 5.2;
    for (const p of placed) {
      if (suppressParents && p.force.childIds.some((c) => drawnIds.has(c))) p.visible = false;
      if (commanderForces && !commanderForces.has(p.forceId)) p.visible = false;
    }

    placedRef.current = placed.filter((p) => p.visible && !p.occluded);

    /* -- trails --------------------------------------------------- */

    if (layers.trails) {
      ctx.save();
      ctx.lineCap = 'round';
      for (const p of placedRef.current) {
        const trail = forceTrail(data, p.forceId, frame, TRAIL_LOOKBACK);
        if (trail.length < 2) continue;
        ctx.beginPath();
        let started = false;
        for (const point of trail) {
          const q = project(point.x, point.y);
          if (q.occluded) continue;
          if (!started) {
            ctx.moveTo(q.sx, q.sy);
            started = true;
          } else ctx.lineTo(q.sx, q.sy);
        }
        if (!started) continue;
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    /* -- movement arrows ------------------------------------------ */

    if (layers.movement) {
      ctx.save();
      for (const movement of data.movements) {
        if (movement.startFrame === null) continue;
        if (intFrame < movement.startFrame) continue;
        const end = movement.endFrame ?? movement.startFrame;
        // A movement stays legible for a while after it completes, then fades.
        const age = intFrame - end;
        if (age > 220) continue;
        if (movement.destinationUnknown || !movement.fromPlaceId || !movement.toPlaceId) continue;
        const from = data.placeById.get(movement.fromPlaceId);
        const to = data.placeById.get(movement.toPlaceId);
        if (!from || !to || from.x == null || to.x == null) continue;

        const a = project(from.x, from.y!);
        const b = project(to.x, to.y!);
        if (!onScreen(a) && !onScreen(b)) continue;

        const span = Math.max(1, end - movement.startFrame);
        const progress = Math.min(1, Math.max(0, (frame - movement.startFrame) / span));
        const style = movementStyle(movement.type);
        const force = data.forceById.get(movement.forceId);
        const color = force ? factionColor(force.faction) : INK.textDim;

        ctx.globalAlpha = (age > 0 ? Math.max(0.15, 1 - age / 220) : 1) * (CONFIDENCE_ALPHA[movement.confidence] ?? 0.6);
        ctx.strokeStyle = color;
        ctx.lineWidth = style.width;
        ctx.setLineDash(style.dash);

        const hx = a.sx + (b.sx - a.sx) * progress;
        const hy = a.sy + (b.sy - a.sy) * progress;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.setLineDash([]);

        if (style.head !== 'none' && progress > 0.02) {
          drawHead(ctx, a.sx, a.sy, hx, hy, color, style.head);
        }
      }
      ctx.restore();
    }

    /* -- frontlines ----------------------------------------------- */

    if (layers.frontlines) {
      const state = useSimulation.getState().state;
      if (state) {
        ctx.save();
        for (const theatre of data.theatres) {
          const th = state.theatres[theatre.id];
          if (!th || th.status !== 'ACTIVE' || !theatre.anchor) continue;
          const opposed = placedRef.current.filter((p) => {
            const place = p.snapshot.placeId ? data.placeById.get(p.snapshot.placeId) : null;
            return place?.theatre === theatre.id;
          });
          const empire = opposed.filter((p) => /eastern empire/i.test(p.force.faction));
          const defenders = opposed.filter((p) => !/eastern empire/i.test(p.force.faction));
          if (empire.length === 0 || defenders.length === 0) continue;
          const mid = (list: Placed[]) => ({
            sx: list.reduce((n, p) => n + p.sx, 0) / list.length,
            sy: list.reduce((n, p) => n + p.sy, 0) / list.length,
          });
          const a = mid(empire);
          const b = mid(defenders);
          const cx = (a.sx + b.sx) / 2;
          const cy = (a.sy + b.sy) / 2;
          const dx = b.sx - a.sx;
          const dy = b.sy - a.sy;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const half = Math.max(38, len * 0.9);

          ctx.beginPath();
          ctx.moveTo(cx - nx * half, cy - ny * half);
          ctx.lineTo(cx + nx * half, cy + ny * half);
          ctx.strokeStyle = INK.brass;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 2;
          ctx.setLineDash([9, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
    }

    /* -- battles --------------------------------------------------- */

    if (layers.battles) {
      ctx.save();
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 620);
      for (const battle of data.battles) {
        if (intFrame < battle.startFrame || intFrame > battle.endFrame + 60) continue;
        const place = battle.placeId ? data.placeById.get(battle.placeId) : null;
        if (!place || place.x == null || place.y == null) continue;
        const projected = project(place.x, place.y);
        if (!onScreen(projected)) continue;
        const { sx, sy } = projected;
        const live = intFrame <= battle.endFrame;
        const critical = battle.significance === 'CRITICAL';
        const base = critical ? 26 : 19;
        const r = base + (live ? pulse * (critical ? 10 : 6) : 0);

        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.strokeStyle = INK.alert;
        ctx.globalAlpha = live ? 0.34 + pulse * 0.3 : 0.16;
        ctx.lineWidth = critical ? 2 : 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sx, sy, base * 0.42, 0, Math.PI * 2);
        ctx.globalAlpha = live ? 0.2 : 0.08;
        ctx.fillStyle = INK.alert;
        ctx.fill();
      }
      ctx.restore();
    }

    /* -- casualty markers ----------------------------------------- */

    if (layers.casualties) {
      ctx.save();
      for (const record of data.casualties) {
        if (record.frame === null || record.frame > intFrame) continue;
        const place = record.forceId
          ? data.placeById.get(forceSnapshotAt(data, record.forceId, record.frame)?.placeId ?? '')
          : null;
        if (!place || place.x == null || place.y == null) continue;
        const projectedCasualty = project(place.x, place.y);
        if (!onScreen(projectedCasualty)) continue;
        const { sx, sy } = projectedCasualty;
        const known = typeof record.kia === 'number' && record.kia > 0;
        const size = known ? Math.min(16, 5 + Math.log10(record.kia as number) * 2.4) : 6;
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = known ? INK.alert : INK.textFaint;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sx - size, sy - size);
        ctx.lineTo(sx + size, sy + size);
        ctx.moveTo(sx + size, sy - size);
        ctx.lineTo(sx - size, sy + size);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* -- events ---------------------------------------------------- */

    if (layers.events || layers.markers) {
      ctx.save();
      for (const event of data.events) {
        if (event.frame > intFrame) continue;
        const age = intFrame - event.frame;
        if (age > 260 && !(layers.markers && event.turningPoint)) continue;
        const place = event.placeId ? data.placeById.get(event.placeId) : null;
        if (!place || place.x == null || place.y == null) continue;
        const projectedEvent = project(place.x, place.y);
        if (!onScreen(projectedEvent)) continue;
        const { sx, sy } = projectedEvent;

        const turning = event.turningPoint && layers.markers;
        if (!turning && !layers.events) continue;
        const fade = age > 260 ? 0.5 : Math.max(0.25, 1 - age / 260);

        ctx.globalAlpha = turning ? Math.max(0.65, fade) : fade * 0.8;
        ctx.strokeStyle = turning ? INK.brass : INK.textDim;
        ctx.lineWidth = turning ? 1.6 : 1;
        const s = turning ? 7 : 4.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy - s);
        ctx.lineTo(sx + s, sy);
        ctx.lineTo(sx, sy + s);
        ctx.lineTo(sx - s, sy);
        ctx.closePath();
        ctx.stroke();

        if (turning && zoom > 3 && !cinematic) {
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = INK.brass;
          ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.fillText(String(event.turningPointRank), sx + s + 3, sy - s - 1);
        }
      }
      ctx.restore();
    }

    /* -- armies ---------------------------------------------------- */

    if (layers.armies) {
      // Largest formations are labelled first and reserve their space; smaller
      // ones give way. A dropped label is better than two illegible ones, and
      // the symbol itself always stays.
      const ordered = [...placedRef.current].sort((a, b) => b.radius - a.radius);
      const labelBoxes: { x: number; y: number; w: number; h: number }[] = [];
      for (const p of ordered) {
        if (!onScreen(p)) continue;
        const isSelected = selection.kind === 'force' && selection.id === p.forceId;
        const isHovered = hovered.kind === 'force' && hovered.id === p.forceId;
        drawForce(ctx, p, {
          zoom,
          selected: isSelected,
          hovered: isHovered,
          labels: layers.labels && !cinematic,
          forceLabel: isSelected || isHovered,
          labelBoxes,
        });
      }
    }

    /* -- commander posts ------------------------------------------ */

    if (layers.commanders) {
      ctx.save();
      for (const cmd of data.commanders) {
        if (cmd.startFrame === null || intFrame < cmd.startFrame) continue;
        if (cmd.endFrame !== null && intFrame > cmd.endFrame) continue;
        const forceId = cmd.forceIds[0];
        if (!forceId) continue;
        const pos = forcePositionAt(data, forceId, frame);
        if (!pos) continue;
        const projectedPost = project(pos.x, pos.y);
        if (!onScreen(projectedPost)) continue;
        const { sx, sy } = projectedPost;
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = INK.brass;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 16);
        ctx.lineTo(sx, sy - 26);
        ctx.lineTo(sx + 12, sy - 23);
        ctx.lineTo(sx, sy - 20);
        ctx.stroke();
      }
      ctx.restore();
    }

  }, [map, data, clock, layers, selection, hovered, commanderMode, showParents, viewMode]);

  // A battle pulse and a moving formation both need continuous repaint; a
  // paused campaign between events does not.
  const needsAnimation = useCallback((): boolean => {
    if (!data || !clock) return false;
    if (clock.isPlaying) return true;
    const frame = Math.floor(clock.frame);
    return data.battles.some((b) => frame >= b.startFrame && frame <= b.endFrame);
  }, [data, clock]);

  useEffect(() => {
    dirtyRef.current = true;
  }, [draw]);

  useEffect(() => {
    if (!map) return;
    const markDirty = () => {
      dirtyRef.current = true;
    };
    for (const event of ['move', 'zoom', 'rotate', 'pitch', 'resize', 'render']) {
      map.on(event, markDirty);
    }
    return () => {
      for (const event of ['move', 'zoom', 'rotate', 'pitch', 'resize', 'render']) {
        map.off(event, markDirty);
      }
    };
  }, [map]);

  useEffect(() => {
    const tick = () => {
      animatingRef.current = needsAnimation();
      if (dirtyRef.current || animatingRef.current) {
        dirtyRef.current = false;
        draw();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [draw, needsAnimation]);

  /* -- interaction -------------------------------------------------- */

  const hitTest = useCallback((clientX: number, clientY: number): Selection => {
    const canvas = canvasRef.current;
    if (!canvas) return { kind: 'none' };
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    let best: { id: string; d: number } | null = null;
    for (const p of placedRef.current) {
      const d = Math.hypot(p.sx - px, p.sy - py);
      if (d <= p.radius + 6 && (!best || d < best.d)) best = { id: p.forceId, d };
    }
    return best ? { kind: 'force', id: best.id } : { kind: 'none' };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map) return;

    const onMove = (event: PointerEvent) => {
      const hit = hitTest(event.clientX, event.clientY);
      canvas.style.cursor = hit.kind === 'none' ? '' : 'pointer';
      canvas.style.pointerEvents = hit.kind === 'none' ? 'none' : 'auto';
      const current = useSimulation.getState().hovered;
      if (JSON.stringify(current) !== JSON.stringify(hit)) hover(hit);
    };

    const onClick = (event: MouseEvent) => {
      const hit = hitTest(event.clientX, event.clientY);
      if (hit.kind !== 'none') {
        event.stopPropagation();
        select(hit);
      }
    };

    const container = map.getContainer();
    container.addEventListener('pointermove', onMove);
    container.addEventListener('click', onClick, true);
    return () => {
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('click', onClick, true);
    };
  }, [map, hitTest, hover, select]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10"
      aria-hidden="true"
    />
  );
}

/* ------------------------------------------------------------------ */

interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: LabelBox, b: LabelBox): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

function drawForce(
  ctx: CanvasRenderingContext2D,
  p: Placed,
  options: {
    zoom: number;
    selected: boolean;
    hovered: boolean;
    labels: boolean;
    forceLabel: boolean;
    labelBoxes: LabelBox[];
  },
): void {
  const { radius, sx, sy, color } = p;
  const strength = p.snapshot.strength;
  const destroyed = /DESTROY|ANNIHILAT/i.test(p.snapshot.status);
  const alpha = CONFIDENCE_ALPHA[p.snapshot.confidence] ?? 0.7;

  ctx.save();
  ctx.globalAlpha = destroyed ? alpha * 0.42 : alpha;

  // Body
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha *= 0.42;
  ctx.fill();
  ctx.globalAlpha = destroyed ? alpha * 0.5 : alpha;
  ctx.lineWidth = options.selected ? 2.4 : options.hovered ? 1.8 : 1.2;
  ctx.strokeStyle = options.selected || options.hovered ? FACTION_COLOR_PALE[colorKeyOf(color)] : color;
  ctx.stroke();

  // Strength unknown reads as a broken outline rather than a confident disc.
  if (strength === 'UNKNOWN') {
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(sx, sy, radius + 3.5, 0, Math.PI * 2);
    ctx.strokeStyle = INK.textFaint;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Echelon ticks
  const ticks = echelonTicks(strength);
  if (ticks > 0) {
    const spacing = 3.4;
    const top = sy - radius - 5.5;
    const startX = sx - ((ticks - 1) * spacing) / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < ticks; i += 1) {
      ctx.beginPath();
      ctx.moveTo(startX + i * spacing, top);
      ctx.lineTo(startX + i * spacing, top - 4);
      ctx.stroke();
    }
  }

  // Destroyed formations are struck through, not deleted: the record stands.
  if (destroyed) {
    ctx.beginPath();
    ctx.moveTo(sx - radius * 0.78, sy - radius * 0.78);
    ctx.lineTo(sx + radius * 0.78, sy + radius * 0.78);
    ctx.strokeStyle = INK.alert;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.75;
    ctx.stroke();
  }

  // Heading pip
  if (p.moving && p.heading) {
    const len = Math.hypot(p.heading.dx, p.heading.dy) || 1;
    const ux = p.heading.dx / len;
    const uy = p.heading.dy / len;
    ctx.beginPath();
    ctx.moveTo(sx + ux * (radius + 3), sy + uy * (radius + 3));
    ctx.lineTo(sx + ux * (radius + 10), sy + uy * (radius + 10));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
  }

  if (options.labels && (options.forceLabel || options.zoom > 3.4 || radius > 15)) {
    const label = truncate(p.force.formation, 30);
    ctx.font = '500 11px system-ui, -apple-system, Segoe UI, sans-serif';
    const width = ctx.measureText(label).width;
    const box: LabelBox = { x: sx + radius + 5, y: sy - 9, w: width + 4, h: 24 };
    const clear = options.forceLabel || !options.labelBoxes.some((other) => overlaps(box, other));
    if (clear) {
      options.labelBoxes.push(box);
      // A hairline plate keeps type legible over the busiest part of the atlas.
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = 'rgba(10,13,14,0.72)';
      ctx.fillRect(box.x - 2, box.y, box.w, box.h);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = INK.text;
      ctx.fillText(label, sx + radius + 6, sy + 1);
      ctx.font = '500 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = INK.textDim;
      ctx.fillText(compactQuantity(strength), sx + radius + 6, sy + 13);
    }
  }

  ctx.restore();
}

function colorKeyOf(color: string): 'empire' | 'tempest' | 'dwargon' | 'neutral' | 'unknown' {
  for (const [key, value] of Object.entries(FACTION_COLOR)) {
    if (value === color) return key as 'empire';
  }
  return 'unknown';
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  color: string,
  kind: 'arrow' | 'bar',
): void {
  const angle = Math.atan2(by - ay, bx - ax);
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  if (kind === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-9, -4.5);
    ctx.lineTo(-6.5, 0);
    ctx.lineTo(-9, 4.5);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 6);
    ctx.stroke();
  }
  ctx.restore();
}
