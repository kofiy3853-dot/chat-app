/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode doubles every useEffect in dev — major perf hit
  reactStrictMode: false,
  swcMinify: true,
  experimental: {
    allowedDevOrigins: ['192.168.23.126', 'localhost:3000', '192.168.23.126:3000']
  },
  // Compress responses
  compress: true,
}

module.exports = nextConfig
