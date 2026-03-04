import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['ksmmijjfvshrjfkxxznz.supabase.co'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

// @ts-ignore - PWA config
import withPWA from 'next-pwa';
const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);

export default config;