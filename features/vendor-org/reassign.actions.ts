'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { checkSuperAdmin } from '@/shared/auth/superadmin-guard';
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
    throw new Error('Target organization was not found in Clerk.');
  }
}

export async function reassignVendorOrgAction(input: {
  fromOrgId: string;
  toOrgId: string;
  scopes: {
    products: boolean;
    orderItems: boolean;
    suppliers: boolean;
    branches: boolean;
    billingReceipts: boolean;
  };
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(10, 60 * 1000);
    const user = await checkSuperAdmin();

    const parsed = reassignVendorOrgSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid reassignment request.');
    }

    const { fromOrgId, toOrgId, scopes } = parsed.data;
    if (fromOrgId === toOrgId) {
      throw new Error('Source and target organization IDs must be different.');
    }

    if (!Object.values(scopes).some(Boolean)) {
      throw new Error('Select at least one record type to reassign.');
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
      throw new Error(
        'No records were updated. Confirm the orphan org ID still exists in the database and at least one selected record type has matches.'
      );
    }

    invalidateClerkCache();

    await logAuditAction({
      userId: user.id,
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
}

export async function reassignProductOrgAction(productId: string, toOrgId: string) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const user = await checkSuperAdmin();

    const parsed = reassignProductOrgSchema.safeParse({ productId, toOrgId });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid product reassignment request.');
    }

    await assertClerkOrganizationExists(parsed.data.toOrgId);

    const [product] = await db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        orgId: schema.products.orgId,
      })
      .from(schema.products)
      .where(eq(schema.products.id, parsed.data.productId))
      .limit(1);

    if (!product) {
      throw new Error('Product not found.');
    }

    await db
      .update(schema.products)
      .set({ orgId: parsed.data.toOrgId, updatedAt: new Date() })
      .where(eq(schema.products.id, parsed.data.productId));

    invalidateClerkCache();

    await logAuditAction({
      userId: user.id,
      action: 'REASSIGN_PRODUCT_ORG',
      targetType: 'product',
      targetId: parsed.data.productId,
      metadata: {
        productName: product.name,
        fromOrgId: product.orgId,
        toOrgId: parsed.data.toOrgId,
      },
    });

    revalidatePath('/superadmin');
    revalidatePath('/products');
    revalidatePath(`/products/${parsed.data.productId}`);

    return { success: true as const };
  });
}
