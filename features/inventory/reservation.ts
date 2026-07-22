import * as schema from "@/shared/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import type { db } from "@/shared/db/client";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface StockReservation {
  centralInventoryId: string;
  branchInventoryId?: string;
}

/**
 * Lock and validate stock against central inventory (org-wide source of truth).
 * When branchId is provided, also validates branch allocation.
 */
export async function reserveProductStock(
  tx: DbTransaction,
  productId: string,
  quantity: number,
  options?: { branchId?: string | null; productName?: string },
): Promise<{ ok: true; reservation: StockReservation } | { ok: false; error: string }> {
  const label = options?.productName ? `"${options.productName}"` : "Product";

  const [centralInv] = await tx
    .select({
      id: schema.inventory.id,
      quantity: schema.inventory.quantity,
    })
    .from(schema.inventory)
    .where(eq(schema.inventory.productId, productId))
    .for("update")
    .limit(1);

  if (!centralInv) {
    return { ok: false, error: `${label} has no inventory record.` };
  }

  if (centralInv.quantity < quantity) {
    return {
      ok: false,
      error: `${label} only has ${centralInv.quantity} units in stock (requested ${quantity}).`,
    };
  }

  const reservation: StockReservation = {
    centralInventoryId: centralInv.id,
  };

  if (options?.branchId) {
    const [branchInv] = await tx
      .select({
        id: schema.branchInventory.id,
        quantity: schema.branchInventory.quantity,
      })
      .from(schema.branchInventory)
      .where(
        and(
          eq(schema.branchInventory.branchId, options.branchId),
          eq(schema.branchInventory.productId, productId),
        ),
      )
      .for("update")
      .limit(1);

    if (!branchInv) {
      return { ok: false, error: `${label} has no stock allocated at the selected branch.` };
    }

    if (branchInv.quantity < quantity) {
      return {
        ok: false,
        error: `${label} only has ${branchInv.quantity} units at this branch (requested ${quantity}).`,
      };
    }

    reservation.branchInventoryId = branchInv.id;
  }

  return { ok: true, reservation };
}

/**
 * Atomically deplete stock using SQL decrements guarded by quantity checks.
 */
export async function applyStockReservation(
  tx: DbTransaction,
  quantity: number,
  reservation: StockReservation,
  options: { userId: string; reason: string },
): Promise<void> {
  const [centralRow] = await tx
    .update(schema.inventory)
    .set({
      quantity: sql`${schema.inventory.quantity} - ${quantity}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.inventory.id, reservation.centralInventoryId),
        gte(schema.inventory.quantity, quantity),
      ),
    )
    .returning({
      quantity: schema.inventory.quantity,
    });

  if (!centralRow) {
    throw new Error("Insufficient central stock during checkout.");
  }

  const newCentralQty = centralRow.quantity;
  const previousCentralQty = newCentralQty + quantity;

  await tx.insert(schema.inventoryMovements).values({
    inventoryId: reservation.centralInventoryId,
    type: "sale_depletion",
    quantityChanged: -quantity,
    previousQuantity: previousCentralQty,
    newQuantity: newCentralQty,
    reason: options.reason,
    userId: options.userId,
  });

  if (reservation.branchInventoryId) {
    const [branchRow] = await tx
      .update(schema.branchInventory)
      .set({
        quantity: sql`${schema.branchInventory.quantity} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.branchInventory.id, reservation.branchInventoryId),
          gte(schema.branchInventory.quantity, quantity),
        ),
      )
      .returning({ quantity: schema.branchInventory.quantity });

    if (!branchRow) {
      throw new Error("Insufficient branch stock during checkout.");
    }
  }
}
