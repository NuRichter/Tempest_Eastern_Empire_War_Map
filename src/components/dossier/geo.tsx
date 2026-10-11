'use client';

import { useT } from '@/i18n';
import { msg } from '@/i18n/msg';
import { battleDayLabel } from '@/lib/format';
import { distanceKm, formatKm, toKm } from '@/lib/world';
import { ledgerAt, legDistances } from '@/simulation/resolver';
import { useSimulation } from '@/simulation/store';
import { Masthead } from '@/components/dossier/Dossier';
import { Empty, Field, Fields, Figure, RecordLink, Section } from '@/components/ui/primitives';
import { SUPPLY_LABEL, SYMBOL_LABEL } from '@/map/overlay/layers/terrain';
import type { Dataset } from '@/data/loader';
import type { Force, LedgerRole, Movement, SupplyState, TerrainClass } from '@/types/dataset';

type T = ReturnType<typeof useT>;

const when = (data: Dataset, frame: number) => {
  const day = Math.floor(frame / data.manifest.clock.framesPerDay) + data.manifest.clock.firstDay;
  const m = (frame % data.manifest.clock.framesPerDay) * data.manifest.clock.minutesPerFrame;
  return `${battleDayLabel(day)} ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export const LEDGER_ROLE_LABEL: Record<LedgerRole, string> = {
  MAIN: msg('Main invasion formation'),
  ALLOCATION: msg('Allocation of the main formation'),
  DETACHMENT: msg('Separate detachment'),
  RESERVE: msg('Capital reserve (outside the operation)'),
  TRANSFER: msg('Transferred from the capital reserve'),
  GATE_FORCE: msg('Dwargon Gate force'),
  REVIVED_COHORT: msg('Revived personnel (not new recruits)'),
  OUTSIDE_OPERATION: msg('Outside the invasion operation'),
};

const TERRAIN_LABEL: Record<TerrainClass, string> = {
  road: msg('road'),
  open: msg('open ground'),
  forest: msg('forest'),
  deepForest: msg('deep forest'),
  pass: msg('mountain pass'),
  mountain: msg('mountain'),
  water: msg('water'),
  river: msg('river crossing'),
  ford: msg('ford'),
  air: msg('air'),
};

const GRADE_LABEL: Record<string, string> = {
  TRACED: msg('Traced from the painted map'),
  CANON_RECONSTRUCTED: msg('In the novels, line drawn by the project'),
  SYNTHETIC: msg('Synthetic: added by the project'),
};

/** Ledger part of a force dossier: role, where its personnel came from and went. */
export function ForceLedger({ force }: { force: Force }) {
  const t = useT();
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const jumpToForce = useSimulation((s) => s.jumpToForce);
  const seek = useSimulation((s) => s.seek);
  if (!data) return null;
  const inOperation = data.ledger.operationForceIds.includes(force.id);
  const leg = legDistances(data, force.id, frame);
  const link = (id: string) => <RecordLink onClick={() => jumpToForce(id)}>{data.forceById.get(id)?.displayName ?? id}</RecordLink>;
  const at = (f: number) => (
    <button type="button" className="figure text-2xs text-fg-3 hover:text-accent" onClick={() => seek(f)}>
      {when(data, f)}
    </button>
  );
  if (!force.ledgerRole && !inOperation && !leg) return null;
  return (
    <Section title={t('Force ledger')}>
      <Fields>
        <Field label={t('Role')}>{force.ledgerRole ? t(LEDGER_ROLE_LABEL[force.ledgerRole]) : t('Subordinate of an operation formation')}</Field>
        <Field label={t('Initial strength')}><Figure value={force.initialBest} status={force.sizeStatus} /></Field>
        <Field label={t('In the operation ledger')}>{inOperation ? t('yes, counted once as unique personnel') : t('no')}</Field>
        {force.origin ? (
          <Field label={force.origin.kind === 'SPLIT' ? t('Split from') : t('Transferred from')}>
            {link(force.origin.fromForceId)} · {at(force.origin.frame)}
          </Field>
        ) : null}
        {force.issuedIds.length ? (
          <Field label={t('Issued')}>
            <span className="flex flex-wrap gap-x-2">{force.issuedIds.map((id) => <span key={id}>{link(id)}</span>)}</span>
          </Field>
        ) : null}
        {force.mergedInto ? (
          <Field label={t('Merged into')}>
            {link(force.mergedInto.forceId)} · {at(force.mergedInto.frame)}
          </Field>
        ) : null}
        {data.forces.some((f) => f.mergedInto?.forceId === force.id) ? (
          <Field label={t('Reinforced by')}>
            <span className="flex flex-col">
              {data.forces.filter((f) => f.mergedInto?.forceId === force.id).map((f) => (
                <span key={f.id}>{link(f.id)} · {at(f.mergedInto!.frame)}</span>
              ))}
            </span>
          </Field>
        ) : null}
        {leg ? (
          <Field label={t('Current leg')}>
            {t('{done} travelled, {left} to go', { done: formatKm(leg.travelledKm), left: formatKm(leg.remainingKm) })}
          </Field>
        ) : null}
      </Fields>
    </Section>
  );
}

/** One line about a movement's measured route. */
export function routeLine(t: T, data: Dataset, m: Movement): string | null {
  if (m.lengthKm === null) return null;
  const parts = [formatKm(m.lengthKm)];
  if (m.kmPerDay !== null) parts.push(t('{v} km a day', { v: m.kmPerDay.toLocaleString('en-GB') }));
  const r = m.routeId ? data.routeById.get(m.routeId) : null;
  if (r?.mode === 'AIR') parts.push(t('by air'));
  return parts.join(' · ');
}

export function MovementRoute({ m }: { m: Movement }) {
  const t = useT();
  const data = useSimulation((s) => s.data);
  if (!data) return null;
  const r = m.routeId ? data.routeById.get(m.routeId) : null;
  if (!r && m.lengthKm === null) return null;
  const terrain = r ? (Object.entries(r.terrainKm) as [TerrainClass, number][]).filter(([, km]) => km >= 1).sort((a, b) => b[1] - a[1]) : [];
  const name = (id: string) => data.geography.passes.find((p) => p.id === id)?.name ?? data.geography.crossings.find((c) => c.id === id)?.name ?? data.geography.roads.find((x) => x.id === id)?.name ?? id;
  return (
    <Section title={t('Route on the ground')}>
      <Fields>
        <Field label={t('Distance')}>{m.lengthKm !== null ? formatKm(m.lengthKm) : '-'}{r ? <span className="text-fg-3"> · {t('straight line {km}', { km: formatKm(r.straightKm) })}</span> : null}</Field>
        <Field label={t('Implied pace')}>
          {m.kmPerDay !== null ? t('{v} km a day', { v: m.kmPerDay.toLocaleString('en-GB') }) : '-'}
          <span className="text-fg-3"> · {t('checked against the {cls} rate', { cls: m.speedClass })}</span>
          {m.overSpeed ? <span className="block text-2xs text-alert">{t('Faster than the stated maximum for this kind of unit.')}</span> : null}
        </Field>
        {terrain.length ? <Field label={t('Terrain')}>{terrain.map(([k, km]) => `${t(TERRAIN_LABEL[k])} ${formatKm(km)}`).join(' · ')}</Field> : null}
        {r?.passes.length ? <Field label={t('Passes')}>{r.passes.map(name).join(', ')}</Field> : null}
        {r?.crossings.length ? <Field label={t('Crossings')}>{r.crossings.map(name).join(', ')}</Field> : null}
        {r?.roads.length ? <Field label={t('Roads used')}>{r.roads.map(name).join(', ')}</Field> : null}
        {r && r.mode !== 'AIR' ? <Field label={t('Highest ground')}>{t('about {m} m', { m: Math.round(r.maxElevationM / 100) * 100 })}</Field> : null}
      </Fields>
      <p className="mt-1.5 text-2xs leading-relaxed text-fg-3">
        {t('Found on the terrain model: water is impassable, the Kanaat massif is crossed only by a pass, rivers only at a ford or bridge. Distances use the synthetic scale of 2 km per atlas pixel and are rounded to 10 km. Elevations are a stylised relief, not a survey.')}
      </p>
    </Section>
  );
}

export function PlaceDossier({ id }: { id: string }) {
  const t = useT();
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const jumpToForce = useSimulation((s) => s.jumpToForce);
  const place = data?.placeById.get(id);
  if (!data || !place) return <Empty>{t('That place is not in the gazetteer.')}</Empty>;
  const km = place.x !== null && place.y !== null ? toKm(place.x, place.y) : null;
  const rimuru = data.nationById.get('jura-tempest-federation');
  const dwargon = data.nationById.get('dwargon');
  const here = data.forces.filter((f) => {
    const keys = data.positionByForce.get(f.id)?.keys ?? [];
    let k = null;
    for (const x of keys) if (x.f <= frame) k = x;
    return k?.placeId === id;
  });
  return (
    <div>
      <Masthead kind={place.symbol ? t(SYMBOL_LABEL[place.symbol]) : t('Place')} title={place.name} sub={place.theatre ? data.theatreById.get(place.theatre)?.name : undefined} />
      <Section title={t('Position')}>
        <Fields>
          <Field label={t('Grade')}>{place.placement.toLowerCase()}</Field>
          {km ? <Field label={t('World position')}>{t('{e} km east, {s} km south of the atlas corner', { e: Math.round(km.e / 10) * 10, s: Math.round(km.s / 10) * 10 })}</Field> : null}
          {rimuru && place.x !== null ? <Field label={t('From Rimuru')}>{formatKm(distanceKm(rimuru.x!, rimuru.y!, place.x, place.y!))}</Field> : null}
          {dwargon && place.x !== null ? <Field label={t('From Dwargon')}>{formatKm(distanceKm(dwargon.x!, dwargon.y!, place.x, place.y!))}</Field> : null}
          <Field label={t('Basis')}>{place.basis}</Field>
        </Fields>
      </Section>
      <Section title={t('Here now · {n}', { n: here.length })}>
        {here.length ? (
          <ul className="space-y-0.5 text-xs">
            {here.map((f) => <li key={f.id}><RecordLink onClick={() => jumpToForce(f.id)}>{f.displayName}</RecordLink></li>)}
          </ul>
        ) : (
          <Empty>{t('No formation stands here at this moment.')}</Empty>
        )}
      </Section>
    </div>
  );
}

export function FeatureDossier({ id }: { id: string }) {
  const t = useT();
  const data = useSimulation((s) => s.data);
  const state = useSimulation((s) => s.state);
  if (!data) return null;
  const g = data.geography;
  const road = g.roads.find((x) => x.id === id);
  const feature = road ?? g.rivers.find((x) => x.id === id) ?? g.passes.find((x) => x.id === id) ?? g.mountains.find((x) => x.id === id) ?? g.lakes.find((x) => x.id === id) ?? g.crossings.find((x) => x.id === id);
  if (!feature) return <Empty>{t('That feature is not in the geography.')}</Empty>;
  const kind = road ? t('Road') : g.rivers.some((x) => x.id === id) ? t('River') : g.passes.some((x) => x.id === id) ? t('Mountain pass') : g.mountains.some((x) => x.id === id) ? t('Mountains') : g.lakes.some((x) => x.id === id) ? t('Lake') : t('Crossing');
  const supply = road ? (state?.logistics[road.id] as SupplyState | undefined) : undefined;
  const users = data.routes.filter((r) => r.roads.includes(id) || r.passes.includes(id) || r.crossings.includes(id));
  const forces = [...new Set(users.flatMap((r) => r.uses.map((u) => u.forceId)))];
  return (
    <div>
      <Masthead kind={kind} title={feature.name} />
      <Section title={t('Feature')}>
        <Fields>
          <Field label={t('Grade')}>{GRADE_LABEL[feature.grade] ? t(GRADE_LABEL[feature.grade]) : feature.grade}</Field>
          {road ? <Field label={t('Length')}>{formatKm(road.lengthKm)}</Field> : null}
          {road ? <Field label={t('Role')}>{road.role === 'LOGISTICS' ? t('Strategic supply route') : t('Military road')}</Field> : null}
          {supply ? <Field label={t('Supply state')}>{t(SUPPLY_LABEL[supply])}</Field> : null}
          <Field label={t('Basis')}>{feature.basis}</Field>
          <Field label={t('Used by')}>{forces.length ? forces.map((f) => data.forceById.get(f)?.displayName ?? f).join(', ') : '-'}</Field>
        </Fields>
      </Section>
    </div>
  );
}

/** The operation's force ledger at the current moment, with its arithmetic. */
export function LedgerSection() {
  const t = useT();
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  if (!data || !data.ledger.points.length) return null;
  const p = ledgerAt(data, frame);
  if (!p) return null;
  const n = (v: number) => v.toLocaleString('en-GB');
  return (
    <Section title={t('Operation ledger')}>
      <Fields>
        <Field label={t('Committed')}><Figure value={p.committed} /> <span className="text-2xs text-fg-3">{t('unique personnel')}</span></Field>
        <Field label={t('Initial forward')}><Figure value={p.initialForward} /></Field>
        <Field label={t('Capital reserve')}><Figure value={p.capitalReserve} /></Field>
        <Field label={t('Dwargon Gate force')}><Figure value={p.gateForce} /></Field>
        <Field label={t('Killed')}><Figure value={p.killed} /></Field>
        <Field label={t('Revived')}><Figure value={p.revived} /></Field>
        <Field label={t('Dead, not revived')}><Figure value={p.deadNotRevived} /></Field>
        <Field label={t('Never killed')}><Figure value={p.neverKilled} /></Field>
        <Field label={t('Active or revived')}><Figure value={p.active} /></Field>
      </Fields>
      <p className="figure mt-1.5 text-2xs leading-relaxed text-fg-3">
        {n(p.committed)} − {n(p.killed)} + {n(p.revived)} = {n(p.active)}
      </p>
      <p className="mt-1 text-2xs leading-relaxed text-fg-3">
        {t('Scenario ledger of the invasion operation. A revival changes the state of soldiers already counted and never adds to the committed total. Transferred soldiers are counted once, where they are. The Magic Beast Division is a separate operation and is not in this ledger.')}
      </p>
    </Section>
  );
}
