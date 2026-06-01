import { headers } from 'next/headers';
import { logger } from '@/utils/logger';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// In-memory fallback map for development/testing when Upstash env vars are not configured
const memoryTracker = new Map<string, number[]>();
const MAX_TRACKER_SIZE = 10_000;
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const ratelimitCache = new Map<string, Ratelimit>();
let hasLoggedUpstashWarning = false;

function getRatelimitClient(limit: number, windowMs: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === 'production' && !hasLoggedUpstashWarning) {
      hasLoggedUpstashWarning = true;
      logger.warn('Upstash Redis credentials are not configured. Rate limiting is falling back to the local in-memory store.');
    }
    return null;
  }

  const key = `${limit}:${windowMs}`;
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
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: true,
      prefix: '@upstash/ratelimit',
    });

    ratelimitCache.set(key, client);
    return client;
  } catch (error) {
    logger.error('Failed to create Upstash Ratelimit instance, falling back to local memory', error);
    return null;
  }
}

/**
 * Checks if the calling client IP exceeds the configured rate limit.
 * Uses Upstash Redis when configured, and falls back to an in-memory sliding window.
 * 
 * @param limit Max number of allowed requests in the window.
 * @param windowMs Time window in milliseconds.
 * @throws Error if the rate limit is exceeded.
 */
export async function rateLimit(limit: number, windowMs: number): Promise<void> {
  const reqHeaders = await headers();
  // Get IP address from proxy headers, fallback to localhost
  const ip =
    reqHeaders.get('x-forwarded-for')?.split(',')[0].trim() ||
    reqHeaders.get('x-real-ip') ||
    '127.0.0.1';

  const client = getRatelimitClient(limit, windowMs);

  if (client) {
    try {
      const { success } = await client.limit(ip);
      if (!success) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      return;
    } catch (error) {
      // Re-throw rate limit exceeded errors
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        throw error;
      }
      // Log connection or network errors, and proceed to the in-memory fallback
      logger.error('Upstash rate limiting failed, falling back to in-memory limiter', error);
    }
  }

  // Fallback to in-memory sliding window rate limiting
  runInMemoryRateLimit(ip, limit, windowMs);
}

function runInMemoryRateLimit(ip: string, limit: number, windowMs: number): void {
  const now = Date.now();

  // Periodically cleanup expired entries to prevent memory bloat
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanupOldKeys(now, windowMs);
    lastCleanup = now;
  }

  // Hard cap: prevent unbounded memory growth from a DDoS with unique IPs
  if (memoryTracker.size > MAX_TRACKER_SIZE) {
    logger.warn('Rate limiter memory tracker exceeded max size, performing emergency cleanup.', {
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

  const timestamps = memoryTracker.get(ip) || [];

  // Filter out timestamps outside the sliding window
  const activeTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (activeTimestamps.length >= limit) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // Record this hit
  activeTimestamps.push(now);
  memoryTracker.set(ip, activeTimestamps);
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
