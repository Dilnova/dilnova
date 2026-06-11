import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { db } from '@/db';

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface StockReservation {
  centralInventoryId: string;
  centralQty: number;
  branchInventoryId?: string;
  branchQty?: number;
}

/**
 * Lock and validate stock against central inventory (org-wide source of truth).
 * When branchId is provided, also validates branch allocation.
 */
export async function reserveProductStock(
  tx: DbTransaction,
  productId: string,
  quantity: number,
  options?: { branchId?: string | null; productName?: string }
): Promise<{ ok: true; reservation: StockReservation } | { ok: false; error: string }> {
  const label = options?.productName ? `"${options.productName}"` : 'Product';

  const [centralInv] = await tx
    .select()
    .from(schema.inventory)
    .where(eq(schema.inventory.productId, productId))
    .for('update')
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
    centralQty: centralInv.quantity,
  };

  if (options?.branchId) {
    const [branchInv] = await tx
      .select()
      .from(schema.branchInventory)
      .where(
        and(
          eq(schema.branchInventory.branchId, options.branchId),
          eq(schema.branchInventory.productId, productId)
        )
      )
      .for('update')
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
    reservation.branchQty = branchInv.quantity;
  }

  return { ok: true, reservation };
}

/**
 * Apply a stock reservation: always depletes central inventory;
 * also depletes branch inventory when the reservation includes a branch.
 */
export async function applyStockReservation(
  tx: DbTransaction,
  quantity: number,
  reservation: StockReservation,
  options: { userId: string; reason: string }
): Promise<void> {
  const newCentralQty = reservation.centralQty - quantity;

  await tx
    .update(schema.inventory)
    .set({ quantity: newCentralQty, updatedAt: new Date() })
    .where(eq(schema.inventory.id, reservation.centralInventoryId));

  await tx.insert(schema.inventoryMovements).values({
    inventoryId: reservation.centralInventoryId,
    type: 'sale_depletion',
    quantityChanged: -quantity,
    previousQuantity: reservation.centralQty,
    newQuantity: newCentralQty,
    reason: options.reason,
    userId: options.userId,
  });

  if (reservation.branchInventoryId && reservation.branchQty !== undefined) {
    const newBranchQty = reservation.branchQty - quantity;
    await tx
      .update(schema.branchInventory)
      .set({ quantity: newBranchQty, updatedAt: new Date() })
      .where(eq(schema.branchInventory.id, reservation.branchInventoryId));
  }
}
