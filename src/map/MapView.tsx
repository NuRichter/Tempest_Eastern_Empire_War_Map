'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { atlasBounds, atlasCorners, campaignBounds, lngLatToSim, ringToLngLat, simBoundsToLngLat, simToLngLatTuple } from '@/lib/coords';
import { controlKey, FACTION_COLOR, factionKey, INK, MAP_THEME, mix, ROLE_FILL_WEIGHT } from '@/lib/palette';
import { CANVAS_H, CANVAS_W, computeField, FULL_WINDOW, loadFront, paintField, type FieldWindow } from '@/map/field/occupation';
import { setField } from '@/map/field/fieldStore';
import { territoryControlAt } from '@/simulation/resolver';
import { useSimulation } from '@/simulation/store';
import { prefersReducedMotion, usePreferences } from '@/state/preferences';
import { Overlay } from '@/map/overlay/Overlay';
import { MapControls } from '@/map/MapControls';
import { Minimap } from '@/map/Minimap';
import { translate, useT } from '@/i18n';
import type { Dataset } from '@/data/loader';
import type { FrameState } from '@/types/dataset';

const BASE_MAP_URL = '/maps/base-map.png';
const MYTH_MAP_URL = '/maps/myth-map.jpg';

const SEA = '#0b1419';

/**
 * Base style. No tile server and no API key: two images of one fictional world
 * (Base Map and Myth Map, sharing one 2641 x 2035 frame), with the political
 * geometry traced from the Base Map drawn on top as vector layers.
 */
function baseStyle(): StyleSpecification {
  const empty = { type: 'geojson' as const, data: { type: 'FeatureCollection' as const, features: [] } };
  return {
    version: 8,
    name: 'Tempest campaign atlas',
    sources: {
      base: { type: 'image', url: BASE_MAP_URL, coordinates: atlasCorners() },
      myth: { type: 'image', url: MYTH_MAP_URL, coordinates: atlasCorners() },
      territories: empty,
      areas: empty,
      grid: empty,
    },
    layers: [
      { id: 'void', type: 'background', paint: { 'background-color': SEA } },
      {
        id: 'base-raster',
        type: 'raster',
        source: 'base',
        paint: { 'raster-opacity': 1, 'raster-fade-duration': 0, 'raster-opacity-transition': { duration: 600 } },
      },
      {
        id: 'myth-raster',
        type: 'raster',
        source: 'myth',
        paint: { 'raster-opacity': 0, 'raster-fade-duration': 0, 'raster-opacity-transition': { duration: 600 } },
      },
      {
        id: 'territory-fill',
        type: 'fill',
        source: 'territories',
        paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': ['get', 'opacity'], 'fill-antialias': true },
      },
      {
        id: 'territory-hatch',
        type: 'fill',
        source: 'territories',
        filter: ['==', ['get', 'hatch'], true],
        paint: { 'fill-pattern': 'hatch-light', 'fill-opacity': 0.55 },
      },
      {
        id: 'area-fill',
        type: 'fill',
        source: 'areas',
        paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': ['get', 'opacity'] },
      },
      {
        id: 'area-hatch',
        type: 'fill',
        source: 'areas',
        filter: ['==', ['get', 'hatch'], true],
        paint: { 'fill-pattern': 'hatch-contested', 'fill-opacity': 0.45 },
      },
      {
        id: 'territory-line',
        type: 'line',
        source: 'territories',
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'line'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 4, 1.2, 7, 2.2],
          'line-opacity': 0.8,
        },
      },
      {
        id: 'territory-selected',
        type: 'line',
        source: 'territories',
        filter: ['==', ['get', 'selected'], true],
        layout: { 'line-join': 'round' },
        paint: { 'line-color': INK.accent, 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 1.4, 6, 3] },
      },
      {
        id: 'territory-recon',
        type: 'line',
        source: 'territories',
        filter: ['==', ['get', 'reconstructed'], true],
        layout: { 'line-join': 'round' },
        paint: { 'line-color': INK.accent, 'line-width': 2, 'line-dasharray': [2, 2] },
      },
      {
        id: 'area-line',
        type: 'line',
        source: 'areas',
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'line'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.8, 7, 2],
          'line-opacity': 0.85,
          'line-dasharray': [3, 2],
        },
      },
      {
        id: 'grid-line',
        type: 'line',
        source: 'grid',
        layout: { visibility: 'none' },
        paint: { 'line-color': INK.text3, 'line-width': 0.5, 'line-opacity': 0.35 },
      },
    ],
  };
}

/** Simulation grid: 10% steps in simulation space. Not a geographic graticule. */
function gridFeatures(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (let i = 0; i <= 10; i += 1) {
    const t = i / 10;
    const v: [number, number][] = [];
    const h: [number, number][] = [];
    for (let s = 0; s <= 40; s += 1) {
      v.push(simToLngLatTuple(t, s / 40));
      h.push(simToLngLatTuple(s / 40, t));
    }
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: v } });
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: h } });
  }
  return { type: 'FeatureCollection', features };
}

/** Diagonal hatch, drawn once into an image so MapLibre can tile it. */
function hatchImage(color: string, background: string | null, size = 12, width = 2): { width: number; height: number; data: Uint8Array } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let o = -size; o <= size * 2; o += size / 2) {
    ctx.moveTo(o, size);
    ctx.lineTo(o + size, 0);
  }
  ctx.stroke();
  const img = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: new Uint8Array(img.data.buffer) };
}

/* ------------------------------------------------------------------ */
/* Geometry for one frame                                              */
/* ------------------------------------------------------------------ */

function territoryFeatures(data: Dataset, frame: number, selectedId: string | null): GeoJSON.FeatureCollection {
  const prefs = usePreferences.getState();
  const features: GeoJSON.Feature[] = [];
  for (const t of data.territories) {
    const { segment, previous, transition } = territoryControlAt(t, frame);
    const theme = MAP_THEME[prefs.theme];
    const hiddenNation = t.nationId ? useSimulation.getState().filters.hiddenNations.includes(t.nationId) : false;
    const hiddenTerritory = useSimulation.getState().filters.hiddenTerritories.includes(t.id);
    // A whole territory changing its part in the war is the one change the
    // reference maps crossfade (a country joining a side): a short linear blend
    // of colour and weight. Ground changing hands is the held-ground layer.
    const look = (s: typeof segment) => {
      if (s.role === 'UNINVOLVED') return { fill: theme.uninvolvedFill, opacity: theme.uninvolvedOpacity };
      const weight = s.status === 'UNKNOWN' ? 0.25 : ROLE_FILL_WEIGHT[s.role] ?? 0.12;
      return { fill: s.status === 'UNKNOWN' ? FACTION_COLOR.unknown : FACTION_COLOR[factionKey(s.controller)], opacity: prefs.territoryOpacity * weight };
    };
    const now = look(segment);
    let fill = now.fill;
    let opacity = now.opacity;
    if (previous && transition < 1) {
      const was = look(previous);
      fill = mix(was.fill, now.fill, transition);
      opacity = was.opacity + (now.opacity - was.opacity) * transition;
    }
    const uninvolved = segment.role === 'UNINVOLVED' && transition >= 1;
    features.push({
      type: 'Feature',
      id: t.id,
      properties: {
        id: t.id,
        fill,
        opacity: hiddenNation || hiddenTerritory ? 0 : opacity,
        line: uninvolved ? theme.border : prefs.theme === 'documentary' ? theme.border : mix(fill, '#ffffff', 0.25),
        reconstructed: Boolean(previous && transition < 1 && segment.provenance !== 'CANONICAL'),
        hatch: segment.status === 'UNKNOWN',
        selected: selectedId === t.id,
      },
      geometry: { type: 'MultiPolygon', coordinates: t.geometry.coordinates.map((poly) => [ringToLngLat(poly[0])]) },
    });
  }
  return { type: 'FeatureCollection', features };
}

function areaFeatures(data: Dataset, state: FrameState | null): GeoJSON.FeatureCollection {
  const prefs = usePreferences.getState();
  const features: GeoJSON.Feature[] = [];
  if (!state) return { type: 'FeatureCollection', features };
  for (const theatre of data.theatres) {
    if (!theatre.area) continue;
    const th = state.theatres[theatre.id];
    if (!th || (th.status === 'INACTIVE' && !th.control)) continue;
    const key = controlKey(th.control);
    if (key === null) continue;
    const contested = key === 'contested';
    const color = contested ? INK.accent : FACTION_COLOR[key];
    features.push({
      type: 'Feature',
      properties: {
        id: theatre.id,
        fill: color,
        opacity: contested ? prefs.territoryOpacity * 0.35 : prefs.territoryOpacity * 0.55,
        line: color,
        hatch: contested,
      },
      geometry: { type: 'MultiPolygon', coordinates: theatre.area.coordinates.map((poly) => [ringToLngLat(poly[0])]) },
    });
  }
  return { type: 'FeatureCollection', features };
}

/* ------------------------------------------------------------------ */

export function MapView() {
  const t = useT();
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const state = useSimulation((s) => s.state);
  const camera = useSimulation((s) => s.camera);
  const selection = useSimulation((s) => s.selection);

  const mapStyle = usePreferences((s) => s.mapStyle);
  const theme = usePreferences((s) => s.theme);
  const globe = usePreferences((s) => s.globe);
  const layers = usePreferences((s) => s.layers);
  const territoryOpacity = usePreferences((s) => s.territoryOpacity);
  const borderOpacity = usePreferences((s) => s.borderOpacity);
  const railOpen = usePreferences((s) => s.railOpen);
  const panelOpen = usePreferences((s) => s.panelOpen);

  /* -- create ------------------------------------------------------ */

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: container.current,
        style: baseStyle(),
        bounds: campaignBounds(),
        fitBoundsOptions: { padding: 40 },
        minZoom: 1,
        maxZoom: 8.5,
        maxPitch: 60,
        attributionControl: false,
        renderWorldCopies: false,
        dragRotate: true,
        pitchWithRotate: false,
        cooperativeGestures: false,
      });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : translate('The map could not start.'));
      return;
    }
    // Calmer than the defaults: a wheel notch is a deliberate step, not a leap.
    map.scrollZoom.setWheelZoomRate(1 / 600);
    map.scrollZoom.setZoomRate(1 / 140);
    map.keyboard.enable();
    mapRef.current = map;
    // Exposed for browser QA, which inspects the camera and style directly.
    (window as unknown as { __atlasMap?: MapLibreMap }).__atlasMap = map;

    map.on('load', () => {
      map.addImage('hatch-light', hatchImage('rgba(200,206,209,0.55)', null));
      map.addImage('hatch-contested', hatchImage('rgba(212,171,87,0.75)', null, 10, 2));
      // Open on the campaign, framed inside the panels rather than behind them.
      const narrow = window.innerWidth < 1024;
      const prefs = usePreferences.getState();
      map.fitBounds(campaignBounds(), {
        duration: 0,
        padding: { top: 40, bottom: 40, left: narrow || !prefs.railOpen ? 60 : 360, right: narrow || !prefs.panelOpen ? 40 : 400 },
      });
      const grid = map.getSource('grid');
      if (grid && 'setData' in grid) (grid as maplibregl.GeoJSONSource).setData(gridFeatures());
      setReady(true);
    });
    map.on('error', (event) => {
      console.error('[map]', event.error?.message ?? event);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  /* -- map style & tone ------------------------------------------- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const dark = theme === 'warroom';
    map.setPaintProperty('base-raster', 'raster-opacity', mapStyle === 'base' ? 1 : 0);
    map.setPaintProperty('myth-raster', 'raster-opacity', mapStyle === 'myth' ? 1 : 0);
    // The war-room treatment darkens the Base Map so faction colour carries the
    // information; the Myth Map keeps its own painted colours, slightly dimmed.
    map.setPaintProperty('base-raster', 'raster-brightness-max', dark ? 0.3 : 1);
    map.setPaintProperty('base-raster', 'raster-brightness-min', dark ? 0.04 : 0);
    map.setPaintProperty('base-raster', 'raster-saturation', dark ? -0.35 : -0.25);
    map.setPaintProperty('base-raster', 'raster-contrast', dark ? 0.15 : 0);
    map.setPaintProperty('myth-raster', 'raster-brightness-max', dark ? 0.78 : 1);
    map.setPaintProperty('myth-raster', 'raster-saturation', dark ? -0.15 : 0);
    map.setPaintProperty('void', 'background-color', mapStyle === 'myth' ? '#100c08' : MAP_THEME[theme].void);
    map.setPaintProperty('territory-line', 'line-width', ['interpolate', ['linear'], ['zoom'], 1, dark ? 0.6 : 0.5, 4, dark ? 1.2 : 0.9, 7, dark ? 2.2 : 1.6]);
  }, [mapStyle, theme, ready]);

  /* -- projection ---------------------------------------------------- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    try {
      map.setProjection({ type: globe ? 'globe' : 'mercator' });
      map.setMaxBounds(globe ? null : (padBounds(atlasBounds(), 0.15) as maplibregl.LngLatBoundsLike));
    } catch {
      setFailure(null);
    }
  }, [globe, ready]);

  /* -- territories and operational areas ---------------------------- */

  const selectedTerritory =
    selection.kind === 'territory'
      ? selection.id
      : selection.kind === 'nation'
        ? (data?.nationById.get(selection.id)?.territoryId ?? null)
        : null;

  // Recompute only when the integer frame (or a dependency) changes. During a
  // control transition the frame advances anyway, so the blend animates.
  // Re-tiling GeoJSON is the most expensive thing the map does, so the sources
  // are only updated when what they draw actually changes: a control segment,
  // a step of a transition, the selection, or the opacity.
  const territoryKey = data
    ? data.territories
        .map((t) => {
          const c = territoryControlAt(t, frame);
          return `${t.control.indexOf(c.segment)}:${Math.round(c.transition * 12)}`;
        })
        .join('|')
    : '';
  const territoryFilterKey = useSimulation((s) => `${s.filters.hiddenNations.join(',')}|${s.filters.hiddenTerritories.join(',')}`);
  const areaKey = state ? data?.theatres.map((t) => `${state.theatres[t.id]?.status}:${state.theatres[t.id]?.control}`).join('|') ?? '' : '';

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !data) return;
    const src = map.getSource('territories') as maplibregl.GeoJSONSource | undefined;
    src?.setData(territoryFeatures(data, useSimulation.getState().frame, selectedTerritory));
  }, [data, territoryKey, ready, selectedTerritory, territoryOpacity, theme, territoryFilterKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !data) return;
    const src = map.getSource('areas') as maplibregl.GeoJSONSource | undefined;
    src?.setData(areaFeatures(data, useSimulation.getState().state));
  }, [data, areaKey, ready, territoryOpacity]);

  /* -- synthesised occupation (RECONSTRUCTED) ----------------------- */

  const fieldCanvas = useRef<HTMLCanvasElement | null>(null);
  const occupationOn = layers.occupation;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!fieldCanvas.current) {
      fieldCanvas.current = document.createElement('canvas');
      fieldCanvas.current.width = CANVAS_W;
      fieldCanvas.current.height = CANVAS_H;
    }
    if (!map.getSource('occupation')) {
      map.addSource('occupation', { type: 'canvas', canvas: fieldCanvas.current, coordinates: atlasCorners(), animate: false });
      map.addLayer(
        { id: 'occupation', type: 'raster', source: 'occupation', paint: { 'raster-resampling': 'linear', 'raster-fade-duration': 0, 'raster-opacity': 1 } },
        'area-fill',
      );
    }
  }, [ready]);

  // Held ground follows the continuous clock: re-evaluated on animation frames
  // whenever T moves (at most ~30 times a second), frozen when it does not.
  // The history is precomputed, so a frame costs one field evaluation and one
  // canvas paint; the same T always gives the same picture (scrub = play).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !data) return;
    if (!occupationOn) {
      setField(null);
      if (map.getLayer('occupation')) map.setLayoutProperty('occupation', 'visibility', 'none');
      return;
    }
    let raf = 0;
    let cancelled = false;
    let lastT = -1;
    let lastPaint = 0;
    let lastTheme = '';
    let lastWin = '';
    let pauseTimer = 0;
    // The paint window follows the view (with a margin), so the canvas spends
    // its pixels where the reader looks and the front stays crisp at any zoom.
    const viewWindow = (): FieldWindow => {
      if (map.getProjection()?.type === 'globe') return FULL_WINDOW;
      const b = map.getBounds();
      const a = lngLatToSim(b.getWest(), b.getNorth());
      const c = lngLatToSim(b.getEast(), b.getSouth());
      const mx = (c.x - a.x) * 0.25;
      const my = (c.y - a.y) * 0.25;
      const q = (v: number) => Math.round(v * 512) / 512;
      const win = { x0: q(Math.max(0, a.x - mx)), y0: q(Math.max(0, a.y - my)), x1: q(Math.min(1, c.x + mx)), y1: q(Math.min(1, c.y + my)) };
      if (win.x1 - win.x0 > 0.85 || win.x1 <= win.x0 || win.y1 <= win.y0) return FULL_WINDOW;
      return win;
    };
    const src = () => map.getSource('occupation') as maplibregl.CanvasSource | undefined;
    void loadFront().then((front) => {
      if (cancelled) return;
      if (!front) {
        if (map.getLayer('occupation')) map.setLayoutProperty('occupation', 'visibility', 'none');
        return;
      }
      if (map.getLayer('occupation')) map.setLayoutProperty('occupation', 'visibility', 'visible');
      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        const clock = useSimulation.getState().clock;
        const T = clock ? clock.frame : 0;
        const { theme, transitionBelt: belt } = usePreferences.getState();
        const win = viewWindow();
        const winKey = `${win.x0},${win.y0},${win.x1},${win.y1}`;
        if (Math.abs(T - lastT) < 0.02 && theme + belt === lastTheme && winKey === lastWin) return;
        if (now - lastPaint < 33) return;
        lastPaint = now;
        const timeChanged = Math.abs(T - lastT) >= 0.02 || lastT < 0;
        lastT = T;
        lastTheme = theme + belt;
        const field = computeField(front, T);
        paintField(fieldCanvas.current!, data, field, { empire: FACTION_COLOR.empire, allied: FACTION_COLOR.tempest }, MAP_THEME[theme].occupiedAlpha, win, belt);
        if (winKey !== lastWin) {
          lastWin = winKey;
          src()?.setCoordinates([simToLngLatTuple(win.x0, win.y0), simToLngLatTuple(win.x1, win.y0), simToLngLatTuple(win.x1, win.y1), simToLngLatTuple(win.x0, win.y1)]);
        }
        // A canvas source re-uploads only while playing: play during change, pause when idle.
        src()?.play();
        window.clearTimeout(pauseTimer);
        pauseTimer = window.setTimeout(() => src()?.pause(), 250);
        map.triggerRepaint();
        if (timeChanged) setField(field);
      };
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(pauseTimer);
    };
  }, [data, ready, occupationOn, theme]);


  /* -- layer visibility & border opacity ---------------------------- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const vis = (id: string, on: boolean) => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    vis('territory-fill', layers.territories);
    vis('territory-hatch', layers.territories);
    vis('territory-line', true);
    vis('area-fill', layers.operationalAreas);
    vis('area-hatch', layers.operationalAreas);
    vis('area-line', layers.operationalAreas);
    vis('grid-line', layers.grid);
    map.setPaintProperty('territory-line', 'line-opacity', borderOpacity);
  }, [layers, borderOpacity, ready]);

  /* -- camera requests ---------------------------------------------- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !camera) return;
    const reduce = prefersReducedMotion();
    const narrow = window.innerWidth < 1024;
    const padding = {
      top: 64,
      bottom: narrow ? 160 : 140,
      left: narrow || !railOpen ? 32 : 340,
      right: narrow || !panelOpen ? 32 : 400,
    };
    if (camera.kind === 'campaign') {
      map.fitBounds(campaignBounds(), { padding, duration: reduce ? 0 : 1200, bearing: 0, pitch: 0 });
      return;
    }
    if (camera.kind === 'bounds') {
      const b = camera.bounds;
      const pad = 0.01;
      map.fitBounds(simBoundsToLngLat([b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad]), {
        padding,
        maxZoom: camera.maxZoom ?? 6,
        duration: reduce ? 0 : 1300,
        essential: false,
      });
      return;
    }
    const target = simToLngLatTuple(camera.x, camera.y);
    const zoom = camera.zoom ?? map.getZoom();
    if (reduce) {
      map.jumpTo({ center: target, zoom });
      return;
    }
    // Controlled easing: offset the target so it lands in the visible part of
    // the map, not behind a panel.
    map.flyTo({
      center: target,
      zoom,
      speed: 1.1,
      curve: 1.3,
      padding,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      essential: false,
    });
  }, [camera, ready, railOpen, panelOpen]);

  // Keep the canvas sized when panels open or close.
  useEffect(() => {
    const id = window.setTimeout(() => mapRef.current?.resize(), 220);
    return () => window.clearTimeout(id);
  }, [railOpen, panelOpen]);

  if (failure) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-ink-900 p-8">
        <div className="surface max-w-md p-6">
          <h2 className="font-display text-lg text-fg">{t('The map could not start')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-2">{failure}</p>
          <p className="mt-3 text-sm leading-relaxed text-fg-3">
            {t('The atlas renders with WebGL. Enable hardware acceleration, or open it in a browser that supports WebGL 2.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    // The map surface keeps one direction in every language: canvas labels and
    // their offsets are placed left to right.
    <div className="absolute inset-0" dir="ltr" data-tour="map" role="region" aria-label={t('Campaign map')}>
      {/* MapLibre's stylesheet sets position:relative on the container; the inline style is the only declaration it cannot outrank. */}
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
      {ready ? <Overlay map={mapRef.current} /> : null}
      <MapControls map={mapRef.current} ready={ready} />
      {ready ? <Minimap map={mapRef.current} /> : null}
    </div>
  );
}

function padBounds(b: [[number, number], [number, number]], f: number): [[number, number], [number, number]] {
  const dx = (b[1][0] - b[0][0]) * f;
  const dy = (b[1][1] - b[0][1]) * f;
  // Longitudes must stay inside ±180 or MapLibre clamps the camera to the antimeridian.
  return [
    [Math.max(-179.9, b[0][0] - dx), Math.max(-85, b[0][1] - dy)],
    [Math.min(179.9, b[1][0] + dx), Math.min(85, b[1][1] + dy)],
  ];
}

