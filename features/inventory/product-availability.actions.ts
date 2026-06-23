'use server';

import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidateVendorConsole } from '@/features/vendor/revalidate';
import { revalidatePath } from 'next/cache';
import { validateStockAvailabilityId } from '@/features/inventory/availability.server';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/shared/security/rate-limit';

export async function updateProductStockAvailabilityAction(
  productId: string,
  stockAvailability: string
) {
  return runWithCorrelationId(async () => {
    await rateLimit(30, 60 * 1000);
    const { userId, orgId, orgRole } = await auth();
    if (!userId || !orgId) {
      throw new Error('Not authorized.');
    }
    if (orgRole !== 'org:admin') {
      throw new Error('Not authorized: Only organization admins can update stock availability.');
    }

    const availability = await validateStockAvailabilityId(stockAvailability);
    if (!availability) {
      throw new Error('Invalid stock availability status.');
    }

    const [product] = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(and(eq(schema.products.id, productId), eq(schema.products.orgId, orgId)))
      .limit(1);

    if (!product) {
      throw new Error('Product not found or access denied.');
    }

    const result = await db
      .update(schema.inventory)
      .set({ stockAvailability: availability.id, updatedAt: new Date() })
      .where(eq(schema.inventory.productId, productId))
      .returning({ id: schema.inventory.id });

    if (result.length === 0) {
      throw new Error('Inventory record not found for this product.');
    }

    await logAuditAction({
      userId,
      action: 'UPDATE_INVENTORY_DETAILS',
      targetType: 'inventory',
      targetId: result[0].id,
      metadata: { productId, stockAvailability: availability.id },
    });

    revalidateVendorConsole();
    revalidatePath('/products');
    revalidatePath(`/products/${productId}`);

    return { success: true };
  });
}
