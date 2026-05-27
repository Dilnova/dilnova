import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * ═══════════════════════════════════════════════════════════
   * PERFORMANCE OPTIMIZATIONS
   * ═══════════════════════════════════════════════════════════
   */

  // Allow next/image to optimize images from these external domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: '**.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.backblazeb2.com',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://img.clerk.com https://*.clerk.com https://*.clerk.accounts.dev; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://res.cloudinary.com https://images.unsplash.com https://img.clerk.com https://*.clerk.com https://*.clerk.accounts.dev https://*.backblazeb2.com; connect-src 'self' https://img.clerk.com https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com https://api.cloudinary.com; media-src 'self' blob: data: https://res.cloudinary.com; frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev; upgrade-insecure-requests;",
          },
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
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
