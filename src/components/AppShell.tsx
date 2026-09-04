'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { loadDataset } from '@/data/loader';
import { SPEEDS, type Speed } from '@/simulation/clock';
import { useSimulation } from '@/simulation/store';
import { CalendarPanel } from '@/components/CalendarPanel';
import { CasualtyPanel } from '@/components/CasualtyPanel';
import { CinematicOverlay } from '@/components/CinematicOverlay';
import { DebugPanel } from '@/components/DebugPanel';
import { Dossier } from '@/components/Dossier';
import { EventPanel } from '@/components/EventPanel';
import { HighlightsPanel } from '@/components/HighlightsPanel';
import { IntelligencePanel } from '@/components/IntelligencePanel';
import { LayerPanel } from '@/components/LayerPanel';
import { Search } from '@/components/Search';
import { Timeline } from '@/components/Timeline';
import { TopBar } from '@/components/TopBar';

// MapLibre needs a DOM and a WebGL context, so the map is client-only.
const MapView = dynamic(() => import('@/map/MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-ink-900" />,
});

export function AppShell() {
  const status = useSimulation((s) => s.status);
  const error = useSimulation((s) => s.error);
  const init = useSimulation((s) => s.init);
  const failed = useSimulation((s) => s.failed);
  const viewMode = useSimulation((s) => s.viewMode);
  const [railOpen, setRailOpen] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const started = useRef(false);

  /* -- responsive -------------------------------------------------- */

  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)');
    const apply = () => {
      setNarrow(query.matches);
      // On a narrow viewport the panels would leave no map. They collapse to a
      // drawer over the map instead, closed by default.
      setRailOpen(!query.matches);
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  /* -- load -------------------------------------------------------- */

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const controller = new AbortController();
    loadDataset(controller.signal)
      .then((data) => init(data))
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        failed(e instanceof Error ? e.message : 'The campaign dataset could not be loaded.');
      });
    return () => controller.abort();
  }, [init, failed]);

  /* -- deep links -------------------------------------------------- */

  useEffect(() => {
    if (status !== 'ready') return;
    const params = new URLSearchParams(window.location.search);
    const store = useSimulation.getState();
    const day = params.get('day');
    const frame = params.get('frame');
    const event = params.get('event');
    const battle = params.get('battle');
    const force = params.get('force');
    const theatre = params.get('theatre');

    if (event) store.jumpToEvent(event);
    else if (battle) store.jumpToBattle(battle);
    else if (force) store.jumpToForce(force);
    else if (theatre) store.jumpToTheatre(theatre);
    else if (frame) store.seek(Number(frame));
    else if (day) store.seek(Number(day) * (store.data?.manifest.clock.framesPerDay ?? 144));
  }, [status]);

  useEffect(() => {
    if (status !== 'ready') return;
    // Reproducible URLs: the address bar always describes what is on screen.
    const unsubscribe = useSimulation.subscribe((s) => {
      const params = new URLSearchParams();
      params.set('frame', String(s.frame));
      if (s.selection.kind !== 'none') params.set(s.selection.kind, s.selection.id);
      const next = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', next);
    });
    return unsubscribe;
  }, [status]);

  /* -- keyboard ---------------------------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      const store = useSimulation.getState();

      if (e.key === '/') {
        e.preventDefault();
        store.setSearchOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        store.setSearchOpen(false);
        store.select({ kind: 'none' });
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        store.toggle();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        store.seek(store.frame - (e.shiftKey ? 144 : 6));
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        store.seek(store.frame + (e.shiftKey ? 144 : 6));
        return;
      }
      if (e.key >= '1' && e.key <= '6') {
        const speed = SPEEDS[Number(e.key) - 1] as Speed | undefined;
        if (speed) store.setSpeed(speed);
        return;
      }
      if (e.key.toLowerCase() === 'c') store.setViewMode(store.viewMode === 'cinematic' ? 'standard' : 'cinematic');
      if (e.key.toLowerCase() === 'g') store.setGlobe(!store.globe);
      if (e.key.toLowerCase() === 'd') store.setDebug(!store.debug);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* -- states ------------------------------------------------------ */

  if (status === 'error') {
    return (
      <main className="grid min-h-dvh place-items-center bg-ink-900 p-6">
        <div className="max-w-lg border border-empire/50 bg-ink-850 p-6">
          <h1 className="font-atlas text-lg text-chart-paper">The campaign dataset did not load</h1>
          <p className="mt-3 font-ui text-sm leading-relaxed text-chart-paper/80">{error}</p>
          <p className="mt-3 font-ui text-sm leading-relaxed text-chart-faint">
            The runtime dataset is generated from the workbook at build time. Run{' '}
            <code className="font-figure text-brass">npm run compile-data</code>, then{' '}
            <code className="font-figure text-brass">npm run validate-data</code>, and reload.
          </p>
        </div>
      </main>
    );
  }

  if (status === 'loading') {
    return (
      <main className="grid min-h-dvh place-items-center bg-ink-900 p-6">
        <div className="text-center">
          <p className="font-atlas text-xl text-chart-paper">Tempest–Eastern Empire War</p>
          <p className="mt-2 font-ui text-sm text-chart-faint">Loading 7,200 keyframes of campaign state.</p>
          <div className="mx-auto mt-4 h-px w-48 overflow-hidden bg-chart-rule/30">
            <div className="h-full w-1/3 animate-[slide_1.4s_ease-in-out_infinite] bg-brass" />
          </div>
        </div>
      </main>
    );
  }

  const cinematic = viewMode !== 'standard';

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-ink-900">
      {viewMode === 'presentation' ? null : <TopBar />}

      <div className="relative flex min-h-0 flex-1">
        {/* Left information and control system */}
        {!cinematic && railOpen ? (
          <aside
            className={
              narrow
                ? 'absolute inset-y-0 left-0 z-30 flex w-[min(21rem,88vw)] flex-col gap-2 overflow-y-auto border-r border-chart-rule/40 bg-ink-900/96 p-2 pt-14 shadow-panel backdrop-blur'
                : 'z-20 flex w-[22rem] shrink-0 flex-col gap-2 overflow-y-auto border-r border-chart-rule/25 bg-ink-900/60 p-2 lg:w-[23rem]'
            }
          >
            <CalendarPanel />
            <EventPanel />
            <HighlightsPanel />
            <CasualtyPanel />
            <IntelligencePanel />
            <LayerPanel />
            <p className="px-1 pb-2 font-ui text-micro leading-relaxed text-chart-faint">
              Space plays and pauses. Arrow keys step by the hour, shift-arrow by the day. Numbers 1
              to 6 set speed. Press <kbd className="font-figure">/</kbd> to search,{' '}
              <kbd className="font-figure">c</kbd> for cinematic mode, <kbd className="font-figure">g</kbd>{' '}
              to switch between globe and flat atlas.
            </p>
          </aside>
        ) : null}

        <div className="relative min-w-0 flex-1">
          <MapView />
          <Dossier />
          <CinematicOverlay />
          <DebugPanel />

          {!cinematic ? (
            <button
              type="button"
              onClick={() => setRailOpen((v) => !v)}
              className="absolute left-3 top-3 z-20 grid h-8 w-8 place-items-center border border-chart-rule/35 bg-ink-800/85 text-chart-faint backdrop-blur transition-colors hover:border-brass/60 hover:text-chart-paper focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass"
              aria-label={railOpen ? 'Hide the information panels' : 'Show the information panels'}
              title={railOpen ? 'Hide the information panels' : 'Show the information panels'}
            >
              {railOpen ? <PanelLeftClose size={15} strokeWidth={1.6} /> : <PanelLeftOpen size={15} strokeWidth={1.6} />}
            </button>
          ) : null}
        </div>
      </div>

      <Timeline />
      <Search />
    </main>
  );
}
