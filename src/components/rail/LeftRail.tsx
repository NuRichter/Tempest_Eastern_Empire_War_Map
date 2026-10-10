'use client';

import { BookMarked, Filter, Layers, ListOrdered, PanelLeftClose } from 'lucide-react';

import { msg, useT } from '@/i18n';
import { activeFilterCount, useSimulation, type RailTab } from '@/simulation/store';
import { usePreferences } from '@/state/preferences';
import { LayersPanel } from '@/components/rail/LayersPanel';
import { FiltersPanel } from '@/components/rail/FiltersPanel';
import { FeedPanel } from '@/components/rail/FeedPanel';
import { StoryPanel } from '@/components/rail/StoryPanel';

const TABS: { id: RailTab; label: string; icon: typeof Layers }[] = [
  { id: 'layers', label: msg('Layers'), icon: Layers },
  { id: 'filters', label: msg('Filters'), icon: Filter },
  { id: 'feed', label: msg('Events'), icon: ListOrdered },
  { id: 'story', label: msg('Story'), icon: BookMarked },
];

/**
 * Left rail: a permanent strip of tools and a drawer that opens beside it.
 * The drawer floats over the map edge rather than shrinking the map.
 */
export function LeftRail() {
  const t = useT();
  const tab = useSimulation((s) => s.railTab);
  const setTab = useSimulation((s) => s.setRailTab);
  const filters = useSimulation((s) => s.filters);
  const open = usePreferences((s) => s.railOpen);
  const setPref = usePreferences((s) => s.set);
  const filterCount = activeFilterCount(filters);

  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-20 flex">
      <nav data-tour="rail" aria-label={t('Tools')} className="pointer-events-auto flex w-12 flex-col items-center gap-1 border-r border-ink-500 bg-ink-850/95 py-2">
        {TABS.map((x) => {
          const Icon = x.icon;
          const active = open && tab === x.id;
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => (active ? setPref('railOpen', false) : setTab(x.id))}
              aria-pressed={active}
              aria-label={t(x.label)}
              title={t(x.label)}
              className={`relative grid h-10 w-10 place-items-center rounded-[3px] ${active ? 'bg-accent/15 text-fg' : 'text-fg-3 hover:bg-ink-700 hover:text-fg'}`}
            >
              <Icon size={17} strokeWidth={1.7} />
              <span className="mt-0.5 hidden text-[9px] leading-none">{t(x.label)}</span>
              {x.id === 'filters' && filterCount ? (
                <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-ink-900">{filterCount}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
      {open ? (
        <aside
          aria-label={t(TABS.find((x) => x.id === tab)?.label ?? '')}
          className="pointer-events-auto flex w-[min(19.5rem,calc(100vw-3rem))] flex-col border-r border-ink-500 bg-ink-850/97 shadow-panel"
        >
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-ink-500 px-3">
            <h2 className="text-sm font-semibold tracking-wide text-fg">{t(TABS.find((x) => x.id === tab)?.label ?? '')}</h2>
            <button type="button" onClick={() => setPref('railOpen', false)} className="grid h-8 w-8 place-items-center text-fg-3 hover:text-fg" aria-label={t('Close panel')}>
              <PanelLeftClose size={15} strokeWidth={1.7} />
            </button>
          </div>
          <div className={`min-h-0 flex-1 ${tab === 'feed' ? '' : 'overflow-y-auto'}`}>
            {tab === 'layers' ? <LayersPanel /> : null}
            {tab === 'filters' ? <FiltersPanel /> : null}
            {tab === 'feed' ? <FeedPanel /> : null}
            {tab === 'story' ? <StoryPanel /> : null}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
