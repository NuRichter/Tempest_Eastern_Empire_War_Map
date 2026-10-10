'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

import { simToLngLat } from '@/lib/coords';
import { PROVENANCE_LABEL } from '@/lib/taxonomy';
import { MAP_THEME } from '@/lib/palette';
import { useSimulation } from '@/simulation/store';
import { prefersReducedMotion, SCALE_FACTOR, usePreferences } from '@/state/preferences';
import { LabelLayout, type DrawContext, type Hit } from '@/map/overlay/context';
import { drawGeographyLabels } from '@/map/overlay/layers/geography';
import { drawSettlements } from '@/map/overlay/layers/settlements';
import { drawForces, drawFrontStrength, drawTrails, placeForces } from '@/map/overlay/layers/forces';
import { drawMovements } from '@/map/overlay/layers/movements';
import { drawBattles, drawCharacters, drawCommanders, drawEvents, drawFrontlines, eventsAnimating, setPortraitListener } from '@/map/overlay/layers/incidents';
import { drawControlChangeLabels, drawFronts, makeProjector } from '@/map/overlay/layers/fronts';
import { onField } from '@/map/field/fieldStore';
import { useI18n, useT } from '@/i18n';
import { is3DActive } from '@/state/view3d';
import { pixelRatioFor, useQuality } from '@/perf/quality';

interface Props {
  map: MapLibreMap | null;
}

function cssFont(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

/**
 * The war layer: everything that moves with the clock, drawn on one canvas
 * above the map. It repaints only when something changed (the clock moved, the
 * camera moved, a preference changed, or an animation is live), so a paused
 * atlas costs nothing.
 */
export function Overlay({ map }: Props) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitsRef = useRef<Hit[]>([]);
  const dirtyRef = useRef(true);
  // Read once, not per frame: getComputedStyle and clientWidth force style and layout.
  const sizeRef = useRef({ w: 0, h: 0 });
  const fontsRef = useRef<{ ui: string; mono: string } | null>(null);
  const [tip, setTip] = useState<{ hit: Hit; x: number; y: number } | null>(null);

  const select = useSimulation((s) => s.select);
  const hover = useSimulation((s) => s.hover);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map) return;
    const sim = useSimulation.getState();
    const prefs = usePreferences.getState();
    const { data, clock } = sim;
    if (!data || !clock) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = pixelRatioFor(useQuality.getState().level);
    if (!sizeRef.current.w) sizeRef.current = { w: map.getContainer().clientWidth, h: map.getContainer().clientHeight };
    const { w: width, h: height } = sizeRef.current;
    fontsRef.current ??= { ui: cssFont('--font-ui', 'system-ui, sans-serif'), mono: cssFont('--font-mono', 'ui-monospace, monospace') };
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.textBaseline = 'alphabetic';

    const globe = prefs.globe;
    const project = (x: number, y: number) => {
      const { lng, lat } = simToLngLat(x, y);
      const p = map.project([lng, lat]);
      if (!globe) return { sx: p.x, sy: p.y, occluded: false };
      // On a globe, a point behind the planet still projects; round-trip to
      // find out whether it faces the camera.
      const back = map.unproject([p.x, p.y]);
      return { sx: p.x, sy: p.y, occluded: Math.abs(back.lng - lng) + Math.abs(back.lat - lat) > 0.75 };
    };
    const onScreen = (p: { sx: number; sy: number; occluded: boolean }, pad = 80) =>
      !p.occluded && p.sx > -pad && p.sy > -pad && p.sx < width + pad && p.sy < height + pad;

    const dc: DrawContext = {
      ctx, data,
      frame: clock.frame,
      intFrame: Math.floor(clock.frame),
      state: sim.state,
      zoom: map.getZoom(),
      width, height, prefs,
      filters: sim.filters,
      selection: sim.selection,
      hovered: sim.hovered,
      commanderFocus: sim.commanderFocus,
      cinematic: sim.viewMode === 'cinematic',
      reducedMotion: prefersReducedMotion(),
      theme: MAP_THEME[prefs.theme],
      globe,
      playing: clock.isPlaying,
      now: performance.now(),
      fonts: fontsRef.current,
      labelScale: SCALE_FACTOR[prefs.labelScale],
      markerScale: SCALE_FACTOR[prefs.markerScale],
      eventScale: SCALE_FACTOR[prefs.eventMarkerScale],
      project, onScreen,
      labels: new LabelLayout(),
      hits: [],
    };

    // Keep labels out from under the map chrome: the tool strip, the minimap
    // and style switcher (bottom left) and the navigation stack (bottom right).
    if (!dc.cinematic) {
      dc.labels.reserve(0, 0, 52, height);
      if (width >= 768) dc.labels.reserve(0, height - (prefs.showMinimap ? 196 : 76), 216, height);
      dc.labels.reserve(width - 52, height - 300, 52, 300);
    }

    // Draw order is the visual hierarchy: territory context, then routes,
    // then incidents, then formations and their strength on top.
    const placed = prefs.layers.forces ? placeForces(dc) : [];
    drawFronts(dc, makeProjector(map, globe, project));
    drawSettlements(dc);
    drawTrails(dc, placed);
    drawMovements(dc);
    drawFrontlines(dc, placed);
    drawEvents(dc);
    drawBattles(dc);
    if (prefs.layers.forces) drawForces(dc, placed);
    drawFrontStrength(dc, placed);
    drawCommanders(dc);
    drawCharacters(dc);
    drawControlChangeLabels(dc);
    drawGeographyLabels(dc);

    hitsRef.current = dc.hits;
  }, [map]);

  /* -- repaint scheduling ------------------------------------------ */

  useEffect(() => {
    if (!map) return;
    const mark = () => {
      dirtyRef.current = true;
    };
    const events = ['move', 'zoom', 'rotate', 'pitch', 'resize'] as const;
    for (const e of events) map.on(e, mark);
    const unsubSim = useSimulation.subscribe(mark);
    const unsubPrefs = usePreferences.subscribe(mark);
    const unsubQuality = useQuality.subscribe(mark);
    setPortraitListener(mark);
    const unsubField = onField(mark);
    // Canvas labels are translated at draw time: repaint when the language loads.
    const unsubI18n = useI18n.subscribe(mark);
    const fontsReady = document.fonts?.ready.then(() => {
      fontsRef.current = null;
      mark();
    });
    void fontsReady;
    const ro = new ResizeObserver(() => {
      sizeRef.current = { w: map.getContainer().clientWidth, h: map.getContainer().clientHeight };
      mark();
    });
    ro.observe(map.getContainer());

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      // Hidden under the 3D view: nothing to draw until it closes.
      if (is3DActive()) {
        dirtyRef.current = true;
        return;
      }
      const sim = useSimulation.getState();
      const clock = sim.clock;
      const frame = clock ? Math.floor(clock.frame) : 0;
      // Live animation only while playing or while a battle is in progress.
      const live = Boolean(clock?.isPlaying) || eventsAnimating() || (!prefersReducedMotion() && Boolean(sim.data?.battles.some((b) => frame >= b.startFrame && frame <= b.endFrame)));
      if (dirtyRef.current || live) {
        dirtyRef.current = false;
        draw();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      for (const e of events) map.off(e, mark);
      unsubSim();
      unsubPrefs();
      unsubQuality();
      unsubField();
      unsubI18n();
      ro.disconnect();
      setPortraitListener(null);
    };
  }, [map, draw]);

  /* -- interaction --------------------------------------------------- */

  const hitTest = useCallback((clientX: number, clientY: number): Hit | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    let best: { hit: Hit; score: number } | null = null;
    for (const hit of hitsRef.current) {
      const d = Math.hypot(hit.x - px, hit.y - py);
      if (d > hit.r) continue;
      const score = hit.priority * 100 + d;
      if (!best || score < best.score) best = { hit, score };
    }
    return best?.hit ?? null;
  }, []);

  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    let lastKey = '';
    const onMove = (event: PointerEvent) => {
      if (event.buttons) return;
      const hit = hitTest(event.clientX, event.clientY);
      const key = hit ? `${hit.selection.kind}:${hit.selection.id}` : '';
      container.style.cursor = hit ? 'pointer' : '';
      if (key !== lastKey) {
        lastKey = key;
        hover(hit ? hit.selection : { kind: 'none' });
      }
      if (hit) {
        const rect = container.getBoundingClientRect();
        setTip({ hit, x: event.clientX - rect.left, y: event.clientY - rect.top });
      } else setTip(null);
    };
    const onLeave = () => {
      setTip(null);
      hover({ kind: 'none' });
      lastKey = '';
    };
    const onClick = (event: MouseEvent) => {
      const hit = hitTest(event.clientX, event.clientY);
      if (hit) {
        event.stopPropagation();
        const s = useSimulation.getState();
        if (hit.selection.kind === 'event') s.jumpToEvent(hit.selection.id, { seek: false });
        else select(hit.selection);
        return;
      }
      // Nothing drawn under the pointer: a click on land selects its territory.
      const rect = container.getBoundingClientRect();
      const features = map.queryRenderedFeatures([event.clientX - rect.left, event.clientY - rect.top], { layers: ['territory-fill'] });
      const id = features[0]?.properties?.id as string | undefined;
      if (id) select({ kind: 'territory', id });
    };
    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerleave', onLeave);
    container.addEventListener('click', onClick, true);
    return () => {
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerleave', onLeave);
      container.removeEventListener('click', onClick, true);
    };
  }, [map, hitTest, hover, select]);

  return (
    <>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-10" aria-hidden="true" />
      {tip ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-30 max-w-[18rem] rounded-[3px] border border-ink-500 bg-ink-900/95 px-2.5 py-1.5 shadow-panel"
          style={{ left: Math.min(tip.x + 14, (map?.getContainer().clientWidth ?? 800) - 300), top: tip.y + 14 }}
        >
          <p className="text-sm font-semibold leading-snug text-fg">{tip.hit.title}</p>
          <p className="mt-0.5 text-xs leading-snug text-fg-2">{tip.hit.detail}</p>
          {tip.hit.provenance ? <p className="mt-1 text-2xs uppercase tracking-label text-fg-3">{t(PROVENANCE_LABEL[tip.hit.provenance].long)}</p> : null}
        </div>
      ) : null}
    </>
  );
}
