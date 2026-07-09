import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { DEFAULT_APP_URL } from '@/shared/platform/brand';
import { getCheckoutOptionsCatalog } from '@/features/organization/checkout-options';
import { describeOrderCheckout } from '@/features/organization/checkout-options.shared';
import { getVendorOrderNotificationTargets } from '@/features/vendor-org/emails';
import { buildVendorNewOrderEmailHtml } from '@/features/orders/email/vendor-notification-html';
import { sendRawSmtpEmail } from '@/shared/email/smtp-client';
import { getSystemSetting } from '@/shared/platform/settings';
import { logger } from '@/shared/logging/logger';
import { isVendorOnline, queueVendorNotification } from '@/shared/security/vendor-presence';

export async function dispatchVendorOrderNotifications(orderId: string): Promise<void> {
  try {
    const [order] = await db
      .select()
      .from(schema.simulatedOrders)
      .where(eq(schema.simulatedOrders.id, orderId))
      .limit(1);

    if (!order) {
      logger.warn('Order not found during vendor notification dispatch', { orderId });
      return;
    }

    const [items, checkoutOptionsCatalog, pickupBranch, systemName] = await Promise.all([
      db
        .select({
          productName: schema.simulatedOrderItems.productName,
          quantity: schema.simulatedOrderItems.quantity,
          unitPrice: schema.simulatedOrderItems.unitPrice,
          vendorOrgId: schema.simulatedOrderItems.vendorOrgId,
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
        fulfillmentMethod: order.fulfillmentMethod,
        paymentMethod: order.paymentMethod,
        pickupBranchId: order.pickupBranchId,
        pickupBranchName: pickupBranch,
      },
      checkoutOptionsCatalog
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
    const vendorConsoleUrl = `${appUrl}/vendor?tab=inventory`;

    // Group items by vendor
    const itemsByVendor = new Map<string, typeof items>();
    for (const item of items) {
      if (!itemsByVendor.has(item.vendorOrgId)) {
        itemsByVendor.set(item.vendorOrgId, []);
      }
      itemsByVendor.get(item.vendorOrgId)!.push(item);
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const emailFromAddress = process.env.EMAIL_FROM_ADDRESS || 'info@dilstar.pp.ua';
    const emailFromName = process.env.EMAIL_FROM_NAME || `${systemName} Hub`;

    for (const [vendorOrgId, vendorItems] of itemsByVendor.entries()) {
      const targets = await getVendorOrderNotificationTargets(vendorOrgId, order.pickupBranchId);

      for (const target of targets) {
        const isOnline = await isVendorOnline(target.userId);

        if (isOnline) {
          // Push to Secure Redis Queue for polling
          const vendorTotal = vendorItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
          const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(vendorTotal / 100);

          await queueVendorNotification(target.userId, {
            orderId,
            customerName: order.customerName || 'Customer',
            total: formattedTotal,
            fulfillmentLabel: checkoutDetails.fulfillment,
          });
          
          logger.info('Queued web push notification for online vendor', { orderId, userId: target.userId });
        } else {
          // Fallback to Email Notification
          if (!smtpUser || !smtpPassword) {
            logger.warn('Vendor email skipped: SMTP credentials are not configured', { orderId });
            continue;
          }

          const emailHtml = buildVendorNewOrderEmailHtml({
            systemName,
            orderId,
            customerName: order.customerName || 'Customer',
            fulfillmentLabel: checkoutDetails.fulfillment,
            paymentLabel: checkoutDetails.payment,
            vendorConsoleUrl,
            items: vendorItems,
          });

          await sendRawSmtpEmail({
            host: smtpHost,
            port: smtpPort,
            user: smtpUser,
            pass: smtpPassword,
            to: target.email,
            from: emailFromAddress,
            fromName: emailFromName,
            subject: `New Order Received | ${systemName} #${orderId.slice(0, 8).toUpperCase()}`,
            html: emailHtml,
          });

          logger.info('Sent email notification to offline vendor', { orderId, email: target.email });
        }
      }
    }
  } catch (error) {
    logger.error('Failed to dispatch vendor order notifications', error, { orderId });
  }
}
