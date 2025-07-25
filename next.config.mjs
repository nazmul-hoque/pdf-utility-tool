/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; object-src 'none'; media-src 'self' blob:; worker-src 'self' blob:; child-src 'self' blob:; connect-src 'self' blob:;",
          },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    // Handle PDF.js worker and canvas dependencies
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        encoding: false,
      }
    }
    
    // Exclude pdfjs-dist from server-side compilation
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'pdfjs-dist': 'commonjs pdfjs-dist',
        'react-pdf': 'commonjs react-pdf',
      })
    }
    
    return config
  },
  // Ensure worker files are served with correct headers
  async headers() {
    return [
      {
        source: '/workers/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig
