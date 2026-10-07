import { msg } from '@/i18n/msg';
import type { Confidence, Quantity } from '@/types/dataset';

const GROUP = new Intl.NumberFormat('en-GB');

/**
 * Renders a quantity. An unknown quantity is shown as unknown, never as zero
 * and never as an estimate. This is the single place the interface decides how
 * absence looks, so absence cannot quietly become a number anywhere else.
 * The word 'unknown' is msg()-marked: render the result with t(...).
 */
export function quantity(value: Quantity): string {
  if (value === 'UNKNOWN' || value === undefined || value === null) return msg('unknown');
  return GROUP.format(value);
}

/** Compact form for map labels: 940,000 -> 940k, 2,000,000 -> 2.0m. */
export function compactQuantity(value: Quantity): string {
  if (value === 'UNKNOWN' || value === undefined || value === null) return '?';
  const n = Math.abs(value);
  if (n >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (n >= 10_000) return `${Math.round(value / 1000)}k`;
  if (n >= 1_000) return `${(value / 1000).toFixed(1)}k`;
  return GROUP.format(value);
}

export function isKnown(value: Quantity): value is number {
  return typeof value === 'number';
}

/** Frame index -> clock window inside the simulation day. */
export function frameClock(frame: number, framesPerDay = 144, minutesPerFrame = 10): string {
  const inDay = ((frame % framesPerDay) + framesPerDay) % framesPerDay;
  const startMinutes = inDay * minutesPerFrame;
  const endMinutes = startMinutes + minutesPerFrame;
  return `${hhmm(startMinutes)}\u2013${hhmm(Math.min(endMinutes, 24 * 60 - 1))}`;
}

export function frameTimeStart(frame: number, framesPerDay = 144, minutesPerFrame = 10): string {
  const inDay = ((frame % framesPerDay) + framesPerDay) % framesPerDay;
  return hhmm(inDay * minutesPerFrame);
}

function hhmm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Campaign day as the dataset writes it: C+00, C+32. */
export function campaignDayLabel(day: number): string {
  return `C+${String(Math.max(0, day)).padStart(2, '0')}`;
}

/** Battle day relative to first contact: D-40, D+0, D+7. */
export function battleDayLabel(day: number): string {
  if (day < 0) return `D\u2212${String(Math.abs(day)).padStart(2, '0')}`;
  return `D+${String(day).padStart(2, '0')}`;
}

/** Elapsed campaign clock, C+DD:HH:MM. */
export function campaignClock(frame: number, framesPerDay = 144, minutesPerFrame = 10): string {
  const day = Math.floor(frame / framesPerDay);
  const inDay = frame % framesPerDay;
  const minutes = inDay * minutesPerFrame;
  return `C+${String(day).padStart(2, '0')}:${hhmm(minutes)}`;
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Readable phase name: ACTIVE_COMBAT -> Active combat. */
export function phaseLabel(value: string): string {
  if (!value) return msg('Unknown phase');
  const cleaned = value.replace(/^PHASE_\d+_/, '').replace(/_/g, ' ').toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function confidenceLabel(value: Confidence): string {
  switch (value) {
    case 'HIGH':
      return msg('High confidence');
    case 'MEDIUM':
      return msg('Medium confidence');
    case 'LOW':
      return msg('Low confidence');
    default:
      return msg('Confidence not established');
  }
}

/**
 * Maps the dataset's own provenance vocabulary onto the four source grades the
 * interface displays. The mapping is deliberately conservative: anything not
 * explicitly canonical is shown as reconstructed or simulated.
 */
export function sourceGrade(basis: string | null | undefined): 'CANONICAL' | 'RECONSTRUCTED' | 'SIMULATION' | 'UNKNOWN' {
  const b = (basis ?? '').toUpperCase();
  if (!b) return 'UNKNOWN';
  if (b.includes('SIMULATION')) return 'SIMULATION';
  if (b.includes('INFERRED') || b.includes('RECONCILED') || b.includes('ROLL_UP') || b.includes('RECONSTRUCT')) {
    return 'RECONSTRUCTED';
  }
  if (b.includes('CANON') || b.includes('DIRECTLY_STATED') || b.includes('EXPLICIT')) return 'CANONICAL';
  if (b.includes('UNKNOWN')) return 'UNKNOWN';
  return 'RECONSTRUCTED';
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}\u2026`;
}
