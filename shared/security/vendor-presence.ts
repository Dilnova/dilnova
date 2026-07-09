import { Redis } from '@upstash/redis';
import { readUpstashEnv } from './upstash-health';
import { logger } from '@/shared/logging/logger';

function getRedisClient(): Redis | null {
  const { url, token } = readUpstashEnv();
  if (!url || !token) {
    return null;
  }
  try {
    return new Redis({ url, token });
  } catch (error) {
    logger.error('Failed to initialize Redis for vendor presence', error);
    return null;
  }
}

/**
 * Sets the vendor's online status in Redis.
 * Expires after 45 seconds to require a 30s heartbeat.
 */
export async function setVendorOnlineStatus(userId: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    await redis.set(`vendor_online:${userId}`, '1', { ex: 45 });
    return true;
  } catch (error) {
    logger.error('Failed to set vendor online status', error, { userId });
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
    return status === '1' || status === 1;
  } catch (error) {
    logger.error('Failed to check vendor online status', error, { userId });
    return false;
  }
}

/**
 * Push a notification payload to the vendor's secure Redis queue.
 * They will expire in 5 minutes if not popped (prevents memory leaks).
 */
export async function queueVendorNotification(userId: string, payload: any): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    const key = `vendor_notifications:${userId}`;
    await redis.lpush(key, JSON.stringify(payload));
    await redis.expire(key, 300); // 5 minutes
    return true;
  } catch (error) {
    logger.error('Failed to queue vendor notification', error, { userId });
    return false;
  }
}

/**
 * Pops all pending notifications from the vendor's secure Redis queue.
 */
export async function popVendorNotifications(userId: string): Promise<any[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    const key = `vendor_notifications:${userId}`;
    
    // Use a transaction/pipeline to reliably get and delete the list
    const pipeline = redis.pipeline();
    pipeline.lrange(key, 0, -1);
    pipeline.del(key);
    
    const results = await pipeline.exec();
    const items = results[0] as any[] | null;
    
    if (!items || items.length === 0) return [];
    
    // Upstash automatically parses JSON strings for lrange.
    // If it's already an object, use it directly. Otherwise, try parsing it.
    return items.map(item => typeof item === 'string' ? JSON.parse(item) : item);
  } catch (error) {
    logger.error('Failed to pop vendor notifications', error, { userId });
    return [];
  }
}
