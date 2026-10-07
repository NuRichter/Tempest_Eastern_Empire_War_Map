'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { Compass, Crosshair, Globe2, Map as MapIcon, Maximize2, Minimize2, Minus, Plus } from 'lucide-react';

import { lngLatToSim } from '@/lib/coords';
import { useSimulation } from '@/simulation/store';
import { prefersReducedMotion, usePreferences, type MapStyle } from '@/state/preferences';

interface Props {
  map: MapLibreMap | null;
  ready: boolean;
}

const STYLES: { id: MapStyle; name: string; note: string; thumb: string }[] = [
  { id: 'base', name: 'Base Map', note: 'Operational map with clear borders. Default.', thumb: '/maps/base-map.png' },
  { id: 'myth', name: 'Myth Map', note: 'The painted world map, for geographic and lore context.', thumb: '/maps/myth-map.jpg' },
];

/** Navigation and map-style controls, bottom corners. Small, square, quiet. */
export function MapControls({ map, ready }: Props) {
  const globe = usePreferences((s) => s.globe);
  const mapStyle = usePreferences((s) => s.mapStyle);
  const setPref = usePreferences((s) => s.set);
  const focusCampaign = useSimulation((s) => s.focusCampaign);
  const viewMode = useSimulation((s) => s.viewMode);
  const [bearing, setBearing] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [stylesOpen, setStylesOpen] = useState(false);

  useEffect(() => {
    if (!map || !ready) return;
    const onRotate = () => setBearing(map.getBearing());
    const onMove = (e: { lngLat: { lng: number; lat: number } }) => {
      const s = lngLatToSim(e.lngLat.lng, e.lngLat.lat);
      setCursor(s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1 ? s : null);
    };
    map.on('rotate', onRotate);
    map.on('mousemove', onMove);
    return () => {
      map.off('rotate', onRotate);
      map.off('mousemove', onMove);
    };
  }, [map, ready]);

  useEffect(() => {
    const onChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
      window.setTimeout(() => map?.resize(), 120);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [map]);

  const zoomBy = useCallback((d: number) => map?.easeTo({ zoom: map.getZoom() + d, duration: prefersReducedMotion() ? 0 : 280 }), [map]);

  if (viewMode === 'cinematic') return null;

  return (
    <>
      {/* Navigation: bottom right, above the timeline. */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-1.5" role="group" aria-label="Map navigation">
        <div className="flex flex-col overflow-hidden rounded-[3px] border border-ink-500 bg-ink-800/90">
          <button type="button" className="grid h-8 w-8 place-items-center text-fg-2 hover:bg-ink-600 hover:text-fg" onClick={() => zoomBy(0.75)} aria-label="Zoom in" title="Zoom in (+)">
            <Plus size={15} strokeWidth={1.7} />
          </button>
          <div className="h-px bg-ink-500" />
          <button type="button" className="grid h-8 w-8 place-items-center text-fg-2 hover:bg-ink-600 hover:text-fg" onClick={() => zoomBy(-0.75)} aria-label="Zoom out" title="Zoom out (−)">
            <Minus size={15} strokeWidth={1.7} />
          </button>
        </div>
        <button type="button" className="ctl w-8 px-0" onClick={() => map?.easeTo({ bearing: 0, pitch: 0, duration: prefersReducedMotion() ? 0 : 450 })} aria-label="Face north" title="Face north">
          <Compass size={15} strokeWidth={1.7} style={{ transform: `rotate(${-bearing}deg)` }} />
        </button>
        <button type="button" className="ctl w-8 px-0" onClick={focusCampaign} aria-label="Frame the whole campaign" title="Frame the whole campaign (0)">
          <Crosshair size={15} strokeWidth={1.7} />
        </button>
        <div className="flex overflow-hidden rounded-[3px] border border-ink-500 bg-ink-800/90" role="radiogroup" aria-label="Projection">
          <button type="button" role="radio" aria-checked={!globe} onClick={() => setPref('globe', false)} title="Flat atlas (G)" className={`flex h-8 items-center gap-1 px-2 text-xs ${!globe ? 'bg-accent/15 text-fg' : 'text-fg-3 hover:text-fg'}`}>
            <MapIcon size={13} strokeWidth={1.7} /> Flat
          </button>
          <button type="button" role="radio" aria-checked={globe} onClick={() => setPref('globe', true)} title="Globe (G)" className={`flex h-8 items-center gap-1 border-l border-ink-500 px-2 text-xs ${globe ? 'bg-accent/15 text-fg' : 'text-fg-3 hover:text-fg'}`}>
            <Globe2 size={13} strokeWidth={1.7} /> Globe
          </button>
        </div>
        <button
          type="button"
          className="ctl w-8 px-0"
          onClick={() => (document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen())}
          aria-label={fullscreen ? 'Leave fullscreen' : 'Fullscreen'}
          title={fullscreen ? 'Leave fullscreen' : 'Fullscreen'}
        >
          {fullscreen ? <Minimize2 size={14} strokeWidth={1.7} /> : <Maximize2 size={14} strokeWidth={1.7} />}
        </button>
      </div>

      {/* Map style switcher: bottom left, Google-Maps style. */}
      <div className="absolute bottom-3 left-3 z-20 flex items-end gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setStylesOpen((v) => !v)}
            aria-expanded={stylesOpen}
            aria-label={`Map style: ${STYLES.find((s) => s.id === mapStyle)?.name}. Change map style`}
            className="group relative block h-14 w-14 overflow-hidden rounded-[4px] border-2 border-ink-400 shadow-panel hover:border-accent/70"
          >
            <img src={STYLES.find((s) => s.id !== mapStyle)!.thumb} alt="" className="h-full w-full object-cover object-[60%_45%]" />
            <span className="absolute inset-x-0 bottom-0 bg-ink-900/80 py-0.5 text-center text-2xs font-semibold text-fg">Layers</span>
          </button>
          {stylesOpen ? (
            <div className="surface absolute bottom-16 left-0 w-60 rounded-[4px] p-2" role="radiogroup" aria-label="Map style">
              <p className="eyebrow px-1 pb-1.5">Map</p>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={mapStyle === s.id}
                    onClick={() => {
                      setPref('mapStyle', s.id);
                      setStylesOpen(false);
                    }}
                    className={`overflow-hidden rounded-[3px] border text-left ${mapStyle === s.id ? 'border-accent' : 'border-ink-500 hover:border-ink-400'}`}
                  >
                    <img src={s.thumb} alt="" className="h-14 w-full object-cover object-[60%_45%]" />
                    <span className="block px-1.5 py-1 text-xs font-semibold text-fg">{s.name}{s.id === 'base' ? <span className="ml-1 font-normal text-fg-3">default</span> : null}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 px-1 text-2xs leading-relaxed text-fg-3">{STYLES.find((s) => s.id === mapStyle)?.note} Switching style keeps the campaign moment, selection and filters.</p>
            </div>
          ) : null}
        </div>
        <p className="hidden select-none rounded-[3px] bg-ink-900/70 px-1.5 py-0.5 font-mono text-2xs text-fg-3 md:block" title="Simulation coordinates on a fictional map. Not latitude and longitude.">
          {cursor ? `SIM ${cursor.x.toFixed(3)}, ${cursor.y.toFixed(3)}` : 'SIM —'} · not lat/long
        </p>
      </div>
    </>
  );
}
