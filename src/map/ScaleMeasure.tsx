'use client';

/**
 * Scale bar, kilometre read-out of the pointer, and the measuring tool's
 * result. The atlas is a 1:1 world in kilometres (src/lib/world.ts), so the
 * scale is read from the map's own projection: the ground distance under
 * 100 screen pixels at the centre of the view.
 */
import type { Map as MapLibreMap } from 'maplibre-gl';
import { Undo2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { lngLatToSim, simToLngLatTuple } from '@/lib/coords';
import { useT } from '@/i18n';
import { distanceKm, toKm } from '@/lib/world';
import { measuredKm, niceKm, useMeasure } from '@/map/measure';

const GROUP = new Intl.NumberFormat('en-GB');
const km = (v: number) => (v >= 100 ? GROUP.format(Math.round(v / 10) * 10) : v >= 10 ? GROUP.format(Math.round(v)) : v.toFixed(1));

export function ScaleBar({ map, ready }: { map: MapLibreMap | null; ready: boolean }) {
  const t = useT();
  const [bar, setBar] = useState<{ px: number; km: number } | null>(null);
  useEffect(() => {
    if (!map || !ready) return;
    const update = () => {
      const c = map.project(map.getCenter());
      const a = lngLatToSim(map.getCenter().lng, map.getCenter().lat);
      const b = map.unproject([c.x + 100, c.y]);
      const s = lngLatToSim(b.lng, b.lat);
      const per100 = distanceKm(a.x, a.y, s.x, s.y);
      if (!(per100 > 0)) return setBar(null);
      const len = niceKm(per100 * 1.2);
      setBar({ px: Math.round((len / per100) * 100), km: len });
    };
    update();
    map.on('move', update);
    return () => {
      map.off('move', update);
    };
  }, [map, ready]);
  if (!bar) return null;
  return (
    <div className="pointer-events-none select-none" aria-label={t('Scale: {km} km', { km: GROUP.format(bar.km) })} title={t('Scale of the 1:1 atlas (2 km per atlas pixel, synthetic calibration)')}>
      <div className="font-mono text-2xs text-fg-2 [text-shadow:0_0_3px_rgba(0,0,0,0.9)]">{GROUP.format(bar.km)} km</div>
      <div className="h-1.5 border-x-2 border-b-2 border-fg/85" style={{ width: bar.px }} />
    </div>
  );
}

/** Pointer position in kilometres east and south of the atlas's north-west corner. */
export function KmReadout({ cursor }: { cursor: { x: number; y: number } | null }) {
  const t = useT();
  const k = cursor ? toKm(cursor.x, cursor.y) : null;
  return (
    <p className="hidden select-none rounded-[3px] bg-ink-900/90 px-1.5 py-0.5 font-mono text-2xs text-fg-3 md:block" title={cursor ? `SIM ${cursor.x.toFixed(4)}, ${cursor.y.toFixed(4)} · ${t('not lat/long')}` : t('Kilometres east and south of the atlas corner')}>
      {k ? t('{e} km E · {s} km S', { e: GROUP.format(Math.round(k.e)), s: GROUP.format(Math.round(k.s)) }) : t('km E · km S')}
    </p>
  );
}

/** Draws the measured line on the map and shows its length. */
export function MeasurePanel({ map, ready }: { map: MapLibreMap | null; ready: boolean }) {
  const t = useT();
  const { active, points, setActive, undo, clear } = useMeasure();
  useEffect(() => {
    if (!map || !ready) return;
    if (!map.getSource('measure')) {
      map.addSource('measure', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'measure-line', type: 'line', source: 'measure', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffd166', 'line-width': 2.5, 'line-dasharray': [2, 1.5] } });
      map.addLayer({ id: 'measure-pts', type: 'circle', source: 'measure', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 4, 'circle-color': '#ffd166', 'circle-stroke-color': '#1a1a1a', 'circle-stroke-width': 1.5 } });
    }
  }, [map, ready]);
  useEffect(() => {
    const src = map?.getSource('measure') as { setData?: (d: unknown) => void } | undefined;
    if (!src?.setData) return;
    const coords = points.map(([x, y]) => simToLngLatTuple(x, y));
    src.setData({
      type: 'FeatureCollection',
      features: [
        ...(coords.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }] : []),
        ...coords.map((c) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: c } })),
      ],
    });
  }, [map, points]);
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(false);
      else if (e.key === 'Backspace') undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, setActive, undo]);
  if (!active) return null;
  const total = measuredKm(points);
  return (
    <div className="surface flex items-center gap-2 rounded-[4px] px-2 py-1.5 text-xs" role="status" aria-live="polite">
      <span className="text-fg-2">{points.length < 2 ? t('Click the map to measure') : <><span className="figure font-semibold text-fg">{km(total)} km</span> <span className="text-fg-3">{points.length === 2 ? t('straight line {km}', { km: '' }).trim() : t('straight line · {n} legs', { n: points.length - 1 })}</span></>}</span>
      <button type="button" className="ctl h-6 w-6 px-0" onClick={undo} disabled={!points.length} aria-label={t('Undo last point')} title={t('Undo last point (Backspace)')}>
        <Undo2 size={13} strokeWidth={1.7} />
      </button>
      <button type="button" className="ctl h-6 px-1.5 text-2xs" onClick={clear} disabled={!points.length}>
        {t('Clear')}
      </button>
      <button type="button" className="ctl h-6 w-6 px-0" onClick={() => setActive(false)} aria-label={t('Stop measuring')} title={t('Stop measuring (Esc)')}>
        <X size={13} strokeWidth={1.7} />
      </button>
    </div>
  );
}
