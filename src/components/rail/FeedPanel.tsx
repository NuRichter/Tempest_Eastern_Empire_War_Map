'use client';

import { useEffect, useMemo, useRef } from 'react';

import { battleDayLabel } from '@/lib/format';
import { eventCategory } from '@/lib/taxonomy';
import { useSimulation } from '@/simulation/store';
import { eventVisible } from '@/map/overlay/context';
import { FactionDot, ProvenanceBadge } from '@/components/ui/primitives';

const CATEGORY_MARK: Record<string, string> = { COMBAT: '⚔', MOVEMENT: '➤', COMMAND: '◆', INTELLIGENCE: '◉', POLITICAL: '⚑' };

/** The record as a feed: grouped by battle day, following the playhead. */
export function FeedPanel() {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const filters = useSimulation((s) => s.filters);
  const selection = useSimulation((s) => s.selection);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const listRef = useRef<HTMLOListElement | null>(null);

  const visible = useMemo(() => (data ? data.events.filter((e) => eventVisible(filters, e)) : []), [data, filters]);
  const currentId = useMemo(() => [...visible].reverse().find((e) => e.frame <= frame)?.id ?? null, [visible, frame]);

  // Keep the current event in view without stealing focus.
  useEffect(() => {
    if (!currentId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-event="${currentId}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [currentId]);

  if (!data) return null;
  let lastDay: number | null = null;

  return (
    <div className="flex h-full flex-col">
      <p className="px-3 py-2 text-xs text-fg-3">
        {visible.length} of {data.events.length} events · click to move the map and timeline there
      </p>
      <ol ref={listRef} className="min-h-0 flex-1 overflow-y-auto pb-3" aria-label="Campaign events">
        {visible.map((e) => {
          const header = e.battleDay !== lastDay;
          lastDay = e.battleDay;
          const past = e.frame <= frame;
          const current = e.id === currentId;
          const selected = selection.kind === 'event' && selection.id === e.id;
          return (
            <li key={e.id} data-event={e.id}>
              {header ? <p className="eyebrow sticky top-0 z-10 bg-ink-850 px-3 py-1">{battleDayLabel(e.battleDay)}</p> : null}
              <button
                type="button"
                onClick={() => jumpToEvent(e.id)}
                aria-current={current ? 'step' : undefined}
                className={`flex w-full gap-2 border-l-2 px-3 py-1.5 text-left ${selected ? 'border-l-accent bg-accent/10' : current ? 'border-l-fg-3 bg-ink-700/60' : 'border-l-transparent hover:bg-ink-700/40'} ${past ? '' : 'opacity-55'}`}
              >
                <span className="figure w-10 shrink-0 pt-px text-2xs text-fg-3">{e.simulationTime}</span>
                <span aria-hidden className="w-3 shrink-0 text-center text-xs text-fg-3">{CATEGORY_MARK[eventCategory(e.type)]}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm leading-snug ${e.turningPoint ? 'font-semibold text-fg' : 'text-fg'}`}>{e.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-2xs text-fg-3">
                    <FactionDot faction={e.actorFaction} size={6} />
                    <span className="truncate">{e.location}</span>
                  </span>
                  {e.provenance !== 'CANONICAL' ? (
                    <span className="mt-1 block">
                      <ProvenanceBadge value={e.provenance} compact />
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
