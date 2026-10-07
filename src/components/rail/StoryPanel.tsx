'use client';

import { Play } from 'lucide-react';

import { useT } from '@/i18n';
import { battleDayLabel, phaseLabel } from '@/lib/format';
import { useSimulation } from '@/simulation/store';
import { RecordLink } from '@/components/ui/primitives';

/**
 * Campaign Story: the stages of the dataset as a guided reading order. Each
 * stage links to the events that anchor it. The narration is the dataset's own
 * stage definitions; nothing is written here that the record does not hold.
 */
export function StoryPanel() {
  const data = useSimulation((s) => s.data);
  const t = useT();
  const frame = useSimulation((s) => s.frame);
  const seek = useSimulation((s) => s.seek);
  const clock = useSimulation((s) => s.clock);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const focusCampaign = useSimulation((s) => s.focusCampaign);
  if (!data) return null;
  const fpd = data.manifest.clock.framesPerDay;
  const firstDay = data.manifest.clock.firstDay;

  return (
    <div className="pb-4">
      <p className="px-3 pb-1 pt-2.5 text-xs leading-relaxed text-fg-3">
        {t('The campaign in stages. Pick one to move there; play to watch it unfold on the map.')}
      </p>
      <ol className="mt-1">
        {data.stages.map((s, i) => {
          const active = frame >= s.startFrame && frame <= s.endFrame;
          const d0 = Math.floor(s.startFrame / fpd) + firstDay;
          const d1 = Math.floor(s.endFrame / fpd) + firstDay;
          return (
            <li key={s.id} className={`border-l-2 px-3 py-2.5 ${active ? 'border-l-accent bg-accent/5' : 'border-l-ink-500'}`}>
              <div className="flex items-start gap-2">
                <span className="figure pt-0.5 text-2xs text-fg-3">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-fg">{phaseLabel(s.name)}</p>
                  <p className="figure text-2xs text-fg-3">
                    {battleDayLabel(d0)}
                    {d1 !== d0 ? ` → ${battleDayLabel(d1)}` : ''}
                  </p>
                  {s.definition ? <p className="mt-1 text-xs leading-relaxed text-fg-2">{s.definition}</p> : null}
                  {s.anchorEvents.length ? (
                    <ul className="mt-1.5 space-y-0.5">
                      {s.anchorEvents.map((id) => {
                        const e = data.eventById.get(id);
                        return e ? (
                          <li key={id} className="text-xs">
                            <RecordLink onClick={() => jumpToEvent(id)}>{e.title}</RecordLink>
                          </li>
                        ) : null;
                      })}
                    </ul>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="ctl h-7 w-7 shrink-0 px-0"
                  aria-label={t('Play {stage}', { stage: phaseLabel(s.name) })}
                  title={t('Play from the start of this stage')}
                  onClick={() => {
                    seek(s.startFrame);
                    focusCampaign();
                    clock?.play();
                  }}
                >
                  <Play size={12} strokeWidth={2} />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      {data.turningPoints.length ? (
        <div className="mt-2 border-t border-ink-500 px-3 pt-2.5">
          <p className="eyebrow">{t('Turning points')}</p>
          <ol className="mt-1.5 space-y-1.5">
            {data.turningPoints.map((e) => (
              <li key={e.id} className="flex gap-2 text-xs">
                <span className="figure w-5 shrink-0 text-accent">{e.turningPointRank}</span>
                <span className="min-w-0">
                  <RecordLink onClick={() => jumpToEvent(e.id)}>{e.title}</RecordLink>
                  {e.turningPointSummary ? <span className="mt-0.5 block text-fg-3">{e.turningPointSummary}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
