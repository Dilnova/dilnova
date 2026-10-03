import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { logger } from "@/shared/logging/logger";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  readUpstashEnv,
  isValidUpstashRestUrl,
  isValidUpstashRestToken,
} from "@/shared/security/upstash-health";
import {
  buildCsp,
  buildReportOnlyCsp,
  shouldExcludeEval,
  isStrictCspRequested,
} from "@/shared/security/csp";
import { DEFAULT_APP_URL } from "@/shared/platform/brand";

/**
 * Exact static paths that are publicly accessible without authentication.
 */
export const PUBLIC_EXACT_ROUTES = [
  "/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/site.webmanifest",
] as const;

/**
 * Path prefixes that are publicly accessible without authentication.
 * Any route NOT matching PUBLIC_EXACT_ROUTES or PUBLIC_ROUTE_PREFIXES is denied by default.
 */
export const PUBLIC_ROUTE_PREFIXES = [
  // Storefront catalog & customer public pages
  "/products",
  "/vendors",
  "/brand",
  "/cart",
  "/contact",
  "/support",

  // Dilstar brand alias routes (multi-domain routing before rewrite)
  "/hardware",
  "/tech",
  "/nursery",
  "/services",

  // Authentication & Error routes
  "/sign-in",
  "/sign-up",
  "/unauthorized",

  // Statutory Legal & Regulatory Compliance pages & aliases
  "/privacy",
  "/privacy-policy",
  "/terms",
  "/terms-of-service",
  "/terms-and-conditions",
  "/tos",
  "/cookie",
  "/cookies",
  "/cookie-policy",
  "/refund",
  "/refund-policy",
  "/return-policy",
  "/returns",

  // Standards metadata & discovery
  "/.well-known",
  "/sitemap",

  // Public API endpoints & webhooks (route-level token/signature validation)
  "/api/health",
  "/api/csp-report",
  "/api/feeds/google-merchant",
  "/api/locations",
  "/api/shipping/rates",
  "/api/webhooks/clerk",
  "/api/webhooks/qstash",
  "/api/cron",
] as const;

/**
 * Determine whether a given pathname is explicitly public.
 */
export function isPublicRoute(pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (PUBLIC_EXACT_ROUTES.includes(normalized as (typeof PUBLIC_EXACT_ROUTES)[number])) {
    return true;
  }
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

/**
 * Deny-by-default route enforcement: Any path that is not explicitly public is protected.
 */
export function isProtectedPath(pathname: string): boolean {
  return !isPublicRoute(pathname);
}

const edgeLimiterCache = new Map<string, Ratelimit>();

function getEdgeRateLimiter(
  limit: number,
  windowSeconds: number,
  prefix: string,
): Ratelimit | null {
  const { url, token } = readUpstashEnv();
  if (!url || !token || !isValidUpstashRestUrl(url) || !isValidUpstashRestToken(token)) return null;

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
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";

  const isServerAction = request.headers.has("next-action");
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
  const limit = isServerAction ? 300 : isMutating ? 180 : 300;
  const prefix = isServerAction ? "action" : isMutating ? "mutate" : "read";

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

  response.headers.set("Vary", "Accept-Encoding");

  if (!response.headers.has("Content-Security-Policy")) {
    response.headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none';");
  }

  return response;
}

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isProtectedPath(req.nextUrl.pathname)) {
    const authState = await auth();
    if (!authState.userId) {
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return applySecurityHeaders(
          new NextResponse(JSON.stringify({ error: "Unauthorized: Authentication required." }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return authState.redirectToSignIn({ returnBackUrl: req.url });
    }
  }

  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const nonce = crypto.randomUUID();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-nonce", nonce);

  const country =
    req.headers.get("cf-ipcountry")?.trim() || req.headers.get("x-country")?.trim() || "XX";
  requestHeaders.set("x-country", country);

  // Host detection for multi-domain routing: redirect dilstar.pp.ua to primary dilnova.pp.ua domain
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const isDilstarDomain = host.includes("dilstar.pp.ua");

  const brandRouteMap: Record<string, string> = {
    "/": "/brand/dilstar",
    "/hardware": "/vendors/dilstar-hardware",
    "/tech": "/vendors/dilstar-tech",
    "/nursery": "/vendors/dilstar-nursery",
    "/services": "/vendors/dilstar-services",
  };

  const normalizedPath = req.nextUrl.pathname.replace(/\/$/, "") || "/";

  if (isDilstarDomain) {
    const targetPath = brandRouteMap[normalizedPath] || req.nextUrl.pathname;
    const targetBase = DEFAULT_APP_URL;
    const targetUrl = new URL(targetPath, targetBase);
    targetUrl.search = req.nextUrl.search;
    return NextResponse.redirect(targetUrl, 307);
  }

  // Define CSP first to attach to both request and response
  const isProd = process.env.NODE_ENV === "production";
  const isStrictCsp = isStrictCspRequested();
  const excludeEval = shouldExcludeEval({ isProd, isStrict: isStrictCsp });

  const cspHeader = buildCsp({
    nonce,
    isProd,
    excludeEval,
  });

  requestHeaders.set("Content-Security-Policy", cspHeader);

  // In non-production environments when unsafe-eval is enabled, attach a Report-Only header
  // enforcing the exact production policy (excluding unsafe-eval). This immediately surfaces
  // CSP violations in the browser console and logs them to /api/csp-report without breaking dev tools.
  let reportOnlyCsp: string | null = null;
  if (!excludeEval) {
    reportOnlyCsp = buildReportOnlyCsp({ nonce });
    requestHeaders.set("Content-Security-Policy-Report-Only", reportOnlyCsp);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-request-id", requestId);
  response.headers.set("x-country", country);
  response.headers.set("Content-Security-Policy", cspHeader);
  if (reportOnlyCsp) {
    response.headers.set("Content-Security-Policy-Report-Only", reportOnlyCsp);
  }
  return response;
});

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
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
    "gptbot",
    "ccbot",
    "claudebot",
    "bytespider",
    "anthropic-ai",
    "google-extended",
    "perplexbot",
    "amazonbot",
  ];
  if (BLOCKED_USER_AGENTS.some((bot) => userAgent.toLowerCase().includes(bot))) {
    return applySecurityHeaders(new NextResponse("Forbidden: WAF Bot Protection", { status: 403 }));
  }

  const rawUrl = request.url;
  const rawPathname = request.nextUrl.pathname;

  // 1.1 Iterative URL decoding (up to 3 passes) to unwrap nested/double/triple percent-encodings
  const urlVariants: string[] = [rawUrl, rawPathname];

  const decodePass = (str: string): string => {
    return str
      .replace(/(?:%[0-9a-fA-F]{2})+/g, (match) => {
        try {
          return decodeURIComponent(match);
        } catch {
          return match;
        }
      })
      .replace(/\+/g, " ");
  };

  let currentUrl = rawUrl;
  let currentPath = rawPathname;

  for (let i = 0; i < 3; i++) {
    const nextUrl = decodePass(currentUrl);
    const nextPath = decodePass(currentPath);
    if (nextUrl === currentUrl && nextPath === currentPath) break;
    currentUrl = nextUrl;
    currentPath = nextPath;
  }
  // Keep raw inputs and fully-decoded fixed points
  urlVariants.push(currentUrl, currentPath);

  // 1.2 Strip null bytes (\0, %00) and collect all normalized variants
  const sanitizedVariants = urlVariants.flatMap((variant) => {
    const stripped = variant.replace(/\0/g, "").replace(/%00/gi, "");
    return variant === stripped ? [variant] : [variant, stripped];
  });

  const matchesAnyPattern = (patterns: RegExp[]) =>
    patterns.some((pattern) => sanitizedVariants.some((variant) => pattern.test(variant)));

  // Sensitive File & Directory Probe Protection (Drops malicious bot scans before hitting auth or SSR functions)
  const SENSITIVE_PROBE_PATTERNS = [
    /(?:^|\/)\.(?!well-known(?:$|\/))(?:env(?:\..*)?|git(?:ignore|attributes)?|svn|hg|bzr|aws|ssh|docker|kube|vscode|idea|ds_store|config|history)(?:$|\/)/i,
    /\.(?:php\d?|asp|aspx|jsp|jspx|cgi|pl|py|sh|bash|bat|cmd|exe|dll|bak|backup|old|save|temp|tmp|swp|sql|tar|gz|tgz|bz2|7z)(?:$|\?)/i,
    /(?:^|\/)(?:wp-(?:admin|includes|content|login\.php)|xmlrpc\.php|phpmyadmin|pma|adminer|mysqladmin|myadmin|_profiler|telescope|actuator)(?:$|\/)/i,
  ];
  if (matchesAnyPattern(SENSITIVE_PROBE_PATTERNS)) {
    return applySecurityHeaders(new NextResponse("Not Found", { status: 404 }));
  }

  // Directory Traversal protection
  const TRAVERSAL_PATTERNS = [
    /\.\.[\/\\]/,
    /\/etc\/(?:passwd|shadow|hosts|group)/i,
    /c:\\windows/i,
    /win\.ini/i,
    /boot\.ini/i,
  ];
  if (matchesAnyPattern(TRAVERSAL_PATTERNS)) {
    return applySecurityHeaders(
      new NextResponse("Forbidden: WAF Directory Traversal Protection", { status: 403 }),
    );
  }

  // SQL Injection protection (linear non-backtracking separators & bounded spans)
  const SEP = `(?:[\\s+]|\\/\\*[^*]*\\*\\/)+`;
  const SQLI_PATTERNS = [
    new RegExp(`union${SEP}select`, "i"),
    new RegExp(`select\\b(?:(?!;).){0,200}?${SEP}from`, "i"),
    new RegExp(`insert${SEP}into`, "i"),
    new RegExp(`update\\b(?:(?!;).){0,200}?${SEP}set`, "i"),
    new RegExp(`delete${SEP}from`, "i"),
    new RegExp(`drop${SEP}table`, "i"),
    new RegExp(`exec${SEP}(?:s|x)p_`, "i"),
  ];
  if (matchesAnyPattern(SQLI_PATTERNS)) {
    return applySecurityHeaders(
      new NextResponse("Forbidden: WAF SQLi Protection", { status: 403 }),
    );
  }

  // XSS Protection
  const XSS_PATTERNS = [
    /<script[\s\/>]/i,
    /javascript:/i,
    /onload[\s\+]*=/i,
    /onerror[\s\+]*=/i,
    /eval\s*\(/i,
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

  // 1.6. Multi-Domain Edge Redirect: dilstar.pp.ua -> dilnova.pp.ua (Option 1)
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const isDilstarDomain = host.includes("dilstar.pp.ua");

  if (isDilstarDomain) {
    const brandRouteMap: Record<string, string> = {
      "/": "/brand/dilstar",
      "/hardware": "/vendors/dilstar-hardware",
      "/tech": "/vendors/dilstar-tech",
      "/nursery": "/vendors/dilstar-nursery",
      "/services": "/vendors/dilstar-services",
    };

    const normalizedPath = request.nextUrl.pathname.replace(/\/$/, "") || "/";
    const targetPath = brandRouteMap[normalizedPath] || request.nextUrl.pathname;
    const targetBase = DEFAULT_APP_URL;
    const targetUrl = new URL(targetPath, targetBase);
    targetUrl.search = request.nextUrl.search;

    const redirectResponse = NextResponse.redirect(targetUrl, 307);
    return applySecurityHeaders(redirectResponse);
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
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      ("digest" in error || "message" in error) &&
      (String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT") ||
        String((error as { message?: string }).message).includes("NEXT_REDIRECT"))
    ) {
      throw error;
    }
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
