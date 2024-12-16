/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  typescript: {
    // ⚠️ TypeScript hatalarını görmezden gel
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ ESLint hatalarını görmezden gel
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  transpilePackages: ['swagger-ui-react'],
  experimental: {
    outputFileTracingRoot: process.cwd(),
    serverActions: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // client-side specific config
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;