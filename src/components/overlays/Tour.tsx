'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { create } from 'zustand';

import { msg, useT } from '@/i18n';
import { usePreferences } from '@/state/preferences';

/**
 * First-run tour, in the voice of a Great Sage notice ("《Notice》") with the
 * slime as guide. A spotlight glides from one part of the screen to the next.
 * It opens by itself only on a first visit (never for automated browsers or
 * deep links); Layers → Tour replays it. Esc closes, ← → step.
 */

export const useTour = create<{ open: boolean; start: () => void; close: () => void }>((set) => ({
  open: false,
  start: () => set({ open: true }),
  close: () => set({ open: false }),
}));

interface Step {
  /** data-tour anchor; null = centred card, no spotlight. */
  target: string | null;
  title: string;
  body: string;
  chibi: string;
}

const STEPS: Step[] = [
  {
    target: null,
    title: msg('Welcome to Tempest!'),
    body: msg('This map plays the whole Tempest vs Eastern Empire war like a documentary, built from the light novels. Want a quick look around? It takes about a minute.'),
    chibi: 'slime-calm',
  },
  {
    target: 'play',
    title: msg('Press play'),
    body: msg('Hit this (or Space) and the war starts moving. Armies march, fronts shift, numbers roll. The speed menu next to it goes up to 48×.'),
    chibi: 'slime-alert',
  },
  {
    target: 'timeline',
    title: msg('The timeline'),
    body: msg('Every tick is an event. Click anywhere to jump there, or drag to scrub back and forth. Nothing gets lost, rewinding shows exactly what happened.'),
    chibi: 'slime-mitz-vah',
  },
  {
    target: 'map',
    title: msg('The map'),
    body: msg('Red is ground the Empire holds, green is Tempest. Watch the front line creep forward, then fall back once a battle is lost. Scroll to zoom, drag to look around.'),
    chibi: 'slime-leaves',
  },
  {
    target: 'situation',
    title: msg('Who is fighting right now'),
    body: msg('The Situation panel tells you who is up against whom, how many have fallen and what just happened. Click any name to open its full file.'),
    chibi: 'slime-calm',
  },
  {
    target: 'search',
    title: msg('Looking for someone?'),
    body: msg('Search finds characters, armies, battles and places, even by their Japanese names. Press / anywhere to open it.'),
    chibi: 'slime-alert',
  },
  {
    target: 'language',
    title: msg('Your language, your theme'),
    body: msg('Switch between 30 languages here, and flip between dark and light right next to it.'),
    chibi: 'slime-mitz-vah',
  },
  {
    target: 'rail',
    title: msg('Layers and settings'),
    body: msg('Layers, filters, the event feed and the story are on this side. You can replay this tour from Layers any time.'),
    chibi: 'slime-leaves',
  },
  {
    target: null,
    title: msg('That’s it, enjoy the war!'),
    body: msg('Everything on the map comes with its source, and anything reconstructed says so. Have fun exploring.'),
    chibi: 'slime-calm',
  },
];

interface Box { x: number; y: number; w: number; h: number }

function findTarget(id: string | null): Box | null {
  if (!id) return null;
  const all = [...document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)];
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

  // First visit only: not for automated browsers, and not when a link points at a moment.
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

  const finish = useCallback(() => {
    close();
    setI(0);
    setPref('tourDone', true);
  }, [close, setPref]);

  const step = STEPS[i];
  const measure = useCallback(() => {
    setView({ w: window.innerWidth, h: window.innerHeight });
    setBox(findTarget(step.target));
    const r = cardRef.current?.getBoundingClientRect();
    if (r) setCard({ w: r.width, h: r.height });
  }, [step.target]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener('resize', measure);
    const id = window.setInterval(measure, 500); // panels can open or move under the spotlight
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
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); setI((v) => (v < STEPS.length - 1 ? v + 1 : v)); if (i === STEPS.length - 1) finish(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); setI((v) => Math.max(0, v - 1)); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, finish, i]);

  if (!open || !view.w) return null;

  // Card placement: beside the spotlight where it fits, else centred.
  const margin = 14;
  const narrow = view.w < 640;
  let cx = (view.w - card.w) / 2;
  let cy = (view.h - card.h) / 2;
  if (box && !narrow) {
    const right = box.x + box.w + margin;
    const left = box.x - card.w - margin;
    const below = box.y + box.h + margin;
    const above = box.y - card.h - margin;
    if (right + card.w < view.w - 8 && box.w < view.w * 0.5) { cx = right; cy = box.y + box.h / 2 - card.h / 2; }
    else if (left > 8 && box.w < view.w * 0.5) { cx = left; cy = box.y + box.h / 2 - card.h / 2; }
    else if (below + card.h < view.h - 8) { cx = box.x + box.w / 2 - card.w / 2; cy = below; }
    else if (above > 8) { cx = box.x + box.w / 2 - card.w / 2; cy = above; }
  } else if (box && narrow) {
    cx = (view.w - card.w) / 2;
    cy = box.y + box.h / 2 > view.h / 2 ? Math.max(8, box.y - card.h - margin) : Math.min(view.h - card.h - 8, box.y + box.h + margin);
  }
  cx = Math.max(8, Math.min(view.w - card.w - 8, cx));
  cy = Math.max(8, Math.min(view.h - card.h - 8, cy));

  const spot = box ?? { x: view.w / 2, y: view.h / 2, w: 0, h: 0 };
  const last = i === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      {/* Click-catcher; the spotlight's giant shadow dims everything else. */}
      <div className="absolute inset-0" onClick={finish} aria-hidden />
      <div
        className="tour-spot pointer-events-none absolute rounded-[8px]"
        style={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h, opacity: 1 }}
        aria-hidden
      />
      <div
        ref={cardRef}
        className="tour-card absolute w-[min(22rem,calc(100vw-16px))]"
        style={{ left: cx, top: cy }}
      >
        <div key={i} className="tour-step relative overflow-visible rounded-[6px] border border-[#5fb8f0]/60 bg-ink-850 p-4 pt-3 shadow-panel">
          <img src={`/assets/theme/chibi/${step.chibi}.webp`} alt="" width={72} height={56} className="tour-slime absolute -top-11 right-3 h-14 w-auto" />
          <p className="font-display text-[11px] font-semibold tracking-[0.2em] text-[#5fb8f0]">《{t('Notice')}》</p>
          <h2 id="tour-title" className="mt-1 font-display text-lg leading-snug text-fg">{t(step.title)}</h2>
          <p id="tour-body" className="mt-1.5 text-sm leading-relaxed text-fg-2">{t(step.body)}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex gap-1" aria-label={t('Step {n} of {total}', { n: i + 1, total: STEPS.length })}>
              {STEPS.map((_, k) => (
                <span key={k} className={`h-1.5 rounded-full transition-all duration-300 ${k === i ? 'w-4 bg-[#5fb8f0]' : 'w-1.5 bg-ink-400'}`} />
              ))}
            </span>
            <span className="ml-auto" />
            {i > 0 ? (
              <button type="button" onClick={() => setI(i - 1)} className="ctl h-8 px-2" aria-label={t('Back')}>
                <ChevronLeft size={14} strokeWidth={1.8} />
              </button>
            ) : (
              <button type="button" onClick={finish} className="h-8 px-2 text-xs text-fg-3 hover:text-fg">
                {t('Skip')}
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={() => (last ? finish() : setI(i + 1))}
              className="ctl h-8 border-[#5fb8f0]/70 bg-[#5fb8f0]/15 px-3 text-fg hover:bg-[#5fb8f0]/25"
            >
              {last ? t('Let’s go') : i === 0 ? t('Show me') : t('Next')}
              {last ? null : <ChevronRight size={14} strokeWidth={1.8} />}
            </button>
          </div>
          <button type="button" onClick={finish} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center text-fg-3 hover:text-fg" aria-label={t('Close the tour')}>
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
}
