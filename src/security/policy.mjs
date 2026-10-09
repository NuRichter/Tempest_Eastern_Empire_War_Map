/**
 * Security policy: the one place that says what the site may load and how
 * the browser must treat it. Read by next.config.mjs (response headers) and
 * by scripts/security/harden-build.mts (which pins inline scripts by hash
 * after the build).
 *
 * Extending the site? A new kind of resource only needs a line here:
 *   - a font, image, audio or data file served from public/: nothing to do
 *     (everything from this origin is already allowed);
 *   - an outside source (an API, a CDN): add its exact origin to the one
 *     directive that needs it, never a wildcard, and never to script-src
 *     without a matching integrity hash.
 * See docs/SECURITY.md.
 */

/** Placeholder replaced by the inline-script hashes after the build. */
export const INLINE_SCRIPT_HASHES = "'inline-script-hashes'";

/**
 * @param {{ dev: boolean }} o
 * @returns {Record<string, string[]>}
 */
export function cspDirectives({ dev }) {
  return {
    'default-src': ["'self'"],
    // Next's bootstrap scripts are inline: pinned by SHA-256 after the build
    // (development keeps 'unsafe-inline' and 'unsafe-eval' for React Refresh).
    'script-src': dev ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] : ["'self'", INLINE_SCRIPT_HASHES],
    'script-src-attr': ["'none'"],
    // React and next/font write style attributes and <style> blocks. Styles cannot run code.
    'style-src': ["'self'", "'unsafe-inline'"],
    // Canvases (map, 3D, flags) produce data: and blob: images.
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': dev ? ["'self'", 'blob:', 'ws:'] : ["'self'", 'blob:'],
    'media-src': ["'self'"],
    // MapLibre runs its worker from a blob URL.
    'worker-src': ["'self'", 'blob:'],
    'child-src': ["'self'", 'blob:'],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'none'"],
    'frame-ancestors': ["'none'"],
    'manifest-src': ["'self'"],
    // DOM XSS: string-to-code sinks (innerHTML, script.src, eval) only accept Trusted Types.
    // Only the app's default policy (src/security/trusted-types.mjs) and
    // Next's own may exist; no library can mint new ones.
    ...(dev ? {} : { 'require-trusted-types-for': ["'script'"], 'trusted-types': ['default', 'nextjs', 'nextjs#bundler'] }),
    ...(dev ? {} : { 'upgrade-insecure-requests': [] }),
  };
}

/** @param {Record<string, string[]>} d */
export function serializeCsp(d) {
  return Object.entries(d)
    .map(([k, v]) => (v.length ? `${k} ${v.join(' ')}` : k))
    .join('; ');
}

/**
 * Headers on every response, assets included: kept short, because they are
 * repeated on every JSON file, tile and image.
 */
export function resourceHeaders() {
  return [
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // No other site may embed or read any file of this one (pages, art, data, music).
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
    { key: 'Access-Control-Allow-Origin', value: 'https://tempestwar.vercel.app' },
    // A worker script (the held-ground worker) needs its own COEP to start
    // under a cross-origin-isolated page. Harmless on other files.
    { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
  ];
}

/**
 * Headers that only mean something on a document (the page, robots.txt,
 * sitemap.xml): the CSP, the Permissions-Policy and cross-origin isolation.
 * Sending them on every asset cost about 100 KB per visit for nothing.
 */
export function documentHeaders({ dev }) {
  return [
    { key: 'Content-Security-Policy', value: serializeCsp(cspDirectives({ dev })) },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'accelerometer=(), autoplay=(self), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), hid=(), idle-detection=(), magnetometer=(), microphone=(), midi=(), payment=(), publickey-credentials-get=(), screen-wake-lock=(), serial=(), usb=(), bluetooth=(), browsing-topics=(), interest-cohort=()',
    },
    // Cross-origin isolation: the page shares a process with nothing else and
    // loads nothing that has not opted in.
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
    { key: 'Origin-Agent-Cluster', value: '?1' },
    { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
    // The legacy XSS auditor is itself exploitable: switched off, the CSP does the job.
    { key: 'X-XSS-Protection', value: '0' },
  ];
}

/** Paths that are files, not documents. Everything else gets the document headers. */
export const DOCUMENT_SOURCE = '/((?!_next/|data/|tiles/|maps/|assets/|locales/|favicon\.svg|og\.jpg).*)';
