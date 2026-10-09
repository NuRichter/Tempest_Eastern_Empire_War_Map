'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useT } from '@/i18n';
import { battleDayLabel } from '@/lib/format';
import { FACTION_COLOR, factionKey } from '@/lib/palette';
import { useSimulation } from '@/simulation/store';
import { prefersReducedMotion } from '@/state/preferences';
import { ProvenanceBadge } from '@/components/ui/primitives';
import type { WarEvent } from '@/types/dataset';

/* ------------------------------------------------------------------ */
/* Opening titles                                                      */
/* ------------------------------------------------------------------ */

const INTRO_ARC = 'Eastern Empire Invasion Arc';

/**
 * The opening: a flash of magicules as the reader crosses into the film,
 * the series logo, the series name, the arc title letter by letter, the
 * credit. Then the film starts by itself. Skippable (button or Enter).
 */
export function CineIntro({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [step, setStep] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  const reduce = useMemo(() => prefersReducedMotion(), []);
  // Drifting motes of light behind the titles (fixed per mount, no re-render cost).
  const motes = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: `${(i * 37.7) % 100}%`,
        size: 2 + ((i * 7) % 5),
        delay: `${-((i * 0.83) % 7)}s`,
        dur: `${6 + ((i * 1.3) % 6)}s`,
      })),
    [],
  );

  useEffect(() => {
    // step 1 logo, 2 series name, 3 arc title, 4 credit, 5 leaving
    const at = reduce ? [100, 300, 500, 700, 2600, 3000] : [600, 2300, 3500, 5200, 8000, 8700];
    const ids = at.map((ms, i) => window.setTimeout(() => (i === at.length - 1 ? done.current() : setStep(i + 1)), ms));
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Enter') done.current();
    };
    window.addEventListener('keydown', key);
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
      window.removeEventListener('keydown', key);
    };
  }, [reduce]);

  return (
    <div className={`cine-intro pointer-events-auto absolute inset-0 z-40 grid place-items-center overflow-hidden bg-black ${step >= 5 ? 'cine-intro-out' : ''}`}>
      <div className="cine-warp absolute inset-0" aria-hidden />
      <div className="absolute inset-0" aria-hidden>
        {motes.map((m, i) => (
          <span key={i} className="cine-mote absolute bottom-[-10px] rounded-full" style={{ left: m.left, width: m.size, height: m.size, animationDelay: m.delay, animationDuration: m.dur }} />
        ))}
      </div>
      <div className="relative flex flex-col items-center px-6 text-center">
        {step >= 1 ? (
          <div className="cine-logo relative w-[clamp(180px,30vh,320px)]">
            <img src="/assets/theme/logo/tensura-logo.webp" alt="Tensei Shitara Slime Datta Ken" className="w-full" draggable={false} />
            <span className="cine-logo-shine absolute inset-0" aria-hidden />
          </div>
        ) : null}
        {step >= 2 ? <p className="cine-track mt-4 font-cine text-[clamp(13px,2.2vh,20px)] font-semibold uppercase text-[#9fd6ff]">Tensei Shitara Slime Datta Ken</p> : null}
        {step >= 3 ? (
          <h2 className="mt-3 font-cine text-[clamp(28px,6.4vh,72px)] font-extrabold uppercase leading-[1.05] tracking-[0.06em]" aria-label={INTRO_ARC}>
            {INTRO_ARC.split('').map((ch, i) => (
              <span key={i} className="cine-letter inline-block" style={{ animationDelay: `${i * 34}ms` }} aria-hidden>
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </h2>
        ) : null}
        {step >= 3 ? <div className="cine-rule mx-auto mt-4 h-px bg-gradient-to-r from-transparent via-[#d4ab57] to-transparent" /> : null}
        {step >= 4 ? (
          <div className="cine-credit mt-5">
            <p className="text-[clamp(11px,1.7vh,15px)] uppercase tracking-[0.32em] text-white/75">Projected by NuRichter in working with NuRichter Workspace</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-white/40">{t('A fan-made war film')}</p>
          </div>
        ) : null}
      </div>
      <button type="button" onClick={() => done.current()} className="absolute bottom-[calc(var(--cine-bar)+20px)] right-6 rounded-full border border-white/25 bg-white/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 hover:bg-white/15 hover:text-white">
        {t('Skip intro')} ↵
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Event stack                                                         */
/* ------------------------------------------------------------------ */

const LIFE_MS: Record<string, number> = { CRITICAL: 5000, HIGH: 4000, MEDIUM: 3000 };
const GAP_MS = 650; // never two cards in the same instant
const MAX_VISIBLE = 4;
const MAX_QUEUE = 5;
const CARD_STEP = 78; // px between stacked cards
const RANK: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };

interface Card { e: WarEvent; key: number; born: number; leaving: boolean }

/**
 * Event cards that stack instead of replacing each other. The timeline runs
 * fast, so cards are queued and released one at a time; each stays 2 to 5
 * seconds by significance, newer cards push older ones up. The card clock only
 * runs while the film plays, so a paused film keeps its cards.
 */
export function EventStack({ hidden }: { hidden: boolean }) {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const playing = useSimulation((s) => s.playing);
  const [cards, setCards] = useState<Card[]>([]);
  const cardsRef = useRef<Card[]>([]);
  const queue = useRef<WarEvent[]>([]);
  const clock = useRef(0);
  const lastRelease = useRef(-Infinity);
  const prevFrame = useRef<number | null>(null);
  const seq = useRef(0);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  // New events crossed by the playhead join the queue. Jumps reset it.
  useEffect(() => {
    if (!data) return;
    const prev = prevFrame.current;
    prevFrame.current = frame;
    if (prev === null) return;
    if (frame < prev || frame - prev > 240) {
      queue.current = [];
      cardsRef.current = [];
      setCards([]);
      return;
    }
    for (const e of data.events) {
      if (e.frame <= prev) continue;
      if (e.frame > frame) break;
      if (e.turningPoint) continue; // turning points get the full-screen moment instead
      queue.current.push(e);
    }
    if (queue.current.length > MAX_QUEUE) {
      // Too much at once: keep the most significant, in time order.
      const keep = new Set([...queue.current].sort((a, b) => (RANK[b.significance] ?? 0) - (RANK[a.significance] ?? 0)).slice(0, MAX_QUEUE));
      queue.current = queue.current.filter((e) => keep.has(e));
    }
  }, [data, frame]);

  // The card clock: releases, ages and retires cards.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!playingRef.current) return;
      clock.current += 100;
      const now = clock.current;
      // Worked out from a ref, not inside a state updater (which React may run twice).
      const cs = cardsRef.current;
      let next = cs;
      let changed = false;
      if (queue.current.length && now - lastRelease.current >= GAP_MS) {
        lastRelease.current = now;
        const e = queue.current.shift()!;
        next = [...next, { e, key: (seq.current += 1), born: now, leaving: false }];
        changed = true;
      }
      const live = next.filter((c) => !c.leaving);
      const over = live.length - MAX_VISIBLE;
      next = next.map((c) => {
        const tooOld = now - c.born > (LIFE_MS[c.e.significance] ?? 2000);
        const pushedOut = over > 0 && live.indexOf(c) > -1 && live.indexOf(c) < over;
        if (!c.leaving && (tooOld || pushedOut)) {
          changed = true;
          return { ...c, leaving: true, born: now };
        }
        return c;
      });
      // Leaving cards are dropped after their exit animation.
      const kept = next.filter((c) => !(c.leaving && now - c.born > 500));
      if (kept.length !== next.length) changed = true;
      if (changed) {
        cardsRef.current = kept;
        setCards(kept);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  if (!data) return null;
  const live = cards.filter((c) => !c.leaving);
  const fpd = data.manifest.clock.framesPerDay;
  return (
    <div className={`absolute bottom-[calc(var(--cine-bar)+30px)] left-6 h-[calc(78px*4)] w-[min(30rem,calc(100vw-3rem))] transition-opacity duration-500 ${hidden ? 'opacity-0' : 'opacity-100'}`} role="log" aria-live="polite">
      {cards.map((c) => {
        const idx = c.leaving ? live.length : live.length - 1 - live.indexOf(c);
        const hh = String(Math.floor(((c.e.frame % fpd) * 10) / 60)).padStart(2, '0');
        const mm = String(((c.e.frame % fpd) * 10) % 60).padStart(2, '0');
        const color = FACTION_COLOR[factionKey(c.e.actorFaction)];
        return (
          <div
            key={c.key}
            className={`cine-card absolute bottom-0 left-0 w-full ${c.leaving ? 'cine-card-out' : ''}`}
            style={{ transform: `translateY(${-idx * CARD_STEP}px)`, opacity: c.leaving ? 0 : Math.max(0.35, 1 - idx * 0.18) }}
          >
            <div className={`cine-card-in flex h-[70px] overflow-hidden rounded-[4px] border bg-black/70 backdrop-blur-md ${c.e.significance === 'CRITICAL' ? 'border-[#d4ab57]/70 shadow-[0_0_24px_rgba(212,171,87,0.25)]' : 'border-white/12'}`}>
              <span className="w-[3px] shrink-0" style={{ background: color }} aria-hidden />
              <div className="min-w-0 flex-1 px-3 py-1.5">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  <span className="figure">{battleDayLabel(c.e.battleDay)} · {hh}:{mm}</span>
                  <span className="truncate">{c.e.location}</span>
                  <span className="ml-auto shrink-0">
                    <ProvenanceBadge value={c.e.provenance} compact />
                  </span>
                </p>
                <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-white">{c.e.title}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Turning point                                                       */
/* ------------------------------------------------------------------ */

export const MOMENT_MS = 3200;

/** A turning point: impact flash, shock rings, the bars close in, the title slams in. */
export function BigMoment({ e }: { e: WarEvent }) {
  const t = useT();
  const color = FACTION_COLOR[factionKey(e.actorFaction)];
  return (
    <div className="cine-moment absolute inset-0 grid place-items-center" role="status" aria-live="assertive">
      <div className="cine-flash absolute inset-0" aria-hidden />
      <div className="absolute inset-0 grid place-items-center" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="cine-ring absolute rounded-full border-2" style={{ borderColor: color, animationDelay: `${i * 160}ms` }} />
        ))}
      </div>
      <div className="cine-squeeze cine-squeeze-top absolute inset-x-0 top-0 bg-black" aria-hidden />
      <div className="cine-squeeze cine-squeeze-bottom absolute inset-x-0 bottom-0 bg-black" aria-hidden />
      <div className="relative w-[min(56rem,calc(100vw-2rem))] text-center">
        <p className="cine-kicker text-[11px] font-bold uppercase tracking-[0.55em]" style={{ color }}>
          {t('Turning point')}
        </p>
        <p className="cine-slam mt-3 font-cine text-[clamp(24px,5vh,56px)] font-extrabold leading-[1.08] text-white">{e.title}</p>
        {e.turningPointSummary ? <p className="cine-hook mx-auto mt-4 max-w-2xl font-display text-[clamp(14px,2.1vh,20px)] italic leading-snug text-white/85 [text-shadow:0_2px_12px_rgba(0,0,0,0.9)]">{e.turningPointSummary}</p> : null}
        <p className="figure mt-3 text-xs uppercase tracking-[0.3em] text-white/60">
          {battleDayLabel(e.battleDay)} · {e.location}
        </p>
      </div>
    </div>
  );
}

/** Viewfinder corners: the frame of the camera. */
export function Viewfinder() {
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-[calc(var(--cine-bar)+8px)] top-[calc(var(--cine-bar)+8px)]" aria-hidden>
      <span className="cine-corner left-0 top-0 border-l-2 border-t-2" />
      <span className="cine-corner right-0 top-0 border-r-2 border-t-2" />
      <span className="cine-corner bottom-0 left-0 border-b-2 border-l-2" />
      <span className="cine-corner bottom-0 right-0 border-b-2 border-r-2" />
    </div>
  );
}
