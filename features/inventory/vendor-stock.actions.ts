"use server";

import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidateVendorConsole } from "@/features/vendor/revalidate";
import { adjustInventorySchema, initInventorySchema } from "@/features/inventory/schema";
import { validateStockAvailabilityId } from "@/features/inventory/availability.server";
import {
  sumBranchAllocatedQuantity,
  validateCentralQuantityCoversBranches,
  incrementBranchStock,
  decrementBranchStock,
  getOrgDefaultBranchId,
} from "@/features/inventory/ledger";
import { logAuditAction } from "@/shared/audit/logger";
import { runWithCorrelationId } from "@/shared/security/async-context";
import { rateLimit } from "@/shared/security/rate-limit";
import { verifyVendorAccess } from "@/features/inventory/vendor-data";

export async function vendorAdjustInventoryAction(data: {
  inventoryId: string;
  quantityChange: number;
  type: "restock" | "manual_adjustment" | "damage_loss";
  reason?: string;
  branchId?: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(30, 60 * 1000);
    const { userId, orgId, premiumStatus } = await verifyVendorAccess();

    const parsed = adjustInventorySchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid input.");
    }

    const newQuantity = await db.transaction(async (tx) => {
      const [inv] = await tx
        .select({
          id: schema.inventory.id,
          quantity: schema.inventory.quantity,
          productId: schema.inventory.productId,
        })
        .from(schema.inventory)
        .innerJoin(schema.products, eq(schema.inventory.productId, schema.products.id))
        .where(
          and(eq(schema.inventory.id, parsed.data.inventoryId), eq(schema.products.orgId, orgId)),
        )
        .for("update")
        .limit(1);

      if (!inv) {
        throw new Error("Inventory record not found or access denied.");
      }

      const previousQuantity = inv.quantity;
      const nextQuantity = previousQuantity + parsed.data.quantityChange;

      if (nextQuantity < 0) {
        throw new Error(`Cannot reduce stock below 0. Current: ${previousQuantity}`);
      }

      if (premiumStatus.multiBranchActive) {
        const targetBranchId = parsed.data.branchId ?? (await getOrgDefaultBranchId(tx, orgId));

        if (targetBranchId) {
          if (parsed.data.quantityChange > 0) {
            await incrementBranchStock(
              tx,
              targetBranchId,
              inv.productId,
              parsed.data.quantityChange,
            );
          } else if (parsed.data.quantityChange < 0) {
            await decrementBranchStock(
              tx,
              targetBranchId,
              inv.productId,
              -parsed.data.quantityChange,
            );
          }
        }

        // Validate that the new central quantity covers the total branch allocations
        // This is strictly checked AFTER branch modifications are applied in the transaction
        const totalBranchAllocated = await sumBranchAllocatedQuantity(tx, inv.productId);
        const branchCheck = validateCentralQuantityCoversBranches(
          nextQuantity,
          totalBranchAllocated,
        );
        if (!branchCheck.ok) {
          throw new Error(branchCheck.error);
        }
      }

      await tx
        .update(schema.inventory)
        .set({ quantity: nextQuantity, updatedAt: new Date() })
        .where(and(eq(schema.inventory.id, inv.id), eq(schema.inventory.productId, inv.productId)));

      await tx.insert(schema.inventoryMovements).values({
        inventoryId: parsed.data.inventoryId,
        type: parsed.data.type,
        quantityChanged: parsed.data.quantityChange,
        previousQuantity,
        newQuantity: nextQuantity,
        reason: parsed.data.reason || null,
        userId,
      });
      return nextQuantity;
    });

    await logAuditAction({
      userId,
      action: "ADJUST_INVENTORY",
      targetType: "inventory",
      targetId: parsed.data.inventoryId,
      metadata: { change: parsed.data.quantityChange, newQuantity },
    });

    revalidateVendorConsole();
    return { success: true, newQuantity };
  });
}

export async function vendorInitInventoryAction(data: {
  productId: string;
  sku?: string;
  quantity?: number;
  lowStockThreshold?: number;
  binLocation?: string;
  supplierId?: string | null;
  stockAvailability?: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const { userId, orgId } = await verifyVendorAccess();

    const parsed = initInventorySchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid input.");
    }
    const validData = parsed.data;

    if (!validData.productId) throw new Error("Product ID is required.");

    // Verify product belongs to this vendor org
    const [prod] = await db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.id, validData.productId), eq(schema.products.orgId, orgId)))
      .limit(1);

    if (!prod) {
      throw new Error("Product not found or access denied.");
    }

    if (validData.supplierId) {
      const [supplier] = await db
        .select({ id: schema.suppliers.id })
        .from(schema.suppliers)
        .where(
          and(eq(schema.suppliers.id, validData.supplierId), eq(schema.suppliers.orgId, orgId)),
        )
        .limit(1);

      if (!supplier) {
        throw new Error("Supplier not found or access denied.");
      }
    }

    // Check if inventory already exists for this product
    const existing = await db
      .select({ id: schema.inventory.id })
      .from(schema.inventory)
      .where(eq(schema.inventory.productId, validData.productId))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Inventory record already exists.");
    }

    const quantity = validData.quantity ?? 0;
    const availability = await validateStockAvailabilityId(
      validData.stockAvailability || "in_stock",
    );
    if (!availability) {
      throw new Error("Invalid stock availability status.");
    }

    const [inv] = await db
      .insert(schema.inventory)
      .values({
        productId: validData.productId,
        sku: validData.sku || null,
        quantity,
        lowStockThreshold: validData.lowStockThreshold ?? 5,
        binLocation: validData.binLocation || null,
        supplierId: validData.supplierId || null,
        stockAvailability: availability.id,
      })
      .returning();

    if (inv && quantity > 0) {
      await db.insert(schema.inventoryMovements).values({
        inventoryId: inv.id,
        type: "restock",
        quantityChanged: quantity,
        previousQuantity: 0,
        newQuantity: quantity,
        reason: "Initial setup",
        userId,
      });
    }

    await logAuditAction({
      userId,
      action: "CREATE_INVENTORY",
      targetType: "inventory",
      targetId: inv.id,
      metadata: { productId: validData.productId, quantity },
    });

    revalidateVendorConsole();
    return { success: true, inventory: inv };
  });
}
