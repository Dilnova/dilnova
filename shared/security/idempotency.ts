import { Redis } from "@upstash/redis";
import {
  readUpstashEnv,
  isValidUpstashRestUrl,
  isValidUpstashRestToken,
} from "@/shared/security/upstash-health";
import { logger } from "@/shared/logging/logger";
import crypto from "crypto";

export interface IdempotencyRecord {
  status: "processing" | "completed";
  data?: unknown;
  createdAt: number;
}

interface MemoryEntry {
  record: IdempotencyRecord;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();
const MAX_MEMORY_STORE_SIZE = 10_000;
const UPSTASH_OPERATION_TIMEOUT_MS = 2_000;

function cleanupExpiredMemoryEntries(): void {
  const now = Date.now();
  for (const [k, v] of memoryStore.entries()) {
    if (v.expiresAt <= now) {
      memoryStore.delete(k);
    }
  }
}

/**
 * Resets the in-memory idempotency store. Intended for use in unit tests.
 */
export function resetMemoryStoreForTesting(): void {
  memoryStore.clear();
}

/**
 * Returns an authenticated Upstash Redis client if valid credentials are configured,
 * or null if credentials are unconfigured, invalid, or placeholder dummy values.
 */
function getUpstashRedisClient(): Redis | null {
  const { url, token } = readUpstashEnv();

  if (!url || !token || !isValidUpstashRestUrl(url) || !isValidUpstashRestToken(token)) {
    return null;
  }

  try {
    return new Redis({ url, token });
  } catch (error) {
    logger.error("[idempotency] Failed to initialize Upstash Redis client", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Executes a promise with an upper timeout boundary to prevent network stalls.
 */
async function withTimeout<T>(promise: Promise<T>, ms = UPSTASH_OPERATION_TIMEOUT_MS): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Upstash idempotency operation timed out after ${ms}ms`)),
      ms,
    );
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Attempts to acquire an execution lock for an idempotency key.
 *
 * If the key has not been seen:
 * - Sets status to "processing" with a short lock TTL (default 60s).
 * - Returns { isAcquired: true }.
 *
 * If the key is already present:
 * - If status is "completed": Returns { isAcquired: false, existingRecord }.
 * - If status is "processing": Returns { isAcquired: false, existingRecord }.
 */
export async function acquireIdempotencyLock(
  key: string,
  lockTtlSeconds = 60,
): Promise<{ isAcquired: boolean; existingRecord?: IdempotencyRecord | null }> {
  const redis = getUpstashRedisClient();

  if (redis) {
    try {
      const redisKey = `idempotency:${key}`;

      // Check if existing record exists
      const existingRaw = await withTimeout(redis.get<string | IdempotencyRecord>(redisKey));
      if (existingRaw) {
        const record: IdempotencyRecord =
          typeof existingRaw === "string" ? JSON.parse(existingRaw) : existingRaw;
        return { isAcquired: false, existingRecord: record };
      }

      // Try to acquire processing lock via SET NX
      const newRecord: IdempotencyRecord = {
        status: "processing",
        createdAt: Date.now(),
      };

      const result = await withTimeout(
        redis.set(redisKey, JSON.stringify(newRecord), {
          nx: true,
          ex: lockTtlSeconds,
        }),
      );

      if (result === "OK") {
        return { isAcquired: true };
      }

      // Race condition: another concurrent thread acquired it in the meantime
      const latestRaw = await withTimeout(redis.get<string | IdempotencyRecord>(redisKey));
      const latestRecord: IdempotencyRecord | null = latestRaw
        ? typeof latestRaw === "string"
          ? JSON.parse(latestRaw)
          : latestRaw
        : null;

      return { isAcquired: false, existingRecord: latestRecord };
    } catch (error) {
      logger.error("[idempotency] Upstash Redis lock check failed, falling back to memory", {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
    }
  }

  // In-memory fallback
  cleanupExpiredMemoryEntries();
  if (memoryStore.size >= MAX_MEMORY_STORE_SIZE) {
    memoryStore.clear();
  }

  const existing = memoryStore.get(key);
  if (existing) {
    if (Date.now() < existing.expiresAt) {
      return { isAcquired: false, existingRecord: existing.record };
    }
    memoryStore.delete(key);
  }

  const record: IdempotencyRecord = {
    status: "processing",
    createdAt: Date.now(),
  };
  memoryStore.set(key, { record, expiresAt: Date.now() + lockTtlSeconds * 1000 });
  return { isAcquired: true };
}

/**
 * Stores the successful result of an idempotent operation so duplicate requests
 * return the identical outcome without duplicate transactions or double stock deduction.
 */
export async function completeIdempotency(
  key: string,
  resultData: unknown,
  ttlSeconds = 86400, // 24 hours
): Promise<void> {
  const redis = getUpstashRedisClient();
  const record: IdempotencyRecord = {
    status: "completed",
    data: resultData,
    createdAt: Date.now(),
  };

  if (redis) {
    try {
      await withTimeout(
        redis.set(`idempotency:${key}`, JSON.stringify(record), {
          ex: ttlSeconds,
        }),
      );
      return;
    } catch (error) {
      logger.error("[idempotency] Failed to save completion to Upstash Redis", {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
    }
  }

  memoryStore.set(key, { record, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/**
 * Releases an in-progress idempotency lock if an operation fails before completion,
 * allowing subsequent attempts to retry.
 */
export async function releaseIdempotencyLock(key: string): Promise<void> {
  const redis = getUpstashRedisClient();

  if (redis) {
    try {
      await withTimeout(redis.del(`idempotency:${key}`));
    } catch (error) {
      logger.error("[idempotency] Failed to release lock in Upstash Redis", {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
    }
  }

  memoryStore.delete(key);
}

/**
 * Generates a deterministic SHA-256 fingerprint for a request when no explicit idempotency key is provided.
 */
export function generateRequestFingerprint(userId: string, payload: unknown): string {
  const str = `${userId}:${JSON.stringify(payload)}`;
  return crypto.createHash("sha256").update(str).digest("hex");
}

/**
 * Legacy wrapper for basic boolean duplicate check.
 */
export async function checkIdempotencyKey(
  key: string,
  ttlSeconds: number = 60 * 60,
): Promise<boolean> {
  const { isAcquired } = await acquireIdempotencyLock(key, ttlSeconds);
  return isAcquired;
}
