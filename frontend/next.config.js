/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode doubles every useEffect in dev — major perf hit
  reactStrictMode: false,
  swcMinify: true,
  // Ensure ESM-only packages are transpiled correctly for the static export
  transpilePackages: ['idb', 'react-onesignal'],
  // Static HTML export for Native App (Capacitor) wrapper
  output: process.env.VERCEL ? undefined : 'export',
  images: { unoptimized: true },
  // Compress responses
  compress: true,
}

module.exports = nextConfig
