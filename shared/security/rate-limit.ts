import { headers } from "next/headers";
import { logger } from "@/shared/logging/logger";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { readUpstashEnv, isValidUpstashRestUrl } from "@/shared/security/upstash-health";

// In-memory fallback map for development/testing when Upstash env vars are not configured
const memoryTracker = new Map<string, number[]>();
const MAX_TRACKER_SIZE = 10_000;
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const ratelimitCache = new Map<string, Ratelimit>();
let hasLoggedUpstashWarning = false;

const PRODUCTION_RATE_LIMIT_UNAVAILABLE_ERROR =
  "Rate limiting is temporarily unavailable. Please try again later.";

function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

function getRatelimitClient(limit: number, windowMs: number): Ratelimit | null {
  const { url, token } = readUpstashEnv();

  if (!url || !token || !isValidUpstashRestUrl(url)) {
    if (process.env.NODE_ENV === "production" && !hasLoggedUpstashWarning) {
      hasLoggedUpstashWarning = true;
      logger.error(
        "Upstash Redis credentials are not configured in production. Rate limiting will be bypassed (fail-open).",
        {
          urlPresent: Boolean(url),
          tokenPresent: Boolean(token),
        },
      );
    }
    return null;
  }

  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const key = `${limit}:${windowSeconds}s`;
  if (ratelimitCache.has(key)) {
    return ratelimitCache.get(key)!;
  }

  try {
    const redis = new Redis({
      url,
      token,
    });

    const client = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      analytics: true,
      prefix: "@upstash/ratelimit",
    });

    ratelimitCache.set(key, client);
    return client;
  } catch (error) {
    logger.error("Failed to create Upstash Ratelimit instance", error, { limit, windowMs });
    return null;
  }
}

export interface RateLimitOptions {
  /**
   * If true, throws an error in production when Upstash Redis rate-limiting fails or is unconfigured,
   * preventing abusive requests when rate limiting infra is degraded (fail-closed).
   */
  failClosed?: boolean;
}

/**
 * Checks if the calling client exceeds the configured rate limit.
 * Uses Upstash Redis when configured, and falls back to an in-memory sliding window.
 *
 * @param limit Max number of allowed requests in the window.
 * @param windowMs Time window in milliseconds.
 * @param identifier Optional identifier to limit by (e.g., userId, orgId). Defaults to client IP.
 * @param options Optional configuration including failClosed policy for auth/critical endpoints.
 * @throws Error if the rate limit is exceeded or if rate limiting is unavailable when failClosed is enabled.
 */
export async function rateLimit(
  limit: number,
  windowMs: number,
  identifier?: string,
  options?: RateLimitOptions,
): Promise<void> {
  const reqHeaders = await headers();
  // Get IP address prioritizing x-real-ip (injected securely by Vercel/Cloudflare at edge)
  // to prevent client header spoofing via custom X-Forwarded-For inputs.
  const ip =
    reqHeaders.get("x-real-ip")?.trim() ||
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";

  const limitKey = identifier || ip;

  const client = getRatelimitClient(limit, windowMs);

  if (client) {
    try {
      const { success, reset } = await client.limit(limitKey);
      if (!success) {
        const waitSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        throw new Error(`Rate limit exceeded. Please try again in ${waitSeconds} seconds.`);
      }
      return;
    } catch (error) {
      // Re-throw rate limit exceeded errors
      if (error instanceof Error && error.message.includes("Rate limit exceeded")) {
        throw error;
      }
      logger.error("Upstash rate limiting failed", error, {
        limit,
        windowMs,
        failClosed: options?.failClosed,
      });
      if (isProductionEnvironment()) {
        if (options?.failClosed) {
          throw new Error(PRODUCTION_RATE_LIMIT_UNAVAILABLE_ERROR);
        }
        return; // Fail-open strategy: bypass rate limit for non-critical paths
      }
    }
  }

  if (isProductionEnvironment()) {
    logger.warn("Rate limiter client unavailable in production", {
      failClosed: options?.failClosed,
    });
    if (options?.failClosed) {
      throw new Error(PRODUCTION_RATE_LIMIT_UNAVAILABLE_ERROR);
    }
    return; // Fail-open strategy: bypass rate limit for non-critical paths
  }

  // Development/test fallback to in-memory sliding window rate limiting
  runInMemoryRateLimit(limitKey, limit, windowMs);
}

function runInMemoryRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();

  // Periodically cleanup expired entries to prevent memory bloat
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanupOldKeys(now, windowMs);
    lastCleanup = now;
  }

  // Hard cap: prevent unbounded memory growth from a DDoS with unique IPs
  if (memoryTracker.size > MAX_TRACKER_SIZE) {
    logger.warn("Rate limiter memory tracker exceeded max size, performing emergency cleanup.", {
      trackerSize: memoryTracker.size,
    });
    cleanupOldKeys(now, windowMs);
    if (memoryTracker.size > MAX_TRACKER_SIZE) {
      const entries = Array.from(memoryTracker.entries());
      const half = Math.floor(entries.length / 2);
      for (let i = 0; i < half; i++) {
        memoryTracker.delete(entries[i][0]);
      }
    }
  }

  const timestamps = memoryTracker.get(key) || [];

  // Filter out timestamps outside the sliding window
  const activeTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (activeTimestamps.length >= limit) {
    const oldestTimestamp = activeTimestamps[0] || now;
    const waitSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
    throw new Error(`Rate limit exceeded. Please try again in ${waitSeconds} seconds.`);
  }

  // Record this hit
  activeTimestamps.push(now);
  memoryTracker.set(key, activeTimestamps);
}

function cleanupOldKeys(now: number, windowMs: number) {
  for (const [ip, timestamps] of memoryTracker.entries()) {
    const active = timestamps.filter((t) => now - t < windowMs);
    if (active.length === 0) {
      memoryTracker.delete(ip);
    } else if (active.length !== timestamps.length) {
      memoryTracker.set(ip, active);
    }
  }
}
