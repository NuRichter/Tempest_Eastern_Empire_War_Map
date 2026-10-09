/**
 * Validation for everything that comes from outside the build: the address
 * bar, localStorage, and links that come from data. Untrusted input becomes
 * a known-good value or nothing. Never echo it raw into the DOM or a URL.
 */

/** A finite integer within [min, max], or null. Accepts only plain decimal digits. */
export function intParam(raw: string | null, min: number, max: number): number | null {
  if (raw === null || !/^-?\d{1,7}$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
}

/**
 * A plain integer clamped into [min, max] (an old link past the end lands on
 * the end), or null when the text is not a plain integer at all.
 */
export function clampedIntParam(raw: string | null, min: number, max: number): number | null {
  if (raw === null || !/^-?\d{1,9}$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? Math.min(max, Math.max(min, n)) : null;
}

/** One of the allowed values, or null. */
export function enumParam<T extends string>(raw: string | null, allowed: readonly T[]): T | null {
  return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

/** A record id (EVT-0015, F-EMP-012, jura-tempest-federation): short, plain characters only. */
export function idParam(raw: string | null): string | null {
  return raw !== null && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(raw) ? raw : null;
}

/**
 * A link that came from data, safe to put in href: https only, no
 * credentials in it, no javascript:, data:, vbscript: or relative tricks.
 */
export function safeExternalHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Host name of a safe link, for display. */
export function hostOf(href: string): string {
  return new URL(href).hostname;
}

/**
 * Restores stored settings against their defaults: a stored value is kept
 * only when it has the same type (and, for nested objects, the same keys) as
 * the default. A tampered or corrupted localStorage cannot introduce new
 * keys, wrong types or oversized values.
 */
export function sanitizeLike<T>(stored: unknown, defaults: T, depth = 0): T {
  if (depth > 4 || stored === null || stored === undefined) return defaults;
  if (Array.isArray(defaults)) return (Array.isArray(stored) ? stored.slice(0, 200) : defaults) as T;
  if (typeof defaults === 'object' && defaults !== null) {
    if (typeof stored !== 'object' || Array.isArray(stored)) return defaults;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(defaults as Record<string, unknown>)) {
      out[key] = sanitizeLike((stored as Record<string, unknown>)[key], (defaults as Record<string, unknown>)[key], depth + 1);
    }
    return out as T;
  }
  if (typeof stored !== typeof defaults) return defaults;
  if (typeof stored === 'number' && !Number.isFinite(stored)) return defaults;
  if (typeof stored === 'string' && stored.length > 64) return defaults;
  return stored as T;
}
