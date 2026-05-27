import { headers } from 'next/headers';

// Keep track of IP addresses and their hit timestamps
const tracker = new Map<string, number[]>();

// Run clean-up periodically to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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
