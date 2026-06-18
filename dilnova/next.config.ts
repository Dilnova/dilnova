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
    hostname: 'res.cloudinary.com',
  },
  {
    protocol: 'https',
    hostname: '*.backblazeb2.com',
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
   * Safe default size limit for server actions to prevent large payloads and memory exhaustion.
   * Large file uploads (like payment slips) bypass Next.js server actions and go directly to cloud storage.
   */
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
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
    const isVercelProdOrPreview = process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview';
    const excludeEval = isProd || isVercelProdOrPreview;

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

    const fallbackCsp = `default-src 'self'; script-src 'self' 'unsafe-inline' ${excludeEval ? '' : "'unsafe-eval' "}${clerkDomainsStr} https://challenges.cloudflare.com https://translate.google.com https://*.googleapis.com https://*.gstatic.com https://va.vercel-scripts.com blob:; style-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com; font-src 'self' https://*.gstatic.com https://*.googleapis.com data:; img-src 'self' blob: data: https://res.cloudinary.com https://images.unsplash.com ${clerkDomainsStr} https://*.backblazeb2.com${supabaseHostCsp} https://translate.google.com http://translate.google.com https://*.googleapis.com https://*.gstatic.com https://*.google.com; connect-src 'self' ${clerkDomainsStr} https://api.clerk.com https://api.cloudinary.com${supabaseHostCsp} https://*.googleapis.com https://translate.google.com https://va.vercel-scripts.com https://clerk-telemetry.com; media-src 'self' blob: data: https://res.cloudinary.com; frame-src 'self' ${clerkDomainsStr} https://challenges.cloudflare.com; worker-src 'self' blob:;${isProd ? ' upgrade-insecure-requests;' : ''}`;

    const headersList = [
      {
        key: 'Content-Security-Policy',
        value: fallbackCsp,
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
