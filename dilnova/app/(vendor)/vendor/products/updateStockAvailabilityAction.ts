'use server';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidateVendorConsole } from '@/utils/revalidateVendorConsole';
import { revalidatePath } from 'next/cache';
import { validateStockAvailabilityId } from '@/utils/stockAvailability';
import { logAuditAction } from '@/utils/auditLogger';
import { runWithCorrelationId } from '@/utils/asyncContext';
import { auth } from '@clerk/nextjs/server';

export async function updateProductStockAvailabilityAction(
  productId: string,
  stockAvailability: string
) {
  return runWithCorrelationId(async () => {
    const { userId, orgId, orgRole } = await auth();
    if (!userId || !orgId) {
      throw new Error('Not authorized.');
    }
    if (orgRole !== 'org:admin' && orgRole !== 'org:member') {
      throw new Error('Not authorized to update inventory.');
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
