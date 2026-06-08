import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

/**
 * Cached database fetch helper for system settings.
 */
const getCachedSettingValue = unstable_cache(
  async (key: string) => {
    const [setting] = await db
      .select()
      .from(schema.systemSettings)
      .where(eq(schema.systemSettings.key, key))
      .limit(1);
    return setting ? setting.value : null;
  },
  ['system-settings'],
  {
    tags: ['system-settings'],
  }
);

/**
 * Safely fetches a system setting value by its configuration key.
 * If the setting or table doesn't exist (e.g. during migrations), it falls back to the defaultValue.
 * 
 * @param key The setting name (e.g., 'max_media_limit').
 * @param defaultValue The fallback string if the database query fails.
 */
export async function getSystemSetting(key: string, defaultValue: string): Promise<string> {
  try {
    const cachedVal = await getCachedSettingValue(key);
    return cachedVal !== null ? cachedVal : defaultValue;
  } catch {
    // Graceful recovery for non-migrated databases or local network pooler errors
    return defaultValue;
  }
}

