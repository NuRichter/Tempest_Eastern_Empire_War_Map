'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Map as MapIcon, Music2, Play, Timer, VolumeX, X } from 'lucide-react';

import { BigMoment, CineIntro, EventStack, MOMENT_MS, Viewfinder } from './CinematicParts';

import { useT } from '@/i18n';
import { battleDayLabel, phaseLabel } from '@/lib/format';
import { FACTION_COLOR, factionKey } from '@/lib/palette';
import { currentEvent } from '@/simulation/resolver';
import { useSimulation } from '@/simulation/store';
import { Figure, Flag, Portrait } from '@/components/ui/primitives';
import { RollingNumber } from '@/components/ui/RollingNumber';
import { FRAMES_PER_SECOND_AT_1X, SPEEDS } from '@/simulation/clock';
import { usePreferences } from '@/state/preferences';
import { focusOn, SHOT_LABEL, useDirector } from '@/map/cinematic/director';
import type { Battle, Character, WarEvent } from '@/types/dataset';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const FILM_SPEED_INDEX = 4; // 4×: a simulated day in a few seconds, battles still readable

/**
 * Auto Timing: the film sets its own pace from what is happening.
 * Speed indices into SPEEDS (0.25, 0.5, 1, 2, 4, 8, 16, 48).
 */
const STAGE_PACE: Record<string, number> = {
  PRE_WAR_PREPARATION: 6, // 16×
  IMPERIAL_DECISION_AND_MOBILIZATION: 6,
  APPROACH_MARCH: 6, // 16× until the border is crossed, then 8×
  HALT_AND_DEPLOYMENT: 5, // 8×: the first advance
  FIRST_CONTACT_AND_SURFACE_BATTLE: 3, // 2×, battles at 1×
  LABYRINTH_RAID: 5,
  ANNIHILATION_OF_THE_OUTSIDE_CAMP: 3,
  RESURRECTION_AND_CONSOLIDATION: 5,
  LONG_NIGHT: 3,
  POST_WAR_INTERVAL: 6,
  SUMMIT_AND_SETTLEMENT: 5,
  REPATRIATION_PREPARATION: 6,
};
function autoPace(data: NonNullable<ReturnType<typeof useSimulation.getState>['data']>, stage: string, frame: number): number {
  const st = data.stages.find((s) => s.id === stage || s.name === stage);
  let pace = st ? STAGE_PACE[st.name] ?? 4 : 4;
  const crossing = data.eventById.get('EVT-0015')?.frame ?? Infinity;
  if (st?.name === 'APPROACH_MARCH' && frame >= crossing) pace = 5;
  for (const b of data.battles) {
    if (b.endFrame - b.startFrame > 144) continue; // the labyrinth operation runs for days
    if (frame >= b.startFrame && frame <= b.endFrame) return 2; // 1× in battle
    if (frame >= b.startFrame - 12 && frame < b.startFrame) pace = Math.min(pace, 3); // ease in before it
    if (frame > b.endFrame && frame <= b.endFrame + 6) pace = Math.min(pace, 3); // and out after
  }
  // Many events close together: slow one step so they can be read.
  const soon = data.events.filter((e) => e.frame > frame && e.frame <= frame + 12).length;
  if (soon >= 3) pace = Math.max(2, pace - 1);
  return pace;
}

/**
 * Cinematic mode: the war as a film.
 *
 * Letterbox bars close in, a vignette and a breath of film grain settle over
 * the map, and the camera is handed to the director (src/map/cinematic),
 * which reads the action and frames it: close on one front, wide and steady
 * when several fight at once, a tilted push-in when a battle opens, a slow
 * pull-out after. It opens with titles (series logo, arc title, credit),
 * then the film runs by itself. On top: the date, the loss ledger, chapter
 * cards at each stage of the war, a versus card when a battle begins, event
 * cards that stack and linger, a full-screen impact at each turning point
 * (with the camera pushed in on the place), and a film-strip progress bar.
 * Narration is the dataset's own wording.
 */

export function CinematicOverlay() {
  const viewMode = useSimulation((s) => s.viewMode);
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const state = useSimulation((s) => s.state);
  const playing = useSimulation((s) => s.playing);
  const speed = useSimulation((s) => s.clock?.currentSpeed ?? 1);
  const setViewMode = useSimulation((s) => s.setViewMode);
  const shot = useDirector((s) => s.shot);
  const fronts = useDirector((s) => s.fronts);
  const t = useT();
  const cinematic = viewMode === 'cinematic';

  const [intro, setIntro] = useState(true);
  const [moment, setMoment] = useState<{ e: WarEvent; key: number } | null>(null);
  const momentQueue = useRef<WarEvent[]>([]);
  // Keys for the turning-point card, so each moment replays its animation.
  const momentSeq = useRef(0);
  const momentTimer = useRef(0);
  const momentFrame = useRef<number | null>(null);
  const [cold, setCold] = useState<number | null>(null);
  const autoTiming = usePreferences((s) => s.autoTiming);
  const cinema3d = usePreferences((s) => s.cinema3d);
  const musicOn = usePreferences((s) => s.music);
  const setPref = usePreferences((s) => s.set);
  const [chapter, setChapter] = useState<{ n: number; name: string; key: number } | null>(null);
  const hooks = useMemo(() => {
    const out = new Map<string, string>();
    if (!data) return out;
    const rank: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };
    for (const st of data.stages) {
      const evs = st.anchorEvents.map((id) => data.eventById.get(id)).filter((e): e is WarEvent => Boolean(e));
      const best = [...evs].sort((a, b) => (rank[b.significance] ?? 0) - (rank[a.significance] ?? 0))[0];
      if (best) out.set(st.name, best.title);
    }
    return out;
  }, [data]);
  const [splash, setSplash] = useState<{ battle: Battle; key: number } | null>(null);
  const lastStage = useRef<string | null>(null);
  const liveBattles = useRef<Set<string>>(new Set());
  // Beat timers live outside the frame-driven effects, so playback does not reset them.
  const chapterTimer = useRef(0);
  const splashTimer = useRef(0);
  useEffect(() => () => { window.clearTimeout(chapterTimer.current); window.clearTimeout(splashTimer.current); }, []);

  // Entering: the clock pauses for the opening titles. Leaving: the camera focus is
  // released. (Story state starts fresh because AppShell remounts this per mode.)
  useEffect(() => {
    if (!cinematic) return;
    const s = useSimulation.getState();
    if (s.playing) s.toggle();
    const queue = momentQueue;
    const timer = momentTimer;
    return () => {
      queue.current = [];
      window.clearTimeout(timer.current);
      useDirector.setState({ focus: null });
    };
  }, [cinematic]);

  // Turning points: a full-screen impact, one after another, the camera sent to the place.
  useEffect(() => () => window.clearTimeout(momentTimer.current), []);
  const showMoment = (e: WarEvent) => {
    if (!data) return;
    momentSeq.current += 1;
    setMoment({ e, key: momentSeq.current });
    focusOn(data, e.placeId, MOMENT_MS + 1300);
    window.clearTimeout(momentTimer.current);
    momentTimer.current = window.setTimeout(() => {
      const next = momentQueue.current.shift();
      if (next) showMoment(next);
      else setMoment(null);
    }, MOMENT_MS);
  };
  useEffect(() => {
    if (!cinematic || !data || intro) { momentFrame.current = null; return; }
    const prev = momentFrame.current;
    momentFrame.current = frame;
    if (prev === null || frame <= prev || frame - prev > 240) return;
    for (const e of data.events) {
      if (e.frame <= prev) continue;
      if (e.frame > frame) break;
      if (!e.turningPoint) continue;
      if (moment) momentQueue.current = [...momentQueue.current, e].slice(-3);
      else showMoment(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cinematic, data, frame, intro]);

  // Chapter cards at each stage of the war.
  useEffect(() => {
    if (!cinematic || !data || !state) return;
    if (state.stage === lastStage.current) return;
    const first = lastStage.current === null;
    lastStage.current = state.stage;
    const idx = data.stages.findIndex((s) => s.id === state.stage || s.name === state.stage);
    if (first || idx < 0) return;
    setChapter({ n: idx + 1, name: data.stages[idx].name, key: frame });
    window.clearTimeout(chapterTimer.current);
    window.clearTimeout(chapterTimer.current);
    chapterTimer.current = window.setTimeout(() => setChapter(null), 4200);
  }, [cinematic, data, state, frame]);

  // A versus card when a battle opens.
  useEffect(() => {
    if (!cinematic || !data) return;
    const now = new Set(data.battles.filter((b) => frame >= b.startFrame && frame <= b.endFrame).map((b) => b.id));
    const opened = [...now].find((id) => !liveBattles.current.has(id));
    liveBattles.current = now;
    if (!opened || intro) return;
    const battle = data.battles.find((b) => b.id === opened)!;
    setSplash({ battle, key: frame });
    window.clearTimeout(splashTimer.current);
    splashTimer.current = window.setTimeout(() => setSplash(null), 4000);
  }, [cinematic, data, frame, intro]);

  // Auto Timing: follow the pace of the war while the film plays.
  useEffect(() => {
    if (!cinematic || !data || !state || !playing || !autoTiming || cold !== null) return;
    const want = moment ? 1 : autoPace(data, state.stage, frame); // 0.5× through a turning point
    const s = useSimulation.getState();
    if (s.clock && Math.abs(s.clock.currentSpeed - SPEEDS[want]) > 1e-6) s.setSpeedIndex(want);
  }, [cinematic, data, state, frame, playing, autoTiming, cold, moment]);

  // The cold open: three hook lines from the record before the film runs.
  const coldTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(coldTimer.current), []);
  useEffect(() => {
    if (cold === null) return;
    // Four lines, then the film: the last step clears the cold open.
    coldTimer.current = window.setTimeout(() => setCold((c) => (c === null || c + 1 >= 4 ? null : c + 1)), 2600);
  }, [cold]);

  const stageTicks = useMemo(() => {
    if (!data) return [];
    const N = data.manifest.clock.frameCount;
    return data.stages.map((s, i) => ({ id: s.id, at: s.startFrame / N, n: i + 1, name: s.name }));
  }, [data]);

  if (!cinematic || !data || !state) return null;

  const latest: WarEvent | null = currentEvent(data, frame);
  const N = data.manifest.clock.frameCount;
  const ended = frame >= N - 1;
  const day = data.timeline.battleDay[frame];
  const fpd = data.manifest.clock.framesPerDay;
  const hhmm = `${String(Math.floor(((frame % fpd) * 10) / 60)).padStart(2, '0')}:${String(((frame % fpd) * 10) % 60).padStart(2, '0')}`;
  const simPerSec = speed * FRAMES_PER_SECOND_AT_1X * 10;
  const rate = simPerSec < 60 ? t('{n} min / s', { n: Math.round(simPerSec) }) : simPerSec < 1440 ? t('{n} h / s', { n: +(simPerSec / 60).toFixed(1) }) : t('{n} days / s', { n: +(simPerSec / 1440).toFixed(1) });
  const fresh = latest && frame - latest.frame <= 30 ? latest : null;
  const leader = fresh?.characterIds.map((c) => data.characterById.get(c)).find((c) => c?.photocard) ?? null;
  const totals = data.campaignTotals;
  const shotText = shot === 'MULTI_FRONT' ? t('Wide · {n} fronts', { n: fronts }) : t(SHOT_LABEL[shot]);

  const playFilm = () => {
    const s = useSimulation.getState();
    if (s.frame >= N - 2) s.seek(0);
    s.setSpeedIndex(autoTiming ? autoPace(data, state.stage, s.frame) : FILM_SPEED_INDEX);
    if (!s.playing) s.toggle();
    setIntro(false);
    if (!usePreferences.getState().reducedMotion || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setCold(0);
  };
  const council = data.events.find((e) => /council adopts the invasion/i.test(e.title));
  const coldLines = [
    council ? t('{day}. The Empire decides on war.', { day: battleDayLabel(council.battleDay) }) : null,
    typeof totals.empireKilled === 'number' ? t('{n} imperial soldiers will fall.', { n: totals.empireKilled.toLocaleString('en-GB') }) : null,
    typeof totals.empireRevived === 'number' && totals.empireRevived > 0 ? t('{n} of them will rise again.', { n: totals.empireRevived.toLocaleString('en-GB') }) : null,
    totals.tempestKilled === 0 ? t('Tempest will not lose a single soldier.') : null,
  ];
  const coldLine = cold !== null ? coldLines[cold] : null;

  return (
    <div className="cine pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {/* Atmosphere: vignette and grain over the map, under the text. */}
      <div className="cine-vignette absolute inset-0" aria-hidden />
      <div className="cine-grain absolute inset-[-50%]" aria-hidden />

      {/* Letterbox, 2.39:1, closing in. */}
      <div className="cine-bar cine-bar-top absolute inset-x-0 top-0 bg-black" aria-hidden />
      <div className="cine-bar cine-bar-bottom absolute inset-x-0 bottom-0 bg-black" aria-hidden />

      {/* The director's slate: what the camera is doing. */}
      <div className="cine-slate absolute left-1/2 top-[calc(var(--cine-bar)+10px)] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-xs">
        <span className="cine-rec h-2 w-2 rounded-full bg-[#e0614f]" aria-hidden />
        <span>{playing ? t('Rolling') : t('Paused')}</span>
        <span className="text-white/35">·</span>
        <span key={shotText} className="cine-fade">{shotText}</span>
      </div>

      {/* Date: the strongest readout. */}
      <div className="absolute left-6 top-[calc(var(--cine-bar)+14px)]">
        <p className="figure text-[clamp(34px,6vh,64px)] font-bold leading-none tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.85)]">{battleDayLabel(day)}</p>
        <p className="figure mt-1 text-[clamp(15px,2.6vh,24px)] font-semibold text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
          {hhmm} <span className="text-[0.55em] font-medium uppercase tracking-label opacity-75">{t('simulation time')}</span>
        </p>
        <p className="mt-1 text-sm font-semibold uppercase tracking-label text-white/80 [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">{t(phaseLabel(state.phase))}</p>
        <p className="figure mt-1 text-2xs uppercase tracking-label text-white/65">{playing ? `▶ ${speed}× · ${rate}` : `❚❚ ${t('paused')}`}</p>
      </div>

      {/* Ledger. */}
      <div className="absolute right-6 top-[calc(var(--cine-bar)+14px)] w-[min(16rem,38vw)] rounded-[4px] border border-white/10 bg-black/60 p-3 backdrop-blur-xs">
        <p className="eyebrow text-white/60">{t('Imperial losses to date')}</p>
        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <span className="text-white/70">{t('Killed')}</span>
          <span className="text-right font-semibold" style={{ color: FACTION_COLOR.empire }}><RollingNumber value={state.casualties.empire.kia} /></span>
          <span className="text-white/70">{t('Revived')}</span>
          <span className="text-right text-white"><RollingNumber value={state.casualties.empire.revived} /></span>
          <span className="text-white/70">{t('Captured')}</span>
          <span className="text-right text-white"><RollingNumber value={state.casualties.empire.pow} /></span>
        </div>
        <p className="mt-2 border-t border-white/10 pt-1.5 text-2xs text-white/55">{t('Tempest killed:')} <Figure value={state.casualties.tempest.kia} /></p>
      </div>

      {/* Who leads the moment. */}
      {leader && !ended && !splash ? (
        <div key={leader.id} className="cine-rise absolute right-6 top-[calc(var(--cine-bar)+11.5rem)] flex w-[min(16rem,38vw)] items-center gap-3 rounded-[4px] border border-white/10 bg-black/50 p-2 backdrop-blur-xs">
          <Portrait src={leader.photocard!.src} name={leader.name} size={50} faction={leader.faction} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{leader.name}</p>
            <p className="truncate text-2xs text-white/60">{leader.faction}</p>
          </div>
        </div>
      ) : null}

      {/* Event cards: stacked, each lingering 2 to 5 seconds. */}
      {!intro && !ended ? <EventStack hidden={cold !== null || moment !== null} /> : null}

      {/* The frame of the camera. */}
      <Viewfinder />

      {/* Chapter card. */}
      {chapter && !intro && !moment ? (
        <div key={chapter.key} className="cine-chapter absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-[#d4ab57]">{t('Chapter {n}', { n: ROMAN[chapter.n - 1] ?? chapter.n })}</p>
            <p className="mt-3 font-display text-[clamp(28px,5.5vh,58px)] leading-tight text-white [text-shadow:0_4px_24px_rgba(0,0,0,0.9)]">{t(phaseLabel(chapter.name))}</p>
            <div className="cine-rule mx-auto mt-4 h-px bg-linear-to-r from-transparent via-[#d4ab57] to-transparent" />
            {hooks.get(chapter.name) ? <p className="cine-hook mx-auto mt-4 max-w-2xl px-6 font-display text-[clamp(15px,2.4vh,22px)] italic leading-snug text-white/90 [text-shadow:0_2px_12px_rgba(0,0,0,0.9)]">{hooks.get(chapter.name)}</p> : null}
            <p className="figure mt-3 text-sm uppercase tracking-[0.3em] text-white/70">{battleDayLabel(day)} · {hhmm}</p>
          </div>
        </div>
      ) : null}

      {/* Battle splash: who meets whom. */}
      {moment && !intro ? <BigMoment key={moment.key} e={moment.e} /> : null}

      {splash && !intro && !moment ? <BattleSplash key={splash.key} battle={splash.battle} /> : null}

      {/* Cold open: hook lines from the record, one at a time. */}
      {coldLine ? (
        <div key={cold} className="cine-cold absolute inset-0 grid place-items-center bg-black/80">
          <p className="max-w-3xl px-8 text-center font-display text-[clamp(26px,5.4vh,60px)] leading-tight text-white [text-shadow:0_6px_30px_rgba(0,0,0,0.9)]">{coldLine}</p>
        </div>
      ) : null}

      {/* Film controls: Auto Timing and the 2D / 3D stage. */}
      <div className="pointer-events-auto absolute left-1/2 top-[calc(var(--cine-bar)+44px)] flex -translate-x-1/2 items-center gap-2">
        <button type="button" onClick={() => setPref('autoTiming', !autoTiming)} aria-pressed={autoTiming} title={t('Auto Timing for Cinematic Mode: the film sets its own speed, fast through preparation, slow in battle')} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur-xs ${autoTiming ? 'border-[#d4ab57]/80 bg-[#d4ab57]/20 text-white' : 'border-white/20 bg-black/50 text-white/60 hover:text-white'}`}>
          <Timer size={12} strokeWidth={2} /> {t('Auto timing')}{autoTiming && playing ? <span className="figure text-[#d4ab57]">· {speed}×</span> : null}
        </button>
        <div className="flex overflow-hidden rounded-full border border-white/20 bg-black/50 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur-xs" role="radiogroup" aria-label={t('Film stage')}>
          <button type="button" role="radio" aria-checked={!cinema3d} onClick={() => setPref('cinema3d', false)} className={`flex items-center gap-1 px-3 py-1 ${!cinema3d ? 'bg-white/20 text-white' : 'text-white/55 hover:text-white'}`}>
            <MapIcon size={12} strokeWidth={2} /> 2D
          </button>
          <button type="button" role="radio" aria-checked={cinema3d} onClick={() => setPref('cinema3d', true)} className={`flex items-center gap-1 border-l border-white/20 px-3 py-1 ${cinema3d ? 'bg-white/20 text-white' : 'text-white/55 hover:text-white'}`}>
            <Box size={12} strokeWidth={2} /> 3D
          </button>
        </div>
        <button type="button" onClick={() => setPref('music', !musicOn)} aria-pressed={musicOn} aria-label={musicOn ? t('Turn the music off') : t('Turn the music on')} title={t('Music (N)')} className={`grid h-[22px] w-[30px] place-items-center rounded-full border backdrop-blur-xs ${musicOn ? 'border-[#d4ab57]/80 bg-[#d4ab57]/20 text-white' : 'border-white/20 bg-black/50 text-white/60 hover:text-white'}`}>
          {musicOn ? <Music2 size={12} strokeWidth={2} /> : <VolumeX size={12} strokeWidth={2} />}
        </button>
      </div>

      {/* Opening titles, then the film starts by itself. */}
      {intro && !ended ? <CineIntro onDone={playFilm} /> : null}

      {/* Closing card. */}
      {ended ? (
        <div className="cine-chapter absolute inset-0 grid place-items-center bg-black/55">
          <div className="w-[min(32rem,calc(100vw-2rem))] text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-[#d4ab57]">{t('End of the campaign record')}</p>
            <p className="mt-3 font-display text-[clamp(26px,5vh,48px)] text-white">Tempest × Eastern Empire</p>
            <div className="mx-auto mt-4 grid max-w-xs grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-left text-white/70">{t('Imperial killed')}</span>
              <span className="text-right text-white"><Figure value={totals.empireKilled} /></span>
              <span className="text-left text-white/70">{t('Revived')}</span>
              <span className="text-right text-white"><Figure value={totals.empireRevived} /></span>
              <span className="text-left text-white/70">{t('Permanently dead')}</span>
              <span className="text-right text-white"><Figure value={totals.empirePermanentDead} /></span>
              <span className="text-left text-white/70">{t('Tempest killed')}</span>
              <span className="text-right text-white"><Figure value={totals.tempestKilled} /></span>
            </div>
            <p className="mt-4 text-2xs text-white/55">{t('Every figure is summed from event-level records. See the dossiers for sources.')}</p>
            <button type="button" onClick={playFilm} className="pointer-events-auto mt-5 inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-white/10">
              <Play size={14} fill="currentColor" /> {t('Watch again')}
            </button>
          </div>
        </div>
      ) : null}

      {/* Film strip: progress through the war, chapters marked. */}
      <div className="absolute inset-x-6 bottom-[calc(var(--cine-bar)/2-3px)] h-[6px]" aria-hidden>
        <div className="absolute inset-0 rounded-full bg-white/12" />
        <div className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-[#5fb8f0] to-[#d4ab57]" style={{ width: `${(frame / (N - 1)) * 100}%` }} />
        {stageTicks.map((s) => (
          <span key={s.id} className="absolute top-[-3px] h-3 w-px bg-white/45" style={{ left: `${s.at * 100}%` }} title={phaseLabel(s.name)} />
        ))}
      </div>

      <button type="button" onClick={() => setViewMode('standard')} className="ctl pointer-events-auto absolute right-6 top-[calc(100%-var(--cine-bar)-3.25rem)] border-white/20 bg-black/60 text-white" aria-label={t('Leave cinematic mode (Esc)')}>
        <X size={14} /> {t('Exit cinematic')}
      </button>
    </div>
  );
}

function BattleSplash({ battle }: { battle: Battle }) {
  const t = useT();
  const data = useSimulation((s) => s.data);
  if (!data) return null;
  const people = battle.characterIds.map((id) => data.characterById.get(id)).filter((c): c is Character => Boolean(c?.photocard));
  const empire = people.filter((c) => factionKey(c.faction) === 'empire').slice(0, 2);
  const allies = people.filter((c) => factionKey(c.faction) !== 'empire').slice(0, 3);
  // Dwargon's own battles show Dwargon's flag; the rest are Tempest's.
  const dwargonSide = battle.participants.some((pt) => factionKey(pt.faction) === 'dwargon') && !battle.participants.some((pt) => factionKey(pt.faction) === 'tempest');
  return (
    <div className="cine-splash absolute inset-0 grid place-items-center">
      <div className="w-[min(46rem,calc(100vw-2rem))] text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.5em] text-[#e0614f]">{t('Battle')}</p>
        <p className="mt-2 font-display text-[clamp(24px,4.6vh,48px)] leading-tight text-white [text-shadow:0_4px_24px_rgba(0,0,0,0.95)]">{battle.name}</p>
        <div className="mt-5 flex items-center justify-center gap-4 sm:gap-8">
          <div className="cine-in-left flex flex-col items-center gap-2">
            <Side nationId="nasca-namrium-ulmeria" name="Eastern Empire" color={FACTION_COLOR.empire} />
            <div className="flex gap-2">
              {empire.map((c) => (
                <Card key={c.id} c={c} />
              ))}
            </div>
          </div>
          <span className="cine-vs font-display text-[clamp(28px,5vh,52px)] font-bold italic text-[#d4ab57] [text-shadow:0_0_24px_rgba(212,171,87,0.6)]">VS</span>
          <div className="cine-in-right flex flex-col items-center gap-2">
            <Side nationId={dwargonSide ? 'dwargon' : 'jura-tempest-federation'} name={dwargonSide ? 'Armed Nation of Dwargon' : 'Jura Tempest Federation'} color={dwargonSide ? FACTION_COLOR.dwargon : FACTION_COLOR.tempest} />
            <div className="flex gap-2">
              {allies.map((c) => (
                <Card key={c.id} c={c} />
              ))}
            </div>
          </div>
        </div>
        {typeof battle.empireCommitted === 'number' ? (
          <p className="figure mt-4 text-sm text-white/75">
            {t('Imperial forces committed: {n}', { n: battle.empireCommitted.toLocaleString('en-GB') })}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Side({ nationId, name, color }: { nationId: string; name: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border bg-black/60 px-3 py-1" style={{ borderColor: color }}>
      <Flag nationId={nationId} size={18} />
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{name}</span>
    </div>
  );
}

function Card({ c }: { c: Character }) {
  const color = FACTION_COLOR[factionKey(c.faction)];
  return (
    <div className="flex w-[clamp(64px,9vh,104px)] flex-col items-center gap-1">
      <img src={c.photocard!.src} alt={c.name} className="aspect-11/17 w-full rounded-[4px] border-2 bg-white object-cover shadow-[0_8px_30px_rgba(0,0,0,0.6)]" style={{ borderColor: color }} />
      <span className="w-full truncate text-center text-2xs font-semibold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">{c.name}</span>
    </div>
  );
}
