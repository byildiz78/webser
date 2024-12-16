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
  transpilePackages: ['swagger-ui-react']
};

module.exports = nextConfig;
