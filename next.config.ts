import type { NextConfig } from 'next';

// Repo deploys to https://cagoooo.github.io/Aura/, so basePath = '/Aura' in prod.
// Override via NEXT_PUBLIC_BASE_PATH for custom domains.
const isProd = process.env.NODE_ENV === 'production';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (isProd ? '/Aura' : '');

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  // typecheck currently clean — drop the safety net so future TS regressions
  // fail the build instead of silently shipping. Add back temporarily if
  // unblocking a critical hotfix.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
    ],
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
