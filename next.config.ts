import type { NextConfig } from 'next';
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['ksmmijjfvshrjfkxxznz.supabase.co'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Tambah fallback untuk offline
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offline-cache',
        expiration: {
          maxEntries: 200,
        },
        networkTimeoutSeconds: 10,
        fallback: '/offline', // <-- INI
      },
    },
  ],
})(nextConfig);

export default config;