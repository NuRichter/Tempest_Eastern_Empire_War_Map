'use client';

import { BookOpen, Film, HelpCircle, Search } from 'lucide-react';

import { columnAt } from '@/data/loader';
import { phaseLabel } from '@/lib/format';
import { currentEvent } from '@/simulation/resolver';
import { useSimulation } from '@/simulation/store';
import { ProvenanceBadge } from '@/components/ui/primitives';

/**
 * Masthead. Identity on the left, the campaign's state in the middle (where
 * the eye checks "when am I?"), tools on the right. One line, 44px.
 */
export function TopBar() {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const state = useSimulation((s) => s.state);
  const setPaletteOpen = useSimulation((s) => s.setPaletteOpen);
  const setViewMode = useSimulation((s) => s.setViewMode);
  const setLegendOpen = useSimulation((s) => s.setLegendOpen);
  const legendOpen = useSimulation((s) => s.legendOpen);
  const setHelpOpen = useSimulation((s) => s.setHelpOpen);
  if (!data || !state) return null;

  const latest = currentEvent(data, frame);
  const day = data.timeline.battleDay[frame];

  return (
    <header className="relative z-30 flex h-11 shrink-0 items-center gap-3 border-b border-ink-500 bg-ink-850 px-3">
      <div className="flex min-w-0 items-baseline gap-2">
        <h1 className="truncate font-display text-[15px] font-semibold tracking-wide text-fg">Tempest–Eastern Empire War</h1>
        <span className="hidden text-2xs uppercase tracking-label text-fg-3 lg:inline">Campaign Atlas · fan research</span>
      </div>

      <div className="mx-auto hidden min-w-0 items-center gap-3 md:flex">
        <span className="figure text-sm text-fg">{day < 0 ? `D−${String(-day).padStart(2, '0')}` : `D+${String(day).padStart(2, '0')}`}</span>
        <span className="h-3 w-px bg-ink-400" aria-hidden />
        <span className="text-sm text-fg-2">{phaseLabel(state.phase)}</span>
        {latest ? (
          <>
            <span className="h-3 w-px bg-ink-400" aria-hidden />
            <span className="hidden max-w-[22rem] truncate text-sm text-fg-2 xl:inline">{latest.title}</span>
            <span className="hidden xl:inline">
              <ProvenanceBadge value={latest.provenance} compact />
            </span>
          </>
        ) : null}
        <span className="hidden text-2xs text-fg-3 2xl:inline" title={data.manifest.clock.calendarNote}>
          sim. calendar {columnAt(data.timeline.date, frame)}
        </span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0">
        <button type="button" onClick={() => setPaletteOpen(true)} className="ctl w-auto gap-2 pr-1.5 sm:min-w-[13rem] sm:justify-between" aria-label="Search and commands" aria-keyshortcuts="/ Control+K">
          <span className="flex items-center gap-1.5">
            <Search size={14} strokeWidth={1.8} />
            <span className="hidden sm:inline">Search the campaign</span>
          </span>
          <kbd className="hidden rounded-[2px] border border-ink-400 px-1 font-mono text-2xs text-fg-3 sm:inline">/</kbd>
        </button>
        <button type="button" onClick={() => setLegendOpen(!legendOpen)} aria-pressed={legendOpen} className="ctl w-8 px-0" aria-label="Map legend" title="Legend (L)">
          <BookOpen size={15} strokeWidth={1.7} />
        </button>
        <button type="button" onClick={() => setViewMode('cinematic')} className="ctl w-8 px-0" aria-label="Cinematic mode" title="Cinematic mode (C)">
          <Film size={15} strokeWidth={1.7} />
        </button>
        <button type="button" onClick={() => setHelpOpen(true)} className="ctl w-8 px-0" aria-label="About and keyboard shortcuts" title="About and shortcuts (?)">
          <HelpCircle size={15} strokeWidth={1.7} />
        </button>
      </div>
    </header>
  );
}
