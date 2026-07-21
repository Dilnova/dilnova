'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { superadminAction, ActionError } from '@/lib/safe-action';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';
import { invalidateClerkCache } from '@/shared/auth/clerk-cache';
import { reassignProductOrgSchema, reassignVendorOrgSchema } from '@/features/vendor-org/schema';

async function assertClerkOrganizationExists(orgId: string) {
  const client = await clerkClient();
  try {
    await client.organizations.getOrganization({ organizationId: orgId });
  } catch {
    throw new ActionError('Target organization was not found in Clerk.');
  }
}

export const reassignVendorOrgAction = superadminAction
  .schema(reassignVendorOrgSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(10, 60 * 1000);

      const { fromOrgId, toOrgId, scopes } = parsedInput;
      if (fromOrgId === toOrgId) {
        throw new ActionError('Source and target organization IDs must be different.');
      }

      if (!Object.values(scopes).some(Boolean)) {
        throw new ActionError('Select at least one record type to reassign.');
      }

      await assertClerkOrganizationExists(toOrgId);

      const counts = await db.transaction(async (tx) => {
        const updated = {
          products: 0,
          orderItems: 0,
          suppliers: 0,
          branches: 0,
          billingReceipts: 0,
        };

        if (scopes.products) {
          const rows = await tx
            .update(schema.products)
            .set({ orgId: toOrgId, updatedAt: new Date() })
            .where(eq(schema.products.orgId, fromOrgId))
            .returning({ id: schema.products.id });
          updated.products = rows.length;
        }

        if (scopes.orderItems) {
          const rows = await tx
            .update(schema.simulatedOrderItems)
            .set({ vendorOrgId: toOrgId })
            .where(eq(schema.simulatedOrderItems.vendorOrgId, fromOrgId))
            .returning({ id: schema.simulatedOrderItems.id });
          updated.orderItems = rows.length;
        }

        if (scopes.suppliers) {
          const rows = await tx
            .update(schema.suppliers)
            .set({ orgId: toOrgId })
            .where(eq(schema.suppliers.orgId, fromOrgId))
            .returning({ id: schema.suppliers.id });
          updated.suppliers = rows.length;
        }

        if (scopes.branches) {
          const rows = await tx
            .update(schema.branches)
            .set({ orgId: toOrgId, updatedAt: new Date() })
            .where(eq(schema.branches.orgId, fromOrgId))
            .returning({ id: schema.branches.id });
          updated.branches = rows.length;
        }

        if (scopes.billingReceipts) {
          const rows = await tx
            .update(schema.billingReceipts)
            .set({ orgId: toOrgId })
            .where(eq(schema.billingReceipts.orgId, fromOrgId))
            .returning({ id: schema.billingReceipts.id });
          updated.billingReceipts = rows.length;
        }

        return updated;
      });

      const totalUpdated = Object.values(counts).reduce((sum, count) => sum + count, 0);
      if (totalUpdated === 0) {
        throw new ActionError(
          'No records were updated. Confirm the orphan org ID still exists in the database and at least one selected record type has matches.'
        );
      }

      invalidateClerkCache();

      await logAuditAction({
        userId: ctx.userId,
        action: 'REASSIGN_VENDOR_ORG',
        targetType: 'vendor',
        targetId: fromOrgId,
        metadata: { fromOrgId, toOrgId, scopes, counts },
      });

      revalidatePath('/superadmin');
      revalidatePath('/products');
      revalidatePath('/vendor');
      revalidatePath('/vendors');
      revalidatePath('/');

      return { success: true as const, counts };
    });
  });

export const reassignProductOrgAction = superadminAction
  .schema(reassignProductOrgSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000);

      await assertClerkOrganizationExists(parsedInput.toOrgId);

      const [product] = await db
        .select({
          id: schema.products.id,
          name: schema.products.name,
          orgId: schema.products.orgId,
        })
        .from(schema.products)
        .where(eq(schema.products.id, parsedInput.productId))
        .limit(1);

      if (!product) {
        throw new ActionError('Product not found.');
      }

      await db
        .update(schema.products)
        .set({ orgId: parsedInput.toOrgId, updatedAt: new Date() })
        .where(eq(schema.products.id, parsedInput.productId));

      invalidateClerkCache();

      await logAuditAction({
        userId: ctx.userId,
        action: 'REASSIGN_PRODUCT_ORG',
        targetType: 'product',
        targetId: parsedInput.productId,
        metadata: {
          productName: product.name,
          fromOrgId: product.orgId,
          toOrgId: parsedInput.toOrgId,
        },
      });

      revalidatePath('/superadmin');
      revalidatePath('/products');
      revalidatePath(`/products/${parsedInput.productId}`);

      return { success: true as const };
    });
  });
