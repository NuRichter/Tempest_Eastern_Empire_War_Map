'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Pause, Play, SkipBack, SkipForward } from 'lucide-react';

import type { Dataset } from '@/data/loader';
import { battleDayLabel } from '@/lib/format';
import { FACTION_COLOR, INK } from '@/lib/palette';
import { eventCategory, PROVENANCE_LABEL, TIME_PRECISION_LABEL } from '@/lib/taxonomy';
import { FRAMES_PER_SECOND_AT_1X, SPEEDS } from '@/simulation/clock';
import { currentEvent, nextEvent } from '@/simulation/resolver';
import { useSimulation } from '@/simulation/store';
import { usePreferences } from '@/state/preferences';
import { eventVisible } from '@/map/overlay/context';
import { ProvenanceBadge } from '@/components/ui/primitives';
import { useT } from '@/i18n';
import type { FrameState } from '@/types/dataset';

const CATEGORY_COLOR: Record<string, string> = {
  COMBAT: '#e0614f',
  MOVEMENT: '#a9c8f2',
  COMMAND: '#a7b1b5',
  INTELLIGENCE: '#86d8bd',
  POLITICAL: '#e6cc91',
};

/** Simulated time per second of wall clock at a speed: 1x = 30 simulated minutes. */
function rateLabel(speed: number, t: ReturnType<typeof useT>): string {
  const minutes = speed * FRAMES_PER_SECOND_AT_1X * 10;
  if (minutes < 60) return t('{n} min/s', { n: Math.round(minutes) });
  if (minutes < 60 * 24) return t('{n} h/s', { n: +(minutes / 60).toFixed(1) });
  return t('{n} d/s', { n: +(minutes / 1440).toFixed(1) });
}

/** Spans in which each theatre is live, computed once by replaying the state stream. */
function theatreLanes(data: Dataset): Record<string, [number, number][]> {
  const out: Record<string, [number, number][]> = {};
  let state: FrameState = data.checkpoints[0];
  const open: Record<string, number | null> = {};
  const n = data.manifest.clock.frameCount;
  for (let f = 0; f < n; f += 1) {
    const d = data.deltas.deltas[String(f)];
    if (f > 0 && d) state = { ...state, ...d };
    for (const th of data.theatres) {
      const live = state.theatres[th.id]?.status === 'ACTIVE';
      if (live && open[th.id] == null) open[th.id] = f;
      if ((!live || f === n - 1) && open[th.id] != null) {
        (out[th.id] ??= []).push([open[th.id]!, f]);
        open[th.id] = null;
      }
    }
  }
  return out;
}

export function Timeline() {
  const t = useT();
  const data = useSimulation((s) => s.data);
  const clock = useSimulation((s) => s.clock);
  const frame = useSimulation((s) => s.frame);
  const playing = useSimulation((s) => s.playing);
  const seek = useSimulation((s) => s.seek);
  const toggle = useSimulation((s) => s.toggle);
  const stepEvent = useSimulation((s) => s.stepEvent);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const setSpeedIndex = useSimulation((s) => s.setSpeedIndex);
  const filters = useSimulation((s) => s.filters);
  const viewMode = useSimulation((s) => s.viewMode);
  const speedIndex = usePreferences((s) => s.speedIndex);
  const autoSlowed = useSimulation((s) => s.autoSlowed);
  const bookmarks = usePreferences((s) => s.bookmarks);
  const uiTheme = usePreferences((s) => s.uiTheme);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playheadRef = useRef<HTMLDivElement | null>(null);
  // Track width from a ResizeObserver: reading clientWidth every frame forced a layout.
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState<{ frame: number; x: number } | null>(null);
  const [windowMode, setWindowMode] = useState<'all' | 'combat'>('all');

  const frameCount = data?.manifest.clock.frameCount ?? 1;
  const fpd = data?.manifest.clock.framesPerDay ?? 144;
  const lanes = useMemo(() => (data ? theatreLanes(data) : {}), [data]);

  // The visible window: the whole campaign, or from two days before first contact.
  const range = useMemo<[number, number]>(() => {
    if (!data || windowMode === 'all') return [0, frameCount - 1];
    return [Math.max(0, data.manifest.campaign.firstContactFrame - 2 * fpd), frameCount - 1];
  }, [data, windowMode, frameCount, fpd]);

  const volumeMarks = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, number>();
    for (const e of data.events) {
      for (const r of e.sourceRefs) {
        const v = r.volume.replace(/^V(ol\.?)?\s*/i, '');
        if (/^\d+$/.test(v) && !seen.has(v)) seen.set(v, e.frame);
      }
    }
    return [...seen.entries()].sort((a, b) => a[1] - b[1]);
  }, [data]);

  /* -- draw ----------------------------------------------------------- */

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => setTrackWidth(track.clientWidth));
    ro.observe(track);
    setTrackWidth(track.clientWidth);
    return () => ro.disconnect();
  }, [data]);

  // The static picture (stages, lanes, gaps, battles, events, marks): redrawn only
  // when what it shows changes, never per frame. The playhead is a separate element.
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || !trackWidth) return;
    const width = trackWidth;
    const height = 58;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(width * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const [r0, r1] = range;
    const px = (f: number) => ((f - r0) / Math.max(1, r1 - r0)) * width;
    const css = getComputedStyle(document.documentElement);
    const font = css.getPropertyValue('--font-mono').trim() || 'monospace';
    const token = (name: string, alpha = 1) => `rgb(${css.getPropertyValue(name).trim() || '125 137 142'} / ${alpha})`;
    const light = uiTheme === 'light';

    // Stage bands (top), alternating tone, labelled when there is room.
    data.stages.forEach((s, i) => {
      const x0 = Math.max(0, px(s.startFrame));
      const x1 = Math.min(width, px(s.endFrame + 1));
      if (x1 <= 0 || x0 >= width) return;
      ctx.fillStyle = i % 2 ? token('--ink-600') : token('--ink-700');
      ctx.fillRect(x0, 0, x1 - x0, 14);
      ctx.font = `500 9.5px ${font}`;
      const label = s.name.replace(/_/g, ' ').toLowerCase();
      if (ctx.measureText(label).width < x1 - x0 - 6) {
        ctx.fillStyle = token('--fg-3');
        ctx.fillText(label, x0 + 3, 10);
      }
    });

    // Day rules.
    ctx.strokeStyle = light ? 'rgba(20,25,28,0.08)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const dayStep = (r1 - r0) / fpd > 20 ? 5 : 1;
    for (let d = Math.ceil(r0 / fpd); d * fpd <= r1; d += 1) {
      if (d % dayStep !== 0) continue;
      const x = Math.round(px(d * fpd)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Theatre lanes: when each theatre is live.
    data.theatres.forEach((th, i) => {
      const y = 17 + i * 3;
      for (const [a, b] of lanes[th.id] ?? []) {
        ctx.fillStyle = th.colorKey === 'empire' ? FACTION_COLOR.empire : th.colorKey === 'dwargon' ? FACTION_COLOR.dwargon : th.colorKey === 'tempest' ? FACTION_COLOR.tempest : FACTION_COLOR.neutral;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(px(a), y, Math.max(1, px(b) - px(a)), 2);
      }
    });
    ctx.globalAlpha = 1;

    // Timeline gaps: stretches the record does not fill; their length is a placement.
    for (const g of data.gaps) {
      const x0 = px(g.fromFrame);
      const x1 = px(g.toFrame);
      if (x1 < 0 || x0 > width) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, 34, Math.max(1, x1 - x0), 3);
      ctx.clip();
      ctx.strokeStyle = g.confidence === 'LOW' ? 'rgba(212,171,87,0.75)' : 'rgba(167,177,181,0.45)';
      ctx.lineWidth = 1;
      for (let x = x0 - 4; x < x1 + 4; x += 4) {
        ctx.beginPath();
        ctx.moveTo(x, 37);
        ctx.lineTo(x + 3, 34);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Battle spans.
    for (const b of data.battles) {
      const x0 = px(b.startFrame);
      const x1 = Math.max(x0 + 2, px(b.endFrame));
      ctx.fillStyle = 'rgba(224,97,79,0.28)';
      ctx.fillRect(x0, 36, x1 - x0, 20);
    }

    // Event ticks, coloured by category; filtered events stay as faint stubs.
    for (const e of data.events) {
      const x = Math.round(px(e.frame)) + 0.5;
      if (x < 0 || x > width) continue;
      const visible = eventVisible(filters, e);
      ctx.strokeStyle = e.turningPoint ? INK.accent : CATEGORY_COLOR[eventCategory(e.type)];
      ctx.globalAlpha = visible ? (e.turningPoint ? 1 : 0.8) : 0.15;
      ctx.lineWidth = e.turningPoint ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, e.turningPoint ? 34 : 40);
      ctx.lineTo(x, 56);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Volume markers.
    ctx.font = `500 9px ${font}`;
    for (const [v, f] of volumeMarks) {
      const x = px(f);
      if (x < 0 || x > width) continue;
      ctx.fillStyle = token('--fg-3');
      ctx.fillText(`V${v}`, x + 2, 33);
    }

    // Bookmarks: small accent flags along the bottom edge.
    ctx.fillStyle = INK.accent;
    for (const b of bookmarks) {
      const x = px(b.frame);
      if (x < 0 || x > width) continue;
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x - 4, height - 6);
      ctx.lineTo(x + 4, height - 6);
      ctx.closePath();
      ctx.fill();
    }

    // First contact.
    const cx = Math.round(px(data.manifest.campaign.firstContactFrame)) + 0.5;
    ctx.strokeStyle = FACTION_COLOR.empire;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(cx, 14);
    ctx.lineTo(cx, height);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [data, range, lanes, filters, volumeMarks, fpd, bookmarks, uiTheme, trackWidth]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Playhead: a transform on its own element (compositor only), continuous while playing.
  const placePlayhead = useCallback(() => {
    const el = playheadRef.current;
    if (!el || !clock || !trackWidth) return;
    const [r0, r1] = range;
    const x = Math.round(((clock.frame - r0) / Math.max(1, r1 - r0)) * trackWidth);
    el.style.transform = `translateX(${x}px)`;
  }, [clock, range, trackWidth]);

  useEffect(() => {
    placePlayhead();
  }, [placePlayhead, frame]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      placePlayhead();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, placePlayhead]);

  /* -- scrubbing ------------------------------------------------------ */

  const frameAt = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const pos = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return Math.round(range[0] + pos * (range[1] - range[0]));
    },
    [range],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => seek(frameAt(e.clientX));
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, frameAt, seek]);

  if (!data) return null;

  const latest = currentEvent(data, frame);
  const upcoming = nextEvent(data, frame);
  const day = data.timeline.battleDay[frame];
  const inDay = frame % fpd;
  const hhmm = `${String(Math.floor((inDay * 10) / 60)).padStart(2, '0')}:${String((inDay * 10) % 60).padStart(2, '0')}`;
  const hoverEvent = hover ? data.events.reduce<{ e: (typeof data.events)[number]; d: number } | null>((best, e) => {
    const d = Math.abs(e.frame - hover.frame);
    return d < (range[1] - range[0]) / 120 + 2 && (!best || d < best.d) ? { e, d } : best;
  }, null)?.e ?? null : null;
  const elapsedDays = Math.floor((frame - data.manifest.campaign.firstContactFrame) / fpd);
  const toContact = data.manifest.campaign.firstContactFrame - frame;
  const daysToContact = Math.ceil(toContact / fpd);
  const beforeContact =
    toContact < fpd
      ? t('{n} h before first contact', { n: Math.max(1, Math.round((toContact / fpd) * 24)) })
      : daysToContact === 1
        ? t('1 day before first contact')
        : t('{n} days before first contact', { n: daysToContact });

  const cinematic = viewMode === 'cinematic';

  return (
    <section
      data-tour="timeline"
      id="timeline"
      aria-label={t('Campaign timeline')}
      className={`z-30 shrink-0 border-t border-ink-500 bg-ink-850 px-3 pb-2 pt-1.5 ${cinematic ? 'absolute inset-x-0 bottom-0 bg-ink-850/90 opacity-0 transition-opacity duration-300 hover:opacity-100 focus-within:opacity-100' : 'relative'}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex items-center gap-1" role="group" aria-label={t('Playback')}>
          <button type="button" className="ctl w-8 px-0" onClick={() => seek(0)} aria-label={t('Campaign start')} title={t('Campaign start')}>
            <SkipBack size={14} strokeWidth={1.7} />
          </button>
          <button type="button" data-tour="step-event" className="ctl w-8 px-0" onClick={() => stepEvent(-1)} aria-label={t('Previous event')} title={t('Previous event ([)')}>
            <ChevronsLeft size={15} strokeWidth={1.7} />
          </button>
          <button type="button" className="ctl w-8 px-0" onClick={() => seek(frame - fpd)} aria-label={t('Back one day')} title={t('Back one day (Shift+←)')}>
            <ChevronLeft size={15} strokeWidth={1.7} />
          </button>
          <button type="button" data-tour="play" onClick={toggle} aria-label={playing ? t('Pause') : t('Play')} title={playing ? t('Pause (Space)') : t('Play (Space)')} className="grid h-9 w-11 place-items-center rounded-[3px] border border-accent/70 bg-accent/15 text-fg hover:bg-accent/25">
            {playing ? <Pause size={16} strokeWidth={2} /> : <Play size={16} strokeWidth={2} />}
          </button>
          <button type="button" className="ctl w-8 px-0" onClick={() => seek(frame + fpd)} aria-label={t('Forward one day')} title={t('Forward one day (Shift+→)')}>
            <ChevronRight size={15} strokeWidth={1.7} />
          </button>
          <button type="button" className="ctl w-8 px-0" onClick={() => stepEvent(1)} aria-label={t('Next event')} title={t('Next event (])')}>
            <ChevronsRight size={15} strokeWidth={1.7} />
          </button>
          <button type="button" className="ctl w-8 px-0" onClick={() => seek(frameCount - 1)} aria-label={t('Campaign end')} title={t('Campaign end')}>
            <SkipForward size={14} strokeWidth={1.7} />
          </button>
        </div>

        <label className="flex items-center gap-1.5 text-xs text-fg-3">
          <span className="sr-only sm:not-sr-only">{t('Speed')}</span>
          <select data-tour="speed" value={speedIndex} onChange={(e) => setSpeedIndex(Number(e.target.value))} className="h-8 rounded-[3px] border border-ink-500 bg-ink-800 px-1.5 text-xs text-fg" aria-label={t('Playback speed')}>
            {SPEEDS.map((s, i) => (
              <option key={s} value={i}>
                {s}× · {rateLabel(s, t)}
              </option>
            ))}
          </select>
        </label>
        {autoSlowed ? (
          <span role="status" className="rounded-[2px] border border-accent/60 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-label text-accent" title={t('Playback slowed at a turning point. It resumes your speed in a moment. Turn off in Layers.')}>
            {t('1× turning point')}
          </span>
        ) : null}

        <div className="flex items-baseline gap-2" aria-live="off">
          <span className="figure text-lg leading-none text-fg">{battleDayLabel(day)}</span>
          <span className="figure text-sm text-fg-2" title={t('Simulation time on a 10-minute grid. The novels give no clock times.')}>{hhmm}</span>
          <span className="rounded-[2px] border border-ink-400 px-1 text-2xs uppercase tracking-label text-fg-3" title={data.manifest.clock.calendarNote}>
            {t('simulation')}
          </span>
          <span className="hidden text-xs text-fg-3 lg:inline">{elapsedDays >= 0 ? t('day {n} of the fighting', { n: elapsedDays + 1 }) : beforeContact}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div role="radiogroup" aria-label={t('Timeline window')} className="hidden overflow-hidden rounded-[3px] border border-ink-500 sm:flex">
            {(['all', 'combat'] as const).map((m, i) => (
              <button key={m} type="button" role="radio" aria-checked={windowMode === m} onClick={() => setWindowMode(m)} className={`h-7 px-2 text-xs ${i ? 'border-l border-ink-500' : ''} ${windowMode === m ? 'bg-accent/15 text-fg' : 'text-fg-3 hover:text-fg'}`}>
                {m === 'all' ? t('Whole campaign') : t('Fighting')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-1.5">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={t('Campaign position')}
          aria-valuemin={0}
          aria-valuemax={frameCount - 1}
          aria-valuenow={frame}
          aria-valuetext={latest ? t('{day} {time}, simulation time. Latest event: {title}', { day: battleDayLabel(day), time: hhmm, title: latest.title }) : t('{day} {time}, simulation time', { day: battleDayLabel(day), time: hhmm })}
          className="relative h-[58px] cursor-ew-resize touch-none select-none rounded-[2px]"
          onPointerDown={(e) => {
            try {
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            } catch {
              /* synthetic or already-released pointer: window listeners still track the drag */
            }
            setDragging(true);
            seek(frameAt(e.clientX));
          }}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHover({ frame: frameAt(e.clientX), x: e.clientX - rect.left });
          }}
          onPointerLeave={() => setHover(null)}
          onDoubleClick={() => hoverEvent && jumpToEvent(hoverEvent.id)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); seek(frame - (e.shiftKey ? fpd : 6)); }
            if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); seek(frame + (e.shiftKey ? fpd : 6)); }
            if (e.key === 'Home') seek(0);
            if (e.key === 'End') seek(frameCount - 1);
            if (e.key === 'PageUp') stepEvent(-1);
            if (e.key === 'PageDown') stepEvent(1);
          }}
        >
          <canvas ref={canvasRef} className="block h-[58px] w-full" />
          <div ref={playheadRef} className="pointer-events-none absolute left-0 top-0 h-full will-change-transform" aria-hidden>
            <div className="absolute -left-[0.75px] top-0 h-full w-[1.5px] bg-fg" />
            <div className="absolute -left-[5px] top-0 h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent" style={{ borderTopColor: INK.accent }} />
          </div>
          {hover ? (
            <div className="pointer-events-none absolute bottom-full mb-1 max-w-[20rem] -translate-x-1/2 rounded-[3px] border border-ink-500 bg-ink-900/95 px-2 py-1 shadow-panel" style={{ left: Math.min(Math.max(hover.x, 120), (trackRef.current?.clientWidth ?? 600) - 120) }}>
              <p className="figure text-2xs text-fg-3">
                {battleDayLabel(data.timeline.battleDay[hover.frame])} · {String(Math.floor(((hover.frame % fpd) * 10) / 60)).padStart(2, '0')}:{String(((hover.frame % fpd) * 10) % 60).padStart(2, '0')}
              </p>
              {hoverEvent ? <p className="truncate text-xs text-fg">{hoverEvent.title}</p> : null}
              {hoverEvent ? <p className="text-2xs text-fg-3">{t('double-click to open')}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      {!cinematic ? (
        <div className="mt-1.5 flex min-h-6 items-center gap-3 text-xs">
          {latest ? (
            <button type="button" onClick={() => jumpToEvent(latest.id, { seek: false })} className="flex min-w-0 items-center gap-2 text-left hover:text-accent">
              <span className="eyebrow shrink-0">{t('Now')}</span>
              <span className="figure shrink-0 text-fg-3">{latest.warDay} {latest.simulationTime}</span>
              <span className="truncate text-fg">{latest.title}</span>
              <span className="hidden shrink-0 md:inline">
                <ProvenanceBadge value={latest.provenance} compact />
              </span>
              <span className="hidden shrink-0 text-2xs text-fg-3 xl:inline" title={t(TIME_PRECISION_LABEL[latest.timePrecision])}>
                {t(TIME_PRECISION_LABEL[latest.timePrecision])}
              </span>
            </button>
          ) : (
            <span className="text-fg-3">{t('No event recorded yet.')}</span>
          )}
          {upcoming ? (
            <button type="button" onClick={() => jumpToEvent(upcoming.id)} className="ml-auto hidden min-w-0 items-center gap-2 text-left text-fg-3 hover:text-accent md:flex">
              <span className="eyebrow shrink-0">{t('Next')}</span>
              <span className="figure shrink-0">{upcoming.warDay} {upcoming.simulationTime}</span>
              <span className="truncate">{upcoming.title}</span>
              <span className="sr-only">({t(PROVENANCE_LABEL[upcoming.provenance].long)})</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
