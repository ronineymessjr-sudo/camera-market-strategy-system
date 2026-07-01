/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backend = process.env.INTERNAL_API_BASE_URL
    if (!backend) {
      throw new Error('INTERNAL_API_BASE_URL must be set for Next.js API rewrites')
    }
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
      {
        source: '/static/:path*',
        destination: `${backend}/static/:path*`,
      },
    ]
  },
}
export default nextConfig
