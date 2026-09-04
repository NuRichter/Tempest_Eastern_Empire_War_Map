'use client';

import { Bug, Film, Layers, Presentation, Search as SearchIcon } from 'lucide-react';

import { columnAt } from '@/data/loader';
import { battleDayLabel, phaseLabel } from '@/lib/format';
import { useSimulation, type ViewMode } from '@/simulation/store';

const MODES: { id: ViewMode; label: string; icon: typeof Film }[] = [
  { id: 'standard', label: 'Standard', icon: Layers },
  { id: 'cinematic', label: 'Cinematic', icon: Film },
  { id: 'presentation', label: 'Presentation', icon: Presentation },
];

/** Campaign masthead and the three view modes. */
export function TopBar() {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const state = useSimulation((s) => s.state);
  const viewMode = useSimulation((s) => s.viewMode);
  const setViewMode = useSimulation((s) => s.setViewMode);
  const setSearchOpen = useSimulation((s) => s.setSearchOpen);
  const debug = useSimulation((s) => s.debug);
  const setDebug = useSimulation((s) => s.setDebug);

  if (!data || !state) return null;

  return (
    <header className="flex items-center gap-3 border-b border-chart-rule/30 bg-ink-850/90 px-3 py-1.5 backdrop-blur">
      <h1 className="shrink-0 font-atlas text-sm tracking-wide text-chart-paper">
        Tempest<span className="mx-1 text-brass">·</span>Eastern Empire War
      </h1>
      <p className="hidden shrink-0 font-ui text-micro text-chart-faint md:block">
        Reconstructed campaign, {data.manifest.campaign.startDate} to {data.manifest.campaign.endDate}
      </p>

      <div className="min-w-0 flex-1 text-center">
        <span className="font-figure text-tiny text-chart-paper">
          {columnAt(data.timeline.date, frame)}
        </span>
        <span className="mx-2 font-figure text-tiny text-chart-faint">
          {battleDayLabel(data.timeline.battleDay[frame])}
        </span>
        <span className="hidden font-ui text-tiny text-chart-faint lg:inline">{phaseLabel(state.phase)}</span>
      </div>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex shrink-0 items-center gap-1.5 border border-chart-rule/35 px-2 py-1 font-ui text-micro text-chart-faint transition-colors hover:border-brass/60 hover:text-chart-paper focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass"
        title="Search (press /)"
      >
        <SearchIcon size={12} strokeWidth={1.7} />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden font-figure text-micro text-chart-faint sm:inline">/</kbd>
      </button>

      <div className="flex shrink-0 items-center gap-px">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setViewMode(mode.id)}
              title={mode.label}
              aria-label={mode.label}
              aria-pressed={viewMode === mode.id}
              className={`grid h-7 w-7 place-items-center border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass ${
                viewMode === mode.id
                  ? 'border-brass bg-brass/20 text-chart-paper'
                  : 'border-chart-rule/30 text-chart-faint hover:border-chart-rule/60 hover:text-chart-paper'
              }`}
            >
              <Icon size={13} strokeWidth={1.6} />
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setDebug(!debug)}
          title="Developer readout"
          aria-label="Developer readout"
          aria-pressed={debug}
          className={`ml-1 grid h-7 w-7 place-items-center border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass ${
            debug ? 'border-brass bg-brass/20 text-chart-paper' : 'border-chart-rule/30 text-chart-faint hover:text-chart-paper'
          }`}
        >
          <Bug size={13} strokeWidth={1.6} />
        </button>
      </div>
    </header>
  );
}
