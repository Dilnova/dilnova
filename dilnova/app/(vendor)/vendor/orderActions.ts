'use server';

import { auth } from '@clerk/nextjs/server';
import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import * as schema from '@/db/schema';
import {
  rejectPaymentSlipSchema,
  vendorOrderActionSchema,
} from '@/utils/schemas';
import { rateLimit } from '@/utils/rateLimit';
import { runWithCorrelationId } from '@/utils/asyncContext';
import { logAuditAction } from '@/utils/auditLogger';
import { revalidateVendorConsole } from '@/utils/revalidateVendorConsole';
import {
  canFulfillCodOrder,
  canVerifyBankTransferPayment,
} from '@/utils/orderPayment';
import { isActiveSimulatedOrder } from '@/utils/orderStatus';
import {
  applySimulatedOrderStatusChange,
  rejectVendorPaymentSlip,
  verifyVendorOrderPayment,
} from '@/utils/simulatedOrderTransitions';
import { sendPaymentVerifiedCustomerEmail, sendOrderCancelledCustomerEmail, sendPaymentSlipRejectedCustomerEmail } from '@/utils/paymentSlipEmail';
import { logger } from '@/utils/logger';

async function loadVendorOrder(orderId: string, orgId: string) {
  const [order] = await db
    .select()
    .from(schema.simulatedOrders)
    .where(eq(schema.simulatedOrders.id, orderId))
    .limit(1);

  if (!order) {
    throw new Error('Order not found.');
  }

  const vendorItems = await db
    .select({ id: schema.simulatedOrderItems.id })
    .from(schema.simulatedOrderItems)
    .where(
      and(
        eq(schema.simulatedOrderItems.orderId, orderId),
        eq(schema.simulatedOrderItems.vendorOrgId, orgId)
      )
    )
    .limit(1);

  if (vendorItems.length === 0) {
    throw new Error('This order does not include items from your organization.');
  }

  return order;
}

function assertVendorAdmin(orgId: string | null | undefined, orgRole: string | null | undefined) {
  if (!orgId) {
    throw new Error('Not authorized: You must be signed in with an active organization.');
  }
  if (orgRole !== 'org:admin') {
    throw new Error('Not authorized: Only organization admins can manage orders.');
  }
}

export async function verifyOrderPaymentAction(orderId: string) {
  return runWithCorrelationId(async () => {
    await rateLimit(30, 60 * 1000);
    const { userId, orgId, orgRole } = await auth();
    assertVendorAdmin(orgId, orgRole);

    const parsed = vendorOrderActionSchema.safeParse({ orderId });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid order.');
    }

    const order = await loadVendorOrder(parsed.data.orderId, orgId!);

    if (canVerifyBankTransferPayment(order)) {
      await db.transaction(async (tx) => {
        await verifyVendorOrderPayment(tx, { order, userId: userId! });
      });
    } else if (canFulfillCodOrder(order)) {
      await db.transaction(async (tx) => {
        await applySimulatedOrderStatusChange(tx, {
          order,
          newStatus: 'fulfilled',
          userId: userId!,
        });
      });
    } else {
      throw new Error('This order cannot be verified or fulfilled in its current state.');
    }

    await logAuditAction({
      userId: userId!,
      action: 'VERIFY_ORDER_PAYMENT',
      targetType: 'simulated_order',
      targetId: order.id,
      metadata: { paymentMethod: order.paymentMethod },
    });

    const emailResult = await sendPaymentVerifiedCustomerEmail(order.id);
    if (!emailResult.success) {
      logger.warn('Order verified but customer confirmation email was not sent', {
        orderId: order.id,
        error: emailResult.error,
      });
    }

    revalidateVendorConsole();
    revalidatePath('/customer');
    revalidatePath('/superadmin');

    return { success: true as const };
  });
}

export async function rejectPaymentSlipAction(orderId: string, reason?: string) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const { userId, orgId, orgRole } = await auth();
    assertVendorAdmin(orgId, orgRole);

    const parsed = rejectPaymentSlipSchema.safeParse({ orderId, reason });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid request.');
    }

    const order = await loadVendorOrder(parsed.data.orderId, orgId!);

    if (!canVerifyBankTransferPayment(order)) {
      throw new Error('Only submitted bank transfer slips can be rejected.');
    }

    await db.transaction(async (tx) => {
      await rejectVendorPaymentSlip(tx, { orderId: order.id });
    });

    await logAuditAction({
      userId: userId!,
      action: 'REJECT_PAYMENT_SLIP',
      targetType: 'simulated_order',
      targetId: order.id,
      metadata: { reason: parsed.data.reason || null },
    });

    const emailResult = await sendPaymentSlipRejectedCustomerEmail(order.id, parsed.data.reason);
    if (!emailResult.success) {
      logger.warn('Payment slip rejected but customer notification email was not sent', {
        orderId: order.id,
        error: emailResult.error,
      });
    }

    revalidateVendorConsole();
    revalidatePath('/customer');
    revalidatePath(`/customer/invoice/${order.id}`);

    return { success: true as const };
  });
}

export async function cancelVendorOrderAction(orderId: string) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const { userId, orgId, orgRole } = await auth();
    assertVendorAdmin(orgId, orgRole);

    const parsed = vendorOrderActionSchema.safeParse({ orderId });
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Invalid order.');
    }

    const order = await loadVendorOrder(parsed.data.orderId, orgId!);

    if (!isActiveSimulatedOrder(order.status)) {
      throw new Error('This order can no longer be cancelled.');
    }

    await db.transaction(async (tx) => {
      await applySimulatedOrderStatusChange(tx, {
        order,
        newStatus: 'cancelled',
        userId: userId!,
      });
    });

    await logAuditAction({
      userId: userId!,
      action: 'CANCEL_ORDER',
      targetType: 'simulated_order',
      targetId: order.id,
    });

    const emailResult = await sendOrderCancelledCustomerEmail(order.id);
    if (!emailResult.success) {
      logger.warn('Order cancelled but customer notification email was not sent', {
        orderId: order.id,
        error: emailResult.error,
      });
    }

    revalidateVendorConsole();
    revalidatePath('/customer');
    revalidatePath('/superadmin');

    return { success: true as const };
  });
}

export async function getVendorPendingPaymentOrderIds(orgId: string): Promise<string[]> {
  const rows = await db
    .select({ orderId: schema.simulatedOrderItems.orderId })
    .from(schema.simulatedOrderItems)
    .where(eq(schema.simulatedOrderItems.vendorOrgId, orgId));

  const orderIds = [...new Set(rows.map((row) => row.orderId))];
  if (orderIds.length === 0) return [];

  const orders = await db
    .select({ id: schema.simulatedOrders.id, status: schema.simulatedOrders.status })
    .from(schema.simulatedOrders)
    .where(inArray(schema.simulatedOrders.id, orderIds));

  return orders
    .filter((order) => order.status === 'payment_submitted')
    .map((order) => order.id);
}
