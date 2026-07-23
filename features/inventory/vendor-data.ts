import "server-only";

import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getCachedOrgMembers } from "@/shared/auth/clerk-cache";
import { getPremiumStatus } from "@/features/inventory/premium-license";
import { getStockAvailabilityCatalog } from "@/features/inventory/availability.server";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { getCheckoutOptionsCatalog } from "@/features/organization/checkout-options";
import type { VendorBillingRegisterData } from "@/features/billing/types";
import type { VendorInventoryFullData } from "@/features/inventory/types";
import { attachPaymentSlipPreviews } from "@/features/orders/payment-slip-preview";
import { logger } from "@/shared/logging/logger";

export async function verifyVendorAccess(options?: { allowMember?: boolean }) {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId) {
    throw new Error("Not authorized: You must be signed in with an active organization.");
  }

  const allowMember = options?.allowMember === true;
  if (allowMember) {
    if (orgRole !== "org:admin" && orgRole !== "org:member") {
      throw new Error("Not authorized: You do not have access to this organization.");
    }
  } else if (orgRole !== "org:admin") {
    throw new Error("Not authorized: Only organization admins can perform this action.");
  }

  const premiumStatus = await getPremiumStatus(orgId);
  if (!premiumStatus.imsActive) {
    throw new Error("Inventory Management System access is disabled or expired.");
  }

  return { userId, orgId, orgRole, premiumStatus };
}

export type GetVendorInventoryDataOptions = {
  allowMember?: boolean;
  productsLimit?: number;
  productsOffset?: number;
  movementsLimit?: number;
  ordersLimit?: number;
  ordersOffset?: number;
  suppliersLimit?: number;
  branchesLimit?: number;
};

// ── GET VENDOR IMS DATA ──────────────────────────────────────

export async function loadVendorInventoryData(
  scope: "full" | "billing",
  options?: GetVendorInventoryDataOptions,
): Promise<VendorInventoryFullData | VendorBillingRegisterData> {
  return runWithCorrelationId(async () => {
    const { userId, orgId, orgRole, premiumStatus } = await verifyVendorAccess({
      allowMember: options?.allowMember === true,
    });

    if (scope === "billing" && !premiumStatus.billingActive) {
      throw new Error("POS Billing Register feature is not unlocked on your account tier.");
    }

    const productsLimit = options?.productsLimit ?? 200;
    const productsOffset = options?.productsOffset ?? 0;

    // 1. Fetch Products
    const vendorProducts = await db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        type: schema.products.type,
        orgId: schema.products.orgId,
      })
      .from(schema.products)
      .where(eq(schema.products.orgId, orgId))
      .limit(productsLimit)
      .offset(productsOffset);

    const productIds = vendorProducts.map((p) => p.id);

    // 2. Fetch Central Inventory (with auto-initialization of missing records)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let inventoryItems: any[] = [];
    if (productIds.length > 0) {
      // Find which products already have an inventory tracking record
      const existingInventory = await db
        .select({
          productId: schema.inventory.productId,
        })
        .from(schema.inventory)
        .where(inArray(schema.inventory.productId, productIds));

      const trackedProductIdsSet = new Set(existingInventory.map((i) => i.productId));

      // Identify products of type 'product' that do not have an inventory row yet
      const missingInventoryProducts = vendorProducts.filter(
        (p) => p.type === "product" && !trackedProductIdsSet.has(p.id),
      );

      // Bulk initialize missing inventory records
      if (missingInventoryProducts.length > 0) {
        await db.insert(schema.inventory).values(
          missingInventoryProducts.map((p) => ({
            productId: p.id,
            sku: null,
            quantity: 0,
            lowStockThreshold: 5,
            binLocation: null,
            supplierId: null,
            stockAvailability: "in_stock",
          })),
        );
      }

      // Fetch the full inventory records list (left joining products so both products and services are fetched)
      inventoryItems = await db
        .select({
          id: schema.inventory.id,
          productId: schema.products.id,
          sku: schema.inventory.sku,
          quantity: schema.inventory.quantity,
          lowStockThreshold: schema.inventory.lowStockThreshold,
          binLocation: schema.inventory.binLocation,
          supplierId: schema.inventory.supplierId,
          stockAvailability: schema.inventory.stockAvailability,
          updatedAt: schema.inventory.updatedAt,
          productName: schema.products.name,
          productType: schema.products.type,
          productPrice: schema.products.price,
          supplierName: schema.suppliers.name,
        })
        .from(schema.products)
        .leftJoin(schema.inventory, eq(schema.products.id, schema.inventory.productId))
        .leftJoin(schema.suppliers, eq(schema.inventory.supplierId, schema.suppliers.id))
        .where(eq(schema.products.orgId, orgId))
        .limit(productsLimit)
        .offset(productsOffset);
    }

    let productsWithoutInventory: typeof vendorProducts = [];
    if (scope === "full") {
      const trackedProductIds = new Set(inventoryItems.map((i) => i.productId));
      productsWithoutInventory = vendorProducts.filter(
        (p) => !trackedProductIds.has(p.id) && p.type === "product",
      );
    }

    // 3. Fetch Suppliers (full IMS workspace only)
    let suppliers: (typeof schema.suppliers.$inferSelect)[] = [];
    if (scope === "full") {
      const suppliersLimit = options?.suppliersLimit ?? 100;
      suppliers = await db
        .select()
        .from(schema.suppliers)
        .where(eq(schema.suppliers.orgId, orgId))
        .limit(suppliersLimit);
    }

    // 4. Fetch Inventory Movements (full IMS workspace only)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let movements: any[] = [];
    if (scope === "full" && inventoryItems.length > 0) {
      const inventoryIds = inventoryItems.map((i) => i.id);
      const movementsLimit = options?.movementsLimit ?? 100;
      movements = await db
        .select({
          id: schema.inventoryMovements.id,
          inventoryId: schema.inventoryMovements.inventoryId,
          type: schema.inventoryMovements.type,
          quantityChanged: schema.inventoryMovements.quantityChanged,
          previousQuantity: schema.inventoryMovements.previousQuantity,
          newQuantity: schema.inventoryMovements.newQuantity,
          reason: schema.inventoryMovements.reason,
          userId: schema.inventoryMovements.userId,
          createdAt: schema.inventoryMovements.createdAt,
          productName: schema.products.name,
        })
        .from(schema.inventoryMovements)
        .innerJoin(schema.inventory, eq(schema.inventoryMovements.inventoryId, schema.inventory.id))
        .innerJoin(schema.products, eq(schema.inventory.productId, schema.products.id))
        .where(inArray(schema.inventoryMovements.inventoryId, inventoryIds))
        .orderBy(desc(schema.inventoryMovements.createdAt))
        .limit(movementsLimit);
    }

    // 5. Fetch Simulated Orders (full IMS workspace only)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let simulatedOrders: any[] = [];
    if (scope === "full" && productIds.length > 0) {
      try {
        // Find orders that contain at least one item from this vendor
        const relatedItems = await db
          .select()
          .from(schema.simulatedOrderItems)
          .where(eq(schema.simulatedOrderItems.vendorOrgId, orgId));

        const orderIds = Array.from(new Set(relatedItems.map((item) => item.orderId)));

        const ordersLimit = options?.ordersLimit ?? 50;
        const ordersOffset = options?.ordersOffset ?? 0;

        if (orderIds.length > 0) {
          const ordersList = await db
            .select()
            .from(schema.simulatedOrders)
            .where(inArray(schema.simulatedOrders.id, orderIds))
            .orderBy(desc(schema.simulatedOrders.createdAt))
            .limit(ordersLimit)
            .offset(ordersOffset);

          // Attach items
          const branchNameById = new Map(
            (
              await db
                .select({ id: schema.branches.id, name: schema.branches.name })
                .from(schema.branches)
                .where(eq(schema.branches.orgId, orgId))
                .limit(100)
            ).map((branch) => [branch.id, branch.name]),
          );

          simulatedOrders = await attachPaymentSlipPreviews(
            ordersList.map((o) => ({
              ...o,
              items: relatedItems.filter((ri) => ri.orderId === o.id),
              pickupBranchName: o.pickupBranchId
                ? (branchNameById.get(o.pickupBranchId) ?? null)
                : null,
            })),
          );
        }
      } catch (error) {
        logger.error("Failed to fetch simulated orders for vendor dashboard", error, { orgId });
        // simulatedOrders remains empty array []
      }
    }

    // 6. Fetch Branches (Premium Multi-Branch, or single default fallback if billing is active)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let branches: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let branchInventoryList: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let branchMembersList: any[] = [];
    if (premiumStatus.multiBranchActive || premiumStatus.billingActive) {
      const branchesLimit = options?.branchesLimit ?? 100;
      let allBranches = await db
        .select()
        .from(schema.branches)
        .where(eq(schema.branches.orgId, orgId))
        .orderBy(schema.branches.name)
        .limit(branchesLimit);

      // Idempotent default branch initialization — atomic upsert prevents race condition duplicates.
      // The partial unique index `unique_org_default_branch` on (org_id) WHERE is_default = true
      // guarantees only one default branch per org at the database level. Concurrent inserts
      // will silently no-op via ON CONFLICT DO NOTHING.
      if (allBranches.length === 0) {
        await db
          .insert(schema.branches)
          .values({
            orgId,
            name: "Main Register",
            isDefault: true,
          })
          .onConflictDoNothing();

        // Re-fetch to get the winning row (ours or the concurrent winner's)
        allBranches = await db
          .select()
          .from(schema.branches)
          .where(eq(schema.branches.orgId, orgId))
          .orderBy(schema.branches.name);
      }

      // Auto-migrate/initialize default branch inventory for ongoing shop records in multi-branch mode
      if (premiumStatus.multiBranchActive) {
        const defaultBranch = allBranches.find((b) => b.isDefault) || allBranches[0];
        if (defaultBranch) {
          const existingDefaultInv = await db
            .select({ productId: schema.branchInventory.productId })
            .from(schema.branchInventory)
            .where(eq(schema.branchInventory.branchId, defaultBranch.id));
          const defaultProductIdsSet = new Set(existingDefaultInv.map((bi) => bi.productId));

          const missingDefaultBranchInv = inventoryItems.filter(
            (item) => item.productType === "product" && !defaultProductIdsSet.has(item.productId),
          );

          if (missingDefaultBranchInv.length > 0) {
            await db.insert(schema.branchInventory).values(
              missingDefaultBranchInv.map((item) => ({
                branchId: defaultBranch.id,
                productId: item.productId,
                quantity: item.quantity ?? 0,
                sku: item.sku,
                binLocation: item.binLocation,
              })),
            );
          }
        }
      }

      // Filter branches for non-admin users if multi-branch is active
      if (premiumStatus.multiBranchActive && orgRole !== "org:admin") {
        const memberAssignments = await db
          .select({ branchId: schema.branchMembers.branchId })
          .from(schema.branchMembers)
          .where(eq(schema.branchMembers.memberUserId, userId));

        const assignedIds = new Set(memberAssignments.map((a) => a.branchId));
        branches = allBranches.filter((b) => assignedIds.has(b.id));
      } else {
        branches = allBranches;
      }

      const branchIds = branches.map((b) => b.id);
      if (branchIds.length > 0) {
        if (premiumStatus.multiBranchActive) {
          branchInventoryList = await db
            .select({
              id: schema.branchInventory.id,
              branchId: schema.branchInventory.branchId,
              productId: schema.branchInventory.productId,
              sku: schema.branchInventory.sku,
              quantity: schema.branchInventory.quantity,
              binLocation: schema.branchInventory.binLocation,
              productName: schema.products.name,
            })
            .from(schema.branchInventory)
            .innerJoin(schema.products, eq(schema.branchInventory.productId, schema.products.id))
            .where(inArray(schema.branchInventory.branchId, branchIds));
        } else {
          // Fallback: Populate the branchInventory list using central inventory so the default branch register has access to central stock
          const defaultBranchId = branches[0].id;
          branchInventoryList = inventoryItems.map((invItem) => ({
            id: invItem.id,
            branchId: defaultBranchId,
            productId: invItem.productId,
            sku: invItem.sku,
            quantity: invItem.quantity,
            binLocation: invItem.binLocation,
            productName: invItem.productName,
          }));
        }

        if (scope === "full") {
          branchMembersList = await db
            .select()
            .from(schema.branchMembers)
            .where(inArray(schema.branchMembers.branchId, branchIds));
        }
      }
    }

    const stockAvailabilityCatalog = await getStockAvailabilityCatalog();

    if (scope === "billing") {
      const [receiptCountRow] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(schema.billingReceipts)
        .where(eq(schema.billingReceipts.orgId, orgId));

      return {
        inventoryItems,
        branches,
        branchInventory: branchInventoryList,
        stockAvailabilityCatalog,
        premiumStatus,
        billingReceiptCount: receiptCountRow?.count ?? 0,
      } satisfies VendorBillingRegisterData;
    }

    // 7. Fetch Billing Receipts (Premium POS Register)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let billingReceipts: any[] = [];
    if (premiumStatus.billingActive) {
      billingReceipts = await db
        .select()
        .from(schema.billingReceipts)
        .where(eq(schema.billingReceipts.orgId, orgId))
        .orderBy(desc(schema.billingReceipts.createdAt))
        .limit(50);
    }

    // Fetch org members list from Clerk for display in branch mapping (cached)
    let orgMembers: { userId: string; name: string; email: string }[] = [];
    try {
      orgMembers = await getCachedOrgMembers(orgId);
    } catch {
      // Graceful degradation
    }

    const checkoutOptionsCatalog = await getCheckoutOptionsCatalog();

    return {
      inventoryItems,
      suppliers,
      movements,
      simulatedOrders,
      productsWithoutInventory,
      branches,
      branchInventory: branchInventoryList,
      branchMembers: branchMembersList,
      billingReceipts,
      orgMembers,
      premiumStatus,
      checkoutOptionsCatalog,
      stockAvailabilityCatalog,
    };
  });
}
