import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { readUpstashEnv } from "@/shared/security/upstash-health";
import { Redis } from "@upstash/redis";
import { logger } from "@/shared/logging/logger";

let hasLoggedSettingsRedisError = false;

function getSettingsRedisClient(): Redis | null {
  const { url, token } = readUpstashEnv();
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch (err) {
    if (!hasLoggedSettingsRedisError) {
      logger.error("Failed to init Redis for settings cache", { error: err });
      hasLoggedSettingsRedisError = true;
    }
    return null;
  }
}

import { cache } from "react";

/**
 * Cached database fetch helper for system settings with timeout protection.
 */
const getCachedSettingValue = unstable_cache(
  async (key: string): Promise<string | null> => {
    try {
      const queryPromise = db
        .select()
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.key, key))
        .limit(1);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Settings query timeout for key: ${key}`)), 3000),
      );
      const [setting] = await Promise.race([queryPromise, timeoutPromise]);
      return setting ? setting.value : null;
    } catch {
      return null;
    }
  },
  ["system-settings-value"],
  {
    tags: ["system-settings"],
    revalidate: 300,
  },
);

/**
 * Safely fetches a system setting value by its configuration key.
 * If the setting or table doesn't exist (e.g. during migrations), it falls back to Redis, then defaultValue.
 */
export const getSystemSetting = cache(
  async (key: string, defaultValue: string): Promise<string> => {
    try {
      const cachedVal = await getCachedSettingValue(key);
      return cachedVal !== null ? cachedVal : defaultValue;
    } catch {
      // Graceful recovery: Try Redis fallback if DB fails
      try {
        const redis = getSettingsRedisClient();
        if (redis) {
          const fallbackVal = await redis.get<string>(`system_setting:${key}`);
          if (fallbackVal !== null && fallbackVal !== undefined) {
            // Redis might parse JSON automatically, ensure string return
            return typeof fallbackVal === "string" ? fallbackVal : JSON.stringify(fallbackVal);
          }
        }
      } catch (redisErr) {
        logger.error("Redis fallback also failed for setting", { error: redisErr, key });
      }

      return defaultValue;
    }
  },
);

/**
 * Syncs a critical setting to the Redis Edge Cache.
 */
export async function syncSettingToRedis(key: string, value: string): Promise<void> {
  try {
    const redis = getSettingsRedisClient();
    if (redis) {
      await redis.set(`system_setting:${key}`, value);
    }
  } catch (error) {
    logger.error("Failed to sync setting to Redis fallback", { error, key });
  }
}
