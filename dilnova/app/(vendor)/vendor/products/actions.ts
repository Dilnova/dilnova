'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath, updateTag } from 'next/cache';
import { revalidateVendorConsole } from '@/utils/revalidateVendorConsole';
import { getSystemSetting } from '@/utils/settings';
import { logger } from '@/utils/logger';
import { addProductSchema, vendorDeleteProductSchema } from '@/utils/schemas';
import { logAuditAction } from '@/utils/auditLogger';
import { runWithCorrelationId } from '@/utils/asyncContext';
import { getPremiumStatus } from '@/utils/premiumLicense';
import { validateStockAvailabilityId } from '@/utils/stockAvailability';

/**
 * Enterprise-grade Server Action to securely insert a new product/service into PostgreSQL.
 * Validates authentication, roles, and input formatting to prevent injections or cross-tenant write operations.
 */
export async function addProductAction(data: {
  name: string;
  type: 'product' | 'service';
  description: string;
  priceInDollars: number;
  imageUrl: string;
  media: { url: string; type: 'image' | 'video' }[];
  categoryId: string;
  quantity?: number;
  branchId?: string;
  stockAvailability?: string;
}) {
  return runWithCorrelationId(async () => {
    try {
      // ── Schema Validation ──
      const parsed = addProductSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
      }

      // 1. Authentication & Organization Context Check
      const { userId, orgId, orgRole } = await auth();
      if (!userId || !orgId) {
        throw new Error('Not authorized: You must be signed in with an active organization.');
      }

      // 2. Authorization Check: Must be admin or vendor member of the organization
      if (orgRole !== 'org:admin' && orgRole !== 'org:member') {
        throw new Error('Not authorized: You do not have permissions to manage this catalog.');
      }

      // Convert price to cents to avoid floating-point arithmetic errors
      const priceInCents = Math.round(parsed.data.priceInDollars * 100);

      // Load max media uploads config and validate
      const maxMediaLimitSetting = await getSystemSetting('max_media_limit', '5');
      const maxMediaLimit = parseInt(maxMediaLimitSetting, 10) || 5;

      const mediaPayload = parsed.data.media.slice(0, maxMediaLimit);

      // Resolve premium status and org stock allocation mode (before starting the transaction)
      const premiumStatus = await getPremiumStatus(orgId);
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({ organizationId: orgId });
      const orgMetadata = (org.publicMetadata || {}) as {
        stockAllocationMode?: 'target_branch' | 'central_intake';
      };
      const stockAllocationMode = orgMetadata.stockAllocationMode || 'central_intake';

      let resolvedStockAvailability = 'in_stock';
      if (parsed.data.type === 'product') {
        const availability = await validateStockAvailabilityId(parsed.data.stockAvailability);
        if (!availability) {
          throw new Error('Invalid stock availability status selected.');
        }
        resolvedStockAvailability = availability.id;
      }

      // 3. Secure Insert within a database transaction
      const newProduct = await db.transaction(async (tx) => {
        const [prod] = await tx
          .insert(schema.products)
          .values({
            name: parsed.data.name,
            type: parsed.data.type,
            description: parsed.data.description,
            price: priceInCents,
            imageUrl: parsed.data.imageUrl || null,
            media: mediaPayload,
            orgId: orgId, // Tied securely to user's current session orgId
            categoryId: parsed.data.categoryId || null,
          })
          .returning();

        if (!prod) {
          throw new Error('Failed to create product record.');
        }

        // Initialize inventory entry if product type is 'product'
        if (prod.type === 'product') {
          const initialQty = parsed.data.quantity ?? 0;

          const [inv] = await tx
            .insert(schema.inventory)
            .values({
              productId: prod.id,
              sku: null,
              quantity: initialQty,
              lowStockThreshold: 5,
              binLocation: null,
              supplierId: null,
              stockAvailability: resolvedStockAvailability,
            })
            .returning();

          if (inv && initialQty > 0) {
            await tx.insert(schema.inventoryMovements).values({
              inventoryId: inv.id,
              type: 'restock',
              quantityChanged: initialQty,
              previousQuantity: 0,
              newQuantity: initialQty,
              reason: 'Initial setup on item creation',
              userId,
            });
          }

          // Multi-branch: only seed branch stock in target_branch mode.
          // central_intake keeps all quantity at central until an admin allocates to a branch.
          if (premiumStatus.multiBranchActive && stockAllocationMode === 'target_branch') {
            const orgBranches = await tx
              .select({ id: schema.branches.id, isDefault: schema.branches.isDefault })
              .from(schema.branches)
              .where(eq(schema.branches.orgId, orgId));

            let targetBranchId = parsed.data.branchId;
            if (!targetBranchId) {
              const defaultBranch = orgBranches.find((b) => b.isDefault) || orgBranches[0];
              targetBranchId = defaultBranch?.id;
            }

            if (targetBranchId && !orgBranches.some((b) => b.id === targetBranchId)) {
              throw new Error('Selected branch is not valid for this organization.');
            }

            if (orgRole !== 'org:admin' && targetBranchId) {
              const [membership] = await tx
                .select({ id: schema.branchMembers.id })
                .from(schema.branchMembers)
                .where(
                  and(
                    eq(schema.branchMembers.branchId, targetBranchId),
                    eq(schema.branchMembers.memberUserId, userId)
                  )
                )
                .limit(1);

              if (!membership) {
                throw new Error('Not authorized: You are not assigned to the selected branch.');
              }
            }

            if (targetBranchId) {
              for (const ob of orgBranches) {
                await tx.insert(schema.branchInventory).values({
                  branchId: ob.id,
                  productId: prod.id,
                  quantity: ob.id === targetBranchId ? initialQty : 0,
                  sku: null,
                  binLocation: null,
                });
              }
            }
          }
        }

        return prod;
      });

      if (newProduct) {
        await logAuditAction({
          userId,
          action: 'CREATE_PRODUCT',
          targetType: 'product',
          targetId: newProduct.id,
          metadata: {
            name: newProduct.name,
            type: newProduct.type,
            price: newProduct.price,
            orgId: newProduct.orgId,
          },
        });
      }

      // 4. Cache Invalidation
      revalidatePath('/products');
      revalidatePath('/vendors');
      revalidateVendorConsole();
      updateTag(`vendor-products-${orgId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error adding product', error);
      throw new Error(error instanceof Error ? error.message : 'Internal database error');
    }
  });
}

/**
 * Secures and handles deletion of a product/service.
 * Ensures the product actually belongs to the user's active organization (prevents cross-tenant deletion).
 */
export async function deleteProductAction(productId: string) {
  return runWithCorrelationId(async () => {
    try {
      // ── Schema Validation ──
      const parsed = vendorDeleteProductSchema.safeParse({ productId });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'Invalid input.');
      }

      // 1. Authentication & Organization Context Check
      const { userId, orgId, orgRole } = await auth();
      if (!userId || !orgId) {
        throw new Error('Not authorized: You must be signed in with an active organization.');
      }

      // 2. Authorization Check
      if (orgRole !== 'org:admin') {
        throw new Error('Not authorized: Only administrators can modify this catalog.');
      }

      // 3. Safe Deletion: Conditioned on both Product ID AND Organization ID
      const result = await db
        .delete(schema.products)
        .where(
          and(
            eq(schema.products.id, parsed.data.productId),
            eq(schema.products.orgId, orgId) // Prevent deleting items from other vendors
          )
        )
        .returning();

      if (result.length === 0) {
        throw new Error('Item not found or does not belong to your organization.');
      }

      const deletedProduct = result[0];
      if (deletedProduct) {
        await logAuditAction({
          userId,
          action: 'DELETE_PRODUCT',
          targetType: 'product',
          targetId: deletedProduct.id,
          metadata: {
            name: deletedProduct.name,
            orgId: deletedProduct.orgId,
          },
        });
      }

      // 4. Cache Invalidation
      revalidatePath('/products');
      revalidatePath('/vendors');
      revalidateVendorConsole();
      updateTag(`vendor-products-${orgId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error deleting product', error);
      throw new Error(error instanceof Error ? error.message : 'Internal database error');
    }
  });
}
