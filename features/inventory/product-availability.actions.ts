'use server';

import * as schema from '@/shared/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidateVendorConsole } from '@/features/vendor/revalidate';
import { revalidatePath } from 'next/cache';
import { validateStockAvailabilityId } from '@/features/inventory/availability.server';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';
import { z } from 'zod/v3';
import { orgAdminAction, ActionError } from '@/lib/safe-action';

const actionSchema = z.object({
  productId: z.string().uuid('Product ID must be a valid UUID.'),
  stockAvailability: z.string().min(1).max(50),
});

export const updateProductStockAvailabilityAction = orgAdminAction
  .schema(actionSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(30, 60 * 1000);

      // orgAdminAction guarantees: userId, orgId, orgRole === 'org:admin' (or superadmin).
      const { userId, orgId } = ctx;
      if (!orgId) {
        throw new ActionError('No active organization context.');
      }

      const { productId, stockAvailability } = parsedInput;

      const availability = await validateStockAvailabilityId(stockAvailability);
      if (!availability) {
        throw new ActionError('Invalid stock availability status.');
      }

      const [product] = await ctx.db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(and(eq(schema.products.id, productId), eq(schema.products.orgId, orgId)))
        .limit(1);

      if (!product) {
        throw new ActionError('Product not found or access denied.');
      }

      const result = await ctx.db
        .update(schema.inventory)
        .set({ stockAvailability: availability.id, updatedAt: new Date() })
        .where(eq(schema.inventory.productId, productId))
        .returning({ id: schema.inventory.id });

      if (result.length === 0) {
        throw new ActionError('Inventory record not found for this product.');
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
  });
