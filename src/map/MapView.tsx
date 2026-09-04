'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { atlasCorners, campaignBounds, simToLngLatTuple } from '@/lib/coords';
import { controlColor, INK } from '@/lib/palette';
import { useSimulation } from '@/simulation/store';
import { ForceOverlay } from '@/map/ForceOverlay';
import { MapControls } from '@/map/MapControls';

const ATLAS_URL = '/maps/base-atlas.png';

/**
 * Base style.
 *
 * There is no tile server, no API key and no external style. The map is one
 * image on a dark ground, which is all a fictional world has and all it needs.
 */
function baseStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'Tempest campaign atlas',
    sources: {
      atlas: {
        type: 'image',
        url: ATLAS_URL,
        coordinates: atlasCorners(),
      },
      theatres: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      graticule: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    layers: [
      { id: 'void', type: 'background', paint: { 'background-color': INK.base } },
      {
        id: 'atlas',
        type: 'raster',
        source: 'atlas',
        paint: { 'raster-opacity': 0.92, 'raster-fade-duration': 0 },
      },
      {
        id: 'theatre-fill',
        type: 'fill',
        source: 'theatres',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.14, 6, 0.26],
        },
      },
      {
        id: 'theatre-line',
        type: 'line',
        source: 'theatres',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.8, 6, 2.2],
          'line-opacity': 0.7,
          'line-dasharray': [3, 2],
        },
      },
      {
        id: 'graticule-line',
        type: 'line',
        source: 'graticule',
        paint: { 'line-color': INK.brass, 'line-width': 0.5, 'line-opacity': 0.22 },
      },
    ],
  };
}

/** Simulation graticule: an evenly spaced grid in SIMULATION space, at 10% steps. */
function graticuleFeatures(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (let i = 0; i <= 10; i += 1) {
    const t = i / 10;
    const vertical: [number, number][] = [];
    const horizontal: [number, number][] = [];
    for (let s = 0; s <= 40; s += 1) {
      const u = s / 40;
      vertical.push(simToLngLatTuple(t, u));
      horizontal.push(simToLngLatTuple(u, t));
    }
    features.push({ type: 'Feature', properties: { axis: 'x', value: t }, geometry: { type: 'LineString', coordinates: vertical } });
    features.push({ type: 'Feature', properties: { axis: 'y', value: t }, geometry: { type: 'LineString', coordinates: horizontal } });
  }
  return { type: 'FeatureCollection', features };
}

export function MapView() {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const data = useSimulation((s) => s.data);
  const state = useSimulation((s) => s.state);
  const layers = useSimulation((s) => s.layers);
  const globe = useSimulation((s) => s.globe);
  const camera = useSimulation((s) => s.camera);
  const selection = useSimulation((s) => s.selection);

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
        minZoom: 0.8,
        maxZoom: 8,
        maxPitch: 70,
        attributionControl: false,
        dragRotate: true,
        renderWorldCopies: false,
      });
    } catch (error) {
      // WebGL unavailable is a real failure of a map application, not a
      // degradation. Say so rather than presenting an empty frame.
      setFailure(error instanceof Error ? error.message : 'The map could not start.');
      return;
    }

    mapRef.current = map;

    map.on('load', () => {
      const src = map.getSource('graticule');
      if (src && 'setData' in src) (src as maplibregl.GeoJSONSource).setData(graticuleFeatures());
      setReady(true);
    });

    map.on('error', (event) => {
      // Style and source errors are reported rather than swallowed, but they do
      // not blank the application: the overlay still carries the campaign.
      console.error('[map]', event.error?.message ?? event);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  /* -- projection -------------------------------------------------- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    try {
      map.setProjection({ type: globe ? 'globe' : 'mercator' });
    } catch {
      // A renderer without globe support keeps the flat atlas. The campaign is
      // unaffected; only the presentation is.
      setFailure(null);
    }
  }, [globe, ready]);

  /* -- theatre zones ----------------------------------------------- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !data) return;
    const source = map.getSource('theatres');
    if (!source || !('setData' in source)) return;

    const features: GeoJSON.Feature[] = [];
    for (const theatre of data.theatres) {
      if (!theatre.zone) continue;
      const control = state?.theatres[theatre.id]?.control ?? null;
      const status = state?.theatres[theatre.id]?.status ?? 'INACTIVE';
      if (status === 'INACTIVE' && !control) continue;
      const ring = theatre.zone.map(([x, y]) => simToLngLatTuple(x, y));
      ring.push(ring[0]);
      features.push({
        type: 'Feature',
        properties: {
          id: theatre.id,
          name: theatre.name,
          color: controlColor(control),
          status,
          selected: selection.kind === 'theatre' && selection.id === theatre.id,
        },
        geometry: { type: 'Polygon', coordinates: [ring] },
      });
    }
    (source as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features });
  }, [data, state, ready, selection]);

  /* -- layer visibility -------------------------------------------- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const set = (id: string, visible: boolean) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    };
    set('atlas', layers.base);
    set('theatre-fill', layers.theatres);
    set('theatre-line', layers.theatres);
    set('graticule-line', layers.grid);
  }, [layers, ready]);

  /* -- camera ------------------------------------------------------ */

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !camera) return;
    map.easeTo({
      center: simToLngLatTuple(camera.x, camera.y),
      zoom: camera.zoom ?? map.getZoom(),
      duration: 1100,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  }, [camera, ready]);

  if (failure) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-ink-900 p-8">
        <div className="max-w-md border border-chart-rule/40 bg-ink-800 p-6">
          <h2 className="font-atlas text-lg text-chart-paper">The map could not start</h2>
          <p className="mt-3 text-sm leading-relaxed text-chart-faint">{failure}</p>
          <p className="mt-3 text-sm leading-relaxed text-chart-faint">
            This build renders the campaign with WebGL. Enable hardware acceleration in your browser,
            or open the application in a browser that supports WebGL 2.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      {/*
        MapLibre's own stylesheet sets .maplibregl-map { position: relative },
        which lands after Tailwind's utilities and would override a positioning
        class here. The inline style is deliberate: it is the only declaration
        the library cannot outrank, and without it the container collapses to
        zero height and the map never draws.
      */}
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
      {ready ? <ForceOverlay map={mapRef.current} /> : null}
      <MapControls map={mapRef.current} ready={ready} />
    </div>
  );
}
