'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath, updateTag } from 'next/cache';
import { revalidateVendorConsole } from '@/features/vendor/revalidate';
import { getSystemSetting } from '@/shared/platform/settings';
import { logger } from '@/shared/logging/logger';
import { addProductSchema, vendorDeleteProductSchema } from '@/features/catalog/schema';
import { logAuditAction } from '@/shared/audit/logger';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { rateLimit } from '@/shared/security/rate-limit';
import { getPremiumStatus, DEFAULT_MAX_LISTING_COUNT } from '@/features/inventory/premium-license';
import { validateStockAvailabilityId } from '@/features/inventory/availability.server';
import { isAllowedCloudinaryDeliveryUrl } from '@/shared/media/cloudinary-url';
import { requireVendorRole } from '@/shared/auth/vendor-guard';
import { deleteCloudinaryAsset } from '@/shared/media/cloudinary-server';

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
      await rateLimit(20, 60 * 1000);

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
      await requireVendorRole(userId);

      // 2. Validate that all Cloudinary URLs belong to the current vendor organization
      if (parsed.data.imageUrl) {
        if (!isAllowedCloudinaryDeliveryUrl(parsed.data.imageUrl, orgId)) {
          throw new Error('Invalid product image: The image must belong to your organization folder.');
        }
      }
      for (const item of parsed.data.media) {
        if (!isAllowedCloudinaryDeliveryUrl(item.url, orgId)) {
          throw new Error('Invalid product media: The media must belong to your organization folder.');
        }
      }

      // 3. Authorization Check: Must be admin or vendor member of the organization
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
        ims_max_listing_count?: number;
      };
      const stockAllocationMode = orgMetadata.stockAllocationMode || 'central_intake';

      // ── Listing Count Enforcement ────────────────────────────────────────────
      // Resolve org-specific limit: fall back to DEFAULT_MAX_LISTING_COUNT (10)
      // if the superadmin has not set an explicit override in Clerk metadata.
      const resolvedMaxListings =
        typeof orgMetadata.ims_max_listing_count === 'number' &&
        Number.isInteger(orgMetadata.ims_max_listing_count) &&
        orgMetadata.ims_max_listing_count >= 1
          ? orgMetadata.ims_max_listing_count
          : DEFAULT_MAX_LISTING_COUNT;

      const [listingCountRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.products)
        .where(and(eq(schema.products.orgId, orgId), eq(schema.products.status, 'active')));

      const currentListingCount = listingCountRow?.count ?? 0;

      if (currentListingCount >= resolvedMaxListings) {
        throw new Error(
          `Your organization has reached its maximum listing limit of ${resolvedMaxListings} active item${
            resolvedMaxListings === 1 ? '' : 's'
          }. Please contact support to upgrade your plan.`
        );
      }
      // ── End Listing Count Enforcement ────────────────────────────────────────

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
      await rateLimit(20, 60 * 1000);

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
      await requireVendorRole(userId);

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
        if (deletedProduct.imageUrl) {
          await deleteCloudinaryAsset(deletedProduct.imageUrl);
        }
        if (deletedProduct.media && Array.isArray(deletedProduct.media)) {
          for (const m of deletedProduct.media) {
            await deleteCloudinaryAsset(m.url, m.type);
          }
        }

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

/**
 * Enterprise solution for quick stock updates directly from the catalog.
 * Useful for free-tier users who don't have access to the full IMS.
 */
export async function quickUpdateProductStockAction(productId: string, newQuantity: number) {
  return runWithCorrelationId(async () => {
    try {
      await rateLimit(20, 60 * 1000);

      if (typeof newQuantity !== 'number' || !Number.isInteger(newQuantity) || newQuantity < 0) {
        throw new Error('Invalid quantity');
      }

      // 1. Authentication & Organization Context Check
      const { userId, orgId, orgRole } = await auth();
      if (!userId || !orgId) {
        throw new Error('Not authorized: You must be signed in with an active organization.');
      }
      await requireVendorRole(userId);

      if (orgRole !== 'org:admin' && orgRole !== 'org:member') {
        throw new Error('Not authorized: You do not have permissions to manage this catalog.');
      }

      // 2. Transaction for secure lookup and update
      await db.transaction(async (tx) => {
        // Ensure product belongs to org
        const [prod] = await tx
          .select({ id: schema.products.id, type: schema.products.type })
          .from(schema.products)
          .where(
            and(
              eq(schema.products.id, productId),
              eq(schema.products.orgId, orgId)
            )
          )
          .limit(1);

        if (!prod || prod.type !== 'product') {
          throw new Error('Product not found or not eligible for stock update.');
        }

        // Get central inventory record
        const [inv] = await tx
          .select({ id: schema.inventory.id, quantity: schema.inventory.quantity })
          .from(schema.inventory)
          .where(eq(schema.inventory.productId, productId))
          .limit(1);

        if (!inv) {
          throw new Error('Inventory record not found. (Legacy product without inventory)');
        }

        const prevQty = inv.quantity;

        // Update central inventory
        await tx
          .update(schema.inventory)
          .set({ quantity: newQuantity, updatedAt: new Date() })
          .where(eq(schema.inventory.id, inv.id));

        // Create movement log
        await tx.insert(schema.inventoryMovements).values({
          inventoryId: inv.id,
          type: 'manual_adjustment',
          quantityChanged: newQuantity - prevQty,
          previousQuantity: prevQty,
          newQuantity: newQuantity,
          reason: 'Quick stock update from catalog (Free Tier / Quick Edit)',
          userId,
        });
      });

      // 3. Cache Invalidation
      revalidatePath('/products');
      revalidatePath('/vendors');
      revalidateVendorConsole();
      updateTag(`vendor-products-${orgId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error updating stock', error);
      throw new Error(error instanceof Error ? error.message : 'Internal database error');
    }
  });
}
