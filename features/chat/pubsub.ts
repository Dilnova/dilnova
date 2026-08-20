import { Redis } from "@upstash/redis";
import {
  readUpstashEnv,
  isValidUpstashRestUrl,
  isValidUpstashRestToken,
} from "@/shared/security/upstash-health";
import { logger } from "@/shared/logging/logger";

let redisClient: Redis | null = null;

export function getChatRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const { url, token } = readUpstashEnv();
  if (!url || !token || !isValidUpstashRestUrl(url) || !isValidUpstashRestToken(token)) {
    return null;
  }

  try {
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch (error) {
    logger.warn("Failed to initialize Redis client for chat pubsub", { error });
    return null;
  }
}

export async function publishChatEvent(
  conversationId: string,
  event: { type: string; [key: string]: unknown },
): Promise<void> {
  try {
    const redis = getChatRedisClient();
    if (!redis) return;

    const channel = `chat:${conversationId}`;
    const payload = JSON.stringify({
      ...event,
      timestamp: Date.now(),
    });

    await redis.publish(channel, payload);

    // Also update a short-lived last-event key for polling fallback
    await redis.set(`chat_last_event:${conversationId}`, payload, { ex: 300 });
  } catch (error) {
    logger.warn("Failed to publish chat event to Redis (falling back to DB polling)", {
      conversationId,
      error,
    });
  }
}
