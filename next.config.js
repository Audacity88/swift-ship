/** @type {import('next').NextConfig} */

// Suppress Node.js deprecation warnings
process.noDeprecation = true;  // This will suppress all deprecation warnings

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/7.x/**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    turbo: {
      rules: {
        // Configure any specific rules for Turbopack
      },
    },
  },
  // Move serverExternalPackages to root level
  serverExternalPackages: ['@aws-sdk'],
  // Optimize production build
  productionBrowserSourceMaps: false,
  webpack: (config, { isServer }) => {
    // Handle punycode deprecation for both client and server
    config.resolve.fallback = {
      ...config.resolve.fallback,
      punycode: false,
      ws: false,
    }
    
    return config
  },
  // Add middleware configuration
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
}

module.exports = nextConfig 