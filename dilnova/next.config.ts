import type { NextConfig } from "next";
import { DEFAULT_APP_URL } from "./shared/platform/brand";

// Helper to extract the custom Clerk domain from the publishable key
const getClerkDomain = (): string | null => {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return null;
  try {
    const payload = key.split('_')[2];
    if (!payload) return null;
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    const domain = decoded.split('$')[0];
    return domain || null;
  } catch {
    return null;
  }
};

const clerkDomain = getClerkDomain();

const remotePatterns: Array<{ protocol: 'https' | 'http'; hostname: string }> = [
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
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try {
    remotePatterns.push({
      protocol: 'https',
      hostname: new URL(supabaseUrl).hostname,
    });
  } catch {
    // ignore invalid URL at build time
  }
}

if (clerkDomain) {
  remotePatterns.push({
    protocol: 'https',
    hostname: clerkDomain,
  });
}

const nextConfig: NextConfig = {
  /**
   * Payment slip uploads accept files up to 8 MB — default Server Action limit is 1 MB.
   */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * PERFORMANCE OPTIMIZATIONS
   * ═══════════════════════════════════════════════════════════
   */

  // Allow next/image to optimize images from these external domains
  images: {
    remotePatterns,
  },

  async redirects() {
    let canonicalHost: string | null = null;
    try {
      canonicalHost = new URL(DEFAULT_APP_URL).hostname;
    } catch {
      return [];
    }

    if (!canonicalHost.startsWith('www.') || canonicalHost.includes('localhost')) {
      return [];
    }

    const bareHost = canonicalHost.replace(/^www\./, '');

    return [
      {
        source: '/:path*',
        has: [{ type: 'host' as const, value: bareHost }],
        destination: `${DEFAULT_APP_URL}/:path*`,
        permanent: true,
      },
    ];
  },

  async headers() {
    const isProd = process.env.NODE_ENV === 'production';

    const clerkDomains = [
      'https://img.clerk.com',
      'https://*.clerk.com',
      'https://*.clerk.accounts.dev',
    ];
    if (clerkDomain) {
      clerkDomains.push(`https://${clerkDomain}`);
    }
    const clerkDomainsStr = clerkDomains.join(' ');

    let supabaseHostCsp = '';
    if (supabaseUrl) {
      try {
        supabaseHostCsp = ` https://${new URL(supabaseUrl).hostname}`;
      } catch {
        // ignore invalid URL
      }
    }

    const headersList = [
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
