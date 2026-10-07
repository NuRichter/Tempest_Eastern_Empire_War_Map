'use client';

import { useEffect, useMemo, useRef } from 'react';

import { battleDayLabel } from '@/lib/format';
import { eventCategory } from '@/lib/taxonomy';
import { useSimulation } from '@/simulation/store';
import { eventVisible } from '@/map/overlay/context';
import { FactionDot, ProvenanceBadge } from '@/components/ui/primitives';
import { usePreferences } from '@/state/preferences';
import { Bookmark, X } from 'lucide-react';

const CATEGORY_MARK: Record<string, string> = { COMBAT: '⚔', MOVEMENT: '➤', COMMAND: '◆', INTELLIGENCE: '◉', POLITICAL: '⚑' };

/** The record as a feed: grouped by battle day, following the playhead. */
export function FeedPanel() {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const filters = useSimulation((s) => s.filters);
  const selection = useSimulation((s) => s.selection);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const listRef = useRef<HTMLOListElement | null>(null);
  const bookmarks = usePreferences((s) => s.bookmarks);
  const addBookmark = usePreferences((s) => s.addBookmark);
  const removeBookmark = usePreferences((s) => s.removeBookmark);
  const seek = useSimulation((s) => s.seek);

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
      <div className="border-b border-ink-500 px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Bookmarks</p>
          <button
            type="button"
            className="ctl h-7 gap-1"
            title="Bookmark this moment (B)"
            onClick={() => {
              const at = data.events.filter((e) => e.frame <= frame).pop();
              addBookmark({ frame, eventId: at && at.frame === frame ? at.id : null, label: at && at.frame === frame ? at.title : `${battleDayLabel(data.timeline.battleDay[frame])} ${String(Math.floor(((frame % 144) * 10) / 60)).padStart(2, '0')}:${String(((frame % 144) * 10) % 60).padStart(2, '0')}` });
            }}
          >
            <Bookmark size={12} /> This moment
          </button>
        </div>
        {bookmarks.length ? (
          <ul className="mt-1.5 space-y-px">
            {bookmarks.map((b) => (
              <li key={b.id} className="flex items-center gap-1">
                <button type="button" onClick={() => (b.eventId ? jumpToEvent(b.eventId) : seek(b.frame))} className="flex min-w-0 flex-1 gap-2 rounded-[3px] px-1 py-0.5 text-left text-xs hover:bg-ink-700/60">
                  <span className="figure shrink-0 text-2xs text-accent">{battleDayLabel(data.timeline.battleDay[b.frame])}</span>
                  <span className="truncate text-fg">{b.label}</span>
                </button>
                <button type="button" onClick={() => removeBookmark(b.id)} className="grid h-6 w-6 place-items-center text-fg-3 hover:text-fg" aria-label={`Remove bookmark ${b.label}`}>
                  <X size={11} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-2xs text-fg-3">Saved on this device. Press B anywhere to bookmark the current moment.</p>
        )}
      </div>
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
