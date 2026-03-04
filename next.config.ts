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
  // Hapus konfigurasi runtimeCaching yang bermasalah
  // Biarkan next-pwa menggunakan konfigurasi default
})(nextConfig);

export default config;