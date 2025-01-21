/** @type {import('next').NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
    domains: ['picsum.photos', 'avatars.githubusercontent.com'],
    unoptimized: true,
    dangerouslyAllowSVG: true,
  },
}

export default config
