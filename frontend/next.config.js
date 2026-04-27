/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  transpilePackages: ['idb'],
  output: process.env.VERCEL ? undefined : 'export',
  compress: true,
  images: { unoptimized: true },

  // Tree-shake heroicons — only bundle icons actually used
  experimental: {
    optimizePackageImports: ['@heroicons/react'],
  },

  webpack(config, { isServer }) {
    if (!isServer) {
      // Split heavy vendor libs into separate chunks so they can be cached
      config.optimization.splitChunks = {
        ...(config.optimization.splitChunks || {}),
        chunks: 'all',
        cacheGroups: {
          firebase: {
            test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
            name: 'vendor-firebase',
            chunks: 'all',
            priority: 30,
          },
          socketio: {
            test: /[\\/]node_modules[\\/]socket\.io-client[\\/]/,
            name: 'vendor-socketio',
            chunks: 'all',
            priority: 20,
          },
          emoji: {
            test: /[\\/]node_modules[\\/]emoji-picker-react[\\/]/,
            name: 'vendor-emoji',
            chunks: 'async',  // Only load when needed
            priority: 20,
          },
        },
      };
    }
    return config;
  },
}

module.exports = nextConfig
