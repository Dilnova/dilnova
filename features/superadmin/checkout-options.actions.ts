'use server';

import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { superadminAction, ActionError } from '@/lib/safe-action';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';
import {
  CHECKOUT_OPTIONS_CATALOG_KEY,
  buildCheckoutOptionsCatalogPayload,
  type CheckoutOptionDefinition,
} from '@/features/organization/checkout-options.shared';
import { updateCheckoutOptionsCatalogSchema } from '@/features/superadmin/schema';
import { syncSettingToRedis } from '@/shared/platform/settings';
import { z } from 'zod/v3';

export const updateCheckoutOptionsCatalogAction = superadminAction
  .schema(updateCheckoutOptionsCatalogSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000);

      const payload = buildCheckoutOptionsCatalogPayload(parsedInput.options);
      const value = JSON.stringify(payload);

      const [existing] = await db
        .select()
        .from(schema.systemSettings)
        .where(eq(schema.systemSettings.key, CHECKOUT_OPTIONS_CATALOG_KEY))
        .limit(1);

      if (existing) {
        await db
          .update(schema.systemSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(schema.systemSettings.key, CHECKOUT_OPTIONS_CATALOG_KEY));
      } else {
        await db.insert(schema.systemSettings).values({
          key: CHECKOUT_OPTIONS_CATALOG_KEY,
          value,
        });
      }

      await syncSettingToRedis(CHECKOUT_OPTIONS_CATALOG_KEY, value);

      await logAuditAction({
        userId: ctx.userId,
        action: 'UPDATE_SYSTEM_SETTING',
        targetType: 'system_setting',
        targetId: CHECKOUT_OPTIONS_CATALOG_KEY,
        metadata: { optionCount: payload.length },
      });

      revalidateTag('system-settings', 'max');
      revalidatePath('/superadmin');
      revalidatePath('/cart');
      revalidatePath('/admin');

      return { success: true };
    });
  });
