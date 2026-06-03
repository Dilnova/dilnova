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
    const isProd = process.env.NODE_ENV === 'production';

    const headersList = [
      {
        key: 'Content-Security-Policy',
        value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://img.clerk.com https://*.clerk.com https://*.clerk.accounts.dev https://translate.google.com https://*.googleapis.com https://*.gstatic.com https://va.vercel-scripts.com blob:; style-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com; font-src 'self' https://*.gstatic.com https://*.googleapis.com data:; img-src 'self' blob: data: https://res.cloudinary.com https://images.unsplash.com https://img.clerk.com https://*.clerk.com https://*.clerk.accounts.dev https://*.backblazeb2.com https://translate.google.com http://translate.google.com https://*.googleapis.com https://*.gstatic.com https://*.google.com; connect-src 'self' https://img.clerk.com https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com https://api.cloudinary.com https://*.googleapis.com https://translate.google.com https://va.vercel-scripts.com https://clerk-telemetry.com; media-src 'self' blob: data: https://res.cloudinary.com; frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev; worker-src 'self' blob:;${isProd ? ' upgrade-insecure-requests;' : ''}`,
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
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'off',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
      },
    ];

    if (isProd) {
      headersList.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }

    return [
      {
        source: '/:path*',
        headers: headersList,
      },
    ];
  },
};

export default nextConfig;
