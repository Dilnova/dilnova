import { headers } from 'next/headers';
import { logger } from '@/utils/logger';

// ═══════════════════════════════════════════════════════════
// IN-MEMORY RATE LIMITER — Sliding Window Algorithm
// ═══════════════════════════════════════════════════════════
//
// ⚠️  PRODUCTION WARNING:
// This rate limiter uses an in-memory Map. In multi-instance deployments
// (Vercel serverless, Docker replicas, edge workers), each instance
// maintains its own counter — effectively multiplying the real limit
// by the number of instances.
//
// For production, replace with a distributed rate limiter:
//   • Upstash Redis: @upstash/ratelimit (recommended for serverless)
//   • Redis: ioredis + sliding window
//   • Supabase: RPC function with advisory locks
//
// This in-memory implementation is suitable for:
//   • Single-instance deployments
//   • Development / staging environments
//   • Supplementary defense-in-depth behind a CDN rate limiter (e.g., Vercel WAF, Cloudflare)

/** Maximum entries before forced cleanup to prevent memory exhaustion */
const MAX_TRACKER_SIZE = 10_000;

// Keep track of IP addresses and their hit timestamps
const tracker = new Map<string, number[]>();

// Run clean-up periodically to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let hasLoggedProductionWarning = false;

function cleanupOldKeys(now: number, windowMs: number) {
  for (const [ip, timestamps] of tracker.entries()) {
    const active = timestamps.filter((t) => now - t < windowMs);
    if (active.length === 0) {
      tracker.delete(ip);
    } else if (active.length !== timestamps.length) {
      tracker.set(ip, active);
    }
  }
}

/**
 * Checks if the calling client IP exceeds the configured rate limit.
 * Uses a sliding-window algorithm to track client request timestamps.
 * 
 * @param limit Max number of allowed requests in the window.
 * @param windowMs Time window in milliseconds.
 * @throws Error if the rate limit is exceeded.
 */
export async function rateLimit(limit: number, windowMs: number): Promise<void> {
  // Log a one-time warning in production about in-memory limitations
  if (process.env.NODE_ENV === 'production' && !hasLoggedProductionWarning) {
    hasLoggedProductionWarning = true;
    logger.warn('In-memory rate limiter is active in production. Consider upgrading to a distributed solution (e.g., @upstash/ratelimit) for multi-instance deployments.');
  }

  const reqHeaders = await headers();
  // Get IP address from proxy headers, fallback to localhost
  const ip =
    reqHeaders.get('x-forwarded-for')?.split(',')[0].trim() ||
    reqHeaders.get('x-real-ip') ||
    '127.0.0.1';

  const now = Date.now();

  // Periodically cleanup expired entries to prevent memory bloat
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanupOldKeys(now, windowMs);
    lastCleanup = now;
  }

  // Hard cap: prevent unbounded memory growth from a DDoS with unique IPs
  if (tracker.size > MAX_TRACKER_SIZE) {
    logger.warn('Rate limiter tracker exceeded max size, performing emergency cleanup.', {
      trackerSize: tracker.size,
    });
    cleanupOldKeys(now, windowMs);
    // If still too large after cleanup, clear oldest half
    if (tracker.size > MAX_TRACKER_SIZE) {
      const entries = Array.from(tracker.entries());
      const half = Math.floor(entries.length / 2);
      for (let i = 0; i < half; i++) {
        tracker.delete(entries[i][0]);
      }
    }
  }

  const timestamps = tracker.get(ip) || [];

  // Filter out timestamps outside the sliding window
  const activeTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (activeTimestamps.length >= limit) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // Record this hit
  activeTimestamps.push(now);
  tracker.set(ip, activeTimestamps);
}
