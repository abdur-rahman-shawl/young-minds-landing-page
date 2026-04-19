import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000"
  }
}

export default nextConfig
