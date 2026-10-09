import INTEGRITY from './integrity.generated.json';

/**
 * The only way the app fetches its own files.
 *
 *   - same-origin paths only (an absolute or protocol-relative URL throws),
 *   - no credentials, no referrer,
 *   - in production, Subresource Integrity from the build-time manifest
 *     (scripts/security/integrity.mts): a file altered after the build is
 *     refused by the browser before any of it is parsed.
 */
const HASHES = INTEGRITY as Record<string, string>;
const PROD = process.env.NODE_ENV === 'production';

export function assertSameOriginPath(path: string): string {
  if (!/^\/(?!\/)[A-Za-z0-9._~\-/]*$/.test(path) || path.includes('..')) throw new Error(`Refused to fetch a non-local path: ${path}`);
  return path;
}

export function fetchVerified(path: string, init: RequestInit = {}): Promise<Response> {
  const url = assertSameOriginPath(path);
  const integrity = PROD ? HASHES[url] : undefined;
  return fetch(url, {
    ...init,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    mode: 'same-origin',
    ...(integrity ? { integrity } : {}),
  });
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Parses JSON and refuses (throws) any document with a key that could reach
 * Object.prototype. Fail closed: such a file was not produced by the build.
 */
export function safeJsonParse<T>(text: string): T {
  return JSON.parse(text, (key, value: unknown) => {
    if (FORBIDDEN_KEYS.has(key)) throw new SyntaxError(`Refused JSON with a forbidden key: ${key}`);
    return value;
  }) as T;
}
