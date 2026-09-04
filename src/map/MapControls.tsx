'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { Compass, Globe2, Map as MapIcon, Maximize2, Minimize2, Minus, Plus, Crosshair } from 'lucide-react';

import { campaignBounds } from '@/lib/coords';
import { useSimulation } from '@/simulation/store';

interface Props {
  map: MapLibreMap | null;
  ready: boolean;
}

/**
 * Map navigation, bottom right (brief §30). Deliberately small and quiet: the
 * map is the hero, and these are the controls of an instrument, not buttons on
 * a dashboard.
 */
export function MapControls({ map, ready }: Props) {
  const globe = useSimulation((s) => s.globe);
  const setGlobe = useSimulation((s) => s.setGlobe);
  const [bearing, setBearing] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!map || !ready) return;
    const onRotate = () => setBearing(map.getBearing());
    map.on('rotate', onRotate);
    return () => {
      map.off('rotate', onRotate);
    };
  }, [map, ready]);

  useEffect(() => {
    const onChange = () => {
      const active = Boolean(document.fullscreenElement);
      setFullscreen(active);
      // The canvas is sized from the container, so the map must be told the
      // container changed before the next frame is drawn.
      window.setTimeout(() => map?.resize(), 120);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [map]);

  const zoomBy = useCallback(
    (delta: number) => {
      if (!map) return;
      map.easeTo({ zoom: map.getZoom() + delta, duration: 260 });
    },
    [map],
  );

  const resetCamera = useCallback(() => {
    if (!map) return;
    map.easeTo({ bearing: 0, pitch: 0, duration: 500 });
    map.fitBounds(campaignBounds(), { padding: 40, duration: 900 });
  }, [map]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  }, []);

  const button =
    'grid h-9 w-9 place-items-center border border-chart-rule/35 bg-ink-800/85 text-chart-faint backdrop-blur ' +
    'transition-colors hover:border-brass/60 hover:text-chart-paper focus-visible:outline focus-visible:outline-1 ' +
    'focus-visible:outline-offset-2 focus-visible:outline-brass';

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5">
      <button type="button" className={button} onClick={() => zoomBy(0.7)} title="Zoom in" aria-label="Zoom in">
        <Plus size={15} strokeWidth={1.6} />
      </button>
      <button type="button" className={button} onClick={() => zoomBy(-0.7)} title="Zoom out" aria-label="Zoom out">
        <Minus size={15} strokeWidth={1.6} />
      </button>
      <button
        type="button"
        className={button}
        onClick={() => map?.easeTo({ bearing: 0, pitch: 0, duration: 450 })}
        title="Face north"
        aria-label="Face north"
      >
        <Compass size={15} strokeWidth={1.6} style={{ transform: `rotate(${-bearing}deg)` }} />
      </button>
      <button type="button" className={button} onClick={resetCamera} title="Reset camera" aria-label="Reset camera">
        <Crosshair size={15} strokeWidth={1.6} />
      </button>
      <button
        type="button"
        className={button}
        onClick={() => setGlobe(!globe)}
        title={globe ? 'Switch to flat atlas' : 'Switch to globe'}
        aria-label={globe ? 'Switch to flat atlas' : 'Switch to globe'}
      >
        {globe ? <MapIcon size={15} strokeWidth={1.6} /> : <Globe2 size={15} strokeWidth={1.6} />}
      </button>
      <button
        type="button"
        className={button}
        onClick={toggleFullscreen}
        title={fullscreen ? 'Leave fullscreen' : 'Fullscreen'}
        aria-label={fullscreen ? 'Leave fullscreen' : 'Fullscreen'}
      >
        {fullscreen ? <Minimize2 size={15} strokeWidth={1.6} /> : <Maximize2 size={15} strokeWidth={1.6} />}
      </button>
    </div>
  );
}
