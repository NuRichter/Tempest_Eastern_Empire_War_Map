'use client';

import { useMemo } from 'react';

import { battleDayLabel, phaseLabel } from '@/lib/format';
import { controlKey, FACTION_COLOR, INK } from '@/lib/palette';
import { ROLE_LABEL } from '@/lib/taxonomy';
import { currentEvent, forcePositionAt, forceSnapshotAt, nextEvent, territoryControlAt } from '@/simulation/resolver';
import { useSimulation } from '@/simulation/store';
import { Empty, Field, Fields, Figure, ProvenanceBadge, RecordLink, Section } from '@/components/ui/primitives';
import type { Quantity } from '@/types/dataset';

/**
 * Campaign intelligence summary at the current moment. Every number comes from
 * the dataset at this frame; unknowns are shown as unknown.
 */
export function SituationPanel() {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const state = useSimulation((s) => s.state);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const jumpToTheatre = useSimulation((s) => s.jumpToTheatre);
  const jumpToForce = useSimulation((s) => s.jumpToForce);
  const jumpToTerritory = useSimulation((s) => s.jumpToTerritory);

  const onMap = useMemo(() => {
    if (!data) return [];
    const live = data.forces
      .map((f) => ({ f, s: forceSnapshotAt(data, f.id, frame), p: forcePositionAt(data, f.id, frame) }))
      .filter((x) => x.s && x.p && !/DESTROYED|ANNIHILATED/i.test(x.s.status));
    // Only the most specific formations: a parent listed beside its own
    // subordinates would present the same soldiers twice.
    const ids = new Set(live.map((x) => x.f.id));
    return live.filter((x) => !x.f.childIds.some((c) => ids.has(c)));
  }, [data, frame]);

  if (!data || !state) return null;
  const latest = currentEvent(data, frame);
  const upcoming = nextEvent(data, frame);
  const day = data.timeline.battleDay[frame];
  const liveTheatres = data.theatres.filter((t) => state.theatres[t.id]?.status && state.theatres[t.id].status !== 'INACTIVE');
  const belligerents = data.territories
    .map((t) => ({ t, c: territoryControlAt(t, frame).segment }))
    .filter((x) => x.c.role !== 'UNINVOLVED');
  const cas = state.casualties;
  const side = (q: Quantity) => <Figure value={q} />;

  return (
    <div>
      <Section title="Now">
        <p className="figure text-2xl leading-none text-fg">
          {battleDayLabel(day)} <span className="text-base text-fg-2">{String(Math.floor(((frame % 144) * 10) / 60)).padStart(2, '0')}:{String(((frame % 144) * 10) % 60).padStart(2, '0')}</span>
        </p>
        <p className="mt-1 text-sm text-fg-2">{phaseLabel(state.phase)} · {phaseLabel(state.stage)}</p>
        <p className="mt-1 text-2xs leading-relaxed text-fg-3">Day and hour are simulation placements on a 10-minute grid; the novels give no clock times.</p>
        <div className="mt-3 space-y-2">
          {latest ? (
            <div>
              <p className="eyebrow">Latest event</p>
              <p className="mt-0.5 text-sm">
                <RecordLink onClick={() => jumpToEvent(latest.id, { seek: false })}>{latest.title}</RecordLink>
              </p>
              <div className="mt-1 flex items-center gap-2 text-2xs text-fg-3">
                <span className="figure">{latest.warDay} {latest.simulationTime}</span>
                <ProvenanceBadge value={latest.provenance} compact />
              </div>
            </div>
          ) : null}
          {upcoming ? (
            <div>
              <p className="eyebrow">Next event</p>
              <p className="mt-0.5 text-sm text-fg-2">
                <RecordLink onClick={() => jumpToEvent(upcoming.id)}>{upcoming.title}</RecordLink>
              </p>
              <p className="figure mt-0.5 text-2xs text-fg-3">{upcoming.warDay} {upcoming.simulationTime}</p>
            </div>
          ) : null}
        </div>
      </Section>

      <Section title={`Active theatres · ${liveTheatres.length}`}>
        {liveTheatres.length === 0 ? (
          <Empty>No theatre is active at this moment.</Empty>
        ) : (
          <ul className="space-y-1.5">
            {liveTheatres.map((t) => {
              const th = state.theatres[t.id];
              const key = controlKey(th.control);
              const color = key === 'contested' ? INK.accent : key ? FACTION_COLOR[key] : INK.text3;
              return (
                <li key={t.id}>
                  <button type="button" onClick={() => jumpToTheatre(t.id)} className="w-full rounded-[3px] px-1.5 py-1 text-left hover:bg-ink-700/60">
                    <span className="flex items-center gap-2">
                      <span className="figure w-8 text-2xs text-fg-3">{t.code}</span>
                      <span className="flex-1 truncate text-sm text-fg">{t.name}</span>
                      <span className="text-2xs uppercase tracking-label" style={{ color }}>
                        {(th.control ?? th.status).replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </span>
                    {th.frontline ? <span className="mt-0.5 block pl-10 text-2xs leading-snug text-fg-3">{th.frontline}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Strength">
        <Fields>
          <Field label="Empire, total">{side(state.strength.empire.total)}</Field>
          <Field label="Empire, effective">{side(state.strength.empire.effective)}</Field>
          <Field label="Tempest, total">{side(state.strength.tempest.total)}</Field>
          <Field label="Tempest, effective">{side(state.strength.tempest.effective)}</Field>
          <Field label="Formations placed">
            <span className="figure">{onMap.length}</span> <span className="text-fg-3">on the map now</span>
          </Field>
        </Fields>
        {onMap.length ? (
          <ul className="mt-2 max-h-40 space-y-px overflow-y-auto">
            {onMap
              .sort((a, b) => (typeof b.s!.strength === 'number' ? b.s!.strength : -1) - (typeof a.s!.strength === 'number' ? a.s!.strength : -1))
              .slice(0, 12)
              .map(({ f, s }) => (
                <li key={f.id}>
                  <button type="button" onClick={() => jumpToForce(f.id)} className="flex w-full items-center gap-2 rounded-[3px] px-1.5 py-0.5 text-left text-xs hover:bg-ink-700/60">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: FACTION_COLOR[f.faction.includes('Empire') ? 'empire' : f.faction.includes('Dwargon') ? 'dwargon' : f.faction.includes('Tempest') ? 'tempest' : 'neutral'] }} aria-hidden />
                    <span className="flex-1 truncate text-fg">{f.displayName}</span>
                    <Figure value={s!.strength} status={s!.sizeStatus} />
                  </button>
                </li>
              ))}
          </ul>
        ) : null}
      </Section>

      <Section title="Casualties to date">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-fg-3">
              <th className="py-1 font-normal" scope="col" />
              <th className="py-1 text-right font-normal" scope="col">Empire</th>
              <th className="py-1 text-right font-normal" scope="col">Tempest</th>
            </tr>
          </thead>
          <tbody className="[&_td]:border-t [&_td]:border-ink-500/50 [&_td]:py-1">
            {([['Killed', 'kia'], ['Revived', 'revived'], ['Captured', 'pow'], ['Wounded', 'wia'], ['Missing', 'mia']] as const).map(([label, k]) => (
              <tr key={k}>
                <th scope="row" className="py-1 text-left font-normal text-fg-3">{label}</th>
                <td className="text-right">{side(cas.empire[k])}</td>
                <td className="text-right">{side(cas.tempest[k])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1.5 text-2xs leading-relaxed text-fg-3">
          Summed from event-level records only, so nothing is counted twice. Revived soldiers stay counted as killed; the two figures sit side by side.
        </p>
      </Section>

      <Section title="Territory">
        <ul className="space-y-0.5">
          {belligerents.map(({ t, c }) => (
            <li key={t.id}>
              <button type="button" onClick={() => jumpToTerritory(t.id)} className="flex w-full items-center gap-2 rounded-[3px] px-1.5 py-0.5 text-left text-xs hover:bg-ink-700/60">
                <span className="flex-1 truncate text-fg">{t.display}</span>
                <span className="text-fg-3">{ROLE_LABEL[c.role]}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-2xs leading-relaxed text-fg-3">No national border changed hands in this war. Imperial operations inside Jura and Dwargon are shown as operational areas.</p>
      </Section>

      <Section title="Command" defaultOpen={false}>
        <Prose>{state.activeCommanders || 'Not recorded at this moment.'}</Prose>
      </Section>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-fg-2">{children}</p>;
}
