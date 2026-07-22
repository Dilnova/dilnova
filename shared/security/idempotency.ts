import { Redis } from "@upstash/redis";
import { readUpstashEnv } from "@/shared/security/upstash-health";
import { logger } from "@/shared/logging/logger";

const memoryIdempotencyTracker = new Set<string>();
const MAX_MEMORY_TRACKER_SIZE = 10_000;

/**
 * Checks and registers an idempotency key.
 * @param key The idempotency key to check.
 * @param ttlSeconds How long the key should be kept (default 1 hour).
 * @returns true if the key is new (first request), false if it's a duplicate.
 */
export async function checkIdempotencyKey(
  key: string,
  ttlSeconds: number = 60 * 60,
): Promise<boolean> {
  const { url, token } = readUpstashEnv();

  if (url && token) {
    try {
      const redis = new Redis({ url, token });
      const result = await redis.set(`idempotency:${key}`, "1", {
        nx: true,
        ex: ttlSeconds,
      });
      return result === "OK";
    } catch (error) {
      logger.error("Upstash Redis failed for idempotency check, falling back to memory", {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
    }
  }

  // Fallback to in-memory set (development/test or Upstash failure)
  if (memoryIdempotencyTracker.size > MAX_MEMORY_TRACKER_SIZE) {
    memoryIdempotencyTracker.clear();
  }

  if (memoryIdempotencyTracker.has(key)) {
    return false; // Duplicate
  }

  memoryIdempotencyTracker.add(key);
  setTimeout(() => {
    memoryIdempotencyTracker.delete(key);
  }, ttlSeconds * 1000);

  return true; // First time
}
