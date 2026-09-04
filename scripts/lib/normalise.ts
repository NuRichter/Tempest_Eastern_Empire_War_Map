/**
 * Normalisation primitives shared by the build-time compiler and validators.
 *
 * The workbook is authored for humans: every cell is a string, absence is
 * spelled several different ways, and "unknown" is a first-class value that
 * must survive into the runtime dataset intact. Nothing here ever turns an
 * unknown into a zero.
 */

import type { Confidence, Quantity } from '../../src/types/dataset';

export const UNKNOWN = 'UNKNOWN' as const;

/** Spellings of "this cell carries no value". */
const EMPTY_TOKENS = new Set(['', '-', '--', 'n/a', 'none', 'null', 'undefined']);

/** Spellings of "the corpus does not establish this". */
const UNKNOWN_TOKENS = new Set([
  'unknown',
  'not stated',
  'not specified',
  'not given',
  'n/a (not a running total)',
]);

export function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

/** Text, or null where the cell is one of the empty spellings. */
export function optionalText(value: unknown): string | null {
  const t = text(value);
  if (EMPTY_TOKENS.has(t.toLowerCase())) return null;
  return t;
}

/**
 * A quantity, or the literal UNKNOWN.
 *
 * Throws on a value that looks numeric but is not finite, so that a malformed
 * cell fails the build rather than reaching the browser as NaN.
 */
export function quantity(value: unknown, field: string): Quantity {
  const t = text(value);
  const lower = t.toLowerCase();
  if (EMPTY_TOKENS.has(lower)) return UNKNOWN;
  if (UNKNOWN_TOKENS.has(lower)) return UNKNOWN;
  if (lower.startsWith('unknown')) return UNKNOWN;
  if (lower.startsWith('n/a')) return UNKNOWN;

  const cleaned = t.replace(/[,\s]/g, '').replace(/\+$/, '');
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    const n = Number(cleaned);
    if (!Number.isFinite(n)) {
      throw new Error(`Non-finite quantity in ${field}: ${JSON.stringify(t)}`);
    }
    return n;
  }
  // Text that carries no number is not a number. Report it rather than guess.
  return UNKNOWN;
}

/** An integer that must exist. Used for frame indices and counts. */
export function requiredInt(value: unknown, field: string): number {
  const t = text(value).replace(/[,\s]/g, '');
  const n = Number(t);
  if (!Number.isInteger(n)) {
    throw new Error(`Expected an integer in ${field}, received ${JSON.stringify(text(value))}`);
  }
  return n;
}

export function confidence(value: unknown): Confidence {
  const t = text(value).toUpperCase();
  if (t === 'HIGH' || t === 'MEDIUM' || t === 'LOW') return t;
  return UNKNOWN;
}

/** FRAME_5799 -> 5798 (zero-based index). Frame ids in the workbook are 1-based. */
export function frameIdToIndex(frameId: unknown, field: string): number {
  const t = text(frameId);
  const m = /^FRAME_(\d+)$/.exec(t);
  if (!m) throw new Error(`Malformed frame id in ${field}: ${JSON.stringify(t)}`);
  return Number(m[1]) - 1;
}

/** Same, but returns null where the sheet records "not applicable" instead of a frame. */
export function optionalFrameIndex(frameId: unknown, field: string): number | null {
  const t = text(frameId);
  if (!t) return null;
  const lower = t.toLowerCase();
  if (EMPTY_TOKENS.has(lower) || lower.startsWith('n/a') || lower.startsWith('unknown')) return null;
  return frameIdToIndex(frameId, field);
}

export function indexToFrameId(index: number): string {
  return `FRAME_${String(index + 1).padStart(4, '0')}`;
}

/** Splits "A; B; C" or "A || B" or "A, B" into trimmed, de-duplicated parts. */
export function splitList(value: unknown, separators: RegExp = /\s*(?:;|\|\|)\s*/): string[] {
  const t = text(value);
  if (!t || EMPTY_TOKENS.has(t.toLowerCase())) return [];
  const parts = t
    .split(separators)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !EMPTY_TOKENS.has(p.toLowerCase()));
  return Array.from(new Set(parts));
}

/** Parses "Dwargon Gate: FORMING || Imperial Capital: ACTIVE" into a map. */
export function parseLabelledSegments(value: unknown): Map<string, string> {
  const out = new Map<string, string>();
  for (const segment of splitList(value)) {
    const idx = segment.indexOf(':');
    if (idx === -1) continue;
    const label = segment.slice(0, idx).trim();
    const body = segment.slice(idx + 1).trim();
    if (label) out.set(label, body);
  }
  return out;
}

/** Two values are equal for delta purposes when their JSON is identical. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return false;
}

/** Builds a dictionary-encoded column from a list of strings. */
export function encodeColumn(values: string[]): { dict: string[]; idx: number[] } {
  const dict: string[] = [];
  const lookup = new Map<string, number>();
  const idx = values.map((v) => {
    let i = lookup.get(v);
    if (i === undefined) {
      i = dict.length;
      dict.push(v);
      lookup.set(v, i);
    }
    return i;
  });
  return { dict, idx };
}

export function slug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
