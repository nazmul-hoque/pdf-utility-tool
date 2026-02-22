import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
  // pdfjs-dist 5.x is ESM-only and must be transpiled by webpack
  transpilePackages: ['pdfjs-dist'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        encoding: false,
      }
    }
    // Prevent webpack from trying to compile pdf.worker.mjs as a separate worker chunk.
    // pdfjs-dist is in transpilePackages, so webpack finds the `new Worker(new URL(...))` pattern
    // inside pdfjs-dist and tries to bundle the ~3MB worker file, causing 503 in dev.
    // Setting the alias to false makes webpack emit an empty stub; pdfjs uses workerSrc instead.
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/build/pdf.worker.mjs': path.resolve(__dirname, 'lib/pdf-worker-stub.js'),
    }
    return config
  },
  async headers() {
    return [
      // Security headers for all routes
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; object-src 'none'; media-src 'self' blob:; worker-src 'self' blob:; child-src 'self' blob:; connect-src 'self' blob:;",
          },
        ],
      },
      // Force correct MIME type for worker files serving from public/
      {
        source: '/pdf.worker.min.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript' },
        ],
      },
      {
        source: '/pdf.worker.react-pdf.min.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript' },
        ],
      },
      {
        source: '/pdf.worker.mjs',
        headers: [
          { key: 'Content-Type', value: 'application/javascript' },
        ],
      },
      // COEP/COOP headers required for SharedArrayBuffer (PDF worker)
      {
        source: '/workers/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
