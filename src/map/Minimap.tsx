'use client';

import { useEffect, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

import { lngLatToSim, simToLngLatTuple } from '@/lib/coords';
import { usePreferences } from '@/state/preferences';
import { useSimulation } from '@/simulation/store';
import { useT } from '@/i18n';

const W = 148;
const H = Math.round((W * 2035) / 2641);

/** Overview of the whole world with the current view outlined; click to move there. */
export function Minimap({ map }: { map: MapLibreMap | null }) {
  const t = useT();
  const show = usePreferences((s) => s.showMinimap);
  const style = usePreferences((s) => s.mapStyle);
  const viewMode = useSimulation((s) => s.viewMode);
  const [rect, setRect] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  useEffect(() => {
    if (!map) return;
    const update = () => {
      const b = map.getBounds();
      const a = lngLatToSim(b.getWest(), b.getNorth());
      const c = lngLatToSim(b.getEast(), b.getSouth());
      setRect({ x0: Math.max(0, a.x), y0: Math.max(0, a.y), x1: Math.min(1, c.x), y1: Math.min(1, c.y) });
    };
    update();
    map.on('moveend', update);
    return () => {
      map.off('moveend', update);
    };
  }, [map]);

  if (!show || viewMode === 'cinematic' || !map) return null;

  return (
    <button
      type="button"
      aria-label={t('Overview map: click to move the view there')}
      className="absolute bottom-19 left-15 z-20 hidden overflow-hidden rounded-[3px] border border-ink-400 bg-ink-900 shadow-panel md:block [@media(max-height:560px)]:hidden"
      style={{ width: W, height: H }}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / W;
        const y = (e.clientY - r.top) / H;
        map.easeTo({ center: simToLngLatTuple(x, y), duration: 700 });
      }}
    >
      <img src={style === 'myth' ? '/maps/myth-map.jpg' : '/maps/base-map.png'} alt="" className="h-full w-full object-cover opacity-80" />
      {rect && rect.x1 > rect.x0 ? (
        <span
          aria-hidden
          className="pointer-events-none absolute border-2 border-accent bg-accent/10"
          style={{ left: rect.x0 * W, top: rect.y0 * H, width: Math.max(4, (rect.x1 - rect.x0) * W), height: Math.max(4, (rect.y1 - rect.y0) * H) }}
        />
      ) : null}
    </button>
  );
}
