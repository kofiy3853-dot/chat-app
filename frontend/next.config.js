/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  transpilePackages: ['idb'],
  output: process.env.VERCEL ? undefined : 'export',
  images: { unoptimized: true },
  compress: true,
}

module.exports = nextConfig
