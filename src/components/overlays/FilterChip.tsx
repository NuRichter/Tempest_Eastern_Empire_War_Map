'use client';

import { Filter, X } from 'lucide-react';

import { activeFilterCount, useSimulation } from '@/simulation/store';

/** Nothing is hidden silently: whenever a filter is active the map says so. */
export function FilterChip() {
  const filters = useSimulation((s) => s.filters);
  const commanderFocus = useSimulation((s) => s.commanderFocus);
  const resetFilters = useSimulation((s) => s.resetFilters);
  const setCommanderFocus = useSimulation((s) => s.setCommanderFocus);
  const setRailTab = useSimulation((s) => s.setRailTab);
  const data = useSimulation((s) => s.data);
  const count = activeFilterCount(filters) + (commanderFocus ? 1 : 0);
  if (!count) return null;
  const commander = commanderFocus ? data?.commanderById.get(commanderFocus) : null;
  return (
    <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-accent/60 bg-ink-900/95 py-1 pl-3 pr-1 text-xs text-fg shadow-panel" role="status">
      <Filter size={12} className="text-accent" aria-hidden />
      <button type="button" onClick={() => setRailTab('filters')} className="hover:text-accent">
        {count} filter{count > 1 ? 's' : ''} active{commander ? ` · only ${commander.name}'s command` : ''}
      </button>
      <button
        type="button"
        onClick={() => {
          resetFilters();
          setCommanderFocus(null);
        }}
        className="ml-1 grid h-6 w-6 place-items-center rounded-full text-fg-3 hover:bg-ink-600 hover:text-fg"
        aria-label="Reset filters"
        title="Reset filters"
      >
        <X size={12} />
      </button>
    </div>
  );
}
