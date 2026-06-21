'use server';

import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidateVendorConsole } from '@/features/vendor/revalidate';
import { checkSuperAdmin } from '@/shared/auth/superadmin-guard';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';
import {
  STOCK_AVAILABILITY_CATALOG_KEY,
  buildStockAvailabilityCatalogPayload,
  type StockAvailabilityDefinition,
} from '@/features/inventory/availability.shared';
import { updateStockAvailabilityCatalogSchema } from '@/features/inventory/schema';

export async function updateStockAvailabilityCatalogAction(options: StockAvailabilityDefinition[]) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    const parsed = updateStockAvailabilityCatalogSchema.safeParse({ options });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid stock availability catalog.');
    }

    const payload = buildStockAvailabilityCatalogPayload(parsed.data.options);
    const value = JSON.stringify(payload);

    const [existing] = await db
      .select()
      .from(schema.systemSettings)
      .where(eq(schema.systemSettings.key, STOCK_AVAILABILITY_CATALOG_KEY))
      .limit(1);

    if (existing) {
      await db
        .update(schema.systemSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(schema.systemSettings.key, STOCK_AVAILABILITY_CATALOG_KEY));
    } else {
      await db.insert(schema.systemSettings).values({
        key: STOCK_AVAILABILITY_CATALOG_KEY,
        value,
      });
    }

    await logAuditAction({
      userId: user.id,
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
}
