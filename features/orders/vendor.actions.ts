'use server';

import { eq, inArray, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { vendorOrderActionSchema, rejectPaymentSlipSchema } from '@/features/orders/schema';
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
import { orgAdminAction, ActionError } from '@/lib/safe-action';
import { z } from 'zod/v3';

// ── Internal helpers ──────────────────────────────────────────────────────────
// Note: auth() is intentionally NOT called here — the orgAdminAction wrapper
// already validates authentication and org:admin role before the action body runs.

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
    throw new ActionError('Order not found or access denied.');
  }

  const order = result[0].order;

  const vendorOrgRows = await db
    .select({ vendorOrgId: schema.simulatedOrderItems.vendorOrgId })
    .from(schema.simulatedOrderItems)
    .where(eq(schema.simulatedOrderItems.orderId, orderId));

  const vendorOrgIds = [...new Set(vendorOrgRows.map((row) => row.vendorOrgId))];

  if (orderSpansMultipleVendors(vendorOrgIds)) {
    throw new ActionError(MULTI_VENDOR_VENDOR_ACTION_ERROR);
  }

  return order;
}

// ── Actions ───────────────────────────────────────────────────────────────────

export const verifyOrderPaymentAction = orgAdminAction
  .schema(vendorOrderActionSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(30, 60 * 1000);

      const { userId, orgId } = ctx;
      if (!orgId) {
        throw new ActionError('Not authorized: You must be signed in with an active organization.');
      }

      const order = await loadVendorOrder(parsedInput.orderId, orgId);

      if (canVerifyBankTransferPayment(order)) {
        await db.transaction(async (tx) => {
          await verifyVendorOrderPayment(tx, { order, userId });
        });
      } else if (canFulfillCodOrder(order)) {
        await db.transaction(async (tx) => {
          await applySimulatedOrderStatusChange(tx, {
            order,
            newStatus: 'fulfilled',
            userId,
          });
        });
      } else {
        throw new ActionError('This order cannot be verified or fulfilled in its current state.');
      }

      await logAuditAction({
        userId,
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
          userId,
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
  });

export const rejectPaymentSlipAction = orgAdminAction
  .schema(rejectPaymentSlipSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000);

      const { userId, orgId } = ctx;
      if (!orgId) {
        throw new ActionError('Not authorized: You must be signed in with an active organization.');
      }

      const order = await loadVendorOrder(parsedInput.orderId, orgId);

      if (!canVerifyBankTransferPayment(order)) {
        throw new ActionError('Only submitted bank transfer slips can be rejected.');
      }

      await db.transaction(async (tx) => {
        await rejectVendorPaymentSlip(tx, { orderId: order.id });
      });

      await logAuditAction({
        userId,
        action: 'REJECT_PAYMENT_SLIP',
        targetType: 'simulated_order',
        targetId: order.id,
        metadata: { reason: parsedInput.reason || null },
      });

      const emailResult = await sendPaymentSlipRejectedCustomerEmail(order.id, parsedInput.reason);
      if (!emailResult.success) {
        logger.warn('Payment slip rejected but customer notification email was not sent', {
          orderId: order.id,
          error: emailResult.error,
        });
        await logAuditAction({
          userId,
          action: 'EMAIL_DELIVERY_FAILURE',
          targetType: 'simulated_order',
          targetId: order.id,
          metadata: {
            emailType: 'payment_slip_rejected',
            reason: parsedInput.reason || null,
            error: emailResult.error,
          },
        });
      }

      revalidateVendorConsole();
      revalidatePath('/customer');
      revalidatePath(`/customer/invoice/${order.id}`);

      return { success: true as const, emailSent: emailResult.success };
    });
  });

export const cancelVendorOrderAction = orgAdminAction
  .schema(vendorOrderActionSchema)
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(20, 60 * 1000);

      const { userId, orgId } = ctx;
      if (!orgId) {
        throw new ActionError('Not authorized: You must be signed in with an active organization.');
      }

      const order = await loadVendorOrder(parsedInput.orderId, orgId);

      if (!isActiveSimulatedOrder(order.status)) {
        throw new ActionError('This order can no longer be cancelled.');
      }

      await db.transaction(async (tx) => {
        await applySimulatedOrderStatusChange(tx, {
          order,
          newStatus: 'cancelled',
          userId,
        });
      });

      await logAuditAction({
        userId,
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
          userId,
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
  });

export const getVendorPendingPaymentOrderIds = orgAdminAction
  .schema(
    z.object({
      orgId: z.string(),
      limit: z.number().int().optional().default(100),
      offset: z.number().int().optional().default(0),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    return runWithCorrelationId(async () => {
      await rateLimit(30, 60 * 1000);

      // ctx.orgId is the session org — ensure it matches the requested orgId
      if (!ctx.orgId || ctx.orgId !== parsedInput.orgId) {
        throw new ActionError(
          'Not authorized: Only organization admins can view pending payment orders.'
        );
      }

      const { orgId, limit, offset } = parsedInput;

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
  });
