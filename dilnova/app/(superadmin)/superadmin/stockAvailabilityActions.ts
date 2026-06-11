'use server';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidateVendorConsole } from '@/utils/revalidateVendorConsole';
import { checkSuperAdmin } from '@/utils/authGuards';
import { logAuditAction } from '@/utils/auditLogger';
import { runWithCorrelationId } from '@/utils/asyncContext';
import { rateLimit } from '@/utils/rateLimit';
import {
  STOCK_AVAILABILITY_CATALOG_KEY,
  buildStockAvailabilityCatalogPayload,
  type StockAvailabilityDefinition,
} from '@/utils/stockAvailabilityShared';
import { updateStockAvailabilityCatalogSchema } from '@/utils/schemas';

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
