'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import { useT } from '@/i18n';
import { msg } from '@/i18n/msg';
import { FACTION_COLOR, factionKey } from '@/lib/palette';
import { PROVENANCE_LABEL, ROUTE_LABEL, SIZE_STATUS_LABEL } from '@/lib/taxonomy';
import { useSimulation } from '@/simulation/store';
import type { Provenance, Quantity, RouteConfidence, SizeStatus, SourceRef } from '@/types/dataset';

const GROUP = new Intl.NumberFormat('en-GB');

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

/** A collapsible section with a small-caps label. Progressive disclosure, not cards. */
export function Section({ title, children, defaultOpen = true, aside }: { title: string; children: ReactNode; defaultOpen?: boolean; aside?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-t border-ink-500/70 first:border-t-0">
      <div className="flex items-center gap-2 px-3 pt-2.5">
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className="flex min-h-7 flex-1 items-center gap-1.5 text-left">
          <ChevronDown size={12} strokeWidth={2} className={`text-fg-3 transition-transform duration-150 ${open ? '' : '-rotate-90'}`} />
          <span className="eyebrow">{title}</span>
        </button>
        {aside}
      </div>
      {open ? (
        <div id={id} className="px-3 pb-3 pt-1">
          {children}
        </div>
      ) : null}
    </section>
  );
}

/** Key–value rows: a compact intelligence table. */
export function Fields({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-[minmax(84px,34%)_1fr] gap-x-3">{children}</dl>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="border-b border-ink-500/50 py-1 text-xs text-fg-3">{label}</dt>
      <dd className="border-b border-ink-500/50 py-1 text-xs text-fg">{children}</dd>
    </>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-fg-2">{children}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-1 text-xs italic leading-relaxed text-fg-3">{children}</p>;
}

/* ------------------------------------------------------------------ */
/* Evidence badges                                                     */
/* ------------------------------------------------------------------ */

/** Provenance: colour + glyph + words, never colour alone. */
const PROVENANCE_VAR: Record<Provenance, string> = {
  CANONICAL: '--prov-canon',
  CANONICAL_WITH_VISUAL_RECONSTRUCTION: '--prov-visual',
  INFERRED: '--prov-inferred',
  RECONSTRUCTED: '--prov-recon',
  UNRESOLVED: '--prov-unresolved',
};

export function ProvenanceBadge({ value, compact = false }: { value: Provenance; compact?: boolean }) {
  const t = useT();
  const label = PROVENANCE_LABEL[value];
  const color = PROVENANCE_VAR[value];
  const glyph = value === 'CANONICAL' ? '■' : value === 'CANONICAL_WITH_VISUAL_RECONSTRUCTION' ? '◧' : value === 'INFERRED' ? '◇' : value === 'RECONSTRUCTED' ? '◌' : '?';
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-[2px] border px-1.5 py-px text-2xs font-semibold uppercase tracking-label"
      style={{ borderColor: `rgb(var(${color}) / 0.45)`, color: `rgb(var(${color}))` }}
      title={t('{label}. {note}', { label: t(label.long), note: t(label.note) })}
    >
      <span aria-hidden>{glyph}</span>
      {compact ? t(label.short) : t(label.long)}
    </span>
  );
}

export function SizeBadge({ value }: { value: SizeStatus }) {
  const t = useT();
  const s = SIZE_STATUS_LABEL[value];
  return (
    <span className="inline-flex items-center rounded-[2px] border border-ink-400 px-1 py-px text-2xs uppercase tracking-label text-fg-2" title={t(s.note)}>
      {t(s.label)}
    </span>
  );
}

export function RouteBadge({ value }: { value: RouteConfidence }) {
  const t = useT();
  const s = ROUTE_LABEL[value];
  return (
    <span className="inline-flex items-center rounded-[2px] border border-ink-400 px-1 py-px text-2xs uppercase tracking-label text-fg-2" title={t(s.note)}>
      {t(s.label)}
    </span>
  );
}

const CONFIDENCE_WORD: Record<string, string> = { HIGH: msg('high'), MEDIUM: msg('medium'), LOW: msg('low'), UNKNOWN: msg('not established') };

export function ConfidenceText({ value }: { value: string }) {
  const t = useT();
  const tone = value === 'HIGH' ? 'text-fg' : value === 'MEDIUM' ? 'text-fg-2' : value === 'LOW' ? 'text-accent' : 'text-fg-3 italic';
  return <span className={tone}>{CONFIDENCE_WORD[value] ? t(CONFIDENCE_WORD[value]) : value.toLowerCase()}</span>;
}

/**
 * A figure. Unknown reads as unknown, in another tone and style, so absence
 * can never be mistaken for zero at a glance.
 */
export function Figure({ value, status, unit }: { value: Quantity; status?: SizeStatus; unit?: string }) {
  const t = useT();
  if (value === 'UNKNOWN' || status === 'UNKNOWN') return <span className="text-xs italic text-fg-3">{t('unknown')}</span>;
  const mark = status ? SIZE_STATUS_LABEL[status].mark : '';
  return (
    <span className="figure text-fg" title={status ? t(SIZE_STATUS_LABEL[status].note) : undefined}>
      {mark}
      {GROUP.format(value)}
      {unit ? <span className="ml-1 font-ui text-fg-3">{unit}</span> : null}
    </span>
  );
}

export function Sources({ refs }: { refs: SourceRef[] }) {
  const t = useT();
  if (!refs.length) return <Empty>{t('No source reference recorded.')}</Empty>;
  return (
    <ul className="space-y-0.5">
      {refs.map((r, i) => (
        <li key={i} className="flex gap-2 text-xs">
          <span className="figure shrink-0 text-accent">{r.volume.startsWith('V') ? r.volume : t('Vol. {volume}', { volume: r.volume })}</span>
          <span className="text-fg-2">{r.chapter ?? t('chapter not recorded')}</span>
          {r.locator ? <span className="figure ml-auto shrink-0 text-fg-3">{r.locator}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export function FactionDot({ faction, size = 8 }: { faction: string; size?: number }) {
  return <span aria-hidden className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: FACTION_COLOR[factionKey(faction)] }} />;
}

/** A nation flag, resolved by id through the generated manifest. Never substituted. */
export function Flag({ nationId, size = 16 }: { nationId: string | null | undefined; size?: number }) {
  const t = useT();
  const flags = useSimulation((s) => s.data?.flags);
  const [broken, setBroken] = useState(false);
  const entry = nationId ? flags?.[nationId] : undefined;
  if (!entry || broken) {
    return (
      <span
        title={entry ? t('Flag not supplied: {name}', { name: entry.name }) : t('No flag for this entity')}
        className="inline-block shrink-0 rounded-[1px] border border-ink-400"
        style={{ width: size * 1.5, height: size, backgroundImage: 'repeating-linear-gradient(45deg, rgba(212,171,87,0.25) 0 2px, transparent 2px 5px)' }}
      />
    );
  }
  return (
    <img src={entry.thumb ?? entry.asset} alt={t('Flag of {name}', { name: entry.name })} width={size * 1.5} height={size} loading="lazy" onError={() => setBroken(true)} className="inline-block shrink-0 rounded-[1px] border border-ink-400 object-cover" style={{ width: size * 1.5, height: size }} />
  );
}

/** A character photocard. Local asset only; provenance on hover. */
export function Portrait({ src, name, source, size = 56, faction }: { src: string | null; name: string; source?: string; size?: number; faction?: string }) {
  const t = useT();
  const border = faction ? FACTION_COLOR[factionKey(faction)] : '#3a4a54';
  // A card that fails to load (e.g. a moved asset) falls back to the initial, never a broken image.
  const [broken, setBroken] = useState<string | null>(null);
  if (!src || broken === src) {
    return (
      <span className="grid shrink-0 place-items-center rounded-[3px] border bg-ink-700 font-display text-fg-3" style={{ width: size, height: (size * 17) / 11, borderColor: border, fontSize: size * 0.4 }} title={t('No photocard in the repository for {name}', { name })}>
        {name.slice(0, 1)}
      </span>
    );
  }
  return (
    <img src={src} alt={t('Photocard of {name}', { name })} title={source ? t('Photocard source: {source}', { source }) : undefined} loading="lazy" onError={() => setBroken(src)} className="shrink-0 rounded-[3px] border bg-white object-cover" style={{ width: size, height: (size * 17) / 11, borderColor: border }} />
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

export function Toggle({ checked, onChange, label, note }: { checked: boolean; onChange: (v: boolean) => void; label: string; note?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 rounded-[3px] px-1.5 py-1.5 hover:bg-ink-700/60">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#d4ab57]" />
      <span className="min-w-0">
        <span className="block text-sm leading-tight text-fg">{label}</span>
        {note ? <span className="mt-0.5 block text-2xs leading-snug text-fg-3">{note}</span> : null}
      </span>
    </label>
  );
}

export function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  const id = useId();
  return (
    <div className="px-1.5 py-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs text-fg-2">{label}</label>
        <span className="figure text-2xs text-fg-3">{format ? format(value) : value}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[#d4ab57]" />
    </div>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1.5 py-1">
      <span className="text-xs text-fg-2">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex overflow-hidden rounded-[3px] border border-ink-500">
        {options.map((o, i) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={`h-7 min-w-8 px-2 text-xs ${i ? 'border-l border-ink-500' : ''} ${value === o.id ? 'bg-accent/15 text-fg' : 'text-fg-3 hover:text-fg'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** An inline link to another record in the atlas. */
export function RecordLink({ onClick, children, title }: { onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button type="button" dir="auto" onClick={onClick} title={title} className="text-start text-fg underline decoration-ink-400 underline-offset-2 hover:text-accent hover:decoration-accent">
      {children}
    </button>
  );
}
