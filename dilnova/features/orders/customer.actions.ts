'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { submitPaymentSlipSchema } from '@/features/orders/schema';
import { rateLimit } from '@/shared/security/rate-limit';
import { runWithCorrelationId } from '@/shared/security/async-context';
import { getNormalizedClerkUserEmail, normalizeCustomerEmail } from '@/features/customer/email';
import { canUploadPaymentSlip } from '@/features/orders/payment.rules';
import { logAuditAction } from '@/shared/audit/logger';
import { sendPaymentSlipUploadedNotifications } from '@/features/orders/email/payment-slip';
import { logger } from '@/shared/logging/logger';

export async function submitPaymentSlipAction(input: {
  orderId: string;
  slipUrl: string;
  customerEmail?: string;
}) {
  return runWithCorrelationId(async () => {
    await rateLimit(10, 60 * 1000);

    const parsed = submitPaymentSlipSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message || 'Invalid payment slip submission.',
      };
    }

    const { userId } = await auth();
    if (!userId) {
      return { success: false as const, error: 'Please sign in to upload a payment slip.' };
    }

    const user = await currentUser();
    if (!user) {
      return { success: false as const, error: 'Authentication session is invalid. Please sign in again.' };
    }

    const sessionEmail = getNormalizedClerkUserEmail(user);
    if (!sessionEmail) {
      return {
        success: false as const,
        error: 'Your account does not have an email address. Please update your profile first.',
      };
    }

    const [order] = await db
      .select()
      .from(schema.simulatedOrders)
      .where(eq(schema.simulatedOrders.id, parsed.data.orderId))
      .limit(1);

    if (!order) {
      return { success: false as const, error: 'Order not found.' };
    }

    if (order.customerUserId !== userId && normalizeCustomerEmail(order.customerEmail) !== sessionEmail) {
      return { success: false as const, error: 'You are not authorized to update this order.' };
    }

    if (!canUploadPaymentSlip(order)) {
      return {
        success: false as const,
        error: 'This order is not accepting a payment slip upload.',
      };
    }

    await db
      .update(schema.simulatedOrders)
      .set({
        paymentSlipUrl: parsed.data.slipUrl,
        paymentSlipUploadedAt: new Date(),
        status: 'payment_submitted',
        updatedAt: new Date(),
      })
      .where(eq(schema.simulatedOrders.id, order.id));

    await logAuditAction({
      userId,
      action: 'SUBMIT_PAYMENT_SLIP',
      targetType: 'simulated_order',
      targetId: order.id,
      metadata: { paymentMethod: order.paymentMethod },
    });

    revalidatePath('/cart');
    revalidatePath('/customer');
    revalidatePath(`/customer/invoice/${order.id}`);
    revalidatePath('/vendor');
    revalidatePath('/superadmin');

    const emailResult = await sendPaymentSlipUploadedNotifications(order.id);
    if (!emailResult.success) {
      logger.warn('Payment slip saved but vendor notification email was not sent', {
        orderId: order.id,
        error: emailResult.error,
        notifiedCount: emailResult.notifiedCount,
      });
    }

    return {
      success: true as const,
      vendorNotified: emailResult.success,
    };
  });
}
