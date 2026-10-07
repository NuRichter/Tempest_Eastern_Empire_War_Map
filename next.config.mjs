/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The application ships as a static frontend: no server API, no database,
  // no authentication, no external map key.
  output: 'standalone',
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Browser caching for the static files in public/ (Next's own /_next/static
  // assets are content-hashed and cached for a year already). Maps and
  // photocards rarely change: a week, revalidated in the background. The
  // campaign data changes with each deploy: five minutes, then revalidated.
  async headers() {
    const longLived = 'public, max-age=604800, stale-while-revalidate=86400';
    return [
      { source: '/maps/:path*', headers: [{ key: 'Cache-Control', value: longLived }] },
      { source: '/assets/:path*', headers: [{ key: 'Cache-Control', value: longLived }] },
      { source: '/data/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=300, stale-while-revalidate=86400' }] },
      { source: '/locales/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' }] },
    ];
  },
};

export default nextConfig;
