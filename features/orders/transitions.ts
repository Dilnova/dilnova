import * as schema from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import type { db } from '@/shared/db/client';
import {
  depleteOnlineOrderItemStock,
  restoreOnlineOrderItemStock,
} from '@/features/orders/stock';
import type { SimulatedOrderStatus } from '@/features/orders/status';

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type SimulatedOrderRow = typeof schema.simulatedOrders.$inferSelect;

export type AdminOrderStatusUpdate = Extract<
  SimulatedOrderStatus,
  'pending' | 'fulfilled' | 'cancelled'
>;

export async function applySimulatedOrderStatusChange(
  tx: DbTransaction,
  params: {
    order: SimulatedOrderRow;
    newStatus: AdminOrderStatusUpdate;
    userId: string;
  }
): Promise<{ stockDepleted: boolean }> {
  const { order, newStatus, userId } = params;
  const previousStatus = order.status;

  const orderItems = await tx
    .select({
      productId: schema.simulatedOrderItems.productId,
      productName: schema.simulatedOrderItems.productName,
      vendorOrgId: schema.simulatedOrderItems.vendorOrgId,
      quantity: schema.simulatedOrderItems.quantity,
      productType: schema.products.type,
    })
    .from(schema.simulatedOrderItems)
    .innerJoin(schema.products, eq(schema.simulatedOrderItems.productId, schema.products.id))
    .where(eq(schema.simulatedOrderItems.orderId, order.id));

  let stockDepleted = order.stockDepleted;

  if (
    newStatus === 'fulfilled' &&
    (previousStatus === 'pending_payment' || previousStatus === 'payment_submitted') &&
    !order.stockDepleted
  ) {
    for (const item of orderItems) {
      if (item.productType !== 'product') continue;

      await depleteOnlineOrderItemStock(tx, {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        pickupBranchId: order.pickupBranchId,
        vendorOrgId: item.vendorOrgId,
        orderId: order.id,
        userId,
      });
    }
    stockDepleted = true;
  }

  if (newStatus === 'cancelled' && order.stockDepleted) {
    for (const item of orderItems) {
      if (item.productType !== 'product') continue;

      await restoreOnlineOrderItemStock(tx, {
        productId: item.productId,
        quantity: item.quantity,
        pickupBranchId: order.pickupBranchId,
        vendorOrgId: item.vendorOrgId,
        orderId: order.id,
        userId,
      });
    }
    stockDepleted = false;
  }

  const updatePayload: Partial<typeof schema.simulatedOrders.$inferInsert> = {
    status: newStatus,
    stockDepleted,
    updatedAt: new Date(),
  };

  if (newStatus === 'fulfilled' && !order.paymentVerifiedAt) {
    updatePayload.paymentVerifiedAt = new Date();
    updatePayload.paymentVerifiedBy = userId;
  }

  if (newStatus === 'cancelled') {
    updatePayload.paymentSlipUrl = null;
    updatePayload.paymentSlipUploadedAt = null;
  }

  await tx
    .update(schema.simulatedOrders)
    .set(updatePayload)
    .where(eq(schema.simulatedOrders.id, order.id));

  return { stockDepleted };
}

export async function verifyVendorOrderPayment(
  tx: DbTransaction,
  params: {
    order: SimulatedOrderRow;
    userId: string;
  }
): Promise<void> {
  await applySimulatedOrderStatusChange(tx, {
    order: params.order,
    newStatus: 'fulfilled',
    userId: params.userId,
  });
}

export async function rejectVendorPaymentSlip(
  tx: DbTransaction,
  params: {
    orderId: string;
  }
): Promise<void> {
  await tx
    .update(schema.simulatedOrders)
    .set({
      status: 'pending_payment',
      paymentSlipUrl: null,
      paymentSlipUploadedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.simulatedOrders.id, params.orderId));
}
