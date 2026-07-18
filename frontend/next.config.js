/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['idb'],
  output: process.env.VERCEL ? undefined : 'export',
  compress: true,
  images: { unoptimized: true },

  // Tree-shake heroicons — only bundle icons actually used
  experimental: {
    optimizePackageImports: ['@heroicons/react'],
  },

  // Turbopack handles code splitting automatically
  turbopack: {},
}

module.exports = nextConfig
