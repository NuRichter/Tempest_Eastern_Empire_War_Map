'use client';

import { X } from 'lucide-react';

import { FACTION_COLOR, FACTION_DEEP, INK } from '@/lib/palette';
import { BATTLE_TYPE_LABEL, ROLE_LABEL, ROUTE_LABEL, SIZE_STATUS_LABEL } from '@/lib/taxonomy';
import { useSimulation } from '@/simulation/store';
import { PROVENANCE_ORDER, type BattleType } from '@/types/dataset';
import { ProvenanceBadge } from '@/components/ui/primitives';

function Row({ swatch, label, note }: { swatch: React.ReactNode; label: string; note?: string }) {
  return (
    <li className="flex items-start gap-2.5 py-1">
      <span className="grid h-5 w-8 shrink-0 place-items-center">{swatch}</span>
      <span className="min-w-0">
        <span className="block text-xs text-fg">{label}</span>
        {note ? <span className="block text-2xs leading-snug text-fg-3">{note}</span> : null}
      </span>
    </li>
  );
}

const Fill = ({ color, opacity = 0.6, hatch = false }: { color: string; opacity?: number; hatch?: boolean }) => (
  <svg width="30" height="16" aria-hidden>
    <defs>
      <pattern id={`h-${color.slice(1)}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke={hatch ? INK.accent : 'transparent'} strokeWidth="2" />
      </pattern>
    </defs>
    <rect x="1" y="1" width="28" height="14" fill={color} fillOpacity={opacity} stroke={color} />
    {hatch ? <rect x="1" y="1" width="28" height="14" fill={`url(#h-${color.slice(1)})`} /> : null}
  </svg>
);

const Line = ({ dash, opacity = 1 }: { dash?: string; opacity?: number }) => (
  <svg width="30" height="12" aria-hidden>
    <line x1="2" y1="6" x2="22" y2="6" stroke={FACTION_COLOR.empire} strokeWidth="2.5" strokeDasharray={dash} opacity={opacity} />
    <path d="M22 1.5 L29 6 L22 10.5 Z" fill={FACTION_COLOR.empire} opacity={opacity} />
  </svg>
);

const Shape = ({ d, color, deep, dashed = false }: { d: string; color: string; deep: string; dashed?: boolean }) => (
  <svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden>
    <path d={d} fill={deep} stroke={color} strokeWidth="1.6" strokeDasharray={dashed ? '3 2' : undefined} />
  </svg>
);

/** The event marker: a dark centre in a ring of short ticks. */
const EventRing = ({ stroke, broken = false }: { stroke: string; broken?: boolean }) => (
  <svg width="18" height="18" viewBox="-9 -9 18 18" aria-hidden>
    <circle r="4.3" fill="rgba(12,16,18,0.62)" />
    {Array.from({ length: 16 }, (_, i) => i)
      .filter((i) => !broken || i % 2 === 0)
      .map((i) => {
        const a = (i / 16) * Math.PI * 2;
        return <line key={i} x1={Math.cos(a) * 5.5} y1={Math.sin(a) * 5.5} x2={Math.cos(a) * 8} y2={Math.sin(a) * 8} stroke={stroke} strokeWidth="1.2" strokeLinecap="round" opacity={broken ? 0.75 : 1} />;
      })}
  </svg>
);

const SHAPES = {
  square: 'M-7-7H7V7H-7Z',
  circle: 'M0-8A8 8 0 1 1 0 8A8 8 0 1 1 0-8Z',
  diamond: 'M0-9L9 0L0 9L-9 0Z',
  triangle: 'M0-9L8 6H-8Z',
};

const BATTLE_GLYPH: Partial<Record<BattleType, string>> = {
  MAJOR_BATTLE: 'M-6-6L6 6M6-6L-6 6',
  SIEGE: 'M0-5A5 5 0 1 1 0 5A5 5 0 1 1 0-5ZM0-8V-6M0 6V8M-8 0H-6M6 0H8',
  INTERCEPTION: 'M-6-4L0 4L6-4',
  DEFENSIVE_ACTION: 'M0-7L6-4L5 3L0 7L-5 3L-6-4Z',
  SPECIAL_COMBAT: 'M0-8L2-2L8 0L2 2L0 8L-2 2L-8 0L-2-2Z',
  POLITICAL_EVENT: 'M-4 7V-7L6-3L-4 1',
};

/** The map's key. Labels use the dataset's own vocabulary. */
export function Legend() {
  const open = useSimulation((s) => s.legendOpen);
  const setOpen = useSimulation((s) => s.setLegendOpen);
  if (!open) return null;
  return (
    <aside className="surface absolute right-3 top-14 z-40 max-h-[calc(100dvh-14rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[4px] lg:right-[25rem]" aria-label="Map legend">
      <div className="sticky top-0 flex items-center justify-between border-b border-ink-500 bg-ink-800 px-3 py-2">
        <h2 className="text-sm font-semibold text-fg">Legend</h2>
        <button type="button" onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center text-fg-3 hover:text-fg" aria-label="Close legend">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-3 p-3">
        <section>
          <p className="eyebrow">Territory</p>
          <ul className="mt-1">
            <Row swatch={<Fill color={FACTION_COLOR.empire} opacity={0.55} />} label={ROLE_LABEL.BELLIGERENT} note="A principal party at this moment; borders traced from the Base Map." />
            <Row swatch={<Fill color={FACTION_COLOR.dwargon} opacity={0.4} />} label={ROLE_LABEL.CO_BELLIGERENT} note="Fights beside a party, or is attacked by one." />
            <Row swatch={<Fill color={FACTION_COLOR.neutral} opacity={0.25} />} label={ROLE_LABEL.CONTRIBUTOR} note="Contributes individuals or a small element." />
            <Row swatch={<Fill color="#6b757a" opacity={0.12} />} label={ROLE_LABEL.UNINVOLVED} note="Inactive territory." />
            <Row swatch={<Fill color={FACTION_COLOR.unknown} opacity={0.25} hatch />} label="Unknown control" note="Never drawn as any faction's colour." />
            <Row swatch={<Fill color={FACTION_COLOR.empire} opacity={0.86} />} label="Held by the other side (reconstructed)" note="Ground held around the armies, synthesised from force positions and strengths. The white line is the front." />
            <Row swatch={<Fill color={INK.accent} opacity={0.35} hatch />} label="Contested" note="Where the two sides' hold is nearly even, or a schematic theatre area is contested." />
            <Row swatch={<svg width="30" height="12" aria-hidden><line x1="2" y1="6" x2="28" y2="6" stroke={INK.accent} strokeWidth="2" strokeDasharray="2 2" /></svg>} label="Reconstructed control change" note="A change of control the source does not state exactly." />
          </ul>
        </section>
        <section>
          <p className="eyebrow">Forces</p>
          <ul className="mt-1">
            <Row swatch={<Shape d={SHAPES.square} color={FACTION_COLOR.empire} deep={FACTION_DEEP.empire} />} label="Eastern Empire" note="Square marker." />
            <Row swatch={<Shape d={SHAPES.circle} color={FACTION_COLOR.tempest} deep={FACTION_DEEP.tempest} />} label="Jura-Tempest Federation" note="Circle marker." />
            <Row swatch={<Shape d={SHAPES.diamond} color={FACTION_COLOR.dwargon} deep={FACTION_DEEP.dwargon} />} label="Armed Nation of Dwargon" note="Diamond marker." />
            <Row swatch={<Shape d={SHAPES.triangle} color={FACTION_COLOR.neutral} deep={FACTION_DEEP.neutral} />} label="Other contributors" note="Triangle marker." />
            <Row swatch={<Shape d={SHAPES.circle} color={FACTION_COLOR.tempest} deep={FACTION_DEEP.tempest} dashed />} label="Strength unknown" note="Broken outline. Shown as “?”, never as zero." />
            {(['EXPLICIT', 'DERIVED', 'RECONSTRUCTED', 'UNKNOWN'] as const).map((s) => (
              <Row key={s} swatch={<span className="figure text-xs text-fg">{SIZE_STATUS_LABEL[s].mark || '940k'}</span>} label={`Size ${SIZE_STATUS_LABEL[s].label.toLowerCase()}`} note={SIZE_STATUS_LABEL[s].note} />
            ))}
          </ul>
        </section>
        <section>
          <p className="eyebrow">Movement</p>
          <ul className="mt-1">
            <Row swatch={<Line />} label={ROUTE_LABEL.SOLID.label} note={ROUTE_LABEL.SOLID.note} />
            <Row swatch={<Line dash="5 3" opacity={0.85} />} label={ROUTE_LABEL.RECONSTRUCTED.label} note={ROUTE_LABEL.RECONSTRUCTED.note} />
            <Row swatch={<Line dash="1 3" opacity={0.6} />} label={ROUTE_LABEL.SCHEMATIC.label} note={ROUTE_LABEL.SCHEMATIC.note} />
            <Row swatch={<span className="text-xs text-fg-3">—</span>} label={ROUTE_LABEL.UNKNOWN.label} note={ROUTE_LABEL.UNKNOWN.note} />
          </ul>
        </section>
        <section>
          <p className="eyebrow">Battles</p>
          <ul className="mt-1">
            {(Object.keys(BATTLE_GLYPH) as BattleType[]).map((t) => (
              <Row
                key={t}
                swatch={
                  <svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden>
                    <circle r="9" fill="none" stroke={INK.alert} strokeWidth="1.2" />
                    <path d={BATTLE_GLYPH[t]} fill="none" stroke="#f2d7d2" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                }
                label={BATTLE_TYPE_LABEL[t]}
              />
            ))}
          </ul>
        </section>
        <section>
          <p className="eyebrow">Events</p>
          <ul className="mt-1">
            <Row swatch={<EventRing stroke="#ffffff" />} label="Event" note="Pops in when reached; its label shows for about two seconds, then the ring fades over a simulated day." />
            <Row swatch={<EventRing stroke="#f3d58d" />} label="Turning point" note="Gold ring; stays on the map, numbered by rank." />
            <Row swatch={<EventRing stroke="#ffffff" broken />} label="Reconstructed or inferred event" note="Broken ring." />
          </ul>
        </section>
        <section>
          <p className="eyebrow">Source confidence</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {PROVENANCE_ORDER.map((p) => (
              <li key={p}><ProvenanceBadge value={p} /></li>
            ))}
          </ul>
          <p className="mt-2 text-2xs leading-relaxed text-fg-3">On the timeline, hatched stretches are gaps the record does not fill (gold: low confidence). Times are simulation placements on a 10-minute grid. Coordinates are simulation coordinates on a fictional map, not latitude and longitude.</p>
        </section>
      </div>
    </aside>
  );
}
