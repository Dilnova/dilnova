'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { rateLimit } from '@/shared/security/rate-limit';
import { getSystemSetting } from '@/shared/platform/settings';
import { DEFAULT_APP_URL } from '@/shared/platform/brand';
import { db } from '@/shared/db/client';
import * as schema from '@/shared/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { normalizeCustomerEmail, getNormalizedClerkUserEmail } from '@/features/customer/email';
import { resolveCheckoutOptionsForOrgs } from '@/features/organization/checkout-options';
import {
  resolveInitialOrderStatus,
  isPaymentCompatibleWithFulfillment,
} from '@/features/organization/checkout-options.shared';
import { getStockAvailabilityCatalog, resolveEffectiveStockAvailability } from '@/features/inventory/availability.server';
import {
  reserveProductStock,
  applyStockReservation,
  type StockReservation,
} from '@/features/inventory/reservation';
import { calculateCheckoutTotals } from '@/features/billing/checkout-totals';
import { applyOnlineOrderItemStock } from '@/features/orders/stock';
import {
  BANK_TRANSFER_PAYMENT_ID,
  allocateVendorPaymentAmounts,
  hasCompleteBankDetails,
  isBankTransferPayment,
  toVendorBankTransferAvailability,
  type BankTransferCheckoutInstructions,
} from '@/features/billing/bank-transfer';
import {
  buildBankTransferCheckoutInstructions,
  getBankTransferDetailsForOrgs,
} from '@/features/billing/bank-transfer.server';
import { sendOrderConfirmationEmailForOrder } from '@/features/orders/email/confirmation';
import { escapeHtml, sendRawSmtpEmail } from '@/shared/email/smtp-client';
import { logger } from '@/shared/logging/logger';
import {
  buildVendorCartSummaries,
  filterCartLinesByVendorOrg,
  resolveCheckoutVendorOrgId,
} from '@/features/cart/vendor-checkout';
import { MULTI_VENDOR_ORDER_CHECKOUT_ERROR } from '@/features/orders/vendor-scope';
import {
  checkoutSchema,
  sendCartEmailSchema,
  type CartLineInput,
  type CheckoutItemInput,
} from '@/features/cart/schema';
import { aggregateCheckoutItems, type CheckoutTransactionResult } from '@/features/cart/checkout.helpers';
import { z } from 'zod';

const syncCartSchema = z.array(z.string().uuid()).max(50);

export async function sendCartSummaryEmailAction(
  emailAddress: string,
  cartItems: CartLineInput[],
  cartTotal: number,
  zeroShipping = false
) {
  try {
    // ── Input Validation ──
    const parsedInput = sendCartEmailSchema.safeParse({
      emailAddress,
      cartItems,
      cartTotal,
    });
    if (!parsedInput.success) {
      return { success: false, error: parsedInput.error.issues[0]?.message || 'Invalid input data.' };
    }

    const { cartItems: validatedItems, cartTotal: validatedTotal } = parsedInput.data;

    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Please sign in to email your cart summary.' };
    }

    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Authentication session is invalid. Please sign in again.' };
    }

    const validatedEmail = getNormalizedClerkUserEmail(user);
    if (!validatedEmail) {
      return {
        success: false,
        error: 'Your account does not have an email address. Please update your profile first.',
      };
    }

    // ── Rate Limiting ──
    // Max 3 emails per minute per IP to prevent spamming/abuse of the SMTP relay
    await rateLimit(3, 60 * 1000);

    const systemName = await getSystemSetting('system_name', 'Dilnova');
    const systemNameHub = `${systemName} Commerce Hub`;

    const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const emailFromAddress = process.env.EMAIL_FROM_ADDRESS || 'info@dilstar.pp.ua';
    const emailFromName = process.env.EMAIL_FROM_NAME || `${systemName} Hub`;

    if (!smtpUser || !smtpPassword) {
      logger.error('SMTP credentials (SMTP_USER/SMTP_PASSWORD) are missing');
      return { success: false, error: 'SMTP configuration is incomplete on the server.' };
    }

    const pricedItems = await Promise.all(
      validatedItems.map(async (item) => {
        const [product] = await db
          .select({ price: schema.products.price, name: schema.products.name })
          .from(schema.products)
          .where(eq(schema.products.id, item.id))
          .limit(1);
        return {
          ...item,
          name: product?.name || item.name,
          price: product?.price ?? item.price,
        };
      })
    );
    const syncedSubtotal = pricedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const { taxAmount: estimatedTax, shippingAmount: shippingFee, grandTotal } = calculateCheckoutTotals(
      syncedSubtotal,
      zeroShipping
    );

    const formatPrice = (cents: number) => {
      return (cents / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
    };

    // Construct beautiful HTML items rows
    const itemsHtml = pricedItems
      .map(
        (item) => `
        <tr style="border-bottom: 1px solid #e4e4e7;">
          <td style="padding: 12px 8px; font-size: 14px; color: #18181b;">
            <strong style="display: block;">${escapeHtml(item.name)}</strong>
            <span style="font-size: 11px; color: #71717a;">Sold by ${escapeHtml(item.vendorName)}</span>
          </td>
          <td style="padding: 12px 8px; font-size: 13px; color: #52525b; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 12px 8px; font-size: 13px; font-family: monospace; color: #52525b; text-align: right;">
            ${formatPrice(item.price)}
          </td>
          <td style="padding: 12px 8px; font-size: 14px; font-family: monospace; font-weight: bold; color: #18181b; text-align: right;">
            ${formatPrice(item.price * item.quantity)}
          </td>
        </tr>
      `
      )
      .join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your ${systemName} Shopping Cart Summary</title>
        </head>
          <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafa; color: #18181b;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Header banner -->
            <div style="background-color: #6b21a8; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 1px; font-family: inherit;">
                ${systemNameHub.toUpperCase()}
              </h1>
              <p style="margin: 4px 0 0 0; color: #e9d5ff; font-size: 12px;">Your Saved Shopping Cart</p>
            </div>

            <!-- Content Area -->
            <div style="padding: 24px;">
              <p style="font-size: 14px; color: #52525b; line-height: 1.5; margin-bottom: 24px;">
                Hello, <br/>
                We saved your cart summary. Here is a breakdown of your selected products and services:
              </p>

              <!-- Items Table -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <thead>
                  <tr style="border-bottom: 2px solid #e4e4e7; text-align: left;">
                    <th style="padding: 8px; font-size: 11px; font-weight: bold; color: #71717a; text-transform: uppercase;">Item</th>
                    <th style="padding: 8px; font-size: 11px; font-weight: bold; color: #71717a; text-transform: uppercase; text-align: center;">Qty</th>
                    <th style="padding: 8px; font-size: 11px; font-weight: bold; color: #71717a; text-transform: uppercase; text-align: right;">Price</th>
                    <th style="padding: 8px; font-size: 11px; font-weight: bold; color: #71717a; text-transform: uppercase; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Order Summary Block -->
              <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <table style="width: 100%; font-size: 13px; color: #475569;">
                  <tr>
                    <td style="padding: 4px 0;">Subtotal</td>
                    <td style="padding: 4px 0; text-align: right; font-family: monospace;">${formatPrice(syncedSubtotal)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0;">Estimated Tax (8%)</td>
                    <td style="padding: 4px 0; text-align: right; font-family: monospace;">${formatPrice(estimatedTax)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0;">Shipping</td>
                    <td style="padding: 4px 0; text-align: right; font-family: monospace;">${shippingFee === 0 ? 'FREE' : formatPrice(shippingFee)}</td>
                  </tr>
                  <tr style="font-weight: bold; color: #0f172a; font-size: 15px; border-top: 1px dashed #cbd5e1;">
                    <td style="padding: 12px 0 0 0;">Total</td>
                    <td style="padding: 12px 0 0 0; text-align: right; font-family: monospace; font-size: 16px;">${formatPrice(grandTotal)}</td>
                  </tr>
                </table>
              </div>

              <!-- Footer Buttons -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL}/cart" style="display: inline-block; background-color: #6b21a8; color: #ffffff; font-size: 12px; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(107, 33, 168, 0.2);">
                  View Cart & Checkout
                </a>
              </div>
            </div>

            <!-- footer disclaimer -->
            <div style="background-color: #f4f4f5; padding: 16px; text-align: center; border-top: 1px solid #e4e4e7; font-size: 11px; color: #a1a1aa;">
              ${systemNameHub} &copy; 2026. All rights reserved.
            </div>
          </div>
        </body>
      </html>
    `;

    // Connect to Brevo SMTP host using configured details (direct SSL/TLS or STARTTLS)
    await sendRawSmtpEmail({
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPassword,
      to: validatedEmail,
      from: emailFromAddress,
      fromName: emailFromName,
      subject: `Your Shopping Cart Summary | ${systemName}`,
      html: emailHtml,
    });

    return { success: true };
  } catch (error: unknown) {
    logger.error('Failed to send cart summary email', {
      error: error instanceof Error ? error.message : String(error),
    });
    const errorMsg = error instanceof Error ? error.message : 'Unknown server error sending email.';
    return { success: false, error: errorMsg };
  }
}

// ═══════════════════════════════════════════════════════════
// SIMULATED CHECKOUT — Stock Validation & Order Placement
// ═══════════════════════════════════════════════════════════

export async function syncCartPricesAction(productIds: string[]) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false as const, error: 'Unauthorized. Please sign in.' };
    }

    await rateLimit(3, 60 * 1000);

    const parsed = syncCartSchema.safeParse(productIds.filter(Boolean));
    if (!parsed.success) {
      return { success: false as const, error: 'Invalid product IDs provided.' };
    }

    const uniqueIds = [...new Set(parsed.data)];
    if (uniqueIds.length === 0) {
      return { success: true as const, items: [], removedIds: [] };
    }

    const rows = await db
      .select({
        id: schema.products.id,
        name: schema.products.name,
        price: schema.products.price,
        status: schema.products.status,
      })
      .from(schema.products)
      .where(inArray(schema.products.id, uniqueIds));

    const foundIds = new Set(rows.map((row) => row.id));
    const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
    const inactiveIds = rows.filter((row) => row.status !== 'active').map((row) => row.id);
    const activeRows = rows.filter((row) => row.status === 'active');

    return {
      success: true as const,
      items: activeRows.map((row) => ({
        id: row.id,
        name: row.name,
        price: row.price,
      })),
      removedIds: [...missingIds, ...inactiveIds],
    };
  } catch (error) {
    logger.error('Failed to sync cart prices', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false as const, error: 'Failed to refresh cart prices.' };
  }
}

export async function getCartCheckoutOptionsAction(
  cartLines: { id: string; quantity: number; price: number }[],
  checkoutVendorOrgId?: string | null
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false as const, error: 'Please sign in to load checkout options.' };
    }

    if (cartLines.length === 0) {
      return {
        success: true as const,
        fulfillment: [],
        payment: [],
        pickupBranches: [],
        singleVendorOrgId: null,
        vendorCount: 0,
        vendorBankTransferByOrg: {},
        vendorCartSummary: [],
      };
    }

    const uniqueIds = [...new Set(cartLines.map((line) => line.id))];
    const products = await db
      .select({
        id: schema.products.id,
        orgId: schema.products.orgId,
        price: schema.products.price,
      })
      .from(schema.products)
      .where(inArray(schema.products.id, uniqueIds));

    const productById = new Map(products.map((product) => [product.id, product]));
    const uniqueOrgIds = [...new Set(products.map((product) => product.orgId))];
    const resolvedCheckoutVendorOrgId = resolveCheckoutVendorOrgId(
      buildVendorCartSummaries(cartLines, productById),
      checkoutVendorOrgId
    );

    if (uniqueOrgIds.length > 1 && !resolvedCheckoutVendorOrgId) {
      const bankDetailsByOrg = await getBankTransferDetailsForOrgs(uniqueOrgIds);
      const vendorCartSummary = buildVendorCartSummaries(
        cartLines,
        productById,
        Object.fromEntries(
          uniqueOrgIds.map((orgId) => [orgId, bankDetailsByOrg[orgId]?.vendorName || 'Vendor'])
        )
      );

      return {
        success: true as const,
        fulfillment: [],
        payment: [],
        pickupBranches: [],
        singleVendorOrgId: null,
        vendorCount: uniqueOrgIds.length,
        checkoutVendorOrgId: null,
        requiresVendorSelection: true as const,
        vendorBankTransferByOrg: Object.fromEntries(
          uniqueOrgIds.map((orgId) => [
            orgId,
            toVendorBankTransferAvailability(
              bankDetailsByOrg[orgId] ?? { vendorName: 'Vendor', bankDetails: null }
            ),
          ])
        ),
        vendorCartSummary,
      };
    }

    const linesForOptions = filterCartLinesByVendorOrg(
      cartLines,
      productById,
      resolvedCheckoutVendorOrgId
    );
    const orgIdsForOptions =
      resolvedCheckoutVendorOrgId != null
        ? [resolvedCheckoutVendorOrgId]
        : uniqueOrgIds;

    const branchRows =
      orgIdsForOptions.length > 0
        ? await db
            .select({
              id: schema.branches.id,
              orgId: schema.branches.orgId,
              name: schema.branches.name,
              address: schema.branches.address,
              phone: schema.branches.phone,
            })
            .from(schema.branches)
            .where(inArray(schema.branches.orgId, orgIdsForOptions))
        : [];

    const branchesByOrg = new Map<
      string,
      { id: string; name: string; address: string | null; phone: string | null }[]
    >();
    for (const branch of branchRows) {
      const list = branchesByOrg.get(branch.orgId) || [];
      list.push({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
      });
      branchesByOrg.set(branch.orgId, list);
    }

    const resolved = await resolveCheckoutOptionsForOrgs(orgIdsForOptions, branchesByOrg);
    const bankTransferEnabled = resolved.payment.some((o) => o.id === BANK_TRANSFER_PAYMENT_ID);
    const bankDetailsByOrg = bankTransferEnabled
      ? await getBankTransferDetailsForOrgs(uniqueOrgIds)
      : {};
    const vendorCartSummary = buildVendorCartSummaries(cartLines, productById, Object.fromEntries(
      uniqueOrgIds.map((orgId) => [orgId, bankDetailsByOrg[orgId]?.vendorName || 'Vendor'])
    ));

    return {
      success: true as const,
      fulfillment: resolved.fulfillment.map((o) => ({
        id: o.id,
        label: o.label,
        description: o.description,
        zeroShipping: o.zeroShipping === true,
        requiresBranch: o.requiresBranch === true,
      })),
      payment: resolved.payment.map((o) => ({
        id: o.id,
        label: o.label,
        description: o.description,
        requiresDelivery: o.requiresDelivery === true,
        pendingPayment: o.pendingPayment === true,
      })),
      pickupBranches: resolved.pickupBranches,
      singleVendorOrgId: resolved.singleVendorOrgId,
      vendorCount: uniqueOrgIds.length,
      checkoutVendorOrgId: resolvedCheckoutVendorOrgId,
      requiresVendorSelection: false as const,
      vendorBankTransferByOrg: Object.fromEntries(
        uniqueOrgIds.map((orgId) => [
          orgId,
          toVendorBankTransferAvailability(
            bankDetailsByOrg[orgId] ?? { vendorName: 'Vendor', bankDetails: null }
          ),
        ])
      ),
      vendorCartSummary,
    };
  } catch (error) {
    logger.error('Failed to load checkout options', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false as const, error: 'Failed to load checkout options.' };
  }
}

export async function simulatedCheckoutAction(
  customerName: string,
  customerEmail: string,
  items: CheckoutItemInput[],
  totalAmount: number,
  fulfillmentMethod: string,
  paymentMethod: string,
  pickupBranchId?: string | null,
  shippingAddress?: string | null,
  shippingPhone?: string | null,
  checkoutVendorOrgId?: string | null
) {
  try {
    // ── Input Validation ──
    const parsed = checkoutSchema.safeParse({
      customerName,
      customerEmail,
      items,
      totalAmount,
      fulfillmentMethod,
      paymentMethod,
      pickupBranchId: pickupBranchId || null,
      shippingAddress: shippingAddress?.trim() || null,
      shippingPhone: shippingPhone?.trim() || null,
      checkoutVendorOrgId: checkoutVendorOrgId || null,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid checkout data.' };
    }

    let name = parsed.data.customerName.trim();
    let email = normalizeCustomerEmail(parsed.data.customerEmail);
    const aggregatedItems = aggregateCheckoutItems(parsed.data.items);
    const {
      totalAmount: clientGrandTotal,
      fulfillmentMethod: fulfillment,
      paymentMethod: payment,
      pickupBranchId: pickupBranch,
      shippingAddress: shippingAddressInput,
      shippingPhone: shippingPhoneInput,
      checkoutVendorOrgId: checkoutVendorOrgIdInput,
    } = parsed.data;

    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Please sign in to place an order.' };
    }

    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'Authentication session is invalid. Please sign in again.' };
    }

    const sessionEmail = getNormalizedClerkUserEmail(user);
    if (!sessionEmail) {
      return {
        success: false,
        error: 'Your account does not have an email address. Please update your profile before checkout.',
      };
    }
    email = sessionEmail;
    name = user.fullName || user.firstName || name;

    // ── Rate Limiting ──
    await rateLimit(5, 60 * 1000); // Max 5 checkouts per minute

    // ── Concurrency Safe Stock Validation & Checkout ──
    // ── Verify products, prices, and availability flags server-side (outside transaction) ──
    const verifiedItems: {
      id: string;
      name: string;
      price: number;
      quantity: number;
      vendorOrgId: string;
      type: string;
    }[] = [];
    let serverSubtotal = 0;
    const availabilityCatalog = await getStockAvailabilityCatalog();

    for (const item of aggregatedItems) {
      const [product] = await db
        .select({
          id: schema.products.id,
          name: schema.products.name,
          price: schema.products.price,
          orgId: schema.products.orgId,
          type: schema.products.type,
          status: schema.products.status,
        })
        .from(schema.products)
        .where(eq(schema.products.id, item.id))
        .limit(1);

      if (!product) {
        return { success: false, error: `Product not found in catalog: ${item.name}` };
      }
      if (product.status !== 'active') {
        return { success: false, error: `"${product.name}" is no longer available for purchase.` };
      }

      serverSubtotal += product.price * item.quantity;
      verifiedItems.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        vendorOrgId: product.orgId,
        type: product.type,
      });
    }

    let vendorOrgIds = [...new Set(verifiedItems.map((item) => item.vendorOrgId))];
    const resolvedCheckoutVendorOrgId = resolveCheckoutVendorOrgId(
      buildVendorCartSummaries(
        aggregatedItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        new Map(
          verifiedItems.map((item) => [
            item.id,
            { id: item.id, orgId: item.vendorOrgId, price: item.price },
          ])
        )
      ),
      checkoutVendorOrgIdInput
    );

    if (vendorOrgIds.length > 1) {
      if (!resolvedCheckoutVendorOrgId) {
        return {
          success: false as const,
          error: MULTI_VENDOR_ORDER_CHECKOUT_ERROR,
        };
      }

      const filteredItems = verifiedItems.filter(
        (item) => item.vendorOrgId === resolvedCheckoutVendorOrgId
      );
      if (filteredItems.length === 0) {
        return {
          success: false as const,
          error: 'No items found for the selected vendor.',
        };
      }

      verifiedItems.splice(0, verifiedItems.length, ...filteredItems);
      serverSubtotal = filteredItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      vendorOrgIds = [resolvedCheckoutVendorOrgId];
    }

    const branchRows =
      vendorOrgIds.length > 0
        ? await db
            .select({
              id: schema.branches.id,
              orgId: schema.branches.orgId,
              name: schema.branches.name,
              address: schema.branches.address,
              phone: schema.branches.phone,
            })
            .from(schema.branches)
            .where(inArray(schema.branches.orgId, vendorOrgIds))
        : [];

    const branchesByOrg = new Map<
      string,
      { id: string; name: string; address: string | null; phone: string | null }[]
    >();
    for (const branch of branchRows) {
      const list = branchesByOrg.get(branch.orgId) || [];
      list.push({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
      });
      branchesByOrg.set(branch.orgId, list);
    }

    const resolvedOptions = await resolveCheckoutOptionsForOrgs(vendorOrgIds, branchesByOrg);
    const fulfillmentOption = resolvedOptions.fulfillment.find((o) => o.id === fulfillment);
    const paymentOption = resolvedOptions.payment.find((o) => o.id === payment);

    if (!fulfillmentOption) {
      return { success: false, error: 'Selected fulfillment method is not available for this cart.' };
    }
    if (!paymentOption) {
      return { success: false, error: 'Selected payment method is not available for this cart.' };
    }
    if (vendorOrgIds.length > 1 && paymentOption.pendingPayment === true) {
      return {
        success: false as const,
        error: MULTI_VENDOR_ORDER_CHECKOUT_ERROR,
      };
    }

    if (isBankTransferPayment(payment)) {
      const bankDetailsByOrg = await getBankTransferDetailsForOrgs(vendorOrgIds);
      const vendorsMissingBankDetails = vendorOrgIds.filter(
        (orgId) => !hasCompleteBankDetails(bankDetailsByOrg[orgId]?.bankDetails)
      );
      if (vendorsMissingBankDetails.length > 0) {
        const vendorNames = vendorsMissingBankDetails.map(
          (orgId) => bankDetailsByOrg[orgId]?.vendorName || 'A vendor'
        );
        return {
          success: false as const,
          error: `Bank transfer is unavailable because bank details are not configured for: ${vendorNames.join(', ')}. Please contact the store or choose another payment method.`,
        };
      }
    }

    if (!isPaymentCompatibleWithFulfillment(paymentOption, fulfillmentOption)) {
      return {
        success: false,
        error: `${paymentOption.label} is only available for delivery orders, not store pickup.`,
      };
    }

    if (fulfillmentOption.requiresBranch) {
      if (!pickupBranch) {
        return { success: false, error: 'Please select a pickup branch to continue.' };
      }
      const validBranch = branchRows.find(
        (branch) => branch.id === pickupBranch && vendorOrgIds.includes(branch.orgId)
      );
      if (!validBranch) {
        return { success: false, error: 'Selected pickup branch is invalid.' };
      }
      if (vendorOrgIds.length > 1) {
        return {
          success: false,
          error: 'Store pickup is only available when all items are from the same vendor.',
        };
      }
    } else if (pickupBranch) {
      return { success: false, error: 'Pickup branch is only required for store pickup orders.' };
    }

    const normalizedShippingAddress = shippingAddressInput?.trim() || null;
    const normalizedShippingPhone = shippingPhoneInput?.trim() || null;

    if (!fulfillmentOption.requiresBranch) {
      if (!normalizedShippingAddress || normalizedShippingAddress.length < 5) {
        return {
          success: false,
          error: 'Please enter a complete delivery address for home delivery orders.',
        };
      }
    } else if (normalizedShippingAddress || normalizedShippingPhone) {
      return {
        success: false,
        error: 'Shipping address is only required for home delivery orders.',
      };
    }

    const checkoutTotals = calculateCheckoutTotals(
      serverSubtotal,
      fulfillmentOption.zeroShipping === true
    );
    if (checkoutTotals.grandTotal !== clientGrandTotal) {
      return {
        success: false,
        error: `Checkout total mismatch. Expected ${checkoutTotals.grandTotal}, received ${clientGrandTotal}. Please refresh your cart and try again.`,
      };
    }

    const pickupBranchForStock = fulfillmentOption.requiresBranch ? pickupBranch : null;

    // Sort items by product ID to prevent deadlock during concurrent lock acquisition
    verifiedItems.sort((a, b) => a.id.localeCompare(b.id));

    // ── Concurrency Safe Stock Validation & Checkout (inside transaction) ──
    const txResult: CheckoutTransactionResult = await db.transaction(async (tx) => {
      const stockErrors: string[] = [];
      const stockReservations: { productId: string; quantity: number; reservation: StockReservation }[] = [];

      for (const item of verifiedItems) {
        if (item.type !== 'product') {
          continue;
        }

        const [invMeta] = await tx
          .select({
            stockAvailability: schema.inventory.stockAvailability,
            quantity: schema.inventory.quantity,
          })
          .from(schema.inventory)
          .where(eq(schema.inventory.productId, item.id))
          .for('update')
          .limit(1);

        if (!invMeta) {
          stockErrors.push(`"${item.name}" is not available for online purchase (missing inventory record).`);
          continue;
        }

        const availability = resolveEffectiveStockAvailability(
          availabilityCatalog,
          invMeta.stockAvailability,
          invMeta.quantity
        );
        if (availability && !availability.allowsPurchase) {
          stockErrors.push(`"${item.name}" is currently marked as ${availability.label} and cannot be purchased.`);
          continue;
        }

        const stockResult = await reserveProductStock(tx, item.id, item.quantity, {
          branchId: pickupBranchForStock,
          productName: item.name,
        });

        if (!stockResult.ok) {
          stockErrors.push(stockResult.error);
        } else {
          stockReservations.push({
            productId: item.id,
            quantity: item.quantity,
            reservation: stockResult.reservation,
          });
        }
      }

      if (stockErrors.length > 0) {
        return {
          success: false,
          error: `Insufficient stock:\n${stockErrors.join('\n')}`,
          stockErrors,
        };
      }

      const orderStatus = resolveInitialOrderStatus(paymentOption);

      // Reserve stock at checkout for all orders (including bank transfer / COD).
      // pending_payment orders hold inventory until fulfilled or cancelled; cancellation restores stock.
      const [order] = await tx
        .insert(schema.simulatedOrders)
        .values({
          customerName: name,
          customerEmail: email,
          customerUserId: userId,
          subtotalAmount: checkoutTotals.subtotalAmount,
          taxAmount: checkoutTotals.taxAmount,
          shippingAmount: checkoutTotals.shippingAmount,
          totalAmount: checkoutTotals.grandTotal,
          status: orderStatus,
          fulfillmentMethod: fulfillment,
          paymentMethod: payment,
          pickupBranchId: fulfillmentOption.requiresBranch ? pickupBranch : null,
          shippingAddress: fulfillmentOption.requiresBranch ? null : normalizedShippingAddress,
          shippingPhone: fulfillmentOption.requiresBranch ? null : normalizedShippingPhone,
          stockDepleted: true,
        })
        .returning();

      if (!order) {
        throw new Error('Failed to create order record.');
      }

      // ── Insert Order Items using DB-verified information ──
      for (const item of verifiedItems) {
        await tx.insert(schema.simulatedOrderItems).values({
          orderId: order.id,
          productId: item.id,
          productName: item.name,
          vendorOrgId: item.vendorOrgId,
          quantity: item.quantity,
          unitPrice: item.price,
        });
      }

      for (const { productId, quantity, reservation } of stockReservations) {
        const item = verifiedItems.find((v) => v.id === productId);
        if (!item) continue;

        await applyOnlineOrderItemStock(tx, {
          quantity,
          reservation,
          pickupBranchId: pickupBranchForStock ?? null,
          vendorOrgId: item.vendorOrgId,
          productId: item.id,
          orderId: order.id,
          userId: userId || 'customer',
        });
      }

      const vendorSubtotals = new Map<string, number>();
      for (const item of verifiedItems) {
        vendorSubtotals.set(
          item.vendorOrgId,
          (vendorSubtotals.get(item.vendorOrgId) || 0) + item.price * item.quantity
        );
      }

      return {
        success: true as const,
        orderId: order.id,
        grandTotalCents: checkoutTotals.grandTotal,
        vendorSubtotals: Object.fromEntries(vendorSubtotals),
        serverSubtotalCents: serverSubtotal,
      };
    });

    if (!txResult.success) {
      return { success: false, error: txResult.error };
    }

    const {
      orderId: createdOrderId,
      grandTotalCents,
      vendorSubtotals: createdVendorSubtotals,
      serverSubtotalCents,
    } = txResult;

    let bankTransferInstructions: BankTransferCheckoutInstructions | undefined;
    if (isBankTransferPayment(payment)) {
      const vendorAmounts = allocateVendorPaymentAmounts(
        createdVendorSubtotals,
        serverSubtotalCents,
        grandTotalCents
      );
      bankTransferInstructions = await buildBankTransferCheckoutInstructions({
        orderId: createdOrderId,
        grandTotalCents,
        vendorAmounts,
      });
    }

    const emailResult = await sendOrderConfirmationEmailForOrder(createdOrderId, {
      customerName: name,
      customerEmail: email,
      paymentMethod: payment,
      fulfillmentMethod: fulfillment,
      bankTransferInstructions,
      isSignedIn: Boolean(userId),
    });

    if (!emailResult.success) {
      logger.warn('Order placed but confirmation email was not sent', {
        orderId: createdOrderId,
        error: emailResult.error,
      });
    }

    return {
      success: true,
      orderId: createdOrderId,
      bankTransferInstructions,
      confirmationEmailSent: emailResult.success,
    };
  } catch (error: unknown) {
    logger.error('Checkout failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    const errorMsg = error instanceof Error ? error.message : 'Unknown server error during checkout.';
    return { success: false, error: errorMsg };
  }
}
