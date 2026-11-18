import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? '',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? '',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: [
    'genkit',
    'firebase-admin',
    '@opentelemetry/sdk-node',
    'handlebars',
    '@genkit-ai/googleai',
    '@genkit-ai/core',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack(config) {
    config.ignoreWarnings = [
      { module: /node_modules\/@opentelemetry/ },
      { module: /node_modules\/handlebars/ },
    ];
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
