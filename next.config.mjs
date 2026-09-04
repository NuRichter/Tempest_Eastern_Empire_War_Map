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
};

export default nextConfig;
