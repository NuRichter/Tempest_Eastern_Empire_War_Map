'use client';

import { useEffect, useState } from 'react';

import { COORDINATE_DISCLAIMER, LAT_EXTENT_DEG, LNG_SPAN_DEG } from '@/lib/coords';
import { LAYERS, useSimulation } from '@/simulation/store';

/** Developer readout. Off by default and never part of the presentation. */
export function DebugPanel() {
  const debug = useSimulation((s) => s.debug);
  const data = useSimulation((s) => s.data);
  const clock = useSimulation((s) => s.clock);
  const frame = useSimulation((s) => s.frame);
  const state = useSimulation((s) => s.state);
  const layers = useSimulation((s) => s.layers);
  const selection = useSimulation((s) => s.selection);
  const [fps, setFps] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    if (!debug) return;
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const tick = () => {
      frames += 1;
      const now = performance.now();
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        setPosition(clock?.frame ?? 0);
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [debug, clock]);

  if (!debug || !data || !state) return null;

  const interval = data.keyframeIndex.interval;
  const checkpoint = Math.floor(frame / interval) * interval;
  const deltasApplied = data.deltas.deltaFrames.filter((f) => f > checkpoint && f <= frame).length;
  const activeLayers = LAYERS.filter((l) => layers[l.id]).map((l) => l.id);

  const row = (label: string, value: string) => (
    <div key={label} className="flex justify-between gap-3">
      <span className="text-chart-faint">{label}</span>
      <span className="text-chart-paper">{value}</span>
    </div>
  );

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-30 w-72 border border-chart-rule/40 bg-ink-900/94 p-2.5 font-figure text-micro leading-relaxed backdrop-blur">
      <p className="mb-1.5 border-b border-chart-rule/30 pb-1 font-atlas text-tiny text-chart-paper">
        Developer readout
      </p>
      <div className="space-y-px">
        {row('frame index', `${frame} / ${data.manifest.clock.frameCount - 1}`)}
        {row('clock position', position.toFixed(3))}
        {row('render fps', String(fps))}
        {row('checkpoint', String(checkpoint))}
        {row('deltas applied', String(deltasApplied))}
        {row('delta frames total', String(data.deltas.deltaFrames.length))}
        {row('phase', state.phase)}
        {row('stage', state.stage)}
        {row('theatres in state', String(Object.keys(state.theatres).length))}
        {row('approach pct', state.approachPct === null ? 'n/a' : `${state.approachPct}%`)}
        {row('selection', selection.kind === 'none' ? 'none' : `${selection.kind}:${selection.id}`)}
        {row('layers on', String(activeLayers.length))}
        {row('projection span', `${LNG_SPAN_DEG}° × ±${LAT_EXTENT_DEG.toFixed(2)}°`)}
        {row('workbook sha256', data.manifest.source.workbookSha256.slice(0, 12))}
      </div>
      <p className="mt-1.5 border-t border-chart-rule/30 pt-1 font-ui text-micro leading-relaxed text-chart-faint">
        {COORDINATE_DISCLAIMER}
      </p>
    </div>
  );
}
