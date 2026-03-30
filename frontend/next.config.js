/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode doubles every useEffect in dev — major perf hit
  reactStrictMode: false,
  swcMinify: true,
  // Static HTML export for Native App (Capacitor) wrapper
  // On Vercel, we use Serverless Functions to handle dynamic routes and prevent 404s
  output: process.env.VERCEL ? undefined : 'export',
  images: { unoptimized: true },
  // Compress responses
  compress: true,
}

module.exports = nextConfig
