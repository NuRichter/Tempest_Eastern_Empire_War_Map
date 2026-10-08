'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { loadDataset } from '@/data/loader';
import { syncLocale, useT } from '@/i18n';
import { SPEEDS } from '@/simulation/clock';
import { useSimulation, type Selection } from '@/simulation/store';
import { usePreferences } from '@/state/preferences';
import { TopBar } from '@/components/shell/TopBar';
import { LeftRail } from '@/components/rail/LeftRail';
import { RightPanel } from '@/components/shell/RightPanel';
import { Timeline } from '@/components/timeline/Timeline';
import { CommandPalette } from '@/components/overlays/CommandPalette';
import { Legend } from '@/components/overlays/Legend';
import { HelpDialog } from '@/components/overlays/HelpDialog';
import { CinematicOverlay } from '@/components/overlays/CinematicOverlay';
import { FilterChip } from '@/components/overlays/FilterChip';
import { Tour } from '@/components/overlays/Tour';

// MapLibre needs a DOM and WebGL, so the map is client-only.
const MapView = dynamic(() => import('@/map/MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-ink-900" />,
});

const SELECTION_KINDS = ['event', 'battle', 'force', 'character', 'territory', 'theatre', 'nation', 'movement'] as const;

export function AppShell() {
  const status = useSimulation((s) => s.status);
  const error = useSimulation((s) => s.error);
  const init = useSimulation((s) => s.init);
  const failed = useSimulation((s) => s.failed);
  const viewMode = useSimulation((s) => s.viewMode);
  const density = usePreferences((s) => s.density);
  const uiTheme = usePreferences((s) => s.uiTheme);
  const themeCursor = usePreferences((s) => s.themeCursor);
  const t = useT();
  const [hydrated, setHydrated] = useState(false);
  const started = useRef(false);

  /* -- language and appearance -------------------------------------- */

  useEffect(() => {
    void syncLocale();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.uiTheme = uiTheme;
    root.style.colorScheme = uiTheme;
    root.classList.toggle('theme-cursor', themeCursor);
  }, [uiTheme, themeCursor]);

  /* -- load ---------------------------------------------------------- */

  useEffect(() => {
    setHydrated(true);
    if (started.current) return;
    started.current = true;
    const controller = new AbortController();
    loadDataset(controller.signal)
      .then((data) => init(data))
      .catch((e: unknown) => {
        if (!controller.signal.aborted) failed(e instanceof Error ? e.message : 'The campaign dataset could not be loaded.');
      });
    return () => controller.abort();
  }, [init, failed]);

  // Narrow screens start with the drawers closed so the map is usable.
  useEffect(() => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      usePreferences.getState().set('railOpen', false);
      usePreferences.getState().set('panelOpen', false);
    }
  }, []);

  /* -- deep links: the address bar describes what is on screen ------ */

  useEffect(() => {
    if (status !== 'ready') return;
    const params = new URLSearchParams(window.location.search);
    const store = useSimulation.getState();
    const frame = params.get('frame');
    const day = params.get('day');
    for (const kind of SELECTION_KINDS) {
      const id = params.get(kind);
      if (!id) continue;
      if (kind === 'event') store.jumpToEvent(id);
      else if (kind === 'battle') store.jumpToBattle(id);
      else if (kind === 'force') store.jumpToForce(id);
      else if (kind === 'character') store.jumpToCharacter(id);
      else if (kind === 'territory') store.jumpToTerritory(id);
      else if (kind === 'theatre') store.jumpToTheatre(id);
      else if (kind === 'nation') store.jumpToNation(id);
      else if (kind === 'movement') store.jumpToMovement(id);
      break;
    }
    if (frame !== null && Number.isFinite(Number(frame))) store.seek(Number(frame));
    else if (day !== null && store.data) store.seek((Number(day) - store.data.manifest.clock.firstDay) * store.data.manifest.clock.framesPerDay);
    if (params.get('view') === 'cinematic') store.setViewMode('cinematic');
  }, [status]);

  useEffect(() => {
    if (status !== 'ready') return;
    let timer = 0;
    const write = (s: { frame: number; selection: Selection; viewMode: string }) => {
      const params = new URLSearchParams();
      params.set('frame', String(s.frame));
      if (s.selection.kind !== 'none') params.set(s.selection.kind, s.selection.id);
      if (s.viewMode === 'cinematic') params.set('view', 'cinematic');
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    };
    const unsub = useSimulation.subscribe((s, prev) => {
      if (s.frame === prev.frame && s.selection === prev.selection && s.viewMode === prev.viewMode) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => write(useSimulation.getState()), 350);
    });
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, [status]);

  /* -- documentary pacing: slow down at turning points ---------------- */

  useEffect(() => {
    if (status !== 'ready') return;
    let restore: number | null = null;
    let timer = 0;
    const unsub = useSimulation.subscribe((s, prev) => {
      if (!s.playing || s.frame <= prev.frame || !s.data || !s.clock) return;
      if (!usePreferences.getState().autoSlow) return;
      const speed = s.clock.currentSpeed;
      let hit = false;
      for (let f = prev.frame + 1; f <= s.frame && !hit; f += 1) hit = Boolean(s.data.eventsByFrame.get(f)?.some((e) => e.turningPoint));
      if (!hit || speed <= 1) return;
      restore = restore ?? speed;
      s.clock.setSpeed(1);
      useSimulation.setState({ autoSlowed: true });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const { clock: c, autoSlowed } = useSimulation.getState();
        if (c && restore !== null && autoSlowed) c.setSpeed(restore);
        restore = null;
        useSimulation.setState({ autoSlowed: false });
      }, 2500);
    });
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, [status]);

  /* -- keyboard ------------------------------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (/input|textarea|select/i.test(target.tagName) || target.isContentEditable)) return;
      if (e.altKey) return;
      const s = useSimulation.getState();
      const p = usePreferences.getState();
      const fpd = s.data?.manifest.clock.framesPerDay ?? 144;

      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || e.key === '/') {
        e.preventDefault();
        s.setPaletteOpen(true);
        return;
      }
      if (e.ctrlKey || e.metaKey) return;
      if (e.key === 'Escape') {
        if (s.paletteOpen || s.legendOpen || s.helpOpen) return;
        if (s.viewMode === 'cinematic') s.setViewMode('standard');
        else s.select({ kind: 'none' });
        return;
      }
      // Arrow keys belong to the map when it has focus (panning).
      const onMap = target?.classList.contains('maplibregl-canvas');
      switch (e.key) {
        case ' ':
          e.preventDefault();
          s.toggle();
          return;
        case 'ArrowLeft':
          if (onMap) return;
          e.preventDefault();
          s.seek(s.frame - (e.shiftKey ? fpd : 6));
          return;
        case 'ArrowRight':
          if (onMap) return;
          e.preventDefault();
          s.seek(s.frame + (e.shiftKey ? fpd : 6));
          return;
        case '[':
          s.stepEvent(-1);
          return;
        case ']':
          s.stepEvent(1);
          return;
        case ',':
          s.seek(s.frame - 1);
          return;
        case '.':
          s.seek(s.frame + 1);
          return;
        case 'c':
          s.setViewMode(s.viewMode === 'cinematic' ? 'standard' : 'cinematic');
          return;
        case 'g':
          p.set('globe', !p.globe);
          return;
        case 'm':
          p.set('mapStyle', p.mapStyle === 'base' ? 'myth' : 'base');
          return;
        case 'l':
          s.setLegendOpen(!s.legendOpen);
          return;
        case '?':
          s.setHelpOpen(true);
          return;
        case '0':
          s.focusCampaign();
          return;
        case 'd':
          s.setDebug(!s.debug);
          return;
        case 'b': {
          if (!s.data) return;
          const at = s.data.eventsByFrame.get(s.frame)?.[0];
          p.addBookmark({ frame: s.frame, eventId: at?.id ?? null, label: at?.title ?? `Moment at frame ${s.frame}` });
          return;
        }
        default:
          if (/^[1-8]$/.test(e.key)) {
            const i = Number(e.key) - 1;
            if (i < SPEEDS.length) s.setSpeedIndex(i);
          }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* -- states --------------------------------------------------------- */

  if (status === 'error') {
    return (
      <main className="grid min-h-dvh place-items-center bg-ink-900 p-6">
        <div className="surface max-w-lg rounded-[4px] p-6">
          <h1 className="font-display text-xl text-fg">{t('The campaign dataset did not load')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-2">{error}</p>
          <p className="mt-3 text-sm leading-relaxed text-fg-3">
            {t('The runtime dataset is generated at build time. Run the compile and validate steps, then reload.')}{' '}
            <code className="figure text-accent">npm run compile-data</code> · <code className="figure text-accent">npm run validate-data</code>
          </p>
        </div>
      </main>
    );
  }

  if (status === 'loading' || !hydrated) {
    return (
      <main className="grid min-h-dvh place-items-center bg-ink-900 p-6" aria-busy="true">
        <div className="text-center">
          <img src="/assets/theme/chibi/slime-calm.webp" alt="" width={96} height={70} className="mx-auto mb-4 h-[70px] w-auto animate-[slime-bounce_1.1s_ease-in-out_infinite]" />
          <p className="eyebrow">{t('Campaign Atlas')}</p>
          <p className="mt-2 font-display text-2xl text-fg">Tempest–Eastern Empire War</p>
          <p className="mt-2 text-sm text-fg-3">{t('Loading the campaign record…')}</p>
          <div className="mx-auto mt-5 h-px w-56 overflow-hidden bg-ink-500">
            <div className="h-full w-1/3 animate-[shimmer_1.4s_ease-in-out_infinite] bg-accent" />
          </div>
        </div>
      </main>
    );
  }

  const cinematic = viewMode === 'cinematic';

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-ink-900 text-fg" data-density={density}>
      <a href="#timeline" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-ink-800 focus:px-3 focus:py-2">
        {t('Skip to the campaign timeline')}
      </a>
      {cinematic ? null : <TopBar />}
      <div className="relative min-h-0 flex-1">
        <MapView />
        {cinematic ? null : (
          <>
            <LeftRail />
            <RightPanel />
            <FilterChip />
          </>
        )}
        <CinematicOverlay />
      </div>
      <Timeline />
      <CommandPalette />
      <Legend />
      <HelpDialog />
      {cinematic ? null : <Tour />}
    </main>
  );
}
