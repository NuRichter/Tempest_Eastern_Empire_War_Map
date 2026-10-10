'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { create } from 'zustand';

import { msg, useT } from '@/i18n';
import { simToLngLatTuple } from '@/lib/coords';
import { useSimulation } from '@/simulation/store';
import { usePreferences } from '@/state/preferences';

/**
 * First-run tour, in the voice of a Great Sage notice ("《Notice》"), guided by
 * the people of Tempest (Slime Diaries art) and slime Rimuru. A spotlight
 * glides to each control, and for the map steps to a real thing on the map
 * (an army, a battle, the capital) at a moment chosen to show it. The clock
 * goes back where it was when the tour ends. It opens by itself only on a
 * first visit (never for automated browsers or deep links). Layers → Tour
 * and ?tour=1 replay it. Esc closes, ← → Enter step.
 */

export const useTour = create<{ open: boolean; start: () => void; close: () => void }>((set) => ({
  open: false,
  start: () => set({ open: true }),
  close: () => set({ open: false }),
}));

interface Step {
  /** data-tour anchor, or null for a centred card. */
  target: string | null;
  /** A point on the map (simulation coordinates) to spotlight instead, with its radius in px. */
  point?: { x: number; y: number; r: number };
  /** Moment to show for this step (frame). The reader's moment returns when the tour ends. */
  frame?: number;
  /** Panel tab to show for this step. */
  tab?: 'situation' | 'about';
  title: string;
  body: string;
  /** Guide image under /assets/theme/ (a slime in chibi/ or a character in guides/). */
  guide: string;
  who: string;
}

const CAMP = { x: 0.644, y: 0.558 };
const STEPS: Step[] = [
  { target: null, guide: 'chibi/slime-calm', who: 'Rimuru', title: msg('Welcome to Tempest!'), body: msg('This map plays the whole Tempest vs Eastern Empire war like a documentary, built from the light novels. The gang will show you around. It takes about two minutes.') },
  { target: 'play', guide: 'guides/gobta', who: 'Gobta', title: msg('Press play'), body: msg('Hit this (or Space) and the war starts moving. Armies march, fronts shift, numbers roll. Press it again to pause anywhere.') },
  { target: 'speed', guide: 'guides/ranga', who: 'Ranga', title: msg('Pick your speed'), body: msg('From a slow 1× up to 48×, about a whole day per second. Playback slows down by itself at the big turning points so you never miss them.') },
  { target: 'timeline', guide: 'guides/shuna', who: 'Shuna', title: msg('The timeline'), body: msg('Every tick is an event, the coloured bands are the stages of the war. Click anywhere to jump there, or drag to scrub. Rewinding shows exactly what happened, nothing is lost.') },
  { target: 'step-event', guide: 'guides/hakurou', who: 'Hakurou', title: msg('One event at a time'), body: msg('These buttons hop to the previous or next event ([ and ] on the keyboard). Perfect for reading the war step by step.') },
  { target: 'map', frame: 6900, guide: 'guides/treyni', who: 'Treyni', title: msg('Who holds the ground'), body: msg('Red is ground the Empire holds, green is Tempest, blue is Dwargon. The white line is the front. Watch it creep forward, then fall back once a battle is lost.') },
  { target: null, point: { ...CAMP, r: 70 }, frame: 6900, guide: 'guides/geld', who: 'Geld', title: msg('The armies'), body: msg('Each marker is a formation, the big number is its strength. Squares are the Empire, circles are Tempest, diamonds are Dwargon. Click one to open its file.') },
  { target: null, point: { ...CAMP, r: 42 }, frame: 7703, guide: 'guides/shion', who: 'Shion', title: msg('Battles'), body: msg('Crossed swords mark a battle. Once the cross appears the battle is decided, and only then does the losing side start to fall back.') },
  { target: null, point: { x: 0.638, y: 0.554, r: 64 }, frame: 6900, guide: 'guides/gazel', who: 'Gazel', title: msg('Capitals and the Labyrinth'), body: msg('A crown marks a capital, the maze is Ramiris Labyrinth right next to Rimuru. Cities never fall in this war. You can hide them in Layers.') },
  { target: 'map-controls', guide: 'guides/gabiru', who: 'Gabiru', title: msg('Move around the map'), body: msg('Zoom, reset the view, jump to a theatre, switch between a flat map and a globe, or go full screen. Scrolling and dragging on the map work too.') },
  { target: 'map-style', guide: 'guides/gabiru', who: 'Gabiru', title: msg('Two maps'), body: msg('The clean Base Map for following the war, or the painted Myth Map for the world itself. Switching keeps your place in time.') },
  { target: 'situation', tab: 'situation', guide: 'guides/benimaru', who: 'Benimaru', title: msg('Who is fighting right now'), body: msg('The Situation panel tells you who is up against whom, how many have fallen and what just happened. Click any name to open its full file.') },
  { target: 'tab-about', tab: 'about', guide: 'guides/milim', who: 'Milim', title: msg('About, wallpapers and links'), body: msg('A note from the person who made this, wallpapers from the war’s volumes, the official Tensura links and every reference.') },
  { target: 'search', tab: 'situation', guide: 'guides/souei', who: 'Souei', title: msg('Looking for someone?'), body: msg('Search finds characters, armies, battles and places, even by their Japanese names. Press / anywhere to open it.') },
  { target: 'language', guide: 'chibi/slime-alert', who: 'Rimuru', title: msg('Your language, your theme'), body: msg('Switch between 30 languages here, and flip between dark and light right next to it.') },
  { target: 'rail', guide: 'chibi/slime-leaves', who: 'Rimuru', title: msg('Layers and settings'), body: msg('Layers, filters, the event feed and the story are on this side. Turn things on and off, change the look, and replay this tour any time.') },
  { target: 'cinematic', guide: 'guides/veldora', who: 'Veldora', title: msg('Cinematic mode'), body: msg('Want it like a movie? This hides the panels and plays the war full screen, with big dates and captions. Press C to go in or out.') },
  { target: null, guide: 'chibi/slime-mitz-vah', who: 'Rimuru', title: msg('That’s it, enjoy the war!'), body: msg('Everything on the map comes with its source, and anything reconstructed says so. Have fun exploring.') },
];

interface Box { x: number; y: number; w: number; h: number }

function findTarget(step: Step): Box | null {
  if (step.point) {
    const map = (window as unknown as { __atlasMap?: { project: (ll: [number, number]) => { x: number; y: number } } }).__atlasMap;
    const host = document.querySelector<HTMLElement>('[data-tour="map"]');
    if (!map || !host) return null;
    const p = map.project(simToLngLatTuple(step.point.x, step.point.y));
    const r = host.getBoundingClientRect();
    const x = r.left + p.x;
    const y = r.top + p.y;
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
    return { x: x - step.point.r, y: y - step.point.r, w: step.point.r * 2, h: step.point.r * 2 };
  }
  if (!step.target) return null;
  const all = [...document.querySelectorAll<HTMLElement>(`[data-tour="${step.target}"]`)];
  const el = all.find((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 4 && r.height > 4 && getComputedStyle(e).visibility !== 'hidden';
  });
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const pad = 6;
  return { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
}

export function Tour() {
  const t = useT();
  const open = useTour((s) => s.open);
  const start = useTour((s) => s.start);
  const close = useTour((s) => s.close);
  const setPref = usePreferences((s) => s.set);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [view, setView] = useState({ w: 0, h: 0 });
  const [card, setCard] = useState({ w: 340, h: 220 });
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const savedFrame = useRef<number | null>(null);
  const savedPanel = useRef<boolean | null>(null);

  // Decided once per page load. ?tour=1 always opens it (a link anyone can share).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get('tour') === '1';
    if (!forced) {
      if (usePreferences.getState().tourDone || navigator.webdriver) return;
      if ([...params.keys()].some((k) => k !== 'tour')) return;
    }
    const id = window.setTimeout(start, 900);
    return () => window.clearTimeout(id);
  }, [start]);

  // Remember the reader's moment: the map steps visit other moments.
  useEffect(() => {
    if (open && savedFrame.current === null) {
      const s = useSimulation.getState();
      savedFrame.current = s.frame;
      savedPanel.current = usePreferences.getState().panelOpen;
      s.pause();
    }
  }, [open]);

  const finish = useCallback(() => {
    close();
    setI(0);
    setPref('tourDone', true);
    if (savedFrame.current !== null) useSimulation.getState().seek(savedFrame.current);
    savedFrame.current = null;
    // Leave the panel as the reader had it, on its Situation tab.
    document.querySelector<HTMLElement>('[data-tour="tab-situation"]')?.click();
    if (savedPanel.current !== null) usePreferences.getState().set('panelOpen', savedPanel.current);
    savedPanel.current = null;
  }, [close, setPref]);

  const step = STEPS[i];

  // Bring the step's moment and panel into view.
  useEffect(() => {
    if (!open) return;
    if (step.frame !== undefined) useSimulation.getState().seek(step.frame);
    if (step.tab) {
      usePreferences.getState().set('panelOpen', true);
      const id = window.setTimeout(() => document.querySelector<HTMLElement>(`[data-tour="tab-${step.tab}"]`)?.click(), 80);
      return () => window.clearTimeout(id);
    }
  }, [open, step]);

  const measure = useCallback(() => {
    setView({ w: window.innerWidth, h: window.innerHeight });
    setBox(findTarget(step));
    const r = cardRef.current?.getBoundingClientRect();
    if (r) setCard({ w: r.width, h: r.height });
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    // Measuring the layout before paint is what useLayoutEffect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure();
    window.addEventListener('resize', measure);
    const id = window.setInterval(measure, 400); // panels, the map and the clock move under the spotlight
    return () => {
      window.removeEventListener('resize', measure);
      window.clearInterval(id);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    nextRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (i === STEPS.length - 1) finish(); else setI(i + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); setI(Math.max(0, i - 1)); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, finish, i]);

  if (!open || !view.w) return null;

  // Card placement: beside the spotlight where it fits, else above or below, else centred.
  // The guide stands on top of the card, so leave room above it.
  const margin = 16;
  const head = 80;
  const narrow = view.w < 640;
  let cx = (view.w - card.w) / 2;
  let cy = (view.h - card.h) / 2;
  if (box && !narrow) {
    const right = box.x + box.w + margin;
    const left = box.x - card.w - margin;
    const below = box.y + box.h + margin + head;
    const above = box.y - card.h - margin;
    if (right + card.w < view.w - 8 && box.w < view.w * 0.5) { cx = right; cy = box.y + box.h / 2 - card.h / 2; }
    else if (left > 8 && box.w < view.w * 0.5) { cx = left; cy = box.y + box.h / 2 - card.h / 2; }
    else if (below + card.h < view.h - 8) { cx = box.x + box.w / 2 - card.w / 2; cy = below; }
    else if (above > head) { cx = box.x + box.w / 2 - card.w / 2; cy = above; }
  } else if (box && narrow) {
    cx = (view.w - card.w) / 2;
    cy = box.y + box.h / 2 > view.h / 2 ? box.y - card.h - margin : box.y + box.h + margin + head;
  }
  cx = Math.max(8, Math.min(view.w - card.w - 8, cx));
  cy = Math.max(head, Math.min(view.h - card.h - 8, cy));

  const spot = box ?? { x: view.w / 2, y: view.h / 2, w: 0, h: 0 };
  const last = i === STEPS.length - 1;
  const character = step.guide.startsWith('guides/');

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      {/* Click-catcher. The spotlight's giant shadow dims everything else. */}
      <div className="absolute inset-0" onClick={finish} aria-hidden />
      <div className="tour-spot pointer-events-none absolute" style={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h, borderRadius: step.point ? '9999px' : '8px' }} aria-hidden />
      <div ref={cardRef} className="tour-card absolute w-[min(23rem,calc(100vw-16px))]" style={{ left: cx, top: cy }}>
        <div key={i} className="tour-step relative overflow-visible rounded-[6px] border border-[#5fb8f0]/60 bg-ink-850 p-4 pt-3 shadow-panel">
          <img
            src={`/assets/theme/${step.guide}.webp`}
            alt={step.who}
            title={step.who}
            className={`${character ? 'tour-bob' : 'tour-guide'} pointer-events-none absolute right-3 w-auto drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)] ${character ? '-top-[4.75rem] h-[5.5rem]' : '-top-12 h-14'}`}
          />
          <p className="font-display text-[11px] font-semibold tracking-[0.2em] text-[#5fb8f0]">
            《{t('Notice')}》 <span className="font-ui text-[10px] font-normal tracking-normal text-fg-3">· {step.who}</span>
          </p>
          <h2 id="tour-title" className="mt-1 pr-20 font-display text-lg leading-snug text-fg">{t(step.title)}</h2>
          <p id="tour-body" className="mt-1.5 text-sm leading-relaxed text-fg-2">{t(step.body)}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex flex-wrap gap-1" aria-label={t('Step {n} of {total}', { n: i + 1, total: STEPS.length })}>
              {STEPS.map((_, k) => (
                <span key={k} className={`h-1.5 rounded-full transition-all duration-300 ${k === i ? 'w-4 bg-[#5fb8f0]' : k < i ? 'w-1.5 bg-[#5fb8f0]/50' : 'w-1.5 bg-ink-400'}`} />
              ))}
            </span>
            <span className="ml-auto" />
            {last ? null : (
              <button type="button" onClick={finish} className="h-8 px-1.5 text-xs text-fg-3 hover:text-fg" aria-label={t('Close the tour')}>
                {t('Skip')}
              </button>
            )}
            {i > 0 ? (
              <button type="button" onClick={() => setI(i - 1)} className="ctl h-8 px-2" aria-label={t('Back')}>
                <ChevronLeft size={14} strokeWidth={1.8} />
              </button>
            ) : null}
            <button ref={nextRef} type="button" onClick={() => (last ? finish() : setI(i + 1))} className="ctl h-8 border-[#5fb8f0]/70 bg-[#5fb8f0]/15 px-3 text-fg hover:bg-[#5fb8f0]/25">
              {last ? t('Let’s go') : i === 0 ? t('Show me') : t('Next')}
              {last ? null : <ChevronRight size={14} strokeWidth={1.8} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
