import type { NextConfig } from "next";
import { DEFAULT_APP_URL } from "./shared/platform/brand";
import {
  extractClerkDomain,
  buildCsp,
  buildReportOnlyCsp,
  shouldExcludeEval,
  isStrictCspRequested,
} from "./shared/security/csp";
import createBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const clerkDomain = extractClerkDomain();

const remotePatterns: Array<{ protocol: "https" | "http"; hostname: string }> = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
  },
  {
    protocol: "https",
    hostname: "img.clerk.com",
  },
  {
    protocol: "https",
    hostname: "*.googleusercontent.com",
  },
  {
    protocol: "https",
    hostname: "avatars.githubusercontent.com",
  },
  {
    protocol: "https",
    hostname: "res.cloudinary.com",
  },
  {
    protocol: "https",
    hostname: "*.backblazeb2.com",
  },
  {
    protocol: "https",
    hostname: "clerk.dilstar.pp.ua",
  },
  {
    protocol: "https",
    hostname: "clerk.dilnova.pp.ua",
  },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try {
    remotePatterns.push({
      protocol: "https",
      hostname: new URL(supabaseUrl).hostname,
    });
  } catch {
    // ignore invalid URL at build time
  }
}

if (clerkDomain) {
  remotePatterns.push({
    protocol: "https",
    hostname: clerkDomain,
  });
}

const nextConfig: NextConfig = {
  output: "standalone",
  staticPageGenerationTimeout: 180,
  /**
   * Safe default size limit for server actions to prevent large payloads and memory exhaustion.
   * Large file uploads (like payment slips) bypass Next.js server actions and go directly to cloud storage.
   */
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
    optimizePackageImports: ["lucide-react"],
  },

  /**
   * ═══════════════════════════════════════════════════════════
   * PERFORMANCE OPTIMIZATIONS
   * ═══════════════════════════════════════════════════════════
   */

  // Allow next/image to optimize images from these external domains
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns,
  },

  async redirects() {
    let canonicalHost: string | null = null;
    try {
      canonicalHost = new URL(DEFAULT_APP_URL).hostname;
    } catch {
      return [];
    }

    if (!canonicalHost.startsWith("www.") || canonicalHost.includes("localhost")) {
      return [];
    }

    return [
      {
        source: "/((?!google.*\\.html).*)",
        has: [{ type: "host" as const, value: "dilnova.pp.ua" }],
        missing: [
          {
            type: "header" as const,
            key: "user-agent",
            value: ".*(Pinterest|Pinterestbot).*",
          },
        ],
        destination: "https://www.dilnova.pp.ua/:path*",
        permanent: true,
      },
      {
        source: "/((?!google.*\\.html).*)",
        has: [{ type: "host" as const, value: "dilstar.pp.ua" }],
        missing: [
          {
            type: "header" as const,
            key: "user-agent",
            value: ".*(Pinterest|Pinterestbot).*",
          },
        ],
        destination: "https://www.dilstar.pp.ua/:path*",
        permanent: true,
      },
    ];
  },

  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const isStrictCsp = isStrictCspRequested();
    const excludeEval = shouldExcludeEval({ isProd, isStrict: isStrictCsp });

    // ACCEPTED RISK: 'unsafe-inline' in style-src is restored to maintain compatibility with
    // third-party libraries (Clerk, etc.) which heavily rely on inline styles for layout.
    // FAIL-CLOSED POLICY: 'unsafe-inline' is removed from script-src in static fallback CSP.
    // Dynamic script execution requires request-level crypto nonces set by proxy.ts.
    const fallbackCsp = buildCsp({
      isProd,
      excludeEval,
      clerkDomain,
    });

    const headersList: Array<{ key: string; value: string }> = [
      {
        key: "Content-Security-Policy",
        value: fallbackCsp,
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=(), autoplay=()",
      },
      {
        key: "X-DNS-Prefetch-Control",
        value: "off",
      },
      {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin",
      },
      {
        key: "Vary",
        value: "Accept-Encoding",
      },
      { key: "Access-Control-Allow-Origin", value: DEFAULT_APP_URL },
      { key: "Access-Control-Allow-Methods", value: "GET,HEAD,POST,OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
    ];

    if (isProd) {
      headersList.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    if (!excludeEval) {
      headersList.push({
        key: "Content-Security-Policy-Report-Only",
        value: buildReportOnlyCsp({ clerkDomain }),
      });
    }

    return [
      {
        source: "/:path*",
        headers: headersList,
      },
    ];
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  silent: true,
  widenClientFileUpload: true,
});
