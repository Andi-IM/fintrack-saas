import type {NextConfig} from 'next';
import path from 'path';
import { codecovNextJSWebpackPlugin } from "@codecov/nextjs-webpack-plugin";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Use webpack-based build (Turbopack default in Next.js 16 is incompatible
  // with the custom webpack config needed for Codecov bundle analysis).
  turbopack: {},
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  output: process.env.NEXT_PUBLIC_IS_TESTING === 'true' ? undefined : 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  transpilePackages: ['motion'],
  // Strip console logs from client-side production bundle
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'], // Keep console.error for critical errors
    } : false,
  },
  webpack: (config, options) => {
    const { dev, isServer } = options;

    // 1. HMR config for local agent editing sandbox
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = { ignored: /.*/ };
    }

    // 2. Webpack caching & logging configurations
    if (config.cache && typeof config.cache === 'object') {
      (config.cache as Record<string, unknown>).maxMemoryGenerations = 0;
    }
    config.infrastructureLogging = { level: 'error' };

    // 3. Mock/stub node modules for browser build to satisfy Edge Runtime requirements
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        process: false,
      };
    }

    // Solusi: Statically polyfill process.version for Supabase compilation warnings in Vercel Edge Runtime
    config.plugins.push(
      new options.webpack.DefinePlugin({
        'process.version': JSON.stringify('v20.0.0'),
      })
    );

    // 4. Inject Codecov Bundle Analysis Webpack Plugin in production
    if (!dev && !isServer && process.env.CODECOV_TOKEN) {
      config.plugins.push(
        codecovNextJSWebpackPlugin({
          enableBundleAnalysis: true,
          bundleName: "fintrack-frontend",
          uploadToken: process.env.CODECOV_TOKEN,
          webpack: options.webpack,
          telemetry: false,
        })
      );
    }

    return config;
  },
};

export default nextConfig;
