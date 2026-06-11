'use server';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { checkSuperAdmin } from '@/utils/authGuards';
import { logAuditAction } from '@/utils/auditLogger';
import { runWithCorrelationId } from '@/utils/asyncContext';
import { rateLimit } from '@/utils/rateLimit';
import {
  CHECKOUT_OPTIONS_CATALOG_KEY,
  buildCheckoutOptionsCatalogPayload,
  type CheckoutOptionDefinition,
} from '@/utils/checkoutOptionsShared';
import { updateCheckoutOptionsCatalogSchema } from '@/utils/schemas';

export async function updateCheckoutOptionsCatalogAction(options: CheckoutOptionDefinition[]) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    const parsed = updateCheckoutOptionsCatalogSchema.safeParse({ options });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid checkout options catalog.');
    }

    const payload = buildCheckoutOptionsCatalogPayload(parsed.data.options);
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

    await logAuditAction({
      userId: user.id,
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
}
