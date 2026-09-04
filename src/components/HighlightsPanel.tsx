'use client';

import { useSimulation } from '@/simulation/store';
import { Panel, RowButton } from '@/components/primitives';
import { battleDayLabel } from '@/lib/format';

/**
 * Turning points.
 *
 * The fifteen moments the Step 1 reconstruction names as decisive, in order.
 * The list is not editorial: it is read from the dataset's own turning-point
 * section, and nothing is added to it here.
 */
export function HighlightsPanel() {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const selection = useSimulation((s) => s.selection);

  if (!data) return null;

  return (
    <Panel title="Turning points" subtitle={`${data.turningPoints.length}`} defaultOpen dense>
      <ol className="-mx-1 space-y-px">
        {data.turningPoints.map((event) => {
          const reached = frame >= event.frame;
          const active = selection.kind === 'event' && selection.id === event.id;
          return (
            <li key={event.id}>
              <RowButton onClick={() => jumpToEvent(event.id)} active={active}>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`w-4 shrink-0 text-right font-figure text-micro ${
                      reached ? 'text-brass' : 'text-chart-faint/60'
                    }`}
                  >
                    {event.turningPointRank}
                  </span>
                  <span
                    className={`flex-1 font-ui text-tiny leading-snug ${
                      reached ? 'text-chart-paper' : 'text-chart-faint/70'
                    }`}
                  >
                    {event.turningPointSummary}
                  </span>
                </div>
                <div className="ml-6 mt-0.5 font-figure text-micro text-chart-faint">
                  {battleDayLabel(data.timeline.battleDay[event.frame])} · {event.theatre}
                </div>
              </RowButton>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
