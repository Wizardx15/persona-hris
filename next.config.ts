import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Tentukan root directory secara manual
    root: process.cwd(),
  },
}

export default nextConfig