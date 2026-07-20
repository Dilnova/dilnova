'use server';

import { auth } from '@clerk/nextjs/server';
import { eq, inArray, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { rejectPaymentSlipSchema, vendorOrderActionSchema } from '@/features/orders/schema';
import { rateLimit } from '@/shared/security/rate-limit';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { logAuditAction } from '@/shared/audit/logger';
import { revalidateVendorConsole } from '@/features/vendor/revalidate';
import { canFulfillCodOrder, canVerifyBankTransferPayment } from '@/features/orders/payment.rules';
import { isActiveSimulatedOrder } from '@/features/orders/status';
import {
  applySimulatedOrderStatusChange,
  rejectVendorPaymentSlip,
  verifyVendorOrderPayment,
} from '@/features/orders/transitions';
import {
  sendPaymentVerifiedCustomerEmail,
  sendOrderCancelledCustomerEmail,
  sendPaymentSlipRejectedCustomerEmail,
} from '@/features/orders/email/payment-slip';
import { logger } from '@/shared/logging/logger';
import {
  MULTI_VENDOR_VENDOR_ACTION_ERROR,
  orderSpansMultipleVendors,
} from '@/features/orders/vendor-scope';
import { requireVendorRole } from '@/shared/auth/vendor-guard';

async function loadVendorOrder(orderId: string, orgId: string) {
  const result = await db
    .select({ order: schema.simulatedOrders })
    .from(schema.simulatedOrders)
    .innerJoin(
      schema.simulatedOrderItems,
      eq(schema.simulatedOrders.id, schema.simulatedOrderItems.orderId)
    )
    .where(
      and(
        eq(schema.simulatedOrders.id, orderId),
        eq(schema.simulatedOrderItems.vendorOrgId, orgId)
      )
    )
    .limit(1);

  if (result.length === 0) {
    throw new Error('Order not found or access denied.');
  }

  const order = result[0].order;

  const vendorOrgRows = await db
    .select({ vendorOrgId: schema.simulatedOrderItems.vendorOrgId })
    .from(schema.simulatedOrderItems)
    .where(eq(schema.simulatedOrderItems.orderId, orderId));

  const vendorOrgIds = [...new Set(vendorOrgRows.map((row) => row.vendorOrgId))];

  if (orderSpansMultipleVendors(vendorOrgIds)) {
    throw new Error(MULTI_VENDOR_VENDOR_ACTION_ERROR);
  }

  return order;
}

async function assertVendorAdmin(userId: string | null | undefined, orgId: string | null | undefined, orgRole: string | null | undefined) {
  if (!userId || !orgId) {
    throw new Error('Not authorized: You must be signed in with an active organization.');
  }
  if (orgRole !== 'org:admin') {
    throw new Error('Not authorized: Only organization admins can manage orders.');
  }
  await requireVendorRole(userId);
}

export async function verifyOrderPaymentAction(orderId: string) {
  return runWithCorrelationId(async () => {
    await rateLimit(30, 60 * 1000);
    const { userId, orgId, orgRole } = await auth();
    await assertVendorAdmin(userId, orgId, orgRole);

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
      await logAuditAction({
        userId: userId!,
        action: 'EMAIL_DELIVERY_FAILURE',
        targetType: 'simulated_order',
        targetId: order.id,
        metadata: {
          emailType: 'payment_verified',
          error: emailResult.error,
        },
      });
    }

    revalidateVendorConsole();
    revalidatePath('/customer');
    revalidatePath('/superadmin');

    return { success: true as const, emailSent: emailResult.success };
  });
}

export async function rejectPaymentSlipAction(orderId: string, reason?: string) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const { userId, orgId, orgRole } = await auth();
    await assertVendorAdmin(userId, orgId, orgRole);

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
      await logAuditAction({
        userId: userId!,
        action: 'EMAIL_DELIVERY_FAILURE',
        targetType: 'simulated_order',
        targetId: order.id,
        metadata: {
          emailType: 'payment_slip_rejected',
          reason: parsed.data.reason || null,
          error: emailResult.error,
        },
      });
    }

    revalidateVendorConsole();
    revalidatePath('/customer');
    revalidatePath(`/customer/invoice/${order.id}`);

    return { success: true as const, emailSent: emailResult.success };
  });
}

export async function cancelVendorOrderAction(orderId: string) {
  return runWithCorrelationId(async () => {
    await rateLimit(20, 60 * 1000);
    const { userId, orgId, orgRole } = await auth();
    await assertVendorAdmin(userId, orgId, orgRole);

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
      await logAuditAction({
        userId: userId!,
        action: 'EMAIL_DELIVERY_FAILURE',
        targetType: 'simulated_order',
        targetId: order.id,
        metadata: {
          emailType: 'order_cancelled',
          error: emailResult.error,
        },
      });
    }

    revalidateVendorConsole();
    revalidatePath('/customer');
    revalidatePath('/superadmin');

    return { success: true as const, emailSent: emailResult.success };
  });
}

export async function getVendorPendingPaymentOrderIds(orgId: string, limit = 100, offset = 0): Promise<string[]> {
  return runWithCorrelationId(async () => {
    await rateLimit(30, 60 * 1000);
    const { userId, orgId: sessionOrgId, orgRole } = await auth();

    if (!userId || !sessionOrgId || orgRole !== 'org:admin' || sessionOrgId !== orgId) {
      throw new Error('Not authorized: Only organization admins can view pending payment orders.');
    }
    await requireVendorRole(userId);

    const rows = await db
      .select({ orderId: schema.simulatedOrderItems.orderId })
      .from(schema.simulatedOrderItems)
      .where(eq(schema.simulatedOrderItems.vendorOrgId, orgId))
      .limit(limit)
      .offset(offset);

    const orderIds = [...new Set(rows.map((row) => row.orderId))];
    if (orderIds.length === 0) return [];

    const orders = await db
      .select({ id: schema.simulatedOrders.id, status: schema.simulatedOrders.status })
      .from(schema.simulatedOrders)
      .where(inArray(schema.simulatedOrders.id, orderIds));

    return orders
      .filter((order) => order.status === 'payment_submitted')
      .map((order) => order.id);
  });
}
