/** @type {import('next').NextConfig} */
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
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        process.env.NEXT_PUBLIC_VERCEL_URL,
        '*.vercel.app'
      ],
      bodySizeLimit: '2mb'
    },
  },
  // Disable source maps in production for better performance
  productionBrowserSourceMaps: false,
  // Enable SWC minification for better performance
  swcMinify: true,
}

module.exports = nextConfig 