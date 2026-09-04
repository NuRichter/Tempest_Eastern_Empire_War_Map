'use client';

import { useMemo, useState } from 'react';

import { phaseLabel, truncate } from '@/lib/format';
import { useSimulation } from '@/simulation/store';
import { Empty, Panel, RowButton, SourceBadge } from '@/components/primitives';
import { sourceGrade } from '@/lib/format';

type Filter = 'recent' | 'all' | 'critical';

/**
 * Event stream.
 *
 * Events are changes, not state. This panel lists the changes recorded up to
 * the current frame, most recent first, and never shows an event the simulation
 * has not yet reached.
 */
export function EventPanel() {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const selection = useSimulation((s) => s.selection);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const [filter, setFilter] = useState<Filter>('recent');

  const events = useMemo(() => {
    if (!data) return [];
    const past = data.events.filter((e) => e.frame <= frame);
    const ordered = [...past].reverse();
    if (filter === 'critical') return ordered.filter((e) => e.significance === 'CRITICAL');
    if (filter === 'recent') return ordered.slice(0, 14);
    return ordered;
  }, [data, frame, filter]);

  if (!data) return null;

  const tab = (id: Filter, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setFilter(id)}
      className={`px-1.5 py-px font-ui text-micro transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass ${
        filter === id ? 'border-b border-brass text-chart-paper' : 'text-chart-faint hover:text-chart-paper'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Panel
      title="Event record"
      subtitle={`${events.length} shown`}
      action={<div className="flex gap-1">{[tab('recent', 'recent'), tab('critical', 'critical'), tab('all', 'all')]}</div>}
      dense
    >
      {events.length === 0 ? (
        <Empty>No event has been recorded at or before this frame.</Empty>
      ) : (
        <ul className="-mx-1 max-h-72 space-y-px overflow-y-auto pr-1">
          {events.map((event) => {
            const active = selection.kind === 'event' && selection.id === event.id;
            return (
              <li key={event.id}>
                <RowButton onClick={() => jumpToEvent(event.id)} active={active} title={event.action}>
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 font-figure text-micro text-brass">{event.warDay}</span>
                    <span className="shrink-0 font-figure text-micro text-chart-faint">{event.simulationTime}</span>
                    <span className="flex-1 truncate font-ui text-tiny text-chart-paper">{event.action}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="truncate font-ui text-micro text-chart-faint">
                      {event.theatre} · {phaseLabel(event.type)}
                    </span>
                    {event.significance === 'CRITICAL' ? (
                      <span className="shrink-0 border border-empire-pale/50 px-1 font-figure text-micro text-empire-pale">
                        critical
                      </span>
                    ) : null}
                    <SourceBadge grade={sourceGrade(event.timeBasis)} note={`Time basis: ${event.timeBasis}.`} />
                  </div>
                  {active ? (
                    <p className="mt-1 font-ui text-micro leading-relaxed text-chart-paper/75">
                      {truncate(event.immediateResult, 220)}
                    </p>
                  ) : null}
                </RowButton>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
