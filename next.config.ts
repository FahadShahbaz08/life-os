import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/((?!api/).*)',
        headers: [{
          key: 'Cache-Control',
          value: 'public, max-age=30, stale-while-revalidate=86400, stale-if-error=604800',
        }],
      },
    ];
  },
};

export default nextConfig;
