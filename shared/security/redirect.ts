import { DEFAULT_APP_URL, DILSTAR_BRAND_URL } from "@/shared/platform/brand";

const DEFAULT_ALLOWED_HOSTNAMES = new Set([
  "dilnova.pp.ua",
  "www.dilnova.pp.ua",
  "dilstar.pp.ua",
  "www.dilstar.pp.ua",
]);

/**
 * Returns the set of domain hostnames that are permitted as redirect targets.
 */
function getAllowedHostnames(): Set<string> {
  const allowed = new Set(DEFAULT_ALLOWED_HOSTNAMES);

  const envUrls = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.PRODUCTION_APP_URL,
    DEFAULT_APP_URL,
    DILSTAR_BRAND_URL,
  ];

  for (const rawUrl of envUrls) {
    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        allowed.add(parsed.hostname.toLowerCase());
      } catch {
        // ignore malformed env URL
      }
    }
  }

  if (process.env.VERCEL_URL) {
    try {
      const vercelUrl = process.env.VERCEL_URL.includes("://")
        ? new URL(process.env.VERCEL_URL)
        : new URL(`https://${process.env.VERCEL_URL}`);
      allowed.add(vercelUrl.hostname.toLowerCase());
    } catch {
      allowed.add(process.env.VERCEL_URL.toLowerCase());
    }
  }

  return allowed;
}

/**
 * Checks whether an absolute URL's hostname belongs to the application.
 */
export function isAllowedRedirectHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  const allowed = getAllowedHostnames();

  if (allowed.has(lower)) {
    return true;
  }

  // Allow subdomains of our official production domains (e.g. clerk.dilnova.pp.ua)
  if (lower.endsWith(".dilnova.pp.ua") || lower.endsWith(".dilstar.pp.ua")) {
    return true;
  }

  // Allow local development hosts
  if (lower === "localhost" || lower === "127.0.0.1") {
    return true;
  }

  // Allow specific Vercel deployment preview if configured
  if (process.env.VERCEL_URL && lower === process.env.VERCEL_URL.toLowerCase()) {
    return true;
  }

  return false;
}

/**
 * Validates and sanitizes a user-supplied redirect URL to prevent Open Redirect attacks.
 *
 * Guarantees:
 * - Rejects protocol-relative URLs (`//evil.com`, `///evil.com`)
 * - Rejects backslash tricks (`/\evil.com`, `\\evil.com`, `\/evil.com`)
 * - Rejects encoded variations (`/%2f/evil.com`, `/%5cevil.com`)
 * - Rejects dangerous pseudo-protocols (`javascript:`, `data:`, `vbscript:`)
 * - Rejects control characters and whitespace tricks
 * - Normalizes allowed absolute same-origin URLs to clean relative paths
 * - Fallback defaults to "/" if invalid or external
 *
 * @param url The untrusted redirect URL string from searchParams or user input
 * @param fallback Safe fallback path if validation fails (defaults to "/")
 * @returns Safe relative path starting with "/"
 */
export function getSafeRedirectUrl(url: string | null | undefined, fallback = "/"): string {
  if (!url || typeof url !== "string") {
    return fallback;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return fallback;
  }

  // Reject control characters (ASCII < 32 or DEL)
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return fallback;
  }

  // Reject dangerous schemes
  if (/^(?:javascript|data|vbscript|file|about|blob):/i.test(trimmed)) {
    return fallback;
  }

  // Iterative percent-decode check (up to 3 passes) to prevent bypasses
  // such as /%2f/evil.com, /%5cevil.com, or nested encoding
  try {
    let decoded = trimmed;
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }

    if (
      /^[\/\\]{2,}/.test(decoded) ||
      /^\/\\/.test(decoded) ||
      /^\\/.test(decoded) ||
      /^\/\s/.test(decoded) ||
      /^(?:javascript|data|vbscript|file|about|blob):/i.test(decoded)
    ) {
      return fallback;
    }
  } catch {
    // Malformed percent-encoding
    return fallback;
  }

  // Reject immediate protocol-relative or backslash-leading patterns
  if (/^[\/\\]{2,}/.test(trimmed) || /^\/\\/.test(trimmed) || /^\\/.test(trimmed)) {
    return fallback;
  }

  // Check if it is an absolute URL (has scheme and host)
  try {
    const parsed = new URL(trimmed);
    const isHttp = parsed.protocol === "http:" || parsed.protocol === "https:";
    if (!isHttp) {
      return fallback;
    }

    if (isAllowedRedirectHost(parsed.hostname)) {
      // Return safe relative path from approved same-origin URL
      const relative = parsed.pathname + parsed.search + parsed.hash;
      if (relative.startsWith("/") && !relative.startsWith("//") && !relative.startsWith("/\\")) {
        return relative;
      }
    }

    // External or unapproved domain -> fallback
    return fallback;
  } catch {
    // Not an absolute URL with valid scheme, treat as relative path
  }

  // Must strictly start with a single "/" and not be followed by slash, backslash, or whitespace
  if (!/^\/(?:[^\/\s\\]|$)/.test(trimmed)) {
    return fallback;
  }

  // Verify against dummy base using WHATWG URL parser
  const DUMMY_BASE = "https://safe-redirect-verifier.local";
  try {
    const resolved = new URL(trimmed, DUMMY_BASE);
    // Ensure the URL remained on the dummy origin without escaping to external host
    if (resolved.origin !== DUMMY_BASE) {
      return fallback;
    }

    const relative = resolved.pathname + resolved.search + resolved.hash;
    if (!relative.startsWith("/") || relative.startsWith("//") || relative.startsWith("/\\")) {
      return fallback;
    }

    return relative;
  } catch {
    return fallback;
  }
}

/**
 * Returns true if the given URL is safe to use as a redirect target.
 */
export function isValidRedirectUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  return getSafeRedirectUrl(url, "__INVALID__") !== "__INVALID__";
}
