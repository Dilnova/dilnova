'use server';

import * as schema from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidateVendorConsole } from '@/features/vendor/revalidate';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';
import {
  STOCK_AVAILABILITY_CATALOG_KEY,
  buildStockAvailabilityCatalogPayload,
} from '@/features/inventory/availability.shared';
import { updateStockAvailabilityCatalogSchema } from '@/features/inventory/schema';
import { superadminAction, ActionError } from '@/lib/safe-action';

// Inline schema wrapping the array field expected by the catalog update.
const actionSchema = updateStockAvailabilityCatalogSchema;

export const updateStockAvailabilityCatalogAction = superadminAction
  .schema(actionSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000);

      const payload = buildStockAvailabilityCatalogPayload(parsedInput.options);
      const value = JSON.stringify(payload);

      const [existing] = await ctx.db
        .select()
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.key, STOCK_AVAILABILITY_CATALOG_KEY))
        .limit(1);

      if (existing) {
        await ctx.db
          .update(schema.systemSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(schema.systemSettings.key, STOCK_AVAILABILITY_CATALOG_KEY));
      } else {
        await ctx.db.insert(schema.systemSettings).values({
          key: STOCK_AVAILABILITY_CATALOG_KEY,
          value,
        });
      }

      await logAuditAction({
        userId: ctx.userId,
        action: 'UPDATE_SYSTEM_SETTING',
        targetType: 'system_setting',
        targetId: STOCK_AVAILABILITY_CATALOG_KEY,
        metadata: { optionCount: payload.length },
      });

      revalidateTag('system-settings', 'max');
      revalidatePath('/superadmin');
      revalidatePath('/products');
      revalidateVendorConsole();

      return { success: true };
    });
  });
