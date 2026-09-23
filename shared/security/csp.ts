/**
 * Content Security Policy (CSP) Configuration and Generator
 *
 * Centralizes CSP directive generation across Edge proxy middleware (proxy.ts)
 * and Next.js static fallback headers (next.config.ts).
 */

export interface CspOptions {
  /** Cryptographic nonce for request-time script execution with 'strict-dynamic' */
  nonce?: string;
  /** Whether the current environment is production */
  isProd?: boolean;
  /** Whether to strictly exclude 'unsafe-eval' from script-src */
  excludeEval?: boolean;
  /** Optional custom Clerk domain extracted from publishable key */
  clerkDomain?: string | null;
  /** Supabase project URL (to allow Supabase storage/auth in connect-src & img-src) */
  supabaseUrl?: string | null;
  /** Optional custom report URI for violation logging */
  reportUri?: string | null;
  /** Whether to append upgrade-insecure-requests directive */
  upgradeInsecure?: boolean;
}

const DEFAULT_CLERK_DOMAINS = [
  "https://img.clerk.com",
  "https://*.clerk.com",
  "https://*.clerk.accounts.dev",
  "https://clerk.dilstar.pp.ua",
  "https://clerk.dilnova.pp.ua",
];

/**
 * Extracts custom Clerk domain from the publishable key (if configured).
 */
export function extractClerkDomain(publishableKey?: string): string | null {
  const key = publishableKey || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return null;
  try {
    const payload = key.split("_")[2];
    if (!payload) return null;
    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    const domain = decoded.split("$")[0];
    return domain || null;
  } catch {
    return null;
  }
}

/**
 * Returns the full list of allowed Clerk domains for CSP.
 */
export function getClerkCspDomains(customDomain?: string | null): string[] {
  const domains = [...DEFAULT_CLERK_DOMAINS];
  const domain = customDomain !== undefined ? customDomain : extractClerkDomain();
  if (domain && !domains.includes(`https://${domain}`)) {
    domains.push(`https://${domain}`);
  }
  return domains;
}

/**
 * Extracts and formats the Supabase host for CSP directives.
 */
export function getSupabaseHostCsp(supabaseUrlInput?: string | null): string {
  const urlStr =
    supabaseUrlInput !== undefined ? supabaseUrlInput : process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!urlStr) return "";
  try {
    return ` https://${new URL(urlStr).hostname}`;
  } catch {
    return "";
  }
}

/**
 * Extracts Sentry CSP report endpoint from SENTRY_DSN if available.
 */
export function getSentryCspReportUri(dsnInput?: string | null): string | null {
  const dsn = dsnInput !== undefined ? dsnInput : process.env.SENTRY_DSN;
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, "");
    const host = url.host;
    if (publicKey && projectId && host) {
      return `https://${host}/api/${projectId}/security/?sentry_key=${publicKey}`;
    }
  } catch {
    // ignore invalid URL
  }
  return null;
}

/**
 * Checks whether strict CSP enforcement is requested via environment flags.
 */
export function isStrictCspRequested(): boolean {
  return process.env.STRICT_CSP === "true" || process.env.CSP_STRICT === "true";
}

/**
 * Determines whether 'unsafe-eval' should be excluded from CSP.
 */
export function shouldExcludeEval(options?: { isProd?: boolean; isStrict?: boolean }): boolean {
  const isProd = options?.isProd ?? process.env.NODE_ENV === "production";
  const isVercelProdOrPreview =
    process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
  const isStrict = options?.isStrict ?? isStrictCspRequested();

  return isProd || isVercelProdOrPreview || isStrict;
}

/**
 * Builds the canonical Content-Security-Policy header string.
 */
export function buildCsp(options: CspOptions = {}): string {
  const isProd = options.isProd ?? process.env.NODE_ENV === "production";
  const excludeEval = options.excludeEval ?? shouldExcludeEval({ isProd });
  const clerkDomainsStr = getClerkCspDomains(options.clerkDomain).join(" ");
  const supabaseHostCsp = getSupabaseHostCsp(options.supabaseUrl);
  const sentryReportUri =
    options.reportUri !== undefined ? options.reportUri : getSentryCspReportUri();

  const reportingDirectives = sentryReportUri ? ` report-uri ${sentryReportUri};` : "";
  const upgradeInsecure = options.upgradeInsecure ?? isProd;

  // If a nonce is provided (dynamic per-request execution), use 'strict-dynamic'.
  // Otherwise, use static fallback directive suitable for build-time next.config.ts headers.
  let scriptSrc: string;
  if (options.nonce) {
    const evalDirective = excludeEval ? "" : " 'unsafe-eval'";
    scriptSrc = `script-src 'self' 'nonce-${options.nonce}' 'strict-dynamic' ${clerkDomainsStr} https://challenges.cloudflare.com https://translate.google.com https://*.googleapis.com https://*.gstatic.com https://va.vercel-scripts.com blob:${evalDirective};`;
  } else {
    const evalDirective = excludeEval ? "" : "'unsafe-eval' ";
    scriptSrc = `script-src 'self' ${evalDirective}${clerkDomainsStr} https://challenges.cloudflare.com https://translate.google.com https://*.googleapis.com https://*.gstatic.com https://va.vercel-scripts.com blob:;`;
  }

  return (
    `default-src 'self'; ` +
    `${scriptSrc} ` +
    `style-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com; ` +
    `font-src 'self' https://*.gstatic.com https://*.googleapis.com data:; ` +
    `img-src 'self' blob: data: https://res.cloudinary.com https://images.unsplash.com ${clerkDomainsStr} https://*.googleusercontent.com https://avatars.githubusercontent.com https://*.backblazeb2.com${supabaseHostCsp} https://translate.google.com https://*.googleapis.com https://*.gstatic.com https://*.google.com; ` +
    `connect-src 'self' ${clerkDomainsStr} https://api.clerk.com https://api.cloudinary.com${supabaseHostCsp} https://*.googleapis.com https://translate.google.com https://va.vercel-scripts.com https://clerk-telemetry.com https://*.ingest.de.sentry.io https://*.sentry.io; ` +
    `media-src 'self' blob: data: https://res.cloudinary.com; ` +
    `frame-src 'self' ${clerkDomainsStr} https://challenges.cloudflare.com; ` +
    `worker-src 'self' blob:;` +
    `${reportingDirectives}` +
    `${upgradeInsecure ? " upgrade-insecure-requests;" : ""}`
  );
}

/**
 * Builds the strict Content-Security-Policy-Report-Only header string for development.
 *
 * This policy ALWAYS strictly excludes 'unsafe-eval' and directs violations
 * to /api/csp-report (or Sentry), alerting developers in their browser console
 * to third-party scripts or libraries that would fail in production.
 */
export function buildReportOnlyCsp(options: CspOptions = {}): string {
  const fallbackReportUri = options.reportUri || getSentryCspReportUri() || "/api/csp-report";

  return buildCsp({
    ...options,
    excludeEval: true, // Always enforce strict script-src in report-only
    upgradeInsecure: false, // Do not upgrade insecure requests on localhost in dev
    reportUri: fallbackReportUri,
  });
}
