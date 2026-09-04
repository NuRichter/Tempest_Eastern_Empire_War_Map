'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

import { columnAt } from '@/data/loader';
import { battleDayLabel, campaignClock, frameClock, phaseLabel } from '@/lib/format';
import { FACTION_COLOR, INK } from '@/lib/palette';
import { SPEEDS, type Speed } from '@/simulation/clock';
import { useSimulation } from '@/simulation/store';

const PHASE_TINT: Record<string, string> = {
  STRATEGIC_PREPARATION: '#3a3d3a',
  INVASION_PREPARATION: '#43423a',
  OPERATIONAL_APPROACH: '#4a4534',
  BORDER_CROSSING: '#5b4a34',
  DEPLOYMENT: '#63502f',
  FIRST_CONTACT: '#8c3a31',
  ACTIVE_COMBAT: '#7a3b31',
  SECOND_OFFENSIVE: '#5e4a3a',
  TERMINATION_AND_SETTLEMENT: '#3f5348',
};

/**
 * Campaign timeline.
 *
 * The whole war on one bar: phase bands beneath, event ticks above, turning
 * points raised. Scrubbing seeks; the simulation clock is the only thing that
 * moves, and the map follows it.
 */
export function Timeline() {
  const data = useSimulation((s) => s.data);
  const clock = useSimulation((s) => s.clock);
  const frame = useSimulation((s) => s.frame);
  const playing = useSimulation((s) => s.playing);
  const speed = useSimulation((s) => s.speed);
  const state = useSimulation((s) => s.state);
  const seek = useSimulation((s) => s.seek);
  const setSpeed = useSimulation((s) => s.setSpeed);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const viewMode = useSimulation((s) => s.viewMode);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hoverFrame, setHoverFrame] = useState<number | null>(null);

  const frameCount = data?.manifest.clock.frameCount ?? 1;

  const bands = useMemo(() => {
    if (!data) return [];
    const out: { from: number; to: number; phase: string }[] = [];
    let start = 0;
    let current = columnAt(data.timeline.phase, 0);
    for (let f = 1; f < frameCount; f += 1) {
      const phase = columnAt(data.timeline.phase, f);
      if (phase !== current) {
        out.push({ from: start, to: f - 1, phase: current });
        start = f;
        current = phase;
      }
    }
    out.push({ from: start, to: frameCount - 1, phase: current });
    return out;
  }, [data, frameCount]);

  /* -- draw the bar ------------------------------------------------- */

  const drawBar = useCallback(() => {
    const canvas = canvasRef.current;
    const track = trackRef.current;
    if (!canvas || !track || !data) return;
    const width = track.clientWidth;
    const height = 34;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const px = (f: number) => (f / (frameCount - 1)) * width;

    // Phase bands
    for (const band of bands) {
      const x0 = px(band.from);
      const x1 = px(band.to);
      ctx.fillStyle = PHASE_TINT[band.phase] ?? '#3a3d3a';
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x0, 14, Math.max(1, x1 - x0), 12);
    }
    ctx.globalAlpha = 1;

    // Day rules
    ctx.strokeStyle = 'rgba(160,138,82,0.16)';
    ctx.lineWidth = 1;
    for (let d = 0; d <= frameCount / 144; d += 5) {
      const x = Math.round(px(d * 144)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 12);
      ctx.lineTo(x, 28);
      ctx.stroke();
    }

    // Event ticks
    for (const event of data.events) {
      const x = px(event.frame);
      const turning = event.turningPoint;
      ctx.strokeStyle = turning ? INK.brass : event.significance === 'CRITICAL' ? FACTION_COLOR.empire : INK.textFaint;
      ctx.lineWidth = turning ? 1.6 : 1;
      ctx.globalAlpha = turning ? 0.95 : 0.6;
      ctx.beginPath();
      ctx.moveTo(x, turning ? 2 : 6);
      ctx.lineTo(x, 13);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // First contact
    const contact = data.manifest.campaign.firstContactFrame;
    const cx = Math.round(px(contact)) + 0.5;
    ctx.strokeStyle = FACTION_COLOR.empire;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Playhead
    const hx = Math.round(px(frame)) + 0.5;
    ctx.strokeStyle = INK.text;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hx, 0);
    ctx.lineTo(hx, height);
    ctx.stroke();
    ctx.fillStyle = INK.text;
    ctx.beginPath();
    ctx.moveTo(hx, 30);
    ctx.lineTo(hx - 4, 34);
    ctx.lineTo(hx + 4, 34);
    ctx.closePath();
    ctx.fill();
  }, [bands, data, frame, frameCount]);

  useEffect(() => {
    drawBar();
    const onResize = () => drawBar();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [drawBar]);

  // While playing, the playhead must move between integer frames too.
  useEffect(() => {
    if (!playing || !clock) return;
    let raf = 0;
    const tick = () => {
      drawBar();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, clock, drawBar]);

  /* -- scrubbing ---------------------------------------------------- */

  const frameFromEvent = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return Math.round(t * (frameCount - 1));
    },
    [frameCount],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => seek(frameFromEvent(e.clientX));
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, frameFromEvent, seek]);

  if (!data || !state) return null;

  const nearbyEvent = hoverFrame !== null
    ? data.events.reduce<{ id: string; d: number; action: string } | null>((best, e) => {
        const d = Math.abs(e.frame - hoverFrame);
        if (d < 40 && (!best || d < best.d)) return { id: e.id, d, action: e.action };
        return best;
      }, null)
    : null;

  const transport =
    'grid h-8 w-8 place-items-center border border-chart-rule/35 text-chart-faint transition-colors ' +
    'hover:border-brass/60 hover:text-chart-paper focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-brass';

  return (
    <div
      className={`border-t border-chart-rule/30 bg-ink-850/90 px-3 py-2 backdrop-blur ${
        viewMode === 'presentation' ? 'py-1.5' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" className={transport} onClick={() => seek(0)} title="Back to campaign start" aria-label="Back to campaign start">
            <RotateCcw size={14} strokeWidth={1.6} />
          </button>
          <button type="button" className={transport} onClick={() => seek(frame - 144)} title="Back one day" aria-label="Back one day">
            <SkipBack size={14} strokeWidth={1.6} />
          </button>
          <button type="button" className={transport} onClick={() => seek(frame - 1)} title="Back one keyframe" aria-label="Back one keyframe">
            <ChevronLeft size={14} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            className={`${transport} border-brass/60 text-chart-paper`}
            onClick={() => clock?.toggle()}
            title={playing ? 'Pause' : 'Play'}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={15} strokeWidth={1.8} /> : <Play size={15} strokeWidth={1.8} />}
          </button>
          <button type="button" className={transport} onClick={() => seek(frame + 1)} title="Forward one keyframe" aria-label="Forward one keyframe">
            <ChevronRight size={14} strokeWidth={1.6} />
          </button>
          <button type="button" className={transport} onClick={() => seek(frame + 144)} title="Forward one day" aria-label="Forward one day">
            <SkipForward size={14} strokeWidth={1.6} />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-px">
          {SPEEDS.map((s: Speed) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`border px-1.5 py-1 font-figure text-micro transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass ${
                speed === s
                  ? 'border-brass bg-brass/20 text-chart-paper'
                  : 'border-chart-rule/30 text-chart-faint hover:border-chart-rule/60 hover:text-chart-paper'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="Campaign timeline"
            aria-valuemin={0}
            aria-valuemax={frameCount - 1}
            aria-valuenow={frame}
            aria-valuetext={`${columnAt(data.timeline.date, frame)} ${frameClock(frame)}`}
            className="relative cursor-ew-resize select-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass"
            onPointerDown={(e) => {
              setDragging(true);
              seek(frameFromEvent(e.clientX));
            }}
            onPointerMove={(e) => setHoverFrame(frameFromEvent(e.clientX))}
            onPointerLeave={() => setHoverFrame(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') seek(frame - (e.shiftKey ? 144 : 6));
              if (e.key === 'ArrowRight') seek(frame + (e.shiftKey ? 144 : 6));
            }}
            onDoubleClick={() => nearbyEvent && jumpToEvent(nearbyEvent.id)}
          >
            <canvas ref={canvasRef} className="block h-[34px] w-full" />
            {nearbyEvent && hoverFrame !== null ? (
              <div
                className="pointer-events-none absolute -top-7 max-w-xs truncate border border-chart-rule/50 bg-ink-800 px-1.5 py-0.5 font-ui text-micro text-chart-paper"
                style={{ left: `${(hoverFrame / (frameCount - 1)) * 100}%`, transform: 'translateX(-50%)' }}
              >
                {nearbyEvent.action}
              </div>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="font-figure text-tiny leading-tight text-chart-paper">
            {columnAt(data.timeline.date, frame)} · {frameClock(frame)}
          </div>
          <div className="font-figure text-micro leading-tight text-chart-faint">
            {battleDayLabel(data.timeline.battleDay[frame])} · {campaignClock(frame)} · frame {frame + 1}/{frameCount}
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center gap-2 font-ui text-micro text-chart-faint">
        <span className="text-chart-paper/80">{phaseLabel(state.phase)}</span>
        <span aria-hidden>|</span>
        <span className="truncate">{state.activeBattles}</span>
      </div>
    </div>
  );
}
