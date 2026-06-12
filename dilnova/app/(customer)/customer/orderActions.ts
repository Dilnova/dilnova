'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { submitPaymentSlipSchema } from '@/utils/schemas';
import { rateLimit } from '@/utils/rateLimit';
import { runWithCorrelationId } from '@/utils/asyncContext';
import { getNormalizedClerkUserEmail, normalizeCustomerEmail } from '@/utils/customerEmail';
import { canUploadPaymentSlip } from '@/utils/orderPayment';
import { logAuditAction } from '@/utils/auditLogger';
import { sendPaymentSlipUploadedNotifications } from '@/utils/paymentSlipEmail';
import { logger } from '@/utils/logger';

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

    const user = await currentUser();
    const sessionEmail = user ? getNormalizedClerkUserEmail(user) : null;
    const submittedEmail = parsed.data.customerEmail
      ? normalizeCustomerEmail(parsed.data.customerEmail)
      : sessionEmail;

    if (!submittedEmail) {
      return { success: false as const, error: 'Customer email is required to upload a payment slip.' };
    }

    const [order] = await db
      .select()
      .from(schema.simulatedOrders)
      .where(eq(schema.simulatedOrders.id, parsed.data.orderId))
      .limit(1);

    if (!order) {
      return { success: false as const, error: 'Order not found.' };
    }

    if (normalizeCustomerEmail(order.customerEmail) !== submittedEmail) {
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

    const { userId } = await auth();
    if (userId) {
      await logAuditAction({
        userId,
        action: 'SUBMIT_PAYMENT_SLIP',
        targetType: 'simulated_order',
        targetId: order.id,
        metadata: { paymentMethod: order.paymentMethod },
      });
    }

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
