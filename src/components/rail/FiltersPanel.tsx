'use client';

import { useT } from '@/i18n';
import { EVENT_CATEGORIES } from '@/lib/taxonomy';
import { activeFilterCount, useSimulation } from '@/simulation/store';
import { PROVENANCE_ORDER } from '@/types/dataset';
import { FactionDot, ProvenanceBadge, Section, Segmented } from '@/components/ui/primitives';

function toggleIn<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-[3px] px-1.5 py-1 hover:bg-ink-700/60">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-[#d4ab57]" />
      <span className="flex min-w-0 items-center gap-1.5 text-sm text-fg">{children}</span>
    </label>
  );
}

/**
 * Filters hide things; they never change the record. The map shows a chip
 * whenever anything is filtered, so nothing disappears silently.
 */
export function FiltersPanel() {
  const data = useSimulation((s) => s.data);
  const t = useT();
  const filters = useSimulation((s) => s.filters);
  const setFilters = useSimulation((s) => s.setFilters);
  const resetFilters = useSimulation((s) => s.resetFilters);
  const commanderFocus = useSimulation((s) => s.commanderFocus);
  const setCommanderFocus = useSimulation((s) => s.setCommanderFocus);
  if (!data) return null;
  const count = activeFilterCount(filters);

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2.5">
        <p className="text-xs text-fg-2">{count ? (count > 1 ? t('{n} filters active', { n: count }) : t('1 filter active')) : t('Showing everything in the record')}</p>
        <button type="button" onClick={resetFilters} disabled={!count} className="ctl h-7">
          {t('Reset filters')}
        </button>
      </div>

      <Section title={t('Factions')}>
        <div className="-mx-1.5">
          {data.factions.map((f) => (
            <Check key={f.id} checked={!filters.hiddenFactions.includes(f.id)} onChange={() => setFilters({ hiddenFactions: toggleIn(filters.hiddenFactions, f.id) })}>
              <FactionDot faction={f.id} />
              <span className="truncate">{f.name}</span>
              <span className="figure ml-auto text-2xs text-fg-3">{f.forceIds.length}</span>
            </Check>
          ))}
        </div>
      </Section>

      <Section title={t('Nations')} defaultOpen={false}>
        <p className="px-1.5 pb-1 text-2xs text-fg-3">{t("Hides the nation's territory fill and its formations.")}</p>
        <div className="-mx-1.5 max-h-56 overflow-y-auto">
          {data.nations.filter((n) => n.territoryId).map((n) => (
            <Check key={n.id} checked={!filters.hiddenNations.includes(n.id)} onChange={() => setFilters({ hiddenNations: toggleIn(filters.hiddenNations, n.id) })}>
              <span className="truncate">{n.name}</span>
            </Check>
          ))}
        </div>
      </Section>

      <Section title={t('Forces')} defaultOpen={false}>
        <p className="px-1.5 pb-1 text-2xs text-fg-3">{t('Hiding a formation hides everything it contains.')}</p>
        <div className="-mx-1.5 max-h-72 overflow-y-auto">
          {data.forces.filter((f) => f.depth <= 2).map((f) => (
            <Check key={f.id} checked={!filters.hiddenForces.includes(f.id)} onChange={() => setFilters({ hiddenForces: toggleIn(filters.hiddenForces, f.id) })}>
              <span style={{ paddingLeft: f.depth * 10 }} className="flex min-w-0 items-center gap-1.5">
                <FactionDot faction={f.faction} size={6} />
                <span className="truncate">{f.displayName}</span>
              </span>
            </Check>
          ))}
        </div>
      </Section>

      <Section title={t('Battles')} defaultOpen={false}>
        <div className="-mx-1.5">
          {data.battles.map((b) => (
            <Check key={b.id} checked={!filters.hiddenBattles.includes(b.id)} onChange={() => setFilters({ hiddenBattles: toggleIn(filters.hiddenBattles, b.id) })}>
              <span className="truncate">{b.name}</span>
            </Check>
          ))}
        </div>
      </Section>

      <Section title={t('Territories')} defaultOpen={false}>
        <div className="-mx-1.5 max-h-56 overflow-y-auto">
          {data.territories.map((tr) => (
            <Check key={tr.id} checked={!filters.hiddenTerritories.includes(tr.id)} onChange={() => setFilters({ hiddenTerritories: toggleIn(filters.hiddenTerritories, tr.id) })}>
              <span className="truncate">{tr.display}</span>
            </Check>
          ))}
        </div>
      </Section>

      <Section title={t('Theatres')}>
        <div className="-mx-1.5">
          {data.theatres.map((th) => (
            <Check key={th.id} checked={!filters.hiddenTheatres.includes(th.id)} onChange={() => setFilters({ hiddenTheatres: toggleIn(filters.hiddenTheatres, th.id) })}>
              <span className="figure w-8 text-2xs text-fg-3">{th.code}</span>
              <span className="truncate">{th.name}</span>
              <span className="figure ml-auto text-2xs text-fg-3">{th.eventCount}</span>
            </Check>
          ))}
        </div>
      </Section>

      <Section title={t('Event types')}>
        <div className="-mx-1.5">
          {EVENT_CATEGORIES.map((c) => (
            <Check key={c.id} checked={!filters.hiddenCategories.includes(c.id)} onChange={() => setFilters({ hiddenCategories: toggleIn(filters.hiddenCategories, c.id) })}>
              {t(c.label)}
            </Check>
          ))}
        </div>
      </Section>

      <Section title={t('Canon status')}>
        <div className="-mx-1.5">
          {PROVENANCE_ORDER.map((p) => (
            <Check key={p} checked={!filters.hiddenProvenance.includes(p)} onChange={() => setFilters({ hiddenProvenance: toggleIn(filters.hiddenProvenance, p) })}>
              <ProvenanceBadge value={p} />
              <span className="figure ml-auto text-2xs text-fg-3">{data.events.filter((e) => e.provenance === p).length}</span>
            </Check>
          ))}
        </div>
        <Segmented label={t('Minimum confidence')} value={filters.minConfidence} onChange={(v) => setFilters({ minConfidence: v })} options={[{ id: 'ANY', label: t('Any') }, { id: 'MEDIUM', label: t('Medium+') }, { id: 'HIGH', label: t('High') }]} />
      </Section>

      <Section title={t('Command')} defaultOpen={Boolean(commanderFocus)}>
        <label className="block px-1.5 text-xs text-fg-2" htmlFor="commander-focus">
          {t("Show only one commander's formations")}
        </label>
        <select id="commander-focus" value={commanderFocus ?? ''} onChange={(e) => setCommanderFocus(e.target.value || null)} className="mt-1 h-8 w-full rounded-[3px] border border-ink-500 bg-ink-800 px-2 text-sm text-fg">
          <option value="">{t('All commanders')}</option>
          {data.commanders.filter((c) => c.forceIds.length).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.faction}
            </option>
          ))}
        </select>
      </Section>
    </div>
  );
}
