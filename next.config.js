/** @type {import('next').NextConfig} */
const nextConfig = {
  // REMOVED: output: 'export' - this prevents API routes from working
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true 
  },
  experimental: {
    serverComponentsExternalPackages: ['ethers'],
  },
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    
    // Fix for ethers.js WebSocket dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "bufferutil": false,
      "utf-8-validate": false,
    }
    
    return config
  },
}

module.exports = nextConfig