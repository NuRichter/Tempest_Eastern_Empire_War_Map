'use client';

import { useEffect, useMemo, useState } from 'react';

import { COORDINATE_DISCLAIMER } from '@/lib/coords';
import { compactQuantity } from '@/lib/format';
import { useSimulation } from '@/simulation/store';
import { Empty, Field, Fields, Figure, Flag, Panel, RowButton, SourceBadge } from '@/components/primitives';
import { forceSnapshotAt } from '@/simulation/resolver';

type Tab = 'combatants' | 'orbat' | 'commanders' | 'uncertainty' | 'coordinates';

const TABS: { id: Tab; label: string }[] = [
  { id: 'combatants', label: 'Combatants' },
  { id: 'orbat', label: 'Order of battle' },
  { id: 'commanders', label: 'Command' },
  { id: 'uncertainty', label: 'Uncertainty' },
  { id: 'coordinates', label: 'Coordinates' },
];

/**
 * Intelligence tools.
 *
 * Five views onto the same dataset: who is fighting, what they are made of, who
 * commands, what the reconstruction is unsure about, and how anything came to
 * have a position on the map at all.
 */
export function IntelligencePanel() {
  const [tab, setTab] = useState<Tab>('combatants');

  return (
    <Panel
      title="Intelligence"
      dense
      action={
        <div className="flex flex-wrap justify-end gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-1 py-px font-ui text-micro focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass ${
                tab === t.id ? 'border-b border-brass text-chart-paper' : 'text-chart-faint hover:text-chart-paper'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      {tab === 'combatants' ? <Combatants /> : null}
      {tab === 'orbat' ? <OrderOfBattle /> : null}
      {tab === 'commanders' ? <CommandView /> : null}
      {tab === 'uncertainty' ? <Uncertainty /> : null}
      {tab === 'coordinates' ? <Coordinates /> : null}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

/** Major combatant mode: the factions the dataset actually records. */
function Combatants() {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const jumpToForce = useSimulation((s) => s.jumpToForce);
  const select = useSimulation((s) => s.select);
  const focus = useSimulation((s) => s.combatantFocus);
  const setFocus = useSimulation((s) => s.setCombatantFocus);

  if (!data) return null;

  return (
    <div className="space-y-2">
      {data.factions.map((faction) => {
        const nation = faction.nationId ? data.nationById.get(faction.nationId) : null;
        const forces = faction.forceIds
          .map((id) => data.forceById.get(id))
          .filter((f): f is NonNullable<typeof f> => Boolean(f));
        const onMap = forces.filter((f) => forceSnapshotAt(data, f.id, frame));
        const open = focus === faction.id;
        return (
          <div key={faction.id} className="border border-chart-rule/25">
            <button
              type="button"
              onClick={() => setFocus(open ? null : faction.id)}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-ink-700/40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass"
            >
              <Flag nationId={faction.nationId} size={14} />
              <span className="flex-1 truncate font-atlas text-tiny text-chart-paper">{faction.name}</span>
              <span className="shrink-0 font-figure text-micro text-chart-faint">
                {onMap.length}/{forces.length} placed
              </span>
            </button>
            {open ? (
              <div className="border-t border-chart-rule/20 px-2 py-1.5">
                {nation ? (
                  <Fields>
                    <Field label="Nation">
                      <button
                        type="button"
                        className="underline decoration-chart-rule underline-offset-2 hover:text-brass"
                        onClick={() => select({ kind: 'nation', id: nation.id })}
                      >
                        {nation.name}
                      </button>
                    </Field>
                    <Field label="Category">{nation.category}</Field>
                    <Field label="Major combatant">{faction.isMajorCombatant ? 'Yes' : 'Supporting'}</Field>
                  </Fields>
                ) : (
                  <Empty>This faction has no single nation in the dataset.</Empty>
                )}
                <ul className="mt-1 space-y-px">
                  {forces.map((force) => {
                    const snapshot = forceSnapshotAt(data, force.id, frame);
                    return (
                      <li key={force.id}>
                        <RowButton onClick={() => jumpToForce(force.id)}>
                          <div className="flex items-baseline gap-2">
                            <span
                              className="shrink-0 font-figure text-micro text-chart-faint"
                              style={{ paddingLeft: force.depth * 8 }}
                            >
                              {force.id}
                            </span>
                            <span className="flex-1 truncate font-ui text-tiny text-chart-paper">
                              {force.formation}
                            </span>
                            <span className="shrink-0 font-figure text-micro text-chart-faint">
                              {snapshot ? compactQuantity(snapshot.strength) : '—'}
                            </span>
                          </div>
                        </RowButton>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Force hierarchy, indented. Parent totals are never added to child totals. */
function OrderOfBattle() {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const jumpToForce = useSimulation((s) => s.jumpToForce);
  const selection = useSimulation((s) => s.selection);

  const tree = useMemo(() => {
    if (!data) return [];
    const out: { id: string; depth: number }[] = [];
    const walk = (id: string, depth: number) => {
      out.push({ id, depth });
      const force = data.forceById.get(id);
      if (!force) return;
      for (const child of force.childIds) walk(child, depth + 1);
    };
    for (const root of data.forces.filter((f) => !f.parentId)) walk(root.id, 0);
    return out;
  }, [data]);

  if (!data) return null;

  return (
    <div>
      <p className="mb-1 font-ui text-micro leading-relaxed text-chart-faint">
        Indentation is containment. A formation&apos;s strength is already inside its parent&apos;s, so the
        tiers must never be added together.
      </p>
      <ul className="max-h-72 space-y-px overflow-y-auto pr-1">
        {tree.map(({ id, depth }) => {
          const force = data.forceById.get(id);
          if (!force) return null;
          const snapshot = forceSnapshotAt(data, id, frame);
          const active = selection.kind === 'force' && selection.id === id;
          return (
            <li key={id}>
              <RowButton onClick={() => jumpToForce(id)} active={active}>
                <div className="flex items-baseline gap-2" style={{ paddingLeft: depth * 10 }}>
                  <span className="flex-1 truncate font-ui text-tiny text-chart-paper">{force.formation}</span>
                  <span className="shrink-0 font-figure text-micro">
                    {snapshot ? <Figure value={snapshot.strength} /> : <span className="text-chart-faint">not placed</span>}
                  </span>
                </div>
                <div className="font-ui text-micro text-chart-faint" style={{ paddingLeft: depth * 10 }}>
                  {force.commander}
                </div>
              </RowButton>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Commander mode: isolate one commander's formations on the map. */
function CommandView() {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const commanderMode = useSimulation((s) => s.commanderMode);
  const setCommanderMode = useSimulation((s) => s.setCommanderMode);
  const select = useSimulation((s) => s.select);

  if (!data) return null;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="font-ui text-micro leading-relaxed text-chart-faint">
          Selecting a commander restricts the map to the formations under their command.
        </p>
        {commanderMode ? (
          <button
            type="button"
            onClick={() => setCommanderMode(null)}
            className="shrink-0 border border-brass/50 px-1.5 py-px font-ui text-micro text-brass hover:bg-brass/15"
          >
            clear
          </button>
        ) : null}
      </div>
      <ul className="max-h-72 space-y-px overflow-y-auto pr-1">
        {data.commanders.map((commander) => {
          const active = commanderMode === commander.id;
          const inCommand =
            commander.startFrame !== null &&
            frame >= commander.startFrame &&
            (commander.endFrame === null || frame <= commander.endFrame);
          return (
            <li key={commander.id}>
              <RowButton
                active={active}
                onClick={() => {
                  setCommanderMode(active ? null : commander.id);
                  select({ kind: 'commander', id: commander.id });
                }}
              >
                <div className="flex items-baseline gap-2">
                  <span className={`flex-1 truncate font-ui text-tiny ${inCommand ? 'text-chart-paper' : 'text-chart-faint/70'}`}>
                    {commander.name}
                  </span>
                  <span className="shrink-0 font-figure text-micro text-chart-faint">
                    {commander.forceIds.length} formation{commander.forceIds.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="font-ui text-micro text-chart-faint">
                  {commander.role} · {commander.status.toLowerCase()}
                </div>
              </RowButton>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Contradictions and temporal ambiguities, carried from the dataset verbatim. */
function Uncertainty() {
  const [reference, setReference] = useState<{ contradictions: unknown[]; ambiguities: unknown[] } | null>(null);

  // The uncertainty register is only read when this tab is opened, so it is
  // fetched here rather than shipped in the initial payload.
  useEffect(() => {
    const controller = new AbortController();
    fetch('/data/reference.json', { signal: controller.signal })
      .then((r) => r.json())
      .then((r) => setReference(r))
      .catch(() => {
        if (!controller.signal.aborted) setReference({ contradictions: [], ambiguities: [] });
      });
    return () => controller.abort();
  }, []);

  const contradictions = (reference?.contradictions ?? []) as {
    id: string;
    description: string;
    claimA: string;
    claimB: string;
    resolution: string;
    treatment: string;
    confidence: string;
  }[];
  const ambiguities = (reference?.ambiguities ?? []) as {
    id: string;
    subject: string;
    chosenPlacement: string;
    confidence: string;
  }[];

  if (!reference) return <Empty>Loading the uncertainty register.</Empty>;

  return (
    <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
      <div>
        <p className="mb-1 font-atlas text-tiny text-chart-paper">Contradictions in the source</p>
        {contradictions.length === 0 ? (
          <Empty>None recorded.</Empty>
        ) : (
          <ul className="space-y-1.5">
            {contradictions.map((c) => (
              <li key={c.id} className="border-l-2 border-l-chart-rule/50 pl-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-figure text-micro text-chart-faint">{c.id}</span>
                  <span className="flex-1 font-ui text-tiny text-chart-paper">{c.description}</span>
                </div>
                <p className="mt-0.5 font-ui text-micro leading-relaxed text-chart-faint">{c.resolution}</p>
                <p className="mt-0.5 font-ui text-micro leading-relaxed text-brass/85">{c.treatment}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="mb-1 font-atlas text-tiny text-chart-paper">Temporal ambiguities</p>
        <ul className="space-y-1.5">
          {ambiguities.map((a) => (
            <li key={a.id} className="border-l-2 border-l-chart-rule/50 pl-2">
              <div className="flex items-baseline gap-2">
                <span className="font-figure text-micro text-chart-faint">{a.id}</span>
                <span className="flex-1 font-ui text-tiny text-chart-paper">{a.subject}</span>
                <SourceBadge grade="SIMULATION" note={`Confidence ${a.confidence}.`} />
              </div>
              <p className="mt-0.5 font-ui text-micro leading-relaxed text-chart-faint">{a.chosenPlacement}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** How anything came to have a position. */
function Coordinates() {
  const data = useSimulation((s) => s.data);
  const focusOn = useSimulation((s) => s.focusOn);
  if (!data) return null;

  const byGrade = {
    MEASURED: data.places.filter((p) => p.placement === 'MEASURED'),
    RECONSTRUCTED: data.places.filter((p) => p.placement === 'RECONSTRUCTED'),
    ABSTRACT: data.places.filter((p) => p.placement === 'ABSTRACT'),
  };

  return (
    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
      <p className="font-ui text-micro leading-relaxed text-chart-faint">{COORDINATE_DISCLAIMER}</p>
      <Fields>
        <Field label="System">{data.manifest.coordinateSystem.id}</Field>
        <Field label="Atlas">
          {data.manifest.coordinateSystem.atlasPixelWidth} × {data.manifest.coordinateSystem.atlasPixelHeight} px
        </Field>
        <Field label="Nations">{data.nations.filter((n) => n.placement === 'MEASURED').length} measured from the supplied map</Field>
      </Fields>
      {(['MEASURED', 'RECONSTRUCTED', 'ABSTRACT'] as const).map((grade) => (
        <div key={grade}>
          <p className="mb-0.5 font-atlas text-tiny text-chart-paper">
            {grade.toLowerCase()} · {byGrade[grade].length}
          </p>
          <ul className="space-y-px">
            {byGrade[grade].map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  disabled={place.x === null}
                  onClick={() => place.x !== null && place.y !== null && focusOn(place.x, place.y, 4.4)}
                  title={place.basis}
                  className="w-full px-1 py-0.5 text-left hover:bg-ink-700/40 disabled:cursor-default focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass"
                >
                  <span className="font-ui text-micro text-chart-paper">{place.name}</span>
                  {place.x !== null ? (
                    <span className="ml-2 font-figure text-micro text-chart-faint">
                      {place.x.toFixed(3)}, {place.y!.toFixed(3)}
                    </span>
                  ) : (
                    <span className="ml-2 font-ui text-micro italic text-chart-faint">off-map by design</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
