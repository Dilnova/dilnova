import * as schema from '@/shared/db/schema';
import { eq, and } from 'drizzle-orm';
import type { db } from '@/shared/db/client';
import {
  reserveProductStock,
  applyStockReservation,
  type StockReservation,
} from '@/features/inventory/reservation';
import {
  incrementDefaultBranchStock,
  reduceBranchAllocationsForCentralSale,
} from '@/features/inventory/ledger';

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Online checkout reserves stock immediately (including bank transfer / COD). Cancellation restores it. */
export async function applyOnlineOrderItemStock(
  tx: DbTransaction,
  params: {
    quantity: number;
    reservation: StockReservation;
    pickupBranchId: string | null;
    vendorOrgId: string;
    productId: string;
    orderId: string;
    userId: string;
  }
): Promise<void> {
  await applyStockReservation(tx, params.quantity, params.reservation, {
    userId: params.userId,
    reason: `Online order ${params.orderId}`,
  });

  if (!params.pickupBranchId) {
    await reduceBranchAllocationsForCentralSale(
      tx,
      params.productId,
      params.quantity,
      params.vendorOrgId
    );
  }
}

export async function depleteOnlineOrderItemStock(
  tx: DbTransaction,
  params: {
    productId: string;
    productName: string;
    quantity: number;
    pickupBranchId: string | null;
    vendorOrgId: string;
    orderId: string;
    userId: string;
  }
): Promise<void> {
  const stockResult = await reserveProductStock(tx, params.productId, params.quantity, {
    branchId: params.pickupBranchId,
    productName: params.productName,
  });

  if (!stockResult.ok) {
    throw new Error(stockResult.error);
  }

  await applyOnlineOrderItemStock(tx, {
    quantity: params.quantity,
    reservation: stockResult.reservation,
    pickupBranchId: params.pickupBranchId,
    vendorOrgId: params.vendorOrgId,
    productId: params.productId,
    orderId: params.orderId,
    userId: params.userId,
  });
}

export async function restoreOnlineOrderItemStock(
  tx: DbTransaction,
  params: {
    productId: string;
    quantity: number;
    pickupBranchId: string | null;
    vendorOrgId: string;
    orderId: string;
    userId: string;
  }
): Promise<void> {
  const [inv] = await tx
    .select({ id: schema.inventory.id, quantity: schema.inventory.quantity })
    .from(schema.inventory)
    .where(eq(schema.inventory.productId, params.productId))
    .for('update')
    .limit(1);

  if (!inv) return;

  const prevQty = inv.quantity;
  const newQty = prevQty + params.quantity;

  await tx
    .update(schema.inventory)
    .set({ quantity: newQty, updatedAt: new Date() })
    .where(eq(schema.inventory.id, inv.id));

  await tx.insert(schema.inventoryMovements).values({
    inventoryId: inv.id,
    type: 'order_cancellation',
    quantityChanged: params.quantity,
    previousQuantity: prevQty,
    newQuantity: newQty,
    reason: `Order ${params.orderId} cancelled`,
    userId: params.userId,
  });

  if (params.pickupBranchId) {
    const [branchInv] = await tx
      .select({ id: schema.branchInventory.id, quantity: schema.branchInventory.quantity })
      .from(schema.branchInventory)
      .where(
        and(
          eq(schema.branchInventory.branchId, params.pickupBranchId),
          eq(schema.branchInventory.productId, params.productId)
        )
      )
      .for('update')
      .limit(1);

    if (branchInv) {
      await tx
        .update(schema.branchInventory)
        .set({
          quantity: branchInv.quantity + params.quantity,
          updatedAt: new Date(),
        })
        .where(eq(schema.branchInventory.id, branchInv.id));
    }
  } else {
    await incrementDefaultBranchStock(
      tx,
      params.vendorOrgId,
      params.productId,
      params.quantity
    );
  }
}
