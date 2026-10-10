'use client';

import { useMemo } from 'react';

import { useT } from '@/i18n';
import { battleDayLabel, phaseLabel } from '@/lib/format';
import { FACTION_COLOR, factionKey } from '@/lib/palette';
import { currentEvent } from '@/simulation/resolver';
import { useSimulation } from '@/simulation/store';
import { Flag, ProvenanceBadge, RecordLink } from '@/components/ui/primitives';
import { RollingNumber } from '@/components/ui/RollingNumber';
import type { Character } from '@/types/dataset';

/** How long (frames, 10 min each) an event's people stay on the card after it happens. */
const HOT_FRAMES = 18;

const NATION_OF: Record<string, string> = {
  empire: 'nasca-namrium-ulmeria',
  tempest: 'jura-tempest-federation',
  dwargon: 'dwargon',
};

/**
 * The first thing on the panel: who is fighting whom, what it has cost, how
 * far the story has run, and who is at the centre of the latest event.
 */
export function SituationBar() {
  const t = useT();
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const state = useSimulation((s) => s.state);
  const jumpToEvent = useSimulation((s) => s.jumpToEvent);
  const jumpToCharacter = useSimulation((s) => s.jumpToCharacter);

  const latest = data ? currentEvent(data, frame) : null;
  const done = useMemo(() => (data ? data.events.filter((e) => e.frame <= frame).length : 0), [data, frame]);
  // Dwargon joins the allied side once it has acted in the war.
  const dwargonIn = useMemo(() => Boolean(data?.events.some((e) => e.frame <= frame && (factionKey(e.actorFaction) === 'dwargon' || factionKey(e.opponentFaction) === 'dwargon'))), [data, frame]);

  if (!data || !state) return null;
  const day = data.timeline.battleDay[frame];
  const minutes = (frame % 144) * 10;
  const clock = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const cas = state.casualties;

  // The people of the latest event, while it is still fresh, split by side.
  const hot = latest && frame - latest.frame <= HOT_FRAMES ? latest.characterIds.map((id) => data.characterById.get(id)).filter((c): c is Character => Boolean(c)) : [];
  const sideA = hot.filter((c) => factionKey(c.faction) === 'empire').slice(0, 2);
  const sideB = hot.filter((c) => factionKey(c.faction) !== 'empire').slice(0, 2);
  const allies = [{ key: 'tempest', name: 'Jura Tempest Federation' }, ...(dwargonIn ? [{ key: 'dwargon', name: 'Armed Nation of Dwargon' }] : [])];
  const engaged = latest ? new Set([factionKey(latest.actorFaction), factionKey(latest.opponentFaction)]) : new Set<string>();

  return (
    <section aria-label={t('Situation')} className="border-b border-ink-500/70 px-3 pb-3 pt-3">
      <div className="flex items-stretch gap-2">
        <SideCard color={FACTION_COLOR.empire} nation={NATION_OF.empire} names={['Eastern Empire']} active={engaged.has('empire')} />
        <span className="self-center font-display text-xs font-semibold uppercase tracking-label text-fg-3">{t('vs')}</span>
        <SideCard color={FACTION_COLOR.tempest} nation={allies.map((a) => NATION_OF[a.key])} names={allies.map((a) => a.name)} active={engaged.has('tempest') || engaged.has('dwargon')} align="end" />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[3px] bg-ink-700/60 px-1.5 py-1.5">
          <dt className="eyebrow">{t('Killed')}</dt>
          <dd className="mt-0.5 flex items-baseline justify-center gap-1 text-xs">
            <span style={{ color: FACTION_COLOR.empire }} title="Eastern Empire">
              <RollingNumber value={cas.empire.kia} className="figure" />
            </span>
            <span className="text-fg-3">·</span>
            <span style={{ color: FACTION_COLOR.tempest }} title="Jura Tempest Federation">
              <RollingNumber value={cas.tempest.kia} className="figure" />
            </span>
          </dd>
        </div>
        <div className="rounded-[3px] bg-ink-700/60 px-1.5 py-1.5">
          <dt className="eyebrow">{t('Events')}</dt>
          <dd className="figure mt-0.5 text-xs text-fg">
            {done}
            <span className="text-fg-3"> / {data.events.length}</span>
          </dd>
        </div>
        <div className="rounded-[3px] bg-ink-700/60 px-1.5 py-1.5">
          <dt className="eyebrow">{t('Now')}</dt>
          <dd className="figure mt-0.5 text-xs text-fg">
            {battleDayLabel(day)} <span className="text-fg-3">{clock}</span>
          </dd>
        </div>
      </dl>
      <p className="mt-1.5 truncate text-center text-2xs text-fg-3">
        {t(phaseLabel(state.phase))} · {t(phaseLabel(state.stage))}
      </p>

      {latest ? (
        <div className="mt-2.5">
          <p className="eyebrow">{t('Latest event')}</p>
          <p className="mt-0.5 text-sm leading-snug">
            <RecordLink onClick={() => jumpToEvent(latest.id, { seek: false })}>{latest.title}</RecordLink>
          </p>
          <div className="mt-1 flex items-center gap-2 text-2xs text-fg-3">
            <span className="figure">{latest.warDay} {latest.simulationTime}</span>
            <ProvenanceBadge value={latest.provenance} compact />
          </div>
        </div>
      ) : null}

      {!sideA.length && !sideB.length ? (
        <div className="mt-2.5 flex items-center gap-2.5 rounded-[3px] bg-ink-700/40 px-2 py-1.5">
          <img src="/assets/theme/chibi/slime-leaves.webp" alt="" width={44} height={44} loading="lazy" className="h-11 w-auto shrink-0" />
          <p className="text-2xs leading-snug text-fg-3">{t('Nobody is in the spotlight right now. Play on, or jump to the next event.')}</p>
        </div>
      ) : null}

      {sideA.length || sideB.length ? (
        <div className="mt-2.5 flex items-center justify-center gap-2" aria-label={t('People in this event')}>
          <Cards people={sideA} onPick={jumpToCharacter} />
          {sideA.length && sideB.length ? <span className="font-display text-xs font-semibold uppercase tracking-label text-alert">{t('vs')}</span> : null}
          <Cards people={sideB} onPick={jumpToCharacter} />
        </div>
      ) : null}
    </section>
  );
}

function SideCard({ color, nation, names, active, align = 'start' }: { color: string; nation: string | string[]; names: string[]; active: boolean; align?: 'start' | 'end' }) {
  const nations = Array.isArray(nation) ? nation : [nation];
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col gap-1 rounded-[3px] border bg-ink-700/50 px-2 py-1.5 ${align === 'end' ? 'items-end text-right' : ''}`}
      style={{ borderColor: active ? color : 'transparent', boxShadow: `inset ${align === 'end' ? '-3px' : '3px'} 0 0 ${color}` }}
    >
      <span className="flex items-center gap-1">
        {nations.map((n) => (
          <Flag key={n} nationId={n} size={20} />
        ))}
      </span>
      {names.map((n) => (
        <span key={n} className="w-full truncate text-xs font-semibold leading-tight text-fg">
          {n}
        </span>
      ))}
    </div>
  );
}

function Cards({ people, onPick }: { people: Character[]; onPick: (id: string) => void }) {
  return (
    <span className="flex gap-1">
      {people.map((c) => {
        const color = FACTION_COLOR[factionKey(c.faction)];
        return (
          <button key={c.id} type="button" onClick={() => onPick(c.id)} className="group flex w-18 flex-col items-center gap-0.5" title={c.name}>
            {c.photocard ? (
              <img
                src={c.photocard.thumb ?? c.photocard.src}
                alt={c.name}
                loading="lazy"
                width={72}
                height={111}
                onError={(e) => {
                  // Thumbnail missing: try the full card once, then hide the image (the name stays).
                  const img = e.currentTarget;
                  if (c.photocard && img.src.includes('/thumb/')) img.src = c.photocard.src;
                  else img.style.visibility = 'hidden';
                }}
                className="h-[111px] w-18 rounded-[3px] border-2 bg-white object-cover transition-transform group-hover:-translate-y-0.5" style={{ borderColor: color }} />
            ) : (
              <span className="grid h-[111px] w-18 place-items-center rounded-[3px] border-2 bg-ink-700 font-display text-lg text-fg-3" style={{ borderColor: color }}>
                {c.name.slice(0, 1)}
              </span>
            )}
            <span className="w-full truncate text-center text-2xs text-fg-2">{c.name}</span>
          </button>
        );
      })}
    </span>
  );
}

/** The closed panel's button: the situation in one line (flags, killed, day). */
export function SituationChip() {
  const t = useT();
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const state = useSimulation((s) => s.state);
  if (!data || !state) return <span>{t('Situation')}</span>;
  const cas = state.casualties;
  return (
    <span className="flex items-center gap-1.5 text-2xs">
      <Flag nationId={NATION_OF.empire} size={12} />
      <span className="figure" style={{ color: FACTION_COLOR.empire }}>
        <RollingNumber value={cas.empire.kia} />
      </span>
      <span className="text-fg-3">{t('vs')}</span>
      <Flag nationId={NATION_OF.tempest} size={12} />
      <span className="figure" style={{ color: FACTION_COLOR.tempest }}>
        <RollingNumber value={cas.tempest.kia} />
      </span>
      <span className="figure hidden text-fg-2 min-[380px]:inline">{battleDayLabel(data.timeline.battleDay[frame])}</span>
    </span>
  );
}
