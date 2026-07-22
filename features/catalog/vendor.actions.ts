"use server";

import { clerkClient } from "@clerk/nextjs/server";
import * as schema from "@/shared/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { revalidateVendorConsole } from "@/features/vendor/revalidate";
import { getSystemSetting } from "@/shared/platform/settings";
import { logger } from "@/shared/logging/logger";
import { addProductSchema, vendorDeleteProductSchema } from "@/features/catalog/schema";
import { logAuditAction } from "@/shared/audit/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import { getPremiumStatus, DEFAULT_MAX_LISTING_COUNT } from "@/features/inventory/premium-license";
import { validateStockAvailabilityId } from "@/features/inventory/availability.server";
import { isAllowedCloudinaryDeliveryUrl } from "@/shared/media/cloudinary-url";
import { deleteCloudinaryAsset } from "@/shared/media/cloudinary-server";
import { z } from "zod/v3";
import { vendorAction, orgAdminAction, ActionError } from "@/lib/safe-action";

/**
 * Enterprise-grade Server Action to securely insert a new product/service into PostgreSQL.
 * Validates authentication, roles, and input formatting to prevent injections or cross-tenant write operations.
 */
export const addProductAction = vendorAction
  .schema(addProductSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, orgId, orgRole, db } = ctx;

    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000);

      if (!orgId) {
        throw new ActionError("Not authorized: You must be signed in with an active organization.");
      }

      // Validate that all Cloudinary URLs belong to the current vendor organization
      if (parsedInput.imageUrl) {
        if (!isAllowedCloudinaryDeliveryUrl(parsedInput.imageUrl, orgId)) {
          throw new ActionError(
            "Invalid product image: The image must belong to your organization folder.",
          );
        }
      }
      for (const item of parsedInput.media) {
        if (!isAllowedCloudinaryDeliveryUrl(item.url, orgId)) {
          throw new ActionError(
            "Invalid product media: The media must belong to your organization folder.",
          );
        }
      }

      // Convert price to cents to avoid floating-point arithmetic errors
      const priceInCents = Math.round(parsedInput.priceInDollars * 100);

      // Load max media uploads config and validate
      const maxMediaLimitSetting = await getSystemSetting("max_media_limit", "5");
      const maxMediaLimit = parseInt(maxMediaLimitSetting, 10) || 5;

      const mediaPayload = parsedInput.media.slice(0, maxMediaLimit);

      // Resolve premium status and org stock allocation mode (before starting the transaction)
      const premiumStatus = await getPremiumStatus(orgId);
      const client = await clerkClient();
      const org = await client.organizations.getOrganization({ organizationId: orgId });
      const orgMetadata = (org.publicMetadata || {}) as {
        stockAllocationMode?: "target_branch" | "central_intake";
        ims_max_listing_count?: number;
      };
      const stockAllocationMode = orgMetadata.stockAllocationMode || "central_intake";

      // ── Listing Count Enforcement ────────────────────────────────────────────
      // Resolve org-specific limit: fall back to DEFAULT_MAX_LISTING_COUNT (10)
      // if the superadmin has not set an explicit override in Clerk metadata.
      const resolvedMaxListings =
        typeof orgMetadata.ims_max_listing_count === "number" &&
        Number.isInteger(orgMetadata.ims_max_listing_count) &&
        orgMetadata.ims_max_listing_count >= 1
          ? orgMetadata.ims_max_listing_count
          : DEFAULT_MAX_LISTING_COUNT;

      const [listingCountRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.products)
        .where(and(eq(schema.products.orgId, orgId), eq(schema.products.status, "active")));

      const currentListingCount = listingCountRow?.count ?? 0;

      if (currentListingCount >= resolvedMaxListings) {
        throw new ActionError(
          `Your organization has reached its maximum listing limit of ${resolvedMaxListings} active item${
            resolvedMaxListings === 1 ? "" : "s"
          }. Please contact support to upgrade your plan.`,
        );
      }
      // ── End Listing Count Enforcement ────────────────────────────────────────

      let resolvedStockAvailability = "in_stock";
      if (parsedInput.type === "product") {
        const availability = await validateStockAvailabilityId(parsedInput.stockAvailability);
        if (!availability) {
          throw new ActionError("Invalid stock availability status selected.");
        }
        resolvedStockAvailability = availability.id;
      }

      // Secure Insert within a database transaction
      const newProduct = await db.transaction(async (tx) => {
        const [prod] = await tx
          .insert(schema.products)
          .values({
            name: parsedInput.name,
            type: parsedInput.type,
            description: parsedInput.description,
            price: priceInCents,
            imageUrl: parsedInput.imageUrl || null,
            media: mediaPayload,
            orgId: orgId, // Tied securely to user's current session orgId
            categoryId: parsedInput.categoryId || null,
          })
          .returning();

        if (!prod) {
          throw new ActionError("Failed to create product record.");
        }

        // Initialize inventory entry if product type is 'product'
        if (prod.type === "product") {
          const initialQty = parsedInput.quantity ?? 0;

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
              type: "restock",
              quantityChanged: initialQty,
              previousQuantity: 0,
              newQuantity: initialQty,
              reason: "Initial setup on item creation",
              userId,
            });
          }

          // Multi-branch: only seed branch stock in target_branch mode.
          // central_intake keeps all quantity at central until an admin allocates to a branch.
          if (premiumStatus.multiBranchActive && stockAllocationMode === "target_branch") {
            const orgBranches = await tx
              .select({ id: schema.branches.id, isDefault: schema.branches.isDefault })
              .from(schema.branches)
              .where(eq(schema.branches.orgId, orgId));

            let targetBranchId = parsedInput.branchId;
            if (!targetBranchId) {
              const defaultBranch = orgBranches.find((b) => b.isDefault) || orgBranches[0];
              targetBranchId = defaultBranch?.id;
            }

            if (targetBranchId && !orgBranches.some((b) => b.id === targetBranchId)) {
              throw new ActionError("Selected branch is not valid for this organization.");
            }

            if (orgRole !== "org:admin" && targetBranchId) {
              const [membership] = await tx
                .select({ id: schema.branchMembers.id })
                .from(schema.branchMembers)
                .where(
                  and(
                    eq(schema.branchMembers.branchId, targetBranchId),
                    eq(schema.branchMembers.memberUserId, userId),
                  ),
                )
                .limit(1);

              if (!membership) {
                throw new ActionError(
                  "Not authorized: You are not assigned to the selected branch.",
                );
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
          action: "CREATE_PRODUCT",
          targetType: "product",
          targetId: newProduct.id,
          metadata: {
            name: newProduct.name,
            type: newProduct.type,
            price: newProduct.price,
            orgId: newProduct.orgId,
          },
        });
      }

      // Cache Invalidation
      revalidatePath("/products");
      revalidatePath("/vendors");
      revalidateVendorConsole();
      updateTag(`vendor-products-${orgId}`);

      return { success: true };
    });
  });

/**
 * Secures and handles deletion of a product/service.
 * Ensures the product actually belongs to the user's active organization (prevents cross-tenant deletion).
 */
export const deleteProductAction = orgAdminAction
  .schema(vendorDeleteProductSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, orgId, db } = ctx;

    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000);

      if (!orgId) {
        throw new ActionError("Not authorized: You must be signed in with an active organization.");
      }

      // Safe Deletion: Conditioned on both Product ID AND Organization ID
      const result = await db
        .delete(schema.products)
        .where(
          and(
            eq(schema.products.id, parsedInput.productId),
            eq(schema.products.orgId, orgId), // Prevent deleting items from other vendors
          ),
        )
        .returning();

      if (result.length === 0) {
        throw new ActionError("Item not found or does not belong to your organization.");
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
          action: "DELETE_PRODUCT",
          targetType: "product",
          targetId: deletedProduct.id,
          metadata: {
            name: deletedProduct.name,
            orgId: deletedProduct.orgId,
          },
        });
      }

      // Cache Invalidation
      revalidatePath("/products");
      revalidatePath("/vendors");
      revalidateVendorConsole();
      updateTag(`vendor-products-${orgId}`);

      return { success: true };
    });
  });

/**
 * Enterprise solution for quick stock updates directly from the catalog.
 * Useful for free-tier users who don't have access to the full IMS.
 */
export const quickUpdateProductStockAction = vendorAction
  .schema(
    z.object({
      productId: z.string().uuid("Invalid product ID."),
      newQuantity: z
        .number()
        .int("Quantity must be a whole number.")
        .nonnegative("Quantity cannot be negative."),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { userId, orgId, db } = ctx;

    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000);

      if (!orgId) {
        throw new ActionError("Not authorized: You must be signed in with an active organization.");
      }

      const { productId, newQuantity } = parsedInput;

      // Transaction for secure lookup and update
      await db.transaction(async (tx) => {
        // Ensure product belongs to org
        const [prod] = await tx
          .select({ id: schema.products.id, type: schema.products.type })
          .from(schema.products)
          .where(and(eq(schema.products.id, productId), eq(schema.products.orgId, orgId)))
          .limit(1);

        if (!prod || prod.type !== "product") {
          throw new ActionError("Product not found or not eligible for stock update.");
        }

        // Get central inventory record
        const [inv] = await tx
          .select({ id: schema.inventory.id, quantity: schema.inventory.quantity })
          .from(schema.inventory)
          .where(eq(schema.inventory.productId, productId))
          .limit(1);

        if (!inv) {
          throw new ActionError("Inventory record not found. (Legacy product without inventory)");
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
          type: "manual_adjustment",
          quantityChanged: newQuantity - prevQty,
          previousQuantity: prevQty,
          newQuantity: newQuantity,
          reason: "Quick stock update from catalog (Free Tier / Quick Edit)",
          userId,
        });
      });

      // Cache Invalidation
      revalidatePath("/products");
      revalidatePath("/vendors");
      revalidateVendorConsole();
      updateTag(`vendor-products-${orgId}`);

      return { success: true };
    });
  });
