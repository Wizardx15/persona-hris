import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    domains: ['ksmmijjfvshrjfkxxznz.supabase.co'],
  },
  eslint: {
    ignoreDuringBuilds: true, // <-- INI KUNCI!
  },
};

export default nextConfig;