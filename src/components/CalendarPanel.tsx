'use client';

import { useMemo } from 'react';

import { columnAt } from '@/data/loader';
import { battleDayLabel, campaignDayLabel, frameClock, phaseLabel } from '@/lib/format';
import { useSimulation } from '@/simulation/store';
import { Field, Fields, Panel, SourceBadge } from '@/components/primitives';

interface DayCell {
  day: number;
  startFrame: number;
  date: string;
  battleDay: number;
  phase: string;
  eventCount: number;
  turningPoints: number;
}

/**
 * Campaign calendar.
 *
 * Fifty campaign days, one cell each, marked by phase and by whether anything
 * happened. Clicking a day seeks to its first frame; clicking an event within
 * the day seeks to the event and moves the camera to its theatre.
 */
export function CalendarPanel() {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const state = useSimulation((s) => s.state);
  const seek = useSimulation((s) => s.seek);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);

  const days = useMemo<DayCell[]>(() => {
    if (!data) return [];
    const framesPerDay = data.manifest.clock.framesPerDay;
    const dayCount = Math.ceil(data.manifest.clock.frameCount / framesPerDay);
    const cells: DayCell[] = [];
    for (let d = 0; d < dayCount; d += 1) {
      const startFrame = d * framesPerDay;
      const events = data.events.filter(
        (e) => e.frame >= startFrame && e.frame < startFrame + framesPerDay,
      );
      cells.push({
        day: d,
        startFrame,
        date: columnAt(data.timeline.date, startFrame),
        battleDay: data.timeline.battleDay[startFrame],
        phase: columnAt(data.timeline.phase, startFrame),
        eventCount: events.length,
        turningPoints: events.filter((e) => e.turningPoint).length,
      });
    }
    return cells;
  }, [data]);

  const dayEvents = useMemo(() => {
    if (!data) return [];
    const framesPerDay = data.manifest.clock.framesPerDay;
    const dayStart = Math.floor(frame / framesPerDay) * framesPerDay;
    return data.events.filter((e) => e.frame >= dayStart && e.frame < dayStart + framesPerDay);
  }, [data, frame]);

  if (!data || !state) return null;

  const framesPerDay = data.manifest.clock.framesPerDay;
  const currentDay = Math.floor(frame / framesPerDay);

  return (
    <Panel title="Campaign calendar" subtitle={`${days.length} days`}>
      <Fields>
        <Field label="Date">
          <span className="font-figure">{columnAt(data.timeline.date, frame)}</span>{' '}
          <span className="text-chart-faint">{frameClock(frame)}</span>
        </Field>
        <Field label="Campaign day">
          {campaignDayLabel(data.timeline.campaignDay[frame])}{' '}
          <span className="text-chart-faint">/ battle day {battleDayLabel(data.timeline.battleDay[frame])}</span>
        </Field>
        <Field label="Phase">{phaseLabel(state.phase)}</Field>
        <Field label="Stage">{phaseLabel(state.stage)}</Field>
        <Field label="Theatres live">{state.activeTheatres || 'None active'}</Field>
      </Fields>

      <div className="mt-3 grid grid-cols-10 gap-[3px]" role="grid" aria-label="Campaign days">
        {days.map((cell) => {
          const isCurrent = cell.day === currentDay;
          const intensity = cell.turningPoints > 0 ? 'turning' : cell.eventCount > 0 ? 'event' : 'quiet';
          return (
            <button
              key={cell.day}
              type="button"
              onClick={() => seek(cell.startFrame)}
              title={`${cell.date} · ${campaignDayLabel(cell.day)} · ${battleDayLabel(cell.battleDay)} · ${
                cell.eventCount
              } event(s)`}
              aria-label={`Day ${cell.day}, ${cell.date}, ${cell.eventCount} events`}
              className={`h-6 border text-micro font-figure leading-none transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass ${
                isCurrent
                  ? 'border-brass bg-brass/25 text-chart-paper'
                  : intensity === 'turning'
                    ? 'border-empire-pale/60 bg-empire/25 text-chart-paper hover:bg-empire/40'
                    : intensity === 'event'
                      ? 'border-chart-rule/50 bg-ink-700 text-chart-paper/80 hover:bg-ink-600'
                      : 'border-chart-rule/20 bg-ink-800/60 text-chart-faint hover:bg-ink-700'
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <p className="mt-2 font-ui text-micro leading-relaxed text-chart-faint">
        Cells marked in red carry a campaign turning point. The year 9001 is a simulation calendar
        marker introduced by the reconstruction, not a date the source establishes.
      </p>

      {dayEvents.length > 0 ? (
        <div className="mt-3 border-t border-chart-rule/25 pt-2">
          <p className="mb-1 font-ui text-micro text-chart-faint">
            {dayEvents.length} event{dayEvents.length === 1 ? '' : 's'} on this day
          </p>
          <ul className="space-y-px">
            {dayEvents.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => jumpToEvent(event.id)}
                  className="flex w-full items-baseline gap-2 px-1 py-1 text-left hover:bg-ink-700/60 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass"
                >
                  <span className="shrink-0 font-figure text-micro text-brass">{event.simulationTime}</span>
                  <span className="flex-1 truncate font-ui text-tiny text-chart-paper/90">{event.action}</span>
                  {event.turningPoint ? <SourceBadge grade="CANONICAL" note="Turning point." /> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}
