'use client';

import { useEffect, useState } from 'react';

import { columnAt } from '@/data/loader';
import { battleDayLabel, frameClock, phaseLabel } from '@/lib/format';
import { currentEvent } from '@/simulation/resolver';
import { useSimulation } from '@/simulation/store';

/**
 * Cinematic and presentation overlay.
 *
 * Everything except the map steps back. What remains is the date, the campaign
 * day, the phase and whatever is happening — the caption a documentary would
 * hold on screen, and nothing else.
 */
export function CinematicOverlay() {
  const viewMode = useSimulation((s) => s.viewMode);
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const state = useSimulation((s) => s.state);
  const [spotlight, setSpotlight] = useState<string | null>(null);

  const event = data ? currentEvent(data, frame) : null;

  useEffect(() => {
    if (!event || viewMode === 'standard') return;
    if (frame - event.frame > 40) {
      setSpotlight(null);
      return;
    }
    setSpotlight(event.id);
  }, [event, frame, viewMode]);

  if (viewMode === 'standard' || !data || !state) return null;

  const held = spotlight && event && event.id === spotlight ? event : null;

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, transparent 42%, rgba(6,8,9,0.55) 100%)',
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute left-6 top-6 z-20">
        <p className="font-figure text-xs tracking-widest text-brass">
          {battleDayLabel(data.timeline.battleDay[frame])}
        </p>
        <p className="mt-1 font-atlas text-3xl leading-none text-chart-paper">
          {columnAt(data.timeline.date, frame)}
        </p>
        <p className="mt-1 font-figure text-sm text-chart-faint">{frameClock(frame)}</p>
        <p className="mt-3 max-w-xs font-ui text-tiny leading-relaxed text-chart-paper/80">
          {phaseLabel(state.phase)}
        </p>
        <p className="mt-0.5 max-w-xs font-ui text-micro leading-relaxed text-chart-faint">
          {state.activeTheatres}
        </p>
      </div>

      {held ? (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-20 w-[min(46rem,88vw)] -translate-x-1/2 border-l-2 border-l-brass bg-ink-900/78 px-4 py-3 backdrop-blur-sm">
          <p className="font-figure text-micro tracking-wide text-brass">
            {held.theatre} · {held.warDay} · {held.simulationTime}
            {held.turningPoint ? ` · turning point ${held.turningPointRank}` : ''}
          </p>
          <p className="mt-1 font-atlas text-lg leading-snug text-chart-paper">{held.action}</p>
          <p className="mt-1 font-ui text-tiny leading-relaxed text-chart-paper/75">{held.immediateResult}</p>
        </div>
      ) : null}

      <p className="pointer-events-none absolute bottom-3 right-4 z-20 font-ui text-micro text-chart-faint/70">
        Dates and clock times are reconstructed placements, not source canon.
      </p>
    </>
  );
}
