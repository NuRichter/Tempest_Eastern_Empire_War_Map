/** @type {import('next').NextConfig} */

import { DOCUMENT_SOURCE, documentHeaders, resourceHeaders } from './src/security/policy.mjs';

const dev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  reactStrictMode: true,
  // React Compiler: memoizes components automatically (components that break its
  // rules, or opt out with 'use no memo' like the MapLibre bridge, are left as they are).
  reactCompiler: process.env.REACT_COMPILER !== '0', // REACT_COMPILER=0 builds without it (A/B measurements)
  poweredByHeader: false,
  // The application ships as a static frontend: no server API, no database,
  // no authentication, no external map key.
  output: 'standalone',
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // Script integrity is added after the build by scripts/security/harden-build.mts,
    // not by Next's experimental `sri`: Vercel appends its toolbar loader to the
    // webpack runtime when serving, so that one file cannot carry a build-time hash.
  },
  // Browser caching for the static files in public/ (Next's own /_next/static
  // assets are content-hashed and cached for a year already). Maps, art and
  // music rarely change: a week, revalidated in the background. The campaign
  // data changes with each deploy: revalidated on every load.
  // Security headers come from src/security/policy.mjs; inline scripts are
  // pinned by hash after the build (scripts/security/harden-build.mts).
  // PROFILE_BUILD=1 keeps function names for CPU profiling (scripts/profile-cinematic.mts), with
  // `next build --webpack` (a webpack hook; Next 16 builds with Turbopack otherwise). Never deployed.
  ...(process.env.PROFILE_BUILD === '1'
    ? {
        webpack: (config) => {
          config.optimization.minimize = false;
          return config;
        },
      }
    : {}),
  async headers() {
    const longLived = 'public, max-age=604800, stale-while-revalidate=86400';
    return [
      { source: '/:path*', headers: resourceHeaders() },
      { source: DOCUMENT_SOURCE, headers: documentHeaders({ dev }) },
      { source: '/tiles/:path*', headers: [{ key: 'Cache-Control', value: longLived }] },
      { source: '/maps/:path*', headers: [{ key: 'Cache-Control', value: longLived }] },
      { source: '/assets/:path*', headers: [{ key: 'Cache-Control', value: longLived }] },
      // The dataset must always match the deployed assets: revalidate on every load (ETag, 304).
      { source: '/data/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
      { source: '/locales/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' }] },
      { source: '/.well-known/security.txt', headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }] },
    ];
  },
};

export default nextConfig;
