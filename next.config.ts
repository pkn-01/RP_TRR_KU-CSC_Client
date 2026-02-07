import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  skipTrailingSlashRedirect: true,

  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'xlsx'],
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },

  // ✅ API proxy configuration
  // Forward /api/* requests to backend (afterFiles allows local API routes to take priority)
  async rewrites() {
    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? "http://127.0.0.1:3000" : "https://rp-trr-ku-csc-server-smoky.vercel.app")}/api/:path*`,
        },
        {
          source: "/uploads/:path*",
          destination: `${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? "http://127.0.0.1:3000" : "https://rp-trr-ku-csc-server-smoky.vercel.app")}/uploads/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;

