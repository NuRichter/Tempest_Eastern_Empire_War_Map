'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { Box, Compass, Crosshair, Globe2, Map as MapIcon, Maximize2, Minimize2, Minus, Plus, ScanSearch } from 'lucide-react';

import { lngLatToSim } from '@/lib/coords';
import { useSimulation } from '@/simulation/store';
import { prefersReducedMotion, usePreferences, type MapStyle } from '@/state/preferences';
import { msg, useT } from '@/i18n';

interface Props {
  map: MapLibreMap | null;
  ready: boolean;
}

const STYLES: { id: MapStyle; name: string; note: string; thumb: string }[] = [
  { id: 'base', name: msg('Base Map'), note: msg('Operational map with clear borders. Default.'), thumb: '/maps/base-map.png' },
  { id: 'myth', name: msg('Myth Map'), note: msg('The painted world map, for geographic and lore context.'), thumb: '/maps/myth-map.jpg' },
];

/** Navigation and map-style controls, bottom corners. Small, square, quiet. */
export function MapControls({ map, ready }: Props) {
  const t = useT();
  const globe = usePreferences((s) => s.globe);
  const view3d = usePreferences((s) => s.view3d);
  const mapStyle = usePreferences((s) => s.mapStyle);
  const setPref = usePreferences((s) => s.set);
  const focusCampaign = useSimulation((s) => s.focusCampaign);
  const focusBounds = useSimulation((s) => s.focusBounds);
  const data = useSimulation((s) => s.data);
  const [presetsOpen, setPresetsOpen] = useState(false);
  // Camera presets: named views a reader returns to, eased to like any other camera move.
  const presets: { name: string; run: () => void }[] = [
    { name: t('Whole campaign'), run: focusCampaign },
    { name: t('Central continent'), run: () => focusBounds([0.04, 0.26, 0.96, 0.92], 3) },
    { name: t('Jura & Dwargon front'), run: () => focusBounds([0.6, 0.38, 0.74, 0.6], 5) },
    { name: t('Dwargon eastern front'), run: () => { const th = data?.theatreById.get('TH-DWE'); if (th?.bounds) focusBounds(th.bounds, 5.5); } },
    { name: t('Imperial capital'), run: () => { const th = data?.theatreById.get('TH-CAP'); if (th?.bounds) focusBounds(th.bounds, 5); } },
    { name: t('Eastern Empire'), run: () => { const ter = data?.territoryById.get('T-EMP'); if (ter) focusBounds(ter.bounds, 4.5); } },
  ];
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
      <div data-tour="map-controls" className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-1.5" role="group" aria-label={t('Map navigation')}>
        <div className={`flex flex-col overflow-hidden rounded-[3px] border border-ink-500 bg-ink-800/90 ${view3d ? 'hidden' : ''}`}>
          <button type="button" className="grid h-8 w-8 place-items-center text-fg-2 hover:bg-ink-600 hover:text-fg" onClick={() => zoomBy(0.75)} aria-label={t('Zoom in')} title={t('Zoom in (+)')}>
            <Plus size={15} strokeWidth={1.7} />
          </button>
          <div className="h-px bg-ink-500" />
          <button type="button" className="grid h-8 w-8 place-items-center text-fg-2 hover:bg-ink-600 hover:text-fg" onClick={() => zoomBy(-0.75)} aria-label={t('Zoom out')} title={t('Zoom out (−)')}>
            <Minus size={15} strokeWidth={1.7} />
          </button>
        </div>
        <button type="button" className={`ctl w-8 px-0 ${view3d ? 'hidden' : ''}`} onClick={() => map?.easeTo({ bearing: 0, pitch: 0, duration: prefersReducedMotion() ? 0 : 450 })} aria-label={t('Face north')} title={t('Face north')}>
          <Compass size={15} strokeWidth={1.7} style={{ transform: `rotate(${-bearing}deg)` }} />
        </button>
        <button type="button" className="ctl w-8 px-0" onClick={focusCampaign} aria-label={t('Frame the whole campaign')} title={t('Frame the whole campaign (0)')}>
          <Crosshair size={15} strokeWidth={1.7} />
        </button>
        <div className="relative">
          <button type="button" className="ctl w-8 px-0" aria-expanded={presetsOpen} onClick={() => setPresetsOpen((v) => !v)} aria-label={t('Camera presets')} title={t('Camera presets')}>
            <ScanSearch size={15} strokeWidth={1.7} />
          </button>
          {presetsOpen ? (
            <ul className="surface absolute bottom-0 right-10 w-48 rounded-[4px] py-1" role="menu" aria-label={t('Camera presets')}>
              {presets.map((p) => (
                <li key={p.name} role="none">
                  <button type="button" role="menuitem" className="w-full px-3 py-1.5 text-left text-xs text-fg hover:bg-ink-600" onClick={() => { p.run(); setPresetsOpen(false); }}>
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex overflow-hidden rounded-[3px] border border-ink-500 bg-ink-800/90" role="radiogroup" aria-label={t('Projection')}>
          <button type="button" role="radio" aria-checked={!globe && !view3d} onClick={() => { setPref('globe', false); setPref('view3d', false); }} title={t('Flat atlas (G)')} className={`flex h-8 items-center gap-1 px-2 text-xs ${!globe && !view3d ? 'bg-accent/15 text-fg' : 'text-fg-3 hover:text-fg'}`}>
            <MapIcon size={13} strokeWidth={1.7} /> {t('Flat')}
          </button>
          <button type="button" role="radio" aria-checked={globe && !view3d} onClick={() => { setPref('globe', true); setPref('view3d', false); }} title={t('Globe (G)')} className={`flex h-8 items-center gap-1 border-l border-ink-500 px-2 text-xs ${globe && !view3d ? 'bg-accent/15 text-fg' : 'text-fg-3 hover:text-fg'}`}>
            <Globe2 size={13} strokeWidth={1.7} /> {t('Globe')}
          </button>
          <button type="button" role="radio" aria-checked={view3d} onClick={() => setPref('view3d', true)} title={t('3D terrain (V)')} className={`flex h-8 items-center gap-1 border-l border-ink-500 px-2 text-xs ${view3d ? 'bg-accent/15 text-fg' : 'text-fg-3 hover:text-fg'}`}>
            <Box size={13} strokeWidth={1.7} /> 3D
          </button>
        </div>
        <button
          type="button"
          className="ctl w-8 px-0"
          onClick={() => (document.fullscreenElement ? void document.exitFullscreen() : void document.documentElement.requestFullscreen())}
          aria-label={fullscreen ? t('Leave fullscreen') : t('Fullscreen')}
          title={fullscreen ? t('Leave fullscreen') : t('Fullscreen')}
        >
          {fullscreen ? <Minimize2 size={14} strokeWidth={1.7} /> : <Maximize2 size={14} strokeWidth={1.7} />}
        </button>
      </div>

      {/* Map style switcher: bottom left, Google-Maps style. */}
      <div data-tour="map-style" className={`absolute bottom-3 left-15 flex items-end gap-2 ${stylesOpen ? 'z-30' : 'z-20'}`}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setStylesOpen((v) => !v)}
            aria-expanded={stylesOpen}
            aria-label={t('Map style: {name}. Change map style', { name: t(STYLES.find((s) => s.id === mapStyle)?.name ?? '') })}
            className="group relative block h-14 w-14 overflow-hidden rounded-[4px] border-2 border-ink-400 shadow-panel hover:border-accent/70"
          >
            <img src={STYLES.find((s) => s.id !== mapStyle)!.thumb} alt="" className="h-full w-full object-cover object-[60%_45%]" />
            <span className="absolute inset-x-0 bottom-0 bg-ink-900/95 py-0.5 text-center text-2xs font-semibold text-fg">{t('Layers')}</span>
          </button>
          {stylesOpen ? (
            <div className="surface absolute bottom-0 left-16 z-30 w-60 rounded-[4px] p-2" role="radiogroup" aria-label={t('Map style')}>
              <p className="eyebrow px-1 pb-1.5">{t('Map')}</p>
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
                    <span className="block px-1.5 py-1 text-xs font-semibold text-fg">{t(s.name)}{s.id === 'base' ? <span className="ml-1 font-normal text-fg-3">{t('default')}</span> : null}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 px-1 text-2xs leading-relaxed text-fg-3">{t(STYLES.find((s) => s.id === mapStyle)?.note ?? '')} {t('Switching style keeps the campaign moment, selection and filters.')}</p>
            </div>
          ) : null}
        </div>
        <p className="hidden select-none rounded-[3px] bg-ink-900/90 px-1.5 py-0.5 font-mono text-2xs text-fg-3 md:block" title={t('Simulation coordinates on a fictional map. Not latitude and longitude.')}>
          {cursor ? `SIM ${cursor.x.toFixed(3)}, ${cursor.y.toFixed(3)}` : 'SIM ·'} · {t('not lat/long')}
        </p>
      </div>
    </>
  );
}
