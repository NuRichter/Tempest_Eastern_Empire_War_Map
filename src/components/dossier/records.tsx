'use client';

import { useMemo } from 'react';

import { battleDayLabel, phaseLabel } from '@/lib/format';
import { FACTION_COLOR, factionKey } from '@/lib/palette';
import { BATTLE_TYPE_LABEL, PROVENANCE_LABEL, ROLE_LABEL, ROUTE_LABEL, SIZE_STATUS_LABEL, TIME_PRECISION_LABEL } from '@/lib/taxonomy';
import { forcePositionAt, forceSnapshotAt, strengthHistory, territoryControlAt } from '@/simulation/resolver';
import { useSimulation } from '@/simulation/store';
import { usePreferences } from '@/state/preferences';
import { Masthead } from '@/components/dossier/Dossier';
import {
  ConfidenceText,
  Empty,
  FactionDot,
  Field,
  Fields,
  Figure,
  Flag,
  Portrait,
  Prose,
  ProvenanceBadge,
  RecordLink,
  RouteBadge,
  Section,
  SizeBadge,
  Sources,
} from '@/components/ui/primitives';
import type { Dataset } from '@/data/loader';
import type { WarEvent } from '@/types/dataset';

const when = (data: Dataset, frame: number | null) => {
  if (frame === null) return 'not placed';
  const day = Math.floor(frame / data.manifest.clock.framesPerDay) + data.manifest.clock.firstDay;
  const m = (frame % data.manifest.clock.framesPerDay) * data.manifest.clock.minutesPerFrame;
  return `${battleDayLabel(day)} ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

function EventList({ ids, max = 12 }: { ids: string[]; max?: number }) {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  if (!data) return null;
  const events = ids.map((id) => data.eventById.get(id)).filter((e): e is WarEvent => Boolean(e));
  if (!events.length) return <Empty>No events on the record.</Empty>;
  return (
    <ol className="space-y-px">
      {events.slice(0, max).map((e) => (
        <li key={e.id}>
          <button type="button" onClick={() => jumpToEvent(e.id)} className={`flex w-full gap-2 rounded-[3px] px-1.5 py-1 text-left hover:bg-ink-700/60 ${e.frame > frame ? 'opacity-60' : ''}`}>
            <span className="figure w-[4.5rem] shrink-0 text-2xs text-fg-3">{e.warDay} {e.simulationTime}</span>
            <span className="text-xs leading-snug text-fg">{e.title}</span>
          </button>
        </li>
      ))}
      {events.length > max ? <li className="px-1.5 text-2xs text-fg-3">and {events.length - max} more</li> : null}
    </ol>
  );
}

/* ------------------------------------------------------------------ */

export function ForceDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const jumpToForce = useSimulation((s) => s.jumpToForce);
  const jumpToCharacter = useSimulation((s) => s.jumpToCharacter);
  const jumpToMovement = useSimulation((s) => s.jumpToMovement);
  const seek = useSimulation((s) => s.seek);
  const history = useMemo(() => (data ? strengthHistory(data, id) : []), [data, id]);
  const force = data?.forceById.get(id);
  if (!data || !force) return <Empty>That formation is not in the register.</Empty>;

  const snap = forceSnapshotAt(data, id, frame);
  const pos = forcePositionAt(data, id, frame);
  const place = snap?.placeId ? data.placeById.get(snap.placeId) ?? data.nationById.get(snap.placeId) : null;
  const parent = force.parentId ? data.forceById.get(force.parentId) : null;
  const movements = data.movementsByForce.get(id) ?? [];
  const track = data.trackByForce.get(id)?.snapshots ?? [];
  const commanders = force.commanderIds.map((c) => data.characterById.get(c)).filter(Boolean);
  const nationId = data.factionById.get(force.faction)?.nationId ?? null;
  const ancestors: string[] = [];
  for (let p = parent; p; p = p.parentId ? data.forceById.get(p.parentId) : undefined) ancestors.unshift(p.id);
  const numbers = history.filter((h) => typeof h.strength === 'number') as { f: number; strength: number; eventId: string | null }[];
  const maxStrength = Math.max(1, ...numbers.map((h) => h.strength));

  return (
    <div>
      <Masthead kind={`Force · ${force.faction}`} title={force.displayName} sub={force.displayName !== force.formation ? `Dataset name: ${force.formation}` : force.army} aside={<Flag nationId={nationId} size={18} />}>
        <SizeBadge value={force.sizeStatus} />
        <span className="text-2xs uppercase tracking-label text-fg-3">hierarchy {PROVENANCE_LABEL[force.hierarchyProvenance].short.toLowerCase()}</span>
      </Masthead>

      <Section title="Now">
        <Fields>
          <Field label="Strength">
            <Figure value={snap?.strength ?? 'UNKNOWN'} status={snap?.sizeStatus} /> {snap ? <span className="text-2xs text-fg-3">· {SIZE_STATUS_LABEL[snap.sizeStatus].label.toLowerCase()}</span> : null}
          </Field>
          <Field label="Effective"><Figure value={snap?.effective ?? 'UNKNOWN'} /></Field>
          <Field label="Status">{snap ? snap.status.replace(/_/g, ' ').toLowerCase() : <span className="italic text-fg-3">not yet on the record</span>}</Field>
          <Field label="Movement">
            {snap?.movement ? snap.movement.replace(/_/g, ' ').toLowerCase() : '—'}
            {pos?.moving ? <span className="text-fg-3"> · {Math.round(pos.progress * 100)}% of the leg, route {pos.route.toLowerCase()}</span> : null}
          </Field>
          <Field label="Location">
            {place?.name ?? snap?.locationText ?? 'unknown'}
            {!pos && snap ? <span className="block text-2xs text-fg-3">No defensible position: not drawn on the map.</span> : null}
            {place && 'basis' in place && place.placement !== 'MEASURED' ? <span className="block text-2xs text-fg-3">Position {place.placement.toLowerCase()}: {place.basis}</span> : null}
          </Field>
        </Fields>
      </Section>

      <Section title="Command">
        <Fields>
          <Field label="Commander">
            {commanders.length ? (
              <span className="flex flex-wrap gap-x-2">
                {commanders.map((c) => (
                  <RecordLink key={c!.id} onClick={() => jumpToCharacter(c!.id)}>{c!.name}</RecordLink>
                ))}
              </span>
            ) : (
              force.commander || '—'
            )}
          </Field>
          <Field label="Role">{force.role || '—'}</Field>
          {force.unitType ? <Field label="Type">{force.unitType}</Field> : null}
        </Fields>
        {ancestors.length || force.childIds.length ? (
          <div className="mt-2">
            <p className="eyebrow">Order of battle</p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {ancestors.map((aid, i) => (
                <li key={aid} style={{ paddingLeft: i * 12 }} className="text-fg-3">
                  └ <RecordLink onClick={() => jumpToForce(aid)}>{data.forceById.get(aid)!.displayName}</RecordLink>
                </li>
              ))}
              <li style={{ paddingLeft: ancestors.length * 12 }} className="font-semibold text-accent">└ {force.displayName}</li>
              {force.childIds.map((cid) => (
                <li key={cid} style={{ paddingLeft: (ancestors.length + 1) * 12 }} className="text-fg-3">
                  └ <RecordLink onClick={() => jumpToForce(cid)}>{data.forceById.get(cid)?.displayName ?? cid}</RecordLink>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-2xs text-fg-3">A subordinate&apos;s strength is inside its parent&apos;s; tiers are never added together.</p>
          </div>
        ) : null}
      </Section>

      <Section title="Strength history">
        {numbers.length >= 1 ? (
          <ol className="space-y-1">
            {history.map((h, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <button type="button" className="figure w-[4.5rem] shrink-0 text-left text-2xs text-fg-3 hover:text-accent" onClick={() => seek(h.f)}>
                  {when(data, h.f)}
                </button>
                <span className="relative h-2 flex-1 overflow-hidden rounded-[1px] bg-ink-600" aria-hidden>
                  {typeof h.strength === 'number' ? <span className="absolute inset-y-0 left-0" style={{ width: `${(h.strength / maxStrength) * 100}%`, background: FACTION_COLOR[factionKey(force.faction)] }} /> : null}
                </span>
                <span className="w-20 shrink-0 text-right"><Figure value={h.strength} /></span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty>No numerical strength is ever stated for this formation.</Empty>
        )}
        <p className="mt-1.5 text-2xs leading-relaxed text-fg-3">As the source states it: {force.sizeEvidence || force.initialStrengthRaw}</p>
      </Section>

      <Section title={`Movements · ${movements.length}`} defaultOpen={movements.length > 0}>
        {movements.length ? (
          <ul className="space-y-1.5">
            {movements.map((m) => (
              <li key={m.id} className="text-xs">
                <RecordLink onClick={() => jumpToMovement(m.id)}>
                  {m.from} → {m.destinationUnknown ? 'destination not stated' : m.to}
                </RecordLink>
                <span className="mt-0.5 flex items-center gap-1.5 text-2xs text-fg-3">
                  {m.type.toLowerCase()} · {when(data, m.startFrame)} <RouteBadge value={m.route} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No recorded movements.</Empty>
        )}
      </Section>

      <Section title="History on the record" defaultOpen={false}>
        <EventList ids={[...new Set(track.map((s) => s.eventId).filter((e): e is string => Boolean(e)))]} />
      </Section>

      <Section title="Sources">
        <Sources refs={force.sourceRefs.length ? force.sourceRefs : [{ volume: force.source, chapter: null, locator: null }]} />
        <p className="mt-1.5 text-2xs text-fg-3">
          Confidence <ConfidenceText value={force.confidence} />.
        </p>
        {force.notes ? <p className="mt-1.5 text-xs leading-relaxed text-fg-2">{force.notes}</p> : null}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function EventDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const jumpToBattle = useSimulation((s) => s.jumpToBattle);
  const jumpToForce = useSimulation((s) => s.jumpToForce);
  const jumpToCharacter = useSimulation((s) => s.jumpToCharacter);
  const e = data?.eventById.get(id);
  if (!data || !e) return <Empty>That event is not on the record.</Empty>;
  const cas = data.casualtiesByEvent.get(id) ?? [];
  const people = e.characterIds.map((c) => data.characterById.get(c)).filter(Boolean);

  return (
    <div>
      <Masthead kind={`Event · ${e.theatre}`} title={e.title} sub={<span className="figure">{e.warDay} · {e.simulationTime} · simulation time</span>}>
        <ProvenanceBadge value={e.provenance} />
        {e.turningPoint ? <span className="rounded-[2px] border border-accent/60 px-1.5 py-px text-2xs uppercase tracking-label text-accent">Turning point {e.turningPointRank}</span> : null}
        {e.auditStatus === 'CORRECTED' || e.auditStatus === 'ADDED' ? <span className="rounded-[2px] border border-ink-400 px-1.5 py-px text-2xs uppercase tracking-label text-fg-3">{e.auditStatus === 'ADDED' ? 'added in audit' : 'corrected in audit'}</span> : null}
      </Masthead>

      {people.length ? (
        <div className="flex gap-2 overflow-x-auto px-3 pb-3">
          {people.map((c) => (
            <button key={c!.id} type="button" onClick={() => jumpToCharacter(c!.id)} className="w-16 shrink-0 text-center" aria-label={`Open ${c!.name}`}>
              <Portrait src={c!.photocard?.src ?? null} name={c!.name} source={c!.photocard?.source} size={56} faction={c!.faction} />
              <span className="mt-1 block truncate text-2xs text-fg-2">{c!.name}</span>
            </button>
          ))}
        </div>
      ) : null}

      <Section title="What happened">
        {e.turningPointSummary ? <p className="mb-2 border-l-2 border-accent pl-2 text-sm leading-relaxed text-fg">{e.turningPointSummary}</p> : null}
        <Fields>
          <Field label="Actor"><span className="inline-flex items-center gap-1.5"><FactionDot faction={e.actorFaction} />{e.actor}</span></Field>
          <Field label="Opponent"><span className="inline-flex items-center gap-1.5"><FactionDot faction={e.opponentFaction} />{e.opponent || '—'}</span></Field>
          <Field label="Location">{e.location || '—'}</Field>
          <Field label="Type">{phaseLabel(e.type)}</Field>
          {e.battleId ? <Field label="Battle"><RecordLink onClick={() => jumpToBattle(e.battleId!)}>{e.battle}</RecordLink></Field> : null}
          <Field label="Result">{e.immediateResult || '—'}</Field>
        </Fields>
      </Section>

      <Section title="Forces & numbers">
        <Fields>
          <Field label="Empire strength"><Figure value={e.empireStrength} /></Field>
          <Field label="Tempest strength"><Figure value={e.tempestStrength} /></Field>
          <Field label="Killed (event)"><Figure value={e.kia} /></Field>
          <Field label="Captured (event)"><Figure value={e.pow} /></Field>
        </Fields>
        {e.strengthNote ? <p className="mt-1.5 text-2xs text-fg-3">{e.strengthNote}</p> : null}
        {e.forceIds.length ? (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {e.forceIds.map((fid) => (
              <RecordLink key={fid} onClick={() => jumpToForce(fid)}>{data.forceById.get(fid)?.displayName ?? fid}</RecordLink>
            ))}
          </div>
        ) : null}
        {cas.length ? (
          <ul className="mt-2 space-y-1 text-xs">
            {cas.map((c) => (
              <li key={c.id} className="text-fg-2">
                <span className="figure text-fg-3">{c.id}</span> {c.cause} · killed <Figure value={c.kia} />
                {c.revived !== 'UNKNOWN' ? <> · revived <Figure value={c.revived} /></> : null}
                {!c.countsTowardCampaignTotal ? <span className="text-fg-3"> (restates other rows; not summed)</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title="Consequences" defaultOpen={false}>
        <Fields>
          <Field label="Operational">{e.operationalResult || '—'}</Field>
          <Field label="Strategic">{e.strategicResult || '—'}</Field>
        </Fields>
      </Section>

      <Section title="Time">
        {(() => {
          const gap = data.gaps.find((g) => g.toEvent === e.id);
          return gap ? (
            <div className="mb-2 border-l-2 border-accent/70 pl-2 text-xs">
              <p className="eyebrow">Before this event · timeline gap</p>
              <p className="mt-0.5 text-fg">
                {gap.hours >= 48 ? `${Math.round(gap.hours / 24)} days` : `${gap.hours} hours`} since the previous event · confidence <ConfidenceText value={gap.confidence} />
              </p>
              <p className="mt-0.5 leading-relaxed text-fg-2">{gap.reconstructionBasis}</p>
            </div>
          ) : null;
        })()}
        <Fields>
          <Field label="Simulation">{e.warDay} {e.simulationTime}</Field>
          <Field label="Precision">{TIME_PRECISION_LABEL[e.timePrecision]}</Field>
          <Field label="In the novel">{e.canonicalTime || <span className="italic text-fg-3">no time wording</span>}</Field>
        </Fields>
      </Section>

      <Section title="Sources & reconstruction">
        <Sources refs={e.sourceRefs} />
        {e.evidence ? <p className="mt-2 text-xs leading-relaxed text-fg-2">{e.evidence}</p> : null}
        {e.reconstructionNote ? <p className="mt-2 border-l-2 border-prov-recon pl-2 text-xs leading-relaxed text-fg-2">{e.reconstructionNote}</p> : null}
        <p className="mt-2 text-2xs text-fg-3">
          {PROVENANCE_LABEL[e.provenance].note} Confidence: overall <ConfidenceText value={e.confidence} />, time <ConfidenceText value={e.timeConfidence} />, numbers <ConfidenceText value={e.numericalConfidence} />.
        </p>
        {e.auditChanges.length ? (
          <details className="mt-2 text-xs text-fg-2">
            <summary className="cursor-pointer text-fg-3">Audit changes ({e.auditChanges.length})</summary>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {e.auditChanges.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </Section>

      <div className="px-3 pt-1">
        <button type="button" className="ctl w-full" onClick={() => usePreferences.getState().addBookmark({ frame: e.frame, eventId: e.id, label: e.title })}>
          Bookmark this event
        </button>
      </div>
      <div className="flex gap-2 px-3 pb-4 pt-2">
        <button type="button" className="ctl flex-1" disabled={!e.prevId} onClick={() => e.prevId && jumpToEvent(e.prevId)}>
          ← Previous event
        </button>
        <button type="button" className="ctl flex-1" disabled={!e.nextId} onClick={() => e.nextId && jumpToEvent(e.nextId)}>
          Next event →
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function BattleDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const jumpToForce = useSimulation((s) => s.jumpToForce);
  const jumpToCharacter = useSimulation((s) => s.jumpToCharacter);
  const jumpToTheatre = useSimulation((s) => s.jumpToTheatre);
  const b = data?.battleById.get(id);
  if (!data || !b) return <Empty>That battle is not on the record.</Empty>;
  const theatre = data.theatreById.get(b.theatreId);
  const place = b.placeId ? data.placeById.get(b.placeId) : null;
  const people = b.characterIds.map((c) => data.characterById.get(c)).filter(Boolean);

  return (
    <div>
      <Masthead kind={`${BATTLE_TYPE_LABEL[b.type]} · ${theatre?.name ?? b.theatreId}`} title={b.name} sub={<span className="figure">{when(data, b.startFrame)} → {when(data, b.endFrame)}</span>}>
        <ProvenanceBadge value={b.provenance} />
      </Masthead>
      <Section title="Summary">
        <Fields>
          <Field label="Theatre">{theatre ? <RecordLink onClick={() => jumpToTheatre(theatre.id)}>{theatre.name}</RecordLink> : '—'}</Field>
          <Field label="Place">{place?.name ?? '—'}{place && place.placement !== 'MEASURED' ? <span className="block text-2xs text-fg-3">position {place.placement.toLowerCase()}</span> : null}</Field>
          <Field label="Imperial force"><Figure value={b.empireCommitted} /></Field>
          <Field label="Imperial killed"><Figure value={b.empireLost} /></Field>
          <Field label="Tempest killed"><Figure value={b.tempestLost} /></Field>
          <Field label="Result">{b.result || '—'}</Field>
        </Fields>
        <p className="mt-1.5 text-2xs leading-relaxed text-fg-3">The span is derived from the events assigned to the battle; the source gives no start or end time.</p>
      </Section>
      <Section title="Participants">
        {b.participants.length ? (
          b.participants.map((p) => (
            <div key={p.faction} className="mb-2">
              <p className="flex items-center gap-1.5 text-xs text-fg-2"><FactionDot faction={p.faction} />{p.faction}</p>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 pl-3.5 text-xs">
                {p.forces.map((fid) => (
                  <RecordLink key={fid} onClick={() => jumpToForce(fid)}>{data.forceById.get(fid)?.displayName ?? fid}</RecordLink>
                ))}
              </div>
            </div>
          ))
        ) : (
          <Empty>No formation is tied to this battle&apos;s events.</Empty>
        )}
        {people.length ? (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {people.map((c) => (
              <RecordLink key={c!.id} onClick={() => jumpToCharacter(c!.id)}>{c!.name}</RecordLink>
            ))}
          </div>
        ) : null}
      </Section>
      <Section title={`Sequence · ${b.eventIds.length} events`}>
        <EventList ids={b.eventIds} max={40} />
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function CharacterDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const jumpToForce = useSimulation((s) => s.jumpToForce);
  const jumpToBattle = useSimulation((s) => s.jumpToBattle);
  const jumpToTheatre = useSimulation((s) => s.jumpToTheatre);
  const setCommanderFocus = useSimulation((s) => s.setCommanderFocus);
  const commanderFocus = useSimulation((s) => s.commanderFocus);
  const c = data?.characterById.get(id);
  if (!data || !c) return <Empty>That character is not in the record.</Empty>;
  const commands = c.commanderIds.map((x) => data.commanderById.get(x)).filter(Boolean);
  const combat = c.combatantIds.map((x) => data.combatants.find((m) => m.id === x)).filter(Boolean);
  const nationId = data.factionById.get(c.faction)?.nationId ?? null;
  const commanding = commands.find((m) => m!.startFrame !== null && frame >= m!.startFrame! && (m!.endFrame === null || frame <= m!.endFrame));

  return (
    <div>
      <Masthead kind={`Character · ${c.faction}`} title={c.name} sub={c.japanese ? <span>{c.japanese}</span> : null} aside={<Portrait src={c.photocard?.src ?? null} name={c.name} source={c.photocard?.source} size={76} faction={c.faction} />}>
        <Flag nationId={nationId} size={13} />
        {commanding ? <span className="rounded-[2px] border border-accent/60 px-1.5 py-px text-2xs uppercase tracking-label text-accent">in command now</span> : null}
      </Masthead>
      <Section title="Role">
        <Prose>{c.role || 'No role summary recorded.'}</Prose>
        {c.aliases.length ? <p className="mt-1.5 text-2xs leading-relaxed text-fg-3">Also: {c.aliases.slice(0, 8).join(' · ')}</p> : null}
      </Section>
      {commands.length || c.forceIds.length ? (
        <Section title="Command">
          {commands.map((m) => (
            <div key={m!.id} className="mb-2 text-xs">
              <p className="text-fg">{m!.role}</p>
              <p className="text-fg-3">{m!.scope} · {m!.status.toLowerCase()}</p>
              {m!.forceIds.length ? (
                <button type="button" onClick={() => setCommanderFocus(commanderFocus === m!.id ? null : m!.id)} className="ctl mt-1.5 h-7" aria-pressed={commanderFocus === m!.id}>
                  {commanderFocus === m!.id ? 'Showing only this command' : 'Isolate this command on the map'}
                </button>
              ) : null}
            </div>
          ))}
          {c.forceIds.length ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {c.forceIds.map((fid) => (
                <RecordLink key={fid} onClick={() => jumpToForce(fid)}>{data.forceById.get(fid)?.displayName ?? fid}</RecordLink>
              ))}
            </div>
          ) : null}
        </Section>
      ) : null}
      {combat.length ? (
        <Section title="In combat">
          {combat.map((m) => (
            <p key={m!.id} className="mb-1 text-xs leading-relaxed text-fg-2">
              {m!.effect} <span className="text-fg-3">· final status {m!.finalStatus.toLowerCase()}</span>
            </p>
          ))}
        </Section>
      ) : null}
      <Section title="Theatres & battles">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {c.theatreIds.map((t) => (
            <RecordLink key={t} onClick={() => jumpToTheatre(t)}>{data.theatreById.get(t)?.name ?? t}</RecordLink>
          ))}
        </div>
        {c.battleIds.length ? (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {c.battleIds.map((b) => (
              <RecordLink key={b} onClick={() => jumpToBattle(b)}>{data.battleById.get(b)?.name ?? b}</RecordLink>
            ))}
          </div>
        ) : null}
      </Section>
      <Section title={`Timeline appearances · ${c.eventIds.length}`}>
        <EventList ids={c.eventIds} max={30} />
      </Section>
      <Section title="Photocard" defaultOpen={false}>
        {c.photocard ? (
          <p className="text-xs leading-relaxed text-fg-2">
            Local photocard from the project&apos;s character repository. Source: {c.photocard.source}
            {c.photocard.sourceUrl ? <> (<a className="underline decoration-ink-400 hover:text-accent" href={c.photocard.sourceUrl} target="_blank" rel="noreferrer">{new URL(c.photocard.sourceUrl).hostname}</a>)</> : null}. Licence: {c.photocard.licence ?? 'not recorded'}.
          </p>
        ) : (
          <Empty>No photocard exists for this character in the repository.</Empty>
        )}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function TerritoryDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const t = data?.territoryById.get(id);
  if (!data || !t) return <Empty>That territory is not in the atlas.</Empty>;
  const now = territoryControlAt(t, frame).segment;
  const changes = data.territoryChanges.filter((c) => (t.nationId === 'jura-tempest-federation' && ['TH-DWG', 'TH-LAB', 'TH-DRG'].includes(c.theatreId)) || (t.nationId === 'dwargon' && c.theatreId === 'TH-DWE') || (t.nationId === 'nasca-namrium-ulmeria' && ['TH-CAP', 'TH-DIP'].includes(c.theatreId)));

  return (
    <div>
      <Masthead kind="Territory" title={t.name} sub={t.display !== t.name ? t.display : undefined} aside={<Flag nationId={t.nationId} size={18} />}>
        <span className="rounded-[2px] border border-ink-400 px-1.5 py-px text-2xs uppercase tracking-label text-fg-2">border measured</span>
        {t.identification !== 'LABELLED' ? <span className="rounded-[2px] border border-ink-400 px-1.5 py-px text-2xs uppercase tracking-label text-fg-3">identity {t.identification.toLowerCase()}</span> : null}
      </Masthead>
      <Section title="Now">
        <Fields>
          <Field label="Controller">{now.status === 'UNKNOWN' ? <span className="italic text-fg-3">unknown</span> : now.controller ?? '—'}</Field>
          <Field label="Status">{now.status.toLowerCase()}</Field>
          <Field label="Role in the war">{ROLE_LABEL[now.role]}</Field>
          <Field label="Basis">{now.basis}</Field>
        </Fields>
        <p className="mt-1.5"><ProvenanceBadge value={now.provenance} compact /></p>
      </Section>
      <Section title="History">
        <ol className="space-y-1.5">
          {t.control.map((s, i) => (
            <li key={i} className={`border-l-2 pl-2 text-xs ${s === now ? 'border-l-accent' : 'border-l-ink-500'}`}>
              <p className="figure text-2xs text-fg-3">{s.fromEvent ? <RecordLink onClick={() => jumpToEvent(s.fromEvent!)}>{when(data, s.fromFrame)}</RecordLink> : 'from the start'}</p>
              <p className="text-fg">{ROLE_LABEL[s.role]} · {s.controller ?? 'controller unknown'}</p>
              <p className="text-fg-3">{s.basis}</p>
            </li>
          ))}
        </ol>
      </Section>
      {changes.length ? (
        <Section title="Local control changes" defaultOpen={false}>
          <ul className="space-y-1.5 text-xs">
            {changes.map((c) => (
              <li key={c.id}>
                <p className="text-fg">{c.name}</p>
                <p className="text-fg-3">
                  {c.before.toLowerCase().replace(/_/g, ' ')} → {c.after.toLowerCase().replace(/_/g, ' ')}
                  {c.changeEventId ? <> · <RecordLink onClick={() => jumpToEvent(c.changeEventId!)}>{when(data, c.changeFrame)}</RecordLink></> : null}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      <Section title="Geometry" defaultOpen={false}>
        <Prose>{t.notes}</Prose>
        <p className="mt-1.5 text-2xs leading-relaxed text-fg-3">Traced from {t.boundarySource}. A fan-made map, not an official survey; positions are simulation coordinates, not latitude and longitude.</p>
      </Section>
    </div>
  );
}

export function NationDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const nation = data?.nationById.get(id);
  if (!data || !nation) return <Empty>That nation is not in the gazetteer.</Empty>;
  if (nation.territoryId) return <TerritoryDossier id={nation.territoryId} />;
  return (
    <div>
      <Masthead kind={nation.category} title={nation.name} aside={<Flag nationId={nation.id} size={18} />} />
      <Section title="In this campaign">
        <Prose>{nation.inDataset ? 'A belligerent or co-belligerent in the dataset.' : 'Not a party to this campaign.'}</Prose>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function TheatreDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const state = useSimulation((s) => s.state);
  const t = data?.theatreById.get(id);
  if (!data || !t) return <Empty>That theatre is not on the record.</Empty>;
  const live = state?.theatres[id];
  const battles = data.battles.filter((b) => b.theatreId === id);
  const jump = useSimulation.getState().jumpToBattle;
  return (
    <div>
      <Masthead kind={`Theatre · ${t.code}`} title={t.name} sub={t.region}>
        <span className="rounded-[2px] border border-ink-400 px-1.5 py-px text-2xs uppercase tracking-label text-fg-3">area schematic</span>
      </Masthead>
      <Section title="Now">
        <Fields>
          <Field label="Status">{(live?.status ?? 'INACTIVE').toLowerCase().replace(/_/g, ' ')}</Field>
          <Field label="Control">{live?.control ? live.control.toLowerCase().replace(/_/g, ' ') : <span className="italic text-fg-3">not recorded</span>}</Field>
          <Field label="Battle">{live?.battleStatus ? live.battleStatus.toLowerCase() : '—'}</Field>
          <Field label="Frontline">{live?.frontline || '—'}</Field>
          <Field label="Active">{when(data, t.firstFrame)} → {when(data, t.lastFrame)}</Field>
        </Fields>
      </Section>
      {battles.length ? (
        <Section title="Battles">
          <ul className="space-y-1 text-xs">
            {battles.map((b) => (
              <li key={b.id}>
                <RecordLink onClick={() => jump(b.id)}>{b.name}</RecordLink> <span className="text-fg-3">· {BATTLE_TYPE_LABEL[b.type].toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      <Section title={`Events · ${t.eventCount}`}>
        <EventList ids={data.events.filter((e) => e.theatreId === id).map((e) => e.id)} max={40} />
      </Section>
      <Section title="Area" defaultOpen={false}>
        <Prose>The drawn area is schematic: the supplied maps show no theatre boundaries. It is clipped to the traced national borders so it never crosses into the sea or a neighbouring state.</Prose>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function MovementDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const jumpToForce = useSimulation((s) => s.jumpToForce);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const m = data?.movements.find((x) => x.id === id);
  if (!data || !m) return <Empty>That movement is not on the record.</Empty>;
  const force = data.forceById.get(m.forceId);
  return (
    <div>
      <Masthead kind={`Movement · ${m.type.toLowerCase()}`} title={`${m.from} → ${m.destinationUnknown ? 'unknown' : m.to}`} sub={force ? <RecordLink onClick={() => jumpToForce(force.id)}>{force.displayName}</RecordLink> : m.forceId}>
        <RouteBadge value={m.route} />
      </Masthead>
      <Section title="Movement">
        <Fields>
          <Field label="Who">{force?.displayName ?? m.forceId}</Field>
          <Field label="From">{m.from}</Field>
          <Field label="To">{m.destinationUnknown ? <span className="italic text-fg-3">not stated by the source</span> : m.to}</Field>
          <Field label="When">
            {m.startEvent ? <RecordLink onClick={() => jumpToEvent(m.startEvent!)}>{when(data, m.startFrame)}</RecordLink> : '—'} → {m.endEvent ? <RecordLink onClick={() => jumpToEvent(m.endEvent!)}>{when(data, m.endFrame)}</RecordLink> : '—'}
          </Field>
          <Field label="At departure"><Figure value={m.strengthAtStart} status={force?.sizeStatus} /></Field>
          <Field label="At arrival">{m.strengthAtEnd === 'UNKNOWN' ? <span className="text-2xs italic text-fg-3">no separate count recorded at arrival</span> : <Figure value={m.strengthAtEnd} status={force?.sizeStatus} />}</Field>
          <Field label="Route">{ROUTE_LABEL[m.route].note}</Field>
          <Field label="Why known">{m.basis.replace(/_/g, ' ').toLowerCase()} · confidence <ConfidenceText value={m.confidence} /></Field>
        </Fields>
        <p className="mt-1.5 text-2xs leading-relaxed text-fg-3">The strength at departure is not assumed to hold during the march; intermediate strength is unknown unless recorded.</p>
        {m.notes ? <p className="mt-2 text-xs leading-relaxed text-fg-2">{m.notes}</p> : null}
      </Section>
    </div>
  );
}
