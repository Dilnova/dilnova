import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { DEFAULT_APP_URL } from '@/shared/platform/brand';
import { getCheckoutOptionsCatalog } from '@/features/organization/checkout-options';
import { describeOrderCheckout } from '@/features/organization/checkout-options.shared';
import { getOrderDisplayTotals } from '@/features/billing/checkout-totals';
import { type BankTransferCheckoutInstructions, isBankTransferPayment } from '@/features/billing/bank-transfer';
import { buildOrderConfirmationEmailHtml } from '@/features/orders/email/confirmation-html';
import { sendRawSmtpEmail } from '@/shared/email/smtp-client';
import { getSystemSetting } from '@/shared/platform/settings';
import { logger } from '@/shared/logging/logger';

export interface OrderConfirmationEmailContext {
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  fulfillmentMethod: string;
  bankTransferInstructions?: BankTransferCheckoutInstructions;
  isSignedIn: boolean;
}

export async function sendOrderConfirmationEmailForOrder(
  orderId: string,
  context: OrderConfirmationEmailContext
): Promise<{ success: boolean; error?: string }> {
  try {
    const [order] = await db
      .select()
      .from(schema.simulatedOrders)
      .where(eq(schema.simulatedOrders.id, orderId))
      .limit(1);

    if (!order) {
      return { success: false, error: 'Order not found.' };
    }

    const [items, checkoutOptionsCatalog, pickupBranch, systemName] = await Promise.all([
      db
        .select({
          productName: schema.simulatedOrderItems.productName,
          quantity: schema.simulatedOrderItems.quantity,
          unitPrice: schema.simulatedOrderItems.unitPrice,
        })
        .from(schema.simulatedOrderItems)
        .where(eq(schema.simulatedOrderItems.orderId, orderId)),
      getCheckoutOptionsCatalog(),
      order.pickupBranchId
        ? db
            .select({ name: schema.branches.name })
            .from(schema.branches)
            .where(eq(schema.branches.id, order.pickupBranchId))
            .limit(1)
            .then((rows) => rows[0]?.name ?? null)
        : Promise.resolve(null),
      getSystemSetting('system_name', 'Dilnova'),
    ]);

    const checkoutDetails = describeOrderCheckout(
      {
        fulfillmentMethod: context.fulfillmentMethod,
        paymentMethod: context.paymentMethod,
        pickupBranchId: order.pickupBranchId,
        pickupBranchName: pickupBranch,
      },
      checkoutOptionsCatalog
    );

    const orderTotals = getOrderDisplayTotals(order);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;

    const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const emailFromAddress = process.env.EMAIL_FROM_ADDRESS || 'info@dilstar.pp.ua';
    const emailFromName = process.env.EMAIL_FROM_NAME || `${systemName} Hub`;

    if (!smtpUser || !smtpPassword) {
      logger.warn('Order confirmation email skipped: SMTP credentials are not configured', { orderId });
      return { success: false, error: 'SMTP configuration is incomplete on the server.' };
    }

    const emailHtml = buildOrderConfirmationEmailHtml({
      systemName,
      orderId,
      customerName: context.customerName,
      customerEmail: context.customerEmail,
      fulfillmentLabel: checkoutDetails.fulfillment,
      paymentLabel: checkoutDetails.payment,
      pickupBranchName: checkoutDetails.pickup ?? pickupBranch,
      shippingAddress: order.shippingAddress,
      shippingPhone: order.shippingPhone,
      items,
      subtotalAmount: orderTotals.subtotalAmount,
      taxAmount: orderTotals.taxAmount,
      shippingAmount: orderTotals.shippingAmount,
      grandTotal: orderTotals.grandTotal,
      bankTransferInstructions: context.bankTransferInstructions,
      isSignedIn: context.isSignedIn,
      appUrl,
    });

    const subjectPrefix = isBankTransferPayment(context.paymentMethod)
      ? 'Order Received — Bank Transfer Required'
      : 'Order Confirmation';

    await sendRawSmtpEmail({
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPassword,
      to: context.customerEmail,
      from: emailFromAddress,
      fromName: emailFromName,
      subject: `${subjectPrefix} | ${systemName} #${orderId.slice(0, 8).toUpperCase()}`,
      html: emailHtml,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to send order confirmation email', error, { orderId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending order confirmation email.',
    };
  }
}
