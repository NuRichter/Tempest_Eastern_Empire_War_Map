'use client';

import { X } from 'lucide-react';

import { compactQuantity, confidenceLabel, phaseLabel, sourceGrade } from '@/lib/format';
import { forcePositionAt, forceSnapshotAt } from '@/simulation/resolver';
import { useSimulation } from '@/simulation/store';
import { Empty, Field, Fields, Figure, Flag, Prose, SourceBadge } from '@/components/primitives';

/**
 * Dossier.
 *
 * One record at a time, laid out like an intelligence file: what it is, what
 * it is made of, where it stands, and on whose authority any of that is
 * claimed. Every panel closes with its provenance.
 */
export function Dossier() {
  const selection = useSimulation((s) => s.selection);
  const select = useSimulation((s) => s.select);
  const viewMode = useSimulation((s) => s.viewMode);

  if (selection.kind === 'none' || viewMode !== 'standard') return null;

  return (
    <aside className="pointer-events-auto absolute right-4 top-4 z-20 max-h-[calc(100%-6rem)] w-[21rem] overflow-y-auto border border-chart-rule/35 bg-ink-850/92 shadow-panel backdrop-blur">
      <button
        type="button"
        onClick={() => select({ kind: 'none' })}
        className="absolute right-2 top-2 grid h-6 w-6 place-items-center text-chart-faint hover:text-chart-paper focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass"
        aria-label="Close dossier"
      >
        <X size={14} strokeWidth={1.6} />
      </button>
      <div className="p-3">
        {selection.kind === 'force' ? <ForceDossier id={selection.id} /> : null}
        {selection.kind === 'event' ? <EventDossier id={selection.id} /> : null}
        {selection.kind === 'battle' ? <BattleDossier id={selection.id} /> : null}
        {selection.kind === 'commander' ? <CommanderDossier id={selection.id} /> : null}
        {selection.kind === 'nation' ? <NationDossier id={selection.id} /> : null}
        {selection.kind === 'theatre' ? <TheatreDossier id={selection.id} /> : null}
        {selection.kind === 'combatant' ? <CombatantDossier id={selection.id} /> : null}
      </div>
    </aside>
  );
}

function Heading({ eyebrow, title, flagNationId }: { eyebrow: string; title: string; flagNationId?: string | null }) {
  return (
    <header className="mb-2 border-b border-chart-rule/30 pb-2 pr-6">
      <p className="font-ui text-micro text-chart-faint">{eyebrow}</p>
      <div className="mt-0.5 flex items-center gap-2">
        {flagNationId !== undefined ? <Flag nationId={flagNationId} size={16} /> : null}
        <h2 className="font-atlas text-base leading-tight text-chart-paper">{title}</h2>
      </div>
    </header>
  );
}

function Provenance({ source, confidence, note }: { source: string; confidence: string; note?: string }) {
  return (
    <footer className="mt-2 border-t border-chart-rule/30 pt-2">
      <p className="font-ui text-micro leading-relaxed text-chart-faint">
        {source ? `Source: ${source}. ` : ''}
        {confidenceLabel(confidence as never)}.{note ? ` ${note}` : ''}
      </p>
    </footer>
  );
}

/* ------------------------------------------------------------------ */

function ForceDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const select = useSimulation((s) => s.select);
  const jumpToForce = useSimulation((s) => s.jumpToForce);

  const force = data?.forceById.get(id);
  if (!data || !force) return <Empty>That formation is not in the register.</Empty>;

  const snapshot = forceSnapshotAt(data, id, frame);
  const position = forcePositionAt(data, id, frame);
  const place = snapshot?.placeId ? data.placeById.get(snapshot.placeId) : null;
  const parent = force.parentId ? data.forceById.get(force.parentId) : null;
  const nationId = data.factions.find((f) => f.id === force.faction)?.nationId ?? null;
  const movements = data.movementsByForce.get(id) ?? [];

  return (
    <>
      <Heading eyebrow={`${force.faction} · ${force.id}`} title={force.formation} flagNationId={nationId} />
      <Fields>
        <Field label="Army">{force.army}</Field>
        <Field label="Commander">{force.commander}</Field>
        <Field label="Role">{force.role}</Field>
        {parent ? (
          <Field label="Part of">
            <button
              type="button"
              onClick={() => jumpToForce(parent.id)}
              className="underline decoration-chart-rule underline-offset-2 hover:text-brass"
            >
              {parent.formation}
            </button>
          </Field>
        ) : null}
        {force.childIds.length > 0 ? (
          <Field label="Comprises">
            <span className="flex flex-wrap gap-x-2">
              {force.childIds.map((cid) => {
                const child = data.forceById.get(cid);
                if (!child) return null;
                return (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => jumpToForce(cid)}
                    className="underline decoration-chart-rule underline-offset-2 hover:text-brass"
                  >
                    {child.formation}
                  </button>
                );
              })}
            </span>
          </Field>
        ) : null}
      </Fields>

      <p className="mt-2 font-ui text-micro text-chart-faint">State at this frame</p>
      <Fields>
        <Field label="Strength">
          <Figure value={snapshot?.strength ?? 'UNKNOWN'} />
        </Field>
        <Field label="Effective">
          <Figure value={snapshot?.effective ?? 'UNKNOWN'} />
        </Field>
        <Field label="Status">{snapshot?.status ?? 'not placed at this frame'}</Field>
        <Field label="Movement">
          {snapshot?.movement ?? 'unknown'}
          {position?.moving ? ` · in transit, ${Math.round(position.progress * 100)}% of the leg` : ''}
        </Field>
        <Field label="Location">
          {place ? place.name : snapshot?.locationRaw || 'unknown'}{' '}
          {position ? (
            <SourceBadge
              grade={position.placement === 'MEASURED' ? 'CANONICAL' : 'SIMULATION'}
              note={place?.basis}
            />
          ) : (
            <SourceBadge grade="UNKNOWN" note="No defensible position; the formation is not drawn." />
          )}
        </Field>
        <Field label="Killed">
          <Figure value={snapshot?.kia ?? 'UNKNOWN'} />
        </Field>
        <Field label="Wounded">
          <Figure value={snapshot?.wia ?? 'UNKNOWN'} />
        </Field>
        <Field label="Prisoners">
          <Figure value={snapshot?.pow ?? 'UNKNOWN'} />
        </Field>
        <Field label="Missing">
          <Figure value={snapshot?.mia ?? 'UNKNOWN'} />
        </Field>
      </Fields>

      <p className="mt-2 font-ui text-micro text-chart-faint">Strength as the source states it</p>
      <Prose>{force.initialStrengthRaw}</Prose>

      {movements.length > 0 ? (
        <>
          <p className="mt-2 font-ui text-micro text-chart-faint">Recorded movements</p>
          <ul className="space-y-0.5">
            {movements.map((m) => (
              <li key={m.id} className="font-ui text-micro leading-relaxed text-chart-paper/85">
                <span className="font-figure text-chart-faint">{m.id}</span> {m.type.toLowerCase()}: {m.from} →{' '}
                {m.destinationUnknown ? <span className="italic text-chart-faint">destination not stated</span> : m.to}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {force.notes ? (
        <>
          <p className="mt-2 font-ui text-micro text-chart-faint">Note</p>
          <Prose>{force.notes}</Prose>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => select({ kind: 'none' })}
        className="sr-only"
        aria-hidden
      />
      <Provenance source={force.source} confidence={force.confidence} note={`Strength basis: ${force.strengthBasis}.`} />
    </>
  );
}

/* ------------------------------------------------------------------ */

function EventDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const jumpToBattle = useSimulation((s) => s.jumpToBattle);
  const event = data?.eventById.get(id);
  if (!data || !event) return <Empty>That event is not in the record.</Empty>;

  return (
    <>
      <Heading eyebrow={`${event.warDay} · ${event.simulationTime} · ${event.id}`} title={event.action} />
      {event.turningPoint ? (
        <p className="mb-2 border-l-2 border-l-brass bg-brass/10 px-2 py-1 font-ui text-tiny leading-relaxed text-chart-paper">
          Turning point {event.turningPointRank}. {event.turningPointSummary}
        </p>
      ) : null}
      <Fields>
        <Field label="Theatre">{event.theatre}</Field>
        <Field label="Front">{event.front}</Field>
        <Field label="Location">{event.location}</Field>
        <Field label="Actor">
          {event.actor} <span className="text-chart-faint">({event.actorFaction})</span>
        </Field>
        <Field label="Opponent">
          {event.opponent} <span className="text-chart-faint">({event.opponentFaction})</span>
        </Field>
        <Field label="Type">{phaseLabel(event.type)}</Field>
        <Field label="Significance">{event.significance.toLowerCase()}</Field>
        {event.battleId ? (
          <Field label="Battle">
            <button
              type="button"
              onClick={() => jumpToBattle(event.battleId!)}
              className="underline decoration-chart-rule underline-offset-2 hover:text-brass"
            >
              {event.battle}
            </button>
          </Field>
        ) : null}
        <Field label="Killed">
          <Figure value={event.kia} />
        </Field>
        <Field label="Prisoners">
          <Figure value={event.pow} />
        </Field>
      </Fields>

      <p className="mt-2 font-ui text-micro text-chart-faint">Immediate result</p>
      <Prose>{event.immediateResult}</Prose>
      <p className="mt-2 font-ui text-micro text-chart-faint">Operational result</p>
      <Prose>{event.operationalResult}</Prose>
      <p className="mt-2 font-ui text-micro text-chart-faint">Strategic result</p>
      <Prose>{event.strategicResult}</Prose>

      <div className="mt-2 flex items-center gap-2">
        <SourceBadge grade={sourceGrade(event.timeBasis)} note={`Time basis: ${event.timeBasis}.`} />
        <span className="font-ui text-micro text-chart-faint">
          Canonical time: {event.canonicalTime === '-' ? 'not stated' : event.canonicalTime}
        </span>
      </div>

      <div className="mt-2 flex gap-2">
        {event.prevId ? (
          <button
            type="button"
            onClick={() => jumpToEvent(event.prevId!)}
            className="border border-chart-rule/40 px-2 py-1 font-ui text-micro text-chart-faint hover:border-brass/60 hover:text-chart-paper"
          >
            previous event
          </button>
        ) : null}
        {event.nextId ? (
          <button
            type="button"
            onClick={() => jumpToEvent(event.nextId!)}
            className="border border-chart-rule/40 px-2 py-1 font-ui text-micro text-chart-faint hover:border-brass/60 hover:text-chart-paper"
          >
            next event
          </button>
        ) : null}
      </div>

      <Provenance
        source={`${event.sourceVolume} ${event.sourceChapter}`}
        confidence={event.confidence}
        note={event.notes}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

function BattleDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const battle = data?.battleById.get(id);
  if (!data || !battle) return <Empty>That battle is not in the record.</Empty>;

  const theatre = data.theatreById.get(battle.theatreId);
  const place = battle.placeId ? data.placeById.get(battle.placeId) : null;

  return (
    <>
      <Heading eyebrow={`${battle.id} · ${theatre?.name ?? battle.theatreId}`} title={battle.name} />
      <Fields>
        <Field label="Frames">
          {battle.startFrame + 1} – {battle.endFrame + 1}
        </Field>
        <Field label="Days">
          {battle.phases.map(phaseLabel).join(', ')}
        </Field>
        <Field label="Place">
          {place?.name ?? 'not placed'}{' '}
          {place ? <SourceBadge grade={place.placement === 'MEASURED' ? 'CANONICAL' : 'SIMULATION'} note={place.basis} /> : null}
        </Field>
        <Field label="Events">{battle.eventIds.length}</Field>
        <Field label="Imperial dead">
          <Figure value={battle.empireLost} />
        </Field>
        <Field label="Tempest dead">
          <Figure value={battle.tempestLost} />
        </Field>
      </Fields>

      <p className="mt-2 font-ui text-micro text-chart-faint">Participants</p>
      <ul className="space-y-0.5">
        {battle.participants.map((p) => (
          <li key={p.faction} className="font-ui text-micro text-chart-paper/85">
            {p.faction} <span className="text-chart-faint">· {p.forces.length} formations in the register</span>
          </li>
        ))}
      </ul>

      <p className="mt-2 font-ui text-micro text-chart-faint">Sequence</p>
      <ul className="max-h-40 space-y-px overflow-y-auto pr-1">
        {battle.eventIds.map((eid) => {
          const event = data.eventById.get(eid);
          if (!event) return null;
          return (
            <li key={eid}>
              <button
                type="button"
                onClick={() => jumpToEvent(eid)}
                className="w-full px-1 py-0.5 text-left hover:bg-ink-700/50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass"
              >
                <span className="font-figure text-micro text-brass">{event.simulationTime}</span>{' '}
                <span className="font-ui text-micro text-chart-paper/85">{event.action}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <Provenance
        source=""
        confidence={battle.confidence}
        note="Battle spans are derived from the events assigned to them; the source names no start and end time."
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

function CommanderDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const jumpToForce = useSimulation((s) => s.jumpToForce);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const commanderMode = useSimulation((s) => s.commanderMode);
  const setCommanderMode = useSimulation((s) => s.setCommanderMode);
  const commander = data?.commanderById.get(id);
  if (!data || !commander) return <Empty>That commander is not in the record.</Empty>;

  const nationId = data.factions.find((f) => f.id === commander.faction)?.nationId ?? null;

  return (
    <>
      <Heading eyebrow={`${commander.faction} · ${commander.id}`} title={commander.name} flagNationId={nationId} />
      <Fields>
        <Field label="Role">{commander.role}</Field>
        <Field label="Scope">{commander.scope}</Field>
        <Field label="Status">{commander.status.toLowerCase()}</Field>
        <Field label="Subordinates">{commander.subordinates.join(', ') || 'none recorded'}</Field>
      </Fields>

      <button
        type="button"
        onClick={() => setCommanderMode(commanderMode === id ? null : id)}
        className={`mt-2 w-full border px-2 py-1.5 font-ui text-tiny transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass ${
          commanderMode === id
            ? 'border-brass bg-brass/20 text-chart-paper'
            : 'border-chart-rule/40 text-chart-faint hover:border-brass/60 hover:text-chart-paper'
        }`}
      >
        {commanderMode === id ? 'Showing only this command' : 'Isolate this command on the map'}
      </button>

      {commander.forceIds.length > 0 ? (
        <>
          <p className="mt-2 font-ui text-micro text-chart-faint">Formations</p>
          <ul className="space-y-px">
            {commander.forceIds.map((fid) => {
              const force = data.forceById.get(fid);
              if (!force) return null;
              return (
                <li key={fid}>
                  <button
                    type="button"
                    onClick={() => jumpToForce(fid)}
                    className="w-full px-1 py-0.5 text-left font-ui text-micro text-chart-paper/85 hover:bg-ink-700/50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass"
                  >
                    {force.formation}{' '}
                    <span className="font-figure text-chart-faint">{compactQuantity(force.initialBest)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {commander.eventIds.length > 0 ? (
        <>
          <p className="mt-2 font-ui text-micro text-chart-faint">Actions on the record</p>
          <ul className="max-h-36 space-y-px overflow-y-auto pr-1">
            {commander.eventIds.map((eid) => {
              const event = data.eventById.get(eid);
              if (!event) return null;
              return (
                <li key={eid}>
                  <button
                    type="button"
                    onClick={() => jumpToEvent(eid)}
                    className="w-full px-1 py-0.5 text-left font-ui text-micro text-chart-paper/85 hover:bg-ink-700/50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass"
                  >
                    <span className="font-figure text-brass">{event.warDay}</span> {event.action}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      <Provenance source={commander.source} confidence={commander.confidence} />
    </>
  );
}

/* ------------------------------------------------------------------ */

function NationDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const focusOn = useSimulation((s) => s.focusOn);
  const nation = data?.nationById.get(id);
  if (!data || !nation) return <Empty>That nation is not in the gazetteer.</Empty>;

  const faction = data.factions.find((f) => f.nationId === id);

  return (
    <>
      <Heading eyebrow={nation.category} title={nation.name} flagNationId={nation.id} />
      <Fields>
        <Field label="In the dataset">{nation.inDataset ? 'Yes, as a belligerent or co-belligerent' : 'Not a party to this campaign'}</Field>
        <Field label="Formations">{faction ? faction.forceIds.length : 0}</Field>
        <Field label="Placement">
          <SourceBadge grade={nation.placement === 'MEASURED' ? 'CANONICAL' : 'SIMULATION'} />{' '}
          <span className="font-figure text-chart-faint">
            {nation.x?.toFixed(3)}, {nation.y?.toFixed(3)}
          </span>
        </Field>
      </Fields>
      {nation.x !== null && nation.y !== null ? (
        <button
          type="button"
          onClick={() => focusOn(nation.x!, nation.y!, 3.6)}
          className="mt-2 w-full border border-chart-rule/40 px-2 py-1.5 font-ui text-tiny text-chart-faint hover:border-brass/60 hover:text-chart-paper"
        >
          Centre the map here
        </button>
      ) : null}
      <Provenance
        source="Marker position read from the supplied annotated map"
        confidence="HIGH"
        note="Position is a marker on a fictional map, not a geographic coordinate."
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

function TheatreDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const state = useSimulation((s) => s.state);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const theatre = data?.theatreById.get(id);
  if (!data || !theatre) return <Empty>That theatre is not in the record.</Empty>;

  const live = state?.theatres[id];
  const changes = data.territories.filter((t) => t.theatreId === id);

  return (
    <>
      <Heading eyebrow={`${theatre.id} · ${theatre.region}`} title={theatre.name} />
      <Fields>
        <Field label="Status">{live?.status ?? 'inactive'}</Field>
        <Field label="Control">{live?.control ?? 'not recorded at this frame'}</Field>
        <Field label="Battle">{live?.battleStatus ?? 'no battle recorded'}</Field>
        <Field label="Events">{theatre.eventCount}</Field>
      </Fields>

      <p className="mt-2 font-ui text-micro text-chart-faint">Frontline</p>
      <Prose>{live?.frontline ?? 'No frontline recorded at this frame.'}</Prose>

      {changes.length > 0 ? (
        <>
          <p className="mt-2 font-ui text-micro text-chart-faint">Territorial changes</p>
          <ul className="space-y-1">
            {changes.map((change) => (
              <li key={change.id} className="border-l-2 border-l-chart-rule/50 pl-2">
                <p className="font-ui text-micro text-chart-paper">{change.name}</p>
                <p className="font-ui text-micro text-chart-faint">
                  {change.before.toLowerCase()} → {change.after.toLowerCase()}
                  {change.changeEventId ? (
                    <>
                      {' '}
                      ·{' '}
                      <button
                        type="button"
                        onClick={() => jumpToEvent(change.changeEventId!)}
                        className="underline decoration-chart-rule underline-offset-2 hover:text-brass"
                      >
                        {change.changeEventId}
                      </button>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <Provenance
        source=""
        confidence="MEDIUM"
        note="The theatre area drawn on the map is schematic. The supplied maps contain no theatre boundaries."
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

function CombatantDossier({ id }: { id: string }) {
  const data = useSimulation((s) => s.data);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const combatant = data?.combatants.find((c) => c.id === id);
  if (!data || !combatant) return <Empty>That combatant is not in the record.</Empty>;

  const nationId = data.factions.find((f) => f.id === combatant.faction)?.nationId ?? null;

  return (
    <>
      <Heading eyebrow={`${combatant.faction} · ${combatant.id}`} title={combatant.name} flagNationId={nationId} />
      <Fields>
        <Field label="Final status">{combatant.finalStatus.toLowerCase()}</Field>
        <Field label="Volumes">{combatant.sourceVolumes}</Field>
        <Field label="First seen">
          {combatant.firstEvent ? (
            <button
              type="button"
              onClick={() => jumpToEvent(combatant.firstEvent!)}
              className="underline decoration-chart-rule underline-offset-2 hover:text-brass"
            >
              {combatant.firstEvent}
            </button>
          ) : (
            'unknown'
          )}
        </Field>
        <Field label="Last seen">
          {combatant.lastEvent ? (
            <button
              type="button"
              onClick={() => jumpToEvent(combatant.lastEvent!)}
              className="underline decoration-chart-rule underline-offset-2 hover:text-brass"
            >
              {combatant.lastEvent}
            </button>
          ) : (
            'unknown'
          )}
        </Field>
      </Fields>
      <p className="mt-2 font-ui text-micro text-chart-faint">Effect on the battlefield</p>
      <Prose>{combatant.effect}</Prose>
      <Provenance source={combatant.sourceVolumes} confidence="HIGH" />
    </>
  );
}
