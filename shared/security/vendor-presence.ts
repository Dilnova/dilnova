import { Redis } from "@upstash/redis";
import { readUpstashEnv } from "./upstash-health";
import { logger } from "@/shared/logging/logger";

function getRedisClient(): Redis | null {
  const { url, token } = readUpstashEnv();
  if (!url || !token) {
    return null;
  }
  try {
    return new Redis({ url, token });
  } catch (error) {
    logger.error("Failed to initialize Redis for vendor presence", error);
    return null;
  }
}

function getRawRedisClient(): Redis | null {
  const { url, token } = readUpstashEnv();
  if (!url || !token) {
    return null;
  }
  try {
    return new Redis({ url, token, automaticDeserialization: false });
  } catch (error) {
    logger.error("Failed to initialize raw Redis for vendor presence", error);
    return null;
  }
}

/**
 * Sets the vendor's online status in Redis.
 * Expires after 75 seconds to comfortably cover the 60s dynamic polling backoff.
 */
export async function setVendorOnlineStatus(userId: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    await redis.set(`vendor_online:${userId}`, "1", { ex: 75 });
    return true;
  } catch (error) {
    logger.error("Failed to set vendor online status", error, { userId });
    return false;
  }
}

/**
 * Checks if the vendor is currently online (has a non-expired heartbeat).
 */
export async function isVendorOnline(userId: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false; // Fallback to offline if Redis isn't configured

  try {
    const status = await redis.get(`vendor_online:${userId}`);
    return status === "1" || status === 1;
  } catch (error) {
    logger.error("Failed to check vendor online status", error, { userId });
    return false;
  }
}

/**
 * Push a notification payload to the vendor's secure Redis queue.
 * They will expire in 5 minutes if not popped (prevents memory leaks).
 */
export async function queueVendorNotification(userId: string, payload: unknown): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const key = `vendor_notifications:${userId}`;

    // Inject a unique ID so the client can selectively acknowledge it later
    const enrichedPayload =
      typeof payload === "object" && payload !== null
        ? { id: crypto.randomUUID(), ...payload }
        : payload;

    await redis.lpush(key, JSON.stringify(enrichedPayload));
    await redis.expire(key, 300); // 5 minutes
    return true;
  } catch (error) {
    logger.error("Failed to queue vendor notification", error, { userId });
    return false;
  }
}

/**
 * Peeks at all pending notifications from the vendor's secure Redis queue.
 * Does not remove them (non-destructive).
 */
export async function peekVendorNotifications(userId: string): Promise<unknown[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    const key = `vendor_notifications:${userId}`;

    // Just lrange, no del
    const items = await redis.lrange(key, 0, -1);

    if (!items || items.length === 0) return [];

    // Upstash automatically parses JSON strings for lrange.
    // If it's already an object, use it directly. Otherwise, try parsing it.
    return items.map((item) => (typeof item === "string" ? JSON.parse(item) : item));
  } catch (error) {
    logger.error("Failed to peek vendor notifications", error, { userId });
    return [];
  }
}

/**
 * Acknowledges specific notification IDs by removing them from the vendor's Redis queue.
 */
export async function ackVendorNotifications(userId: string, ackIds: string[]): Promise<boolean> {
  // Use the raw client to prevent auto-parsing. We need exact strings for lrem.
  const rawRedis = getRawRedisClient();
  if (!rawRedis || !ackIds.length) return false;

  try {
    const key = `vendor_notifications:${userId}`;

    const items = await rawRedis.lrange<string>(key, 0, -1);
    if (!items || items.length === 0) return true;

    const pipeline = rawRedis.pipeline();
    for (const item of items) {
      if (typeof item !== "string") continue; // Safety check
      try {
        const parsed = JSON.parse(item);
        if (parsed.id && ackIds.includes(parsed.id)) {
          // lrem matches the exact original stored string payload
          pipeline.lrem(key, 1, item);
        }
      } catch (_err) {
        // Skip invalid JSON
      }
    }

    await pipeline.exec();
    return true;
  } catch (error) {
    logger.error("Failed to ack vendor notifications", error, { userId });
    return false;
  }
}
