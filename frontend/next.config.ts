import type {NextConfig} from 'next';
import { codecovNextJSWebpackPlugin } from "@codecov/nextjs-webpack-plugin";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
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
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  transpilePackages: ['motion'],
  webpack: (config, options) => {
    const { dev, isServer } = options;

    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    // Suppress "Serializing big strings" cache warnings from large type files (e.g. lucide-react).
    if (dev && config.cache && typeof config.cache === 'object') {
      (config.cache as Record<string, unknown>).maxMemoryGenerations = 0;
    }

    // Inject Codecov Bundle Analysis Webpack Plugin in production builds
    if (!dev && !isServer && process.env.CODECOV_TOKEN) {
      config.plugins.push(
        codecovNextJSWebpackPlugin({
          enableBundleAnalysis: true,
          bundleName: "fintrack-frontend",
          uploadToken: process.env.CODECOV_TOKEN,
          webpack: options.webpack,
        })
      );
    }

    return config;
  },
};

export default nextConfig;
