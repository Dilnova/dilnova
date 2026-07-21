'use server';

import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidateVendorConsole } from '@/features/vendor/revalidate';
import { updateSystemSettingSchema } from '@/features/superadmin/schema';
import { updateCheckoutOptionsCatalogSchema } from '@/features/superadmin/schema';
import { CHECKOUT_OPTIONS_CATALOG_KEY } from '@/features/organization/checkout-options.shared';
import { syncSettingToRedis } from '@/shared/platform/settings';
import { superadminAction, ActionError } from '@/lib/safe-action';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';

/**
 * Enterprise Server Action to configure system-wide parameters (e.g., max media upload limit).
 * Restricted to authenticated global admin users.
 */
export const updateSystemSettingAction = superadminAction
  .schema(updateSystemSettingSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000); // Max 20 superadmin operations per minute per IP

      if (parsedInput.key === CHECKOUT_OPTIONS_CATALOG_KEY) {
        try {
          const payload = JSON.parse(parsedInput.value);
          const catalogParsed = updateCheckoutOptionsCatalogSchema.safeParse({ options: payload });
          if (!catalogParsed.success) {
            throw new ActionError(`Strict validation failed for catalog options: ${catalogParsed.error.issues[0]?.message}`);
          }
        } catch (err) {
          throw new ActionError(`Invalid JSON payload for checkout options catalog: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Check if setting already exists
      const [existing] = await db
        .select()
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.key, parsedInput.key))
        .limit(1);

      if (existing) {
        // Update
        await db
          .update(schema.systemSettings)
          .set({
            value: parsedInput.value,
            updatedAt: new Date(),
          })
          .where(eq(schema.systemSettings.key, parsedInput.key));
      } else {
        // Insert
        await db.insert(schema.systemSettings).values({
          key: parsedInput.key,
          value: parsedInput.value,
        });
      }

      // Sync to Edge Cache Fallback (non-blocking if it fails)
      await syncSettingToRedis(parsedInput.key, parsedInput.value);

      await logAuditAction({
        userId: ctx.userId,
        action: 'UPDATE_SYSTEM_SETTING',
        targetType: 'system_setting',
        targetId: parsedInput.key,
        metadata: { value: parsedInput.value },
        strict: true,
      });

      // Clear cache for admin panels and vendor portals to reflect configuration updates immediately
      revalidateTag('system-settings', 'max');
      revalidatePath('/superadmin');
      revalidateVendorConsole();
      revalidatePath('/', 'layout');

      return { success: true };
    });
  });
