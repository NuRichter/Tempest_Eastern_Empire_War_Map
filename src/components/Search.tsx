'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';

import { useSimulation } from '@/simulation/store';
import { Flag } from '@/components/primitives';

interface Hit {
  kind: 'nation' | 'force' | 'commander' | 'battle' | 'event' | 'theatre' | 'combatant';
  id: string;
  title: string;
  detail: string;
  nationId?: string | null;
  score: number;
}

/**
 * Global search.
 *
 * One box over everything the dataset names. Choosing a result focuses the
 * camera, opens its dossier and, where the result is time-bound, moves the
 * simulation clock to it.
 */
export function Search() {
  const open = useSimulation((s) => s.searchOpen);
  const setOpen = useSimulation((s) => s.setSearchOpen);
  const data = useSimulation((s) => s.data);
  const select = useSimulation((s) => s.select);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const jumpToBattle = useSimulation((s) => s.jumpToBattle);
  const jumpToForce = useSimulation((s) => s.jumpToForce);
  const jumpToTheatre = useSimulation((s) => s.jumpToTheatre);
  const focusOn = useSimulation((s) => s.focusOn);

  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      window.setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    if (!data || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    const score = (text: string): number => {
      const t = text.toLowerCase();
      if (t === q) return 100;
      if (t.startsWith(q)) return 80;
      if (t.includes(q)) return 55;
      return 0;
    };
    const out: Hit[] = [];
    const push = (hit: Omit<Hit, 'score'>, ...fields: string[]) => {
      const best = Math.max(...fields.map(score));
      if (best > 0) out.push({ ...hit, score: best });
    };

    for (const n of data.nations) {
      push({ kind: 'nation', id: n.id, title: n.name, detail: n.category, nationId: n.id }, n.name, n.category, n.id);
    }
    for (const f of data.forces) {
      push(
        { kind: 'force', id: f.id, title: f.formation, detail: `${f.faction} · ${f.commander}` },
        f.formation, f.army, f.commander, f.id, f.faction,
      );
    }
    for (const c of data.commanders) {
      push({ kind: 'commander', id: c.id, title: c.name, detail: `${c.role} · ${c.faction}` }, c.name, c.role, c.scope, c.id);
    }
    for (const c of data.combatants) {
      push({ kind: 'combatant', id: c.id, title: c.name, detail: `${c.faction} · ${c.finalStatus.toLowerCase()}` }, c.name, c.effect, c.id);
    }
    for (const b of data.battles) {
      push({ kind: 'battle', id: b.id, title: b.name, detail: b.theatreId }, b.name, b.id);
    }
    for (const t of data.theatres) {
      push({ kind: 'theatre', id: t.id, title: t.name, detail: t.region }, t.name, t.region, t.id);
    }
    for (const e of data.events) {
      push(
        { kind: 'event', id: e.id, title: e.action, detail: `${e.warDay} · ${e.theatre}` },
        e.action, e.actor, e.location, e.id, e.immediateResult,
      );
    }

    return out.sort((a, b) => b.score - a.score).slice(0, 24);
  }, [data, query]);

  if (!open) return null;

  const choose = (hit: Hit) => {
    switch (hit.kind) {
      case 'event': jumpToEvent(hit.id); break;
      case 'battle': jumpToBattle(hit.id); break;
      case 'force': jumpToForce(hit.id); break;
      case 'theatre': jumpToTheatre(hit.id); break;
      case 'nation': {
        const nation = data?.nationById.get(hit.id);
        select({ kind: 'nation', id: hit.id });
        if (nation?.x != null && nation.y != null) focusOn(nation.x, nation.y, 3.4);
        break;
      }
      case 'commander': select({ kind: 'commander', id: hit.id }); break;
      case 'combatant': select({ kind: 'combatant', id: hit.id }); break;
    }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-ink-900/70 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="w-[min(38rem,92vw)] border border-chart-rule/40 bg-ink-850 shadow-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search the campaign"
      >
        <div className="flex items-center gap-2 border-b border-chart-rule/30 px-3 py-2">
          <SearchIcon size={15} strokeWidth={1.6} className="shrink-0 text-chart-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(hits.length - 1, c + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
              if (e.key === 'Enter' && hits[cursor]) choose(hits[cursor]);
            }}
            placeholder="Search nations, formations, commanders, battles, events"
            className="flex-1 bg-transparent font-ui text-sm text-chart-paper placeholder:text-chart-faint focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="shrink-0 text-chart-faint hover:text-chart-paper"
            aria-label="Close search"
          >
            <X size={15} strokeWidth={1.6} />
          </button>
        </div>
        {query.trim().length < 2 ? (
          <p className="px-3 py-4 font-ui text-tiny text-chart-faint">
            Type at least two characters. Press escape to close.
          </p>
        ) : hits.length === 0 ? (
          <p className="px-3 py-4 font-ui text-tiny text-chart-faint">
            Nothing in the dataset matches that.
          </p>
        ) : (
          <ul className="max-h-[52vh] overflow-y-auto">
            {hits.map((hit, i) => (
              <li key={`${hit.kind}-${hit.id}`}>
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => choose(hit)}
                  className={`flex w-full items-center gap-2 border-l-2 px-3 py-1.5 text-left ${
                    i === cursor ? 'border-l-brass bg-ink-700/70' : 'border-l-transparent hover:bg-ink-700/40'
                  }`}
                >
                  {hit.nationId !== undefined ? <Flag nationId={hit.nationId} size={13} /> : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-ui text-tiny text-chart-paper">{hit.title}</span>
                    <span className="block truncate font-ui text-micro text-chart-faint">{hit.detail}</span>
                  </span>
                  <span className="shrink-0 font-figure text-micro text-chart-faint">{hit.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
