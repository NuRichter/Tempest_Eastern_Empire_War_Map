'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

import { battleDayLabel, phaseLabel } from '@/lib/format';
import { PROVENANCE_LABEL } from '@/lib/taxonomy';
import { currentEvent } from '@/simulation/resolver';
import { useSimulation } from '@/simulation/store';
import { Figure, Portrait, ProvenanceBadge } from '@/components/ui/primitives';
import type { WarEvent } from '@/types/dataset';

const CAPTION_FRAMES = 30; // a caption belongs to its event for five simulated hours

/**
 * Cinematic mode: the documentary register. Minimal chrome, a large date,
 * one caption at a time, the leader card of the moment, the casualty ledger,
 * and a closing card. The camera stays still while time plays; it moves only
 * when the action changes theatre. Narration is the dataset's own wording.
 */
export function CinematicOverlay() {
  const viewMode = useSimulation((s) => s.viewMode);
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const state = useSimulation((s) => s.state);
  const setViewMode = useSimulation((s) => s.setViewMode);
  const focusPoint = useSimulation((s) => s.focusPoint);
  const lastTheatre = useRef<string | null>(null);
  const [intro, setIntro] = useState(true);

  const cinematic = viewMode === 'cinematic';
  const latest: WarEvent | null = data && cinematic ? currentEvent(data, frame) : null;
  const fresh = latest && frame - latest.frame <= CAPTION_FRAMES ? latest : null;

  // EVENT -> CAMERA MOVE: only when the action moves to another theatre.
  useEffect(() => {
    if (!cinematic || !data || !fresh) return;
    if (fresh.theatreId === lastTheatre.current) return;
    lastTheatre.current = fresh.theatreId;
    const place = fresh.placeId ? data.placeById.get(fresh.placeId) ?? data.nationById.get(fresh.placeId) : null;
    if (place?.x != null && place.y != null) focusPoint(place.x, place.y, 4.3);
  }, [cinematic, data, fresh, focusPoint]);

  useEffect(() => {
    if (!cinematic) {
      lastTheatre.current = null;
      setIntro(true);
      return;
    }
    const id = window.setTimeout(() => setIntro(false), 4500);
    return () => window.clearTimeout(id);
  }, [cinematic]);

  if (!cinematic || !data || !state) return null;
  const day = data.timeline.battleDay[frame];
  const fpd = data.manifest.clock.framesPerDay;
  const hhmm = `${String(Math.floor(((frame % fpd) * 10) / 60)).padStart(2, '0')}:${String(((frame % fpd) * 10) % 60).padStart(2, '0')}`;
  const leader = fresh?.characterIds.map((c) => data.characterById.get(c)).find((c) => c?.photocard) ?? null;
  const ended = frame >= data.manifest.clock.frameCount - 1;
  const t = data.campaignTotals;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Date: the strongest readout. */}
      <div className="absolute left-5 top-4">
        <p className="figure text-[clamp(28px,5.2vh,52px)] font-medium leading-none text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.85)]">{battleDayLabel(day)}</p>
        <p className="figure mt-1 text-[clamp(14px,2.4vh,22px)] text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">
          {hhmm} <span className="text-[0.6em] uppercase tracking-label text-white/60">simulation time</span>
        </p>
        <p className="mt-1 text-sm uppercase tracking-label text-white/70 [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">{phaseLabel(state.phase)}</p>
      </div>

      {/* Ledger, top right. */}
      <div className="absolute right-5 top-4 w-[min(17rem,40vw)] rounded-[4px] border border-white/10 bg-ink-950/55 p-3 backdrop-blur-sm">
        <p className="eyebrow text-white/60">Imperial losses to date</p>
        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <span className="text-white/70">Killed</span>
          <span className="text-right"><Figure value={state.casualties.empire.kia} /></span>
          <span className="text-white/70">Revived</span>
          <span className="text-right"><Figure value={state.casualties.empire.revived} /></span>
          <span className="text-white/70">Captured</span>
          <span className="text-right"><Figure value={state.casualties.empire.pow} /></span>
        </div>
        <p className="mt-2 border-t border-white/10 pt-1.5 text-2xs text-white/55">Tempest killed: <Figure value={state.casualties.tempest.kia} /></p>
      </div>

      {/* Leader card for the moment, from the photocard repository. */}
      {leader && !ended ? (
        <div key={leader.id} className="absolute right-5 top-[13.5rem] flex w-[min(17rem,40vw)] animate-[caption-in_300ms_ease-out] items-center gap-3 rounded-[4px] border border-white/10 bg-ink-950/55 p-2 backdrop-blur-sm">
          <Portrait src={leader.photocard!.src} name={leader.name} size={52} faction={leader.faction} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{leader.name}</p>
            <p className="truncate text-2xs text-white/60">{leader.faction}</p>
          </div>
        </div>
      ) : null}

      {/* One caption at a time, lower third. */}
      {fresh && !ended ? (
        <div key={fresh.id} className="absolute bottom-24 left-1/2 w-[min(46rem,calc(100vw-2rem))] -translate-x-1/2 animate-[caption-in_200ms_ease-out] rounded-[4px] border border-white/10 bg-ink-950/80 px-4 py-2.5 backdrop-blur-sm" role="status" aria-live="polite">
          <p className="text-[clamp(15px,2.2vh,20px)] font-semibold leading-snug text-white">{fresh.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/70">
            <span>{fresh.location}</span>
            <span aria-hidden>·</span>
            <span>{fresh.theatre}</span>
            <ProvenanceBadge value={fresh.provenance} compact />
            <span className="sr-only">{PROVENANCE_LABEL[fresh.provenance].note}</span>
          </p>
        </div>
      ) : null}

      {/* Opening disclaimer, then the closing card. */}
      {intro && !ended ? (
        <div className="absolute left-5 top-[9.5rem] max-w-xs rounded-[4px] border border-white/10 bg-ink-950/75 px-3 py-2 text-2xs leading-relaxed text-white/75">
          A fan-made reconstruction from the Tensura light novels, vols. 12–16. Not official material. Times are simulation placements; reconstructed elements are labelled.
        </div>
      ) : null}
      {ended ? (
        <div className="absolute left-1/2 top-1/2 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[5px] border border-white/10 bg-ink-950/85 p-5 text-center backdrop-blur">
          <p className="eyebrow text-white/60">End of the campaign record</p>
          <p className="mt-2 font-display text-2xl text-white">Tempest–Eastern Empire War</p>
          <div className="mx-auto mt-3 grid max-w-xs grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-left text-white/70">Imperial killed</span>
            <span className="text-right"><Figure value={t.empireKilled} /></span>
            <span className="text-left text-white/70">Revived</span>
            <span className="text-right"><Figure value={t.empireRevived} /></span>
            <span className="text-left text-white/70">Permanently dead</span>
            <span className="text-right"><Figure value={t.empirePermanentDead} /></span>
            <span className="text-left text-white/70">Tempest killed</span>
            <span className="text-right"><Figure value={t.tempestKilled} /></span>
          </div>
          <p className="mt-3 text-2xs text-white/55">Every figure is summed from event-level records; see the dossiers for sources.</p>
        </div>
      ) : null}

      <button type="button" onClick={() => setViewMode('standard')} className="ctl pointer-events-auto absolute right-5 top-[calc(100%-7.5rem)] bg-ink-900/70" aria-label="Leave cinematic mode (Esc)">
        <X size={14} /> Exit cinematic
      </button>
    </div>
  );
}
