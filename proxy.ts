import { clerkMiddleware } from "@clerk/nextjs/server";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { NextFetchEvent } from "next/server";
import { logger } from "@/shared/logging/logger";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { readUpstashEnv, isValidUpstashRestUrl } from "@/shared/security/upstash-health";

const edgeLimiterCache = new Map<string, Ratelimit>();

function getEdgeRateLimiter(
  limit: number,
  windowSeconds: number,
  prefix: string,
): Ratelimit | null {
  const { url, token } = readUpstashEnv();
  if (!url || !token || !isValidUpstashRestUrl(url)) return null;

  const key = `${prefix}:${limit}:${windowSeconds}s`;
  if (edgeLimiterCache.has(key)) {
    return edgeLimiterCache.get(key)!;
  }

  try {
    const redis = new Redis({ url, token });
    const client = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      analytics: true,
      prefix: `@upstash/edge-ratelimit:${prefix}`,
    });
    edgeLimiterCache.set(key, client);
    return client;
  } catch {
    return null;
  }
}

async function checkEdgeRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip =
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";

  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
  const limit = isMutating ? 60 : 120;
  const prefix = isMutating ? "mutate" : "read";

  const limiter = getEdgeRateLimiter(limit, 60, prefix);
  if (!limiter) return null;

  try {
    const { success, reset } = await limiter.limit(ip);
    if (!success) {
      const waitSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return applySecurityHeaders(
        new NextResponse(`Too Many Requests: Edge Rate Limit Exceeded. Retry in ${waitSeconds}s.`, {
          status: 429,
          headers: {
            "Retry-After": String(waitSeconds),
            "Content-Type": "text/plain",
          },
        }),
      );
    }
  } catch (error) {
    logger.error("Edge rate limiter error", error);
  }

  return null;
}

function getSentryCspReportUri(): string | null {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, "");
    const host = url.host;
    if (publicKey && projectId && host) {
      return `https://${host}/api/${projectId}/security/?sentry_key=${publicKey}`;
    }
  } catch {}
  return null;
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  if (!response.headers) {
    (response as unknown as { headers: Headers }).headers = new Headers();
  }
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=(), autoplay=()",
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  if (!response.headers.has("Content-Security-Policy")) {
    response.headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none';");
  }

  return response;
}

const clerkHandler = clerkMiddleware(async (auth, req) => {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const nonce = crypto.randomUUID();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-nonce", nonce);

  // Define CSP first to attach to both request and response
  const clerkDomains = [
    "https://img.clerk.com",
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
    "https://clerk.dilstar.pp.ua",
  ];
  const clerkDomainsStr = clerkDomains.join(" ");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseHostCsp = "";
  if (supabaseUrl) {
    try {
      supabaseHostCsp = ` https://${new URL(supabaseUrl).hostname}`;
    } catch {}
  }

  const isProd = process.env.NODE_ENV === "production";
  const isVercelProdOrPreview =
    process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
  const excludeEval = isProd || isVercelProdOrPreview;
  const sentryCspUrl = getSentryCspReportUri();

  const reportingDirectives = sentryCspUrl
    ? `report-uri ${sentryCspUrl};`
    : `report-uri /api/csp-report; report-to csp-endpoint;`;

  const cspHeader = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${clerkDomainsStr} https://challenges.cloudflare.com https://translate.google.com https://*.googleapis.com https://*.gstatic.com https://va.vercel-scripts.com blob:${excludeEval ? "" : " 'unsafe-eval'"}; style-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com; font-src 'self' https://*.gstatic.com https://*.googleapis.com data:; img-src 'self' blob: data: https://res.cloudinary.com https://images.unsplash.com ${clerkDomainsStr} https://*.googleusercontent.com https://avatars.githubusercontent.com https://*.backblazeb2.com${supabaseHostCsp} https://translate.google.com https://*.googleapis.com https://*.gstatic.com https://*.google.com; connect-src 'self' ${clerkDomainsStr} https://api.clerk.com https://api.cloudinary.com${supabaseHostCsp} https://*.googleapis.com https://translate.google.com https://va.vercel-scripts.com https://clerk-telemetry.com https://*.ingest.de.sentry.io https://*.sentry.io; media-src 'self' blob: data: https://res.cloudinary.com; frame-src 'self' ${clerkDomainsStr} https://challenges.cloudflare.com; worker-src 'self' blob:; ${reportingDirectives}${isProd ? " upgrade-insecure-requests;" : ""}`;

  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const reportToUrl = `${protocol}://${host}/api/csp-report`;

  const reportToHeader = sentryCspUrl
    ? null
    : JSON.stringify({
        group: "csp-endpoint",
        max_age: 10886400,
        endpoints: [{ url: reportToUrl }],
      });

  response.headers.set("x-request-id", requestId);
  response.headers.set("Content-Security-Policy", cspHeader);
  if (reportToHeader) {
    response.headers.set("Report-To", reportToHeader);
  }
  return response;
});

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  // 0. Health check endpoint early bypass (prevents Auth middleware 302 redirects and bot checks)
  const pathname = request.nextUrl.pathname;
  if (pathname === "/api/health" || pathname.startsWith("/api/health/")) {
    return NextResponse.next();
  }

  // 1. WAF Edge Security Protections
  const userAgent = request.headers.get("user-agent") || "";
  const BLOCKED_USER_AGENTS = [
    "python-requests",
    "python-urllib",
    "httpx",
    "scrapy",
    "libwww-perl",
    "zgrab",
    "nmap",
    "masscan",
    "nikto",
    "sqlmap",
  ];
  if (BLOCKED_USER_AGENTS.some((bot) => userAgent.toLowerCase().includes(bot))) {
    return applySecurityHeaders(new NextResponse("Forbidden: WAF Bot Protection", { status: 403 }));
  }

  const rawUrl = request.url;
  let decodedUrl = rawUrl;
  try {
    decodedUrl = decodeURIComponent(rawUrl.replace(/\+/g, " "));
  } catch {
    decodedUrl = rawUrl.replace(/%20/g, " ").replace(/\+/g, " ");
  }

  let doubleDecodedUrl = decodedUrl;
  try {
    doubleDecodedUrl = decodeURIComponent(decodedUrl);
  } catch {}

  const matchesAnyPattern = (patterns: RegExp[]) =>
    patterns.some(
      (pattern) =>
        pattern.test(rawUrl) || pattern.test(decodedUrl) || pattern.test(doubleDecodedUrl),
    );

  // Directory Traversal protection
  const TRAVERSAL_PATTERNS = [
    /\.\.[\/\\]/,
    /%2e%2e[%2f%5c]/i,
    /%252e%252e/i,
    /\/etc\/passwd/i,
    /\/etc\/shadow/i,
    /c:\\windows/i,
    /win\.ini/i,
  ];
  if (matchesAnyPattern(TRAVERSAL_PATTERNS)) {
    return applySecurityHeaders(
      new NextResponse("Forbidden: WAF Directory Traversal Protection", { status: 403 }),
    );
  }

  // SQL Injection protection
  const SQLI_PATTERNS = [
    /union[\s\+]+select/i,
    /select[\s\+]+.*[\s\+]+from/i,
    /insert[\s\+]+into/i,
    /update[\s\+]+.*[\s\+]+set/i,
    /delete[\s\+]+from/i,
    /drop[\s\+]+table/i,
    /exec[\s\+]+(s|x)p_/i,
  ];
  if (matchesAnyPattern(SQLI_PATTERNS)) {
    return applySecurityHeaders(
      new NextResponse("Forbidden: WAF SQLi Protection", { status: 403 }),
    );
  }

  // XSS Protection
  const XSS_PATTERNS = [
    /<script[\s\+>]/i,
    /javascript:/i,
    /onload[\s\+]*=/i,
    /onerror[\s\+]*=/i,
    /eval\(/i,
  ];
  if (matchesAnyPattern(XSS_PATTERNS)) {
    return applySecurityHeaders(new NextResponse("Forbidden: WAF XSS Protection", { status: 403 }));
  }

  // Command Injection Protection
  const CMD_INJECTION_PATTERNS = [
    /;[\s\+]*cat[\s\+]+/i,
    /;[\s\+]*ls[\s\+]+/i,
    /\|[\s\+]*id\b/i,
    /\$\([^\)]+\)/i,
  ];
  if (matchesAnyPattern(CMD_INJECTION_PATTERNS)) {
    return applySecurityHeaders(
      new NextResponse("Forbidden: WAF Command Injection Protection", { status: 403 }),
    );
  }

  // 1.5. Edge Rate Limiting Protection (circuit breaker for volumetric traffic)
  const edgeRateLimitResponse = await checkEdgeRateLimit(request);
  if (edgeRateLimitResponse) {
    return edgeRateLimitResponse;
  }

  // 2. CSRF protection:
  // Enforce that mutating requests (except webhook and csp-report endpoints) have a valid Origin matching Host or X-Forwarded-Host.
  const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
  if (MUTATING_METHODS.includes(request.method)) {
    const pathname = request.nextUrl.pathname;
    const isWebhook = pathname.startsWith("/api/webhooks/");
    const isCspReport = pathname === "/api/csp-report";

    if (!isWebhook && !isCspReport) {
      const origin = request.headers.get("origin");
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host");

      if (!origin || !host) {
        return applySecurityHeaders(
          new NextResponse("CSRF Verification Failed: Missing Origin or Host header.", {
            status: 403,
          }),
        );
      }

      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return applySecurityHeaders(
            new NextResponse("CSRF Verification Failed: Mismatched Origin and Host.", {
              status: 403,
            }),
          );
        }
      } catch {
        return applySecurityHeaders(
          new NextResponse("CSRF Verification Failed: Invalid Origin header.", {
            status: 403,
          }),
        );
      }
    }
  }

  try {
    const res = await clerkHandler(request, event);
    return res;
  } catch (error) {
    logger.error("Clerk Middleware execution failed (API outage)", error);
    return applySecurityHeaders(
      new NextResponse("Authentication Service is currently unavailable. Please try again later.", {
        status: 503,
      }),
    );
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
