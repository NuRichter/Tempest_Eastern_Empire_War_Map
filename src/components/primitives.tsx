'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import { quantity } from '@/lib/format';
import { useSimulation } from '@/simulation/store';
import type { Quantity, SourceGrade } from '@/types/dataset';

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function Panel({
  title,
  subtitle,
  children,
  defaultOpen = true,
  dense = false,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  dense?: boolean;
  action?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border border-chart-rule/30 bg-ink-850/85 backdrop-blur-sm">
      <header className="flex items-center gap-2 border-b border-chart-rule/25 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass"
          aria-expanded={open}
        >
          <ChevronDown
            size={13}
            strokeWidth={2}
            className={`shrink-0 text-brass transition-transform ${open ? '' : '-rotate-90'}`}
          />
          <span className="font-atlas text-[13px] tracking-wide text-chart-paper">{title}</span>
          {subtitle ? <span className="truncate text-tiny text-chart-faint">{subtitle}</span> : null}
        </button>
        {action}
      </header>
      {open ? <div className={dense ? 'px-3 py-2' : 'px-3 py-3'}>{children}</div> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Source transparency                                                 */
/* ------------------------------------------------------------------ */

const GRADE_STYLE: Record<SourceGrade, { label: string; className: string; title: string }> = {
  CANONICAL: {
    label: 'canonical',
    className: 'border-tempest-pale/50 text-tempest-pale',
    title: 'Stated by the source corpus.',
  },
  RECONSTRUCTED: {
    label: 'reconstructed',
    className: 'border-brass/50 text-brass',
    title: 'Derived by the Step 1 reconstruction from canonical statements.',
  },
  SIMULATION: {
    label: 'simulation',
    className: 'border-dwargon-pale/50 text-dwargon-pale',
    title: 'A placement made so the campaign can be rendered. Not canon.',
  },
  UNKNOWN: {
    label: 'unknown',
    className: 'border-unknown/60 text-chart-faint',
    title: 'Not established by the corpus. Deliberately left unknown.',
  },
};

export function SourceBadge({ grade, note }: { grade: SourceGrade; note?: string }) {
  const style = GRADE_STYLE[grade] ?? GRADE_STYLE.UNKNOWN;
  return (
    <span
      className={`inline-flex shrink-0 items-center border px-1.5 py-px font-figure text-micro ${style.className}`}
      title={note ? `${style.title} ${note}` : style.title}
    >
      {style.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(78px,32%)_1fr] gap-x-3 gap-y-0.5 py-[3px]">
      <dt className="font-ui text-tiny leading-relaxed text-chart-faint">{label}</dt>
      <dd className="font-ui text-tiny leading-relaxed text-chart-paper">{children}</dd>
    </div>
  );
}

export function Fields({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-chart-rule/15">{children}</dl>;
}

/**
 * A figure. Unknown reads as unknown, in a different colour and a different
 * weight, so a reader can never mistake absence for zero at a glance.
 */
export function Figure({ value, unit }: { value: Quantity; unit?: string }) {
  if (value === 'UNKNOWN') {
    return <span className="font-ui text-chart-faint italic">unknown</span>;
  }
  return (
    <span className="font-figure tabular-nums text-chart-paper">
      {quantity(value)}
      {unit ? <span className="ml-1 text-chart-faint">{unit}</span> : null}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Flags                                                               */
/* ------------------------------------------------------------------ */

/**
 * A nation flag, resolved by nation id through the generated manifest.
 *
 * Filenames never appear in components. When the asset is absent the tile says
 * which nation's flag is missing; it is never replaced by another nation's.
 */
export function Flag({ nationId, size = 18 }: { nationId: string | null | undefined; size?: number }) {
  const flags = useSimulation((s) => s.data?.flags);
  const [broken, setBroken] = useState(false);
  const entry = nationId ? flags?.[nationId] : undefined;

  if (!nationId || !entry || broken) {
    const label = entry?.name ?? nationId ?? 'no nation';
    return (
      <span
        title={entry ? `Flag not supplied: ${entry.name}` : 'No flag declared for this entity.'}
        aria-label={entry ? `Flag not supplied for ${entry.name}` : 'No flag'}
        className="inline-block shrink-0 border border-chart-rule/50"
        style={{
          width: size * 1.5,
          height: size,
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(160,138,82,0.22) 0 3px, transparent 3px 6px)',
        }}
      >
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <img
      src={entry.asset}
      alt={`Flag of ${entry.name}`}
      title={entry.name}
      width={size * 1.5}
      height={size}
      onError={() => setBroken(true)}
      className="inline-block shrink-0 border border-chart-rule/40 object-cover"
      style={{ width: size * 1.5, height: size }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-2 font-ui text-tiny leading-relaxed text-chart-faint">{children}</p>;
}

export function Prose({ children }: { children: ReactNode }) {
  return <p className="font-ui text-tiny leading-relaxed text-chart-paper/85">{children}</p>;
}

export function RowButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-full border-l-2 px-2 py-1.5 text-left transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass ${
        active
          ? 'border-l-brass bg-ink-700/70'
          : 'border-l-transparent hover:border-l-chart-rule/60 hover:bg-ink-700/40'
      }`}
    >
      {children}
    </button>
  );
}
