import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db/client";
import * as schema from "@/shared/db/schema";
import { DEFAULT_APP_URL } from "@/shared/platform/brand";
import { getCheckoutOptionsCatalog } from "@/features/organization/checkout-options";
import { describeOrderCheckout } from "@/features/organization/checkout-options.shared";
import { getOrderDisplayTotals } from "@/features/billing/checkout-totals";
import { sendSystemHtmlEmail, getEmailSenderConfig } from "@/shared/email/delivery";
import {
  buildPaymentSlipUploadedEmailHtml,
  buildPaymentVerifiedEmailHtml,
  buildOrderCancelledEmailHtml,
  buildPaymentSlipRejectedEmailHtml,
} from "@/features/orders/email/payment-slip-html";
import { getOrgAdminEmails, getOrganizationName } from "@/features/vendor-org/emails";
import { logger } from "@/shared/logging/logger";
import { isCodPayment } from "@/features/orders/payment.rules";
import { escapeHtml } from "@/shared/email/smtp-client";

export async function sendPaymentSlipUploadedNotifications(
  orderId: string,
): Promise<{ success: boolean; notifiedCount: number; error?: string }> {
  const config = await getEmailSenderConfig();
  if (!config) {
    return { success: false, notifiedCount: 0, error: "SMTP not configured" };
  }

  const [order] = await db
    .select()
    .from(schema.simulatedOrders)
    .where(eq(schema.simulatedOrders.id, orderId))
    .limit(1);

  if (!order) {
    return { success: false, notifiedCount: 0, error: "Order not found." };
  }

  const items = await db
    .select({
      vendorOrgId: schema.simulatedOrderItems.vendorOrgId,
    })
    .from(schema.simulatedOrderItems)
    .where(eq(schema.simulatedOrderItems.orderId, orderId));

  const vendorOrgIds = [...new Set(items.map((item) => item.vendorOrgId))];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
  const vendorConsoleUrl = `${appUrl}/vendor?tab=inventory`;
  const grandTotal = getOrderDisplayTotals(order).grandTotal;

  let notifiedCount = 0;
  const notifiedEmails = new Set<string>();

  for (const orgId of vendorOrgIds) {
    const [vendorName, adminEmails] = await Promise.all([
      getOrganizationName(orgId),
      getOrgAdminEmails(orgId),
    ]);

    if (adminEmails.length === 0) {
      logger.warn("No vendor admin emails found for payment slip notification", { orgId, orderId });
      continue;
    }

    const html = buildPaymentSlipUploadedEmailHtml({
      systemName: config.systemName,
      vendorName,
      orderId: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      grandTotalCents: grandTotal,
      vendorConsoleUrl,
    });

    for (const email of adminEmails) {
      if (notifiedEmails.has(email)) continue;
      notifiedEmails.add(email);

      const result = await sendSystemHtmlEmail(
        email,
        `Payment Slip Uploaded | ${config.systemName} #${order.id.slice(0, 8).toUpperCase()}`,
        html,
      );
      if (result.success) {
        notifiedCount += 1;
      }
    }
  }

  return {
    success: notifiedCount > 0,
    notifiedCount,
    error: notifiedCount === 0 ? "No vendor admin emails were notified." : undefined,
  };
}

export async function sendPaymentVerifiedCustomerEmail(
  orderId: string,
): Promise<{ success: boolean; error?: string }> {
  const [order] = await db
    .select()
    .from(schema.simulatedOrders)
    .where(eq(schema.simulatedOrders.id, orderId))
    .limit(1);

  if (!order) {
    return { success: false, error: "Order not found." };
  }

  const config = await getEmailSenderConfig();
  if (!config) {
    return { success: false, error: "SMTP not configured" };
  }

  const [checkoutOptionsCatalog, pickupBranch] = await Promise.all([
    getCheckoutOptionsCatalog(),
    order.pickupBranchId
      ? db
          .select({ name: schema.branches.name })
          .from(schema.branches)
          .where(eq(schema.branches.id, order.pickupBranchId))
          .limit(1)
          .then((rows) => rows[0]?.name ?? null)
      : Promise.resolve(null),
  ]);

  const checkoutDetails = describeOrderCheckout(
    {
      fulfillmentMethod: order.fulfillmentMethod,
      paymentMethod: order.paymentMethod,
      pickupBranchId: order.pickupBranchId,
      pickupBranchName: pickupBranch,
    },
    checkoutOptionsCatalog,
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
  const invoiceUrl = `${appUrl}/customer/invoice/${order.id}`;
  const grandTotal = getOrderDisplayTotals(order).grandTotal;
  const orderRef = order.id.slice(0, 8).toUpperCase();
  const isCod = isCodPayment(order.paymentMethod);

  const html = buildPaymentVerifiedEmailHtml({
    systemName: config.systemName,
    orderId: order.id,
    customerName: order.customerName,
    grandTotalCents: grandTotal,
    paymentLabel: checkoutDetails.payment,
    fulfillmentLabel: checkoutDetails.fulfillment,
    pickupBranchName: checkoutDetails.pickup ?? pickupBranch,
    invoiceUrl,
    headline: isCod ? "Order Fulfilled" : "Payment Verified",
    introText: isCod
      ? `Hi ${escapeHtml(order.customerName)}, your cash-on-delivery order <strong>#${orderRef}</strong> has been fulfilled. Thank you for your purchase.`
      : undefined,
  });

  return sendSystemHtmlEmail(
    order.customerEmail,
    isCod
      ? `Order Fulfilled | ${config.systemName} #${orderRef}`
      : `Payment Verified | ${config.systemName} #${orderRef}`,
    html,
  );
}

export async function sendOrderCancelledCustomerEmail(
  orderId: string,
): Promise<{ success: boolean; error?: string }> {
  const [order] = await db
    .select()
    .from(schema.simulatedOrders)
    .where(eq(schema.simulatedOrders.id, orderId))
    .limit(1);

  if (!order) {
    return { success: false, error: "Order not found." };
  }

  const config = await getEmailSenderConfig();
  if (!config) {
    return { success: false, error: "SMTP not configured" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
  const invoiceUrl = `${appUrl}/customer/invoice/${order.id}`;
  const grandTotal = getOrderDisplayTotals(order).grandTotal;
  const orderRef = order.id.slice(0, 8).toUpperCase();

  const html = buildOrderCancelledEmailHtml({
    systemName: config.systemName,
    orderId: order.id,
    customerName: order.customerName,
    grandTotalCents: grandTotal,
    invoiceUrl,
  });

  return sendSystemHtmlEmail(
    order.customerEmail,
    `Order Cancelled | ${config.systemName} #${orderRef}`,
    html,
  );
}

export async function sendPaymentSlipRejectedCustomerEmail(
  orderId: string,
  reason?: string | null,
): Promise<{ success: boolean; error?: string }> {
  const [order] = await db
    .select()
    .from(schema.simulatedOrders)
    .where(eq(schema.simulatedOrders.id, orderId))
    .limit(1);

  if (!order) {
    return { success: false, error: "Order not found." };
  }

  const config = await getEmailSenderConfig();
  if (!config) {
    return { success: false, error: "SMTP not configured" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
  const invoiceUrl = `${appUrl}/customer/invoice/${order.id}`;
  const grandTotal = getOrderDisplayTotals(order).grandTotal;
  const orderRef = order.id.slice(0, 8).toUpperCase();

  const html = buildPaymentSlipRejectedEmailHtml({
    systemName: config.systemName,
    orderId: order.id,
    customerName: order.customerName,
    grandTotalCents: grandTotal,
    reason,
    invoiceUrl,
  });

  return sendSystemHtmlEmail(
    order.customerEmail,
    `Payment Slip Needs Attention | ${config.systemName} #${orderRef}`,
    html,
  );
}
