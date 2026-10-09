/** @type {import('next').NextConfig} */

const dev = process.env.NODE_ENV !== 'production';

// Content Security Policy. Everything the page loads comes from this origin:
// no third-party script, style, font, image or API. MapLibre runs its worker
// from a blob URL, three.js and the map draw into canvases (data and blob
// images). Next's inline bootstrap scripts need 'unsafe-inline' on a static
// page (nonces would force every request through a server function).
// 'unsafe-eval' only in development, for React Refresh.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' blob:${dev ? ' ws:' : ''}`,
  "media-src 'self'",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  ...(dev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=(), midi=(), browsing-topics=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

// Art, maps, tiles and music may only be embedded by this site: another
// site cannot hotlink them into its own pages.
const SAME_ORIGIN_ONLY = { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' };

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The application ships as a static frontend: no server API, no database,
  // no authentication, no external map key.
  output: 'standalone',
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Browser caching for the static files in public/ (Next's own /_next/static
  // assets are content-hashed and cached for a year already). Maps, art and
  // music rarely change: a week, revalidated in the background. The campaign
  // data changes with each deploy: revalidated on every load.
  async headers() {
    const longLived = 'public, max-age=604800, stale-while-revalidate=86400';
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      { source: '/tiles/:path*', headers: [{ key: 'Cache-Control', value: longLived }, SAME_ORIGIN_ONLY] },
      { source: '/maps/:path*', headers: [{ key: 'Cache-Control', value: longLived }, SAME_ORIGIN_ONLY] },
      { source: '/assets/:path*', headers: [{ key: 'Cache-Control', value: longLived }, SAME_ORIGIN_ONLY] },
      // The dataset must always match the deployed assets: revalidate on every load (ETag, 304).
      { source: '/data/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }, SAME_ORIGIN_ONLY] },
      { source: '/locales/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' }] },
    ];
  },
};

export default nextConfig;
